/** A seat's submission for a season: its orders, the ones refused, its ledger of dealings, and its plans for the seasons it sleeps. */
import { B, S, list, obj, opt, type ObjSchema, type Schema } from "../core/json.ts";
import { ScheduledOrdersSchema, StandingRequestSchema, type ScheduledOrders, type StandingRequest } from "./sleep.ts";
import { StandingAnswerRequestSchema, type StandingAnswerRequest } from "./answers.ts";
import type { Power } from "./power.ts";
import type { Order } from "./orders.ts";
import { OrderSchema } from "./order-schema.ts";

/** One line of a king's ledger of dealings: what it wrote of its dealings with one court. */
export interface LedgerLine {
  court: Power;
  entry: string;
}

export const LedgerLineSchema = obj<LedgerLine>("LedgerLine", () => ({ court: "Egypt", entry: "" }), { court: S, entry: S });

export interface RejectedOrder {
  order: Order;
  reason: string;
}

/** Everything one seat submits in one season. Notes are a private journal for the seat itself. */
export interface TurnSubmission {
  orders: Order[];
  notes: string;
  /**
   * Model and file seats: the king's own summary of the seasons that have left its record, written in its reply (empty
   * keeps the one before). Logged with the orders, so a replay can read it; the engine ignores it.
   */
  summary: string;
  /**
   * Model and file seats: lines of the king's ledger of dealings, one per court, in its own words (an entry replaces that
   * court's line, an empty entry removes it). Logged with the orders; the engine ignores it.
   */
  ledger: LedgerLine[];
  /** Seats that may sleep: orders queued for later seasons (one entry per season replaces any earlier one). */
  scheduled: ScheduledOrders[];
  /** Every seat, awake or asleep: new standing orders, kept with those it already has. */
  standing: StandingRequest[];
  /** Every seat, awake or asleep: ids of standing orders to cancel, or "all". */
  cancelStanding: string[];
  /** Model, file and human seats: new standing answers for what arrives at its court (item 6b). */
  answers: StandingAnswerRequest[];
  /** Ids of standing answers to cancel, or "all". */
  cancelAnswers: string[];
  /** Set by the runner when the script king stood in for a seat whose call failed: the seat has not seen this season. */
  fromFallback: boolean;
  /**
   * A seat that may sleep asks to be asked again next season instead of sleeping (item 9+a: a human ends his turn without
   * sleeping; "Per-seat sleep, never a global skip"). Model and file seats leave it false and sleep after their orders.
   */
  stayAwake: boolean;
  /** Item 16: a model, file or human seat turns its royal council "on" or "off" from next season ("" leaves it as it is). */
  council: string;
  /**
   * #806: while the seat's king is held, the caretaker's orders for his realm, asked by the runner beside the seat's own
   * (which are then the captive's: `turn/held-king.ts`). Null otherwise. Once the engine has read them (`heldSeason`), the
   * stand-in's orders, kept apart from those his own word gives now, which come before them.
   */
  caretaker: TurnSubmission | null;
}

export function newTurnSubmission(init: Partial<TurnSubmission> = {}): TurnSubmission {
  return { orders: [], notes: "", summary: "", ledger: [], scheduled: [], standing: [], cancelStanding: [], answers: [], cancelAnswers: [], fromFallback: false, stayAwake: false, council: "", caretaker: null, ...init };
}

export const TurnSubmissionSchema: ObjSchema<TurnSubmission> = obj<TurnSubmission>("TurnSubmission", newTurnSubmission, {
  orders: list(OrderSchema),
  notes: S,
  summary: S,
  ledger: list(LedgerLineSchema),
  scheduled: list(() => ScheduledOrdersSchema),
  standing: list(() => StandingRequestSchema),
  cancelStanding: list(S),
  answers: list(() => StandingAnswerRequestSchema),
  cancelAnswers: list(S),
  fromFallback: B,
  stayAwake: B,
  council: S,
  caretaker: opt((): Schema => TurnSubmissionSchema),
});
