import { describe, test } from "vitest";
import { Views, newGame, newGameConfig, removeAll, single } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { OccupyPlay, obeyIn } from "../src/bots/occupy.ts";
import { Tactics } from "../src/bots/tactics.ts";
import { Assert, smallWorld } from "../../engine/test/support.ts";

// Item 17++a: a script king reckons from his own view whether land would obey an army of his standing in it, and keeps the
// army there until it does.
describe("OccupyPlayTests", () => {
  /** Hatti's army from Hattusa standing in Kaska, a land of herders under chiefs (no walls), whose own troop is gone. */
  const inKaska = () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Hatti", "Kaska");
    removeAll(s.units, (u) => u.power === "Kaska");
    single(s.units, (u) => u.province === "hattusa").province = "kaska";
    return s;
  };

  test("Land would obey a large army sooner than a small one, and a Great King's homeland not a small army at all", () => {
    const s = inKaska();
    const b = new Board(Views.for(s, "Hatti"));
    const big = obeyIn(b, "kaska", 10000);
    const small = obeyIn(b, "kaska", 1000);
    Assert.true(Number.isFinite(big));
    Assert.true(small > big);
    // A season of word that its people are restless brings it sooner.
    const sv = Views.for(s, "Hatti");
    sv.moods.push({ province: "kaska", mood: "restless", seen: sv.turn, source: "spy" });
    Assert.true(obeyIn(new Board(sv), "kaska", 10000) <= big);
    // Babylonia's own Suhu, with its love for its king fresh, does not obey a lone army of a thousand.
    const g = newGame(1, newGameConfig({ catastropheChance: 0 }));
    Assert.false(Number.isFinite(obeyIn(new Board(Views.for(g, "Assyria")), "suhu", 1000)));
  });

  test("An army standing in land that would obey stays there until it does; a king that ignores obedience does not keep it", () => {
    const army = (): string | undefined => {
      const s = inKaska();
      const view = Views.for(s, "Hatti");
      const brain = new Brain("Hatti", 4);
      brain.learn(view, new Board(view));
      brain.warTarget = "Kaska";
      const plan = Tactics.make(new Board(view, brain.remembered(view)), brain);
      const o = plan.orders.tryGet("kaska");
      return o === undefined ? undefined : `${o.type}:${plan.role.tryGet("kaska")}`;
    };
    Assert.equal("hold:occupy", army());
    OccupyPlay.off = true;
    try {
      Assert.notEqual("hold:occupy", army());
    } finally {
      OccupyPlay.off = false;
    }
  });
});
