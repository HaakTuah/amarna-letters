/**
 * Revolt follows conditions, not dice (build order item 17; "Revolt follows conditions, not dice" and "How cities become
 * free" under War, "A head rises where men lack one" and "Land without a ruler" under Bands, outlaws and pirates). Every
 * province a power holds carries unrest, summed each season from what the engine can see (`UnrestData`); it rises when the
 * sum passes its threshold, far higher in the holder's own homeland, the seeded dice settling only the last points below
 * it. A province that rises becomes a power of its own under the character of standing who led it, with the levies it
 * raises; one with nobody at its head falls lawless, until a ruler rises from its own people at the pace they set or a
 * chief who holds it long enough comes to rule it. Where its master's troops stand, the rising is put down.
 *
 * The holder never sees the number: his governor reports the people's mood in words (and a disloyal one who wants the
 * province says all is quiet), his spies report it of the provinces they watch, and the people complain when troops take
 * their food. The record behind each weight is `docs/history/14-courts-and-free-cities.md`.
 */
import { Dict } from "../core/collections.ts";
import { clamp, idiv } from "../core/num.ts";
import { cmpStr, sortBy } from "../core/seq.ts";
import { BandData, type Band } from "../model/bands.ts";
import { gain, remember, type Character } from "../model/people.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { findCharacter, isAlive, logEvent, siegeOf } from "../model/state.ts";
import { UnrestData, moodWords } from "../model/unrest.ts";
import { levelOf } from "../model/works.ts";
import { Views } from "../rules/views.ts";
import { TurnEngine, travelTurns } from "./core.ts";
import { eliteGold } from "./rulers.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** The people of `province` remember a hardship against its holder: `points` of unrest. */
    hardship(province: string, points: number): void;
    /** A province's unrest now, reckoned from its conditions (0 for land nobody holds). */
    unrestOf(province: string, strength?: Dict<Power, number>): number;
    /** The unrest at which a province rises: far higher in its holder's own homeland. */
    revoltAt(province: string): number;
    /** A character of standing in `province` who wants it, against its holder: the man who would lead its revolt. */
    wantsIt(province: string): Character | null;
    /** Each season, once the people have eaten: unrest reckoned, revolts, rulers rising in lawless land, governors' reports. */
    unrestSeason(): void;
  }
}

const P = TurnEngine.prototype;

P.hardship = function (province, points) {
  const S = this.s;
  if (points <= 0 || S.owner.getOrDefault(province, null) === null) return;
  S.unrest.set(province, S.unrest.getOrDefault(province, 0) + points);
};

P.revoltAt = function (province) {
  const holder = this.s.owner.getOrDefault(province, null);
  return holder !== null && this.map.isHome(holder, province) ? UnrestData.homeThreshold : UnrestData.threshold;
};

/** Whether `c`, in a province held by `holder`, wants it: ambitious, and not loyal to its holder. */
function wants(c: Character, holder: Power): boolean {
  return c.status !== "Dead" && c.status !== "Captured" && c.traits.ambition >= UnrestData.wants && (c.employer !== holder || c.traits.loyalty < UnrestData.disloyal);
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
  // A former ruler of it, free and standing there.
  const name = this.map.get(province).name;
  return (
    sortBy(
      S.characters.filter((c) => c.status === "Free" && c.at !== null && this.courtAt(c.at) === province && c.facts.some((f) => f.tag === "origin" && f.text.startsWith("Ruled ") && f.text.includes(`from ${name}.`)) && wants(c, holder)),
      [(c: Character) => c.id, cmpStr],
    )[0] ?? null
  );
};

P.unrestOf = function (province, strength = new Dict<Power, number>()) {
  const S = this.s;
  const holder = S.owner.getOrDefault(province, null);
  if (holder === null || this.map.get(province).isSea) return 0;
  const D = UnrestData;
  // What the people remember, and a rival's gold among them.
  let level = S.unrest.getOrDefault(province, 0) + S.stirred.getOrDefault(province, 0);
  // How new the conquest is: highest when just taken (never in its holder's own homeland, which he retakes in full).
  const since = S.takenAt.tryGet(province);
  if (since !== undefined && !this.map.isHome(holder, province)) level += Math.max(0, D.fresh - D.freshFade * (S.turn - since));
  // The master's weakness: his court besieged, his realm shrunk below what it started with.
  const court = this.courtAt(holder);
  if (siegeOf(S, court) !== null) level += D.besieged;
  let now = strength.tryGet(holder);
  if (now === undefined) strength.set(holder, (now = this.strength(holder)));
  const start = S.startStrength.getOrDefault(holder, 0);
  if (start > 0 && now < start) level += clamp(idiv(D.weakness * (start - now), start), 0, D.weakness);
  // Distance from his court, by the roads (item 7).
  const t = travelTurns(S.config, this.map, court, province, S.turn);
  if (Number.isFinite(t)) level += Math.min(D.farMost, D.far * Math.max(0, t - 1));
  // A cause to rally to: the power it was taken from still standing, and a man of standing there who wants it.
  const from = S.takenFrom.getOrDefault(province, "");
  if (from !== "" && from !== holder && isAlive(S, from)) level += D.cause;
  if (this.wantsIt(province) !== null) level += D.cause;
  // What lowers it: his troops in it or beside it, a loyal governor, policing, a good harvest.
  const near = new Set(this.map.neighbors(province));
  if (S.units.some((u) => u.power === holder && u.province === province)) level -= D.troops;
  else if (S.units.some((u) => u.power === holder && near.has(u.province))) level -= D.near;
  const gov = this.governorOf(province);
  if (gov !== null && gov[0].power === holder && gov[1].traits.loyalty >= D.disloyal) level -= D.governor;
  level -= D.policing * levelOf(S, "Policing", province);
  if (S.fed.getOrDefault(province, 1000) >= 1000 && this.climatePercent(province) >= 100) level -= D.harvest;
  return Math.max(0, level);
};

