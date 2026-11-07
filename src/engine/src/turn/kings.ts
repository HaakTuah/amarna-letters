/**
 * The court and the king on the road (build order item 13, "The capital is wherever the king is"; item 17b, part C, "A
 * realm holds by its ledger"). The court may move, with its king or without him, and the king may go anywhere a traveller
 * can, with his court or alone with his guard: to lead an army, carry his own letter or visit a foreign court. Moving costs
 * gold and takes the road's time, at the pace of the company; the king's orders travel from wherever he is. The province
 * where he stands taken by another power takes him with it, and on the road he can be stopped where a king who closed his
 * roads to him has troops; the province where his court stands taken loses it.
 */
import { waysOf } from "../model/works.ts";
import { idiv } from "../core/num.ts";
import { cmpNum, cmpStr, sortBy } from "../core/seq.ts";
import { CourtData, KingAloneData, newKingRoad } from "../model/command.ts";
import { seasonOfTurn } from "../model/map.ts";
import type { CourtOrder } from "../model/orders.ts";
import type { Power } from "../model/power.ts";
import { alive, findCharacter, logEvent, notify } from "../model/state.ts";
import { PointsPerDay, legPoints } from "../model/travel.ts";
import { courtMoveCost, courtOf, kingRoute, seatOf, wordHomeAt } from "../rules/court.ts";
import { formatMoney } from "../rules/calendar.ts";
import { RoadOdds } from "./travel.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** The court sets out, with the king if he is with it, or the king alone (order court): its cost is paid, and it travels from next season. */
    setOutCourt(p: Power, o: CourtOrder): void;
    /** The courts and kings on the road go on, a season's road each; a king stopped by a king's troops on a closed road is taken. */
    kingsTravel(): void;
    /**
     * The kings taken this season, by whom, and whether in a city taken (`city`): where they stood was taken, or they were
     * stopped on the road. Call before `courtsLost`.
     */
    kingsTaken(): Map<Power, { by: Power | null; city: boolean }>;
    /** Item 17b, part C: the courts lost this season, and to whom: where they stood was taken, or they were stopped on the road with their kings. */
    courtsLost(): Map<Power, Power | null>;
    /** Who took `at` from `p` this season, or undefined; `court`: a court never moved counts its map capital lost if it is not his. */
    lostThisSeason(p: Power, at: string, court: boolean): Power | null | undefined;
    /** Item 17b, part C: how late the court's business reaches each king apart from his court (`GameState.courtLag`), as things stand now. */
    courtLags(): void;
    /** Who may stop the king on the road in a province: a power besieging a city of his there, or one that closed its roads to him with troops there. */
    kingStoppedAt(p: Power, x: string): Power | null;
  }
}

const P = TurnEngine.prototype;

/** Kings stopped on the road this season, by whom, and whether alone, without their courts (cleared as the season's falls are found). */
const stopped = new WeakMap<TurnEngine, Map<Power, { by: Power; alone: boolean }>>();

P.setOutCourt = function (p, o) {
  const S = this.s;
  const alone = o.alone === true;
  // A king taken or dead before the order could reach him goes nowhere (his court did not know).
  const king = findCharacter(S, S.reigns.get(p).character);
  if (alone && (king === null || king.status !== "Employed" || king.duty !== "Ruling")) return;
  const r = kingRoute(S, this.map, p, o.to, alone);
  if (r === null) return;
  const cost = courtMoveCost(idiv(r.cost, PointsPerDay), alone);
  if (!this.pay(p, cost, alone ? `your journey to ${this.map.get(o.to).name}` : `moving your court to ${this.map.get(o.to).name}`, o)) return;
  S.kingRoads = S.kingRoads.filter((x) => !(x.power === p && x.alone === alone));
  // Item 17b, part C: the king leaves his court where it is, and stands apart from it from now on.
  if (alone && !S.kingAt.has(p)) S.kingAt.set(p, courtOf(S, this.map, p));
  S.kingRoads.push(newKingRoad({ power: p, to: o.to, route: r.route, leg: 0, along: 0, since: S.turn, alone }));
  const days = Math.max(1, Math.ceil(r.cost / PointsPerDay));
  const who = alone ? "You set out with your guard, leaving your court where it is," : S.kingAt.has(p) ? "Your court sets out without you" : "You set out with your court";
  notify(S, p, "Resolution", alone ? "You set out" : "The court sets out", `${who} for ${this.map.get(o.to).name}, for ${formatMoney(cost)}: about ${days} days of road.`);
  logEvent(S, "court", alone ? `The king of ${p} set out without his court for ${this.map.get(o.to).name}.` : `The court of ${p} set out for ${this.map.get(o.to).name}.`, [p], alone ? "king-alone" : "court-moves");
};

