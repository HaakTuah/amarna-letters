/**
 * Whom a province obeys (build order item 17++; "Whom a province obeys", "Loyalty is a ledger", "Revolt follows
 * conditions, not dice" and "The people defend their land" under War, "A head rises where men lack one" and "Land without
 * a ruler" under Bands). No province is owned by a flag: each season it obeys whoever it fears or loves most, force (troops
 * in or next to it, against its own men of fighting age) plus love (its ledger of what each actor gave and took there), and
 * no one if nobody's weight clears what its people accept. Conquest, revolt, absorption and turning are this one rule; a
 * change of hands needs a clear margin and comes as news with its cause; obedience has degrees by the margin it is held by.
 * Persons do not obey a ledger: a character leads a rising only where he wants the province (his stakes and traits), and
 * the ledger decides whether its people follow him.
 *
 * The holder never sees a number: his governor reports the people's mood in words (and a disloyal one who wants the
 * province says all is quiet), his spies report it of the provinces they watch, and the people complain when troops take
 * their food. The weights are `UnrestData`, first guesses for item 18.
 */
import { Dict } from "../core/collections.ts";
import { clamp, idiv } from "../core/num.ts";
import { cmpStr, sortBy } from "../core/seq.ts";
import { BandData, type Band } from "../model/bands.ts";
import { BattleData, battleLosses } from "../model/command.ts";
import { menIn, shareOfFull, wallMenOf } from "../model/land.ts";
import { EconomyData } from "../model/economy.ts";
import { gain, newRisingView, remember, type Character } from "../model/people.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { findCharacter, isAlive, logEvent, newId, newUnit, siegeOf, wallsOf, type Unit } from "../model/state.ts";
import { newMindRequest } from "../model/exchanges.ts";
import { UnrestData, moodWords } from "../model/unrest.ts";
import { terrainOf } from "../model/geography.ts";
import { levelOf } from "../model/works.ts";
import { Views } from "../rules/views.ts";
import { TurnEngine, travelTurns } from "./core.ts";
import { eliteGold } from "./rulers.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** The people of `province` remember `points` taken from them by `by` (a power, or a character's id). */
    take(province: string, by: string, points: number): void;
    /** The people of `province` remember `points` given them by `by` (a power, or a character's id). */
    give(province: string, by: string, points: number): void;
    /** The hand its people see when `p` takes or gives in `province`: his governor there, or the king himself. */
    handOf(province: string, p: Power): string;
    /**
     * Force: the troops of `p` standing in `province`, and for its holder next to it, against its own men of fighting age;
     * leaving out those `without` names (a governor's levies, which would follow him).
     */
    forceIn(province: string, p: Power, without?: ((u: Unit) => boolean) | null): number;
    /** What `p` weighs with the people of `province`: force plus love, his own and that of the men serving him there. */
    weightIn(province: string, p: Power, strength?: Dict<Power, number>): number;
    /** The unrest at which a province is near breaking from its holder, as `restless` counts it. */
    revoltAt(province: string): number;
    /** A character of standing in `province` who wants it, against its holder: the man who would lead its revolt. */
    wantsIt(province: string): Character | null;
    /** How firmly `province` obeys its holder now (`GameState.obeyed`): reckoned each season, and when it changes hands. */
    reckonObedience(province: string, strength?: Dict<Power, number>): number;
    /**
     * Whether the people of `province` would follow `c` rather than its holder, and those of the holder's levies there
     * (raised from it, under no commander) who follow him: split off from the rest, which stay the king's.
     */
    turnsWith(province: string, c: Character): { province: boolean; levies: Unit[] };
    /** Each season, once the people have eaten: the ledger kept, whom each province obeys, governors' reports, rulers rising in lawless land. */
    obeySeason(): void;
  }
}

const P = TurnEngine.prototype;
const D = UnrestData;

P.take = function (province, by, points) {
  if (points > 0) entry(this, province, by, -points);
};

P.give = function (province, by, points) {
  if (points > 0) entry(this, province, by, points);
};

function entry(e: TurnEngine, province: string, by: string, points: number): void {
  const S = e.s;
  let book = S.ledger.tryGet(province);
  if (book === undefined) S.ledger.set(province, (book = new Dict()));
  const v = book.getOrDefault(by, 0) + points;
  if (v === 0) book.delete(by);
  else book.set(by, v);
}

/** The ledger of `province` with `actor`: what he gave there less what he took, faded with time. */
function standing(e: TurnEngine, province: string, actor: string): number {
  return e.s.ledger.tryGet(province)?.getOrDefault(actor, 0) ?? 0;
}

