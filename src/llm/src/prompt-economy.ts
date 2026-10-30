/**
 * The economy in a king's view, compact (build order item 9+a, "Building it": "his view summarizes stores, shortages and
 * prices, never every province's goods"): his totals, the provinces with grain to spare, the shortages, the dearest and
 * cheapest of his markets, his troops' food, his caravans and ships, the foreign markets he knows of and the tolls that
 * bear on him (item 9+b).
 */
import { PoliceMenPerLevel, WorldMap, cmpNum, cmpStr, countryNeed, desc, groupBy, menOf, priceForTen, reckonedOf, sortBy, strengthWords, sum, type SeatView } from "@amarna/engine";
import { joinS as join } from "./text.ts";

/**
 * WORKS (item 15): what stands in each province of the king's, what he ordered kept and how, projects under way and what a
 * season of it all costs, one line a province.
 */
export function worksLines(v: SeatView): string[] {
  if (v.works.length === 0) return [];
  const level = (w: SeatView["works"][number]): string => (w.kind === "Policing" ? `${w.level * PoliceMenPerLevel} men` : `${w.level}`);
  const word = (k: string): string => (k === "Stations" ? "stations" : k === "Policing" ? "police" : k === "Water" ? "water works" : k.toLowerCase());
  const lines = [`WORKS (what stands in your provinces; order build or build_corvee to change what you keep: BUILDING AND POLICING): in gold ${sum(v.works, (w) => w.upkeepGold + w.buildGold)} a season, by corvée ${sum(v.works, (w) => w.upkeepMen + w.buildMen)} men.`];
  for (const [prov, ws] of groupBy(v.works, (w) => w.province)) {
    const parts = ws.map((w) => {
      const keep = w.keep !== w.level ? (w.keep > w.level ? `, building to ${w.kind === "Policing" ? `${w.keep * PoliceMenPerLevel} men` : w.keep} (${w.progress} of ${w.seasons} seasons)` : `, kept at ${w.kind === "Policing" ? `${w.keep * PoliceMenPerLevel} men` : w.keep}, the rest decaying`) : "";
      return `${word(w.kind)} ${level(w)}${keep}${w.labour ? "" : " (gold)"}${w.neglect > 0 ? `, unpaid ${w.neglect} season(s)` : ""}`;
    });
    lines.push(`- ${prov}: ${parts.join("; ")}.`);
  }
  return lines;
}

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
  lines.push(...peopleLines(v));
  const mine = v.units.filter((u) => u.power === v.power);
  if (mine.length > 0) {
    const kind = (k: string): string => (k === "Army" ? "army" : "fleet");
    lines.push(`- Your troops' grain: ${join(", ", mine.map((u) => `${kind(u.kind)} ${u.province} ${u.food}/${u.carried}${u.hungry > 0 ? `, hungry ${u.hungry}` : ""}${u.unpaid > 0 ? `, unpaid ${u.unpaid}` : ""}${u.kind === "Army" ? `, ${u.buy ? "buys" : "takes"} its food${u.chest > 0 ? ` (carries ${u.chest} shekels for it)` : ""}` : ""}`))}.`);
  }
  // Item 17: words on the armies' food, with gold, still on the road.
  if (v.foodSent.length > 0) lines.push(`- Words on your armies' food on the road: ${join(", ", v.foodSent.map((f) => `to ${f.province}, ${f.buy ? "buy" : "take"}${f.gold > 0 ? `, ${f.gold} shekels` : ""}, arriving turn ${f.at}`))}.`);
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
  return lines;
}

/** A count of people in thousands, as a king reads it. */
const k = (n: number): string => `${Math.round(n / 1000)}k`;

/**
 * The people at home (item 10+a), compact: totals, the provinces that went hungry, the rates set, the land well below
 * what it carries, where an army can be raised, the yields that changed and the resistance the court's troops would meet.
 */
