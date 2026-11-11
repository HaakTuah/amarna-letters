/**
 * A captive king's word home (#806, the owner's answer of 9 November 2026; Victory, "One scoreboard for every person"):
 * what he agrees to while held (his ransom, a spy hired at his captor's court) rides home in his letter
 * (`turn/held-king.ts`), and his court carries it out when the letter arrives, if it arrives.
 */
import { type ObjSchema, S, obj } from "../core/json.ts";
import { type Order } from "./orders.ts";
import { OrderSchema } from "./order-schema.ts";
import type { Power } from "./power.ts";

export interface WordHome {
  /** The letter (`Journey.id`) that carries it; "" once it has arrived, until his court carries it out. */
  journey: string;
  /** His realm, whose court carries it out. */
  power: Power;
  order: Order;
}

export function newWordHome(init: Partial<WordHome> = {}): WordHome {
  return { journey: "", power: "Egypt", order: { type: "payRansom", character: "" }, ...init };
}

export const WordHomeSchema: ObjSchema<WordHome> = obj("WordHome", newWordHome, { journey: S, power: S, order: () => OrderSchema });
