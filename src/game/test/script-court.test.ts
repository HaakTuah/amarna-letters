import { describe, test } from "vitest";
import { scriptSeats } from "./small-world.ts";
import {
  AllPowers,
  type Character,
  type GameState,
  GameStateSchema,
  type Power,
  type HireOrder,
  OrderValidator,
  payCarriers,
  type TurnSubmission,
  TurnSubmissionSchema,
  Views,
  characterOf,
  deserialize,
  dismiss,
  first,
  hash,
  max,
  newContract,
  newCover,
  newGame,
  newGameConfig,
} from "@amarna/engine";
import { GameLog, GameRunner, ScriptLeader, ScriptMind, TemplateNarrator } from "@amarna/game";
import { Assert, holds, toDict } from "../../engine/test/support.ts";

// <summary>How a script king keeps its court: each errand a job offered to the man sent, and servants given up for lost.</summary>
describe("ScriptCourtTests", () => {
  const Seed: number = 9;

  test("A script king offers each errand as a job to the man it sends, paid on completion, and pays its carriers", async () => {
    let s = newGame(Seed);
    s.turn = 8;
    s.treasuries.get("Egypt").gold = 5000;
    // Nobody in its service: the free people at court are at hand.
    for (const c of s.characters.filter((x) => x.employer === "Egypt")) [c.status, c.employer, c.contract] = ["Free", null, null];
    for (const c of s.characters.filter((x) => x.status === "Free").slice(0, 4)) [c.at, c.duty, c.heldBy] = ["Egypt", "None", null];
    const sub = await new ScriptLeader(Seed).decide(Views.for(s, "Egypt"));
    Assert.true(holds(sub.orders, payCarriers(true)));
    for (const o of sub.orders.filter((o) => o.type === "dispatch" || o.type === "spy")) {
      const id = o.type === "dispatch" ? o.envoy : o.type === "spy" ? o.character : "";
      const job = sub.orders.find((x): x is HireOrder => x.type === "hire" && x.character === id);
      Assert.notNull(job ?? null);
      Assert.equal([o.type === "dispatch" ? "envoy" : "spy", true], [job!.what!, job!.payOnDone!]);
      // Offered before the errand in the list.
      Assert.true(sub.orders.indexOf(job!) < sub.orders.indexOf(o));
    }
    Assert.empty(new OrderValidator(s).validate("Egypt", sub).rejected.filter((r) => r.order.type === "hire" || r.order.type === "dispatch" || r.order.type === "spy"));
  });

  // Egypt's court, as Egypt sees it: one envoy whose line reads "has not returned from Hatti" (it went over to Hatti, as
  // Egypt does not know), and one at court whose wage is so high that Egypt wants no third servant.
  function missing(): [GameState, Character] {
    let s = newGame(11);
    s.treasuries.get("Egypt").gold = 10000;
    let servants = s.characters.filter((c) => c.employer === "Egypt");
    let gone = servants[0];
    gone.covers.push(
      newCover({ for: "Egypt", since: 2, believed: "Detained", dutyText: "has not returned from Hatti", whereText: "unknown", fee: 228, advance: 114, startTurn: 1, contractUntil: 20 }),
    );
    gone.employer = "Hatti";
    gone.at = "Hatti";
    servants[1].contract = newContract({ fee: 14500, advance: 7000, startTurn: 1, untilTurn: 30 });
    return [s, gone];
  }

  test("A script king dismisses a servant that has not returned for three seasons and looks for another", async () => {
    let [s, gone] = missing();
    let king = new ScriptLeader(11);
    for (let turn = 5; turn <= 8; turn++) {
      s.turn = turn;
      let orders = (await king.decide(Views.for(s, "Egypt"))).orders;
      // Read so in seasons 5, 6 and 7; given up in the fourth season it still reads so.
      Assert.equal(turn === 8, holds(orders, dismiss(gone.id)));
      Assert.doesNotContain(orders, (o) => o.type !== "dismiss" && characterOf(o) === gone.id);
    }
  });

  test("A script king keeps a servant that comes home before it is given up", async () => {
    let [s, gone] = missing();
    let king = new ScriptLeader(11);
    for (let turn = 5; turn <= 9; turn++) {
      s.turn = turn;
      if (turn === 7) {
        // Home after two seasons of "has not returned", and away again on an errand for two more.
        gone.covers.length = 0;
        gone.employer = "Egypt";
        gone.at = null;
        gone.duty = "EnvoyOutbound";
        gone.missionTarget = "Babylonia";
      }
      let orders = (await king.decide(Views.for(s, "Egypt"))).orders;
      Assert.doesNotContain(dismiss(gone.id), orders);
    }
  });

  test("Script games with jobs done and offered again replay exactly", async () => {
    // Twenty seasons of the small world (small-world.ts): every starting job ends by turn 13, and errands are offered as new
    // jobs.
    let config = newGameConfig({ capMin: 20, capMax: 20, endMedian: 10000 });
    let runner = Object.assign(
      new GameRunner(
        newGame(Seed, config),
        scriptSeats(Seed),
        new ScriptMind(),
        new TemplateNarrator(),
      ),
      { writeChronicles: false },
    );
    await runner.prepare();
    while (await runner.playTurn()) {}
    Assert.equal(
      20,
      max(runner.state.scores, (x) => x.turn),
    );
    Assert.contains(
      [...runner.state.inbox.values()].flatMap((x) => x),
      (i) => i.title === "A job done",
    );
    let jobs = runner.log.decisions
      .filter((d) => d.key.includes("/orders/"))
      .map((d) => deserialize<TurnSubmission>(TurnSubmissionSchema, d.json))
      .flatMap((x) => x.orders.filter((o): o is HireOrder => o.type === "hire" && o.what != null));
    Assert.notEmpty(jobs);

    let replay = GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl()));
    replay.writeChronicles = false;
    await replay.prepare();
    while (await replay.playTurn()) {}
    Assert.equal(hash(GameStateSchema, runner.state), hash(GameStateSchema, replay.state));
  });
});
