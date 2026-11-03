/**
 * The economy in a king's view, compact (build order item 9+a, "Building it": "his view summarizes stores, shortages and
 * prices, never every province's goods"): his totals, the provinces with grain to spare, the shortages, the dearest and
 * cheapest of his markets, his troops' food, his caravans and ships, the foreign markets he knows of and the tolls that
 * bear on him (item 9+b).
 */
import { PoliceMenPerLevel, WorldMap, cmpNum, cmpStr, countFigures, countryNeed, desc, toFigures, groupBy, menOf, priceForTen, reckonedOf, sortBy, strengthWords, sum, type SeatView } from "@amarna/engine";
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
      return `${word(w.kind)} ${level(w)}${keep}${w.labour ? (w.share !== null ? ` (corvée: ${w.share}% of the men at home)` : "") : " (gold)"}${w.neglect > 0 ? `, unpaid ${w.neglect} season(s)` : ""}`;
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
      `YOUR PROVINCES (grain in measures; prices in shekels for ten measures): stores ${stewards(sum(ps, (x) => x.stores))} of ${sum(ps, (x) => x.capacity)} room; the tax brings in ${stewards(sum(ps, (x) => x.tax))} a season; your towns need ${sum(ps, (x) => x.need)} a season; your markets hold ${sum(ps, (x) => x.stock)} and your people's purses ${sum(ps, (x) => x.purse)} shekels.`,
    );
    // Bug #540: those beyond its couriers' season, as their officials' last report has them.
    const reported = ps.filter((x) => x.reported !== null);
    if (reported.length > 0) lines.push(`- Known by their last report, beyond your couriers' season: ${join(", ", reported.map((x) => `${x.province} as reported in turn ${x.reported}`))}.`);
    // #587: the gold kept far off, and what is owed there, as last reported ("Gold far off" in your rules).
    const coffers = ps.filter((x) => x.coffer > 0 || x.owed > 0);
    if (coffers.length > 0) lines.push(`- Coffers of your far provinces, as last reported: ${join(", ", coffers.map((x) => `${x.province} ${x.coffer} shekels${x.owed > 0 ? `, owing ${x.owed} (no credit there until paid)` : ""}`))}.`);
    const spare = sortBy(ps.filter((x) => x.stores >= 20), [(x) => x.stores, desc(cmpNum)]).slice(0, 8);
    if (spare.length > 0) lines.push(`- Grain in store: ${join(", ", spare.map((x) => `${x.province} ${stewards(x.stores)} of ${x.capacity}${x.stores + x.tax > x.capacity ? " (full: the next tax will not fit)" : ""}`))}.`);
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
  if (v.goldSent.length > 0) lines.push(`- Gold on the road with your couriers to your far coffers: ${join(", ", v.goldSent.map((g) => `${g.gold} shekels to ${g.province}, arriving turn ${g.at}`))}.`);
  if (v.foodSent.length > 0) lines.push(`- Words on your armies' food on the road: ${join(", ", v.foodSent.map((f) => `to ${f.province}, ${f.buy ? "buy" : "take"}${f.gold > 0 ? `, ${f.gold} shekels` : ""}, arriving turn ${f.at}`))}.`);
  if (v.caravans.length > 0)
    lines.push(
      `- Your caravans and ships: ${join(
        ", ",
        v.caravans.map(
          (c) =>
            `${c.ship ? "ship" : c.sneak ? "smugglers" : "caravan"} with ${c.grain} measures${c.gold > 0 ? ` and ${c.gold} shekels` : ""} ${c.returning ? `coming home to ${c.from}` : `from ${c.from} ${c.trade ? "to trade at" : "to"} ${c.to}`}, at ${c.at}${c.reported !== null ? ` as reported in turn ${c.reported}` : ""}`,
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
 * A king's own count in words, as his scribes knew it (item 17++, "Counts as the scribes knew them"): two figures while
 * it is under a year old ("about 650,000"), one once older ("some 600,000"); a sum over several counts, at the figures of
 * the oldest of them.
 */
function counts(v: SeatView, xs: readonly { counted: number | null }[], n: number): string {
  const f = Math.min(2, ...xs.map((x) => countFigures(x.counted === null ? null : v.turn - x.counted)));
  return `${f >= 2 ? "about" : "some"} ${toFigures(n, f).toLocaleString("en")}`;
}

/** What his stewards report of his stores and harvests, rounded to two figures ("about 440 measures"). */
const stewards = (n: number): string => `about ${toFigures(n, 2).toLocaleString("en")}`;

/**
 * The people at home (item 10+a), compact: totals, the provinces that went hungry, the rates set, the land well below
 * what it carries, where an army can be raised, the yields that changed and the resistance the court's troops would meet.
 */
export function peopleLines(v: SeatView): string[] {
  const lines: string[] = [];
  const ps = v.provinces;
  const counted = ps.filter((x) => x.counted !== null);
  if (ps.length > 0) {
    lines.push(
      counted.length === 0
        ? `YOUR PEOPLE: your scribes have counted none of your land yet (order a census)${v.walking > 0 ? `; ${k(v.walking)} discharged men walking home` : ""}.`
        : `YOUR PEOPLE, as your scribes last counted them: on the land ${counts(v, counted, sum(counted, (x) => x.settled))} (men of fighting age ${counts(v, counted, sum(counted, (x) => x.men))}), in the towns ${counts(v, counted, sum(counted, (x) => x.town))}, loose ${counts(v, counted, sum(counted, (x) => x.loose))}${v.walking > 0 ? `; ${k(v.walking)} discharged men walking home` : ""}. The last harvests, a season's share: ${counts(v, counted, sum(counted, (x) => x.harvest))} measures; the farmers' granaries held ${counts(v, counted, sum(counted, (x) => x.granary))}, the crops in the fields ${counts(v, counted, sum(counted, (x) => x.crop))}.`,
    );
    // Item 17++: the age of each count, and the land never counted.
    const ages = groupBy(sortBy(ps.filter((x) => x.counted !== null), [(x) => v.turn - x.counted!, cmpNum], [(x) => x.province, cmpStr]), (x) => v.turn - x.counted!);
    lines.push(`- Counted (census: send scribes to count a province afresh): ${join("; ", ages.map(([n, g]) => `${n === 0 ? "this season" : `${n} season${n === 1 ? "" : "s"} ago`}: ${join(", ", g.map((x) => x.province))}`))}${ps.some((x) => x.counted === null) ? `; never counted: ${join(", ", ps.filter((x) => x.counted === null).map((x) => `${x.province} (by a rough guess some ${toFigures(reckonedOf(WorldMap.default, x.province).settled, 1).toLocaleString("en")} on the land)`))}` : ""}${v.counting.length > 0 ? `; scribes out counting: ${join(", ", v.counting)}` : ""}.`);
    // Item 11a+: each land reaps in its own season.
    const reaping = groupBy(sortBy(ps, [(x) => x.reapsIn, cmpNum], [(x) => x.province, cmpStr]), (x) => x.reapsIn);
    lines.push(`- Reaped ${join("; ", reaping.map(([n, g]) => `${n === 0 ? "this season" : n === 1 ? "next season" : `in ${n} seasons`}: ${join(", ", g.map((x) => x.province))}`))}.`);
    // What the farmers eat and pay until the next harvest feeds them, against what their granaries hold.
    const lasts = (x: (typeof ps)[number]): number =>
      (countryNeed(WorldMap.default.get(x.province), x.settled, reckonedOf(WorldMap.default, x.province).settled) + (x.amount ?? Math.floor((x.harvest * x.share) / 100))) * (x.reapsIn === 0 ? 2 : x.reapsIn - 1);
    const thin = ps.filter((x) => x.granary < lasts(x));
    if (thin.length > 0) lines.push(`- Granaries that will not feed the farmers and pay the tax until the next harvest (ask less, or feed them grain): ${join(", ", thin.map((x) => `${x.province} ${x.granary}`))}.`);
    const hungry = ps.filter((x) => x.fed < 1000);
    if (hungry.length > 0) lines.push(`- Went hungry last season (share of their food the farmers had): ${join(", ", hungry.map((x) => `${x.province} ${Math.round(x.fed / 10)}%`))}.`);
    const asked = (x: (typeof ps)[number]): string => (x.amount !== null ? `${x.amount} measures a season` : `${x.share}% of the harvest`);
    lines.push(`- What you ask: ${join("; ", groupBy(sortBy(ps, [asked, cmpStr], [(x) => x.province, cmpStr]), asked).map(([a, g]) => `${a} in ${join(", ", g.map((x) => x.province))}`))}.`);
    // Item 10+b: runaways from other kings' land standing loose in ours, and the besieged cities that put out their mouths.
    const ran = ps.flatMap((x) => [...x.runaways.entries()].filter(([, n]) => n >= 500).map(([q, n]) => `${x.province} ${k(n)} from ${q}`));
    if (ran.length > 0) lines.push(`- Runaways among your loose men (welcome_loose to settle them, return_runaways to send them back): ${join(", ", ran)}.`);
    // Item 11b: the bands it sees, in its land and its sight; an army of its own standing where one works falls on it.
    if (v.bands.length > 0) lines.push(`- Bands you see (an army of yours standing where one works in your land falls on it): ${join(", ", v.bands.map((b) => `${b.chief}'s ${b.men} men in ${b.province}${b.ship ? ", with a ship" : ""}`))}.`);
    const out = ps.filter((x) => x.expelled > 0);
    if (out.length > 0) lines.push(`- Mouths put out of (in a hundred of the town): ${join(", ", out.map((x) => `${x.province} ${x.expelled}`))}.`);
    const empty = ps.filter((x) => x.counted !== null && x.room > 0 && x.settled * 10 < x.room * 9);
    if (empty.length > 0) lines.push(`- Land with room for more settled (settled of what it carries): ${join(", ", empty.map((x) => `${x.province} ${counts(v, [x], x.settled)} of ${k(x.room)}`))}.`);
    const home = new Set(WorldMap.default.homeOf(v.power).map((p) => p.id));
    const levy = ps.filter((x) => home.has(x.province));
    if (levy.length > 0)
      lines.push(`- Men of fighting age in your homeland (an army takes ${k(menOf("Army"))}, a fleet ${k(menOf("Fleet"))}): ${join(", ", levy.map((x) => `${x.province} ${x.counted === null ? "never counted" : counts(v, [x], x.men)}`))}.`);
  }
  const changed = sortBy([...v.yields.entries()].filter(([id, y]) => y !== WorldMap.default.get(id).yield), [([id]: [string, number]) => id, cmpStr]);
  if (changed.length > 0) lines.push(`YIELDS as the last reaping brought them in, a season's third of it, where they differ from the map's (yours and those in sight): ${join(", ", changed.map(([id, y]) => `${id} ${y} (map ${WorldMap.default.get(id).yield})`))}.`);
  if (v.resistance.size > 0)
    lines.push(
      `RESISTANCE your troops would meet from the people of land in sight, in units (in open land they add to any troop's hold, and a move must be stronger; on walls, the city's men before the walls multiply them): ${join("; ", groupBy(sortBy([...v.resistance.entries()], [([id]: [string, number]) => id, cmpStr]), ([, r]) => strengthWords(r)).map(([r, g]) => `${r}: ${join(", ", g.map(([id]) => `${id}${v.walls.getOrDefault(id, 0) > 0 ? " (walls)" : ""}`))}`))}.`,
    );
  // Item 17++ ("Who holds what, and the mood of the land"): each read as heard, grouped by its words, oldest seasons noted.
  if (v.moods.length > 0)
    lines.push(
      `THE MOOD OF THE LAND as you last heard it (from your governors, spies, envoys, scribes, travellers and your own eyes; it can be wrong): ${join("; ", groupBy(sortBy(v.moods, [(m) => m.mood, cmpStr], [(m) => m.province, cmpStr]), (m) => m.mood).map(([mood, g]) => `${mood}: ${join(", ", g.map((m) => `${m.province}${v.turn - m.seen > 1 ? ` (${v.turn - m.seen} seasons ago)` : ""}`))}`))}.`,
    );
  // Item 17++ ("taken up, never thrust on anyone"): provinces that declared for this court, or were ceded to it.
  if (v.declared.length > 0)
    lines.push(`PROVINCES THAT LOOK TO YOU (take_up_province to take one up, refuse_province to turn it away; unanswered, an offer stands only while its people lean your way): ${join("; ", v.declared.map((d) => `${d.province} (${d.from !== null ? `ceded to you by ${d.from}` : "its people declare for you"}${d.takenUp ? ", taken up: it answers to you as the season turns, if they still accept you" : ""})`))}.`);
  return lines;
}

/**
 * "Gold is a lifeline" (item 11a): what gold is worth to a king, said wherever a request asks him to give, take or keep it.
 */
export const GoldLifeline =
    "Gold is part of how you win (it counts in your strength) and your security: it pays the troops who would otherwise desert, the ransoms and the envoys. Give it only for what it buys on average over a time you can name: a gift buys favour, a bribe a softer report or a secret, a fee a servant's work, a loan interest, tribute peace. Gold you send abroad, or pay to people, leaves your realm. Gold you borrow counts as yours until you repay it; repaying costs you now and keeps lenders lending, defaulting keeps the gold and costs your name.";

/** A grant as its two kings read it in their view (item 9). */
