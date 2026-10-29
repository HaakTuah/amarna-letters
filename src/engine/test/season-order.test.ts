import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type Order,
  OrderValidator,
  type Power,
  type RejectedOrder,
  TurnEngine,
  assay,
  cede,
  check,
  dispatch,
  first,
  hire,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newGoldLot,
  newTurnSubmission,
  newUnit,
  placeSpy,
  raise,
  single,
} from "@amarna/engine";
import { Assert, oldWorld } from "./support.ts";

// <summary>Refusals and failures in the words of the rulebook's "HOW A SEASON RESOLVES".</summary>
describe("SeasonOrderTests", () => {
  function refusedOf(s: GameState, p: Power, ...orders: Order[]): RejectedOrder[] {
    return new OrderValidator(s).validate(p, newTurnSubmission({ orders: orders })).rejected;
  }

  test("Gold is reserved in the order the orders are listed", () => {
    let s = oldWorld(newGame(4));
    s.treasuries.get("Egypt").gold = 150;
    let someone = first(s.characters, (c) => c.employer === "Hatti").id;

    let refused = refusedOf(s, "Egypt", check(someone, 100), check(someone, 100));
    Assert.equal("not enough gold: it needs 100 shekels; orders listed before it had reserved 100, and 50 was left", Assert.single(refused).reason);

    s.treasuries.get("Egypt").gold = 50;
    refused = refusedOf(s, "Egypt", check(someone, 100), check(someone, 40));
    Assert.equal("not enough gold: it needs 100 shekels, and your treasury held 50 by your ledger", Assert.single(refused).reason);
  });

  test("A person offered a job may be sent on its errand the same season, and on no other", () => {
    let s = oldWorld(newGame(4));
    let c = first(s.characters, (c) => c.status === "Free");
    c.at = "Egypt";
    // Haakon's answers to item 11a: the job is the errand; offered first or sent first, both stand.
    for (const orders of [
      [hire(c.id, 400, 20, 200, { what: "envoy", where: "Hatti" }), dispatch(c.id, "Hatti", "Greetings.")],
      [placeSpy(c.id, "Hatti"), hire(c.id, 400, 20, 200, { what: "spy", where: "Hatti" })],
    ]) {
      let v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: orders }));
      Assert.empty(v.rejected);
    }
    let v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [hire(c.id, 400, 20, 200, { what: "envoy", where: "Hatti" }), dispatch(c.id, "Babylonia", "Greetings.")] }));
    Assert.contains("another errand is a new job", Assert.single(v.rejected).reason);
  });

  test("An errand for someone whose hire is refused reads as for anyone not in your service", () => {
    let s = oldWorld(newGame(4));
    let c = first(s.characters, (c) => c.status === "Free");
    c.at = "Egypt";
    let other = first(s.characters, (x) => x.employer === "Hatti");

    // A hire that cannot stand (no wage, or someone in another court's service): no "was to be hired" for the errand.
    for (const [who, order] of [
      [c, hire(c.id, 0)],
      [other, hire(other.id, 40)],
    ] as const) {
      let v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [dispatch(who.id, "Hatti", "Greetings."), order] }));
      Assert.equal(
        [`${who.name} is not in your service`, order.fee <= 0 ? "fee and term must be positive" : `${who.name} is not available for hire`],
        v.rejected.map((r) => r.reason),
      );
    }
  });

  test("A lot is assayed and a province ceded once a season", () => {
    let s = oldWorld(newGame(4));
    s.treasuries.get("Egypt").lots.push(newGoldLot({ id: "g900", from: "Hatti", stated: 40, face: 40, true: 40, arrivedTurn: 1 }));
    Assert.equal("gold lot g900 was already to be assayed by an earlier order", single(refusedOf(s, "Egypt", assay("g900"), assay("g900"))).reason);
    Assert.equal("Thebes was already ceded by an earlier order", single(refusedOf(s, "Egypt", cede("thebes", "Hatti"), cede("thebes", "Mitanni"))).reason);
  });

  test("A spy must be one of your own people at court sent to a court or a province", () => {
    let s = oldWorld(newGame(4));
    let own = first(s.characters, (c) => c.employer === "Egypt");
    let stranger = first(s.characters, (c) => c.status === "Free");

    Assert.equal("a spy must be one of your own people at your court: you named nobody", single(refusedOf(s, "Egypt", placeSpy("", "Hatti"))).reason);
    Assert.equal(
      `a spy must be one of your own people at your court: ${stranger.name} is not in your service`,
      single(refusedOf(s, "Egypt", placeSpy(stranger.id, "Hatti"))).reason,
    );
    Assert.equal("a spy must be sent to watch a court or a province: you named neither", single(refusedOf(s, "Egypt", placeSpy(own.id))).reason);
    Assert.equal("a spy must be sent to watch a court or a province: name only one", single(refusedOf(s, "Egypt", placeSpy(own.id, "Hatti", "gaza"))).reason);

    own.duty = "EnvoyOutbound";
    own.at = null;
    Assert.equal(
      `a spy must be one of your own people at your court: ${own.name} is not at your court`,
      single(refusedOf(s, "Egypt", placeSpy(own.id, "Hatti"))).reason,
    );
  });

  test("A levy needs a province you still hold that is empty after movement", () => {
    let s = oldWorld(newGame(4, newGameConfig({ catastropheChance: 0, peopleDefence: 0 })));
    s.owner.set("jerusalem", "Babylonia");
    s.walls.delete("jerusalem");
    s.units.push(newUnit({ id: "u90", power: "Babylonia", kind: "Army", province: "jerusalem" }));
    // Sinai's own men are too few for an army (item 10+a): give it enough, so only the loss of the land stops the levy.
    s.people.get("sinai").men = s.people.get("sinai").settled = 20000;
    let e = new TurnEngine(s);
    e.beginTurn();
    let gold = s.treasuries.get("Egypt").gold;
    e.resolve(
      new Dict([
        // Babylonia takes Sinai as Egypt raises an army there; Egypt marches into Thebes and raises one there too.
        ["Babylonia", newTurnSubmission({ orders: [move("jerusalem", "sinai")] })],
        ["Egypt", newTurnSubmission({ orders: [move("akhetaten", "thebes"), raise("sinai", "Army"), raise("thebes", "Army")] })],
      ]),
    );

    let failed = inboxOf(s, "Egypt")
      .filter((i) => i.title === "Levy failed")
      .map((i) => [i.kind, i.body] as const);
    Assert.contains(failed, (f) => f[0] === "Rejected" && f[1] === "No army was raised in Sinai: you no longer held Sinai after movement. No gold was paid.");
    Assert.contains(failed, (f) => f[0] === "Rejected" && f[1] === "No army was raised in Thebes: Thebes was not empty after movement. No gold was paid.");
    Assert.equal(gold, s.treasuries.get("Egypt").gold);
  });

});
