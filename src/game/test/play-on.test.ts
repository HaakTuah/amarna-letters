import { describe, test } from "vitest";
import { AllPowers, GameStateSchema, Views, newGame, newGameConfig, serialize } from "@amarna/engine";
import { leaderRules } from "@amarna/llm";
import { GameLog, GameRunner, ScriptLeader, ScriptMind, TemplateNarrator } from "@amarna/game";
import { Assert, toDict } from "../../engine/test/support.ts";

// "An open age" (build order item 6a): a table may play on once the age has ended, and the choice is in the log, so a
// replay plays on too.
describe("PlayOnTests", () => {
  test("Playing on after the age ends is recorded and replays exactly", async () => {
    const state = newGame(3, newGameConfig({ capMin: 3, capMax: 3, endMedian: 10000, catastropheChance: 0 }));
    const seats = toDict(
      AllPowers,
      (p) => p,
      (_) => new ScriptLeader(3),
    );
    const r = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    while (await r.playTurn()) {
      /* to the age's end */
    }
    Assert.equal(3, r.state.turn);
    const winners = [...r.state.winners];
    Assert.true(await r.playOn());
    Assert.false(r.state.ended);
    for (let i = 0; i < 2; i++) Assert.true(await r.playTurn());
    Assert.equal(6, r.state.turn);
    Assert.equal(3, r.state.ageEndedTurn);
    Assert.equal(winners.join(), r.state.winners.join());
    Assert.equal(winners.join(), r.state.ageWinners.join());
    // A model king's rulebook follows the age as its view shows it: open once the table played on.
    Assert.contains("This is an open age", leaderRules(false, { ...state.config, openAge: Views.for(r.state, "Egypt").openAge }));

    const replay = GameRunner.forReplay(GameLog.fromJsonl(r.log.toJsonl()));
    replay.writeChronicles = false;
    await replay.prepare();
    for (;;) {
      try {
        if (!(await replay.playTurn())) break;
      } catch {
        break; // the log runs out in season 6, which the live game has not played
      }
    }
    Assert.equal(serialize(GameStateSchema, r.stateAt(5)!), serialize(GameStateSchema, replay.stateAt(5)!));
  });
});
