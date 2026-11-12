// The music's moods measured in script games (items 19+++b and 19+++c): for each seat and in god view, at each pace, how
// often the mood the music is asked for changes a minute and the share of time in each, and then what is heard: the
// share of the music's time in the war family (war, siege and battle pieces) and in silence, with each piece drawn by
// chance (draw.ts) and crossed or rested as the player does (crossing.ts), so the owner's ear tunes from numbers. A seat
// is heard as a player (a rise at the next phrase end) and as a spectator (a rise only for something clear); god view
// as a drifting spectator (a change only at a piece's end).
// Presentation only: the games are the script kings' own, played as the batch plays them.
//   node --experimental-strip-types --no-warnings scripts/music-moods.ts [--games 2] [--seed 1] [--cache <dir>]
// A game takes about two minutes to play; with --cache, each game's seasons are kept in <dir> and read back next time.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deserialize, serialize } from "node:v8";
import { AllPowers, Dict, isGreatKing, newGame, type Power } from "@amarna/engine";
import { GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, pressFor, type ISeat } from "@amarna/game";
import { Wait, heardMood, riseNow, type Ears } from "../src/web/src/audio/crossing.ts";
import { FamilyOf, drawPiece, ownPiece, restFor } from "../src/web/src/audio/draw.ts";
import { Manifest } from "../src/web/src/audio/manifest.ts";
import { MoodDirector } from "../src/web/src/audio/mood.ts";
import { MoodPieces, type Mood } from "../src/web/src/audio/situation.ts";
import { frameFrom, type SeasonFrame } from "../src/web/src/session/frames.ts";
import { Paces as Shown, type Pace } from "../src/web/src/session/pacing.ts";

const arg = (name: string, d: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};

/**
 * Seconds a season is on screen: Slow, Normal and Fast as they play it (its moments and the time on its result), a
 * season played by hand (about a minute), and Simulate, which runs as fast as the engine (about 0.3 s a season here).
 */
const [Slow, Normal, Fast] = Shown;
const length = (p: Pace): number => (p.season + p.close) / 1000;
const Paces: [string, number][] = [["by hand", 60], ["Slow", length(Slow)], ["Normal", length(Normal)], ["Fast", length(Fast)], ["Simulate", 0.3]].map(
  ([name, s]) => [`${name} (${s} s)`, s as number],
);
const Moods = ["calm", "tension", "war", "siege", "battle", "last"];
const Warlike = new Set(["war", "siege", "battle"]);

async function frames(seed: number, cache: string | null): Promise<SeasonFrame[]> {
  const file = cache === null ? null : join(cache, `music-moods-${seed}.bin`);
  if (file !== null && existsSync(file)) return deserialize(readFileSync(file)) as SeasonFrame[];
  const st = newGame(seed);
  const seats = new Dict<Power, ISeat>(AllPowers.map((p) => [p, new ScriptLeader(st.seed)] as const));
  const runner = new GameRunner(pressFor(st, new ScriptMind()), seats, new ScriptMind(), new TemplateNarrator());
  runner.writeChronicles = false;
  runner.keepSnapshots = false;
  runner.tellThreads = false;
  await runner.prepare();
  const out: SeasonFrame[] = [frameFrom(runner.state, 0, null)];
  while (await runner.playTurn()) out.push(frameFrom(runner.state, out.length, out[out.length - 1]));
  out.push(frameFrom(runner.state, out.length, out[out.length - 1]));
  if (file !== null) {
    mkdirSync(cache!, { recursive: true });
    writeFileSync(file, serialize(out));
  }
  return out;
}

/** Each second of play's mood, and whether something clear is in front of the viewer, the seasons shown `gap` seconds apart. */
function heard(fs: SeasonFrame[], viewer: Power | null, gap: number): { mood: Mood; clear: boolean }[] {
  const d = new MoodDirector();
  const out: { mood: Mood; clear: boolean }[] = [];
  let t = 0;
  fs.forEach((_, i) => {
    d.season(fs, i, viewer, "g", t);
    for (const end = t + gap; t < end; t += Math.min(1, gap)) out.push({ mood: d.at(t), clear: d.clear(t) });
  });
  return out;
}

/** How long each piece plays, in seconds: the mean of its variations (the manifest's). */
const Length = new Map(Object.entries(Manifest.music as unknown as Record<string, { seconds: number }[]>).map(([id, vs]) => [id, vs.reduce((a, v) => a + v.seconds, 0) / vs.length]));

/** A seeded generator, so a run repeats. */
function dice(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * What the orchestra plays through these moods, a second at a time: the seconds in the war family's pieces, in
 * silence, and the pieces played. A rise the viewer is to hear at once crosses after half a rise's wait on average (a
 * phrase end within 8 s); otherwise each piece plays to its end, then rests, then the next is drawn.
 */
