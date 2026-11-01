/**
 * A map that remembers, and life from the simulation (build order item 19, "The look, in time"): battlefields keep a small
 * memorial mark; a sacked city stays in ruins until its people's hardship has faded; land with no ruler, or where a band
 * works, looks wild; a countryside that went short shows its empty granaries; caravans and the people carried off are on
 * the roads; and the moments that matter play as small scenes. All of it read from the frames, as the viewer
 * could know it: in god view as it was; in a seat view only what its own eyes saw (its sight as each season began) or what
 * happened in its own land, as the fog of war is read.
 */
import { WorldMap, type Power } from "@amarna/engine";
import { knownRuins, seesNow } from "./known.ts";
import { frameAt } from "./scene.ts";
import { isMove, ownerOf, type FrameRoad, type SeasonFrame } from "../session/frames.ts";

const Map_ = WorldMap.default;

/** What the map remembers and the life on it, as one viewer knows them. */
export interface Remembered {
  /** Battlefields: each province where the viewer saw a battle, with how many and the season of the last. */
  memorials: Map<string, { count: number; last: number }>;
  /** Cities in ruins: sacked, and their people's hardship not yet faded. */
  ruins: Set<string>;
  /** Land gone wild: no ruler holds it, or a band works it. */
  wild: Set<string>;
  /** Countrysides that went short last season, with how well they ate (thousandths): the viewer's own (all in god view). */
  famine: Map<string, number>;
  /** Towns, by their people: settled now, and a year ago: the viewer's own (all in god view). */
  towns: Map<string, { now: number; before: number }>;
  caravans: FrameRoad[];
  walking: FrameRoad[];
}

/** A countryside that ate less than this, in thousandths of its need, shows a famine (presentation's threshold). */
export const FamineBelow = 800;

/** Did the viewer see a battle there that season: a march into troops standing where it could see them as the season began. */
function battlesOf(frames: readonly SeasonFrame[], j: number, viewer: Power | null): string[] {
  const f = frameAt(frames, j);
  const prev = frameAt(frames, j - 1);
  const seen = viewer === null ? f.moves : (f.seenBy.get(viewer) ?? []).map((i) => f.moves[i]);
  const sight = viewer === null ? null : (prev.sight.get(viewer) ?? new Set<string>());
  const out: string[] = [];
  for (const m of seen) {
    if (m.order !== "move" || m.target === null) continue;
    const t = m.target;
    if (sight !== null && !sight.has(t)) continue;
    const met = prev.units.some((u) => u.province === t && u.power !== m.power && !seen.some((x) => isMove(x) && x.succeeded && x.from === t && x.power === u.power && x.kind === u.kind));
    if (met) out.push(t);
  }
  return out;
}


/**
 * Each season's battles and sacks as a viewer knew them, kept with the season's frame: a frame never changes once taken,
 * so stepping the timeline reckons only the seasons it has not met before.
 */
const seasonMemory = new WeakMap<SeasonFrame, Map<Power | null, { battles: string[] }>>();
function memoryOfSeason(frames: readonly SeasonFrame[], j: number, viewer: Power | null): { battles: string[] } {
  const f = frameAt(frames, j);
  let byViewer = seasonMemory.get(f);
  if (byViewer === undefined) seasonMemory.set(f, (byViewer = new Map()));
  let m = byViewer.get(viewer);
  if (m === undefined) byViewer.set(viewer, (m = { battles: battlesOf(frames, j, viewer) }));
  return m;
}

export function remember(frames: readonly SeasonFrame[], index: number, viewer: Power | null, bandsAt: ReadonlySet<string>): Remembered {
  const f = frameAt(frames, index);
  const memorials = new Map<string, { count: number; last: number }>();
  for (let j = 1; j <= index; j++) {
    const season = memoryOfSeason(frames, j, viewer);
    for (const t of season.battles) {
      const m = memorials.get(t);
      memorials.set(t, { count: (m?.count ?? 0) + 1, last: j });
    }
  }
  // What the viewer knows now: its own land by its own record and what it sees (all of it in god view), never by the true
  // owner; and the cities in ruins as it knows them, by the rule the ear uses too (map/known.ts).
  const sees = (id: string): boolean => seesNow(f, viewer, id);
  const ruins = frames.length > 0 ? knownRuins(frames, Math.min(Math.max(index, 0), frames.length - 1), viewer) : new Set<string>();
  const wild = new Set<string>();
  const famine = new Map<string, number>();
  const towns = new Map<string, { now: number; before: number }>();
  const yearAgo = frameAt(frames, Math.max(0, index - 3));
  // A court counts only its own people and how they ate, as the engine's view tells it (every province in god view).
  const counts = (id: string): boolean => viewer === null || ownerOf(f, id) === viewer;
  for (const p of Map_.landProvinces) {
    if (!sees(p.id)) continue;
    // No ruler, as far as it knows (in its sight that is the truth).
    if ((viewer === null ? ownerOf(f, p.id) : (f.knownOwner.get(viewer)?.get(p.id)?.owner ?? null)) === null || bandsAt.has(p.id)) wild.add(p.id);
    if (!counts(p.id)) continue;
    const fed = f.fed.get(p.id);
    if (fed !== undefined && fed < FamineBelow) famine.set(p.id, fed);
    const now = f.settled.get(p.id) ?? 0;
    if (now > 0) towns.set(p.id, { now, before: yearAgo.settled.get(p.id) ?? now });
  }
  // A court knows its own caravans, as the engine's view tells it; deportees on a road it sees.
  const caravans = viewer === null ? f.caravans : f.caravans.filter((r) => r.power === viewer);
  // Deportees only on a road in its sight: people led out of a city it still believes its own would tell it of the loss.
  const inSight = (id: string): boolean => viewer === null || (f.sight.get(viewer)?.has(id) ?? false);
  const walking = f.walking.filter((r) => inSight(r.from) || inSight(r.to));
  return { memorials, ruins, wild, famine, towns, caravans, walking };
}
