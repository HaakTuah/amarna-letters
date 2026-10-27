import { describe, test } from "vitest";
import { court } from "../src/bots/statecraft-court.ts";
import {
  AllPowers,
  type AudienceView,
  type GameState,
  GameStateSchema,
  HostReplySchema,
  type SeatView,
  type TurnSubmission,
  TurnSubmissionSchema,
  Views,
  hash,
  newAudienceView,
  newCharacterView,
  newGame,
  newGameConfig,
  newTabletView,
  serialize,
  single,
} from "@amarna/engine";
import { GameLog, GameRunner, ScriptLeader, ScriptMind, TemplateNarrator } from "@amarna/game";
import { type CallSpec, type JsonAsker, type JsonObject, LeaderJournal, LlmLeaderSeat, Parse, Schemas, leaderRules } from "@amarna/llm";
import { at, str, fresh, Assert, last, toDict } from "../../engine/test/support.ts";

// <summary>A model king's record of earlier seasons: its notes, its own summary of older seasons, its ledger of dealings, and what each request shows.</summary>
describe("LeaderMemoryTests", () => {
  // <summary>Answers each request with the JSON the test gives for it, and keeps every request.</summary>
  class Scripted implements JsonAsker {
    readonly #reply: (a0: CallSpec) => string;
    constructor(reply: (a0: CallSpec) => string) {
      this.#reply = reply;
    }
    asked: CallSpec[] = [];

    askJson(spec: CallSpec, ct: AbortSignal): Promise<JsonObject> {
      this.asked.push(spec);
      return Promise.resolve(JSON.parse(this.#reply(spec)) as JsonObject);
    }
  }

  const Host: string = `{"speech":"Tell your lord I am his brother.","gift_to_envoy":0,"gift_request":"","offer_service_wage":0,"seal_tablet":false,"detain_envoy":false,"send_gold_back":0,"gold_back_purity":100,"end_audience":true}`;

  // <summary>An orders reply with these notes, summary and ledger lines, holding Hatti's capital.</summary>
  function ordersOf(notes: string, summary: string = "", ...ledger: [string, string][]): string {
    return JSON.stringify({
      notes,
      summary,
      ledger: ledger.map(([court, entry]) => ({ court, entry })),
      units: [{ unit: "hattusa", order: "hold", target: "", to: "" }],
      letters: [],
      other_orders: [],
    });
  }

  const Game: GameState = newGame(5);

  function view(turn: number): SeatView {
    let v = Views.for(Game, "Hatti");
    v.turn = turn;
    return v;
  }

  function envoy(turn: number): AudienceView {
    return newAudienceView({
      audienceId: `a${turn}`,
      turn: turn,
      round: 1,
      maxRounds: 2,
      from: "Egypt",
      host: "Hatti",
      envoy: newCharacterView({ id: "c90", name: "Mane" }),
      spoken: "My lord greets you.",
    });
  }

  // <summary>A seat that has given orders in turns 1..last, with notes "notes of turn N" (and a summary and ledger lines where given); it answers audiences with , or a plain reply.</summary>
  async function played(
    last: number,
    opts: {
      summary?: (turn: number) => string;
      notes?: (turn: number) => string;
      ledger?: (turn: number) => [string, string][];
      host?: string;
    } = {},
  ): Promise<[LlmLeaderSeat, Scripted]> {
    let turn = 0;
    let asker = new Scripted((spec) =>
      spec.key.includes("/aud/")
        ? (opts.host ?? Host)
        : ordersOf(opts.notes?.(turn) ?? `notes of turn ${turn}`, opts.summary?.(turn) ?? "", ...(opts.ledger?.(turn) ?? [])),
    );
    let seat = new LlmLeaderSeat("Hatti", asker, "m", "medium", true, Game.config);
    for (turn = 1; turn <= last; turn++) await seat.decide(view(turn));
    return [seat, asker];
  }

  function lastOrdersRequest(asker: Scripted): string {
    return last(asker.asked, (s) => s.key.includes("/orders/")).user;
  }

  test("Notes are kept up to two thousand characters and the schema says so", async () => {
    let long_ = "plan ".repeat(600); // 3,000 characters
    let [seat, asker] = await played(1, { notes: (_) => long_ });
    await seat.decide(view(2));
    let request = lastOrdersRequest(asker);
    let line = single(request.split("\n"), (l) => l.startsWith("turn 1 notes: "));
    let kept = line.slice("turn 1 notes: ".length).replace(/\r$/, "");
    Assert.endsWith("…", kept);
    Assert.true(kept.length <= LeaderJournal.NotesMax + 1);
    Assert.startsWith(long_.slice(0, 1990), kept);
    Assert.contains("at most 2,000 characters (longer notes are cut)", str(Schemas.leaderOrders(Game.config), "properties", "notes", "description"));
  });

  test("An orders request shows the last three seasons, the older notes folded, and says which notes leave", async () => {
    let [seat, asker] = await played(4);
    await seat.decide(view(5));
    let request = lastOrdersRequest(asker);
    Assert.doesNotContain("notes of turn 1", request);
    for (const t of [2, 3, 4]) {
      Assert.contains(`turn ${t} notes${t === 4 ? "" : ", folded"}: notes of turn ${t}`, request);
      Assert.contains(`turn ${t} orders: hattusa holds`, request);
    }
    // Notes older than the last season's are folded to their opening words ("the journal folding older notes").
    const long = "word ".repeat(200).trim();
    Assert.equal(long.slice(0, LeaderJournal.FoldedNotes), LeaderJournal.fold(long.slice(0, LeaderJournal.FoldedNotes)));
    Assert.true(LeaderJournal.fold(long).length <= LeaderJournal.FoldedNotes + 1);
    Assert.true(LeaderJournal.fold(long).endsWith("word…"));
    Assert.contains("Your notes from turn 2 leave this record after this season; keep what you need in your summary.", request);
    // No summary was written, and turn 1 has left: the king is told so.
    Assert.contains("YOUR SUMMARY OF EARLIER SEASONS: you have written none, and your notes from turn 1 and before have left this record.", request);

    // With fewer than three seasons behind it, nothing leaves yet.
    let [early, earlyAsker] = await played(2);
    await early.decide(view(3));
    Assert.doesNotContain("leave this record", lastOrdersRequest(earlyAsker));
    Assert.doesNotContain("YOUR SUMMARY", lastOrdersRequest(earlyAsker));
  });

  test("The summary is kept when empty and replaced when given", async () => {
    // Turn 2 writes a summary, turn 3 leaves it empty, turn 5 replaces it.
    let [seat, asker] = await played(4, { summary: (t) => (t === 2 ? "Egypt owes me 50; Mitanni is false." : "") });
    await seat.decide(view(5));
    let request = lastOrdersRequest(asker);
    Assert.contains("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 2): Egypt owes me 50; Mitanni is false.", request);
    // The summary comes first in the record, before the seasons shown in full.
    Assert.true(request.indexOf("YOUR SUMMARY") < request.indexOf("turn 2 notes"));

    let [again, againAsker] = await played(5, { summary: (t) => (t === 2 ? "old summary" : t === 5 ? "new summary" : "  ") });
    await again.decide(view(6));
    let latest = lastOrdersRequest(againAsker);
    Assert.contains("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 5): new summary", latest);
    Assert.doesNotContain("old summary", latest);

    // A summary longer than the cap is cut, like notes.
    let [cut, cutAsker] = await played(1, { summary: (_) => "s".repeat(2500) });
    await cut.decide(view(2));
    Assert.contains("s".repeat(LeaderJournal.SummaryMax) + "…", lastOrdersRequest(cutAsker));
    Assert.doesNotContain("s".repeat(LeaderJournal.SummaryMax + 1), lastOrdersRequest(cutAsker));
  });

  test("An audience request carries the summary and the last two seasons notes", async () => {
    let [seat, asker] = await played(3, { summary: (t) => (t === 3 ? "Babylon is my friend." : "") });
    await seat.hostAudience(envoy(4), view(4));
    let request = last(asker.asked).user;
    Assert.contains("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 3): Babylon is my friend.", request);
    Assert.contains("turn 2 notes, folded: notes of turn 2", request);
    Assert.contains("turn 3 notes: notes of turn 3", request);
    Assert.doesNotContain("notes of turn 1", request);
    Assert.doesNotContain("orders: hattusa holds", request);

    // The audience then joins the record of the season's orders.
    await seat.decide(view(4));
    await seat.decide(view(5));
    Assert.contains('turn 4 audiences: Egypt\'s envoy Mane: you said "Tell your lord I am his brother."', lastOrdersRequest(asker));
  });

  test("The model path reads the summary and the rulebook explains the record", () => {
    let sub = Parse.orders(JSON.parse(ordersOf("n", "  what I have learned  ")) as JsonObject);
    Assert.equal("what I have learned", sub.summary);
    Assert.equal("", Parse.orders(JSON.parse(`{"notes":"n","units":[],"letters":[],"other_orders":[]}`) as JsonObject).summary);
    let schema = Schemas.leaderOrders(Game.config);
    Assert.contains("summary", at(schema, "required") as string[]);
    Assert.contains("It replaces your previous summary; leave it empty to keep it.", str(schema, "properties", "summary", "description"));
    Assert.contains(
      "Each set of orders shows you the notes, audiences and orders of the last three seasons you gave orders: the last season's notes in full, the two before by their opening words (the first 400 characters); older notes then leave your record, so keep what you still need in your summary",
      leaderRules(true, Game.config),
    );
  });

  test("The summary and ledger are logged with the orders and a replay reads them", async () => {
    // Asked every season, so that every season has its orders.
    let state = newGame(4, newGameConfig({ capMin: 3, capMax: 3, endMedian: 10000, catastropheChance: 0, sleepingSeats: false }));
    let asker = new Scripted((spec) =>
      spec.key.includes("/aud/") ? Host : ordersOf(`notes ${spec.turn}`, `summary written in turn ${spec.turn}`, ["Egypt", `ledger line of turn ${spec.turn}`]),
    );
    let bot = new ScriptLeader(4);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Hatti" ? new LlmLeaderSeat(p, asker, "m", "medium", true, state.config) : bot),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    while (await runner.playTurn()) {}

    let log = GameLog.fromJsonl(runner.log.toJsonl());
    const logged = log.tryGet<TurnSubmission>("t2/orders/Hatti", TurnSubmissionSchema);
    Assert.true(logged !== undefined);
    Assert.equal("summary written in turn 2", logged!.summary);
    Assert.equal({ court: "Egypt", entry: "ledger line of turn 2" }, Assert.single(logged!.ledger));
    let replay = GameRunner.forReplay(log);
    replay.writeChronicles = false;
    await replay.prepare();
    while (await replay.playTurn()) {}
    Assert.equal(hash(GameStateSchema, runner.state), hash(GameStateSchema, replay.state));
  });

  test("The ledger keeps a line per court that an entry replaces and an empty entry removes", async () => {
    let [seat, asker] = await played(3, {
      ledger: (t) =>
        t === 1
          ? [
              ["Mitanni", "Promised 50 shekels for peace."],
              ["Egypt", "Sealed peace in turn 1."],
            ]
          : t === 2
            ? [
                ["Egypt", "Broke the peace: took gaza."],
                ["Babylonia", "Paid me 30, as promised."],
              ]
            : t === 3
              ? [
                  ["Mitanni", "  "],
                  ["Arzawa", "a".repeat(900)],
                ]
              : [],
    });
    await seat.decide(view(4));
    let request = lastOrdersRequest(asker);
    Assert.contains(
      "YOUR LEDGER OF DEALINGS (your own words, per court: what was promised, sealed, broken and paid; each line with the season you last wrote it):",
      request,
    );
    Assert.contains("- Egypt (turn 2): Broke the peace: took gaza.", request);
    Assert.contains("- Babylonia (turn 2): Paid me 30, as promised.", request);
    Assert.doesNotContain("Sealed peace in turn 1", request);
    Assert.doesNotContain("Mitanni (turn", request);
    Assert.contains("- Arzawa (turn 3): " + "a".repeat(LeaderJournal.LedgerEntryMax) + "…", request);
    // One line per court, in the fixed order of the powers, whatever order they were written in.
    Assert.true(request.indexOf("- Egypt (turn") < request.indexOf("- Babylonia (turn"));
    Assert.true(request.indexOf("- Babylonia (turn") < request.indexOf("- Arzawa (turn"));
    // The ledger is carried in full, however long ago a line was written: it never leaves with the notes.
    let [later, laterAsker] = await played(6, { ledger: (t) => (t === 1 ? [["Assyria", "Owes me a fleet."]] : []) });
    await later.decide(view(7));
    Assert.contains("- Assyria (turn 1): Owes me a fleet.", lastOrdersRequest(laterAsker));
    Assert.doesNotContain("notes of turn 1", lastOrdersRequest(laterAsker));
  });

  test("The ledger is carried into audience requests", async () => {
    let [seat, asker] = await played(2, { ledger: (t) => (t === 2 ? [["Egypt", "Sent Mane with 40 shekels; no tablet yet."]] : []) });
    await seat.hostAudience(envoy(3), view(3));
    let request = last(asker.asked).user;
    Assert.contains("- Egypt (turn 2): Sent Mane with 40 shekels; no tablet yet.", request);
    Assert.true(request.indexOf("YOUR LEDGER OF DEALINGS") < request.indexOf("AN AUDIENCE"));

    // Before anything is written, the request says so in one line.
    let [fresh, freshAsker] = await played(1);
    await fresh.hostAudience(envoy(2), view(2));
    Assert.contains(
      "YOUR LEDGER OF DEALINGS (your own words, per court: what was promised, sealed, broken and paid; each line with the season you last wrote it): nothing written yet.",
      last(freshAsker.asked).user,
    );
  });

  test("An audience reply writes the ledger and keeps it out of the reply the envoy reads", async () => {
    // Played two seasons; at the audience of turn 3 the king seals and writes it down, and strikes out Mitanni's line.
    let hostWithLedger = JSON.stringify({
      ["speech"]: "Tell your lord I am his brother.",
      ["gift_to_envoy"]: 0,
      ["gift_request"]: "",
      ["offer_service_wage"]: 0,
      ["seal_tablet"]: true,
      ["detain_envoy"]: false,
      ["send_gold_back"]: 0,
      ["gold_back_purity"]: 100,
      ["end_audience"]: true,
      ["ledger"]: [
        { ["court"]: "Egypt", ["entry"]: "zq Sealed peace through Mane in turn 3; owe them nothing." },
        { ["court"]: "Mitanni", ["entry"]: "" },
      ],
    });
    let [seat, asker] = await played(2, {
      ledger: (t) =>
        t === 1
          ? [
              ["Mitanni", "Owes me 50 shekels."],
              ["Egypt", "Nothing yet."],
            ]
          : [],
      host: hostWithLedger,
    });
    // The envoy brings a tablet to seal (a host is asked whether to seal one only when there is one to seal).
    let sealing = envoy(3);
    sealing.proposal = newTabletView({ text: "Peace between us.", seals: ["Egypt"] });
    let reply = await seat.hostAudience(sealing, view(3));

    // The reply the engine applies and the envoy's mind reads carries nothing of the ledger.
    Assert.doesNotContain("zq", serialize(HostReplySchema, reply));
    Assert.true(reply.sealProposal);

    // The next audience and the next orders show the line as written at the audience, with its season.
    await seat.hostAudience(envoy(3), view(3));
    Assert.contains("- Egypt (turn 3): zq Sealed peace through Mane in turn 3; owe them nothing.", last(asker.asked).user);
    await seat.decide(view(3));
    let orders = lastOrdersRequest(asker);
    Assert.contains("- Egypt (turn 3): zq Sealed peace through Mane in turn 3; owe them nothing.", orders);
    Assert.doesNotContain("Owes me 50 shekels", orders);
    Assert.doesNotContain("Nothing yet.", orders);

    // The audience schema asks for it the way the orders schema does, and the rulebook says either reply may write it.
    let host = Schemas.hostReply();
    Assert.contains("ledger", at(host, "required") as string[]);
    Assert.equal(JSON.stringify(at(Schemas.leaderOrders(Game.config), "properties", "ledger")), JSON.stringify(at(host, "properties", "ledger")));
    Assert.contains("you may write it in either reply", str(host, "properties", "ledger", "description"));
    Assert.contains("until you change or remove that line; you may write it in either reply.", leaderRules(true, Game.config));
    // An audience reply without the field (an older reply, or a file seat that left it out) changes nothing.
    Assert.empty(Parse.ledger(JSON.parse(Host) as JsonObject));
  });

  test("The model path reads the ledger and the schema and rulebook explain it", () => {
    let sub = Parse.orders(JSON.parse(ordersOf("n", "", ["Hatti", " Swore friendship. "], ["Assyria", ""])) as JsonObject);
    Assert.equal(
      [
        { court: "Hatti", entry: "Swore friendship." },
        { court: "Assyria", entry: "" },
      ],
      sub.ledger,
    );
    let schema = Schemas.leaderOrders(Game.config);
    Assert.contains("ledger", at(schema, "required") as string[]);
    let ledger = at(schema, "properties", "ledger");
    Assert.contains("An entry replaces that court's line, an empty entry removes it", str(ledger, "description"));
    Assert.equal(
      AllPowers.map((p) => p.toString()),
      at(ledger, "items", "properties", "court", "enum") as string[],
    );
    Assert.contains("At most 600 characters", str(ledger, "items", "properties", "entry", "description"));
    Assert.contains(
      "Your ledger of dealings keeps one line per court in your own words (what was promised, sealed, broken and paid), shown in full whenever you give orders or hold an audience",
      leaderRules(true, Game.config),
    );
  });
});
