/**
 * A capital ceded whole (build order item 11d, Haakon's answer to item 11+'s review): a ruler may cede his capital, and
 * with it his realm, by agreement on a sealed tablet. The tablet is the agreement; the cession is still his own order
 * ("Keeping a promise is an act"), and the engine only checks that such a tablet stands.
 */
import type { Power } from "./power.ts";
import { isSealedAgreement, type Tablet } from "./records.ts";

/**
 * Whether a sealed tablet between `giver` and `receiver`, not repudiated, gives `province` to the receiver: the giver
 * writing "I give you" it, or the receiver writing "Give me" it, sealed by both.
 */
export function cessionAgreed(tablets: readonly Tablet[], giver: Power, receiver: Power, province: string): boolean {
  return tablets.some(
    (t) =>
      isSealedAgreement(t) &&
      t.repudiatedTurn === null &&
      t.seals.includes(giver) &&
      t.seals.includes(receiver) &&
      t.clauses.some(
        (c) => c.province === province && ((c.kind === "cede" && t.proposedBy === giver && t.partner === receiver) || (c.kind === "askCede" && t.proposedBy === receiver && t.partner === giver)),
      ),
  );
}
