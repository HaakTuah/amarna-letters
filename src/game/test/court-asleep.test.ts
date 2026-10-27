import { describe, test } from "vitest";
import { react } from "../../llm/src/parse.ts";
import { letters } from "../src/bots/statecraft-letters.ts";
import { present } from "../src/character-checks.ts";
import {
  AllPowers,
  type AudienceView,
  CapReason,
  type EnvoyReaction,
  type GameConfig,
  GameStateSchema,
  HSet,
  type HostReply,
  HostReplySchema,
  type MindReply,
  type Order,
  ReopenReason,
  type SeatView,
  StandInCourtReason,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  addLetters,
  asHeard,
  char,
  counterIntel,
  courtDecided,
  dispatch,
  envoyWaits,
  hash,
  hold,
  inboxOf,
  ledger,
  newAudienceView,
  newCharacterView,
  newGame,
  newGameConfig,
  newHostReply,
  newScheduledOrders,
  newTabletProposal,
  newTurnSubmission,
  newUnit,
  ownedBy,
  range,
  single,
  unitAt,
  unreadable,
  write,
} from "@amarna/engine";
import {
  type EnvoyContext,
  GameLog,
  GameRunner,
  type ICharacterMind,
  type ISeat,
  type MindContext,
  type PresentResult,
  ScriptMind,
  TemplateNarrator,
  reopenRate,
  seatReport,
} from "@amarna/game";
import {
  type CallSpec,
  type JsonAsker,
  type JsonObject,
  LeaderJournal,
  LlmLeaderSeat,
  ModelIds,
  Parse,
  Schemas,
  leaderRules,
  realmBrief,
  situation,
  sleepLine,
} from "@amarna/llm";
import { at, str, Assert, last, orderBy, toDict, join } from "../../engine/test/support.ts";
import { audience as audienceOf } from "@amarna/llm";
import { first as firstOf } from "@amarna/engine";
import { describe as describeOrder } from "@amarna/engine";

