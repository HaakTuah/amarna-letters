import { describe, test } from "vitest";
import { type GameState, OrderValidator, RefusedPoints, TurnEngine, Views, answer, cede, newGame, newGameConfig, newTurnSubmission, newUnit, WorldMap } from "@amarna/engine";
import { Assert, subs } from "./support.ts";

// Build order item 17++, "taken up, never thrust on anyone" ("Whom a province obeys" under War, decided 2 November 2026):
// a province declares for whoever its weight favours and obeys him only once he takes it up; a refusal is an entry in its
// ledger against him; a treaty's cession gives the claim, never the province.
describe("DeclarationTests", () => {
  const quiet = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 }));
  const begin = (s: GameState): TurnEngine => {
    const e = new TurnEngine(s);
    e.beginTurn();
    return e;
  };
  const love = (s: GameState, prov: string, actor: string): number => s.ledger.tryGet(prov)?.getOrDefault(actor, 0) ?? 0;
  /** Gaza, its people turned from Pharaoh to the Hittite king, with no troops of either in it or beside it. */
  function leaning(): GameState {
    const s = quiet();
    const near = new Set([...WorldMap.default.neighbors("gaza"), "gaza"]);
    s.units = s.units.filter((u) => !near.has(u.province));
    s.ledger.get("gaza").set("Egypt", 0);
    s.ledger.get("gaza").set("Hatti", 150);
    return s;
  }

  test("A province whose people favour a king without troops there declares for him, and stays its holder's until he takes it up", () => {
    const s = leaning();
    begin(s);
    Assert.equal("Egypt", s.owner.get("gaza"));
    const d = s.declarations.find((x) => x.province === "gaza")!;
    Assert.equal("Hatti", d.power);
    Assert.equal(null, d.from);
    Assert.false(d.takenUp);
    Assert.true(s.events.some((x) => x.kind === "declare" && x.text.includes("declared for Hatti")));
    // Unanswered, it stays as it is season after season while it leans his way.
    begin(s);
    Assert.equal("Egypt", s.owner.get("gaza"));
    // The word reaches his court in its time: only then may he answer it.
    s.turn = d.known;
    Assert.single(new OrderValidator(s).validate("Hatti", newTurnSubmission({ orders: [answer("gaza", true)] })).accepted);
    Assert.single(new OrderValidator(s).validate("Babylonia", newTurnSubmission({ orders: [answer("gaza", true)] })).rejected);
  });

  test("Taken up, it answers to him as the next season is reckoned; the view shows it until then", () => {
    const s = leaning();
    const e = begin(s);
    const d = s.declarations.find((x) => x.province === "gaza")!;
    s.turn = Math.max(s.turn, d.known);
    Assert.single(Views.for(s, "Hatti").declared);
    e.answerProvince("Hatti", answer("gaza", true));
    Assert.true(d.takenUp);
    e.obeySeason();
    Assert.equal("Hatti", s.owner.get("gaza"));
    Assert.true(s.events.some((x) => x.signal === "obey-taken"));
    Assert.false(s.declarations.some((x) => x.province === "gaza"));
  });

  test("Refused, it stays its holder's, and its people remember it against him", () => {
    const s = leaning();
    const e = begin(s);
    const before = love(s, "gaza", "Hatti");
    e.answerProvince("Hatti", answer("gaza", false));
    Assert.equal(before - RefusedPoints, love(s, "gaza", "Hatti"));
    Assert.false(s.declarations.some((x) => x.province === "gaza"));
    Assert.equal("Egypt", s.owner.get("gaza"));
  });

  test("A declaration lapses once its people no longer lean his way", () => {
    const s = leaning();
    begin(s);
    Assert.true(s.declarations.some((x) => x.province === "gaza"));
    s.ledger.get("gaza").set("Hatti", 0);
    s.ledger.get("gaza").set("Egypt", 100);
    begin(s);
    Assert.false(s.declarations.some((x) => x.province === "gaza"));
    Assert.equal("Egypt", s.owner.get("gaza"));
  });

  test("A cession gives the claim, never the province: it stays the giver's until the receiver takes it up and the giver's troops are gone", () => {
    const s = quiet();
    const near = new Set([...WorldMap.default.neighbors("gaza"), "gaza"]);
    s.units = s.units.filter((u) => !near.has(u.province));
    const e = begin(s);
    e.resolve(subs({ Egypt: { orders: [cede("gaza", "Hatti")] } }));
    Assert.equal("Egypt", s.owner.get("gaza"));
    const d = s.declarations.find((x) => x.province === "gaza")!;
    Assert.equal("Egypt", d.from);
    Assert.equal("Hatti", d.power);
    // Unanswered, the giver keeps it.
    begin(s);
    Assert.equal("Egypt", s.owner.get("gaza"));
    e.answerProvince("Hatti", answer("gaza", true));
    // The giver's troops back in it: he has not withdrawn, and the receiver cannot have it yet.
    s.units.push(newUnit({ id: "u-back", power: "Egypt", kind: "Army", province: "gaza", home: "memphis", men: 1000 }));
    e.obeySeason();
    Assert.equal("Egypt", s.owner.get("gaza"));
    s.units = s.units.filter((u) => u.id !== "u-back");
    e.obeySeason();
    Assert.equal("Hatti", s.owner.get("gaza"));
    Assert.true(s.events.some((x) => x.signal === "obey-taken" && x.text.includes("ceded by Egypt")));
  });
});
