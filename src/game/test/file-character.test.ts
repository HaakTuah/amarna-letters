import { describe, test } from "vitest";
import { host } from "../src/bots/statecraft-letters.ts";
import {
  AllPowers,
  type Character,
  Dict,
  type GameState,
  GameStateSchema,
  HSet,
  type HomeCargo,
  type MessageTrail,
  SealedOutcome,
  char,
  first,
  hash,
  isBlank,
  king,
  newCharacter,
  newDispatch,
  newExchange,
  newFact,
  newGame,
  newGameConfig,
  newHomeCargo,
  newHostReply,
  newMessageTrail,
  newMindRequest,
  newSpyReport,
  newTraits,
} from "@amarna/engine";
import {
  CharacterChecks,
  GameLog,
  GameRunner,
  type MindContext,
  ScriptLeader,
  ScriptMind,
  type ShadowDecision,
  TemplateNarrator,
  callSizes,
  characterReport,
  newEnvoyContext,
  newMindContext,
  newModelCall,
} from "@amarna/game";
import { type CallSpec, Footer, Heading, type JsonAsker, type JsonObject, LlmCharacterMind, ModelIds, safeName } from "@amarna/llm";
import { FileCharacters } from "@amarna/llm/node";
import { Assert, orderBy, toDict } from "../../engine/test/support.ts";
import { File, Directory, Path, SearchOption, delay } from "./io.ts";

