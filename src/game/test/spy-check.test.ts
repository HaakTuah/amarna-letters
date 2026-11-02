import { describe, test } from "vitest";
import { HSet, TurnEngine, Views, WorldMap, newCharacter, newGame, newGameConfig, newGovernor, newId, newMoodRead, newTraits, notify, type GameState, type Order } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { unseatOrders } from "../src/bots/audit-play.ts";
import { hidden, spyCheckOrders, SpyCheckPlay } from "../src/bots/spy-check.ts";
import { Assert, removeAll } from "../../engine/test/support.ts";

// #459 (queued into item 17++ part C): a script king checks his governor's word against his own spy's, and recalls one
// caught hiding his people's unrest.
describe("SpyCheckTests", () => {
  function governed(): [GameState, string] {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    new TurnEngine(s).setOwner("nippur", "Egypt");
    // Some seasons on, so the court has heard that Nippur is its own.
    s.turn += 3;
    const c = newCharacter({ id: newId(s, "c"), name: "Amenemope", traits: newTraits({ loyalty: 20, greed: 50, ambition: 80, courage: 60, competence: 50 }), status: "Employed", employer: "Egypt", duty: "Governing", watchProvince: "nippur", grantedBy: "Egypt" });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "nippur", seat: "nippur", character: c.id, power: "Egypt", from: 0 }));
    removeAll(s.units, (u) => u.province === "nippur" || WorldMap.default.neighbors("nippur").includes(u.province));
    return [s, c.id];
  }
  const recall = (s: GameState): Order[] => {
    const orders: Order[] = [];
    spyCheckOrders(new Board(Views.for(s, "Egypt")), orders, new HSet<string>());
    return orders;
  };

  /** The governor's seasonal report of Nippur's mood, as the court has it: seen in `seen`, read now. */
  const reports = (s: GameState, mood: string, seen = s.turn, source: "governor" | "spy" = "governor"): void => {
    s.moodReads.push(newMoodRead({ power: "Egypt", province: "nippur", mood, seen, known: s.turn, source }));
  };

  test("A governor whose report says quiet where our spy finds unrest is caught and recalled", () => {
    const [s] = governed();
    reports(s, "quiet");
    notify(s, "Egypt", "SpyReport", "A spy's report", "Babylonia has an army in Ur. The people of Nippur are restless under Egypt.");
    Assert.equal(["nippur"], hidden(new Board(Views.for(s, "Egypt"))));
    Assert.equal([{ type: "unseat", province: "nippur" }], recall(s));
  });

  test("A governor who reports the unrest himself, or a spy who finds the people quiet, catches nobody", () => {
    const [s] = governed();
    // He wrote of the unrest seasons ago, and reports it still: no letter this season, but his word stands.
    notify(s, "Egypt", "SpyReport", "A spy's report", "The people of Nippur are near revolt under Egypt.");
    reports(s, "near revolt", s.turn - 1);
    Assert.equal([], hidden(new Board(Views.for(s, "Egypt"))));
    const [t] = governed();
    reports(t, "quiet");
    notify(t, "Egypt", "SpyReport", "A spy's report", "The people of Nippur are quiet under Egypt.");
    Assert.equal([], recall(t));
  });

  test("Only a report newer than the spy's counts: one the spy's word overtook, or calm by one step, catches nobody", () => {
    const [s] = governed();
    reports(s, "quiet", s.turn - 2);
    reports(s, "restless", s.turn - 1, "spy");
    notify(s, "Egypt", "SpyReport", "A spy's report", "The people of Nippur are restless under Egypt.");
    Assert.equal([], hidden(new Board(Views.for(s, "Egypt"))));
    const [t] = governed();
    reports(t, "uneasy");
    notify(t, "Egypt", "SpyReport", "A spy's report", "The people of Nippur are restless under Egypt.");
    Assert.equal([], hidden(new Board(Views.for(t, "Egypt"))));
  });

  test("Kings that read their governor alone never check", () => {
    const [s] = governed();
    notify(s, "Egypt", "SpyReport", "A spy's report", "The people of Nippur are restless under Egypt.");
    SpyCheckPlay.off = true;
    try {
      Assert.equal([], hidden(new Board(Views.for(s, "Egypt"))));
    } finally {
      SpyCheckPlay.off = false;
    }
  });

  test("The audit's find 4: a governor whose own reports call his land restless two seasons running is recalled", () => {
    const [s] = governed();
    const brain = new Brain("Egypt", 1);
    const recalled = (): Order[] => {
      const orders: Order[] = [];
      const v = Views.for(s, "Egypt");
      const b = new Board(v);
      brain.learn(v, b);
      unseatOrders(b, brain, orders, new HSet<string>());
      return orders.filter((o) => o.type === "unseat" && o.province === "nippur");
    };
    const report = (mood: string): void => {
      s.moodReads.push(newMoodRead({ power: "Egypt", province: "nippur", mood, seen: s.turn, known: s.turn, source: "governor" }));
    };
    report("restless");
    Assert.empty(recalled());
    s.turn++;
    report("quiet");
    Assert.empty(recalled());
    s.turn++;
    report("near revolt");
    Assert.empty(recalled());
    s.turn++;
    report("restless");
    Assert.single(recalled());
  });
});
