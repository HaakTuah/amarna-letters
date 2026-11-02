import { describe, expect, test } from "vitest";
import { z } from "zod";
import { AllPowers, newGameConfig } from "@amarna/engine";
import type { ModelCall } from "@amarna/game";
import { AnthropicProvider, ApiStatusError, BatchTransport, CostEstimate, SeatChoices, MemoryBatchStore, ModelClient, ModelIds, PriceTable, Replies, problems, readAsMeant, type ApiResult, type CallSpec, type JsonObject } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";
import { StandInService, TestClock, haikuGame } from "./stand-in-service.ts";

/** The kings' shared opening: the rulebook their calls all open with, as long as the Haiku game's (70,600 tokens). */
const Rulebook = "The rules of the game. ".repeat(12_300);

function setUp(background = false): { clock: TestClock; service: StandInService; client: ModelClient; calls: ModelCall[]; store: MemoryBatchStore } {
  const clock = new TestClock();
  const service = new StandInService(clock);
  const store = new MemoryBatchStore();
  const calls: ModelCall[] = [];
  const transport = background ? new BatchTransport(service, service, store, clock) : service;
  const client = new ModelClient(new AnthropicProvider(transport), (c) => calls.push(c), new PriceTable(), clock);
  return { clock, service, client, calls, store };
}

const spec = (i: number, sharedSystem = ""): CallSpec => ({
  key: `t1/k${i}`,
  turn: 1,
  role: `leader:${i}`,
  model: ModelIds.Haiku,
  sharedSystem,
  user: `Your court, king ${i}.`,
  schema: Replies.phrase(),
});

