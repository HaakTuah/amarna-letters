import { describe, test } from "vitest";
import {
  AllPowers,
  Dict,
  type GameConfig,
  GameStateSchema,
  HSet,
  type TurnSubmission,
  TurnSubmissionSchema,
  Views,
  first,
  hash,
  max,
  newGame,
  newGameConfig,
  single,
} from "@amarna/engine";
import { GameLog, GameRunner, ScriptLeader, ScriptMind, TemplateNarrator } from "@amarna/game";
import { type CallSpec, Footer, type JsonAsker, type JsonObject, LlmLeaderSeat, Replies, Schemas, readObject as lenient, readable, requestText, situation } from "@amarna/llm";
import { FileExchange } from "@amarna/llm/node";
import { Assert, toDict } from "../../engine/test/support.ts";
import { File, Directory, Path, delay, welcomeCourt } from "./io.ts";

describe("FileSeatTests", () => {
  function newFolder(): string {
    return Directory.createTempSubdirectory("amarna-fileseat-").fullName;
  }

  // <summary>Answers every request that appears in a folder, until stopped: the stand-in for a king agent.</summary>
  async function answer(folder: string, reply: (a0: string, a1: string) => string | null, ct: AbortSignal): Promise<void> {
    let answered = new HSet<string>();
    while (!ct.aborted) {
      for (const request of Directory.getFiles(folder, "*.request.md")) {
        if (!answered.add(request)) continue;
        let stem = Path.getFileName(request).slice(0, -".request.md".length);
        let text = await File.readAllText(request);
        const json = reply(stem, text);
        if (json !== null && json !== undefined) await File.writeAllText(Path.combine(folder, stem + ".reply.json"), json);
      }
      try {
        await delay(50, ct);
      } catch {}
    }
  }

  const HoldEverything: string = `{"notes":"Hold fast.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`;

  function game(config: GameConfig | null = null, timeoutSeconds: number = 30): [GameRunner, string] {
    let folder = newFolder();
    let state = newGame(8, config ?? newGameConfig({ catastropheChance: 0 }));
    let bot = new ScriptLeader(8);
    let runner: GameRunner | null = null;
    let exchange = new FileExchange(folder, timeoutSeconds * 1000, (call) => runner!.log.addCall(call));
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Alashiya" ? new LlmLeaderSeat(p, exchange, "file", "medium", state.config.customsPrimer, state.config, "File seat") : bot),
    );
    runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    return [runner, folder];
  }

  test("A file seat writes what a model king sees and plays the reply", async () => {
    let [runner, folder] = game();
    const stop = new AbortController();
    let seen: string[] = [];
    let answering = answer(
      folder,
      (stem, text) => {
        seen.push(text);
        return stem.includes("orders")
          ? `{"notes":"Buy the copper coast.","summary":"","ledger":[],"units":[{"unit":"enkomi","order":"move","target":"cilicia","to":""}],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`
          : welcomeCourt(text);
      },
      stop.signal,
    );
    await runner.playTurn();
    stop.abort();
    await answering;

    let request = first(seen, (t) => t.includes("t1_orders_Alashiya.reply.json"));
    Assert.contains("You are playing Amarna Letters", request);
    Assert.contains("CUSTOMS OF THE AGE", request);
    Assert.contains("Habiru", request);
    Assert.contains("Great King of Alashiya", request);
    Assert.contains("TREASURY:", request);
    Assert.contains('"other_orders"', request);
    Assert.contains("t1_orders_Alashiya.reply.json", request);
    Assert.endsWith(Footer, request.trimEnd());
    Assert.contains(runner.state.units, (u) => u.power === "Alashiya" && u.province === "cilicia");
    Assert.empty(runner.errors);
    Assert.contains(runner.log.calls, (c) => c.key === "t1/orders/Alashiya" && c.model === "file seat" && c.output.includes("copper coast"));
  });

  test("A file seat s summary and ledger come back in its next request", async () => {
    let [runner, folder] = game(newGameConfig({ catastropheChance: 0, sleepingSeats: false }));
    const stop = new AbortController();
    let seen: string[] = [];
    let answering = answer(
      folder,
      (stem, text) => {
        seen.push(text);
        return stem.includes("orders")
          ? `{"notes":"zq-notes","summary":"zq-summary of what I learned","ledger":[{"court":"Egypt","entry":"zq-ledger: Egypt owes me 40."}],"units":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`
          : welcomeCourt(text);
      },
      stop.signal,
    );
    await runner.playTurn();
    await runner.playTurn();
    stop.abort();
    await answering;

    Assert.empty(runner.errors);
    let second = first(seen, (t) => t.includes("t2_orders_Alashiya.reply.json"));
    Assert.contains("YOUR SUMMARY OF EARLIER SEASONS (your own words, turn 1): zq-summary of what I learned", second);
    Assert.contains("turn 1 notes: zq-notes", second);
    Assert.contains("- Egypt (turn 1): zq-ledger: Egypt owes me 40.", second);
    Assert.contains('"summary": {"type":"string"', second);
    const logged = runner.log.tryGet<TurnSubmission>("t1/orders/Alashiya", TurnSubmissionSchema);
    Assert.true(logged !== undefined);
    Assert.equal("zq-summary of what I learned", logged!.summary);
    Assert.equal({ court: "Egypt", entry: "zq-ledger: Egypt owes me 40." }, Assert.single(logged!.ledger));
  });

  // <summary>Records what a model king is sent, and holds everything.</summary>
  class Recorder implements JsonAsker {
    specs: CallSpec[] = [];

    askJson(spec: CallSpec, _signal?: AbortSignal): Promise<JsonObject> {
      this.specs.push(spec);
      let json = spec.key.includes("/orders/")
        ? HoldEverything
        : welcomeCourt(spec.user);
      return Promise.resolve(JSON.parse(json) as JsonObject);
    }
  }

  test("Only file seats are told how to finish", async () => {
    let state = newGame(8, newGameConfig({ catastropheChance: 0 }));
    let recorder = new Recorder();
    let bot = new ScriptLeader(8);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Alashiya" ? new LlmLeaderSeat(p, recorder, "claude-sonnet-5-5", "medium", state.config.customsPrimer, state.config) : bot),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.playTurn();
    await runner.playTurn();

    Assert.notEmpty(recorder.specs);
    for (const spec of recorder.specs) Assert.doesNotContain("single word done", spec.sharedSystem + spec.seatSystem + spec.user);
    let request = requestText(recorder.specs[0], "x.reply.json", "");
    Assert.endsWith(Footer, request.trimEnd());
  });

  test("The request prints the schema short with no line a file reader would cut", () => {
    // Each field (its type, enum and description) on one line: the same schema, about two thirds of the length of a fully
    // indented one, and no line near the 2,000 characters past which a file reader cuts a line.
    let schema = Schemas.leaderOrders(newGameConfig());
    let text = readable(schema);
    Assert.equal(schema, JSON.parse(text));
    Assert.true(max(text.split("\n"), (l) => l.length) < 1000);
    let indented = JSON.stringify(schema, null, 2).length;
    Assert.true(text.length < indented * 0.75, `${text.length} against ${indented}`);
    Assert.contains('    "notes": {"type":"string","description":', text);
    Assert.contains("that court's line", text);
    let spec: CallSpec = { key: "t1/orders/Egypt", turn: 1, role: "leader", model: "file seat", sharedSystem: "Rules.", user: "Your view.", schema: Replies.leaderOrders(newGameConfig()) };
    let request = requestText(spec, "x.reply.json", "");
    Assert.contains("```json\n" + text + "\n```", request.replaceAll("\r\n", "\n"));
  });

  test("An unreadable reply gets one retry and then the script king stands in", async () => {
    // Asked every season, so that the second season's call comes whatever the first decided.
    let [runner, folder] = game(newGameConfig({ catastropheChance: 0, sleepingSeats: false }));
    const stop = new AbortController();
    let answering = answer(
      folder,
      (stem, _) =>
        stem === "t1_orders_Alashiya"
          ? "this is not json"
          : stem === "t1_orders_Alashiya.retry"
            ? HoldEverything
            : stem === "t2_orders_Alashiya"
              ? "still not json"
              : stem === "t2_orders_Alashiya.retry"
                ? "{ broken"
                : HoldEverything,
      stop.signal,
    );
    await runner.playTurn();
    Assert.empty(runner.errors);
    Assert.true(File.exists(Path.combine(folder, "t1_orders_Alashiya.retry.request.md")));
    Assert.contains("could not be used", await File.readAllText(Path.combine(folder, "t1_orders_Alashiya.retry.request.md")));

    await runner.playTurn();
    stop.abort();
    await answering;
    Assert.contains(runner.errors, (e) => e.startsWith("t2/orders/Alashiya:"));
  });

  test("An empty reply file does not hang the game", async () => {
    let [runner, folder] = game();
    const stop = new AbortController();
    let answering = answer(folder, (stem, _) => (stem.startsWith("t1_orders_Alashiya") ? "" : HoldEverything), stop.signal);
    await runner.playTurn();
    stop.abort();
    await answering;
    Assert.contains(runner.errors, (e) => e.startsWith("t1/orders/Alashiya:"));
  });

  test("A reply with the wrong types gets the retry with what was wrong", async () => {
    let [runner, folder] = game();
    const stop = new AbortController();
    let answering = answer(
      folder,
      (stem, _) =>
        stem === "t1_orders_Alashiya"
          ? `{"notes":"x","summary":"","ledger":[],"units":["enkomi -> cilicia"],"letters":[],"other_orders":[{"action":"fly","province":"","power":"","person":"","amount":0,"text":"","item":"","seals":[]}]}`
          : HoldEverything,
      stop.signal,
    );
    await runner.playTurn();
    stop.abort();
    await answering;
    Assert.empty(runner.errors);
    let retry = await File.readAllText(Path.combine(folder, "t1_orders_Alashiya.retry.request.md"));
    Assert.contains("units[0]: Invalid input: expected object", retry);
    Assert.contains("other_orders[0].action: Invalid option: expected one of", retry);
  });

  test("A reply wrapped in a code fence or a stray line is still read", () => {
    Assert.notNull(lenient("```json\n" + HoldEverything + "\n```"));
    Assert.notNull(lenient("Here are my orders:\n" + HoldEverything));
    Assert.null(lenient("no orders this season"));
    Assert.null(lenient("{ broken"));
  });

  test("A seat that never answers times out into the script king", async () => {
    let [runner] = game(undefined, 1);
    await runner.playTurn();
    Assert.contains(runner.errors, (e) => e.startsWith("t1/orders/Alashiya:") && e.includes("no reply"));
  });

  test("A file seat s schedule and standing orders are read and bound to its units", async () => {
    let [runner, folder] = game();
    const stop = new AbortController();
    let request = null;
    let answering = answer(
      folder,
      (stem, text) => {
        if (stem === "t1_orders_Alashiya") request = text;
        return stem.includes("orders")
          ? `{"notes":"Plan ahead.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],
 "schedule":[{"turn":3,"units":[{"unit":"enkomi","order":"move","target":"cilicia","to":""}],"other_orders":[],"conditions":[]}],
 "standing_orders":[{"when":"unit_attacked","province":"enkomi","power":"","units":[{"unit":"enkomi","order":"hold","target":"","to":""}],"other_orders":[],"conditions":[]}],
 "cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`
          : welcomeCourt(text);
      },
      stop.signal,
    );
    await runner.playTurn();
    stop.abort();
    await answering;

    Assert.contains('"standing_orders"', request);
    Assert.contains('"cancel_standing"', request);
    // Read the first time (no retry), and bound to the fleet that stood in Enkomi when the orders were given.
    Assert.false(File.exists(Path.combine(folder, "t1_orders_Alashiya.retry.request.md")));
    Assert.empty(runner.errors);
    let fleet = single(runner.state.units, (u) => u.power === "Alashiya");
    let sleep = runner.state.sleep.get("Alashiya");
    let scheduled = Assert.single(sleep.scheduled);
    Assert.equal([3, fleet.id], [scheduled.turn, scheduled.unitId]);
    let standing = Assert.single(runner.state.standing.get("Alashiya").orders);
    Assert.equal(["s1", "UnitAttacked", fleet.id], [standing.id, standing.when, standing.unitId]);
    Assert.contains("- s1: when your fleet now in enkomi is attacked, then: the fleet now in enkomi holds", situation(Views.for(runner.state, "Alashiya")));
  });

  test("A file seat sleeps by default and replays exactly", async () => {
    // Sleeping seats are on by default: nothing here switches them on.
    let [runner, folder] = game(newGameConfig({ catastropheChance: 0 }));
    const stop = new AbortController();
    let requests = new Dict<string, string>();
    let answering = answer(
      folder,
      (stem, text) => {
        requests.set(stem, text);
        // The second reply still names a season and a trigger of its own, as a king of version 4 could: it is not read.
        return stem.includes("orders")
          ? stem.startsWith("t2_")
            ? `{"notes":"Wake me next season.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],"sleep":{"wake_in_turn":3,"wake_on":[{"trigger":"troops_enter","province":"tamassos","person":"","amount":0,"power":""}]},"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`
            : `{"notes":"Sleep.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`
          : welcomeCourt(text);
      },
      stop.signal,
    );
    for (let i = 0; i < 7; i++) await runner.playTurn();
    stop.abort();
    await answering;

    // The script kings of seed 8 send Egypt's envoy to Alashiya at once: it wakes the sleeping king in turn 2. The
    // king cannot ask to be woken in turn 3.
    function decision(stem: string): string {
      return requests.get(stem).replaceAll("\r\n", "\n").split("## THIS DECISION\n\n")[1];
    }
    Assert.contains("YOU SLEEP BETWEEN YOUR ORDERS", requests.get("t1_orders_Alashiya"));
    Assert.doesNotContain("wake_in_turn", requests.get("t1_orders_Alashiya"));
    Assert.startsWith("This is your first season.\n", decision("t1_orders_Alashiya"));
    // (A script king's fleet also ends a move next to Enkomi that season, which wakes it too.)
    let woken = "You gave orders last season (turn 1). You were woken because: an envoy of Egypt came to your court";
    Assert.startsWith(woken, decision(first([...requests.keys()], (k) => k.startsWith("t2_court_"))));
    // By its orders it has received the envoy (the audiences come first).
    Assert.startsWith(
      "You gave orders last season (turn 1). You were woken because: an envoy of Egypt came to your court (you received him before these orders)",
      decision("t2_orders_Alashiya"),
    );
    // Turn 3 is not the season it named (it cannot): a script king's troops arriving next to or in its homeland wake it.
    Assert.matches(
      "^You gave orders last season \\(turn 2\\)\\. You were woken because: [^\\n]*foreign troops (came next to your|entered your)",
      decision("t3_orders_Alashiya"),
    );
    Assert.doesNotContain([...requests.values()], (r) => r.includes("you asked to be woken"));

    let replay = GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl()));
    await replay.prepare();
    for (let i = 0; i < 7; i++) await replay.playTurn();
    Assert.equal(hash(GameStateSchema, runner.state), hash(GameStateSchema, replay.state));
  });
});
