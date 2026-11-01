import { describe, test } from "vitest";
import { scriptSeats } from "./small-world.ts";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { Contingencies } from "../src/bots/contingencies.ts";
import { MilitaryPlan } from "../src/bots/tactics.ts";
import {
  AllPowers,
  type AudienceView,
  Dict,
  type GameConfig,
  type GameState,
  GameStateSchema,
  type HostReply,
  type InboxItem,
  LostTroopsTitle,
  type Order,
  type Power,
  type SeatView,
  type StandingOrder,
  type StandingRequest,
  TurnEngine,
  type TurnSubmission,
  Views,
  disband,
  first,
  hash,
  hold,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newHostReply,
  newId,
  newStandingRequest,
  newTurnSubmission,
  newUnit,
  season,
  standingFiredTitle,
  sum,
  support,
  unitAt,
  unitOf,
} from "@amarna/engine";
import { GameLog, GameRunner, type ISeat, ScriptLeader, ScriptMind, TemplateNarrator } from "@amarna/game";
import { type CallSpec, type JsonAsker, type JsonObject, LlmLeaderSeat, leaderRules, situation } from "@amarna/llm";
import { removeAll, Assert, armiesBefore13, commanded, firstOrNull, toDict, unruled } from "../../engine/test/support.ts";

