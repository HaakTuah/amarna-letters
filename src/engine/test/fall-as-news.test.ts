import { describe, test } from "vitest";
import { Dict, type GameState, type Power, TurnEngine, type TurnSubmission, WorldMap, EconomyData, newGame, newGameConfig, newId, newSiege, newUnit, ownedBy, travelTurns, wallsOf } from "@amarna/engine";
import { removeAll, Assert, smallWorld } from "./support.ts";

// Item 13+, the owner's answers to item 13's review: what is left of a fallen kingdom hears of its fall as word reaches it.
// Since item 17b only a realm that holds nothing falls, so what is left is its armies in the field (`turn/falls.ts`).
describe("FallAsNewsTests", () => {
  function season(s: GameState, orders: Dict<Power, TurnSubmission> = new Dict()): void {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
  }

  // Seed 1, no catastrophes: Babylon is all Babylonia holds, and Assyria's army is one season from its surrender.
  function babylonFalls(): GameState {
    const s = smallWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 })), "Assyria", "Babylonia");
    for (const id of ownedBy(s, "Babylonia")) if (id !== "babylon") s.owner.set(id, null);
    removeAll(s.units, (u) => u.power === "Babylonia" || u.province === "babylon");
    const army = newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "babylon", men: 3000 });
    s.units.push(army);
    s.sieges.push(newSiege({ province: "babylon", power: "Assyria", unitId: army.id, progress: wallsOf(s, "babylon") * EconomyData.breachPerLevel - 1, since: 1 }));
    return s;
  }

  test("A fallen kingdom's army waiting for the word presses no siege for its dead king", () => {
    const s = babylonFalls();
    // Babylonia's army besieging Assyria's Arbela, two seasons from its surrender when Babylon falls.
    s.walls.set("arbela", 2);
    removeAll(s.units, (u) => u.province === "arbela");
    const army = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "arbela", men: 3000 });
    s.units.push(army);
    const siege = newSiege({ province: "arbela", power: "Babylonia", unitId: army.id, progress: 2 * EconomyData.breachPerLevel - 2, since: 1 });
    s.sieges.push(siege);
    season(s);
    Assert.contains("Babylonia", s.eliminated);
    const progress = siege.progress;
    // Its army holds before the city, but the siege goes no further, and the city is not given to a king who is no more.
    season(s);
    Assert.equal(progress, siege.progress);
    Assert.equal("Assyria", s.owner.get("arbela"));
  });

  test("A fallen kingdom's army with nobody commanding it disbands once the word reaches it", () => {
    const s = babylonFalls();
    // Before Assyria's walled Arbela, which it does not besiege.
    s.walls.set("arbela", 2);
    removeAll(s.units, (u) => u.province === "arbela");
    const army = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "arbela", men: 1000 });
    s.units.push(army);
    const fell = s.turn;
    season(s);
    Assert.contains("Babylonia", s.eliminated);
    const arrives = fell + travelTurns(s.config, WorldMap.default, "babylon", "arbela", fell);
    if (s.turn < arrives) Assert.contains(s.units, (u) => u === army);
    while (s.turn <= arrives) season(s);
    Assert.doesNotContain(s.units, (u) => u.power === "Babylonia");
  });
});
