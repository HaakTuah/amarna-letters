/**
 * A script king's memory and judgement: relations with every other king, the war it has chosen, the people it has checked,
 * the evidence it has sent. One per power, kept across seasons.
 */
import {
  AllPowers,
  RoadsTitle,
  Dict,
  HSet,
  Rng,
  StartGold,
  StartUnits,
  clamp,
  cmpNum,
  cmpOpt,
  cmpPower,
  cmpStr,
  desc,
  groupBy,
  land,
  max,
  parsePower,
  sortBy,
  type CharacterView,
  type Clause,
  type Claim,
  type InboxItem,
  type Power,
  type SeatView,
  type UnitKind,
  type UnitView,
  type VassalTerms,
} from "@amarna/engine";
import { Board } from "./board.ts";
import { Names } from "./names.ts";
import { personalityFor, type Personality } from "./personality.ts";
import type { Landing } from "./seas.ts";
import { againstIn, readReport, type SupportPromise } from "./statecraft-clauses.ts";

/** What a king thinks of another king, learned only from what reached its court. */
export class Relation {
  /** -1 (expects betrayal) to 1 (would bet the kingdom on them). */
  trust = 0;
  /** Accumulated wrongs; fades at a rate set by the king's vengefulness. */
  grudge = 0;
  lastAttackedUs = -99;
  lastWeAttacked = -99;
  oathsBroken = 0;
  supportsGiven = 0;
  treaty = false;
  allied = false;
  /** The king this partner and we have sworn, on a sealed tablet, to stand together against. */
  against: Power | null = null;
  proposedTurn = -99;

  get hostile(): boolean {
    return this.grudge >= 3 || this.trust <= -0.5;
  }
}

const WagesGuess = 25;

