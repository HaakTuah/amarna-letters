import { describe, test } from "vitest";
import {
  Dict,
  EconomyData,
  type GameState,
  TurnEngine,
  WorldMap,
  besiege,
  capacityOf,
  caravan,
  carriedOf,
  economyOf,
  feed,
  harvestOf,
  inboxOf,
  move,
  needOf,
  provinceWorthOf,
  harvestIn,
  newGame,
  newGameConfig,
  newSiege,
  newTurnSubmission,
  openings,
  purchase,
  sell,
  sellAlongCurve,
  single,
  taxOf,
  unitAt,
  priceAt,
} from "@amarna/engine";
import { Assert, armiesBefore13, last } from "./support.ts";

// The economy at home (build order item 9+a): the harvest's tax into the stores, the mines' gold into the treasury, the
// markets and their purses, troops' pay and food, hunger and mutiny, caravans, the siege's clock and the wealth of a realm.
describe("EconomyTests", () => {
  const Map = WorldMap.default;
  // The armies as before item 13: these rules were measured on full levies.
  const game = (): GameState => armiesBefore13(newGame(1, newGameConfig({ catastropheChance: 0 })));
  const notice = (s: GameState, title: string): string => last(inboxOf(s, "Hatti"), (i) => i.title === title).body;

  test("The harvest's tax goes into each province's stores and the mines' gold into the treasury", () => {
    const s = game();
    const e = new TurnEngine(s);
    const before = s.stores.getOrDefault("nesa", 0);
    const gold = s.treasuries.get("Egypt").gold;
    e.harvestSeason();
    const nesa = Map.get("nesa");
    // Filled up to their capacity, then a little spoils.
    const filled = Math.min(capacityOf(nesa), before + taxOf(harvestOf(nesa)));
    Assert.equal(filled - Math.floor((filled * EconomyData.spoilPercent) / 100), s.stores.get("nesa"));
    const mines = Map.homeOf("Egypt").reduce((a, x) => a + economyOf(x).mine, 0);
    Assert.equal(gold + mines, s.treasuries.get("Egypt").gold);
  });

  test("A sale is priced along the curve and paid from the people's purse, which caps it", () => {
    const r = sellAlongCurve(10, 10, 1000, 10);
    Assert.equal(10, r.taken);
    // The first measure sells under the base price; the tenth lower still.
    Assert.true(r.paid < 10 && r.paid > 5);
    Assert.equal(3, sellAlongCurve(10, 10, 2, 50).taken);
    Assert.equal(EconomyData.basePrice * 4, priceAt(0, 10));
    Assert.equal(EconomyData.basePrice / 4, priceAt(1000, 10));
  });

  test("Selling at a market moves grain from the stores to the market and gold from the purse to the treasury", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.stores.set("hattusa", 100);
    const m = s.markets.get("hattusa");
    const [purse, stock, gold] = [m.purse, m.stock, s.treasuries.get("Hatti").gold];
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [sell("hattusa", 40)] })]]));
    Assert.equal(stock + 40, m.stock);
    Assert.equal(60, s.stores.get("hattusa"));
    Assert.true(s.treasuries.get("Hatti").gold > gold);
    Assert.equal(purse - (s.treasuries.get("Hatti").gold - gold), m.purse);
    Assert.contains("Sold 40 measures of grain at Hattusa for", notice(s, "Markets and caravans"));
  });

  test("Buying grain and feeding a town; only at one's own markets", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.stores.set("hattusa", 50);
    const m = s.markets.get("hattusa");
    const stock = m.stock;
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [feed("hattusa", 20), purchase("nesa", 5), sell("babylon", 5)] })]]));
    Assert.equal(stock + 20, m.stock);
    Assert.equal(30, s.stores.get("hattusa"));
    Assert.contains("Bought 5 measures of grain at Nesa", notice(s, "Markets and caravans"));
  });

  test("Troops are paid in gold, spend part of it at home, and eat from the stores where they stand", () => {
    const s = game();
    // Item 11a: free people at Hatti's court buy their living at its market too; here they carry nothing.
    for (const c of s.characters) c.purse = 0;
    const e = new TurnEngine(s);
    const u = single(s.units, (x) => x.province === "hattusa");
    const stores = s.stores.get("hattusa");
    const purse = s.markets.get("hattusa").purse;
    e.beginTurn();
    Assert.equal(0, u.unpaid);
    Assert.equal(0, u.hungry);
    // Within a few shekels: settled people moving between provinces take their share of the purse (item 10+a).
    Assert.inRange(s.markets.get("hattusa").purse, purse + Math.floor((s.config.armyUpkeep * EconomyData.spentPercent) / 100) - 10, purse + Math.floor((s.config.armyUpkeep * EconomyData.spentPercent) / 100) + 10);
    Assert.equal(s.config.armyUpkeep - Math.floor((s.config.armyUpkeep * EconomyData.spentPercent) / 100), u.savings);
    Assert.true(s.stores.get("hattusa") < stores + taxOf(harvestOf(Map.get("hattusa"))));
    Assert.equal(carriedOf("Army"), u.food);
  });

  test("Troops with nothing to eat go hungry and mutiny; their men carry their savings home", () => {
    const s = game();
    const e = new TurnEngine(s);
    const u = single(s.units, (x) => x.province === "hattusa");
    u.province = "sinai";
    s.owner.set("sinai", "Egypt");
    u.food = 0;
    u.savings = 30;
    const purse = s.markets.get("hattusa").purse;
    e.beginTurn();
    Assert.equal(1, u.hungry);
    s.turn++;
    e.beginTurn();
    Assert.false(s.units.includes(u));
    Assert.true(s.events.some((x) => x.signal === "mutiny"));
    Assert.contains("mutinied, hungry 2 seasons running", notice(s, "The treasury"));
    // Item 11b: the mutineers may follow one of their own as a band instead (bands.test.ts); then nobody walks home.
    if (s.bands.some((b) => b.rose === "mutiny")) {
      Assert.equal(0, s.walking.filter((w) => w.home === "hattusa").length);
      return;
    }
    // The men carry their savings home, and nothing reaches home before they do (Haakon, 28 October 2026).
    const walk = single(s.walking, (w) => w.home === "hattusa");
    Assert.true(walk.savings >= 30);
    while (s.walking.length > 0) {
      s.turn++;
      new TurnEngine(s).beginTurn();
    }
    Assert.true(s.markets.get("hattusa").purse >= purse + walk.savings - 5);
  });

  test("Troops unpaid for a few seasons mutiny", () => {
    const s = game();
    const e = new TurnEngine(s);
    const u = single(s.units, (x) => x.province === "hattusa");
    for (let i = 0; i < EconomyData.unpaidMutiny; i++) {
      s.treasuries.get("Hatti").gold = 0;
      e.beginTurn();
      s.turn++;
    }
    Assert.false(s.units.includes(u));
  });

  test("A caravan carries grain through its king's land to his troops and puts the rest in the stores", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.stores.set("hattusa", 100);
    const army = single(s.units, (x) => x.province === "nesa");
    army.food = 0;
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [caravan("hattusa", "nesa", 60)] })]]));
    Assert.single(s.caravans);
    Assert.equal(40, s.stores.get("hattusa"));
    s.turn++;
    e.beginTurn();
    Assert.empty(s.caravans);
    Assert.equal(carriedOf("Army"), army.food);
    Assert.contains("Your caravan reached Nesa", notice(s, "Markets and caravans"));
  });

  test("A besieged city that cannot feed its people starves until its gate is opened from within; walls are breached only after long wear", () => {
    const s = game();
    const e = new TurnEngine(s);
    // Hatti's army stands within the walls of Carchemish, a free city, its stores and market empty.
    const u = single(s.units, (x) => x.province === "hattusa");
    u.province = "carchemish";
    // It has starved as many seasons as it holds but one (item 17, "Hunger breaks loyalty").
    s.sieges.push(newSiege({ province: "carchemish", power: "Hatti", unitId: u.id, since: s.turn - 1, hungry: e.gateHolds("carchemish") - 1 }));
    s.stores.delete("carchemish");
    s.markets.get("carchemish").stock = 0;
    e.beginTurn();
    Assert.equal(["carchemish"], s.starving);
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [besiege("carchemish")] })]]));
    Assert.equal("Hatti", s.owner.get("carchemish"));
    Assert.true(s.events.some((x) => x.signal === "siege-starved"));
  });

  test("Strength is the wealth of the realm: land, treasury, purses, stores and markets, and what its men carry", () => {
    // The opening positions as a new game sets them, armies and all.
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const e = new TurnEngine(s);
    const o = openings(s.config).find((x) => x.power === "Hatti")!;
    Assert.equal(o.strength, e.strength("Hatti"));
    Assert.equal(o.strength, s.startStrength.get("Hatti"));
    // Gold moved from the treasury into a purse at home changes nothing.
    s.treasuries.get("Hatti").gold -= 50;
    s.markets.get("hattusa").purse += 50;
    Assert.equal(o.strength, e.strength("Hatti"));
    // A province is worth what it adds to its holder: its land, its purse, its stores and market.
    const before = e.strength("Hatti");
    const m = s.markets.get("isuwa");
    const price = provinceWorthOf(Map.get("isuwa"), s.config.provinceWeight, m.purse, s.stores.getOrDefault("isuwa", 0) + m.stock, harvestIn(Map, s, "isuwa", false));
    s.owner.set("isuwa", "Hatti");
    Assert.equal(before + price, e.strength("Hatti"));
    Assert.true(needOf(Map.get("babylon")) > needOf(Map.get("byblos")));
  });

  test("A move into the desert finds nothing to forage", () => {
    const s = game();
    const e = new TurnEngine(s);
    const u = single(s.units, (x) => x.province === "hattusa");
    u.province = "gaza";
    s.owner.set("gaza", "Hatti");
    s.walls.delete("gaza");
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [move("gaza", "sinai")] })]]));
    const army = unitAt(s, "sinai")!;
    army.food = 0;
    s.owner.set("sinai", "Egypt");
    s.turn++;
    e.beginTurn();
    Assert.equal(1, army.hungry);
  });
});