P.kingsTravel = function () {
  const S = this.s;
  const season = seasonOfTurn(S.turn);
  const budget = S.config.travelDays * PointsPerDay;
  const taken = new Map<Power, { by: Power; alone: boolean }>();
  stopped.set(this, taken);
  const rng = this.r("kings-road");
  for (const road of sortBy([...S.kingRoads], [(x) => x.power, cmpStr], [(x) => (x.alone ? 1 : 0), cmpNum])) {
    if (!S.kingRoads.includes(road)) continue;
    const p = road.power;
    const start = road.leg;
    const size = road.alone ? KingAloneData.companyMen : CourtData.companyMen;
    let left = budget;
    while (road.leg < road.route.length - 1 && left > 0) {
      const a = road.route[road.leg];
      const b = road.route[road.leg + 1];
      const need = legPoints(this.map, a, b, season, { sneaking: false, size, ways: waysOf(this.s) }) - road.along;
      if (need > left) {
        road.along += left;
        left = 0;
      } else {
        left -= need;
        road.leg++;
        road.along = 0;
      }
    }
    const at = road.route[road.leg];
    const place = road.alone ? S.kingAt : S.court;
    place.set(p, at);
    // Through the besiegers of a city of his, or where a king who closed his roads to him has troops, his guard may not
    // get him through: each such place he passed this season, from where he set out to where he stops. A court without
    // its king goes on.
    let stoppedBy: Power | null = null;
    if (road.alone || !S.kingAt.has(p))
      for (const x of road.route.slice(start, road.leg + 1)) {
        const q = this.kingStoppedAt(p, x);
        if (q === null || !rng.chance(RoadOdds.troops / 100)) continue;
        place.set(p, x);
        stoppedBy = q;
        break;
      }
    if (stoppedBy !== null) {
      taken.set(p, { by: stoppedBy, alone: road.alone });
      continue;
    }
    if (road.leg < road.route.length - 1) continue;
    S.kingRoads = S.kingRoads.filter((x) => x !== road);
    // Item 17b, part C: the king and his court together again where one comes to the other.
    const together = S.kingAt.tryGet(p) === courtOf(S, this.map, p) && !S.kingRoads.some((x) => x.power === p);
    if (together) S.kingAt.delete(p);
    const text = together
      ? road.alone
        ? `You are back with your court in ${this.map.get(at).name}.`
        : `Your court has come to you in ${this.map.get(at).name}.`
      : road.alone
        ? `You are in ${this.map.get(at).name}, apart from your court: your orders go out from here.`
        : S.kingAt.has(p)
          ? `Your court is in ${this.map.get(at).name}: envoys and letters come to it there, and your treasury and archive are kept there.`
          : `You and your court are in ${this.map.get(at).name}: your orders go out from here.`;
    notify(S, p, "Resolution", road.alone ? "You arrive" : "The court arrives", text);
  }
};

P.courtLags = function () {
  const S = this.s;
  S.courtLag.clear();
  for (const [p, at] of S.kingAt) {
    const t = wordHomeAt(S, this.map, at, courtOf(S, this.map, p), S.turn);
    if (Number.isFinite(t) && t > S.turn) S.courtLag.set(p, t - S.turn);
  }
};

P.kingStoppedAt = function (p, x) {
  const S = this.s;
  const siege = S.sieges.find((g) => g.province === x && g.power !== p && S.owner.getOrDefault(x, null) === p);
  if (siege !== undefined) return siege.power;
  const holder = S.owner.getOrDefault(x, null);
  if (holder !== null && holder !== p && (S.roadsClosed.tryGet(holder) ?? []).includes(p) && S.units.some((u) => u.province === x && u.power === holder)) return holder;
  return null;
};

P.kingsTaken = function () {
  const S = this.s;
  const out = new Map<Power, { by: Power | null; city: boolean }>();
  const onRoad = stopped.get(this) ?? new Map<Power, { by: Power; alone: boolean }>();
  for (const p of alive(S)) {
    const road = onRoad.get(p);
    if (road !== undefined) {
      out.set(p, { by: road.by, city: false });
      continue;
    }
    // Where he stands changed hands this season to another power: he is taken with it, or dies in its fall.
    const by = this.lostThisSeason(p, seatOf(S, this.map, p), !S.kingAt.has(p));
    if (by !== undefined) out.set(p, { by, city: true });
  }
  return out;
};

P.courtsLost = function () {
  const S = this.s;
  const out = new Map<Power, Power | null>();
  const onRoad = stopped.get(this) ?? new Map<Power, { by: Power; alone: boolean }>();
  for (const p of alive(S)) {
    const road = onRoad.get(p);
    if (road !== undefined && !road.alone) {
      out.set(p, road.by);
      continue;
    }
    const by = this.lostThisSeason(p, courtOf(S, this.map, p), true);
    if (by !== undefined) out.set(p, by);
  }
  stopped.delete(this);
  return out;
};

P.lostThisSeason = function (p, at, court) {
  const S = this.s;
  const change = S.ownerLog.filter((c) => c.province === at && c.turn === S.turn).pop();
  if (change !== undefined && change.owner !== p && S.owner.getOrDefault(at, null) !== p) return change.owner;
  // A court that stands in no province of its own, never moved, has lost its capital (as before item 13).
  if (court && !S.court.has(p) && S.owner.getOrDefault(at, null) !== p) return S.owner.getOrDefault(at, null);
  return undefined;
};
