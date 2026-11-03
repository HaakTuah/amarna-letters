/**
 * Distance inside your own realm (build order item 13, "Distance inside your own realm"): every order a king gives inside
 * his realm travels from where he is, carried by the realm's own couriers, men in a unit like a caravan's, at a lone
 * traveller's pace on the fastest road. An order whose place a courier reaches within the season is carried out in it, as
 * before; one farther off sets out now and is carried out in the season it arrives, given from where its unit then stands,
 * as a scheduled order is. In hostile land a courier may be stopped, and the order is lost to whoever stopped him, who reads
 * it. Reports come back the same way: what the king sees as current is what a courier could bring him within the season,
 * and of his land and troops farther off he knows only their last report, as old as the road is long.
 */
import { hostileAt, levelOf, waysOf } from "../model/works.ts";
import { cmpNum, cmpStr, sortBy } from "../core/seq.ts";
import { newCourier } from "../model/command.ts";
import { describe, unitOf } from "../model/order-reading.ts";
import { newTurnSubmission, type TurnSubmission } from "../model/submission.ts";
import { type Order } from "../model/orders.ts";
import { quoteWords, type Power } from "../model/power.ts";
import { newJourney, type InboxKind } from "../model/records.ts";
import { isAlive, logEvent, newId, notify, unitAt, type Unit } from "../model/state.ts";
import { courierSeasons, courtOf, wordHomeAt } from "../rules/court.ts";
import { seasonOfTurn } from "../model/map.ts";
import { cheapestRoute, legPoints } from "../model/travel.ts";
import { RoadOdds } from "./travel.ts";
import { asItStands } from "./plans.ts";
import { TurnEngine } from "./core.ts";
import { readCaravanReport, reportCaravan, type Caravan } from "../model/caravans.ts";
import { newWord } from "../model/word.ts";
import { wordCame } from "../rules/caravans-known.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** The seasons the king's couriers take to a province: 0 within the season. */
    wordTo(p: Power, province: string): number;
    /** Where an own unit stands as its king last heard (item 13): where it stood as many seasons ago as the road is long. */
    shownAt(u: Unit): string;
    /** The own unit the king names by a province, as he sees his units. */
    unitShownAt(p: Power, province: string): Unit | null;
    /**
     * The own unit an order of the king's names by a province: one that truly stands there within the season's reach (as
     * he sees it now), else the one his reports show there.
     */
    orderedUnit(p: Power, province: string): Unit | null;
    /**
     * A seat's orders as they leave its court: those for places beyond the season's reach set out with couriers and are
     * taken out of the season's orders; those that arrive this season are added to them, as orders given now.
     */
    sendOrders(p: Power, sub: TurnSubmission): TurnSubmission;
    /** A notice to a king from a place in his realm: at once within the season's reach, else when a courier brings it. */
    tell(p: Power, province: string, kind: InboxKind, title: string, text: string, extra?: number): void;
    /** A report told its king in season `at` (now, if that is now or past), as `tell` does once it has reckoned the season. */
    tellAt(p: Power, at: number, kind: InboxKind, title: string, text: string): void;
    /** Bug #540: the word a caravan home to a far province brought, heard once word of its homecoming could come. */
    caravanWordsHome(): void;
    /**
     * An order that failed for what befell its province out of the king's sight, its loss (bug #467) or a siege (bug #517):
     * word of it comes home by the road, as word of that does, never at once; a scheduled one wakes its seat when it comes.
     */
    lostOrder(p: Power, order: Order, province: string, title: string, text: string, why: string): void;
    /** A scheduled order others foiled at a place wakes its seat when word from there could come (bug #517). */
    wakeFrom(p: Power, order: Order, province: string, why: string): void;
    /**
     * Of these courts, those within the season's reach of the place (or with no road to it): the parties to name for an
     * event there, a farther court reading of it only in the word that comes by the road (bug #517).
     */
    nearOf(province: string, ...ps: (Power | null)[]): Power[];
    /** Bug #540: what befell a caravan at a place, told its king by the road, never before word of its setting out. */
    caravanTell(c: Caravan, province: string, kind: InboxKind, title: string, text: string): void;
    /** Its king, where he reads at once what befell his caravan there (`nearOf`, and word of its setting out has come). */
    caravanNear(c: Caravan, province: string): Power[];
    /** At the end of each season, each unit's place joins its trail, the reports its king's couriers bring. */
    keepTrails(): void;
  }
}

