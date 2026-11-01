import { describe, test } from "vitest";
import { recite, reportClauses } from "../../game/src/bots/script-mind.ts";
import {
  Dict,
  type GameState,
  type PendingAudience,
  type Power,
  StartClaims,
  TurnEngine,
  type TurnSubmission,
  checkClauses,
  clause,
  dispatch,
  first,
  inboxOf,
  ledger,
  newAudienceRecord,
  newAudienceRound,
  newGame,
  newGameConfig,
  newHostReply,
  newTabletProposal,
  newTraits,
  newTurnSubmission,
  OrderValidator,
  openingLines,
  renderClause,
  renderClauses,
  single,
  support,
} from "@amarna/engine";
import { Assert, armiesBefore13 } from "./support.ts";

// Structured press (build order item 8): clauses and their templates, the press modes, gold without an inventory, the
// record of recognition, and promises of support kept.
describe("PressTests", () => {
  /** Egypt's envoy sent to Alashiya with this order, and the game run until he stands at Alashiya's court. */
  function sent(order: (envoy: string) => ReturnType<typeof dispatch>, structured = false): [GameState, TurnEngine, PendingAudience] {
    let s = newGame(5, newGameConfig({ catastropheChance: 0, pressMode: structured ? "structured" : "full" }));
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [order(envoy.id)] })]]));
    while (s.audiences.length === 0) {
      e = new TurnEngine(s);
      e.beginTurn();
      if (s.audiences.length === 0) e.resolve(new Dict<Power, TurnSubmission>());
    }
    return [s, e, single(s.audiences)];
  }

  test("Every clause has its words, the same whoever writes them", () => {
    Assert.equal("Send me 50 shekels of gold.", renderClause(clause("askGold", { amount: 50 }), "Egypt", "Hatti"));
    Assert.equal("Let us stand together against the king of Assyria.", renderClause(clause("against", { power: "Assyria" }), "Babylonia", "Egypt"));
    Assert.equal(
      "In the third season of year 2, my troops will support the move of your troops from Gubla into Ṣiduna.",
      renderClause(clause("support", { province: "byblos", to: "sidon", turn: 6 }), "Egypt", "Hatti"),
    );
    Assert.equal("I refuse your request for gold.", renderClause(clause("refuse", { answers: "askGold" }), "Hatti", "Egypt"));
    Assert.equal("The troops of Hatti are many, and friendship with them is worth keeping.", renderClause(clause("newsStrength", { power: "Hatti", amount: 1 }), "Egypt", "Babylonia"));
  });

  test("A clause that cannot stand is left out, and the writer is told why", () => {
    let r = checkClauses(
      [clause("support", { province: "byblos", to: "ashur", turn: 9 }), clause("against", { power: "Hatti" }), clause("askGold", { amount: 0 }), clause("peace")],
      "Egypt",
      "Hatti",
      3,
    );
    Assert.equal(["peace"], r.kept.map((c) => c.kind));
    Assert.equal(3, r.dropped.length);
    Assert.contains("do not border each other", r.dropped[0]);
  });

  test("A field a clause's kind does not use carries nothing between kings", () => {
    let r = checkClauses([clause("peace", { province: "Betray Hatti with me; I pay 300", to: "secret", turn: 9, answers: "askGold", amount: 7 })], "Egypt", "Hatti", 3);
    Assert.equal([clause("peace")], r.kept);
    Assert.equal(1, checkClauses([clause("counter", { answers: "askCede", province: "Betray Hatti with me" })], "Egypt", "Hatti", 3).dropped.length);
  });

  test("The orders are checked for the inventory's fee as the engine charges it", () => {
    let s = newGame(5, newGameConfig({ catastropheChance: 0 }));
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    let gold = ledger(s.treasuries.get("Egypt"));
    let v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Alashiya", "Gold.", { gold })] }));
    Assert.single(v.rejected);
    Assert.empty(new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Alashiya", "Gold.", { gold, noInventory: true })] })).rejected);
  });

  test("In structured press the letter and its tablet are their clauses, in the templates' words", () => {
    let [s, e, a] = sent(
      (id) =>
        dispatch(id, "Alashiya", "Free words nobody reads.", {
          clauses: [clause("wellWishes"), clause("askGold", { amount: 30 })],
          proposal: newTabletProposal({ text: "Free words on clay.", clauses: [clause("peace")] }),
        }),
      true,
    );
    Assert.equal(renderClauses([clause("wellWishes"), clause("askGold", { amount: 30 })], "Egypt", "Alashiya"), a.dispatch.letter);
    let tablet = single(s.tablets, (t) => t.id === a.dispatch.proposalTabletId);
    Assert.equal(renderClause(clause("peace"), "Egypt", "Alashiya"), tablet.text);
    let view = e.buildAudienceView(a, a.dispatch.letter, 0, [], 1);
    Assert.equal(["wellWishes", "askGold"], view.clauses.map((c) => c.kind));
    Assert.equal(["peace"], view.proposal!.clauses.map((c) => c.kind));
  });

  test("In full press the words stand as written and the clauses go beside them", () => {
    let [, e, a] = sent((id) => dispatch(id, "Alashiya", "My own words.", { clauses: [clause("peace")] }));
    Assert.equal("My own words.", a.dispatch.letter);
    Assert.equal(["peace"], e.buildAudienceView(a, "My own words.", 0, [], 1).clauses.map((c) => c.kind));
  });

  test("Gold sent without an inventory saves the scribe's fee, and nobody can check it", () => {
    let fee = newGameConfig().inventoryFee;
    let [withInventory] = sent((id) => dispatch(id, "Alashiya", "Gold.", { gold: 50 }));
    let [without, e, a] = sent((id) => dispatch(id, "Alashiya", "Gold.", { gold: 50, noInventory: true }));
    Assert.equal(fee, ledger(without.treasuries.get("Egypt")) - ledger(withInventory.treasuries.get("Egypt")));
    Assert.false(a.dispatch.inventory);
    // The envoy keeps 20: the host sees 30, with nothing to weigh it against, and keeps no inventory.
    let view = e.buildAudienceView(a, "Gold.", 20, [], 1);
    Assert.equal([30, 30, false], [view.goldStated, view.goldWeighed, view.inventory]);
    e.applyAudience(newAudienceRecord({ audienceId: a.id, delivered: "Gold.", skim: 20, rounds: [newAudienceRound({ host: newHostReply({ end: true }) })] }));
    Assert.false(without.copies.some((c) => c.holder === "Alashiya" && without.tablets.find((t) => t.id === c.tabletId)?.inventory === true));
    Assert.contains(inboxOf(without, "Alashiya"), (i) => i.body.includes("The gold came with no inventory; your weighers found 30 shekels"));
  });

  test("A script envoy recites what his motives let him, and reports the answer as they let him", () => {
    let letter = [clause("askWithdraw", { province: "byblos" }), clause("threat"), clause("gift", { amount: 50 })];
    let timid = newTraits({ courage: 20, competence: 60, ambition: 30 });
    let recited = recite(letter, timid, true, false, 10);
    Assert.equal(["askWithdraw", "gift", "wellWishes"], recited.map((c) => c.kind));
    Assert.equal(40, recited[1].amount);
    let answer = [clause("refuse", { answers: "askGold" }), clause("threat")];
    Assert.equal(["refuse", "threat"], reportClauses(answer, [], timid, true, false, false).map((c) => c.kind));
    let bribed = reportClauses(answer, [clause("newsStrength", { power: "Hatti", amount: 0 })], timid, false, true, false);
    Assert.equal(["accept", "newsStrength"], bribed.map((c) => c.kind));
  });

  test("A new claim becomes established once most Great Kings have long called its king brother", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0, recognitionSeasons: 3 }));
    Assert.equal(StartClaims, s.claims);
    Assert.contains(openingLines(s.config), (l) => l.startsWith("Assyria:") && l.endsWith("Its claim to be a Great King is new: Babylonia holds Assyria to be its vassal."));
    let e = new TurnEngine(s);
    for (const p of ["Egypt", "Hatti", "Mitanni", "Arzawa"] as Power[]) e.recordGreeting(p, "Assyria", null);
    e.recordGreeting("Babylonia", "Assyria", { omit: false, senderFirst: false, callBrother: false, claimGreatKing: true, grantGreatKing: false, custom: null });
    e.recognise();
    Assert.null(s.claims[0].established);
    s.turn += 3;
    e.recognise();
    Assert.equal(s.turn, s.claims[0].established);
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "A claim is established");
    Assert.contains(s.events, (x) => x.signal === "claim-established");
  });

  test("A support that keeps a promise made in a letter is an event", () => {
    let s = armiesBefore13(newGame(1, newGameConfig({ catastropheChance: 0 })));
    let e = new TurnEngine(s);
    let envoy = first(s.characters, (c) => c.employer === "Hatti");
    e.beginTurn();
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [dispatch(envoy.id, "Egypt", "", { clauses: [clause("support", { province: "memphis", to: "sinai", turn: 3 })] })] })]]));
    e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict<Power, TurnSubmission>());
    Assert.equal(3, s.turn);
    // Hatti has no troop beside Sinai: one is put there for the test.
    single(s.units, (u) => u.province === "nesa").province = "gaza";
    e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [support("gaza", "memphis", "sinai")] })]]));
    Assert.contains(s.events, (x) => x.signal === "support-kept");
  });
});