P.unrestSeason = function () {
  const S = this.s;
  const D = UnrestData;
  // Time lowers it: what the people remember fades, and so does a rival's gold.
  for (const book of [S.unrest, S.stirred])
    for (const [k, v] of [...book.entries()]) {
      const left = idiv(v * (100 - D.fade), 100);
      if (left <= 0) book.delete(k);
      else book.set(k, left);
    }
  // Hunger this season: the countryside that could not eat in full.
  for (const prov of this.map.landProvinces) {
    const fed = S.fed.getOrDefault(prov.id, 1000);
    if (fed < 1000) this.hardship(prov.id, idiv(D.hunger * (1000 - fed), 1000));
  }
  stirSeason(this);
  // Every held province reckoned before any rises, so that one revolt does not decide another (whom the engine settles first).
  const strength = new Dict<Power, number>();
  const rising: [string, number][] = [];
  S.restless.clear();
  for (const prov of sortBy([...this.map.landProvinces], [(x) => x.id, cmpStr])) {
    const holder = S.owner.getOrDefault(prov.id, null);
    if (holder === null || !isAlive(S, holder)) continue;
    const level = this.unrestOf(prov.id, strength);
    if (level > 0) S.restless.set(prov.id, level);
    // A coup at the court is another thing, which the game does not model; a besieged city is the siege's.
    if (this.courtAt(holder) === prov.id || siegeOf(S, prov.id) !== null) continue;
    const at = this.revoltAt(prov.id);
    if (level >= at || (level >= at - D.margin && this.r("revolt", prov.id).chance((level - (at - D.margin) + 1) / (D.margin + 1)))) rising.push([prov.id, level]);
  }
  for (const [id, level] of rising) revolt(this, id, level);
  reports(this);
  lawlessRulers(this);
};

/** A province rises against its holder. */
function revolt(e: TurnEngine, id: string, level: number): void {
  const S = e.s;
  const holder = S.owner.getOrDefault(id, null);
  if (holder === null) return;
  const name = e.map.get(id).name;
  if (e.map.isHome(holder, id)) logEvent(S, "revolt", `${name}, of ${holder}'s own homeland, rose (unrest ${level}).`, [], "revolt-home");
  const leader = e.wantsIt(id);
  const gov = e.governorOf(id);
  // A governor who leads it takes the levies he raised there with him; any other troops of the master there fight it.
  const levies = leader !== null && gov !== null && gov[1] === leader ? S.units.filter((u) => u.power === holder && u.province === id && u.home === id && u.commander === null) : [];
  const troops = S.units.filter((u) => u.power === holder && u.province === id && !levies.includes(u));
  const seeing = (extra: Power[]): Power[] => [...new Set([...AllPowers.filter((x) => isAlive(S, x) && Views.sight(S, e.map, x).has(id)), ...extra])];
  if (troops.length > 0) {
    // Put down by the master's troops there, as combat between his army and men with farm tools goes: some of its people
    // die, and what they remember is halved, though not forgotten.
    e.killSettled(id, UnrestData.crushedDead, 0);
    S.unrest.set(id, idiv(S.unrest.getOrDefault(id, 0), 2));
    S.stirred.set(id, idiv(S.stirred.getOrDefault(id, 0), 2));
    e.tell(holder, id, "Battle", "A rising put down", `The people of ${name} rose against you${leader !== null ? `, behind ${leader.name}` : ""}, and your troops there put them down.`);
    logEvent(S, "revolt", `The people of ${name} rose against ${holder}, and its troops there put them down.`, seeing([holder]), "revolt-crushed");
    return;
  }
  if (leader !== null) {
    const band = e.bandOf(leader);
    const how = gov !== null && gov[1] === leader ? `his governor there, ${leader.name}` : band !== null ? `${leader.name}, chief of a band there` : `${leader.name}, who once ruled it`;
    e.tell(holder, id, "Battle", "A province rises", `${name} has risen against you, behind ${how}, and is lost to you: he rules it in his own name now.`);
    logEvent(S, "revolt", `${name} rose against ${holder} behind ${leader.name} (unrest ${level}).`, [], "revolt-led");
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
  // Nobody at its head: it falls lawless ("Land without a ruler").
  e.setOwner(id, null);
  e.takenByForce(id, null);
  e.tell(holder, id, "Battle", "A province rises", `${name} has risen against you with nobody at its head: your officers were driven out, and it is held by nobody now.`);
  logEvent(S, "revolt", `${name} rose against ${holder} with nobody at its head, and fell lawless (unrest ${level}).`, seeing([holder]), "revolt-lawless");
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
 * stirring them against its holder; of what he hands out he keeps what his greed beyond his loyalty lets him.
 */
function stirSeason(e: TurnEngine): void {
  const S = e.s;
  // Gold for stirring that one no longer on his errand still carries (caught on the road, dismissed, turned): his purse
  // holds it now, on him wherever he is.
  for (const c of S.characters.filter((c) => c.stirGold > 0 && !(c.status === "Employed" && (c.duty === "SpyOutbound" || c.duty === "SpyPosted" || c.duty === "EnvoyHomebound")))) {
    c.purse += c.stirGold;
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
    S.stirred.set(prov, S.stirred.getOrDefault(prov, 0) + idiv(given * UnrestData.stir, 100));
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
  const D = UnrestData;
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

