/**
 * A model king's private record of earlier seasons, all of it in its own words: the notes, audiences and orders of the last
 * three seasons it gave orders, the last season's notes in full and the two before by their opening words (item 6b: "the
 * journal folding older notes"); its own summary of the seasons before those, which it rewrites in its replies when it
 * chooses; and its ledger of dealings, one line per court, carried in full, which it writes with its orders or at an
 * audience. Nothing in it is reworded by anyone else: the king that reads it wrote all of it.
 */
import { AllPowers, MaxSpeech, cap, describe, trim, type LedgerLine, type Power, type TurnSubmission } from "@amarna/engine";
import { Sb, joinS } from "./text.ts";

interface Season {
  turn: number;
  notes: string;
  orders: string[];
  audiences: string[];
}

interface HeldAudience {
  turn: number;
  who: string;
  speech: string;
  sent: string[];
}

export class LeaderJournal {
  /** A season's notes are kept up to this many characters (the schema says so); longer notes are cut. */
  static readonly NotesMax = 2000;
  /** The king's summary is kept up to this many characters. */
  static readonly SummaryMax = 2000;
  /** A line of the ledger is kept up to this many characters. */
  static readonly LedgerEntryMax = 600;
  /** The seasons an orders request shows in full; older ones leave the record. */
  static readonly SeasonsShown = 3;
  /** The seasons whose notes an audience request shows. */
  static readonly SeasonsShownAtAudience = 2;
  /** Notes older than the last season's are folded to this many characters, their opening words, until they leave. */
  static readonly FoldedNotes = 400;

  private readonly seasons: Season[] = [];
  private readonly audiences: HeldAudience[] = [];
  private summary = "";
  private summaryTurn = 0;
  private leftThrough = 0;
  private readonly ledger = new Map<Power, [string, number]>();
  /** The tablets it has read in full in an orders request it answered: later requests show them by their opening words. */
  private readonly read = new Set<string>();

  /** The tablets the king has read in full at earlier orders. */
  get tabletsRead(): ReadonlySet<string> {
    return this.read;
  }

  /** The tablets an orders request it answered showed it (in full or by their opening words). */
  readTablets(ids: Iterable<string>): void {
    for (const id of ids) this.read.add(id);
  }

  /**
   * An audience the king held: what it said to whose envoy, and the letters it sent from it (while its orders stood). It
   * joins the record with the next orders it gives; until then its later audiences show it.
   */
  audience(turn: number, from: Power, envoy: string, speech: string, sent: Iterable<string> | null = null): void {
    this.audiences.push({ turn, who: `${from}'s envoy ${envoy}`, speech, sent: sent === null ? [] : [...sent] });
  }

  /** One audience as the record shows it: whose envoy, what the king said, and the letters it gave there. */
  private static audienceLine(a: HeldAudience, season: number | null): string {
    return (
      `${a.who}${a.turn === season ? "" : ` (turn ${a.turn})`}: you said "${cap(a.speech, MaxSpeech)}"` +
      (a.sent.length > 0 ? `; letters you gave at the audience: ${joinS("; ", a.sent)}` : "")
    );
  }

  /**
   * The king's reply to an orders request: its notes (cut at NotesMax), the audiences since its last orders and its orders
   * join the record, and the oldest season leaves it once more than SeasonsShown are kept. A summary it wrote replaces the
   * one before; an empty one keeps it. Each ledger line replaces that court's line, and an empty one removes it.
   */
  record(turn: number, sub: TurnSubmission): void {
    // An audience held in an earlier season (its orders call then failed) is marked with its own season.
    const audiences = this.audiences.map((a) => LeaderJournal.audienceLine(a, turn));
    this.audiences.length = 0;
    this.seasons.push({ turn, notes: cap(trim(sub.notes), LeaderJournal.NotesMax), orders: sub.orders.map(describe), audiences });
    while (this.seasons.length > LeaderJournal.SeasonsShown) {
      this.leftThrough = this.seasons[0].turn;
      this.seasons.shift();
    }
    const summary = trim(sub.summary);
    if (summary.length > 0) {
      this.summary = cap(summary, LeaderJournal.SummaryMax);
      this.summaryTurn = turn;
    }
    this.write(turn, sub.ledger);
  }

  /** Lines of the ledger the king wrote in an audience reply, as in its orders. */
  writeLedger(turn: number, lines: Iterable<LedgerLine>): void {
    this.write(turn, lines);
  }

