import { describe, test } from "vitest";
import {
  AttackedReason,
  Dict,
  type GameState,
  MarchHeldUpTitle,
  MaxStanding,
  type Order,
  type StandingRequest,
  TurnEngine,
  Views,
  convoy,
  counterIntel,
  hold,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newId,
  newPlannedOrder,
  newScheduledOrders,
  newSleepState,
  newStandingBook,
  newStandingRequest,
  newTurnSubmission,
  newUnit,
  raise,
  range,
  single,
  standingFiredTitle,
  support,
  unitAt,
} from "@amarna/engine";
import { type JsonObject, LlmLeaderSeat, Parse, Replies, Schemas, leaderRules, problems, situation } from "@amarna/llm";
import { at, str, Assert, last } from "../../engine/test/support.ts";
import { Sleeper } from "./sleep-support.ts";
import { Scripted } from "./sleep-support.ts";
import { Quiet } from "./sleep-support.ts";
import { nothing } from "./sleep-support.ts";
import { cap } from "./sleep-support.ts";
import { play } from "./sleep-support.ts";
import { asleep } from "./sleep-support.ts";
import { enters } from "./sleep-support.ts";
import { attackedOf } from "./sleep-support.ts";
import { standingOf } from "./sleep-support.ts";
import { noticeOf } from "./sleep-support.ts";
import { emptyDurkurigalzu } from "./sleep-support.ts";
import { assyriaInSusa } from "./sleep-support.ts";
import { waiting } from "./sleep-support.ts";
import { assyriaToArbela } from "./sleep-support.ts";
import { Replying } from "./sleep-support.ts";
import { PlanningReply } from "./sleep-support.ts";
import { convoy as convoyOrder } from "@amarna/engine";
import { first as firstOf } from "@amarna/engine";
import { support as supportOrder } from "@amarna/engine";
import { describe as describeOrder } from "@amarna/engine";

