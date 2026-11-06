/**
 * Tablets and letters as a king reads them in his prompt: a held tablet's line and brief, a letter's line, brief and full
 * text, and the gold his letters commit.
 */
import {
  describe,
  sum,
  trimEnd,
  conditionsText,
  groupBy,
  powerNameFor,
  type Condition,
  type LetterView,
  type Order,
  type Power,
  type TabletView,
} from "@amarna/engine";
import { joinS } from "./text.ts";

    /// <summary>
    /// A tablet the king holds: its name, which every court gives it (its seals and date), then the king's own mark for its
    /// copy, which only its orders use (another court numbers its copies differently), then its text.
    /// </summary>
export function tabletLine(t: TabletView): string {
  return `${t.name} [your copy ${t.copyId}]${byHand(t)}: "${t.text}"`;
}

/** Item 9: "sealed for Egypt by the hand of Hani, within his authority; repudiated in turn 9", or nothing. */
function byHand(t: TabletView): string {
  if (t.byHand === null) return ``;
  const within = t.within === null ? `` : t.within ? `, within his authority` : `, beyond his authority`;
  return ` (sealed for ${t.byHandOf ?? ``} by the hand of ${t.byHand}${within}${t.repudiatedTurn !== null ? `; repudiated in turn ${t.repudiatedTurn}` : ``})`;
}

/** How the king's copy came to him, without the envoy's hand where the tablet's line has named it already. */
export function copySource(t: TabletView): string {
  const hand = t.byHand !== null ? ` by the hand of ${t.byHand}` : null;
  return hand !== null && t.source.endsWith(hand) ? t.source.slice(0, -hand.length) : t.source;
}

/** The conditions of a scheduled entry or a standing order, after its season or event: " (unless ...)", or nothing. */
export function whenMet(cs: readonly Condition[]): string {
  return cs.length === 0 ? `` : ` (${conditionsText(cs)})`;
}

/** No tablet read before: every tablet in full. */
export const NoneRead: ReadonlySet<string> = new Set<string>();
/** How many characters of a text its line keeps once it has been read in full (an older letter, a tablet read before). */
export const BriefChars = 120;
const opening = (text: string): string => (text.length <= BriefChars ? text : `${trimEnd(text.slice(0, BriefChars))}…`);

/** A tablet the king has read in full at an earlier orders: its name, its mark and its opening words. */
export function tabletBrief(t: TabletView): string {
  return `${t.name} [your copy ${t.copyId}]${byHand(t)}: "${opening(t.text)}"`;
}

/** The copies the opening deal gives each archive ("Opening relations as they were", item 11+). */
const OpeningSource = "sealed before the age began";

/**
 * The vassal treaties sealed before the age began, which share one oath and differ only in their vassal and tribute: those
 * with one overlord in one form in a single line (the form once, then each vassal, its tribute and the mark of its copy),
 * so a king does not read the same oath twenty times. Each is named as every court names it, which the line says once and
 * checks for each. Any that differ (unread, examined, by an envoy's hand, named by its opening words) keep a line of their
 * own: `rest`.
 */
