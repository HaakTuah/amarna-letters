// The music's moods measured in script games (item 19+++b): for each seat and in god view, at each pace, how often the
// mood the music is asked for changes a minute and the share of time in each, so the owner's ear tunes from numbers.
// Presentation only: the games are the script kings' own, played as the batch plays them.
//   node --experimental-strip-types --no-warnings scripts/music-moods.ts [--games 2] [--seed 1] [--cache <dir>]
// A game takes about two minutes to play; with --cache, each game's seasons are kept in <dir> and read back next time.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deserialize, serialize } from "node:v8";
import { AllPowers, Dict, isGreatKing, newGame, type Power } from "@amarna/engine";
import { GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, pressFor, type ISeat } from "@amarna/game";
import { MoodDirector } from "../src/web/src/audio/mood.ts";
import { frameFrom, type SeasonFrame } from "../src/web/src/session/frames.ts";

const arg = (name: string, d: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};

/** Seconds a season is on screen: the paces of `session/pacing.ts` (Slow, Normal, Fast), Simulate, and one played by hand. */
const Paces: [string, number][] = [["by hand (60 s)", 60], ["Slow (15 s)", 15], ["Normal (6 s)", 6], ["Fast (1 s)", 1], ["Simulate (0.3 s)", 0.3]];
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

/** Each second of play's mood, the seasons shown `gap` seconds apart. */
function heard(fs: SeasonFrame[], viewer: Power | null, gap: number): string[] {
  const d = new MoodDirector();
  const out: string[] = [];
  let t = 0;
  fs.forEach((_, i) => {
    d.season(fs, i, viewer, "g", t);
    for (const end = t + gap; t < end; t += Math.min(1, gap)) out.push(d.at(t));
  });
  return out;
}

const games = arg("games", 2);
const seed = arg("seed", 1);
const at = process.argv.indexOf("--cache");
const cache = at >= 0 ? process.argv[at + 1] : null;
const tally = new Map<string, { seconds: number; changes: number; by: Map<string, number> }>();
for (let g = 0; g < games; g++) {
  const fs = await frames(seed + g, cache);
  for (const [pace, gap] of Paces) {
    for (const viewer of [null, ...AllPowers.filter((p) => isGreatKing(p))]) {
      const moods = heard(fs, viewer, gap);
      const step = Math.min(1, gap);
      const key = `${viewer === null ? "god view" : "a seat"} | ${pace}`;
      const t = tally.get(key) ?? { seconds: 0, changes: 0, by: new Map() };
      t.seconds += moods.length * step;
      t.changes += moods.filter((m, i) => i > 0 && moods[i - 1] !== m).length;
      for (const m of moods) t.by.set(m, (t.by.get(m) ?? 0) + step);
      tally.set(key, t);
    }
  }
  console.log(`game ${seed + g}: ${fs.length} seasons`);
}
console.log(`\n| Who, pace | changes a minute | ${Moods.join(" | ")} | war family |`);
console.log(`| --- | --- | ${Moods.map(() => "---").join(" | ")} | --- |`);
for (const [key, t] of tally) {
  const share = (m: string): string => `${Math.round((100 * (t.by.get(m) ?? 0)) / t.seconds)}%`;
  const war = [...t.by].filter(([m]) => Warlike.has(m)).reduce((a, [, s]) => a + s, 0);
  console.log(`| ${key} | ${((60 * t.changes) / t.seconds).toFixed(2)} | ${Moods.map(share).join(" | ")} | ${Math.round((100 * war) / t.seconds)}% |`);
}