describe("Calls that get through", () => {
  test("never more in flight than the account allows: every call of a crowded season gets through, none to a script", async () => {
    const { service, client, calls } = setUp();
    // The Haiku game's season 1: 104 decisions sent at once, 57 lost to the limit.
    const replies = await Promise.allSettled(Array.from({ length: 104 }, (_, i) => client.askJson(spec(i))));
    Assert.equal(104, replies.filter((r) => r.status === "fulfilled").length);
    Assert.true(service.peak <= service.limit);
    // A refusal halves the limit, so few calls are refused, and each is logged with its reason before it is sent again.
    Assert.true(service.refused > 0 && service.refused < 20, `refused ${service.refused}`);
    Assert.equal(service.refused, calls.filter((c) => (c.error ?? "").includes("429")).length);
  });

  test("an overloaded call waits as asked and is sent again; past the patience the script stands in", async () => {
    const { service, client, clock } = setUp();
    const send = service.send.bind(service);
    let refusals = 3;
    service.send = (body: JsonObject): Promise<ApiResult> =>
      refusals-- > 0 ? Promise.reject(new ApiStatusError("Anthropic API 529: Overloaded", 529, 30_000)) : send(body);
    await client.askJson(spec(1));
    Assert.true(clock.now() >= 90_000, "it waited as long as the service asked, three times");
    service.send = () => Promise.reject(new ApiStatusError("Anthropic API 529: Overloaded", 529, null));
    const start = clock.now();
    await Assert.throwsAsync(() => client.askJson(spec(2)));
    Assert.true(clock.now() - start <= 10 * 60_000, "it gives up within its patience");
    // An error that is no refusal is not sent again.
    let sent = 0;
    service.send = () => (sent++, Promise.reject(new ApiStatusError("Anthropic API 400: bad request", 400)));
    await Assert.throwsAsync(() => client.askJson(spec(3)));
    Assert.equal(1, sent);
  });

  test("the cache is written once: calls sharing an opening wait for the first to write it", async () => {
    const { service, client, calls } = setUp();
    await Promise.all(Array.from({ length: 25 }, (_, i) => client.askJson(spec(i, Rulebook))));
    Assert.equal(1, service.writes);
    Assert.equal(1, calls.filter((c) => c.cacheWriteTokens > 0).length);
    Assert.equal(24, calls.filter((c) => c.cacheReadTokens > 0).length);
  });

  test("an opening whose cache lapsed between seasons is written to last an hour from then on", async () => {
    const { service, client, clock } = setUp();
    await client.askJson(spec(1, Rulebook));
    await clock.sleep(6 * 60_000);
    await client.askJson(spec(2, Rulebook));
    const ttl = (b: JsonObject): unknown => ((b.system as JsonObject[])[0].cache_control as JsonObject).ttl;
    Assert.equal(undefined, ttl(service.bodies[0]));
    Assert.equal("1h", ttl(service.bodies[1]));
    Assert.equal(2, service.writes);
  });

  test("answers are read as meant: every slip of the Haiku game that a reading can mend is mended", () => {
    const { header, calls } = haikuGame();
    const config = newGameConfig(header.config as Partial<ReturnType<typeof newGameConfig>>);
    const slipped = calls.filter((c) => (c.error ?? "").startsWith("it does not match the schema"));
    Assert.equal(26, slipped.length);
    const life = z.object({
      go: z.enum(["", "Egypt", "Hatti", "Babylonia"]),
      go_as: z.enum(["", "Abdi"]),
      take_to_hills: z.enum(["", "Amurru"]),
    });
    for (const c of slipped) {
      const schema = c.role.startsWith("leader:") ? Replies.leaderOrders(config) : life;
      const reply = JSON.parse(c.output) as JsonObject;
      const subset = c.role.startsWith("leader:") ? reply : { go: reply.go, go_as: reply.go_as, take_to_hills: reply.take_to_hills };
      const before = problems(subset, schema).filter((p) => p.startsWith("go") || p.startsWith("take") || p.startsWith("letters"));
      Assert.true(before.length > 0, `${c.role} slipped`);
      const after = problems(readAsMeant(subset, schema as never), schema).filter((p) => p.startsWith("go") || p.startsWith("take") || p.startsWith("letters"));
      Assert.equal("", `${after.join("; ")}`);
    }
  });

  test("a slip that cannot be read goes back once, saying what was given and what was asked", () => {
    const schema = z.object({ to: z.enum(["Assyria", "Babylonia"]), gold: z.int() });
    const found = problems({ to: "Babel", gold: "much" }, schema);
    Assert.equal('to: "Babel" is not one of Assyria, Babylonia', found[0]);
    Assert.equal('gold: gave "much", where a number was asked', found[1]);
    // Left out, blank-looking, a list for a blank, another spelling: all read as meant.
    const read = readAsMeant({ to: "babylon" }, z.object({ to: z.enum(["", "Assyria", "Babylonia"]), say: z.string(), list: z.array(z.string()), n: z.int(), yes: z.boolean() }));
    expect(read).toEqual({ to: "Babylonia", say: "", list: [] });
    // A number or a yes-or-no left out is a decision not taken: not guessed, so the check names it for the retry.
    Assert.equal("n: gave nothing, where a number was asked", problems(read, z.object({ n: z.int() }))[0]);
    expect(readAsMeant({ to: ["'' "] }, z.object({ to: z.enum(["", "Assyria"]) }))).toEqual({ to: "" });
    expect(readAsMeant({ to: "none" }, z.object({ to: z.enum(["", "Assyria"]) }))).toEqual({ to: "" });
    // Two options the value could be: not guessed.
    expect(readAsMeant({ to: "Hatt" }, z.object({ to: z.enum(["Hatti", "Hattusa"]) }))).toEqual({ to: "Hatt" });
  });

  test("in the background a phase goes as one batch at half the price, with the opening's cache written first", async () => {
    const live = setUp();
    await Promise.all(Array.from({ length: 25 }, (_, i) => live.client.askJson(spec(i, Rulebook))));
    const { service, client, calls } = setUp(true);
    await Promise.all(Array.from({ length: 25 }, (_, i) => client.askJson(spec(i, Rulebook))));
    // The first call writes the cache alone; the other 24 follow in one batch and read it.
    Assert.equal(2, service.batches.size);
    Assert.equal(24, service.batches.get("batch_2")!.requests.length);
    Assert.equal(1, service.writes);
    Assert.equal(0, service.refused);
    // Half the price of a live call that reads the cache; the write lasts an hour, at twice the input price.
    const liveRead = live.calls.find((c) => c.cacheReadTokens > 0)!.costUsd;
    const bgRead = calls.find((c) => c.cacheReadTokens > 0)!.costUsd;
    Assert.true(Math.abs(bgRead - liveRead / 2) < 1e-12);
    Assert.equal("1h", ((service.bodies[0].system as JsonObject[])[0].cache_control as JsonObject).ttl);
  });

  test("a game closed while its batch was out collects the answers when it is opened again, without sending them twice", async () => {
    const { service, client, store, clock } = setUp(true);
    const stop = new AbortController();
    const asked = client.askJson(spec(1), stop.signal);
    while (service.batches.size === 0) await clock.sleep(100);
    stop.abort();
    await Assert.throwsAsync(() => asked);
    // Opened again: the same call, a new client and transport over the same kept batches.
    const calls: ModelCall[] = [];
    const again = new ModelClient(new AnthropicProvider(new BatchTransport(service, service, store, clock)), (c) => calls.push(c), new PriceTable(), clock);
    await again.askJson(spec(1));
    Assert.equal(1, service.batches.size);
    Assert.equal(null, calls[0].error);
  });

  test("a batch already answered when the game closed mid-season is collected, not sent again", async () => {
    const { service, client, store, clock } = setUp(true);
    await client.askJson(spec(1));
    Assert.equal(1, service.batches.size);
    // The season was not saved: opened again, it asks the same call again.
    const again = new ModelClient(new AnthropicProvider(new BatchTransport(service, service, store, clock)), () => {}, new PriceTable(), clock);
    await again.askJson(spec(1));
    Assert.equal(1, service.batches.size);
  });

  test("in the background only Anthropic's calls are estimated at the batch price; another provider's stay live", () => {
    const c = new SeatChoices();
    c.providers = [{ id: "local", baseUrl: "http://localhost:11434/v1" }];
    c.prices = { "local:llama": [1, 2, 0.1] };
    c.small = "Off";
    for (const p of AllPowers) c.leaders.set(p, "local:llama");
    Assert.equal(CostEstimate.perSeason(c), CostEstimate.perSeason(c, true));
    for (const p of AllPowers) c.leaders.set(p, "Haiku");
    Assert.inRange(CostEstimate.perSeason(c, true) / CostEstimate.perSeason(c), 0.45, 0.6);
  });

  test("a call its batch answered with an overload is sent again in a new batch", async () => {
    const { service, client } = setUp(true);
    const results = service.results.bind(service);
    let overloaded = true;
    service.results = async (batch: string) => {
      const answered = await results(batch);
      if (overloaded) {
        overloaded = false;
        for (const id of answered.keys()) answered.set(id, new ApiStatusError("Anthropic batch: Overloaded", 529));
      }
      return answered;
    };
    await client.askJson(spec(1));
    Assert.equal(2, service.batches.size);
  });
});
