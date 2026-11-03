/**
 * A mind's own words, kept season by season (item 17+++, "a mind's own words are kept and shown"; the owner, 31 October
 * 2026: "it should maybe store what it looked like at every step?"). After each season the runner asks every seat with a
 * mind of its own (a model king) for its pages as they stand: its notes, its summary of older seasons, its plan and its
 * ledger, one page a court. A page goes into the record only when its text changed since it was last kept, so a game stays
 * small; reading a mind at a season puts together each page as it last stood by then. Nobody's words are reworded here.
 */
import { I, S, obj, type ObjSchema } from "@amarna/engine";

/** One page of a mind's own words, as it stood from a season on: kept when it changed. */
export interface MindPage {
  turn: number;
  /** Whose mind: the power a king plays. */
  who: string;
  /** Which page: "notes", "summary", "plan", or "ledger:<court>". */
  page: string;
  text: string;
}

export function newMindPage(init: Partial<MindPage> = {}): MindPage {
  return { turn: 0, who: "", page: "", text: "", ...init };
}

export const MindPageSchema: ObjSchema<MindPage> = obj("MindPage", newMindPage, { turn: I, who: S, page: S, text: S });

/** The longest text a kept page may hold (a journal's notes, summary and plan are capped at 2,000; room to spare). */
const PageMost = 8000;

/**
 * A page read from a saved or shared log, checked field by field as it was written, before anything is converted
 * (SECURITY.md, point 5: anyone can craft a save): a whole season, a power's name, a known page and a text of bounded
 * length, each of its own type. Anything else fails the load cleanly.
 */
export function readMindPage(node: Readonly<Record<string, unknown>>): MindPage {
  // A power's name: one the map starts with, or a risen one named by its land and ruler ("Suhu of Yapahu 2").
  const name = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 80 && !/\p{Cc}/u.test(s);
  const { turn, who, page, text } = node;
  const ok =
    typeof turn === "number" &&
    Number.isInteger(turn) &&
    turn >= 0 &&
    name(who) &&
    typeof page === "string" &&
    (["notes", "summary", "plan"].includes(page) || (page.startsWith("ledger:") && name(page.slice(7)))) &&
    typeof text === "string" &&
    text.length <= PageMost;
  if (!ok) throw new Error("a king's own words in it are not readable");
  return newMindPage({ turn: turn as number, who: who as string, page: page as string, text: text as string });
}

/** Every mind's pages over the game, in the order kept. */
export class MindBook {
  readonly pages: MindPage[] = [];
  private readonly last = new Map<string, string>();

  /**
   * Keeps the pages that changed since they were last kept (an empty page that was never written is not kept). A page the
   * mind no longer gives (a ledger line it struck out) is kept as an empty page, so it no longer reads as standing.
   */
  keep(turn: number, who: string, pages: Readonly<Record<string, string>>): void {
    const struck = [...this.last].filter(([key, text]) => text !== "" && key.startsWith(`${who}\u0000`) && !(key.slice(who.length + 1) in pages));
    const now: Record<string, string> = { ...Object.fromEntries(struck.map(([key]) => [key.slice(who.length + 1), ""])), ...pages };
    for (const page of Object.keys(now).sort()) {
      const text = now[page];
      const key = `${who}\u0000${page}`;
      if ((this.last.get(key) ?? "") === text) continue;
      this.add(newMindPage({ turn, who, page, text }));
    }
  }

  /** A page read back from a saved record. */
  add(p: MindPage): void {
    this.last.set(`${p.who}\u0000${p.page}`, p.text);
    this.pages.push(p);
  }

  /** A mind's pages as they stood at the end of a season, each with the season it was written; blank pages left out. */
  at(who: string, turn: number): MindPage[] {
    const now = new Map<string, MindPage>();
    for (const p of this.pages) if (p.who === who && p.turn <= turn) now.set(p.page, p);
    return [...now.values()].filter((p) => p.text !== "").sort((a, b) => (a.page < b.page ? -1 : a.page > b.page ? 1 : 0));
  }

  /** The minds kept: who has a page. */
  get minds(): string[] {
    return [...new Set(this.pages.map((p) => p.who))].sort();
  }
}
