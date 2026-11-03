import { describe, test } from "vitest";
import { Dict, TurnEngine, Views, WorldMap, hold, inboxOf, move, newGame, newGameConfig, newOwnerChange, newPlannedOrder, newSleepState, newTurnSubmission, newUnit, loseUnit, unitReport } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

/** Egypt holds Nippur, far from its court, with an army there that has sent a few seasons' reports. */
function farArmy() {
  const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
  s.owner.set("nippur", "Egypt");
  s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
  s.ledger.set("nippur", new Dict([["Egypt", 5000]]));
  s.units = s.units.filter((u) => u.province !== "nippur");
  const u = newUnit({ id: "u990", power: "Egypt", kind: "Army", province: "nippur", home: "thebes", men: 1000 });
  s.units.push(u);
  const season = () => {
    new TurnEngine(s, WorldMap.default).beginTurn();
    new TurnEngine(s, WorldMap.default).resolve(new Dict());
  };
  return { s, u, season };
}

const shown = (s: ReturnType<typeof farArmy>["s"]) => Views.for(s, "Egypt").units.filter((x) => x.power === "Egypt" && x.province === "nippur");

describe("UnitsKnownTests", () => {
  test("A far unit lost out of sight stays in its king's view, as last reported, until word of its end could come (bug #600)", () => {
    const { s, u, season } = farArmy();
    for (let i = 0; i < 3; i++) season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    const d = new TurnEngine(s, WorldMap.default).wordTo("Egypt", "nippur");
    Assert.true(d >= 1);
    const before = shown(s);
    Assert.equal(1, before.length);
    Assert.true(before[0].reported > 0);
    loseUnit(s, u);
    const gone = s.turn;
    // Word of its end, from the season it ended, comes a season and the couriers' road later; till then the reports it
    // sent before it come in, never one after.
    const heard = s.turn + 1 + d;
    while (s.turn < heard) {
      Assert.equal(1, shown(s).length);
      Assert.true(shown(s)[0].reported <= gone);
      Assert.equal(before[0].men, shown(s)[0].men);
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
      new TurnEngine(s, WorldMap.default).beginTurn();
    }
    Assert.empty(shown(s));
  });

  test("A unit raised far off is known to its king once word of its raising could come (bug #600)", () => {
    const { s, season } = farArmy();
    s.units = s.units.filter((x) => x.id !== "u990");
    season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    const d = new TurnEngine(s, WorldMap.default).wordTo("Egypt", "nippur");
    s.units.push(newUnit({ id: "u991", power: "Egypt", kind: "Army", province: "nippur", home: "nippur", men: 1000, since: s.turn }));
    const raised = s.turn;
    while (s.turn <= raised + d) {
      Assert.empty(shown(s));
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
      new TurnEngine(s, WorldMap.default).beginTurn();
    }
    Assert.equal(1, shown(s).length);
  });

  test("An order for a far unit lost out of sight rides out, and its failure comes home by the road (bug #600)", () => {
    const { s, u, season } = farArmy();
    for (let i = 0; i < 3; i++) season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    const d = new TurnEngine(s, WorldMap.default).wordTo("Egypt", "nippur");
    loseUnit(s, u);
    const failed = () => inboxOf(s, "Egypt").filter((i) => i.kind === "Rejected" && i.turn === s.turn);
    new TurnEngine(s, WorldMap.default).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [hold("nippur")] })]]));
    // Not refused at court: the king still knows the army there, and the order goes out by courier.
    new TurnEngine(s, WorldMap.default).beginTurn();
    Assert.empty(failed());
    let told = false;
    for (let i = 0; i < 2 * d + 2 && !told; i++) {
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
      new TurnEngine(s, WorldMap.default).beginTurn();
      told = failed().some((x) => x.title === "Order failed" && x.body.includes("no longer stood in Nippur"));
    }
    Assert.true(told);
  });

  test("A far levy's army lost before word of its raising keeps its orders, named by its levy, until word of its end (bug #600)", () => {
    const { s, season } = farArmy();
    s.units = s.units.filter((x) => x.id !== "u990");
    s.sleep.tryAdd("Egypt", newSleepState());
    season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    const d = new TurnEngine(s, WorldMap.default).wordTo("Egypt", "nippur");
    const raised = newUnit({ id: "u991", power: "Egypt", kind: "Army", province: "nippur", home: "nippur", men: 1000, since: s.turn });
    raised.trail.push(unitReport(raised));
    s.units.push(raised);
    s.sleep.get("Egypt").scheduled.push(newPlannedOrder({ turn: s.turn + 2 * d + 4, order: move("nippur", "ur"), unitId: "u991", given: s.turn }));
    const listed = () => JSON.stringify(Views.for(s, "Egypt").scheduled);
    const before = listed();
    Assert.contains("the army to be raised in nippur", before);
    loseUnit(s, raised);
    const heard = s.turn + 1 + d;
    while (s.turn < heard) {
      Assert.equal(before, listed());
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
      new TurnEngine(s, WorldMap.default).beginTurn();
    }
    Assert.empty(s.sleep.get("Egypt").scheduled);
  });
});
