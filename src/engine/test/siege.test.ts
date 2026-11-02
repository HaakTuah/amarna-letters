import { describe, test } from "vitest";
import { orders } from "../../llm/src/parse.ts";
import {
  Dict,
  type GameState,
  type Order,
  OrderSchema,
  OrderValidator,
  type Power,
  SiegesTitle,
  TurnEngine,
  type TurnSubmission,
  Views,
  asItStands,
  besiege,
  deserialize,
  first,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newId,
  newPlannedOrder,
  newSiege,
  newTurnSubmission,
  newUnit,
  ownedBy,
  sally,
  serialize,
  single,
  support,
  unitAt,
  wallsOf,
} from "@amarna/engine";
import { removeAll, Assert, last, subs, walled, oldWorld, heldBy } from "./support.ts";
import { siegeBoard } from "./games.ts";

// Walls and sieges (Build order item 5): walls add nothing to a battle; a move into walls not its own takes the province
// only by storming them; an army within them besieges the city, which surrenders when worn down as far as its walls are
// high, a level lower; a siege is lifted when its army leaves or is destroyed.
describe("SiegeTests", () => {
  // <summary>Seed 1 with no catastrophes, Babylonia's army in Sippar next to Suhu (walls 2 in these tests, a free city), Mitanni's in Terqa.</summary>
  function board(): GameState {
    // Suhu was Mari until item 7a's map review, which took Mari's walls away: the tests give them back.
    let s = walled(oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 }))), "suhu", 2);
    // Full stores and a stocked market (item 9+a): the city does not starve unless a test empties them.
    s.stores.set("suhu", 1000);
    s.markets.get("suhu").stock = 500;
    return s;
  }

  function season(s: GameState, orders: Dict<Power, TurnSubmission>): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
    return e;
  }

  function ordersOf(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  function notice(s: GameState, p: Power, title: string): string {
    return last(inboxOf(s, p), (i) => i.title === title && i.turn === s.turn).body;
  }

  test("A besieged city that runs out of food starves until a gate is opened from within, its walls a level lower", () => {
    let s = board();
    // Its people raise no elder of their own while the test runs (item 17, "A head rises in time").
    s.takenAt.set("suhu", s.turn + 1000);
    season(s, ordersOf("Babylonia", move("sippar", "suhu")));
    Assert.equal("Babylonia", unitAt(s, "suhu")?.power);
    Assert.null(s.owner.get("suhu"));
    Assert.empty(s.sieges);

    // First besiege season: worn down 1 of 6 (two levels, three seasons of wear each).
    season(s, ordersOf("Babylonia", besiege("suhu")));
    let siege = Assert.single(s.sieges);
    Assert.equal(["Babylonia", 1, 2], [siege.power, siege.progress, siege.since]);
    Assert.null(s.owner.get("suhu"));
    Assert.contains("Your siege of Suhu (walls 2, held by no one) has begun, and it wore the city down a step: it stands at 1 of 6.", notice(s, "Babylonia", SiegesTitle));
    Assert.contains(Views.for(s, "Babylonia").sieges, (x) => x.province === "suhu" && x.progress === 1 && x.walls === 2);

    // Its stores and market are empty: as each season begins it cannot feed its people, and after as many seasons of it as
    // its people hold out (item 17), someone opens a gate from within.
    const holds = new TurnEngine(s).gateHolds("suhu");
    let n = 0;
    while (s.owner.get("suhu") === null && n < 6) {
      s.stores.delete("suhu");
      s.markets.get("suhu").stock = 0;
      season(s, new Dict());
      n++;
    }
    Assert.equal(holds, n);
    Assert.empty(s.sieges);
    Assert.equal("Babylonia", s.owner.get("suhu"));
    Assert.equal(1, wallsOf(s, "suhu"));
    Assert.contains(`Suhu surrendered to you after a siege of ${n + 1} seasons, its people starving, a gate opened from within: it is yours, with its walls a level lower (walls 1).`, notice(s, "Babylonia", SiegesTitle));
    Assert.contains(s.events, (e) => e.kind === "siege" && e.text === `Suhu surrendered to Babylonia after a siege of ${n + 1} seasons.`);
    Assert.contains(s.events, (e) => e.signal === "siege-starved");
  });

  test("A support to hold wears the city down two steps and a cut one does not; worn through, the walls are breached", () => {
    let s = board();
    heldBy(s, "suhu", "Mitanni");
    s.walls.set("suhu", 3);
    removeAll(s.units, (u) => u.province === "terqa");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "suhu" }));
    season(s, ordersOf("Babylonia", besiege("suhu"), support("sippar", "suhu")));
    Assert.equal(2, Assert.single(s.sieges).progress);
    Assert.contains("Babylonia's army has laid siege to your city of Suhu (walls 3) and wore it down two steps, with a support: it stands at 2 of 9.", notice(s, "Mitanni", SiegesTitle));

    // The support is cut by an attack on Sippar: one step only.
    s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "nippur" }));
    season(
      s,
      subs({
        Babylonia: { orders: [support("sippar", "suhu")] },
        Assyria: { orders: [move("nippur", "sippar")] },
      }),
    );
    Assert.equal(3, Assert.single(s.sieges).progress);
    Assert.equal("Mitanni", s.owner.get("suhu"));
    // Worn to the last step, the next season breaches the walls.
    Assert.single(s.sieges).progress = 8;
    season(s, new Dict());
    Assert.equal("Babylonia", s.owner.get("suhu"));
    Assert.equal(2, wallsOf(s, "suhu"));
    Assert.contains(inboxOf(s, "Mitanni"), (i) => i.title === "Land lost" && i.body.startsWith("Suhu has surrendered to Babylonia") && i.body.endsWith("its walls breached."));
  });

  test("A siege whose army leaves is lifted and its progress lost", () => {
    let s = board();
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "suhu" }));
    s.walls.set("suhu", 3);
    season(s, ordersOf("Babylonia", besiege("suhu")));
    Assert.equal(1, Assert.single(s.sieges).progress);
    // A season in which the army supports elsewhere adds nothing, and the siege stands.
    season(s, ordersOf("Babylonia", support("suhu", "sippar")));
    Assert.equal(1, Assert.single(s.sieges).progress);
    Assert.contains("did not hold there, so the siege of Suhu (walls 3) did not advance", notice(s, "Babylonia", SiegesTitle));
    // It marches out: the siege is lifted.
    removeAll(s.units, (u) => u.province === "durkurigalzu");
    season(s, ordersOf("Babylonia", move("suhu", "durkurigalzu")));
    Assert.empty(s.sieges);
    Assert.contains("Your siege of Suhu is lifted: the besieging army marched out.", notice(s, "Babylonia", SiegesTitle));
    Assert.null(s.owner.get("suhu"));
  });

  test("A besieged city yields nothing and the besieger pays for the siege", () => {
    let s = board();
    heldBy(s, "suhu", "Mitanni");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "suhu" }));
    let e = new TurnEngine(s);
    Assert.true(e.effectiveYield("suhu") > 0);
    let upkeep = e.upkeep("Babylonia");
    season(s, ordersOf("Babylonia", besiege("suhu")));
    e = new TurnEngine(s);
    Assert.equal(0, e.effectiveYield("suhu"));
    Assert.equal(upkeep + s.config.siegeUpkeep, e.upkeep("Babylonia"));
    // The city still counts in its holder's strength.
    Assert.contains("suhu", ownedBy(s, "Mitanni"));
    Assert.equal("Mitanni", s.owner.get("suhu"));
  });

  test("A guest within walls takes nothing and an attack that drives the besieger out lifts the siege", () => {
    let s = board();
    heldBy(s, "suhu", "Mitanni");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "suhu" }));
    // Holding without a besiege order: a guest, season after season.
    season(s, new Dict());
    season(s, new Dict());
    Assert.equal("Mitanni", s.owner.get("suhu"));
    Assert.empty(s.sieges);
    // Turning on the host: a siege begins. Mitanni's army in Terqa, supported by Assyria's in Ekallate, drives it out, to
    // Dur-Kurigalzu, left empty for it to fall back to.
    season(s, ordersOf("Babylonia", besiege("suhu")));
    removeAll(s.units, (u) => u.province === "durkurigalzu");
    Assert.single(s.sieges);
    season(
      s,
      subs({
        Mitanni: { orders: [move("terqa", "suhu")] },
        Assyria: { orders: [support("ekallate", "terqa", "suhu")] },
      }),
    );
    Assert.equal("Mitanni", unitAt(s, "suhu")?.power);
    Assert.empty(s.sieges);
    Assert.equal("Mitanni", s.owner.get("suhu"));
    // Item 13: driven out, the besieging army falls back rather than being destroyed.
    Assert.contains("Your siege of Suhu is lifted: the besieging army was driven out.", notice(s, "Babylonia", SiegesTitle));
  });

  test("Only an army within walls it does not hold may besiege", () => {
    let s = board();
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Fleet", province: "gaza" }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: "sinai" }));
    let v = new OrderValidator(s);
    let r = v.validate("Egypt", newTurnSubmission({ orders: [besiege("gaza"), besiege("sinai"), besiege("memphis")] }));
    Assert.equal(
      ["only an army can besiege a city; a fleet cannot", "the Ways of Horus has no walls to besiege", "Men-nefer is yours"],
      r.rejected.map((x) => x.reason),
    );
  });

  test("A storm breaks into the city, a level lower, and the season's reckoning gives it to the stormers", () => {
    let s = board();
    s.walls.set("suhu", 1);
    // Its men gone (item 11e: a city's own men stand on its walls), its walls alone stand against two.
    s.people.get("suhu").men = 0;
    season(s, ordersOf("Babylonia", move("sippar", "suhu"), support("durkurigalzu", "sippar", "suhu")));
    Assert.equal(0, wallsOf(s, "suhu"));
    Assert.false(s.walls.has("suhu"));
    Assert.contains(s.events, (e) => e.kind === "storm" && e.text === "Babylonia stormed the walls of Suhu.");
    // Item 17++: the stormers stand within; whom it obeys is the season's rule, as the next season begins.
    Assert.equal("Babylonia", s.breached.get("suhu"));
    Assert.null(s.owner.get("suhu"));
    new TurnEngine(s).obeySeason();
    Assert.equal("Babylonia", s.owner.get("suhu"));
  });

  test("A city's own men on its walls hold off a storm its walls alone would not", () => {
    // Item 11e: Suhu (walls 1) with its men of fighting age on the walls (since item 17+ Babylonia's own old land, freed for
    // the test, so its people, by their ledger since item 17++, are less hostile to Babylonia than to a stranger: 1.2):
    // 1 + 2 x 1.2 is more than two can storm, so the army stands within the walls and the city stays free.
    let s = board();
    s.walls.set("suhu", 1);
    season(s, ordersOf("Babylonia", move("sippar", "suhu"), support("durkurigalzu", "sippar", "suhu")));
    Assert.notEqual("Babylonia", s.owner.getOrDefault("suhu", null));
    Assert.equal("Babylonia", unitAt(s, "suhu")?.power);
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.body.includes("and the city's men 1.2, the walls making them twice as strong"));
  });

  test("A besiege order kept for later follows its army and replays", () => {
    let s = board();
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "suhu" }));
    let plan = newPlannedOrder({ turn: 2, order: besiege("suhu"), unitId: unitAt(s, "suhu")!.id });
    Assert.equal(besiege("suhu"), asItStands(s, "Babylonia", plan));
    let round = deserialize<Order>(OrderSchema, serialize(OrderSchema, besiege("suhu")));
    Assert.equal(besiege("suhu"), round);
  });

  test("Walls that sally add one to an attack on the troops within them", () => {
    // Mitanni holds Suhu (walls 2); Babylonia's army besieges it. Mitanni's lone army from Terqa, with the walls' sally,
    // beats the besieger's 1 and drives it out; without the sally it bounces.
    function board(): GameState {
      let s = siegeBoard();
      heldBy(s, "suhu", "Mitanni");
      first(s.units, (u) => u.province === "sippar").province = "suhu";
      s.sieges.push(newSiege({ province: "suhu", power: "Babylonia", unitId: unitAt(s, "suhu")!.id, progress: 1, since: 1 }));
      return s;
    }
    let bounced = board();
    season(bounced, ordersOf("Mitanni", move("terqa", "suhu")));
    Assert.equal("Babylonia", unitAt(bounced, "suhu")?.power);

    let s = board();
    season(s, ordersOf("Mitanni", move("terqa", "suhu"), sally("suhu", "terqa")));
    Assert.equal("Mitanni", unitAt(s, "suhu")?.power);
    Assert.empty(s.sieges);
    Assert.contains(
      "- The walls of suhu sally in support of the attack from terqa: given",
      single(inboxOf(s, "Mitanni"), (i) => i.title === "Movements last season" && i.turn === s.turn).body,
    );
    Assert.contains(s.events, (e) => e.signal === "sally-won");

    // A sally that finds no attack is void, and walls below 2 cannot sally.
    let v = board();
    season(v, ordersOf("Mitanni", sally("suhu", "ekallate")));
    Assert.contains(
      "- The walls of suhu sally in support of the attack from ekallate: void: no unit moved from ekallate to suhu",
      single(inboxOf(v, "Mitanni"), (i) => i.title === "Movements last season" && i.turn === v.turn).body,
    );
    let low = board();
    low.walls.set("suhu", 1);
    let refused = new OrderValidator(low).validate("Mitanni", newTurnSubmission({ orders: [sally("suhu", "terqa"), sally("harran", "terqa")] }));
    Assert.equal(
      ["the walls of Suhu stand at 1: only walls of 2 or more can sally", "Harran has no walls to sally from"],
      refused.rejected.map((r) => r.reason),
    );
  });

  test("A sally over a great river needs one support more against a lone besieger", () => {
    // Mitanni holds Carchemish (walls 2); Hatti's army besieges it. Mitanni's lone army from Harran comes over the
    // Euphrates, so the besieger has the ground's help: 1 and the sally against 1 and the river bounces, as the
    // rulebook's sally example says; with a support from Isuwa, 3 against 2 drives the besieger out.
    function board(): GameState {
      let s = siegeBoard();
      s.owner.set("carchemish", "Mitanni");
      for (const at of ["carchemish", "harran", "isuwa"]) removeAll(s.units, (u) => u.province === at);
      let besieger = newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "carchemish" });
      s.units.push(besieger);
      s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "harran" }));
      s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "isuwa" }));
      s.sieges.push(newSiege({ province: "carchemish", power: "Hatti", unitId: besieger.id, progress: 1, since: 1 }));
      return s;
    }
    let bounced = board();
    season(bounced, ordersOf("Mitanni", move("harran", "carchemish"), sally("carchemish", "harran")));
    Assert.equal("Hatti", unitAt(bounced, "carchemish")?.power);

    let s = board();
    season(s, ordersOf("Mitanni", move("harran", "carchemish"), sally("carchemish", "harran"), support("isuwa", "harran", "carchemish")));
    Assert.equal("Mitanni", unitAt(s, "carchemish")?.power);
    Assert.empty(s.sieges);
  });
});
