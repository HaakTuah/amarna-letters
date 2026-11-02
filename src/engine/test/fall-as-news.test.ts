import { describe, test } from "vitest";
import {
  AllPowers,
  Dict,
  type GameState,
  type Power,
  TurnEngine,
  type TurnSubmission,
  WorldMap,
  EconomyData,
  KingdomFallsTitle,
  inboxOf,
  isAlive,
  newCharacter,
  newGame,
  newGameConfig,
  newGovernor,
  newId,
  newSiege,
  newTraits,
  newTurnSubmission,
  newUnit,
  OrderValidator,
  raise,
  risenOf,
  setRisen,
  travelTurns,
  unitAt,
  wallsOf,
  GameStateSchema,
  serialize,
  deserialize,
} from "@amarna/engine";
import { removeAll, Assert } from "./support.ts";

// Item 13+, Haakon's answers to item 13's review ("A kingdom falls with its capital" under War): a fallen realm comes
// apart province by province as word of the fall reaches each, life there going on as before until then, and a governor
// there rules his province with a seat of his own, the troops following him if he can pay them.
describe("FallAsNewsTests", () => {
  function season(s: GameState, orders: Dict<Power, TurnSubmission> = new Dict()): void {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
  }

  // Seed 1, no catastrophes: Assyria's army one season from Babylon's surrender; a governor of Babylonia's in Nippur with
  // an army of Babylonia's there, and a purse of `purse`.
  function babylonFalls(purse: number): { s: GameState; governor: string } {
    const s = newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }));
    removeAll(s.units, (u) => u.province === "babylon" || u.province === "nippur");
    const army = newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "babylon", men: 3000 });
    s.units.push(army);
    s.sieges.push(newSiege({ province: "babylon", power: "Assyria", unitId: army.id, progress: wallsOf(s, "babylon") * EconomyData.breachPerLevel - 1, since: 1 }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "nippur", home: "nippur", men: 1000 }));
    // One governor only, at Nippur: none of the governors of 1346 (item 17++).
    for (const g of s.governors) s.characters.find((x) => x.id === g.character)!.duty = "None";
    s.governors.length = 0;
    const c = newCharacter({ id: newId(s, "c"), name: "Ili-ippashra 2", traits: newTraits({ loyalty: 60, greed: 40, ambition: 70, courage: 50, competence: 50 }), status: "Employed", employer: "Babylonia", duty: "Governing", watchProvince: "nippur", purse });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "nippur", character: c.id, power: "Babylonia", from: 0 }));
    return { s, governor: c.id };
  }

  test("The realm stays as it was until word of the fall reaches it", () => {
    const { s } = babylonFalls(0);
    season(s);
    Assert.contains("Babylonia", s.eliminated);
    Assert.equal("Assyria", s.owner.get("babylon"));
    // Word of the fall has not reached the rest of the realm: it is Babylonia's still, its troops standing as they were.
    const arrives = travelTurns(s.config, WorldMap.default, "babylon", "sippar", s.turn);
    Assert.true(arrives >= 1);
    Assert.equal("Babylonia", s.owner.get("sippar"));
    Assert.equal("Babylonia", unitAt(s, "nippur")?.power);
    Assert.contains("comes apart as word of the fall reaches it by road", inboxOf(s, "Assyria").find((i) => i.title === KingdomFallsTitle)!.body);
  });

  test("Gold sent to a fallen capital goes to whoever holds it", () => {
    // Hatti falls to Assyria's army at Hattusa; the silver of Tuwanuwa, which word of the fall has not reached, goes to
    // Hattusa as before, and so to Assyria: against the same season with Hatti's other land held by nobody, Assyria's
    // income is the greater by it.
    const s = newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }));
    removeAll(s.units, (u) => u.province === "hattusa");
    const army = newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "hattusa", men: 3000 });
    s.units.push(army);
    s.sieges.push(newSiege({ province: "hattusa", power: "Assyria", unitId: army.id, progress: wallsOf(s, "hattusa") * EconomyData.breachPerLevel - 1, since: 1 }));
    season(s);
    Assert.contains("Hatti", s.eliminated);
    Assert.equal("Hatti", s.owner.get("tuwanuwa"));
    const without = deserialize<GameState>(GameStateSchema, serialize(GameStateSchema, s));
    for (const x of WorldMap.default.homeOf("Hatti")) if (x.id !== "hattusa") without.owner.set(x.id, null);
    new TurnEngine(without).beginTurn();
    new TurnEngine(s).beginTurn();
    const gold = (x: GameState): number => x.treasuries.get("Assyria").income + x.caravans.filter((v) => v.power === "Assyria").reduce((a, v) => a + v.gold, 0);
    Assert.true(gold(s) > gold(without), `${gold(s)} against ${gold(without)}`);
  });

  test("When the word arrives, the land falls lawless and a governor rules his province with a seat of his own", () => {
    const { s, governor } = babylonFalls(5000);
    const fell = s.turn;
    season(s);
    while (s.turn <= fell + travelTurns(s.config, WorldMap.default, "babylon", "nippur", fell)) season(s);
    // The governor of Nippur rules it in his own name, a power like any other; the troops there, paid, follow him.
    const risen = Assert.single(s.risen);
    Assert.equal(["Nippur", "nippur", "Babylonia", governor], [risen.power, risen.capital, risen.from, risen.ruler]);
    Assert.equal("Nippur", s.owner.get("nippur"));
    Assert.true(isAlive(s, "Nippur"));
    Assert.contains(AllPowers, (p) => p === "Nippur");
    Assert.equal("Nippur", unitAt(s, "nippur")?.power);
    Assert.equal(WorldMap.default.get("nippur").id, WorldMap.default.capital("Nippur").id);
    const c = s.characters.find((x) => x.id === governor)!;
    Assert.equal(["Ruling", "Nippur", 0], [c.duty, c.employer, c.purse]);
    Assert.true(s.treasuries.get("Nippur").gold > 0);
    Assert.true(s.startStrength.get("Nippur") > 0);
    Assert.contains("rule it in your own name", inboxOf(s, "Nippur").find((i) => i.title === "You rule in your own name")!.body);
    // The rest, with neither the conqueror's troops nor a governor, has fallen lawless.
    Assert.null(s.owner.get("sippar"));
    Assert.doesNotContain(s.units, (u) => u.power === "Babylonia");
    // Others hear of the new ruler as word travels from his city.
    Assert.contains(s.journeys, (j) => j.kind === "Word" && j.from === "Nippur" && (j.text ?? "").includes("A new ruler"));
    // The registry follows the saved game: a game loaded elsewhere knows the risen power again.
    const json = serialize(GameStateSchema, s);
    setRisen([]);
    Assert.null(risenOf("Nippur"));
    const loaded = deserialize<GameState>(GameStateSchema, json);
    new TurnEngine(loaded);
    Assert.equal("nippur", risenOf("Nippur")?.capital);
    // The risen power plays on: a season passes with it in the game.
    season(loaded);
    Assert.true(isAlive(loaded, "Nippur"));
  });

  test("A risen ruler may raise a levy among his own people", () => {
    const { s } = babylonFalls(5000);
    const fell = s.turn;
    season(s);
    while (s.turn <= fell + travelTurns(s.config, WorldMap.default, "babylon", "nippur", fell)) season(s);
    Assert.equal("Nippur", s.owner.get("nippur"));
    Assert.equal(["nippur"], WorldMap.default.homeOf("Nippur").map((x) => x.id));
    const v = new OrderValidator(s).validate("Nippur", newTurnSubmission({ orders: [raise("nippur", "Army")] }));
    Assert.empty(v.rejected);
  });

  test("A fallen kingdom's army waiting for the word presses no siege for its dead king", () => {
    const { s } = babylonFalls(0);
    // Babylonia's army besieging Assyria's Arbela, two seasons from its surrender when Babylon falls.
    s.walls.set("arbela", 2);
    removeAll(s.units, (u) => u.province === "arbela");
    const army = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "arbela", men: 3000 });
    s.units.push(army);
    const siege = newSiege({ province: "arbela", power: "Babylonia", unitId: army.id, progress: 2 * EconomyData.breachPerLevel - 2, since: 1 });
    s.sieges.push(siege);
    season(s);
    Assert.contains("Babylonia", s.eliminated);
    const progress = siege.progress;
    // Its army holds before the city, but the siege goes no further, and the city is not given to a king who is no more.
    season(s);
    Assert.equal(progress, siege.progress);
    Assert.equal("Assyria", s.owner.get("arbela"));
  });

  test("A governor who cannot pay the troops there rules alone, and they hear the news as the rest of the army does", () => {
    const { s } = babylonFalls(0);
    const fell = s.turn;
    season(s);
    while (s.turn <= fell + travelTurns(s.config, WorldMap.default, "babylon", "nippur", fell)) season(s);
    Assert.equal("Nippur", s.owner.get("nippur"));
    Assert.doesNotContain(s.units, (u) => u.power === "Nippur" || u.power === "Babylonia");
  });

  test("Where the conqueror's troops stand when the word arrives, the land is his", () => {
    const { s } = babylonFalls(0);
    // A walled city his troops stand before without storming it: until the word arrives it is Babylonia's still.
    s.walls.set("sippar", 2);
    removeAll(s.units, (u) => u.province === "sippar");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "sippar", men: 1000 }));
    const fell = s.turn;
    season(s);
    Assert.equal("Babylonia", s.owner.get("sippar"));
    while (s.turn <= fell + travelTurns(s.config, WorldMap.default, "babylon", "sippar", fell)) season(s);
    Assert.equal("Assyria", s.owner.get("sippar"));
  });
});