export class Brain {
  readonly me: Power;
  readonly p: Personality;
  readonly seed: number;
  readonly rel = new Dict<Power, Relation>();
  lastOwner = new Dict<string, Power | null>();
  /** The walls as they stood last season: a city bought keeps its walls, one that falls loses a level. */
  lastWalls = new Dict<string, number>();
  readonly armySeen = new Dict<Power, [number, number]>();
  /** Where foreign troops were last seen, for provinces out of sight. */
  readonly sightings = new Dict<string, [Power, UnitKind, number]>();
  /** Recent conquests by each king, from anyone, fading by a third each season. */
  readonly belligerence = new Dict<Power, number>();
  readonly checked = new HSet<string>();
  readonly sentCopies = new HSet<string>();
  readonly heldSince = new Dict<string, number>();
  readonly authenticating = new HSet<string>();
  /** Captives we have asked a ransom for, and when: a demand stands until it is paid or lapses. */
  readonly ransomAsked = new Dict<string, number>();
  /** Our own people whose line reads "has not returned" (the word that they are overdue), and the season it first did. */
  readonly missingSince = new Dict<string, number>();
  /** Our own people found keeping gold they carried. Let go when next at court. */
  readonly thieves = new HSet<string>();
  /** Our own people whose forgery was botched: they lack the hand, so they are not asked to forge again. */
  readonly noHand = new HSet<string>();
  /** Item 10: captives already questioned, handed over, persons at court who claimed to be envoys, and spies' last thefts. */
  readonly questioned = new HSet<string>();
  /** Captives whose purse it took (Haakon's answers to item 11a: a captive's purse stays on him until his captor takes it). */
  readonly stripped = new HSet<string>();
  readonly handedOver = new HSet<string>();
  readonly hosted = new HSet<string>();
  readonly lastSteal = new Dict<string, number>();
  /** Captives a ransom or a turning was refused for: nobody is left to pay or to deceive. */
  readonly unclaimed = new HSet<string>();
  /** Our envoys who would not slip out of our besieged capital, and when (the siege package). */
  readonly wouldNotLeave = new Dict<string, number>();
  /** Pleas for relief heard from envoys: a city of the sender's, the king besieging it, and the season we heard it. */
  readonly pleas = new Dict<string, [Power, Power, number]>();
  /** Supports we promised in letters (item 8): kept in the season named, if a troop of ours can still give it. */
  readonly promised: SupportPromise[] = [];
  /** Supports other kings promised us: our plans count on them in the season named. */
  readonly offered: SupportPromise[] = [];
  /** How many times each of our envoys has carried our gold out: two trips with no word of light gold earn trust (item 8). */
  readonly goldTrips = new Dict<string, number>();
  /** Claims to the rank of Great King as the view last gave them (item 8). */
  claims: Claim[] = [];
  /** When we last promised each king our support for a blow he leads (item 8). */
  readonly supportOfferedTo = new Dict<Power, number>();
  /** Where each of our envoys was last sent: the court whose answer his report brings (item 8). */
  readonly sentTo = new Dict<string, Power>();
  /** The last envoy we sent to each king: the one a "your messenger lied" from him is about. */
  readonly lastEnvoyTo = new Dict<Power, string>();
  /** Gold our weighers found light, by sender: how much short, the season, and whether we have told him so. */
  readonly lightFrom = new Dict<Power, [number, number, boolean]>();
  /** When we last pleaded with each king for the relief of a city of ours. */
  readonly pleaSent = new Dict<Power, number>();
  /** Our envoys who told us they refused a host's offer of a post: proven true. */
  readonly provenLoyal = new HSet<string>();
  /** People a hire of ours was refused for because another court holds them: they cannot come to us. */
  readonly heldElsewhere = new HSet<string>();
  /** Provinces a friend ceded to us: we keep them, rather than pass them on in turn. */
  readonly received = new HSet<string>();
  /** Captives whose ransom demand lapsed unpaid, and how often. */
  readonly ransomLapsed = new Dict<string, number>();
  /** Our spies at their posts, and the season we first saw each one watching there. */
  readonly posted = new Dict<string, [string, number]>();
  /** Spies we have recalled, while their line still reads that they watch (a master may not hear at once). */
  readonly recalled = new HSet<string>();
  /** The bribe the host offered at an audience still open, by audience, to raise once in a second exchange. */
  readonly bribeOffered = new Dict<string, [number, string]>();
  /** When we last asked each king leave for our troops to stand in his land (item 9). */
  readonly basingAsked = new Dict<Power, number>();
  /** Item 11a+: leave a friend asked of our land that we would grant but did not seal on a tablet, to grant by order. */
  readonly leaveAsked = new Dict<Power, Clause[]>();
  /** Tablets sealed by an envoy's hand that we have weighed already: honoured, repudiated, or heard repudiated (item 9). */
  readonly judged = new HSet<string>();
  lastSeek = -10;
  lastSpyCaught = -10;
  warTarget: Power | null = null;
  warSince = 0;
  betraying: Power | null = null;
  /** The landing we have set our mind on (see seas.ts), and the turn before which we set our mind on no other. */
  landing: Landing | null = null;
  landingRest = 0;
  /** Gold left over after troops, levies and cities this season: what gifts, bribes and spies may spend. */
  spareGold = 0;
  giftTurn = -1;
  /** Item 14 ("Finkel's version"): whether this king has begged gold in Finkel's words, which a greedy king does once. */
  begged = false;
  turn = 0;
  /** The vassal bonds this court knows, read each season (vassals.ts, item 11+). */
  bonds: VassalTerms[] = [];
  /** The overlords we still choose to serve, and when we last weighed each bond. */
  readonly serving = new HSet<Power>();
  readonly weighed = new Dict<Power, number>();
  /** This season's tribute owed: to whom, and how much; null when none is due or we no longer pay. */
  tributeDue: [Power, number] | null = null;
  /** When we last sent tribute to each overlord, and when each vassal's last reached us. */
  readonly tributePaid = new Dict<Power, number>();
  readonly tributeIn = new Dict<Power, number>();
  /** When we last offered or demanded a bond of each king. */
  readonly bondAsked = new Dict<Power, number>();
  /** The overlord we serve and the vassals that pay us: friends by the bond, whatever else stands between us. */
  readonly bondFriends = new HSet<Power>();

