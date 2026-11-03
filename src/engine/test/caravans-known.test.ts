import { describe, test } from "vitest";
import { Dict, TurnEngine, Views, caravanGone, newCaravan, newGame, newGameConfig, newMarketSeen, newOwnerChange, newWord, reportCaravan, setOut, type GameState } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// Bug #540 ("Distance inside your own realm"): a court knows its caravan far off only as word of it comes, never before
// word of its setting out, whatever road it turns onto; and the word a caravan brings home to a far province reaches the
// court only when word of its homecoming could.
describe("CaravansKnownTests", () => {
  /** Egypt holding Nippur, a season's courier ride and more from Akhetaten, from the start; season `turn`. */
  function world(turn: number): GameState {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
    s.owner.set("nippur", "Egypt");
    s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
    s.turn = turn;
    return s;
  }

  test("A caravan set out from a far province is not known before word of its setting out, though it turns back in near land", () => {
    const s = world(5);
    const e = new TurnEngine(s);
    Assert.equal(0, e.wordTo("Egypt", "akhetaten"));
    Assert.true(e.wordTo("Egypt", "nippur") >= 1);
    // Set out from Nippur this season; then turned round in near land, its route beginning there now.
    const c = newCaravan({ id: "v900", power: "Egypt", from: "nippur", to: "babylon", grain: 30, route: ["nippur", "babylon"], since: 5 });
    setOut(s, c);
    c.route = ["akhetaten", "nippur"];
    c.at = 0;
    reportCaravan(c, 5);
    const heard = 5 + e.wordTo("Egypt", "nippur") + 1;
    for (; s.turn < heard; s.turn++) Assert.equal(0, Views.caravansKnown(s, "Egypt").length);
    Assert.equal(1, Views.caravansKnown(s, "Egypt").length);
  });

  test("Word of a caravan once come stays come, though the season's roads lengthen the couriers' ride", () => {
    // Hattusa is within Pharaoh's couriers' season in the first season of the year and beyond it in the second.
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");
    s.owner.set("hattusa", "Egypt");
    s.turn = 1;
    Assert.equal(0, new TurnEngine(s).wordTo("Egypt", "hattusa"));
    s.turn = 2;
    Assert.equal(1, new TurnEngine(s).wordTo("Egypt", "hattusa"));
    s.turn = 1;
    const c = newCaravan({ id: "v902", power: "Egypt", from: "hattusa", to: "nesa", grain: 30, route: ["hattusa", "nesa"], since: 1 });
    setOut(s, c);
    Assert.equal(1, Views.caravansKnown(s, "Egypt").length);
    reportCaravan(c, 1);
    for (s.turn = 2; s.turn <= 3; s.turn++) Assert.equal(1, Views.caravansKnown(s, "Egypt").length);
  });

  test("A caravan home to a far province with nothing to carry on brings its word to the court when word of its homecoming does", () => {
    const s = world(5);
    const e = new TurnEngine(s);
    const c = newCaravan({ id: "v901", power: "Egypt", from: "nippur", to: "babylon", route: ["babylon", "nippur"], at: 1, returning: true, since: 3 });
    c.word = newWord({ markets: new Dict([["babylon", newMarketSeen({ price: 123, turn: 4 })]]) });
    setOut(s, c);
    e.caravanHome(c);
    Assert.false(s.marketsSeen.tryGet("Egypt")?.has("babylon") ?? false);
    const heard = 5 + e.wordTo("Egypt", "nippur") + 1;
    for (s.turn = 6; s.turn < heard; s.turn++) {
      new TurnEngine(s).caravanWordsHome();
      Assert.false(s.marketsSeen.tryGet("Egypt")?.has("babylon") ?? false);
    }
    new TurnEngine(s).caravanWordsHome();
    Assert.equal(123, s.marketsSeen.get("Egypt").get("babylon").price);
  });

  test("A caravan lost on the road takes what it learned with it: its word never reaches its court", () => {
    const s = world(5);
    const c = newCaravan({ id: "v903", power: "Egypt", from: "nippur", to: "babylon", route: ["babylon", "nippur"], at: 1, returning: true, since: 3 });
    c.word = newWord({ markets: new Dict([["babylon", newMarketSeen({ price: 123, turn: 4 })]]) });
    setOut(s, c);
    caravanGone(s, c);
    for (s.turn = 6; s.turn <= 10; s.turn++) new TurnEngine(s).caravanWordsHome();
    Assert.false(s.marketsSeen.tryGet("Egypt")?.has("babylon") ?? false);
  });
});
