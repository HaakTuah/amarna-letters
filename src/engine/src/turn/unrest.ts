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
import { BattleData } from "../model/command.ts";
import { EconomyData } from "../model/economy.ts";
import { gain, remember, type Character } from "../model/people.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { findCharacter, isAlive, logEvent, siegeOf, type Unit } from "../model/state.ts";
import { UnrestData, moodWords } from "../model/unrest.ts";
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

/** Whether `c`, in a province held by `holder`, wants it: ambitious, and not loyal to its holder. */
function wants(c: Character, holder: Power): boolean {
  return c.status !== "Dead" && c.status !== "Captured" && c.traits.ambition >= D.wants && (c.employer !== holder || c.traits.loyalty < D.disloyal);
}

/** Whether `c` stands in `province`: at the court there, governing it, or posted to it as a resident or a watcher. */
function standsIn(e: TurnEngine, c: Character, province: string): boolean {
  if (c.status === "Dead" || c.status === "Captured") return false;
  if (c.at !== null && e.courtAt(c.at) === province) return true;
  const gov = e.governorOf(province);
  return (gov !== null && gov[1] === c) || (c.watchProvince === province && c.status === "Employed");
}

P.wantsIt = function (province) {
  const S = this.s;
  const holder = S.owner.getOrDefault(province, null);
  if (holder === null) return null;
  // His own governor there, disloyal and ambitious.
  const gov = this.governorOf(province);
  if (gov !== null && gov[0].power === holder && wants(gov[1], holder)) return gov[1];
  // A chief with his band there.
  const band = sortBy(
    this.bandsAt(province).filter((b) => b.men >= BandData.least),
    [(b: Band) => -b.men, (a: number, b: number) => a - b],
    [(b: Band) => b.id, cmpStr],
  ).find((b) => {
    const c = findCharacter(S, b.leaderId);
    return c !== null && wants(c, holder);
  });
  if (band !== undefined) return findCharacter(S, band.leaderId);
  // A man of standing among its people (a claimant, a town's ruler, a former ruler of it), free and standing there: the
  // one its people love most.
  const name = this.map.get(province).name;
  return (
    sortBy(
      S.characters.filter(
        (c) =>
          c.employer !== holder &&
          standsIn(this, c, province) &&
          wants(c, holder) &&
          (standing(this, province, c.id) > 0 || c.facts.some((f) => f.tag === "origin" && f.text.startsWith("Ruled ") && f.text.includes(`from ${name}.`))),
      ),
      [(c: Character) => -standing(this, province, c.id), (a: number, b: number) => a - b],
      [(c: Character) => c.id, cmpStr],
    )[0] ?? null
  );
};

/** The men of fighting age a force is weighed against: at least one, so that troops in an empty land count in full. */
function menOf(e: TurnEngine, province: string): number {
  return Math.max(1, e.peopleOf(province).men);
}

/** Force from `men` standing in a province and `near` next to it, against its own men. */
function forceOf(e: TurnEngine, province: string, men: number, near: number): number {
  if (men + near <= 0) return 0;
  return Math.min(D.forceMost, idiv(D.force * 10 * (men * 4 + near), 4 * menOf(e, province)));
}

P.forceIn = function (province, p, without = null) {
  const S = this.s;
  if (!isAlive(S, p)) return 0;
  // Next door counts only for its holder, whose men there answer it; a rival's men count once they stand in it.
  const holder = S.owner.getOrDefault(province, null) === p;
  const next = new Set(this.map.neighbors(province));
  let men = 0;
  let near = 0;
  for (const u of S.units) {
    if (u.power !== p || u.kind !== "Army" || this.guestOf(u) !== null || (without !== null && without(u))) continue;
    if (u.province === province) men += u.men;
    else if (holder && next.has(u.province)) near += u.men;
  }
  return forceOf(this, province, men, near);
};

