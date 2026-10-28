/**
 * Word of foreign markets and tolls, carried (item 10+b, Haakon's answer of 28 October 2026: a court knows a foreign
 * market's prices and the tolls set on it only as last reported to it, never posted). A caravan, a ship or an envoy
 * gathers it where it goes and the court learns it when it comes home; lost on the road, the word is lost with it.
 */
import { Dict } from "../core/collections.ts";
import { I, type ObjSchema, S, dict, list, obj } from "../core/json.ts";
import { type Toll, TollSchema } from "./trade.ts";

/**
 * A foreign market as the court last knew it (item 9+b, "Prices are known where they are and through news"): its price
 * (hundredths of a shekel a measure), its stock, its normal stock (a season of its town's need) and its people's purse,
 * and the season it stood so: seen with the court's own eyes, or brought home by its caravans, ships and envoys (item
 * 10+b: "Information moves in physical time").
 */
export interface MarketSeen {
  price: number;
  stock: number;
  need: number;
  purse: number;
  turn: number;
}

export function newMarketSeen(init: Partial<MarketSeen> = {}): MarketSeen {
  return { price: 0, stock: 0, need: 0, purse: 0, turn: 0, ...init };
}

export const MarketSeenSchema: ObjSchema<MarketSeen> = obj("MarketSeen", newMarketSeen, { price: I, stock: I, need: I, purse: I, turn: I });

/**
 * What a traveller brings home: the markets it saw, and the tolls it found standing on its king's goods, holder by holder
 * (`holders`: whose tolls it learned, all of them, so a rate since lifted is forgotten).
 */
export interface Word {
  markets: Dict<string, MarketSeen>;
  tolls: Toll[];
  holders: string[];
}

export function newWord(init: Partial<Word> = {}): Word {
  return { markets: new Dict(), tolls: [], holders: [], ...init };
}

export const WordSchema: ObjSchema<Word> = obj("Word", newWord, { markets: dict(() => MarketSeenSchema), tolls: list(() => TollSchema), holders: list(S) });

/** Into a word: a market as it stands, and a holder's tolls on a partner's goods (replacing what it held of that holder). */
export function noteMarket(w: Word, province: string, seen: MarketSeen): void {
  w.markets.set(province, seen);
}

export function noteTolls(w: Word, tolls: readonly Toll[], holder: string, partner: string): void {
  w.tolls = w.tolls.filter((t) => t.holder !== holder);
  for (const t of tolls) if (t.holder === holder && (t.partner === null || t.partner === partner)) w.tolls.push({ ...t });
  if (!w.holders.includes(holder)) w.holders.push(holder);
}
