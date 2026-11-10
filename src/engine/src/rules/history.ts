/**
 * History buttons ("History, search and names" under Spectator mode, build order item 17+++b): the ledger of any
 * province, realm, title or person, its events in order, each dated and with its cause as the record words it, as one
 * court learned them (the events its court saw, as word of them reached it, never what it could not know: not even its own
 * land's changes of hand before the news comes, as the seat view's map waits for it), or the whole record (`viewer` null: god
 * view, and every seat once the game ends and the record opens). Read from the record of items 14 and 17a; nothing here
 * is read by the engine, a seat's view or a request.
 */
import { characterLegend, changes, courtLegend, wordIn, type LegendLine } from "./legends.ts";
import { cmpNum, sortBy } from "../core/seq.ts";
import { ownLand, powerName, type Power } from "../model/power.ts";
import type { GameEvent } from "../model/records.ts";
import type { GameState } from "../model/state.ts";
import { WorldMap } from "../model/map.ts";

/** What has a history: a province by its id, a realm by its power, a title by its name, a person by their id. */
export type HistoryKind = "province" | "realm" | "title" | "person";

/** The events that make or unmake a title: a name claimed or recognised, a crown passed on, a realm fallen or risen. */
const TitleKinds: ReadonlySet<string> = new Set(["recognition", "crown", "fall", "rise", "rising"]);

const seen = (e: GameEvent, viewer: Power | null): boolean => viewer === null || e.visibleTo.includes(viewer);
const line = (turn: number, text: string, province: string | null = null): LegendLine => ({ turn, text, province });

/** The names the record may call a realm by: its own land's, the name a player reads, and its id. */
export const realmNames = (p: Power): string[] => [...new Set([ownLand(p), powerName(p), p])];

/** An entity's history, oldest first, one line per fact (a line the same season says word for word is shown once). */
export function historyOf(s: GameState, kind: HistoryKind, id: string, viewer: Power | null): LegendLine[] {
  const out: LegendLine[] =
    kind === "person" ? characterLegend(s, id, viewer) : kind === "province" ? provinceLines(s, id, viewer) : kind === "realm" ? realmLines(s, id, viewer) : titleLines(s, id, viewer);
  const lines = new Set<string>();
  return sortBy(out, [(l: LegendLine) => l.turn, cmpNum]).filter((l) => (lines.has(`${l.turn}|${l.text}`) ? false : (lines.add(`${l.turn}|${l.text}`), true)));
}

/** A province: who held it and how it changed hands and its fall as a capital (the record), and every event that names it. */
function provinceLines(s: GameState, id: string, viewer: Power | null): LegendLine[] {
  if (!WorldMap.default.exists(id)) return [];
  const name = WorldMap.default.get(id).name;
  const out: LegendLine[] = [];
  // The holders' log is the record's; a court learns how land changed hands only as news, which the events below carry.
  for (const m of viewer === null ? changes(s) : []) {
    if (m.province !== id) continue;
    const to = m.to !== null ? powerName(m.to) : null;
    const from = m.from !== null ? powerName(m.from) : null;
    out.push(line(m.turn, m.ceded ? `Ceded by ${from} to ${to}.` : to !== null ? `Taken by ${to}${from !== null ? ` from ${from}` : ", which no one held"}.` : `Fell lawless, lost by ${from}.`, id));
  }
  for (const f of viewer === null ? s.falls : []) if (f.capital === id) out.push(line(f.turn, `Fell as ${powerName(f.power)}'s capital${f.conqueror !== null ? `, taken by ${powerName(f.conqueror)}` : ""}.`, id));
  for (const e of s.events) if (seen(e, viewer) && wordIn(e.text, name)) out.push(line(e.turn, e.text, id));
  return out;
}

/** A realm: its rise and fall (the record), and every event that names it. */
function realmLines(s: GameState, p: Power, viewer: Power | null): LegendLine[] {
  // The legend reads the holders' log and the falls at once; a court, its own included, reads them as news.
  const out: LegendLine[] = viewer === null ? courtLegend(s, p) : [];
  const names = realmNames(p);
  for (const e of s.events) if (seen(e, viewer) && names.some((n) => wordIn(e.text, n))) out.push(line(e.turn, e.text));
  return out;
}

/** A title (a realm's name, which any power may claim): each claim, recognition, crowning and fall that names it. */
function titleLines(s: GameState, name: string, viewer: Power | null): LegendLine[] {
  return s.events.filter((e) => TitleKinds.has(e.kind) && seen(e, viewer) && wordIn(e.text, name)).map((e) => line(e.turn, e.text));
}
