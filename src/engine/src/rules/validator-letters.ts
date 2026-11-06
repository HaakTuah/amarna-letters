/**
 * The checks of the orders on a province's offer held by a court (#592, `model/held-letters.ts`): what it does with one
 * it holds (`letter`), and buying one another court asked it a price for (`buyLetter`). Undefined for any other order.
 */
import type { Order } from "../model/orders.ts";
import { powerName } from "../model/power.ts";
import { isAlive } from "../model/state.ts";
import type { Checking } from "./validator-context.ts";

export function checkLetterOrder(v: Checking, order: Order): string | null | undefined {
  const { S, Map, power } = v;
  switch (order.type) {
    case "letter": {
      const name = Map.exists(order.province) ? Map.get(order.province).name : order.province;
      const h = S.lettersHeld.find((x) => x.heldBy === power && x.province === order.province);
      if (h === undefined) return `you hold no offer of the people of ${name}`;
      if (v.taxesSet.has(`letter:${order.province}`)) return `you had already decided what to do with the offer of ${name}'s people this season`;
      // To its claimant, or to the land's king as the court knows him.
      if (order.to !== h.claimant && order.to !== v.knownOwner(order.province)) return `the offer of ${name}'s people can go only to ${powerName(h.claimant)}, to whom they wrote, or to the king of their land`;
      if (order.to === power) return `you hold the offer already`;
      if (!isAlive(S, order.to) || v.heardFallen(order.to)) return `${powerName(order.to)} has fallen`;
      if (order.fate === "Sell" && order.price < 1) return `a price for the offer must be at least 1 shekel`;
      v.taxesSet.add(`letter:${order.province}`);
      return null;
    }
    case "buyLetter": {
      const name = Map.exists(order.province) ? Map.get(order.province).name : order.province;
      const h = S.lettersHeld.find((x) => x.askedOf === power && x.province === order.province && x.askKnown !== null && x.askKnown <= S.turn);
      if (h === undefined) return `no court has offered you the word of ${name}'s people`;
      if (v.taxesSet.has(`buyLetter:${order.province}`)) return `you had already bought the offer of ${name}'s people this season`;
      v.taxesSet.add(`buyLetter:${order.province}`);
      return v.spend(h.price);
    }
    default:
      return undefined;
  }
}
