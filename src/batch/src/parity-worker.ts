/** A parity worker: replays one C# game log through the TypeScript build and compares the fingerprints of every phase. */
import { readFileSync } from "node:fs";
import { parentPort } from "node:worker_threads";
import { GameLog, GameRunner, attachParity } from "@amarna/game";

export interface ReplayJob {
  log: string;
  fingerprints: string;
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
  const runner = GameRunner.forReplay(GameLog.fromJsonl(readFileSync(job.log, "utf8")));
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
  let i = 0;
  while (i < expected.length && i < lines.length && expected[i] === lines[i]) i++;
  const result: ReplayResult = {
    log: job.log,
    phases: expected.length,
    matched: i,
    mismatch: i < expected.length || lines.length !== expected.length ? `C# ${expected[i] ?? "(end)"} | TS ${lines[i] ?? "(end)"}` : null,
    error,
  };
  parentPort!.postMessage(result);
});
