import { describe, test } from "vitest";
import {
  AttackedReason,
  Dict,
  LostTroopsTitle,
  MarchEndsTitle,
  MarchHeldUpTitle,
  OrderValidator,
  type Power,
  TurnEngine,
  type TurnSubmission,
  UnraisedTitle,
  Views,
  WorldMap,
  asItStands,
  disband,
  first,
  hold,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newPlannedOrder,
  newScheduledOrders,
  newSleepState,
  newTurnSubmission,
  raise,
  single,
  unitAt,
  unreadable,
} from "@amarna/engine";
import { Schemas, leaderRules, situation } from "@amarna/llm";
import { Assert, singleOrNull, join, oldWorld } from "../../engine/test/support.ts";
import { Sleeper } from "./sleep-support.ts";
import { Scripted } from "./sleep-support.ts";
import { nothing } from "./sleep-support.ts";
import { play } from "./sleep-support.ts";
import { plan } from "./sleep-support.ts";
import { enters } from "./sleep-support.ts";
import { attackedOf } from "./sleep-support.ts";
import { standingOf } from "./sleep-support.ts";
import { noticeOf } from "./sleep-support.ts";
import { emptyDurkurigalzu } from "./sleep-support.ts";
import { convoy as convoyOrder } from "@amarna/engine";
import { first as firstOf } from "@amarna/engine";
import { support as supportOrder } from "@amarna/engine";
import { describe as describeOrder } from "@amarna/engine";

