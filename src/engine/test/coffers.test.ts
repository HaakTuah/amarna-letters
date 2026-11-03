import { describe, test } from "vitest";
import { Dict, type GameState, OrderValidator, TurnEngine, build, caravan, inboxOf, newGame, newGameConfig, newOwnerChange, newTurnSubmission, newUnit, newCaravan, newWorkPlan, purchase, send, setLevel, trade } from "@amarna/engine";
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
    // Its mines filled the coffer a little before the bill came: that pays the debt first.
    e.receiveAt("Egypt", "nippur", 10);
    s.turn = s.bills[0].due;
    e.goldArrives();
    Assert.equal(20, e.cofferOf("Egypt", "nippur")?.owed ?? 0);
    Assert.equal(0, e.cofferOf("Egypt", "nippur")?.gold ?? 0);
    Assert.equal(1, u.unpaid);
    // With a debt there, its next season's pay finds no credit either.
    e.payTroops("Egypt");
    Assert.equal(2, u.unpaid);
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

  test("A far order reserves nothing of the treasury: its coffer or a bill pays it; a near one still does", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.treasuries.get("Egypt").gold = 0;
    s.treasuries.get("Egypt").lots.length = 0;
    const near = [...s.owner.entries()].find(([id, p]) => p === "Egypt" && e.wordTo("Egypt", id) === 0)![0];
    const v = new OrderValidator(s, e.map).validate("Egypt", newTurnSubmission({ orders: [build("nippur", "Walls", 3, false), purchase("nippur", 20), purchase(near, 20)] }));
    Assert.equal(2, v.accepted.length);
    Assert.contains("not enough gold", v.rejected.map((r) => r.reason).join(" "));
  });

  test("Gold taken far off in another's land goes home as a load, not into the treasury at once", () => {
    const s = game();
    const e = new TurnEngine(s);
    const t = s.treasuries.get("Egypt");
    const before = t.gold;
    e.receiveAt("Egypt", "babylon", 80);
    Assert.equal(before, t.gold);
    Assert.equal(80, s.caravans.filter((c) => c.power === "Egypt").reduce((a, c) => a + c.gold, 0));
  });

  test("A trading caravan asked to carry more gold than is there carries what is left after its porters' pay", () => {
    const s = game();
    const e = new TurnEngine(s);
    const from = "memphis";
    s.stores.set(from, 0);
    const t = s.treasuries.get("Egypt");
    t.gold = 60;
    t.lots.length = 0;
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [trade(from, "babylon", 0, 59)] })]]));
    const c = s.caravans.find((x) => x.power === "Egypt" && x.trade);
    Assert.true(c !== undefined && c.gold > 0 && c.gold + c.pay <= 60, "it set out with the gold there, less its pay");
  });

  test("Troops abroad paid on credit keep the missing pay of a bill the treasury could not pay", () => {
    const s = game();
    const e = new TurnEngine(s);
    const u = newUnit({ id: "u901", power: "Egypt", kind: "Army", province: "babylon", home: "nippur", men: 1000 });
    s.units.push(u);
    e.payTroops("Egypt");
    Assert.equal(1, s.bills.length);
    s.treasuries.get("Egypt").gold = 0;
    s.treasuries.get("Egypt").lots.length = 0;
    s.turn = s.bills[0].due;
    const lines = e.goldArrives();
    Assert.equal(1, u.unpaid);
    Assert.contains("Unpaid: ", lines.get("Egypt").join(" "));
    // The next season's pay goes on credit again, and does not wipe out what the bill left unpaid.
    e.payTroops("Egypt");
    Assert.equal(1, u.unpaid);
  });

  test("A bill paid late clears a unit's missing pay only if it missed none since", () => {
    const s = game();
    const e = new TurnEngine(s);
    const u = newUnit({ id: "u902", power: "Egypt", kind: "Army", province: "babylon", home: "nippur", men: 1000 });
    s.units.push(u);
    e.payTroops("Egypt");
    u.unpaid = 2;
    s.turn = s.bills[0].due;
    e.goldArrives();
    Assert.equal(2, u.unpaid);
  });

  test("A caravan's pay for the road is reckoned without roads built since, which its court may not know of", () => {
    const s = game();
    const e = new TurnEngine(s);
    const route = e.caravanRoute("Egypt", "memphis", "babylon")!;
    const c = newCaravan({ power: "Egypt", from: "memphis", to: "babylon", grain: 100, route, trade: true });
    const before = e.payLoad(c);
    for (const id of route) setLevel(s, "Roads", id, 3);
    Assert.equal(before, e.payLoad(c));
  });

  test("An unpaid bill names its troops as the bill does, whether or not they are still there", () => {
    const told = (gone: boolean): string => {
      const s = game();
      const e = new TurnEngine(s);
      s.units.push(newUnit({ id: "u903", power: "Egypt", kind: "Army", province: "babylon", home: "nippur", men: 1000 }));
      e.payTroops("Egypt");
      if (gone) s.units = s.units.filter((u) => u.id !== "u903");
      s.treasuries.get("Egypt").gold = 0;
      s.treasuries.get("Egypt").lots.length = 0;
      s.turn = s.bills[0].due;
      return e.goldArrives().get("Egypt").join(" ");
    };
    Assert.equal(told(false), told(true));
  });
});
