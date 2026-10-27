/**
 * The economy in a king's view, compact (build order item 9+a, "Building it": "his view summarizes stores, shortages and
 * prices, never every province's goods"): his totals, the provinces with grain to spare, the shortages, the dearest and
 * cheapest of his markets, his troops' food, his caravans, and what the free cities ask.
 */
import { cmpNum, cmpStr, desc, priceForTen, sortBy, sum, type SeatView } from "@amarna/engine";
import { joinS as join } from "./text.ts";

export function economyLines(v: SeatView): string[] {
  const lines: string[] = [];
  const ps = v.provinces;
  if (ps.length > 0) {
    lines.push(
      `YOUR PROVINCES (grain in measures; prices in shekels for ten measures): stores ${sum(ps, (x) => x.stores)} of ${sum(ps, (x) => x.capacity)} room; the tax brings in ${sum(ps, (x) => x.tax)} a season; your towns need ${sum(ps, (x) => x.need)} a season; your markets hold ${sum(ps, (x) => x.stock)} and your people's purses ${sum(ps, (x) => x.purse)} shekels.`,
    );
    const spare = sortBy(ps.filter((x) => x.stores >= 20), [(x) => x.stores, desc(cmpNum)]).slice(0, 8);
    if (spare.length > 0) lines.push(`- Grain in store: ${join(", ", spare.map((x) => `${x.province} ${x.stores}/${x.capacity}${x.stores + x.tax > x.capacity ? " (full: the next tax will not fit)" : ""}`))}.`);
    const short = ps.filter((x) => x.stock < x.need);
    if (short.length > 0) lines.push(`- Towns short of grain (market stock under a season's need): ${join(", ", short.map((x) => `${x.province} ${x.stock} of ${x.need}`))}.`);
    const priced = sortBy(ps, [(x) => x.price, desc(cmpNum)]);
    const dear = priced.slice(0, 3).map((x) => `${x.province} ${priceForTen(x.price)} (purse ${x.purse})`);
    const cheap = priced.slice(-3).reverse().map((x) => `${x.province} ${priceForTen(x.price)} (purse ${x.purse})`);
    lines.push(`- Dearest markets: ${join(", ", dear)}; cheapest: ${join(", ", cheap)}.`);
    const dry = ps.filter((x) => x.purse < 10 && x.need >= 4);
    if (dry.length > 0) lines.push(`- Purses nearly empty, their markets buying little: ${join(", ", dry.map((x) => x.province))}.`);
  }
  const mine = v.units.filter((u) => u.power === v.power);
  if (mine.length > 0) {
    const kind = (k: string): string => (k === "Army" ? "army" : "fleet");
    lines.push(`- Your troops' grain: ${join(", ", mine.map((u) => `${kind(u.kind)} ${u.province} ${u.food}/${u.carried}${u.hungry > 0 ? `, hungry ${u.hungry}` : ""}${u.unpaid > 0 ? `, unpaid ${u.unpaid}` : ""}`))}.`);
  }
  if (v.caravans.length > 0)
    lines.push(`- Your caravans: ${join(", ", v.caravans.map((c) => `${c.grain} measures ${c.returning ? `coming home to ${c.from}` : `from ${c.from} to ${c.to}`}, at ${c.at}`))}.`);
  if (v.cityPrices.size > 0)
    lines.push(`FREE CITIES' PRICES (what each adds to its buyer's strength, in shekels): ${join(", ", sortBy([...v.cityPrices.entries()], [([k]: [string, number]) => k, cmpStr]).map(([k, p]) => `${k} ${p}`))}.`);
  return lines;
}
