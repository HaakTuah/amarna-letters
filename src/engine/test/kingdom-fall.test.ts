import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  KingdomFallsTitle,
  OrderValidator,
  type Power,
  TurnEngine,
  Views,
  type TurnSubmission,
  WorldMap,
  EconomyData,
  cede,
  inboxOf,
  ownedBy,
  land,
  move,
  newGame,
  newGameConfig,
  newId,
  newSiege,
  newTurnSubmission,
  newUnit,
  single,
  support,
  wallsOf,
} from "@amarna/engine";
import { removeAll, Assert, subs, oldWorld, smallWorld } from "./support.ts";

// Item 17b, part B: a king taken where he stands is his taker's captive and his court flees to the nearest city his realm
// still holds; only a realm that holds nothing falls, its orders lapsing for the rest of the season and its armies their
// commanders' or disbanded as word reaches them (`fall-as-news.test.ts`). (From the siege package, Build order item 5, to
// then a kingdom fell with its capital.)
describe("KingdomFallTests", () => {
  function season(s: GameState, orders: Dict<Power, TurnSubmission>): void {
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
  }
  const kingOf = (s: GameState, p: Power) => s.characters.find((c) => c.id === s.reigns.get(p).character)!;

  test("A capital stormed and then obeying its stormers takes its king, and his court flees to a city his realm still holds", () => {
    let s = smallWorld(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }))), "Arzawa", "Hatti", "Egypt");
    // Apasa's walls thrown down to level 1, its troops gone; Hatti's armies in Lukka and Mira.
    s.walls.set("apasa", 1);
    removeAll(s.units, (u) => u.power === "Arzawa");
    s.owner.set("mira", "Hatti");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "lukka" }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "mira" }));
    season(s, subs({ Hatti: { orders: [move("lukka", "apasa"), support("mira", "lukka", "apasa")] } }));
    // Item 17++: Hatti's men stand within its walls; Apasa, its people turned from their king for the test, answers to
    // Hatti as the next season begins, and its king is taken then.
    Assert.equal("Arzawa", s.owner.get("apasa"));
    s.ledger.get("apasa").set("Arzawa", 0);
    season(s, subs({}));
    Assert.equal("Hatti", s.owner.get("apasa"));
    Assert.doesNotContain(s.eliminated, (p) => p === "Arzawa");
    const king = kingOf(s, "Arzawa");
    Assert.equal(["Captured", "Hatti", "UnderGuard", true], [king.status, king.heldBy, king.duty, king.intercepted]);
    Assert.contains(s.journeys, (j) => j.kind === "CaptiveConvoy" && j.characterId === king.id && j.to === "Hatti");
    Assert.contains("His fate is yours", single(inboxOf(s, "Hatti"), (i) => i.title === "A king taken").body);
    // The court rules from a city Arzawa still holds, in his name.
    const court = s.court.get("Arzawa");
    Assert.equal("Arzawa", s.owner.get(court));
    Assert.contains("rules in his name until he is back", single(inboxOf(s, "Arzawa"), (i) => i.title === "The court flees").body);
    Assert.empty(s.falls);
  });

  test("A realm that holds nothing falls with its last city, and word of it travels", () => {
    let s = smallWorld(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }))), "Babylonia", "Assyria", "Egypt");
    // Ashur is all Assyria holds, its other land Babylonia's, its people indifferent, its troops gone.
    removeAll(s.units, (u) => u.power === "Assyria");
    for (const id of ownedBy(s, "Assyria"))
      if (id !== "ashur") {
        s.owner.set(id, "Babylonia");
        s.ledger.set(id, new Dict());
      }
    removeAll(s.units, (u) => u.province === "ashur");
    let besieger = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "ashur" });
    s.units.push(besieger);
    s.sieges.push(newSiege({ province: "ashur", power: "Babylonia", unitId: besieger.id, progress: 3 * EconomyData.breachPerLevel - 1, since: 1 }));
    season(s, new Dict());
    Assert.contains("Assyria", s.eliminated);
    Assert.equal("Babylonia", s.owner.get("ashur"));
    Assert.equal(2, wallsOf(s, "ashur"));
    Assert.empty(s.sieges);
    let fall = Assert.single(s.falls);
    Assert.equal(["Assyria", "Babylonia", "ashur"], [fall.power, fall.conqueror!, fall.capital]);
    // Its king is Babylonia's captive still, his realm gone: a former ruler; or he died in its fall (item 17b, part C).
    const last = s.characters.find((c) => c.id === s.reigns.get("Assyria").character)!;
    Assert.true((last.status === "Captured" && last.heldBy === "Babylonia") || s.reignsEnded.some((r) => r.power === "Assyria"));
    Assert.null(last.employer);
    Assert.equal(
      "With Ashur you took the last land of Assyria: the kingdom has fallen, and its armies are their own commanders' or disband as word reaches them.",
      single(inboxOf(s, "Babylonia"), (i) => i.title === KingdomFallsTitle).body,
    );
    Assert.contains(s.events, (e) => e.kind === "fall" && e.text === "The kingdom of Assyria has fallen: Babylonia took Ashur, the last it held.");
    // Word of the fall travels (item 7b): Egypt, far away, hears it when the word arrives, and sees Assyria fallen then.
    Assert.doesNotContain(Views.for(s, "Egypt").fallen, (p) => p === "Assyria");
    let word = single(s.journeys, (j) => j.kind === "Word" && j.to === "Egypt" && j.news === "KingdomFalls");
    while (s.turn < word.arriveTurn) season(s, subs({}));
    new TurnEngine(s).beginTurn();
    Assert.contains("Word spreads that Babylonia has taken Ashur, the last land of Assyria, and its kingdom is no more.", single(inboxOf(s, "Egypt"), (i) => i.title === "A kingdom falls").body);
    Assert.contains(Views.for(s, "Egypt").fallen, (p) => p === "Assyria");
  });

  test("Kings who take each other's capitals in one season each hold the other, and neither realm falls", () => {
    let s = smallWorld(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }))), "Babylonia", "Assyria", "Mitanni");
    for (const [by, of] of [
      ["Assyria", "Mitanni"],
      ["Mitanni", "Assyria"],
    ] as const) {
      let capital = WorldMap.default.capital(of).id;
      removeAll(s.units, (u) => u.province === capital);
      let army = newUnit({ id: newId(s, "u"), power: by, kind: "Army", province: capital });
      s.units.push(army);
      s.sieges.push(newSiege({ province: capital, power: by, unitId: army.id, progress: wallsOf(s, capital) * EconomyData.breachPerLevel - 1, since: 1 }));
    }
    season(s, new Dict());
    Assert.doesNotContain(s.eliminated, (p) => p === "Assyria" || p === "Mitanni");
    // Item 17b, part C: each king is taken by the other, or died in his city's fall and his heir reigns.
    for (const [p, by] of [["Assyria", "Mitanni"], ["Mitanni", "Assyria"]] as const) {
      const ended = s.reignsEnded.find((r) => r.power === p);
      Assert.true(ended !== undefined ? ended.how.includes("as the city fell") : kingOf(s, p).status === "Captured" && kingOf(s, p).heldBy === by);
    }
  });

  test("A king cannot cede his own capital without a sealed tablet that gives it", () => {
    // Item 11d: by agreement on a sealed tablet only (answers-11plus.test.ts).
    let s = smallWorld(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 }))), "Egypt", "Hatti");
    let v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [cede("akhetaten", "Hatti"), cede("thebes", "Hatti")] }));
    Assert.contains("only as a sealed tablet", Assert.single(v.rejected).reason);
    Assert.single(v.accepted);
  });
});
