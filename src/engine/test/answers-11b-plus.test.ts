import { describe, test } from "vitest";
import { Dict, MoneyData, TurnEngine, WorldMap, first, foldOldPay, huntBands, newContract, newGame, newJobErrand, talkWeight, trustIn, type GameState } from "@amarna/engine";
import { Assert } from "./support.ts";

const Map = WorldMap.default;

/** A free person standing at `p`'s court, with nothing on its hands. */
function freeAt(s: GameState, p: "Egypt" | "Hatti") {
  const c = first(s.characters, (x) => x.status === "Free" && x.heldBy === null);
  c.at = p;
  c.duty = "None";
  c.errand = null;
  return c;
}

// Haakon's answers to item 11b+ (build order item 11b++), each tested on the few people and provinces it needs.
describe("AnswersTo11bPlusTests", () => {
  test("No rule forgets talk of promises: a script person weighs it less as it ages, and never as nothing", () => {
    const s = newGame(1);
    const c = freeAt(s, "Egypt");
    Assert.true(talkWeight(c, 0) === 1);
    Assert.true(talkWeight(c, 40) < talkWeight(c, 4));
    Assert.true(talkWeight(c, 400) > 0);
    const e = new TurnEngine(s);
    e.recordPay("Hatti", false, "Egypt", c);
    const fresh = trustIn(s, "Hatti", c);
    Assert.true(fresh < MoneyData.trustStart);
    // Many seasons on, the promise leaves the news that travels, but stays in the person's own old talk.
    s.turn += 30;
    foldOldPay(s, 12);
    Assert.empty(s.payFacts);
    Assert.contains(c.payOld, (o) => o.party === "Hatti" && o.broken === 1);
    Assert.contains(c.memory, (m) => m.text.startsWith("Old talk I keep"));
    const old = trustIn(s, "Hatti", c);
    Assert.true(old > fresh && old < MoneyData.trustStart);
  });

  test("A captive who dies in his captor's hands leaves his purse to the captor's treasury", () => {
    const s = newGame(1);
    const c = freeAt(s, "Egypt");
    c.status = "Captured";
    c.heldBy = "Egypt";
    c.purse = 120;
    const e = new TurnEngine(s);
    const before = s.treasuries.get("Egypt").gold;
    e.dies(c, Map.capital("Egypt").id, "of the plague");
    e.goldAndTabletsTaken();
    Assert.equal(before + 120, s.treasuries.get("Egypt").gold);
    Assert.equal(0, c.purse);
  });

  test("A stay at court is an errand: an errand given during it is its own job, and the stay goes on after it", () => {
    const s = newGame(1);
    const c = freeAt(s, "Egypt");
    c.status = "Employed";
    c.employer = "Egypt";
    c.contract = newContract({ fee: 40, advance: 20, startTurn: s.turn, untilTurn: s.turn + 8, errand: newJobErrand({ what: "stay", where: "Egypt" }), payOnDone: true });
    const e = new TurnEngine(s);
    Assert.null(e.jobFits(c, "Egypt", c.contract, 1));
    e.renew("Egypt", { type: "renew", character: c.id, fee: 200, advance: 100, term: 6, what: "envoy", where: "Hatti", payOnDone: true });
    Assert.equal("envoy", c.contract.errand!.what);
    Assert.equal(0, c.contract.carried);
    Assert.equal(20, c.contract.stay!.rest);
    // The errand done and the man back at court before the stay's deadline: the stay goes on, its rest still to come.
    c.contract.errand!.done = true;
    s.turn++;
    e.jobsDone(new Dict());
    Assert.equal("stay", c.contract!.errand!.what);
    Assert.equal(20, c.contract!.fee - c.contract!.advance);
  });

  test("A standing hunt names provinces; chiefs hear of it by talk at the pace of the roads", () => {
    const s = newGame(1);
    const mine = Map.landProvinces.filter((p) => s.owner.getOrDefault(p.id, null) === "Egypt").map((p) => p.id);
    const e = new TurnEngine(s);
    e.resolveCourt([["Egypt", huntBands(true, [mine[0]])]]);
    Assert.equal(1, s.hunts.length);
    Assert.equal(mine[0], s.hunts[0].provinces[0]);
    // Far from Egypt's capital, the talk has not arrived yet; once the road's seasons are past, it has.
    const far = first(Map.landProvinces, (p) => e.travelTurnsBetween(Map.capital("Egypt").id, p.id) >= 2).id;
    Assert.false(e.huntHeard(far, mine[0]));
    s.turn += 12;
    Assert.true(e.huntHeard(far, mine[0]));
    Assert.false(e.huntHeard(far, mine[1] ?? far));
  });
});
