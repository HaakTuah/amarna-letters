import { B, I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import type { UnitKind } from "./map.ts";
import { type Order, OrderSchema } from "./orders.ts";
import type { Power } from "./power.ts";

/**
 * Orders a seat gives for a later season, as it gives them: each of its own units named by the province it stands in
 * when the orders are given. In the seat's view, the same with each unit named by where it stands now.
 */
export interface ScheduledOrders {
  turn: number;
  orders: Order[];
}

export function newScheduledOrders(init: Partial<ScheduledOrders> = {}): ScheduledOrders {
  return {
    turn: 0,
    orders: [],
    ...init,
  };
}

export const ScheduledOrdersSchema: ObjSchema<ScheduledOrders> = obj("ScheduledOrders", newScheduledOrders, {
  turn: I,
  orders: list(() => OrderSchema),
});

/**
 * An order a seat keeps for later: scheduled for a season, or among a standing order's orders. The king named each of
 * its own units by the province it stood in when it gave the order; the order is bound to that unit, follows it wherever
 * it goes, and is given from where the unit then stands ({@link TurnEngine.AsItStands}). A foreign unit named in a
 * support stays named by its province. An order for no unit (a levy, an errand) runs as given.
 */
export interface PlannedOrder {
  /** The season it runs in (0 among a standing order's orders). */
  turn: number;
  /** The order as the king gave it, its units named by where they stood then. */
  order: Order;
  /** The seat's own unit the order is for (hold, move, support, convoy, disband, give), or null. */
  unitId: string | null;
  /** The seat's own unit named as the unit supported or the army convoyed, or null. */
  otherUnitId: string | null;
  /**
   * While the unit the order is for is not yet raised: the levy that is to raise it (since the fix pass after item 4). When
   * the levy raises it, the order is bound to it ({@link UnitId}); if the levy raises none, the order is dropped.
   */
  unitLevy: LevyRef | null;
  /** The same for the unit named as the unit supported or the army convoyed. */
  otherLevy: LevyRef | null;
  /** A scheduled move tried again because it failed: if it fails again, its unit's march ends. */
  retry: boolean;
}

export function newPlannedOrder(init: Partial<PlannedOrder> = {}): PlannedOrder {
  return {
    turn: 0,
    order: null!,
    unitId: null,
    otherUnitId: null,
    unitLevy: null,
    otherLevy: null,
    retry: false,
    ...init,
  };
}

export const PlannedOrderSchema: ObjSchema<PlannedOrder> = obj("PlannedOrder", newPlannedOrder, {
  turn: I,
  order: () => OrderSchema,
  unitId: S,
  otherUnitId: S,
  unitLevy: () => LevyRefSchema,
  otherLevy: () => LevyRefSchema,
  retry: B,
});

/**
 * A levy a scheduled order waits for: the unit of this kind to be raised in this province in this season.
 */
export interface LevyRef {
  province: string;
  turn: number;
  kind: UnitKind;
}

export function newLevyRef(init: Partial<LevyRef> = {}): LevyRef {
  return {
    province: "",
    turn: 0,
    kind: "Army",
    ...init,
  };
}

export const LevyRefSchema: ObjSchema<LevyRef> = obj("LevyRef", newLevyRef, {
  province: S,
  turn: I,
  kind: S,
});

/**
 * The events a standing order waits for: a small vocabulary the engine checks from the seat's own view. Each is a move set
 * out this season, which the standing order answers in the same season (since the fix pass after item 4).
 */
export const StandingWhenValues = ["UnitEnters", "UnitAttacked"] as const;
export type StandingWhen =
  /**
   * A unit of {@link StandingOrder.Power} (any foreign power's if null) sets out, where the seat can see it, to move into {@link StandingOrder.Province}.
   */
  | "UnitEnters"
  /**
   * A foreign unit sets out to move into the province where the seat's own unit ({@link StandingOrder.UnitId}) stands.
   */
  | "UnitAttacked";

/** A standing order as a seat gives it: when this move is seen, give these orders in the same season. */
export interface StandingRequest {
  when: StandingWhen;
  /** For {@link StandingWhen.UnitEnters}: whose unit; null for any foreign power's. */
  power: Power | null;
  /**
   * For {@link StandingWhen.UnitEnters}: the province entered. For {@link StandingWhen.UnitAttacked}: where the seat's unit stands now.
   */
  province: string;
  /** The orders, the seat's own units named by where they stand now. */
  orders: Order[];
  /** Why the reply could not be read (a power nobody knows): the request is refused with this reason. */
  unreadable: string | null;
}

export function newStandingRequest(init: Partial<StandingRequest> = {}): StandingRequest {
  return {
    when: "UnitEnters",
    power: null,
    province: "",
    orders: [],
    unreadable: null,
    ...init,
  };
}

export const StandingRequestSchema: ObjSchema<StandingRequest> = obj("StandingRequest", newStandingRequest, {
  when: S,
  power: opt(S),
  province: S,
  orders: list(() => OrderSchema),
  unreadable: S,
});

/** A standing order a seat keeps until it fires, once, or is cancelled. */
export interface StandingOrder {
  /** "s1", "s2", ... for this seat, shown in its view. */
  id: string;
  when: StandingWhen;
  power: Power | null;
  /** For {@link StandingWhen.UnitEnters}: the province entered. */
  province: string | null;
  /** For {@link StandingWhen.UnitAttacked}: the seat's own unit. */
  unitId: string | null;
  orders: PlannedOrder[];
}

export function newStandingOrder(init: Partial<StandingOrder> = {}): StandingOrder {
  return {
    id: "",
    when: "UnitEnters",
    power: null,
    province: null,
    unitId: null,
    orders: [],
    ...init,
  };
}

export const StandingOrderSchema: ObjSchema<StandingOrder> = obj("StandingOrder", newStandingOrder, {
  id: S,
  when: S,
  power: opt(S),
  province: S,
  unitId: S,
  orders: list(() => PlannedOrderSchema),
});

/**
 * A seat's standing orders. Every seat may keep them, awake or asleep, script, human, model or file seat (since the
 * additions to the fix pass after item 4, by the tenet "Every feature is every seat's"; before, only a seat that sleeps had
 * them, in its {@link SleepState}). A seat that never kept one has none ({@link GameState.Standing}).
 */
export interface StandingBook {
  /** Its standing orders, kept until they fire or are cancelled. */
  orders: StandingOrder[];
  /** The number of the last standing order it was given, for the next id. */
  last: number;
}

export function newStandingBook(init: Partial<StandingBook> = {}): StandingBook {
  return {
    orders: [],
    last: 0,
    ...init,
  };
}

export const StandingBookSchema: ObjSchema<StandingBook> = obj("StandingBook", newStandingBook, {
  orders: list(() => StandingOrderSchema),
  last: I,
});

/** A standing order as its seat reads it: its unit and its orders named by where they stand now. */
export interface StandingOrderView {
  id: string;
  when: StandingWhen;
  power: Power | null;
  /**
   * For {@link StandingWhen.UnitEnters}: the province entered. For {@link StandingWhen.UnitAttacked}: where the unit stands now.
   */
  province: string;
  orders: Order[];
}

export function newStandingOrderView(init: Partial<StandingOrderView> = {}): StandingOrderView {
  return {
    id: "",
    when: "UnitEnters",
    power: null,
    province: "",
    orders: [],
    ...init,
  };
}

export const StandingOrderViewSchema: ObjSchema<StandingOrderView> = obj("StandingOrderView", newStandingOrderView, {
  id: S,
  when: S,
  power: opt(S),
  province: S,
  orders: list(() => OrderSchema),
});

/**
 * A sleeping seat's state. Only seats that may sleep (model and file seats, when the setting is on) have one. A seat woken
 * only by envoys waiting holds court asleep: its orders stand unless it reopens them at an audience (Part H of the
 * simulation-fixes round).
 */
export interface SleepState {
  asleep: boolean;
  /** The last season the seat was asked for orders (and answered itself, not through the stand-in). */
  lastCalled: number;
  /**
   * The season it wakes at the latest: the hidden cap ({@link GameConfig.MaxSleep}), which no rulebook or view names.
   */
  wakeAt: number;
  /**
   * Its scheduled orders, each bound to its unit, in the order they run: by season, then as given. (Its standing orders,
   * which every seat may keep, are in {@link GameState.Standing}.)
   */
  scheduled: PlannedOrder[];
  /**
   * What happened in the seasons it slept through that did not wake it, one line each, shown when it wakes.
   */
  digest: string[];
  /** Digest lines left out because the digest was full (the oldest go first). */
  digestLeftOut: number;
  /**
   * Why it was woken this season (empty if it was awake anyway). After a season the stand-in played, the reasons it
   * was woken for then are kept here too, since it never read them, until it answers itself. While it holds court with its
   * orders standing ({@link HoldsCourt}), the envoys it was woken to receive.
   */
  wokenBecause: string[];
  /**
   * Reasons found while resolving a season, applied at the next wake check (a scheduled or standing order that failed, orders dropped with a lost unit).
   */
  pendingWake: string[];
  history: SleepSpell[];
  /**
   * This season it was woken for its audiences only: an envoy waits at its court and nothing that reopens its orders
   * happened. It stays asleep, its orders stand, and at its audiences it may send letters and choose to reopen its orders.
   * Set at the wake check; cleared once the season's audiences are done ({@link TurnEngine.CourtsHeld}).
   */
  holdsCourt: boolean;
  /** While it holds court: it chose at one of its audiences to reopen its orders. */
  reopen: boolean;
  /**
   * While it holds court: a call failed at one of its audiences and the script king answered in its place. The stand-in
   * decides nothing for it, so unless it chose to reopen its orders itself, it is asked for orders this season all the same.
   */
  stoodIn: boolean;
  /**
   * The letters it sent from its audiences this season, in the order sent (a later letter for the same person replaced an
   * earlier one). They are checked with the season's orders, before any orders it gives itself, and then cleared.
   */
  courtLetters: Order[];
  /**
   * Every season it held court while its orders stood, and whether it then reopened them: for the reports.
   */
  courts: CourtHeld[];
}

export function newSleepState(init: Partial<SleepState> = {}): SleepState {
  return {
    asleep: false,
    lastCalled: 0,
    wakeAt: 0,
    scheduled: [],
    digest: [],
    digestLeftOut: 0,
    wokenBecause: [],
    pendingWake: [],
    history: [],
    holdsCourt: false,
    reopen: false,
    stoodIn: false,
    courtLetters: [],
    courts: [],
    ...init,
  };
}

export const SleepStateSchema: ObjSchema<SleepState> = obj("SleepState", newSleepState, {
  asleep: B,
  lastCalled: I,
  wakeAt: I,
  scheduled: list(() => PlannedOrderSchema),
  digest: list(S),
  digestLeftOut: I,
  wokenBecause: list(S),
  pendingWake: list(S),
  history: list(() => SleepSpellSchema),
  holdsCourt: B,
  reopen: B,
  stoodIn: B,
  courtLetters: list(() => OrderSchema),
  courts: list(() => CourtHeldSchema),
});

/**
 * A season a sleeping seat held court while its orders stood: how many envoys waited to be received, and whether it reopened its orders.
 */
export interface CourtHeld {
  turn: number;
  envoys: number;
  /** It chose itself, at one of its audiences, to reopen its orders. */
  reopened: boolean;
  /**
   * A call failed at one of its audiences and the stand-in answered. Unless it chose to reopen itself, its orders were then
   * reopened without its choice, and the court is left out of the reopen rate ({@link Decided}).
   */
  standIn: boolean;
  /** The seat itself decided about its orders: it reopened them, or every reply was its own. */
  // computed in C#: Reopened || !StandIn
}

export function newCourtHeld(init: Partial<CourtHeld> = {}): CourtHeld {
  return {
    turn: 0,
    envoys: 0,
    reopened: false,
    standIn: false,
    ...init,
  };
}

export const CourtHeldSchema: ObjSchema<CourtHeld> = obj("CourtHeld", newCourtHeld, {
  turn: I,
  envoys: I,
  reopened: B,
  standIn: B,
});

/** One stretch of sleep, for the reports: when it began, and when and why it woke. */
export interface SleepSpell {
  from: number;
  wokeAt: number;
  reasons: string[];
}

export function newSleepSpell(init: Partial<SleepSpell> = {}): SleepSpell {
  return {
    from: 0,
    wokeAt: 0,
    reasons: [],
    ...init,
  };
}

export const SleepSpellSchema: ObjSchema<SleepSpell> = obj("SleepSpell", newSleepSpell, {
  from: I,
  wokeAt: I,
  reasons: list(S),
});

/** The unit the levy is to raise, in the words its seat reads ("the army to be raised in nippur in turn 3"). */
export function describeLevy(l: LevyRef): string {
  return `the ${l.kind === "Army" ? "army" : "fleet"} to be raised in ${l.province} in turn ${l.turn}`;
}

/** The seat itself decided about its orders: it reopened them, or every reply was its own. */
export function courtDecided(c: CourtHeld): boolean {
  return c.reopened || !c.standIn;
}
