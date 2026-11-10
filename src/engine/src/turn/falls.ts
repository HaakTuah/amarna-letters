/**
 * What remains of a fallen kingdom hears of its fall as the news arrives (the owner's answers to item 13's review, item
 * 13+). Since item 17b, part B, only a realm that holds nothing falls, so no land is left to come apart: its armies hear
 * the word where they stand, carried by road from where it fell like any news, and are then their commanders' to decide,
 * as item 13 built; its governors and commanders are their own men once their army has heard. Gold still on its way to it
 * goes to whoever holds the city where it fell.
 */
import { idiv } from "../core/num.ts";
import { cmpStr, sortBy } from "../core/seq.ts";
import { BandData } from "../model/bands.ts";
import type { Power } from "../model/power.ts";
import { isAlive, type KingdomFall } from "../model/state.ts";
import { type Unit, loseUnit } from "../model/units.ts";
import { TurnEngine, travelTurns } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** Each season after the falls: the armies of fallen kingdoms that word of the fall has reached are on their own. */
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
    const units = S.units.filter((u) => u.power === p);
    if (units.length === 0 && !S.characters.some((c) => c.employer === p)) continue;
    // The armies hear it where they stand.
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
  // #587: gold taken in a far province of his goes into its coffer, as its own gold does.
  this.receiveAt(to, province, gold, income);
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
    loseUnit(S, u);
    this.headRises(land_, u.men, "captain", ranks, p);
    S.loot.set(land_, S.loot.getOrDefault(land_, 0) + u.savings);
    return;
  }
  this.disbandUnit(u);
};
