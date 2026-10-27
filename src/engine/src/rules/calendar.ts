/** Display helpers. The engine counts in shekels and turns; people read minas and seasons. */
import { idiv } from "../core/num.ts";
import { fmt } from "../core/num.ts";
import type { Power } from "../model/power.ts";

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
export const FirstYearBce = 1345;

/** The year BCE of a turn: 1345 for turns 1-3, 1344 for turns 4-6, and so on. */
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
 * The date label: "Peret, 1343 BCE (turn 8)" at Egypt's court, "the second season, 1343 BCE (turn 8)" at the others, and
 * for the spectator (no court) "season 2, 1343 BCE (turn 8)".
 */
export function dateLabel(turn: number, court: Power | null = null): string {
  return `${seasonName(turn, court)}, ${yearBce(turn)} BCE (turn ${turn})`;
}

/** The short form for dense lists: "Peret 1343 BCE", "s2 1343 BCE". The turn goes in a tooltip ({@link dateLabel}). */
export function shortDate(turn: number, court: Power | null = null): string {
  return court === "Egypt" ? `${seasonName(turn, court)} ${yearBce(turn)} BCE` : `s${seasonIndex(turn) + 1} ${yearBce(turn)} BCE`;
}

/**
 * The ending line for the header: before the first season that may end the age, "The age cannot end before …"; from it
 * on, "Any season may now be the last (15% each season)".
 */
export function ending(turn: number, minTurns: number, endChance: number, court: Power | null = null): string {
  return turn < minTurns ? `The age cannot end before ${dateLabel(minTurns, court)}.` : `Any season may now be the last (${fmt(endChance * 100, "0.#")}% each season).`;
}

export const ShekelsPerMina = 60;

/** Shekels as people read them: "45 shekels", "1 mina", "2 minas 15 shekels" (Money.Format). */
export function formatMoney(shekels: number): string {
  const sign = shekels < 0 ? "-" : "";
  shekels = Math.abs(shekels);
  const minas = idiv(shekels, ShekelsPerMina);
  const rest = shekels % ShekelsPerMina;
  if (minas === 0) return `${sign}${rest} shekels`;
  const m = minas === 1 ? "1 mina" : `${minas} minas`;
  return rest === 0 ? sign + m : `${sign}${m} ${rest} shekels`;
}
