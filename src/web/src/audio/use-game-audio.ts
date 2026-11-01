/**
 * The game screen's ear (item 19+++): tells the player the mood of the season shown, plays what a newly arrived season
 * brings, and keeps the world's bed to what the map shows. Reads only what the screen already shows.
 */
import type { Power } from "@amarna/engine";
import { useEffect, useRef } from "react";
import { city } from "../map/features.ts";
import type { SeasonFrame } from "../session/frames.ts";
import { player } from "./player.ts";
import { Width } from "../map/art.ts";
import { bedAt, cuesAt, hearing, moodAt, shadeAt } from "./situation.ts";

interface View {
  at: { x: number; y: number };
  zoom: number;
}

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
      const v = view();
      c.sounds.forEach((s, i) => {
        // A sound placed on the map is heard by zoom and nearness; a court's own sound always.
        const h = hearing(s.at === null ? null : city(s.at), v, Width);
        if (h.gain > 0.02) player.play(s.name, (c.sting !== null ? 2.5 : 0) + i * 0.55, h);
      });
      cued.current = { key, index, at: now };
    } else if (last === null || last.key !== key || index !== last.index) {
      cued.current = { key, index, at: last !== null && index === last.index + 1 ? last.at : now - CueGap };
    }
  }, [index, key, frames.length]);

  const shown = useRef<SeasonFrame | undefined>(undefined);
  shown.current = frames[index];
  useEffect(() => {
    const t = window.setInterval(() => {
      const v = view();
      player.setBed(bedAt(shown.current, v?.at ?? null, v?.zoom ?? 1, viewer, city));
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