// Sleeping seats: standing orders and what a model king writes.
describe("SleepTests", () => {
  // ------------------------------------------------------------ standing orders (answering a move in the season it is made, since the fix pass after item 4)

  test("A standing order answers a move in the season it is made once and does not wake the seat", async () => {
    // When Assyria's troops enter Arbela, the army in Babylon falls back to Nippur. Turn 1: Assyria's army leaves
    // Ekallatum, which Babylon can see, for Arbela; a standing order first fires the season after it is given, so not yet.
    // Turn 2: the army in Susa sets out for Arbela and is stopped there, and the standing order answers it that season.
    // Turn 3: it sets out again; the standing order is spent.
    let sleeper = new Sleeper((v) => (v.turn === 1 ? newTurnSubmission({ standing: [enters("Assyria", "arbela", move("babylon", "nippur"))] }) : nothing()));
    let assyria = new Scripted((v) =>
      v.turn === 1
        ? newTurnSubmission({ orders: [move("ekallatum", "arbela")] })
        : v.turn === 2 || v.turn === 3
          ? newTurnSubmission({ orders: [move("susa", "arbela")] })
          : newTurnSubmission(),
    );
    let r = await play("Babylonia", sleeper, 1, undefined, new Dict([["Assyria", assyria]]), assyriaInSusa);
    let sleep = r.state.sleep.get("Babylonia");
    Assert.equal("Babylonia", unitAt(r.state, "babylon")?.power);
    // Its view lists it with its id; nothing tells a king in advance whether it will fire.
    let line = single(situation(Views.for(r.state, "Babylonia")).replaceAll("\r\n", "\n").split("\n"), (l) => l.startsWith("- s1:"));
    Assert.equal("- s1: when Assyria's troops enter arbela, then: the army now in babylon -> nippur", line);

    await r.playTurn();
    Assert.equal("Babylonia", unitAt(r.state, "nippur")?.power);
    Assert.equal("Assyria", unitAt(r.state, "susa")?.power);
    Assert.empty(standingOf(r.state, "Babylonia"));
    await r.playTurn();
    Assert.equal([1], sleeper.calls);
    let notice = noticeOf(r.state, "Babylonia", standingFiredTitle("s1"));
    Assert.equal(["Resolution", 3], [notice.kind, notice.turn]);
    Assert.equal(
      "Your standing order s1 (when Assyria's troops enter arbela) fired in turn 2: Assyria's army set out from susa for arbela. It gave these orders: babylon -> nippur.",
      notice.body,
    );
    // In brief, the firing is dated by the season it fired, as the movements are by the season they were made.
    Assert.contains("turn 2: your standing order s1 fired", sleep.digest);
    Assert.empty(sleep.pendingWake);
  });

  test("A standing order for a unit attacked meets the blow in the same season", async () => {
    // Assyria attacks the army in Sippar from Ekallatum, supported from Mari (its walls gone, for the test): two against one.
    // When the army in Sippar is attacked, the army in Dur-Kurigalzu supports it holding, in place of the hold it was
    // scheduled to give: two against two, and Sippar holds. Before the fix pass the standing order fired the season after
    // the attack, when the army was already lost.
    function setup(s: GameState): void {
      s.walls.delete("mari");
      s.owner.set("mari", "Assyria");
      s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "mari" }));
    }
    function assyriaOf(): Scripted {
      return new Scripted((v) =>
        v.turn === 2 ? newTurnSubmission({ orders: [move("ekallatum", "sippar"), supportOrder("mari", "ekallatum", "sippar")] }) : newTurnSubmission(),
      );
    }

    let sleeper = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({
            scheduled: [newScheduledOrders({ turn: 2, orders: [hold("durkurigalzu")] })],
            standing: [attackedOf("sippar", supportOrder("durkurigalzu", "sippar"))],
          })
        : nothing(),
    );
    let r = await play("Babylonia", sleeper, 2, undefined, new Dict([["Assyria", assyriaOf()]]), setup);
    Assert.equal("Babylonia", unitAt(r.state, "sippar")?.power);
    Assert.empty(standingOf(r.state, "Babylonia"));
    Assert.equal(
      "Your standing order s1 (when your army in sippar is attacked) fired in turn 2: Assyria's army set out from ekallatum for sippar. It gave these orders: durkurigalzu supports sippar holding.",
      noticeOf(r.state, "Babylonia", standingFiredTitle("s1")).body,
    );
    // The scheduled hold was replaced, not refused as a second order for the unit. The attack that did not get in wakes
    // the seat the next season (since the review of the fix pass after item 4): it was attacked, and held.
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.kind === "Rejected");
    await r.playTurn();
    Assert.equal([1, 3], sleeper.calls);
    Assert.equal([`${AttackedReason}: Assyria's army tried to move ekallatum -> sippar`], sleeper.views[1].wokenBecause);

    // Without it, the army in Sippar is lost.
    let alone = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [hold("durkurigalzu")] })] }) : nothing(),
    );
    r = await play("Babylonia", alone, 2, undefined, new Dict([["Assyria", assyriaOf()]]), setup);
    Assert.equal("Assyria", unitAt(r.state, "sippar")?.power);
  });

  test("A unit attacked as it marches away can be told to stand", async () => {
    // The army in Sippar is to march to Dur-Kurigalzu in turn 2; if it is attacked, it is to stand instead. Assyria moves
    // on Sippar that season: the standing order replaces the scheduled move, and the attack fails against the army.
    let sleeper = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({
            scheduled: [newScheduledOrders({ turn: 2, orders: [move("sippar", "durkurigalzu")] })],
            standing: [attackedOf("sippar", hold("sippar"))],
          })
        : nothing(),
    );
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallatum", "sippar")] }) : newTurnSubmission()));
    let r = await play("Babylonia", sleeper, 2, undefined, new Dict([["Assyria", assyria]]), emptyDurkurigalzu);
    Assert.equal("Babylonia", unitAt(r.state, "sippar")?.power);
    Assert.null(unitAt(r.state, "durkurigalzu"));
    Assert.equal("Assyria", unitAt(r.state, "ekallatum")?.power);
    Assert.endsWith("It gave these orders: sippar holds.", noticeOf(r.state, "Babylonia", standingFiredTitle("s1")).body);
    // The march gave way to the standing order: it is not held up, and nothing failed.
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.kind === "Rejected");
    Assert.empty(r.state.sleep.get("Babylonia").scheduled);
  });

  test("A standing order that fires replaces the orders given in its season", async () => {
    // Woken every season (a hidden cap of 0, for the test), the seat orders the army in Babylon to hold in turn 2, the
    // season Assyria attacks Sippar and its standing order fires. Since the additions to the fix pass after item 4 the
    // standing order's orders replace those given that season (before, the orders given then replaced the standing
    // order's, so a seat that gives orders every season could never have one fire): the army marches to Nippur.
    let sleeper = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({ standing: [attackedOf("sippar", move("babylon", "nippur"), hold("durkurigalzu"))] })
        : v.turn === 2
          ? newTurnSubmission({ orders: [hold("babylon")] })
          : nothing(),
    );
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallatum", "sippar")] }) : newTurnSubmission()));
    let r = await play("Babylonia", sleeper, 2, cap(0), new Dict([["Assyria", assyria]]));

    Assert.equal([1, 2], sleeper.calls);
    // It could not know in advance that the standing order would fire.
    Assert.doesNotContain("fires this season", situation(sleeper.views[1]));
    Assert.null(unitAt(r.state, "babylon"));
    Assert.equal("Babylonia", unitAt(r.state, "nippur")?.power);
    Assert.empty(standingOf(r.state, "Babylonia"));
    Assert.equal(
      "Your standing order s1 (when your army in sippar is attacked) fired in turn 2: Assyria's army set out from ekallatum for sippar. It gave these orders: babylon -> nippur; durkurigalzu holds. They replaced these orders you gave for turn 2: babylon holds.",
      noticeOf(r.state, "Babylonia", standingFiredTitle("s1")).body,
    );
    // The replaced hold is no second order for the army, and nothing was refused.
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.kind === "Rejected");
  });

  test("Standing orders that fire together go by id and the notice says what became of each order", () => {
    // Asleep in turn 3, three standing orders fire as Assyria enters Arbela. s1 and s2 both order the army in Babylon: s1,
    // the lower id, goes first (wherever it stands in the list). One of s3's is refused.
    let [s, sleep] = asleep("Babylonia");
    s.standing.set(
      "Babylonia",
      newStandingBook({
        orders: [waiting(s, "s2", hold("babylon"), hold("durkurigalzu")), waiting(s, "s1", move("babylon", "nippur")), waiting(s, "s3", move("sippar", "ur"))],
        last: 3,
      }),
    );
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(assyriaToArbela());

    Assert.equal("Babylonia", unitAt(s, "nippur")?.power);
    Assert.empty(standingOf(s, "Babylonia"));
    let fired = "fired in turn 3: Assyria's army set out from ekallatum for arbela.";
    Assert.equal(
      `Your standing order s1 (when Assyria's troops enter arbela) ${fired} It gave these orders: babylon -> nippur.`,
      noticeOf(s, "Babylonia", standingFiredTitle("s1")).body,
    );
    Assert.equal(
      `Your standing order s2 (when Assyria's troops enter arbela) ${fired} It gave these orders: durkurigalzu holds. Replaced by standing order s1, which fired in the same season: babylon holds.`,
      noticeOf(s, "Babylonia", standingFiredTitle("s2")).body,
    );
    Assert.equal(
      `Your standing order s3 (when Assyria's troops enter arbela) ${fired} Refused: sippar -> ur (an army in sippar cannot reach ur).`,
      noticeOf(s, "Babylonia", standingFiredTitle("s3")).body,
    );
    // Only the refused order fails; the one replaced by s1 is no second order for the unit. A refusal wakes nobody.
    Assert.equal("- sippar -> ur: an army in sippar cannot reach ur", noticeOf(s, "Babylonia", "Orders that could not be carried out").body);
    Assert.empty(sleep.pendingWake);
  });

  test("A fired order that is stopped wakes the seat and is not tried again", async () => {
    // When Assyria's troops enter Dur-Kurigalzu, the army in Babylon is to take it too. Assyria moves in from Ekallatum in
    // turn 2: the two meet, and both are stopped.
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ standing: [enters("Assyria", "durkurigalzu", move("babylon", "durkurigalzu"))] }) : nothing(),
    );
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallatum", "durkurigalzu")] }) : newTurnSubmission()));
    let r = await play("Babylonia", sleeper, 3, undefined, new Dict([["Assyria", assyria]]), emptyDurkurigalzu);

    // Firing did not wake it; the move others stopped did (and so did their move into its land).
    Assert.equal([1, 3], sleeper.calls);
    Assert.equal(2, sleeper.views[1].wokenBecause.length);
    Assert.startsWith(
      "a standing order of yours could not be carried out: s1: babylon -> durkurigalzu (it met a move into durkurigalzu from ekallatum",
      sleeper.views[1].wokenBecause[0],
    );
    Assert.equal(`${AttackedReason}: Assyria's army tried to move ekallatum -> durkurigalzu`, sleeper.views[1].wokenBecause[1]);
    // Only a scheduled move is a march: this one is not tried again.
    Assert.equal("Babylonia", unitAt(r.state, "babylon")?.power);
    Assert.null(unitAt(r.state, "durkurigalzu"));
    Assert.empty(r.state.sleep.get("Babylonia").scheduled);
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.title === MarchHeldUpTitle);
  });

  test("A standing order fires only on the move it names as the seat sees it", () => {
    // Turn 1: Babylon gives its standing orders. Turn 2, as it sleeps: Assyria's army sets out for Arbela; Mitanni's sets
    // out for Mari and fails against the Assyrian army standing within its walls; Mitanni's army in Taidu sets out for
    // Nineveh, out of Babylon's sight; Babylon's own army marches to Nippur, and another sets out against its own army in Sippar.
    let s = newGame(31, newGameConfig({ catastropheChance: 0 }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "mari" }));
    let sleep = newSleepState();
    s.sleep.set("Babylonia", sleep);
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        [
          "Babylonia",
          newTurnSubmission({
            scheduled: [newScheduledOrders({ turn: 2, orders: [move("babylon", "nippur"), move("durkurigalzu", "sippar")] })],
            standing: [
              enters("Hatti", "arbela", hold("sippar")) /* s1: another power entered */,
              enters("Assyria", "arbela", hold("sippar")) /* s2: fires */,
              enters(null, "arbela", hold("sippar")) /* s3: fires */,
              enters(null, "nippur", hold("sippar")) /* s4: only its own troops entered */,
              enters(null, "mari", hold("sippar")) /* s5: fires, though the move into Mari failed */,
              attackedOf("sippar", hold("sippar")) /* s6: only its own army moved against Sippar */,
              enters(null, "nineveh", hold("sippar")) /* s7: a move it cannot see */,
            ],
          }),
        ],
      ]),
    );
    Assert.true(sleep.asleep);
    e = new TurnEngine(s);
    e.beginTurn();
    e.wakeCheck();
    e.resolve(
      new Dict([
        ["Assyria", newTurnSubmission({ orders: [move("ekallatum", "arbela")] })],
        ["Mitanni", newTurnSubmission({ orders: [move("terqa", "mari"), move("taidu", "nineveh")] })],
      ]),
    );
    Assert.equal("Mitanni", unitAt(s, "terqa")?.power);
    Assert.equal("Babylonia", unitAt(s, "nippur")?.power);
    Assert.equal("Babylonia", unitAt(s, "durkurigalzu")?.power);
    Assert.equal(
      ["s1", "s4", "s6", "s7"],
      standingOf(s, "Babylonia").map((x) => x.id),
    );
  });

  test("When the script king stands in the seat s own plans go first", () => {
    // Woken in turn 3, the seat's call failed and the script king stands in, ordering every unit to hold and a levy. The
    // seat's standing order fires and its scheduled move runs all the same: the stand-in only fills what they leave free.
    let s = newGame(31, newGameConfig({ catastropheChance: 0 }));
    emptyDurkurigalzu(s);
    s.turn = 3;
    let marcher = unitAt(s, "sippar")!;
    let sleep = newSleepState({
      lastCalled: 1,
      scheduled: [newPlannedOrder({ turn: 3, order: move("sippar", "durkurigalzu"), unitId: marcher.id })],
    });
    s.sleep.set("Babylonia", sleep);
    s.standing.set("Babylonia", newStandingBook({ orders: [waiting(s, "s1", move("babylon", "nippur"))], last: 1 }));
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(assyriaToArbela(newTurnSubmission({ fromFallback: true, orders: [hold("babylon"), hold("sippar"), raise("sippar", "Army")] })));

    Assert.equal("Babylonia", unitAt(s, "nippur")?.power);
    Assert.equal(marcher.id, unitAt(s, "durkurigalzu")?.id);
    Assert.equal("Babylonia", unitAt(s, "sippar")?.power);
    Assert.empty(standingOf(s, "Babylonia"));
    Assert.equal(
      "Your standing order s1 (when Assyria's troops enter arbela) fired in turn 3: Assyria's army set out from ekallatum for arbela. It gave these orders: babylon -> nippur.",
      noticeOf(s, "Babylonia", standingFiredTitle("s1")).body,
    );
    Assert.doesNotContain(inboxOf(s, "Babylonia"), (i) => i.kind === "Rejected");
    Assert.empty(sleep.pendingWake);
    // The stand-in did not put the seat to sleep.
    Assert.false(sleep.asleep);
    Assert.equal(1, sleep.lastCalled);
  });

  test("Standing orders are cancelled by id or all even in the season they would fire", async () => {
    // Woken every season (a hidden cap of 0, for the test). In turn 2 Assyria enters Arbela, but s1 is cancelled that season.
    let sleeper = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({
            standing: [enters("Assyria", "arbela", move("babylon", "nippur")), attackedOf("sippar", move("durkurigalzu", "nippur"))],
          })
        : v.turn === 2
          ? newTurnSubmission({ cancelStanding: ["s1", "s7"] })
          : v.turn === 3
            ? newTurnSubmission({ cancelStanding: ["all"] })
            : nothing(),
    );
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallatum", "arbela")] }) : newTurnSubmission()));
    let r = await play("Babylonia", sleeper, 2, cap(0), new Dict([["Assyria", assyria]]));
    let sleep = r.state.sleep.get("Babylonia");

    Assert.contains("- s1: when Assyria's troops enter arbela, then: the army now in babylon -> nippur", situation(last(sleeper.views)));
    Assert.null(unitAt(r.state, "nippur"));
    Assert.equal("s2", Assert.single(standingOf(r.state, "Babylonia")).id);
    Assert.equal("- s7: you have no standing order s7", noticeOf(r.state, "Babylonia", "Standing orders not cancelled").body);
    await r.playTurn();
    Assert.empty(standingOf(r.state, "Babylonia"));
  });

  test("The rulebook says a standing order answers a move in the season it is made", () => {
    // Five kings debriefed after the second agent simulation found no use for standing orders that ran the season after
    // their event ("it cannot help against a lethal attack, and it comes a season late", Hatti, seed 7).
    let rules = leaderRules(true, newGameConfig());
    Assert.contains(
      "A standing order waits for a move you can see and answers it in the same season, as your commanders on the spot would, whether or not the move then succeeds",
      rules,
    );
    Assert.contains("A move you can see is one from or into a province in your sight.", rules);
    Assert.contains(
      "It answers the moves as they were ordered, never the orders another standing order gives, so it may answer a move that the mover's own standing order then turns aside: it fires even though that move is never made. It first fires in the season after you give it.",
      rules,
    );
    Assert.contains("This is what a standing order can do that waking cannot: woken, you would answer the blow only the season after it fell.", rules);
    Assert.doesNotContain("your unit still standing there afterwards", rules);
    Assert.contains(
      "its orders run in that same season, once, so they meet the move: they replace your other orders for the same units or people that season, those you give then among them and your scheduled ones (cancel it to stop it)",
      JSON.stringify(Schemas.leaderOrders(newGameConfig())),
    );
  });

  test("At most 12 standing orders are kept and one that cannot be kept is refused whole and wakes nobody", () => {
    let s = newGame(31, newGameConfig({ catastropheChance: 0 }));
    let sleep = newSleepState();
    s.sleep.set("Babylonia", sleep);
    let e = new TurnEngine(s);
    e.beginTurn();
    let requests: StandingRequest[] = [
      attackedOf("nippur", hold("babylon")),
      enters(null, "mari", hold("babylon"), move("nippur", "ur")),
      enters("Assyria", "mari"),
      newStandingRequest({ when: "UnitEnters", province: "mari", orders: [hold("babylon")], unreadable: "there is no power called 'Kush'" }),
      enters(null, "ur", ...range(0, 25).map((): Order => hold("babylon"))),
      ...range(0, 13).map((_) => enters(null, "mari", supportOrder("sippar", "babylon"))),
    ];
    e.resolve(new Dict([["Babylonia", newTurnSubmission({ standing: requests })]]));

    let standing = standingOf(s, "Babylonia");
    Assert.equal(MaxStanding, standing.length);
    Assert.equal(
      range(1, 12).map((i) => `s${i}`),
      standing.map((x) => x.id),
    );
    // Bound to the units it names: the supporting army and the army supported, both Babylon's.
    let first = single(standing[0].orders);
    Assert.equal([unitAt(s, "sippar")!.id, unitAt(s, "babylon")!.id], [first.unitId!, first.otherUnitId!]);
    Assert.equal(
      "- when your unit in nippur is attacked: you have no unit in nippur\n" +
        "- when foreign troops enter mari: nippur -> ur: you have no unit in nippur\n" +
        "- when Assyria's troops enter mari: it gives no orders\n" +
        "- when foreign troops enter mari: there is no power called 'Kush'\n" +
        "- when foreign troops enter ur: it gives 25 orders; a standing order may give at most 24\n" +
        "- when foreign troops enter mari: you may keep at most 12 standing orders",
      noticeOf(s, "Babylonia", "Standing orders not kept").body,
    );
    // Refused like any order, it wakes nobody (since the review of the fix pass after item 4).
    new TurnEngine(s).wakeCheck();
    Assert.true(sleep.asleep);
    Assert.empty(sleep.wokenBecause);
    Assert.contains("turn 2: an order was refused or failed (Standing orders not kept)", sleep.digest);
  });

  // ------------------------------------------------------------ what a model king writes

  test("A model king s standing orders and cancellations are read from its reply", () => {
    let sub = Parse.orders(JSON.parse(PlanningReply)!);
    Assert.equal(move("babylon", "nippur"), Assert.single(Assert.single(sub.scheduled).orders));
    Assert.equal(3, sub.standing.length);
    let attacked = sub.standing[0];
    Assert.equal(["UnitAttacked", "sippar", null, null], [attacked.when, attacked.province, attacked.power, attacked.unreadable]);
    Assert.equal([supportOrder("durkurigalzu", "sippar"), counterIntel(20)], attacked.orders);
    Assert.equal(["UnitEnters", "mari", null, null], [sub.standing[1].when, sub.standing[1].province, sub.standing[1].power, sub.standing[1].unreadable]);
    Assert.equal("there is no power called 'Kush'", sub.standing[2].unreadable);
    Assert.equal(["s9", "all"], sub.cancelStanding);
  });

  test("A model king gives standing orders and a march that the engine binds to its units", async () => {
    let king = new Replying((turn) => (turn === 1 ? PlanningReply : null));
    let seat = new LlmLeaderSeat("Babylonia", king, "claude-sonnet-5-5", "medium", true, Quiet);
    let r = await play("Babylonia", seat, 1);
    let sleep = r.state.sleep.get("Babylonia");
    Assert.equal(unitAt(r.state, "babylon")!.id, Assert.single(sleep.scheduled).unitId);
    Assert.equal(
      ["s1", "s2"],
      standingOf(r.state, "Babylonia").map((x) => x.id),
    );
    Assert.equal(unitAt(r.state, "sippar")!.id, standingOf(r.state, "Babylonia")[0].unitId);
    Assert.equal("- when foreign troops enter mari: there is no power called 'Kush'", noticeOf(r.state, "Babylonia", "Standing orders not kept").body);
    // The schema it was given asks for both, and its rulebook explains them.
    let spec = single(king.specs, (x) => x.key === "t1/orders/Babylonia");
    Assert.contains('"standing_orders"', JSON.stringify(spec.schema));
    Assert.contains('"cancel_standing"', JSON.stringify(spec.schema));
    Assert.contains("STANDING ORDERS (standing_orders; every king may give them)", spec.sharedSystem);
    Assert.contains("You may keep at most 12, each with at most 24 orders", spec.sharedSystem);
    Assert.empty(problems(JSON.parse(PlanningReply), spec.schema));
  });

  test("A reply naming an event the schema does not know breaks the schema", () => {
    let reply = PlanningReply.replaceAll('"unit_attacked"', '"unit_besieged"');
    Assert.contains(problems(JSON.parse(reply), Replies.leaderOrders(newGameConfig())), (p) => p.startsWith("standing_orders[0].when: Invalid option"));
    // Read anyway (as a model reply that ignored its schema would be), it is refused with the reason, not dropped.
    Assert.equal("name the event it waits for: unit_enters or unit_attacked", Parse.orders(JSON.parse(reply)).standing[0].unreadable);
  });

  test("With sleeping off the schema has standing orders and no schedule", () => {
    // Every king may keep standing orders, awake or asleep (since the additions to the fix pass after item 4); only a king
    // that sleeps schedules orders for later seasons, and only one that sleeps is told what wakes it.
    let off = Schemas.leaderOrders(newGameConfig({ sleepingSeats: false }));
    let props = Object.keys(off.properties as JsonObject);
    Assert.contains("standing_orders", props);
    Assert.contains("cancel_standing", props);
    Assert.doesNotContain("schedule", props);
    Assert.equal(["notes", "summary", "ledger", "units", "letters", "other_orders", "standing_orders", "cancel_standing", "standing_answers", "cancel_answers"], off.required as string[]);
    let described = str(off, "properties", "standing_orders", "description");
    Assert.equal(
      "New standing orders, kept until they fire or you cancel them (at most 12 in all, each with at most 24 orders). When you see the move it waits for, its orders run in that same season, once, so they meet the move: they replace your other orders for the same units or people that season, those you give then among them (cancel it to stop it). It first fires in the season after you give it. Giving one costs nothing; its orders cost what they cost when they run.",
      described,
    );
    Assert.doesNotContain("wake", described);
    Assert.doesNotContain("schedule", described);
    Assert.doesNotContain("schedule", JSON.stringify(at(off, "properties", "standing_orders")));
  });
});