P.handOf = function (province, p) {
  const gov = this.governorOf(province);
  return gov !== null && gov[0].power === p ? gov[1].id : p;
};

P.revoltAt = function () {
  return D.threshold;
};

/**
 * Whether a script `c`, in a province held by `holder`, wants it by the strategy his traits give him ("Stakes, not
 * dispositions"): ambitious, and not loyal to its holder. A model character answers for himself (`risePlan`).
 */
function wants(c: Character, holder: Power): boolean {
  return c.status !== "Dead" && c.status !== "Captured" && c.traits.ambition >= D.wants && (c.employer !== holder || c.traits.loyalty < D.disloyal);
}

/** Whether `c` chose, last season when he was asked, to lead the people of `province` against its master. */
function chose(e: TurnEngine, c: Character, province: string): boolean {
  const plan = c.risePlan;
  return plan !== null && plan.province === province && plan.turn === e.s.turn - 1 && plan.rise;
}

/** Whether `c` stands in `province`: at the court there, governing it, or posted to it as a resident or a watcher. */
function standsIn(e: TurnEngine, c: Character, province: string): boolean {
  if (c.status === "Dead" || c.status === "Captured") return false;
  if (c.at !== null && e.courtAt(c.at) === province) return true;
  const gov = e.governorOf(province);
  return (gov !== null && gov[1] === c) || (c.watchProvince === province && c.status === "Employed");
}

P.wantsIt = function (province) {
  return leaders(this, province).find((c) => chose(this, c, province)) ?? null;
};

/**
 * The men of standing in `province` whose people might follow them against its holder, the one they would follow most
 * first: his own governor there, a chief with his band there, and a man of standing among its people (a claimant, a town's
 * ruler, a former ruler of it) standing there and not in its holder's service. The ledger decides whom they would follow;
 * whether a man leads them is his own choice.
 */
function leaders(e: TurnEngine, province: string): Character[] {
  const S = e.s;
  const holder = S.owner.getOrDefault(province, null);
  if (holder === null) return [];
  const name = e.map.get(province).name;
  const found: Character[] = [];
  const able = (c: Character): boolean => c.status !== "Dead" && c.status !== "Captured";
  const gov = e.governorOf(province);
  if (gov !== null && gov[0].power === holder && able(gov[1])) found.push(gov[1]);
  for (const b of e.bandsAt(province).filter((b) => b.men >= BandData.least)) {
    const c = findCharacter(S, b.leaderId);
    if (c !== null && able(c)) found.push(c);
  }
  for (const c of S.characters)
    if (
      c.employer !== holder &&
      standsIn(e, c, province) &&
      (standing(e, province, c.id) > 0 || c.facts.some((f) => f.tag === "origin" && f.text.startsWith("Ruled ") && f.text.includes(`from ${name}.`)))
    )
      found.push(c);
  return sortBy([...new Set(found)], [(c: Character) => -characterWeight(e, province, c), (a: number, b: number) => a - b], [(c: Character) => c.id, cmpStr]);
}

/**
 * Each man whose people would follow him clear of their master this season, and who has not answered for it, is asked
 * whether he leads them ("Rising"): a script answers by his traits, a model for himself; a rising he chooses breaks out
 * the next season, if they would still follow him then.
 */
function askLeaders(e: TurnEngine, province: string, holder: Power, held: number): void {
  const S = e.s;
  for (const c of leaders(e, province)) {
    const w = characterWeight(e, province, c);
    // A man in the holder's service there lends him his own following until he turns: weighed without it.
    const his = c.employer === holder && c.status === "Employed" && !chose(e, c, province) ? standing(e, province, c.id) : 0;
    if (w <= held - his + D.margin) continue;
    // Asked this season already, or his choice to lead them stands for this one.
    if (chose(e, c, province) || (c.risePlan !== null && c.risePlan.turn === S.turn && c.risePlan.province === province)) continue;
    c.risePlan = { turn: S.turn, province, rise: wants(c, holder) };
    const gov = e.governorOf(province);
    const band = e.bandOf(c);
    e.mindRequests.push(
      newMindRequest({
        id: newId(S, "r"),
        task: "Rising",
        characterId: c.id,
        court: null,
        rising: newRisingView({
          turn: S.turn,
          province,
          name: e.map.get(province).name,
          holder,
          employer: c.employer,
          governs: gov !== null && gov[1] === c,
          followers: Math.round(risenMen(e, province, holder, c) / 100) * 100,
          troops: S.units.filter((u) => u.power === holder && u.province === province).reduce((a, u) => a + menIn(u), 0),
          band: band !== null && band.province === province && !band.ship ? band.men : 0,
        }),
      }),
    );
  }
}

