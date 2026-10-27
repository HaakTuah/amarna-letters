import { describe, test } from "vitest";
import {
  AllPowers,
  type AudienceView,
  type HostReply,
  OrderSchema,
  type SeatView,
  type TurnSubmission,
  TurnSubmissionSchema,
  Views,
  list,
  newGame,
  newGameConfig,
  newHostReply,
  newTurnSubmission,
  serialize,
  single,
} from "@amarna/engine";
import { GameRunner, type ISeat, ScriptLeader, ScriptMind, TemplateNarrator, playGame } from "@amarna/game";
import { Assert, toDict } from "../../engine/test/support.ts";

// <summary>The script king that stands in for a model or file seat keeps up with it every season, so it remembers.</summary>
describe("StandInTests", () => {
  // <summary>A model seat that holds every season, then stops answering, and remembers what it was shown.</summary>
  class Flaky implements ISeat {
    readonly #failFrom: number;
    readonly #decide: ((a0: SeatView) => TurnSubmission) | null;
    constructor(failFrom: number, decide: ((a0: SeatView) => TurnSubmission) | null = null) {
      this.#failFrom = failFrom;
      this.#decide = decide;
    }
    seen: SeatView[] = [];
    get label(): string {
      return "Flaky model leader";
    }
    get canSleep(): boolean {
      return true;
    }

    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      this.seen.push(view);
      if (view.turn >= this.#failFrom) throw new Error("the model did not answer");
      return Promise.resolve(this.#decide?.(view) ?? newTurnSubmission());
    }

    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ speech: "Go in peace.", end: true }));
    }
  }

  // <summary>A king who does nothing at all.</summary>
  class Idle implements ISeat {
    get label(): string {
      return "Idle";
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return Promise.resolve(newTurnSubmission());
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  test("The stand in remembers the seasons the model played itself", async () => {
    let seed = 3;
    let model = new Flaky(5);
    let state = newGame(seed, newGameConfig({ sleepingSeats: false }));
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? model : new ScriptLeader(seed)),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    for (let turn = 1; turn <= 4; turn++) {
      await runner.playTurn();
      Assert.equal(turn, runner.standIn.brainOf("Egypt")!.turn);
    }
    await runner.playTurn();
    const stood = runner.log.tryGet<TurnSubmission>("t5/orders/Egypt", TurnSubmissionSchema);
    Assert.true(stood !== undefined && stood.fromFallback);

    // A script king that read the same four seasons, once each, plays the fifth exactly as the stand-in did.
    let twin = new ScriptLeader(seed);
    for (const v of model.seen.filter((v) => v.turn < 5)) twin.observe(v);
    let expected = await twin.decide(single(model.seen, (v) => v.turn === 5));
    Assert.equal(serialize(list(OrderSchema), expected.orders), serialize(list(OrderSchema), stood!.orders));
    Assert.equal(expected.notes, stood!.notes);
  });

  test("The stand in learns while the model seat sleeps", async () => {
    // Egypt sleeps after its orders (sleeping seats are on by default) among kings who do nothing to wake it; the
    // stand-in reads its view every season all the same.
    let model = new Flaky(99);
    let state = newGame(31, newGameConfig({ maxSleep: 6, minTurns: 40, catastropheChance: 0 }));
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? model : new Idle()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    for (let turn = 1; turn <= 5; turn++) {
      await runner.playTurn();
      Assert.equal(turn, runner.standIn.brainOf("Egypt")!.turn);
    }
    Assert.equal(
      [1],
      model.seen.map((v) => v.turn),
    );
    // Script and idle seats are not watched: they never fall back on the stand-in.
    Assert.null(runner.standIn.brainOf("Hatti"));
  });

  test("Reading a season twice learns nothing more", () => {
    let state = newGame(8);
    let view = Views.for(state, "Babylonia");
    let bot = new ScriptLeader(8);
    bot.observe(view);
    let brain = bot.brainOf("Babylonia")!;
    brain.rel.get("Assyria").grudge = 4;
    brain.rel.get("Assyria").trust = -0.4;
    bot.observe(view);
    Assert.equal(4, brain.rel.get("Assyria").grudge);
    Assert.equal(-0.4, brain.rel.get("Assyria").trust);
  });

  test("Games whose model seats fall back replay exactly", async () => {
    for (const sleeping of [false, true]) {
      let summary = (
        await playGame(
          4,
          (st) => {
            let bot = new ScriptLeader(st.seed);
            let seats = toDict(
              AllPowers,
              (p) => p,
              (p) => (p === "Egypt" ? new Flaky(3) : p === "Assyria" ? new Flaky(6) : bot),
            );
            return Object.assign(new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
          },
          true,
          newGameConfig({ sleepingSeats: sleeping, maxTurns: 10 }),
        )
      )[0];
      Assert.true(summary.replayMatches, `sleeping ${sleeping}`);
    }
  });
});