const P = TurnEngine.prototype;

/** How many seasons of each unit's trail are kept: more than any road in the realm is long. */
const TrailKept = 4;

P.wordTo = function (p, province) {
  return courierSeasons(this.s, this.map, courtOf(this.s, this.map, p), province);
};

P.shownAt = function (u) {
  const d = this.wordTo(u.power, u.province);
  if (d === 0 || !Number.isFinite(d) || u.trail.length === 0) return u.province;
  const at = u.trail[Math.max(0, u.trail.length - 1 - d)];
  return at.split("|")[0];
};

P.unitShownAt = function (p, province) {
  const own = sortBy(
    this.s.units.filter((u) => u.power === p),
    [(u: Unit) => u.id, cmpStr],
  );
  return own.find((u) => this.shownAt(u) === province) ?? null;
};

P.orderedUnit = function (p, province) {
  const here = unitAt(this.s, province);
  if (here !== null && here.power === p && this.wordTo(p, province) === 0) return here;
  return this.unitShownAt(p, province) ?? (here !== null && here.power === p ? here : null);
};

/** Where an order is carried out: its unit's place (as its king names it) or the province it names; null for orders given at court. */
function placeOf(e: TurnEngine, p: Power, o: Order): { province: string; unit: Unit | null } | null {
  const named = unitOf(o);
  if (named !== null) {
    const u = e.orderedUnit(p, named);
    return u !== null ? { province: u.province, unit: u } : null;
  }
  switch (o.type) {
    case "sally":
      return { province: o.city, unit: null };
    case "build":
    case "sell":
    case "purchase":
    case "feed":
    case "welcome":
    case "deport":
    case "expel":
    case "returnRunaways":
    case "raise":
    case "cede":
    case "hunt":
    case "enlist":
      return { province: o.province, unit: null };
    case "caravan":
    case "trade":
      return { province: o.from, unit: null };
    case "census":
    case "answer":
      return { province: o.province, unit: null };
    case "demand":
    case "toll":
      return o.province === null ? null : { province: o.province, unit: null };
    default:
      return null;
  }
}