  /**
   * Each king's treasury as this court reckons it (our own exactly): what he started with, plus each season's income from
   * the land he holds, less the upkeep of the troops we think he has and a servant's wages, less what the cities he bought
   * and the troops he raised cost him.
   */
  readonly treasury = new Dict<Power, number>();
  /** The most troops we have known each king to have at once: more than that means he raised some. */
  private readonly mostSeen = new Dict<Power, number>();

  /** How this king pictures each rival, for guessing their orders (see Search). */
  readonly models = new Dict<Power, Brain>();

  private swornFor: Board | null = null;
  private sworn = new HSet<Power>();

  constructor(me: Power, seed: number, p: Personality | null = null) {
    this.me = me;
    this.seed = seed;
    this.p = p ?? personalityFor(me, seed);
    for (const x of AllPowers.filter((x) => x !== me)) this.rel.set(x, new Relation());
    // Every court knows how many troops and how much gold each king started with.
    for (const [k, g] of groupBy(
      StartUnits.filter((u) => u.power !== me),
      (u) => u.power,
    )) {
      this.armySeen.set(k, [g.length, 1]);
      this.mostSeen.set(k, g.length);
    }
    for (const u of StartUnits.filter((u) => u.power !== me)) this.sightings.set(u.province, [u.power, u.kind, 1]);
    for (const x of AllPowers) this.treasury.set(x, StartGold.get(x)!);
  }

  r(turn: number, purpose: string): Rng {
    return Rng.for(this.seed, turn, "bot:" + purpose, this.me);
  }

