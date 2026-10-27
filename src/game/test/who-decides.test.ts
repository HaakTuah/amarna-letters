import { describe, test } from "vitest";
import { AllPowers, Dict, GameStateSchema, TurnEngine, Views, hash, newGame, newGameConfig, type Power } from "@amarna/engine";
import { GameLog, GameRunner, newLogHeader, type ISeat } from "@amarna/game";
import {
  CostEstimate,
  Ladder,
  ModelIds,
  Presets,
  PriceTable,
  SeatChoices,
  SimulatedApi,
  Spending,
  buildSeats,
  choicesFromHeader,
  expectedSeasonsLeft,
  newSpendingSettings,
  ordersStakes,
  providersFor,
  startProblem,
  type CallSpec,
  type JsonAsker,
  type JsonObject,
  type Rung,
} from "@amarna/llm";
import { z } from "zod";
import { Assert, at, str } from "../../engine/test/support.ts";

const has = (o: unknown, k: string): boolean => typeof o === "object" && o !== null && k in o;
const props = (body: JsonObject): JsonObject => (at(body, "tools", 0, "input_schema", "properties") as JsonObject | undefined) ?? {};
const userOf = (body: JsonObject): string => str(body, "messages", 0, "content");

/**
 * A game whose kings are Sonnet (Hatti and Babylonia script, so envoys are on the road), with the table's other choices.
 * Courteous: the script kings' envoys bring words only, no tablet and no gold, so their audiences are routine.
 */
function build(f: (c: SeatChoices) => void = () => {}, seed = 3, api = new SimulatedApi(), courteous = false): [GameRunner, SimulatedApi, SeatChoices] {
  const c = new SeatChoices();
  for (const p of AllPowers) c.leaders.set(p, p === "Hatti" || p === "Babylonia" ? "Script" : "Sonnet");
  f(c);
  const state = newGame(seed, newGameConfig({ capMin: 12, capMax: 12, endMedian: 10000 }));
  let runner: GameRunner | null = null;
  const set = buildSeats(c, state, providersFor(c, api, {}), () => runner!.log);
  const seats = new Dict<Power, ISeat>(
    [...set.seats].map(([p, seat]) => [
      p,
      !courteous || c.leaders.get(p) !== "Script"
        ? seat
        : ({
            label: seat.label,
            decide: async (v, sg) => {
              const sub = await seat.decide(v, sg);
              for (const o of sub.orders)
                if (o.type === "dispatch") {
                  o.proposal = null;
                  o.gold = 0;
                  o.copies = null;
                }
              return sub;
            },
            hostAudience: (v, court, sg) => seat.hostAudience(v, court, sg),
          } as ISeat),
    ]),
  );
  runner = new GameRunner(state, seats, set.minds, set.narrator, { jobs: c.jobs });
  return [runner, api, c];
}

async function play(runner: GameRunner, seasons: number): Promise<void> {
  await runner.prepare();
  for (let i = 0; i < seasons && (await runner.playTurn()); i++) {}
}

/** A stand-in replier for the ladder alone: answers by model, and keeps what it was asked. */
class Asker implements JsonAsker {
  readonly asked: CallSpec[] = [];
  readonly answer: (spec: CallSpec) => JsonObject;
  constructor(answer: (spec: CallSpec) => JsonObject) {
    this.answer = answer;
  }
  askJson(spec: CallSpec): Promise<JsonObject> {
    this.asked.push(spec);
    return Promise.resolve(this.answer(spec));
  }
}

const spec = (): CallSpec => ({
  key: "t1/orders/Egypt",
  turn: 1,
  role: "leader:Egypt",
  model: ModelIds.Sonnet,
  sharedSystem: "rules ".repeat(2000),
  user: "situation ".repeat(800),
  schema: z.object({ choice: z.string() }),
  maxTokens: 4000,
});

function ladder(asker: Asker, settings = newSpendingSettings(), spent = () => 0): [Ladder, { routes: [string, Rung, string][]; audits: number }] {
  const seen = { routes: [] as [string, Rung, string][], audits: 0 };
  const l = new Ladder(asker, new Spending(settings, newGameConfig(), 7, spent), new PriceTable(), {
    route: (key, r) => seen.routes.push([key, r.rung, r.why]),
    audit: () => seen.audits++,
  });
  return [l, seen];
}

const climb = (small: string | null = ModelIds.Haiku, start: Rung = "small") => ({
  spec: spec(),
  small,
  large: ModelIds.Sonnet,
  start,
  scriptMay: true,
  stakes: { kind: "orders", moved: 0.3 },
  keys: ["t1/orders/Egypt"],
  differ: () => 1,
});

