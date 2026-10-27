/**
 * The economy in a king's view, compact (build order item 9+a, "Building it": "his view summarizes stores, shortages and
 * prices, never every province's goods"): his totals, the provinces with grain to spare, the shortages, the dearest and
 * cheapest of his markets, his troops' food, his caravans and ships, the foreign markets he knows of and the tolls that
 * bear on him (item 9+b), and what the free cities ask.
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
    lines.push(
      `- Your caravans and ships: ${join(
        ", ",
        v.caravans.map(
          (c) =>
            `${c.ship ? "ship" : c.sneak ? "smugglers" : "caravan"} with ${c.grain} measures${c.gold > 0 ? ` and ${c.gold} shekels` : ""} ${c.returning ? `coming home to ${c.from}` : `from ${c.from} ${c.trade ? "to trade at" : "to"} ${c.to}`}, at ${c.at}`,
        ),
      )}.`,
    );
  if (v.markets.size > 0) {
    const known = sortBy([...v.markets.entries()], [([, m]: [string, { price: number }]) => m.price, desc(cmpNum)], [([k]: [string, unknown]) => k, cmpStr]);
    const line = (k: string, m: { price: number; purse: number; turn: number }): string => `${k} ${priceForTen(m.price)} (purse ${m.purse}${m.turn < v.turn - 1 ? `, seen in season ${m.turn}` : ""})`;
    lines.push(
      `FOREIGN MARKETS you know of (price for ten measures; a market pays for grain only from its purse): dearest ${join(", ", known.slice(0, 4).map(([k, m]) => line(k, m)))}; cheapest ${join(", ", known.slice(-4).reverse().map(([k, m]) => line(k, m)))}.`,
    );
  }
  const own = v.tolls.filter((t) => t.holder === v.power);
  const onYou = v.tolls.filter((t) => t.holder !== v.power && t.percent > 0);
  if (own.length > 0) lines.push(`- Your tolls: ${join(", ", own.map((t) => `${t.percent}% on ${t.partner ?? "everyone"}${t.province !== null ? ` at ${t.province}` : ""}`))}.`);
  if (onYou.length > 0)
    lines.push(`- Tolls on your goods abroad: ${join(", ", onYou.map((t) => `${t.holder} ${t.percent}%${t.partner === null ? "" : " on yours alone"}${t.province !== null ? ` at ${t.province}` : ""}`))}.`);
  if (v.cityPrices.size > 0)
    lines.push(`FREE CITIES' PRICES (what each adds to its buyer's strength, in shekels): ${join(", ", sortBy([...v.cityPrices.entries()], [([k]: [string, number]) => k, cmpStr]).map(([k, p]) => `${k} ${p}`))}.`);
  return lines;
}
