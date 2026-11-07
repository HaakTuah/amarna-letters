import { describe, test } from "vitest";
import { KingTraitValues, Natures, PowerValues, ReignData, Views, drawTraits, newGame, standout } from "@amarna/engine";
import { Assert } from "./support.ts";

// The kings as persons (build order item 17b, part A): each king's traits from the sources, varied a little in every
// game, kept as his reign and shown to his own seat.
describe("KingsTests", () => {
  test("Each king reigns with his own traits, his nature's moved at most ten points either way, the same for the same seed", () => {
    const a = newGame(3);
    const b = newGame(3);
    for (const p of PowerValues) {
      const r = a.reigns.get(p);
      Assert.equal(KingTraitValues.length, r.traits.length);
      Assert.equal(1, r.since);
      Assert.equal(drawTraits(3, p, Natures[p].traits), r.traits);
      Assert.equal(r.traits, b.reigns.get(p).traits);
      r.traits.forEach((t, i) => Assert.inRange(t, Math.max(0, Natures[p].traits[i] - ReignData.vary), Math.min(100, Natures[p].traits[i] + ReignData.vary)));
    }
    // Another game draws them anew.
    Assert.true(PowerValues.some((p) => newGame(4).reigns.get(p).traits.join() !== a.reigns.get(p).traits.join()));
  });

  test("The corrections the sources call for: Akhenaten unwarlike and ungenerous, Suppiluliuma patient and no forger", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = newGame(seed);
      const t = (p: string, k: (typeof KingTraitValues)[number]): number => s.reigns.get(p).traits[KingTraitValues.indexOf(k)];
      Assert.true(t("Egypt", "aggression") <= 30 && t("Egypt", "generosity") <= 35 && t("Egypt", "pride") >= 80);
      Assert.true(t("Hatti", "caution") >= 50 && t("Hatti", "honesty") >= 40 && t("Hatti", "cunning") >= 70);
      Assert.true(t("Mitanni", "generosity") >= 80 && t("Arzawa", "cunning") < 60);
    }
  });

  test("A seat sees its own king's traits, and a model king hears them in words", () => {
    const s = newGame(2);
    Assert.equal(s.reigns.get("Babylonia").traits, Views.for(s, "Babylonia").traits);
    // The three furthest from the middle, the furthest first; of two as far, the first in the list.
    Assert.equal(["proud", "peaceable", "honest"], standout([10, 50, 90, 50, 50, 95, 50, 50, 50, 50]));
  });
});
