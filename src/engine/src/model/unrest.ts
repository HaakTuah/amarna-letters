/**
 * Whom a province obeys (build order item 17++; "Whom a province obeys", "Loyalty is a ledger", "Revolt follows conditions,
 * not dice" and "The people defend their land" under War). Every first guess here is tuned in item 18.
 *
 * **The ledger** (`GameState.ledger`: province, then actor, a power or a character's id, then points): the people of
 * each province remember what each actor gave them and took from them. A fair exchange is neutral; memory fades by `fade`
 * in a hundred a season. Takings: famine under its holder (`hunger` points at no food at all), levies (`levy` for every
 * man of fighting age), food troops took (`taken` for all the farmers' food), a sack (`sacked` by the share of the purse),
 * a tax above the usual (`tax` points a season for each 10 points of rate above it, the hand that collects it). Givings: a
 * rival's gold among the people (`stir` a hundred shekels), the holder's troops standing in it (`troops` a season) or next
 * to it (`near`), policing (`policing` a level), a harvest left to people who ate in full (`harvest`), a tax below the
 * usual, a work built (`work` a level), a battle won in it for its holder (`victory`), grain handed out (`grain` for a season's
 * need, in a famine; a quarter of it in plenty), a siege lifted by its holder's troops (`relief`). What the holder gives counts less the farther his court (`far` in a hundred a
 * season of road beyond the first, at most `farMost`), except through a governor there.
 *
 * **It starts low** for a newcomer (nothing); the starting data says what history did: a native dynasty in its own
 * homeland `home`, a holder in land he did not grow from `held`, a claimant or a town's ruler `stake` (the sources' grade
 * in the report).
 *
 * **Weight**, each season: force, the troops of a power standing in it (`force` points for troops as many as a tenth of
 * its men of fighting age; a quarter of that from next door or before walls not stormed, at most `nearMost`, and for
 * every power alike; at most `forceMost` in all), plus love, its ledger with him and with
 * the men who serve him there and do not want it themselves; less, for its holder, the master's weakness (`besieged`
 * while his court's city is besieged, up to `weakness` as his realm shrinks below its start). It obeys whoever weighs
 * most, once his weight clears its holder's by `margin`; it falls lawless when its holder's weight is below `floor` and
 * nobody's clears it. **Obedience has degrees:** a third of the yield at a lead of nothing, all of it from `full`.
 * Unrest, as governors and spies put it in words, is `threshold` less the holder's lead.
 */
export const UnrestData = {
  fade: 10,
  hunger: 40,
  levy: 60,
  taken: 400,
  sacked: 30,
  tax: 1,
  stir: 25,
  troops: 4,
  near: 1,
  policing: 2,
  harvest: 2,
  work: 10,
  victory: 10,
  grain: 20,
  /** An army's ledger (`turn/army-ledger.ts`): pay a season, pay missed, a season hungry, a battle won or lost, plunder shared; its king's own men start at `held`. */
  pay: 3,
  unpaid: 6,
  starved: 6,
  won: 10,
  beaten: 10,
  plunder: 5,
  relief: 20,
  far: 15,
  farMost: 60,
  home: 100,
  held: 40,
  stake: 30,
  force: 100,
  forceMost: 200,
  nearMost: 50,
  besieged: 20,
  weakness: 40,
  margin: 20,
  floor: -40,
  full: 60,
  threshold: 100,
  /** A character "wants it": ambition at least this, and loyalty to his master below `disloyal`. */
  wants: 50,
  disloyal: 50,
  /** The least share in a hundred of a province's men who rise behind a man (or against a master they hate). */
  riseLeast: 10,
  /** Those who love their master fight beside his troops against a rising: one in this many of them, at full love. */
  loyalShare: 4,
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
  if (level >= threshold - UnrestData.margin / 2) return "near revolt";
  if (level * 3 >= threshold * 2) return "restless";
  if (level * 3 >= threshold) return "uneasy";
  return "quiet";
}