// Sleeping seats: orders that follow their unit, levies and marches.
describe("SleepTests", () => {
  // ------------------------------------------------------------ orders that follow their unit, and marches

  test("A scheduled order follows its unit and runs from where it then stands", async () => {
    // Each army is named by where it stands in turn 1. The one in Babylon marches to Nippur and then to Ur, while the one
    // in Sippar takes its place in Babylon: "babylon -> ur" for turn 3 is the first army's order, wherever it is by then.
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? plan([2, [move("babylon", "nippur"), move("sippar", "babylon")]], [3, [move("babylon", "ur")]]) : nothing(),
    );
    let r = await play("Babylonia", sleeper, 2);
    let marcher = unitAt(r.state, "nippur")!;
    // The seat's view names the order's unit by where it stands now.
    Assert.contains("- turn 3: the army now in nippur -> ur", situation(Views.for(r.state, "Babylonia")));
    Assert.equal(move("nippur", "ur"), single(single(Views.for(r.state, "Babylonia").scheduled).orders));

    await r.playTurn();
    Assert.equal([1], sleeper.calls);
    Assert.equal("ur", marcher.province);
    // The army that came from Sippar was given no order for turn 3, and held in Babylon.
    Assert.equal("Babylonia", unitAt(r.state, "babylon")?.power);
    Assert.null(unitAt(r.state, "sippar"));
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.kind === "Rejected");
  });

  test("An order naming a province where the seat has no unit is refused when given and wakes nobody", () => {
    let s = oldWorld(newGame(31, newGameConfig({ catastropheChance: 0 })));
    let sleep = newSleepState();
    s.sleep.set("Babylonia", sleep);
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", plan([3, [move("nippur", "ur"), move("ekallate", "ashur"), raise("nippur", "Army")]])]]));
    // The levy names no unit and is kept; each move is refused, and the seat reads why next season.
    Assert.equal(raise("nippur", "Army"), Assert.single(sleep.scheduled).order);
    let notice = noticeOf(s, "Babylonia", "Scheduled orders not kept");
    Assert.equal(
      [2, "- turn 3: nippur -> ur: you have no unit in nippur\n- turn 3: ekallate -> ashur: the unit in ekallate is not yours"],
      [notice.turn, notice.body],
    );
    // A refusal wakes nobody (since the review of the fix pass after item 4): an order the king knows will be refused must
    // not be a way to be woken. It waits in his news and his digest.
    Assert.empty(sleep.pendingWake);
    new TurnEngine(s).wakeCheck();
    Assert.true(sleep.asleep);
    Assert.empty(sleep.wokenBecause);
    Assert.contains("turn 2: an order was refused or failed (Scheduled orders not kept)", sleep.digest);
  });

  // ------------------------------------------------------------ scheduled orders for new levies (the fix pass after item 4)

  test("A levy ordered now can be given orders for later seasons", async () => {
    // Turn 1: raise an army in Nippur, and schedule its march to Ur for turn 2. Before the fix pass the order was refused
    // (no unit in Nippur yet), so a king named the next season to give it by hand.
    let sleeper = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({ orders: [raise("nippur", "Army")], scheduled: [newScheduledOrders({ turn: 2, orders: [move("nippur", "ur")] })] })
        : nothing(),
    );
    let r = await play("Babylonia", sleeper, 1);
    let sleep = r.state.sleep.get("Babylonia");
    let levy = unitAt(r.state, "nippur")!;
    // Raised at the end of turn 1, it is bound to the order, which now follows it like any other.
    Assert.equal(levy.id, Assert.single(sleep.scheduled).unitId);
    Assert.null(sleep.scheduled[0].unitLevy);
    Assert.contains("- turn 2: the army now in nippur -> ur", situation(Views.for(r.state, "Babylonia")));
    await r.playTurn();
    Assert.equal(levy.id, unitAt(r.state, "ur")?.id);
    Assert.equal([1], sleeper.calls);
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.kind === "Rejected");
  });

  test("A scheduled levy s unit can be given orders for the seasons after it and others can support it", async () => {
    // Turn 2: raise an army in Ur. Turn 3: it marches to Nippur, the army in Babylon supporting it. Until turn 2 the view
    // names it as the army to be raised.
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? plan([2, [raise("ur", "Army")]], [3, [move("ur", "nippur"), supportOrder("babylon", "ur", "nippur")]]) : nothing(),
    );
    let r = await play("Babylonia", sleeper, 1);
    let sleep = r.state.sleep.get("Babylonia");
    Assert.equal(["ur", 2], [sleep.scheduled[1].unitLevy!.province, sleep.scheduled[1].unitLevy!.turn]);
    Assert.equal(["ur", 2], [sleep.scheduled[2].otherLevy!.province, sleep.scheduled[2].otherLevy!.turn]);
    Assert.contains(
      "- turn 3: the army to be raised in ur in turn 2 -> nippur; the army now in babylon supports the army to be raised in ur in turn 2 -> nippur",
      situation(Views.for(r.state, "Babylonia")),
    );

    await r.playTurn();
    await r.playTurn();
    // The new army stands in Nippur, its march supported from Babylon.
    Assert.equal("Babylonia", unitAt(r.state, "nippur")?.power);
    Assert.equal("Babylonia", unitAt(r.state, "babylon")?.power);
    Assert.null(unitAt(r.state, "ur"));
    Assert.equal([1], sleeper.calls);
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.kind === "Rejected");
    Assert.contains(inboxOf(r.state, "Babylonia"), (i) => i.title === "Movements last season" && i.body.includes("Babili supports Urim -> Nippur"));
  });

  test("After a levy its province names the levy s unit even where another unit stands now", () => {
    // Turn 2: the army in Dur-Kurigalzu marches to Nippur and a new army is raised behind it. Turn 3's order for
    // Dur-Kurigalzu is the new army's; turn 2's is the old one's.
    let s = oldWorld(newGame(31, newGameConfig({ catastropheChance: 0 })));
    let sleep = newSleepState();
    s.sleep.set("Babylonia", sleep);
    let old = unitAt(s, "durkurigalzu")!;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", plan([2, [move("durkurigalzu", "nippur"), raise("durkurigalzu", "Army")]], [3, [hold("durkurigalzu")]])]]));
    Assert.equal(old.id, single(sleep.scheduled, (x) => x.turn === 2 && x.order.type === "move").unitId);
    Assert.equal("durkurigalzu", single(sleep.scheduled, (x) => x.turn === 3).unitLevy?.province);

    e = new TurnEngine(s);
    e.beginTurn();
    e.wakeCheck();
    e.resolve(new Dict<Power, TurnSubmission>());
    let raised = unitAt(s, "durkurigalzu")!;
    Assert.notEqual(old.id, raised.id);
    Assert.equal(old.id, unitAt(s, "nippur")?.id);
    Assert.equal(raised.id, single(sleep.scheduled, (x) => x.turn === 3).unitId);
  });

  test("Orders for a levy that raises no unit are dropped and told without waking the seat", async () => {
    // Turn 2: a levy in Sippar, where Babylon's own army stands, so it fails; turn 3: the new army was to march to Suhu.
    // In turn 3 the name Sippar means the levy's unit, not the army standing there, which stays.
    let sleeper = new Sleeper((v) => (v.turn === 1 ? plan([2, [raise("sippar", "Army")]], [3, [move("sippar", "suhu")]]) : nothing()));
    let r = await play("Babylonia", sleeper, 3);
    let standing = unitAt(r.state, "sippar")!;
    Assert.equal("Babylonia", standing.power);
    Assert.equal(
      "These orders were for troops a levy was to raise, and it raised none, so they were dropped:\n- turn 3: the army to be raised in sippar in turn 2 -> suhu",
      noticeOf(r.state, "Babylonia", UnraisedTitle).body,
    );
    // Its own army stood in the way of its own levy: nothing others did, so nothing wakes it (since the review of the fix
    // pass after item 4; before, both the levy and the orders dropped woke it, a way to wake itself).
    Assert.equal([1], sleeper.calls);
    let sleep = r.state.sleep.get("Babylonia");
    Assert.empty(sleep.pendingWake);
    Assert.contains("turn 3: an order was refused or failed (Levy failed)", sleep.digest);
    Assert.contains(`turn 3: an order was refused or failed (${UnraisedTitle})`, sleep.digest);
    Assert.empty(sleep.scheduled);
  });

  test("The rulebook says a unit to be raised can be given orders ahead", () => {
    let rules = leaderRules(true, newGameConfig());
    Assert.contains(
      "A unit you raise can be given orders ahead too: name it by the province of its levy, in orders for any season after the levy (a levy you order now, or one you schedule). In those seasons that name means the unit the levy raises, even if another of your units stands there now; if the levy raises none, those orders are dropped (your news says so). Any other order naming a province where you have no unit is refused.",
      rules,
    );
    Assert.doesNotContain("a unit not yet raised cannot be given orders ahead", rules);
    Assert.contains(
      "A unit a levy is to raise (one you order now or schedule for an earlier season): the province of the levy.",
      JSON.stringify(Schemas.leaderOrders(newGameConfig())),
    );
  });

  test("A refusal says nothing of troops out of sight", () => {
    // Babylon sees Ekallate (an Assyrian army) and Nippur (empty), not Ashur (an Assyrian army) or Arbela (empty).
    let s = oldWorld(newGame(31, newGameConfig({ catastropheChance: 0 })));
    let sleep = newSleepState();
    s.sleep.set("Babylonia", sleep);
    let sight = Views.sight(s, WorldMap.default, "Babylonia");
    Assert.equal([true, true, false, false], [sight.has("ekallate"), sight.has("nippur"), sight.has("ashur"), sight.has("arbela")]);
    Assert.equal(
      ["Assyria", null, "Assyria", null],
      [unitAt(s, "ekallate")!.power, unitAt(s, "nippur")?.power, unitAt(s, "ashur")!.power, unitAt(s, "arbela")?.power],
    );
    let probes = [hold("ashur"), hold("arbela"), hold("ekallate"), hold("nippur")];
    let refusals =
      "ashur holds: you have no unit in ashur|arbela holds: you have no unit in arbela|ekallate holds: the unit in ekallate is not yours|nippur holds: you have no unit in nippur";

    // Given now, and scheduled, the unit out of sight and the empty province out of sight are refused in the same words.
    let now = new OrderValidator(s).validate("Babylonia", newTurnSubmission({ orders: probes }));
    Assert.equal(
      refusals,
      join(
        "|",
        now.rejected.map((r) => `${describeOrder(r.order)}: ${r.reason}`),
      ),
    );
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", plan([3, probes])]]));
    Assert.equal("- turn 3: " + refusals.replaceAll("|", "\n- turn 3: "), noticeOf(s, "Babylonia", "Scheduled orders not kept").body);
    Assert.empty(sleep.scheduled);

    // A support of a move from a province out of sight is given whatever stands there, and is void if no unit there makes
    // that move; one naming an empty province in sight is refused.
    let supports = new OrderValidator(s).validate(
      "Babylonia",
      newTurnSubmission({
        orders: [supportOrder("durkurigalzu", "arbela", "ekallate"), supportOrder("sippar", "ashur", "suhu"), supportOrder("babylon", "nippur")],
      }),
    );
    Assert.equal([supportOrder("durkurigalzu", "arbela", "ekallate"), supportOrder("sippar", "ashur", "suhu")], supports.accepted);
    Assert.equal("there is no unit in nippur to support", Assert.single(supports.rejected).reason);

    // So is a convoy: Egypt's fleet, off Byblos, sees Byblos (empty) but not Ṣumur (empty too).
    unitAt(s, "delta")!.province = "bybloswaters";
    let egypt = Views.sight(s, WorldMap.default, "Egypt");
    Assert.equal([true, false], [egypt.has("byblos"), egypt.has("sumur")]);
    function convoyOf(army: string): string | null {
      return (
        singleOrNull(new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [convoyOrder("bybloswaters", army, "tyre")] })).rejected)?.reason ?? null
      );
    }
    Assert.null(convoyOf("sumur"));
    Assert.equal("there is no army in byblos", convoyOf("byblos"));
  });

  test("A scheduled support of one s own unit follows the unit supported", async () => {
    // The army in Sippar marches to Nippur in turn 2; in turn 3 the army in Babylon is to support it holding, named
    // by where it stood when the orders were given. The support follows it to Nippur.
    let sleeper = new Sleeper((v) => (v.turn === 1 ? plan([2, [move("sippar", "nippur")]], [3, [supportOrder("babylon", "sippar")]]) : nothing()));
    let r = await play("Babylonia", sleeper, 2, undefined, undefined, emptyDurkurigalzu);
    Assert.contains("- turn 3: the army now in babylon supports the army now in nippur holding", situation(Views.for(r.state, "Babylonia")));
    Assert.equal(supportOrder("babylon", "nippur"), single(single(Views.for(r.state, "Babylonia").scheduled).orders));

    await r.playTurn();
    Assert.equal([1], sleeper.calls);
    Assert.contains(
      "supports Nippur holding: given",
      single(inboxOf(r.state, "Babylonia"), (i) => i.title === "Movements last season" && i.turn === 4).body,
    );
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.kind === "Rejected");
    Assert.empty(r.state.sleep.get("Babylonia").pendingWake);
  });

  test("A kept order is given from where its units stand now", () => {
    // Egypt's fleet convoys its own army, and an army supports another: each order follows both its units.
    let s = oldWorld(newGame(31, newGameConfig({ catastropheChance: 0 })));
    let fleet = unitAt(s, "delta")!;
    let army = unitAt(s, "memphis")!;
    let helper = unitAt(s, "akhetaten")!;
    let convoy = newPlannedOrder({ order: convoyOrder("delta", "memphis", "gaza"), unitId: fleet.id, otherUnitId: army.id });
    let support = newPlannedOrder({ order: supportOrder("akhetaten", "memphis", "sinai"), unitId: helper.id, otherUnitId: army.id });
    [fleet.province, army.province, helper.province] = ["tyrewaters", "tyre", "memphis"];
    Assert.equal(convoyOrder("tyrewaters", "tyre", "gaza"), asItStands(s, "Egypt", convoy));
    Assert.equal(supportOrder("memphis", "tyre", "sinai"), asItStands(s, "Egypt", support));
    // Given away, the army supported takes the order with it.
    army.power = "Hatti";
    Assert.null(asItStands(s, "Egypt", support));
  });

  test("A march that is stopped tries the step again and its later orders wait a season", async () => {
    // Sippar's army is to march to Durkurigalzu in turn 2 and on to Nippur in turn 3. Assyria moves into Durkurigalzu in
    // turn 2 too, and both bounce. The army tries again in turn 3 and gets there; its next step runs in turn 4.
    let sleeper = new Sleeper((v) => (v.turn === 1 ? plan([2, [move("sippar", "durkurigalzu")]], [3, [move("sippar", "nippur")]]) : nothing()));
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "durkurigalzu")] }) : newTurnSubmission()));
    let r = await play("Babylonia", sleeper, 4, undefined, new Dict([["Assyria", assyria]]), emptyDurkurigalzu);

    // The move others stopped wakes the seat (and so does their move into its land), which sees the shifted plan and lets it stand.
    Assert.equal([1, 3], sleeper.calls);
    Assert.equal(2, sleeper.views[1].wokenBecause.length);
    Assert.startsWith(
      "orders you scheduled could not be carried out: sippar -> durkurigalzu (it met a move into Dur-Kurigalzu from Ekallate",
      sleeper.views[1].wokenBecause[0],
    );
    Assert.equal(`${AttackedReason}: Assyria's army tried to move ekallate -> durkurigalzu`, sleeper.views[1].wokenBecause[1]);
    let notice = noticeOf(r.state, "Babylonia", MarchHeldUpTitle);
    Assert.equal(["Rejected", 3], [notice.kind, notice.turn]);
    Assert.equal(
      "Your army in sippar did not reach durkurigalzu in turn 2. It will try again in turn 3, and each of its later scheduled orders waits a season (they now run in turn 4).",
      notice.body,
    );
    let text = situation(sleeper.views[1]);
    Assert.contains("- turn 3: the army now in sippar -> durkurigalzu\n- turn 4: the army now in sippar -> nippur", text.replaceAll("\r\n", "\n"));

    Assert.equal("Babylonia", unitAt(r.state, "nippur")?.power);
    Assert.null(unitAt(r.state, "sippar"));
    Assert.null(unitAt(r.state, "durkurigalzu"));
    Assert.empty(r.state.sleep.get("Babylonia").scheduled);
  });

  test("A march stopped twice in a row ends and the unit s remaining orders are dropped", async () => {
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? plan([2, [move("sippar", "durkurigalzu")]], [3, [move("sippar", "nippur")]], [5, [hold("sippar")]]) : nothing(),
    );
    let assyria = new Scripted((v) => ([2, 3].includes(v.turn) ? newTurnSubmission({ orders: [move("ekallate", "durkurigalzu")] }) : newTurnSubmission()));
    let r = await play("Babylonia", sleeper, 4, undefined, new Dict([["Assyria", assyria]]), emptyDurkurigalzu);

    Assert.equal([1, 3, 4], sleeper.calls);
    Assert.startsWith("orders you scheduled could not be carried out: sippar -> durkurigalzu", sleeper.views[2].wokenBecause[0]);
    let notice = noticeOf(r.state, "Babylonia", MarchEndsTitle);
    Assert.equal(4, notice.turn);
    Assert.equal(
      "Your army in sippar failed to reach durkurigalzu a second time in turn 3: its march ends, and its remaining scheduled orders were dropped: turn 4: sippar -> nippur; turn 6: sippar holds.",
      notice.body,
    );
    Assert.equal("Babylonia", unitAt(r.state, "sippar")?.power);
    Assert.null(unitAt(r.state, "nippur"));
    Assert.empty(r.state.sleep.get("Babylonia").scheduled);
  });

  test("A scheduled move that is refused is not tried again and ends the march", async () => {
    let sleeper = new Sleeper((v) =>
      v.turn === 1 ? plan([2, [move("babylon", "ur"), move("sippar", "babylon")]], [3, [move("babylon", "nippur")]]) : nothing(),
    );
    let r = await play("Babylonia", sleeper, 3);
    // Neither failure wakes the seat: the refusal is its own, and so is the move its own army in Babylon stopped.
    Assert.equal([1], sleeper.calls);
    Assert.contains("- babylon -> ur: an army in babylon cannot reach ur", noticeOf(r.state, "Babylonia", "Orders that could not be carried out").body);
    let notice = single(inboxOf(r.state, "Babylonia"), (i) => i.title === MarchEndsTitle && i.turn === 3);
    Assert.equal(
      "Your army in babylon could not be ordered to ur in turn 2 (an army in babylon cannot reach ur): its march ends, and its remaining scheduled orders were dropped: turn 3: babylon -> nippur.",
      notice.body,
    );
    // The move into Babylon, stopped by its own army there, is another unit's march: it is tried again in turn 3, and stopped again.
    Assert.equal(
      "Your army in sippar did not reach babylon in turn 2. It will try again in turn 3.",
      noticeOf(r.state, "Babylonia", MarchHeldUpTitle).body,
    );
    Assert.equal(
      "Your army in sippar failed to reach babylon a second time in turn 3: its march ends.",
      single(inboxOf(r.state, "Babylonia"), (i) => i.title === MarchEndsTitle && i.turn === 4).body,
    );
    Assert.equal("Babylonia", unitAt(r.state, "babylon")?.power);
    Assert.null(unitAt(r.state, "nippur"));
  });

  test("A refused last step ends nothing more and is told once", async () => {
    // With nothing scheduled after it, a refused move has no march to end: the refusal alone is told, and wakes nobody.
    let sleeper = new Sleeper((v) => (v.turn === 1 ? plan([2, [move("babylon", "ur")]]) : nothing()));
    let r = await play("Babylonia", sleeper, 3);
    Assert.equal([1], sleeper.calls);
    Assert.empty(r.state.sleep.get("Babylonia").pendingWake);
    Assert.doesNotContain(inboxOf(r.state, "Babylonia"), (i) => i.title === MarchEndsTitle);
    Assert.contains("- babylon -> ur: an army in babylon cannot reach ur", noticeOf(r.state, "Babylonia", "Orders that could not be carried out").body);
    Assert.contains("turn 3: an order was refused or failed (Orders that could not be carried out)", r.state.sleep.get("Babylonia").digest);
  });

  test("A scheduled order that cannot be read is refused when given and wakes nobody", () => {
    let s = oldWorld(newGame(31, newGameConfig({ catastropheChance: 0 })));
    let sleep = newSleepState();
    s.sleep.set("Babylonia", sleep);
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Babylonia", plan([3, [unreadable("babylon move", "name the province the unit should move to"), hold("babylon")]])]]));
    Assert.equal(hold("babylon"), Assert.single(sleep.scheduled).order);
    Assert.equal("- turn 3: babylon move: name the province the unit should move to", noticeOf(s, "Babylonia", "Scheduled orders not kept").body);
    new TurnEngine(s).wakeCheck();
    Assert.true(sleep.asleep);
    Assert.empty(sleep.wokenBecause);
  });

  test("Orders for a unit that is lost are dropped and told", async () => {
    // The army in Durkurigalzu is disbanded in turn 2, by an order scheduled with a later one for it, and one for another unit.
    let sleeper = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({
            scheduled: [
              newScheduledOrders({ turn: 2, orders: [disband("durkurigalzu")] }),
              newScheduledOrders({ turn: 4, orders: [move("durkurigalzu", "nippur"), supportOrder("sippar", "durkurigalzu"), hold("babylon")] }),
            ],
            standing: [
              attackedOf("durkurigalzu", hold("babylon")),
              enters(null, "susa", move("durkurigalzu", "susa"), hold("babylon")),
              // Every order of this one is for the lost unit: it goes whole.
              enters(null, "suhu", hold("durkurigalzu")),
            ],
          })
        : nothing(),
    );
    let r = await play("Babylonia", sleeper, 3);
    let notice = noticeOf(r.state, "Babylonia", LostTroopsTitle);
    Assert.equal(3, notice.turn);
    Assert.endsWith(
      ":\n- turn 4: durkurigalzu -> nippur\n- turn 4: sippar supports durkurigalzu holding\n- standing order s1 (when your unit that stood in durkurigalzu is attacked)" +
        "\n- from standing order s2: durkurigalzu -> susa\n- standing order s3 (when foreign troops enter suhu)",
      notice.body,
    );
    // The seat disbanded the unit itself: dropping its orders wakes nobody (since the review of the fix pass after item 4;
    // troops lost to others wake the seat by themselves).
    Assert.equal([1], sleeper.calls);
    let sleep = r.state.sleep.get("Babylonia");
    Assert.empty(sleep.pendingWake);
    Assert.contains(`turn 3: an order was refused or failed (${LostTroopsTitle})`, sleep.digest);
    // What does not depend on the lost unit stands.
    Assert.equal(hold("babylon"), Assert.single(sleep.scheduled).order);
    Assert.equal(hold("babylon"), Assert.single(Assert.single(standingOf(r.state, "Babylonia")).orders).order);
  });
});