export function peopleLines(v: SeatView): string[] {
  const lines: string[] = [];
  const ps = v.provinces;
  if (ps.length > 0) {
    lines.push(
      `YOUR PEOPLE: settled ${k(sum(ps, (x) => x.settled))} (men of fighting age ${k(sum(ps, (x) => x.men))}), loose ${k(sum(ps, (x) => x.loose))}${v.walking > 0 ? `; ${k(v.walking)} discharged men walking home` : ""}. The last harvests, a season's share: ${sum(ps, (x) => x.harvest)} measures; the farmers' granaries hold ${sum(ps, (x) => x.granary)}, the crops in the fields ${sum(ps, (x) => x.crop)}.`,
    );
    // Item 11a+: each land reaps in its own season.
    const reaping = groupBy(sortBy(ps, [(x) => x.reapsIn, cmpNum], [(x) => x.province, cmpStr]), (x) => x.reapsIn);
    lines.push(`- Reaped ${join("; ", reaping.map(([n, g]) => `${n === 0 ? "this season" : n === 1 ? "next season" : `in ${n} seasons`}: ${join(", ", g.map((x) => x.province))}`))}.`);
    // What the farmers eat and pay until the next harvest feeds them, against what their granaries hold.
    const lasts = (x: (typeof ps)[number]): number =>
      (countryNeed(WorldMap.default.get(x.province), x.settled, reckonedOf(WorldMap.default, x.province).settled) + Math.floor((x.harvest * x.taxRate) / 100)) * (x.reapsIn === 0 ? 2 : x.reapsIn - 1);
    const thin = ps.filter((x) => x.granary < lasts(x));
    if (thin.length > 0) lines.push(`- Granaries that will not feed the farmers and pay the tax until the next harvest (lower the tax, or feed them grain): ${join(", ", thin.map((x) => `${x.province} ${x.granary}`))}.`);
    const hungry = ps.filter((x) => x.fed < 1000);
    if (hungry.length > 0) lines.push(`- Went hungry last season (share of their food the farmers had): ${join(", ", hungry.map((x) => `${x.province} ${Math.round(x.fed / 10)}%`))}.`);
    lines.push(`- Tax: ${join("; ", groupBy(sortBy(ps, [(x) => x.taxRate, cmpNum], [(x) => x.province, cmpStr]), (x) => x.taxRate).map(([rate, g]) => `${rate}% in ${join(", ", g.map((x) => x.province))}`))}.`);
    // Item 10+b: runaways from other kings' land standing loose in ours, and the besieged cities that put out their mouths.
    const ran = ps.flatMap((x) => [...x.runaways.entries()].filter(([, n]) => n >= 500).map(([q, n]) => `${x.province} ${k(n)} from ${q}`));
    if (ran.length > 0) lines.push(`- Runaways among your loose men (welcome_loose to settle them, return_runaways to send them back): ${join(", ", ran)}.`);
    // Item 11b: the bands it sees, in its land and its sight; an army of its own standing where one works falls on it.
    if (v.bands.length > 0) lines.push(`- Bands you see (an army of yours standing where one works in your land falls on it): ${join(", ", v.bands.map((b) => `${b.chief}'s ${b.men} men in ${b.province}${b.ship ? ", with a ship" : ""}`))}.`);
    const out = ps.filter((x) => x.expelled > 0);
    if (out.length > 0) lines.push(`- Mouths put out of (in a hundred of the town): ${join(", ", out.map((x) => `${x.province} ${x.expelled}`))}.`);
    const empty = ps.filter((x) => x.room > 0 && x.settled * 10 < x.room * 9);
    if (empty.length > 0) lines.push(`- Land with room for more settled (settled of what it carries): ${join(", ", empty.map((x) => `${x.province} ${k(x.settled)} of ${k(x.room)}`))}.`);
    const home = new Set(WorldMap.default.homeOf(v.power).map((p) => p.id));
    const levy = ps.filter((x) => home.has(x.province));
    if (levy.length > 0)
      lines.push(`- Men of fighting age in your homeland (an army takes ${k(menOf("Army"))}, a fleet ${k(menOf("Fleet"))}): ${join(", ", levy.map((x) => `${x.province} ${k(x.men)}`))}.`);
  }
  const changed = sortBy([...v.yields.entries()].filter(([id, y]) => y !== WorldMap.default.get(id).yield), [([id]: [string, number]) => id, cmpStr]);
  if (changed.length > 0) lines.push(`YIELDS as their people bring them in now, where they differ from the map's (yours and those in sight): ${join(", ", changed.map(([id, y]) => `${id} ${y} (map ${WorldMap.default.get(id).yield})`))}.`);
  if (v.resistance.size > 0)
    lines.push(
      `RESISTANCE your troops would meet from the people of land in sight, in units (in open land they add to any troop's hold, and a move must be stronger; on walls, the city's men before the walls multiply them): ${join("; ", groupBy(sortBy([...v.resistance.entries()], [([id]: [string, number]) => id, cmpStr]), ([, r]) => strengthWords(r)).map(([r, g]) => `${r}: ${join(", ", g.map(([id]) => `${id}${v.walls.getOrDefault(id, 0) > 0 ? " (walls)" : ""}`))}`))}.`,
    );
  return lines;
}
