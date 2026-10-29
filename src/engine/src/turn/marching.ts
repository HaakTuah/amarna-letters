/**
 * Distance-based marching (build order item 13, "Distance-based marching" under Territory and military, and "What sets a
 * company's pace"). A move still crosses one connection and fights its one battle in a season, but an army or a fleet
 * now crosses it at its own pace: by the land, the season, its size and whether it forces the march. A connection longer
 * than a season's march takes several: the unit marches on, standing where it was for the fighting, until it has made
 * the distance, carrying what it made from season to season while its orders keep it on that road. A forced march is a
 * third quicker, and some of its men drop along the way. An army carried by sea goes as its fleets carry it.
 */
import { waysOf } from "../model/works.ts";
import { idiv } from "../core/num.ts";
import { MarchData } from "../model/command.ts";
import { seasonOfTurn } from "../model/map.ts";
import { hold, type MoveOrder, type Order } from "../model/orders.ts";
import type { Dict } from "../core/collections.ts";
import type { Unit } from "../model/state.ts";
import { PointsPerDay, legPoints } from "../model/travel.ts";
import type { AdjudicationResult } from "../rules/adjudicator.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** The points a unit's move to a neighbouring province costs it this season, by its pace (Infinity where it cannot go). */
    marchPoints(u: Unit, to: string, forced: boolean): number;
    /**
     * Before the moves: each move whose unit cannot make its connection this season becomes a march, and the unit holds
     * where it stands; forced marches cost their men. Returns the moves held back, by the province of their unit.
     */
    paceMoves(byProvince: Dict<string, Order>): Map<string, MoveOrder>;
    /** After the moves: units that got through end their march; those stopped at the far end wait there to try again. */
    marchesDone(result: AdjudicationResult, byProvince: Dict<string, Order>, held: Map<string, MoveOrder>): void;
  }
}

const P = TurnEngine.prototype;

P.marchPoints = function (u, to, forced) {
  return legPoints(this.map, u.province, to, seasonOfTurn(this.s.turn), { sneaking: false, troops: { men: idiv(u.men * this.s.config.armyPace, 100), fleet: u.kind === "Fleet", forced }, ways: waysOf(this.s) });
};

P.paceMoves = function (byProvince) {
  const S = this.s;
  const season = S.config.travelDays * PointsPerDay;
  const held = new Map<string, MoveOrder>();
  for (const u of S.units) {
    const o = byProvince.tryGet(u.province);
    const moving = o !== undefined && o.type === "move" && o.to !== "";
    // Off that road, it has made nothing towards it.
    if (!moving || u.march !== o.to) {
      u.march = null;
      u.along = 0;
    }
    if (!moving) continue;
    const m = o as MoveOrder;
    const forced = m.forced === true;
    // An army carried by sea goes as its fleets carry it.
    if (!this.map.canMove(u.kind, u.province, m.to)) continue;
    if (forced && u.men > 0) {
      const drop = idiv(u.men * MarchData.forcedLoss, 100);
      if (drop > 0) {
        u.men -= drop;
        if (!this.map.get(u.province).isSea) this.peopleOf(u.province).loose += drop;
      }
    }
    const need = this.marchPoints(u, m.to, forced);
    const made = u.along + season;
    if (made >= need) continue;
    u.march = m.to;
    u.along = made;
    byProvince.set(u.province, hold(u.province));
    held.set(u.province, m);
    const days = Math.max(1, Math.ceil((need - made) / PointsPerDay));
    const seasons = Math.max(1, Math.ceil((need - made) / season));
    const when = seasons === 1 ? "next season" : `in ${seasons} more seasons`;
    this.tell(
      u.power,
      u.province,
      "Resolution",
      "On the march",
      `Your ${u.kind === "Army" ? "army" : "fleet"} in ${this.map.get(u.province).name} is on the road to ${this.map.get(m.to).name}${forced ? " by forced march" : ""}: about ${days} days of road left, so it gets there ${when} if you keep ordering it on${forced ? "" : " (or sooner by a forced march)"}. Until then it stands where it is for any fighting.`,
    );
  }
  return held;
};

P.marchesDone = function (result, byProvince, held) {
  const S = this.s;
  for (const u of S.units) {
    const m = held.get(u.province);
    if (m !== undefined) {
      // Its line in the report says it is on the march, not that it held.
      for (const l of result.lines) if (l.province === u.province && l.power === u.power && l.text.endsWith(" holds")) l.text = l.text.replace(/ holds$/, ` -> ${m.to}: on the march`);
      continue;
    }
    const o = byProvince.tryGet(u.province);
    if (o === undefined || o.type !== "move" || !this.map.canMove(u.kind, u.province, o.to)) continue;
    const got = result.newPositions.tryGet(u.id);
    if (got === o.to || got === undefined || result.dislodgedUnitIds.includes(u.id)) {
      u.march = null;
      u.along = 0;
    } else {
      // Stopped at the end of the road: it waits there, and goes in at once if it is ordered on again.
      u.march = o.to;
      u.along = this.marchPoints(u, o.to, o.forced === true);
    }
  }
};
