import { describe, test } from "vitest";
import {
  AllPowers,
  GameStateSchema,
  EnvoyReactionSchema,
  HostReplySchema,
  MindReplySchema,
  S,
  TurnSubmissionSchema,
  claimName,
  dispatch,
  first,
  newGame,
  newGameConfig,
  newHostReply,
  newLifeChoice,
  newMindReply,
  newTurnSubmission,
  serialize,
  type AudienceView,
  type HostReply,
  type ObjSchema,
  type Schema,
  type SeatView,
  type TurnSubmission,
} from "@amarna/engine";
import {
  AuditSchema,
  AuthorshipSchema,
  BlankMark,
  CharacterChoiceSchema,
  Everything,
  ExportFields,
  GameLog,
  GameRunner,
  LogHeaderSchema,
  ModelCallSchema,
  PresentResultSchema,
  ScriptMind,
  MindPageSchema,
  ShadowDecisionSchema,
  TemplateNarrator,
  WordFields,
  exportJsonl,
  realNames,
  type ExportParts,
  failing,
  failureOf,
  newAudit,
  newAuthorship,
  newCharacterChoice,
  newModelCall,
  newShadowDecision,
  type ISeat,
  type ModelCall,
} from "@amarna/game";
import { ApiStatusError, ModelRefusedError, ReplyError, converse, type CallSpec } from "@amarna/llm";
import { Assert, toDict } from "../../engine/test/support.ts";

