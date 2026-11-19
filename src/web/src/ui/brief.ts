/**
 * The season brief on the screen (item 18b, "Four questions, in order": what happened to me?): the engine's lines
 * (`seasonBrief`), the same and in the same order as the seat's request gives them, each with its own icon and word as well
 * as its colour ("Readable by every player"), and where a tap takes the player: the place on the map, and the tab and
 * section that answer it.
 */
import { seasonBrief, type BriefAnswer, type BriefKind, type SeatView } from "@amarna/engine";

export interface BriefRow {
  kind: BriefKind;
  /** The line as the engine words it; the page shows it in the player's names (`shown`). */
  text: string;
  icon: string;
  /** The kind in a word, for those who do not see the icon. */
  label: string;
  at: string | null;
  /** The tab that answers it, and the section of the orders it scrolls to (null: the tab's top). */
  tab: "orders" | "inbox";
  section: string | null;
}

const Look: Record<BriefKind, { icon: string; label: string }> = {
  Threat: { icon: "⚠", label: "Threat" },
  Battle: { icon: "⚔", label: "Battle" },
  Word: { icon: "✉", label: "Word" },
  Promise: { icon: "⚖", label: "Promise" },
  Errand: { icon: "↩", label: "Errand" },
  Short: { icon: "▾", label: "Running short" },
};

const Answers: Record<BriefAnswer, { tab: "orders" | "inbox"; section: string | null }> = {
  Troops: { tab: "orders", section: "orders-troops" },
  Court: { tab: "orders", section: "orders-court" },
  Treasury: { tab: "orders", section: "orders-treasury" },
  News: { tab: "inbox", section: null },
};

export function briefRows(v: SeatView): BriefRow[] {
  return seasonBrief(v).map((l) => ({ kind: l.kind, text: l.text, ...Look[l.kind], at: l.at, ...Answers[l.answer] }));
}
