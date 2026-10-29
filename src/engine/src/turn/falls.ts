/**
 * A fallen kingdom comes apart as the news arrives (Haakon's answers to item 13's review, item 13+; "A kingdom falls
 * with its capital" under War). The capital passes at once to whoever took it; every other part of the realm is on its
 * own only once word of the fall reaches it, carried by road from the fallen capital like any news. Until then life
 * there goes on as before: its harvest is reaped and taxed, and the gold sent to the fallen capital goes to whoever holds
 * it. When the word arrives, a province where the conqueror's troops stand is his, held by force; a governed province is
 * its governor's, who rules it with a seat of his own as a freed vassal does, and the troops there follow him if he can
 * pay them; the rest falls lawless ("Land without a ruler"). The fallen king's armies hear it where they stand, and are
 * then their commanders' to decide, as item 13 built.
 */
import { idiv } from "../core/num.ts";
import { cmpStr, sortBy, sum } from "../core/seq.ts";
import { BandData } from "../model/bands.ts";
import { forMen } from "../model/land.ts";
import { remember, spend, type Character } from "../model/people.ts";
import { addRisen, AllPowers, land, type Power, type RisenPower } from "../model/power.ts";
import { isAlive, logEvent, newTreasury, notify, type KingdomFall, type Unit } from "../model/state.ts";
import { stateOfRealm } from "../rules/realm.ts";
import { kingTongues } from "../rules/tongues.ts";
import { Views } from "../rules/views.ts";
import { TurnEngine, travelTurns } from "./core.ts";
import type { Governor } from "../model/command.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** Each season after the falls: the parts of fallen kingdoms that word of the fall has reached come apart. */
    fallsSpread(): void;
    /** A fallen kingdom's unit, once word of the fall reaches it: its commander's, a captain's, or disbanded (item 13). */
    fallenUnit(u: Unit, p: Power): void;
    /** A power's fall, or null while it stands. */
    fallOf(p: Power): KingdomFall | null;
    /**
     * Gold that comes into a power's hands where it holds land: its treasury's, or, for a fallen kingdom whose land the
     * word has not reached, whoever holds its fallen capital's; with nobody there, the province's people's. `income`:
     * counted in the season's income.
     */
    credit(p: Power, gold: number, province: string, income?: boolean): void;
    /** A fallen kingdom's governor rises as his province's ruler, with a seat of his own (item 13+). */
    governorRises(g: Governor, c: Character, f: KingdomFall): Power;
  }
}

const P = TurnEngine.prototype;

/**
 * The season word of a kingdom's fall reaches a province: from its capital, by road, at the pace word of it reaches
 * foreign courts (`word`), as any news travels.
 */
function wordArrives(e: TurnEngine, f: KingdomFall, province: string): number {
  const t = travelTurns(e.s.config, e.map, f.capital, province, f.turn);
  return f.turn + (Number.isFinite(t) ? t : 0);
}

