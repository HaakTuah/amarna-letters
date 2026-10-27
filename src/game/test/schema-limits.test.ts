import { describe, test } from "vitest";
import { newGameConfig, type GameConfig } from "@amarna/engine";
import { AnthropicLimits, ModelClient, Replies, SeatChoices, SimulatedApi, checkJobs, jsonSchema, measure, providersFor, requestBody, type ReplySchema } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

// "One source for model schemas": every schema the game can send, measured against the providers' documented limits
// with no key and no spending, and the check at setup run against the simulated API.
describe("SchemaLimitTests", () => {
  const configs: GameConfig[] = [false, true].flatMap((sleepingSeats) => [false, true].map((sharedVictory) => newGameConfig({ sleepingSeats, sharedVictory })));
  const bits = (n: number): boolean[][] => Array.from({ length: 1 << n }, (_, i) => Array.from({ length: n }, (_, k) => ((i >> k) & 1) === 1));

  /** Every variant of every schema a call can carry. */
  function everySchema(): [string, ReplySchema][] {
    const all: [string, ReplySchema][] = [];
    for (const c of configs) {
      all.push([`orders ${JSON.stringify(c.sleepingSeats)}`, Replies.leaderOrders(c)]);
      for (const [ordersStand, tabletToSeal, giftOpen, lastExchange, reopenChosen] of bits(5)) {
        const view = { ordersStand, proposal: tabletToSeal ? {} : null, proposalSealed: false, giftAccepted: giftOpen ? 0 : 5, round: lastExchange ? 2 : 1, maxRounds: 2, reopenChosen };
        all.push(["host", Replies.hostReply(c, view as never)]);
      }
    }
    for (const [a, b] of bits(2)) {
      all.push(["present", Replies.present(a, b)]);
      all.push(["react", Replies.react(a, b)]);
    }
    for (const [a, b, d] of bits(3)) all.push(["report", Replies.report(a, b, d)]);
    all.push(["pitch", Replies.pitch()]);
    for (const [f, d] of [
      ["chronicle", "The annals."],
      ["persona", "The persona prompt, in the second person."],
      ["report", "The inquirers' report."],
      ["report", "Your report home."],
      ["summary", "The new summary of your older memories."],
    ])
      all.push([f, Replies.text(f, d)]);
    return all;
  }

  test("Every schema fits Anthropic's documented limits", () => {
    for (const [name, schema] of everySchema()) {
      const m = measure(jsonSchema(schema));
      Assert.true(m.optional <= AnthropicLimits.optionalParams, `${name}: ${m.optional} optional`);
      Assert.true(m.unions <= AnthropicLimits.unionParams, `${name}: ${m.unions} unions`);
    }
  });

  test("Every field is required and every object closed: one flat shape the model fills in whole", () => {
    for (const [name, schema] of everySchema()) {
      const m = measure(jsonSchema(schema));
      Assert.true(m.optional === 0 && m.unions === 0 && m.open === 0, `${name}: ${JSON.stringify(m)}`);
      Assert.doesNotContain("$schema", JSON.stringify(jsonSchema(schema)));
    }
  });

  test("No call is strict, so no grammar is compiled, and a request carries one reply tool", () => {
    const spec = { key: "k", turn: 1, role: "leader", model: "claude-sonnet-5-5", sharedSystem: "Rules.", user: "Orders.", schema: Replies.leaderOrders(configs[3]) };
    const body = requestBody(spec, spec.model, spec.user) as { tools: { strict?: boolean }[] };
    Assert.single(body.tools);
    Assert.true(body.tools.filter((t) => t.strict === true).length <= AnthropicLimits.strictTools);
    Assert.true(body.tools[0].strict === undefined);
  });

  test("The check at setup compiles each model's largest schemas once and fails before the game", async () => {
    const choices = new SeatChoices();
    choices.leaders.set("Egypt", "Sonnet");
    choices.leaders.set("Hatti", "Sonnet");
    choices.characters = "Haiku";
    choices.narrator = "Sonnet";
    const api = new SimulatedApi();
    const client = new ModelClient(providersFor(choices, api, {}), () => {});
    await client.check(checkJobs(choices, configs[2]));
    // Orders and the fullest audience reply for the Sonnet kings, five for the Haiku characters, one for the narrator.
    Assert.equal(2 + 5 + 1, api.counted.length);
    Assert.empty(api.requests);
    api.refuseCheck = "Anthropic API 400: The compiled grammar is too large";
    const ex = await Assert.throwsAsync(() => client.check(checkJobs(choices, configs[2])));
    Assert.contains("The compiled grammar is too large", ex.message);
    Assert.contains("the game did not start", ex.message);
  });
});
