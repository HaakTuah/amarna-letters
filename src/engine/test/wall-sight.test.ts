import { describe, test } from "vitest";
import {
  AllPowers,
  Dict,
  type Order,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  fortify,
  newGame,
  newGameConfig,
  newId,
  newTurnSubmission,
  newUnit,
  wallsOf,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// A court sees the walls standing now only where it can see troops, and knows them elsewhere as it last saw them (at the
// start, as the map gives them). Walls rise for gold and fall to an earthquake or unpaid upkeep out of other courts'
// sight, and a treasury and a catastrophe are known exactly only to their own king (since the review of the siege
// package; until then every court saw every wall as it stood).
describe("WallSightTests", () => {
  function orders(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  test("At the start every court knows the walls the map gives", () => {
    let s = newGame(1);
    for (const p of AllPowers) Assert.equal(s.walls, Views.for(s, p).walls);
  });

  test("Walls raised out of a court s sight are not seen by it", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    Assert.doesNotContain("thebes", Views.sight(s, WorldMap.default, "Babylonia"));
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders("Egypt", fortify("thebes")));
    Assert.equal(1, wallsOf(s, "thebes"));
    Assert.equal(1, Views.for(s, "Egypt").walls.get("thebes"));
    Assert.false(Views.for(s, "Babylonia").walls.has("thebes"));
  });

  test("A court sees walls where it sees troops and remembers them as last seen", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    Assert.contains("mari", Views.sight(s, WorldMap.default, "Mitanni"));
    Assert.doesNotContain("mari", Views.sight(s, WorldMap.default, "Egypt"));

    // Mari's walls rise out of Egypt's sight: Mitanni, next to it, sees them; Egypt knows them as the map gives them.
    s.walls.set("mari", 3);
    Assert.equal(3, Views.for(s, "Mitanni").walls.get("mari"));
    Assert.equal(2, Views.for(s, "Egypt").walls.get("mari"));

    // An Egyptian army in Damascus, next to Mari, sees them; the season resolves, and Egypt remembers them as it saw them.
    let army = newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: "damascus" });
    s.units.push(army);
    Assert.equal(3, Views.for(s, "Egypt").walls.get("mari"));
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict<Power, TurnSubmission>());
    Assert.equal(3, s.wallsSeen.get("Egypt").get("mari"));

    // The army gone, Mari's walls fall: Egypt still knows them at 3, Mitanni sees them at 1.
    s.units.splice(s.units.indexOf(army), 1);
    s.walls.set("mari", 1);
    Assert.equal(3, Views.for(s, "Egypt").walls.get("mari"));
    Assert.equal(1, Views.for(s, "Mitanni").walls.get("mari"));

    // Walls thrown down where a court cannot see are still there for it; where it sees, they are gone.
    s.walls.delete("mari");
    Assert.equal(3, Views.for(s, "Egypt").walls.get("mari"));
    Assert.false(Views.for(s, "Mitanni").walls.has("mari"));
  });

  test("Walls that fall for want of upkeep are seen only where troops are seen", () => {
    // Upkeep far above what the treasury holds, so the walls cannot be kept (a test number, not the game's).
    let s = newGame(1, newGameConfig({ catastropheChance: 0, wallUpkeep: 500 }));
    // Thebes walled two levels above the map's none, and an empty treasury: they fall as the season opens.
    s.walls.set("thebes", 2);
    s.wallsSeen.get("Babylonia").set("thebes", 2);
    s.treasuries.get("Egypt").gold = 0;
    new TurnEngine(s).beginTurn();
    Assert.true(wallsOf(s, "thebes") < 2);
    Assert.equal(wallsOf(s, "thebes"), Views.for(s, "Egypt").walls.getOrDefault("thebes", 0));
    Assert.equal(2, Views.for(s, "Babylonia").walls.get("thebes"));
  });
});
