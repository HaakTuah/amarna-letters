/**
 * A script king and the roads (build order item 11b): it hunts the bands that rob its land with armies it can spare, since
 * an army standing where a band works falls on it and halves what it takes; and it buys news of the courts it fears or
 * fights or does not trust from the people at its court who sell it ("Characters as sellers of news"), fresh and cheap enough to be worth it.
 */
import { buyNews, cmpStr, huntBands as huntBandsOrder, sortBy, move, type Order, type Power, type SeatView } from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import type { MilitaryPlan } from "./tactics.ts";

/** Script kings hunt bands and buy news (`--no-outlaw-play`), or half of them leave it alone (`--outlaw-play-half`). */
export const OutlawPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The smallest band worth sending an army after, and the freshest news worth buying, in seasons (first guesses of the bots). */
const HuntMen = 40;
const NewsAge = 4;

/**
 * An army holding in its own land with no foreign troops beside it marches on a band working in a province of its own
 * next door, where nobody else of ours stands or goes.
 */
export function huntBands(b: Board, plan: MilitaryPlan): void {
  if (!OutlawPlay.on(b.me)) return;
  const bands = b.v.bands.filter((x) => x.men >= HuntMen && b.isMine(x.province));
  if (bands.length === 0) return;
  const target = new Set(bands.map((x) => x.province));
  for (const u of sortBy([...b.mine], [(u) => u.province, cmpStr])) {
    if (u.kind !== "Army" || !b.isMine(u.province)) continue;
    const o = plan.orders.tryGet(u.province);
    if (o !== undefined && o.type !== "hold") continue;
    // Already standing on one: it falls on it where it stands.
    if (target.has(u.province)) continue;
    const near = Board.Map.neighbors(u.province);
    if (near.some((n) => { const x = b.unitAt.tryGet(n); return x !== undefined && x.power !== b.me; })) continue;
    const to = near.find((n) => target.has(n) && !b.unitAt.has(n) && !plan.destinations.has(n)) ?? null;
    if (to === null) continue;
    plan.orders.set(u.province, move(u.province, to));
    plan.role.set(u.province, "hunt");
    plan.destinations.add(to);
    target.delete(to);
  }
}

/**
 * Haakon's answers to item 11b: an army falls on a band only on its king's order. A script king that hunts gives the
 * standing order once a band worth hunting works in its land, and takes it back when none is left.
 */
export function huntOrders(b: Board, orders: Order[]): void {
  if (!OutlawPlay.on(b.me)) return;
  const want = b.v.bands.some((x) => x.men >= HuntMen && b.isMine(x.province));
  if (want !== b.v.huntBands) orders.push(huntBandsOrder(want));
}

/** At most one purchase a season: the freshest news of a foe or the court it means to fight, if the treasury can spare it. */
export function buyNewsOrders(v: SeatView, brain: Brain, gold: number, orders: Order[]): number {
  if (!OutlawPlay.on(v.power)) return 0;
  // Item 11b+ (the script players' news did not pay): only news of the court it fights or that is hostile to it, which
  // its plans read, not of every court it does not trust.
  const wanted = (p: Power): boolean => p === brain.warTarget || brain.rel.tryGet(p)?.hostile === true;
  const offers = [...v.court].flatMap((c) => c.news.map((n) => ({ c, n }))).filter(({ n }) => v.turn - n.turn <= NewsAge && wanted(n.court as Power) && n.price <= Math.max(10, Math.floor(gold / 50)));
  const best = sortBy(offers, [({ n }) => n.turn, (a: number, b: number) => b - a], [({ n }) => n.price, (a: number, b: number) => a - b], [({ c }) => c.id, cmpStr])[0];
  if (best === undefined) return 0;
  orders.push(buyNews(best.c.id, best.n.court as Power));
  return best.n.price;
}
