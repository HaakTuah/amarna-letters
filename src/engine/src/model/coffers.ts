/**
 * Gold that travels both ways ("One treasury, many stores", decided 3 November 2026, #587). What is done in a province
 * beyond the season's reach of its king's court is paid only from gold that is there: the king's coffer in that province
 * (its own mined gold and market sales, and gold sent to it with the realm's couriers), or, for what it lacks, on credit,
 * with a bill carried home that the treasury pays when it arrives. The treasury moves only when gold leaves it or a
 * carrier brings a payment or a bill home.
 */
import { B, I, type ObjSchema, S, list, obj } from "../core/json.ts";
import type { Power } from "./power.ts";

/** The king's gold kept in a far province of his, and what it owes for work done there on a bill he did not pay. */
export interface Coffer {
  province: string;
  power: Power;
  gold: number;
  /** Owed to the province's people for work and levies on a bill the treasury could not pay: no more credit there until paid. */
  owed: number;
}

export function newCoffer(init: Partial<Coffer> = {}): Coffer {
  return { province: "", power: "Egypt", gold: 0, owed: 0, ...init };
}

export const CofferSchema: ObjSchema<Coffer> = obj("Coffer", newCoffer, { province: S, power: S, gold: I, owed: I });

/**
 * A bill carried home from a far province (or a far army's place): what was done there on credit in one season, due at
 * its court when word of that season could reach it. `units` are the troops whose pay it holds (they count it unpaid if
 * the treasury cannot pay it); the rest is the province's works and levies.
 */
export interface Bill {
  power: Power;
  province: string;
  /** The season the work was done, and the season the bill reaches the court. */
  turn: number;
  due: number;
  /** Owed for works and levies there. */
  works: number;
  /** Owed for troops' pay, by unit. */
  units: BillUnit[];
}

/** A unit's pay on a bill. */
export interface BillUnit {
  unit: string;
  gold: number;
  /** The unit as the bill names it, where it stood when the bill was made. */
  label: string;
  /** Its seasons of missing pay when the bill was made. */
  missed: number;
}

export const BillUnitSchema: ObjSchema<BillUnit> = obj("BillUnit", (init: Partial<BillUnit> = {}) => ({ unit: "", gold: 0, label: "", missed: 0, ...init }), { unit: S, gold: I, label: S, missed: I });

export function newBill(init: Partial<Bill> = {}): Bill {
  return { power: "Egypt", province: "", turn: 0, due: 0, works: 0, units: [], ...init };
}

export const BillSchema: ObjSchema<Bill> = obj("Bill", newBill, { power: S, province: S, turn: I, due: I, works: I, units: list(() => BillUnitSchema) });

/** Gold on the road inside a realm with its couriers: sent out to a far province's coffer, or coming home from one that was lost. */
export interface Remittance {
  power: Power;
  province: string;
  gold: number;
  due: number;
  /** Coming home to the treasury (its province was lost or besieged when it arrived), not going out. */
  home: boolean;
  /**
   * It reached its coffer; kept only until word of that reaches the court (`due`), so the court's list of gold sent
   * changes when word comes, never when the gold arrives far off (Codex, #635).
   */
  landed: boolean;
  /**
   * Bug #615: gold sent with word on an army's food that found the army gone, coming home with its courier: not among the
   * gold its court sent to coffers.
   */
  food: boolean;
}

export function newRemittance(init: Partial<Remittance> = {}): Remittance {
  return { power: "Egypt", province: "", gold: 0, due: 0, home: false, landed: false, food: false, ...init };
}

export const RemittanceSchema: ObjSchema<Remittance> = obj("Remittance", newRemittance, { power: S, province: S, gold: I, due: I, home: B, landed: B, food: B });

/** A bill's whole sum. */
export const billTotal = (b: Bill): number => b.works + b.units.reduce((a, x) => a + x.gold, 0);
