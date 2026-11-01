/** The interface's text helpers: names, dates and money as every panel writes them. */
import { WorldMap, dateLabel, describe, formatMoney, land, rx, seasonName, yearBce, type GrantView, type Order, type Power, type SeatView } from "@amarna/engine";

export const color = (p: Power | null): string => (p !== null ? `var(--${p.toLowerCase()})` : "var(--neutral)");

/** Rounded to the whole shekel: the treasury keeps fractions (interest, shares), which no one reads as such. */
export const shekels = (s: number): string => formatMoney(Math.round(s));

export const provinceName = (id: string): string => (WorldMap.default.exists(id) ? WorldMap.default.get(id).name : id);

export const powerName = (p: Power): string => (p === "Babylonia" ? "Babylonia" : land(p));

/** The one date label of the interface: the court's season and the year BCE with the turn, or the spectator's. */
export const when = (turn: number, court: Power | null): string => dateLabel(turn, court);

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
 * "(season N)", which counts turns too, becomes "(the label)". The engine's own text, which models read, stays as it is.
 */
export function dated(text: string, court: Power | null): string {
  if (!text) return text;
  return text
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
  return text.replace(Words, (m) => (WorldMap.default.exists(m) ? WorldMap.default.get(m).name : m));
}

/** A grant of passage or basing as its two kings read it (item 9). */
export function grantLine(g: GrantView, me: Power): string {
  const where = g.province !== null ? WorldMap.default.get(g.province).name : `all ${g.grantor === me ? "your" : `${powerName(g.grantor)}'s`} land`;
  const what = g.kind === "passage" ? `pass through ${where}` : `stand within the walls of ${where}`;
  const who = g.grantor === me ? `${powerName(g.grantee)}'s troops may ${what}` : `Your troops may ${what}, by leave of ${powerName(g.grantor)}`;
  return `${who}, since turn ${g.sinceTurn}${g.untilTurn !== null ? `, until turn ${g.untilTurn}` : ", until revoked"} (${g.tablet}).`;
}
