/**
 * What a script king that sleeps schedules for the seasons it may sleep through (item 6b, "Scheduled, conditional orders"):
 * orders that hold whatever happens, because each carries the condition that makes it sound when it runs. An envoy sent
 * now is sent again with the same message once he is back at court ("envoy_back"), so a sleeping king keeps his courts
 * written to; a levy raised now is raised again in the next seasons only while the treasury can bear it
 * ("treasury_at_least") and the province is free of the king's own troops ("unless troops_in"). A king that plays every
 * season schedules nothing: it decides afresh each season.
 */
import { newCondition, newScheduledOrders, type DispatchOrder, type Order, type ScheduledOrders, type SeatView } from "@amarna/engine";

/** The seasons ahead an envoy sent now may be sent again in, from the second (he is away at least one season each way). */
const EnvoyFrom = 2;
const EnvoyTo = 7;
/** The seasons ahead a levy is repeated in. */
const LevyAhead = 2;
/** A levy is repeated only while the treasury holds this many times its cost (it must still pay upkeep). */
const LevyReserve = 2;

/**
 * Whether script kings plan ahead when they sleep, and which of them (null: all); off, or for half the kings, only to
 * measure what planning ahead is worth (`--no-plan-ahead`, `--plan-ahead-half`).
 */
export const PlanAhead: { on: boolean; only: ReadonlySet<string> | null } = { on: true, only: null };

export function ahead(v: SeatView, orders: readonly Order[]): ScheduledOrders[] {
  if (!v.sleeps || !PlanAhead.on || (PlanAhead.only !== null && !PlanAhead.only.has(v.power))) return [];
  const out: ScheduledOrders[] = [];
  for (const o of orders) {
    if (o.type !== "dispatch") continue;
    const again: DispatchOrder = { ...o, gold: 0, purityPercent: 100, proposal: null, copies: null };
    for (let t = v.turn + EnvoyFrom; t <= v.turn + EnvoyTo; t++)
      out.push(newScheduledOrders({ turn: t, orders: [again], conditions: [newCondition({ kind: "EnvoyBack", person: o.envoy })] }));
  }
  for (const o of orders) {
    if (o.type !== "raise") continue;
    const cost = v.prices.getOrDefault(o.kind === "Army" ? "armyCost" : "fleetCost", 100);
    for (let t = v.turn + 1; t <= v.turn + LevyAhead; t++)
      out.push(
        newScheduledOrders({
          turn: t,
          orders: [o],
          conditions: [
            newCondition({ kind: "TreasuryAtLeast", amount: LevyReserve * cost }),
            newCondition({ kind: "TroopsIn", unless: true, power: v.power, province: o.province }),
          ],
        }),
      );
  }
  return out;
}