  /** Reads the season's news and updates trust and grudges. Called once per season, before deciding. */
  learn(v: SeatView, b: Board): void {
    if (v.turn === this.turn) return;
    this.turn = v.turn;
    const P = this.p;

    // Wrongs fade; trust drifts back towards indifference.
    for (const r of this.rel.values()) {
      r.grudge *= 1 - 0.12 * (1 - P.vengeance);
      r.trust += (0 - r.trust) * 0.05;
      r.treaty = false;
      r.allied = false;
      r.against = null;
    }

    // Sealed tablets we hold with another king (unless shown to be forged), the latest last.
    for (const t of sortBy(
      v.tablets.filter((t) => t.sealedTurn !== null && t.seals.includes(this.me) && t.seals.length >= 2 && t.authResult?.includes("forgery") !== true),
      [(t) => t.sealedTurn, cmpOpt(cmpNum)],
    )) {
      // A coalition names the king it stands against, by any of his names (see Names).
      const against = againstIn(t, t.seals);
      for (const other of t.seals.filter((s) => s !== this.me && this.rel.has(s))) {
        const r = this.rel.get(other);
        r.treaty = true;
        if (t.allianceOath) r.allied = true;
        if (against !== null) r.against = against;
      }
    }

    // Land taken from us.
    const previous = this.lastOwner;
    for (const [prov, was] of previous) {
      const taker = b.ownerOf(prov);
      if (was !== this.me || taker === null || taker === this.me || !this.rel.has(taker)) continue;
      this.wronged(taker, 2 + Board.Map.get(prov).yield / 20.0, -0.4, v.turn);
    }
    // Conquests anywhere on the public map (a purchase keeps the walls; a city that falls loses a level of them). We see the
    // walls only where we see troops: a free city that changed hands out of our sight was bought or taken, we cannot tell
    // which, so it counts half as each.
    for (const k of [...this.belligerence.keys()]) this.belligerence.set(k, this.belligerence.get(k) * 0.7);
    for (const [prov, was] of previous) {
      const now = b.ownerOf(prov);
      if (now === null || now === was || now === this.me) continue;
      if (was === null && !v.visible.includes(prov)) {
        this.treasury.set(now, this.treasury.get(now) - b.worth(prov) / 2);
        this.belligerence.set(now, this.belligerence.getOrDefault(now, 0) + 0.5);
        continue;
      }
      if (was === null && b.walls(prov) && b.wallLevel(prov) === this.lastWalls.getOrDefault(prov, 0)) {
        this.treasury.set(now, this.treasury.get(now) - b.worth(prov));
        continue;
      }
      this.belligerence.set(now, this.belligerence.getOrDefault(now, 0) + (was === null ? 1 : 1.5));
    }
    this.lastOwner = v.owner.clone();
    this.lastWalls = v.walls.clone();

    // What we saw happen last season. A move into our land on a third king's troop standing in it struck him, not us: a
    // relief, and no wrong. It wrongs us still if he takes the land, which counts below as land taken.
    const onAnother = (t: string, mover: Power): boolean => v.lastSeason.some((x) => x.province === t && x.power !== mover && x.power !== this.me && x.order !== "move");
    for (const o of v.lastSeason) {
      if (o.power === this.me || !this.rel.has(o.power)) continue;
      const r = this.rel.get(o.power);
      const t = o.target;
      // A guest entering by the passage or basing we granted (item 9) wrongs nobody; one that takes the land does, below.
      if (o.order === "move" && t !== null && !o.guest && (b.isMine(t) || previous.getOrDefault(t, null) === this.me) && !onAnother(t, o.power)) this.wronged(o.power, 1, -0.25, v.turn);
      if (o.order === "support" && o.helped === this.me && o.succeeded) {
        r.supportsGiven++;
        r.trust = Math.min(1, r.trust + 0.15);
      }
      const into = o.to;
      if (o.order === "support" && o.helped !== this.me && into !== null && previous.getOrDefault(into, null) === this.me && !onAnother(into, o.helped ?? o.power)) r.grudge += 0.5;
    }

    this.claims = v.claims;
    // Promises of support for seasons gone by are spent (item 8).
    for (const list of [this.promised, this.offered]) for (let i = list.length - 1; i >= 0; i--) if (list[i].turn < v.turn) list.splice(i, 1);

    for (const item of v.inbox) {
      for (const other of this.rel.keys()) {
        const name = other as string;
        const r = this.rel.get(other);
        switch (item.kind) {
          case "Assay":
            if (!item.body.includes("from " + name)) break;
            if (item.body.includes("(100%)")) r.trust = Math.min(1, r.trust + 0.05);
            else this.wronged(other, 1.5, -0.3, -99);
            break;
          case "Rumor":
            if (item.body.includes("has not returned from the court of " + name)) this.wronged(other, 1, -0.3, -99);
            else if (item.body.includes("forged by") && item.body.includes("of " + name)) r.trust -= 0.4;
            break;
          case "Notice":
            if (!item.body.includes("confesses to serving " + name)) break;
            this.wronged(other, 1, -0.3, -99);
            this.lastSpyCaught = v.turn;
            break;
          case "Audience": {
            if (!item.title.endsWith("envoy of " + name)) break;
            const weighed = /weighers found ([^.]+)\./.exec(item.body);
            if (weighed !== null) {
              const w = shekels(weighed[1]);
              if (w > 0) r.trust = Math.min(1, r.trust + Math.min(0.25, w / 400.0));
            }
            r.trust += sentiment(item.body) * 0.05;
            break;
          }
          case "EnvoyReport":
            if (item.body.includes("court of " + land(other))) r.trust += sentiment(item.body) * 0.08;
            break;
        }
      }
      if (item.kind === "Notice" && item.title === "A spy is caught") this.lastSpyCaught = v.turn;
      // Our envoy's word that a host offered it a post and that it refused: the host tried to buy our servant, a small
      // slight, and the servant proved true, so it is the first chosen, among the equally reliable, for the letters that
      // carry tablets or gold.
      // The host's answer in clauses, as our envoy reported it (item 8).
      if (item.kind === "EnvoyReport" && item.clauses.length > 0) readReport(item, this, b, v.turn);
      if (item.kind === "EnvoyReport") {
        const refused = /The king of (\S+) offered me a post in his service, and I refused it/.exec(item.body);
        const poacher = refused !== null ? (AllPowers.find((x) => land(x) === refused[1]) ?? null) : null;
        if (poacher !== null && poacher !== this.me && this.rel.has(poacher)) {
          this.rel.get(poacher).trust -= 0.05;
          if (item.subject !== null) this.provenLoyal.add(item.subject);
        }
      }
      this.learnOfPeople(v, item);
    }

    // Our spies at their posts, and since when (a spy sent elsewhere starts again).
    for (const c of v.court) {
      if (c.duty.startsWith("watching ")) {
        const post = c.duty.slice("watching ".length);
        const at = this.posted.tryGet(c.id);
        if (at === undefined || at[0] !== post) this.posted.set(c.id, [post, v.turn]);
      } else {
        this.posted.delete(c.id);
        this.recalled.delete(c.id);
      }
    }
    for (const gone of [...this.posted.keys()].filter((id) => v.court.every((c) => c.id !== id))) this.posted.delete(gone);

    // Our own people we have word are overdue: since when, for as long as their line still says so.
    for (const id of [...this.missingSince.keys()].filter((id) => !v.court.some((c) => c.id === id && overdue(c)))) this.missingSince.delete(id);
    for (const c of v.court.filter(overdue)) this.missingSince.tryAdd(c.id, v.turn);

    // Troops seen, for judging each king's strength.
    for (const prov of v.visible) this.sightings.delete(prov);
    for (const u of v.units.filter((u) => u.power !== this.me)) this.sightings.set(u.province, [u.power, u.kind, v.turn]);

    // What we cannot see we keep in mind, forgetting a troop a year once it is out of sight.
    for (const x of this.rel.keys()) {
      const seen = v.units.filter((u) => u.power === x).length;
      const [known, when] = this.armySeen.getOrDefault(x, [0, 0]);
      if (seen >= known) this.armySeen.set(x, [seen, v.turn]);
      else if (v.turn - when >= 3) this.armySeen.set(x, [Math.max(seen, known - 1), v.turn]);
      if (b.provinces(x) === 0 && seen === 0) this.armySeen.set(x, [0, v.turn]);
    }
    for (const item of v.inbox.filter((i) => i.kind === "SpyReport"))
      for (const [key, g] of groupBy([...item.body.matchAll(SpiedUnit)], (m) => m[1])) {
        const spied = parsePower(key);
        if (spied !== null && spied !== this.me) this.armySeen.set(spied, [Math.max(g.length, this.armySeen.getOrDefault(spied, [0, 0])[0]), v.turn]);
      }

    // The season's accounts, as far as they can be guessed: income in, upkeep and wages out, levies paid for.
    for (const x of this.rel.keys()) {
      if (v.fallen.includes(x)) {
        this.treasury.set(x, 0);
        continue;
      }
      const troops = this.armySeen.getOrDefault(x, [0, 0])[0];
      const raised = Math.max(0, troops - this.mostSeen.getOrDefault(x, 0));
      this.mostSeen.set(x, Math.max(troops, this.mostSeen.getOrDefault(x, 0)));
      let income = 0;
      for (const [k, o] of v.owner.entries()) if (o === x) income += v.yields.tryGet(k) ?? Board.Map.get(k).yield;
      const flow = income - troops * v.prices.getOrDefault("armyUpkeep", 30) - WagesGuess - raised * v.prices.getOrDefault("army", 100);
      // Troops that cannot be paid desert: a treasury runs dry, it does not go into debt.
      this.treasury.set(x, Math.max(0, this.treasury.get(x) + flow));
    }
    this.treasury.set(this.me, v.gold);

    for (const r of this.rel.values()) r.trust = clamp(r.trust, -1, 1);
  }