// Part H of the simulation-fixes round: an envoy wakes a sleeping king for an audience only. At it the king reads its realm
// in brief, may send letters, and judges whether to reopen its orders; every other wake reason reopens them directly.
describe("CourtAsleepTests", () => {
  const Quiet: GameConfig = newGameConfig({ minTurns: 40, catastropheChance: 0 });

  // <summary>A seat that may sleep: its orders and its audience replies come from scripts, and it remembers what it was shown.</summary>
  class Sleeper implements ISeat {
    readonly #decide: (a0: SeatView) => TurnSubmission;
    readonly #host: (a0: AudienceView, a1: SeatView) => HostReply;
    constructor(decide: (a0: SeatView) => TurnSubmission, host: (a0: AudienceView, a1: SeatView) => HostReply) {
      this.#decide = decide;
      this.#host = host;
    }
    views: SeatView[] = [];
    audiences: AudienceView[] = [];
    courts: SeatView[] = [];
    get calls(): number[] {
      return this.views.map((v) => v.turn);
    }
    get label(): string {
      return "Test sleeper";
    }
    get canSleep(): boolean {
      return true;
    }

    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      this.views.push(view);
      return Promise.resolve(this.#decide(view));
    }

    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      {
        this.audiences.push(view);
        this.courts.push(court);
      }
      return Promise.resolve(this.#host(view, court));
    }
  }

  // <summary>A seat that never sleeps and does what it is told each season (nothing, by default).</summary>
  class Scripted implements ISeat {
    readonly #decide: ((a0: SeatView) => TurnSubmission) | null;
    constructor(decide: ((a0: SeatView) => TurnSubmission) | null = null) {
      this.#decide = decide;
    }
    get label(): string {
      return "Scripted";
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return Promise.resolve(this.#decide?.(view) ?? newTurnSubmission());
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  // <summary>Script characters that remember every host reply an envoy met.</summary>
  class Listening implements ICharacterMind {
    _script: ScriptMind = new ScriptMind();
    heard: HostReply[] = [];
    get label(): string {
      return "Listening";
    }
    present(ctx: EnvoyContext, ct: AbortSignal): Promise<PresentResult> {
      return this._script.present(ctx, ct);
    }

    react(ctx: EnvoyContext, host: HostReply, ct: AbortSignal): Promise<EnvoyReaction> {
      this.heard.push(host);
      return this._script.react(ctx, host, ct);
    }

    write(ctx: MindContext, ct: AbortSignal): Promise<MindReply> {
      return this._script.write(ctx, ct);
    }
  }

  // <summary>Records what a model king is sent; at an audience held while its orders stand it reopens them if told to.</summary>
  class Recorder implements JsonAsker {
    readonly #reopen: boolean;
    constructor(reopen: boolean = false) {
      this.#reopen = reopen;
    }
    specs: CallSpec[] = [];

    askJson(spec: CallSpec, ct: AbortSignal): Promise<JsonObject> {
      this.specs.push(spec);
      let json = spec.key.includes("/orders/")
        ? `{"notes":"Hold fast.","units":[],"letters":[],"other_orders":[]}`
        : `{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true,"letters":[],"reopen_orders":REOPEN}`.replaceAll(
            "REOPEN",
            this.#reopen ? "true" : "false",
          );
      return Promise.resolve(JSON.parse(json)!);
    }
  }

  // <summary>The season Egypt's envoy, sent in turn 1, stands before Alashiya.</summary>
  function courtTurn(config: GameConfig | null = null): number {
    return 1 + new TurnEngine(newGame(31, config ?? Quiet)).travelTurns("Egypt", "Alashiya");
  }

  // <summary>Egypt sends one envoy to Alashiya in turn 1; Alashiya is the given seat; every other king does nothing.</summary>
  async function play(alashiya: ISeat, turns: number, config: GameConfig | null = null, minds: ICharacterMind | null = null): Promise<GameRunner> {
    let state = newGame(31, config ?? Quiet);
    let envoy = firstOf(state.characters, (c) => c.employer === "Egypt").id;
    let egypt = new Scripted((v) => (v.turn === 1 ? newTurnSubmission({ orders: [dispatch(envoy, "Alashiya", "Greetings, brother.")] }) : newTurnSubmission()));
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Alashiya" ? alashiya : p === "Egypt" ? egypt : new Scripted()),
    );
    let runner = Object.assign(new GameRunner(state, seats, minds ?? new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    for (let i = 0; i < turns && !state.ended; i++) await runner.playTurn();
    return runner;
  }

  function ready(court: SeatView, nth: number = 0): string {
    return firstOf(court.court.filter((c) => c.ready).slice(nth)).id;
  }

  // ------------------------------------------------------------ reopening

  test("A host that reopens its orders gives orders the same season as an ordinary wake", async () => {
    let t = courtTurn();
    let host = new Sleeper(
      (_) => newTurnSubmission(),
      (_a, _b) => newHostReply({ speech: "Welcome.", end: true, reopenOrders: true }),
    );
    let r = await play(host, t);
    Assert.equal([1, t], host.calls);
    Assert.equal([envoyWaits("Egypt"), ReopenReason], last(host.views).wokenBecause);
    Assert.false(last(host.views).holdsCourt);
    let sl = r.state.sleep.get("Alashiya");
    let court = Assert.single(sl.courts);
    Assert.equal([t, 1, true], [court.turn, court.envoys, court.reopened]);
    // Its sleep ended that season for the envoy and its choice; having given orders, it sleeps again.
    Assert.equal(t, sl.history[0].wokeAt);
    Assert.equal([envoyWaits("Egypt"), ReopenReason], sl.history[0].reasons);
    Assert.equal(t, sl.lastCalled);
    Assert.true(sl.asleep);
  });

  test("An order trigger reopens orders without asking and the audience is an ordinary one", async () => {
    // The hidden cap wakes the king in the very season the envoy arrives: that reopens its orders directly.
    let t = courtTurn();
    let host = new Sleeper(
      (_) => newTurnSubmission(),
      (_a, _b) => newHostReply({ end: true }),
    );
    let r = await play(host, t, { ...Quiet, maxSleep: t - 2 });
    Assert.equal([1, t], host.calls);
    Assert.false(Assert.single(host.audiences).ordersStand);
    Assert.equal([CapReason, envoyWaits("Egypt")], last(host.views).wokenBecause);
    Assert.empty(r.state.sleep.get("Alashiya").courts);
  });

  // ------------------------------------------------------------ letters

  test("Letters from an audience go out with the seasons orders and the envoy never hears of them", async () => {
    let t = courtTurn();
    let listening = new Listening();
    let sent = null;
    let gold = 0;
    let host = new Sleeper(
      (_) => newTurnSubmission(),
      (_, court) => {
        sent ??= ready(court);
        gold = court.gold;
        return newHostReply({ speech: "Welcome.", end: true, letters: [dispatch(sent, "Egypt", "My brother, I thank you.", { gold: 10 })] });
      },
    );
    let r = await play(host, t, undefined, listening);

    // Its orders stood: no orders call, yet its envoy set out with the gold, as if it had given the letter as an order.
    Assert.equal([1], host.calls);
    let envoy = char(r.state, sent!);
    Assert.equal(["EnvoyOutbound", "Egypt"], [envoy.duty, envoy.missionTarget]);
    Assert.equal(gold - 10, ledger(r.state.treasuries.get("Alashiya")));
    Assert.empty(r.state.sleep.get("Alashiya").courtLetters);
    // The envoy before the king heard what was said, never what the king sent elsewhere or chose about its orders.
    let heard = Assert.single(listening.heard);
    Assert.equal("Welcome.", heard.speech);
    Assert.empty(heard.letters);
    Assert.false(heard.reopenOrders);
  });

  test("A later letter for the same person replaces an earlier one and only letters are taken", () => {
    let sent: Order[] = [];
    addLetters(sent, [dispatch("c1", "Egypt", "a"), dispatch("c2", "Hatti", "b")]);
    addLetters(sent, [dispatch("c1", "Mitanni", "c"), hold("babylon"), unreadable("send c3 to 'Elam'", "there is no power called 'Elam'")]);
    Assert.equal(
      ["send c2 to Hatti", "send c1 to Mitanni", "send c3 to 'Elam'"],
      sent.map((o) => describeOrder(o)),
    );
  });

  test("A second exchange shows the letters already sent and the choice already made", async () => {
    let t = courtTurn();
    let sent = null;
    let host = new Sleeper(
      (_) => newTurnSubmission(),
      (a, court) => {
        sent ??= ready(court);
        return a.round === 1
          ? newHostReply({ speech: "Wait.", reopenOrders: true, letters: [dispatch(sent, "Hatti", "Brother.")] })
          : newHostReply({ speech: "Go.", end: true });
      },
    );
    await play(host, t);
    let rounds = host.audiences.filter((a) => a.turn === t);
    Assert.equal(2, rounds.length);
    Assert.true(rounds.every((a) => a.ordersStand));
    Assert.equal([false, 0], [rounds[0].reopenChosen, rounds[0].lettersSent.length]);
    Assert.true(rounds[1].reopenChosen);
    Assert.equal(`send ${sent} to Hatti`, describeOrder(Assert.single(rounds[1].lettersSent)));
    let text = audienceOf(rounds[1]);
    Assert.contains(
      `Letters you have already sent from your audiences this season (a new letter for the same person replaces one): send ${sent} to Hatti: message "Brother."; mandate none.`,
      text,
    );
    Assert.contains("You have already chosen to reopen your orders this season: you give orders after your audiences", text);
    // Its orders no longer stand, so it is neither told they do nor asked again (since "Requests are rules too").
    Assert.doesNotContain("YOUR ORDERS STAND WHILE YOU SLEEP", text);
    Assert.doesNotContain('"reopen_orders"', JSON.stringify(Schemas.hostReply(newGameConfig(), rounds[1])));
    Assert.contains('"reopen_orders"', JSON.stringify(Schemas.hostReply(newGameConfig(), rounds[0])));
  });

  test("A refused letter is reported and does not wake the host", async () => {
    let t = courtTurn();
    let host = new Sleeper(
      (_) => newTurnSubmission(),
      (_a, _b) => newHostReply({ end: true, letters: [dispatch("c999", "Egypt", "Brother.")] }),
    );
    let r = await play(host, t + 1);
    Assert.equal([1], host.calls);
    let notice = Assert.single(inboxOf(r.state, "Alashiya"), (i) => i.kind === "Rejected" && i.turn === t + 1);
    Assert.contains("- send c999 to Egypt:", notice.body);
    // It waits in the digest for the king's next waking, like any order given for the season that failed.
    Assert.contains(r.state.sleep.get("Alashiya").digest, (d) => d === `turn ${t + 1}: an order was refused or failed (Orders that could not be carried out)`);
  });

  test("Reopened an order for the same person replaces the letter and letters are checked first", async () => {
    let t = courtTurn();
    let first = null,
      second = null;
    let gold = 0;
    let host = new Sleeper(
      (v) => (v.turn === t ? newTurnSubmission({ orders: [dispatch(first!, "Hatti", "To Hatti instead."), counterIntel(1)] }) : newTurnSubmission()),
      (_, court) => {
        first ??= ready(court);
        second ??= ready(court, 1);
        gold = court.gold;
        // The first letter spends the whole treasury; the second is replaced by an order given after reopening.
        return newHostReply({
          end: true,
          reopenOrders: true,
          letters: [dispatch(second, "Babylonia", "All my gold.", { gold: gold }), dispatch(first, "Egypt", "To Egypt.")],
        });
      },
    );
    let r = await play(host, t);

    // The orders request lists the letters sent from the audience.
    let view = last(host.views);
    Assert.equal(
      [`send ${second} to Babylonia with ${gold} shekels`, `send ${first} to Egypt`],
      view.courtLetters.map((o) => describeOrder(o)),
    );
    Assert.contains(
      `LETTERS YOU SENT FROM YOUR AUDIENCES THIS SEASON (they go out with your orders and are checked before them; an order you give now for the same person replaces its letter): send ${second} to Babylonia with ${gold} shekels: message "All my gold."; mandate none; send ${first} to Egypt: message "To Egypt."; mandate none.` +
        ` Gold already committed by these letters: ${gold} shekels, not yet taken from the treasury you read here; it is reserved first when the season's orders are checked.`,
      situation(view),
    );
    // The order for the first envoy replaced its letter; the second envoy's letter stood and was checked before the
    // orders, so its gold was reserved first and the watchmen ordered after reopening could not be paid.
    Assert.equal("Hatti", char(r.state, first!).missionTarget);
    Assert.equal("Babylonia", char(r.state, second!).missionTarget);
    Assert.equal(0, ledger(r.state.treasuries.get("Alashiya")));
    let refused = Assert.single(inboxOf(r.state, "Alashiya"), (i) => i.kind === "Rejected").body;
    Assert.equal(`- spend 1 on watching for spies: not enough gold: it needs 1 shekels; orders listed before it had reserved ${gold}, and 0 was left`, refused);
  });

  // ------------------------------------------------------------ what the king reads

  test("The audience request carries the realm in brief and is made by the seats own model", async () => {
    let t = courtTurn();
    let recorder = new Recorder();
    let state = newGame(31, Quiet);
    let king = new LlmLeaderSeat("Alashiya", recorder, ModelIds.Opus, "high", true, state.config);
    await play(king, t);
    let host = single(recorder.specs, (x) => x.key.startsWith(`t${t}/aud/`));
    Assert.doesNotContain(recorder.specs, (x) => x.key === `t${t}/orders/Alashiya`);
    // The seat's own model decides; only the effort is lower than for its orders.
    Assert.equal([ModelIds.Opus, "medium"], [host.model, host.effort]);
    let schema = JSON.stringify(host.schema);
    Assert.contains('"reopen_orders"', schema);
    Assert.contains('"letters"', schema);
    Assert.contains('"call_brother"', schema);
    let user = host.user.replaceAll("\r\n", "\n");
    Assert.contains(`SEASON: turn ${t}. You hold court.\n`, user);
    Assert.contains(
      "YOUR REALM IN BRIEF (enough to judge whether the news changes your plan; you see the full map only if you reopen your orders):\n- Treasury: ",
      user,
    );
    Assert.contains("- Your land: ", user);
    Assert.contains("- Your troops: ", user);
    Assert.contains("- Foreign troops at or inside your borders, as far as you can see: ", user);
    Assert.contains("- Your scheduled orders: none; your units hold where they stand.", user);
    Assert.contains("- Your standing orders: none.", user);
    Assert.contains("- Your people at court and ready to be sent: ", user);
    Assert.contains("YOUR ORDERS STAND WHILE YOU SLEEP.", user);
    Assert.doesNotContain("THE MAP", user);
    Assert.doesNotContain("YOUR LAND:", user);
  });

  test("The realm in brief names foreign troops in the land and on its borders and no others", () => {
    let s = newGame(31, Quiet);
    let map = WorldMap.default;
    let home = new HSet(ownedBy(s, "Babylonia"));
    // A foreign army inside Babylonia's land, and one next to it.
    let inside = firstOf(home, (x) => unitAt(s, x) === null);
    let border = firstOf(map.provinces, (x) => !x.isSea && !home.has(x.id) && unitAt(s, x.id) === null && map.neighbors(x.id).some((n) => home.has(n))).id;
    s.units.push(newUnit({ id: "u-in", power: "Hatti", kind: "Army", province: inside }));
    s.units.push(newUnit({ id: "u-by", power: "Hatti", kind: "Army", province: border }));
    let brief = realmBrief(Views.for(s, "Babylonia"));
    Assert.contains(`Hatti army in ${inside} (in your land)`, brief);
    let next = join(
      ", ",
      orderBy(map.neighbors(border).filter((n) => home.has(n)), (x) => x),
    );
    Assert.contains(`Hatti army in ${border} (next to your ${next})`, brief);
    // Troops it can see but not at its borders are left out: this is not the full map.
    let seen = Views.for(s, "Babylonia").units.filter(
      (u) => u.power !== "Babylonia" && u.province !== inside && u.province !== border && !home.has(u.province) && !map.neighbors(u.province).some((n) => home.has(n)),
    );
    for (const u of seen) Assert.doesNotContain(`army in ${u.province} (`, brief);
  });

  test("The rulebook says an envoy wakes the king for the audience only", () => {
    let rules = leaderRules(true, newGameConfig()).replaceAll("\r\n", "\n");
    Assert.contains("When you are woken to receive an envoy, reopen your orders if the news changes your plan; otherwise they stand.", rules);
    Assert.contains(
      "- An envoy at your door wakes you for the audience only. You read your realm in brief (your land and troops, foreign troops at or inside your borders, your treasury, your scheduled and standing orders, your people), answer the envoy as at any audience, and may send envoys of yours with letters, tablets and gifts: they set out at the end of the season with everyone's orders and are checked like orders you give, before them. " +
        "A letter sent there costs what it costs in your orders (the gold it carries, the scribe's fee of 20 for a tablet, one of the 3 envoys who may leave your court in a season, and the envoy's time away) and sets out this season; if you send none and let your orders stand, your next letters leave only when you next give orders, which may be many seasons away. " +
        "Your answer to the envoy before you goes home only as his report of your words; a letter goes with your own envoy, in your words, with a mandate, gold, a tablet to seal or tablets shown as evidence. " +
        "Then you choose: reopen your orders, and after your audiences you give orders this season with your full view, as when anything else wakes you; or let them stand and sleep on. Anything else that wakes you reopens your orders without asking (your audiences still come first).",
      rules,
    );

    // What a standing order costs and what it can win, beside a scheduled order and waking: in the section every king
    // reads (since the additions to the fix pass after item 4), and for a king that sleeps, beside his scheduled orders.
    Assert.contains(
      "- So its orders meet the blow as it falls: a unit of yours next to the province attacked can support your unit there holding (unit_attacked), and a unit next to an empty province of yours, walled or not, can move into it, so that an attacker without support bounces.",
      rules,
    );
    Assert.contains("- It fires once, on the first move it waits for that you see, whether a real attack or a feint, and is then gone.", rules);
    Assert.contains("Giving one costs nothing; its orders cost what they cost when they run (a levy its gold).", rules);
    Assert.contains(
      "- Standing orders (see STANDING ORDERS) keep answering while you sleep: in the season one fires, its units do its orders instead of their scheduled ones, and its orders are checked before your scheduled orders. " +
        "A standing order firing does not wake you: you read it in your news. This is what a standing order can do that waking cannot: woken, you would answer the blow only the season after it fell. " +
        "Unlike a scheduled order, which runs in its season whatever happens, a standing order runs only if the move it waits for comes, and then in that very season.",
      rules,
    );
    Assert.endsWith(
      "Giving one costs nothing; its orders cost what they cost when they run.",
      str(Schemas.leaderOrders(newGameConfig()), "properties", "standing_orders", "description"),
    );

    // The audience held while the king's orders stand says the same of a letter sent from it.
    let audience = audienceOf(
      newAudienceView({ round: 1, maxRounds: 2, from: "Egypt", envoy: newCharacterView({ id: "c1", name: "Mane" }), ordersStand: true }),
    );
    Assert.contains(
      "A letter sent now costs what it would in your orders (its gold, the scribe's fee for a tablet, one of the envoys who may leave your court this season); if you let your orders stand and send none, your next letters leave only when you next give orders.",
      audience,
    );
    Assert.contains(
      "each costs what a letter in your orders costs",
      ((Schemas.hostReply(newGameConfig(), true).properties as JsonObject).letters as JsonObject).description as string,
    );
  });

  test("With sleeping off an audience is as before", async () => {
    let off = { ...Quiet, sleepingSeats: false };
    let recorder = new Recorder(true);
    let king = new LlmLeaderSeat("Alashiya", recorder, "claude-sonnet-5-5", "medium", true, off);
    let t = courtTurn(off);
    let r = await play(king, t, off);
    let host = single(recorder.specs, (x) => x.key.startsWith(`t${t}/aud/`));
    // No letters and no choice about its orders (the other fields are those that apply at that exchange: RequestsAreRulesTests).
    Assert.doesNotContain('"letters"', JSON.stringify(host.schema));
    Assert.doesNotContain('"reopen_orders"', JSON.stringify(host.schema));
    Assert.contains('"speech"', JSON.stringify(host.schema));
    Assert.doesNotContain("reopen", host.user);
    Assert.doesNotContain("YOUR REALM IN BRIEF", host.user);
    // Every king gives orders every season, as before.
    Assert.equal(
      range(1, t).map((n) => `t${n}/orders/Alashiya`),
      recorder.specs.filter((x) => x.key.includes("/orders/")).map((x) => x.key),
    );
    Assert.empty(r.state.sleep);
  });

  test("A reply carries letters and the choice and the journal keeps them", () => {
    let json = JSON.parse(`{"speech":"Welcome.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,
 "send_gold_back":0,"gold_back_purity":100,"end_audience":true,"reopen_orders":true,"ledger":[],
 "letters":[{"envoy":"c4","to":"Hatti","message":"Brother.","mandate":"","gold":15,"purity":100,"call_brother":true,"call_them_great_king":true,
             "claim_great_king":true,"your_name_first":false,"omit_greeting":false,"tablet_to_seal":"","sworn_alliance":false,"show_tablet_copies":[]},
            {"envoy":"c5","to":"Elam","message":"x","mandate":"","gold":0,"purity":100,"call_brother":true,"call_them_great_king":true,
             "claim_great_king":true,"your_name_first":false,"omit_greeting":false,"tablet_to_seal":"","sworn_alliance":false,"show_tablet_copies":[]}]}`)!;
    let reply = Parse.host(json);
    Assert.true(reply.reopenOrders);
    Assert.equal(
      ["send c4 to Hatti with 15 shekels", "send c5 to 'Elam'"],
      reply.letters.map((o) => describeOrder(o)),
    );
    Assert.equal("unreadable", reply.letters[1].type);
    Assert.empty(asHeard(reply).letters);
    Assert.false(asHeard(reply).reopenOrders);

    // The journal: an audience held since the last orders is shown at the next audience, with the letters sent from it.
    let journal = new LeaderJournal();
    journal.record(3, newTurnSubmission({ notes: "Hold." }));
    journal.audience(5, "Egypt", "Mane", "Welcome, brother.", ["send c4 to Hatti"]);
    Assert.contains(
      'AUDIENCES YOU HAVE HELD SINCE YOU LAST GAVE ORDERS: Egypt\'s envoy Mane (turn 5): you said "Welcome, brother."; letters you gave at the audience: send c4 to Hatti',
      journal.forAudience(),
    );
    journal.record(6, newTurnSubmission({ notes: "Plan." }));
    Assert.doesNotContain("SINCE YOU LAST GAVE ORDERS", journal.forAudience());
    Assert.contains(
      'turn 6 audiences: Egypt\'s envoy Mane (turn 5): you said "Welcome, brother."; letters you gave at the audience: send c4 to Hatti',
      journal.forOrders(),
    );
  });

  // ------------------------------------------------------------ replay and the report

  test.each([[true], [false]] as const)("A game with letters and reopening at audiences replays exactly %s", async (reopen: boolean) => {
    let t = courtTurn();
    let sent = null;
    let host = new Sleeper(
      (v) => newTurnSubmission({ notes: `turn ${v.turn}` }),
      (_, court) => {
        sent ??= ready(court);
        return newHostReply({
          speech: "Welcome.",
          end: true,
          reopenOrders: reopen,
          letters: [dispatch(sent, "Hatti", "Brother.", { gold: 5, proposal: newTabletProposal({ text: "Peace." }) })],
        });
      },
    );
    let r = await play(host, t + 2);
    Assert.equal(reopen, single(r.state.sleep.get("Alashiya").courts).reopened);
    let replay = GameRunner.forReplay(GameLog.fromJsonl(r.log.toJsonl()));
    replay.writeChronicles = false;
    await replay.prepare();
    for (let i = 0; i < t + 2; i++) await replay.playTurn();
    Assert.equal(hash(GameStateSchema, r.state), hash(GameStateSchema, replay.state));
  });

  test("The seat report counts the courts held asleep and how often orders were reopened", async () => {
    let t = courtTurn();
    let host = new Sleeper(
      (_) => newTurnSubmission(),
      (_a, _b) => newHostReply({ end: true, reopenOrders: true }),
    );
    let r = await play(host, t);
    let report = seatReport(r);
    let line = single(report.split("\n"), (l) => l.trimStart().startsWith("Alashiya"));
    Assert.contains(" 1/1 ", line);
    Assert.contains("Courts held while orders stood: 1; orders reopened at 1 (100%).", report);
    Assert.equal("Courts held while orders stood: 3; orders reopened at 1 (33%).", reopenRate([3, 1, 0]));
    // Courts where a call failed and the stand-in answered are counted apart, out of the rate.
    Assert.equal(
      "Courts held while orders stood: 5; orders reopened at 1 of the 4 where the king chose (25%); at 1 a call failed, the stand-in answered and the king was asked for orders without choosing (left out of the rate).",
      reopenRate([5, 1, 1]),
    );
    Assert.equal(
      "Courts held while orders stood: 1; none left the choice to the king; at 1 a call failed, the stand-in answered and the king was asked for orders without choosing (left out of the rate).",
      reopenRate([1, 0, 1]),
    );
  });

  // ------------------------------------------------------------ a failed call (review of Part H)

  test("A failed audience call lets the stand in decide nothing and the seat is asked for orders that season", async () => {
    // Before the fix the stand-in's answer let the king's orders stand: the script, not the seat's own model, chose to
    // sleep on, nothing woke the king again, and the reopen rate counted the script's default as the king's choice.
    let t = courtTurn();
    let host = new Sleeper(
      (_) => newTurnSubmission(),
      () => {
        throw new Error("model down");
      },
    );
    let r = await play(host, t + 1);
    Assert.contains(r.errors, (e) => e.startsWith(`t${t}/aud/`) && e.includes("/host/1: model down"));

    // The seat's own model gives orders that season, told why.
    Assert.equal([1, t], host.calls);
    Assert.equal([envoyWaits("Egypt"), StandInCourtReason], last(host.views).wokenBecause);
    Assert.contains(
      `You were woken because: an envoy of Egypt came to your court (you received him before these orders); ${StandInCourtReason}.`,
      sleepLine(last(host.views), true),
    );
    let sl = r.state.sleep.get("Alashiya");
    Assert.equal([envoyWaits("Egypt"), StandInCourtReason], sl.history[0].reasons);

    // The court is recorded as one the king did not decide, and the reports keep it out of the rate.
    let court = Assert.single(sl.courts);
    Assert.equal([false, true, false], [court.reopened, court.standIn, courtDecided(court)]);
    let report = seatReport(r);
    Assert.contains(
      " 1/0 (1 by stand-in) ",
      single(report.split("\n"), (l) => l.trimStart().startsWith("Alashiya")),
    );
    Assert.contains("Courts held while orders stood: 1; none left the choice to the king; at 1 a call failed", report);

    // The stand-in's reply is marked in the log, so the replay is exact.
    let key = single(r.log.decisions, (d) => d.key.startsWith(`t${t}/aud/`) && d.key.endsWith("/host/1")).key;
    const logged = r.log.tryGet<HostReply>(key, HostReplySchema);
    Assert.true(logged !== undefined && logged.fromFallback);
    let replay = GameRunner.forReplay(GameLog.fromJsonl(r.log.toJsonl()));
    replay.writeChronicles = false;
    await replay.prepare();
    for (let i = 0; i < t + 1; i++) await replay.playTurn();
    Assert.equal(hash(GameStateSchema, r.state), hash(GameStateSchema, replay.state));
  });

  test("A call that fails after the seat answered itself keeps its letters and still asks it for orders", async () => {
    let t = courtTurn();
    let sent = null;
    let host = new Sleeper(
      (_) => newTurnSubmission(),
      (a, court) => {
        if (a.round > 1) throw new Error("model down");
        sent ??= ready(court);
        // Its own first reply sends a letter and lets its orders stand; its second call fails.
        return newHostReply({ speech: "Wait.", letters: [dispatch(sent, "Hatti", "Brother.")] });
      },
    );
    let r = await play(host, t);
    Assert.equal([1, t], host.calls);
    Assert.equal("Hatti", char(r.state, sent!).missionTarget);
    let court = Assert.single(r.state.sleep.get("Alashiya").courts);
    Assert.equal([false, true], [court.reopened, court.standIn]);
  });

  test("A seat that reopened and whose orders call failed still sends its letters and is asked again without its old choice", async () => {
    let t = courtTurn();
    let sent = null;
    let host = new Sleeper(
      (v) => {
        if (v.turn === t) throw new Error("model down");
        return newTurnSubmission();
      },
      (_, court) => {
        sent ??= ready(court);
        return newHostReply({ end: true, reopenOrders: true, letters: [dispatch(sent, "Egypt", "Brother.")] });
      },
    );
    let r = await play(host, t + 1);
    Assert.contains(r.errors, (e) => e.includes(`t${t}/orders/Alashiya`));
    // The letter was its own and goes out although the stand-in gave the season's orders.
    Assert.equal("Egypt", char(r.state, sent!).missionTarget);
    // Asked again next season: told it was woken for the envoy, but not that it "chose to reopen", a choice already spent.
    Assert.equal([1, t, t + 1], host.calls);
    let again = last(host.views).wokenBecause;
    Assert.contains(envoyWaits("Egypt"), again);
    Assert.doesNotContain(ReopenReason, again);
  });

  test("A letter from an audience replaces a dispatch scheduled for the same person", async () => {
    let t = courtTurn();
    let who = null;
    let host = new Sleeper(
      (v) =>
        v.turn === 1
          ? newTurnSubmission({ scheduled: [newScheduledOrders({ turn: t, orders: [dispatch((who = ready(v)), "Hatti", "Scheduled.")] })] })
          : newTurnSubmission(),
      (_a, _b) => newHostReply({ end: true, letters: [dispatch(who!, "Egypt", "From the audience.")] }),
    );
    let r = await play(host, t);
    Assert.equal([1], host.calls);
    Assert.equal("Egypt", char(r.state, who!).missionTarget);
  });

  test("Two hosts holding court in the same season each keep their own letters and choice", async () => {
    let probe = new TurnEngine(newGame(31, Quiet));
    let [toAlashiya, toArzawa] = [probe.travelTurns("Egypt", "Alashiya"), probe.travelTurns("Egypt", "Arzawa")];
    let t = 1 + Math.max(toAlashiya, toArzawa);
    let state = newGame(31, Quiet);
    let envoys = state.characters
      .filter((c) => c.employer === "Egypt")
      .slice(0, 2)
      .map((c) => c.id);
    // Egypt times its two envoys so that both stand before their hosts in season t.
    let egypt = new Scripted((v) => {
      let orders: Order[] = [];
      if (v.turn === t - toAlashiya) orders.push(dispatch(envoys[0], "Alashiya", "Greetings, brother."));
      if (v.turn === t - toArzawa) orders.push(dispatch(envoys[1], "Arzawa", "Greetings, brother."));
      return newTurnSubmission({ orders: orders });
    });
    let sent = null;
    let alashiya = new Sleeper(
      (_) => newTurnSubmission(),
      (a, court) => {
        sent ??= ready(court);
        return newHostReply({ speech: "Welcome.", end: a.round > 1, reopenOrders: true, letters: [dispatch(sent, "Hatti", "Brother.")] });
      },
    );
    let arzawa = new Sleeper(
      (_) => newTurnSubmission(),
      (a, _) => newHostReply({ speech: "Welcome.", end: a.round > 1 }),
    );
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Alashiya" ? alashiya : p === "Arzawa" ? arzawa : p === "Egypt" ? egypt : new Scripted()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    for (let i = 0; i < t; i++) await runner.playTurn();

    // Arzawa's second exchange shows nothing of what Alashiya sent or chose in its own court that season.
    let second = Assert.single(arzawa.audiences, (a) => a.turn === t && a.round === 2);
    Assert.true(second.ordersStand);
    Assert.false(second.reopenChosen);
    Assert.empty(second.lettersSent);
    Assert.true(Assert.single(alashiya.audiences, (a) => a.turn === t && a.round === 2).reopenChosen);
    // Alashiya reopened and gives orders; Arzawa sleeps on; Alashiya's letter went out.
    Assert.equal([1, t], alashiya.calls);
    Assert.equal([1], arzawa.calls);
    Assert.equal([true, false], [single(state.sleep.get("Alashiya").courts).reopened, single(state.sleep.get("Arzawa").courts).reopened]);
    Assert.equal("Hatti", char(state, sent!).missionTarget);
  });
});
