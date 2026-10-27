import { describe, test } from "vitest";
import { GameConfigSchema, deserialize, newGame, serialize } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { fallenSeesAll, newSettings, toConfig } from "../src/session/settings.ts";

// A fallen player's game is over (built with the siege package, Build order item 5): he watches the rest in god view, a
// table setting on by default; off, he keeps his own view. On one screen nobody sees all while a human seat still plays.
describe("FallenViewTests", () => {
  test("A fallen human seat watches in god view unless the table turned it off", () => {
    let s = newGame(1);
    Assert.true(newSettings().fallenSeeAll);
    Assert.true(toConfig(newSettings()).fallenSeeAll);
    Assert.false(fallenSeesAll(s, ["Arzawa"]));

    s.eliminated.push("Arzawa");
    Assert.true(fallenSeesAll(s, ["Arzawa"]));
    // While another human seat at the same screen still plays, nobody sees all.
    Assert.false(fallenSeesAll(s, ["Arzawa", "Hatti"]));
    // A game with no human seat is spectated in god view as before, which this rule does not touch.
    Assert.false(fallenSeesAll(s, []));

    // The table turned it off: the fallen player keeps the view of his kingdom.
    let off = newGame(1, toConfig({ ...newSettings(), fallenSeeAll: false }));
    off.eliminated.push("Arzawa");
    Assert.false(fallenSeesAll(off, ["Arzawa"]));
    // The setting travels with the game's log, so a game loaded to continue keeps the table's choice.
    Assert.false(deserialize<typeof off.config>(GameConfigSchema, serialize(GameConfigSchema, off.config)).fallenSeeAll);
  });
});
