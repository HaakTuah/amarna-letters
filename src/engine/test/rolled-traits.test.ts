import { describe, test } from "vitest";
import { type GameState, Natures, ReignData, TurnEngine, Views, newGame, newGameConfig } from "@amarna/engine";
import { Lines } from "../src/model/heirs.ts";
import { Assert, smallWorld } from "./support.ts";

// Item 18, "Temperament becomes a setting": the kings of 1346 by the sources, or rolled for the game.
describe("RolledTraitsTests", () => {
  const near = (traits: readonly number[], nature: readonly number[]): boolean => traits.every((v, i) => Math.abs(v - nature[i]) <= ReignData.vary);

  test("By default each king's traits are the sources', varied a little; rolled, they are the game's own", () => {
    const sources = smallWorld(newGame(3), "Egypt", "Hatti", "Babylonia", "Mitanni");
    const rolled = smallWorld(newGame(3, newGameConfig({ rolledTraits: true })), "Egypt", "Hatti", "Babylonia", "Mitanni");
    for (const p of ["Egypt", "Hatti", "Babylonia"] as const) Assert.true(near(sources.reigns.get(p).traits, Natures[p].traits));
    Assert.true((["Egypt", "Hatti", "Babylonia", "Mitanni"] as const).some((p) => !near(rolled.reigns.get(p).traits, Natures[p].traits)));
    // Rolled the same way for the same seed, so a game replays.
    Assert.equal(rolled.reigns.get("Egypt").traits, smallWorld(newGame(3, newGameConfig({ rolledTraits: true })), "Egypt").reigns.get("Egypt").traits);
  });

  test("A seat knows whether rivals are known by their history", () => {
    Assert.false(Views.for(smallWorld(newGame(3), "Egypt"), "Egypt").rolledTraits);
    Assert.true(Views.for(smallWorld(newGame(3, newGameConfig({ rolledTraits: true })), "Egypt"), "Egypt").rolledTraits);
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
    // What the record says of his deeds is told only of the sources' man: rolled, his kin alone.
    if (record.about !== "") {
      Assert.contains(record.about, sources.reigns.get("Hatti").about);
      Assert.false(rolled.reigns.get("Hatti").about.includes(record.about));
    }
  });
});
