import { describe, test } from "vitest";
import { TurnSubmissionSchema, Views, newGame, newGameConfig, newMessageTrail, newTurnSubmission } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { bestGift, giftReturn, tributeReturn } from "../src/bots/investment.ts";
import { GameLog } from "../src/log.ts";
import { SpendingWatch } from "../src/spending-report.ts";
import { Assert, smallWorld } from "../../engine/test/support.ts";

/** Babylonia's court, after reading its first view, beside Assyria. */
function court(): { b: Board; brain: Brain } {
  const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Babylonia", "Assyria");
  const v = Views.for(s, "Babylonia");
  const b = new Board(v);
  const brain = new Brain("Babylonia", 1);
  brain.learn(v, b);
  return { b, brain };
}

describe("InvestmentTests", () => {
  test("A gift to a king who already means us no harm buys nothing, so none is sent (item 18, part E)", () => {
    const { b, brain } = court();
    const r = brain.rel.get("Assyria");
    r.trust = 1;
    r.treaty = true;
    r.allied = true;
    Assert.equal(0, giftReturn(b, brain, "Assyria", 100));
    Assert.equal(0, bestGift(b, brain, "Assyria", 1000));
  });

  test("A gift returns something once his hostility is off its floor, and is never more than what is spare", () => {
    const { b, brain } = court();
    const r = brain.rel.get("Assyria");
    r.trust = 1;
    r.treaty = true;
    r.allied = true;
    Assert.equal(0, giftReturn(b, brain, "Assyria", 100));
    r.allied = false;
    r.treaty = false;
    r.trust = 0;
    Assert.true(giftReturn(b, brain, "Assyria", 100) > 0);
    Assert.true(bestGift(b, brain, "Assyria", 25) <= 25);
  });

  test("A tribute buys no peace from an overlord who attacked us within the year", () => {
    const { b, brain } = court();
    Assert.true(tributeReturn(b, brain, "Assyria", 3) > 0);
    brain.rel.get("Assyria").lastAttackedUs = b.v.turn;
    Assert.equal(0, tributeReturn(b, brain, "Assyria", 3));
  });
});

describe("SpendingReportTests", () => {
  test("The spending watch counts a share of the harvest raised and the gold a host paid at his audiences", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Babylonia", "Assyria");
    const watch = new SpendingWatch(s);
    const mine = [...s.owner.entries()].find(([, o]) => o === "Babylonia")![0];
    s.shares.set(mine, 50);
    s.trails.push(newMessageTrail({ id: "m1", from: "Assyria", to: "Babylonia", audienceTurn: 1, outcomes: ["accepted 1 mina from Babylonia", "Babylonia sent back 20 shekels"] }));
    const log = new GameLog();
    log.record("t1/orders/Babylonia", TurnSubmissionSchema, newTurnSubmission());
    watch.season(s, 1, log);
    const x = watch.end().seasons.find((k) => k.power === "Babylonia")!;
    Assert.equal(1, x.taxUp);
    Assert.equal(80, x.given);
  });
});
