/**
 * Buying or taking (build order item 17; "Armies need food as well as pay" under Land, people and economy, Haakon of 29
 * October 2026). Each army's king tells it whether to buy its food where it stands by leave, at home or in a friend's
 * land, or to take it, and sends gold for the buying; the word and the gold travel with his couriers and hold from the
 * season they arrive ("Command at a distance"). Hunger decides before orders do: an army without the gold takes what it
 * must. A commander does what he decides: a greedy, disloyal one keeps the gold and lets his men take. Taking leaves the
 * people hungry and raises unrest by how much was taken, the king's own troops included; a ruler whose land another's
 * troops took from remembers it as a grievance.
 */
import { Dict } from "../core/collections.ts";
import { idiv } from "../core/num.ts";
import { cmpStr, sortBy } from "../core/seq.ts";
import type { SupplyOrder } from "../model/orders.ts";
import { gain, remember } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import { isAlive, logEvent, notify, unitAt, type Unit } from "../model/state.ts";
import { UnrestData } from "../model/unrest.ts";
import { wordFromKing } from "../rules/court.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** A king's word to an army on its food, with gold for it: on the road with his couriers. */
    setSupply(p: Power, o: SupplyOrder): void;
    /** As the troops are fed: the words and gold that reach their armies this season. */
    foodArrives(): void;
    /** Whether a unit's commander keeps the gold sent for its food this season, and lets his men take instead. */
    keepsFoodGold(u: Unit): boolean;
  }
}

const P = TurnEngine.prototype;

P.setSupply = function (p, o) {
  const S = this.s;
  const u = unitAt(S, o.unit);
  if (u === null || u.power !== p) return;
  const gold = Math.max(0, o.gold);
  if (gold > 0 && !this.pay(p, gold, `food for your ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name}`, o, "no word was sent")) return;
  const seasons = wordFromKing(S, this.map, p, u.province);
  const at = S.turn + (Number.isFinite(seasons) ? seasons : 1);
  S.foodWord.push({ power: p, unit: u.id, province: o.unit, buy: o.buy, gold, at });
  logEvent(S, "supply", `${p} sent word to its army in ${this.map.get(u.province).name} to ${o.buy ? "buy" : "take"} its food${gold > 0 ? `, with ${gold} shekels` : ""}.`, [p], o.buy ? "supply-word-buy" : "supply-word-take");
  notify(
    S,
    p,
    "Resolution",
    "Word on the army's food",
    `Word that your ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name} is to ${o.buy ? "buy its food where it stands by leave" : "take its food from the land"}${gold > 0 ? `, with ${gold} shekels for it,` : ""} is on its way; it holds from turn ${at}.${o.buy && gold === 0 && u.chest === 0 ? " It carries no gold for food: without gold it takes what it must." : ""}`,
  );
};

P.foodArrives = function () {
  const S = this.s;
  const due = S.foodWord.filter((w) => S.turn >= w.at);
  if (due.length === 0) return;
  S.foodWord = S.foodWord.filter((w) => S.turn < w.at);
  for (const w of due) {
    const u = S.units.find((x) => x.id === w.unit) ?? null;
    if (u === null || u.power !== w.power) {
      // The army is gone or no longer his: the courier brings the gold back.
      if (w.gold > 0 && isAlive(S, w.power)) this.credit(w.power, w.gold, this.courtAt(w.power), false);
      continue;
    }
    u.buy = w.buy;
    // Carried in the men's packs with their savings.
    u.chest += w.gold;
    u.savings += w.gold;
  }
};

P.keepsFoodGold = function (u) {
  const c = this.commanderOf(u);
  if (c === null || u.chest <= 0) return false;
  // A script commander's formula (first guess): his greed times his disloyalty.
  if (c.traits.greed * (100 - c.traits.loyalty) < UnrestData.keepFood) return false;
  const kept = Math.min(u.chest, u.savings);
  u.chest = 0;
  u.savings -= kept;
  gain(c, kept, "Skimmed");
  remember(c, this.s.turn, `I kept the ${kept} shekels my king sent for the army's food in ${this.map.get(u.province).name}, and let the men take what they needed.`);
  logEvent(this.s, "supply", `${c.name} kept the gold ${u.power} sent for its army's food in ${this.map.get(u.province).name}.`, [], "supply-kept");
  return true;
};

/**
 * What troops took this season, province by province, for the people's memory and the complaints: the measures taken, the
 * base they are weighed against (the farmers' food and the market's stock as the season began), and by whose troops.
 */
export class TakenBook {
  readonly took = new Dict<string, Dict<Power, number>>();
  readonly base: Dict<string, number>;
  constructor(base: Dict<string, number>) {
    this.base = base;
  }
  add(province: string, by: Power, n: number): void {
    if (n <= 0) return;
    let d = this.took.tryGet(province);
    if (!d) this.took.set(province, (d = new Dict()));
    d.set(by, d.getOrDefault(by, 0) + n);
  }
  /** Unrest by how much was taken, and word of it to the land's ruler: his people's complaint, or a grievance. */
  settle(e: TurnEngine): void {
    const S = e.s;
    for (const [prov, by] of sortBy(this.took.entries(), [([k]: [string, Dict<Power, number>]) => k, cmpStr])) {
      const holder = S.owner.getOrDefault(prov, null);
      const name = e.map.get(prov).name;
      let all = 0;
      for (const [p, n] of sortBy(by.entries(), [([k]: [Power, number]) => k, cmpStr])) {
        all += n;
        if (holder === null || !isAlive(S, holder)) continue;
        if (p === holder) e.tell(holder, prov, "Notice", "The people complain", `The people of ${name} complain that your own troops took ${n} measures of their food this season.`);
        else e.tell(holder, prov, "Notice", "Troops took food", `The troops of ${p} took ${n} measures of food from your land in ${name} this season.`);
      }
      e.hardship(prov, idiv(all * UnrestData.taken, Math.max(1, this.base.getOrDefault(prov, 0))));
    }
  }
}
