import { describe, test } from "vitest";
import {
  Crossings,
  Dict,
  type GameState,
  PointsPerDay,
  StartVassals,
  StartWalls,
  TravelData,
  TurnEngine,
  WinterSeason,
  WorldMap,
  caravan,
  crossingBetween,
  defenceGround,
  king,
  legPoints,
  newGame,
  newGameConfig,
  newSiege,
  newTurnSubmission,
  single,
  terrainOf,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// Build order item 11f: the rest of the map's crossings and its missing places, and caravans that go anywhere, at risk.
describe("MapCrossingsTests", () => {
  const Map = WorldMap.default;
  const game = (seed = 1): GameState => newGame(seed, newGameConfig({ catastropheChance: 0 }));

  test("Every crossing joins two neighbours and names the dossier it comes from", () => {
    for (const c of Crossings) {
      Assert.true(Map.areAdjacent(c.a, c.b), `${c.a}-${c.b}`);
      Assert.true(c.source.endsWith(".md"), c.name);
      Assert.equal(1, Crossings.filter((x) => (x.a === c.a && x.b === c.b) || (x.a === c.b && x.b === c.a)).length);
    }
  });

  test("A crossed river: a ferry day, four more in its flood, and help for a unit standing behind it", () => {
    // The Jordan between Megiddo and Pella floods in Shemu (the third season), as the Euphrates does.
    const dry = legPoints(Map, "megiddo", "pella", 0);
    Assert.equal(dry + TravelData.floodDays * PointsPerDay, legPoints(Map, "megiddo", "pella", 2));
    Assert.equal("River", defenceGround("megiddo", "pella")!.kind);
    Assert.equal("the Marassantiya", defenceGround("nesa", "hattusa")!.name);
    Assert.equal("the Orontes at the ford of Shabtuna", defenceGround("damascus", "qadesh")!.name);
  });

  test("A pass: slow going, twice as slow under winter snow, and help for the defender", () => {
    Assert.equal("Mountain", crossingBetween("beirut", "damascus")!.kind);
    Assert.equal("Pass", defenceGround("beirut", "damascus")!.kind);
    Assert.true(legPoints(Map, "beirut", "damascus", WinterSeason) > legPoints(Map, "beirut", "damascus", 0));
  });

  test("A desert edge: the desert's pace and no help in battle", () => {
    Assert.equal("Desert", crossingBetween("libya", "delta")!.kind);
    Assert.equal(null, defenceGround("libya", "delta"));
    Assert.equal("Desert", terrainOf("shasu"));
    Assert.equal("Rough", terrainOf("azzi"));
  });

  test("The missing places: each with its ruler, walls and opening bond", () => {
    const places: [string, string, string, number][] = [
      ["azzi", "Azzi", "Hukkana", 1],
      ["niya", "Niya", "Takuwa", 1],
      ["tunip", "Tunip", "the king of Tunip", 1],
      ["beirut", "Beirut", "Ammunira", 1],
      ["pella", "Pella", "Mut-Bahlu", 1],
      ["ashtaroth", "Ashtaroth", "Ayyab", 1],
      ["libya", "Libya", "the chief of the Tjehenu", 0],
      ["shasu", "Shasu", "the chief of the Shasu", 0],
    ];
    for (const [id, power, ruler, walls] of places) {
      Assert.equal(id, Map.capital(power as never).id);
      Assert.equal(ruler, king(power as never));
      Assert.equal(walls, StartWalls.get(id) ?? 0);
    }
    Assert.equal("Hatti", Map.get("samuha").home);
    Assert.equal("Labaya", king("Shechem"));
    Assert.true(Map.get("libya").kingless && Map.get("shasu").kingless);
    const bond = (v: string): string | undefined => StartVassals.find((x) => x.vassal === v)?.overlord;
    Assert.equal(["Hatti", "Mitanni", "Egypt", "Egypt", "Egypt", "Egypt"], ["Azzi", "Niya", "Tunip", "Beirut", "Pella", "Ashtaroth"].map(bond));
    Assert.equal(undefined, bond("Libya"));
  });

  /** Hatti's army in Aleppo, every land between it and home closed to Hatti, as Hatti has heard: no open road reaches it. */
  const closedRoad = (seed: number): { s: GameState; e: TurnEngine } => {
    const s = game(seed);
    const e = new TurnEngine(s);
    single(s.units, (x) => x.province === "nesa").province = "aleppo";
    const shut = ["Carchemish", "Alalakh", "Isuwa", "Mitanni"] as const;
    for (const k of shut) s.roadsClosed.set(k, ["Hatti"]);
    s.roadsHeard.set("Hatti", [...shut]);
    s.stores.set("kizzuwatna", 200);
    s.treasuries.get("Hatti").gold = 1000;
    return { s, e };
  };
  const travel = (s: GameState, e: TurnEngine, seasons: number): void => {
    for (let i = 0; i < seasons && s.caravans.length > 0; i++) {
      s.turn++;
      e.beginTurn();
    }
  };

  test("A kingdom's caravan goes through land closed to it, sneaking, and is sometimes found and seized", () => {
    let slipped = 0;
    let found = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { s, e } = closedRoad(seed);
      e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [caravan("kizzuwatna", "aleppo", 100)] })]]));
      const c = single(s.caravans);
      Assert.true(c.route.some((x) => x === "carchemish" || x === "alalakh"), c.route.join(" "));
      travel(s, e, 4);
      if (s.events.some((x) => x.signal === "caravan-slipped")) slipped++;
      if (s.events.some((x) => x.signal === "caravan-found")) found++;
    }
    Assert.true(slipped > 0);
    Assert.true(found > 0);
  });

  test("A kingdom's caravan keeps to open roads while one reaches, however long", () => {
    const s = game();
    const e = new TurnEngine(s);
    single(s.units, (x) => x.province === "nesa").province = "aleppo";
    for (const k of ["Carchemish", "Alalakh"] as const) s.roadsClosed.set(k, ["Hatti"]);
    s.roadsHeard.set("Hatti", ["Carchemish", "Alalakh"]);
    Assert.false(e.caravanRoute("Hatti", "kizzuwatna", "aleppo")!.some((x) => x === "carchemish" || x === "alalakh"));
  });

  test("Troops shut inside walls by a siege seize no caravan passing beyond them", () => {
    const taken = (besieged: boolean): number => {
      let n = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const s = game(seed);
        const e = new TurnEngine(s);
        // Hatti's caravan from Hattusa to its army in Nesa; Mitanni's army stands in Nesa, its roads closed to Hatti.
        s.stores.set("hattusa", 200);
        const mine = single(s.units, (x) => x.province === "nesa");
        const theirs = single(s.units, (x) => x.province === "taidu");
        theirs.province = "nesa";
        s.roadsClosed.set("Mitanni", ["Hatti"]);
        s.roadsHeard.set("Hatti", ["Mitanni"]);
        if (besieged) {
          s.owner.set("nesa", "Mitanni");
          s.sieges.push(newSiege({ province: "nesa", power: "Hatti", unitId: mine.id, since: s.turn }));
        }
        e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [caravan("hattusa", "nesa", 60)] })]]));
        travel(s, e, 2);
        // Nor do the holder's people at the border, shut in with them.
        if (s.events.some((x) => x.signal === "caravan-taken" || x.signal === "caravan-found")) n++;
      }
      return n;
    };
    Assert.true(taken(false) > 0);
    Assert.equal(0, taken(true));
  });
});
