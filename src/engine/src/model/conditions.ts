import { B, I, type ObjSchema, S, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";

/**
 * The conditions of a scheduled entry, a standing order or a standing answer ("Scheduled, conditional orders" under
 * Pacing; built in item 6b): a small structured vocabulary the engine checks, never free text. Each reads only what its
 * seat knows where the order runs, its own view when they run (orders once the season's audiences are over, standing answers as its court begins): troops where it can see them, its own treasury, its
 * own people at its court, the tablets in its archive, its own provinces' stores. Until item 13 adds distance inside the realm, the seat's view is
 * known everywhere in its realm at once.
 */
export const ConditionKindValues = ["TroopsIn", "TreasuryBelow", "TreasuryAtLeast", "EnvoyBack", "TabletSealed", "StoresAtLeast"] as const;
export type ConditionKind =
  /** Troops of {@link Condition.power} (any foreign power's if null) stand in {@link Condition.province}, where the seat can see them. */
  | "TroopsIn"
  /** The seat's treasury, by its own ledger, is below {@link Condition.amount}. */
  | "TreasuryBelow"
  /** The seat's treasury, by its own ledger, is at least {@link Condition.amount}. */
  | "TreasuryAtLeast"
  /** The seat's servant {@link Condition.person} is back at its court and ready for a mission. */
  | "EnvoyBack"
  /** The seat's archive holds a tablet sealed by it and {@link Condition.power} (any other court if null). */
  | "TabletSealed"
  /** The stores of the seat's own province {@link Condition.province} hold at least {@link Condition.amount} measures of grain (item 9+a). */
  | "StoresAtLeast";

export interface Condition {
  kind: ConditionKind;
  /** "Unless": the orders run, or the answer stands, only if it does not hold. */
  unless: boolean;
  power: Power | null;
  province: string;
  amount: number;
  person: string;
  /** Why the reply's condition could not be read (a court nobody knows): its entry is refused with this. */
  unreadable: string;
}

export function newCondition(init: Partial<Condition> = {}): Condition {
  return {
    kind: "TroopsIn",
    unless: false,
    power: null,
    province: "",
    amount: 0,
    person: "",
    unreadable: "",
    ...init,
  };
}

export const ConditionSchema: ObjSchema<Condition> = obj("Condition", newCondition, {
  kind: S,
  unless: B,
  power: opt(S),
  province: S,
  amount: I,
  person: S,
  unreadable: S,
});

/** The most conditions one order, entry or answer may carry. */
export const MaxConditions = 4;
