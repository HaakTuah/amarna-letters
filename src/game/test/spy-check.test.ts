import { describe, test } from "vitest";
import { HSet, TurnEngine, Views, WorldMap, newCharacter, newGame, newGameConfig, newGovernor, newId, newTraits, notify, type GameState, type Order } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
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

  test("A governor whose letter says quiet where our spy finds unrest is caught and recalled", () => {
    const [s] = governed();
    notify(s, "Egypt", "Notice", "Your governor writes", "Amenemope, your governor of Nippur, writes that its people are quiet.");
    notify(s, "Egypt", "SpyReport", "A spy's report", "Babylonia has an army in Ur. The people of Nippur are restless under Egypt.");
    Assert.equal(["nippur"], hidden(new Board(Views.for(s, "Egypt"))));
    Assert.equal([{ type: "unseat", province: "nippur" }], recall(s));
  });

  test("A governor who writes the unrest himself, or a spy who finds the people quiet, catches nobody", () => {
    const [s] = governed();
    notify(s, "Egypt", "SpyReport", "A spy's report", "The people of Nippur are near revolt under Egypt.");
    notify(s, "Egypt", "Notice", "Your governor writes", "Amenemope, your governor of Nippur, writes that its people are near revolt.");
    Assert.equal([], hidden(new Board(Views.for(s, "Egypt"))));
    const [t] = governed();
    notify(t, "Egypt", "SpyReport", "A spy's report", "The people of Nippur are quiet under Egypt.");
    Assert.equal([], recall(t));
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
});
