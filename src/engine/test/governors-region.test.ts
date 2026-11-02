import { describe, test } from "vitest";
import {
  Dict,
  OrderValidator,
  TurnEngine,
  WorldMap,
  govern,
  newCharacter,
  newGame,
  newGameConfig,
  newGovernor,
  newId,
  newTraits,
  newTurnSubmission,
  risenOf,
  type GameState,
} from "@amarna/engine";
import { Assert, removeAll } from "./support.ts";

// One governor over several neighbouring provinces from one seat (item 17++, part C; "Governors" under War): the same
// order gives him a province beside his own, governed from his seat; taken back, he turns with those of them whose people
// would rather follow him. The starting world, with the steps called directly.
describe("GovernorsOfARegionTests", () => {
  const quiet = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 }));
  const book = (s: GameState, prov: string): Dict<string, number> => {
    let b = s.ledger.tryGet(prov);
    if (b === undefined) s.ledger.set(prov, (b = new Dict()));
    return b;
  };
  function governor(s: GameState, loyalty: number, ambition: number): string {
    removeAll(s.governors, (g) => g.province === "tuwanuwa" || g.province === "kizzuwatna");
    const c = newCharacter({ id: newId(s, "c"), name: "Hutupiyanza", traits: newTraits({ loyalty, greed: 50, ambition, courage: 60, competence: 50 }), status: "Employed", employer: "Hatti", duty: "Governing", watchProvince: "tuwanuwa", purse: 300 });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "tuwanuwa", seat: "tuwanuwa", character: c.id, power: "Hatti", from: 0 }));
    return c.id;
  }

  test("A governor is given a province beside his own, governed from his seat; one not beside it is refused", () => {
    const s = quiet();
    const id = governor(s, 60, 40);
    const v = new OrderValidator(s, WorldMap.default).validate("Hatti", newTurnSubmission({ orders: [govern("kizzuwatna", id, 1)] }));
    Assert.equal(1, v.accepted.length);
    removeAll(s.governors, (g) => g.province === "samuha");
    const w = new OrderValidator(s, WorldMap.default).validate("Hatti", newTurnSubmission({ orders: [govern("samuha", id, 1)] }));
    Assert.contains(w.rejected, (x) => x.reason.includes("governs no province beside"));
    new TurnEngine(s).grantGovernorship("Hatti", govern("kizzuwatna", id, 1));
    const g = s.governors.find((x) => x.province === "kizzuwatna")!;
    Assert.equal("tuwanuwa", g.seat);
    Assert.true(g.from > s.turn);
    Assert.equal("tuwanuwa", s.characters.find((c) => c.id === id)!.watchProvince);
  });

  test("Taken back, a disloyal governor of two turns with the one whose people follow him and leaves the other to his king", () => {
    const s = quiet();
    const id = governor(s, 10, 90);
    s.governors.push(newGovernor({ province: "kizzuwatna", seat: "tuwanuwa", character: id, power: "Hatti", from: 0 }));
    removeAll(s.units, (u) => u.province === "tuwanuwa" || u.province === "kizzuwatna");
    // Tuwanuwa's people stand with him; Kizzuwatna's with their king.
    book(s, "tuwanuwa").set("Hatti", 0);
    book(s, "tuwanuwa").set(id, 150);
    book(s, "kizzuwatna").set("Hatti", 150);
    book(s, "kizzuwatna").set(id, 0);
    for (const g of s.governors.filter((x) => x.character === id)) g.relieved = s.turn;
    new TurnEngine(s).governorsSeason();
    const p = s.owner.get("tuwanuwa")!;
    Assert.equal("turned", risenOf(p)?.how);
    Assert.equal(id, risenOf(p)?.ruler);
    Assert.equal("Hatti", s.owner.get("kizzuwatna"));
    Assert.false(s.governors.some((g) => g.character === id));
  });

  test("A governor of two who steps down from one keeps the other, and stays at his seat", () => {
    const s = quiet();
    const id = governor(s, 70, 30);
    s.governors.push(newGovernor({ province: "kizzuwatna", seat: "tuwanuwa", character: id, power: "Hatti", from: 0 }));
    s.governors.find((g) => g.province === "kizzuwatna")!.relieved = s.turn;
    new TurnEngine(s).governorsSeason();
    Assert.equal(["tuwanuwa"], s.governors.filter((g) => g.character === id).map((g) => g.province));
    Assert.equal("Governing", s.characters.find((c) => c.id === id)!.duty);
  });
});
