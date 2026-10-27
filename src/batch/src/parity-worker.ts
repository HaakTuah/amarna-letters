/** A parity worker: replays one C# game log through the TypeScript build and compares the fingerprints of every phase. */
import { readFileSync } from "node:fs";
import { parentPort } from "node:worker_threads";
import { AllPowers, Dict, GameFactory, newGameConfig, type Power } from "@amarna/engine";
import { Presets, SeatChoices, SimulatedApi, bodyText, buildSeats, providersFor } from "@amarna/llm";
import { BaselineLeader, GameLog, GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, attachParity, replayLenient, type ISeat } from "@amarna/game";

/** `play`: instead of replaying the log, play the game afresh with script kings (sleeping ones, as --sleeping-scripts). */
export interface ReplayJob {
  log: string;
  fingerprints: string;
  play?: { seed: number; sleeping: boolean; versus?: boolean; simulated?: boolean; awake?: boolean };
  /** Replay the log leniently (replayLenient) instead. */
  lenient?: boolean;
}

/** `versus`: as the batch runner's --versus baseline, every other king (by the seed) plays the frozen baseline. */
function playRunner(seed: number, sleeping: boolean, versus = false): GameRunner {
  const state = GameFactory.newGame(seed);
  const script = new ScriptLeader(state.seed);
  const seat: ISeat = sleeping
    ? {
        label: script.label + " (sleeping)",
        canSleep: true,
        decide: (v, sg) => script.decide(v, sg),
        hostAudience: (v, c, sg) => script.hostAudience(v, c, sg),
      }
    : script;
  const baseline = versus ? new BaselineLeader(state.seed) : null;
  const seats = new Dict<Power, ISeat>(AllPowers.map((p, i) => [p, baseline !== null && (i + (seed % 2)) % 2 !== 0 ? baseline : seat] as const));
  return new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
}

export interface ReplayResult {
  log: string;
  phases: number;
  matched: number;
  mismatch: string | null;
  error: string | null;
}

parentPort!.on("message", async (job: ReplayJob) => {
  const expected = readFileSync(job.fingerprints, "utf8").trim().split("\n");
  if (job.lenient) {
    let lines: string[] = [];
    let error: string | null = null;
    try {
      lines = await replayLenient(GameLog.fromJsonl(readFileSync(job.log, "utf8")));
    } catch (e) {
      error = e instanceof Error ? (e.stack ?? e.message).split("\n").slice(0, 6).join("\n") : String(e);
    }
    parentPort!.postMessage(compare(job, expected, lines, error));
    return;
  }
  if (job.play?.simulated) {
    // Every role on the simulated API (the showcase preset): the requests' text is fingerprinted with every phase.
    // awake: with sleeping seats off (the batch runner's --sleep off).
    const state = GameFactory.newGame(job.play.seed, job.play.awake ? newGameConfig({ sleepingSeats: false }) : null);
    const api = new SimulatedApi();
    api.reportUsage = false;
    const choices = new SeatChoices();
    Presets.Showcase.applyTo(choices);
    // Every other king a script king (--alternate-script), so that envoys reach the model kings and their characters.
    AllPowers.forEach((p, k) => {
      if (k % 2 === 1) choices.leaders.set(p, "Script");
    });
    let runner: GameRunner | null = null;
    const set = buildSeats(choices, state, providersFor(choices, api, {}), () => runner!.log);
    runner = new GameRunner(state, set.seats, set.minds, set.narrator);
    let drained = 0;
    const lines = attachParity(runner, () => {
      const bodies = api.requests.slice(drained).map(bodyText);
      drained = api.requests.length;
      return bodies;
    });
    let error: string | null = null;
    try {
      await runner.prepare();
      while (await runner.playTurn()) {
        /* the whole game */
      }
    } catch (e) {
      error = e instanceof Error ? (e.stack ?? e.message).split("\n").slice(0, 6).join("\n") : String(e);
    }
    parentPort!.postMessage(compare(job, expected, lines, error));
    return;
  }
  const runner = job.play ? playRunner(job.play.seed, job.play.sleeping, job.play.versus) : GameRunner.forReplay(GameLog.fromJsonl(readFileSync(job.log, "utf8")));
  const lines = attachParity(runner);
  let error: string | null = null;
  try {
    await runner.prepare();
    while (await runner.playTurn()) {
      /* the whole game */
    }
  } catch (e) {
    error = e instanceof Error ? (e.stack ?? e.message).split("\n").slice(0, 6).join("\n") : String(e);
  }
  parentPort!.postMessage(compare(job, expected, lines, error));
});

function compare(job: ReplayJob, expected: string[], lines: string[], error: string | null): ReplayResult {
  let i = 0;
  while (i < expected.length && i < lines.length && expected[i] === lines[i]) i++;
  return {
    log: job.log,
    phases: expected.length,
    matched: i,
    mismatch: i < expected.length || lines.length !== expected.length ? `C# ${expected[i] ?? "(end)"} | TS ${lines[i] ?? "(end)"}` : null,
    error,
  };
}
