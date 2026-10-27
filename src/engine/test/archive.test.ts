import { describe, test } from "vitest";
import { text } from "../../llm/src/schemas.ts";
import {
  AllPowers,
  ArchiveTakenTitle,
  type Character,
  Dict,
  type GameState,
  type Order,
  type Power,
  type Tablet,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  cede,
  first,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newId,
  newMindReply,
  newTablet,
  newTabletCopy,
  newTurnSubmission,
  newUnit,
  single,
} from "@amarna/engine";
import { removeAll, Assert } from "./support.ts";

// <summary>Tablets are objects in a place: archives at the capital, copied by spies, taken with the capital.</summary>
describe("ArchiveTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    for (const r of e.mindRequests) e.fulfil(r, newMindReply({ text: `[${r.task}]` }));
    return e;
  }

  function orders(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  function advance(s: GameState, seasons: number): void {
    for (let i = 0; i < seasons; i++) begin(s).resolve(new Dict<Power, TurnSubmission>());
  }

  // <summary>A tablet two courts sealed, with a copy in each one's archive.</summary>
  function sealed(s: GameState, id: string, a: Power, b: Power, turn: number, text: string): Tablet {
    let t = newTablet({ id: id, text: text, proposedBy: a, partner: b, seals: [a, b], createdTurn: turn, sealedTurn: turn });
    s.tablets.push(t);
    s.copies.push(newTabletCopy({ id: newId(s, "k"), tabletId: id, holder: a, acquiredTurn: turn, source: "sealed at audience" }));
    s.copies.push(newTabletCopy({ id: newId(s, "k"), tabletId: id, holder: b, acquiredTurn: turn, source: "brought home by your envoy" }));
    return t;
  }

  // <summary>A Babylonian spy of the highest skill already posted at the court of Assyria.</summary>
  function spyAtAssyria(seed: number = 8): [GameState, Character] {
    let s = newGame(seed, newGameConfig({ catastropheChance: 0 }));
    let spy = first(s.characters, (c) => c.employer === "Babylonia");
    spy.secretMaster = null;
    spy.traits.competence = 100;
    [spy.duty, spy.at, spy.missionTarget] = ["SpyPosted", "Assyria", "Assyria"];
    return [s, spy];
  }

  function holdersOf(s: GameState, tabletId: string): Power[] {
    return s.copies.filter((k) => k.tabletId === tabletId).map((k) => k.holder);
  }

  test("A spy copies a tablet from the archive it watches and the copy comes home with its report", () => {
    // Seed 1: with save version 7's dice, seed 8's watchmen catch the spy in its first season.
    let [s, spy] = spyAtAssyria(1);
    sealed(s, "t900", "Assyria", "Hatti", 1, "Assyria and Hatti swear to stand together against Babylonia.");

    begin(s).resolve(new Dict<Power, TurnSubmission>());
    let journey = single(s.journeys, (j) => j.kind === "SpyReport" && j.characterId === spy.id);
    Assert.equal(["t900"], journey.report!.tabletIds);
    // Copied, not yet home: the copy travels with the report.
    Assert.doesNotContain("Babylonia", holdersOf(s, "t900"));
    Assert.contains(spy.memory, (m) => m.text.startsWith("I copied a tablet from the archive of Assyria"));

    while (s.journeys.includes(journey)) advance(s, 1);
    let copy = single(s.copies, (k) => k.tabletId === "t900" && k.holder === "Babylonia");
    Assert.equal(`copied from the archive of Assyria by your spy ${spy.name}`, copy.source);
    let report = first(inboxOf(s, "Babylonia"), (i) => i.kind === "SpyReport");
    Assert.contains(
      `[With this report came copies ${spy.name} made in the archive of Assyria, now in your archive: the tablet sealed by Assyria and Hatti, dated turn 1 (your copy ${copy.id}).]`,
      report.body,
    );
    Assert.contains(Views.for(s, "Babylonia").tablets, (t) => t.copyId === copy.id && t.text.includes("against Babylonia"));
    Assert.contains(s.events, (e) => e.signal === "archive-copied" && e.visibleTo.join() === "Babylonia");

    // Nobody else learns of it: Assyria and Hatti keep their one copy each, no other court gains one, and nobody is told.
    Assert.equal(["Assyria", "Hatti", "Babylonia"], holdersOf(s, "t900"));
    for (const p of AllPowers.filter((p) => p !== "Babylonia"))
      Assert.doesNotContain(inboxOf(s, p), (i) => i.body.includes("archive") || i.body.includes(copy.id));
  });

  test("A spy copies one tablet a season never one its master holds agreements and the newest first", () => {
    // Seed 1: with save version 7's dice, seed 8's watchmen catch the spy in its first season.
    let [s, spy] = spyAtAssyria(1);
    sealed(s, "t900", "Assyria", "Hatti", 1, "The oldest treaty.");
    sealed(s, "t901", "Assyria", "Babylonia", 2, "A treaty Babylonia holds already.");
    sealed(s, "t902", "Assyria", "Egypt", 3, "The newest treaty.");
    // A tablet with one seal comes after every agreement, however new.
    s.tablets.push(newTablet({ id: "t903", text: "A note.", proposedBy: "Hatti", seals: ["Hatti"], createdTurn: 4, sealedTurn: 4 }));
    s.copies.push(newTabletCopy({ id: newId(s, "k"), tabletId: "t903", holder: "Assyria", acquiredTurn: 4, source: "test" }));

    let order = [];
    for (let i = 0; i < 5; i++) {
      begin(s).resolve(new Dict<Power, TurnSubmission>());
      let sent = s.journeys.filter((j) => j.kind === "SpyReport" && j.report!.observedTurn === s.turn - 1).flatMap((j) => j.report!.tabletIds);
      Assert.true(sent.length <= 1);
      order.push(...sent);
    }
    Assert.equal(["t902", "t900", "t903"], order);
    advance(s, 3);
    Assert.single(s.copies, (k) => k.tabletId === "t901" && k.holder === "Babylonia");
    Assert.all(["t900", "t902", "t903"], (t) => Assert.single(s.copies, (k) => k.tabletId === t && k.holder === "Babylonia"));
  });

  test("A spy turned by the court it watches copies nothing and a clumsy one copies seldom", () => {
    let [s, spy] = spyAtAssyria();
    sealed(s, "t900", "Assyria", "Hatti", 1, "A treaty.");
    spy.secretMaster = "Assyria";
    spy.poisonText = "All is quiet.";
    advance(s, 6);
    Assert.doesNotContain("Babylonia", holdersOf(s, "t900"));
    Assert.all(
      s.journeys.filter((j) => j.report !== null),
      (j) => Assert.empty(j.report!.tabletIds),
    );

    // Skill is the chance: a spy of no skill never copies.
    let [s2, clumsy] = spyAtAssyria();
    sealed(s2, "t900", "Assyria", "Hatti", 1, "A treaty.");
    clumsy.traits.competence = 0;
    advance(s2, 6);
    Assert.doesNotContain("Babylonia", holdersOf(s2, "t900"));
  });

  // <summary>Assyria's capital, empty, with a Babylonian army one move from it.</summary>
  function babyloniaNextToAshur(): [GameState, string, string] {
    let s = newGame(3, newGameConfig({ catastropheChance: 0 }));
    let map = WorldMap.default;
    let capital = map.capital("Assyria").id;
    let from = first(map.movesFrom("Army", capital), (x) => !map.get(x).isSea && map.get(x).home === "Assyria");
    removeAll(s.units, (u) => u.province === capital || u.province === from);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: from }));
    // Ashur with its walls thrown down, for the test: a lone army walks in and takes it.
    s.walls.delete(capital);
    return [s, capital, from];
  }

  test("Whoever takes a capital gains copies of its archive and its king keeps his own", () => {
    let [s, capital, from] = babyloniaNextToAshur();
    sealed(s, "t900", "Assyria", "Hatti", 1, "Assyria and Hatti swear peace.");
    sealed(s, "t901", "Assyria", "Babylonia", 1, "Assyria and Babylonia swear peace.");
    // A tablet Hatti holds, not Assyria: not in Assyria's archive.
    sealed(s, "t902", "Hatti", "Egypt", 1, "Hatti and Egypt swear peace.");

    begin(s).resolve(orders("Babylonia", move(from, capital)));
    Assert.equal("Babylonia", s.owner.get(capital));

    let taken = s.copies.filter((k) => k.holder === "Babylonia" && k.tabletId === "t900");
    Assert.single(taken);
    Assert.equal(`taken with the archive of Assyria at ${WorldMap.default.get(capital).name}`, taken[0].source);
    // What it held already it does not gain twice; what Assyria never held is not in its archive.
    Assert.single(s.copies, (k) => k.holder === "Babylonia" && k.tabletId === "t901");
    Assert.doesNotContain("Babylonia", holdersOf(s, "t902"));
    // Assyria keeps its own copies; no other court gains any.
    Assert.equal(["Assyria", "Hatti", "Babylonia"], holdersOf(s, "t900"));

    let notice = single(inboxOf(s, "Babylonia"), (i) => i.title === ArchiveTakenTitle);
    Assert.equal(
      `With ${WorldMap.default.get(capital).name} you took the archive of Assyria: copies of 1 tablet you did not hold are now in your archive: the tablet sealed by Assyria and Hatti, dated turn 1 (your copy ${taken[0].id}).`,
      notice.body,
    );
    // Read next season, with the rest of the season's news.
    Assert.equal(s.turn, notice.turn);
    for (const p of AllPowers.filter((p) => p !== "Babylonia")) Assert.doesNotContain(inboxOf(s, p), (i) => i.title === ArchiveTakenTitle);
    Assert.contains(s.events, (e) => e.signal === "archive-taken" && e.visibleTo.join() === "Babylonia");
  });

  test("Land that is not a capital holds no archive and a capital ceded gives its archive as one taken", () => {
    let [s, capital, from] = babyloniaNextToAshur();
    sealed(s, "t900", "Assyria", "Hatti", 1, "Assyria and Hatti swear peace.");
    // Babylonia takes a province of Assyria's homeland that is not its capital: no archive there.
    let other = first(
      WorldMap.default.movesFrom("Army", from),
      (x) => x !== capital && WorldMap.default.get(x).home === "Assyria" && !WorldMap.default.get(x).capital,
    );
    removeAll(s.units, (u) => u.province === other);
    begin(s).resolve(orders("Babylonia", move(from, other)));
    Assert.equal("Babylonia", s.owner.get(other));
    Assert.doesNotContain("Babylonia", holdersOf(s, "t900"));
    Assert.doesNotContain(inboxOf(s, "Babylonia"), (i) => i.title === ArchiveTakenTitle);

    // Ashur is Babylonia's (given to it, for the test), and Assyria falls with it as the season resolves; Babylonia cedes
    // the city to Egypt that season: the archive lies in the city, and Egypt gains copies of it. (A king cannot cede his
    // own capital since the siege package.)
    s.owner.set(capital, "Babylonia");
    begin(s).resolve(orders("Babylonia", cede(capital, "Egypt")));
    Assert.contains("Assyria", s.eliminated);
    Assert.equal("Egypt", s.owner.get(capital));
    Assert.single(s.copies, (k) => k.holder === "Egypt" && k.tabletId === "t900");
    Assert.single(inboxOf(s, "Egypt"), (i) => i.title === ArchiveTakenTitle);
    Assert.single(s.copies, (k) => k.holder === "Assyria" && k.tabletId === "t900");
  });

  test("An empty archive is said to be empty", () => {
    // (Until the siege package this test also had Assyria retake its capital and gain nothing from its own archive; a
    // kingdom now falls with its capital, so there is no king left to retake it.)
    let [s, capital, from] = babyloniaNextToAshur();
    begin(s).resolve(orders("Babylonia", move(from, capital)));
    Assert.equal(
      "With " + WorldMap.default.get(capital).name + " you took the archive of Assyria; it held no tablet you did not hold already.",
      single(inboxOf(s, "Babylonia"), (i) => i.title === ArchiveTakenTitle).body,
    );
    Assert.contains("Assyria", s.eliminated);
  });
});
