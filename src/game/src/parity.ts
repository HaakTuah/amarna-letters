/**
 * The parity check of the TypeScript conversion (build order item 5+, `docs/CONVERSION-PLAN.md`): a fingerprint of the
 * game after every phase of every season, one line each, which both builds write the same way and compare. A line is
 * "seed, phase, state, decisions": the FNV-1a hash of the state's JSON and of the decisions logged in that phase, each as
 * its key and its JSON, in ordinal order of key.
 */
import { AllPowers, Dict, GameStateSchema, cmpStr, fnv64, hash, newGame, sortBy, type Power } from "@amarna/engine";
import { ScriptLeader } from "./bots/script-leader.ts";
import { ScriptMind } from "./bots/script-mind.ts";
import { TemplateNarrator } from "./bots/template-narrator.ts";
import type { ISeat } from "./contracts.ts";
import type { GameLog } from "./log.ts";
import { GameRunner } from "./runner.ts";

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

/**
 * Replays a recorded game leniently, as both builds must for the recorded model games (CONVERSION-PLAN.md, Notes): a recorded
 * reply wherever its key still comes up, the script stand-in (script kings, characters and narrator) elsewhere, whatever the
 * log's save version. The kings that could sleep in the recorded game sleep again.
 */
export async function replayLenient(log: GameLog): Promise<string[]> {
  const state = newGame(log.header.seed, log.header.config);
  const script = new ScriptLeader(state.seed);
  const sleeping: ISeat = {
    label: script.label + " (sleeping)",
    canSleep: true,
    decide: (v, sg) => script.decide(v, sg),
    hostAudience: (v, c, sg) => script.hostAudience(v, c, sg),
  };
  const seats = new Dict<Power, ISeat>(AllPowers.map((p) => [p, log.header.sleepers.includes(p) ? sleeping : script] as const));
  const runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator(), { replay: log, strictReplay: false, anyVersion: true });
  const lines = attachParity(runner);
  await runner.prepare();
  while (await runner.playTurn()) {
    /* the whole game */
  }
  return lines;
}