P.fallsSpread = function () {
  const S = this.s;
  for (const f of S.falls) {
    if (isAlive(S, f.power)) continue;
    const p = f.power;
    const held = this.map.landProvinces.filter((x) => S.owner.getOrDefault(x.id, null) === p).map((x) => x.id);
    const units = S.units.filter((u) => u.power === p);
    if (held.length === 0 && units.length === 0 && !S.characters.some((c) => c.employer === p)) continue;
    const conqueror = f.conqueror !== null && isAlive(S, f.conqueror) ? f.conqueror : null;
    const lawless: string[] = [];
    for (const id of held) {
      if (S.turn < wordArrives(this, f, id)) continue;
      const name = this.map.get(id).name;
      const seeing = (extra: Power[]): Power[] => [...new Set([...AllPowers.filter((x) => isAlive(S, x) && Views.sight(S, this.map, x).has(id)), ...extra])];
      if (conqueror !== null && S.units.some((u) => u.province === id && u.power === conqueror)) {
        this.setOwner(id, conqueror);
        this.takenByForce(id, conqueror);
        S.sieges = S.sieges.filter((x) => !(x.province === id && x.power === conqueror));
        this.tell(conqueror, id, "Battle", "Land held by force", `Word of the fall of ${land(p)} has reached ${name}, where your troops stand: it is yours, held by force.`);
        logEvent(S, "fall", `Word of the fall of ${land(p)} reached ${name}, and ${conqueror}'s troops there hold it.`, seeing([conqueror]), "fall-held");
        continue;
      }
      const found = this.governorOf(id);
      if (found !== null && found[0].power === p) {
        this.governorRises(found[0], found[1], f);
        continue;
      }
      this.setOwner(id, null);
      this.takenByForce(id, null);
      lawless.push(name);
      logEvent(S, "fall", `Word of the fall of ${land(p)} reached ${name}, and it has fallen lawless, held by nobody.`, seeing([]), "fall-lawless");
    }
    // The armies hear it where they stand, after the land, so troops in a governed province can follow its new ruler.
    for (const u of sortBy(units, [(u: Unit) => u.id, cmpStr])) {
      if (!S.units.includes(u) || u.power !== p) continue;
      if (S.turn < wordArrives(this, f, u.province)) continue;
      this.fallenUnit(u, p);
    }
    // His governors and commanders are their own men once their province or army has heard it.
    for (const c of S.characters.filter((c) => c.employer === p)) {
      const post = c.duty === "Governing" ? S.governors.find((g) => g.character === c.id && S.owner.getOrDefault(g.province, null) === p) : c.duty === "Commanding" ? S.units.find((u) => u.commander === c.id && u.power === p) : undefined;
      if (post !== undefined) continue;
      c.formerEmployer = p;
      c.employer = null;
      c.contract = null;
      if (c.status === "Employed") c.status = "Free";
    }
  }
};

P.fallOf = function (p) {
  return [...this.s.falls].reverse().find((f) => f.power === p) ?? null;
};

P.credit = function (p, gold, province, income = true) {
  const S = this.s;
  if (gold <= 0) return;
  const fall = isAlive(S, p) ? null : this.fallOf(p);
  const to = fall === null ? p : S.owner.getOrDefault(fall.capital, null);
  if (to === null || !isAlive(S, to)) {
    this.spendAt(province, gold);
    return;
  }
  const t = S.treasuries.get(to);
  t.gold += gold;
  if (income) t.income += gold;
};

P.fallenUnit = function (u, p) {
  const S = this.s;
  const c = this.commanderOf(u);
  if (c !== null) {
    this.armyToBand(u, c, "commander");
    return;
  }
  const ranks = this.r("captain", `${p}|${u.id}`);
  const land_ = this.map.get(u.province).isSea ? (this.map.landProvinces.find((x) => x.waters === u.province)?.id ?? null) : u.province;
  if (u.kind === "Army" && land_ !== null && u.men >= BandData.least && (u.unpaid > 0 || u.hungry > 0) && ranks.chance(Math.min(100, BandData.mutinyHead + idiv(u.men, 500)) / 100)) {
    S.units.splice(S.units.indexOf(u), 1);
    this.headRises(land_, u.men, "captain", ranks, p);
    S.loot.set(land_, S.loot.getOrDefault(land_, 0) + u.savings);
    return;
  }
  this.disbandUnit(u);
};

/** A risen power's name: its province's, or, if a power already goes by it, with its ruler's. */
function risenName(name: string, ruler: string): string {
  const taken = (x: string): boolean => AllPowers.some((p) => p.toLowerCase() === x.toLowerCase() || land(p).toLowerCase() === x.toLowerCase());
  if (!taken(name)) return name;
  const withRuler = `${name} of ${ruler}`;
  if (!taken(withRuler)) return withRuler;
  let n = 2;
  while (taken(`${withRuler} ${n}`)) n++;
  return `${withRuler} ${n}`;
}