/**
 * The men of fighting age a force is weighed against, as they defend their land ("The people defend their land"): by
 * their number and by the ground, so that hill land full of hardy men is dear to cow and a plain of peasants cheap; at
 * least one, so that troops in an empty land count in full.
 */
function menOf(e: TurnEngine, province: string): number {
  const men = Math.max(1, e.peopleOf(province).men);
  const t = terrainOf(province);
  return t === "Rough" ? men * 2 : t === "Open" ? Math.max(1, idiv(men, 2)) : men;
}

/**
 * Force from `men` standing in a province and `near` next to it or at its gates, against its own men: those next door
 * weigh a quarter as much, and at most `nearMost` together, since they answer it only when they march.
 */
function forceOf(e: TurnEngine, province: string, men: number, near: number): number {
  if (men + near <= 0) return 0;
  const of = 4 * menOf(e, province);
  return Math.min(D.forceMost, idiv(D.force * men * 4, of) + Math.min(D.nearMost, idiv(D.force * near, of)));
}

P.forceIn = function (province, p, without = null) {
  const S = this.s;
  if (!isAlive(S, p)) return 0;
  // A foe before walls he has not stormed stands at its gates, not within them: his men weigh as men next door do.
  const outside = S.owner.getOrDefault(province, null) !== p && wallsOf(S, province) > 0 && (S.breached.tryGet(province) ?? null) !== p;
  const next = new Set(this.map.neighbors(province));
  let men = 0;
  let near = 0;
  for (const u of S.units) {
    if (u.power !== p || u.kind !== "Army" || this.guestOf(u) !== null || (without !== null && without(u))) continue;
    if (u.province === province && !outside) men += menIn(u);
    else if (u.province === province || next.has(u.province)) near += menIn(u);
  }
  return forceOf(this, province, men, near);
};

/** The love its people bear `p` and the men serving him there who do not want it for themselves. */
function loveOf(e: TurnEngine, province: string, p: Power): number {
  let love = standing(e, province, p);
  for (const [actor, v] of e.s.ledger.tryGet(province)?.entries() ?? []) {
    if (actor === p) continue;
    const c = findCharacter(e.s, actor);
    if (c !== null && c.employer === p && c.status === "Employed" && standsIn(e, c, province) && !chose(e, c, province)) love += v;
  }
  return love;
}

/** The master's weakness: his court's city besieged, his realm shrunk below what it started with. */
function weakness(e: TurnEngine, p: Power, strength: Dict<Power, number>): number {
  const S = e.s;
  let w = siegeOf(S, e.courtAt(p)) !== null ? D.besieged : 0;
  let now = strength.tryGet(p);
  if (now === undefined) strength.set(p, (now = e.strength(p)));
  const start = S.startStrength.getOrDefault(p, 0);
  if (start > 0 && now < start) w += clamp(idiv(D.weakness * (start - now), start), 0, D.weakness);
  return w;
}

P.weightIn = function (province, p, strength = new Dict<Power, number>()) {
  const holder = this.s.owner.getOrDefault(province, null);
  return this.forceIn(province, p) + loveOf(this, province, p) - (p === holder ? weakness(this, p, strength) : 0);
};

/** What a character weighs with the people of `province`: his standing there, and his band's men as force. */
function characterWeight(e: TurnEngine, province: string, c: Character): number {
  const band = e.bandOf(c);
  const men = band !== null && band.province === province && !band.ship ? band.men : 0;
  return standing(e, province, c.id) + forceOf(e, province, men, 0);
}

/** The weight a province's holder must keep: his own, or, held by nobody, the floor its people accept. */
function holderWeight(e: TurnEngine, province: string, strength: Dict<Power, number>): number {
  const holder = e.s.owner.getOrDefault(province, null);
  return holder === null || !isAlive(e.s, holder) ? D.floor : e.weightIn(province, holder, strength);
}

/** Whether `w` clears `against` by the margin: exactly at it, the seeded dice decide. */
function clears(e: TurnEngine, province: string, w: number, against: number): boolean {
  if (w !== against + D.margin) return w > against + D.margin;
  return e.r("obey", province).chance(0.5);
}

/** Who would take a province from its holder: a power with troops standing in it, or a man of standing there who wants it. */
interface Rival {
  power: Power | null;
  character: Character | null;
  weight: number;
}