describe("Who decides (item 6c)", () => {
  test("With nothing set to spend by, a decision goes where it starts, and the log says which rung took it", async () => {
    const asker = new Asker(() => ({ choice: "x", pass_up: "", ask_counsel: "" }));
    const [l, seen] = ladder(asker, newSpendingSettings({ auditShare: 0 }));
    const small = await l.climb(climb());
    Assert.equal("small", small.rung);
    Assert.equal(ModelIds.Haiku, asker.asked[0].model);
    // The small rung reads what it may do, and answers with its own fields; they are taken off the reply.
    Assert.contains("fuller deliberation", asker.asked[0].user);
    Assert.true(has(asker.asked[0].schema.shape, "pass_up"));
    Assert.false(has(small.json, "pass_up"));
    const large = await l.climb(climb(ModelIds.Haiku, "large"));
    Assert.equal("large", large.rung);
    Assert.equal(ModelIds.Sonnet, asker.asked[1].model);
    Assert.equal("routine", seen.routes[0][2]);
    Assert.equal("large", seen.routes[1][1]);
  });

  test("The small rung passes a matter up whole, or asks counsel from a brief and decides", async () => {
    let passes = true;
    const asker = new Asker((s) =>
      s.model === ModelIds.Sonnet
        ? s.role.startsWith("counsel:")
          ? { counsel: "Hold the passes." }
          : { choice: "large" }
        : passes
          ? { choice: "small", pass_up: "a war may follow", ask_counsel: "" }
          : s.user.includes("THE COUNSEL YOU ASKED FOR")
            ? { choice: "small", pass_up: "" }
            : { choice: "small", pass_up: "", ask_counsel: "Hatti masses troops; should I strike first or wait?" },
    );
    const [l, seen] = ladder(asker, newSpendingSettings({ auditShare: 0 }));
    const up = await l.climb(climb());
    Assert.equal("large", up.rung);
    Assert.equal("large", up.json!.choice);
    Assert.equal("passed up: a war may follow", seen.routes[0][2]);

    passes = false;
    asker.asked.length = 0;
    const kept = await l.climb(climb());
    Assert.equal("small", kept.rung);
    Assert.equal("Hold the passes.", kept.counsel);
    // The counsel call reads the brief alone, never the whole request; the small rung is then asked again with it.
    const counsel = asker.asked.find((s) => s.role.startsWith("counsel:"))!;
    Assert.equal("Hatti masses troops; should I strike first or wait?", counsel.user);
    Assert.contains("THE COUNSEL YOU ASKED FOR: Hold the passes.", asker.asked[2].user);
    Assert.false(has(asker.asked[2].schema.shape, "ask_counsel"));
  });

  test("A small rung's reply that commits its mind goes up; an audit asks the rung above and is never used", async () => {
    const asker = new Asker((s) => (s.model === ModelIds.Sonnet ? { choice: "large" } : { choice: "seal", pass_up: "", ask_counsel: "" }));
    const [l, seen] = ladder(asker, newSpendingSettings({ auditShare: 1 }));
    const committed = await l.climb({ ...climb(), commits: (j) => (j.choice === "seal" ? "a tablet to seal" : null) });
    Assert.equal("large", committed.rung);
    Assert.equal("passed up: it commits (a tablet to seal)", seen.routes[0][2]);
    Assert.equal(0, seen.audits);

    const audited = await l.climb(climb());
    Assert.equal("small", audited.rung);
    Assert.equal("seal", audited.json!.choice);
    Assert.equal(1, seen.audits);
    Assert.equal("t1/orders/Egypt/audit", asker.asked[asker.asked.length - 1].key);
    // What the audit found moves the small rung's rate for the kind: it differed, on a decision that moved something.
    Assert.true(l.spending.quality("orders", "small") < 0.75);
  });

  test("A budget spends where a call buys the most: a limit nearly spent leaves decisions to the script, a free model is always taken", async () => {
    const asker = new Asker(() => ({ choice: "x", pass_up: "", ask_counsel: "" }));
    let spent = 0;
    const [l] = ladder(asker, newSpendingSettings({ mode: "limit", limitUsd: 1, auditShare: 0 }), () => spent);
    Assert.true((await l.climb(climb(ModelIds.Haiku, "large"))).rung !== "script");
    spent = 1;
    const out = await l.climb(climb(ModelIds.Haiku, "large"));
    Assert.equal("script", out.rung);
    Assert.null(out.json);
    // A model the table prices at nothing (a local one) makes its rung free.
    const free = new Ladder(asker, new Spending(newSpendingSettings({ mode: "limit", limitUsd: 1, auditShare: 0 }), newGameConfig(), 7, () => 1), new PriceTable({ "local:llama": [0, 0, 0] }), {
      route: () => {},
      audit: () => {},
    });
    Assert.equal("small", (await free.climb({ ...climb("local:llama", "large") })).rung);
  });

  test("A threat to a king's capital is always paid, from the reserve the budget keeps", async () => {
    // Haakon, answering item 6c's review (built in item 7a): with the limit spent but for its reserve, an ordinary decision
    // is left to the script; one on a threat to the capital is still paid, until the whole limit is spent.
    const asker = new Asker(() => ({ choice: "x", pass_up: "", ask_counsel: "" }));
    let spent = 0.95;
    const [l] = ladder(asker, newSpendingSettings({ mode: "limit", limitUsd: 1, auditShare: 0 }), () => spent);
    Assert.equal("script", (await l.climb(climb(ModelIds.Haiku, "large"))).rung);
    const threat = { ...climb(ModelIds.Haiku, "large"), stakes: { kind: "orders", moved: 0.3, capital: true } };
    Assert.true((await l.climb(threat)).rung !== "script");
    spent = 1;
    Assert.equal("script", (await l.climb(threat)).rung);
    // Read from what the king sees: foreign troops within its capital, or beside it when they woke him; not a neighbour's
    // army that has stood beside it since the start (Mitanni's in Terqa, beside Ashur).
    const s = newGame(1);
    s.units.find((u) => u.province === "babylon")!.power = "Assyria";
    Assert.true(ordersStakes(Views.for(s, "Babylonia"), 0).capital);
    Assert.false(ordersStakes(Views.for(newGame(1), "Assyria"), 0).capital);
    const woken = { ...Views.for(newGame(1), "Assyria"), wokenBecause: ["foreign troops came next to your homeland"] };
    Assert.true(ordersStakes(woken, 0).capital);
  });

  test("The pace follows the table's ending settings, never the drawn last season; an open age has no expected end", () => {
    const usual = expectedSeasonsLeft(1, newGameConfig());
    Assert.true(usual! > 35 && usual! < 55);
    Assert.true(expectedSeasonsLeft(40, newGameConfig())! < usual!);
    Assert.null(expectedSeasonsLeft(1, newGameConfig({ openAge: true })));
    const s = new Spending(newSpendingSettings({ mode: "season", seasonUsd: 0.5 }), newGameConfig(), 1, () => 0);
    Assert.equal(0.5, s.paceFor(10));
  });

  test("Routine audiences go to the small rung while a king sleeps; what the engine sees matters goes to his own model", async () => {
    const [runner, api] = build(() => {}, 3, new SimulatedApi(), true);
    await play(runner, 8);
    const routine = api.requests.filter((r) => str(r, "messages", 0, "content").includes("THESE ARE ROUTINE AUDIENCES"));
    Assert.notEmpty(routine);
    Assert.all(routine, (r) => Assert.equal(ModelIds.Haiku, str(r, "model")));
    // A routine answer may not seal, detain or take an envoy into service, and may leave him to fuller deliberation.
    const answer = at(routine[0], "tools", 0, "input_schema", "properties", "answers", "items", "properties") as JsonObject;
    Assert.true(has(answer, "pass_up"));
    Assert.false(has(answer, "seal_tablet"));
    const small = runner.log.decisions.filter((d) => d.by?.rung === "small" && d.key.includes("/host/"));
    Assert.notEmpty(small);
    Assert.all(small, (d) => Assert.equal("routine", d.by!.why));
    // Whatever rung took it, the audience is recorded as the king's own, by his seat.
    Assert.all(small, (d) => Assert.equal("Sonnet 5.5 leader", d.by!.name));
  });

  test("An envoy the small rung passes up is answered by the king's own model, and the log says why", async () => {
    const api = new SimulatedApi();
    api.override = (body) => {
      if (!userOf(body).includes("THESE ARE ROUTINE AUDIENCES")) return null;
      const ids = [...userOf(body).matchAll(/\((c\d+)\), envoy of /g)].map((m) => m[1]);
      const answers = ids.map((envoy) => ({ envoy, speech: "", clauses: [], gift_to_envoy: 0, gift_request: "", send_gold_back: 0, gold_back_purity: 100, end_audience: true, pass_up: "he hints at war" }));
      return JSON.stringify({ answers, ledger: [], ask_counsel: "" });
    };
    const [runner] = build(() => {}, 3, api, true);
    await play(runner, 8);
    const up = runner.log.decisions.filter((d) => d.by?.why === "passed up: he hints at war");
    Assert.notEmpty(up);
    Assert.all(up, (d) => Assert.equal("large", d.by!.rung));
    Assert.all(up, (d) => Assert.equal(ModelIds.Sonnet, d.by!.model));
  });

  test("Light alerts: the small rung reads a sleeping king's news, notes it in his record, and wakes him when it judges so", async () => {
    const api = new SimulatedApi();
    api.override = (body) => (has(props(body), "wake") ? JSON.stringify({ notes: "My envoy is home; the plan holds.", wake: true, pass_up: "", ask_counsel: "" }) : null);
    const [runner] = build(() => {}, 3, api);
    await play(runner, 10);
    // News that goes straight to his own mind (a refused order, a check, an authentication) wakes him with no reader.
    const read = runner.log.decisions.filter((d) => /^t\d+\/alerts\//.test(d.key) && d.by !== null);
    Assert.notEmpty(read);
    Assert.all(read, (d) => Assert.equal("small", d.by!.rung));
    // Woken by what came: the king gives orders that season, told what came and never why it woke him.
    const k = read[0].key.split("/");
    Assert.true(runner.log.has(`${k[0]}/orders/${k[2]}`));
    const orders = api.requests.find((r) => has(props(r), "units") && userOf(r).includes("word came:"));
    Assert.true(orders !== undefined);
    Assert.contains("you noted: My envoy is home; the plan holds.", userOf(orders!));
    Assert.doesNotContain("small", userOf(orders!).split("word came:")[1].split("\n")[0]);
  });

  test("News that goes straight to the king's own mind wakes him with no reader's call", async () => {
    const [runner, api] = build();
    const engine = Object.getPrototypeOf(new TurnEngine(newGame(1, newGameConfig()))) as TurnEngine;
    const orig = engine.lightAlerts;
    // Every alert made weighty: an authentication report, say, that a sealed tablet is forged.
    engine.lightAlerts = function (this: TurnEngine, p: Power) {
      return orig.call(this, p).map((a) => ({ ...a, weighty: true }));
    };
    try {
      await play(runner, 6);
    } finally {
      engine.lightAlerts = orig;
    }
    const woken = runner.log.decisions.filter((d) => /^t\d+\/alerts\//.test(d.key));
    Assert.notEmpty(woken);
    Assert.all(woken, (d) => Assert.null(d.by));
    Assert.empty(api.requests.filter((r) => has(props(r), "wake")));
  });

  test("With the small rung off, the king's own model answers every envoy and reads no alerts, as before", async () => {
    const [runner, api] = build((c) => (c.small = "Off"));
    await play(runner, 8);
    Assert.empty(api.requests.filter((r) => userOf(r).includes("THESE ARE ROUTINE AUDIENCES") || has(props(r), "wake")));
    Assert.empty(runner.log.decisions.filter((d) => d.key.includes("/alerts/")));
  });

  test("Planning: a strong model writes the plan into the king's record from a digest, and he may ask for a new one", async () => {
    const api = new SimulatedApi();
    api.override = (body) => (has(props(body), "plan") ? JSON.stringify({ plan: "Befriend Hatti; take Byblos by year three.", standing_answers: [], cancel_answers: [] }) : null);
    const [runner] = build((c) => (c.planning = "Opus"), 3, api);
    await play(runner, 2);
    const plans = api.requests.filter((r) => has(props(r), "plan"));
    Assert.true(plans.length >= 5);
    Assert.all(plans, (r) => Assert.equal(ModelIds.Opus, str(r, "model")));
    const orders = api.requests.filter((r) => has(props(r), "units"));
    Assert.true(has(props(orders[0]), "new_plan"));
    Assert.contains("YOUR PLAN FOR THE SEASONS AHEAD (set down in turn 1): Befriend Hatti", userOf(orders[0]));
    // Off by default: no plan, and the orders ask nothing of one.
    const [plain, plainApi] = build();
    await play(plain, 1);
    Assert.empty(plainApi.requests.filter((r) => has(props(r), "plan") || has(props(r), "new_plan")));
  });

  test("Characters climb too: what their own model passes up, the rung above answers", async () => {
    const api = new SimulatedApi();
    api.override = (body) => (str(body, "model") === ModelIds.Haiku && has(props(body), "pass_up") && has(props(body), "speech") ? JSON.stringify({ speech: "", keep_gold: 0, swap_inventory: false, as_written: false, pass_up: "too much gold", ask_counsel: "" }) : null);
    const [runner] = build((c) => (c.characters = "Haiku"), 3, api);
    await play(runner, 4);
    const up = runner.log.decisions.filter((d) => d.key.endsWith("/present") && d.by?.rung === "large");
    Assert.notEmpty(up);
    Assert.all(up, (d) => Assert.equal("passed up: too much gold", d.by!.why));
  });

  test("A king the budget cannot pay for waits: his units hold, the script's turn is no fallback, and he is asked again", async () => {
    const [runner] = build((c) => {
      c.small = "Off";
      c.spending = newSpendingSettings({ mode: "limit", limitUsd: 0.000001, auditShare: 0 });
    });
    await play(runner, 3);
    const waited = runner.log.decisions.filter((d) => d.key.includes("/orders/") && d.by?.rung === "script");
    Assert.notEmpty(waited);
    Assert.all(waited, (d) => Assert.equal("script", d.by!.kind));
    Assert.equal(0, runner.fallbacksIn(2).fallen.length);
    // He has not seen the season, so he does not sleep: he is asked again the next one.
    const p = waited[0].key.split("/")[2] as Power;
    Assert.true(runner.log.has(`t${Number(waited[0].key.split("/")[0].slice(1)) + 1}/orders/${p}`));
  });

  test("A game with the ladder replays exactly, rungs and audits in its log", async () => {
    const [runner] = build((c) => {
      c.characters = "Haiku";
      c.spending = newSpendingSettings({ auditShare: 0.5 });
    });
    await play(runner, 6);
    Assert.notEmpty(runner.log.audits);
    const text = runner.log.toJsonl();
    const log = GameLog.fromJsonl(text);
    Assert.equal(runner.log.audits.length, log.audits.length);
    const replay = GameRunner.forReplay(log);
    await replay.prepare();
    for (let i = 0; i < 6 && (await replay.playTurn()); i++) {}
    Assert.equal(hash(GameStateSchema, runner.state), hash(GameStateSchema, replay.state));
    Assert.equal(runner.log.authorOf(log.decisions.find((d) => d.by?.rung === "small")!.key)!.rung, "small");
  });

  test("The table's choices go into the log header and come back with a continued game", () => {
    const c = new SeatChoices();
    c.leaders.set("Egypt", "Sonnet");
    c.small = "Sonnet";
    c.smallFor = { Egypt: "Haiku" };
    c.planning = "Opus";
    c.plays = "small";
    c.spending = newSpendingSettings({ mode: "season", seasonUsd: 0.4 });
    const header = newLogHeader({ seats: new Dict<Power, string>([["Egypt", "Sonnet 5.5 leader"]]), jobs: c.jobs });
    const back = choicesFromHeader(header);
    Assert.equal("Sonnet", back.small);
    Assert.equal("Haiku", back.smallFor.Egypt);
    Assert.equal("Opus", back.planning);
    Assert.equal("small", back.plays);
    Assert.equal(0.4, back.spending.seasonUsd);
    // A game saved before item 6c had no small rung: it goes on as it was played.
    Assert.equal("Off", choicesFromHeader(newLogHeader()).small);
  });

  test("An unpriced model's cost is unknown, never free, and a game with a spending limit does not start until it has a price", () => {
    const c = new SeatChoices();
    c.leaders.set("Egypt", "local:llama3.1");
    c.providers = [{ id: "local", baseUrl: "http://localhost:11434/v1" }];
    Assert.contains("unknown", CostEstimate.describeFor(c));
    Assert.contains("local:llama3.1", startProblem(c, 5) ?? "");
    Assert.null(startProblem(c, 5, true));
    c.prices["local:llama3.1"] = [0, 0, 0];
    Assert.null(startProblem(c, 5));
    Assert.doesNotContain("unknown", CostEstimate.describeFor(c));
  });

  test("The Counsel preset: small models play every mind, large ones plan, advise and take what is passed up", () => {
    const c = new SeatChoices();
    Presets.Counsel.applyTo(c);
    Assert.true(Presets.Counsel.matches(c));
    Assert.equal("small", c.plays);
    Assert.equal("Sonnet", c.planning);
    Assert.false(Presets.Standard.matches(c));
    Presets.Standard.applyTo(c);
    Assert.true(Presets.Standard.matches(c));
    Assert.equal("Off", c.planning);
    // Its estimate is below Standard's, which plays every king on Sonnet.
    const counsel = new SeatChoices();
    Presets.Counsel.applyTo(counsel);
    Assert.true(CostEstimate.perGame(counsel) < CostEstimate.perGame(c));
  });
});
