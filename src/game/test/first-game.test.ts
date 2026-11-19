import { describe, test } from "vitest";
import { FirstGameAbsent, FirstGamePowers, TurnEngine, Views, WorldMap, firstGameConfig, isFirstGame, newGame, newGameConfig } from "@amarna/engine";
import { GameRunner, ScriptMind, TemplateNarrator, playGame } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";
import { scriptSeats } from "./small-world.ts";

/** The first game (item 18b): Egypt, Hatti and Mitanni with the powers between them, the others absent, on a short curve. */
describe("FirstGameTests", () => {
  test("The absent powers start out of the game, with nothing of theirs left in it", () => {
    const s = newGame(1, firstGameConfig());
    Assert.true(isFirstGame(s.config));
    Assert.false(isFirstGame(newGameConfig()));
    for (const p of FirstGameAbsent) {
      Assert.true(s.eliminated.includes(p), p);
      Assert.false([...s.owner.values()].includes(p), p);
      Assert.false(s.units.some((u) => u.power === p), p);
      Assert.false(s.characters.some((c) => c.employer === p || c.at === p), p);
      Assert.false(s.tablets.some((t) => t.seals.includes(p)), p);
      Assert.false(s.debts.some((d) => d.lender === p || d.borrower === p), p);
    }
    for (const p of FirstGamePowers) Assert.true([...s.owner.values()].includes(p), p);
    // No court is told an absent power fell: it was never in the age.
    Assert.empty(Views.for(s, "Egypt").fallen);
    Assert.contains("Egypt, Hatti and Mitanni hold their thrones", s.events[0].text);
    // The pool's baseline is the people in play, as in the full game, so no newcomers come to fill the absent courts' places.
    Assert.equal(s.characters.length, s.baseline);
    Assert.equal(newGame(1).characters.length, newGame(1).baseline);
    // The short curve, with a cap near thirty.
    Assert.true(s.finalSeason !== null && s.finalSeason <= 32);
  });

  // The map in play is set by each game as it begins and as its engine is built, so games of both kinds in one process
  // ("Same seed, same game") never play on each other's map.
  test("A first game and a full game in one process each play on their own map", () => {
    const first = newGame(2, firstGameConfig());
    Assert.true(WorldMap.default.outside.size > 0);
    Assert.true(WorldMap.default.isAbsent("Babylonia"));
    const full = newGame(2);
    Assert.equal(0, WorldMap.default.outside.size);
    Assert.true(new TurnEngine(first).map.landProvinces.length < WorldMap.full.landProvinces.length);
    Assert.true(WorldMap.default.isAbsent("Babylonia"));
    new TurnEngine(full);
    Assert.false(WorldMap.default.isAbsent("Babylonia"));
  });

  test("The first game plays to its end and replays exactly", async () => {
    const summary = (
      await playGame(
        3,
        (s) => new GameRunner(s, scriptSeats(3, ["Egypt", "Hatti", "Mitanni"]), new ScriptMind(), new TemplateNarrator()),
        true,
        firstGameConfig(),
      )
    )[0];
    Assert.true(summary.replayMatches);
    Assert.true(summary.turns <= 32);
    Assert.notEmpty(summary.winners);
  }, 300000);
});
