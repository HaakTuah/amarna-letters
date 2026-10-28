import { describe, test } from "vitest";
import {
  Dict,
  type GameConfig,
  type GameState,
  TurnEngine,
  type TurnSubmission,
  buy,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newPlannedOrder,
  newSleepState,
  newTurnSubmission,
  newUnit,
  single,
  support,
  TradeData,
} from "@amarna/engine";
import { Assert, toDict } from "./support.ts";

// <summary>A city bought in the season troops take it: nobody pays, every bidder is told, a scheduled bid wakes its seat.</summary>
describe("PurchaseTests", () => {
  // <summary>Babylonia holds Megiddo and Tyre, with an army in each, ready to storm Gaza's walls (brought down to level 1, so a supported attack storms them).</summary>
  function board(config: GameConfig | null = null): GameState {
    let s = newGame(1, config);
    // Treasuries rich enough for a city's price, what it adds (item 9+a).
    for (const t of s.treasuries.values()) t.gold += 5000;
    s.walls.set("gaza", 1);
    for (const city of ["megiddo", "tyre"]) {
      s.owner.set(city, "Babylonia");
      s.walls.delete(city);
    }
    s.units.push(newUnit({ id: "u90", power: "Babylonia", kind: "Army", province: "megiddo" }));
    s.units.push(newUnit({ id: "u91", power: "Babylonia", kind: "Army", province: "tyre" }));
    return s;
  }

  const Storm: TurnSubmission = newTurnSubmission({ orders: [move("megiddo", "gaza"), support("tyre", "megiddo", "gaza")] });

  test("A city taken by troops is not sold and the buyer keeps its gold", () => {
    let s = board();
    let e = new TurnEngine(s);
    e.beginTurn();
    let gold = s.treasuries.get("Egypt").gold;
    let valid = e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [buy("gaza")] })],
        ["Babylonia", Storm],
      ]),
    );

    Assert.single(valid.get("Egypt").accepted);
    Assert.equal("Babylonia", s.owner.get("gaza"));
    Assert.equal(gold, s.treasuries.get("Egypt").gold);
    let notice = single(inboxOf(s, "Egypt"), (i) => i.title === "Purchase failed");
    Assert.equal("Rejected", notice.kind);
    Assert.equal("Gaza was taken by Babylonia's troops last season before its elders could accept your gold. No gold was paid.", notice.body);
    Assert.equal(s.turn, notice.turn); // read next season
  });

  test("Every bidder is told including the one whose own troops took it", () => {
    let s = board();
    let e = new TurnEngine(s);
    e.beginTurn();
    let gold = toDict(
      s.treasuries,
      (x) => x[0],
      (x) => x[1].gold,
    );
    // Its taker sacks it (item 9+b): that loot is all the gold that changes hands, the king's share on its way home (item 10+b).
    e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [buy("gaza")] })],
        ["Babylonia", newTurnSubmission({ orders: [...Storm.orders, buy("gaza")] })],
      ]),
    );

    Assert.equal("Babylonia", s.owner.get("gaza"));
    Assert.equal("Your own troops took Gaza last season; no gold was paid.", single(inboxOf(s, "Babylonia"), (i) => i.title === "Purchase failed").body);
    Assert.contains("taken by Babylonia's troops", single(inboxOf(s, "Egypt"), (i) => i.title === "Purchase failed").body);
    Assert.equal(gold.get("Egypt"), s.treasuries.get("Egypt").gold);
    const onRoad = s.caravans.filter((c) => c.power === "Babylonia").reduce((a, c) => a + c.gold, 0);
    Assert.true(s.treasuries.get("Babylonia").gold + onRoad > gold.get("Babylonia"));
    Assert.true(s.treasuries.get("Babylonia").gold <= gold.get("Babylonia") + onRoad + 1000);
  });

  test("A scheduled bid for a city taken that season wakes its seat", () => {
    let s = board(newGameConfig({ sleepingSeats: true }));
    s.sleep.set(
      "Egypt",
      newSleepState({
        asleep: true,
        wakeAt: 50,
        scheduled: [newPlannedOrder({ turn: s.turn, order: buy("gaza") })],
      }),
    );
    let e = new TurnEngine(s);
    e.beginTurn();
    let gold = s.treasuries.get("Egypt").gold;
    e.resolve(new Dict([["Babylonia", Storm]]));

    Assert.equal(gold, s.treasuries.get("Egypt").gold);
    Assert.contains(s.sleep.get("Egypt").pendingWake, (w) => w.includes("buy the city-state of gaza") && w.includes("Babylonia's troops took it"));
  });
});
