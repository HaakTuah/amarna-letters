import { afterEach, beforeAll, describe, test, vi } from "vitest";
import { IdleSeat, Near, smallSeats } from "./small-world.ts";
import { AllPowers, Dict, type GameConfig, GameStateSchema, HSet, type Power, count, hash, newGame, newGameConfig } from "@amarna/engine";
import { GameLog, GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, newLogHeader, pressFor } from "@amarna/game";
import {
  BridgeExchange,
  type CallSpec,
  CostEstimate,
  DefaultAddress,
  Footer,
  Heading,
  type JsonObject,
  LlmLeaderSeat,
  LocalAgentLabel,
  LocalBridge,
  Presets,
  Replies,
  SeatChoices,
  bridgeReady,
  buildSeats,
  choicesFromHeader,
  LocalAgentCharactersLabel,
} from "@amarna/llm";
import { FileExchange } from "@amarna/llm/node";
import { Assert, toDict, join } from "../../engine/test/support.ts";
import { File, Directory, Path, delay, welcomeCourt } from "./io.ts";

// Local play on a Claude subscription: kings played by local agents, whose requests go through the local bridge
// (sim/bridge.js) into their folders. The bridge here is a stand-in with the same endpoints over temporary folders.
describe("LocalPlayTests", () => {
  beforeAll(() => {
    LocalBridge.pollMs = 20;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const HoldEverything: string = `{"notes":"Hold fast.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`;

  // <summary>The bridge's endpoints, as sim/bridge.js serves them, over one temporary folder per king.</summary>
  class FakeBridge {
    folders = new Dict<Power, string>();
    withdrawn: string[] = [];
    down = false;

    constructor(...kings: Power[]) {
      for (const k of kings) this.folders.set(k, Directory.createTempSubdirectory("amarna-bridge-").fullName);
    }

    replyPath(seat: Power, name: string): string {
      return Path.combine(this.folders.get(seat), name + ".reply.json").replaceAll("\\", "/");
    }

    /** The bridge as fetch sees it: the TypeScript LocalBridge reaches it through the global fetch. */
    readonly fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      if (this.down) throw new TypeError("fetch failed: connection refused");
      const url = new URL(input instanceof Request ? input.url : input.toString());
      const path = url.pathname;
      const method = init?.method ?? "GET";
      if (method === "GET" && path === "/status")
        return respond({ bridge: "amarna-letters", version: 1, seats: [...this.folders.keys()].map((k) => k.toString()) });
      if (method === "GET" && path === "/reply") {
        const seat = url.searchParams.get("seat") as Power;
        const name = url.searchParams.get("name")!;
        const folder = this.folders.get(seat);
        if (!File.exists(Path.combine(folder, name + ".request.md"))) return new Response(null, { status: 404 });
        const reply = Path.combine(folder, name + ".reply.json");
        if (!File.exists(reply)) return new Response(null, { status: 204 });
        // As the bridge does: a reply that cannot be read yet (just moved into place, and held a moment by another
        // reader, such as a virus scanner) is not there yet.
        try {
          return new Response(await File.readAllText(reply), { status: 200 });
        } catch {
          return new Response(null, { status: 204 });
        }
      }
      const body = JSON.parse(String(init?.body)) as JsonObject;
      const who = body.seat as Power;
      const stem = body.name as string;
      if (path === "/cancel") {
        this.withdrawn.push(stem);
        File.delete(Path.combine(this.folders.get(who), stem + ".request.md"));
        return respond({ ok: true });
      }
      const text = body.text as string;
      const mark = body.mark as string;
      Assert.equal(text.indexOf(mark), text.lastIndexOf(mark));
      const full = text.replaceAll(mark, this.replyPath(who, stem));
      const replyFile = Path.combine(this.folders.get(who), stem + ".reply.json");
      if (File.exists(replyFile)) File.delete(replyFile);
      // As the bridge does: whole, through a temporary file, so that no reader sees half a request.
      const requestFile = Path.combine(this.folders.get(who), stem + ".request.md");
      await File.writeAllText(requestFile + ".tmp", full);
      File.move(requestFile + ".tmp", requestFile);
      return respond({ ok: true, chars: full.length });
    };
  }

  function respond(o: JsonObject): Response {
    return new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
  }

  // <summary>The stand-in for the king agents: answers every request that appears in the bridge's folders.</summary>
  async function answer(bridge: FakeBridge, reply: (a0: string, a1: string) => string | null, ct: AbortSignal): Promise<void> {
    let answered = new HSet<string>();
    while (!ct.aborted) {
      for (const folder of [...bridge.folders.values()])
        for (const request of Directory.getFiles(folder, "*.request.md")) {
          if (!answered.add(request)) continue;
          let stem = Path.getFileName(request).slice(0, -".request.md".length);
          try {
            let text = await File.readAllText(request);
            const json = reply(stem, text);
            if (json === null) continue;
            let tmp = Path.combine(folder, stem + ".answer.tmp");
            await File.writeAllText(tmp, json);
            File.move(tmp, Path.combine(folder, stem + ".reply.json"));
          } catch {
            // Taken back or still being moved: look again on the next pass.
            answered.delete(request);
          }
        }
      try {
        await delay(20, ct);
      } catch {}
    }
  }

  function choicesOf(...local: Power[]): SeatChoices {
    let c = new SeatChoices();
    for (const p of local) c.leaders.set(p, "LocalAgent");
    return c;
  }

  function game(bridge: FakeBridge, config: GameConfig | null = null, minutes: number = 5): GameRunner {
    let state = newGame(8, config ?? newGameConfig({ catastropheChance: 0 }));
    let choices = choicesOf(...bridge.folders.keys());
    choices.localAgentMinutes = minutes;
    let runner: GameRunner | null = null;
    vi.stubGlobal("fetch", bridge.fetch);
    let set = buildSeats(choices, state, null, () => runner!.log);
    // The small world (small-world.ts): the agent kings among the default few script kings, every other power idle.
    for (const p of AllPowers) if (!Near.includes(p) && !bridge.folders.has(p)) set.seats.set(p, new IdleSeat());
    runner = Object.assign(new GameRunner(state, set.seats, set.minds, set.narrator), { writeChronicles: false });
    return runner;
  }

  test("A local agent king gets exactly what a file seat gets and plays the reply", async () => {
    let bridge = new FakeBridge("Alashiya");
    let runner = game(bridge);
    const stop = new AbortController();
    let answering = answer(
      bridge,
      (stem, text) =>
        stem.includes("orders")
          ? `{"notes":"Buy the copper coast.","summary":"","ledger":[],"units":[{"unit":"enkomi","order":"move","target":"enkomiwaters","to":""}],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}`
          : welcomeCourt(text),
      stop.signal,
    );
    await runner.playTurn();
    stop.abort();
    await answering;

    let request = await File.readAllText(Path.combine(bridge.folders.get("Alashiya"), "t1_orders_Alashiya.request.md"));
    Assert.startsWith(Heading, request);
    Assert.doesNotContain("t1/orders/Alashiya", request);
    Assert.contains("Decide as the king", request);
    Assert.contains("Great King of Alashiya", request);
    Assert.contains(`to: ${bridge.replyPath("Alashiya", "t1_orders_Alashiya")}`, request);
    Assert.endsWith(Footer, request.trimEnd());
    Assert.contains(runner.state.units, (u) => u.power === "Alashiya" && u.province === "enkomiwaters");
    Assert.empty(runner.errors);
    let call = Assert.single(runner.log.calls, (c) => c.key === "t1/orders/Alashiya");
    Assert.equal(BridgeExchange.Model, call.model);
    Assert.equal(request.length, call.requestChars);
    Assert.equal(LocalAgentLabel, runner.log.header.seats.get("Alashiya"));

    // The same game with a file seat writes the same request, word for word, but for the folder it names.
    let folder = Directory.createTempSubdirectory("amarna-fileseat-").fullName;
    let state = newGame(8, newGameConfig({ catastropheChance: 0 }));
    let file: GameRunner | null = null;
    let exchange = new FileExchange(folder, 5 * 60000, (c) => file!.log.addCall(c));
    let script = new ScriptLeader(8);
    let seats = smallSeats((p) => (p === "Alashiya" ? new LlmLeaderSeat(p, exchange, "file", "medium", state.config.customsPrimer, state.config, "File seat") : script), [...Near, "Alashiya"]);
    file = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    const stop2 = new AbortController();
    let fileAnswers = (async () => {
      while (!stop2.signal.aborted) {
        for (const r of Directory.getFiles(folder, "*.request.md")) {
          let reply = r.slice(0, -".request.md".length) + ".reply.json";
          if (!File.exists(reply)) await File.writeAllText(reply, r.includes("orders") ? HoldEverything : welcomeCourt(await File.readAllText(r)));
        }
        try {
          await delay(20, stop2.signal);
        } catch {}
      }
    })();
    await file.playTurn();
    stop2.abort();
    await fileAnswers;
    let fileRequest = await File.readAllText(Path.combine(folder, "t1_orders_Alashiya.request.md"));
    Assert.equal(
      fileRequest.replaceAll(Path.getFullPath(folder).replaceAll("\\", "/"), "FOLDER"),
      request.replaceAll(bridge.folders.get("Alashiya").replaceAll("\\", "/"), "FOLDER"),
    );
  });

  test("An unreadable reply gets one retry through the bridge", async () => {
    let bridge = new FakeBridge("Alashiya");
    let runner = game(bridge);
    const stop = new AbortController();
    let answering = answer(
      bridge,
      (stem, text) => (stem === "t1_orders_Alashiya" ? "this is not json" : stem === "t1_orders_Alashiya.retry" ? HoldEverything : welcomeCourt(text)),
      stop.signal,
    );
    await runner.playTurn();
    stop.abort();
    await answering;
    Assert.empty(runner.errors);
    let retry = await File.readAllText(Path.combine(bridge.folders.get("Alashiya"), "t1_orders_Alashiya.retry.request.md"));
    Assert.contains("could not be used", retry);
    Assert.contains(`to: ${bridge.replyPath("Alashiya", "t1_orders_Alashiya.retry")}`, retry);
  });

  test("An agent that never answers times out into the script and its request is taken back", async () => {
    let bridge = new FakeBridge("Alashiya");
    let local = new LocalBridge("localhost:5190", 300);
    vi.stubGlobal("fetch", bridge.fetch);
    let seat = new BridgeExchange(local, "Alashiya");
    let spec: CallSpec = {
      key: "t4/orders/Alashiya",
      turn: 4,
      role: "leader:Alashiya",
      model: BridgeExchange.Model,
      sharedSystem: "Rules.",
      user: "Your orders.",
      schema: Replies.text("notes", "Notes."),
    };
    let ex = await Assert.throwsAsync(() => seat.askJson(spec, undefined));
    Assert.contains("Alashiya", ex.message);
    await delay(200);
    Assert.contains("t4_orders_Alashiya", bridge.withdrawn);
    Assert.false(File.exists(Path.combine(bridge.folders.get("Alashiya"), "t4_orders_Alashiya.request.md")));
  });

  test("A stopped game takes its waiting requests back", async () => {
    let bridge = new FakeBridge("Hatti");
    let local = new LocalBridge(DefaultAddress, 5 * 60000);
    vi.stubGlobal("fetch", bridge.fetch);
    let seat = new BridgeExchange(local, "Hatti");
    let spec: CallSpec = {
      key: "t2/aud/a7/host/1",
      turn: 2,
      role: "host:Hatti",
      model: BridgeExchange.Model,
      sharedSystem: "Rules.",
      user: "An envoy waits.",
      schema: Replies.text("speech", "Speech."),
    };
    const stop = new AbortController();
    let asking = seat.askJson(spec, stop.signal);
    let request = Path.combine(bridge.folders.get("Hatti"), "t2_aud_a7_host_1.request.md");
    for (let i = 0; i < 100 && !File.exists(request); i++) await delay(20);
    Assert.true(File.exists(request));
    stop.abort();
    await Assert.throwsAsync(() => asking);
    for (let i = 0; i < 100 && bridge.withdrawn.length === 0; i++) await delay(20);
    Assert.equal(["t2_aud_a7_host_1"], bridge.withdrawn);
    Assert.false(File.exists(request));
  });

  test("The bridge check says what is wrong", async () => {
    let bridge = new FakeBridge("Hatti", "Egypt");
    vi.stubGlobal("fetch", bridge.fetch);
    let ok = await LocalBridge.check(DefaultAddress, ["Hatti", "Egypt"]);
    Assert.true(bridgeReady(ok));
    Assert.equal(["Egypt", "Hatti"], [...ok.seats].sort());

    let missing = await LocalBridge.check(DefaultAddress, ["Hatti", "Mitanni"]);
    Assert.true(missing.running);
    Assert.false(bridgeReady(missing));
    Assert.contains("Mitanni", missing.problem);
    Assert.contains("sim/setup.js", missing.problem);

    bridge.down = true;
    let down = await LocalBridge.check(DefaultAddress, ["Hatti"]);
    Assert.false(down.running);
    Assert.contains("node sim/bridge.js", down.problem);
    Assert.contains("not on the published site", down.problem);
  });

  test("Local agent kings need no key and come back from a saved game", () => {
    let c = choicesOf("Hatti", "Egypt");
    c.leaders.set("Alashiya", "Human");
    Assert.false(c.usesModels);
    Assert.true(c.usesLocalAgents);
    Assert.equal(0, CostEstimate.perGame(c));
    c.bridgeAddress = "http://127.0.0.1:6001";
    c.localAgentMinutes = 30;
    let copy = c.copy();
    Assert.equal("http://127.0.0.1:6001", copy.bridgeAddress);
    Assert.equal(30, copy.localAgentMinutes);

    let state = newGame(8, newGameConfig());
    let set = buildSeats(c, state, null, () => new GameLog());
    Assert.equal(LocalAgentLabel, set.seats.get("Hatti").label);
    Assert.true(set.seats.get("Hatti").canSleep);
    let header = newLogHeader({
      seats: toDict(
        set.seats,
        (x) => x[0],
        (x) => x[1].label,
      ),
    });
    let back = choicesFromHeader(header);
    Assert.equal("LocalAgent", back.leaders.get("Hatti"));
    Assert.equal("LocalAgent", back.leaders.get("Egypt"));
    Assert.equal("Human", back.leaders.get("Alashiya"));
    Assert.equal("Script", back.leaders.get("Mitanni"));
    // Script characters: the game is in structured press (item 8).
    Assert.equal("structured", pressFor(newGame(8, newGameConfig()), set.minds).config.pressMode);

    // Characters played by local agents too (item 8): those the bridge keeps folders for go through it, by id; they are no
    // model calls of this program, the game is in full press, and a saved game reads them back.
    let withCharacters = c.copy();
    withCharacters.characters = "LocalAgent";
    withCharacters.bridgeCharacters = [state.characters[0].id];
    Assert.false(withCharacters.usesModels);
    Assert.true(withCharacters.usesLocalAgents);
    let both = buildSeats(withCharacters, state, null, () => new GameLog());
    Assert.equal(LocalAgentCharactersLabel, both.minds.label);
    Assert.equal(LocalAgentCharactersLabel, both.minds.authorFor!(state.characters[0]));
    Assert.equal("Script characters", both.minds.authorFor!(state.characters[1]));
    Assert.equal("full", pressFor(newGame(8, newGameConfig()), both.minds).config.pressMode);
    Assert.equal("LocalAgent", choicesFromHeader(newLogHeader({ minds: both.minds.label })).characters);

    // The preset is offered only where the bridge can be reached (the web app on this computer), so it is not in All.
    Assert.doesNotContain(Presets.Local, Presets.all);
    Assert.false(Presets.Local.needsKey);
    Presets.Local.applyTo(c);
    Assert.equal("Human", c.leaders.get("Alashiya"));
    Assert.all(
      AllPowers.filter((p) => p !== "Alashiya"),
      (p) => Assert.equal("LocalAgent", c.leaders.get(p)),
    );
    Assert.true(Presets.Local.matches(c));
  });

  test("A game with local agent kings sleeps by default and replays exactly", async () => {
    let bridge = new FakeBridge("Alashiya", "Mitanni");
    let runner = game(bridge);
    const stop = new AbortController();
    let asked: string[] = [];
    let answering = answer(
      bridge,
      (stem, text) => {
        asked.push(stem);
        return stem.includes("orders") ? `{"notes":"Sleep.","summary":"","ledger":[],"units":[],"letters":[],"other_orders":[],"schedule":[],"standing_orders":[],"cancel_standing":[],"standing_answers":[],"cancel_answers":[]}` : welcomeCourt(text);
      },
      stop.signal,
    );
    for (let i = 0; i < 4; i++) await runner.playTurn();
    stop.abort();
    await answering;
    Assert.empty(runner.errors);
    // Asleep after the first orders, a king is asked again only when something concerns it.
    Assert.contains("t1_orders_Alashiya", asked);
    Assert.true(count(asked, (s) => s.includes("_orders_")) < 8, join(", ", asked));

    let replay = GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl()));
    await replay.prepare();
    for (let i = 0; i < 4; i++) await replay.playTurn();
    Assert.equal(hash(GameStateSchema, runner.state), hash(GameStateSchema, replay.state));
  });
});
