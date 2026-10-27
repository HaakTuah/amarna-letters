/**
 * What a script king believes about the end of the age (build order item 6a). Kings are told the rule in words only: any
 * season may be the last, very unlikely early on and likelier every year. A script king turns those words into numbers of
 * its own: the default curve of the design document (half of all ages over by season 44), never the table's settings or
 * the drawn season, which no view carries.
 */
import { endChanceAt } from "@amarna/engine";

/** The median a script king assumes: about fourteen years. */
const BelievedMedian = 44;

/** How far ahead a king plans in an open age, which has no end: as far as at the start of an age that may end. */
let openHorizon: number | null = null;

const expected = new Map<number, number>();

/** The seasons a king expects the age to run from this one on, this one included. */
export function seasonsLeft(turn: number, openAge: boolean): number {
  if (process.env.AMARNA_IGNORE_ENDING === "1") return turn < 15 ? 15 - turn + 6.67 : 6.67; // TEMP measurement
  if (openAge) return (openHorizon ??= seasonsLeft(1, false));
  const t = Math.max(1, turn);
  let e = expected.get(t);
  if (e === undefined) {
    // Each later season is played if the age outlived every season before it.
    e = 0;
    let reach = 1.0;
    for (let j = t; reach > 1e-6; j++) {
      e += reach;
      reach *= 1 - endChanceAt(j, BelievedMedian);
    }
    expected.set(t, e);
  }
  return e;
}

/** Whether a king thinks the end may be near: from the season the believed chance reaches one in a hundred (season 15). */
export function endMayBeNear(turn: number, openAge: boolean): boolean {
  return !openAge && endChanceAt(turn, BelievedMedian) >= 0.01;
}
