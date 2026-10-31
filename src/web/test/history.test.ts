import { describe, test } from "vitest";
import { GameStateSchema, deserialize, newGame, serialize, type GameState } from "@amarna/engine";
import { GameRunner, ScriptMind, SnapshotHistory, SnapshotStore, TemplateNarrator } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";
import { scriptSeats, seasons } from "../../game/test/small-world.ts";
import { redactForPage } from "../src/session/core.ts";
import { IncrementalReader } from "../src/session/incremental.ts";

// Item 17a, the stream: the worker sends the page each season's state as the pieces new since the last season, the page keeps
// its own history of pieces and reads back only what changed. What the page reads is exactly the state the engine wrote,
// without the drawn last season, which nothing shown may read (item 6a).
describe("History", () => {
  /** The page's side: the stream applied, the newest state read incrementally. */
  function follow(store: SnapshotStore, history: SnapshotHistory, reader: IncrementalReader): GameState {
    for (const d of store.takeDeltas()) history.apply(d);
    return reader.apply(history.pieces(history.length - 1)!);
  }
  /** The two texts equal, else the first place they differ, in context. */
  function same(expected: string, actual: string | null): void {
    if (actual === expected) return;
    const a = actual ?? "";
    let i = 0;
    while (i < expected.length && expected[i] === a[i]) i++;
    Assert.fail(`texts differ at ${i} of ${expected.length}/${a.length}:\n  expected ...${expected.slice(Math.max(0, i - 80), i + 120)}\n  actual   ...${a.slice(Math.max(0, i - 80), i + 120)}`);
  }
  /** A state as the page may know it: the drawn last season blanked. */
  const forPage = (s: GameState): string => serialize(GameStateSchema, { ...s, finalSeason: null, finalByCap: false });
  /** A season's JSON as the page's history holds it: the two redacted members left out altogether. */
  const pageJson = (s: GameState): string => serialize(GameStateSchema, { ...s, finalSeason: null, finalByCap: undefined as unknown as boolean });

  test("The page reads back exactly the state written, season after season, and any season looked back at", async () => {
    const r = new GameRunner(newGame(9, seasons(14)), scriptSeats(9), new ScriptMind(), new TemplateNarrator());
    r.writeChronicles = false;
    r.snapshots.redact = redactForPage;
    const history = new SnapshotHistory();
    const reader = new IncrementalReader();
    await r.prepare();
    const expected: string[] = [forPage(r.state)];
    const kept: string[] = [pageJson(r.state)];
    let shown = follow(r.snapshots, history, reader);
    same(expected[0], serialize(GameStateSchema, shown));
    let shared = 0;
    for (let i = 0; i < 8 && !r.state.ended; i++) {
      const before = shown;
      await r.playTurn();
      expected.push(forPage(r.state));
      kept.push(pageJson(r.state));
      shown = follow(r.snapshots, history, reader);
      // The whole state, read incrementally, is the state written (and its secret stays with the engine).
      same(expected[expected.length - 1], serialize(GameStateSchema, shown));
      Assert.equal(null, shown.finalSeason);
      // Unchanged parts are last season's very objects: the season cost its changes.
      if (before.config === shown.config) shared++;
    }
    Assert.true(shared >= 7, `the config was shared ${shared} times`);
    // Looking back: every season's JSON rebuilt from the page's pieces is the season as written for the page.
    Assert.equal(expected.length, history.length);
    kept.forEach((json, i) => same(json, history.json(i)));
    Assert.equal(3, deserialize<GameState>(GameStateSchema, history.json(2)!).turn);
    // The stream carried only the changes: far less than the states whole.
    const carried = history.json(history.length - 1)!.length;
    Assert.true(r.snapshots.uniqueLength < 2.5 * carried, `pieces kept: ${r.snapshots.uniqueLength} against a state of ${carried}`);
  });

  test("Items shared by text are the same objects; changed ones are read anew", () => {
    const reader = new IncrementalReader();
    const store = new SnapshotStore();
    const a = newGame(3, seasons(5));
    store.push(serialize(GameStateSchema, a));
    const history = new SnapshotHistory();
    for (const d of store.takeDeltas()) history.apply(d);
    const s1 = reader.apply(history.pieces(0)!);
    a.turn = 2;
    a.winners.push("Egypt");
    store.push(serialize(GameStateSchema, a));
    for (const d of store.takeDeltas()) history.apply(d);
    const s2 = reader.apply(history.pieces(1)!);
    Assert.equal(2, s2.turn);
    Assert.equal("Egypt", s2.winners[0]);
    Assert.true(s1.characters === s2.characters, "the characters, unchanged, are shared");
    Assert.true(s1.winners !== s2.winners, "the winners, changed, are read anew");
    same(serialize(GameStateSchema, a), serialize(GameStateSchema, s2));
  });
});
