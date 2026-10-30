import { describe, test } from "vitest";
import {
  Dict,
  EconomyData,
  type GameState,
  type Power,
  TurnEngine,
  type TurnSubmission,
  UnrestData,
  inboxOf,
  newBand,
  newCharacter,
  newGame,
  newGameConfig,
  newGovernor,
  newId,
  newSiege,
  newTraits,
  newTurnSubmission,
  newUnit,
  placeSpy,
  risenOf,
  setLevel,
  supply,
  unitAt,
  unseat,
} from "@amarna/engine";
import { Assert, removeAll, walled } from "./support.ts";

// Build order item 17, "How cities become free": unrest from conditions, revolts and who leads them, rulers rising in land
// without one, the gate opened from within, armies buying or taking their food, and outside help.
describe("FreeCitiesTests", () => {
  const quiet = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 }));
  const signals = (s: GameState, sig: string): number => s.events.filter((e) => e.signal === sig).length;
  function season(s: GameState, orders: Dict<Power, TurnSubmission> = new Dict()): void {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
  }
  /** Hatti holds the Kaska lands, taken from the Kaska this season, with nobody of Hatti's in or beside them. */
  function kaskaTaken(s: GameState): void {
    removeAll(s.units, (u) => u.province === "kaska" || u.power === "Hatti");
    s.owner.set("kaska", "Hatti");
    s.takenAt.set("kaska", s.turn);
    s.takenFrom.set("kaska", "Kaska");
  }

  test("Unrest follows conditions: a new conquest is restless, the homeland far less so, and troops calm it", () => {
    const s = quiet();
    kaskaTaken(s);
    const e = new TurnEngine(s);
    const fresh = e.unrestOf("kaska");
    // How new the conquest is and a cause to rally to (the Kaska's king, wherever he holds out, still stands).
    Assert.true(fresh >= UnrestData.fresh + UnrestData.cause - UnrestData.harvest, `fresh conquest: ${fresh}`);
    // A season older, a little calmer.
    s.turn += 2;
    Assert.true(e.unrestOf("kaska") < fresh);
    // The same hardship that takes the new conquest past its limit leaves a home province far below its own.
    s.unrest.set("tuwanuwa", 120);
    s.unrest.set("kaska", 120);
    Assert.true(e.unrestOf("kaska") >= e.revoltAt("kaska"));
    Assert.true(e.unrestOf("tuwanuwa") > 0 && e.unrestOf("tuwanuwa") * 2 < e.revoltAt("tuwanuwa"));
    s.unrest.delete("kaska");
    Assert.equal(UnrestData.homeThreshold, e.revoltAt("tuwanuwa"));
    Assert.equal(UnrestData.threshold, e.revoltAt("kaska"));
    // Hatti's army in the Kaska lands calms them.
    const before = e.unrestOf("kaska");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "kaska", home: "hattusa", men: 3000 }));
    Assert.equal(before - UnrestData.troops, e.unrestOf("kaska"));
  });

  test("A province past its limit with nobody at its head falls lawless; where troops stand, the rising is put down", () => {
    const s = quiet();
    kaskaTaken(s);
    s.unrest.set("kaska", 200);
    new TurnEngine(s).unrestSeason();
    Assert.equal(null, s.owner.getOrDefault("kaska", "x"));
    Assert.equal(1, signals(s, "revolt-lawless"));
    Assert.contains("has risen against you with nobody at its head", s.journeys.map((j) => j.text ?? "").join("\n") + inboxOf(s, "Hatti").map((i) => i.body).join("\n"));

    const t = quiet();
    kaskaTaken(t);
    t.unrest.set("kaska", 400);
    t.units.push(newUnit({ id: newId(t, "u"), power: "Hatti", kind: "Army", province: "kaska", home: "hattusa", men: 3000 }));
    const settled = t.people.get("kaska").settled;
    new TurnEngine(t).unrestSeason();
    Assert.equal("Hatti", t.owner.get("kaska"));
    Assert.equal(1, signals(t, "revolt-crushed"));
    Assert.true(t.people.get("kaska").settled < settled);
  });

  test("A disloyal, ambitious governor leads his province's revolt and rules it with the levies he raised there", () => {
    const s = quiet();
    kaskaTaken(s);
    const c = newCharacter({ id: newId(s, "c"), name: "Pazzu", traits: newTraits({ loyalty: 20, greed: 50, ambition: 80, courage: 60, competence: 50 }), status: "Employed", employer: "Hatti", duty: "Governing", watchProvince: "kaska", purse: 400 });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "kaska", character: c.id, power: "Hatti", from: 0 }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "kaska", home: "kaska", men: 800 }));
    s.unrest.set("kaska", 150);
    new TurnEngine(s).unrestSeason();
    const p = s.owner.get("kaska")!;
    Assert.equal("revolt", risenOf(p)?.how);
    Assert.equal(c.id, risenOf(p)?.ruler);
    Assert.equal(p, unitAt(s, "kaska")?.power);
    Assert.equal("Ruling", c.duty);
  });

  test("A governor who refuses his recall rules his province in his own name", () => {
    const s = quiet();
    removeAll(s.units, (u) => u.province === "tuwanuwa");
    const c = newCharacter({ id: newId(s, "c"), name: "Hutupiyanza", traits: newTraits({ loyalty: 10, greed: 50, ambition: 90, courage: 60, competence: 50 }), status: "Employed", employer: "Hatti", duty: "Governing", watchProvince: "tuwanuwa", purse: 300 });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "tuwanuwa", character: c.id, power: "Hatti", from: 0 }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "tuwanuwa", home: "tuwanuwa", men: 1000 }));
    season(s, new Dict([["Hatti", newTurnSubmission({ orders: [unseat("tuwanuwa")] })]]));
    season(s);
    season(s);
    const p = s.owner.get("tuwanuwa")!;
    Assert.equal("turned", risenOf(p)?.how);
    Assert.equal(p, unitAt(s, "tuwanuwa")?.power);
  });

  test("A walled town without a ruler raises an elder; a chief who holds thin land long enough comes to rule it", () => {
    const s = quiet();
    kaskaTaken(s);
    s.owner.set("kaska", null);
    setLevel(s, "Walls", "kaska", 3);
    const e = new TurnEngine(s);
    for (let i = 0; i < 12 && s.owner.getOrDefault("kaska", null) === null; i++) {
      s.turn++;
      e.unrestSeason();
    }
    const elder = s.owner.getOrDefault("kaska", null);
    Assert.true(elder !== null && risenOf(elder)?.how === "elder", `an elder rose: ${elder}`);

    const t = quiet();
    kaskaTaken(t);
    t.owner.set("kaska", null);
    setLevel(t, "Walls", "kaska", 0);
    const chief = newCharacter({ id: newId(t, "c"), name: "Pihhuniya", traits: newTraits({ loyalty: 30, greed: 50, ambition: 80, courage: 70, competence: 50 }), status: "Free", duty: "Leading", watchProvince: "kaska" });
    t.characters.push(chief);
    t.bands.push(newBand({ id: newId(t, "b"), leaderId: chief.id, province: "kaska", men: t.people.get("kaska").men, rose: "commander" }));
    const f = new TurnEngine(t);
    for (let i = 0; i < UnrestData.captainHold; i++) {
      t.turn++;
      f.unrestSeason();
    }
    const p = t.owner.getOrDefault("kaska", null);
    Assert.true(p !== null && risenOf(p)?.how === "chief", `the chief rules: ${p}`);
    Assert.equal(0, t.bands.length);
    Assert.equal(p, unitAt(t, "kaska")?.power);
  });

  test("A starving city's gate opens from within after a season or more, later where its ruler is there", () => {
    const s = walled(quiet(), "tuwanuwa", 3);
    removeAll(s.units, (u) => u.province === "tuwanuwa");
    const army = newUnit({ id: newId(s, "u"), power: "Arzawa", kind: "Army", province: "tuwanuwa", men: 3000, food: 100 });
    s.units.push(army);
    s.sieges.push(newSiege({ province: "tuwanuwa", power: "Arzawa", unitId: army.id, since: 1 }));
    s.stores.set("tuwanuwa", 0);
    s.markets.get("tuwanuwa").stock = 0;
    const e = new TurnEngine(s);
    const holds = e.gateHolds("tuwanuwa");
    Assert.true(holds >= UnrestData.gate);
    let seasons = 0;
    while (s.owner.get("tuwanuwa") === "Hatti" && seasons < 6) {
      season(s);
      seasons++;
    }
    Assert.equal("Arzawa", s.owner.get("tuwanuwa"));
    Assert.true(seasons >= holds, `held ${seasons} seasons`);
    Assert.equal(1, signals(s, "siege-starved"));
    // Its ruler's court there: one season longer.
    s.court.set("Hatti", "tuwanuwa");
    s.owner.set("tuwanuwa", "Hatti");
    Assert.equal(holds + 1, new TurnEngine(s).gateHolds("tuwanuwa"));
    Assert.true(EconomyData.breachPerLevel > 0);
  });

  test("An army told to buy pays the market with the gold sent; one that takes leaves the people restless", () => {
    const buying = quiet();
    const taking = quiet();
    for (const s of [buying, taking]) {
      removeAll(s.units, (u) => u.province === "sapinuwa");
      s.stores.set("sapinuwa", 0);
      s.taxes.set("sapinuwa", 0);
      s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "sapinuwa", home: "sapinuwa", men: 5000 }));
    }
    season(buying, new Dict([["Hatti", newTurnSubmission({ orders: [supply("sapinuwa", true, 200)] })]]));
    season(taking, new Dict([["Hatti", newTurnSubmission({ orders: [supply("sapinuwa", false)] })]]));
    // Grain at the market there to buy, after the town has eaten.
    for (const s of [buying, taking]) s.markets.get("sapinuwa").stock = 300;
    season(buying);
    season(taking);
    const u = unitAt(buying, "sapinuwa")!;
    Assert.true(u.buy && u.chest < 200 && u.chest > 0, `bought from its chest: ${u.chest}`);
    Assert.true(signals(buying, "supply-buy") > 0);
    // The first season, before the word arrived, both took.
    Assert.true(signals(taking, "supply-take") > signals(buying, "supply-take"));
    Assert.true(taking.unrest.getOrDefault("sapinuwa", 0) > buying.unrest.getOrDefault("sapinuwa", 0));
    Assert.contains("complain that your own troops took", taking.journeys.map((j) => j.text ?? "").join("\n") + inboxOf(taking, "Hatti").map((i) => i.body).join("\n"));
  });

  test("A greedy, disloyal commander keeps the gold sent for his army's food, and takes instead", () => {
    const s = quiet();
    removeAll(s.units, (u) => u.province === "sapinuwa");
    s.stores.set("sapinuwa", 0);
    s.taxes.set("sapinuwa", 0);
    const c = newCharacter({ id: newId(s, "c"), name: "Kantuzzili", traits: newTraits({ loyalty: 10, greed: 90, ambition: 50, courage: 50, competence: 50 }), status: "Employed", employer: "Hatti", duty: "Commanding", purse: 0 });
    s.characters.push(c);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "sapinuwa", home: "sapinuwa", men: 5000, commander: c.id, commandFrom: 0, buy: true, chest: 150, savings: 150 }));
    season(s);
    Assert.equal(150, c.purse);
    Assert.equal(0, unitAt(s, "sapinuwa")!.chest);
    Assert.equal(1, signals(s, "supply-kept"));
    Assert.true(signals(s, "supply-take") > 0);
  });

  test("A spy with gold stirs the people of the province he watches", () => {
    const s = quiet();
    kaskaTaken(s);
    const spy = newCharacter({ id: newId(s, "c"), name: "Zida", traits: newTraits({ loyalty: 80, greed: 20 }), status: "Employed", employer: "Arzawa", duty: "None", at: "Arzawa" });
    s.characters.push(spy);
    season(s, new Dict([["Arzawa", newTurnSubmission({ orders: [placeSpy(spy.id, null, "kaska", 200)] })]]));
    Assert.equal(200, spy.stirGold);
    for (let i = 0; i < 6 && s.stirred.getOrDefault("kaska", 0) === 0; i++) season(s);
    Assert.true(s.stirred.getOrDefault("kaska", 0) > 0 && spy.stirGold < 200, `stirred ${s.stirred.getOrDefault("kaska", 0)}`);
  });
});
