/** Checking and wording the conditions of orders and answers (the vocabulary is in model/conditions.ts). */
import type { Condition } from "../model/conditions.ts";
import type { SeatView } from "../model/views.ts";
import { formatMoney } from "./calendar.ts";

/** Whether a condition holds, as the seat whose view this is knows it. */
export function conditionHolds(c: Condition, v: SeatView): boolean {
  const p = v.power;
  switch (c.kind) {
    case "TroopsIn":
      return v.units.some((u) => u.province === c.province && (c.power === null ? u.power !== p : u.power === c.power));
    case "TreasuryBelow":
      return v.gold < c.amount;
    case "TreasuryAtLeast":
      return v.gold >= c.amount;
    case "EnvoyBack":
      return v.court.some((x) => x.id === c.person && x.ready);
    case "TabletSealed":
      return v.tablets.some((t) => t.seals.includes(p) && (c.power === null ? t.seals.some((x) => x !== p) : t.seals.includes(c.power)));
  }
}

/** Whether every condition is met: each "if" holds and no "unless" does. No conditions: always. */
export function conditionsMet(cs: readonly Condition[], v: SeatView): boolean {
  return cs.every((c) => conditionHolds(c, v) !== c.unless);
}

/** A condition in the words its seat reads: "unless Hatti's troops are in kizzuwatna". */
export function conditionText(c: Condition): string {
  const what = ((): string => {
    switch (c.kind) {
      case "TroopsIn":
        return `${c.power === null ? "foreign" : `${c.power}'s`} troops are in ${c.province}, where you can see them`;
      case "TreasuryBelow":
        return `your treasury is below ${formatMoney(c.amount)}`;
      case "TreasuryAtLeast":
        return `your treasury holds at least ${formatMoney(c.amount)}`;
      case "EnvoyBack":
        return `${c.person} is back at your court and ready`;
      case "TabletSealed":
        return `you hold a tablet sealed by you and ${c.power ?? "another court"}`;
    }
  })();
  return `${c.unless ? "unless" : "if"} ${what}`;
}

/** The conditions of an order or answer, joined: "if ... and unless ...", or empty for none. */
export function conditionsText(cs: readonly Condition[]): string {
  return cs.map(conditionText).join(" and ");
}

/** Two lists of conditions are the same (scheduled orders of one season are shown together only if they are). */
export function sameConditions(a: readonly Condition[], b: readonly Condition[]): boolean {
  const key = (c: Condition): string => [c.kind, c.unless, c.power ?? "", c.province, c.amount, c.person].join("|");
  return a.length === b.length && a.every((c, i) => key(c) === key(b[i]));
}
