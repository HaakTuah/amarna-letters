/**
 * A script king and how cities become free (build order item 17). He weighs buying his armies' food where they stand by
 * leave against taking it: in a friend's land he buys whenever his treasury bears it, since taking there is a grievance
 * remembered against him; in his own land he buys where the people are restless (his governor says so) or the land is not
 * his homeland (a conquest still settling), and in quiet homeland only when gold is plentiful, taking otherwise. He sends
 * each army he buys for gold for three seasons' food, the price as his court last heard it, and sends more only when what
 * it carries and what is on the road runs low, and only where the market there, as his court last saw it, holds grain
 * to buy once its town has eaten (the item's measures found gold sent where markets were empty sitting idle in the packs).
 * He listens to his governors: a province they call restless or near revolt pays less tax. And a cunning king sends the
 * spy he posts in a foe's conquered land with gold to stir its people ("outside help").
 */
import { cmpStr, sortBy, sum, supply, tax, unitFood, type Order, type UnitView } from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";

/** Script kings buy their armies' food, heed their governors and stir foes' land (`--no-freedom-play`, `--freedom-play-half`). */
export const FreedomPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** How many seasons of food a script king sends gold for at a time (a first guess of the script's own). */
const FoodSeasons = 3;

/** Gold this many times what an army's food costs is plenty, enough to buy even where taking costs little (the script's own). */
const PlentyTimes = 6;

/** Whether our army in `province` stands there by leave: our own land, or land whose holder granted us passage or basing. */
export function byLeave(b: Board, province: string): boolean {
  const holder = b.ownerOf(province);
  if (holder === null || Board.Map.get(province).isSea) return false;
  if (holder === b.me) return true;
  const turn = b.v.turn;
  return b.v.grants.some((g) => g.grantee === b.me && g.grantor === holder && (g.province === null || g.province === province) && (g.untilTurn === null || g.untilTurn >= turn));
}

/**
 * Word to our armies on their food: buy where they stand by leave and their depot will not feed them, with gold for a few
 * seasons, as far as `gold` (what the treasury can spare) goes. Returns the gold sent.
 */
export function supplyOrders(b: Board, _brain: Brain, orders: Order[], gold: number): number {
  if (!FreedomPlay.on(b.me)) return 0;
  const v = b.v;
  const stores = new Map(v.provinces.map((x) => [x.province, x] as const));
  let sent = 0;
  const uneasy = new Set(restless(b));
  for (const u of sortBy(
    b.mine.filter((u: UnitView) => u.kind === "Army" && u.men > 0),
    [(u: UnitView) => u.province, cmpStr],
  )) {
    if (!byLeave(b, u.province)) continue;
    const need = unitFood(u);
    const own = stores.get(u.province);
    // Its depot feeds it: our stores there will carry it.
    if (own !== undefined && own.stores >= 2 * need) continue;
    // Gold buys only what is there: the market must hold grain for the army once its town has eaten, as last seen. Gold
    // sent where there is nothing to buy only sits in the men's packs, for a greedy commander to keep.
    const seen = own ?? v.markets.tryGet(u.province) ?? null;
    if (seen === null || seen.stock - seen.need < need) continue;
    const price = seen.price;
    const want = Math.ceil((FoodSeasons * need * price * 11) / 1000);
    const have = u.chest + sum(v.foodSent.filter((f) => f.province === u.province), (f) => f.gold);
    const short = have * 3 < want ? want - have : 0;
    // Taking in quiet homeland costs little; elsewhere it costs unrest that may lose the land, or a friend's goodwill.
    const cheap = b.isMine(u.province) && Board.Map.isHome(b.me, u.province) && !uneasy.has(u.province);
    if (cheap && gold - sent < PlentyTimes * want) continue;
    if (short > 0 && short <= gold - sent) {
      orders.push(supply(u.province, true, short));
      sent += short;
    } else if (!u.buy && have > 0) orders.push(supply(u.province, true, 0));
  }
  return sent;
}

/** The provinces our governors call restless or near revolt, from their latest letters this season. */
export function restless(b: Board): string[] {
  const out: string[] = [];
  for (const m of b.v.inbox) {
    if (m.title !== "Your governor writes") continue;
    const x = /governor of (.+?), writes that its people are (restless|near revolt)/.exec(m.body);
    const p = x !== null ? Board.Map.provinces.find((q) => q.name === x[1]) : undefined;
    if (p !== undefined) out.push(p.id);
  }
  return out;
}

/** A restless province's tax comes down by this many points below what its farmers could bear (a first guess). */
const ReliefPoints = 15;

/** Tax relief where our governors write that the people are restless: the tax order for it lowered, or one added. */
export function reliefOrders(b: Board, orders: Order[]): void {
  if (!FreedomPlay.on(b.me)) return;
  const rates = new Map(b.v.provinces.map((x) => [x.province, x.taxRate] as const));
  for (const id of restless(b)) {
    if (b.ownerOf(id) !== b.me) continue;
    const i = orders.findIndex((o) => o.type === "tax" && o.province === id);
    const now = i >= 0 ? (orders[i] as { percent: number }).percent : (rates.get(id) ?? 33);
    const lower = Math.max(0, now - ReliefPoints);
    if (i >= 0) orders.splice(i, 1, tax(lower, id));
    else orders.push(tax(lower, id));
  }
}

/** The gold a cunning king's watching spy takes to stir a foe's land that is not the foe's own homeland (a first guess). */
export function stirGold(b: Board, foe: string, spot: string, spare: number, cunning: number): number {
  if (!FreedomPlay.on(b.me) || cunning <= 0.4 || Board.Map.isHome(foe, spot)) return 0;
  const g = Math.min(200, Math.floor(spare / 3));
  return g >= 50 ? g : 0;
}
