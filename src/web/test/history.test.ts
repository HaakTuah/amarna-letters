import { describe, test } from "vitest";
import { GameStateSchema, deserialize, newGame, serialize, type GameState } from "@amarna/engine";
import { GameRunner, ScriptMind, SnapshotHistory, SnapshotStore, TemplateNarrator } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";
import { scriptSeats, seasons } from "../../game/test/small-world.ts";
import { redactForPage } from "../src/session/core.ts";
import { IncrementalReader, ReadReplaced } from "../src/session/incremental.ts";
import { catchUpFrames, fromWire, sameMap, sameSet, toWire, type SeasonFrame } from "../src/session/frames.ts";

// Item 17a, the stream: the worker sends the page each season's state as the pieces new since the last season, the page keeps
// its own history of pieces and reads back only what changed. What the page reads is exactly the state the engine wrote,
// without the drawn last season, which nothing shown may read (item 6a).
describe("History", () => {
  /** The page's side: the stream applied, the newest state read incrementally. */
  function follow(store: SnapshotStore, history: SnapshotHistory, reader: IncrementalReader): GameState {
    for (const d of store.takeDeltas()) history.apply(d);
    return reader.apply(history.refs(history.length - 1)!, history.texts);
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

  test("An amended season replaces the last snapshot, and the drawn last season never reaches the page", () => {
    const store = new SnapshotStore();
    store.redact = redactForPage;
    const history = new SnapshotHistory();
    const reader = new IncrementalReader();
    const a = newGame(5, seasons(6));
    a.finalSeason = 3;
    a.finalByCap = true;
    store.push(serialize(GameStateSchema, a));
    a.turn = 2;
    store.push(serialize(GameStateSchema, a));
    // Played on into an open age: the second season's state changes after its snapshot.
    a.ended = false;
    a.winners.push("Hatti");
    store.replaceLast(serialize(GameStateSchema, a));
    const deltas = store.takeDeltas();
    Assert.equal(3, deltas.length);
    Assert.true(deltas[2].replace && deltas[2].index === 1, "the third delta replaces season 1");
    for (const d of deltas) history.apply(d);
    Assert.equal(2, history.length);
    Assert.equal(2, store.length);
    const shown = reader.apply(history.refs(1)!, history.texts);
    Assert.equal("Hatti", shown.winners[0]);
    Assert.equal(null, shown.finalSeason);
    Assert.equal(false, shown.finalByCap);
    Assert.true(!history.json(0)!.includes("finalSeason") && !history.json(1)!.includes("finalByCap"), "redacted");
    // The store keeps the whole state for the engine, the secret with it.
    Assert.true(store.get(1)!.includes('"finalSeason":3') && store.get(1)!.includes('"finalByCap":true'), "kept whole");
    same(serialize(GameStateSchema, { ...a, finalSeason: null, finalByCap: false }), serialize(GameStateSchema, shown));
  });

  test("A read spread over tasks gives the state, a newer season replaces it, and the newest is read after skipped ones", async () => {
    const r = new GameRunner(newGame(11, seasons(8)), scriptSeats(11), new ScriptMind(), new TemplateNarrator());
    r.writeChronicles = false;
    r.snapshots.redact = redactForPage;
    const history = new SnapshotHistory();
    const reader = new IncrementalReader();
    await r.prepare();
    for (const d of r.snapshots.takeDeltas()) history.apply(d);
    // The read in budgeted tasks is the read in one go.
    const spread = await reader.read(history.refs(0)!, history.texts, 1);
    same(forPage(r.state), serialize(GameStateSchema, spread));
    // Three seasons arrive while nothing is read; the newest is read, the seasons between skipped (their lists reused by prefix).
    for (let i = 0; i < 3; i++) await r.playTurn();
    for (const d of r.snapshots.takeDeltas()) history.apply(d);
    const skipped = await reader.read(history.refs(history.length - 1)!, history.texts, 1);
    same(forPage(r.state), serialize(GameStateSchema, skipped));
    Assert.equal(4, skipped.turn);
    // A read under way, replaced by a newer one, ends with ReadReplaced and the newer one gives the newer state.
    await r.playTurn();
    for (const d of r.snapshots.takeDeltas()) history.apply(d);
    const older = reader.read(history.refs(history.length - 2)!, history.texts, 1);
    const newer = reader.read(history.refs(history.length - 1)!, history.texts, 1);
    let replaced = false;
    await older.catch((e: unknown) => (replaced = e instanceof ReadReplaced));
    Assert.true(replaced, "the older read was replaced");
    same(forPage(r.state), serialize(GameStateSchema, await newer));
  });

  test("A frame sent as a difference comes back whole, in the board's order, and never without its frame before", async () => {
    const r = new GameRunner(newGame(7, seasons(6)), scriptSeats(7), new ScriptMind(), new TemplateNarrator());
    r.writeChronicles = false;
    const frames: SeasonFrame[] = [];
    r.changed.push(() => catchUpFrames(frames, r));
    await r.prepare();
    for (let i = 0; i < 3; i++) await r.playTurn();
    Assert.true(frames.length >= 3, "frames taken");
    const [a, b] = [frames[1], frames[2]];
    const wire = toWire(b, a);
    // Something is left out (a court whose known holders did not change), and what is left out comes back the same.
    Assert.true(wire.same.knownOwner.length + wire.same.knownWalls.length + wire.same.sight.length > 0, "a court's map was left out");
    const back = fromWire(structuredClone(wire), a);
    Assert.equal([...b.knownOwner.keys()].join(","), [...back.knownOwner.keys()].join(","));
    Assert.equal([...b.sight.keys()].join(","), [...back.sight.keys()].join(","));
    for (const [p, m] of b.knownOwner) Assert.true(sameMap(m, back.knownOwner.get(p)!, (x, y) => x.owner === y.owner && x.turn === y.turn), `known holders of ${p}`);
    for (const [p, m] of b.knownWalls) Assert.true(sameMap(m, back.knownWalls.get(p)!, (x, y) => x === y), `known walls of ${p}`);
    for (const [p, set] of b.sight) Assert.true(sameSet(set, back.sight.get(p)!), `sight of ${p}`);
    // The first frame after a reset carries everything; a difference with nothing before it is an error, not a map with holes.
    const first = toWire(a, null);
    Assert.equal(0, first.same.knownOwner.length);
    let threw = false;
    try {
      fromWire(wire, null);
    } catch {
      threw = true;
    }
    Assert.true(threw, "a difference without its frame before throws");
  });

  test("Items shared by text are the same objects; changed ones are read anew", () => {
    const reader = new IncrementalReader();
    const store = new SnapshotStore();
    const a = newGame(3, seasons(5));
    store.push(serialize(GameStateSchema, a));
    const history = new SnapshotHistory();
    for (const d of store.takeDeltas()) history.apply(d);
    const s1 = reader.apply(history.refs(0)!, history.texts);
    a.turn = 2;
    a.winners.push("Egypt");
    store.push(serialize(GameStateSchema, a));
    for (const d of store.takeDeltas()) history.apply(d);
    const s2 = reader.apply(history.refs(1)!, history.texts);
    Assert.equal(2, s2.turn);
    Assert.equal("Egypt", s2.winners[0]);
    Assert.true(s1.characters === s2.characters, "the characters, unchanged, are shared");
    Assert.true(s1.winners !== s2.winners, "the winners, changed, are read anew");
    same(serialize(GameStateSchema, a), serialize(GameStateSchema, s2));
  });
});
