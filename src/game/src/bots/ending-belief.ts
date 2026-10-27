/**
 * What a script king believes about the end of the age (build order item 6a). Kings are told the rule in words only: any
 * season may be the last, very unlikely early on and likelier every year, and, when the table moved its median, that the
 * age is likely to be short or long (item 6b). A script king turns those words into numbers of its own: the band's own
 * median (rules/ending.ts), never the table's settings or the drawn season, which no view carries.
 */
import { BandMedian, endChanceAt, type AgeBand } from "@amarna/engine";

/** The median a script king assumes for the words it was told: about fourteen years for the usual age. */
const believed = (band: string): number => BandMedian[(band in BandMedian ? band : "Usual") as AgeBand];

/** How far ahead a king plans in an open age, which has no end: as far as at the start of an age that may end. */
const openHorizon = new Map<string, number>();

const expected = new Map<string, number>();

/** The seasons a king expects the age to run from this one on, this one included. */
export function seasonsLeft(turn: number, openAge: boolean, band = "Usual"): number {
  if (openAge) {
    let h = openHorizon.get(band);
    if (h === undefined) openHorizon.set(band, (h = seasonsLeft(1, false, band)));
    return h;
  }
  const t = Math.max(1, turn);
  const key = `${band}:${t}`;
  let e = expected.get(key);
  if (e === undefined) {
    // Each later season is played if the age outlived every season before it.
    e = 0;
    let reach = 1.0;
    for (let j = t; reach > 1e-6; j++) {
      e += reach;
      reach *= 1 - endChanceAt(j, believed(band));
    }
    expected.set(key, e);
  }
  return e;
}

/** Whether a king thinks the end may be near: from the season the believed chance reaches one in a hundred (season 15 for the usual age). */
export function endMayBeNear(turn: number, openAge: boolean, band = "Usual"): boolean {
  return !openAge && endChanceAt(turn, believed(band)) >= 0.01;
}
