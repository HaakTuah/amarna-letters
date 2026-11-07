import { describe, test } from "vitest";
import { type GameState, Natures, ReignData, TurnEngine, Views, newGame, newGameConfig } from "@amarna/engine";
import { Lines } from "../src/model/heirs.ts";
import { Assert, smallWorld } from "./support.ts";

// Item 18, "Temperament becomes a setting": the kings of 1346 by the sources, or rolled for the game.
describe("RolledTraitsTests", () => {
  const near = (traits: readonly number[], nature: readonly number[]): boolean => traits.every((v, i) => Math.abs(v - nature[i]) <= ReignData.vary);

  test("By default each king's traits are the sources', varied a little; rolled, they are the game's own", () => {
    const sources = newGame(3);
    const rolled = newGame(3, newGameConfig({ rolledTraits: true }));
    for (const p of ["Egypt", "Hatti", "Babylonia"] as const) Assert.true(near(sources.reigns.get(p).traits, Natures[p].traits));
    Assert.true((["Egypt", "Hatti", "Babylonia", "Mitanni"] as const).some((p) => !near(rolled.reigns.get(p).traits, Natures[p].traits)));
    // Rolled the same way for the same seed, so a game replays.
    Assert.equal(rolled.reigns.get("Egypt").traits, newGame(3, newGameConfig({ rolledTraits: true })).reigns.get("Egypt").traits);
  });

  test("A seat knows whether rivals are known by their history", () => {
    Assert.false(Views.for(newGame(3), "Egypt").rolledTraits);
    Assert.true(Views.for(newGame(3, newGameConfig({ rolledTraits: true })), "Egypt").rolledTraits);
  });

  test("Rolled, a record heir keeps his name but not his nature from the sources", () => {
    const heirOf = (rolled: boolean): GameState => {
      const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0, rolledTraits: rolled })), "Egypt", "Hatti");
      const e = new TurnEngine(s);
      const c = s.characters.find((x) => x.id === s.reigns.get("Hatti").character)!;
      c.status = "Dead";
      e.kingDied(c, "for the test", e.courtAt("Hatti"));
      return s;
    };
    const record = Lines.Hatti!.heirs[0];
    const sources = heirOf(false);
    const rolled = heirOf(true);
    Assert.equal(sources.reigns.get("Hatti").name, rolled.reigns.get("Hatti").name);
    Assert.equal(record.name, rolled.reigns.get("Hatti").name);
    if (record.traits !== undefined) Assert.notEqual(sources.reigns.get("Hatti").traits, rolled.reigns.get("Hatti").traits);
  });
});
