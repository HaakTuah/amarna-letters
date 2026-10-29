import { describe, test } from "vitest";
import { Near, scriptSeats, smallSeats } from "./small-world.ts";
import { court } from "../src/bots/statecraft-court.ts";
import { AllPowers, type AudienceView, CURRENT_VERSION, type HostReply, type SeatView, type TurnSubmission, newGame, newGameConfig } from "@amarna/engine";
import { GameLog, GameRunner, type ISeat, ScriptLeader, ScriptMind, TemplateNarrator, playGame } from "@amarna/game";
import { Assert, toDict } from "../../engine/test/support.ts";

describe("SaveVersionTests", () => {
  // <summary>A script king in a seat that may sleep, so a game with sleeping seats on has sleepers to replay.</summary>
  class SleepyScript implements ISeat {
    readonly #inner: ScriptLeader;
    constructor(inner: ScriptLeader) {
      this.#inner = inner;
    }
    get label(): string {
      return "Sleepy script";
    }
    get canSleep(): boolean {
      return true;
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return this.#inner.decide(view, ct);
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return this.#inner.hostAudience(view, court, ct);
    }
  }

  async function playedLog(seed: number, turns: number): Promise<GameLog> {
    let state = newGame(seed);
    let seats = scriptSeats(seed);
    let r = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await r.prepare();
    for (let i = 0; i < turns; i++) await r.playTurn();
    return GameLog.fromJsonl(r.log.toJsonl());
  }

  test("New games are saved under the current version", async () => {
    Assert.equal(33, CURRENT_VERSION);
    Assert.equal(CURRENT_VERSION, newGame(1).version);
    let log = await playedLog(4, 1);
    Assert.equal(CURRENT_VERSION, log.header.version);
    Assert.null(GameRunner.versionProblem(log.header));
  });

  // Version 3 is the one before item 4's fix (d), when every kind of object took its id from one shared counter; version
  // 4 the one before the fix pass after item 4, when kings could name a season to be woken in and script envoys kept
  // nothing from small lots of gold; version 5 the one before the siege package (Build order item 5), when free cities'
  // walls held with strength 1 and nothing else had walls.
  test.each([[1], [3], [4], [5]] as const)("A log saved under an earlier version is neither replayed nor continued %s", async (version: number) => {
    let log = await playedLog(4, 2);
    log.header.version = version;
    let old = GameLog.fromJsonl(log.toJsonl());
    let message = `This game was saved under an earlier version of the rules (version ${version}) and cannot be replayed by this version.`;

    Assert.equal(message, GameRunner.versionProblem(old.header));
    Assert.equal(message, Assert.throws(() => GameRunner.forReplay(old)).message);
    let seats = scriptSeats(4);
    Assert.equal(message, Assert.throws(() => GameRunner.resume(old, seats, new ScriptMind(), new TemplateNarrator())).message);
    Assert.throws(() => new GameRunner(newGame(4), seats, new ScriptMind(), new TemplateNarrator(), { replay: old }));

    // Only for analysis, and only when asked: an old log can still be fed through the current rules.
    Assert.notNull(GameRunner.forReplay(old, true));
  });

  test("Seeds replay exactly within the current version with sleep on and off", async () => {
    for (const sleeping of [false, true])
      for (let seed = 1; seed <= 2; seed++) {
        let summary = (
          await playGame(
            seed,
            (st) => {
              let bot = new ScriptLeader(st.seed);
              // With sleep on, two kings sit in seats that may sleep; the default few others are script kings, who never do,
              // and every other power is idle (small-world.ts).
              let seats = smallSeats((p) => (sleeping && ["Babylonia", "Alashiya"].includes(p) ? new SleepyScript(bot) : bot), [...Near, "Alashiya"]);
              return Object.assign(new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
            },
            true,
            newGameConfig({ sleepingSeats: sleeping, capMin: 12, capMax: 12, endMedian: 10000 }),
          )
        )[0];
        Assert.true(summary.replayMatches, `seed ${seed}, sleep ${sleeping ? "on" : "off"}`);
      }
  });
});
