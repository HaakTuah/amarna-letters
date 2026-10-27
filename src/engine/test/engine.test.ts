import { describe, test } from "vitest";
import {
  AllPowers,
  Dict,
  GameStateSchema,
  Greeting,
  HSet,
  OrderValidator,
  Rng,
  TurnEngine,
  WorldMap,
  alive,
  buy,
  clone,
  count,
  formatMoney,
  hash,
  inboxOf,
  max,
  move,
  newGame,
  newGameConfig,
  newGreetingOptions,
  newTurnSubmission,
  newUnit,
  raise,
  single,
  support,
  unitAt,
  wallsOf,
} from "@amarna/engine";
import { removeAll, Assert } from "./support.ts";
import { playRandom } from "./games.ts";

describe("EngineTests", () => {
  // <summary>Plays a game with seeded random legal orders and placeholder text, for determinism checks.</summary>

  test("Same seed and orders give the same game", () => {
    let a = playRandom(42, 30);
    let b = playRandom(42, 30);
    Assert.equal(hash(GameStateSchema, a), hash(GameStateSchema, b));
    let c = playRandom(43, 30);
    Assert.notEqual(hash(GameStateSchema, a), hash(GameStateSchema, c));
  });

  test("State survives a json round trip", () => {
    let a = playRandom(7, 12);
    let copy = clone(GameStateSchema, a);
    Assert.equal(hash(GameStateSchema, a), hash(GameStateSchema, copy));
  });

  test("New game matches the starting tiers", () => {
    let s = newGame(1);
    let e = new TurnEngine(s);
    Assert.equal(19, s.units.length);
    // Walls by place: the seven capitals 3, ten fortresses 2, six walled towns 1; every free city has some.
    Assert.equal(23, s.walls.size);
    Assert.equal(
      7,
      count(s.walls, (w) => w[1] === 3),
    );
    Assert.all(
      WorldMap.default.landProvinces.filter((p) => p.home === null),
      (p) => Assert.true(wallsOf(s, p.id) > 0, p.id),
    );
    Assert.all(
      WorldMap.default.landProvinces.filter((p) => p.capital),
      (p) => Assert.equal(3, wallsOf(s, p.id)),
    );
    Assert.equal(18, s.characters.length);
    Assert.all(AllPowers, (p) =>
      Assert.equal(
        2,
        count(s.characters, (c) => c.employer === p),
      ),
    );
    Assert.true(e.strength("Egypt") > e.strength("Mitanni"));
    Assert.true(e.strength("Mitanni") > e.strength("Arzawa"));
    Assert.equal(
      2,
      count(s.characters, (c) => c.secretMaster !== null),
    );
  });

  test("Travel takes one to three seasons and is symmetric", () => {
    let e = new TurnEngine(newGame(1));
    for (const a of AllPowers)
      for (const b of AllPowers.filter((b) => b !== a)) {
        let t = e.travelTurns(a, b);
        Assert.inRange(t, 1, 3);
        Assert.equal(t, e.travelTurns(b, a));
      }
  });

  test("Income and upkeep are paid each season", () => {
    let s = newGame(1);
    let e = new TurnEngine(s);
    let before = s.treasuries.get("Egypt").gold;
    let expected = before + e.income("Egypt") - e.upkeep("Egypt") - e.wages("Egypt");
    e.beginTurn();
    Assert.equal(expected, s.treasuries.get("Egypt").gold);
  });

  test("Unpaid troops desert farthest first", () => {
    let s = newGame(1);
    s.treasuries.get("Egypt").gold = -1000;
    s.owner.set("thebes", null);
    s.owner.set("akhetaten", null);
    s.owner.set("memphis", null);
    s.owner.set("delta", null);
    let e = new TurnEngine(s);
    e.beginTurn();
    Assert.true(count(s.units, (u) => u.power === "Egypt") < 3);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.body.includes("deserted"));
  });

  test("Validator rejects illegal and unaffordable orders", () => {
    let s = newGame(1);
    s.treasuries.get("Egypt").gold = 450;
    let v = new OrderValidator(s);
    let result = v.validate(
      "Egypt",
      newTurnSubmission({
        orders: [
          move("memphis", "hattusa") /* not adjacent */,
          move("hattusa", "kanesh") /* not Egypt's unit */,
          raise("babylon", "Army") /* not Egypt's homeland */,
          raise("akhetaten", "Fleet") /* no harbour */,
          move("memphis", "sinai"),
          move("memphis", "delta") /* second order for the same unit */,
          raise("thebes", "Army"),
          raise("akhetaten", "Army"),
          buy("gaza") /* 200 shekels: leaves 50 */,
          buy("megiddo") /* 200 more: more than is left */,
        ],
      }),
    );
    Assert.equal(4, result.accepted.length);
    Assert.equal(6, result.rejected.length);
    Assert.contains(result.rejected, (r) => r.reason.includes("not enough gold"));
  });

  test("A raised army appears and costs gold", () => {
    let s = newGame(1);
    let e = new TurnEngine(s);
    e.beginTurn();
    let gold = s.treasuries.get("Egypt").gold;
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [raise("thebes", "Army")] })]]));
    Assert.notNull(unitAt(s, "thebes"));
    Assert.equal(gold - s.config.armyCost, s.treasuries.get("Egypt").gold);
  });

  test("Buying a neutral city transfers it", () => {
    let s = newGame(1);
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [buy("gaza")] })]]));
    Assert.equal("Egypt", s.owner.get("gaza"));
    Assert.equal(2, wallsOf(s, "gaza")); // a bought city keeps its walls, now for its owner
  });

  test("Islands can buy across the sea but not inland", () => {
    let s = newGame(1);
    removeAll(s.units, (u) => u.power === "Alashiya");
    let v = new OrderValidator(s).validate("Alashiya", newTurnSubmission({ orders: [buy("amurru"), buy("mari")] }));
    Assert.single(v.accepted);
    Assert.contains(v.rejected, (r) => r.order.type === "buy" && r.order.province === "mari");
  });

  test("Bought walls stand for their owner who may enter them", () => {
    let s = newGame(1);
    s.owner.set("gaza", "Egypt"); // bought: the walls stay
    s.units.length = 0;
    s.units.push(newUnit({ id: "u1", power: "Egypt", kind: "Army", province: "sinai" }));
    s.units.push(newUnit({ id: "u2", power: "Babylonia", kind: "Army", province: "megiddo" }));
    s.units.push(newUnit({ id: "u3", power: "Babylonia", kind: "Army", province: "tyre" }));
    s.walls.delete("megiddo");
    s.walls.delete("tyre");

    // The owner may march into its own walled city (until the siege package it could not).
    let own = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [move("sinai", "gaza")] }));
    Assert.empty(own.rejected);

    // A supported attack gets within the walls (2 against walls 2 and no defenders), but does not storm them.
    let e = new TurnEngine(s);
    e.resolve(new Dict([["Babylonia", newTurnSubmission({ orders: [move("megiddo", "gaza"), support("tyre", "megiddo", "gaza")] })]]));
    Assert.equal("Babylonia", unitAt(s, "gaza")?.power);
    Assert.equal("Egypt", s.owner.get("gaza"));
    Assert.equal(2, wallsOf(s, "gaza"));
  });

  test("A support against a third king is logged against him", () => {
    // Assyria supports Mitanni's Washukanni, holding, against Hatti's attack from Isuwa.
    let s = newGame(1);
    s.owner.set("isuwa", "Hatti");
    s.walls.delete("isuwa");
    removeAll(s.units, (u) => u.province === "taidu");
    s.units.push(newUnit({ id: "u90", power: "Hatti", kind: "Army", province: "isuwa" }));
    s.units.push(newUnit({ id: "u91", power: "Assyria", kind: "Army", province: "taidu" }));
    new TurnEngine(s).resolve(
      new Dict([
        ["Hatti", newTurnSubmission({ orders: [move("isuwa", "washukanni")] })],
        ["Assyria", newTurnSubmission({ orders: [support("taidu", "washukanni")] })],
      ]),
    );
    let held = single(s.events, (e) => e.kind === "support");
    Assert.equal("foreign-support:Hatti", held.signal);
    Assert.contains("against Hatti", held.text);
    Assert.equal("Mitanni", unitAt(s, "washukanni")?.power);
  });

  test("Rival buyers bounce", () => {
    let s = newGame(1);
    s.owner.set("megiddo", "Babylonia");
    s.walls.delete("megiddo");
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [buy("gaza")] })],
        ["Babylonia", newTurnSubmission({ orders: [buy("gaza")] })],
      ]),
    );
    Assert.null(s.owner.get("gaza"));
  });

  test("Game never ends before the minimum and always by the maximum", () => {
    for (let seed = 1; seed <= 20; seed++) {
      let s = playRandom(seed, 200, newGameConfig({ minTurns: 15, maxTurns: 40 }));
      Assert.true(s.ended);
      let last = max(s.scores, (x) => x.turn);
      Assert.inRange(last, Math.min(15, last), 40);
      if (alive(s).length > 1) Assert.true(last >= 15);
      Assert.notEmpty(s.winners);
    }
  });

  test("Greeting formula and deviations", () => {
    let std = Greeting.render("Mitanni", "Egypt", newGreetingOptions());
    Assert.startsWith("Say to Napkhururiya, Great King, king of Egypt, my brother: thus says Tushratta", std);
    Assert.contains("your chariots, your horses", std);

    let cold = Greeting.render("Assyria", "Babylonia", newGreetingOptions({ callBrother: false, grantGreatKing: false, senderFirst: true }));
    Assert.startsWith("Thus says Ashur-uballit, Great King, king of Assyria: say to Burna-Buriash, king of Karduniash.", cold);
    Assert.equal("", Greeting.render("Egypt", "Hatti", newGreetingOptions({ omit: true })));
  });

  test("Neighbouring seeds and turns never share a random stream", () => {
    // Regression: streams were once keyed by seed ^ turn, so seed 1 turn 5 equalled seed 2 turn 6.
    let seen = new HSet<string>();
    for (let seed = 1; seed <= 200; seed++)
      for (let turn = 1; turn <= 60; turn++) {
        let r = Rng.for(seed, turn, "catastrophe", "Alashiya");
        // Both 32-bit halves, as the C# packed them into one 64-bit number.
        Assert.true(seen.add(`${r.nextUInt()}:${r.nextUInt()}`), `seed ${seed} turn ${turn}`);
      }
  });

  test("Money reads in minas and shekels", () => {
    Assert.equal("45 shekels", formatMoney(45));
    Assert.equal("1 mina", formatMoney(60));
    Assert.equal("2 minas 15 shekels", formatMoney(135));
  });
});