// File characters (envoys, spies and candidates answered through files, as file seats are for kings), the script shadow
// logged beside each of a model character's decisions, and the checks and reports that compare the two.
describe("FileCharacterTests", () => {
  const Seed: number = 8;

  // <summary>Answers every request in every character folder under a root, until stopped: the stand-in for character agents.</summary>
  async function answer(root: string, reply: (a0: string, a1: string) => string | null, ct: AbortSignal): Promise<void> {
    let answered = new HSet<string>();
    while (!ct.aborted) {
      for (const request of Directory.getFiles(root, "*.request.md", SearchOption.allDirectories)) {
        if (!answered.add(request)) continue;
        let stem = Path.getFileName(request).slice(0, -".request.md".length);
        let text = await File.readAllText(request);
        const json = reply(stem, text);
        if (json !== null && json !== undefined) await File.writeAllText(Path.combine(Path.getDirectoryName(request)!, stem + ".reply.json"), json);
      }
      try {
        await delay(40, ct);
      } catch {}
    }
  }

  // <summary>A plain reply for each kind of character request, with the given words.</summary>
  function plainOf(stem: string, words: string, keep: number = 0, gift: boolean = false): string {
    if (stem.includes("_aud_present_")) return `{"speech":"${words}","keep_gold":${keep},"swap_inventory":false}`;
    if (stem.includes("_aud_react_")) return `{"speech":"${words}","accept_gift":${gift ? "true" : "false"},"accept_service":false,"commitments":""}`;
    if (stem.includes("_report_")) return `{"report":"${words}","keep_gold":0,"swap_inventory":false}`;
    if (stem.includes("_pitch_")) return `{"pitch":"${words}","asking_price":14}`;
    if (stem.includes("_spy_")) return `{"report":"${words}"}`;
    return `{"summary":"${words}"}`;
  }

  function game(turns: number = 2, timeoutSeconds: number = 30): [GameRunner, string] {
    let root = Directory.createTempSubdirectory("amarna-filechars-").fullName;
    let state = newGame(Seed, newGameConfig({ catastropheChance: 0, maxTurns: turns }));
    let folders = toDict(
      state.characters,
      (c) => c.id,
      (c) => Path.combine(root, c.id),
    );
    let runner: GameRunner | null = null;
    let minds = FileCharacters.mind(
      new Map(folders),
      timeoutSeconds * 1000,
      (call) => runner!.log.addCall(call),
      (s) => runner!.log.addShadow(s),
    );
    let bot = new ScriptLeader(Seed);
    runner = Object.assign(
      new GameRunner(
        state,
        toDict(
          AllPowers,
          (p) => p,
          (_) => bot,
        ),
        minds,
        new TemplateNarrator(),
      ),
      { writeChronicles: false },
    );
    return [runner, root];
  }

  test("A file character writes what a model character sees and plays the reply", async () => {
    let [runner, root] = game(3);
    const stop = new AbortController();
    let seen = new Dict<string, string>();
    let answering = answer(
      root,
      (stem, text) => {
        seen.set(stem, text);
        return plainOf(stem, "zq-words of " + stem);
      },
      stop.signal,
    );
    while (await runner.playTurn()) {}
    stop.abort();
    await answering;

    Assert.empty(runner.errors);
    let [stem, request] = first(
      orderBy(
        [...seen.entries()].filter((x) => x[0].includes("_aud_present_")),
        (x) => x[0],
      ),
    );
    let turn = stem.slice(1, stem.indexOf("_"));
    let id = stem.slice(stem.lastIndexOf("_") + 1);
    let key = `t${turn}/aud/present/${id}`;
    let c = char(runner.state, id);
    // The model character's own request: the shared system text, its persona and memory, the audience, the schema, and the
    // footer only file seats and file characters get.
    // Its heading names no key: the season as an id and its own id stay out of what it reads (the key is the file's name).
    Assert.startsWith(Heading, request.replace(/^\ufeff/, ""));
    Assert.doesNotContain(key, request);
    Assert.contains("Decide as yourself, then write your answer", request);
    Assert.contains("You are one of the people of the Amarna age", request);
    Assert.contains(c.name, request);
    Assert.contains("Speak to the king now.", request);
    Assert.contains('"keep_gold"', request);
    Assert.contains(`${stem}.reply.json`, request);
    Assert.endsWith(Footer, request.trimEnd());
    Assert.doesNotContain("Decide as the king", request);
    // What it said is what the host heard.
    Assert.contains(runner.state.trails, (t) => t.envoyId === id && t.delivered === "zq-words of " + stem);
    // Every exchange is logged with its request's size, and every decision beside the script's for the same situation.
    let call = Assert.single(runner.log.calls, (x) => x.key === key);
    Assert.equal(["file seat", request.length], [call.model, call.requestChars]);
    Assert.equal(runner.log.calls.length, runner.log.shadows.length);
    let shadow = Assert.single(runner.log.shadows, (x) => x.key === key);
    Assert.equal(["present", c.name], [shadow.kind, shadow.name]);
    Assert.equal("zq-words of " + stem, shadow.model!.text);
    Assert.startsWith("Great King, I bring the words of", shadow.script.text);
    Assert.contains(runner.log.shadows, (x) => x.kind === "report");
    Assert.startsWith(`${c.traits.loyalty}/${c.traits.greed}/${c.traits.competence}/${c.traits.ambition}/${c.traits.courage}`, shadow.traits);
  });

  test("A missing or unreadable reply falls back to the script and the game replays without the files", async () => {
    let [runner, root] = game(undefined, 2);
    const stop = new AbortController();
    let silent = null;
    let answering = answer(
      root,
      (stem, _) => {
        // Every speech abroad is unreadable twice; the first audience reply never comes.
        if (stem.includes("_aud_present_")) return stem.endsWith(".retry") ? "{ broken" : "not json";
        if (stem.includes("_aud_react_") && (silent ??= stem) === stem) return null;
        return plainOf(stem, "zq");
      },
      stop.signal,
    );
    while (await runner.playTurn()) {}
    stop.abort();
    await answering;

    Assert.contains(runner.errors, (e) => e.includes("/present:"));
    Assert.contains(runner.errors, (e) => e.includes("no reply"));
    // The script stood in, and the shadow line says so: no decision of the character's own, the script's, and why.
    let failed = runner.log.shadows.filter((s) => s.model === null);
    Assert.notEmpty(failed);
    Assert.all(failed, (s) => Assert.false(isBlank(s.error)));
    Assert.contains(runner.log.calls, (c) => c.error !== null && c.key.includes("/aud/present/"));
    // What the script said in its place is what the host heard.
    let present = first(failed, (s) => s.kind === "present");
    Assert.contains(runner.state.trails, (t) => t.envoyId === present.character && t.delivered === present.script.text);

    Directory.delete(root, true);
    let replay = GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl()));
    replay.writeChronicles = false;
    while (await replay.playTurn()) {}
    Assert.equal(hash(GameStateSchema, runner.state), hash(GameStateSchema, replay.state));
  });

  // <summary>Answers at once, the same way every time, without files.</summary>
  class Fixed implements JsonAsker {
    askJson(spec: CallSpec, ct: AbortSignal): Promise<JsonObject> {
      let stem = safeName(spec.key);
      return Promise.resolve(JSON.parse(plainOf(stem, "Fixed words for " + spec.key, 5, true))!);
    }
  }

  async function play(shadow: boolean): Promise<[GameState, GameLog]> {
    let state = newGame(Seed, newGameConfig({ catastropheChance: 0, maxTurns: 4 }));
    let runner: GameRunner | null = null;
    let minds = Object.assign(new LlmCharacterMind(new Fixed(), ModelIds.Haiku), { shadow: shadow ? (s: ShadowDecision) => runner!.log.addShadow(s) : null });
    let bot = new ScriptLeader(Seed);
    runner = Object.assign(
      new GameRunner(
        state,
        toDict(
          AllPowers,
          (p) => p,
          (_) => bot,
        ),
        minds,
        new TemplateNarrator(),
      ),
      { writeChronicles: false },
    );
    while (await runner.playTurn()) {}
    return [runner.state, runner.log];
  }

  test("The script shadow changes nothing in the game", async () => {
    let plain = await play(false);
    let shadowed = await play(true);
    Assert.empty(plain[1].shadows);
    Assert.notEmpty(shadowed[1].shadows);
    Assert.equal(hash(GameStateSchema, plain[0]), hash(GameStateSchema, shadowed[0]));
    // The same decisions, made the same way: the shadows only sit beside them.
    Assert.equal(
      orderBy(plain[1].decisions, (d) => d.key),
      orderBy(shadowed[1].decisions, (d) => d.key),
    );
    Assert.contains(shadowed[1].shadows, (s) => s.kind === "present" && s.goldCarried > 0 && s.model!.kept === 5);

    // And they survive the log: written in a stable order, read back whole.
    let back = GameLog.fromJsonl(shadowed[1].toJsonl());
    Assert.equal(shadowed[1].shadows.length, back.shadows.length);
    Assert.equal(back.toJsonl(), GameLog.fromJsonl(back.toJsonl()).toJsonl());
    let report = characterReport(back);
    Assert.contains("each beside the script's with the same traits", report);
    Assert.contains("kept some of the gold", report);
  });

  function envoyOf(): Character {
    return newCharacter({
      id: "c1",
      name: "Keliya",
      origin: "Mitanni",
      calling: "scribe",
      status: "Employed",
      employer: "Egypt",
      traits: newTraits({ loyalty: 30, greed: 80, competence: 70, ambition: 30, courage: 60 }),
    });
  }

  function home(trail: MessageTrail, cargo: HomeCargo | null = null): MindContext {
    return newMindContext({
      request: newMindRequest({ task: "EnvoyReport", characterId: "c1", court: "Egypt", cargo: cargo ?? newHomeCargo() }),
      self: envoyOf(),
      turn: 3,
      seed: 1,
      trail: trail,
    });
  }

  function trailOf(host: string, ...outcomes: string[]): MessageTrail {
    return newMessageTrail({
      id: "m1",
      turn: 1,
      from: "Egypt",
      to: "Hatti",
      exchanges: [newExchange({ host: host, envoy: "I will carry your words." })],
      outcomes: outcomes,
    });
  }

  test.each([
    ["My lord, the king of Hatti wishes you long life.", "hid-gift"],
    ["My lord, the king of Hatti pressed a gift of 40 shekels on me, and I took it.", null],
    ["He gave me 40 shekels, which I accepted.", null],
    ["I bring the gifts the king sent you.", "hid-gift"],
  ] as const)("A report that says nothing of a gift it took hides it %s", (report: string, flag: string | null) => {
    let flags = CharacterChecks.report(home(trailOf("Go in peace.", "accepted 40 shekels from Hatti")), report);
    if (flag === null) Assert.doesNotContain("hid-gift", flags);
    else Assert.contains(flag, flags);
  });

  test("The checks find what a report hides or contradicts", () => {
    let threat = trailOf(
      "If his troops cross the river again, I will burn his cities. Go home.",
      "detained by Hatti",
      "kept 20 shekels of the gold",
      "declined an offer of service from Hatti",
    );
    let hiding = CharacterChecks.report(home(threat, newHomeCargo({ wasDetained: true })), "My lord, all is well. The king sealed the tablet, and loves you.");
    Assert.equal(["hid-detention", "hid-skim", "softened-threat", "hid-offer", "false-seal"], hiding);

    let honest = CharacterChecks.report(
      home(threat, newHomeCargo({ wasDetained: true })),
      'My lord, they held me against my will. The king said: "If his troops cross the river again, I will burn his cities." ' +
        "I kept 20 shekels of your gold for myself. He offered me a place in his service, which I refused. He did not seal the tablet.",
    );
    Assert.empty(honest);

    let sealedTrail = trailOf("Go in peace.", "the tablet was sealed by both kings");
    Assert.empty(CharacterChecks.report(home(sealedTrail), "He sealed the tablet, and I bring your copy."));
    Assert.contains("the tablet was sealed by both kings", CharacterChecks.known(home(sealedTrail)));
  });

  test("A script envoy bribed by the host is found hiding the gift and the threat", async () => {
    let envoy = envoyOf();
    envoy.facts.push(newFact({ id: "f1", text: "Took 40 shekels from the king of Hatti.", secrecy: "Hidden", tag: "bribe", knownBy: ["Hatti"] }));
    let ctx = home(trailOf("If his troops cross the river again, I will burn his cities.", "accepted 40 shekels from Hatti"));
    ctx = newMindContext({ request: ctx.request, self: envoy, turn: ctx.turn, seed: ctx.seed, trail: ctx.trail });
    let report = (await new ScriptMind().write(ctx)).text;
    Assert.equal(["hid-gift", "softened-threat"], CharacterChecks.report(ctx, report));
  });

  test("A speech abroad that drops the letter s threat to the host softens it", () => {
    let ctx = newEnvoyContext({
      self: envoyOf(),
      sender: "Egypt",
      host: "Hatti",
      turn: 2,
      seed: 1,
      dispatch: newDispatch({ letter: "I send you greetings. If you do not withdraw from Carchemish, there will be war." }),
    });
    Assert.equal(["softened-threat"], CharacterChecks.present(ctx, "My lord sends his love and hopes for peace."));
    Assert.empty(CharacterChecks.present(ctx, "My lord says: if you do not withdraw from Carchemish, there will be war."));
  });

  test("A spy s report is checked for its masters words and what it left out", () => {
    let ctx = newMindContext({
      request: newMindRequest({
        task: "SpyReport",
        characterId: "c1",
        court: "Egypt",
        report: newSpyReport({
          court: "Hatti",
          observedTurn: 2,
          poison: "Hatti will march on Mitanni in the spring with every chariot.",
          observations: ["Hatti holds 3 armies in Carchemish.", "The king of Hatti received an envoy of Babylonia."],
        }),
      }),
      self: envoyOf(),
      turn: 3,
      seed: 1,
    });
    let [flags, dropped] = CharacterChecks.spy(ctx, "Hatti will march on Mitanni in the spring with every chariot. Three armies wait in Carchemish.");
    Assert.equal(["passed-poison", "dropped-observations"], flags);
    Assert.equal(1, dropped);
    Assert.empty(CharacterChecks.spy(ctx, "Hatti holds 3 armies in Carchemish, and its king received an envoy of Babylonia.")[0]);
  });

  test("Calls are counted by kind with their request sizes", () => {
    let log = new GameLog();
    log.addCall(newModelCall({ key: "t1/orders/Egypt", role: "leader:Egypt", requestChars: 36000 }));
    log.addCall(newModelCall({ key: "t2/orders/Egypt", role: "leader:Egypt", requestChars: 54000 }));
    log.addCall(newModelCall({ key: "t1/aud/a3/host/1", role: "host:Hatti", inputTokens: 1000, cacheReadTokens: 9000 }));
    log.addCall(newModelCall({ key: "t1/aud/present/c5", role: "envoy:c5", requestChars: 3600 }));
    log.addCall(newModelCall({ key: "t1/memory/c5", role: "memory:c5", requestChars: 1800 }));
    let sizes = callSizes(log).split("\n");
    Assert.contains(sizes, (l) => l.startsWith("  king: orders") && l.includes("45000") && l.includes("54000") && l.endsWith("12500"));
    Assert.contains(sizes, (l) => l.startsWith("  king: audience") && l.endsWith("10000"));
    Assert.contains(sizes, (l) => l.startsWith("  character: speech") && l.endsWith("1000"));
    Assert.contains(sizes, (l) => l.startsWith("  character: memory") && l.endsWith("500"));
  });

  // A script envoy says the king sealed only when the engine recorded the sealing, not when its own (or, in the shadow,
  // the model's) commitments or a gift's request speak of sealing: 11 false seal claims in the second agent simulation.
  test.each([
    [false, "the envoy committed: Nothing sealed"],
    [false, "the envoy committed: No new tablet sealed; the peace stands as sealed in turn two"],
    [false, "accepted 10 shekels from Hatti (asked: Tell your lord the tablet is as good as sealed)"],
    [true, SealedOutcome],
  ] as const)("A script envoy claims a seal only when the tablet was sealed %s", async (sealedHere: boolean, outcome: string) => {
    let ctx = home(trailOf("Go in peace.", outcome));
    let report = (await new ScriptMind().write(ctx)).text;
    Assert.equal(sealedHere, report.includes("He sealed the tablet, and I bring your copy."));
    Assert.doesNotContain("false-seal", CharacterChecks.report(ctx, report));
  });

  // <summary>Answers every character request as a model would: speeches and reports with no word of gold or gifts.</summary>
  class ModelAsker implements JsonAsker {
    readonly #takes: boolean;
    readonly #keep: number;
    constructor(takes: boolean, keep: number) {
      this.#takes = takes;
      this.#keep = keep;
    }
    askJson(spec: CallSpec, ct: AbortSignal): Promise<JsonObject> {
      let stem = safeName(spec.key);
      return Promise.resolve(JSON.parse(plainOf(stem, "May all go well with my lord.", this.#keep, this.#takes))!);
    }
  }

  // One mission of a model envoy with the script's shadow: it carries 40 shekels out (the model keeps ),
  // is offered a gift of 20 (the model takes it or not), and reports home on what the engine recorded of the model's choices.
  // Returns the shadow of the report.
  async function mission(envoy: Character, takes: boolean, keep: number): Promise<ShadowDecision> {
    let shadows: ShadowDecision[] = [];
    let mind = Object.assign(new LlmCharacterMind(new ModelAsker(takes, keep)), { shadow: (d: ShadowDecision) => void shadows.push(d) });
    let abroad = newEnvoyContext({
      self: envoy,
      sender: "Egypt",
      host: "Hatti",
      dispatch: newDispatch({ letter: "Greetings, brother.", gold: 40 }),
      turn: 2,
      seed: 1,
      forgeMinCompetence: 55,
    });
    await mind.present(abroad);
    let offer = newHostReply({ speech: "Take this for your trouble.", bribe: 20, bribeAsk: "Tell your lord that my armies are few." });
    let reaction = await mind.react(
      newEnvoyContext({ self: envoy, sender: "Egypt", host: "Hatti", dispatch: abroad.dispatch, turn: 2, seed: 1, round: 1, maxRounds: 2 }),
      offer,
    );

    // What the engine records of the model's choices.
    let outcomes: string[] = [];
    if (keep > 0) outcomes.push(`kept ${keep} shekels of the gold`);
    if (reaction.acceptBribe) {
      outcomes.push("accepted 20 shekels from Hatti (asked: Tell your lord that my armies are few.)");
      envoy.facts.push(newFact({ id: "f9", text: "Took 20 shekels from the king of Hatti.", secrecy: "Hidden", tag: "bribe", knownBy: ["Hatti"] }));
    } else outcomes.push("refused a gift of 20 shekels from Hatti");
    let trail = trailOf("Take this for your trouble.", ...outcomes);
    [trail.audienceTurn, trail.goldStated] = [2, 40];
    let facts = envoy.facts.length;
    await mind.write(
      newMindContext({
        request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo() }),
        self: envoy,
        turn: 3,
        seed: 1,
        trail: trail,
        forgeMinCompetence: 55,
      }),
    );
    // The shadow wrote in a situation of its own, and changed nothing the engine holds.
    Assert.equal(facts, envoy.facts.length);
    Assert.equal(outcomes, trail.outcomes);
    return Assert.single(shadows, (s) => s.kind === "report");
  }

  test("The shadow reports on what the script did at the audience not on what the model did", async () => {
    // A loyal envoy: the model kept 5 shekels and took the gift; the script would have done neither.
    let loyal = envoyOf();
    [loyal.traits.loyalty, loyal.traits.greed] = [80, 30];
    let shadow = await mission(loyal, true, 5);
    Assert.equal(["hid-gift", "hid-skim"], shadow.model!.flags);
    Assert.empty(shadow.script.flags);
    Assert.doesNotContain("true friend", shadow.script.text);

    // A greedy, disloyal one: the model kept nothing and refused; the script keeps 6 of the 40 shekels, takes the gift
    // and hides both, and passes on what the host asked for it.
    let greedy = envoyOf();
    [greedy.traits.loyalty, greedy.traits.greed] = [20, 90];
    shadow = await mission(greedy, false, 0);
    Assert.empty(shadow.model!.flags);
    Assert.equal(["hid-gift", "hid-skim"], shadow.script.flags);
    Assert.contains("The king of Hatti is a true friend to you", shadow.script.text);
    Assert.contains('the king told me "My armies are few"', shadow.script.text);
  });
});
