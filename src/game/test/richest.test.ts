import { describe, test } from "vitest";
import { AllPowers, Dict, type GameState, Wealth, earningsTotal, gain, newCharacter, newContract, sum } from "@amarna/engine";
import { GameRunner, type ISeat, ScriptLeader, ScriptMind, TemplateNarrator, batchReport, playGame } from "@amarna/game";
import { selfText } from "@amarna/llm";
import { Assert, toDict } from "../../engine/test/support.ts";

// <summary>The richest characters, ranked at the end of a game where the game's end is shown.</summary>
describe("RichestTests", () => {
  function script(s: GameState): GameRunner {
    return Object.assign(
      new GameRunner(
        s,
        toDict(
          AllPowers,
          (p) => p,
          (): ISeat => new ScriptLeader(s.seed),
        ),
        new ScriptMind(),
        new TemplateNarrator(),
      ),
      { writeChronicles: false },
    );
  }

  test("At the end of a game the batch ranks the living characters by wealth", async () => {
    let runner: GameRunner | null = null;
    let summary = (await playGame(3, (s) => (runner = script(s)), false, null))[0];
    let state = runner!.state;
    Assert.true(state.ended);

    // Nothing is spent yet: every purse is exactly what its owner gained, by source.
    Assert.all(state.characters, (c) => Assert.equal(earningsTotal(c.earned), c.purse));
    Assert.contains(state.characters, (c) => c.purse > 0);

    let ranking = Wealth.ranking(state);
    Assert.equal(ranking.map(Wealth.line), summary.richest);
    Assert.equal(ranking[0].total, summary.topWealth);
    Assert.equal(
      sum(state.characters, (c) => earningsTotal(c.earned)),
      earningsTotal(summary.gained),
    );
    Assert.true(ranking.slice(1).every((x, i) => ranking[i].total >= x.total));

    let report = batchReport([summary]);
    Assert.contains("The richest characters (the second game, played under the kings'):", report);
    Assert.contains(`  The richest held ${summary.topWealth} shekels at the end on average (range ${summary.topWealth}-${summary.topWealth}).`, report);
    Assert.contains(Wealth.WhatCounts, report);
  });

  test("A model character knows its own wealth and nothing of the ranking", () => {
    let c = newCharacter({
      id: "c1",
      name: "Mane",
      origin: "Thebes",
      persona: "A careful man.",
      status: "Employed",
      employer: "Egypt",
      contract: newContract({ wage: 10 }),
      backPay: new Dict([
        ["Egypt", 30],
        ["Hatti", 12],
      ]),
    });
    gain(c, 100, "Wages");
    let self = selfText(c, 9);
    Assert.contains("Your lord owes you 30 shekels of back pay, paid when you return to his court.", self);
    Assert.contains("The king of Hatti owes you 12 shekels of back pay, paid if you ever stand at his court again.", self);
    Assert.contains("Your purse holds 100 shekels; with the back pay kings owe you, you are worth 142 shekels. It is now season 9.", self);
    Assert.doesNotContain("richest", self);
    Assert.doesNotContain("rank", self);

    c.backPay.clear();
    Assert.contains("Your purse holds 100 shekels. It is now season 9.", selfText(c, 9));
  });
});
