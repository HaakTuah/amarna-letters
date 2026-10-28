/**
 * Winter is dangerous, never closed (build order item 9, answering item 7b's review; "Winter is dangerous, never closed"
 * under War, travel and the seas). No pass and no sea closes with the season: an army that crosses a mountain pass in
 * winter, or is carried over the open sea then, and a fleet that crosses the open sea then, may be lost, each with its
 * share of its men (GameConfig.winterArmyLoss, winterFleetLoss; first guesses, tuned in item 18), by its size and the food it
 * carries since item 11a+; the commander, who cuts the losses in the design, is neutral until item 13. Travellers are slowed and
 * meet the road's check instead (model/travel.ts, turn/travel.ts).
 */
import type { Dict, HSet } from "../core/collections.ts";
import { distinct } from "../core/seq.ts";
import { crossingBetween } from "../model/geography.ts";
import { seasonOfTurn, WinterSeason } from "../model/map.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { logEvent, notify, unitLabel, type Unit } from "../model/state.ts";
import { idiv } from "../core/num.ts";
import { LandData, shareOfFull, unitCarried, unitFood, WinterData } from "../model/land.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    winterCrossings(moves: Dict<string, string>): { unit: Unit; from: string; to: string; how: WinterCrossing }[];
    coastalConvoy(from: string, to: string): boolean;
    loseToWinter(crossings: { unit: Unit; from: string; to: string; how: WinterCrossing }[], sightBefore: Dict<Power, HSet<string>>): void;
  }
}

/** What made a move dangerous: a snowbound pass, or the open sea in winter. */
export type WinterCrossing = "pass" | "sea";

/** The notice to a king who lost troops to winter. */
export const WinterLossTitle = "Lost to winter";

const P = TurnEngine.prototype;

/**
 * The moves of this season (unit id to the province it ends in) that crossed what winter makes dangerous: an army over a
 * mountain pass, or carried where no chain of coastal waters joins its two ends; a fleet over an open-sea crossing. None
 * outside winter.
 */
P.winterCrossings = function (moves) {
  const S = this.s;
  const Map = this.map;
  const out: { unit: Unit; from: string; to: string; how: WinterCrossing }[] = [];
  if (seasonOfTurn(S.turn) !== WinterSeason) return out;
  for (const [id, to] of moves) {
    const u = S.units.find((x) => x.id === id);
    if (u === undefined || u.province === to) continue;
    const from = u.province;
    if (u.kind === "Fleet") {
      if (Map.openCrossing(from, to) !== null) out.push({ unit: u, from, to, how: "sea" });
    } else if (Map.canMove("Army", from, to)) {
      if (crossingBetween(from, to)?.kind === "Mountain") out.push({ unit: u, from, to, how: "pass" });
    } else if (!this.coastalConvoy(from, to)) out.push({ unit: u, from, to, how: "sea" });
  }
  return out;
};

/**
 * Whether the fleets that carried an army from `from` to `to` this season join its two ends by coastal waters alone, with no
 * open-sea crossing between them: the army is then carried at no risk.
 */
P.coastalConvoy = function (from, to) {
  const S = this.s;
  const W = this.map.winter;
  const zones = new Set<string>();
  for (const [at, o] of this._unitOrdersNow) if (o.type === "convoy" && o.army === from && o.to === to && S.units.some((u) => u.province === at && u.kind === "Fleet")) zones.add(at);
  const reached = new Set<string>([...zones].filter((z) => W.areAdjacent(from, z)));
  const queue = [...reached];
  while (queue.length > 0) {
    const z = queue.shift()!;
    if (W.areAdjacent(z, to)) return true;
    for (const n of W.neighbors(z)) if (zones.has(n) && !reached.has(n)) {
      reached.add(n);
      queue.push(n);
    }
  }
  return false;
};

/**
 * Each dangerous crossing costs its troop men (item 11a+, Haakon's answer to item 9's review: "winter takes men by an
 * army's size and supplies"): of a full unit, `winterArmyLoss` in a hundred (a fleet `winterFleetLoss`), in proportion
 * to its men, since a snowbound pass feeds nobody and a storm takes more of
 * a crowded fleet; half that where it carries a season's food (`WinterData.suppliedPercent`); the weather draws between
 * half and half again as much. On a pass, `desertPercent` of those lost desert and stay loose where they set out; the rest
 * die. A troop left with fewer than a levy's least is lost whole. Its king is told, and those who saw it go see it so.
 */
P.loseToWinter = function (crossings, sightBefore) {
  const S = this.s;
  const Map = this.map;
  for (const x of crossings) {
    const u = x.unit;
    const i = S.units.indexOf(u);
    if (i < 0) continue;
    const base = u.kind === "Army" ? S.config.winterArmyLoss : S.config.winterFleetLoss;
    const supplied = u.food >= unitFood(u);
    const weather = this.r("winter", u.id).range(50, 150);
    let percent = idiv(idiv(base * shareOfFull(u.kind, u.men), 1000) * weather, 100);
    if (supplied) percent = idiv(percent * WinterData.suppliedPercent, 100);
    const lost = Math.min(u.men, idiv(u.men * percent, 100));
    const what = u.kind === "Army" ? "army" : "fleet";
    const crossing = x.how === "pass" ? (crossingBetween(x.from, x.to)?.name ?? "the pass") : "the open sea";
    if (lost <= 0) {
      logEvent(S, "winter", `${u.power}'s ${what} crossed ${x.how === "pass" ? crossing : "the open sea"} into ${Map.get(x.to).name} in winter.`, [u.power], "winter-crossed");
      continue;
    }
    const whole = u.men - lost < LandData.levyLeast;
    const gone = whole ? u.men : lost;
    const deserted = x.how === "pass" ? idiv(gone * WinterData.desertPercent, 100) : 0;
    if (deserted > 0) this.peopleOf(x.from).loose += deserted;
    u.men -= gone;
    u.food = Math.min(u.food, unitCarried(u));
    if (whole) S.units.splice(i, 1);
    const why = x.how === "pass" ? "cold, hunger and desertion" : "the storms";
    const where = x.how === "pass" ? `crossing ${crossing} into ${Map.get(x.to).name} in winter` : `crossing the open sea to ${Map.get(x.to).name} in winter`;
    notify(
      S,
      u.power,
      "Battle",
      WinterLossTitle,
      whole
        ? `Your ${what} from ${Map.get(x.from).name} was lost while ${where}, to ${why}.`
        : `Your ${what} from ${Map.get(x.from).name} lost ${gone} men to ${why} while ${where}${supplied ? ", fewer for the food it carried" : ", more for want of food carried"}; ${u.men} are left.`,
    );
    logEvent(
      S,
      "winter",
      whole
        ? `${u.power}'s ${unitLabel({ ...u, province: x.from })} was lost ${where}, to ${why}.`
        : `${u.power}'s ${unitLabel({ ...u, province: x.from })} lost ${gone} men to ${why}, ${where}.`,
      distinct([...AllPowers.filter((p) => sightBefore.get(p)?.has(x.from) || sightBefore.get(p)?.has(x.to)), u.power]),
      "winter-loss",
    );
  }
};
