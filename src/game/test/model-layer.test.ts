import { afterEach, describe, test, vi } from "vitest";
import { AllPowers, type DispatchOrder, GameStateSchema, Views, first, hash, king, newGame, newGameConfig, remember } from "@amarna/engine";
import { GameLog, GameRunner } from "@amarna/game";
import {
  type ApiTransport,
  SdkTransport,
  providersFor,
  type JsonObject,
  ModelIds,
  Parse,
  PriceTable,
  SeatChoices,
  SimulatedApi,
  buildSeats,
  leaderRules,
  selfText,
  situation,
} from "@amarna/llm";
import { at, str, Assert, toDict } from "../../engine/test/support.ts";

describe("ModelLayerTests", () => {
  // The C# tests also ran the official SDK's transport; the TypeScript port has one transport, fetch, in the browser and
  // the batch runner alike, so that test has no counterpart here.
  function build(choices: SeatChoices, seed: number = 3, http: Http[] | null = null): [GameRunner, SimulatedApi] {
    let fake = new SimulatedApi();
    let state = newGame(seed, newGameConfig({ capMin: 3, capMax: 3, endMedian: 10000 }));
    let runner: GameRunner | null = null;
    let transport: ApiTransport = fake;
    if (http !== null) {
      // The real transport, over a fetch that hands the body to the stand-in and keeps the headers.
      vi.stubGlobal("fetch", async (_url: string, init: RequestInit): Promise<Response> => {
        const body = JSON.parse(String(init.body)) as JsonObject;
        http.push({ headers: Object.fromEntries(new Headers(init.headers).entries()), body });
        const r = await fake.send(body);
        const usage = { input_tokens: r.input, output_tokens: r.output, cache_read_input_tokens: r.cacheRead, cache_creation_input_tokens: r.cacheWrite };
        const content = [{ type: "tool_use", id: "toolu_1", name: "reply", input: JSON.parse(r.text) as unknown }];
        return new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", content, stop_reason: r.stopReason, model: r.model, usage }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });
      transport = new SdkTransport("sk-ant-test-0000");
    }
    let set = buildSeats(choices, state, providersFor(choices, transport, {}), () => runner!.log);
    runner = new GameRunner(state, set.seats, set.minds, set.narrator);
    return [runner, fake];
  }

  interface Http {
    headers: Record<string, string>;
    body: JsonObject;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function choices(init: Partial<Pick<SeatChoices, "leaders" | "characters" | "narrator">>): SeatChoices {
    return Object.assign(new SeatChoices(), init);
  }

  function allModels(): SeatChoices {
    return choices({
      leaders: toDict(
        AllPowers,
        (p) => p,
        (p) => (p === "Egypt" ? "Opus" : "Sonnet"),
      ),
      characters: "Haiku",
      narrator: "Sonnet",
    });
  }

  const has = (o: unknown, k: string): boolean => typeof o === "object" && o !== null && k in o;

  test("Requests carry the key the browser header caching schema and fallbacks", async () => {
    // Hatti stays a script bot so that envoys are on the road (the fake leaders send none).
    let picked = allModels();
    picked.leaders.set("Hatti", "Script");
    let http: Http[] = [];
    let [runner] = build(picked, 3, http);
    for (let i = 0; i < 4 && !runner.state.ended; i++) await runner.playTurn();

    Assert.notEmpty(http);
    for (const { headers, body } of http) {
      Assert.equal("sk-ant-test-0000", headers["x-api-key"]);
      Assert.equal("true", headers["anthropic-dangerous-direct-browser-access"]);
      // The schema goes as the one reply tool, not strict, so no grammar is compiled; the model is asked to call it.
      Assert.equal("reply", str(body, "tools", 0, "name"));
      Assert.equal("object", str(body, "tools", 0, "input_schema", "type"));
      Assert.true(at(body, "tools", 0, "strict") === undefined);
      Assert.equal("auto", str(body, "tool_choice", "type"));
      Assert.equal("ephemeral", str(body, "system", 0, "cache_control", "type"));
    }

    let leader = first(http, (r) => str(r.body, "model") === ModelIds.Sonnet && has(at(r.body, "tools", 0, "input_schema", "properties"), "units"));
    Assert.contains("server-side-fallback-2026-07-01", leader.headers["anthropic-beta"] ?? "");
    Assert.equal("default", str(leader.body, "fallbacks"));
    Assert.contains(http, (r) => str(r.body, "model") === ModelIds.Opus);
    Assert.contains(http, (r) => str(r.body, "model") === ModelIds.Haiku);

    let haiku = http.filter((r) => str(r.body, "model") === ModelIds.Haiku);
    Assert.all(haiku, (r) => Assert.true(at(r.body, "fallbacks") === undefined));
  });

  test("Calls are logged with cost and the game replays without the api", async () => {
    let [runner] = build(allModels());
    await runner.prepare();
    while (await runner.playTurn()) {}
    Assert.true(runner.state.ended);
    Assert.notEmpty(runner.log.calls);
    Assert.true(runner.log.totalCost > 0);
    Assert.all(runner.log.calls, (c) => Assert.null(c.error));
    Assert.equal(7, runner.chronicles.size);

    let replay = GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl()));
    await replay.prepare();
    while (await replay.playTurn()) {}
    Assert.equal(hash(GameStateSchema, runner.state), hash(GameStateSchema, replay.state));
  });

  test("Unreadable output is retried once then falls back to the script", async () => {
    let picked = choices({
      leaders: toDict(
        AllPowers,
        (p) => p,
        (p) => (p === "Hatti" ? "Sonnet" : "Script"),
      ),
    });
    let [runner, fake] = build(picked);
    let calls = 0;
    fake.override = (_body) => {
      ++calls;
      return "this is not json";
    };
    await runner.playTurn();
    Assert.equal(2, calls);
    Assert.contains(runner.errors, (e) => e.includes("orders/Hatti"));

    // Second attempt succeeds: no fallback.
    let [runner2, fake2] = build(picked);
    let n = 0;
    fake2.override = (_body) => (++n === 1 ? "{oops" : null);
    await runner2.playTurn();
    Assert.empty(runner2.errors);
    Assert.contains("could not be used", JSON.stringify(at(fake2.requests[1], "messages", 0, "content")));
  });

  test("A refusal falls back to the script decision", async () => {
    let picked = choices({
      leaders: toDict(
        AllPowers,
        (p) => p,
        (p) => (p === "Hatti" ? "Sonnet" : "Script"),
      ),
    });
    let [runner, fake] = build(picked);
    fake.refuse = true;
    await runner.playTurn();
    Assert.contains(runner.errors, (e) => e.includes("declined"));
    Assert.contains(runner.log.calls, (c) => c.error === "refusal");
  });

  test("A characters prompt holds only its own secrets", () => {
    let state = newGame(11);
    for (const c of state.characters) {
      let self = selfText(c, 1);
      for (const other of state.characters.filter((o) => o.id !== c.id))
        for (const f of other.facts.filter((f) => f.secrecy !== "Public" && !c.facts.some((x) => x.text === f.text))) Assert.doesNotContain(f.text, self);
      for (const f of c.facts) Assert.contains(f.text, self);
    }
  });

  test("A spy writing a report of an earlier season remembers nothing since", () => {
    let c = newGame(11).characters[0];
    remember(c, 3, "I watched the court of Hatti and saw its armies.");
    remember(c, 4, "I was caught spying in Hatti. I told them I serve Egypt.");
    let then = selfText(c, 5, 3);
    Assert.contains("I watched the court of Hatti", then);
    Assert.doesNotContain("I was caught", then);
    Assert.contains("I was caught", selfText(c, 5));
  });

  test("Envoy requests never mention other characters hidden facts", async () => {
    let picked = choices({ characters: "Haiku" });
    let [runner, fake] = build(picked, 4);
    for (let i = 0; i < 6 && !runner.state.ended; i++) await runner.playTurn();
    let haiku = fake.requests.filter((r) => str(r, "model") === ModelIds.Haiku);
    Assert.notEmpty(haiku);
    for (const body of haiku) {
      let text = JSON.stringify(body);
      let selfName = str(body, "system", 1, "text");
      let self = first(runner.state.characters, (c) => selfName.includes(c.persona.slice(0, Math.min(40, c.persona.length))));
      for (const other of runner.state.characters.filter((o) => o.id !== self.id))
        for (const f of other.facts.filter((f) => f.secrecy === "Deep" && !self.facts.some((x) => x.text === f.text)))
          Assert.doesNotContain(JSON.stringify(f.text).slice(1, -1), text);
    }
  });

  test("Haiku summarizes only the characters own memories", async () => {
    let [runner, fake] = build(choices({ characters: "Haiku" }));
    let c = runner.state.characters[3];
    let other = runner.state.characters[4];
    for (let i = 1; i <= 13; i++) remember(c, 0, `zq-own-memory-${i}`);
    remember(other, 0, "zq-someone-elses-memory");
    await runner.playTurn();

    // An audit (one decision in twenty, put out of play to the rung above) may ask Sonnet the same: only Haiku's counts.
    let calls = fake.requests.filter((r) => has(at(r, "tools", 0, "input_schema", "properties"), "summary") && str(r, "model") === ModelIds.Haiku);
    let mine = Assert.single(calls);
    Assert.equal(ModelIds.Haiku, str(mine, "model"));
    let text = JSON.stringify(mine);
    Assert.contains("zq-own-memory-1", text);
    Assert.doesNotContain("zq-someone-elses-memory", text);
    Assert.equal("I have carried many messages and kept my own counsel.", c.memorySummary);
    Assert.true(c.memory.length <= runner.state.config.memoryKeep / 2 + 2);
  });

  test("Leader output becomes ordinary orders", () => {
    let json = JSON.parse(
      `{
  "notes": "n",
  "units": [ { "unit": "memphis", "order": "move", "target": "Sinai", "to": "" },
             { "unit": "delta", "order": "support", "target": "memphis", "to": "sinai" } ],
  "letters": [ { "envoy": "c3", "to": "Hatti", "message": "Peace.", "mandate": "peace", "gold": 50, "purity": 70,
                 "call_brother": false, "call_them_great_king": true, "claim_great_king": true, "your_name_first": true,
                 "omit_greeting": false, "tablet_to_seal": "Peace forever.", "sworn_alliance": true, "show_tablet_copies": [] } ],
  "other_orders": [ { "action": "raise_army", "province": "thebes", "power": "", "person": "", "amount": 0, "text": "", "item": "", "seals": [] },
                    { "action": "place_spy", "province": "", "power": "Mitanni", "person": "c4", "amount": 0, "text": "", "item": "", "seals": [] },
                    { "action": "forge", "province": "", "power": "", "person": "c4", "amount": 0, "text": "x", "item": "", "seals": ["Hatti","Assyria"] } ]
}`,
    ) as JsonObject;
    let sub = Parse.orders(json);
    Assert.contains(sub.orders, (o) => o.type === "move" && o.unit === "memphis" && o.to === "sinai");
    Assert.contains(sub.orders, (o) => o.type === "support" && o.unit === "delta" && o.supported === "memphis" && o.to === "sinai");
    let d = Assert.single(sub.orders.filter((o): o is DispatchOrder => o.type === "dispatch"));
    Assert.equal("Hatti", d.to);
    Assert.equal(70, d.purityPercent);
    Assert.false(d.greeting!.callBrother);
    Assert.true(d.greeting!.senderFirst);
    Assert.true(d.proposal!.allianceOath);
    Assert.contains(sub.orders, (o) => o.type === "raise" && o.province === "thebes" && o.kind === "Army");
    Assert.contains(sub.orders, (o) => o.type === "spy" && o.character === "c4" && o.court === "Mitanni");
    Assert.contains(sub.orders, (o) => o.type === "forge" && o.seals.join() === "Hatti,Assyria");
  });

  test("Prompts render without errors and rules are cache stable", () => {
    let state = newGame(2);
    let view = Views.for(state, "Babylonia");
    let text = situation(view);
    Assert.contains("TREASURY", text);
    Assert.contains("Babylonia (you)", text);
    Assert.same(leaderRules(true, state.config), leaderRules(true, state.config));
    Assert.contains("CUSTOMS OF THE AGE", leaderRules(true, state.config));
    Assert.doesNotContain("CUSTOMS OF THE AGE", leaderRules(false, state.config));
    Assert.contains("Any season may be the last, from the first.", leaderRules(false, state.config));
  });

  test("The customs primer carries five echoes from the archive", () => {
    let config = newGameConfig();
    let rules = leaderRules(true, config);
    // Rank in the greeting: the existing line, extended rather than repeated.
    Assert.contains(
      'Between Great Kings, "brother" claims equal rank, and withholding it is a slight: when the king of Assyria, after a modest first letter, began writing to the pharaoh as a brother',
      rules,
    );
    Assert.contains("Writing your own name above the recipient's reads as an insult", rules);
    Assert.equal(1, rules.split("seven times and seven times").length - 1);
    Assert.equal(1, rules.split("claims equal rank").length - 1);
    Assert.contains(
      "- Detention answers detention: Tushratta kept the pharaoh's envoy Mane at his court until his own messengers, held in Egypt, were let go.",
      rules,
    );
    Assert.contains(
      "- A messenger's word is not a tablet. The king of Arzawa would not trust what the pharaoh's messenger told him until a tablet said the same.",
      rules,
    );
    Assert.contains("- Proof needs a witness who knows.", rules);
    Assert.contains("send someone who could recognise her", rules);
    Assert.contains("- Precedent is a floor. A king asks for more than was given to his father, so anything less reads as a demotion.", rules);
    Assert.contains("Akhenaten sent statues of gilded wood where his father had promised solid gold", rules);
    // Knowledge only: none of it reaches a game played without the primer.
    let plain = leaderRules(false, config);
    for (const echo of ["Mane", "Arzawa would not trust", "recognise her", "Precedent is a floor", "reads as an insult"]) Assert.doesNotContain(echo, plain);
  });

  test("Pricing matches the published rates", () => {
    let prices = new PriceTable();
    Assert.equal(2.0 + 10.0, prices.cost(ModelIds.Sonnet, 1_000_000, 1_000_000, 0, 0), 6);
    Assert.equal(0.2, prices.cost(ModelIds.Opus, 0, 0, 1_000_000, 0), 6);
    Assert.equal(0.125, prices.cost(ModelIds.Haiku, 0, 0, 0, 1_000_000), 6);
  });
});
