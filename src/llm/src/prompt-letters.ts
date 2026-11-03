/**
 * Tablets and letters as a king reads them in his prompt: a held tablet's line and brief, a letter's line, brief and full
 * text, and the gold his letters commit.
 */
import {
  describe,
  sum,
  trimEnd,
  conditionsText,
  type Condition,
  type LetterView,
  type Order,
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

/** An older letter in a line: when, by whom, to whom, with what gold, and its opening words. */
export function letterBrief(l: LetterView): string {
  return `turn ${l.turn}, ${l.envoyName} (${l.envoyId}) to ${l.to}${(l.gold > 0 ? `, with ${l.gold} shekels` : ``)} (still away): "${opening(l.message)}"${(l.tablet !== null ? `, with a tablet to seal` : ``)}`;
}

/**
 * A battle report without the units that held: they stand where they stood, as the map shows. A report of nothing but
 * holds keeps its first line.
 */
export function withoutHolds(body: string): string {
  // Item 17+: units are written as the reports name them ("army in Men-nefer holds", "Assyria: fleet in the Western Sea holds").
  const hold = /^- (?:[^:]+: )?(?:army|fleet) in [^:>]+ holds$/;
  const lines = body.split("\n");
  const first = /^(.*?:) (- (?:army|fleet) in [^:>]+ holds)$/.exec(lines[0]);
  if (first !== null && hold.test(first[2])) lines[0] = first[1];
  const kept = lines.filter((l, i) => i === 0 || !hold.test(l));
  const shown = kept.filter((l, i) => !(l === "Seen nearby:" && (i === kept.length - 1 || !kept[i + 1].startsWith("- "))));
  if (first !== null && shown.length === 1) return `${shown[0]} every unit you saw held.`;
  return joinS("\n", shown);
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

