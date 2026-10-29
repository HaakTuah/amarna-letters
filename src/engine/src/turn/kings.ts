/**
 * The capital is wherever the king is (build order item 13, "The capital is wherever the king is"). A king may go anywhere
 * a traveller can, with his court: to lead an army, carry his own letter or visit a foreign court. Moving the court costs
 * gold and takes the road's time, at the pace of his household and guard; his orders travel from wherever he is, and the
 * envoys and reports that reach his old seat are sent on after him. Losing him ends the kingdom: the province where he
 * stands taken by another power takes him with it, and on the road he can be stopped where a king who closed his roads to
 * him has troops. A king who has moved is not taken with his old seat.
 */
import { idiv } from "../core/num.ts";
import { cmpStr, sortBy } from "../core/seq.ts";
import { CourtData, newKingRoad } from "../model/command.ts";
import { seasonOfTurn } from "../model/map.ts";
import type { CourtOrder } from "../model/orders.ts";
import type { Power } from "../model/power.ts";
import { alive, logEvent, notify } from "../model/state.ts";
import { PointsPerDay, legPoints } from "../model/travel.ts";
import { courtMoveCost, kingRoute } from "../rules/court.ts";
import { formatMoney } from "../rules/calendar.ts";
import { RoadOdds } from "./travel.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** The king sets out with his court (order court): its cost is paid, and he travels from next season. */
    setOutCourt(p: Power, o: CourtOrder): void;
    /** The kings on the road go on, a season's road each; one stopped by a king's troops on a closed road is taken. */
    kingsTravel(): void;
    /** The kings taken this season and by whom: where they stood was taken, or they were stopped on the road. */
    kingsTaken(): Map<Power, Power | null>;
    /** Who may stop the king on the road in a province: a power besieging a city of his there, or one that closed its roads to him with troops there. */
    kingStoppedAt(p: Power, x: string): Power | null;
  }
}

const P = TurnEngine.prototype;

/** Kings stopped on the road this season, and by whom (cleared as the season's falls are found). */
const stopped = new WeakMap<TurnEngine, Map<Power, Power>>();

P.setOutCourt = function (p, o) {
  const S = this.s;
  const r = kingRoute(S, this.map, p, o.to);
  if (r === null) return;
  const cost = courtMoveCost(idiv(r.cost, PointsPerDay));
  if (!this.pay(p, cost, `moving your court to ${this.map.get(o.to).name}`, o)) return;
  S.kingRoads = S.kingRoads.filter((x) => x.power !== p);
  S.kingRoads.push(newKingRoad({ power: p, to: o.to, route: r.route, leg: 0, along: 0, since: S.turn }));
  notify(S, p, "Resolution", "The court sets out", `You set out with your court for ${this.map.get(o.to).name}, for ${formatMoney(cost)}: about ${Math.max(1, Math.ceil(r.cost / PointsPerDay))} days of road. Your orders go out from wherever you are, and envoys and reports reaching your old seat are sent on after you.`);
  logEvent(S, "court", `The king of ${p} set out with his court for ${this.map.get(o.to).name}.`, [p], "court-moves");
};

P.kingsTravel = function () {
  const S = this.s;
  const season = seasonOfTurn(S.turn);
  const budget = S.config.travelDays * PointsPerDay;
  const taken = new Map<Power, Power>();
  stopped.set(this, taken);
  const rng = this.r("kings-road");
  for (const road of sortBy([...S.kingRoads], [(x) => x.power, cmpStr])) {
    const p = road.power;
    const start = road.leg;
    let left = budget;
    while (road.leg < road.route.length - 1 && left > 0) {
      const a = road.route[road.leg];
      const b = road.route[road.leg + 1];
      const need = legPoints(this.map, a, b, season, { sneaking: false, size: CourtData.companyMen }) - road.along;
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
    S.court.set(p, at);
    // Through the besiegers of a city of his, or where a king who closed his roads to him has troops, his guard may not
    // get him through: each such place he passed this season, from where he set out to where he stops.
    let stoppedBy: Power | null = null;
    for (const x of road.route.slice(start, road.leg + 1)) {
      const q = this.kingStoppedAt(p, x);
      if (q === null || !rng.chance(RoadOdds.troops / 100)) continue;
      S.court.set(p, x);
      stoppedBy = q;
      break;
    }
    if (stoppedBy !== null) {
      taken.set(p, stoppedBy);
      continue;
    }
    if (road.leg >= road.route.length - 1) {
      S.kingRoads = S.kingRoads.filter((x) => x !== road);
      notify(S, p, "Resolution", "The court arrives", `You and your court are in ${this.map.get(at).name}: your orders go out from here.`);
    }
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
  const out = new Map<Power, Power | null>();
  const onRoad = stopped.get(this) ?? new Map<Power, Power>();
  for (const p of alive(S)) {
    const by = onRoad.get(p);
    if (by !== undefined) {
      out.set(p, by);
      continue;
    }
    // Where he stands changed hands this season to another power: he is taken with it.
    const at = this.courtAt(p);
    const change = S.ownerLog.filter((c) => c.province === at && c.turn === S.turn).pop();
    if (change !== undefined && change.owner !== p && S.owner.getOrDefault(at, null) !== p) out.set(p, change.owner);
    // A king who stands in no province of his own, never moved, has lost his capital (as before item 13).
    else if (!S.court.has(p) && S.owner.getOrDefault(at, null) !== p) out.set(p, S.owner.getOrDefault(at, null));
  }
  stopped.delete(this);
  return out;
};
