import { describe, test } from "vitest";
import { AllPowers, GameStateSchema, first, hash, move, newGame, newGameConfig, newTurnSubmission, remember, unitAt } from "@amarna/engine";
import { GameLog, GameRunner, HumanSeat, ScriptLeader, ScriptMind, SignalDetector, TemplateNarrator, playGame } from "@amarna/game";
import { Assert, toDict } from "../../engine/test/support.ts";
import { delay } from "./io.ts";

describe("RunnerTests", () => {
  function scripted(seed: number): GameRunner {
    let state = newGame(seed);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (_) => new ScriptLeader(seed),
    );
    return new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
  }

  test("Script games finish and replay exactly", async () => {
    for (let seed = 1; seed <= 5; seed++) {
      let summary = (
        await playGame(
          seed,
          (s) =>
            new GameRunner(
              s,
              toDict(
                AllPowers,
                (p) => p,
                (_) => new ScriptLeader(seed),
              ),
              new ScriptMind(),
              new TemplateNarrator(),
            ),
          true,
          null,
        )
      )[0];
      Assert.true(summary.replayMatches, `seed ${seed}`);
      Assert.true(summary.turns >= 15);
      Assert.notEmpty(summary.winners);
    }
  });

  test("A character that belongs to no court summarizes its memory as any other", async () => {
    let r = scripted(2);
    let wanderer = first(r.state.characters, (c) => c.status === "Free");
    // Free and on the road: no employer, and at no court.
    [wanderer.at, wanderer.duty, wanderer.heldBy] = [null, "None", null];
    for (let i = 1; i <= 13; i++) remember(wanderer, i, `I walked on, season ${i}.`);
    await r.prepare();
    await r.playTurn();
    Assert.contains("I walked on, season 1.", wanderer.memorySummary);
    Assert.true(wanderer.memory.length < 13);
  });

  test("Script characters summarize their memories and replays still match", async () => {
    let summary = (
      await playGame(
        14,
        (s) =>
          new GameRunner(
            s,
            toDict(
              AllPowers,
              (p) => p,
              (_) => new ScriptLeader(14),
            ),
            new ScriptMind(),
            new TemplateNarrator(),
          ),
        true,
        newGameConfig({ minTurns: 30, endChance: 1.0 }),
      )
    )[0];
    Assert.true(summary.replayMatches);

    let r = scripted(14);
    for (let i = 0; i < 30 && !r.state.ended; i++) await r.playTurn();
    Assert.all(r.state.characters, (c) => Assert.true(c.memory.length <= r.state.config.memoryKeep + 8));
    Assert.contains(r.state.characters, (c) => c.memorySummary.length > 0);
  });

  test("Snapshots allow rewinding to any turn", async () => {
    let r = scripted(9);
    await r.prepare();
    for (let i = 0; i < 5; i++) await r.playTurn();
    Assert.equal(6, r.snapshots.length);
    Assert.equal(1, r.stateAt(0)!.turn);
    Assert.equal(4, r.stateAt(3)!.turn);
  });

  test("A saved game resumes with live seats", async () => {
    let r = scripted(12);
    await r.prepare();
    for (let i = 0; i < 4; i++) await r.playTurn();
    let log = GameLog.fromJsonl(r.log.toJsonl());

    let seats = toDict(
      AllPowers,
      (p) => p,
      (_) => new ScriptLeader(12),
    );
    let resumed = GameRunner.resume(log, seats, new ScriptMind(), new TemplateNarrator());
    await resumed.prepare();
    for (let i = 0; i < 4; i++) await resumed.playTurn();
    Assert.equal(hash(GameStateSchema, r.state), hash(GameStateSchema, resumed.state));
    await resumed.playTurn();
    Assert.equal(6, resumed.state.turn);
  });

  test("A human seat waits for orders and answers", async () => {
    let state = newGame(21);
    let human = new HumanSeat("Egypt");
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? human : new ScriptLeader(21)),
    );
    let r = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
    let done = false;
    let turn = r.playTurn().then((x) => ((done = true), x));
    for (let i = 0; i < 100 && human.pendingOrders === null; i++) await delay(10);
    Assert.notNull(human.pendingOrders);
    Assert.false(done);
    human.submitOrders(newTurnSubmission({ orders: [move("memphis", "sinai")] }));
    await turn;
    Assert.equal("Egypt", unitAt(state, "sinai")?.power);
  });

  test("Signals are detected in script games", async () => {
    let r = scripted(3);
    while (await r.playTurn()) {}
    let counts = SignalDetector.count(r.state);
    Assert.true(counts.getOrDefault("tablet-sealed", 0) > 0);
  });
});
