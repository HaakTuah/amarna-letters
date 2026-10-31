import { describe, test } from "vitest";
import { GameStateSchema, newGame, serialize, deserialize, type GameState } from "@amarna/engine";
import { GameRunner } from "@amarna/game";
import { buildSeats, Presets } from "@amarna/llm";
import { buildScene } from "../src/map/scene.ts";
import { catchUpFrames, type SeasonFrame } from "../src/session/frames.ts";
import { choicesOf, newSettings, toConfig, withChoices } from "../src/session/settings.ts";

/**
 * The memory and time probe of item 17a: not a test of a rule but a measurement, run by hand with AMARNA_PROBE=1 (and
 * NODE_OPTIONS=--expose-gc for exact heap sizes). It plays a Free game of script kings as the web app does, taking a frame
 * after every season, and prints what the page and the worker keep as the game goes: the snapshots, the frames, the scenes,
 * and the time each costs.
 */
describe.skipIf(!process.env.AMARNA_PROBE)("Probe", () => {
  const gc = (): void => (globalThis as { gc?: () => void }).gc?.();
  const heap = (): number => {
    gc();
    return process.memoryUsage().heapUsed;
  };
  const mb = (n: number): string => (n / 1048576).toFixed(1) + " MB";
  /** The heap a value holds, by cloning it: the clone is as big as the original. */
  const sizeOf = (make: () => unknown): number => {
    const before = heap();
    const kept = make();
    const after = heap();
    void kept;
    return after - before;
  };

  test("a Free game, measured as it goes", async () => {
    const seasons = Number(process.env.AMARNA_PROBE_SEASONS ?? "60");
    const settings = { ...newSettings(), seed: Number(process.env.AMARNA_PROBE_SEED ?? "1") };
    const c = choicesOf(settings);
    Presets.Free.applyTo(c);
    const s = withChoices(settings, c);
    const state = newGame(s.seed, toConfig(s));
    let log: GameRunner | null = null;
    const built = buildSeats(choicesOf(s), state, null, () => log!.log);
    const runner = new GameRunner(state, built.seats, built.minds, built.narrator, { jobs: choicesOf(s).jobs });
    log = runner;
    runner.writeChronicles = false;
    const frames: SeasonFrame[] = [];
    let frameMs = 0;
    runner.changed.push(() => {
      const t = performance.now();
      catchUpFrames(frames, runner);
      frameMs += performance.now() - t;
    });
    await runner.prepare();
    console.log(`turn | season ms | frame ms | heap | snapshot KB | state JSON ser/deser ms | frame KB | scene KB | scene ms`);
    const t0 = performance.now();
    for (let i = 0; i < seasons && !runner.state.ended; i++) {
      frameMs = 0;
      const a = performance.now();
      await runner.playTurn();
      const seasonMs = performance.now() - a - frameMs;
      if ((i + 1) % 10 !== 0 && i !== 0) continue;
      const snap = runner.snapshots.get(runner.snapshots.length - 1)!;
      const b = performance.now();
      const json = serialize(GameStateSchema, runner.state);
      const ser = performance.now() - b;
      const d = performance.now();
      deserialize<GameState>(GameStateSchema, json);
      const deser = performance.now() - d;
      const last = frames[frames.length - 1];
      const frameKb = sizeOf(() => structuredClone(last)) / 1024;
      const e = performance.now();
      const scene = buildScene(frames, frames.length - 1, null);
      const sceneMs = performance.now() - e;
      const sceneKb = sizeOf(() => structuredClone(scene)) / 1024;
      if (process.env.AMARNA_PROBE_FIELDS) {
        // What grows: the biggest top-level parts of the state's JSON, of a frame and of the log.
        const parsed = JSON.parse(json) as Record<string, unknown>;
        const top = Object.entries(parsed)
          .map(([k, v]) => [k, JSON.stringify(v).length] as const)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([k, n]) => `${k} ${(n / 1024).toFixed(0)}`)
          .join(", ");
        const rep = (_k: string, v: unknown): unknown => (v instanceof Map ? [...v.entries()] : v instanceof Set ? [...v] : v);
        const ftop = Object.entries(last as unknown as Record<string, unknown>)
          .map(([k, v]) => [k, JSON.stringify(v, rep).length] as const)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([k, n]) => `${k} ${(n / 1024).toFixed(0)}`)
          .join(", ");
        console.log(`  state KB by field: ${top}`);
        console.log(`  frame KB by field: ${ftop}`);
        console.log(`  log JSONL ${(runner.log.toJsonl().length / 1024).toFixed(0)} KB, ${runner.log.decisions.length} decisions`);
      }
      console.log(
        `${String(runner.state.turn).padStart(4)} | ${seasonMs.toFixed(0).padStart(9)} | ${frameMs.toFixed(0).padStart(8)} | ${mb(heap())} | ${(snap.length / 1024).toFixed(0).padStart(11)} | ${ser.toFixed(0)}/${deser.toFixed(0)} | ${frameKb.toFixed(0).padStart(8)} | ${sceneKb.toFixed(0).padStart(8)} | ${sceneMs.toFixed(0)}`,
      );
    }
    const total = performance.now() - t0;
    const snapshotsMb = runner.snapshots.uniqueLength / 1048576;
    const framesMb = sizeOf(() => structuredClone(frames)) / 1048576;
    console.log(
      `${runner.state.turn} seasons in ${(total / 1000).toFixed(1)} s; ${runner.snapshots.length} snapshots ${snapshotsMb.toFixed(1)} MB kept (${(runner.snapshots.totalLength / 1048576).toFixed(1)} MB whole); ${frames.length} frames ${framesMb.toFixed(1)} MB; events ${runner.state.events.length}, trails ${runner.state.trails.length}, characters ${runner.state.characters.length}, units ${runner.state.units.length}`,
    );
  }, 1_000_000);
});