// Standing orders for every seat (the owner's additions to the fix pass after item 4, "Every feature is every seat's"):
// a seat that gives orders every season (script, human, or a model or file seat with sleep off) keeps standing orders as
// a sleeping one does; one that fires replaces the season's orders for its units; script kings give them where they make
// sense; and the rulebook and schema offer them to every king.
describe("StandingForEverySeatTests", () => {
  // <summary>A seat that plays every season and does what it is told (nothing, by default).</summary>
  class Awake implements ISeat {
    readonly #decide: ((a0: SeatView) => TurnSubmission) | null;
    constructor(decide: ((a0: SeatView) => TurnSubmission) | null = null) {
      this.#decide = decide;
    }
    views: SeatView[] = [];
    get label(): string {
      return "Awake";
    }

    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      this.views.push(view);
      return Promise.resolve(this.#decide?.(view) ?? newTurnSubmission());
    }

    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  // The people do not resist (item 11e: the land's men stand beside its troop), so the blows these tests set up land as meant.
  const Quiet: GameConfig = newGameConfig({ endMedian: 10000, catastropheChance: 0, peopleDefence: 0 });

  // <summary>Suhu is Assyria's, its walls gone, with an Assyrian army in it: two Assyrian armies stand next to Dur-Kurigalzu.</summary>
  function assyriaInMari(s: GameState): void {
    // Suhu's own city-state gone (item 11+), its land Assyria's.
    unruled(s, "suhu");
    s.walls.delete("suhu");
    s.owner.set("suhu", "Assyria");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "suhu" }));
  }

  // The armies as before item 13, each of Babylon's and Assyria's with a commander, so their standing orders fire wherever they stand.
  const before13 = (s: GameState): GameState => commanded(armiesBefore13(s), "Babylonia", "Assyria");

  async function play(
    babylon: ISeat,
    assyria: ISeat,
    turns: number,
    config: GameConfig | null = null,
    setup: ((a0: GameState) => void) | null = null,
  ): Promise<GameRunner> {
    let state = before13(newGame(31, config ?? Quiet));
    setup?.(state);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Babylonia" ? babylon : p === "Assyria" ? assyria : new Awake()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    for (let i = 0; i < turns && !state.ended; i++) await runner.playTurn();
    return runner;
  }

  // <summary>Assyria attacks the army in Dur-Kurigalzu in turn 2, from Ekallate with Suhu's support: two against one.</summary>
  function assyriaStrikesDurKurigalzu(): Awake {
    return new Awake((v) =>
      v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "durkurigalzu"), support("suhu", "ekallate", "durkurigalzu")] }) : newTurnSubmission(),
    );
  }

  function attacked(province: string, ...orders: Order[]): StandingRequest {
    return newStandingRequest({ when: "UnitAttacked", province: province, orders: orders });
  }

  function standingOf(s: GameState, p: Power): StandingOrder[] {
    return s.standing.tryGet(p)?.orders ?? [];
  }

  function notice(s: GameState, p: Power, title: string): InboxItem {
    return Assert.single(inboxOf(s, p), (i) => i.title === title);
  }

  test.each([[true], [false]] as const)(
    "A seat that plays every season keeps standing orders and one fires in place of its orders %s",
    async (sleepingSeats: boolean) => {
      // Babylonia plays every season (with sleeping seats on or off: it cannot sleep). In turn 1 it leaves a standing order:
      // when the army in Dur-Kurigalzu is attacked, the army in Sippar supports it holding. In turn 2 it orders that army to
      // Nippur, and Assyria strikes Dur-Kurigalzu two against one: the standing order replaces the march, and Dur-Kurigalzu holds.
      let babylon = new Awake((v) =>
        v.turn === 1
          ? newTurnSubmission({ standing: [attacked("durkurigalzu", support("sippar", "durkurigalzu"))] })
          : v.turn === 2
            ? newTurnSubmission({ orders: [move("sippar", "nippur")] })
            : newTurnSubmission(),
      );
      let r = await play(babylon, assyriaStrikesDurKurigalzu(), 2, { ...Quiet, sleepingSeats: sleepingSeats }, assyriaInMari);

      Assert.empty(r.state.sleep);
      Assert.equal("Babylonia", unitAt(r.state, "durkurigalzu")?.power);
      Assert.equal("Babylonia", unitAt(r.state, "sippar")?.power);
      Assert.null(unitAt(r.state, "nippur"));
      Assert.empty(standingOf(r.state, "Babylonia"));
      // Its view in turn 2 listed it, as a sleeping seat's does.
      Assert.equal("s1", Assert.single(babylon.views[1].standing).id);
      Assert.contains(
        "- s1: when your army now in durkurigalzu is attacked, then: the army now in sippar supports the army now in durkurigalzu holding",
        situation(babylon.views[1]),
      );
      // Its header points to the rulebook, which says that its orders replace those the king gives in the season it fires
      // (the follow-up's review; the explanation moved to the rulebook's fixed part in item 6b).
      Assert.contains("YOUR STANDING ORDERS (see STANDING ORDERS):", situation(babylon.views[1]));
      Assert.contains(
        "When it fires, its orders replace your other orders that season for the same units or people, those you give that season among them",
        leaderRules(true, newGameConfig()),
      );
      Assert.equal(
        "Your standing order s1 (when your army in durkurigalzu is attacked) fired in turn 2: Assyria's army set out from ekallate for durkurigalzu. It gave these orders: sippar supports durkurigalzu holding. They replaced these orders you gave for turn 2: sippar -> nippur.",
        notice(r.state, "Babylonia", standingFiredTitle("s1")).body,
      );
      Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.kind === "Rejected");

      // The game replays exactly from its log (from the same starting position).
      let start = before13(newGame(31, { ...Quiet, sleepingSeats: sleepingSeats }));
      assyriaInMari(start);
      let replay = Object.assign(new GameRunner(start, r.seats, new ScriptMind(), new TemplateNarrator(), { replay: GameLog.fromJsonl(r.log.toJsonl()) }), {
        writeChronicles: false,
      });
      await replay.prepare();
      for (let i = 0; i < 2; i++) await replay.playTurn();
      Assert.equal(hash(GameStateSchema, r.state), hash(GameStateSchema, replay.state));
    },
  );

  test("Cancelled in its season a standing order lets the seat s own orders run", async () => {
    let babylon = new Awake((v) =>
      v.turn === 1
        ? newTurnSubmission({ standing: [attacked("durkurigalzu", support("sippar", "durkurigalzu"))] })
        : v.turn === 2
          ? newTurnSubmission({ orders: [move("sippar", "nippur")], cancelStanding: ["s1"] })
          : newTurnSubmission(),
    );
    let r = await play(babylon, assyriaStrikesDurKurigalzu(), 2, undefined, assyriaInMari);
    Assert.equal("Assyria", unitAt(r.state, "durkurigalzu")?.power);
    Assert.equal("Babylonia", unitAt(r.state, "nippur")?.power);
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.title === standingFiredTitle("s1"));
    Assert.empty(standingOf(r.state, "Babylonia"));
  });

  test("A standing order answers a move as ordered even one the mover s own standing order turns aside", async () => {
    // The follow-up's review: standing orders answer the moves as ordered, before any standing order fires, so one may
    // answer a move that its mover's own standing order then replaces. The rulebook says so. In turn 2 Assyria orders
    // Ekallate's army into Dur-Kurigalzu, but Babylonia's army in Dur-Kurigalzu attacks Suhu, and Assyria's standing order turns
    // Ekallate's army to support Suhu holding. Babylonia's standing order still fires on the march into Dur-Kurigalzu.
    let babylon = new Awake((v) =>
      v.turn === 1
        ? newTurnSubmission({ standing: [attacked("durkurigalzu", support("sippar", "durkurigalzu"))] })
        : v.turn === 2
          ? newTurnSubmission({ orders: [move("durkurigalzu", "suhu")] })
          : newTurnSubmission(),
    );
    let assyria = new Awake((v) =>
      v.turn === 1
        ? newTurnSubmission({ standing: [attacked("suhu", support("ekallate", "suhu"))] })
        : v.turn === 2
          ? newTurnSubmission({ orders: [move("ekallate", "durkurigalzu"), support("suhu", "ekallate", "durkurigalzu")] })
          : newTurnSubmission(),
    );
    let r = await play(babylon, assyria, 2, undefined, assyriaInMari);

    // Ekallate's army never set out; Babylonia's attack on Suhu met two and bounced.
    Assert.equal("Assyria", unitAt(r.state, "ekallate")?.power);
    Assert.equal("Assyria", unitAt(r.state, "suhu")?.power);
    Assert.equal("Babylonia", unitAt(r.state, "durkurigalzu")?.power);
    Assert.startsWith(
      "Your standing order s1 (when your army in suhu is attacked) fired in turn 2: Babylonia's army set out from durkurigalzu for suhu. It gave these orders: ekallate supports suhu holding. They replaced these orders you gave for turn 2: ekallate -> durkurigalzu.",
      notice(r.state, "Assyria", standingFiredTitle("s1")).body,
    );
    // Babylonia's fired all the same, on the move as Assyria ordered it.
    Assert.startsWith(
      "Your standing order s1 (when your army in durkurigalzu is attacked) fired in turn 2: Assyria's army set out from ekallate for durkurigalzu. It gave these orders: sippar supports durkurigalzu holding.",
      notice(r.state, "Babylonia", standingFiredTitle("s1")).body,
    );
    Assert.empty(standingOf(r.state, "Babylonia"));
  });

  test("The stand in neither gives nor cancels the standing orders of a seat that plays every season", () => {
    // A model seat with sleeping seats off whose call failed: the script king's orders stand in for the season, but its
    // standing orders and cancellations are not the seat's.
    let s = newGame(31, { ...Quiet, sleepingSeats: false });
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", newTurnSubmission({ standing: [attacked("durkurigalzu", hold("durkurigalzu"))] })]]));
    Assert.equal("s1", Assert.single(standingOf(s, "Babylonia")).id);

    e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", newTurnSubmission({ fromFallback: true, standing: [attacked("babylon", hold("babylon"))], cancelStanding: ["all"] })]]));
    Assert.equal("s1", Assert.single(standingOf(s, "Babylonia")).id);
  });

  test("The standing orders of a seat that plays every season go with its lost troops", () => {
    let s = newGame(31, { ...Quiet, sleepingSeats: false });
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        [
          "Babylonia",
          newTurnSubmission({ standing: [attacked("sippar", hold("babylon")), attacked("babylon", hold("babylon"), support("sippar", "babylon"))] }),
        ],
      ]),
    );
    removeAll(s.units, (u) => u.province === "sippar");
    e = new TurnEngine(s);
    e.beginTurn();
    e.wakeCheck();
    let left = Assert.single(standingOf(s, "Babylonia"));
    Assert.equal(["s2", 1], [left.id, left.orders.length]);
    Assert.endsWith(
      ":\n- standing order s1 (when your unit that stood in sippar is attacked)\n- from standing order s2: sippar supports babylon holding",
      notice(s, "Babylonia", LostTroopsTitle).body,
    );
  });

  test("Every king reads how standing orders work and may give them", () => {
    let off = { ...Quiet, sleepingSeats: false };
    let rules = leaderRules(true, off);
    Assert.doesNotContain("YOU SLEEP BETWEEN YOUR ORDERS", rules);
    Assert.contains("STANDING ORDERS (standing_orders; every king may give them)", rules);
    Assert.contains(
      '- When it fires, its orders replace your other orders that season for the same units or people, those you give that season among them: give your units their orders as usual, and a standing order changes them only if the move it waits for comes. To stop one from firing, cancel it (cancel_standing, by id or "all"); cancelled in a season, it does not fire in that season.',
      rules,
    );
    Assert.contains(
      "Then each standing order that fires (see STANDING ORDERS) answers the moves just ordered and puts its orders in place of yours for the same units or people.",
      rules,
    );
    // The same section for a king that sleeps, which also reads how standing orders go with his schedule and his sleep.
    let on = leaderRules(true, Quiet);
    Assert.contains("STANDING ORDERS (standing_orders; every king may give them)", on);
    Assert.contains("- Standing orders (see STANDING ORDERS) keep answering while you sleep", on);
    Assert.true(on.indexOf("MOVEMENT AND COMBAT") < on.indexOf("STANDING ORDERS ("));
  });

  // <summary>A model king with sleep off that leaves a standing order in turn 1 and holds after.</summary>
  class Modelled implements JsonAsker {
    specs: CallSpec[] = [];

    askJson(spec: CallSpec, ct: AbortSignal): Promise<JsonObject> {
      this.specs.push(spec);
      let json =
        spec.key === "t1/orders/Babylonia"
          ? `{"notes":"Guard Dur-Kurigalzu.","summary":"","ledger":[],"units":[],"command":[],"letters":[],"other_orders":[],"standing_orders":[{"when":"unit_attacked","province":"durkurigalzu","power":"","units":[{"unit":"sippar","order":"support","target":"durkurigalzu","to":""}],"other_orders":[]}],"cancel_standing":[]}`
          : spec.key.includes("/orders/")
            ? `{"notes":"Hold.","summary":"","ledger":[],"units":[],"command":[],"letters":[],"other_orders":[],"standing_orders":[],"cancel_standing":[]}`
            : `{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}`;
      return Promise.resolve(JSON.parse(json)!);
    }
  }

  test("A model king with sleep off gives a standing order that fires", async () => {
    let off = { ...Quiet, sleepingSeats: false };
    let model = new Modelled();
    let seat = new LlmLeaderSeat("Babylonia", model, "claude-sonnet-5-5", "medium", true, off);
    let r = await play(seat, assyriaStrikesDurKurigalzu(), 2, off, assyriaInMari);
    Assert.equal("Babylonia", unitAt(r.state, "durkurigalzu")?.power);
    Assert.startsWith(
      "Your standing order s1 (when your army in durkurigalzu is attacked) fired in turn 2:",
      notice(r.state, "Babylonia", standingFiredTitle("s1")).body,
    );
    // Its schema offers standing orders but no schedule, and its request names them.
    let spec = first(model.specs, (x) => x.key === "t1/orders/Babylonia");
    Assert.contains('"standing_orders"', JSON.stringify(spec.schema));
    Assert.doesNotContain('"schedule"', JSON.stringify(spec.schema));
    Assert.endsWith("standing orders, and anything else.", spec.user.trimEnd());
  });

  // ------------------------------------------------------------ script kings

  function read(s: GameState, me: Power): [Board, Brain] {
    let v = Views.for(s, me);
    let brain = new Brain(me, 9);
    brain.learn(v, new Board(v));
    return [new Board(v), brain];
  }

  // <summary>A plan in which every troop of the king's holds, with the changes given.</summary>
  function holding(b: Board, ...changes: Order[]): MilitaryPlan {
    let plan = new MilitaryPlan();
    for (const u of b.mine) plan.orders.set(u.province, hold(u.province));
    for (const o of changes) plan.orders.set(unitOf(o)!, o);
    return plan;
  }

  test("A script king guards a troop that could be struck by more than it holds alone", () => {
    // Two Assyrian armies stand next to Dur-Kurigalzu, in Ekallate and Suhu: one support holds it against both. The army in
    // Sippar, which holds this season and guards less than the army in the capital, is to give it if Dur-Kurigalzu is
    // attacked.
    let s = before13(newGame(31, Quiet));
    assyriaInMari(s);
    let [b, brain] = read(s, "Babylonia");
    let [cancel, give] = Contingencies.plan(b, brain, holding(b), []);
    Assert.empty(cancel);
    let durkurigalzu = Assert.single(give, (g) => g.place === "durkurigalzu");
    Assert.equal(["Troop", "UnitAttacked"], [durkurigalzu.kind, durkurigalzu.request.when]);
    Assert.equal([support("sippar", "durkurigalzu")], durkurigalzu.request.orders);
    // A troop that marches this season is no helper, since its place next season is not known: with Sippar's army on the
    // march, the army in Nippur then.
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "nippur" }));
    [b, brain] = read(s, "Babylonia");
    [, give] = Contingencies.plan(b, brain, holding(b, move("sippar", "babylon")), []);
    Assert.equal([support("nippur", "durkurigalzu")], Assert.single(give, (g) => g.place === "durkurigalzu").request.orders);
    removeAll(s.units, (u) => u.province === "nippur");
    // With one army next to it, Dur-Kurigalzu holds alone: no standing order for it.
    removeAll(s.units, (u) => u.province === "suhu");
    [b, brain] = read(s, "Babylonia");
    [, give] = Contingencies.plan(b, brain, holding(b), []);
    Assert.doesNotContain(give, (g) => g.place === "durkurigalzu");
  });

  test("A script king sends a troop into an empty home province as a lone attacker does", () => {
    // The opening: the Assyrian army in Ekallate, which Babylon sees, is two moves from its empty Nippur (by Dur-Kurigalzu)
    // and next to Dur-Kurigalzu, which one army alone cannot take. The army in Dur-Kurigalzu, the least
    // threatened troop next to Nippur by what it guards, is to march in if foreign troops do.
    // Nippur's old walls (1 since item 15) left out: the rule is the empty province's.
    let s = before13(newGame(31, Quiet));
    s.walls.delete("nippur");
    let [b, brain] = read(s, "Babylonia");
    let [, give] = Contingencies.plan(b, brain, holding(b), []);
    // Suhu, Babylon's own empty land since item 17+, gets a guard of its own; Nippur's is the one under test.
    let g = Assert.single(give, (x) => x.place === "nippur");
    Assert.equal(["Empty", "nippur", "UnitEnters", null], [g.kind, g.place, g.request.when, g.request.power]);
    Assert.equal([move("durkurigalzu", "nippur")], g.request.orders);
    // Not if the plan has another troop support it holding: its supports would be lost when it moves.
    let s2 = before13(newGame(31, Quiet));
    s2.walls.delete("nippur");
    let e = new TurnEngine(s2);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", newTurnSubmission({ standing: give.filter((x) => x.place === "nippur").map((x) => x.request) })]]));
    [b, brain] = read(s2, "Babylonia");
    let [cancel] = Contingencies.plan(b, brain, holding(b, support("babylon", "durkurigalzu")), []);
    Assert.equal(["s1", "needed at home"], Assert.single(cancel));
  });

  test("A script king s fleet at sea with nothing to help it slips away as the blow falls", () => {
    // Alashiya's fleet in Kalavasos's waters, next to Egypt's fleets off Lukka and off Kizzuwatna; its armies hold
    // Kalavasos and Enkomi, and no army can help a fleet at sea. Enkomi's waters are empty, and no Egyptian fleet could
    // move into them this season.
    let s = before13(newGame(31, Quiet));
    removeAll(s.units, (u) => u.power === "Alashiya");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Alashiya", kind: "Fleet", province: "kalavasoswaters" }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Alashiya", kind: "Army", province: "kalavasos" }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Alashiya", kind: "Army", province: "enkomi" }));
    first(s.units, (u) => u.province === "delta" && u.kind === "Fleet").province = "lukkawaters";
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Fleet", province: "kizzuwatnawaters" }));
    let [b, brain] = read(s, "Alashiya");
    let [, give] = Contingencies.plan(b, brain, holding(b), []);
    let g = Assert.single(give);
    Assert.equal(["Retreat", "kalavasoswaters", "UnitAttacked"], [g.kind, g.place, g.request.when]);
    Assert.equal([move("kalavasoswaters", "enkomiwaters")], g.request.orders);
  });

  // <summary>Babylonia keeps standing order s1: when the army in Dur-Kurigalzu is attacked, the army in Sippar supports it.</summary>
  function guarded(): GameState {
    let s = before13(newGame(31, Quiet));
    assyriaInMari(s);
    // An army of Babylon's in Nippur too, which a plan may have support Dur-Kurigalzu.
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "nippur" }));
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", newTurnSubmission({ standing: [attacked("durkurigalzu", support("sippar", "durkurigalzu"))] })]]));
    return s;
  }

  test.each([
    ["hold", null],
    ["march", "the troop marches"],
    ["same", "the plan does it"],
    ["supported", "held without it"],
    ["attack", "needed elsewhere"],
    ["disband", "the troop goes"],
  ] as const)("A script king cancels a standing order that no longer makes sense against the season s plan %s", (season: string, why: string | null) => {
    let s = guarded();
    let [b, brain] = read(s, "Babylonia");
    let plan =
      // Two armies could strike Dur-Kurigalzu, which holds alone: it should stand.
      season === "hold"
        ? holding(b)
        : season === "march"
          ? holding(b, move("durkurigalzu", "suhu"))
          : season === "same"
            ? holding(b, support("sippar", "durkurigalzu"))
            : // The plan has Nippur's army support it: two against two, held without the standing order.
              season === "supported"
              ? holding(b, support("nippur", "durkurigalzu"))
              : // Sippar's own order this season is worth more than Dur-Kurigalzu: a march on Assyria's Suhu.
                season === "attack"
                ? holding(b, move("sippar", "suhu"))
                : holding(b);
    let orders = season === "disband" ? [disband("durkurigalzu")] : [];
    let [cancel] = Contingencies.plan(b, brain, plan, orders);
    if (why === null) Assert.empty(cancel);
    else Assert.equal(["s1", why], Assert.single(cancel));
  });

  test("Script kings give standing orders and one meets its blow", async () => {
    // Script kings give standing orders, and in the first seeds one fires within a few seasons: its notice says what set it
    // off and the orders it gave. The game replays exactly. (Until the siege package this was seed 1's turn 3, where Arzawa
    // marched on an empty Hattusa; the walls on homelands changed that game.) In the small world (small-world.ts) the first
    // to fire is seed 3's, in its fourth season, since item 11c's map (seed 4's before), so the search starts there. The
    // people do not resist here (item 11e's land defended by its men makes such blows rarer). Since item 17+ placed the
    // Great Kings' men at home and in their frontier bases, early blows are rarer still: the first to fire is seed 17's,
    // in its twelfth season.
    for (let seed = 3; seed <= 20; seed++) {
      let state = newGame(seed, newGameConfig({ peopleDefence: 0 }));
      let runner = Object.assign(new GameRunner(state, scriptSeats(seed), new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
      await runner.prepare();
      let fired = null;
      let turns = 0;
      while (fired === null && turns < 12 && (await runner.playTurn())) {
        turns++;
        fired = firstOrNull(
          AllPowers.flatMap((p) => inboxOf(state, p)),
          (x) => x.title.startsWith("Standing order s") && x.title.endsWith(" fired"),
        );
      }
      if (fired === null) continue;
      Assert.matches(
        "^Your standing order s\\d+ \\(when .+\\) fired in turn \\d+: \\w+'s (army|fleet) set out from \\w+ for \\w+\\. It gave these orders: ",
        fired.body,
      );
      Assert.true(sum(AllPowers, (p) => state.standing.tryGet(p)?.last ?? 0) > 1);

      let replay = GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl()));
      await replay.prepare();
      for (let i = 0; i < turns; i++) await replay.playTurn();
      Assert.equal(hash(GameStateSchema, state), hash(GameStateSchema, replay.state));
      return;
    }
    Assert.fail("no standing order fired in the first twelve seasons of seeds 3-15");
  });
});
