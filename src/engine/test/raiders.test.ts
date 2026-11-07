import { describe, test } from "vitest";
import { BandData, Doors, RaiderData, TurnEngine, WorldMap, first, newBand, newCharacter, newChiefChoice, newGame, newId, newTraits, newUnit, enlist, payOff, policedShare, type GameState } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// Build order item 17++++a, "Raiders from beyond the map": crews and bands from beyond the map's edge come through its
// doors as often as the season, the sea and the policing of the coast allow, act as every band, and go home.
const Map = WorldMap.default;
const westsea = first(Doors, (d) => d.id === "westsea");
const east = first(Doors, (d) => d.id === "east");
// Turns by season: 1 and 4 are the flood (Akhet, winter next), 2 the winter (Peret), 3 the summer (Shemu).
const Summer = 3;
const Winter = 2;
const Flood = 4;

/** Egypt alone on the map, with nothing of its own standing in the Delta, a western-sea door. */
function delta(turn: number): GameState {
  const s = smallWorld(newGame(1), "Egypt");
  s.units = s.units.filter((u) => u.province !== "delta" && u.province !== Map.get("delta").waters);
  s.turn = turn;
  return s;
}

/** A raider crew of `men` from the western isles in `province`, its chief with `purse` shekels. */
function crew(s: GameState, province: string, men: number, purse = 0, ship = true): ReturnType<typeof newBand> {
  const e = new TurnEngine(s);
  const chief = newCharacter({ id: newId(s, "c"), name: "Sherdanu", origin: "the western isles", calling: "raider", traits: newTraits({ greed: 50, courage: 80 }), status: "Free" });
  chief.purse = purse;
  s.characters.push(chief);
  const b = newBand({ id: newId(s, "b"), leaderId: chief.id, province, men, ship, since: s.turn, rose: "raider", from: "the western isles" });
  e.lead(chief, b);
  s.bands.push(b);
  return b;
}

