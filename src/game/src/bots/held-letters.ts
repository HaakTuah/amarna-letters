/**
 * What a script king does with a province's offer it caught on the road (#592, `model/held-letters.ts` in the engine):
 * a favour to a friend, gold from anyone else. To a claimant it counts a friend it sends the offer on, for nothing; else
 * it asks the land's king a price, who would pay to read his people's mind, or, where that is itself, the claimant. Kept
 * while an asking stands. Offered one, a king buys it if the gold is to spare. Under `--no-talk-play` and
 * `--talk-play-half` it keeps every offer and buys none, to measure what the trade is worth.
 */
import { buyLetter, letter, type Order } from "@amarna/engine";
import type { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import { TalkPlay } from "./talk.ts";

/** The price a script king asks for a caught offer, and how many times it a buyer must have in gold (first guesses). */
export const LetterPrice = 60;
export const LetterSpare = 3;

export function letterOrders(b: Board, brain: Brain, orders: Order[]): void {
  if (!TalkPlay.on(b.me)) return;
  const v = b.v;
  for (const h of v.lettersHeld) {
    if (h.askedOf !== null) continue;
    if (brain.isFriend(h.claimant)) {
      orders.push(letter(h.province, "Send", h.claimant, 0, h.written));
      continue;
    }
    const holder = b.ownerOf(h.province);
    orders.push(letter(h.province, "Sell", holder !== null && holder !== b.me ? holder : h.claimant, LetterPrice, h.written));
  }
  let gold = v.gold;
  for (const h of v.lettersOffered) {
    if (gold < h.price * LetterSpare) continue;
    orders.push(buyLetter(h.province, h.written));
    gold -= h.price;
  }
}
