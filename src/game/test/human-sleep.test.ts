import { describe, test } from "vitest";
import { GameStateSchema, newTurnSubmission, serialize, SelfWakeReason, type SeatView, type TurnSubmission } from "@amarna/engine";
import { GameLog, GameRunner } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";
import { Quiet, Sleeper, nothing, play } from "./sleep-support.ts";

// Sleep is for every seat (item 9+a, "Per-seat sleep, never a global skip"): a human ends a turn awake or with a sleep, and a
// sleeping human may wake himself whenever he likes; the wake is a decision in the log, so a replay wakes him the same.
describe("HumanSleepTests", () => {
  /** A seat that sleeps after its orders unless told to stay awake, and wakes itself in the seasons named. */
  class Human extends Sleeper {
    readonly wakeIn: number[];
    turn = 0;
    constructor(decide: (v: SeatView) => TurnSubmission, wakeIn: number[] = []) {
      super((v) => {
        return decide(v);
      });
      this.wakeIn = wakeIn;
    }
    wakeRequested(): boolean {
      this.turn++;
      return this.wakeIn.includes(this.turn + 1);
    }
  }

  test("A seat that stays awake is asked every season", async () => {
    const human = new Human(() => newTurnSubmission({ stayAwake: true }));
    await play("Babylonia", human, 4, Quiet);
    Assert.equal([1, 2, 3, 4], human.calls);
  });

  test("A sleeping seat that wakes itself is asked that season, and a replay wakes it the same", async () => {
    // It sleeps after turn 1; nothing concerns it; it wakes itself in turn 4.
    const human = new Human(() => nothing(), [4]);
    const r = await play("Babylonia", human, 5, Quiet, null, null, false);
    Assert.equal(1, human.calls[0]);
    Assert.contains(4, human.calls);
    Assert.contains(SelfWakeReason, human.views[human.calls.indexOf(4)].wokenBecause);
    Assert.true(r.log.has("t4/wake/Babylonia"));

    const replay = GameRunner.forReplay(GameLog.fromJsonl(r.log.toJsonl()));
    await replay.prepare();
    for (let i = 0; i < 5; i++) await replay.playTurn();
    Assert.equal(serialize(GameStateSchema, r.state), serialize(GameStateSchema, replay.state));
  });
});