P.turnsWith = function (province, c) {
  const S = this.s;
  const holder = S.owner.getOrDefault(province, null);
  if (holder === null) return { province: false, levies: [] };
  const raised = (u: Unit): boolean => u.power === holder && u.province === province && u.home === province && u.commander === null;
  const levies: Unit[] = [];
  for (const u of S.units.filter(raised)) {
    u.men = menIn(u);
    // They follow him only as far as their ledger stands with him against their king; the rest stay the king's.
    const going = idiv(u.men * this.follows(u, c.id), 100);
    if (going <= 0) continue;
    if (going < u.men) {
      const stay = newUnit({ id: newId(S, "u"), power: u.power, kind: u.kind, province: u.province, home: u.home, men: u.men - going, food: idiv(u.food * (u.men - going), u.men), buy: u.buy });
      u.food -= stay.food;
      u.men = going;
      S.units.push(stay);
      this.armyEntry(stay, holder, S.armies.tryGet(u.id)?.getOrDefault(holder, 0) ?? 0);
    }
    levies.push(u);
  }
  const strength = new Dict<Power, number>();
  const held = this.forceIn(province, holder, (u) => levies.includes(u)) + loveOf(this, province, holder) - weakness(this, holder, strength);
  return { province: characterWeight(this, province, c) > held + D.margin, levies };
};

P.obeySeason = function () {
  const S = this.s;
  // Memory fades: every entry a tenth nearer nothing a season, and at least a point.
  for (const [prov, book] of [...S.ledger.entries()]) {
    for (const [k, v] of [...book.entries()]) {
      const left = v - Math.sign(v) * Math.max(1, idiv(Math.abs(v) * D.fade, 100));
      if (Math.sign(left) !== Math.sign(v) || left === 0) book.delete(k);
      else book.set(k, left);
    }
    if (book.size === 0) S.ledger.delete(prov);
  }
  this.armyLedgerSeason();
  stirSeason(this);
  seasonEntries(this);
  // A court's last report of land it lost stands until it hears of the loss, or holds it again.
  for (const [p, last] of [...S.ownLast.entries()]) {
    const known = isAlive(S, p) ? Views.knownHolders(S, this.map, p) : null;
    for (const id of [...last.keys()]) if (known === null || known.tryGet(id)?.owner !== p || S.owner.getOrDefault(id, null) === p) last.delete(id);
    if (last.size === 0) S.ownLast.delete(p);
  }
  // Every province reckoned before any changes hands, so that one change does not decide another.
  const strength = new Dict<Power, number>();
  const changes: [string, Rival | null][] = [];
  S.restless.clear();
  S.obeyed.clear();
  for (const prov of sortBy([...this.map.landProvinces], [(x) => x.id, cmpStr])) {
    const holder = S.owner.getOrDefault(prov.id, null);
    // Troops that broke in and have since left stand within its walls no more.
    const broke = (S.breached.tryGet(prov.id) ?? null);
    if (broke !== null && !S.units.some((u) => u.power === broke && u.province === prov.id)) S.breached.delete(prov.id);
    if (holder === null || !isAlive(S, holder)) {
      // Land without a ruler obeys a power whose troops' weight clears what its people accept; its own heads rise below.
      // Its walls keep out troops that have not stormed them: those at its gates take it only by siege or storm.
      const rival = bestRival(this, prov.id, null);
      const inside = rival?.power != null && (wallsOf(S, prov.id) <= 0 || (S.breached.tryGet(prov.id) ?? null) === rival.power);
      if (inside && siegeOf(S, prov.id) === null && clears(this, prov.id, rival.weight, D.floor)) changes.push([prov.id, rival]);
      continue;
    }
    const rival = bestRival(this, prov.id, holder);
    // A governor who would lead it takes with him the levies he raised there: they are no force against him.
    const gov = this.governorOf(prov.id);
    const levies = rival?.character != null && gov !== null && gov[1] === rival.character ? (u: Unit): boolean => u.home === prov.id && u.commander === null : null;
    const held = levies === null ? this.weightIn(prov.id, holder, strength) : this.forceIn(prov.id, holder, levies) + loveOf(this, prov.id, holder) - weakness(this, holder, strength);
    askLeaders(this, prov.id, holder, held);
    const lead = held - Math.max(rival?.weight ?? D.floor, D.floor);
    if (lead < D.threshold) S.restless.set(prov.id, D.threshold - lead);
    setDegree(S, prov.id, lead);
    // A besieged city is the siege's; at the court only a foe's troops standing in it take it (a coup is another thing,
    // which the game does not model).
    if (siegeOf(S, prov.id) !== null) continue;
    const within = (p: Power): boolean => S.units.some((u) => u.power === p && u.province === prov.id) && (wallsOf(S, prov.id) <= 0 || (S.breached.tryGet(prov.id) ?? null) === p);
    if (this.courtAt(holder) === prov.id && !(rival?.power != null && within(rival.power))) continue;
    if (rival !== null && clears(this, prov.id, rival.weight, held)) changes.push([prov.id, rival]);
    else if (held < D.floor) changes.push([prov.id, null]);
  }
  for (const [id, rival] of changes) changeHands(this, id, rival);
  reports(this);
  lawlessRulers(this);
};

