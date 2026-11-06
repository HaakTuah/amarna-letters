/**
 * Markets and caravans in the game state (build order item 9+a, "Markets", "Caravans carry a kingdom's goods"). A market
 * holds a stock of grain and its people's purse; a caravan is a company of porters and pack donkeys carrying a king's grain
 * between his provinces, or to his troops, along a route of provinces. From item 9+b a caravan may also cross land open
 * to it, trade at a foreign market (selling its grain and buying with the gold it carries) and come home with the
 * proceeds, smuggle through borders, or sail as a fleet in cargo service ("Ships carry goods").
 */
import { B, I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";
import { type GameState, UnitSchema, type Unit } from "./state.ts";
import { type Word, WordSchema, newWord } from "./word.ts";

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
  /** The gold it carries (item 9+b): to buy grain with at the market it trades at, or the proceeds it brings home. */
  gold: number;
  /**
   * Its porters' (a ship's, its crew's) pay for the road, carried with it from where it set out (#587, "One treasury, many
   * stores"): each season's pay comes out of it, then out of the gold it carries, and the treasury pays nothing on the road.
   */
  pay: number;
  /**
   * A load going home to its court (`TurnEngine.lootHome`) carries no pay: its porters are owed it, a bill they carry home
   * and the treasury pays when they arrive (#587). Null for every other caravan.
   */
  bill: number | null;
  /** It trades at the market of `to` (item 9+b): sells its grain there and buys grain with its gold. */
  trade: boolean;
  /** It goes off the road and round the toll posts, paying no tolls (item 9+b, "Tolls and smuggling"). */
  sneak: boolean;
  /** The fleet in cargo service that carries it by sea (item 9+b), out of the war until it comes home; null on land. */
  ship: Unit | null;
  /** What it learned abroad of markets and tolls, which its court hears when it comes home (item 10+b). */
  word: Word;
  /**
   * Item 10+b: a load of loot going home, which trades nothing: a captured archive's tablets (their ids), taken from the
   * court `archiveOf`, which become its king's copies when it arrives.
   */
  archive: string[];
  archiveOf: string;
  /**
   * Bug #540: its reports, one as it set out and one as each season ended, the newest last ({@link caravanReport}): its
   * court knows it as the newest whose word has come (`caravansKnown` in rules/caravans-known.ts).
   */
  trail: string[];
}

export function newCaravan(init: Partial<Caravan> = {}): Caravan {
  return { id: "", power: "Egypt", from: "", to: "", grain: 0, route: [], at: 0, points: 0, returning: false, since: 0, gold: 0, pay: 0, bill: null, trade: false, sneak: false, ship: null, word: newWord(), archive: [], archiveOf: "", trail: [], ...init };
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
  gold: I,
  pay: I,
  bill: opt(I),
  trade: B,
  sneak: B,
  ship: opt(() => UnitSchema),
  word: () => WordSchema,
  archive: list(S),
  archiveOf: S,
  trail: list(S),
});

/** Where a caravan stands now. */
export const caravanAt = (c: Caravan): string => c.route[Math.min(c.at, c.route.length - 1)];

/** How many of a caravan's reports are kept, and how long one that ended is kept: longer than any word takes. */
export const CaravanTrailKept = 8;

/** One report of a caravan as season `turn` ended: where it stood, its grain and gold (its porters' pay with it), whether going home, whether ended. */
export function caravanReport(c: Caravan, turn: number, gone = false): string {
  return `${turn}|${caravanAt(c)}|${c.grain}|${c.gold + c.pay}|${c.returning ? 1 : 0}|${gone ? 1 : 0}`;
}

/** A report read back. */
export function readCaravanReport(t: string): { turn: number; at: string; grain: number; gold: number; returning: boolean; gone: boolean } {
  const [turn, at, grain, gold, returning, gone] = t.split("|");
  return { turn: Number(turn), at, grain: Number(grain), gold: Number(gold), returning: returning === "1", gone: gone === "1" };
}

/** Adds a report to a caravan's trail, keeping the first (its setting out, which no turn-around changes) and the newest few. */
export function reportCaravan(c: Caravan, turn: number, gone = false): void {
  c.trail.push(caravanReport(c, turn, gone));
  if (c.trail.length > CaravanTrailKept) c.trail.splice(1, c.trail.length - CaravanTrailKept);
}

/** A caravan sets out: on the road, with its first report. */
export function setOut(s: GameState, c: Caravan): void {
  reportCaravan(c, s.turn);
  s.caravans.push(c);
}

/**
 * A caravan's journey ends (home, lost, seized or handed over): off the road, kept with its last report among the caravans
 * gone (GameState.caravansGone) until any word of its end could have come. What it learned abroad goes with it, unless it
 * came home to a far province with it (`keepWord`), whose word comes to its court when word of the homecoming does.
 */
export function caravanGone(s: GameState, c: Caravan, keepWord = false): void {
  const i = s.caravans.indexOf(c);
  if (i >= 0) s.caravans.splice(i, 1);
  if (!keepWord) c.word = newWord();
  reportCaravan(c, s.turn, true);
  s.caravansGone = [...s.caravansGone.filter((x) => readCaravanReport(x.trail[x.trail.length - 1]).turn > s.turn - CaravanTrailKept), c];
}
