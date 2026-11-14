import { describe, test } from "vitest";
import { Views, newGame, newGameConfig } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { WarPlay, keptBond, small, willing } from "../src/bots/siege-tactics.ts";
import { strategy } from "../src/bots/statecraft-strategy.ts";
import { Assert, smallWorld } from "../../engine/test/support.ts";

// Item 17++a: a script king wages the war he chooses. A plain peace is its price, not a bar; an ally is never the war.
describe("WarPlayTests", () => {
  const hattiAtPeaceWithKaska = (): [Board, Brain] => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Hatti", "Kaska");
    const view = Views.for(s, "Hatti");
    const brain = new Brain("Hatti", 4);
    brain.learn(view, new Board(view));
    brain.rel.get("Kaska").treaty = true;
    return [new Board(view, brain.remembered(view)), brain];
  };

  test("A king fights the war he chose on a king at peace with him; one that ignores this does not", () => {
    const [b, brain] = hattiAtPeaceWithKaska();
    brain.warTarget = "Kaska";
    Assert.true(brain.isFriend("Kaska"));
    Assert.false(keptBond(b, brain, "Kaska"));
    Assert.true(willing(b, brain, "Kaska", null));
    WarPlay.off = true;
    try {
      Assert.false(willing(b, brain, "Kaska", null));
    } finally {
      WarPlay.off = false;
    }
  });

  test("A friend made the war target is the one betrayed, in everything, before any other", () => {
    const [b, brain] = hattiAtPeaceWithKaska();
    brain.warTarget = "Kaska";
    brain.warSince = b.v.turn;
    strategy(b, brain, brain.r(b.v.turn, "test"));
    Assert.equal("Kaska", brain.warTarget);
    Assert.equal("Kaska", brain.betraying);
    WarPlay.off = true;
    try {
      strategy(b, brain, brain.r(b.v.turn, "test"));
      Assert.notEqual("Kaska", brain.betraying);
    } finally {
      WarPlay.off = false;
    }
  });

  test("An ally is a bond kept: never the war, and a war on one ends", () => {
    const [b, brain] = hattiAtPeaceWithKaska();
    brain.rel.get("Kaska").allied = true;
    brain.warTarget = "Kaska";
    brain.warSince = b.v.turn;
    Assert.true(keptBond(b, brain, "Kaska"));
    strategy(b, brain, brain.r(b.v.turn, "test"));
    Assert.notEqual("Kaska", brain.warTarget);
    Assert.false(willing(b, brain, "Kaska", null));
  });

  test("A small king keeps a plain peace as a bar to his war of choice, by his strength now, not his rank", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Hatti", "Kaska");
    const at = (me: "Hatti" | "Kaska", strength: number | null): [Board, Brain] => {
      const view = Views.for(s, me);
      if (strength !== null) view.strength = strength;
      const brain = new Brain(me, 4);
      brain.learn(view, new Board(view));
      brain.rel.get(me === "Hatti" ? "Kaska" : "Hatti").treaty = true;
      return [new Board(view, brain.remembered(view)), brain];
    };
    const [city, cityBrain] = at("Kaska", null);
    Assert.true(small(city));
    Assert.true(keptBond(city, cityBrain, "Hatti"));
    const [grown, grownBrain] = at("Kaska", 1_000_000);
    Assert.false(small(grown));
    Assert.false(keptBond(grown, grownBrain, "Hatti"));
    const [fallen, fallenBrain] = at("Hatti", 1);
    Assert.true(small(fallen));
    Assert.true(keptBond(fallen, fallenBrain, "Kaska"));
  });
});
