/** The interface's text helpers: names, dates and money as every panel writes them. */
import { WorldMap, countFigures, parsePower, grantPlace, dateLabel, describe, formatMoney, nameFrom, rx, seasonName, shortDate, toFigures, yearBce, type GrantView, type Order, type Power, type SeatView } from "@amarna/engine";

import { placeName, realmName, shown } from "./names.ts";

/** A power by the name every screen gives it: the engine's `powerName`, as the player's name settings show it (ui/names.ts). */
export const powerName: (p: Power) => string = realmName;

/** A winner of the age by name: a realm, or since item 17b part D a character first on the scoreboard. */
export const winnerName = (w: string): string => {
  const p = parsePower(w);
  return p === null ? w : powerName(p);
};

export const color = (p: Power | null): string => (p !== null ? `var(--${p.toLowerCase()})` : "var(--neutral)");

/** Rounded to the whole shekel: the treasury keeps fractions (interest, shares), which no one reads as such. */
export const shekels = (s: number): string => formatMoney(Math.round(s));

/** A province by the name the player's settings show (ui/names.ts). */
export const provinceName: (id: string) => string = placeName;

/** The one date label of the interface: the court's season and the year BCE with the turn, or the spectator's. */
export const when = (turn: number, court: Power | null): string => dateLabel(turn, court);

/** A count as a king reads it (item 17++): two figures ("about 18,000"), never to the last head; one for an old count. */
export function about(n: number, figures = 2): string {
  return toFigures(n, figures).toLocaleString("en");
}

/** A count of `age` seasons (null: never counted, a guess) in words: "about 650,000" while fresh, "some 600,000" once old. */
export function counted(n: number, age: number | null): string {
  const figures = countFigures(age);
  return `${figures >= 2 ? "about" : "some"} ${about(n, figures)}`;
}

export const cap = (s: string): string => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1));

/** The same, capitalised to open a sentence or a heading. */
export const whenCap = (turn: number, court: Power | null): string => cap(dateLabel(turn, court));

const TurnNumber = rx(String.raw`\b(?:[Ss]eason of )?[Tt]urn (?<n>\d+)\b`, "g");
/** "(season 4)" in a character's facts and outcomes: the turn the engine dated it (envoys-home.ts, envoys.ts). */
const SeasonNumber = rx(String.raw`\(season (?<n>\d+)\)`, "g");
const Ids = rx(String.raw`\bc\d+\b`, "g");
const Words = rx(String.raw`\b[a-z]+\b`, "g");

/**
 * Engine text with every "turn N" given its date label; "season of turn N" becomes the label alone, and a fact's
 * "(season N)", which counts turns too, becomes "(the label)"; and every place and realm by the name the player's settings
 * show (ui/names.ts). The engine's own text, which models read, stays as it is.
 */
export function dated(text: string, court: Power | null): string {
  if (!text) return text;
  return shown(text)
    .replace(TurnNumber, (m: string, ...args: unknown[]) => {
      const groups = args[args.length - 1] as { n: string };
      const label = dateLabel(Number.parseInt(groups.n, 10), court);
      return m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? cap(label) : label;
    })
    .replace(SeasonNumber, (_m: string, ...args: unknown[]) => {
      const n = Number.parseInt((args[args.length - 1] as { n: string }).n, 10);
      return `(${seasonName(n, court)}, ${yearBce(n)} BCE)`;
    });
}

/** An order in words, with people and places by name rather than id. */
export function describeOrder(o: Order, v: SeatView): string {
  const names = new Map<string, string>();
  for (const c of [...v.court, ...v.known]) if (!names.has(c.id)) names.set(c.id, c.name);
  // "give Memphis to Hatti" (the engine's words, which kings read) beside "cede Memphis to Hatti" reads as giving the land;
  // a person reads which troops go.
  if (o.type === "giftUnit" && WorldMap.default.exists(o.unit)) {
    const fleet = v.units.some((u) => u.power === v.power && u.province === o.unit && u.kind === "Fleet");
    return `give the ${fleet ? "fleet" : "army"} at ${provinceName(o.unit)} to ${powerName(o.to)}`;
  }
  let text = describe(o);
  text = text.replace(Ids, (m) => names.get(m) ?? m);
  return text.replace(Words, (m) => (WorldMap.default.exists(m) ? provinceName(m) : m));
}

/**
 * The season each claim to a contested name was read in its claimant's sealed greeting (#550): ", as read in Mitanni's
 * greeting sealed in season 2, 1344 BCE", or nothing where no claim was read in one.
 */
export function heardIn(heard: SeatView["nameClaims"][number]["heard"], me: Power): string {
  if (heard.length === 0) return "";
  return `, as read in ${heard.map((h) => `${powerName(h.claimant)}'s greeting sealed in ${shortDate(h.sealed, me)}`).join(" and in ")}`;
}

/** A grant of passage or basing as its two kings read it (item 9). */
export function grantLine(g: GrantView, me: Power): string {
  const where = grantPlace(g, g.grantor === me ? "your" : "his", provinceName);
  const what = g.kind === "passage" ? `pass through ${where}` : `stand within the walls of ${where}`;
  const who = g.grantor === me ? `${powerName(g.grantee)}'s troops may ${what}` : `Your troops may ${what}, by leave of ${powerName(g.grantor)}`;
  return `${who}, since turn ${g.sinceTurn}${g.untilTurn !== null ? `, until turn ${g.untilTurn}` : ", until revoked"} (${g.tablet}).`;
}

/** "of Gubla" after a person's name, or nothing when the name already says it ("Abdi-Ashtarti of Ta-Mehu"). */
export const fromWhere = (c: { name: string; origin: string }): string => (nameFrom(c) === c.name ? "" : `of ${c.origin}`);

/** "of Gubla, scribe of the treasury", or only the calling when the name says the place. */
export const fromAndCalling = (c: { name: string; origin: string; calling: string }): string => [fromWhere(c), c.calling].filter((x) => x !== "").join(", ");
