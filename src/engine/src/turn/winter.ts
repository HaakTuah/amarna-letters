/**
 * Winter is dangerous, never closed (build order item 9, answering item 7b's review; "Winter is dangerous, never closed"
 * under War, travel and the seas). No pass and no sea closes with the season: an army that crosses a mountain pass in
 * winter, or is carried over the open sea then, and a fleet that crosses the open sea then, may be lost, each with its
 * own chance (GameConfig.winterArmyLoss, winterFleetLoss; first guesses, tuned in item 18). Size, supplies and the
 * commander, which cut the losses in the design, are neutral until their items (9+a, 10+a, 13). Travellers are slowed and
 * meet the road's check instead (model/travel.ts, turn/travel.ts).
 */
import type { Dict, HSet } from "../core/collections.ts";
import { distinct } from "../core/seq.ts";
import { crossingBetween } from "../model/geography.ts";
import { seasonOfTurn, WinterSeason } from "../model/map.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { logEvent, notify, unitLabel, type Unit } from "../model/state.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    winterCrossings(moves: Dict<string, string>): { unit: Unit; from: string; to: string; how: WinterCrossing }[];
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
    } else if (!Map.winter.seaRouteExists(from, to)) out.push({ unit: u, from, to, how: "sea" });
  }
  return out;
};

/** Each dangerous crossing rolls for its troop: one lost is gone, its king told, and those who saw it go see it so. */
P.loseToWinter = function (crossings, sightBefore) {
  const S = this.s;
  const Map = this.map;
  for (const x of crossings) {
    const odds = x.unit.kind === "Army" ? S.config.winterArmyLoss : S.config.winterFleetLoss;
    if (!this.r("winter", x.unit.id).chance(odds / 100)) {
      logEvent(S, "winter", `${x.unit.power}'s ${x.unit.kind === "Army" ? "army" : "fleet"} crossed ${x.how === "pass" ? (crossingBetween(x.from, x.to)?.name ?? "a pass") : "the open sea"} into ${Map.get(x.to).name} in winter.`, [x.unit.power], "winter-crossed");
      continue;
    }
    const i = S.units.indexOf(x.unit);
    if (i < 0) continue;
    S.units.splice(i, 1);
    const what = x.unit.kind === "Army" ? "army" : "fleet";
    const where =
      x.how === "pass"
        ? `crossing ${crossingBetween(x.from, x.to)?.name ?? "the pass"} into ${Map.get(x.to).name} in winter, lost to cold, hunger and desertion`
        : `crossing the open sea to ${Map.get(x.to).name} in winter, lost to the storms`;
    notify(S, x.unit.power, "Battle", WinterLossTitle, `Your ${what} from ${Map.get(x.from).name} was lost ${where.replace(/^crossing/, "while crossing")}.`);
    logEvent(
      S,
      "winter",
      `${x.unit.power}'s ${unitLabel({ ...x.unit, province: x.from })} was lost ${where}.`,
      distinct([...AllPowers.filter((p) => sightBefore.get(p)?.has(x.from) || sightBefore.get(p)?.has(x.to)), x.unit.power]),
      "winter-loss",
    );
  }
};
