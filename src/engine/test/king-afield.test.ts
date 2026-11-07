import { describe, test } from "vitest";
import { type AdjudicationResult, Dict, type GameState, OrderValidator, type Power, TurnEngine, type TurnSubmission, Views, inboxOf, moveCourt, newGame, newGameConfig, newId, newTurnSubmission, newUnit, seatOf, wordFromKing } from "@amarna/engine";
import { Assert, armiesBefore13, removeAll, smallWorld, subs } from "./support.ts";

// Item 17b, part C: the king apart from his court, commanding from where he is, at the risk of his life.
describe("KingAfieldTests", () => {
  function season(s: GameState, orders: Dict<Power, TurnSubmission> = new Dict()): TurnEngine {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
    return e;
  }
  const kingOf = (s: GameState, p: Power) => s.characters.find((c) => c.id === s.reigns.get(p).character)!;

  /** Babylonia's king gone alone to Dur-Kurigalzu, his court left at Babylon. */
  function afield(seed = 1): GameState {
    const s = smallWorld(armiesBefore13(newGame(seed, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }))), "Assyria", "Babylonia");
    season(s, subs({ Babylonia: { orders: [moveCourt("durkurigalzu", true)] } }));
    for (let i = 0; i < 4 && s.kingRoads.length > 0; i++) season(s);
    return s;
  }

  test("The king travels without his court, and commands from where he is", () => {
    const s = afield();
    Assert.equal(["durkurigalzu", "babylon"], [s.kingAt.tryGet("Babylonia"), s.court.tryGet("Babylonia") ?? "babylon"]);
    Assert.equal("durkurigalzu", seatOf(s, new TurnEngine(s).map, "Babylonia"));
    const v = Views.for(s, "Babylonia");
    Assert.equal(["durkurigalzu", "babylon"], [v.kingAt, v.courtAt]);
    // His word reaches the land beside him from where he stands.
    Assert.equal(0, wordFromKing(s, new TurnEngine(s).map, "Babylonia", "durkurigalzu"));
    // Back to his court: together again.
    season(s, subs({ Babylonia: { orders: [moveCourt("babylon", true)] } }));
    for (let i = 0; i < 4 && s.kingRoads.length > 0; i++) season(s);
    Assert.false(s.kingAt.has("Babylonia"));
  });

  test("A captive king may not travel", () => {
    const s = afield();
    const c = kingOf(s, "Babylonia");
    c.status = "Captured";
    c.heldBy = "Assyria";
    const v = new OrderValidator(s).validate("Babylonia", newTurnSubmission({ orders: [moveCourt("babylon", true)] }));
    Assert.contains("not free to travel", Assert.single(v.rejected).reason);
  });

  test("Taken away from his court, it learns of it only when the word comes, and believes him where he was till then", () => {
    const s = afield();
    const e = new TurnEngine(s);
    s.owner.set("durkurigalzu", "Assyria");
    // Taken alive (not in a city's fall, which may kill him).
    e.kingTaken("Babylonia", "Assyria", false);
    Assert.equal("Captured", kingOf(s, "Babylonia").status);
    Assert.equal("durkurigalzu", s.kingAt.tryGet("Babylonia"));
    const v = Views.for(s, "Babylonia");
    Assert.equal("durkurigalzu", v.kingAt);
    Assert.equal("employed", Assert.single(v.court.filter((c) => c.kingOf === "Babylonia")).status);
    // The word comes.
    const word = Assert.single(s.journeys.filter((j) => j.news === "KingTaken"));
    while (s.turn < word.arriveTurn) season(s);
    season(s);
    Assert.false(s.kingAt.has("Babylonia"));
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "The king taken");
  });

  test("A court sent to where the king stands joins him", () => {
    const s = afield();
    season(s, subs({ Babylonia: { orders: [moveCourt("durkurigalzu")] } }));
    for (let i = 0; i < 4 && s.kingRoads.length > 0; i++) season(s);
    Assert.equal("durkurigalzu", s.court.tryGet("Babylonia"));
    Assert.false(s.kingAt.has("Babylonia"));
  });

  test("A city taken where the king stands apart takes him or kills him; his court stays where it is", () => {
    const s = afield();
    const e = new TurnEngine(s);
    s.owner.set("durkurigalzu", "Assyria");
    s.ownerLog.push({ province: "durkurigalzu", turn: s.turn, owner: "Assyria" });
    e.capitalsTaken();
    const c = kingOf(s, "Babylonia");
    Assert.true(c.status === "Dead" || (c.status === "Captured" && c.heldBy === "Assyria"));
    // His court believes him there till the word comes.
    Assert.equal("durkurigalzu", s.kingAt.tryGet("Babylonia"));
    Assert.equal("babylon", s.court.tryGet("Babylonia") ?? "babylon");
    Assert.doesNotContain(s.eliminated, (p) => p === "Babylonia");
  });

  test("The court's city taken while the king is away: the court flees, and he is not taken with it", () => {
    const s = afield();
    const e = new TurnEngine(s);
    s.owner.set("babylon", "Assyria");
    s.ownerLog.push({ province: "babylon", turn: s.turn, owner: "Assyria" });
    e.capitalsTaken();
    const c = kingOf(s, "Babylonia");
    Assert.equal(["Employed", "Ruling"], [c.status, c.duty]);
    Assert.notEqual("babylon", s.court.get("Babylonia"));
    Assert.equal("Babylonia", s.owner.get(s.court.get("Babylonia")));
  });

  test("A battle his side loses where he stands: he dies in it, is taken, or gets away with his men", () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 24; seed++) {
      const s = afield(seed);
      removeAll(s.units, (u) => u.province === "durkurigalzu" || u.province === "ekallate");
      const his = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "durkurigalzu", men: 2000 });
      const foe = newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "ekallate", men: 6000 });
      s.units.push(his, foe);
      const e = new TurnEngine(s);
      const r = { fights: [{ attacker: foe.id, defender: his.id, from: "ekallate", at: "durkurigalzu", attack: 3000, defence: 1000, own: 1000, won: true }], newPositions: new Dict([[his.id, "sippar"]]) } as unknown as AdjudicationResult;
      e.kingsInBattle(r);
      const c = kingOf(s, "Babylonia");
      const got = c.status === "Dead" ? "dead" : c.status === "Captured" ? "taken" : s.kingAt.tryGet("Babylonia") === "sippar" ? "away" : "other";
      Assert.notEqual("other", got);
      outcomes.add(got);
    }
    Assert.equal(["away", "dead", "taken"], [...outcomes].sort());
  });
});