function music(timeline: { mood: Mood; clear: boolean }[], step: number, ears: Ears, roll: () => number): { war: number; quiet: number; pieces: number; atWar: number; warMood: number } {
  const out = { war: 0, quiet: 0, pieces: 0, atWar: 0, warMood: 0 };
  let piece: string | null = null;
  let drawn: Mood = "calm";
  let end = 0;
  let restUntil = 0;
  let crossAt: number | null = null;
  let last: string | null = null;
  const start = (t: number, mood: Mood, own: boolean): void => {
    piece = own ? ownPiece(mood, last, roll) : drawPiece(mood, last, roll);
    drawn = mood;
    last = piece;
    end = t + (Length.get(piece) ?? 120);
    crossAt = null;
    out.pieces++;
  };
  timeline.forEach(({ mood, clear }, i) => {
    const t = i * step;
    const turn = { ears, clear, eyes: null };
    if (piece === null) {
      if (t >= restUntil) start(t, mood, false);
    } else if (t >= end) {
      const rose = riseNow(heardMood(piece, drawn), mood, turn);
      piece = null;
      if (rose) start(t, mood, true);
      else restUntil = t + restFor(roll);
    } else if (riseNow(heardMood(piece, drawn), mood, turn)) {
      crossAt ??= t + Wait.rise / 2;
      if (t >= crossAt) start(t, mood, true);
    } else crossAt = null;
    const warMood = FamilyOf[mood] === "war";
    if (warMood) out.warMood += step;
    if (piece === null) out.quiet += step;
    else if (FamilyOf[(Object.keys(MoodPieces) as Mood[]).find((m) => MoodPieces[m].includes(piece!))!] === "war") {
      out.war += step;
      if (warMood) out.atWar += step;
    }
  });
  return out;
}

const games = arg("games", 2);
const seed = arg("seed", 1);
const at = process.argv.indexOf("--cache");
const cache = at >= 0 ? process.argv[at + 1] : null;
const tally = new Map<string, { seconds: number; changes: number; by: Map<string, number>; heard: Map<string, { war: number; quiet: number; pieces: number; seconds: number; atWar: number; warMood: number }> }>();
for (let g = 0; g < games; g++) {
  const fs = await frames(seed + g, cache);
  for (const [pace, gap] of Paces) {
    for (const viewer of [null, ...AllPowers.filter((p) => isGreatKing(p))]) {
      const timeline = heard(fs, viewer, gap);
      const moods = timeline.map((x) => x.mood);
      const step = Math.min(1, gap);
      const key = `${viewer === null ? "god view" : "a seat"} | ${pace}`;
      const t = tally.get(key) ?? { seconds: 0, changes: 0, by: new Map(), heard: new Map() };
      // What is heard: god view as a drifting spectator, a seat as a player and as a spectator of that realm.
      for (const ears of (viewer === null ? ["world"] : ["own", "realm"]) as Ears[]) {
        const m = music(timeline, step, ears, dice(seed * 1000 + g * 10 + AllPowers.indexOf(viewer ?? "Egypt")));
        const h = t.heard.get(ears) ?? { war: 0, quiet: 0, pieces: 0, seconds: 0, atWar: 0, warMood: 0 };
        h.war += m.war;
        h.quiet += m.quiet;
        h.pieces += m.pieces;
        h.atWar += m.atWar;
        h.warMood += m.warMood;
        h.seconds += timeline.length * step;
        t.heard.set(ears, h);
      }
      t.seconds += moods.length * step;
      t.changes += moods.filter((m, i) => i > 0 && moods[i - 1] !== m).length;
      for (const m of moods) t.by.set(m, (t.by.get(m) ?? 0) + step);
      tally.set(key, t);
    }
  }
  console.log(`game ${seed + g}: ${fs.length} seasons`);
}
console.log(`\n| Who, pace | changes a minute | ${Moods.join(" | ")} | war family | heard as | war pieces | war pieces while the mood is war | silence | pieces a minute |`);
console.log(`| --- | --- | ${Moods.map(() => "---").join(" | ")} | --- | --- | --- | --- | --- | --- |`);
for (const [key, t] of tally) {
  const share = (m: string): string => `${Math.round((100 * (t.by.get(m) ?? 0)) / t.seconds)}%`;
  const war = [...t.by].filter(([m]) => Warlike.has(m)).reduce((a, [, s]) => a + s, 0);
  for (const [ears, h] of t.heard)
    console.log(`| ${key} | ${((60 * t.changes) / t.seconds).toFixed(2)} | ${Moods.map(share).join(" | ")} | ${Math.round((100 * war) / t.seconds)}% | ${ears === "world" ? "a spectator drifting" : ears === "own" ? "a player" : "a spectator of the realm"} | ${Math.round((100 * h.war) / h.seconds)}% | ${Math.round((100 * h.atWar) / Math.max(1, h.warMood))}% | ${Math.round((100 * h.quiet) / h.seconds)}% | ${((60 * h.pieces) / h.seconds).toFixed(2)} |`);
}
