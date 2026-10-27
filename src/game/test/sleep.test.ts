import { describe, test } from "vitest";
import {
  AllPowers,
  ArchiveTakenTitle,
  AttackedReason,
  CapReason,
  Dict,
  type GameConfig,
  type GameState,
  type InboxKind,
  MaxDigest,
  MaxWhileAsleep,
  NoticeTitle,
  type Order,
  type SeatView,
  SeatViewSchema,
  TurnEngine,
  TurnSubmissionSchema,
  Views,
  buy,
  convoy,
  count,
  disband,
  dispatch,
  distinct,
  first,
  hold,
  inboxOf,
  max,
  move,
  newGame,
  newGameConfig,
  newId,
  newInboxItem,
  newOrderOutcome,
  newScheduledOrders,
  newSleepState,
  newTurnSubmission,
  newUnit,
  notify,
  range,
  serialize,
  single,
  support,
} from "@amarna/engine";
import { GameRunner, ScriptMind, TemplateNarrator } from "@amarna/game";
import { Parse, Schemas, leaderRules, situation, sleepLine } from "@amarna/llm";
import { removeAll, Assert, last, toDict, join } from "../../engine/test/support.ts";
import { Sleeper } from "./sleep-support.ts";
import { Scripted } from "./sleep-support.ts";
import { Quiet } from "./sleep-support.ts";
import { nothing } from "./sleep-support.ts";
import { cap } from "./sleep-support.ts";
import { play } from "./sleep-support.ts";
import { asleep } from "./sleep-support.ts";
import { noticeOf } from "./sleep-support.ts";
import { convoy as convoyOrder } from "@amarna/engine";
import { first as firstOf } from "@amarna/engine";
import { support as supportOrder } from "@amarna/engine";
import { describe as describeOrder } from "@amarna/engine";

