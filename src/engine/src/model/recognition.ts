import { I, type ObjSchema, S, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";

/**
 * A claim to the rank of Great King that is still new ("Recognition is earned", build order item 8): Assyria's at the start,
 * which Babylonia, holding Assyria its vassal, does not grant. It becomes established once most Great Kings have called the
 * claimant brother for a few years. Recognition changes no rule and no score: it is a fact kings read.
 */
export interface Claim {
  power: Power;
  /** The king who counts the claimant as his vassal, or null. */
  overlord: Power | null;
  /** The season it became established, or null while it is new. */
  established: number | null;
}

export function newClaim(init: Partial<Claim> & Pick<Claim, "power">): Claim {
  return { overlord: null, established: null, ...init };
}

export const ClaimSchema: ObjSchema<Claim> = obj("Claim", () => newClaim({ power: "Assyria" }), {
  power: S,
  overlord: opt(S),
  established: opt(I),
});

/**
 * What one king called another in the greetings he actually sent: since when he has called him "brother", and granted him
 * the title Great King, without a greeting since that withheld it (null when his last greeting withheld it).
 */
export interface Recognition {
  from: Power;
  to: Power;
  brotherSince: number | null;
  titleSince: number | null;
  lastTurn: number;
}

export function newRecognition(init: Partial<Recognition> & Pick<Recognition, "from" | "to">): Recognition {
  return { brotherSince: null, titleSince: null, lastTurn: 0, ...init };
}

export const RecognitionSchema: ObjSchema<Recognition> = obj("Recognition", () => newRecognition({ from: "Egypt", to: "Egypt" }), {
  from: S,
  to: S,
  brotherSince: opt(I),
  titleSince: opt(I),
  lastTurn: I,
});

/** A power's claim to a realm's name (item 17+, "A power's name is a claim"): the name, and the season it was claimed. */
export interface NameClaim {
  name: string;
  since: number;
}

export const NameClaimSchema: ObjSchema<NameClaim> = obj("NameClaim", () => ({ name: "", since: 0 }), { name: S, since: I });

/** The claims that are new at the start of every game, with the king who holds each claimant his vassal (starting data). */
export const StartClaims: readonly Claim[] = [newClaim({ power: "Assyria", overlord: "Babylonia" })];
