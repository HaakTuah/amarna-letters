import { describe, test } from "vitest";
import { FirstGameAbsent, FirstGamePowers, Views, firstGameConfig, isFirstGame, newGame, newGameConfig } from "@amarna/engine";
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
    // The short curve, with a cap near thirty.
    Assert.true(s.finalSeason !== null && s.finalSeason <= 32);
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
