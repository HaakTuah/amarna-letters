/**
 * Vassalage (build order item 11+, "Vassalage is words" and "Opening relations as they were"). Between any two powers a
 * vassal bond is a sealed tablet like any other, marked as a vassal treaty ({@link Tablet.vassal}); tribute is gold sent and
 * troops are troops sent, which the engine moves, and the rest is words. Nothing here is a rule: the opening bonds are
 * starting data, and {@link vassalTerms} reads a tablet's template clauses as a script player reads them.
 */
import type { Clause } from "./clauses.ts";
import { isSealedAgreement, type Tablet } from "./records.ts";
import type { Power } from "./power.ts";
import { WorldMap } from "./map.ts";

/** A city-state's bond to its overlord in 1346 BCE, from the politics dossier, with its tribute a year in shekels. */
export interface StartVassal {
  readonly vassal: Power;
  readonly overlord: Power;
  /** The tribute its tablet names each year: half of what its land yields in a season (a first guess for item 18). */
  readonly tribute: number;
}

/**
 * The opening bonds, from "Opening relations as they were" and the politics dossier (`docs/history/01-politics.md`, "The
 * Levant and northern Syria, city by city"): the Levant's cities Egypt's vassals under rulers of their own, Ugarit and
 * Qadesh too (they turn to Hatti later in the period), Nuhashshe, Carchemish, Aleppo, Alalakh, Arrapha and the middle
 * Euphrates (Suhu) Mitanni's. Arwad, Isuwa, Elam, and the Kaska, Lukka and Sutean chiefs start free. Tribute is set from
 * the map's yield, the half of a season's yield a year, rounded to five shekels.
 */
const bond = (vassal: Power, overlord: Power): StartVassal => ({ vassal, overlord, tribute: Math.max(5, Math.round(WorldMap.default.capital(vassal).yield / 2 / 5) * 5) });

export const StartVassals: readonly StartVassal[] = [
  bond("Ugarit", "Egypt"),
  bond("Qadesh", "Egypt"),
  bond("Qatna", "Egypt"),
  bond("Amurru", "Egypt"),
  bond("Byblos", "Egypt"),
  bond("Sidon", "Egypt"),
  bond("Damascus", "Egypt"),
  bond("Tyre", "Egypt"),
  bond("Megiddo", "Egypt"),
  bond("Shechem", "Egypt"),
  bond("Jerusalem", "Egypt"),
  bond("Carchemish", "Mitanni"),
  bond("Alalakh", "Mitanni"),
  bond("Aleppo", "Mitanni"),
  bond("Nuhashshe", "Mitanni"),
  bond("Suhu", "Mitanni"),
  bond("Arrapha", "Mitanni"),
];

/** What a vassal tablet says, read from its mark and its template clauses: who serves whom, for what tribute a year. */
export interface VassalTerms {
  readonly tabletId: string;
  readonly vassal: Power;
  readonly overlord: Power;
  /** The tribute a year the vassal owes by its words (0: none named). */
  readonly tribute: number;
  /** Whether it says the overlord protects the vassal's land. */
  readonly protects: boolean;
  /** Whether it says the vassal serves: no arms against the overlord or his friends, troops when called. */
  readonly serves: boolean;
  readonly sealedTurn: number;
}

/**
 * The terms of a sealed vassal tablet, or null for any other. A clause binds its writer (`tribute`, `protect`, `serve`) or
 * asks it of the reader (`askTribute`, `askProtect`, `askServe`), so each is read from the side of whoever proposed it.
 */
export function vassalTerms(t: { id: string; vassal: Power | null; proposedBy: Power; partner: Power | null; clauses: readonly Clause[]; sealedTurn: number | null }): VassalTerms | null {
  if (t.vassal === null || t.partner === null || t.sealedTurn === null) return null;
  const vassal = t.vassal;
  const overlord = vassal === t.proposedBy ? t.partner : t.proposedBy;
  if (overlord === vassal) return null;
  // What the writer gives is his; what he asks is the reader's.
  const giver = (c: Clause): Power => (c.kind.startsWith("ask") ? (t.proposedBy === vassal ? overlord : vassal) : t.proposedBy);
  let tribute = 0;
  let protects = false;
  let serves = false;
  for (const c of t.clauses) {
    if ((c.kind === "tribute" || c.kind === "askTribute") && giver(c) === vassal) tribute += Math.max(0, c.amount ?? 0);
    if ((c.kind === "protect" || c.kind === "askProtect") && giver(c) === overlord) protects = true;
    if ((c.kind === "serve" || c.kind === "askServe") && giver(c) === vassal) serves = true;
  }
  return { tabletId: t.id, vassal, overlord, tribute, protects, serves, sealedTurn: t.sealedTurn };
}

/** The vassal bonds standing on sealed tablets, oldest first: neither forged nor repudiated. */
export function vassalBonds(tablets: readonly Tablet[]): VassalTerms[] {
  const out: VassalTerms[] = [];
  for (const t of tablets) {
    if (!isSealedAgreement(t) || t.repudiatedTurn !== null) continue;
    const v = vassalTerms(t);
    if (v !== null) out.push(v);
  }
  return out;
}
