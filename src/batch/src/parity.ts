/**
 * The parity check of the TypeScript conversion (`docs/CONVERSION-PLAN.md`). Replays every C# game log in a folder
 * (game-N.jsonl, written by the C# batch runner with --out) through the TypeScript build and compares its fingerprints
 * after every phase with those the C# build wrote (game-N.parity.tsv, with --fingerprints).
 *   node --experimental-strip-types src/batch/src/parity.ts replay LOGS [FINGERPRINTS]
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { runPool } from "./pool.ts";
import type { ReplayJob, ReplayResult } from "./parity-worker.ts";

const [mode, dir, fpDir] = process.argv.slice(2);
if ((mode !== "replay" && mode !== "play" && mode !== "play-sleeping" && mode !== "play-versus" && mode !== "lenient") || !dir) {
  console.error("usage: parity.ts replay|play|play-sleeping|play-versus|lenient LOGS [FINGERPRINTS]");
  process.exit(2);
}
const jobs: ReplayJob[] = readdirSync(dir)
  .filter((f) => (mode === "lenient" ? /\.jsonl$/ : /^game-\d+\.jsonl$/).test(f))
  .sort((a, b) => (mode === "lenient" ? (a < b ? -1 : a > b ? 1 : 0) : Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0])))
  .map((f) => ({
    log: join(dir, f),
    fingerprints: join(fpDir ?? dir, f.replace(".jsonl", ".parity.tsv")),
    lenient: mode === "lenient",
    play: mode === "replay" || mode === "lenient" ? undefined : { seed: Number(f.match(/\d+/)![0]), sleeping: mode === "play-sleeping", versus: mode === "play-versus" },
  }));
const started = Date.now();
const results = await runPool<ReplayJob, ReplayResult>(new URL("./parity-worker.ts", import.meta.url), jobs);
const bad = results.filter((r) => r.mismatch !== null || r.error !== null);
const phases = results.reduce((s, r) => s + r.phases, 0);
const matched = results.reduce((s, r) => s + r.matched, 0);
console.log(`${mode === "replay" ? "Replayed" : "Played"} ${results.length} games: ${results.length - bad.length} match on every phase; ${matched} of ${phases} phase fingerprints match (${((Date.now() - started) / 1000).toFixed(1)}s).`);
for (const r of bad.slice(0, 20)) console.log(`- ${r.log}: ${r.matched}/${r.phases}${r.mismatch ? `; first mismatch: ${r.mismatch}` : ""}${r.error ? `\n  ${r.error}` : ""}`);
process.exit(bad.length === 0 ? 0 : 1);
