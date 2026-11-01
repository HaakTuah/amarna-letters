import { describe, test } from "vitest";
import {
  AllPowers,
  dispatch,
  inboxOf,
  newCondition,
  newGame,
  newGameConfig,
  newScheduledOrders,
  newStandingAnswer,
  newAnswerBook,
  newTurnSubmission,
  raise,
  Views,
  type GameConfig,
  TurnEngine,
  newPendingAudience,
  newDispatch,
  newMessageTrail,
  newExchange,
  ageBand,
  ending,
} from "@amarna/engine";
import { GameLog, GameRunner, ScriptMind, TemplateNarrator, type ISeat } from "@amarna/game";
import { LlmLeaderSeat, asGiven, leaderRules, Parse, Schemas, jsonSchema, situation, withoutHolds, type CallSpec, type JsonAsker, type JsonObject } from "@amarna/llm";
import { ahead } from "../src/bots/ahead.ts";
import { endMayBeNear, seasonsLeft } from "../src/bots/ending-belief.ts";
import { Assert, toDict } from "../../engine/test/support.ts";
import { Scripted, Sleeper } from "./sleep-support.ts";
import { welcomeCourt } from "./io.ts";

// Item 6b, "Call size": one call per court, conditional orders, standing answers and the compaction of requests.
describe("CallSizeTests", () => {
  const Quiet: GameConfig = newGameConfig({ endMedian: 10000, catastropheChance: 0 });
  const Orders = `{"notes":"Hold fast.","summary":"","ledger":[],"units":[],"command":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`;

  /** A model king's asker: holds at its orders, welcomes every envoy at its court, and words a phrasing call. */
  class King implements JsonAsker {
    specs: CallSpec[] = [];
    orders: string = Orders;
    court: ((user: string) => string) | null = null;
    askJson(spec: CallSpec): Promise<JsonObject> {
      this.specs.push(spec);
      if (spec.key.includes("/phrase")) return Promise.resolve({ speech: "My brother's gift is dear to me; take back my love." });
      const json = spec.key.includes("/orders/") ? this.orders : (this.court ?? welcomeCourt)(spec.user);
      return Promise.resolve(JSON.parse(json) as JsonObject);
    }
  }

  /** Egypt sends these of its people to Alashiya in turn 1, with gold; Alashiya is the given seat. */
  async function play(alashiya: ISeat, turns: number, envoys = 2, gold = 0, config: GameConfig = Quiet): Promise<GameRunner> {
    const state = newGame(31, config);
    const ids = state.characters.filter((c) => c.employer === "Egypt").slice(0, envoys).map((c) => c.id);
    const egypt = new Scripted((v) => (v.turn === 1 ? newTurnSubmission({ orders: ids.map((id) => dispatch(id, "Alashiya", "Greetings, brother.", { gold })) }) : newTurnSubmission()));
    const seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Alashiya" ? alashiya : p === "Egypt" ? egypt : new Scripted()),
    );
    const runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    for (let i = 0; i < turns && !state.ended; i++) await runner.playTurn();
    return runner;
  }

  const arrival = (): number => 1 + new TurnEngine(newGame(31, Quiet)).travelTurns("Egypt", "Alashiya");

  // ------------------------------------------------------------ one call per wake-up

  test("A king answers every envoy at its court in one call, and the log keeps each answer under its own key", async () => {
    const asker = new King();
    const t = arrival();
    const r = await play(new LlmLeaderSeat("Alashiya", asker, "m", "medium", true, Quiet), t);
    const courts = asker.specs.filter((s) => s.key.startsWith(`t${t}/court/`));
    const court = Assert.single(courts);
    Assert.equal(2, [...court.user.matchAll(/, envoy of Egypt, stands before you/g)].length);
    Assert.contains("2 ENVOYS STAND BEFORE YOU", court.user);
    // The court's schema is the same whatever the envoys bring, so the fixed part of the request stays cached.
    Assert.equal(JSON.stringify(Schemas.courtReply(Quiet, true)), JSON.stringify(jsonSchema(court.schema)));
    Assert.equal(2, r.log.decisions.filter((d) => d.key.startsWith(`t${t}/aud/`) && d.key.endsWith("/host/1")).length);
    Assert.empty(r.errors);
    // The replay reads each answer by its key and comes to the same game.
    const replay = GameRunner.forReplay(GameLog.fromJsonl(r.log.toJsonl()));
    replay.writeChronicles = false;
    await replay.prepare();
    for (let i = 0; i < t; i++) await replay.playTurn();
    Assert.equal(JSON.stringify(r.state.characters.map((c) => c.at)), JSON.stringify(replay.state.characters.map((c) => c.at)));
  });

  test("An envoy the court reply leaves out is answered by the stand-in, and the others by the king", async () => {
    const asker = new King();
    asker.court = (user) => {
      const ids = [...user.matchAll(/\((c\d+)\), envoy of /g)].map((m) => m[1]);
      return welcomeCourt(`(${ids[0]}), envoy of `);
    };
    const t = arrival();
    const r = await play(new LlmLeaderSeat("Alashiya", asker, "m", "medium", true, Quiet), t);
    Assert.single(r.errors, (e) => e.includes("left out the envoy"));
    const hosts = r.log.decisions.filter((d) => d.key.startsWith(`t${t}/aud/`) && d.key.endsWith("/host/1"));
    Assert.equal(2, hosts.length);
    Assert.single(hosts, (d) => r.log.authorOf(d.key)?.kind === "fallback");
  });

  // ------------------------------------------------------------ conditional orders

  test("Scheduled orders run only if their conditions hold, and entries of one season stand together", async () => {
    const seat = new Sleeper((v) =>
      v.turn === 1
        ? newTurnSubmission({
            scheduled: [
              // Held back: the treasury is far below this.
              newScheduledOrders({ turn: 2, orders: [raise("thebes", "Army")], conditions: [newCondition({ kind: "TreasuryAtLeast", amount: 100000 })] }),
              // Runs: no foreign troops in sinai.
              newScheduledOrders({ turn: 2, orders: [raise("delta", "Fleet")], conditions: [newCondition({ kind: "TroopsIn", unless: true, province: "sinai" })] }),
            ],
          })
        : newTurnSubmission(),
    );
    const state = newGame(31, Quiet);
    const seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? (seat as ISeat) : new Scripted()),
    );
    const runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    await runner.playTurn();
    // Both entries of turn 2 are kept, each with its own conditions, and shown apart.
    const v = Views.for(state, "Egypt");
    Assert.equal(2, v.scheduled.filter((x) => x.turn === 2).length);
    Assert.matches("- turn 2 \\(if your treasury holds at least [^)]*\\): raise army in thebes", situation(v));
    await runner.playTurn();
    const notice = Assert.single(inboxOf(state, "Egypt"), (i) => i.title === "Scheduled orders held back by their conditions");
    Assert.contains("raise army in thebes", notice.body);
    Assert.contains(state.units, (u) => u.power === "Egypt" && u.province === "delta" && u.kind === "Fleet");
    // No new army at Waset: only the one standing there since item 17+.
    Assert.equal(1, state.units.filter((u) => u.power === "Egypt" && u.province === "thebes").length);
    // Held back by the king's own conditions, it wakes nobody.
    Assert.true(state.sleep.get("Egypt").asleep);
  });

  test("The reply's conditions are read in the engine's vocabulary", () => {
    const sub = Parse.orders(
      JSON.parse(
        `{"notes":"","summary":"","ledger":[],"units":[],"command":[],"letters":[],"other_orders":[],"cancel_standing":[],"standing_orders":[],"standing_answers":[],"cancel_answers":[],
 "schedule":[{"turn":5,"units":[],"other_orders":[],"conditions":[{"test":"unless","kind":"troops_in","power":"Hatti","province":"Kizzuwatna","amount":0,"person":""},
   {"test":"if","kind":"envoy_back","power":"","province":"","amount":0,"person":"C3"}]}]}`,
      ) as JsonObject,
    );
    // A court nobody knows is not read as "any court": the entry is refused with the reason.
    const bad = Parse.orders(
      JSON.parse(
        `{"schedule":[{"turn":5,"units":[],"other_orders":[],"conditions":[{"test":"if","kind":"tablet_sealed","power":"Kush","province":"","amount":0,"person":""}]}]}`,
      ) as JsonObject,
    );
    Assert.equal("its condition names a court nobody knows ('Kush')", new TurnEngine(newGame(1, Quiet)).conditionProblem(bad.scheduled[0].conditions));
    const cs = Assert.single(sub.scheduled).conditions;
    Assert.equal(
      [
        ["TroopsIn", true, "Hatti", "kizzuwatna", "", 0],
        ["EnvoyBack", false, null, "", "c3", 0],
      ],
      cs.map((c) => [c.kind, c.unless, c.power, c.province, c.person, c.amount]),
    );
  });

  test("A sleeping script king schedules what stays sound while it sleeps, each with its condition", () => {
    const state = newGame(31, Quiet);
    const v = Views.for(state, "Egypt");
    v.sleeps = true;
    const envoy = v.court.find((c) => c.ready)!.id;
    const plans = ahead(v, [dispatch(envoy, "Hatti", "Brother.", { gold: 30 }), raise("thebes", "Army")]);
    const resend = plans.filter((x) => x.orders[0].type === "dispatch");
    Assert.equal(6, resend.length);
    Assert.all(resend, (x) => x.conditions[0].kind === "EnvoyBack" && x.conditions[0].person === envoy);
    Assert.all(resend, (x) => x.orders[0].type === "dispatch" && x.orders[0].gold === 0);
    const levies = plans.filter((x) => x.orders[0].type === "raise");
    Assert.equal(2, levies.length);
    Assert.all(levies, (x) => x.conditions.some((c) => c.kind === "TreasuryAtLeast") && x.conditions.some((c) => c.kind === "TroopsIn" && c.unless));
    // A king that plays every season schedules nothing.
    v.sleeps = false;
    Assert.empty(ahead(v, [raise("thebes", "Army")]));
  });

  // ------------------------------------------------------------ standing answers

  test("A standing answer receives the envoy for the king, sends back its share, and wakes nobody", async () => {
    const asker = new King();
    const t = arrival();
    const seat = new LlmLeaderSeat("Alashiya", asker, "m", "medium", true, Quiet, null, "small");
    asker.orders = Orders.replace(
      `"standing_answers":[]`,
      `"standing_answers":[{"from":"Egypt","brings":"gold","min_gold":10,"seal":false,"gold_back_percent":50,"say":"My brother's love is great.","conditions":[]}]`,
    );
    const r = await play(seat, t, 1, 40);
    Assert.equal("a1", r.state.answers.get("Alashiya").answers[0].id);
    // No court call: the phrasing call words what the answer decided, on the small model, without the king's record.
    Assert.doesNotContain(asker.specs, (s) => s.key.startsWith(`t${t}/court/`));
    const phrase = Assert.single(asker.specs, (s) => s.key.endsWith("/phrase"));
    Assert.equal("small", phrase.model);
    // Half of what reached the court (the envoy may spend some of the 40 on the road).
    Assert.matches("he sends (20|1\\d) shekels back with the envoy for his lord", phrase.user);
    Assert.doesNotContain("YOUR LEDGER", phrase.user);
    const host = Assert.single(r.log.decisions, (d) => d.key.startsWith(`t${t}/aud/`) && d.key.endsWith("/host/1"));
    Assert.contains("standing answer", r.log.authorOf(host.key)!.name);
    // The king slept through it, and reads in its news what was done.
    Assert.true(r.state.sleep.get("Alashiya").asleep);
    Assert.doesNotContain(r.state.sleep.get("Alashiya").courts, (c) => c.turn === t);
    Assert.contains(inboxOf(r.state, "Alashiya"), (i) => i.body.startsWith("Your standing answer a1 received him in your name."));
    Assert.empty(r.errors);
  });

  test("Evidence and the hidden backstop leave an envoy to the king", async () => {
    const state = newGame(31, Quiet);
    // a2 would take anyone a1 does not; but an envoy a1 covers and whose gold would pass the backstop is the king's.
    const book = newAnswerBook({ answers: [newStandingAnswer({ id: "a1", brings: "Anything", goldBack: 100 }), newStandingAnswer({ id: "a2", brings: "Anything" })], last: 2 });
    state.answers.set("Alashiya", book);
    const engine = new TurnEngine(state);
    const egyptian = state.characters.find((c) => c.employer === "Egypt")!.id;
    state.treasuries.get("Alashiya").gold = 100;
    state.audiences.push(newPendingAudience({ id: "a90", envoyId: egyptian, from: "Egypt", host: "Alashiya", dispatch: newDispatch({ gold: 10 }) }));
    state.audiences.push(newPendingAudience({ id: "a91", envoyId: egyptian, from: "Egypt", host: "Alashiya", dispatch: newDispatch({ gold: 40 }) }));
    state.audiences.push(newPendingAudience({ id: "a92", envoyId: egyptian, from: "Egypt", host: "Alashiya", dispatch: newDispatch({ copyIds: ["k1"] }) }));
    engine.assignAnswers();
    // A quarter of 100 may go back: the first envoy's 10 fits, the second's 40 does not; evidence is never covered.
    Assert.equal(["a1", null, null], state.audiences.map((a) => a.answer));
  });

  test("An envoy who reports as given tells only the king's words, nothing of his own deeds", () => {
    const t = newMessageTrail({ to: "Hatti", exchanges: [newExchange({ host: "Go in peace.", envoy: "Thank you." })], outcomes: ["kept 20 shekels of the gold", "accepted 50 shekels from Hatti (asked: lie)"] });
    const text = asGiven(t);
    Assert.contains('The king answered: "Go in peace."', text);
    Assert.doesNotContain("kept", text);
    Assert.doesNotContain("accepted", text);
  });

  // ------------------------------------------------------------ Haakon's answers to item 6a's review

  test("A table's median reaches every seat in words, in bands, and script kings believe the band", () => {
    Assert.equal(["Short", "Usual", "Long"], [ageBand(44), ageBand(80), ageBand(130)]);
    const short = newGameConfig({ endMedian: 20 });
    Assert.contains("This age is likely to be short", leaderRules(true, short));
    Assert.doesNotContain("20", ending(false, null, null, "Short").replace(/\D+/g, " ").trim());
    Assert.equal("Short", Views.for(newGame(1, short), "Egypt").ageBand);
    Assert.contains("Early on it is very unlikely", leaderRules(true, newGameConfig()));
    // A script king believes the band's own median: it expects a short age to end sooner than the usual one.
    Assert.true(seasonsLeft(1, false, "Short") < seasonsLeft(1, false, "Usual"));
    Assert.true(seasonsLeft(1, false, "Usual") < seasonsLeft(1, false, "Long"));
    Assert.true(endMayBeNear(20, false, "Short") && !endMayBeNear(20, false, "Usual"));
  });

  // ------------------------------------------------------------ compaction

  test("Battle reports leave out the units that held", () => {
    Assert.equal(
      "Movements last season:\n- A tuwanuwa -> mira: fails\nSeen nearby:\n- Arzawa: A mira -> lukka: fails",
      withoutHolds("Movements last season: - A lukka holds\n- A tuwanuwa -> mira: fails\n- F lukka holds\nSeen nearby:\n- Arzawa: A mira -> lukka: fails\n- Mitanni: A harran holds"),
    );
    Assert.equal("Movements last season: every unit you saw held.", withoutHolds("Movements last season: - A lukka holds\n- F ugarit holds\nSeen nearby:\n- Egypt: F delta holds"));
  });
});