  /**
   * Partners who swore with us against a king, while he is still worth standing against (alive, and at or near the top as
   * we reckon it, or still taking land), with the king they swore against.
   */
  coalitions(b: Board): [Power, Power][] {
    const growths = [...b.alive].map((p) => b.growth(p));
    const top = growths.length === 0 ? 0 : max(growths, (x) => x);
    const out: [Power, Power][] = [];
    for (const [x, r] of sortBy(this.rel.entries(), [([k]: [Power, Relation]) => k, cmpPower])) {
      const foe = r.against;
      if (foe === null || foe === this.me || !r.treaty || r.oathsBroken > 0 || !b.alive.has(x) || !b.alive.has(foe)) continue;
      const racing = b.growth(foe) >= top - 0.2 && b.growth(foe) >= 1;
      const marching = this.belligerence.getOrDefault(foe, 0) >= 0.8 || this.rel.get(foe).hostile;
      if (!racing && !marching) continue;
      out.push([x, foe]);
    }
    return out;
  }

  /** The kings we stand against with sworn partners this season. */
  swornFoes(b: Board): HSet<Power> {
    if (this.swornFor !== b) {
      this.swornFor = b;
      this.sworn = new HSet(this.coalitions(b).map(([, a]) => a));
    }
    return this.sworn;
  }

