import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  OrderValidator,
  type Power,
  PointsPerDay,
  RoadOdds,
  TravelData,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  boatDays,
  dispatch,
  first,
  inboxOf,
  legPoints,
  newGame,
  newTurnSubmission,
  newUnit,
  roads,
  wordSeasons,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// Travel and news (build order item 7b): routes and the one pace rule, winter passes, rivers, the road check, closed roads
// and sneaking, and news of distant land travelling.
describe("TravelTests", () => {
  const Map = WorldMap.default;
  const none = (): Dict<Power, TurnSubmission> => new Dict<Power, TurnSubmission>();
  const season = (s: GameState, subs: Dict<Power, TurnSubmission> = none()): TurnEngine => {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(subs);
    return e;
  };

  test("The Nile carries boats both ways, faster downstream; the Euphrates only downstream", () => {
    const down = boatDays(Map, "thebes", "akhetaten")!;
    const up = boatDays(Map, "akhetaten", "thebes")!;
    Assert.true(down < up);
    Assert.true(legPoints(Map, "thebes", "akhetaten", 0) < legPoints(Map, "akhetaten", "thebes", 0));
    Assert.notNull(boatDays(Map, "babylon", "nippur"));
    Assert.null(boatDays(Map, "nippur", "babylon"));
    // Upstream on the Euphrates a traveller walks: the same as without a river.
    Assert.equal(legPoints(Map, "nippur", "babylon", 0), legPoints(Map, "nippur", "babylon", 0, { sneaking: false }));
  });

  test("A great river's crossing is slower in its flood season", () => {
    const dry = legPoints(Map, "carchemish", "harran", 0);
    const flood = legPoints(Map, "carchemish", "harran", 2);
    Assert.equal(4 * PointsPerDay, flood - dry);
  });

  test("Winter closes nothing: a pass is slow for travellers, and an army over it in winter may be lost", () => {
    // Twice as long over a snowbound pass, never closed (item 9, "Winter is dangerous, never closed").
    Assert.equal(legPoints(Map, "nesa", "kizzuwatna", 0) * (TravelData.winterPassPercent / 100), legPoints(Map, "nesa", "kizzuwatna", 1));
    Assert.true(Map.canMove("Army", "nesa", "kizzuwatna"));
    Assert.false(Map.winter.canMove("Army", "nesa", "kizzuwatna"));
    // An army ordered over a pass in winter is accepted, and each crossing rolls for the army.
    let lost = 0;
    for (let g = 1; g <= 40; g++) {
      const s = newGame(g);
      s.turn = 2;
      s.units = s.units.filter((u) => u.province !== "nesa" && u.province !== "kizzuwatna");
      s.units.push(newUnit({ id: "u-test", power: "Hatti", kind: "Army", province: "nesa" }));
      const v = new OrderValidator(s, Map).validate("Hatti", newTurnSubmission({ orders: [{ type: "move", unit: "nesa", to: "kizzuwatna" }] }));
      Assert.equal(1, v.accepted.filter((o) => o.type === "move").length);
      new TurnEngine(s).resolve(new Dict([["Hatti", newTurnSubmission({ orders: [{ type: "move", unit: "nesa", to: "kizzuwatna" }] })]]));
      const u = s.units.find((x) => x.id === "u-test");
      if (u === undefined) {
        lost++;
        Assert.true(s.events.some((x) => x.signal === "winter-loss" && x.visibleTo.includes("Hatti")));
      } else Assert.equal("kizzuwatna", u.province);
    }
    // About GameConfig.winterArmyLoss (30) in 100: lost in some games, through in most.
    Assert.true(lost > 3 && lost < 25);
    // Outside winter the pass costs nothing.
    const s = newGame(3);
    s.turn = 1;
    s.units = s.units.filter((u) => u.province !== "nesa" && u.province !== "kizzuwatna");
    s.units.push(newUnit({ id: "u-test", power: "Hatti", kind: "Army", province: "nesa" }));
    new TurnEngine(s).resolve(new Dict([["Hatti", newTurnSubmission({ orders: [{ type: "move", unit: "nesa", to: "kizzuwatna" }] })]]));
    Assert.equal("kizzuwatna", s.units.find((x) => x.id === "u-test")!.province);
  });

  test("Sneaking takes half as long again, on land only", () => {
    Assert.equal(Math.round(legPoints(Map, "gaza", "megiddo", 0) * 1.5), legPoints(Map, "gaza", "megiddo", 0, { sneaking: true }));
    Assert.equal(legPoints(Map, "ugaritwaters", "enkomiwaters", 0), legPoints(Map, "ugaritwaters", "enkomiwaters", 0, { sneaking: true }));
  });

  test("Word goes by the fastest road, an island's in winter too", () => {
    Assert.equal(1, wordSeasons(45, Map, "babylon", "ashur", 1));
    Assert.true(wordSeasons(45, Map, "akhetaten", "babylon", 1) >= 2);
    // Enkomi in winter: the crossing is open, only stormier (item 9).
    Assert.equal(wordSeasons(45, Map, "enkomi", "ugarit", 1), wordSeasons(45, Map, "enkomi", "ugarit", 2));
  });

  test("An envoy goes by a route of provinces and arrives when it has made the whole road", () => {
    const s = newGame(5);
    const envoy = first(s.characters, (c) => c.employer === "Babylonia");
    envoy.traits.competence = 100;
    const start = s.turn;
    season(s, new Dict([["Babylonia", newTurnSubmission({ orders: [dispatch(envoy.id, "Assyria", "Greetings, brother.")] })]]));
    const j = first(s.journeys, (x) => x.characterId === envoy.id);
    Assert.equal("babylon", j.route[0]);
    Assert.equal("ashur", j.route[j.route.length - 1]);
    while (s.audiences.length === 0 && s.turn < start + 5) {
      const e = new TurnEngine(s);
      e.beginTurn();
      if (s.audiences.length === 0) e.resolve(none());
    }
    Assert.equal(1, s.audiences.length);
    Assert.equal(start + 1, s.turn);
  });

  test("A king closes his roads: the court hears it by word, and his men turn its travellers back at the border", () => {
    const s = newGame(7);
    const e = season(s, new Dict([["Mitanni", newTurnSubmission({ orders: [roads("Babylonia", true)] })]]));
    Assert.true((s.roadsClosed.tryGet("Mitanni") ?? []).includes("Babylonia"));
    const word = first(s.journeys, (j) => j.kind === "Word" && j.to === "Babylonia");
    Assert.equal("RoadsClosed", word.news);
    // Not heard yet; heard when the word arrives.
    Assert.false((s.roadsHeard.tryGet("Babylonia") ?? []).includes("Mitanni"));
    while (s.turn < word.arriveTurn) season(s);
    new TurnEngine(s).beginTurn();
    Assert.true((s.roadsHeard.tryGet("Babylonia") ?? []).includes("Mitanni"));
    Assert.true(inboxOf(s, "Babylonia").some((i) => i.title === "Roads"));
    // Refused once it already stands.
    const v = new OrderValidator(s, Map).validate("Mitanni", newTurnSubmission({ orders: [roads("Babylonia", true)] }));
    Assert.equal(1, v.rejected.length);
    void e;
  });

  test("The road check's odds: hostile troops, sneaking found, outlaws, storms; skill takes off up to half", () => {
    const s = newGame(9);
    const envoy = first(s.characters, (c) => c.employer === "Egypt");
    season(s, new Dict([["Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Hatti", "Greetings.")] })]]));
    const j = first(s.journeys, (x) => x.characterId === envoy.id);
    const e = new TurnEngine(s);
    envoy.traits.competence = 0;
    // A free city's land: outlaws only.
    let odds = e.roadOdds(j, envoy, "gaza", false, null);
    Assert.equal(RoadOdds.free, odds.getOrDefault("outlaws", 0));
    // Mitanni closes its roads to Egypt and stands an army in Gaza: its troops may stop the envoy there.
    s.roadsClosed.set("Mitanni", ["Egypt"]);
    s.units.push(newUnit({ id: "u-x", power: "Mitanni", kind: "Army", province: "gaza" }));
    odds = e.roadOdds(j, envoy, "gaza", false, null);
    Assert.equal(RoadOdds.troops, odds.getOrDefault("troops", 0));
    // Storms at sea, worse in winter (the season just travelled is s.turn - 1).
    s.turn = 3;
    Assert.equal(RoadOdds.winterStorm, e.roadOdds(j, envoy, "gazawaters", false, null).getOrDefault("nature", 0));
    envoy.traits.competence = 100;
    Assert.equal(RoadOdds.winterStorm / 2, e.roadOdds(j, envoy, "gazawaters", false, null).getOrDefault("nature", 0));
    // Snow at either end of a pass on its road in winter.
    envoy.traits.competence = 0;
    j.route = ["nesa", "kizzuwatna", "alalakh"];
    Assert.equal(RoadOdds.snow, e.roadOdds(j, envoy, "nesa", false, null).getOrDefault("nature", 0));
    Assert.equal(RoadOdds.snow, e.roadOdds(j, envoy, "alalakh", false, null).getOrDefault("nature", 0));
    s.turn = 2;
    Assert.equal(0, e.roadOdds(j, envoy, "nesa", false, null).getOrDefault("nature", 0));
  });

  test("Who holds distant land is known as late as word of it travels", () => {
    const s = newGame(11);
    s.turn = 6;
    // Babylonia's Ur passes to Assyria by the engine's hand: Egypt sees nothing of Ur, Babylonia sees it at once.
    const e = new TurnEngine(s);
    e.setOwner("ur", "Assyria");
    const near = Views.knownHolders(s, Map, "Babylonia");
    Assert.equal("Assyria", near.get("ur").owner);
    const far = Views.knownHolders(s, Map, "Egypt");
    Assert.equal("Babylonia", far.get("ur").owner);
    const v = Views.for(s, "Egypt");
    Assert.equal("Babylonia", v.owner.get("ur"));
    Assert.true(v.ownerAsOf.has("ur"));
    // Seasons later the word has come.
    for (let i = 0; i < 4; i++) season(s);
    Assert.equal("Assyria", Views.knownHolders(s, Map, "Egypt").get("ur").owner);
  });

  test("A spy caught on the road gives its master no sight of its post, and word that it has not returned", () => {
    const s = newGame(13);
    const spy = first(s.characters, (c) => c.employer === "Egypt");
    season(s, new Dict([["Egypt", newTurnSubmission({ orders: [{ type: "spy", character: spy.id, court: null, province: "carchemish" }] })]]));
    const j = first(s.journeys, (x) => x.characterId === spy.id);
    new TurnEngine(s).caughtOnRoad(j, spy, "Hatti", "gaza");
    Assert.equal("Captured", spy.status);
    Assert.false(Views.sight(s, Map, "Egypt").has("carchemish"));
    Assert.true(s.journeys.some((x) => x.kind === "Rumor" && x.to === "Egypt" && x.news === "Overdue"));
    Assert.true(inboxOf(s, "Hatti").some((i) => i.title === "A traveller is caught"));
  });
});
