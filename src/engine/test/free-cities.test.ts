import { describe, test } from "vitest";
import {
  Dict,
  EconomyData,
  type GameState,
  type Power,
  TurnEngine,
  type TurnSubmission,
  UnrestData,
  WorldMap,
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
  /** Hatti holds the Kaska lands, taken from the Kaska this season, with nobody's troops in or beside them. */
  function kaskaTaken(s: GameState): void {
    const near = new Set(["kaska", ...WorldMap.default.neighbors("kaska")]);
    removeAll(s.units, (u) => near.has(u.province) || u.power === "Hatti");
    s.owner.set("kaska", "Hatti");
    s.takenAt.set("kaska", s.turn);
  }
  const ledger = (s: GameState, prov: string): Dict<string, number> => {
    let b = s.ledger.tryGet(prov);
    if (b === undefined) s.ledger.set(prov, (b = new Dict()));
    return b;
  };

  test("Unrest follows the ledger: a hated holder's land is restless, his troops there calm it, and memory fades", () => {
    const s = quiet();
    kaskaTaken(s);
    const e = new TurnEngine(s);
    // The Kaska still love their own house, which has no troops near: no rival, but Hatti stands at nothing with them.
    e.obeySeason();
    const fresh = s.restless.getOrDefault("kaska", 0);
    Assert.true(fresh > 0, `a fresh conquest is restless: ${fresh}`);
    // Hatti's army in the Kaska lands calms them: its force is fear.
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "kaska", home: "hattusa", men: 3000 }));
    e.obeySeason();
    Assert.true(s.restless.getOrDefault("kaska", 0) < fresh);
    // What was taken fades: a tenth a season, at least a point.
    ledger(s, "kaska").set("Lukka", -100);
    e.obeySeason();
    Assert.equal(-90, ledger(s, "kaska").get("Lukka"));
  });

  test("A province below what its people accept, with nobody at its head, falls lawless; where troops stand it holds", () => {
    const s = quiet();
    kaskaTaken(s);
    ledger(s, "kaska").set("Hatti", UnrestData.floor - 50);
    new TurnEngine(s).obeySeason();
    Assert.equal(null, s.owner.getOrDefault("kaska", "x"));
    Assert.equal(1, signals(s, "revolt-lawless"));
    Assert.contains("has risen against you with nobody at its head", s.journeys.map((j) => j.text ?? "").join("\n") + inboxOf(s, "Hatti").map((i) => i.body).join("\n"));

    const t = quiet();
    kaskaTaken(t);
    ledger(t, "kaska").set("Hatti", UnrestData.floor - 50);
    t.units.push(newUnit({ id: newId(t, "u"), power: "Hatti", kind: "Army", province: "kaska", home: "hattusa", men: 20 }));
    new TurnEngine(t).obeySeason();
    Assert.equal("Hatti", t.owner.get("kaska"));
  });

  test("A rising behind a man its people love: put down by troops that weigh as much, overwhelming a handful", () => {
    const rising = (men: number, hatti: number, his: number): [GameState, string] => {
      const s = quiet();
      kaskaTaken(s);
      // A Kaska chief of standing, free at the Kaska's court in their own land.
      const c = newCharacter({
        id: newId(s, "c"),
        name: "Pihhuniya",
        traits: newTraits({ loyalty: 20, greed: 50, ambition: 80, courage: 60, competence: 50 }),
        status: "Free",
        at: "Kaska",
      });
      s.characters.push(c);
      ledger(s, "kaska").set("Hatti", hatti);
      ledger(s, "kaska").set(c.id, his);
      s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "kaska", home: "hattusa", men }));
      return [s, c.id];
    };
    // Seven men among thousands who lean away: overwhelmed, and the man they love rules.
    const [s, id] = rising(7, 0, 120);
    new TurnEngine(s).obeySeason();
    Assert.equal(id, risenOf(s.owner.get("kaska")!)?.ruler);
    Assert.false(s.units.some((u) => u.power === "Hatti"));
    // An army that weighs as much as his following puts the rising down: some die, and he is followed by half as many.
    const [t, id2] = rising(3000, -50, 220);
    const settled = t.people.get("kaska").settled;
    new TurnEngine(t).obeySeason();
    Assert.equal("Hatti", t.owner.get("kaska"));
    Assert.equal(1, signals(t, "revolt-crushed"));
    Assert.true(t.people.get("kaska").settled < settled);
    Assert.true(ledger(t, "kaska").get(id2) < 100);
  });

  test("A disloyal, ambitious governor whose people love him leads his province's revolt and rules it with the levies he raised there", () => {
    const s = quiet();
    kaskaTaken(s);
    const c = newCharacter({ id: newId(s, "c"), name: "Pazzu", traits: newTraits({ loyalty: 20, greed: 50, ambition: 80, courage: 60, competence: 50 }), status: "Employed", employer: "Hatti", duty: "Governing", watchProvince: "kaska", purse: 400 });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "kaska", character: c.id, power: "Hatti", from: 0 }));
    const levy = newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "kaska", home: "kaska", men: 800 });
    s.units.push(levy);
    ledger(s, "kaska").set(c.id, 150);
    new TurnEngine(s).obeySeason();
    const p = s.owner.get("kaska")!;
    Assert.equal("revolt", risenOf(p)?.how);
    Assert.equal(c.id, risenOf(p)?.ruler);
    Assert.equal(p, unitAt(s, "kaska")?.power);
    Assert.equal("Ruling", c.duty);
    // His people's regard is his realm's now.
    Assert.true(ledger(s, "kaska").get(p) > 100);
    Assert.false(ledger(s, "kaska").has(c.id));
  });

  test("A governor who refuses his recall rules his province in his own name", () => {
    const s = quiet();
    removeAll(s.units, (u) => u.province === "tuwanuwa");
    removeAll(s.governors, (g) => g.province === "tuwanuwa");
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
      e.obeySeason();
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
      f.obeySeason();
    }
    const p = t.owner.getOrDefault("kaska", null);
    Assert.true(p !== null && risenOf(p)?.how === "chief", `the chief rules: ${p}`);
    Assert.equal(0, t.bands.length);
    Assert.equal(p, unitAt(t, "kaska")?.power);
  });

  test("A starving city's gate opens from within after a season or more, later where its ruler is there", () => {
    const s = walled(quiet(), "tuwanuwa", 3);
    removeAll(s.units, (u) => u.province === "tuwanuwa");
    // No governor there (item 17++ gives Tuwanuwa a lord of the watchtower from the start).
    removeAll(s.governors, (g) => g.province === "tuwanuwa");
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
    s.restless.clear();
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
    Assert.true((taking.ledger.get("sapinuwa").tryGet("Hatti") ?? 0) < (buying.ledger.get("sapinuwa").tryGet("Hatti") ?? 0));
    Assert.contains(
      "complain that your own troops took",
      taking.journeys.map((j) => j.text ?? "").join("\n") +
        inboxOf(taking, "Hatti")
          .map((i) => i.body)
          .join("\n"),
    );
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

  test("A spy with gold stirs the people of the province he watches: they remember it as his master's giving", () => {
    const s = quiet();
    kaskaTaken(s);
    const spy = newCharacter({ id: newId(s, "c"), name: "Zida", traits: newTraits({ loyalty: 80, greed: 20 }), status: "Employed", employer: "Arzawa", duty: "None", at: "Arzawa" });
    s.characters.push(spy);
    season(s, new Dict([["Arzawa", newTurnSubmission({ orders: [placeSpy(spy.id, null, "kaska", 200)] })]]));
    Assert.equal(200, spy.stirGold);
    const given = (): number => s.ledger.tryGet("kaska")?.getOrDefault("Arzawa", 0) ?? 0;
    for (let i = 0; i < 6 && given() === 0; i++) season(s);
    Assert.true(given() > 0 && spy.stirGold < 200, `given ${given()}`);
  });
});
