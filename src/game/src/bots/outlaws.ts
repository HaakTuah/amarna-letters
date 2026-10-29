/**
 * A script king and the roads (build order item 11b): it hunts the bands that rob its land, by the standing order while a
 * large band works there and with armies it can spare; and it buys news of the courts it fears or
 * fights or does not trust from the people at its court who sell it ("Characters as sellers of news"), fresh and cheap enough to be worth it.
 */
import { BandData, buyNews, cmpStr, hunt, huntBands as huntBandsOrder, sortBy, sum, move, type BandSeen, type Order, type Power, type SeatView } from "@amarna/engine";
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
/** What the bots know of a hunt: the rulebook's share of a band's men an army kills, and the least men a band keeps. */
const BandHunt = { loss: BandData.huntLoss, least: BandData.least };

/**
 * An army holding in its own land with no foreign troops beside it marches on a band working in a province of its own
 * next door, where nobody else of ours stands or goes, if a hunt there would pay (`worthHunting`, for an army of our
 * armies' mean size).
 */
export function huntBands(b: Board, plan: MilitaryPlan): void {
  if (!OutlawPlay.on(b.me)) return;
  const bands = b.v.bands.filter((x) => x.men >= HuntMen && b.isMine(x.province) && worthHunting(b, x, sum(b.mine.filter((u) => u.kind === "Army"), (u) => u.men) / Math.max(1, b.mine.filter((u) => u.kind === "Army").length)));
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
 * Haakon's answers to item 11b: an army falls on a band only on its king's order. Item 11b+ found that a hunted band fled
 * to a province of ours without troops and robbed it at the full rate, so a script king orders a hunt (`hunt`, for the
 * next season) only where it ends the band or drives it out of our land: an army of ours stands with it, and either the
 * band is small enough to break or no province of ours without troops lies next door for it to flee to. Item 11b++
 * measured the standing hunt over the whole land, which chiefs hear of and keep out of: it lost (0.88 growth to 0.92, 19
 * wins to 31 in 50 games), since armies then fall on every band they stand with, at a cost in men each time, and drive
 * off more than they break. So the script king gives no standing hunt, and lifts one it finds.
 */
export function huntOrders(b: Board, orders: Order[]): void {
  if (b.v.huntBands) orders.push(huntBandsOrder(false));
  if (!OutlawPlay.on(b.me)) return;
  for (const x of sortBy([...b.v.bands], [(x) => x.province, cmpStr])) {
    if (!b.isMine(x.province)) continue;
    const army = b.mine.filter((u) => u.kind === "Army" && u.province === x.province).reduce((a, u) => a + u.men, 0);
    if (army > 0 && worthHunting(b, x, army)) orders.push(hunt(x.province));
  }
}

/** A hunt by an army of `army` men ends the band, or drives it out of our land: it has no province of ours to flee to. */
function worthHunting(b: Board, x: BandSeen, army: number): boolean {
  const lost = Math.min(x.men, Math.floor((Math.floor((x.men * BandHunt.loss) / 100) * army) / (army + x.men)) + 1);
  if (x.men - lost < BandHunt.least) return true;
  return !Board.Map.movesFrom("Army", x.province).some((n) => n !== x.province && !Board.Map.get(n).isSea && b.isMine(n) && !b.unitAt.has(n));
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
