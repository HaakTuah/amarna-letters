/**
 * Item 17b, part C2: who a court sees as a fallen realm's claimant. Kept apart from `views.ts` (past the 50 KB mark,
 * "Step 0" in `AGENTS.md`), which reads it for `CharacterView.heirOf`.
 */
import type { Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import { isAlive, type GameState } from "../model/state.ts";
import { fallenRealmOf } from "./court.ts";

/**
 * The fallen realm a character claims, as `viewer` knows it: once it has heard of the fall (a fallen court sees all); and,
 * for an heir raised in exile, once his claim is his, told openly by a new man who carries it, or by a man of the record
 * where he stands, to the courts he has stood at since (the claim fact's `knownBy`).
 */
export function claimKnown(s: GameState, viewer: Power, c: Character): Power | null {
  const p = fallenRealmOf(s, c.id);
  if (p === null) return null;
  if (!(!isAlive(s, viewer) || (s.fallsHeard.tryGet(viewer) ?? []).includes(p))) return null;
  if (!s.reigns.get(p).exiled) return p;
  const claim = c.facts.find((f) => f.tag === "claim");
  if (claim === undefined) return null;
  return claim.secrecy === "Public" || claim.knownBy.includes(viewer) || c.at === viewer || !isAlive(s, viewer) ? p : null;
}