P.governorRises = function (g, c, f) {
  const S = this.s;
  const id = g.province;
  const prov = this.map.get(id);
  const was = f.power;
  const t = c.traits;
  const r: RisenPower = {
    power: risenName(prov.name, c.name),
    land: prov.name,
    king: c.name,
    ruler: c.id,
    capital: id,
    turn: S.turn,
    from: was,
    // His traits as a seat's temper: ambition its appetite for war, fear its caution, loyalty its honesty, greed its greed.
    temper: [t.ambition, 100 - t.courage, t.loyalty, t.greed],
  };
  S.risen.push(r);
  addRisen(r);
  const p = r.power;
  // His purse becomes his realm's treasury: nothing appears or vanishes.
  S.treasuries.set(p, newTreasury({ gold: spend(c, c.purse) }));
  S.inbox.set(p, []);
  S.wallsSeen.set(p, (S.wallsSeen.tryGet(was) ?? S.walls).clone());
  S.kingTongues.set(p, kingTongues(p, id));
  S.court.set(p, id);
  S.fallsHeard.set(p, [was]);
  S.governors = S.governors.filter((x) => x !== g);
  this.setOwner(id, p);
  // The land he governed is his own people's: he rules it in full, nothing to absorb.
  S.conquered.delete(id);
  c.employer = p;
  c.status = "Employed";
  c.contract = null;
  c.duty = "Ruling";
  c.at = p;
  c.grantedBy = null;
  c.watchProvince = null;
  remember(c, S.turn, `Word came that the kingdom of ${land(was)} has fallen. I rule ${prov.name} now, in my own name.`);
  // The troops there follow him if he can pay them a season (first guess); those he cannot hear the news as others do.
  const here = sortBy(
    // A commanded army is its commander's to decide, as the word reaches him (fallenUnit).
    S.units.filter((u) => u.power === was && this.commanderOf(u) === null && (u.province === id || (prov.waters !== null && u.province === prov.waters))),
    [(u: Unit) => u.id, cmpStr],
  );
  const pay = (u: Unit): number => forMen(u.kind === "Army" ? S.config.armyUpkeep : S.config.fleetUpkeep, u.kind, u.men);
  const followed: Unit[] = [];
  let left = S.treasuries.get(p).gold;
  for (const u of here) {
    if (left < pay(u)) continue;
    left -= pay(u);
    followed.push(u);
  }
  for (const u of followed) {
    u.power = p;
    S.sieges = S.sieges.filter((x) => x.unitId !== u.id);
  }
  S.startStrength.set(p, this.strength(p));
  const men = sum(followed, (u) => u.men);
  const troops = followed.length === 0 ? (here.length === 0 ? "no troops stand there" : "the troops there would not follow you, for you cannot pay them") : `${men} men there follow you${followed.length < here.length ? ", though not all: the rest you could not pay" : ""}`;
  notify(
    S,
    p,
    "Notice",
    "You rule in your own name",
    `Word has come that the kingdom of ${land(was)} has fallen with its capital, ${this.map.get(f.capital).name}. You governed ${prov.name} for its king; now you rule it in your own name, with a seat of your own like any city's ruler. ${troops.charAt(0).toUpperCase() + troops.slice(1)}. Your treasury is what you carried, ${S.treasuries.get(p).gold} shekels. Nobody owes you anything, and you owe nobody: you may keep silent, or send envoys with whatever terms you like, to hand the city to ${f.conqueror ?? "another"} and stay its governor, to become a vassal, to pay to be left alone, or to serve another court.`,
    c.id,
  );
  notify(S, p, "Notice", "The state of the realm", stateOfRealm(S, this.map, p));
  logEvent(S, "rise", `${c.name}, governor of ${prov.name} for ${was}, rules it in his own name now that ${land(was)} has fallen${men > 0 ? `, with ${men} men` : ""}.`, [p, ...AllPowers.filter((x) => x !== p && isAlive(S, x) && Views.sight(S, this.map, x).has(id))], "risen");
  // Others hear of it as word travels from his city.
  for (const other of AllPowers.filter((x) => x !== p && isAlive(S, x) && !Views.sight(S, this.map, x).has(id)))
    this.word(p, other, "Realm", `Rumor|A new ruler|Word comes that ${c.name}, who governed ${prov.name} for ${was}, rules it in his own name now that ${land(was)} has fallen.`);
  return p;
};