/** How fully a province obeys at a lead of `lead`: a third at nothing, all of it from `full` (left out at a thousand). */
function setDegree(S: TurnEngine["s"], province: string, lead: number): void {
  const degree = clamp(333 + idiv(667 * lead, D.full), 333, 1000);
  if (degree < 1000) S.obeyed.set(province, degree);
  else S.obeyed.delete(province);
}

P.reckonObedience = function (province, strength = new Dict<Power, number>()) {
  const S = this.s;
  const holder = S.owner.getOrDefault(province, null);
  if (holder === null || !isAlive(S, holder) || this.map.get(province).isSea) {
    S.obeyed.delete(province);
    return 1000;
  }
  const rival = bestRival(this, province, holder);
  setDegree(S, province, this.weightIn(province, holder, strength) - Math.max(rival?.weight ?? D.floor, D.floor));
  return S.obeyed.getOrDefault(province, 1000);
};

/** The one who weighs most with a province against its holder, or null: powers by their troops in it, men by their standing. */
function bestRival(e: TurnEngine, province: string, holder: Power | null): Rival | null {
  const S = e.s;
  let best: Rival | null = null;
  const consider = (r: Rival): void => {
    if (best === null || r.weight > best.weight) best = r;
  };
  const powers = sortBy(
    [...new Set(S.units.filter((u) => u.power !== holder && u.kind === "Army" && u.province === province && isAlive(S, u.power)).map((u) => u.power))],
    [(x: Power) => x, cmpStr],
  );
  for (const p of powers) if (e.forceIn(province, p) > 0) consider({ power: p, character: null, weight: e.weightIn(province, p) });
  const c = holder === null ? null : e.wantsIt(province);
  if (c !== null)
    consider({
      power: null,
      character: c,
      weight: characterWeight(e, province, c),
    });
  return best;
}

/**
 * The season's entries in each province's ledger that need no order: hunger under its holder, and what its holder gives
 * by holding it (his troops there or beside it, its policing, a harvest left to people who ate their fill, a tax lighter
 * than the usual) or takes (a tax heavier than the usual), counted less the farther his court, except through his
 * governor there, whose own rule earns him his people's regard.
 */
function seasonEntries(e: TurnEngine): void {
  const S = e.s;
  for (const prov of sortBy([...e.map.landProvinces], [(x) => x.id, cmpStr])) {
    const holder = S.owner.getOrDefault(prov.id, null);
    if (holder === null || !isAlive(S, holder)) continue;
    const hand = e.handOf(prov.id, holder);
    const fed = S.fed.getOrDefault(prov.id, 1000);
    if (fed < 1000) e.take(prov.id, hand, idiv(D.hunger * (1000 - fed), 1000));
    const t = travelTurns(S.config, e.map, e.courtAt(holder), prov.id, S.turn);
    const seen = hand !== holder ? 100 : 100 - Math.min(D.farMost, D.far * Math.max(0, Number.isFinite(t) ? t - 1 : 4));
    let given = 0;
    const next = new Set(e.map.neighbors(prov.id));
    if (S.units.some((u) => u.power === holder && u.province === prov.id)) given += D.troops;
    else if (S.units.some((u) => u.power === holder && next.has(u.province))) given += D.near;
    given += D.policing * levelOf(S, "Policing", prov.id);
    e.give(prov.id, holder, idiv(given * seen, 100));
    if (fed >= 1000 && e.climatePercent(prov.id) >= 100) e.give(prov.id, hand, idiv(D.harvest * seen, 100));
    const over = idiv((e.taxRate(prov.id) - EconomyData.taxPercent) * D.tax, 10);
    if (over > 0) e.take(prov.id, hand, over);
    else e.give(prov.id, hand, idiv(-over * seen, 100));
  }
}

