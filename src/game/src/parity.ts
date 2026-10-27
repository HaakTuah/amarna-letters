/**
 * The parity check of the TypeScript conversion (build order item 5+, `docs/CONVERSION-PLAN.md`): a fingerprint of the
 * game after every phase of every season, one line each, which both builds write the same way and compare. A line is
 * "seed, phase, state, decisions": the FNV-1a hash of the state's JSON and of the decisions logged in that phase, each as
 * its key and its JSON, in ordinal order of key.
 */
import { GameStateSchema, cmpStr, fnv64, hash, sortBy } from "@amarna/engine";
import type { GameRunner } from "./runner.ts";

/** Fingerprints a runner's game as it plays: the lines are added to the list returned. */
export function attachParity(runner: GameRunner): string[] {
  const lines: string[] = [];
  let seen = 0;
  runner.phaseDone = (phase) => {
    const decisions = sortBy(runner.log.decisions.slice(seen), [(d) => d.key, cmpStr]);
    seen = runner.log.decisions.length;
    let text = "";
    for (const d of decisions) text += d.key + "\n" + d.json + "\n";
    lines.push(`${runner.state.seed}\t${phase}\t${hash(GameStateSchema, runner.state)}\t${fnv64(text)}`);
  };
  return lines;
}
