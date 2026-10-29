/**
 * How cities become free (build order item 17; "Revolt follows conditions, not dice", "How cities become free" and "How
 * long a siege lasts" under War, "A head rises where men lack one" and "Land without a ruler" under Bands, "Armies need
 * food as well as pay" under Land, people and economy). The weights are first guesses from the dossier
 * `docs/history/14-courts-and-free-cities.md` ("The conditions of 'Revolt follows conditions, not dice', against the
 * record"), tuned in item 18.
 *
 * Every province a power holds carries unrest, in points, summed each season from conditions the engine can see:
 * - a **hardship** stock the people remember (`GameState.unrest`): famine (`hunger` points at no food at all), levies raised
 *   from it (`levy` points for levying every man of fighting age), food troops took from it (`taken` points for taking all
 *   the farmers' food, their own king's troops included) and a city sacked (`sacked`); it fades by `fade` in a hundred a
 *   season;
 * - **outside help**, a rival's gold spent among its people by an agent (`GameState.stirred`): `stir` points for each 100
 *   shekels, fading as hardship does;
 * - **how new the conquest is**: `fresh` points the season it was taken, `freshFade` fewer each season after;
 * - **the master's weakness**: `besieged` while his court's city is besieged, and up to `weakness` as his realm shrinks
 *   below what it started with;
 * - **distance**: `far` points for each season the road from his court takes beyond the first, at most `farMost`;
 * - **a cause to rally to**: `cause` while the power it was taken from still stands, and `cause` more while a character of
 *   standing there wants it (a disloyal, ambitious governor, a chief with his band, a former ruler of it).
 *
 * And what lowers it: the holder's troops in it (`troops`) or next to it (`near`), a loyal governor (`governor`), its
 * policing (`policing` a level) and a good harvest (`harvest`). It rises when the sum passes `threshold`, or
 * `homeThreshold` in the holder's own homeland (absorbed land starts loyal and needs far more); the seeded dice settle only
 * the last `margin` points below it.
 */
export const UnrestData = {
  hunger: 40,
  levy: 60,
  taken: 400,
  sacked: 30,
  fade: 15,
  stir: 25,
  fresh: 60,
  freshFade: 5,
  besieged: 20,
  weakness: 40,
  far: 5,
  farMost: 20,
  cause: 20,
  troops: 40,
  near: 10,
  governor: 20,
  policing: 10,
  harvest: 10,
  threshold: 100,
  homeThreshold: 250,
  margin: 10,
  /** A character "wants it": ambition at least this, and loyalty to his master below `disloyal`. */
  wants: 50,
  disloyal: 50,
  /** A revolt where the master's troops stand is put down: this many thousandths of the settled die, and the stock halves. */
  crushedDead: 10,
  /** The share in a hundred of the province's purse that its new ruler's treasury starts with (the elite's gold). */
  elitePurse: 20,
  /**
   * Lawless land raises a ruler from its own people ("A head rises in time"): only a walled town with an elite of its own,
   * `elder` in a hundred a season for each level of walls, plus `elderWait` for each season it has gone without one.
   */
  elder: 8,
  elderWait: 1,
  /**
   * A chief who holds land without a ruler long enough comes to rule it (the new Idrimi): `chiefHold` seasons for a band
   * gathered on the roads (years, not seasons), `captainHold` for one that was a king's army (a season or two); with men at
   * least `chiefMen` in a hundred of the province's men of fighting age, so that its people cannot throw him out.
   */
  chiefHold: 8,
  captainHold: 2,
  chiefMen: 20,
  /**
   * The gate opened from within ("How long a siege lasts"): a starving city holds `gate` seasons, one more where its ruler
   * is there (his court or his governor), one more where its people were content (unrest below half the threshold), one
   * fewer where they were restless (at or above it).
   */
  gate: 1,
  /**
   * A commander given gold for his army's food keeps it and lets his men take instead when his greed times his
   * disloyalty (100 − loyalty) reaches this (a script commander's formula; first guess).
   */
  keepFood: 5000,
} as const;

/** How restless a province is, as a governor or a spy puts it in words: never the number. */
export function moodWords(level: number, threshold: number): string {
  if (level >= threshold - UnrestData.margin) return "near revolt";
  if (level * 3 >= threshold * 2) return "restless";
  if (level * 3 >= threshold) return "uneasy";
  return "quiet";
}