P.sendOrders = function (p, sub) {
  const S = this.s;
  const arrived: Order[] = [];
  // Orders arriving this season: given from where their units stand now.
  for (const c of sortBy(
    S.couriers.filter((x) => x.power === p && x.arrives <= S.turn),
    [(x) => x.given, cmpNum],
  )) {
    const o = asItStands(S, p, c.plan);
    if (o !== null) arrived.push(o);
  }
  S.couriers = S.couriers.filter((x) => !(x.power === p && x.arrives <= S.turn));
  const keep: Order[] = [];
  const sent: string[] = [];
  const lost: string[] = [];
  const rng = this.r("couriers", p);
  for (const o of sub.orders) {
    // Command, recall and mandates carry their own delay (the man or the word travels): they name the unit where it truly
    // stands, and are given at once.
    if (o.type === "command" || o.type === "relieve" || o.type === "mandate" || o.type === "supply") {
      const u = this.orderedUnit(p, o.unit);
      // Item 17: the word on an army's food keeps where its king named it, for what his view shows on the road.
      keep.push(u !== null && u.province !== o.unit ? (o.type === "supply" ? { ...o, unit: u.province, named: o.unit } : { ...o, unit: u.province }) : o);
      continue;
    }
    const at = placeOf(this, p, o);
    if (at === null || !this.map.exists(at.province)) {
      keep.push(o);
      continue;
    }
    const d = this.wordTo(p, at.province);
    if (d === 0 || !Number.isFinite(d)) {
      // Within reach, an own unit is named by where it truly stands.
      keep.push(at.unit !== null && unitOf(o) !== at.unit.province ? renamed(o, at.unit.province) : o);
      continue;
    }
    const [plan] = this.bind(p, 0, at.unit !== null ? renamed(o, at.unit.province) : o, []);
    if (plan === null) {
      keep.push(o);
      continue;
    }
    // A courier crossing land whose king closed his roads to this court, where that king's troops stand, may be stopped.
    const stopper = this.courierStopped(p, at.province, rng);
    if (stopper !== null) {
      lost.push(describe(o));
      logEvent(S, "courier", `${stopper}'s men stopped a courier of ${p}'s.`, [p, stopper], "courier-stopped");
      notify(S, stopper, "Battle", "A courier stopped", `Your men stopped a courier of ${p} on the road to ${this.map.get(at.province).name}. The order he carried read: ${quoteWords(describe(o))}.`);
      continue;
    }
    S.couriers.push(newCourier({ power: p, plan, given: S.turn, arrives: S.turn + d }));
    this.courierRead(p, at.province, o);
    logEvent(S, "courier", `${p} sent an order by courier: ${describe(o)}.`, [p], "courier-sent");
    sent.push(`${describe(o)} (arrives in turn ${S.turn + d})`);
  }
  if (sent.length > 0) notify(S, p, "Resolution", "Orders on the road", `These orders went with your couriers to places they cannot reach this season, and are carried out when they arrive: ${sent.join("; ")}.`);
  void lost;
  if (arrived.length === 0 && sent.length === 0) return sub;
  return newTurnSubmission({ ...sub, orders: [...arrived, ...keep] });
};

/** An order with its unit named by another province (where it truly stands). */
function renamed(o: Order, at: string): Order {
  switch (o.type) {
    case "hold":
    case "move":
    case "support":
    case "convoy":
    case "besiege":
    case "disband":
    case "fold":
    case "giftUnit":
      return { ...o, unit: at };
    default:
      return o;
  }
}

declare module "./core.ts" {
  interface TurnEngine {
    /** The king who stops a courier of `p` on his way to `to`, or null: land closed to `p` where its holder's troops stand. */
    courierStopped(p: Power, to: string, rng: ReturnType<TurnEngine["r"]>): Power | null;
    /** Item 15: the kings whose relay stations a courier of `p` rests at on his way to `to` read the order he carries. */
    courierRead(p: Power, to: string, o: Order): void;
  }
}

P.courierStopped = function (p, to, rng) {
  const S = this.s;
  const season = seasonOfTurn(S.turn);
  const route = cheapestRoute(this.map, courtOf(S, this.map, p), to, (a, b) => legPoints(this.map, a, b, season, { sneaking: false, ways: waysOf(S) }))?.route ?? [];
  for (const x of route) {
    const holder = S.owner.getOrDefault(x, null);
    if (holder === null || holder === p) continue;
    if (!(S.roadsClosed.tryGet(holder) ?? []).includes(p)) continue;
    if (!S.units.some((u) => u.province === x && u.power === holder)) continue;
    if (rng.chance(RoadOdds.troops / 100)) return holder;
  }
  return null;
};

P.courierRead = function (p, to, o) {
  const S = this.s;
  const season = seasonOfTurn(S.turn);
  const route = cheapestRoute(this.map, courtOf(S, this.map, p), to, (a, b) => legPoints(this.map, a, b, season, { sneaking: false, ways: waysOf(S) }))?.route ?? [];
  const read = new Set<Power>();
  for (const x of route) {
    const holder = S.owner.getOrDefault(x, null);
    if (holder === null || holder === p || read.has(holder) || levelOf(S, "Stations", x) <= 0) continue;
    if (hostileAt(S, x, holder)) continue;
    read.add(holder);
    this.tell(holder, x, "SpyReport", "Read at a relay station", `At your relay station in ${this.map.get(x).name}, your men read the order a courier of ${p}'s carried to ${this.map.get(to).name}: ${quoteWords(describe(o))}.`);
    logEvent(S, "station", `${holder}'s station men read an order of ${p}'s on its way to ${this.map.get(to).name}.`, [holder], "station-read");
  }
};

