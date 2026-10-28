/**
 * A script king's credit (build order item 11a, "Lending to kings", "Debts are facts; repayment is a choice", "Gold is a
 * lifeline"): it borrows from a lender at its court when its treasury cannot carry two seasons of its costs, at a rate it
 * judges worth the troops and walls the gold keeps standing; and it repays what it owes when the holder of the tablet
 * stands at its court and the treasury can spare it, because a king who keeps his word borrows cheaply the next time and
 * one who does not finds no lender. Borrowed gold counts as its own until it repays, so repaying costs score now for
 * credit later: a king in its last straits keeps the gold.
 */
import { borrow, payCarriers, payFee, repay, seize, sellDebt, type CharacterView, type Order, type SeatView } from "@amarna/engine";
import type { Personality } from "./personality.ts";

/** Script kings borrow and repay (`--no-money-play`), or half of them leave it alone (`--money-play-half`). */
export const MoneyPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The highest rate a season, in percent, a king pays to keep its troops paid: more for a greedy king's caution, less for a careful one. */
const highestRate = (p: Personality): number => 4 + 4 * p.greed - 2 * p.caution;

/** The lenders at its court and what each offers, cheapest first. */
function lenders(v: SeatView): CharacterView[] {
  const seen = new Map<string, CharacterView>();
  for (const c of [...v.court, ...v.known]) if (c.lends !== null && c.lends.amount > 0) seen.set(c.id, c);
  return [...seen.values()].sort((a, b) => a.lends!.perHundred / a.lends!.seasons - b.lends!.perHundred / b.lends!.seasons || a.id.localeCompare(b.id));
}

/**
 * The season's credit orders. `gold`: what the treasury can count on now; `costs`: its costs a season. Returns the gold
 * borrowed less the gold repaid, which the treasury plan counts.
 */
export function creditOrders(v: SeatView, p: Personality, gold: number, costs: number, losing: boolean, orders: Order[]): number {
  if (!MoneyPlay.on(v.power)) return 0;
  let net = 0;
  // Haakon's answers to item 11a: carriers of its people's letters are paid on delivery only by its own standing order.
  if (!v.payCarriers) orders.push(payCarriers(true));
  // A tablet of someone else's debt in its archive (from a captive, the dead or a fall) is sold for half what is left to a
  // lender at its court, who has the gold; a borrower at its court is left to repay it there.
  const buyers = lenders(v);
  for (const d of v.debtsHeld) {
    if (d.here) continue;
    const price = Math.trunc(d.left / 2);
    const buyer = buyers.find((c) => c.lends!.amount >= price && c.id !== d.holderId);
    if (buyer === undefined || price < 10) continue;
    orders.push(sellDebt(d.id, buyer.id, price));
    net += price;
    break;
  }
  // A fee it let fall due unpaid, to one standing at its court, is paid as soon as two seasons of costs stay in hand.
  for (const c of [...v.court, ...v.known]) {
    if (c.owed === null || c.where !== "at your court" || gold + net - c.owed < 2 * costs) continue;
    if (orders.some((o) => o.type === "payFee" && o.character === c.id)) continue;
    orders.push(payFee(c.id, true));
    net -= c.owed;
  }
  // Repay what is due, to holders standing here, while two seasons of costs stay in hand; a king about to fall keeps it.
  for (const d of [...v.debts].sort((a, b) => a.dueTurn - b.dueTurn || a.id.localeCompare(b.id))) {
    if (!d.here || losing || d.dueTurn > v.turn + 1) continue;
    if (gold + net - d.left < 2 * costs) continue;
    orders.push(repay(d.id, d.left));
    net -= d.left;
  }
  // Borrow when two seasons of costs are not in hand, from the cheapest lender whose rate it will pay, enough for three.
  const short = 2 * costs - (gold + net);
  let borrowed = false;
  if (short > 0 && !losing) {
    for (const c of lenders(v)) {
      const l = c.lends!;
      const rate = l.perHundred / Math.max(1, l.seasons);
      if (rate > highestRate(p)) continue;
      const amount = Math.min(l.amount, Math.max(short, costs * 3));
      if (amount < 10) continue;
      orders.push(borrow(c.id, amount, amount + Math.ceil((amount * l.perHundred) / 100), l.seasons));
      net += amount;
      borrowed = true;
      break;
    }
  }
  // Haakon's answers to item 11a, a hard act at its real cost: a king who cannot pay a season of his costs, and finds no
  // lender, seizes the largest hoard kept in his city, if a greedy king or one about to fall; people hear of it.
  if (!borrowed && costs > gold + net && (losing || p.greed > 0.6)) {
    const hoard = [...v.known].filter((c) => (c.hoardHere ?? 0) >= 50).sort((a, b) => b.hoardHere! - a.hoardHere! || a.id.localeCompare(b.id))[0];
    if (hoard !== undefined) {
      orders.push(seize(hoard.id));
      net += hoard.hoardHere!;
    }
  }
  return net;
}