// Sleeping seats: sleeping after every call, what wakes a seat and what waits in the digest.
describe("SleepTests", () => {
  // ------------------------------------------------------------ sleeping after every call

  test("A seat sleeps after every call by default", async () => {
    Assert.true(newGameConfig().sleepingSeats);
    Assert.equal(12, newGameConfig().maxSleep);
    let sleeper = new Sleeper((_) => nothing());
    let r = await play("Babylonia", sleeper, 6);
    Assert.equal([1], sleeper.calls);
    let sleep = r.state.sleep.get("Babylonia");
    Assert.true(sleep.asleep);
    Assert.equal(1, sleep.lastCalled);
    Assert.equal(1 + 1 + 12, sleep.wakeAt);
    let spell = Assert.single(sleep.history);
    Assert.equal([2, 0], [spell.from, spell.wokeAt]);
    // Its units held while it slept, and the world went on.
    Assert.equal(
      6,
      max(r.state.scores, (s) => s.turn),
    );
    Assert.equal("This is your first season.", sleepLine(sleeper.views[0]));
  });

  test("A king cannot ask to be woken", async () => {
    // The fix pass after item 4 ("Decided: sleep is the default", "No triggers of the seat's own"): no season to be woken
    // in, no triggers of its own. The schema has no field for either, the rulebook says so plainly, and a reply that
    // still names them is read as if it did not.
    let c = newGameConfig();
    let schema = JSON.stringify(Schemas.leaderOrders(c));
    for (const gone of ['"sleep"', "wake_in_turn", "wake_on", "unit_moves", "envoy_returns", "treasury_below", "troops_enter", "province_changes_hands"])
      Assert.doesNotContain(gone, schema);
    let rules = leaderRules(true, c);
    Assert.doesNotContain("wake_in_turn", rules);
    Assert.doesNotContain("wake_on", rules);
    Assert.doesNotContain("news you asked to hear", rules);
    Assert.contains("You cannot ask to be woken, at a season you name or for anything else.", rules);
    let plain = `{"notes":"Hold.","units":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[]}`;
    let asks = `{"notes":"Hold.","units":[],"letters":[],"other_orders":[],"sleep":{"wake_in_turn":2,"wake_on":[{"trigger":"unit_moves","province":"ekallate"}]},"schedule":[],"standing_orders":[],"cancel_standing":[]}`;
    Assert.equal(serialize(TurnSubmissionSchema, Parse.orders(JSON.parse(plain))), serialize(TurnSubmissionSchema, Parse.orders(JSON.parse(asks))));

    // Asleep after its first orders, it is not woken again in six quiet seasons: only what concerns it, or the cap, would.
    let sleeper = new Sleeper((_) => nothing());
    let r = await play("Babylonia", sleeper, 6);
    Assert.equal([1], sleeper.calls);
    Assert.equal(1 + 1 + 12, r.state.sleep.get("Babylonia").wakeAt);
  });

  test("The hidden cap wakes a seat after a long sleep and is told nowhere", async () => {
    // The cap wakes it at turn 1 + 1 + 3, and says nothing of itself.
    let sleeper = new Sleeper((_) => nothing());
    await play("Babylonia", sleeper, 6, cap(3));
    Assert.equal([1, 5], sleeper.calls);
    Assert.equal([CapReason], sleeper.views[1].wokenBecause);
    Assert.equal(
      "You slept 3 seasons (you last gave orders in turn 1). You were woken because: your counsellors woke you after a long sleep.",
      sleepLine(sleeper.views[1]),
    );

    // The cap changes nothing a king reads: not the rulebook, not the schema, not the view.
    let low = { ...Quiet, maxSleep: 5 };
    let high = { ...Quiet, maxSleep: 29 };
    Assert.equal(leaderRules(true, low), leaderRules(true, high));
    Assert.equal(JSON.stringify(Schemas.leaderOrders(low)), JSON.stringify(Schemas.leaderOrders(high)));
    function viewOf(c: GameConfig): SeatView {
      let s = newGame(31, c);
      s.sleep.set("Babylonia", newSleepState({ lastCalled: 1, wokenBecause: [CapReason] }));
      s.turn = 4;
      return Views.for(s, "Babylonia");
    }
    Assert.equal(serialize(SeatViewSchema, viewOf(low)), serialize(SeatViewSchema, viewOf(high)));
    Assert.equal(situation(viewOf(low)), situation(viewOf(high)));
    Assert.doesNotContain("after a long sleep", leaderRules(true, newGameConfig()));
  });

  test("Orders can be scheduled for any later season", async () => {
    // With a cap of 3 the old horizon ended at turn 5 (cap + 1 seasons ahead); the move for turn 7 still runs, while the seat sleeps.
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 7, orders: [move("babylon", "nippur")] })] }) : nothing(),
    );
    let r = await play("Babylonia", sleeper, 7, { ...Quiet, maxSleep: 3 });
    Assert.equal([1, 5], sleeper.calls);
    Assert.contains(sleeper.views[1].scheduled, (x) => x.turn === 7);
    Assert.contains("- turn 7: the army now in babylon -> nippur", situation(sleeper.views[1]));
    // The header points to the rulebook, which says what replaces them, a standing order that fires among them (the
    // follow-up's review; the explanation moved to the rulebook's fixed part in item 6b).
    Assert.contains("ORDERS YOU HAVE SCHEDULED (each unit named by where it stands now; see PLANNING AHEAD):", situation(sleeper.views[1]));
    Assert.contains(
      "in the season one fires, its units do its orders instead of their scheduled ones",
      leaderRules(true, newGameConfig()),
    );
    Assert.contains(r.state.units, (u) => u.power === "Babylonia" && u.province === "nippur");
  });

  test("At most 24 orders a season for at most 40 seasons are kept and the rest is reported", () => {
    let s = newGame(31, newGameConfig({ catastropheChance: 0 }));
    let sleep = newSleepState();
    s.sleep.set("Babylonia", sleep);
    let plans = range(2, 45).map((t) => newScheduledOrders({ turn: t, orders: [hold("babylon")] }));
    plans[0].orders = range(0, 30).map((): Order => hold("babylon"));
    // A season after the game's last (turn 60) never comes, but it counts like any other: nothing says when the game must end.
    plans.push(newScheduledOrders({ turn: 61, orders: [hold("babylon")] }));
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", newTurnSubmission({ scheduled: plans })]]));

    Assert.equal(40, distinct(sleep.scheduled.map((x) => x.turn)).length);
    Assert.equal(
      24,
      count(sleep.scheduled, (x) => x.turn === 2),
    );
    Assert.equal(41, sleep.scheduled.at(-1)!.turn);
    let notice = Assert.single(inboxOf(s, "Babylonia"), (i) => i.title === "Scheduled orders not kept");
    Assert.equal("Rejected", notice.kind);
    Assert.contains("- turn 2: only the first 24 of its 30 orders were kept", notice.body);
    Assert.contains("- turns 42, 43, 44, 45, 46, 61: orders may be scheduled for at most 40 seasons", notice.body);
    // Orders past a limit are refused like any other, and wake nobody (since the review of the fix pass after item 4).
    new TurnEngine(s).wakeCheck();
    Assert.true(sleep.asleep);
    Assert.empty(sleep.wokenBecause);
    Assert.contains("turn 2: an order was refused or failed (Scheduled orders not kept)", sleep.digest);
  });

  test("Orders scheduled past the last season are kept so nothing tells when the game must end", () => {
    // Two games that differ only in their hard end. The seat schedules 41 seasons, turns 3 to 43, and turn 70 too.
    function scheduled(maxTurns: number): [string, string, number[]] {
      let s = newGame(31, newGameConfig({ catastropheChance: 0, capMin: maxTurns, capMax: maxTurns, endMedian: 10000 }));
      let sleep = newSleepState();
      s.sleep.set("Babylonia", sleep);
      let plans = range(3, 41)
        .concat([70])
        .map((t) => newScheduledOrders({ turn: t, orders: [hold("babylon")] }));
      let e = new TurnEngine(s);
      e.beginTurn();
      e.resolve(new Dict([["Babylonia", newTurnSubmission({ scheduled: plans })]]));
      let notices = join(
        "\n",
        inboxOf(s, "Babylonia")
          .filter((i) => i.kind === "Rejected")
          .map((i) => i.body),
      );
      return [situation(Views.for(s, "Babylonia")), notices, sleep.scheduled.map((x) => x.turn)];
    }
    let [shortText, shortNotices, shortTurns] = scheduled(40);
    let [longText, longNotices, longTurns] = scheduled(100);
    Assert.equal(longText, shortText);
    Assert.equal(longNotices, shortNotices);
    Assert.equal(longTurns, shortTurns);
    // The first 40 seasons are kept, past the game's last too; the 41st and turn 70 are not, with the same notice in both.
    Assert.equal(range(3, 40), shortTurns);
    Assert.contains("- turn 42: the army now in babylon holds", shortText);
    Assert.contains("- turns 43, 70: orders may be scheduled for at most 40 seasons", shortNotices);
  });

  // ------------------------------------------------------------ what wakes a seat

  test("An envoy at the door wakes the host for its audience only", async () => {
    let envoyId = "";
    let egypt = new Scripted((v) =>
      v.turn === 1 ? newTurnSubmission({ orders: [dispatch(envoyId, "Alashiya", "Greetings, brother.")] }) : newTurnSubmission(),
    );
    let sleeper = new Sleeper((_) => nothing());
    let state = newGame(31, Quiet);
    envoyId = firstOf(state.characters, (c) => c.employer === "Egypt").id;
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Alashiya" ? sleeper : p === "Egypt" ? egypt : new Scripted()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    let travel = new TurnEngine(state).travelTurns("Egypt", "Alashiya");
    for (let i = 0; i < 1 + travel; i++) await runner.playTurn();
    Assert.contains(1 + travel, sleeper.hosted);
    // It received the envoy, but no orders call followed: it did not reopen its orders, so they stand and it sleeps on.
    Assert.equal([1], sleeper.calls);
    let sl = state.sleep.get("Alashiya");
    Assert.true(sl.asleep);
    Assert.false(sl.holdsCourt);
    Assert.equal(0, last(sl.history).wokeAt);
    let court = Assert.single(sl.courts);
    Assert.equal([1 + travel, 1, false], [court.turn, court.envoys, court.reopened]);
    Assert.true(last(sleeper.audiences).ordersStand);
    // The audience opens like every request: how long the host slept and what woke it, and that its orders stand.
    Assert.endsWith(
      "You were woken to receive an envoy: an envoy of Egypt came to your court. Your orders stand unless you reopen them at your audience.",
      sleepLine(last(sleeper.courts)),
    );
  });

  test("Foreign troops entering its land and the land lost wake a sleeper", async () => {
    // Babylon disbands the army in Sippar and sleeps; Assyria walks in.
    let sleeper = new Sleeper((v) => (v.turn === 1 ? newTurnSubmission({ orders: [disband("sippar")] }) : nothing()));
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "sippar")] }) : newTurnSubmission()));
    await play("Babylonia", sleeper, 3, undefined, new Dict([["Assyria", assyria]]));
    Assert.equal([1, 3], sleeper.calls);
    Assert.equal(
      ["foreign troops entered your land: Assyria's army moved ekallate -> sippar", "land lost: Sippar has been taken by Assyria."],
      sleeper.views[1].wokenBecause,
    );
  });

  test("Troops destroyed in battle wake a sleeper", async () => {
    // An Assyrian army stands in Suhu (its walls gone, for the test) to support the attack on Sippar.
    function setup(s: GameState): void {
      s.walls.delete("suhu");
      s.owner.set("suhu", "Assyria");
      s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "suhu" }));
    }
    let sleeper = new Sleeper((_) => nothing());
    let assyria = new Scripted((v) =>
      v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "sippar"), supportOrder("suhu", "ekallate", "sippar")] }) : newTurnSubmission(),
    );
    await play("Babylonia", sleeper, 3, undefined, new Dict([["Assyria", assyria]]), setup);
    Assert.equal([1, 3], sleeper.calls);
    Assert.contains("your army in sippar was destroyed", sleeper.views[1].wokenBecause);
  });

  test("Troops going unpaid wake a sleeper", async () => {
    let sleeper = new Sleeper((_) => nothing());
    await play("Babylonia", sleeper, 3, { ...Quiet, armyUpkeep: 300 });
    Assert.equal(2, sleeper.calls[1]);
    Assert.contains("troops of yours went hungry or unpaid", sleeper.views[1].wokenBecause);
  });

  // <summary>The news that wakes a seat: land lost, troops lost to plague or desertion, a ransom demanded, a servant's notice.</summary>
  test.each([
    ["Battle", "Land lost", "Sippar has been taken by Assyria.", "land lost: Sippar has been taken by Assyria."],
    [
      "Catastrophe",
      "Catastrophe: Plague",
      "The hand of Nergal is on the land. Plague will cut income by a quarter for two seasons, and it has destroyed your A babylon.",
      "plague destroyed troops of yours",
    ],
    ["Notice", "The treasury", "A ur mutinied, unpaid 3 seasons running, and disbanded: its men went home.", "troops of yours mutinied"],
    ["Rumor", "Rumor", "Hatti holds Mane and demands 100 shekels for their return (order pay_ransom for c3).", "a ransom is demanded for one of your people"],
    ["Notice", NoticeTitle, "Mane's term has ended.", "a servant gives notice: Mane's term has ended."],
  ] as const)("News that concerns a seat wakes it %s", (kind: InboxKind, title: string, body: string, reason: string) => {
    let [s, sleep] = asleep("Babylonia");
    notify(s, "Babylonia", kind, title, body);
    new TurnEngine(s).wakeCheck();
    Assert.false(sleep.asleep);
    Assert.equal([reason], sleep.wokenBecause);
    Assert.equal([reason], single(sleep.history).reasons);
    Assert.equal(3, single(sleep.history).wokeAt);
  });

  test("Scheduled orders run while asleep and a refused one wakes nobody", async () => {
    let sleeper = new Sleeper((v) =>
      v.turn !== 1
        ? nothing()
        : newTurnSubmission({
            scheduled: [
              newScheduledOrders({ turn: 2, orders: [move("babylon", "nippur")] }),
              newScheduledOrders({ turn: 3, orders: [move("sippar", "memphis")] }),
            ],
          }),
    );
    let r = await play("Babylonia", sleeper, 6, cap(4));
    Assert.contains(r.state.units, (u) => u.power === "Babylonia" && u.province === "nippur");
    // The refusal in turn 3 waits for the cap (the review's probe: a king that scheduled an order he knew would be
    // refused, for a season already past, was woken by it every season; since the review of the fix pass after item 4
    // no refusal wakes him).
    Assert.equal([1, 6], sleeper.calls);
    Assert.equal([CapReason], sleeper.views[1].wokenBecause);
    Assert.contains("turn 4: an order was refused or failed (Orders that could not be carried out)", sleeper.views[1].digest);
    Assert.contains(sleeper.views[1].inbox.concat(sleeper.views[1].whileAsleep), (i) => i.body.includes("- sippar -> memphis: "));
    // The seat's view showed it what it had scheduled, and nobody else's view does.
    Assert.empty(Views.for(r.state, "Assyria").scheduled);
  });

  test("An order scheduled for a season already past wakes nobody", async () => {
    // The review's probe: a sleeping king adds an entry for the season before to every reply, to be woken next season.
    let sleeper = new Sleeper((v) => newTurnSubmission({ scheduled: [newScheduledOrders({ turn: v.turn - 1, orders: [hold("babylon")] })] }));
    let r = await play("Babylonia", sleeper, 4);
    Assert.equal([1], sleeper.calls);
    Assert.contains("- turn 0: that season has passed", noticeOf(r.state, "Babylonia", "Scheduled orders not kept").body);
    Assert.empty(r.state.sleep.get("Babylonia").pendingWake);
  });

  test("A scheduled move that foreign troops stop wakes the seat with the reason", async () => {
    // Assyria's army holds Ekallate against Sippar's lone army.
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [move("sippar", "ekallate")] })] }) : nothing(),
    );
    await play("Babylonia", sleeper, 3);
    Assert.equal([1, 3], sleeper.calls);
    Assert.equal(
      [
        "orders you scheduled could not be carried out: sippar -> ekallate (the unit holding ekallate (Assyria's army) kept its place; your strength 1 against 1)",
      ],
      sleeper.views[1].wokenBecause,
    );
  });

  test("A scheduled move into walls or stopped by its own unit wakes nobody", async () => {
    // Suhu's walls: a lone army gets within them but does not storm them (since the siege package walls stop no move). The
    // move succeeds, so nothing wakes the seat, and its report says what came of it.
    let walls = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [move("sippar", "suhu")] })] }) : nothing(),
    );
    let r = await play("Babylonia", walls, 3);
    Assert.equal([1], walls.calls);
    Assert.empty(r.state.sleep.get("Babylonia").pendingWake);
    Assert.contains(
      inboxOf(r.state, "Babylonia"),
      (i) =>
        i.title === "Movements last season" &&
        i.body.includes("sippar -> suhu: succeeds: it got within the walls of suhu but did not storm them (strength 1 against walls 1 and defenders 0)"),
    );
    Assert.null(r.state.owner.get("suhu"));

    // Babylon's own army holds Babylon: the move from Dur-Kurigalzu into it fails against its own unit.
    let own = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [move("durkurigalzu", "babylon")] })] }) : nothing(),
    );
    r = await play("Babylonia", own, 3);
    Assert.equal([1], own.calls);
    Assert.empty(r.state.sleep.get("Babylonia").pendingWake);
  });

  test("A scheduled assault on walls that others troops hold wakes the seat", async () => {
    // Suhu is Assyria's, with an Assyrian army within its walls that the army in Ekallate supports: strength 2 against 1.
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [move("sippar", "suhu")] })] }) : nothing(),
    );
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [supportOrder("ekallate", "suhu")] }) : newTurnSubmission()));
    await play("Babylonia", sleeper, 3, undefined, new Dict([["Assyria", assyria]]), (s) => {
      s.owner.set("suhu", "Assyria");
      s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "suhu" }));
    });
    Assert.equal([1, 3], sleeper.calls);
    Assert.equal(
      ["orders you scheduled could not be carried out: sippar -> suhu (the unit holding suhu (Assyria's army) kept its place; your strength 1 against 2)"],
      sleeper.views[1].wokenBecause,
    );
  });

  test("A scheduled purchase that fails at resolution wakes the seat", async () => {
    // Babylon and Assyria both bid for Suhu in season 2; the elders refuse both.
    let sleeper = new Sleeper((v) =>
      v.turn !== 1
        ? nothing()
        : newTurnSubmission({
            scheduled: [newScheduledOrders({ turn: 2, orders: [buy("suhu")] })],
          }),
    );
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [buy("suhu")] }) : newTurnSubmission()));
    // Both rich enough for the city's price (item 9+a: what it adds).
    await play("Babylonia", sleeper, 3, undefined, new Dict([["Assyria", assyria]]), (s) => {
      for (const t of s.treasuries.values()) t.gold += 5000;
    });
    Assert.equal([1, 3], sleeper.calls);
    Assert.contains(sleeper.views[1].wokenBecause, (w) => w.includes("suhu") && w.includes("would not choose between 2 buyers"));
  });

  test("A failure the seat has seen does not cut its next sleep short", async () => {
    // Turn 2: the scheduled support from Sippar is cut by Assyria's attack, which wakes the seat in turn 3. Having seen
    // it, the seat sleeps on until the cap wakes it, not the same failure again.
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [supportOrder("sippar", "babylon")] })] }) : nothing(),
    );
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "sippar")] }) : newTurnSubmission()));
    await play("Babylonia", sleeper, 7, cap(3), new Dict([["Assyria", assyria]]));
    Assert.equal([1, 3, 7], sleeper.calls);
    Assert.contains(sleeper.views[1].wokenBecause, (w) => w.startsWith("orders you scheduled could not be carried out"));
    Assert.equal([CapReason], sleeper.views[2].wokenBecause);
  });

  test("A scheduled support that is cut wakes the seat", async () => {
    // Sippar is to support Babylon holding in turn 2; Assyria attacks Sippar from Ekallate and cuts it (the attack fails).
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [supportOrder("sippar", "babylon")] })] }) : nothing(),
    );
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "sippar")] }) : newTurnSubmission()));
    await play("Babylonia", sleeper, 3, undefined, new Dict([["Assyria", assyria]]));
    Assert.equal([1, 3], sleeper.calls);
    // The failed attack wakes it too (since the review of the fix pass after item 4): it was attacked.
    Assert.equal(
      [
        "orders you scheduled could not be carried out: sippar supports babylon holding (the support was cut by an attack from ekallate)",
        `${AttackedReason}: Assyria's army tried to move ekallate -> sippar`,
      ],
      sleeper.views[1].wokenBecause,
    );
    Assert.contains(
      sleeper.views[1].inbox,
      (i) => i.title === "Movements last season" && i.body.includes("sippar supports babylon holding: cut (attacked from ekallate)"),
    );
  });

  test("A scheduled support that matches no move wakes nobody", async () => {
    // A support that matched no move tells only that the king guessed another unit's orders wrong: no one foiled it, and
    // a king could give one on purpose to be woken (since the review of the fix pass after item 4).
    let sleeper = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [supportOrder("sippar", "ekallate", "durkurigalzu")] })] })
        : nothing(),
    );
    let r = await play("Babylonia", sleeper, 3);
    Assert.equal([1], sleeper.calls);
    Assert.empty(r.state.sleep.get("Babylonia").pendingWake);
    Assert.contains(
      inboxOf(r.state, "Babylonia"),
      (i) => i.title === "Movements last season" && i.body.includes("no unit moved from ekallate to durkurigalzu"),
    );
  });

  test("An entry for this season counts as orders given now and its failure does not wake the seat", async () => {
    // Assyria's army holds Ekallate against a single army: the move sent as this season's entry fails, as a fresh order would.
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 1, orders: [move("sippar", "ekallate")] })] }) : nothing(),
    );
    let r = await play("Babylonia", sleeper, 3);
    Assert.equal([1], sleeper.calls);
    Assert.contains(inboxOf(r.state, "Babylonia"), (i) => i.turn === 2 && i.title === "Movements last season" && i.body.includes("sippar -> ekallate: fails"));
    Assert.empty(r.state.sleep.get("Babylonia").pendingWake);
  });

  test("A kingdom that falls in its sleep ends its sleep", async () => {
    let sleeper = new Sleeper((_) => nothing());
    let state = newGame(31, Quiet);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Alashiya" ? sleeper : new Scripted()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.playTurn();
    // The island changes hands by decree, as a test: Alashiya falls at the end of season 2.
    state.owner.set("enkomi", "Egypt");
    state.owner.set("kalavasos", "Egypt");
    removeAll(state.units, (u) => u.power === "Alashiya");
    await runner.playTurn();
    let sleep = state.sleep.get("Alashiya");
    Assert.false(sleep.asleep);
    Assert.equal([2, 3], [single(sleep.history).from, single(sleep.history).wokeAt]);
    Assert.equal(["the kingdom fell"], single(sleep.history).reasons);
  });

  // ------------------------------------------------------------ what waits in the digest

  test("Foreign troops beyond the border wait in the digest", async () => {
    let sleeper = new Sleeper((_) => nothing());
    // Arrapha lies beyond Babylon's border, next to none of its homeland: Assyria's army leaving Ekallate, which Babylon
    // can see, for Arrapha is news for the digest. (Troops ending a move next to its homeland, or off Alashiya's Kalavasos, wake.)
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "arrapha")] }) : newTurnSubmission()));
    let r = await play("Babylonia", sleeper, 4, { ...Quiet, maxSleep: 2 }, new Dict([["Assyria", assyria]]));
    Assert.equal([1, 4], sleeper.calls);
    Assert.equal([CapReason], sleeper.views[1].wokenBecause);
    Assert.contains("turn 2: Assyria's army moved ekallate -> arrapha", sleeper.views[1].digest);
  });

  test("A failed attack on its troops wakes the seat", async () => {
    // Since the review of the fix pass after item 4 ("it is attacked", among the design document's default triggers);
    // before, an attack that did not get in waited in the digest.
    let sleeper = new Sleeper((_) => nothing());
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "sippar")] }) : newTurnSubmission()));
    await play("Babylonia", sleeper, 4, { ...Quiet, maxSleep: 2 }, new Dict([["Assyria", assyria]]));
    Assert.equal([1, 3], sleeper.calls);
    Assert.equal([`${AttackedReason}: Assyria's army tried to move ekallate -> sippar`], sleeper.views[1].wokenBecause);
  });

  test("An envoy coming home with its report waits in the digest", async () => {
    let name = "";
    let sleeper = new Sleeper((v) => {
      if (v.turn !== 1) return nothing();
      let envoy = firstOf(v.court, (c) => c.ready);
      name = envoy.name;
      return newTurnSubmission({ orders: [dispatch(envoy.id, "Assyria", "Greetings, brother.")] });
    });
    await play("Babylonia", sleeper, 6, { ...Quiet, maxSleep: 4 });
    Assert.equal([1, 6], sleeper.calls);
    let woke = sleeper.views[1];
    Assert.equal([CapReason], woke.wokenBecause);
    Assert.contains(woke.digest, (d) => d.endsWith(`your envoy ${name} came home with a report`));
    Assert.contains(woke.whileAsleep, (i) => i.kind === "EnvoyReport");
  });

  // <summary>The news that does not wake a seat: it waits in the digest, a line each for what matters, all of it in the news.</summary>
  test.each([
    ["EnvoyReport", "Mane returns", "My lord, I have come home.", "your envoy {envoy} came home with a report"],
    ["SpyReport", "Word from Mane", "Hatti gathers chariots.", "a spy's report arrived (Word from Mane)"],
    ["CheckResult", "Inquiries into Mane", "Nothing is known.", "a report arrived (Inquiries into Mane)"],
    ["Assay", "Assay of gold", "The gold is fine.", "a report arrived (Assay of gold)"],
    ["Authentication", "Examination of a tablet", "Genuine.", "a report arrived (Examination of a tablet)"],
    ["Candidates", "Mane seeks service", "Mane asks 20 a season.", "a candidate presented themselves (Mane seeks service)"],
    ["Catastrophe", "Catastrophe: Drought", "The rains have failed.", "a catastrophe struck your land (Catastrophe: Drought)"],
    ["Tablet", "A tablet is ready", "Mane has produced a tablet.", "a tablet you ordered is ready (A tablet is ready)"],
    ["Notice", "A spy is caught", "A spy of Hatti was caught.", "a spy was caught at your court"],
    [
      "Notice",
      ArchiveTakenTitle,
      "With Ashur you took the archive of Assyria: copies of 1 tablet you did not hold are now in your archive: k130 (sealed by Assyria and Hatti, dated turn 1).",
      "with Ashur you took the archive of Assyria",
    ],
    [
      "Notice",
      ArchiveTakenTitle,
      "With Ashur you took the archive of Assyria; it held no tablet you did not hold already.",
      "with Ashur you took the archive of Assyria",
    ],
    ["Rejected", "Levy failed", "No army was raised in ur.", "an order was refused or failed (Levy failed)"],
    ["Rumor", "Rumor", "Word spreads that Hatti is restless.", null],
    ["Notice", "The treasury", "Income 200, upkeep 90, wages 20.", null],
  ] as const)("News that does not concern a seat waits in the digest %s", (kind: InboxKind, title: string, body: string, line: string | null) => {
    let [s, sleep] = asleep("Babylonia");
    let envoy = firstOf(s.characters, (c) => c.employer === "Babylonia");
    notify(s, "Babylonia", kind, title, body, envoy.id);
    new TurnEngine(s).wakeCheck();
    Assert.true(sleep.asleep);
    Assert.empty(sleep.wokenBecause);
    if (line === null) Assert.empty(sleep.digest);
    else Assert.equal(["turn 3: " + line.replaceAll("{envoy}", envoy.name)], sleep.digest);

    // Woken later, it reads the item in full among the news of the seasons it slept (a routine treasury notice is left out).
    s.turn = 5;
    let view = Views.for(s, "Babylonia");
    Assert.equal(
      kind === "Notice" && title === "The treasury" ? 0 : 1,
      count(view.whileAsleep, (i) => i.body === body),
    );
  });

  test("Distant news waits for the next waking and reads well", async () => {
    // Assyria's army leaves Ekallate, next to Babylon's land, for Arrapha, which is not: Babylon sees it and sleeps on.
    let sleeper = new Sleeper((_) => nothing());
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "arrapha")] }) : newTurnSubmission()));
    await play("Babylonia", sleeper, 5, { ...Quiet, maxSleep: 3 }, new Dict([["Assyria", assyria]]));
    Assert.equal([1, 5], sleeper.calls);
    let woke = sleeper.views[1];
    Assert.contains("turn 2: Assyria's army moved ekallate -> arrapha", woke.digest);
    // Routine treasury notices of the seasons it slept are left out: this season's is in its news.
    Assert.doesNotContain(woke.whileAsleep, (i) => i.title === "The treasury");
    Assert.contains(woke.inbox, (i) => i.title === "The treasury" && i.turn === 5);
    let text = situation(woke);
    Assert.contains(
      "WHILE YOU SLEPT (since you gave orders in turn 1):\nIn brief:\n- turn 2: Assyria's army moved ekallate -> arrapha",
      text.replaceAll("\r\n", "\n"),
    );
  });

  test("The news of a long sleep and its digest are bounded", () => {
    let [s, sleep] = asleep("Babylonia");
    s.turn = 14;
    for (let t = 2; t <= 13; t++) {
      inboxOf(s, "Babylonia").push(
        newInboxItem({ turn: t, kind: "Notice", title: "The treasury", body: t === 7 ? "Income 200. Could not pay: Mane." : "Income 200." }),
      );
      for (let k = 0; k < 4; k++) inboxOf(s, "Babylonia").push(newInboxItem({ turn: t, kind: "Rumor", title: "Rumor", body: `rumour ${t}.${k}` }));
    }
    let view = Views.for(s, "Babylonia");
    // 48 rumours and the one treasury notice that says more than the figures: the latest 40 are shown.
    Assert.equal(MaxWhileAsleep, view.whileAsleep.length);
    Assert.equal(9, view.whileAsleepLeftOut);
    Assert.equal("rumour 13.3", view.whileAsleep.at(-1)!.body);
    Assert.single(view.whileAsleep, (i) => i.title === "The treasury");
    Assert.contains("9 earlier items left out", situation(view));

    for (let k = 0; k < 65; k++) notify(s, "Babylonia", "Rejected", `Failure ${k}`, "It failed.");
    new TurnEngine(s).wakeCheck();
    Assert.equal(MaxDigest, sleep.digest.length);
    Assert.equal(5, sleep.digestLeftOut);
    Assert.equal("turn 14: an order was refused or failed (Failure 64)", sleep.digest.at(-1)!);
    Assert.contains("In brief (5 earlier lines left out):", situation(Views.for(s, "Babylonia")));
  });

  test("Once the seat has read its digest the next one starts afresh", () => {
    // Woken in turn 3 with a full digest, the seat gives orders: the next digest has no lines left out.
    let [s, sleep] = asleep("Babylonia");
    sleep.asleep = false;
    sleep.digest = ["turn 2: an order was refused or failed (Old)"];
    sleep.digestLeftOut = 5;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", newTurnSubmission()]]));
    Assert.true(sleep.asleep);
    Assert.empty(sleep.digest);
    Assert.equal(0, sleep.digestLeftOut);

    notify(s, "Babylonia", "Rejected", "Levy failed", "No army was raised in ur.");
    new TurnEngine(s).wakeCheck();
    Assert.true(sleep.asleep);
    Assert.contains("turn 4: an order was refused or failed (Levy failed)", sleep.digest);
    Assert.equal(0, sleep.digestLeftOut);
    let text = situation(Views.for(s, "Babylonia"));
    Assert.contains("In brief:", text);
    Assert.doesNotContain("lines left out", text);
  });

  test("A failed move into its empty land wakes the seat and one elsewhere waits in the digest", () => {
    let [s, sleep] = asleep("Babylonia");
    s.lastSeen.set("Babylonia", [
      newOrderOutcome({ power: "Assyria", unitKind: "Army", province: "ekallate", order: "move", target: "sippar", targetOwner: "Babylonia" }),
      newOrderOutcome({ power: "Assyria", unitKind: "Army", province: "suhu", order: "move", target: "terqa", targetOwner: "Assyria" }),
    ]);
    new TurnEngine(s).wakeCheck();
    Assert.false(sleep.asleep);
    Assert.equal([`${AttackedReason}: Assyria's army tried to move ekallate -> sippar`], sleep.wokenBecause);

    [s, sleep] = asleep("Babylonia");
    s.lastSeen.set("Babylonia", [
      newOrderOutcome({ power: "Assyria", unitKind: "Army", province: "suhu", order: "move", target: "terqa", targetOwner: "Assyria" }),
    ]);
    new TurnEngine(s).wakeCheck();
    Assert.true(sleep.asleep);
    Assert.equal(["turn 2: Assyria's army tried to move suhu -> terqa and failed"], sleep.digest);
  });

  test("A seat whose first call failed is told it gives orders for the first time", async () => {
    let calls = 0;
    let sleeper = new Sleeper(() => {
      if (++calls === 1) throw new Error("the model did not answer");
      return nothing();
    });
    await play("Babylonia", sleeper, 2, undefined, undefined, (s) =>
      inboxOf(s, "Babylonia").push(newInboxItem({ turn: 1, kind: "Rumor", title: "Rumor", body: "Word spreads that Hatti is restless." })),
    );
    Assert.equal([1, 2], sleeper.calls);
    let second = sleeper.views[1];
    Assert.equal(0, second.lastCalled);
    Assert.equal("This is the first season you give orders.", sleepLine(second));
    Assert.contains("WHILE YOU SLEPT (since the game began):", situation(second));
  });

  test("Orders scheduled for a season that has passed are reported not kept", async () => {
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? nothing() : v.turn === 3 ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [hold("babylon")] })] }) : nothing(),
    );
    let r = await play("Babylonia", sleeper, 3, cap(1));
    let notice = Assert.single(inboxOf(r.state, "Babylonia"), (i) => i.title === "Scheduled orders not kept");
    Assert.equal([4, "- turn 2: that season has passed"], [notice.turn, notice.body]);
    Assert.empty(r.state.sleep.get("Babylonia").scheduled);
  });
});
