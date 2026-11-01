/** Display helpers. The engine counts in shekels and turns; people read minas and seasons. */
import { idiv } from "../core/num.ts";
import type { Power } from "../model/power.ts";
import { bandWords, type AgeBand } from "./ending.ts";

export const SeasonsPerYear = 3;

export function year(turn: number): number {
  return idiv(turn - 1, SeasonsPerYear) + 1;
}

export function seasonIndex(turn: number): number {
  return (turn - 1) % SeasonsPerYear;
}

/** Each court reckons time in its own calendar; no power's calendar is everyone's reference. */
export function season(turn: number, court: Power): string {
  const i = seasonIndex(turn);
  const name =
    court === "Egypt"
      ? i === 0
        ? "Akhet (inundation)"
        : i === 1
          ? "Peret (growing)"
          : "Shemu (harvest)"
      : i === 0
        ? "the first season"
        : i === 1
          ? "the second season"
          : "the third season";
  return `${name}, year ${year(turn)}`;
}

/** Neutral reckoning for the spectator. */
export function neutral(turn: number): string {
  return `Season ${seasonIndex(turn) + 1} of year ${year(turn)} (turn ${turn})`;
}

// ---------------------------------------------------------------- the interface's date labels
// One label for every date the web app shows: the court's season and the year BCE, with the turn. Display only: no rule,
// view or prompt reads these, so kings are never told the year BCE.

/** The first year of every game, counted BCE; each later year is one less. */
export const FirstYearBce = 1346;

/** The year BCE of a turn: 1346 for turns 1-3, 1345 for turns 4-6, and so on. */
export function yearBce(turn: number): number {
  return FirstYearBce - (year(turn) - 1);
}

/** The season's short name in a court's reckoning: Egypt's own names, the other courts' ordinals; the spectator's number. */
export function seasonName(turn: number, court: Power | null): string {
  const i = seasonIndex(turn);
  if (court === null) return `season ${i + 1}`;
  if (court === "Egypt") return i === 0 ? "Akhet" : i === 1 ? "Peret" : "Shemu";
  return i === 0 ? "the first season" : i === 1 ? "the second season" : "the third season";
}

/**
 * The date label: "Peret, 1344 BCE (turn 8)" at Egypt's court, "the second season, 1344 BCE (turn 8)" at the others, and
 * for the spectator (no court) "season 2, 1344 BCE (turn 8)".
 */
export function dateLabel(turn: number, court: Power | null = null): string {
  return `${seasonName(turn, court)}, ${yearBce(turn)} BCE (turn ${turn})`;
}

/**
 * The short form for dense lists and the map: "Peret 1344 BCE" at Egypt's court, "season 2, 1344 BCE" elsewhere, as the
 * header's own words have it, never a shorthand nobody is told ("s2"). The turn goes in a tooltip ({@link dateLabel}).
 */
export function shortDate(turn: number, court: Power | null = null): string {
  return court === "Egypt" ? `${seasonName(turn, court)} ${yearBce(turn)} BCE` : `season ${seasonIndex(turn) + 1}, ${yearBce(turn)} BCE`;
}

/**
 * The ending line for the header, in words and without numbers (build order item 6a): the rule as the kings are told it,
 * never the chance, the median, the cap or the drawn season. In an open age, that it has no end; after the table played on
 * past the age's end, also when it ended and who won it.
 */
export function ending(openAge: boolean, ageEnded: { turn: number; winners: readonly string[] } | null = null, court: Power | null = null, band: AgeBand = "Usual"): string {
  if (!openAge) return band === "Usual" ? "Any season may be the last: early on it is very unlikely, and it grows likelier with every year." : bandWords(band);
  const past = ageEnded === null ? "" : ` The age ended in ${dateLabel(ageEnded.turn, court)}; ${ageEnded.winners.join(" and ")} won it.`;
  return `An open age: this age has no end.${past}`;
}

/** The short form, for the phone header. */
export function shortEnding(openAge: boolean): string {
  return openAge ? "An open age, with no end" : "Any season may be the last";
}

export const ShekelsPerMina = 60;

/** Shekels as people read them: "45 shekels", "1 mina", "2 minas 15 shekels" (Money.Format). */
export function formatMoney(shekels: number): string {
  const sign = shekels < 0 ? "-" : "";
  // Whole shekels only (item 17+): a fraction the engine carries is never a figure a king reads.
  shekels = Math.round(Math.abs(shekels));
  const minas = idiv(shekels, ShekelsPerMina);
  const rest = shekels % ShekelsPerMina;
  if (minas === 0) return `${sign}${rest} shekels`;
  const m = minas === 1 ? "1 mina" : `${minas} minas`;
  return rest === 0 ? sign + m : `${sign}${m} ${rest} shekels`;
}
