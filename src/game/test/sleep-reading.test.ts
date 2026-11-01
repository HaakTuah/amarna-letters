import { describe, test } from "vitest";
import { Near, smallSeats } from "./small-world.ts";
import {
  AllPowers,
  CapReason,
  Dict,
  type GameState,
  HSet,
  MarchHeldUpTitle,
  TurnEngine,
  Views,
  convoy,
  disband,
  dispatch,
  hold,
  sell,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newInboxItem,
  newScheduledOrders,
  newSeatView,
  newTurnSubmission,
  raise,
  single,
  support,
} from "@amarna/engine";
import { GameLog, GameRunner, HumanSeat, ScriptLeader, ScriptMind, TemplateNarrator, newLogHeader, playGame } from "@amarna/game";
import { LlmLeaderSeat, Schemas, leaderRules, situation, sleepLine } from "@amarna/llm";
import { Assert, last, toDict } from "../../engine/test/support.ts";
import { Sleeper } from "./sleep-support.ts";
import { Scripted } from "./sleep-support.ts";
import { ModelRecorder } from "./sleep-support.ts";
import { Quiet } from "./sleep-support.ts";
import { nothing } from "./sleep-support.ts";
import { cap } from "./sleep-support.ts";
import { play } from "./sleep-support.ts";
import { enters } from "./sleep-support.ts";
import { attackedOf } from "./sleep-support.ts";
import { convoy as convoyOrder } from "@amarna/engine";
import { first as firstOf } from "@amarna/engine";
import { support as supportOrder } from "@amarna/engine";
import { describe as describeOrder } from "@amarna/engine";

