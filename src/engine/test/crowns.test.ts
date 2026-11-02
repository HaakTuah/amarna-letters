import { describe, test } from "vitest";
import { OrderValidator, TurnEngine, WorldMap, crown, newCharacter, newGame, newGameConfig, newGovernor, newId, newTraits, newTurnSubmission, risenOf, vassalBonds, type GameState } from "@amarna/engine";
import { Assert, removeAll } from "./support.ts";

// A vassal king by grant (item 17++, part C; "Governors" under War): the king names the man, the provinces, the tribute and
// the price; the word reaches him at his seat; he answers by his stakes the season after; if he takes it, the land is his,
// bound by a vassal tablet, and his price travels to the king. The starting world, with the steps called directly.
describe("CrownsTests", () => {
  const quiet = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 }));
  function governor(s: GameState, ambition: number, purse = 300): string {
    removeAll(s.governors, (g) => g.province === "tuwanuwa" || g.province === "kizzuwatna");
    removeAll(s.units, (u) => u.province === "tuwanuwa" || u.province === "kizzuwatna");
    const c = newCharacter({ id: newId(s, "c"), name: "Hutupiyanza", traits: newTraits({ loyalty: 60, greed: 50, ambition, courage: 60, competence: 50 }), status: "Employed", employer: "Hatti", duty: "Governing", watchProvince: "tuwanuwa", purse, grantedBy: "Hatti" });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "tuwanuwa", seat: "tuwanuwa", character: c.id, power: "Hatti", from: 0 }));
    s.governors.push(newGovernor({ province: "kizzuwatna", seat: "tuwanuwa", character: c.id, power: "Hatti", from: 0 }));
    return c.id;
  }
  /** Seasons pass for the grant alone: the step that carries it. */
  function seasons(s: GameState, n: number): void {
    const e = new TurnEngine(s);
    for (let k = 0; k < n; k++) {
      s.turn++;
      e.crownsSeason();
    }
  }

  test("A governor takes the kingship of the provinces he governs: the land is his, bound by a vassal tablet, and his price reaches the king", () => {
    const s = quiet();
    const id = governor(s, 70);
    // What his people think of him in each province of the grant.
    for (const x of ["tuwanuwa", "kizzuwatna"]) s.ledger.get(x).set(id, 150);
    const gold = s.treasuries.get("Hatti").gold;
    new TurnEngine(s).grantCrown("Hatti", crown(id, ["tuwanuwa", "kizzuwatna"], 20, 100));
    const k = s.crowns[0];
    Assert.equal("tuwanuwa", k.seat);
    Assert.true(k.arrives > s.turn);
    while (s.turn < k.arrives) seasons(s, 1);
    // The word reached him; his answer is taken the season after.
    Assert.equal(s.turn, k.answered);
    Assert.equal("Hatti", s.owner.get("tuwanuwa"));
    seasons(s, 1);
    const own = s.owner.get("tuwanuwa")!;
    Assert.notEqual("Hatti", own);
    Assert.equal(own, s.owner.get("kizzuwatna"));
    // His people's regard for him is his realm's, in every province of the grant.
    for (const x of ["tuwanuwa", "kizzuwatna"]) {
      Assert.true(s.ledger.get(x).getOrDefault(own, 0) >= 150);
      Assert.false(s.ledger.get(x).has(id));
    }
    // The oath's copy is in his archive at once; the king's comes home with his answer.
    const oath = s.tablets.find((t) => t.vassal === own)!;
    Assert.true(s.copies.some((c) => c.tabletId === oath.id && c.holder === own));
    Assert.equal(s.copies.some((c) => c.tabletId === oath.id && c.holder === "Hatti"), s.turn > k.heard!);
    Assert.equal("granted", risenOf(own)!.how);
    Assert.equal(0, s.governors.filter((g) => g.character === id).length);
    const bond = vassalBonds(s.tablets).find((b) => b.vassal === own)!;
    Assert.equal("Hatti", bond.overlord);
    Assert.equal(20, bond.tribute);
    // His purse, less the price, is his realm's treasury; the price is on the road to the king.
    Assert.equal(200, s.treasuries.get(own).gold);
    Assert.equal(gold, s.treasuries.get("Hatti").gold);
    // The price comes home with the answer: in the treasury the season the oath's copy is, never before.
    for (let k = 0; k < 4; k++) {
      seasons(s, 1);
      Assert.equal(s.copies.some((c) => c.tabletId === oath.id && c.holder === "Hatti"), s.treasuries.get("Hatti").gold === gold + 100);
    }
    Assert.equal(gold + 100, s.treasuries.get("Hatti").gold);
    Assert.equal(0, s.crowns.length);
    Assert.true(s.copies.some((c) => c.tabletId === oath.id && c.holder === "Hatti"));
  });

  test("A man who cannot pay the price, or whose traits would not have the crown, refuses, and keeps his governorship", () => {
    const s = quiet();
    const id = governor(s, 10, 50);
    new TurnEngine(s).grantCrown("Hatti", crown(id, ["tuwanuwa"], 10, 100));
    seasons(s, 4);
    Assert.equal("Hatti", s.owner.get("tuwanuwa"));
    Assert.equal(0, s.crowns.length);
    Assert.equal(2, s.governors.filter((g) => g.character === id).length);
    Assert.true(s.events.some((e) => e.signal === "crown-refused"));
  });

  test("A grant names neighbouring provinces of one's own, a governor's own with his seat, and never the court's city", () => {
    const s = quiet();
    const id = governor(s, 70);
    const check = (o: ReturnType<typeof crown>): string[] => new OrderValidator(s, WorldMap.default).validate("Hatti", newTurnSubmission({ orders: [o] })).rejected.map((r) => r.reason);
    Assert.equal([], check(crown(id, ["tuwanuwa", "kizzuwatna"], 20)));
    Assert.contains(check(crown(id, ["kizzuwatna"], 20)), (r) => r.includes("seat"));
    Assert.contains(check(crown(id, ["tuwanuwa", "nesa"], 20)), (r) => r.includes("only provinces he governs") || r.includes("beside one another"));
    Assert.contains(check(crown(id, ["hattusa"], 20)), (r) => r.includes("court"));
    Assert.contains(check(crown(id, ["tuwanuwa"], -1)), (r) => r.includes("tribute"));
  });
});
