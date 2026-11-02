/**
 * The men of every army keep a ledger too (build order item 17++, "Loyalty is a ledger": "the men of every army ... keep
 * one ledger of what each actor has given them and taken from them"): pay, plunder shared and victories give; wages
 * unpaid, defeats and hunger take; credit goes to the hand they see, their commander where one leads them, else their
 * king; memory fades as the provinces' does. What follows from it, with no further rule: an army follows its commander,
 * and a governor's levies follow him, only as far as their ledger stands with him against their king. Nobody sees the
 * numbers. Weights: `UnrestData` (`pay`, `unpaid`, `starved`, `won`, `beaten`, `plunder`), first guesses for item 18.
 */
import { Dict } from "../core/collections.ts";
import { clamp, idiv } from "../core/num.ts";
import { UnrestData } from "../model/unrest.ts";
import type { Unit } from "../model/state.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** The men of `u` remember `points` given them (above 0) or taken from them (below 0) by `by`, a power or a character's id. */
    armyEntry(u: Unit, by: string, points: number): void;
    /** The hand the men of `u` see: their commander, a levy at home its governor there, or their king. */
    armyHand(u: Unit): string;
    /** How many in a hundred of the men of `u` follow `leader` (a character's id) against their king. */
    follows(u: Unit, leader: string): number;
    /** Each season: the armies' memory fades, and the ledgers of units that are gone are dropped. */
    armyLedgerSeason(): void;
  }
}

const P = TurnEngine.prototype;
const D = UnrestData;

P.armyEntry = function (u, by, points) {
  if (points === 0) return;
  const S = this.s;
  let book = S.armies.tryGet(u.id);
  if (book === undefined) S.armies.set(u.id, (book = new Dict()));
  const v = book.getOrDefault(by, 0) + points;
  if (v === 0) book.delete(by);
  else book.set(by, v);
};

P.armyHand = function (u) {
  if (u.commander !== null) return u.commander;
  // A levy standing in the province it was raised from, under its governor there, sees him.
  const gov = u.province === u.home ? this.governorOf(u.home) : null;
  return gov !== null && gov[0].power === u.power ? gov[1].id : u.power;
};

P.follows = function (u, leader) {
  const book = this.s.armies.tryGet(u.id);
  const him = book?.getOrDefault(leader, 0) ?? 0;
  const king = book?.getOrDefault(u.power, 0) ?? 0;
  return clamp(50 + him - king, 0, 100);
};

P.armyLedgerSeason = function () {
  const S = this.s;
  const here = new Set(S.units.map((u) => u.id));
  for (const [id, book] of [...S.armies.entries()]) {
    if (!here.has(id)) {
      S.armies.delete(id);
      continue;
    }
    for (const [k, v] of [...book.entries()]) {
      const left = v - Math.sign(v) * Math.max(1, idiv(Math.abs(v) * D.fade, 100));
      if (Math.sign(left) !== Math.sign(v) || left === 0) book.delete(k);
      else book.set(k, left);
    }
    if (book.size === 0) S.armies.delete(id);
  }
};
