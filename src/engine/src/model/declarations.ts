/**
 * A change of hands is taken up, never thrust on anyone (build order item 17++; "Whom a province obeys" under War, decided
 * 2 November 2026). A province whose weight tips toward a power whose troops do not stand in it declares for him, and
 * obeys him only once he takes it up by an act of rule aimed at it; a treaty's cession gives the receiver the claim, never
 * the province. Troops sent to stand in a province are themselves an order to take or hold it, so they need no answer.
 */
import { B, I, type ObjSchema, S, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";

/** A province's declaration for a power, or a claim on it ceded by treaty, until it is taken up, refused or lapses. */
export interface Declaration {
  province: string;
  /** The power it declares for, or the receiver of a cession. */
  power: Power;
  /** The giver of a cession, who holds it until the receiver takes it up; null for a declaration. */
  from: Power | null;
  /** The season the word of it reaches the power's court: from then he knows it and may answer it. */
  known: number;
  /** His word taking it up has reached it: it obeys him as the next season is reckoned, if its people still weigh him. */
  takenUp: boolean;
  /** The season word that his word reached it comes home to his court (null until it has reached it). */
  takenKnown: number | null;
  /** Ended (it no longer leans his way, changed hands, or the giver lost it): the season word of the end reaches his court. */
  gone: number | null;
  /** A claim taken up while its giver's troops stayed in it: the treaty broken, told once ("Keeping a promise is an act"). */
  broken: boolean;
}

export function newDeclaration(init: Partial<Declaration> = {}): Declaration {
  return { province: "", power: "Egypt", from: null, known: 0, takenUp: false, takenKnown: null, gone: null, broken: false, ...init };
}

export const DeclarationSchema: ObjSchema<Declaration> = obj("Declaration", newDeclaration, { province: S, power: S, from: opt(S), known: I, takenUp: B, takenKnown: opt(I), gone: opt(I), broken: B });

/** Whether a declaration stands in the view of the court it looks to (hidden information): known there, its end not yet heard. */
export function declarationKnown(d: Declaration, turn: number): boolean {
  return d.known <= turn && (d.gone === null || d.gone > turn);
}

/** The ledger's entry against a power that refuses a province that declared for him: a people turned away remember it (first guess, item 18). */
export const RefusedPoints = 20;
