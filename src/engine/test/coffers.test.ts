import { describe, test } from "vitest";
import { Dict, type GameState, TurnEngine, caravan, inboxOf, newGame, newGameConfig, newOwnerChange, newTurnSubmission, newUnit, newWorkPlan, send } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// Gold travels both ways (#587, "One treasury, many stores"): what is done far off is paid only from gold that is there.
describe("CofferTests", () => {
  /** Egypt holds Nippur, far beyond the season's reach of its court; Babylonia is the only other king. */
  const game = (): GameState => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
    s.owner.set("nippur", "Egypt");
    s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
    s.ledger.set("nippur", new Dict([["Egypt", 5000]]));
    s.units = s.units.filter((u) => u.province !== "nippur");
    return s;
  };

  test("A far province's works paid in gold run on credit, and the treasury pays only when the bill comes home", () => {
    const s = game();
    const e = new TurnEngine(s);
    const far = e.wordTo("Egypt", "nippur");
    Assert.true(far >= 1, "Nippur is beyond the season's reach");
    const paid = e.payFar("Egypt", "nippur", 40);
    Assert.equal(40, paid?.credit ?? -1);
    Assert.equal(1, s.bills.length);
    Assert.equal(s.turn + 1 + far, s.bills[0].due);
    const t = s.treasuries.get("Egypt");
    const before = t.gold;
    s.turn = s.bills[0].due - 1;
    e.goldArrives();
    Assert.equal(before, t.gold);
    s.turn++;
    const lines = e.goldArrives();
    Assert.equal(before - 40, t.gold);
    Assert.contains("A bill came home from Nippur", lines.get("Egypt").join(" "));
  });

  test("A bill the treasury cannot pay leaves a debt, and no more credit there until the coffer pays it", () => {
    const s = game();
    const e = new TurnEngine(s);
    const u = newUnit({ id: "u900", power: "Egypt", kind: "Army", province: "nippur", home: "nippur", men: 1000 });
    s.units.push(u);
    e.payFar("Egypt", "nippur", 30);
    e.payFar("Egypt", "nippur", 20, u);
    s.treasuries.get("Egypt").gold = 0;
    s.treasuries.get("Egypt").lots.length = 0;
    s.turn = s.bills[0].due;
    e.goldArrives();
    Assert.equal(30, e.cofferOf("Egypt", "nippur")?.owed ?? 0);
    Assert.equal(1, u.unpaid);
    // No credit while a debt is unpaid.
    Assert.null(e.payFar("Egypt", "nippur", 10));
    // Gold reaching the coffer pays the debt first, as the season ends.
    e.receiveAt("Egypt", "nippur", 50);
    e.coffersSettle();
    Assert.equal(0, e.cofferOf("Egypt", "nippur")?.owed ?? 0);
  });

  test("A far province's own gold fills its coffer, which keeps what it needs and sends the rest home as a load", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.works.push(newWorkPlan({ province: "nippur", kind: "Walls", keep: 1, labour: false }));
    s.walls.set("nippur", 1);
    const t = s.treasuries.get("Egypt");
    const before = t.gold;
    e.receiveAt("Egypt", "nippur", 500);
    Assert.equal(before, t.gold);
    e.coffersSettle();
    const kept = e.cofferOf("Egypt", "nippur")?.gold ?? 0;
    Assert.true(kept > 0 && kept < 500, `it keeps a reserve for its walls (${kept})`);
    Assert.equal(500 - kept, s.caravans.filter((c) => c.power === "Egypt").reduce((a, c) => a + c.gold, 0));
  });

  test("Gold sent ahead leaves the treasury at once and reaches the coffer with the couriers; from a lost province it comes back", () => {
    const s = game();
    const e = new TurnEngine(s);
    const t = s.treasuries.get("Egypt");
    t.gold = 1000;
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [send("nippur", 300)] })]]));
    Assert.equal(1, s.sent.length);
    const due = s.sent[0].due;
    const after = t.gold;
    s.turn = due;
    e.goldArrives();
    Assert.equal(300, e.cofferOf("Egypt", "nippur")?.gold ?? 0);
    Assert.equal(after, t.gold);
    // Sent again, but Nippur is lost before it arrives: the couriers bring it home, as long again.
    e.sendGold("Egypt", send("nippur", 100));
    s.owner.set("nippur", "Babylonia");
    s.turn = s.sent[0].due;
    e.goldArrives();
    Assert.equal(after - 100, t.gold);
    Assert.true(s.sent[0].home);
    s.turn = s.sent[0].due;
    e.goldArrives();
    Assert.equal(after, t.gold);
  });

  test("A province within the season's reach refuses gold sent ahead: the treasury pays there at once", () => {
    const s = game();
    const e = new TurnEngine(s);
    const near = [...s.owner.entries()].find(([id, p]) => p === "Egypt" && id !== "nippur" && e.wordTo("Egypt", id) === 0)![0];
    const before = s.treasuries.get("Egypt").gold;
    e.sendGold("Egypt", send(near, 100));
    Assert.equal(before, s.treasuries.get("Egypt").gold);
    Assert.equal(0, s.sent.length);
    Assert.contains("No gold sent", inboxOf(s, "Egypt").map((i) => i.title).join(" "));
  });

  test("A caravan carries its porters' pay for the road: the treasury pays nothing while it travels", () => {
    const s = game();
    const e = new TurnEngine(s);
    const from = "memphis";
    const to = "gaza";
    s.owner.set(to, "Egypt");
    s.stores.set(from, 500);
    const t = s.treasuries.get("Egypt");
    t.gold = 1000;
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [caravan(from, to, 200)] })]]));
    const c = s.caravans.find((x) => x.power === "Egypt" && x.from === from);
    Assert.true(c !== undefined && c.pay > 0, "it set out with its pay");
    const gold = t.gold;
    s.turn++;
    e.caravansTravel();
    Assert.equal(gold, t.gold);
  });
});