/** The love its people bear `p` and the men serving him there who do not want it for themselves. */
function loveOf(e: TurnEngine, province: string, p: Power): number {
  let love = standing(e, province, p);
  for (const [actor, v] of e.s.ledger.tryGet(province)?.entries() ?? []) {
    if (actor === p) continue;
    const c = findCharacter(e.s, actor);
    if (c !== null && c.employer === p && c.status === "Employed" && standsIn(e, c, province) && !wants(c, p)) love += v;
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
    if (holder === null || !isAlive(S, holder)) continue;
    const rival = bestRival(this, prov.id, holder);
    // A governor who would lead it takes with him the levies he raised there: they are no force against him.
    const gov = this.governorOf(prov.id);
    const levies = rival?.character != null && gov !== null && gov[1] === rival.character ? (u: Unit): boolean => u.home === prov.id && u.commander === null : null;
    const held = levies === null ? this.weightIn(prov.id, holder, strength) : this.forceIn(prov.id, holder, levies) + loveOf(this, prov.id, holder) - weakness(this, holder, strength);
    const lead = held - Math.max(rival?.weight ?? D.floor, D.floor);
    if (lead < D.threshold) S.restless.set(prov.id, D.threshold - lead);
    const degree = clamp(333 + idiv(667 * lead, D.full), 333, 1000);
    if (degree < 1000) S.obeyed.set(prov.id, degree);
    // A besieged city is the siege's; at the court only a foe's troops standing in it take it (a coup is another thing,
    // which the game does not model).
    if (siegeOf(S, prov.id) !== null) continue;
    if (this.courtAt(holder) === prov.id && !(rival?.power != null && S.units.some((u) => u.power === rival.power && u.province === prov.id))) continue;
    if (rival !== null && clears(this, prov.id, rival.weight, held)) changes.push([prov.id, rival]);
    else if (held < D.floor && !S.units.some((u) => u.power === holder && u.province === prov.id)) changes.push([prov.id, null]);
  }
  for (const [id, rival] of changes) changeHands(this, id, rival);
  reports(this);
  lawlessRulers(this);
};

/** The one who weighs most with a province against its holder, or null: powers by their troops in it, men by their standing. */
function bestRival(e: TurnEngine, province: string, holder: Power): Rival | null {
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
  const c = e.wantsIt(province);
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
    if (hand !== holder) e.give(prov.id, hand, D.rule);
  }
}

/** A province changes hands by the one rule: to the rival who outweighs its holder, or, with nobody, to no one. */
function changeHands(e: TurnEngine, id: string, rival: Rival | null): void {
  const S = e.s;
  const holder = S.owner.getOrDefault(id, null);
  if (holder === null) return;
  const name = e.map.get(id).name;
  const seeing = (extra: Power[]): Power[] => [...new Set([...AllPowers.filter((x) => isAlive(S, x) && Views.sight(S, e.map, x).has(id)), ...extra])];
  const love = standing(e, id, holder);
  const why = love < 0 ? `${holder} has taken more from it than he gave` : `${holder}'s hold on it was weak`;
  if (rival !== null && rival.power !== null) {
    const p = rival.power;
    const how = e.forceIn(id, p) >= loveOf(e, id, p) ? `${p}'s men stand at its gates` : `its people favour ${p}`;
    e.setOwner(id, p);
    e.tell(holder, id, "Battle", "A province lost", `${name} now answers to ${p}: ${how}, and ${why}.`);
    e.tell(p, id, "Battle", "A province won", `${name} now answers to you: ${how}, and ${why}.`);
    logEvent(S, "obey", `${name} now answers to ${p}: ${how}, and ${why}.`, seeing([holder, p]), "obey-power");
    return;
  }
  const leader = rival?.character ?? null;
  const gov = e.governorOf(id);
  // A governor who leads it takes the levies he raised there with him; any other troops of the master there fight it.
  const levies = leader !== null && gov !== null && gov[1] === leader ? S.units.filter((u) => u.power === holder && u.province === id && u.home === id && u.commander === null) : [];
  const troops = S.units.filter((u) => u.power === holder && u.province === id && !levies.includes(u));
  if (leader !== null && troops.length > 0) {
    if (e.forceIn(id, holder) >= standing(e, id, leader.id)) {
      // Put down by the master's troops there, as combat between his army and men with farm tools goes: some of its people
      // die, and the man who led them is followed by half as many.
      e.killSettled(id, D.crushedDead, 0);
      const book = S.ledger.tryGet(id);
      if (book !== undefined && book.has(leader.id)) book.set(leader.id, idiv(book.get(leader.id), 2));
      e.tell(holder, id, "Battle", "A rising put down", `The people of ${name} rose against you, behind ${leader.name}, and your troops there put them down.`);
      logEvent(S, "revolt", `The people of ${name} rose against ${holder}, and its troops there put them down.`, seeing([holder]), "revolt-crushed");
      return;
    }
    // A handful among thousands who lean away: the rising overwhelms them, half killed and the rest run.
    // Their savings are the people's spoil.
    for (const u of troops) {
      e.peopleOf(id).loose += u.men - idiv(u.men * BattleData.dead, 100);
      e.spendAt(id, u.savings);
      S.units.splice(S.units.indexOf(u), 1);
      e.liftSiegesOf(u.id);
    }
    e.tell(holder, id, "Battle", "A garrison overwhelmed", `The people of ${name} rose and overwhelmed your few troops there.`);
  }
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

