import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  TurnEngine,
  TradeData,
  inboxOf,
  newGame,
  newGameConfig,
  newGrant,
  newTurnSubmission,
  roads,
  ship,
  single,
  smuggleOdds,
  toll,
  tollRate,
  trade,
  newToll,
  type Power,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// The economy abroad (build order item 9+b): trading caravans and ships, tolls, smuggling, troops abroad by leave, and the sack.
describe("TradeTests", () => {
  const game = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0 }));
  const notices = (s: GameState, p: Power, title: string): string => inboxOf(s, p).filter((i) => i.title === title).map((i) => i.body).join(" | ");
  /** Seasons go by until no caravan is on the road (or ten have passed). */
  const untilHome = (s: GameState, e: TurnEngine): void => {
    for (let i = 0; i < 10 && s.caravans.length > 0; i++) {
      s.turn++;
      e.beginTurn();
    }
  };

  test("A caravan trades at a foreign market: sells its grain, buys with its gold, and brings the proceeds home", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.stores.set("hattusa", 200);
    s.treasuries.get("Hatti").gold = 1000;
    const m = s.markets.get("carchemish");
    const purse = m.purse;
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [trade("hattusa", "carchemish", 100, 0)] })]]));
    const c = single(s.caravans);
    Assert.equal(["hattusa", "nesa", "carchemish"], c.route);
    Assert.equal(100, s.stores.get("hattusa"));
    untilHome(s, e);
    Assert.empty(s.caravans);
    // Its grain (less what the porters ate) was sold to the free city's market, paid from its people's purse, and the
    // proceeds came home to the treasury.
    Assert.true(m.purse < purse);
    Assert.contains("sold 81 measures of grain for", notices(s, "Hatti", "Markets and caravans"));
    Assert.contains("came home to Hattusa with", notices(s, "Hatti", "Markets and caravans"));
    Assert.true(s.events.some((x) => x.signal === "sale-abroad"));
    Assert.contains("came home to Hattusa with 1 mina 25 shekels into the treasury", notices(s, "Hatti", "Markets and caravans"));
  });

  test("Tolls: the most particular rate applies, and goods entering pay it in kind and in gold", () => {
    const tolls = [newToll({ holder: "Mitanni", percent: 10 }), newToll({ holder: "Mitanni", partner: "Hatti", percent: 0 }), newToll({ holder: "Mitanni", province: "harran", percent: 30 })];
    Assert.equal(0, tollRate(tolls, "Mitanni", "washukanni", "Hatti"));
    Assert.equal(10, tollRate(tolls, "Mitanni", "washukanni", "Egypt"));
    // A partner's own rate holds in all the land, before a province's.
    Assert.equal(0, tollRate(tolls, "Mitanni", "harran", "Hatti"));
    Assert.equal(30, tollRate(tolls, "Mitanni", "harran", "Egypt"));
    Assert.equal(0, tollRate(tolls, "Egypt", "memphis", "Hatti"));

    const s = game();
    const e = new TurnEngine(s);
    s.stores.set("hattusa", 200);
    s.treasuries.get("Hatti").gold = 1000;
    e.resolve(new Dict<Power, ReturnType<typeof newTurnSubmission>>([["Mitanni", newTurnSubmission({ orders: [toll(20, "Hatti")] })]]));
    Assert.equal(20, tollRate(s.tolls, "Mitanni", "washukanni", "Hatti"));
    s.turn++;
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [trade("hattusa", "washukanni", 100, 100)] })]]));
    untilHome(s, e);
    Assert.true(s.events.some((x) => x.signal === "toll-paid"));
    Assert.contains("paid Mitanni's toll of 20%", notices(s, "Hatti", "Markets and caravans"));
    Assert.contains("Goods entering your land paid your tolls", notices(s, "Mitanni", "Tolls"));
    Assert.contains("16 measures of grain into the stores where they crossed and 20 shekels into the treasury", notices(s, "Mitanni", "Tolls"));
  });

  test("Smuggling: no toll is paid, but the odds of being found grow with the load and the watchmen", () => {
    Assert.equal(TradeData.smuggleFound, smuggleOdds(0, 0, 0, 90));
    Assert.equal(TradeData.smuggleFound + 10 + TradeData.smuggleGold + 10, smuggleOdds(100, 5, 30, 90));
    Assert.equal(90, smuggleOdds(5000, 0, 0, 90));
    // Over many games, smugglers through Mitanni's land are sometimes found and lose their goods, and otherwise pay no toll.
    let found = 0;
    let passed = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = newGame(seed, newGameConfig({ catastropheChance: 0 }));
      const e = new TurnEngine(s);
      s.stores.set("hattusa", 200);
      s.treasuries.get("Hatti").gold = 1000;
      s.tolls.push(newToll({ holder: "Mitanni", percent: 50 }));
      e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [trade("hattusa", "washukanni", 150, 0, true)] })]]));
      untilHome(s, e);
      if (s.events.some((x) => x.signal === "smuggler-found")) found++;
      if (s.events.some((x) => x.signal === "smuggled")) passed++;
      Assert.false(s.events.some((x) => x.signal === "toll-paid"));
    }
    Assert.true(found > 0);
    Assert.true(passed > 0);
  });

  test("An open caravan is turned back where the roads are closed to it", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.stores.set("hattusa", 200);
    e.resolve(new Dict([["Mitanni", newTurnSubmission({ orders: [roads("Hatti", true)] })]]));
    s.turn++;
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [trade("hattusa", "washukanni", 100, 0)] })]]));
    untilHome(s, e);
    Assert.contains("was turned back at the border of Mitanni's land", notices(s, "Hatti", "Markets and caravans"));
    Assert.false(s.events.some((x) => x.signal === "sale-abroad"));
  });

  test("A fleet in cargo service sails out of the war, trades at a foreign harbour and comes home to its place", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.stores.set("enkomi", 300);
    const fleet = single(s.units, (u) => u.province === "enkomi");
    e.resolve(new Dict([["Alashiya", newTurnSubmission({ orders: [ship("enkomi", "enkomi", "ugarit", 200, 0)] })]]));
    const c = single(s.caravans);
    Assert.equal(fleet, c.ship);
    Assert.false(s.units.includes(fleet));
    Assert.equal(["enkomi", "enkomiwaters", "ugaritwaters", "ugarit"], c.route);
    untilHome(s, e);
    if (s.events.some((x) => x.signal === "ship-lost")) return;
    Assert.true(s.units.includes(fleet));
    Assert.equal("enkomi", fleet.province);
    Assert.contains("The fleet is back in Enkomi, ready for war.", notices(s, "Alashiya", "Markets and caravans"));
  });

  test("Troops abroad by leave spend their pay there and buy their food at its market; without leave, nobody sells to them", () => {
    const s = game();
    const e = new TurnEngine(s);
    const u = single(s.units, (x) => x.province === "nesa");
    u.province = "harran";
    u.food = 0;
    s.grants.push(newGrant({ id: "g1", kind: "basing", grantor: "Mitanni", grantee: "Hatti", province: "harran", sinceTurn: s.turn, tabletId: "t" }));
    const purse = s.markets.get("harran").purse;
    s.markets.get("harran").stock = 500;
    e.beginTurn();
    Assert.equal(0, u.hungry);
    Assert.true(s.markets.get("harran").purse > purse);
    Assert.true(s.events.some((x) => x.signal === "food-bought"));

    const t = game();
    const f = new TurnEngine(t);
    const v = single(t.units, (x) => x.province === "nesa");
    v.province = "harran";
    const before = t.markets.get("harran").purse;
    f.beginTurn();
    Assert.equal(before, t.markets.get("harran").purse);
    Assert.equal(t.config.armyUpkeep, v.savings);
  });

  test("A province taken by force is sacked: its taker carries off a share of its purse", () => {
    const s = game();
    const e = new TurnEngine(s);
    const m = s.markets.get("harran");
    m.purse = 900;
    const gold = s.treasuries.get("Hatti").gold;
    e.sack("harran", "Hatti");
    Assert.equal(900 - Math.floor((900 * TradeData.sackPercent) / 100), m.purse);
    Assert.equal(gold + Math.floor((900 * TradeData.sackPercent) / 100), s.treasuries.get("Hatti").gold);
  });
});