  private write(turn: number, lines: Iterable<LedgerLine>): void {
    for (const line of lines) {
      const entry = trim(line.entry);
      if (entry.length > 0) this.ledger.set(line.court, [cap(entry, LeaderJournal.LedgerEntryMax), turn]);
      else this.ledger.delete(line.court);
    }
  }

  /** What an orders request shows: the ledger in full, then the record. */
  forOrders(): string {
    const sb = new Sb();
    this.writeLedgerText(sb);
    if (this.seasons.length === 0) return sb.append("YOUR RECORD OF EARLIER SEASONS: none yet; these are the first orders you give.").toString();
    sb.appendLine("YOUR RECORD OF EARLIER SEASONS (yours alone: nobody else ever reads it):");
    this.writeSummary(sb);
    const last = this.seasons[this.seasons.length - 1];
    for (const s of this.seasons) {
      sb.appendLine(`turn ${s.turn} notes${s === last ? "" : ", folded"}: ${s.notes.length > 0 ? (s === last ? s.notes : LeaderJournal.fold(s.notes)) : "none"}`);
      if (s.audiences.length > 0) sb.appendLine(`turn ${s.turn} audiences: ${joinS("; ", s.audiences)}`);
      sb.appendLine(`turn ${s.turn} orders: ${s.orders.length > 0 ? joinS("; ", s.orders) : "none"}`);
    }
    if (this.seasons.length === LeaderJournal.SeasonsShown)
      sb.appendLine(`Your notes from turn ${this.seasons[0].turn} leave this record after this season; keep what you need in your summary.`);
    return sb.toString();
  }

  /** What an audience request shows: the ledger, the summary, the notes of the last two seasons, and audiences since. */
  forAudience(): string {
    const sb = new Sb();
    this.writeLedgerText(sb);
    if (this.seasons.length === 0 && this.audiences.length === 0) return sb.append("YOUR RECORD OF EARLIER SEASONS: none yet.").toString();
    if (this.seasons.length === 0) sb.appendLine("YOUR RECORD OF EARLIER SEASONS: none yet.");
    else {
      sb.appendLine("YOUR RECORD OF EARLIER SEASONS (yours alone: nobody else ever reads it):");
      this.writeSummary(sb);
      const last = this.seasons[this.seasons.length - 1];
      for (const s of this.seasons.slice(Math.max(0, this.seasons.length - LeaderJournal.SeasonsShownAtAudience)))
        sb.appendLine(`turn ${s.turn} notes${s === last ? "" : ", folded"}: ${s.notes.length > 0 ? (s === last ? s.notes : LeaderJournal.fold(s.notes)) : "none"}`);
    }
    if (this.audiences.length > 0)
      sb.appendLine("AUDIENCES YOU HAVE HELD SINCE YOU LAST GAVE ORDERS: " + joinS("; ", this.audiences.map((a) => LeaderJournal.audienceLine(a, null))));
    return sb.toString();
  }

  /** Older notes by their opening words, cut at a word with "…" ("the journal folding older notes"). */
  static fold(notes: string): string {
    if (notes.length <= LeaderJournal.FoldedNotes) return notes;
    const cut = notes.slice(0, LeaderJournal.FoldedNotes);
    const space = cut.lastIndexOf(" ");
    return `${trim(space > LeaderJournal.FoldedNotes / 2 ? cut.slice(0, space) : cut)}…`;
  }

  private writeSummary(sb: Sb): void {
    if (this.summary.length > 0) sb.appendLine(`YOUR SUMMARY OF EARLIER SEASONS (your own words, turn ${this.summaryTurn}): ${this.summary}`);
    else if (this.leftThrough > 0)
      sb.appendLine(`YOUR SUMMARY OF EARLIER SEASONS: you have written none, and your notes from turn ${this.leftThrough} and before have left this record.`);
  }

  /** The ledger, one line per court in the fixed order of the powers, each with the season it was last written. */
  private writeLedgerText(sb: Sb): void {
    const head = "YOUR LEDGER OF DEALINGS (your own words, per court: what was promised, sealed, broken and paid; each line with the season you last wrote it)";
    if (this.ledger.size === 0) {
      sb.appendLine(head + ": nothing written yet.");
      return;
    }
    sb.appendLine(head + ":");
    for (const p of AllPowers.filter((p) => this.ledger.has(p))) sb.appendLine(`- ${p} (turn ${this.ledger.get(p)![1]}): ${this.ledger.get(p)![0]}`);
  }
}
