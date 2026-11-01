/**
 * What a viewer knows of the cities sacked: one rule for the map and the ear (Haakon, 1 November 2026: "a city burned
 * seasons ago that you still believe is buzzing"; the sound lane, docs/rounds/2026-11-01-sound-lane.md). Read only from
 * the viewer's own record in the frames (the events it was shown, its sight, its dated word of each city's holder),
 * never from the true owner or the true unrest, except in god view, which sees as it is. Pure, tested without a browser.
 */
import { WorldMap, type Power } from "@amarna/engine";
import type { SeasonFrame } from "../session/frames.ts";

const Board = WorldMap.default;

/** The city an event's words name as sacked ("... sacked Name."), or null. */
export function sackedCity(text: string): string | null {
  return Board.find(/sacked (.+)\.$/u.exec(text)?.[1] ?? null)?.id ?? null;
}

/** Each season's sacks, read once: a frame never changes once taken, and the map rebuilds its scene often. */
const sacksIn = new WeakMap<SeasonFrame, { id: string; shown: readonly Power[] }[]>();
function sacksOf(f: SeasonFrame): { id: string; shown: readonly Power[] }[] {
  let out = sacksIn.get(f);
  if (out === undefined) {
    out = [];
    for (const e of f.events) {
      const id = e.kind === "sack" ? sackedCity(e.text) : null;
      if (id !== null) out.push({ id, shown: e.visibleTo });
    }
    sacksIn.set(f, out);
  }
  return out;
}

/** The cities sacked in a season (frame `j`) that the viewer knew of as it happened: shown it, or the city in its sight. */
export function sacksSeen(frames: readonly SeasonFrame[], j: number, viewer: Power | null): string[] {
  const f = frames[j];
  if (f === undefined) return [];
  return sacksOf(f)
    .filter((x) => viewer === null || x.shown.includes(viewer) || (frames[j - 1]?.sight.get(viewer)?.has(x.id) ?? false))
    .map((x) => x.id);
}

/**
 * The cities in ruins as the viewer knows them (the truth in god view): a sack counts from the season the viewer learns of
 * it, by being shown it, by having the city in sight as it happened, or by word of the city dated after it (its known
 * owner's season, as the map's dated knowledge gives it: Haakon, 1 November 2026, "a city burned seasons ago that you
 * still believe is buzzing"); and the city is rebuilt for it only when it sees it so (its people's hardship faded, or
 * the city changed hands since), never by word of the true state.
 */
export function knownRuins(frames: readonly SeasonFrame[], index: number, viewer: Power | null): Set<string> {
  const f = frames[index];
  const out = new Set<string>();
  if (f === undefined) return out;
  // Each sack the viewer knows of by now, by city: the frame it happened in.
  const sacked = new Map<string, number>();
  for (let j = 1; j <= index; j++) {
    for (const id of sacksSeen(frames, j, viewer)) sacked.set(id, j);
    if (viewer === null) continue;
    // Not seen as it happened: known once word of the city dating from after the sack has reached it.
    for (const { id } of sacksOf(frames[j])) {
      if (sacked.get(id) === j) continue;
      for (let k = j; k <= index; k++)
        if ((frames[k].knownOwner.get(viewer)?.get(id)?.turn ?? -1) >= frames[j].turn) {
          sacked.set(id, j);
          break;
        }
    }
  }
  for (const [id, j] of sacked) {
    const changed = (f.owner.get(id) ?? null) !== (frames[j].owner.get(id) ?? null);
    const rebuilt = (f.unrest.get(id) ?? 0) <= 0 || changed;
    // Out of its sight a city stays as it last knew it: in ruins.
    const inSight = viewer === null || (f.sight.get(viewer)?.has(id) ?? false);
    if (!(inSight && rebuilt)) out.add(id);
  }
  return out;
}

/**
 * Whether the viewer knows how a province stands now: in its sight, or its own land by its own record (who it knows holds
 * it), never by the true owner; all of it in god view.
 */
export function seesNow(f: SeasonFrame, viewer: Power | null, id: string): boolean {
  if (viewer === null) return true;
  return (f.sight.get(viewer)?.has(id) ?? false) || f.knownOwner.get(viewer)?.get(id)?.owner === viewer;
}

/**
 * The season whose figures of a province's own land (its people, how they ate, its stores, the bands its people tell of)
 * the viewer's map shows, or null for none: land it knows it holds. Where it truly holds it too, now, as the engine's
 * own view of a court shows it its provinces; where it lost it without knowing, the last season it truly held it, so
 * the town stands as it last knew it until word of the loss arrives (never vanishing the season it is lost). God view:
 * now, everywhere.
 */
export function ownFiguresAt(frames: readonly SeasonFrame[], index: number, viewer: Power | null, id: string): number | null {
  if (viewer === null) return index;
  const f = frames[index];
  if (f === undefined || f.knownOwner.get(viewer)?.get(id)?.owner !== viewer) return null;
  for (let k = index; k >= 0; k--) if ((frames[k].owner.get(id) ?? null) === viewer) return k;
  return null;
}
