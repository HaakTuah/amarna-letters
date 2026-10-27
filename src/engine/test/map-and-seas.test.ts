import { describe, test } from "vitest";
import {
  Adjudicator,
  AttestedKm,
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
import { Assert, last } from "./support.ts";

// The map and the seas (build order item 7a): the map review's provinces, names and connections, the lengths of the
// connections, each coast's waters, the open-sea crossings closed in winter, and the blockade deciding at sea.
describe("MapAndSeasTests", () => {
  const Map = WorldMap.default;

  test("The map has the provinces of the review, each coast its waters, and fifteen sea zones", () => {
    Assert.equal(54, Map.landProvinces.length);
    Assert.equal(15, Map.provinces.filter((p) => p.isSea).length);
    for (const id of ["aleppo", "qatna", "alalakh", "nuhashshe", "jerusalem", "shechem", "arrapha", "sidon", "arwad", "nubia", "dilmun", "kaska", "steppe"])
      Assert.true(Map.exists(id), id);
    // Names of their time; Kumidi stays within Damascus's land, and Ṣumur is Amurru's harbour.
    for (const id of ["mari", "kanesh", "ekallatum", "tamassos", "kumidi", "sumur"]) Assert.false(Map.exists(id), id);
    Assert.equal(["Suhu", "Nesa", "Ekallate", "Kalavasos"], ["suhu", "nesa", "ekallate", "kalavasos"].map((id) => Map.get(id).name));
    // Suhu keeps the walls of a town (1), not Mari's fortress walls (2).
    Assert.equal(1, StartWalls.get("suhu"));
    Assert.equal(["Egypt", "Babylonia"], [Map.get("nubia").home, Map.get("dilmun").home]);
    for (const p of Map.landProvinces.filter((x) => x.isCoastal)) Assert.true(p.waters !== null && Map.get(p.waters).isSea && Map.areAdjacent(p.id, p.waters), p.id);
    Assert.equal("amurruwaters", Map.get("arwad").waters);
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
    // Thutmose III's ten days from Tjaru to Gaza, across the desert at 20 km a day, is about 12 for a party.
    Assert.equal(12.5, connectionDays(Map, "delta", "gaza"));
    Assert.true(connectionDays(Map, "sidon", "tyre") < 3);
    Assert.true(connectionDays(Map, "hattusa", "nesa") > 7);
    // A pass is slow: the Cilician Gates at 15 km a day.
    Assert.true(connectionDays(Map, "tuwanuwa", "kizzuwatna") > connectionKm(Map, "tuwanuwa", "kizzuwatna") / 25);
    // Currents run counterclockwise: north along the Levant, so a voyage from Gaza to Tyre is quicker than back.
    Assert.true(connectionDays(Map, "gazawaters", "tyrewaters") < connectionDays(Map, "tyrewaters", "gazawaters"));
  });

  test("The open-sea crossings close in winter, the second season of each year", () => {
    Assert.true(Map.forTurn(1) === Map && Map.forTurn(3) === Map && Map.forTurn(4) === Map);
    const winter = Map.forTurn(2);
    Assert.true(winter === Map.forTurn(5));
    Assert.true(Map.canMove("Fleet", "ugaritwaters", "enkomiwaters"));
    Assert.false(winter.canMove("Fleet", "ugaritwaters", "enkomiwaters"));
    // Along the coasts ships sail all year.
    Assert.true(winter.canMove("Fleet", "ugaritwaters", "kizzuwatnawaters"));
    Assert.true(winter.seaRouteExists("gaza", "ugarit"));
    // Cyprus is reached only over the open sea, so in winter no army crosses to it or from it.
    Assert.true(Map.seaRouteExists("ugarit", "enkomi"));
    Assert.false(winter.seaRouteExists("ugarit", "enkomi"));
  });

  test("A city one voyage away can be bought: Ugarit from Enkomi, not Gaza; Arwad shares Amurru's waters", () => {
    Assert.true(Map.sharesSea("enkomi", "ugarit"));
    Assert.false(Map.sharesSea("enkomi", "gaza"));
    Assert.true(Map.sharesSea("amurru", "arwad"));
    Assert.true(Map.sharesSea("gaza", "tyre"));
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
    // In winter the crossing from Ugarit's waters to Enkomi's is closed, and the same convoy carries nothing.
    Assert.equal("ugarit", ok.run(Map.forTurn(2)).newPositions.get("u0"));
  });

  function season(s: GameState, p: Power, ...orders: Order[]): void {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict<Power, TurnSubmission>([[p, newTurnSubmission({ orders })]]));
  }

  test("A besieged coastal city is supplied by sea unless its besieger's fleet holds its waters", () => {
    // Egypt's army stands within the walls of Gaza (walls 2, a free city) and besieges it.
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
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
});