  /** Troops out of sight that are probably still where we last saw them: recent sightings, no more than each king is thought to have. */
  remembered(v: SeatView): UnitView[] {
    const list: UnitView[] = [];
    const recent = [...this.sightings.entries()].filter(([k, s]) => v.turn - s[2] <= 3 && !v.visible.includes(k) && !v.fallen.includes(s[0]));
    for (const [power, g] of groupBy(recent, ([, s]) => s[0])) {
      const room = Math.max(0, this.armySeen.getOrDefault(power, [0, 0])[0] - v.units.filter((u) => u.power === power).length);
      list.push(
        ...sortBy(g, [([, s]: [string, [Power, UnitKind, number]]) => s[2], desc(cmpNum)], [([k]: [string, [Power, UnitKind, number]]) => k, cmpStr])
          .slice(0, room)
          .map(([k, s]) => ({ power, kind: s[1], province: k }) as UnitView),
      );
    }
    return list;
  }

  private wronged(who: Power, grudge: number, trust: number, turn: number): void {
    const r = this.rel.get(who);
    r.grudge += grudge * (0.6 + this.p.vengeance);
    r.trust = Math.max(-1, r.trust + trust);
    if (turn > 0) r.lastAttackedUs = turn;
    if (r.treaty && turn > 0) {
      r.oathsBroken++;
      r.trust = Math.max(-1, r.trust - 0.5);
      r.grudge += 2;
    }
  }

  /** How likely another king is to attack us this season. */
  hostility(other: Power, b: Board): number {
    const r = this.rel.get(other);
    let h = 0.3;
    // A king who has been taking land lately, anyone's, may take ours next.
    h += Math.min(0.3, this.belligerence.getOrDefault(other, 0) * 0.08);
    // Troops massed on our border say more than letters.
    const mine = new HSet<string>();
    for (const [k, o] of b.v.owner.entries()) if (o === this.me) mine.add(k);
    const posture = b.others.filter((u) => u.power === other && Board.Map.neighbors(u.province).some((n) => mine.has(n))).length;
    h += Math.min(6, posture) * 0.04;
    if (r.lastAttackedUs >= this.turn - 3) h += 0.35;
    if (r.lastWeAttacked >= this.turn - 3) h += 0.3;
    h += Math.min(0.3, r.grudge * 0.04);
    h -= r.trust * 0.3;
    if (r.treaty && r.oathsBroken === 0) h -= 0.3;
    if (r.allied && r.oathsBroken === 0) h -= 0.2;
    if (b.leader() === this.me) h += 0.15;
    return clamp(h, 0.05, 0.95);
  }