describe("RaiderTests", () => {
  test("Raiders sail only in the sailing season, and come less to a coast its king polices or patrols", () => {
    const summer = new TurnEngine(delta(Summer)).raidChance(westsea, "delta");
    Assert.equal((((RaiderData.most * westsea.raids) / 100) * policedShare(delta(Summer), "delta")) / 100, summer);
    Assert.equal(0, new TurnEngine(delta(Winter)).raidChance(westsea, "delta"));
    // Over land they come in winter too, less often (Susa unheld in a world of Egypt alone).
    Assert.equal((((RaiderData.most * east.raids) / 100) * RaiderData.winterLand) / 100, new TurnEngine(delta(Winter)).raidChance(east, "susa"));
    const troops = delta(Summer);
    troops.units.push(newUnit({ id: newId(troops, "u"), power: "Egypt", kind: "Army", province: "delta", men: 500 }));
    Assert.true(new TurnEngine(troops).raidChance(westsea, "delta") < summer);
    const fleet = delta(Summer);
    fleet.units.push(newUnit({ id: newId(fleet, "u"), power: "Egypt", kind: "Fleet", province: Map.get("delta").waters!, men: 300 }));
    Assert.equal((summer * RaiderData.fleetPercent) / 100, new TurnEngine(fleet).raidChance(westsea, "delta"));
  });

  test("Raiders come through a door as a band from beyond the map, with ships, told to the coast's king", () => {
    const s = delta(Summer);
    let found = false;
    for (let i = 0; i < 90 && !found; i++) {
      s.turn = Summer + 3 * i;
      new TurnEngine(s).raidersCome();
      found = s.bands.some((b) => b.from !== "");
    }
    Assert.true(found);
    const b = first(s.bands, (x) => x.from !== "");
    const door = first(Doors, (d) => d.beyond.some((x) => x.land === b.from));
    Assert.true(door.provinces.includes(b.province));
    const chief = first(s.characters, (c) => c.id === b.leaderId);
    Assert.equal("Leading", chief.duty);
    Assert.equal(b.from, chief.origin);
    Assert.contains(chief.facts, (f) => f.tag === "origin" && f.secrecy === "Public");
    if (door.bySea) Assert.true(b.ship && b.men % BandData.shipMen === 0);
  });

  test("A raider crew robs, carries off people, and sails home with them and its spoils before the winter", () => {
    const s = delta(Flood);
    const b = crew(s, "delta", 120);
    const chief = first(s.characters, (c) => c.id === b.leaderId);
    const e = new TurnEngine(s);
    e.market("delta").purse = 5000;
    const settled = e.peopleOf("delta").settled;
    e.bandsSeason();
    Assert.false(s.bands.includes(b));
    Assert.equal("Abroad", chief.duty);
    Assert.null(chief.watchProvince);
    Assert.true(chief.earned.loot > 0);
    // The people it carried off went with it.
    Assert.true(e.peopleOf("delta").settled < settled);
  });

  test("A raider band whose chief is lost melts into the land, and its captives go free", () => {
    const s = delta(Summer);
    const b = crew(s, "delta", 5);
    b.captives = 40;
    const e = new TurnEngine(s);
    const loose = e.peopleOf("delta").loose;
    e.leaderLost(b, "he is dead");
    Assert.equal(loose + 45, e.peopleOf("delta").loose);
  });

  test("A band over land heads for its door to go home, and keeps within reach of it", () => {
    const s = smallWorld(newGame(1), "Babylonia");
    s.turn = Summer;
    const e = new TurnEngine(s);
    const chief = newCharacter({ id: newId(s, "c"), name: "Tarlugal", origin: "the Zagros", calling: "raider", status: "Free" });
    s.characters.push(chief);
    const away = first(Map.movesFrom("Army", "susa"), (n) => !Map.get(n).isSea);
    const b = newBand({ id: newId(s, "b"), leaderId: chief.id, province: away, men: 80, since: s.turn - RaiderData.stay, from: "the Zagros" });
    e.lead(chief, b);
    s.bands.push(b);
    Assert.false(e.canGoHome(b));
    Assert.true(e.raiderChooses(b, chief));
    Assert.equal("susa", b.province);
    Assert.true(e.canGoHome(b));
    const far = first(Map.landProvinces, (p) => Map.hops(p.id, "susa") > RaiderData.reach).id;
    Assert.false(e.bandMayGo(b, far));
  });

  test("A king pays raiders off: the chief takes a fee that pays what he gives up and goes home; too little, he refuses", () => {
    const s = delta(Summer);
    const b = crew(s, "delta", 60);
    const chief = first(s.characters, (c) => c.id === b.leaderId);
    const e = new TurnEngine(s);
    const gold = s.treasuries.get("Egypt").gold;
    // With no army of Egypt's there to carry it, the offer goes nowhere.
    e.payOffBand("Egypt", payOff("delta", 200, 1));
    Assert.true(s.bands.includes(b));
    Assert.equal(gold, s.treasuries.get("Egypt").gold);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: "delta", men: 500, commander: "a commander", commandFrom: 0 }));
    e.payOffBand("Egypt", payOff("delta", 1, 1));
    Assert.true(s.bands.includes(b));
    Assert.equal(gold, s.treasuries.get("Egypt").gold);
    e.payOffBand("Egypt", payOff("delta", 200, 1));
    Assert.false(s.bands.includes(b));
    Assert.equal("Abroad", chief.duty);
    Assert.equal(gold - 200, s.treasuries.get("Egypt").gold);
  });

  test("A band of the land paid off leaves the payer's land and a script chief keeps out of it for the term", () => {
    const s = smallWorld(newGame(1), "Egypt");
    const prov = first(Map.landProvinces, (p) => s.owner.getOrDefault(p.id, null) === "Egypt" && Map.movesFrom("Army", p.id).some((n) => !Map.get(n).isSea && s.owner.getOrDefault(n, null) !== "Egypt")).id;
    const e = new TurnEngine(s);
    const chief = newCharacter({ id: newId(s, "c"), name: "Chief", traits: newTraits({ greed: 0 }), status: "Free" });
    s.characters.push(chief);
    const b = newBand({ id: newId(s, "b"), leaderId: chief.id, province: prov, men: 50 });
    e.lead(chief, b);
    s.bands.push(b);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: prov, men: 500, commander: "a commander", commandFrom: 0 }));
    e.payOffBand("Egypt", payOff(prov, 100, 3));
    Assert.true(s.owner.getOrDefault(b.province, null) !== "Egypt");
    Assert.equal(s.turn + 3, chief.paidOffUntil);
    Assert.false(e.bandMayGo(b, prov));
  });

  test("A paid chief who keeps his word spares the payer's land; a greedy one need not keep out of it", () => {
    const s = smallWorld(newGame(1), "Egypt");
    const prov = first(Map.landProvinces, (p) => s.owner.getOrDefault(p.id, null) === "Egypt" && !s.units.some((u) => u.province === p.id)).id;
    const e = new TurnEngine(s);
    const loyal = newCharacter({ id: newId(s, "c"), name: "Loyal", traits: newTraits({ loyalty: 80, greed: 20 }), status: "Free", paidOffBy: "Egypt", paidOffUntil: s.turn + 5 });
    s.characters.push(loyal);
    const b = newBand({ id: newId(s, "b"), leaderId: loyal.id, province: prov, men: 80 });
    e.lead(loyal, b);
    s.bands.push(b);
    e.market(prov).purse = 5000;
    const purse = e.market(prov).purse;
    Assert.true(e.keepsWord(b));
    Assert.false(e.bandMayGo(b, prov));
    // Nor does it rob travellers on that king's roads.
    Assert.empty(e.robbersAt(prov));
    s.turn++;
    e.bandsSeason();
    Assert.equal(0, loyal.earned.loot);
    Assert.true(e.market(prov).purse >= purse);
    const greedy = newCharacter({ id: newId(s, "c"), name: "Greedy", traits: newTraits({ loyalty: 10, greed: 90 }), status: "Free", paidOffBy: "Egypt", paidOffUntil: s.turn + 5 });
    s.characters.push(greedy);
    const g = newBand({ id: newId(s, "b"), leaderId: greedy.id, province: prov, men: 80 });
    Assert.false(e.keepsWord(g));
    Assert.true(e.bandMayGo(g, prov));
  });

  test("A raider band enlisted lets its captives go: an army keeps none", () => {
    const s = delta(Summer);
    const b = crew(s, "delta", 60);
    b.captives = 25;
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: "delta", men: 500 }));
    const e = new TurnEngine(s);
    const loose = e.peopleOf("delta").loose;
    e.enlistBand("Egypt", enlist("delta", 500, 1));
    Assert.false(s.bands.includes(b));
    Assert.equal(loose + 25, e.peopleOf("delta").loose);
  });

  test("A model raider chief who chooses to go home does", () => {
    const s = delta(Summer);
    const b = crew(s, "delta", 60);
    const chief = first(s.characters, (c) => c.id === b.leaderId);
    const e = new TurnEngine(s);
    Assert.true(e.chiefView(chief, b).canGoHome);
    chief.chiefPlan = newChiefChoice({ turn: s.turn - 1, home: true });
    Assert.true(e.chiefDecides(b, chief) === "gone");
    Assert.equal("Abroad", chief.duty);
  });
});
