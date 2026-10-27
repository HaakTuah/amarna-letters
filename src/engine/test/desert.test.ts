import { describe, test } from "vitest";
import {
  Dict,
  type GameConfig,
  type GameState,
  type Power,
  TurnEngine,
  type TurnSubmission,
  besiege,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newTurnSubmission,
  single,
  unitAt,
} from "@amarna/engine";
import { Assert, last } from "./support.ts";

// The desert costs an army supplies (Build order item 5, the siege package; question 5, plan step 15, built as "an army in
// its own land pays no desert cost"): an army that ends a season in desert land its king did not hold when the moves were
// made pays with the next upkeep; one in its own land pays nothing, whoever its king is.
describe("DesertTests", () => {
  function game(config: GameConfig | null = null): GameState {
    let s = newGame(1, config ?? newGameConfig({ catastropheChance: 0 }));
    // Hatti's Hattusa army stands in Gaza, Hatti's own, next to the Sinai.
    single(s.units, (u) => u.province === "hattusa").province = "gaza";
    s.walls.delete("gaza");
    s.owner.set("gaza", "Hatti");
    return s;
  }

  function treasury(s: GameState, p: Power): string {
    return last(inboxOf(s, p), (i) => i.title === "The treasury").body;
  }

  test("An army that marches into the desert pays once and none after its king holds it", () => {
    let s = game();
    let e = new TurnEngine(s);
    let before = e.upkeep("Hatti");
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [move("gaza", "sinai")] })]]));
    Assert.equal("Hatti", s.owner.get("sinai"));
    let army = unitAt(s, "sinai")!;
    Assert.equal([army.id], s.inDesert);
    Assert.equal(before + 30, e.upkeep("Hatti"));
    Assert.equal("desert", Assert.single(s.events, (x) => x.kind === "desert").signal);

    let gold = s.treasuries.get("Hatti").gold;
    let income = e.income("Hatti");
    e.beginTurn();
    Assert.contains(
      "The upkeep includes 30 shekels for supplies in the desert: your army in sinai ended last season in desert land you did not hold.",
      treasury(s, "Hatti"),
    );
    Assert.empty(s.inDesert);
    // Paid once, with the troops' upkeep: the forecast no longer carries it.
    Assert.equal(before, e.upkeep("Hatti"));
    Assert.true(s.treasuries.get("Hatti").gold <= gold + income - before - 30);

    // Next season the Sinai is Hatti's own: its army stands there for nothing more.
    e.resolve(new Dict<Power, TurnSubmission>());
    Assert.empty(s.inDesert);
    e.beginTurn();
    Assert.doesNotContain("desert", treasury(s, "Hatti"));
  });

  test("An army in its own desert pays nothing whoever its king is", () => {
    // Egypt holds the Sinai from the start: its army marches in and out for nothing.
    let s = game();
    let e = new TurnEngine(s);
    single(s.units, (u) => u.province === "memphis").province = "delta";
    single(s.units, (u) => u.province === "delta" && u.kind === "Fleet").province = "deltawaters";
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [move("delta", "sinai")] })]]));
    Assert.equal("Egypt", unitAt(s, "sinai")!.power);
    Assert.empty(s.inDesert);
    Assert.doesNotContain(s.events, (x) => x.kind === "desert");
  });

  test("An army within walls in the desert pays every season it stays", () => {
    // Egypt has raised walls in the Sinai: Hatti's army gets in but cannot storm them, and stands in Egypt's desert.
    let s = game();
    s.walls.set("sinai", 1);
    let e = new TurnEngine(s);
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [move("gaza", "sinai")] })]]));
    Assert.equal("Egypt", s.owner.get("sinai"));
    Assert.single(s.inDesert);
    e.beginTurn();
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [besiege("sinai")] })]]));
    Assert.single(s.inDesert);
    e.beginTurn();
    Assert.contains("for supplies in the desert", treasury(s, "Hatti"));
  });

  test("A desert cost unpaid makes troops desert like any upkeep and nothing turns it off", () => {
    let s = game();
    let e = new TurnEngine(s);
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [move("gaza", "sinai")] })]]));
    // Hatti's treasury cannot pay its troops and the desert: the farthest from Hattusa, the army in the Sinai, deserts.
    s.treasuries.get("Hatti").gold = -e.income("Hatti") + e.upkeep("Hatti") - 1;
    e.beginTurn();
    Assert.null(unitAt(s, "sinai"));
    Assert.contains("Unpaid troops deserted: A sinai.", treasury(s, "Hatti"));
    Assert.doesNotContain("for supplies in the desert", treasury(s, "Hatti"));

    let off = game(newGameConfig({ catastropheChance: 0, desertUpkeep: 0 }));
    new TurnEngine(off).resolve(new Dict([["Hatti", newTurnSubmission({ orders: [move("gaza", "sinai")] })]]));
    Assert.empty(off.inDesert);
  });
});
