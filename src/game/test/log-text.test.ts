import { describe, test } from "vitest";
import { AllPowers, MindReplySchema, newGame, newGameConfig, newMindReply } from "@amarna/engine";
import { GameLog, GameRunner, ScriptLeader, ScriptMind, TemplateNarrator } from "@amarna/game";
import { SeatChoices, SimulatedApi, buildSeats, providersFor } from "@amarna/llm";
import { Assert, toDict } from "../../engine/test/support.ts";

// A log writes each decision's line once and keeps it (the browser saves the whole log every season): the text it
// writes as a game goes on must be exactly the text a log holding the same record writes from scratch.
describe("LogTextTests", () => {
  test.each([[false], [true]] as const)("The log written season by season is the log written at once %s", async (models: boolean) => {
    let state = newGame(8, newGameConfig({ capMin: 6, capMax: 6, endMedian: 10000 }));
    let runner: GameRunner | null = null;
    let choices = new SeatChoices();
    if (models) {
      choices.leaders.set("Egypt", "Haiku");
      choices.characters = "Haiku";
    }
    let set = buildSeats(choices, state, providersFor(choices, new SimulatedApi(), {}), () => runner!.log);
    runner = new GameRunner(state, set.seats, set.minds, set.narrator);

    function same(log: GameLog): void {
      let text = log.toJsonl();
      // A log read back from the text has written no line yet, so it writes every line afresh.
      Assert.equal(GameLog.fromJsonl(text).toJsonl(), text);
      Assert.equal(text, log.toJsonl());
    }

    await runner.prepare();
    same(runner.log);
    while (await runner.playTurn()) same(runner.log);
    same(runner.log);
    Assert.equal(models, runner.log.calls.length > 0);
  });

  test("A log read back and continued writes the same text", async () => {
    let first = new GameRunner(
      newGame(4),
      toDict(
        AllPowers,
        (p) => p,
        (_) => new ScriptLeader(4),
      ),
      new ScriptMind(),
      new TemplateNarrator(),
    );
    await first.prepare();
    for (let i = 0; i < 3; i++) await first.playTurn();
    let log = GameLog.fromJsonl(first.log.toJsonl());
    log.toJsonl();
    log.record("t9/test", MindReplySchema, newMindReply({ text: "a line written after the log was read back" }));
    Assert.equal(GameLog.fromJsonl(log.toJsonl()).toJsonl(), log.toJsonl());
    Assert.contains("a line written after the log was read back", log.toJsonl());
  });
});
