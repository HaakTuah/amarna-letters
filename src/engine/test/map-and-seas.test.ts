import { describe, test } from "vitest";
import {
  Adjudicator,
  AttestedKm,
  cheapestRoute,
  Doors,
  StartVassals,
  king,
  Dict,
  type GameState,
  type Order,
  type Power,
  SiegesTitle,
  StartWalls,
  TurnEngine,
  type TurnSubmission,
  type Unit,
  WorldMap,
  besiege,
  connectionDays,
  connectionKm,
  convoy,
  hold,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newTurnSubmission,
  newUnit,
  unitAt,
} from "@amarna/engine";
import { Assert, last, oldWorld } from "./support.ts";

// The map and the seas (build order item 7a): the map review's provinces, names and connections, the lengths of the
// connections, each coast's waters, the open-sea crossings closed in winter, and the blockade deciding at sea.
describe("MapAndSeasTests", () => {
  const Map = WorldMap.default;

  test("The map has the provinces of the review, each coast its waters, and nineteen sea zones", () => {
    // 55 land provinces and 15 sea zones after item 8; item 11c added six cities of Canaan, their two coasts' waters and the
    // Red Sea; item 11f nine places, Beirut with waters of its own.
    Assert.equal(70, Map.landProvinces.length);
    Assert.equal(19, Map.provinces.filter((p) => p.isSea).length);
    for (const id of ["aleppo", "qatna", "alalakh", "nuhashshe", "jerusalem", "shechem", "arrapha", "sidon", "arwad", "nubia", "dilmun", "kaska", "steppe", "akko", "hazor", "gezer", "ashkelon", "lachish", "hebron", "redsea"])
      Assert.true(Map.exists(id), id);
    // Names of their time; Kumidi stays within Damascus's land. Ṣumur is a province of its own on Amurru's coast, and Lukka
    // a land without a king (item 8: Haakon's answers to item 7a's review).
    for (const id of ["mari", "kanesh", "ekallatum", "tamassos", "kumidi"]) Assert.false(Map.exists(id), id);
    Assert.equal(["Coast", "Land"], [Map.get("sumur").kind, Map.get("amurru").kind]);
    Assert.true(Map.areAdjacent("sumur", "amurru") && Map.areAdjacent("sumur", "ugarit") && Map.areAdjacent("sumur", "byblos"));
    Assert.true(Map.get("lukka").kingless);
    Assert.equal([1, undefined], [StartWalls.get("sumur"), StartWalls.get("lukka")]);
    Assert.equal(["Suhu", "Nesa", "Ekallate", "Kalavasos"], ["suhu", "nesa", "ekallate", "kalavasos"].map((id) => Map.get(id).name));
    // Suhu, a city-state's city since item 11+, has the walls the walls dossier gives its unexcavated towns (item 11d).
    Assert.equal(1, StartWalls.get("suhu"));
    Assert.equal(["Egypt", "Babylonia"], [Map.get("nubia").home, Map.get("dilmun").home]);
    for (const p of Map.landProvinces.filter((x) => x.isCoastal)) Assert.true(p.waters !== null && Map.get(p.waters).isSea && Map.areAdjacent(p.id, p.waters), p.id);
    Assert.equal("sumurwaters", Map.get("arwad").waters);
    Assert.equal(["dilmun", "susa", "ur"], Map.coastsOf("gulf").map((p) => p.id).sort());
    // Each Cypriot province has waters of its own, so Alashiya's one fleet can guard its capital's shore.
    Assert.false(Map.get("enkomi").waters === Map.get("kalavasos").waters);
  });

  test("Islands are reached only by sea, and every land province by land from any other on the mainland", () => {
    for (const island of ["arwad", "dilmun", "enkomi", "kalavasos"]) Assert.false(Map.movesFrom("Army", island).some((n) => !["enkomi", "kalavasos"].includes(n)), island);
    const mainland = Map.landProvinces.filter((p) => !["arwad", "dilmun", "enkomi", "kalavasos"].includes(p.id));
    const seen = new Set(["hattusa"]);
    const queue = ["hattusa"];
    while (queue.length > 0) for (const n of Map.movesFrom("Army", queue.shift()!)) if (!seen.has(n)) (seen.add(n), queue.push(n));
    Assert.equal(mainland.length, seen.size);
  });

  test("Connections have lengths: attested ones as the sources give them, the Levant short and Anatolia long", () => {
    for (const e of Map.edges) {
      Assert.true(connectionKm(Map, e.a, e.b) > 0, `${e.a}-${e.b}`);
      Assert.true(connectionDays(Map, e.a, e.b) > 0, `${e.a}-${e.b}`);
    }
    for (const a of AttestedKm) Assert.equal(a.km, connectionKm(Map, a.a, a.b));
    // Thutmose III's ten days from Tjaru to Gaza, across the desert at 20 km a day, is about 12 for a party, and the
    // Delta's own road to Tjaru two more; the Ways of Horus run through the Sinai (item 11f+).
    Assert.equal(14, connectionDays(Map, "delta", "sinai") + connectionDays(Map, "sinai", "gaza"));
    Assert.true(connectionDays(Map, "sidon", "tyre") < 3);
    Assert.true(connectionDays(Map, "hattusa", "nesa") > 7);
    // A pass is slow: the Cilician Gates at 15 km a day.
    Assert.true(connectionDays(Map, "tuwanuwa", "kizzuwatna") > connectionKm(Map, "tuwanuwa", "kizzuwatna") / 25);
    // Currents run counterclockwise: north along the Levant, so a voyage from Gaza to Tyre is quicker than back.
    Assert.true(connectionDays(Map, "gazawaters", "ashkelonwaters") < connectionDays(Map, "ashkelonwaters", "gazawaters"));
  });

  test("The open-sea crossings are dangerous in winter, the second season of each year, never closed", () => {
    const winter = Map.winter;
    Assert.true(Map.canMove("Fleet", "ugaritwaters", "enkomiwaters"));
    Assert.false(winter.canMove("Fleet", "ugaritwaters", "enkomiwaters"));
    // Along the coasts ships sail all year at no risk.
    Assert.true(winter.canMove("Fleet", "ugaritwaters", "kizzuwatnawaters"));
    Assert.true(winter.seaRouteExists("gaza", "ugarit"));
    // Cyprus is reached only over the open sea, so in winter every army carried to it or from it risks the storms.
    Assert.true(Map.seaRouteExists("ugarit", "enkomi"));
    Assert.false(winter.seaRouteExists("ugarit", "enkomi"));
  });

  test("A city one voyage away can be bought: Ugarit from Enkomi, not Gaza; Arwad shares Amurru's waters", () => {
    Assert.true(Map.sharesSea("enkomi", "ugarit"));
    Assert.false(Map.sharesSea("enkomi", "gaza"));
    Assert.true(Map.sharesSea("sumur", "arwad"));
    Assert.true(Map.sharesSea("gaza", "ashkelon"));
  });

  class Board {
    units: Unit[] = [];
    orders = new Dict<string, Order>();
    unit(p: Power, kind: "Army" | "Fleet", at: string): Board {
      this.units.push(newUnit({ id: "u" + this.units.length, power: p, kind, province: at }));
      return this;
    }
    order(o: Order & { unit: string }): Board {
      this.orders.set(o.unit, o);
      return this;
    }
    run(map: WorldMap) {
      return new Adjudicator(map, true, 1).run(this.units, this.orders, new Dict<string, Power | null>(), new Dict<string, number>());
    }
  }

  test("An army lands only from the waters of the coast it lands on: an enemy fleet there stops it", () => {
    // Hatti carries an army from Ugarit to Enkomi with a fleet in each of the two waters.
    const ok = new Board()
      .unit("Hatti", "Army", "ugarit")
      .unit("Hatti", "Fleet", "ugaritwaters")
      .unit("Hatti", "Fleet", "enkomiwaters")
      .order(move("ugarit", "enkomi"))
      .order(convoy("ugaritwaters", "ugarit", "enkomi"))
      .order(convoy("enkomiwaters", "ugarit", "enkomi"));
    Assert.equal("enkomi", ok.run(Map).newPositions.get("u0"));
    // With Alashiya's fleet holding Enkomi's waters no Hittite fleet can stand there, and one fleet off Ugarit does not reach.
    const held = new Board()
      .unit("Hatti", "Army", "ugarit")
      .unit("Hatti", "Fleet", "ugaritwaters")
      .unit("Alashiya", "Fleet", "enkomiwaters")
      .order(move("ugarit", "enkomi"))
      .order(convoy("ugaritwaters", "ugarit", "enkomi"))
      .order(hold("enkomiwaters"));
    Assert.equal("ugarit", held.run(Map).newPositions.get("u0"));
    // On the map without winter's dangerous crossings, the same convoy carries nothing.
    Assert.equal("ugarit", ok.run(Map.winter).newPositions.get("u0"));
  });

  function season(s: GameState, p: Power, ...orders: Order[]): void {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict<Power, TurnSubmission>([[p, newTurnSubmission({ orders })]]));
  }

  test("A besieged coastal city is supplied by sea unless its besieger's fleet holds its waters", () => {
    // Egypt's army stands within the walls of Gaza (walls 2, held by no one) and besieges it.
    const s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));
    s.units.push(newUnit({ id: "x1", power: "Egypt", kind: "Army", province: "gaza" }));
    season(s, "Egypt", besiege("gaza"));
    Assert.equal(0, s.sieges[0].progress);
    Assert.contains("so the city was supplied by sea", last(inboxOf(s, "Egypt"), (i) => i.title === SiegesTitle).body);
    Assert.contains(s.events, (e) => e.signal === "sea-supplied");
    // Egypt's fleet off the Delta sails along the shore into Gaza's waters: the harbour is blockaded and the siege advances.
    s.units.push(newUnit({ id: "x2", power: "Egypt", kind: "Fleet", province: "deltawaters" }));
    season(s, "Egypt", move("deltawaters", "gazawaters"));
    Assert.equal("Egypt", unitAt(s, "gazawaters")?.power);
    Assert.equal(1, s.sieges[0].progress);
    Assert.contains("with its harbour blockaded", last(inboxOf(s, "Egypt"), (i) => i.title === SiegesTitle).body);
    Assert.contains(s.events, (e) => e.signal === "blockade");
  });

  // Item 11c: the Red Sea and six cities of Canaan.
  test("The Red Sea is one zone reached only from the Sinai and Thebes, over desert roads", () => {
    Assert.equal(["sinai", "thebes"], Map.coastsOf("redsea").map((p) => p.id).sort());
    Assert.false(Map.neighbors("redsea").some((n) => Map.get(n).isSea));
    // The Wadi Hammamat goes at the desert's pace, not a ship's: about ten days, not three.
    Assert.equal(210, connectionKm(Map, "thebes", "redsea"));
    Assert.equal(10.5, connectionDays(Map, "thebes", "redsea"));
    // From the Sinai's shore a ship sails down to Mersa Gawasis, so the empty sea joins its shores at a voyage's cost: Thebes
    // to the Delta still goes by the Nile, and only the Sinai is nearer by the Red Sea (as the mining expeditions went).
    Assert.equal(20, connectionDays(Map, "sinai", "redsea"));
    const days = (x: string, y: string) => connectionDays(Map, x, y);
    Assert.equal(["thebes", "akhetaten", "memphis", "delta"], cheapestRoute(Map, "thebes", "delta", days)!.route);
    Assert.equal(["thebes", "redsea", "sinai"], cheapestRoute(Map, "thebes", "sinai", days)!.route);
    // Punt is a door for newcomers through Egypt's Red Sea coast; the doors' shares are the dossier's and make a hundred.
    Assert.equal(["thebes", "sinai"], Doors.find((d) => d.id === "redsea")!.provinces);
    Assert.equal(100, Doors.reduce((a, d) => a + d.share, 0));
  });

  test("Six cities of Canaan are city-states under their rulers, each Egypt's vassal at the start", () => {
    const six: [string, Power, string][] = [
      ["akko", "Akko", "Surata"], ["hazor", "Hazor", "Abdi-Tirshi"], ["gezer", "Gezer", "Milkilu"],
      ["ashkelon", "Ashkelon", "Yidya"], ["lachish", "Lachish", "Zimreddi"], ["hebron", "Hebron", "Shuwardata"],
    ];
    for (const [id, power, ruler] of six) {
      Assert.true(Map.get(id).capital && Map.get(id).home === power, id);
      Assert.equal(ruler, king(power));
      Assert.true(StartVassals.some((v) => v.vassal === power && v.overlord === "Egypt"), id);
    }
    // Walls by the walls dossier, as item 11d set the other cities': Hazor's great rampart 3, the five it does not list 1.
    Assert.equal([3, 1, 1, 1, 1, 1], ["hazor", "gezer", "ashkelon", "akko", "lachish", "hebron"].map((id) => StartWalls.get(id)));
    // The road from Megiddo to Damascus runs by Hazor, and the shore from Tyre to Gaza by Akko and Ashkelon.
    Assert.false(Map.areAdjacent("megiddo", "damascus") || Map.areAdjacent("tyre", "gaza"));
    Assert.true(Map.areAdjacent("hazor", "megiddo") && Map.areAdjacent("hazor", "damascus") && Map.areAdjacent("akko", "tyre") && Map.areAdjacent("ashkelon", "gaza"));
    Assert.equal(["akkowaters", "ashkelonwaters"], [Map.get("akko").waters, Map.get("ashkelon").waters]);
  });
});
