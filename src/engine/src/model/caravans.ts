/**
 * Markets and caravans in the game state (build order item 9+a, "Markets", "Caravans carry a kingdom's goods"). A market
 * holds a stock of grain and its people's purse; a caravan is a company of porters and pack donkeys carrying a king's grain
 * between his provinces, or to his troops, along a route of provinces.
 */
import { B, I, type ObjSchema, S, list, obj } from "../core/json.ts";
import type { Power } from "./power.ts";

export interface Market {
  /** Grain on sale, in measures. */
  stock: number;
  /** The gold of the local people, in shekels ("Where gold comes from and where it goes"). */
  purse: number;
}

export function newMarket(init: Partial<Market> = {}): Market {
  return { stock: 0, purse: 0, ...init };
}

export const MarketSchema: ObjSchema<Market> = obj("Market", newMarket, { stock: I, purse: I });

export interface Caravan {
  id: string;
  power: Power;
  /** The province it set out from, and the one it goes to (its stores, or the king's troops standing there). */
  from: string;
  to: string;
  /** The grain it carries, in measures; its porters and donkeys eat from it on the road. */
  grain: number;
  /** Its route, from where it set out; `at` is the index of the province it has reached. */
  route: string[];
  at: number;
  /** Progress towards the next province, in points (tenths of a day: model/travel.ts). */
  points: number;
  /** Going home with what it could not hand over. */
  returning: boolean;
  /** The season it set out. */
  since: number;
}

export function newCaravan(init: Partial<Caravan> = {}): Caravan {
  return { id: "", power: "Egypt", from: "", to: "", grain: 0, route: [], at: 0, points: 0, returning: false, since: 0, ...init };
}

export const CaravanSchema: ObjSchema<Caravan> = obj("Caravan", newCaravan, {
  id: S,
  power: S,
  from: S,
  to: S,
  grain: I,
  route: list(S),
  at: I,
  points: I,
  returning: B,
  since: I,
});

/** Where a caravan stands now. */
export const caravanAt = (c: Caravan): string => c.route[Math.min(c.at, c.route.length - 1)];
