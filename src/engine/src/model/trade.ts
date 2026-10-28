/**
 * The economy abroad (build order item 9+b): caravans and ships trading at foreign markets, the harbours ships load and
 * unload at, tolls with a rate for each partner, and smuggling. Static data and pure arithmetic, so the engine, the views
 * and the script kings reckon with the same figures. Every number is a first guess, tuned in item 18.
 */
import { I, type ObjSchema, S, obj, opt } from "../core/json.ts";
import { clamp, idiv } from "../core/num.ts";
import type { Province } from "./map.ts";
import type { Power } from "./power.ts";
import type { Unit } from "./state.ts";

/**
 * First guesses (item 18 tunes them):
 * - `shipCapacity`: the measures a fleet in cargo service carries ("Ships carry goods": one ship did the work of hundreds
 *   of donkeys; a fleet is a few ships).
 * - `tollMost`: the highest toll a holder may set, as a percent of the goods crossing into his land.
 * - `smuggleFound`: the base odds, in percent, that a smuggler is found entering a realm (the road check's odds for one
 *   found sneaking, item 7b), plus `smugglePerMeasures` a point for every so many measures it carries and `smuggleGold`
 *   with gold; policing, until item 15 builds it, is that base level and a third of what the holder spends on watchmen.
 * - The sack (item 10+b: "What a sack takes follows its causes"): of a province taken by force its taker's men carry off
 *   at most `sackStormedPercent` of its people's purse when they storm it or take it unwalled, `sackSurrenderPercent`
 *   when it surrenders, and no more than `lootPerHundred` shekels for every hundred of them; the king's share,
 *   `kingSharePercent`, travels home to his capital as a load that can be waylaid, the rest in the soldiers' packs.
 * - `harbourStart`: the harbour level every coastal province starts with, until item 15 makes harbours a built level.
 * - `wordSeasonsShare`: word of a foreign market's price reaches a court from within a season's travel divided by this
 *   (2: half a season, some three weeks of road or sail), as it stood when the season began.
 */
export const TradeData = {
  shipCapacity: 400,
  tollMost: 50,
  smuggleFound: 20,
  smugglePerMeasures: 10,
  smuggleGold: 10,
  sackStormedPercent: 50,
  sackSurrenderPercent: 25,
  lootPerHundred: 10,
  kingSharePercent: 33,
  harbourStart: 1,
  wordSeasonsShare: 2,
} as const;

/** A province's harbour level: every coast starts with one; inland and at sea, none ("Ships carry goods"). */
export const harbourOf = (p: Province): number => (!p.isSea && p.isCoastal && p.waters !== null ? TradeData.harbourStart : 0);

/**
 * A toll a power sets on goods entering its land ("Tolls and smuggling"): in one province or all its land (`province`
 * null), on one partner's caravans and ships or everyone's (`partner` null), as a percent of what crosses. It stands
 * until changed; the most particular rate applies, a partner's before a province's (see {@link tollRate}).
 */
export interface Toll {
  holder: Power;
  province: string | null;
  partner: Power | null;
  percent: number;
}

export function newToll(init: Partial<Toll> = {}): Toll {
  return { holder: "Egypt", province: null, partner: null, percent: 0, ...init };
}

export const TollSchema: ObjSchema<Toll> = obj("Toll", newToll, { holder: S, province: opt(S), partner: opt(S), percent: I });

/**
 * The rate a holder charges a partner's goods entering one of his provinces, or none: his rate for that partner in that
 * province, else for that partner, else for that province, else for everyone.
 */
export function tollRate(tolls: readonly Toll[], holder: Power, province: string, partner: Power): number {
  let best = -1;
  let rate = 0;
  for (const t of tolls) {
    if (t.holder !== holder) continue;
    if (t.province !== null && t.province !== province) continue;
    if (t.partner !== null && t.partner !== partner) continue;
    // A partner's own rate comes before a province's: a promise to one partner holds in all the land.
    const rank = (t.partner !== null ? 2 : 0) + (t.province !== null ? 1 : 0);
    if (rank > best) {
      best = rank;
      rate = t.percent;
    }
  }
  return clamp(rate, 0, TradeData.tollMost);
}

/** What a toll takes of a load: a share, rounded down. */
export const tollOn = (amount: number, percent: number): number => idiv(Math.max(0, amount) * clamp(percent, 0, TradeData.tollMost), 100);

/** The odds, in percent, that a smuggler is found entering a realm, before any skill (a caravan with no leader has none). */
export function smuggleOdds(grain: number, gold: number, watchmen: number, most: number): number {
  const found = TradeData.smuggleFound + idiv(Math.max(0, grain), TradeData.smugglePerMeasures) + (gold > 0 ? TradeData.smuggleGold : 0) + Math.trunc(Math.max(0, watchmen) / 3);
  return Math.min(most, found);
}

/**
 * The fleet a ship order puts into cargo service: the king's fleet standing where the order names, or, when it names the
 * harbour itself and no fleet of his stands there, his fleet in that harbour's waters. Null if there is none.
 */
export function shipFleet(units: readonly Unit[], from: Province, fleet: string, power: Power): Unit | null {
  const at = (x: string): Unit | null => units.find((u) => u.province === x && u.power === power && u.kind === "Fleet") ?? null;
  return at(fleet) ?? (fleet === from.id && from.waters !== null ? at(from.waters) : null);
}
