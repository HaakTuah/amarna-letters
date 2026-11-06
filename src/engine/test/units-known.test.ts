import { describe, test } from "vitest";
import {
  Dict,
  TurnEngine,
  Views,
  WorldMap,
  command,
  hold,
  inboxOf,
  mandateOrder,
  move,
  newGame,
  newGameConfig,
  newMandate,
  newOwnerChange,
  newPlannedOrder,
  newScheduledOrders,
  newStandingRequest,
  newSleepState,
  newTurnSubmission,
  newUnit,
  loseUnit,
  relieve,
  supply,
  unitReport,
  type Order,
  type Power,
  type TurnSubmission,
} from "@amarna/engine";
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
    const d = new TurnEngine(s, WorldMap.default).wordFrom("Egypt", "nippur");
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
    const d = new TurnEngine(s, WorldMap.default).wordFrom("Egypt", "nippur");
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
    const d = new TurnEngine(s, WorldMap.default).wordFrom("Egypt", "nippur");
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

  test("A scheduled or standing order for a far unit lost out of sight is kept, as for one that stands, until word of its end (bug #600)", () => {
    const { s, u, season } = farArmy();
    for (let i = 0; i < 3; i++) season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    s.sleep.tryAdd("Egypt", newSleepState());
    const d = new TurnEngine(s, WorldMap.default).wordFrom("Egypt", "nippur");
    loseUnit(s, u);
    const gone = s.turn;
    const sub = newTurnSubmission({
      scheduled: [newScheduledOrders({ turn: s.turn + 2 * d + 4, orders: [move("nippur", "ur")] })],
      standing: [newStandingRequest({ when: "UnitAttacked", province: "nippur", orders: [hold("nippur")] })],
    });
    new TurnEngine(s, WorldMap.default).resolve(new Dict([["Egypt", sub]]));
    new TurnEngine(s, WorldMap.default).beginTurn();
    // Not refused at court: both are bound to the army its king still knows there.
    Assert.false(inboxOf(s, "Egypt").some((i) => i.kind === "Rejected" && i.title.endsWith("orders not kept")));
    Assert.equal("u990", s.sleep.get("Egypt").scheduled[0]?.unitId);
    Assert.equal("u990", s.standing.get("Egypt").orders[0]?.unitId);
    // Once word of its end comes, both drop, as for a unit lost in sight.
    while (s.turn < gone + 1 + d) {
      Assert.equal(1, s.sleep.get("Egypt").scheduled.length);
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
      new TurnEngine(s, WorldMap.default).beginTurn();
    }
    new TurnEngine(s, WorldMap.default).resolve(new Dict());
    Assert.empty(s.sleep.get("Egypt").scheduled);
    Assert.empty(s.standing.get("Egypt").orders);
  });

  test("A standing order for a far unit lost out of sight fires only as it would for one that stands (bug #600)", () => {
    // Egypt's standing order waits on Babylonia's troops entering a province it sees near its court; its army in Nippur,
    // far off, is to hold. In one world that army is lost out of sight as Babylonia moves in: the seat reads the same.
    const fired = (lost: boolean) => {
      const { s, u, season } = farArmy();
      for (let i = 0; i < 3; i++) season();
      const map = WorldMap.default;
      const next = (subs: Dict<Power, TurnSubmission> = new Dict()) => {
        new TurnEngine(s, map).beginTurn();
        new TurnEngine(s, map).resolve(subs);
      };
      const sight = Views.sight(s, map, "Egypt");
      const empty = (x: string): boolean => !map.get(x).isSea && !s.units.some((v) => v.province === x);
      const [target, from] = [...sight].filter(empty).flatMap((t) => map.neighbors(t).filter(empty).map((f) => [t, f]))[0];
      // Babylonia's king stands with the army, so his order to move runs the season he gives it.
      s.court.set("Babylonia", from);
      s.units.push(newUnit({ id: "u997", power: "Babylonia", kind: "Army", province: from, home: from, men: 1000 }));
      next(new Dict([["Egypt", newTurnSubmission({ standing: [newStandingRequest({ when: "UnitEnters", power: "Babylonia", province: target, orders: [hold("nippur")] })] })]]));
      new TurnEngine(s, map).beginTurn();
      if (lost) loseUnit(s, u);
      new TurnEngine(s, map).resolve(new Dict([["Babylonia", newTurnSubmission({ orders: [move(from, target)] })]]));
      new TurnEngine(s, map).beginTurn();
      const read = inboxOf(s, "Egypt")
        .filter((i) => i.turn === s.turn)
        .map((i) => `${i.title}: ${i.body}`);
      return { read, left: s.standing.get("Egypt").orders.length };
    };
    const [lost, stands] = [fired(true), fired(false)];
    Assert.equal(stands.read, lost.read);
    Assert.equal(stands.left, lost.left);
  });

  test("A unit that leaves its king twice is lost to him when word of its last leaving comes (bug #600)", () => {
    const { s, u, season } = farArmy();
    const next = () => {
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
      new TurnEngine(s, WorldMap.default).beginTurn();
    };
    for (let i = 0; i < 3; i++) season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    s.sleep.tryAdd("Egypt", newSleepState());
    const d = new TurnEngine(s, WorldMap.default).wordFrom("Egypt", "nippur");
    // It leaves (as a fleet into cargo service) and comes back, the same unit, then is lost far off.
    loseUnit(s, u);
    for (let i = 0; i < 3; i++) next();
    s.units.push(u);
    for (let i = 0; i < 2; i++) next();
    s.sleep.get("Egypt").scheduled.push(newPlannedOrder({ turn: s.turn + 10, order: move("nippur", "ur"), unitId: "u990", given: s.turn }));
    loseUnit(s, u);
    const heard = s.turn + 1 + d;
    while (s.turn < heard) {
      Assert.equal(1, s.sleep.get("Egypt").scheduled.length);
      Assert.equal(1, shown(s).length);
      next();
    }
    Assert.empty(s.sleep.get("Egypt").scheduled);
  });

  test("A far levy's army lost before word of its raising keeps its orders, named by its levy, until word of its end (bug #600)", () => {
    const { s, season } = farArmy();
    s.units = s.units.filter((x) => x.id !== "u990");
    s.sleep.tryAdd("Egypt", newSleepState());
    season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    const d = new TurnEngine(s, WorldMap.default).wordFrom("Egypt", "nippur");
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

  test("Command, recall, mandate and food for a far unit lost out of sight are given as for one that stands, and fail where they arrive (bug #600)", () => {
    const orders: [string, Order, boolean][] = [
      ["relieve", relieve("nubia"), true],
      ["mandate", mandateOrder("nubia", newMandate({ task: "guard" })), true],
      ["command", command("nubia", ""), false],
      ["supply", supply("nubia", true), false],
    ];
    for (const [name, order, commanded] of orders) {
      // The king's receipts the season after his order, its only one: in the world where the army was lost as the season
      // began, and in the one where it stands. His court in Nippur, two seasons of couriers from his army in Kush: word of
      // the loss, and his recall's taking effect, come after that season.
      const [lost, stands] = [true, false].map((gone) => {
        const { s, u, season } = farArmy();
        s.court.set("Egypt", "nippur");
        s.units = s.units.filter((x) => x.province !== "nubia");
        u.province = "nubia";
        const c = s.characters.find((x) => x.employer === "Egypt" && x.status === "Employed" && x.at === "Egypt")!;
        if (commanded) {
          u.commander = c.id;
          c.at = null;
          c.duty = "Commanding";
          c.watchProvince = "nubia";
        }
        season();
        new TurnEngine(s, WorldMap.default).beginTurn();
        Assert.equal(2, new TurnEngine(s, WorldMap.default).wordTo("Egypt", "nubia"));
        if (gone) loseUnit(s, u);
        const o = order.type === "command" ? { ...order, character: c.id } : order;
        new TurnEngine(s, WorldMap.default).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [o] })]]));
        new TurnEngine(s, WorldMap.default).beginTurn();
        const receipts = JSON.stringify({
          // The treasury's pay is the army's as it truly is (#587).
          inbox: inboxOf(s, "Egypt")
            .filter((i) => i.turn === s.turn && i.title !== "The treasury")
            .map((i) => `${i.title}: ${i.body}`),
          units: Views.for(s, "Egypt").units.filter((x) => x.power === "Egypt" && x.province === "nubia"),
          man: Views.character(s, c, "Egypt"),
        });
        return { s, receipts };
      });
      Assert.equal(stands.receipts, lost.receipts);
      Assert.false(lost.receipts.includes("could not be carried out"), name);
      Assert.contains('"province":"nubia"', lost.receipts);
      // Its word finds the army gone, and that comes home by the road.
      let told = false;
      for (let i = 0; i < 6 && !told; i++) {
        new TurnEngine(lost.s, WorldMap.default).resolve(new Dict());
        new TurnEngine(lost.s, WorldMap.default).beginTurn();
        told = inboxOf(lost.s, "Egypt").some((x) => x.title === "Order failed" && x.turn === lost.s.turn);
      }
      Assert.true(told, name);
    }
  });

  test("Its orders name a far unit where its view shows it, a gone one given way by an older report (bug #600)", () => {
    const { s, u } = farArmy();
    new TurnEngine(s, WorldMap.default).beginTurn();
    Assert.equal(1, new TurnEngine(s, WorldMap.default).wordTo("Egypt", "nippur"));
    // A live army reported in Nippur; one placed before it, its last reports from Ur and then Nippur, lost out of sight.
    const live = newUnit({ id: "u995", power: "Egypt", kind: "Army", province: "nippur", home: "thebes", men: 800 });
    live.trail = [unitReport(live), unitReport(live), unitReport(live)];
    u.trail = [unitReport({ ...u, province: "ur" }), unitReport(u), unitReport(u)];
    s.units.push(live);
    loseUnit(s, u);
    const v = Views.for(s, "Egypt").units.filter((x) => x.power === "Egypt" && ["nippur", "ur"].includes(x.province));
    Assert.equal("nippur:800,ur:1000", v.map((x) => `${x.province}:${x.men}`).sort().join(","));
    // Each where the view shows it is the unit an order there names.
    const e = new TurnEngine(s, WorldMap.default);
    Assert.equal("u995", e.unitShownAt("Egypt", "nippur")?.id);
    Assert.equal("u990", e.unitShownAt("Egypt", "ur")?.id);
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [hold("ur")] })]]));
    new TurnEngine(s, WorldMap.default).beginTurn();
    const titles = inboxOf(s, "Egypt").filter((i) => i.turn === s.turn).map((i) => i.title);
    Assert.false(titles.includes("Orders that could not be carried out"));
    Assert.true(titles.includes("Orders on the road"));
  });
});