// One export, with filters (Engine and models, "Logging and replay"): what is sensitive is kept out by design, never
// scrubbed (a failure is logged as its kind; the export gives only listed fields); by default it holds everything;
// filters leave parts out, and one blanks a human player's words, still replaying.
describe("ExportTests", () => {
  /**
   * What providers, the bridge and the file system say when they fail, holding what must never be recorded. Every key and
   * id is built here from pieces and every name invented, so nothing in this file is real or looks like a real key.
   */
  const fakeKey = "sk-" + "ant-" + "api03-" + "x".repeat(40);
  const fakeRequestId = "req_" + "0".repeat(24);
  const Said = [
    `no reply in /home/jdoe/seats/egypt/t3.reply.json after 30 minutes`,
    `Anthropic API 429: {"request_id":"${fakeRequestId}"}`,
    `Incorrect API key provided: ${fakeKey}`,
    `no local bridge answers at http://localhost:5190/?auth=TOKEN123: fetch failed`,
    // The spellings the scrubbing rounds of #385 kept finding: kept here, since none of them may ever be recorded.
    `ENOENT: open '/Users/Jane Q "Doe"/Saved Games/amarna/t3.reply.json'`,
    `account owner jöran@exämple.org is over its limit`,
    `400: [{"error":{"detail":"{\\"key\\":\\"${fakeKey}\\"}"}}]`,
    `Error: ["org_00000000", {"request_id": "${fakeRequestId}"}]`,
  ];
  const Secrets = ["/home/jdoe", fakeRequestId, fakeKey, "TOKEN123", "localhost:5190", "Jane Q", "Saved Games", "jöran", "exämple", "org_00000000"];

  test("A failure is logged as its kind and code, never its message", () => {
    const [path, request, key, bridge] = Said;
    Assert.equal("rate limited (429)", failureOf(new ApiStatusError(request, 429)));
    Assert.equal("refused (401)", failureOf(new ApiStatusError(key, 401)));
    Assert.equal("unreachable", failureOf(new ApiStatusError(bridge, 0)));
    Assert.equal("provider error (500)", failureOf(new ApiStatusError(key, 500)));
    Assert.equal("overloaded (529)", failureOf(new ApiStatusError(key, 529)));
    Assert.equal("rejected (400)", failureOf(new ApiStatusError(key, 400)));
    Assert.equal("timed out", failureOf(failing("timed out", path)));
    Assert.equal("refused by the model", failureOf(new ModelRefusedError("claude-haiku-5-5", null)));
    Assert.equal("did not fit: it was not one JSON object", failureOf(new ReplyError("it was not one JSON object")));
    Assert.equal("failed", failureOf(new Error(key)));
    // Only a kind this build knows is taken from the error itself.
    Assert.equal("failed", failureOf(Object.assign(new Error(key), { failure: key })));
  });

  test("A failed exchange is logged without what was said, and so is every export of it", async () => {
    const log = new GameLog();
    const spec = { key: "t1/orders/Egypt", turn: 1, role: "leader", user: "Your orders." } as unknown as CallSpec;
    for (const message of Said) await converse(spec, "file seat", () => Promise.reject(new Error(message)), (c: ModelCall) => log.addCall(c)).catch(() => undefined);
    Assert.equal(Said.map(() => "failed"), log.calls.map((c) => c.error));
    for (const parts of [Everything, { ...Everything, humanWords: false }])
      for (const s of Secrets) Assert.false(exportJsonl(log, parts).includes(s), `"${s}" is in an export`);
  });

  test("A log written before failures were kinds gives their raw messages as failed", () => {
    const old =
      `{"version":38,"seed":1,"type":"header"}\n` +
      Said.map((m) => `{"key":"t1/orders/Egypt","turn":1,"error":${JSON.stringify(m)},"type":"call"}\n`).join("") +
      `{"type":"decision","key":"t1/orders/Hatti","by":{"kind":"fallback","name":"File seat","reason":${JSON.stringify(Said[2])}},"value":""}\n` +
      `{"key":"t1/aud/present/c5","turn":1,"kind":"present","script":{},"error":${JSON.stringify(Said[3])},"type":"shadow"}\n`;
    const text = exportJsonl(GameLog.fromJsonl(old));
    for (const s of Secrets) Assert.false(text.includes(s), `"${s}" is in the export`);
    Assert.equal(Said.length + 2, text.split('"failed"').length - 1);
    // A failure as this build writes it is given as it stands.
    const log = new GameLog();
    log.addCall(newModelCall({ key: "t1/orders/Egypt", turn: 1, error: "rate limited (429)" }));
    log.addCall(newModelCall({ key: "t1/orders/Hatti", turn: 1, error: "did not fit: letters[0].to" }));
    Assert.contains('"error":"rate limited (429)"', exportJsonl(log));
    Assert.contains('"error":"did not fit: letters[0].to"', exportJsonl(log));
    // Only the whole form is a kind: an old message that begins like one is still "failed".
    const tail = "rate limited (429): request_id=" + fakeRequestId;
    Assert.equal('"error":"failed"', /"error":"[^"]*"/.exec(exportJsonl(GameLog.fromJsonl(`{"key":"t1/orders/Egypt","turn":1,"error":${JSON.stringify(tail)},"type":"call"}\n`)))![0]);
  });

  test("Every field the log's records hold is given by the export or knowingly left out", () => {
    const names = (s: ObjSchema<unknown>): string[] => s.fields.map(([n]) => n);
    // None is left out today: a field the log gains fails here until it is listed, or named here as left out.
    const LeftOut: string[] = [];
    for (const [schema, listed] of [
      [LogHeaderSchema, ExportFields.header],
      [AuthorshipSchema, ExportFields.authorship],
      [ModelCallSchema, ExportFields.call],
      [ShadowDecisionSchema, ExportFields.shadow],
      [CharacterChoiceSchema, ExportFields.choice],
      [AuditSchema, ExportFields.audit],
      [MindPageSchema, ExportFields.mind],
    ] as [ObjSchema<unknown>, readonly string[]][])
      Assert.equal(names(schema).filter((n) => !LeftOut.includes(n)), [...listed]);
  });

  test("By default the export holds everything; each filter leaves its part out", () => {
    const log = new GameLog();
    log.addCall(newModelCall({ key: "t1/orders/Egypt", turn: 1 }));
    log.addShadow(newShadowDecision({ key: "t1/aud/present/c5", turn: 1, kind: "present", script: newCharacterChoice() }));
    log.addAudit(newAudit({ key: "t1/orders/Egypt", turn: 1, kind: "orders" }));
    log.record("t1/orders/Hatti", S, "", newAuthorship({ kind: "script", name: "Script" }));
    log.minds.keep(1, "Egypt", { notes: "Watch Hatti." });
    const types = (text: string): string[] => [...new Set(text.split("\n").filter((l) => l.length > 0).map((l) => (JSON.parse(l) as { type: string }).type))].sort();
    Assert.equal(log.toJsonl().split("\n").length, exportJsonl(log).split("\n").length);
    Assert.equal(["audit", "call", "decision", "header", "mind", "shadow"], types(exportJsonl(log)));
    // A model king's own pages go with the calls.
    Assert.equal(["audit", "decision", "header", "shadow"], types(exportJsonl(log, { ...Everything, calls: false })));
    Assert.equal(["audit", "call", "decision", "header", "mind"], types(exportJsonl(log, { ...Everything, shadows: false })));
    Assert.equal(["call", "decision", "header", "mind", "shadow"], types(exportJsonl(log, { ...Everything, audits: false })));
  });

  /** The string fields a human's orders and answers hold that are orders the engine reads: ids, names it knows, kinds. */
  const OrderFields = new Set([
    "answers", "army", "avoidPower", "brings", "byAnswer", "cancelAnswers", "cancelStanding", "cede", "character", "checkClaim", "city",
    "collect", "copies", "copy", "council", "court", "debt", "engage", "envoy", "fate", "fleet", "from", "grantee", "how", "into", "kind", "lot",
    "name", "named", "open", "partner", "person", "power", "province", "provinces", "seals", "supported", "target", "task", "to", "unit",
    "vassal", "via", "what", "when", "where", "withdraw",
    // A character's answers: courts, debts, offers and people by id, an alias it was offered.
    "accept", "askDebts", "choice", "claimsToServe", "crownId", "giveDebts", "go", "goAs", "kill", "league", "outlaw", "repay",
  ]);

  test("Every string a decision can hold is either words or an order", () => {
    const unsorted = new Set<string>();
    const seen = new Set<Schema>();
    const walk = (s: Schema, key: string): void => {
      switch (s.k) {
        case "str":
          if (!WordFields.has(key) && !OrderFields.has(key)) unsorted.add(key);
          return;
        case "opt":
        case "list":
        case "set":
        case "dict":
        case "computed":
          return walk(s.of, key);
        case "lazy":
          return walk(s.get(), key);
        case "obj":
          if (seen.has(s)) return;
          seen.add(s);
          for (const [n, f] of s.fields) walk(f, n);
          return;
        case "poly":
          for (const v of Object.values(s.variants)) walk(v, key);
          return;
      }
    };
    // Every schema the runner records a decision under (strings and flags are values of their own).
    for (const schema of [TurnSubmissionSchema, HostReplySchema, MindReplySchema, PresentResultSchema, EnvoyReactionSchema]) walk(schema, "");
    // A new string field must be put on one side: in WordFields (export.ts) if a player types it, here if the engine reads it.
    Assert.equal([], [...unsorted]);
  });

  /** A human player's words. */
  const Letter = "Greetings, my brother of Alashiya. I send you twelve horses and a chariot of gold.";
  const Notes = "Attack now";
  const Speech = 'Your lord\'s horses are welcome here. Say "my brother" to him.';

  class HumanSender implements ISeat {
    readonly label = "Human";
    readonly envoy: string;
    constructor(envoy: string) {
      this.envoy = envoy;
    }
    decide(view: SeatView): Promise<TurnSubmission> {
      return Promise.resolve(view.turn === 1 ? newTurnSubmission({ orders: [dispatch(this.envoy, "Alashiya", Letter)], notes: Notes, stayAwake: true }) : newTurnSubmission({ stayAwake: true }));
    }
    hostAudience(): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  class HumanHost implements ISeat {
    readonly label = "Human";
    decide(): Promise<TurnSubmission> {
      return Promise.resolve(newTurnSubmission({ stayAwake: true }));
    }
    hostAudience(_view: AudienceView): Promise<HostReply> {
      return Promise.resolve(newHostReply({ speech: Speech, end: true }));
    }
  }

  /** Every string of a record set to its blank: two records are the same game when these match. */
  const shape = (json: string): string => JSON.stringify(JSON.parse(json), (_k, v: unknown) => (typeof v === "string" ? v.replace(/\S/g, BlankMark) : v));

  test("Without human words, a game with a human seat loses every text, keeps its shape, and still replays", async () => {
    const state = newGame(5, newGameConfig({ catastropheChance: 0, endMedian: 10000 }));
    const envoy = first(state.characters, (c) => c.employer === "Egypt");
    const seats = toDict(
      AllPowers,
      (p) => p,
      (p): ISeat => (p === "Egypt" ? new HumanSender(envoy.id) : new HumanHost()),
    );
    const runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    for (let i = 0; i < 4; i++) await runner.playTurn();
    // Models quote and echo what they read: a call, a shadow, a ladder's why and a chronicle carrying his letter.
    runner.log.addCall(newModelCall({ key: "t2/aud/react/c1", turn: 2, role: "character", model: "Haiku", prompt: `The letter you carry: "${Letter}"`, output: JSON.stringify({ notes: `He wrote: ${Notes}` }) }));
    runner.log.addShadow(newShadowDecision({ key: "t3/aud/report/c1", turn: 3, kind: "report", known: [Letter], script: newCharacterChoice({ text: `I carried: "${Letter}"` }) }));
    runner.log.route("t3/orders/Hatti/up", { rung: "small", model: "Haiku", why: `the letter says "${Letter}"` });
    runner.log.record("t3/orders/Hatti/up", S, "", newAuthorship({ kind: "model", name: "Haiku leader" }));
    runner.log.record("t2/chronicle/Egypt", S, `Pharaoh wrote to Alashiya: "${Letter}"`, newAuthorship({ kind: "model", name: "Haiku narrator" }));
    // A reply that did not fit, its schema's account quoting what he wrote.
    runner.log.record("t4/aud/react/c1", S, "", newAuthorship({ kind: "fallback", name: "Script", reason: `did not fit: speech "${Speech}" is too long` }));

    // The export as read: every string decoded.
    const read = (text: string): string => text.split("\n").filter((l) => l.length > 0).map((l) => JSON.stringify(JSON.parse(l))).join("\n");
    const full = read(exportJsonl(runner.log));
    for (const words of [Letter, Notes, Speech]) Assert.true(full.includes(JSON.stringify(words).slice(1, -1)), `a normal export keeps "${words}"`);

    const text = exportJsonl(runner.log, { ...Everything, humanWords: false }, realNames(runner.state));
    for (const words of ["Greetings", "twelve horses", "Attack now", "welcome here", "He wrote", "Pharaoh wrote", "the letter says", "I carried", "is too long"])
      Assert.false(read(text).includes(words), `"${words}" is still in the export`);
    Assert.contains('"reason":"did not fit: ', text);
    // Every record keeps its shape: the same lines, each with its texts the same lengths, its numbers and kinds as they were.
    const lines = (t: string): string[] => t.split("\n").filter((l) => l.length > 0);
    Assert.equal(lines(exportJsonl(runner.log)).map(shape), lines(text).map(shape));
    // Orders are never blanked: the export replays to the same game, its words blanked in it too.
    const replay = GameRunner.forReplay(GameLog.fromJsonl(text));
    await replay.prepare();
    for (let i = 0; i < 4; i++) await replay.playTurn();
    Assert.equal(shape(serialize(GameStateSchema, state)), shape(serialize(GameStateSchema, replay.state)));
  });

  test("Without human words, the same text blanks the same and two different texts never do", () => {
    // The game compares texts (a go-between who changed an envoy's words bent them), so the export must too.
    const log = new GameLog();
    const human = newAuthorship({ kind: "human", name: "Human" });
    for (const [i, words] of ["Send gold.", "Send food.", "Send gold.", "Send wine.", "Send oxen.", "Send iron."].entries()) log.record(`t1/aud/s${i}`, S, words, human);
    const values = exportJsonl(log, { ...Everything, humanWords: false }, [])
      .split("\n")
      .filter((l) => l.includes('"type":"decision"'))
      .map((l) => (JSON.parse(l) as { value: string }).value);
    Assert.equal(values[0], values[2]);
    Assert.equal(5, new Set(values).size);
    // More texts of one tiny shape than its letters can number still blank apart, and never as a longer text's blank.
    const tiny = new GameLog();
    for (const [i, words] of ["a", "b", "c", "d", "e", "ab", "cd"].entries()) tiny.record(`t1/aud/s${i}`, S, words, human);
    const blanks = exportJsonl(tiny, { ...Everything, humanWords: false }, [])
      .split("\n")
      .filter((l) => l.includes('"type":"decision"'))
      .map((l) => (JSON.parse(l) as { value: string }).value);
    Assert.equal(7, new Set(blanks).size);
    for (const v of values) Assert.true(/^\S{4} \S{5}$/.test(v) && !/[A-Za-z]/.test(v), `"${v}" is not a blank of its shape`);
  });

  test("Without human words, a name made up in an order is a stand-in, the same wherever it appears; real names are kept", () => {
    // A pitch's name, a traveller's alias and a claimed realm: the engine reads only names it knows, so a made-up one, which
    // may quote a human's words, is Name-1, Name-2 (Engine and models, "Logging and replay"). Real names stay: an offered
    // alias, a realm's or a king's name in any case, a person's.
    const log = new GameLog();
    const human = newAuthorship({ kind: "human", name: "Human" });
    const model = newAuthorship({ kind: "model", name: "Haiku character" });
    log.record("t1/orders/Egypt", TurnSubmissionSchema, newTurnSubmission({ orders: [claimName("the reed kingdom of Qirbashtu"), claimName("hatti")] }), human);
    log.record("t1/aud/pitch/c1", MindReplySchema, newMindReply({ name: "Qirbashtu the Fair" }), model);
    log.record("t1/aud/pitch/c2", MindReplySchema, newMindReply({ name: "Amenmose" }), model);
    log.record("t1/aud/pitch/c3", MindReplySchema, newMindReply({ name: "Tiwari-invented" }), model);
    log.record("t1/aud/pitch/c4", MindReplySchema, newMindReply({ name: "Suppiluliuma" }), model);
    log.record("t2/life/c1", MindReplySchema, newMindReply({ life: newLifeChoice({ go: "Hatti", goAs: " Qirbashtu the Fair" }) }), model);
    log.record("t2/life/c2", MindReplySchema, newMindReply({ life: newLifeChoice({ go: "Hatti", goAs: "Amenmose" }) }), model);
    const values = (parts: ExportParts): unknown[] =>
      exportJsonl(log, parts, [...realNames(newGame(5, newGameConfig())), "Tiwari-invented"])
        .split("\n")
        .filter((l) => l.includes('"type":"decision"'))
        .map((l) => (JSON.parse(l) as { value: unknown }).value);
    const names = (v: unknown[]): unknown[] => [
      (v[0] as TurnSubmission).orders.map((o) => (o as { name: string }).name),
      ...v.slice(1, 5).map((x) => (x as { name: string }).name),
      ...v.slice(5).map((x) => (x as { life: { goAs: string } }).life.goAs),
    ];
    Assert.equal([["Name-1", "hatti"], "Name-2", "Amenmose", "Tiwari-invented", "Suppiluliuma", "Name-2", "Amenmose"], names(values({ ...Everything, humanWords: false })));
    // A normal export keeps every name as written.
    Assert.equal([["the reed kingdom of Qirbashtu", "hatti"], "Qirbashtu the Fair", "Amenmose", "Tiwari-invented", "Suppiluliuma", " Qirbashtu the Fair", "Amenmose"], names(values(Everything)));
    // The filter needs the game's real names, so none is stood in for and the export still replays.
    Assert.throws(() => exportJsonl(log, { ...Everything, humanWords: false }));
  });

  test("Without human words, a game with no human seat loses nothing", () => {
    const log = new GameLog();
    log.record("t1/orders/Egypt", TurnSubmissionSchema, newTurnSubmission({ notes: "Hold the passes." }), newAuthorship({ kind: "model", name: "Haiku leader" }));
    log.addCall(newModelCall({ key: "t1/orders/Egypt", turn: 1, prompt: "Your orders.", output: '{"notes":"Hold the passes."}' }));
    Assert.equal(exportJsonl(log), exportJsonl(log, { ...Everything, humanWords: false }));
  });
});