P.tell = function (p, province, kind, title, text, extra = 0) {
  this.tellAt(p, this.heardAt(p, province, extra), kind, title, text);
};

P.tellAt = function (p, at, kind, title, text) {
  const S = this.s;
  if (at <= S.turn + S.deliveryOffset) {
    notify(S, p, kind, title, text);
    return;
  }
  // A report from afar: a courier brings it, a season or more later than a near one's.
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Word", departTurn: S.turn, arriveTurn: at, from: p, to: p, news: "Realm", text: `${kind}|${title}|${text}` }));
};

P.lostOrder = function (p, order, province, title, text, why) {
  this.tell(p, province, "Rejected", title, text);
  this.wakeFrom(p, order, province, why);
};

P.wakeFrom = function (p, order, province, why) {
  const S = this.s;
  // Timed as `tell` times its word (TurnEngine.heardAt).
  const at = this.heardAt(p, province);
  if (at === S.turn + S.deliveryOffset) {
    this.scheduledFailed(p, order, why);
    return;
  }
  // The wake goes home with the word (TurnEngine.wordArrives), so a sleeping king is roused when he can read why.
  const wake = this.scheduledFailure(p, order, why);
  if (wake !== null) S.journeys.push(newJourney({ id: newId(S, "j"), kind: "Word", departTurn: S.turn, arriveTurn: at, from: p, to: p, news: "Foiled", text: wake }));
};

P.nearOf = function (province, ...ps) {
  return ps.filter((p): p is Power => p !== null && this.heardAt(p, province) === this.s.turn + this.s.deliveryOffset);
};

/** When a caravan's king hears of its setting out: its first report's place and season (Caravan.trail). */
function setOutHeard(e: TurnEngine, c: Caravan): number {
  const first = c.trail.length > 0 ? readCaravanReport(c.trail[0]) : { turn: c.since, at: c.route[0] ?? c.from };
  // The road home as it was in that season, by the one clock (wordHomeAt, as `wordCame`).
  const at = e.map.exists(first.at) ? wordHomeAt(e.s, e.map, courtOf(e.s, e.map, c.power), first.at, first.turn) : first.turn;
  return at === first.turn || !Number.isFinite(at) ? first.turn + e.s.deliveryOffset : at;
}

P.caravanTell = function (c, province, kind, title, text) {
  this.tellAt(c.power, Math.max(this.heardAt(c.power, province), setOutHeard(this, c)), kind, title, text);
};

P.caravanWordsHome = function () {
  const S = this.s;
  for (const c of S.caravansGone) {
    const w = c.word;
    if ((w.markets.size === 0 && w.tolls.length === 0 && w.holders.length === 0) || c.trail.length === 0 || !isAlive(S, c.power)) continue;
    const end = readCaravanReport(c.trail[c.trail.length - 1]);
    if (!wordCame(this, c.power, end.turn, end.at)) continue;
    this.hearWord(c.power, w);
    c.word = newWord();
  }
};

P.caravanNear = function (c, province) {
  return setOutHeard(this, c) <= this.s.turn + this.s.deliveryOffset ? this.nearOf(province, c.power) : [];
};

P.keepTrails = function () {
  for (const u of this.s.units) {
    u.trail.push(`${u.province}|${u.men}|${u.food}|${u.hungry}|${u.unpaid}|${u.chest}|${u.buy ? 1 : 0}|${u.savings}`);
    if (u.trail.length > TrailKept) u.trail.splice(0, u.trail.length - TrailKept);
  }
  // Bug #540: the caravans' reports too, which come home as word does.
  for (const c of this.s.caravans) reportCaravan(c, this.s.turn);
};
