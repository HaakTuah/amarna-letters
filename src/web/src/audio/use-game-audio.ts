/**
 * The game screen's ear (item 19+++): tells the player the mood of the season shown, plays what a newly arrived season
 * brings, and keeps the world's bed to what the map shows. Reads only what the screen already shows: the stream of seasons
 * item 17a's worker sends (`Session.frames`, one `SeasonFrame` per season, its `events`, `moves` and `news`), as a reader
 * beside the map's, never changing it.
 */
import type { Power } from "@amarna/engine";
import { useEffect, useRef } from "react";
import { city } from "../map/features.ts";
import type { SeasonFrame } from "../session/frames.ts";
import { bedLevel } from "./mix.ts";
import { player } from "./player.ts";
import { knownRuins } from "../map/known.ts";
import { bedAt, cuesAt, moodAt, shadeAt } from "./situation.ts";
import { schedule, type View } from "./schedule.ts";

const NoRuins: ReadonlySet<string> = new Set();

/** At most one season's cues this often: watching at top speed, the seasons' sounds do not pile up. */
const CueGap = 1200;

export function useGameAudio(frames: readonly SeasonFrame[], index: number, viewer: Power | null, game: string, view: () => View | null): void {
  const cued = useRef<{ key: string; index: number; at: number } | null>(null);
  const key = `${game}:${viewer ?? "god"}`;

  // The mood of the season shown, whether played live or stepped through.
  useEffect(() => {
    player.setMood(frames.length === 0 ? "menu" : moodAt(frames, index, viewer));
    // Darker as the seat's situation worsens, brighter as it improves; the fallback plays in its court's home mode.
    player.setShade(frames.length === 0 ? 0 : shadeAt(frames, index, viewer), viewer);
  }, [frames.length, index, key]);

  useEffect(() => {
    const last = cued.current;
    const now = performance.now();
    // Only a season that has just arrived after the one heard before it, never a jump or a change of eyes.
    if (last !== null && last.key === key && index === last.index + 1 && now - last.at >= CueGap) {
      const c = cuesAt(frames, index, viewer);
      player.cue(c.moment, c.sting);
      schedule(c, view(), now - last.at).forEach((p) => player.play(p.name, p.delay, p.heard, p.layer));
      cued.current = { key, index, at: now };
    } else if (last === null || last.key !== key || index !== last.index) {
      cued.current = { key, index, at: last !== null && index === last.index + 1 ? last.at : now - CueGap };
    }
  }, [index, key, frames.length]);

  const shown = useRef<{ frames: readonly SeasonFrame[]; index: number }>({ frames, index });
  shown.current = { frames, index };
  useEffect(() => {
    const t = window.setInterval(() => {
      const v = view();
      const { frames: fs, index: i } = shown.current;
      // A town sounds as the viewer knows it: in ruins only once it has learned of the sack.
      const at = Math.min(i, fs.length - 1);
      const ruins = at >= 0 && v !== null && v.zoom >= 4 ? knownRuins(fs, at, viewer) : NoRuins;
      // The bed is a world sound: heard only zoomed in, rising with the zoom.
      player.setBed(bedAt(fs[at], v?.at ?? null, v?.zoom ?? 1, viewer, city, ruins), false, bedLevel(v?.zoom ?? 1));
    }, 2000);
    return () => window.clearInterval(t);
  }, [viewer]);

  // Leaving the game: the first screen's music, and no bed.
  useEffect(
    () => () => {
      player.setMood("menu");
      player.setShade(0, null);
      player.setBed(null);
    },
    [],
  );
}