  /**
   * What one item of the season's news says of people: our own servant caught keeping gold, a servant without the hand to
   * forge, a captive nobody will pay for or whose ransom lapsed, and troops or land a king gave us.
   */
  private learnOfPeople(v: SeatView, item: InboxItem): void {
    const ours = (test: (c: CharacterView) => boolean): CharacterView | null => v.court.find((c) => c.ours && test(c)) ?? null;
    switch (item.kind) {
      case "EnvoyReport": {
        const lot = /\[The inventory lists (.+?) of gold; your weighers found (.+?)\.\]/.exec(item.body);
        if (item.subject !== null && lot !== null && shekels(lot[2]) < shekels(lot[1])) this.thieves.add(item.subject);
        break;
      }
      // Our own examination: the forger who brought the inventory, named.
      case "Authentication": {
        const hand = /trace it to the hand of (.+?), who brought it/.exec(item.body);
        const thief = hand !== null ? ours((c) => c.name === hand[1]) : null;
        if (thief !== null) this.thieves.add(thief.id);
        break;
      }
      // Another court's examination, announced to every court: an inventory brought by our envoy was forged by it.
      case "Rumor": {
        const thief = ours((c) => item.body.includes(`brought by ${c.name}, envoy of ${this.me}, was forged by ${c.name}`));
        if (thief !== null) this.thieves.add(thief.id);
        // A king who closes his roads to our people (item 7b) means us no good.
        if (item.title === RoadsTitle && item.body.includes("has closed his roads")) {
          const closer = AllPowers.find((x) => x !== this.me && item.body.includes(`king of ${land(x)} `)) ?? null;
          if (closer !== null && this.rel.has(closer)) {
            const r = this.rel.get(closer);
            r.trust = Math.max(-1, r.trust - 0.1);
          }
        }
        break;
      }
      case "Rejected":
        if (item.title === "Forgery botched" && item.subject !== null) this.noHand.add(item.subject);
        else if (item.title === "An envoy would not leave" && item.subject !== null) this.wouldNotLeave.set(item.subject, v.turn);
        else if (item.title === "Orders that could not be carried out")
          for (const line of item.body.split("\n")) {
            const m = line.includes("nobody is left to") ? /the captive (\S+):/.exec(line) : null;
            if (m !== null) this.unclaimed.add(m[1]);
            const h = line.includes("cannot come to yours") ? /^- hire (\S+) at /.exec(line) : null;
            if (h !== null) this.heldElsewhere.add(h[1]);
          }
        break;
      case "Notice":
        if (item.title === "No ransom came" && item.subject !== null) this.ransomLapsed.set(item.subject, this.ransomLapsed.getOrDefault(item.subject, 0) + 1);
        break;
      // A king who places his troops under our command, or cedes us land, is a friend indeed.
      case "Resolution": {
        if (item.title !== "Troops received" && item.title !== "Land received") break;
        const giver = AllPowers.find((x) => x !== this.me && item.body.startsWith(x + " has ")) ?? null;
        if (giver === null || !this.rel.has(giver)) break;
        const r = this.rel.get(giver);
        r.trust = Math.min(1, r.trust + (item.title === "Land received" ? 0.35 : 0.25));
        r.supportsGiven++;
        if (item.title === "Land received") {
          const ceded = Board.Map.provinces.find((x) => item.body.endsWith(` ceded ${x.name} to you.`));
          if (ceded !== undefined) this.received.add(ceded.id);
        }
        break;
      }
    }
  }

  /** A full ally, or a treaty partner we still trust a little; either way, one who has broken no oath to us. */
  isFriend(other: Power): boolean {
    const r = this.rel.get(other);
    return (r.oathsBroken === 0 && (r.allied || (r.treaty && r.trust > -0.2))) || this.bondFriends.has(other);
  }
}

const SpiedUnit = /([\p{L}\p{Mn}\p{Nd}\p{Pc}]+) (?:has|had) (?:an army|a fleet) in/gu;

/** One of our people whose line reads that they have not returned: the overdue word has come, and nothing since. */
function overdue(c: CharacterView): boolean {
  return c.duty.startsWith("has not returned");
}

/** Crude reading of a letter's warmth: +1 friendly, -1 hostile. */
function sentiment(text: string): number {
  const t = text.toLowerCase();
  const warm = ["brother", "love", "friend", "peace", "sealed", "gift", "rejoice", "gracious", "kindly"];
  const cold = ["not forgotten", "regret", "withdraw", "war", "punish", "liar", "false", "broke", "detain", "will not seal"];
  return clamp(warm.filter((w) => t.includes(w)).length * 0.5 - cold.filter((w) => t.includes(w)).length, -2, 2) / 2;
}

/** Reads an amount written as "2 minas 15 shekels", "1 mina" or "45 shekels". */
export function shekels(text: string): number {
  const minas = /(\d+) minas?/.exec(text);
  const sh = /(\d+) shekels?/.exec(text);
  return (minas !== null ? Number(minas[1]) * 60 : 0) + (sh !== null ? Number(sh[1]) : 0);
}
