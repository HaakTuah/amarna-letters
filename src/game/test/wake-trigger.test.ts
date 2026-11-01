import { describe, test } from "vitest";
import { orders } from "../../llm/src/parse.ts";
import {
  AttackedReason,
  Dict,
  single,
  type GameConfig,
  type GameState,
  HomelandReason,
  type Order,
  type Power,
  SiegeBegunReason,
  type SleepState,
  SurrenderReason,
  TurnEngine,
  type TurnSubmission,
  WallsReason,
  WorldMap,
  besiege,
  first,
  move,
  newGame,
  newGameConfig,
  newId,
  newOrderOutcome,
  newSleepSpell,
  newSleepState,
  newUnit,
  unitAt,
  wallsOf,
} from "@amarna/engine";
import { leaderRules } from "@amarna/llm";
import { removeAll, Assert, subs, oldWorld } from "../../engine/test/support.ts";

// The engine's wake triggers fire on a change, not on a condition that merely holds: foreign troops arriving next to the
// homeland, a siege begun or about to end. A king has no triggers of his own (removed in the fix pass after item 4).
describe("WakeTriggerTests", () => {
  const Quiet: GameConfig = newGameConfig({ endMedian: 10000, catastropheChance: 0, peopleDefence: 0 });

  // <summary>A game in which Babylonia sleeps (it gave orders in turn 1) and Sippar, next to Babylon, is Assyria's and empty.</summary>
  function sleeping(setup: ((a0: GameState) => void) | null = null): [GameState, SleepState] {
    let s = oldWorld(newGame(31, Quiet));
    removeAll(s.units, (u) => u.province === "sippar" || u.province === "suhu");
    s.owner.set("sippar", "Assyria");
    // Assyria's army from Ekallate stands in Suhu, next to Sippar (item 11f+: Ekallate no longer borders Babylonia's land).
    first(s.units, (u) => u.province === "ekallate").province = "suhu";
    setup?.(s);
    let sleep = newSleepState({ asleep: true, lastCalled: 1, wakeAt: 50, history: [newSleepSpell({ from: 2 })] });
    s.sleep.set("Babylonia", sleep);
    return [s, sleep];
  }

  // <summary>Plays one season with these orders, then begins the next and checks who wakes.</summary>
  function season(s: GameState, orders: Dict<Power, TurnSubmission>): void {
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
    let next = new TurnEngine(s);
    next.beginTurn();
    next.wakeCheck();
  }

  function assyria(...orders: Order[]): Dict<Power, TurnSubmission> {
    return subs({ Assyria: { orders: orders } });
  }

  // <summary>Asleep again, as after another set of orders, with nothing pending.</summary>
  function sleepOf(sleep: SleepState): void {
    sleep.asleep = true;
    sleep.wokenBecause.length = 0;
    sleep.history.push(newSleepSpell({ from: 3 }));
  }

  // ------------------------------------------------------------ foreign troops next to the capital (its own trigger until the siege package)

  test("Foreign troops that end a move next to the capital wake the seat once as next to its homeland", () => {
    let [s, sleep] = sleeping();
    Assert.contains("sippar", WorldMap.default.neighbors("babylon"));
    season(s, assyria(move("suhu", "sippar")));
    Assert.false(sleep.asleep);
    // Sippar is Assyria's here: the capital, a province of the homeland like any other since the siege package
    // retired its own trigger, is named with the rest.
    Assert.equal([`${HomelandReason}: Assyria's army moved suhu -> sippar, next to babylon, durkurigalzu, nippur`], sleep.wokenBecause);

    // Standing there the next season is no news: it does not wake the seat again.
    sleepOf(sleep);
    season(s, assyria());
    Assert.true(sleep.asleep);
  });

  test("A fleet arriving off a coastal capital wakes the seat", () => {
    let s = oldWorld(newGame(31, Quiet));
    let sleep = newSleepState({ asleep: true, lastCalled: 1, wakeAt: 50, history: [newSleepSpell({ from: 2 })] });
    s.sleep.set("Alashiya", sleep);
    first(s.units, (u) => u.province === "delta").province = "ugaritwaters";
    season(s, subs({ Egypt: { orders: [move("ugaritwaters", "enkomiwaters")] } }));
    Assert.equal([`${HomelandReason}: Egypt's fleet moved ugaritwaters -> enkomiwaters, next to enkomi`], sleep.wokenBecause);
  });

  test("A failed move next to the capital wakes the seat only as an attack on its troops", () => {
    // Babylon's own army stands in Sippar, and holds: the move did not arrive, but it was an attack on its troops.
    let [s, sleep] = sleeping((s) => s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "sippar" })));
    season(s, assyria(move("suhu", "sippar")));
    Assert.false(sleep.asleep);
    Assert.equal([`${AttackedReason}: Assyria's army tried to move suhu -> sippar`], sleep.wokenBecause);

    // Two of Assyria's armies bounce in its own empty Sippar: neither arrived, nor attacked Babylonia's land or troops.
    [s, sleep] = sleeping((s) => {
      removeAll(s.units, (u) => u.province === "durkurigalzu");
      s.owner.set("durkurigalzu", "Assyria");
      s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "durkurigalzu" }));
    });
    season(s, assyria(move("suhu", "sippar"), move("durkurigalzu", "sippar")));
    Assert.true(sleep.asleep);
    Assert.empty(sleep.wokenBecause);
  });

  test("A failed assault on a walled city it holds wakes the seat", () => {
    // The review's probe (Babylonia's debrief, seed 15): Mitanni's army already stands in Terqa, next to Babylon's bought
    // Suhu, when Babylon last gave orders, so no arrival wakes it. Since the siege package Mitanni's lone attack gets
    // within the walls without storming them: the city is still Babylon's, and the entry into its land wakes it.
    let [s, sleep] = sleeping((s) => {
      s.owner.set("suhu", "Babylonia");
      removeAll(s.units, (u) => u.province === "terqa" || u.province === "suhu");
      s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "terqa" }));
    });
    season(s, subs({ Mitanni: { orders: [move("terqa", "suhu")] } }));
    Assert.equal(1, wallsOf(s, "suhu"));
    Assert.equal("Babylonia", s.owner.get("suhu"));
    Assert.equal("Mitanni", unitAt(s, "suhu")?.power);
    Assert.false(sleep.asleep);
    Assert.equal(["foreign troops entered your land: Mitanni's army moved terqa -> suhu"], sleep.wokenBecause);

    // A home province with its army in it, attacked in vain: the same reason.
    [s, sleep] = sleeping((s) => {
      removeAll(s.units, (u) => ["nippur", "durkurigalzu"].includes(u.province));
      s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "nippur" }));
      s.owner.set("durkurigalzu", "Assyria");
      s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "durkurigalzu" }));
    });
    season(s, assyria(move("durkurigalzu", "nippur")));
    Assert.equal("Babylonia", s.owner.get("nippur"));
    Assert.equal([`${AttackedReason}: Assyria's army tried to move durkurigalzu -> nippur`], sleep.wokenBecause);
  });

  test("The seats own troops moving next to its capital do not wake it", () => {
    let [s, sleep] = sleeping();
    s.turn = 3;
    s.lastSeen.set("Babylonia", [
      newOrderOutcome({
        power: "Babylonia",
        unitKind: "Army",
        province: "babylon",
        order: "move",
        target: "sippar",
        succeeded: true,
        targetOwner: "Assyria",
      }),
    ]);
    new TurnEngine(s).wakeCheck();
    Assert.true(sleep.asleep);
  });

  test("Troops next to home provinces it has lost wake the seat only for the homeland it still holds", () => {
    // Nippur and Dur-Kurigalzu are Hatti's: troops coming to Dur-Kurigalzu, next to them, threaten only Babylon, which the seat
    // still holds. (Until the siege package this test took Babylon from it; a kingdom now falls with its capital.)
    let [s, sleep] = sleeping((s) => {
      for (const x of ["nippur", "durkurigalzu"]) {
        removeAll(s.units, (u) => u.province === x);
        s.owner.set(x, "Hatti");
      }
    });
    season(s, assyria(move("suhu", "sippar")));
    Assert.equal([`${HomelandReason}: Assyria's army moved suhu -> sippar, next to babylon`], sleep.wokenBecause);
  });

  // ------------------------------------------------------------ a threat to a home province or a walled city (the fix pass after item 4)

  // <summary>A game in which Alashiya sleeps (it gave orders in turn 1).</summary>
  function alashiyaAsleep(setup: ((a0: GameState) => void) | null = null): [GameState, SleepState] {
    let s = oldWorld(newGame(31, Quiet));
    setup?.(s);
    let sleep = newSleepState({ asleep: true, lastCalled: 1, wakeAt: 50, history: [newSleepSpell({ from: 2 })] });
    s.sleep.set("Alashiya", sleep);
    return [s, sleep];
  }

  function egypt(...orders: Order[]): Dict<Power, TurnSubmission> {
    return subs({ Egypt: { orders: orders } });
  }

  /** Egypt's fleet off Lukka, one open crossing from Kalavasos's waters (item 7a: each coast has its own waters). */
  const offLukka = (s: GameState): void => {
    first(s.units, (u) => u.province === "delta" && u.kind === "Fleet").province = "lukkawaters";
  };

  test("Foreign troops that end a move next to a home province wake the seat once", () => {
    // The second simulation's case (seed 7): Egypt's fleet comes beside Kalavasos, Alashiya's other province, out of
    // reach of Enkomi, its capital. Before the fix pass only an envoy at its door could have woken Alashiya then.
    let [s, sleep] = alashiyaAsleep(offLukka);
    Assert.doesNotContain("enkomi", WorldMap.default.neighbors("kalavasoswaters"));
    season(s, egypt(move("lukkawaters", "kalavasoswaters")));
    Assert.false(sleep.asleep);
    Assert.equal([`${HomelandReason}: Egypt's fleet moved lukkawaters -> kalavasoswaters, next to kalavasos`], sleep.wokenBecause);

    // Standing there the next season is no news.
    sleepOf(sleep);
    season(s, egypt());
    Assert.true(sleep.asleep);
  });

  test("Foreign troops that end a move next to a walled city it holds wake the seat", () => {
    // Babylon bought Arrapha (Suhu until item 17+ made it Babylon's own land), whose walls hold for it; Assyria's army comes
    // to Arbela, next to Arrapha and to none of Babylon's homeland (the second simulation's seed 15: no trigger woke
    // Babylonia for troops next to a bought walled city).
    let [s, sleep] = sleeping((s) => {
      s.owner.set("arrapha", "Babylonia");
      removeAll(s.units, (u) => u.province === "arrapha");
    });
    Assert.equal(1, wallsOf(s, "arrapha"));
    season(s, subs({ Assyria: { orders: [move("ashur", "arbela")] } }));
    Assert.false(sleep.asleep);
    Assert.equal([`${WallsReason}: Assyria's army moved ashur -> arbela, next to arrapha`], sleep.wokenBecause);

    // A free city's walls are not its own: the same move wakes nobody.
    [s, sleep] = sleeping((s) => removeAll(s.units, (u) => u.province === "terqa"));
    season(s, subs({ Mitanni: { orders: [move("washukanni", "terqa")] } }));
    Assert.true(sleep.asleep);
  });

  test("A move into its land wakes the seat for that alone and a lost threat wakes nobody", () => {
    // Assyria's army in Susa walks into empty Ur, next to Nippur: entering its land is the reason, not the threat to Nippur.
    let [s, sleep] = sleeping((s) => s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "susa" })));
    season(s, assyria(move("susa", "ur")));
    Assert.false(sleep.asleep);
    Assert.contains("foreign troops entered your land: Assyria's army moved susa -> ur", sleep.wokenBecause);
    Assert.doesNotContain(sleep.wokenBecause, (r) => r.startsWith(HomelandReason));

    // Kalavasos already lost: Egypt's fleet beside it is no threat to Alashiya's land.
    [s, sleep] = alashiyaAsleep((s) => (offLukka(s), s.owner.set("kalavasos", "Egypt")));
    season(s, egypt(move("lukkawaters", "kalavasoswaters")));
    Assert.true(sleep.asleep);

    // Alashiya's own fleet holds Kalavasos's waters: Egypt's move fails, and wakes it as an attack on its troops (since the
    // review of the fix pass after item 4; before, an attack that did not get in waited in the digest), not as a threat.
    [s, sleep] = alashiyaAsleep((s) => (offLukka(s), (first(s.units, (u) => u.province === "enkomi").province = "kalavasoswaters")));
    season(s, egypt(move("lukkawaters", "kalavasoswaters")));
    Assert.equal([`${AttackedReason}: Egypt's fleet tried to move lukkawaters -> kalavasoswaters`], sleep.wokenBecause);
  });

  test("The rulebook says that troops next to the homeland or a walled city wake a king", () => {
    let rules = leaderRules(true, newGameConfig());
    Assert.contains(
      "an envoy at your door; foreign troops entering or attacking your land or your troops, or arriving next to your homeland or a walled city you hold; a siege of a city of yours begun, or about to make it surrender; land or troops lost",
      rules,
    );
    Assert.contains(
      "- Foreign troops wake you when they move into your land or against your troops, whether or not the move succeeds, and when they end a move in a province next to a province of your homeland or a walled city you hold, while you hold it (troops there can get into it the next season: take it if it has no walls, or stand within them and besiege it). Troops that only stay where they are do not wake you again, nor do troops raised by a levy. A siege of a city of yours wakes you in the season after it begins, and again when the city would surrender at the end of the season if the besiegers just hold: the last season to break the siege.",
      rules,
    );
  });

  test("A siege of its city wakes the seat when it begins and when the city would surrender this season", () => {
    // Assyria's army stands within Babylon's walls (3) as the seat sleeps, and turns on it: the siege begins.
    let [s, sleep] = sleeping((s) => {
      removeAll(s.units, (u) => u.province === "babylon");
      s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "babylon" }));
      // Full granaries (item 9+a): the city does not starve while the test wears it down.
      s.stores.set("babylon", 5000);
    });
    season(s, assyria(besiege("babylon")));
    Assert.equal([`${SiegeBegunReason}: Assyria's army besieges babylon (walls 3), worn down 1 of 9`], sleep.wokenBecause);

    // Worn down nearly through (since item 9+a, three seasons a level), it would be breached at the end of the next season
    // if the besiegers just hold: the last chance.
    sleepOf(sleep);
    single(s.sieges).progress = 7;
    season(s, assyria());
    Assert.equal([`${SurrenderReason}: Assyria's army besieges babylon (walls 3), worn down 8 of 9`], sleep.wokenBecause);
  });
});
