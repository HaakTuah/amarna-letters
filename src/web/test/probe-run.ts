/**
 * The probe as a plain script, for a CPU profile with the engine's names (item 17a):
 *   node --cpu-prof --cpu-prof-dir=<dir> node_modules/vite-node/vite-node.mjs src/web/test/probe-run.ts [seasons] [seed]
 * Plays a Free game of script kings as the web app does, taking a frame and a snapshot after every season.
 */
import { newGame } from "@amarna/engine";
import { GameRunner } from "@amarna/game";
import { buildSeats, Presets } from "@amarna/llm";
import { SnapshotHistory } from "@amarna/game";
import { framesSince, type SeasonFrame } from "../src/session/frames.ts";
import { IncrementalReader } from "../src/session/incremental.ts";
import { redactForPage } from "../src/session/core.ts";
import { choicesOf, newSettings, toConfig, withChoices } from "../src/session/settings.ts";

const seasons = Number(process.argv[2] ?? "30");
const settings = { ...newSettings(), seed: Number(process.argv[3] ?? "1") };
const c = choicesOf(settings);
Presets.Free.applyTo(c);
const s = withChoices(settings, c);
const state = newGame(s.seed, toConfig(s));
let runner: GameRunner | null = null;
const built = buildSeats(choicesOf(s), state, null, () => runner!.log);
runner = new GameRunner(state, built.seats, built.minds, built.narrator, { jobs: choicesOf(s).jobs });
runner.writeChronicles = false;
runner.snapshots.redact = redactForPage;
// The page's side too, as the web app reads the stream: the history of pieces and the incremental reader.
const history = new SnapshotHistory();
const reader = new IncrementalReader();
let readerMs = 0;
let last: SeasonFrame | null = null;
let taken = 0;
const r = runner;
runner.changed.push(() => {
  const fresh = framesSince(taken, last, r);
  taken += fresh.length;
  if (fresh.length > 0) last = fresh[fresh.length - 1];
});
const t0 = performance.now();
await runner.prepare();
const readNow = (): void => {
  for (const d of runner!.snapshots.takeDeltas()) history.apply(d);
  const a = performance.now();
  reader.apply(history.refs(history.length - 1)!, history.texts);
  readerMs += performance.now() - a;
};
readNow();
for (let i = 0; i < seasons && !runner.state.ended; i++) {
  await runner.playTurn();
  readNow();
}
console.log(`${runner.state.turn} seasons in ${((performance.now() - t0) / 1000).toFixed(1)} s; the page's reader ${readerMs.toFixed(0)} ms in all, ${(readerMs / runner.state.turn).toFixed(1)} ms a season`);