/** A province changes hands by the one rule: to the rival who outweighs its holder, or, with nobody, to no one. */
function changeHands(e: TurnEngine, id: string, rival: Rival | null): void {
  const S = e.s;
  const holder = S.owner.getOrDefault(id, null);
  const name = e.map.get(id).name;
  const seeing = (extra: Power[]): Power[] => [...new Set([...AllPowers.filter((x) => isAlive(S, x) && Views.sight(S, e.map, x).has(id)), ...extra])];
  if (holder === null) {
    if (rival?.power == null) return;
    const p = rival.power;
    e.setOwner(id, p);
    e.sack(id, p, true);
    e.takeArchive(p, id);
    e.tell(p, id, "Battle", "A province won", `${name}, which had no ruler, now answers to you: your men stand in it.`);
    logEvent(S, "obey", `${name}, which had no ruler, now answers to ${p}: its men stand in it.`, seeing([p]), "obey-power");
    return;
  }
  const love = standing(e, id, holder);
  const why = love < 0 ? `${holder} has taken more from it than he gave` : `${holder}'s hold on it was weak`;
  if (rival !== null && rival.power !== null) {
    const p = rival.power;
    const how = e.forceIn(id, p) >= loveOf(e, id, p) ? `${p}'s men stand at its gates` : `its people favour ${p}`;
    e.setOwner(id, p);
    // Taken by force: its taker's men carry off what they can, and a court's city gives up its archive.
    if (e.forceIn(id, p) > 0) e.sack(id, p, true);
    e.takeArchive(p, id);
    e.tell(holder, id, "Battle", "A province lost", `${name} now answers to ${p}: ${how}, and ${why}.`);
    e.tell(p, id, "Battle", "A province won", `${name} now answers to you: ${how}, and ${why}.`);
    logEvent(S, "obey", `${name} now answers to ${p}: ${how}, and ${why}.`, seeing([holder, p]), "obey-power");
    return;
  }
  const leader = rival?.character ?? null;
  const gov = e.governorOf(id);
  // A governor who leads it takes the levies he raised there with him; any other troops of the master there fight it.
  const levies = leader !== null && gov !== null && gov[1] === leader ? e.turnsWith(id, leader).levies : [];
  const troops = S.units.filter((u) => u.power === holder && u.province === id && !levies.includes(u));
  // The master's troops there meet the rising as combat says: its men against theirs.
  if (troops.length > 0 && !risingWins(e, id, holder, leader, troops, seeing)) return;
  if (leader !== null) {
    const band = e.bandOf(leader);
    const how =
      gov !== null && gov[1] === leader
        ? `his governor there, ${leader.name}`
        : band !== null
          ? `${leader.name}, chief of a band there`
          : `${leader.name}, whom its people favour`;
    e.tell(
      holder,
      id,
      "Battle",
      "A province rises",
      `${name} has risen against you, behind ${how}, and is lost to you: ${why}, and he rules it in his own name now.`,
    );
    logEvent(S, "revolt", `${name} rose against ${holder} behind ${leader.name}: ${why}.`, [], "revolt-led");
    remember(leader, S.turn, `The people of ${name} rose against ${holder}, and I led them.`);
    e.ruleOwn(id, leader, {
      how: "revolt",
      from: holder,
      followers: levies,
      gold: eliteGold(e, id),
      rising: band === null && levies.length === 0,
      band,
      story: `The people of ${name} rose against ${holder}, and you led them.`,
      memory: `The people of ${name} rose against ${holder}.`,
      line: `${leader.name} led ${name} in revolt against ${holder} and rules it in his own name`,
    });
    return;
  }
  // Nobody at its head and nobody it fears: it falls lawless ("Land without a ruler").
  e.setOwner(id, null);
  e.tell(
    holder,
    id,
    "Battle",
    "A province rises",
    `${name} has risen against you with nobody at its head: ${why}. Your officers were driven out, and it is held by nobody now.`,
  );
  logEvent(S, "revolt", `${name} rose against ${holder} with nobody at its head, and fell lawless: ${why}.`, seeing([holder]), "revolt-lawless");
}

/** The men who rise behind `leader` (with nobody at their head: against a master they hate), with his band there. */
function risenMen(e: TurnEngine, id: string, holder: Power, leader: Character | null): number {
  const love = loveOf(e, id, holder);
  const lean = leader === null ? -love : standing(e, id, leader.id) - Math.max(0, love);
  const band = leader === null ? null : e.bandOf(leader);
  return idiv(e.peopleOf(id).men * clamp(lean, D.riseLeast, 100), 100) + (band !== null && band.province === id && !band.ship ? band.men : 0);
}

