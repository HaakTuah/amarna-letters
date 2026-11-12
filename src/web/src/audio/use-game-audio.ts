/**
 * The game screen's ear (item 19+++): tells the player the mood the state it listens to has reached (items 19+++b and
 * 19+++c: a player's seat, or a spectator's realm, followed character or drifting world), plays what
 * a newly arrived season brings, and keeps the world's bed to what the map shows. Reads only what the screen already shows: the stream of seasons
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
import type { Ears } from "./crossing.ts";
import { busiest, characterSignal, earsOf, realmOfCharacter } from "./listening.ts";
import { MoodDirector, shadeAt, signalAt, type Signal } from "./mood.ts";
import { bedAt, cuesAt } from "./situation.ts";
import { schedule, type View } from "./schedule.ts";

const NoRuins: ReadonlySet<string> = new Set();

/** At most one season's cues this often: watching at top speed, the seasons' sounds do not pile up. */
const CueGap = 1200;

/** Seconds of play, the mood's clock. */
const clock = (): number => performance.now() / 1000;

/**
 * `playing`: the viewer is a human seat of the table, hearing his own court. Otherwise he is a spectator, and hears the
 * character he follows (`following`), else the realm he watches (`viewer`), else, drifting in god view, the world
 * (item 19+++c). The cues, sounds and bed follow the viewer's eyes alone, as before.
 */
export function useGameAudio(frames: readonly SeasonFrame[], index: number, viewer: Power | null, game: string, view: () => View | null, playing = true, following: string | null = null): void {
  const cued = useRef<{ key: string; index: number; at: number } | null>(null);
  const key = `${game}:${viewer ?? "god"}`;
  const ears: Ears = earsOf(viewer, playing, following !== null);
  // What the music listens to: a change of it is a change of eyes (a spectator's music turns over calmly).
  const listening = `${key}:${ears === "character" ? following : ears}`;

  // The mood follows the state of what is watched, from a heat each season shown raises and time cools (mood.ts).
  const director = useRef(new MoodDirector());
  const heard = useRef<{ game: string; listening: string } | null>(null);
  const kept = useRef<Power | null>(null);
  useEffect(() => {
    if (frames.length === 0) {
      player.setMood("menu");
      player.setEars("own", false);
      player.setShade(0, viewer);
      return;
    }
    // What a season tells the music of what is watched: a followed character's, the realm's (or the player's), the world's.
    const read = ears === "character" ? (k: number): Signal => characterSignal(frames, k, viewer, following!) : (k: number): Signal => signalAt(frames, k, viewer);
    // A change of what the spectator watches never cuts a piece: it plays on, or at most 45 s to a phrase end.
    const before = heard.current;
    if (before !== null && before.game === game && before.listening !== listening) player.turnOver();
    heard.current = { game, listening };
    director.current.season(frames, index, viewer, listening, clock(), read);
    player.setEars(ears, ears !== "own" && director.current.clear(clock()));
    player.setMood(director.current.at(clock()));
    // Darker as the situation worsens, brighter as it improves; the fallback plays in a court's home mode: the player's
    // own, the followed character's realm, the watched realm, or, drifting, that of the realm doing the most.
    kept.current = ears === "world" ? busiest(frames, index, kept.current) : null;
    const court = ears === "character" ? (realmOfCharacter(frames[index], viewer, following!) ?? viewer) : ears === "world" ? kept.current : viewer;
    player.setShade(shadeAt(frames, index, viewer, read), court);
  }, [frames.length, index, listening]);

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

  const earsNow = useRef<Ears>(ears);
  earsNow.current = ears;
  const shown = useRef<{ frames: readonly SeasonFrame[]; index: number }>({ frames, index });
  shown.current = { frames, index };
  useEffect(() => {
    const t = window.setInterval(() => {
      const v = view();
      const { frames: fs, index: i } = shown.current;
      // The heat cools and the hold runs out between seasons too.
      if (fs.length > 0) {
        player.setMood(director.current.at(clock()));
        player.setEars(earsNow.current, earsNow.current !== "own" && director.current.clear(clock()));
      }
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
      player.setEars("own", false);
      player.setShade(0, null);
      player.setBed(null);
    },
    [],
  );
}
