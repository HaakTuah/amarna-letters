import { describe, test } from "vitest";
import { scriptSeats, seasons } from "./small-world.ts";
import { AllPowers, Dict, type GameState, Wealth, earningsTotal, gain, newCharacter, newContract, newHoard, sum } from "@amarna/engine";
import { GameRunner, type ISeat, ScriptLeader, ScriptMind, TemplateNarrator, batchReport, playGame } from "@amarna/game";
import { selfText } from "@amarna/llm";
import { Assert, toDict } from "../../engine/test/support.ts";

// <summary>The richest characters, ranked at the end of a game where the game's end is shown.</summary>
describe("RichestTests", () => {
  function script(s: GameState): GameRunner {
    return Object.assign(
      new GameRunner(
        s,
        scriptSeats(s.seed),
        new ScriptMind(),
        new TemplateNarrator(),
      ),
      { writeChronicles: false },
    );
  }

  test("At the end of a game the batch ranks the living characters by wealth", async () => {
    let runner: GameRunner | null = null;
    // A short game of the small world (small-world.ts).
    let summary = (await playGame(3, (s) => (runner = script(s)), false, seasons(12)))[0];
    let state = runner!.state;
    Assert.true(state.ended);

    // What it holds is what it gained, by source, less what it spent (item 11a: living, keep, loans made, what was taken).
    Assert.all(state.characters.filter((c) => c.status !== "Dead"), (c) => Assert.equal(earningsTotal(c.earned) - c.earned.spent, c.purse + (c.hoard?.gold ?? 0)));
    Assert.contains(state.characters, (c) => c.purse > 0);

    let ranking = Wealth.ranking(state);
    Assert.equal(ranking.map(Wealth.line), summary.richest);
    Assert.equal(ranking[0].total, summary.topWealth);
    Assert.equal(
      sum(state.characters, (c) => earningsTotal(c.earned)),
      earningsTotal(summary.gained),
    );
    // The living first, richest first; then the dead, by what they held when they died (item 11b: people die of the road).
    Assert.true(ranking.slice(1).every((x, i) => (ranking[i].dead === x.dead ? ranking[i].total >= x.total : !ranking[i].dead)));

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
      contract: newContract({ fee: 60, advance: 30, untilTurn: 6 }),
      owed: new Dict([["Hatti", 12]]),
      hoard: newHoard({ at: "Egypt", gold: 40 }),
    });
    gain(c, 100, "Fees");
    let self = selfText(c, 9);
    Assert.contains("You are on a job for the king of Egypt: 60 shekels for the term, through season 6; 30 were handed over when you took it, and the rest, 30, falls due when the job is done", self);
    Assert.contains("The king of Hatti let 12 shekels of your fee fall due and did not pay them.", self);
    Assert.contains("Your purse holds 100 shekels; your hoard at Egypt holds 40. It is now season 9.", self);
    // Item 11a: its goal and its way to it.
    Assert.contains("Your goal is wealth", self);
    Assert.doesNotContain("rank of", self);
    Assert.doesNotContain("back pay", self);

    c.owed.clear();
    c.hoard = null;
    Assert.contains("Your purse holds 100 shekels. It is now season 9.", selfText(c, 9));
  });
});