/**
 * A rising against the master's troops standing in the province, fought as a battle is ("Revolt follows conditions, not
 * dice": troops of the master there fight them as combat says): the men who rise are its men of fighting age as far as
 * they lean to the man who leads them over their master (with nobody at their head, as far as they hate him), with his
 * band; the rest of its people stand aside, and those who still love their master fight beside his troops ("A garrison
 * keeps a town only as its people let it"). The loser loses men as battles say, the dead among them and the rest run;
 * beaten troops of the master stay where they stand, in land that answers to another now, and a rising beaten leaves its
 * leader followed by half as many. Returns whether the rising won.
 */
function risingWins(e: TurnEngine, id: string, holder: Power, leader: Character | null, troops: Unit[], seeing: (extra: Power[]) => Power[]): boolean {
  const S = e.s;
  const name = e.map.get(id).name;
  const people = e.peopleOf(id);
  for (const u of troops) u.men = menIn(u);
  const love = loveOf(e, id, holder);
  const risen = risenMen(e, id, holder, leader);
  const loyal = love > 0 ? idiv(people.men * Math.min(100, love), 100 * D.loyalShare) : 0;
  const rising = wallMenOf(risen, 100);
  const garrison = troops.reduce((a, u) => a + shareOfFull(u.kind, u.men), 0) + wallMenOf(loyal, 100);
  const who = leader === null ? "with nobody at their head" : `behind ${leader.name}`;
  if (garrison >= rising) {
    // Put down: the men who rose lose as a beaten side does, the dead among them, and the man who led them is followed by half as many.
    const x = battleLosses(garrison, rising);
    const lost = idiv(risen * x.loserPercent, 100);
    e.killSettled(id, idiv(idiv(lost * BattleData.dead, 100) * 1000, Math.max(1, people.settled)), idiv(idiv(lost * (100 - BattleData.dead), 100) * 1000, Math.max(1, people.settled)));
    for (const u of troops) u.men = Math.max(1, u.men - idiv(idiv(lost * x.winnerShare, 100) * u.men, Math.max(1, troops.reduce((a, t) => a + t.men, 0))));
    const book = S.ledger.tryGet(id);
    if (leader !== null && book !== undefined && book.has(leader.id)) book.set(leader.id, idiv(book.get(leader.id), 2));
    e.tell(holder, id, "Battle", "A rising put down", `The people of ${name} rose against you, ${who}, and your troops there put them down.`);
    logEvent(S, "revolt", `The people of ${name} rose against ${holder}, ${who}, and its troops there put them down.`, seeing([holder]), "revolt-crushed");
    return false;
  }
  // The rising wins: the master's troops lose as a beaten side does, the dead among them and the rest run; a unit left with
  // nobody is gone, its savings the people's spoil.
  const x = battleLosses(rising, garrison);
  for (const u of troops) {
    const lost = idiv(u.men * x.loserPercent, 100);
    people.loose += lost - idiv(lost * BattleData.dead, 100);
    u.men -= lost;
    if (u.men > 0) continue;
    e.spendAt(id, u.savings);
    S.units.splice(S.units.indexOf(u), 1);
    e.liftSiegesOf(u.id);
  }
  e.tell(holder, id, "Battle", "A garrison beaten", `The people of ${name} rose ${who} and beat your troops there.`);
  return true;
}

/**
 * Each governor reports his province's mood to his king, by courier, when it changes: in words, never the number. One who
 * wants the province himself says it is quiet (a governor "may misreport it").
 */
function reports(e: TurnEngine): void {
  const S = e.s;
  for (const g of sortBy([...S.governors], [(x) => x.province, cmpStr])) {
    const found = e.governorOf(g.province);
    if (found === null || found[0] !== g || S.owner.getOrDefault(g.province, null) !== g.power) continue;
    const c = found[1];
    const truth = moodWords(S.restless.getOrDefault(g.province, 0), e.revoltAt(g.province));
    const said = wants(c, g.power) ? "quiet" : truth;
    if (said === g.mood) continue;
    g.mood = said;
    e.tell(g.power, g.province, "Notice", "Your governor writes", `${c.name}, your governor of ${e.map.get(g.province).name}, writes that its people are ${said}.`);
  }
}

/**
 * Outside help: a spy watching a province for his master, with gold for it, spends a share among its people each season,
 * which they remember as his master's giving (it tells when his master's troops come); of what he hands out he keeps what his greed beyond his loyalty lets him.
 */
