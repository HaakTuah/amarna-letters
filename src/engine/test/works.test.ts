import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  OrderValidator,
  type Power,
  TurnEngine,
  WorldMap,
  build,
  drinkingSeasons,
  first,
  inboxOf,
  legPoints,
  levelOf,
  newCharacter,
  newDispatch,
  newGame,
  newGameConfig,
  newId,
  newJourney,
  newSiege,
  newTurnSubmission,
  newUnit,
  newWorkPlan,
  newGrant,
  hostileAt,
  policeAt,
  planOf,
  policedShare,
  raze,
  setLevel,
  smuggleOdds,
  waterSeasons,
  waysOf,
  WinterSeason,
  wallsOf,
  type Ways,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// Item 15, "One rule for everything built": walls, roads, relay stations, harbours, policing and water works are levels
// with upkeep, decay and projects, paid in gold or by corvée; roads and stations are the pace rule's roads term; police
// hold the loose and the bands down and find smugglers. The engine's season steps are called directly, on a new game,
// so each test plays no more of a season than its rule needs ("the smallest game that tests the rule").
describe("WorksTests", () => {
  const game = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0 }));
  const gold = (s: GameState, p: Power): number => s.treasuries.get(p).gold;

  test("What stands at the start comes from the dossiers, the capitals' walls included", () => {
    const s = game();
    Assert.equal([0, 3, 3, 3, 2, 1, 1], ["akhetaten", "hattusa", "qatna", "qadesh", "nubia", "delta", "memphis"].map((x) => wallsOf(s, x)));
    Assert.equal([2, 2, 2, 1, 0], ["delta", "sinai", "gaza", "hattusa", "kaska"].map((x) => levelOf(s, "Roads", x)));
    Assert.equal([1, 1, 1, 0], ["delta", "sinai", "gaza", "memphis"].map((x) => levelOf(s, "Stations", x)));
    Assert.equal([3, 2, 1, 0], ["ugarit", "sidon", "seha", "hattusa"].map((x) => levelOf(s, "Harbour", x)));
    Assert.equal([5, 2, 0], ["shechem", "hattusa", "kaska"].map((x) => levelOf(s, "Policing", x)));
    // Each holder's standing order keeps what stands by corvée: his own, which he may change.
    Assert.equal({ keep: 3, labour: true }, (({ keep, labour }) => ({ keep, labour }))(planOf(s, "Walls", "hattusa")!));
  });

  test("What stands is kept by corvée by the standing order each king starts with, and its men are away from the fields", () => {
    const s = game();
    const e = new TurnEngine(s);
    const before = gold(s, "Hatti");
    e.worksSeason();
    // Hattusa: walls 3 (100 men a level), a road 1 (100) and 20 police (10 a level, the police themselves).
    Assert.equal(3 * 100 + 100 + 2 * 10, s.corvee.getOrDefault("hattusa", 0));
    Assert.equal(before, gold(s, "Hatti"));
    Assert.equal(3, wallsOf(s, "hattusa"));
  });

  test("A project raises a level over its seasons, paid each season, and then costs its upkeep", () => {
    const s = game();
    const e = new TurnEngine(s);
    e.setWorks("Egypt", build("thebes", "Walls", 1));
    const start = gold(s, "Egypt");
    e.worksSeason();
    Assert.equal(0, wallsOf(s, "thebes"));
    Assert.equal(1, planOf(s, "Walls", "thebes")!.progress);
    Assert.contains("the walls of Waset: 1 of 2 seasons done towards level 1", first(inboxOf(s, "Egypt"), (i) => i.title === "Works").body);
    e.worksSeason();
    Assert.equal(1, wallsOf(s, "thebes"));
    Assert.contains(s.events, (x) => x.signal === "built" && x.text === "Egypt raised the walls of Waset to level 1.");
    // Two seasons of 25 a season for the first level; the level then costs its upkeep in gold, a shekel a season.
    Assert.equal(start - 50, gold(s, "Egypt"));
    e.worksSeason();
    Assert.equal(start - 51, gold(s, "Egypt"));
  });

  test("A build order is refused beyond its kind's top, on land not held, where the land forbids it, and twice", () => {
    const s = game();
    const v = new OrderValidator(s).validate(
      "Egypt",
      newTurnSubmission({
        orders: [build("akhetaten", "Walls", 4), build("hattusa", "Roads", 2), build("memphis", "Harbour", 1), build("thebes", "Water", 1), build("delta", "Stations", 2), build("delta", "Stations", 2, true), build("sinai", "Policing", 10, true)],
      }),
    );
    Assert.equal(
      ["the walls go from 0 to level 3", "you do not hold Hattusa", "Men-nefer has no coast to build a harbour on", "Waset drinks from water that never fails", "you had already given an order for the relay stations of Ta-Mehu this season"],
      v.rejected.map((r) => r.reason),
    );
    Assert.equal([build("delta", "Stations", 2), build("sinai", "Policing", 10, true)], v.accepted);
  });

  test("Unpaid, a road falls a level after its kind's seasons and police are gone at once", () => {
    const s = game();
    const e = new TurnEngine(s);
    e.setWorks("Egypt", build("thebes", "Roads", 1));
    e.setWorks("Egypt", build("thebes", "Policing", 2));
    s.treasuries.get("Egypt").gold = 0;
    e.worksSeason();
    Assert.equal(0, levelOf(s, "Policing", "thebes"));
    Assert.equal(1, levelOf(s, "Roads", "thebes"));
    for (let i = 1; i < 6; i++) e.worksSeason();
    Assert.equal(0, levelOf(s, "Roads", "thebes"));
    Assert.contains("the roads of Waset, unkept, fell to level 0", first(inboxOf(s, "Egypt"), (i) => i.title === "Works" && i.body.includes("roads of Waset, unkept, fell to")).body);
  });

  test("War stops a project, and a province that changes hands takes what stands with it, unkept until its new holder orders", () => {
    const s = game();
    const e = new TurnEngine(s);
    e.setWorks("Egypt", build("thebes", "Roads", 2));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "thebes" }));
    e.worksSeason();
    Assert.equal(0, planOf(s, "Roads", "thebes")!.progress);
    Assert.contains("no work was done on the roads of Waset: war stops the work", first(inboxOf(s, "Egypt"), (i) => i.title === "Works").body);
    e.setOwner("thebes", "Hatti");
    Assert.equal(null, planOf(s, "Roads", "thebes"));
    Assert.equal(1, levelOf(s, "Roads", "thebes"));
    // Unkept, the road falls after its seasons and is never raised again unasked.
    s.units = s.units.filter((u) => u.province !== "thebes");
    for (let i = 0; i < 8; i++) e.worksSeason();
    Assert.equal(0, levelOf(s, "Roads", "thebes"));
    Assert.true(planOf(s, "Roads", "thebes") === null || planOf(s, "Roads", "thebes")!.keep === 0);
  });

  test("An ally's troops standing by passage or basing are no enemy: police and upkeep go on", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "gaza" }));
    Assert.equal(true, hostileAt(s, "gaza", "Egypt"));
    s.grants.push(newGrant({ id: "g1", kind: "basing", grantor: "Egypt", grantee: "Mitanni", province: "gaza", sinceTurn: 1 }));
    Assert.equal(false, hostileAt(s, "gaza", "Egypt"));
    Assert.true(policeAt(s, "gaza") > 0);
    e.worksSeason();
    Assert.equal(5, levelOf(s, "Policing", "gaza"));
  });

  test("Walls ordered kept under siege are repaired a step a season with the men and food inside", () => {
    const s = game();
    const e = new TurnEngine(s);
    const u = newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "memphis" });
    s.units.push(u);
    s.sieges.push(newSiege({ province: "memphis", power: "Hatti", unitId: u.id, progress: 2, since: 1 }));
    s.stores.set("memphis", 100);
    // Kept by the standing order from before the siege, nothing is repaired: a repair is an order given during it.
    e.worksSeason();
    Assert.equal(2, s.sieges[0].progress);
    s.turn = 2;
    e.setWorks("Egypt", build("memphis", "Walls", 1, true));
    e.worksSeason();
    Assert.equal(1, s.sieges[0].progress);
    Assert.equal(80, s.stores.get("memphis"));
    Assert.contains(s.events, (x) => x.signal === "wall-repair");
    // The order stands while the siege lasts.
    e.worksSeason();
    Assert.equal(0, s.sieges[0].progress);
  });

  test("Roads speed everyone on the road, relay stations a lone traveller only, and neither one off the road", () => {
    const map = WorldMap.default;
    const ways = (road: number, st: number): Ways => ({ road: () => road, stations: () => st });
    const pts = (w: Ways, extra: object = {}): number => legPoints(map, "hattusa", "sapinuwa", 0, { sneaking: false, ways: w, ...extra });
    Assert.equal(legPoints(map, "hattusa", "sapinuwa", 0), pts(ways(1, 0)));
    Assert.true(pts(ways(3, 0)) < pts(ways(1, 0)));
    Assert.true(pts(ways(0, 0)) > pts(ways(1, 0)));
    Assert.true(pts(ways(1, 2)) < pts(ways(1, 0)));
    // A caravan or an army gets the road, not the stations.
    Assert.equal(pts(ways(1, 0), { size: 100 }), pts(ways(1, 2), { size: 100 }));
    Assert.true(pts(ways(3, 2), { troops: { men: 5000, fleet: false, forced: false } }) < pts(ways(1, 2), { troops: { men: 5000, fleet: false, forced: false } }));
    // Sneaking goes off the road.
    Assert.equal(pts(ways(1, 0), { sneaking: true }), pts(ways(3, 2), { sneaking: true }));
  });

  test("Relay stations and roads bring a far province within the couriers' season", () => {
    // At the start every Great King's own land lies within a season of his court; a far conquest does not.
    const s = game();
    const e = new TurnEngine(s);
    const far = WorldMap.default.landProvinces.filter((p) => e.wordTo("Egypt", p.id) > 0).map((p) => p.id);
    Assert.true(far.length > 0);
    const before = far.map((x) => e.wordTo("Egypt", x));
    const w = waysOf(s);
    for (const p of WorldMap.default.landProvinces) {
      setLevel(s, "Roads", p.id, 3);
      setLevel(s, "Stations", p.id, 2);
    }
    Assert.true(waysOf(s) !== w);
    const after = far.map((x) => e.wordTo("Egypt", x));
    Assert.true(after.some((x, i) => x < before[i]));
    Assert.true(after.every((x, i) => x <= before[i]));
  });

  test("Police hold the loose and the bands down where the king's men can go, and find smugglers", () => {
    const s = game();
    setLevel(s, "Policing", "thebes", 0);
    s.units = s.units.filter((u) => u.province !== "thebes");
    Assert.equal(100, policedShare(s, "thebes"));
    setLevel(s, "Policing", "thebes", 30);
    const share = policedShare(s, "thebes");
    Assert.equal(100 - Math.floor((60 * 300) / 600), share);
    // Nowhere foreign troops stand, nor outside a besieged city's walls.
    const u = newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "thebes" });
    s.units.push(u);
    Assert.equal(100, policedShare(s, "thebes"));
    Assert.equal(smuggleOdds(0, 0, 0, 90) + 12, smuggleOdds(0, 0, 0, 90, 300));
  });

  test("A harbour shelters its fleets through the winter; crews beyond its room lose men to the storms", () => {
    const s = game();
    while (s.turn % 3 !== WinterSeason) s.turn++;
    const e = new TurnEngine(s);
    // A fleet of Egypt's, the only one off Ugarit, which Egypt holds no harbour on.
    s.units = s.units.filter((u) => u.kind !== "Fleet" || u.power !== "Egypt");
    const waters = WorldMap.default.get("ugarit").waters!;
    s.units = s.units.filter((u) => u.province !== waters);
    const fleet = newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Fleet", province: waters, men: 2000 });
    s.units.push(fleet);
    e.harboursWinter();
    Assert.equal(1800, fleet.men);
    Assert.contains(s.events, (x) => x.signal === "harbour-short");
  });

  test("Water works lengthen a city's drinking, and give a city whose spring is outside its walls a guarded way down", () => {
    Assert.equal(Infinity, drinkingSeasons(waterSeasons("megiddo"), "megiddo", 1));
    Assert.equal(waterSeasons("nesa") + 4, drinkingSeasons(waterSeasons("nesa"), "nesa", 2));
    Assert.equal(Infinity, drinkingSeasons(waterSeasons("thebes"), "thebes", 0));
  });

  test("An army in another's land razes a level of what stands there", () => {
    const s = game();
    const e = new TurnEngine(s);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "sinai" }));
    Assert.equal(0, new OrderValidator(s).validate("Hatti", newTurnSubmission({ orders: [raze("sinai", "Stations")] })).rejected.length);
    e.raze("Hatti", raze("sinai", "Stations"));
    Assert.equal(0, levelOf(s, "Stations", "sinai"));
    Assert.contains(s.events, (x) => x.signal === "raze");
  });

  test("A letter passing openly through another king's relay stations is read there", () => {
    const s = game();
    const e = new TurnEngine(s);
    const c = newCharacter({ id: newId(s, "c"), name: "Kelu" });
    const j = newJourney({ id: newId(s, "j"), from: "Hatti", to: "Babylonia", dispatch: newDispatch({ letter: "Our armies march at the flood." }) });
    e.readAtStation(j, c, "sinai");
    Assert.contains(s.events, (x) => x.signal === "station-read" && x.text.includes("Egypt's station men in the Ways of Horus read the letter Kelu carried"));
    // Its own king's stations, or the court it goes to, read nothing.
    const k = s.events.length;
    e.readAtStation(newJourney({ ...j, from: "Egypt" }), c, "sinai");
    Assert.equal(k, s.events.length);
  });

  test("An earthquake throws the walls of the province it strikes down a level", () => {
    let s = newGame(3, newGameConfig({ catastropheChance: 1 }));
    for (const p of WorldMap.default.landProvinces) s.walls.set(p.id, 3);
    for (let i = 0; i < 40 && !s.catastrophes.some((c) => c.kind === "Earthquake"); i++) {
      const e = new TurnEngine(s);
      e.beginTurn();
      e.resolve(new Dict());
    }
    const quake = first(s.catastrophes, (c) => c.kind === "Earthquake");
    Assert.equal(2, wallsOf(s, quake.province!));
  });

  test("An order keeping nothing, with nothing under way, is dropped", () => {
    const s = game();
    const e = new TurnEngine(s);
    setLevel(s, "Roads", "thebes", 0);
    s.works = s.works.filter((w) => w.province !== "thebes");
    s.works.push(newWorkPlan({ province: "thebes", kind: "Roads", keep: 0, labour: true }));
    e.worksSeason();
    Assert.equal(null, planOf(s, "Roads", "thebes"));
  });
});
