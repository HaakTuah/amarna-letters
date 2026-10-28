import { describe, test } from "vitest";
import {
  AllPowers,
  type Character,
  type GameState,
  GameStateSchema,
  type Power,
  type RenewOrder,
  type SeekCandidatesOrder,
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
  renew,
  feeFor,
} from "@amarna/engine";
import { GameLog, GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, temperament } from "@amarna/game";
import { Assert, holds, toDict } from "../../engine/test/support.ts";

// <summary>How a script king keeps its court: servants on notice it renews or lets go.</summary>
describe("ScriptCourtTests", () => {
  const Seed: number = 9;

  // <summary>The most a king of this temperament pays a servant: its hiring test.</summary>
  function limit(me: Power): number {
    return 15 + 25 * (1 - temperament(me, Seed).greed);
  }

  // <summary>A rich court whose first servant has given notice, asking ;  more servants at court.</summary>
  function court(me: Power, price: number | null, extra: number = 0): [GameState, Character] {
    let s = newGame(Seed);
    s.turn = 8;
    s.treasuries.get(me).gold = 5000;
    let c = first(s.characters, (x) => x.employer === me);
    c.contract = newContract({ fee: 60, advance: 60, startTurn: 1, untilTurn: 7, noticePrice: price, leavesTurn: price === null ? null : 9 });
    if (price === null) c.contract.untilTurn = 12;
    for (const more of s.characters.filter((x) => x.status === "Free").slice(0, extra)) {
      more.status = "Employed";
      more.employer = me;
      more.at = me;
      more.contract = newContract({ fee: 190, advance: 95, startTurn: 1, untilTurn: 20 });
    }
    return [s, c];
  }

  async function renewalsOf(s: GameState, me: Power): Promise<RenewOrder[]> {
    return (await new ScriptLeader(Seed).decide(Views.for(s, me))).orders.filter((o): o is RenewOrder => o.type === "renew");
  }

  test.each([["Egypt"], ["Babylonia"], ["Alashiya"]] as const)(
    "A script king renews a servant on notice it still wants at a price it would pay %s",
    async (me: Power) => {
      let price = Math.floor(limit(me));
      let [s, c] = court(me, price);
      Assert.equal([renew(c.id, feeFor(price, 6, 50, Views.for(s, me).trust), 6)], await renewalsOf(s, me));

      // A price above what its greed allows: it lets the servant go.
      [s] = court(me, price + 1);
      Assert.empty(await renewalsOf(s, me));
    },
  );

  test("A script king lets a servant on notice go when its court is big enough and never renews early", async () => {
    // Four others at court: as many as any script king wants.
    let [s] = court("Egypt", 10, 3);
    Assert.empty(await renewalsOf(s, "Egypt"));

    [s] = court("Egypt", null);
    Assert.empty(await renewalsOf(s, "Egypt"));
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
      // The court counts itself one short only once it has given the servant up.
      Assert.equal(turn === 8, orders.filter((o): o is SeekCandidatesOrder => o.type === "seekCandidates").length > 0);
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

  test("Script games with notices and renewals replay exactly", async () => {
    // Twenty seasons: every starting term ends by turn 13, so notices are given and answered.
    let config = newGameConfig({ capMin: 20, capMax: 20, endMedian: 10000 });
    let runner = Object.assign(
      new GameRunner(
        newGame(Seed, config),
        toDict(
          AllPowers,
          (p) => p,
          (_) => new ScriptLeader(Seed),
        ),
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
      (i) => i.title === "A servant gives notice",
    );
    let renewals = runner.log.decisions
      .filter((d) => d.key.includes("/orders/"))
      .map((d) => deserialize<TurnSubmission>(TurnSubmissionSchema, d.json))
      .flatMap((x) => x.orders.filter((o): o is RenewOrder => o.type === "renew"));
    Assert.notEmpty(renewals);

    let replay = GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl()));
    replay.writeChronicles = false;
    await replay.prepare();
    while (await replay.playTurn()) {}
    Assert.equal(hash(GameStateSchema, runner.state), hash(GameStateSchema, replay.state));
  });
});
