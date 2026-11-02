/**
 * The same seeds give the same batch summary, whatever else the machine is running (#552): two runs of scripts/sim.sh
 * started together, on the same seeds and the same scratch folder, each keep a log of their own and print the same games
 * and the same summary, line for line. Two small games of a few seasons each, run side by side so each loads the other.
 */
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const root = join(import.meta.dirname, "..", "..", "..");

/** One run of the batch script; its printed lines and the log it names. */
async function sim(dir: string): Promise<{ lines: string[]; log: string }> {
  const { stdout } = await run("scripts/sim.sh", ["--games", "2", "--seed", "3", "--max-turns", "3", "--verify-replay"], {
    cwd: root,
    env: { ...process.env, TMPDIR: dir, SIM_TAIL: "400" },
  });
  const lines = stdout.trimEnd().split("\n");
  const log = /full log: (.*)$/.exec(lines.at(-1) ?? "")?.[1] ?? "";
  // The last two lines are the run's own: its time and the log it names.
  return { lines: lines.slice(0, -2), log };
}

describe("the batch summary of the same seeds (#552)", () => {
  it("is the same for two runs side by side, each with its own log", async () => {
    const dir = mkdtempSync(join(tmpdir(), "amarna-repeat-"));
    try {
      const [a, b] = await Promise.all([sim(dir), sim(dir)]);
      expect(a.log).not.toBe("");
      expect(a.log).not.toBe(b.log);
      expect(a.lines.some((l) => l.includes("replay ok"))).toBe(true);
      expect(b.lines).toEqual(a.lines);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 180_000);
});