// Sleeping seats: what the kings read, fresh orders, the stand-in, the switch and replays.
describe("SleepTests", () => {
  // ------------------------------------------------------------ what the kings read

  test("Every request opens with how long the king slept and what woke it", async () => {
    // The king reopens its orders at the audience, so an orders request follows it in the same season.
    let recorder = new ModelRecorder(true);
    let envoyId = "";
    let egypt = new Scripted((v) =>
      v.turn === 1 ? newTurnSubmission({ orders: [dispatch(envoyId, "Alashiya", "Greetings, brother.")] }) : newTurnSubmission(),
    );
    let state = newGame(31, Quiet);
    envoyId = firstOf(state.characters, (c) => c.employer === "Egypt").id;
    let king = new LlmLeaderSeat("Alashiya", recorder, "claude-sonnet-5-5", "medium", true, state.config);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Alashiya" ? king : p === "Egypt" ? egypt : new Scripted()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    let travel = new TurnEngine(state).travelTurns("Egypt", "Alashiya");
    for (let i = 0; i < 1 + travel; i++) await runner.playTurn();

    let first = single(recorder.specs, (x) => x.key === "t1/orders/Alashiya");
    Assert.startsWith("This is your first season.\n", first.user.replaceAll("\r\n", "\n"));
    Assert.contains("YOU SLEEP BETWEEN YOUR ORDERS\nAfter you give your orders, you sleep.", first.sharedSystem.replaceAll("\r\n", "\n"));
    Assert.contains('"schedule"', JSON.stringify(first.schema));
    Assert.doesNotContain('"wake_in_turn"', JSON.stringify(first.schema));
    let slept = travel - 1;
    let since = slept === 0 ? "You gave orders last season (turn 1)." : `You slept ${slept} season${slept === 1 ? "" : "s"} (you last gave orders in turn 1).`;
    let host = firstOf(recorder.specs, (x) => x.key.startsWith(`t${1 + travel}/court/`));
    Assert.startsWith(
      since + " You were woken to receive an envoy: an envoy of Egypt came to your court. Your orders stand unless you reopen them at your audience.\n",
      host.user.replaceAll("\r\n", "\n"),
    );
    let orders = single(recorder.specs, (x) => x.key === `t${1 + travel}/orders/Alashiya`);
    // By its orders the envoy has been received: the audiences come first (since "Requests are rules too").
    Assert.startsWith(
      since +
        " You were woken because: an envoy of Egypt came to your court (you received him before these orders); you chose at your audience to reopen your orders.\n",
      orders.user.replaceAll("\r\n", "\n"),
    );
    // An orders request ends by saying the king sleeps after its orders.
    Assert.endsWith(
      "Now give your orders for this season and the seasons ahead: your troops, your envoys and letters, orders scheduled for later seasons, standing orders, and anything else. You sleep after them.",
      orders.user.trimEnd(),
    );
  });

  test("Woken the season after its orders a king is told it gave orders last season", () => {
    let view = newSeatView({ sleeps: true, turn: 5, lastCalled: 4, wokenBecause: ["an envoy of Egypt waits to be received"] });
    Assert.equal("You gave orders last season (turn 4). You were woken because: an envoy of Egypt came to your court.", sleepLine(view));
    view.turn = 6;
    Assert.startsWith("You slept 1 season (you last gave orders in turn 4).", sleepLine(view));
  });

  test("An audience after a sleep tells the host what happened while it slept", async () => {
    // Alashiya sleeps from turn 1. News reaches it in turn 2; Egypt's envoy, sent in turn 2, wakes it later for an
    // audience, where it reopens its orders.
    let recorder = new ModelRecorder(true);
    let envoyId = "";
    let egypt = new Scripted((v) =>
      v.turn === 2 ? newTurnSubmission({ orders: [dispatch(envoyId, "Alashiya", "Greetings, brother.")] }) : newTurnSubmission(),
    );
    let state = newGame(31, Quiet);
    envoyId = firstOf(state.characters, (c) => c.employer === "Egypt").id;
    let king = new LlmLeaderSeat("Alashiya", recorder, "claude-sonnet-5-5", "medium", true, state.config);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Alashiya" ? king : p === "Egypt" ? egypt : new Scripted()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.playTurn();
    inboxOf(state, "Alashiya").push(newInboxItem({ turn: 2, kind: "Rumor", title: "Rumor", body: "Word spreads that Hatti is restless." }));
    await runner.playTurn();
    // The envoy arrives when its road says (item 7b: sent in winter, it waits for the sea to open).
    let due = firstOf(state.journeys, (j) => j.characterId === envoyId).arriveTurn;
    while (state.turn <= due) await runner.playTurn();

    let host = firstOf(recorder.specs, (x) => x.key.startsWith(`t${due}/court/`)).user.replaceAll("\r\n", "\n");
    Assert.contains("WHILE YOU SLEPT (since you gave orders in turn 1):", host);
    Assert.contains("[turn 2] [Rumor] Rumor: Word spreads that Hatti is restless.", host);
    // Before the season's news, as in the orders request.
    Assert.true(host.indexOf("WHILE YOU SLEPT") < host.indexOf("NEWS THIS SEASON"));
    let orders = single(recorder.specs, (x) => x.key === `t${due}/orders/Alashiya`).user.replaceAll("\r\n", "\n");
    Assert.contains("[turn 2] [Rumor] Rumor: Word spreads that Hatti is restless.", orders);
  });

  test("With sleeping off an orders request says nothing of sleep", async () => {
    let recorder = new ModelRecorder();
    let off = { ...Quiet, sleepingSeats: false };
    let king = new LlmLeaderSeat("Alashiya", recorder, "claude-sonnet-5-5", "medium", true, off);
    await play("Alashiya", king, 1, off);
    let orders = single(recorder.specs, (x) => x.key === "t1/orders/Alashiya").user;
    Assert.startsWith("SEASON: turn 1", orders);
    Assert.endsWith("Now give your orders for this season: your troops, your envoys and letters, standing orders, and anything else.", orders.trimEnd());
    Assert.doesNotContain("sleep", orders);
  });

  test("The rulebook tells a king that sleeps what wakes it right after how to win", () => {
    let rules = leaderRules(true, newGameConfig()).replaceAll("\r\n", "\n");
    let win = rules.indexOf("HOW YOU WIN");
    let sleep = rules.indexOf("YOU SLEEP BETWEEN YOUR ORDERS");
    let season = rules.indexOf("HOW A SEASON RESOLVES");
    Assert.true(win < sleep && sleep < season);
    Assert.contains(
      "After you give your orders, you sleep. Only these wake you, because they concern you: an envoy at your door; foreign troops entering or attacking your land or your troops, or arriving next to your homeland or a walled city you hold; a siege of a city of yours begun, or about to make it surrender; land or troops lost; a scheduled or standing order that others foiled; a fee you let fall due unpaid; a ransom demanded. You cannot ask to be woken, at a season you name or for anything else. If none of these happens, you sleep on: you may sleep for the rest of the game. So plan as if these orders must carry your kingdom until it ends: schedule what your armies should do in the seasons ahead, give standing orders for the attacks you fear, and leave your envoys mandates that stand on their own. When you are woken to receive an envoy, reopen your orders if the news changes your plan; otherwise they stand.",
      rules,
    );
    // The sentence six kings of the second agent simulation read as a contradiction is gone.
    Assert.doesNotContain("you may not be woken again", rules);
    Assert.contains("PLANNING AHEAD (how sleeping works)", rules);
    Assert.contains("You may schedule at most 24 orders for one season, for at most 40 seasons; orders past these limits are refused.", rules);
    Assert.contains(
      "- Standing orders (see STANDING ORDERS) keep answering while you sleep: in the season one fires, its units do its orders instead of their scheduled ones",
      rules,
    );
    Assert.contains("Your units hold unless you scheduled orders for them or a standing order gives them orders.", rules);
    Assert.contains("If two fire in the same season, the one with the lower id goes first", rules);
    Assert.doesNotContain("wake_in_turn", rules);
    Assert.contains(
      "- A scheduled or standing order wakes you the next season only if others foil it as its season resolves: a move stopped by foreign troops;",
      rules,
    );
    Assert.contains(
      "Your own orders never wake you: an order refused, whether when you give it or when it runs, and one that fails only because of your own orders or strength (a support or convoy that matched no move; a move stopped by your own unit, or for want of a convoy;",
      rules,
    );
    Assert.contains("Nor do the orders you give now for this season, an entry for this season in your schedule among them", rules);
    Assert.doesNotContain("which wakes you", rules);
    // Told when it next gives orders, not "next season": a king that sleeps reads it when it is woken.
    Assert.contains("Orders that are illegal or unaffordable are refused, and you are told why the next time you give orders.", rules);
    Assert.contains("Each set of orders shows you the notes, audiences and orders of the last three seasons you gave orders", rules);
    Assert.doesNotContain("skip", rules);
  });

  test("With sleeping off a king reads nothing of sleep", () => {
    let off = newGameConfig({ sleepingSeats: false });
    let rules = leaderRules(true, off);
    Assert.doesNotContain("sleep", rules);
    let schema = JSON.stringify(Schemas.leaderOrders(off));
    Assert.doesNotContain('"sleep"', schema);
    Assert.doesNotContain('"schedule"', schema);
    let s = newGame(31, off);
    let view = Views.for(s, "Babylonia");
    Assert.false(view.sleeps);
    Assert.equal("", sleepLine(view));
    Assert.startsWith("SEASON: turn 1", situation(view));
  });

  // ------------------------------------------------------------ fresh orders, the stand-in, the switch and replays

  test("A fresh order for a unit replaces the one scheduled for it", async () => {
    let sleeper = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [move("babylon", "nippur"), move("durkurigalzu", "nippur")] })] })
        : v.turn === 2
          ? newTurnSubmission({ orders: [hold("babylon")] })
          : nothing(),
    );
    let r = await play("Babylonia", sleeper, 2, cap(0));
    Assert.contains("turn 2", situation(sleeper.views[1]));
    Assert.contains(r.state.units, (u) => u.power === "Babylonia" && u.province === "babylon");
    Assert.contains(r.state.units, (u) => u.power === "Babylonia" && u.province === "nippur");
    Assert.doesNotContain(r.state.units, (u) => u.province === "durkurigalzu");
  });

  test("An entry for this season replaces or cancels what was scheduled for it", async () => {
    let sleeper = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2, orders: [raise("nippur", "Army")] })] })
        : v.turn === 2
          ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: 2 })] })
          : nothing(),
    );
    let r = await play("Babylonia", sleeper, 2, cap(0));
    Assert.doesNotContain(r.state.units, (u) => u.province === "nippur");
  });

  test("When the script king stands in the seat is asked again and still gets its digest", async () => {
    let calls = 0;
    let sleeper = new Sleeper((v) => {
      calls++;
      if (calls === 2) throw new Error("the model did not answer");
      return v.turn === 1 ? newTurnSubmission({ orders: [move("babylon", "nippur")] }) : nothing();
    });
    let r = await play("Babylonia", sleeper, 4, cap(1));
    Assert.contains(r.errors, (e) => e.startsWith("t3/orders/Babylonia:"));
    // The stand-in did not put the seat to sleep: it is asked again next season, told how long it has been and why it
    // was woken in the season it missed, which it never read.
    Assert.equal([1, 3, 4], sleeper.calls);
    let after = last(sleeper.views);
    Assert.equal(1, after.lastCalled);
    // Whatever else the stand-in's season brought (a trading caravan lost, item 9+b, wakes a king too), the cap woke it.
    Assert.equal(CapReason, after.wokenBecause[0]);
    Assert.true(sleepLine(after).startsWith("You slept 2 seasons (you last gave orders in turn 1). You were woken because: your counsellors woke you after a long sleep"), sleepLine(after));
    Assert.contains(after.whileAsleep, (i) => i.turn === 2 && i.title === "Movements last season");
  });

  test("A seat whose call failed is told next season what woke it and what concerns it now", async () => {
    // Babylon disbands the army in Dur-Kurigalzu and sleeps; Assyria walks in in turn 2 and the seat is woken in turn 3, but its
    // call fails. Asked again in turn 4, it reads what woke it in turn 3, which it never read.
    let calls = 0;
    let sleeper = new Sleeper((v) => {
      calls++;
      if (calls === 2) throw new Error("the model did not answer");
      return v.turn === 1 ? newTurnSubmission({ orders: [disband("durkurigalzu")] }) : nothing();
    });
    let assyria = new Scripted((v) => (v.turn === 2 ? newTurnSubmission({ orders: [move("ekallate", "durkurigalzu")] }) : newTurnSubmission()));
    let r = await play("Babylonia", sleeper, 5, undefined, new Dict([["Assyria", assyria]]));
    Assert.contains(r.errors, (e) => e.startsWith("t3/orders/Babylonia:"));
    Assert.equal([1, 3, 4], sleeper.calls);
    // (Since item 17++ the land answers to Assyria only as the next season begins, by the season's rule.)
    let woke = ["foreign troops entered your land: Assyria's army moved ekallate -> durkurigalzu"];
    Assert.equal(woke, sleeper.views[1].wokenBecause);
    // In the season it missed, what woke it then comes first, whatever else the stand-in's season brought (a trading
    // caravan lost, item 9+b, wakes a king too).
    Assert.equal(woke, sleeper.views[2].wokenBecause.slice(0, woke.length));
    Assert.true(
      sleepLine(sleeper.views[2]).startsWith(
        "You slept 2 seasons (you last gave orders in turn 1). You were woken because: foreign troops entered your land: Assyria's army moved ekallate -> durkurigalzu",
      ),
      sleepLine(sleeper.views[2]),
    );
    // Having answered itself in turn 4, it sleeps on: the reasons it has now read wake it no more.
    Assert.true(r.state.sleep.get("Babylonia").asleep);
  });

  test("A game with sleeping seats can only be continued by seats that can sleep the same way", () => {
    let log = Object.assign(new GameLog(), { header: newLogHeader({ seed: 3, config: newGameConfig(), sleepers: ["Egypt"] }) });
    let bot = new ScriptLeader(3);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (_) => bot,
    );
    let ex = Assert.throws(() => GameRunner.resume(log, seats, new ScriptMind(), new TemplateNarrator()));
    Assert.contains("Egypt", ex.message);
  });

  test("With sleeping off every seat is asked every season", async () => {
    let sleeper = new Sleeper((_) => nothing());
    let r = await play("Babylonia", sleeper, 4, { ...Quiet, sleepingSeats: false });
    Assert.equal([1, 2, 3, 4], sleeper.calls);
    Assert.empty(r.state.sleep);
    Assert.all(sleeper.views, (v) => Assert.false(v.sleeps));
  });

  test("Script and human seats never sleep", () => {
    let state = newGame(5);
    let bot = new ScriptLeader(5);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? new HumanSeat(p) : bot),
    );
    let runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
    Assert.true(state.config.sleepingSeats);
    Assert.empty(state.sleep);
    Assert.empty(runner.log.header.sleepers);
  });

  test("Games replay exactly with sleeping seats on and off", async () => {
    let played: GameState[] = [];
    for (const sleeping of [true, false]) {
      for (let seed = 1; seed <= 3; seed++) {
        let summary = (
          await playGame(
            seed,
            (st) => {
              played.push(st);
              let bot = new ScriptLeader(st.seed);
              // Two kings that sleep after every call, scheduling marches, giving standing orders and cancelling them,
              // among script kings; a short hidden cap wakes them often.
              let nap = new Sleeper((v) =>
                newTurnSubmission({
                  standing: [attackedOf("enkomi", hold("enkomi")), enters(null, "enkomiwaters", move("enkomi", "enkomiwaters"))],
                  cancelStanding: v.turn % 3 === 0 ? ["all"] : ["s1"],
                }),
              );
              let babylon = new Sleeper((v) =>
                newTurnSubmission({
                  scheduled: [
                    // It sells its grain while it sleeps (item 9+a), or its troops would go unpaid and mutiny.
                    newScheduledOrders({ turn: v.turn + 1, orders: [hold("babylon"), sell("babylon", 60), sell("nippur", 40), sell("ur", 40)] }),
                    newScheduledOrders({ turn: v.turn + 2, orders: [move("sippar", "suhu"), supportOrder("durkurigalzu", "sippar", "suhu")] }),
                    newScheduledOrders({ turn: v.turn + 3, orders: [move("sippar", "damascus"), move("babylon", "sippar")] }),
                  ],
                  // Sippar's guard is the king's own army in Babylon, which sees it: a standing order fires on what its army
                  // sees, where its commander or king stands with it (item 13).
                  standing: [
                    attackedOf("babylon", move("babylon", "nippur")),
                    enters("Assyria", "ekallate", supportOrder("durkurigalzu", "sippar")),
                    enters(null, "sippar", hold("babylon")),
                    attackedOf("sippar", supportOrder("babylon", "sippar")),
                  ],
                  cancelStanding: v.turn % 2 === 0 ? ["all"] : [],
                }),
              );
              // The small world: the two sleepers beside Assyria, a script king, every other power idle.
              let seats = smallSeats((p) => (p === "Alashiya" ? nap : p === "Babylonia" ? babylon : bot), ["Assyria", "Babylonia", "Alashiya"]);
              return Object.assign(new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
            },
            true,
            newGameConfig({ sleepingSeats: sleeping, maxSleep: 2, capMin: 18, capMax: 18, endMedian: 80, peopleDefence: 0 }),
          )
        )[0];
        Assert.true(summary.replayMatches, `seed ${seed}, sleep ${sleeping ? "on" : "off"}`);
      }
    }
    // With sleeping seats on, the games put marches and standing orders to work: they were not replayed idle.
    let titles = new HSet(played.flatMap((s) => [...s.inbox.values()].flatMap((x) => x)).map((i) => i.title));
    Assert.contains(MarchHeldUpTitle, titles);
    Assert.contains(titles, (t) => t.startsWith("Standing order s") && t.endsWith(" fired"));
  });
});