function stirSeason(e: TurnEngine): void {
  const S = e.s;
  // Gold for stirring that one no longer on his errand still carries (caught on the road, dismissed, turned): his purse
  // holds it now, on him wherever he is.
  for (const c of S.characters.filter((c) => c.stirGold > 0 && !(c.status === "Employed" && (c.duty === "SpyOutbound" || c.duty === "SpyPosted" || c.duty === "EnvoyHomebound")))) {
    gain(c, c.stirGold, "Skimmed");
    c.stirGold = 0;
  }
  for (const c of sortBy(
    S.characters.filter((c) => c.stirGold > 0 && c.duty === "SpyPosted" && c.watchProvince !== null),
    [(c: Character) => c.id, cmpStr],
  )) {
    const prov = c.watchProvince!;
    const holder = S.owner.getOrDefault(prov, null);
    if (holder === null || holder === c.employer) continue;
    const spent = Math.min(c.stirGold, Math.max(50, idiv(c.stirGold, 2)));
    c.stirGold -= spent;
    const kept = idiv(spent * Math.max(0, c.traits.greed - c.traits.loyalty), 200);
    if (kept > 0) gain(c, kept, "Skimmed");
    const given = spent - kept;
    e.spendAt(prov, given);
    if (c.employer !== null) e.give(prov, c.employer, idiv(given * D.stir, 100));
    remember(c, S.turn, `I spent ${given} shekels of my master's gold among the people of ${e.map.get(prov).name}, stirring them against ${holder}.`);
    logEvent(S, "stir", `${c.employer ?? "Someone"}'s agent spent ${given} shekels stirring the people of ${e.map.get(prov).name} against ${holder}.`, c.employer !== null ? [c.employer] : [], "stir");
  }
}

/**
 * Land without a ruler raises one in time ("A head rises in time"): a walled town with an elite of its own soon raises an
 * elder from among them, a thin land only bands behind chiefs; and a chief who holds such land long enough, with men
 * enough that its people cannot throw him out, comes to rule it: the new Idrimi, sooner for a commander who kept a king's
 * army than for a chief of the roads.
 */
function lawlessRulers(e: TurnEngine): void {
  const S = e.s;
  // Chiefs holding lawless land: a season more for each band that stayed where it was, its chief wanting it.
  for (const b of sortBy([...S.bands], [(x: Band) => x.id, cmpStr])) {
    const c = findCharacter(S, b.leaderId);
    const lawless = !b.ship && S.owner.getOrDefault(b.province, null) === null && !e.map.get(b.province).isSea;
    if (!lawless || c === null || c.traits.ambition < D.wants) {
      b.held = 0;
      b.heldAt = "";
      continue;
    }
    if (b.heldAt !== b.province) {
      b.heldAt = b.province;
      b.held = 0;
    }
    b.held++;
    const hold = b.rose === "commander" || b.rose === "captain" ? D.captainHold : D.chiefHold;
    const men = e.peopleOf(b.province).men;
    if (b.held < hold || b.men * 100 < men * D.chiefMen || S.units.some((u) => u.province === b.province)) continue;
    const name = e.map.get(b.province).name;
    e.ruleOwn(b.province, c, {
      how: "chief",
      from: null,
      followers: [],
      gold: eliteGold(e, b.province),
      rising: false,
      story: `Your band has held ${name} for ${b.held} seasons, and nobody else rules it.`,
      memory: `My band has held ${name} for ${b.held} seasons.`,
      line: `${c.name}, whose band held ${name}, rules it in his own name, a new Idrimi`,
      band: b,
    });
  }
  // An elder, in a walled town without a ruler.
  for (const prov of sortBy([...e.map.landProvinces], [(x) => x.id, cmpStr])) {
    if (S.owner.getOrDefault(prov.id, null) !== null || S.units.some((u) => u.province === prov.id)) continue;
    const walls = levelOf(S, "Walls", prov.id);
    if (walls <= 0) continue;
    const since = S.takenAt.getOrDefault(prov.id, S.turn);
    const rng = e.r("elder", prov.id);
    if (!rng.chance(Math.min(100, walls * D.elder + D.elderWait * (S.turn - since)) / 100)) continue;
    const c = e.newHead(prov.id, "elder", rng);
    e.ruleOwn(prov.id, c, {
      how: "elder",
      from: null,
      followers: [],
      gold: eliteGold(e, prov.id),
      rising: true,
      story: `${prov.name} had no ruler, and its people raised you from among them to rule them.`,
      memory: `${prov.name} had no ruler, and its people raised me to rule them.`,
      line: `The people of ${prov.name}, which had no ruler, raised ${c.name} from among them, and he rules it in his own name`,
    });
  }
}

