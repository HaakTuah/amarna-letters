/**
 * When and where a season's sounds are heard (item 19+++, fed by item 17a's stream of events): pure, so it is tested
 * without a browser. How audio subscribes to the stream: `docs/design/45-the-music-and-the-sounds.md`, "Fed by the stream".
 */
import { WorldMap } from "@amarna/engine";
import { city } from "../map/features.ts";
import { Width } from "../map/art.ts";
import type { Layer } from "./mix.ts";
import { hearing, type Cues, type Hearing, type SoundName } from "./situation.ts";

const Board = WorldMap.default;

/** Where the map looks: its centre on the board and its zoom. */
export interface View {
  at: { x: number; y: number };
  zoom: number;
}

/** The most of the map's placed sounds heard in one season, the loudest (nearest) first, so a crowded view stays clear. */
export const MapHeard = 4;

/** The least gap between two sounds' starts, in seconds. */
export const Apart = 0.26;

export interface Scheduled {
  name: SoundName;
  /** Seconds from now. */
  delay: number;
  heard: Hearing;
  /** The seat's own event sounds, or the world's sounds placed on the map. */
  layer: Layer;
}

/**
 * When and how each of a season's sounds is heard (item 19+++ fed by 17a's stream): each at its moment in the season,
 * spread over most of the time the season is shown (`gap`, the milliseconds since the season before arrived, so faster
 * play packs them closer), after the sting where there is one; the court's own sounds always, the map's placed sounds
 * only where the view hears them, the nearest few. Never two starting together: at least a quarter second apart
 * (a little more, so the player's same-sound guard of a quarter second never drops the second).
 */
export function schedule(c: Cues, v: View | null, gap: number): Scheduled[] {
  const spread = Math.min(3, Math.max(1, (gap / 1000) * 0.75));
  const lead = c.sting !== null ? 2.5 : 0;
  const out: Scheduled[] = [];
  for (const s of c.sounds) {
    // A sound placed on the map is heard by zoom and nearness; a court's own sound always.
    const h = hearing(s.at === null ? null : city(s.at), v, Width);
    if (h.gain > 0.02) out.push({ name: s.name, delay: lead + s.t * spread, heard: h, layer: "event" });
  }
  const near = c.map
    .filter((s) => s.at !== null && Board.exists(s.at))
    .map((s) => ({ s, h: hearing(city(s.at!), v, Width) }))
    .filter((x) => x.h.gain > 0.02)
    .sort((a, b) => b.h.gain - a.h.gain)
    .slice(0, MapHeard);
  for (const { s, h } of near) out.push({ name: s.name, delay: lead + s.t * spread, heard: h, layer: "world" });
  out.sort((a, b) => a.delay - b.delay);
  for (let i = 1; i < out.length; i++) out[i].delay = Math.max(out[i].delay, out[i - 1].delay + Apart);
  return out;
}
