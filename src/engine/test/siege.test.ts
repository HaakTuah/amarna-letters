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
import { removeAll, Assert, last, subs } from "./support.ts";
import { siegeBoard } from "./games.ts";

// Walls and sieges (Build order item 5): walls add nothing to a battle; a move into walls not its own takes the province
// only by storming them; an army within them besieges the city, which surrenders when worn down as far as its walls are
// high, a level lower; a siege is lifted when its army leaves or is destroyed.
describe("SiegeTests", () => {
  // <summary>Seed 1 with no catastrophes, Babylonia's army in Sippar next to Mari (walls 2, a free city), Mitanni's in Terqa.</summary>
  function board(): GameState {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
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

  test("A lone army takes walls 2 in the second season after it got in and the walls fall a level", () => {
    let s = board();
    season(s, ordersOf("Babylonia", move("sippar", "mari")));
    Assert.equal("Babylonia", unitAt(s, "mari")?.power);
    Assert.null(s.owner.get("mari"));
    Assert.empty(s.sieges);

    // First besiege season: worn down 1 of 2.
    season(s, ordersOf("Babylonia", besiege("mari")));
    let siege = Assert.single(s.sieges);
    Assert.equal(["Babylonia", 1, 2], [siege.power, siege.progress, siege.since]);
    Assert.null(s.owner.get("mari"));
    Assert.contains(
      "Your siege of Mari (walls 2, a free city) has begun, and it wore the city down a step: it stands at 1 of 2.",
      notice(s, "Babylonia", SiegesTitle),
    );
    Assert.contains(Views.for(s, "Babylonia").sieges, (x) => x.province === "mari" && x.progress === 1 && x.walls === 2);

    // One besiege order is enough: holding with no order presses the siege, and Mari surrenders.
    season(s, new Dict());
    Assert.empty(s.sieges);
    Assert.equal("Babylonia", s.owner.get("mari"));
    Assert.equal(1, wallsOf(s, "mari"));
    Assert.contains(
      "Mari surrendered to you after a siege of 2 seasons: it is yours, with its walls a level lower (walls 1).",
      notice(s, "Babylonia", SiegesTitle),
    );
    Assert.contains(s.events, (e) => e.kind === "siege" && e.text === "Mari surrendered to Babylonia after a siege of 2 seasons.");
  });

  test("A support to hold wears the city down two steps and a cut one does not", () => {
    let s = board();
    s.owner.set("mari", "Mitanni");
    s.walls.set("mari", 3);
    removeAll(s.units, (u) => u.province === "terqa");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "mari" }));
    season(s, ordersOf("Babylonia", besiege("mari"), support("sippar", "mari")));
    Assert.equal(2, Assert.single(s.sieges).progress);
    Assert.contains(
      "Babylonia's army has laid siege to your city of Mari (walls 3) and wore it down two steps, with a support: it stands at 2 of 3.",
      notice(s, "Mitanni", SiegesTitle),
    );

    // The support is cut by an attack on Sippar: one step only, and Mari surrenders at 3.
    season(
      s,
      subs({
        Babylonia: { orders: [support("sippar", "mari")] },
        Assyria: { orders: [move("ekallatum", "sippar")] },
      }),
    );
    Assert.equal("Babylonia", s.owner.get("mari"));
    Assert.equal(2, wallsOf(s, "mari"));
    Assert.contains(inboxOf(s, "Mitanni"), (i) => i.title === "Land lost" && i.body === "Mari has surrendered to Babylonia after a siege of 2 seasons.");
  });

  test("A siege whose army leaves is lifted and its progress lost", () => {
    let s = board();
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "mari" }));
    s.walls.set("mari", 3);
    season(s, ordersOf("Babylonia", besiege("mari")));
    Assert.equal(1, Assert.single(s.sieges).progress);
    // A season in which the army supports elsewhere adds nothing, and the siege stands.
    season(s, ordersOf("Babylonia", support("mari", "sippar")));
    Assert.equal(1, Assert.single(s.sieges).progress);
    Assert.contains("did not hold there, so the siege of Mari (walls 3) did not advance", notice(s, "Babylonia", SiegesTitle));
    // It marches out: the siege is lifted.
    season(s, ordersOf("Babylonia", move("mari", "damascus")));
    Assert.empty(s.sieges);
    Assert.contains("Your siege of Mari is lifted: the besieging army marched out.", notice(s, "Babylonia", SiegesTitle));
    Assert.null(s.owner.get("mari"));
  });

  test("A besieged city yields nothing and the besieger pays for the siege", () => {
    let s = board();
    s.owner.set("mari", "Mitanni");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "mari" }));
    let e = new TurnEngine(s);
    let income = e.income("Mitanni");
    let upkeep = e.upkeep("Babylonia");
    season(s, ordersOf("Babylonia", besiege("mari")));
    e = new TurnEngine(s);
    Assert.equal(income - 35, e.income("Mitanni"));
    Assert.equal(upkeep + s.config.siegeUpkeep, e.upkeep("Babylonia"));
    // The city still counts in its holder's strength.
    Assert.contains("mari", ownedBy(s, "Mitanni"));
    Assert.equal("Mitanni", s.owner.get("mari"));
  });

  test("A guest within walls takes nothing and an attack that drives the besieger out lifts the siege", () => {
    let s = board();
    s.owner.set("mari", "Mitanni");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "mari" }));
    // Holding without a besiege order: a guest, season after season.
    season(s, new Dict());
    season(s, new Dict());
    Assert.equal("Mitanni", s.owner.get("mari"));
    Assert.empty(s.sieges);
    // Turning on the host: a siege begins. Mitanni's army in Terqa, supported by Assyria's in Ekallatum, drives it out.
    season(s, ordersOf("Babylonia", besiege("mari")));
    Assert.single(s.sieges);
    season(
      s,
      subs({
        Mitanni: { orders: [move("terqa", "mari")] },
        Assyria: { orders: [support("ekallatum", "terqa", "mari")] },
      }),
    );
    Assert.equal("Mitanni", unitAt(s, "mari")?.power);
    Assert.empty(s.sieges);
    Assert.equal("Mitanni", s.owner.get("mari"));
    Assert.contains("Your siege of Mari is lifted: the besieging army is gone.", notice(s, "Babylonia", SiegesTitle));
  });

  test("Only an army within walls it does not hold may besiege", () => {
    let s = board();
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Fleet", province: "gaza" }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: "sinai" }));
    let v = new OrderValidator(s);
    let r = v.validate("Egypt", newTurnSubmission({ orders: [besiege("gaza"), besiege("sinai"), besiege("memphis")] }));
    Assert.equal(
      ["only an army can besiege a city; a fleet cannot", "Sinai has no walls to besiege", "Memphis is yours"],
      r.rejected.map((x) => x.reason),
    );
  });

  test("A storm takes the city at once a level lower", () => {
    let s = board();
    s.walls.set("mari", 1);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "damascus" }));
    season(s, ordersOf("Babylonia", move("sippar", "mari"), support("damascus", "sippar", "mari")));
    Assert.equal("Babylonia", s.owner.get("mari"));
    Assert.equal(0, wallsOf(s, "mari"));
    Assert.false(s.walls.has("mari"));
    Assert.contains(s.events, (e) => e.kind === "storm" && e.text === "Babylonia stormed the walls of Mari.");
  });

  test("A besiege order kept for later follows its army and replays", () => {
    let s = board();
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "mari" }));
    let plan = newPlannedOrder({ turn: 2, order: besiege("mari"), unitId: unitAt(s, "mari")!.id });
    Assert.equal(besiege("mari"), asItStands(s, "Babylonia", plan));
    let round = deserialize<Order>(OrderSchema, serialize(OrderSchema, besiege("mari")));
    Assert.equal(besiege("mari"), round);
  });

  test("Walls that sally add one to an attack on the troops within them", () => {
    // Mitanni holds Mari (walls 2); Babylonia's army besieges it. Mitanni's lone army from Terqa, with the walls' sally,
    // beats the besieger's 1 and drives it out; without the sally it bounces.
    function board(): GameState {
      let s = siegeBoard();
      s.owner.set("mari", "Mitanni");
      first(s.units, (u) => u.province === "sippar").province = "mari";
      s.sieges.push(newSiege({ province: "mari", power: "Babylonia", unitId: unitAt(s, "mari")!.id, progress: 1, since: 1 }));
      return s;
    }
    let bounced = board();
    season(bounced, ordersOf("Mitanni", move("terqa", "mari")));
    Assert.equal("Babylonia", unitAt(bounced, "mari")?.power);

    let s = board();
    season(s, ordersOf("Mitanni", move("terqa", "mari"), sally("mari", "terqa")));
    Assert.equal("Mitanni", unitAt(s, "mari")?.power);
    Assert.empty(s.sieges);
    Assert.contains(
      "- The walls of mari sally in support of the attack from terqa: given",
      single(inboxOf(s, "Mitanni"), (i) => i.title === "Movements last season" && i.turn === s.turn).body,
    );
    Assert.contains(s.events, (e) => e.signal === "sally-won");

    // A sally that finds no attack is void, and walls below 2 cannot sally.
    let v = board();
    season(v, ordersOf("Mitanni", sally("mari", "damascus")));
    Assert.contains(
      "- The walls of mari sally in support of the attack from damascus: void: no unit moved from damascus to mari",
      single(inboxOf(v, "Mitanni"), (i) => i.title === "Movements last season" && i.turn === v.turn).body,
    );
    let low = board();
    low.walls.set("mari", 1);
    let refused = new OrderValidator(low).validate("Mitanni", newTurnSubmission({ orders: [sally("mari", "terqa"), sally("harran", "terqa")] }));
    Assert.equal(
      ["the walls of Mari stand at 1: only walls of 2 or more can sally", "Harran has no walls to sally from"],
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
