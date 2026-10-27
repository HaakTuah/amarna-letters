import { afterEach, describe, test, vi } from "vitest";
import { newGame, newGameConfig } from "@amarna/engine";
import { GameLog, GameRunner, seasonFallbacks } from "@amarna/game";
import { CompatibleProvider, ModelClient, SdkTransport, Replies, SeatChoices, SimulatedApi, buildSeats, choicesFromHeader, providersFor, splitModel, type JsonObject } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

// "Who wrote it" (Spectator mode) and "Built to outlive its models": every decision logged with its author, every
// fallback with its reason and counted by season, and models and providers as settings.
describe("WhoWroteItTests", () => {
  afterEach(() => vi.unstubAllGlobals());

  function game(choices: SeatChoices, api: SimulatedApi): GameRunner {
    const state = newGame(4, newGameConfig({ capMin: 3, capMax: 3, endMedian: 10000, sleepingSeats: false }));
    let runner: GameRunner | null = null;
    const set = buildSeats(choices, state, providersFor(choices, api, {}), () => runner!.log);
    runner = new GameRunner(state, set.seats, set.minds, set.narrator);
    return runner;
  }

  test("Every decision carries its author and a failed call is logged as a fallback with its reason", async () => {
    const choices = new SeatChoices();
    choices.leaders.set("Egypt", "Sonnet");
    choices.leaders.set("Hatti", "Haiku");
    const api = new SimulatedApi();
    // Hatti's orders never fit their schema: sent back once with the errors, then the script stands in.
    // (Hatti is the one Haiku seat.)
    api.override = (body) => (body.model === "claude-haiku-5-5" && JSON.stringify(body.tools).includes("standing_orders") ? '{"notes":1}' : null);
    const runner = game(choices, api);
    await runner.playTurn();

    const log = GameLog.fromJsonl(runner.log.toJsonl());
    Assert.equal("model", log.authorOf("t1/orders/Egypt")!.kind);
    Assert.equal("Sonnet 5.5 leader", log.authorOf("t1/orders/Egypt")!.name);
    Assert.equal("script", log.authorOf("t1/orders/Babylonia")!.kind);
    const hatti = log.authorOf("t1/orders/Hatti")!;
    Assert.equal("fallback", hatti.kind);
    Assert.equal("Haiku 5.5 leader", hatti.name);
    Assert.contains("does not match the schema", hatti.reason);
    // The retry shows in the calls too: the first call says why it was unfit, the second is attempt 2.
    const calls = log.calls.filter((c) => c.key === "t1/orders/Hatti");
    Assert.equal([1, 2], calls.map((c) => c.attempt));
    Assert.contains("notes", calls[0].error ?? "");

    const f = seasonFallbacks(log, 1);
    Assert.equal(1, f.fallen.length);
    Assert.equal("t1/orders/Hatti", f.fallen[0].key);
    Assert.true(f.asked >= 2, `${f.asked} asked`);
    Assert.equal(f.asked, runner.fallbacksIn(1).asked);
  });

  test("A replayed or continued game keeps its authors", async () => {
    const choices = new SeatChoices();
    choices.leaders.set("Egypt", "Sonnet");
    const runner = game(choices, new SimulatedApi());
    while (await runner.playTurn()) {
      /* the whole game */
    }
    const text = runner.log.toJsonl();
    const replay = GameRunner.forReplay(GameLog.fromJsonl(text));
    while (await replay.playTurn()) {
      /* the whole log */
    }
    // The decisions, each with its author, are written again exactly; a replay makes no calls of its own.
    const decisions = (t: string): string[] => t.split("\n").filter((l) => l.startsWith('{"type":"decision"'));
    Assert.equal(decisions(text).sort(), decisions(replay.log.toJsonl()).sort());
    Assert.contains(decisions(text), (l) => l.includes('"by":{"kind":"model","name":"Sonnet 5.5 leader"'));
    // The message trail's parts name their authors on replay as in the live game.
    const trail = replay.state.trails.find((t) => t.from === "Egypt");
    if (trail !== undefined) Assert.equal("Sonnet 5.5 leader", replay.trailAuthors(trail).letter!.name);
  });

  test("A model is any setting, and saved games read their seats back", () => {
    Assert.equal({ provider: "local", model: "llama3.1:8b" }, splitModel("local:llama3.1:8b", ["local"]));
    Assert.equal({ provider: "anthropic", model: "claude-sonnet-9-0" }, splitModel("claude-sonnet-9-0", ["local"]));
    Assert.equal({ provider: "anthropic", model: "other:x" }, splitModel("other:x", ["local"]));

    const c = new SeatChoices();
    c.providers = [{ id: "local", baseUrl: "http://localhost:11434/v1" }];
    c.leaders.set("Egypt", "local:llama3.1:8b");
    c.leaders.set("Hatti", "claude-sonnet-9-0");
    c.leaders.set("Mitanni", "Opus");
    c.characters = "local:qwen";
    Assert.equal(["anthropic", "local"], c.providersInUse.sort());
    let runner: GameRunner | null = null;
    const set = buildSeats(c, newGame(1), providersFor(c, null, {}, undefined, new SimulatedApi()), () => runner!.log);
    runner = new GameRunner(newGame(1), set.seats, set.minds, set.narrator);
    const back = choicesFromHeader(runner.log.header);
    Assert.equal("local:llama3.1:8b", back.leaders.get("Egypt"));
    Assert.equal("claude-sonnet-9-0", back.leaders.get("Hatti"));
    Assert.equal("Opus", back.leaders.get("Mitanni"));
    Assert.equal("local:qwen", back.characters);
    // A provider in use without a key is named; a local one takes an empty key.
    Assert.contains("local", Assert.throws(() => providersFor(c, new SimulatedApi(), {})).message);
    Assert.equal(2, providersFor(c, new SimulatedApi(), { local: "" }).length);
  });

  test("A compatible endpoint gets the schema as its response format and the check asks its model list", async () => {
    const sent: { url: string; body: JsonObject | null; auth: string | null }[] = [];
    const fetchStub = (async (url: string, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers);
      sent.push({ url, body: init?.body !== undefined ? (JSON.parse(String(init.body)) as JsonObject) : null, auth: headers.get("authorization") });
      if (url.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "llama3.1:8b" }] }), { status: 200 });
      const content = JSON.stringify({ speech: "Welcome." });
      return new Response(
        JSON.stringify({ model: "llama3.1:8b", choices: [{ finish_reason: "stop", message: { content } }], usage: { prompt_tokens: 120, completion_tokens: 8, prompt_tokens_details: { cached_tokens: 100 } } }),
        { status: 200 },
      );
    }) as typeof fetch;
    const provider = new CompatibleProvider({ id: "local", baseUrl: "http://localhost:11434/v1/" }, "", fetchStub);
    const logged: { cost: number; input: number; cacheRead: number }[] = [];
    const client = new ModelClient(provider, (c) => logged.push({ cost: c.costUsd, input: c.inputTokens, cacheRead: c.cacheReadTokens }));
    const reply = await client.askJson({ key: "k", turn: 1, role: "r", model: "local:llama3.1:8b", sharedSystem: "Rules.", seatSystem: "You.", user: "Speak.", schema: Replies.text("speech", "Words.") });
    Assert.equal("Welcome.", reply.speech as string);
    Assert.equal("http://localhost:11434/v1/chat/completions", sent[0].url);
    Assert.null(sent[0].auth);
    const format = sent[0].body!.response_format as { json_schema: { schema: JsonObject; strict: boolean } };
    Assert.false(format.json_schema.strict);
    Assert.equal(["speech"], format.json_schema.schema.required as string[]);
    Assert.equal({ cost: 0, input: 20, cacheRead: 100 }, logged[0]);

    await client.check([{ model: "local:llama3.1:8b", schemas: [Replies.text("speech", "Words.")] }]);
    const ex = await Assert.throwsAsync(() => client.check([{ model: "local:mistral", schemas: [Replies.text("speech", "Words.")] }]));
    Assert.contains("local has no model mistral", ex.message);
  });

  test("A call stopped through the SDK is an abort, not a fallback", async () => {
    const hang = ((_url: string, init?: RequestInit): Promise<Response> =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as typeof fetch;
    const stop = new AbortController();
    const asking = new SdkTransport("sk-ant-test-0000", hang).send({ model: "claude-haiku-5-5", max_tokens: 10, messages: [{ role: "user", content: "x" }] }, stop.signal);
    stop.abort();
    const ex = await Assert.throwsAsync(() => asking);
    Assert.equal("AbortError", ex.name);
  });
});