export function openingTreaties(tablets: readonly TabletView[], viewer: Power, read: ReadonlySet<string>): { lines: string[]; rest: TabletView[] } {
  const name = (p: Power): string => powerNameFor(viewer, p);
  type Shaped = { t: TabletView; vassal: Power; overlord: Power; tribute: number; form: string };
  const shape = (t: TabletView): Shaped | null => {
    const tribute = t.clauses.find((c) => c.kind === "tribute")?.amount ?? null;
    const [vassal, overlord] = t.seals;
    if (t.source !== OpeningSource || t.seals.length !== 2 || t.vassal !== vassal || tribute === null) return null;
    if (t.unread || t.allianceOath || t.authResult !== null || t.byHand !== null) return null;
    if (t.name !== `the tablet sealed by ${name(vassal)} and ${name(overlord)}, dated turn 0` || !t.text.includes(`${tribute} shekels`)) return null;
    return { t, vassal, overlord, tribute, form: t.text.replace(`${tribute} shekels`, `N shekels`) };
  };
  const lines: string[] = [];
  const grouped = new Set<TabletView>();
  const shaped = tablets.map(shape).filter((x) => x !== null);
  for (const [, group] of groupBy(shaped, (x) => `${x.overlord}|${x.form}`)) {
    if (group.length < 2) continue;
    const { overlord, form } = group[0];
    const words = group.every((x) => read.has(x.t.tabletId)) ? opening(form) : form;
    const vassals = group.map((x) => `${name(x.vassal)}${name(x.vassal) !== x.vassal ? ` (${x.vassal})` : ``} ${x.tribute} [your copy ${x.t.copyId}]`);
    lines.push(`Vassal treaties ${OpeningSource}, each named "the tablet sealed by [vassal] and ${name(overlord)}, dated turn 0", all in one oath with their own tribute in place of N: "${words}" The vassals and their tribute: ${joinS(`; `, vassals)}.`);
    for (const x of group) grouped.add(x.t);
  }
  return { lines, rest: tablets.filter((t) => !grouped.has(t)) };
}

/** An older letter in a line: when, by whom, to whom, with what gold, and its opening words. */
export function letterBrief(l: LetterView): string {
  return `turn ${l.turn}, ${l.envoyName} (${l.envoyId}) to ${l.to}${(l.gold > 0 ? `, with ${l.gold} shekels` : ``)} (still away): "${opening(l.message)}"${(l.tablet !== null ? `, with a tablet to seal` : ``)}`;
}

/**
 * A battle report without the units that held: they stand where they stood, as the map shows. A report of nothing but
 * holds says so in one line.
 */
export function withoutHolds(body: string): string {
  // The holds as the report groups them ("Your armies held their ground in Apasa and Mira.", "Assyria's fleet stayed in the Western Sea.").
  const hold = /^[^:.]*\b(?:army|armies|fleet|fleets) (?:held (?:its|their) ground|stayed) in [^:.]+\.$/;
  const kept = body.split("\n").filter((l) => !hold.test(l));
  return kept.length > 0 ? joinS("\n", kept) : "Every unit you saw held its ground.";
}

    /// <summary>
    /// An order as the king reads it back: a letter in full (to whom, with what gold, its message, mandate and tablet), as it
    /// goes out with this season's orders; any other order as it describes itself.
    /// </summary>
export function inFull(o: Order): string {
  if (o.type !== "dispatch") return describe(o);
  const d = o;
  return `send ${d.envoy} to ${d.to}${(d.gold > 0 ? ` with ${d.gold} shekels` : ``)}: message "${d.letter}"; mandate ${(d.mandate.length > 0 ? `"${d.mandate}"` : `none`)}`
          + (d.proposal !== null && d.proposal !== undefined ? `; tablet to seal "${d.proposal.text}"` : ``);
}

    /// <summary>A letter the king sent, in full: when, by whom, to whom, with what gold, and its message, mandate and tablet.</summary>
export function letterLine(l: LetterView): string {
  return `turn ${l.turn}, ${l.envoyName} (${l.envoyId}) to ${l.to}${(l.gold > 0 ? `, with ${l.gold} shekels` : ``)}`
        + (l.reportedTurn !== null ? ` (his report came in turn ${l.reportedTurn})` : ` (still away)`)
        + `: message "${l.message}"; mandate ${(l.mandate.length > 0 ? `"${l.mandate}"` : `none`)}`
        + (l.tablet !== null ? `; tablet to seal "${l.tablet}"` : ``);
}

    /// <summary>
    /// After the letters a king sent from its audiences this season: the gold they carry, which the treasury it reads does not
    /// show as spent until the season's orders are checked (the letters first), or nothing if they carry none.
    /// </summary>
export function lettersGold(letters: readonly Order[]): string {
  const gold = sum(letters, o => (o.type === "dispatch" ? o.gold : 0));
  return gold > 0
            ? ` Gold already committed by these letters: ${gold} shekels, not yet taken from the treasury you read here; it is reserved first when the season's orders are checked.`
            : ``;
}

