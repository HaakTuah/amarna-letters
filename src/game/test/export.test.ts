import { describe, test } from "vitest";
import { AllPowers, GameStateSchema, HostReplySchema, S, TurnSubmissionSchema, type Schema, type AudienceView, type HostReply, type SeatView, type TurnSubmission, dispatch, first, newGame, newGameConfig, newHostReply, newTurnSubmission, serialize } from "@amarna/engine";
import { BlankMark, Everything, GameLog, WordFields, newAuthorship, rememberKey, GameRunner, type ISeat, ScriptMind, TemplateNarrator, exportJsonl, newAudit, newModelCall, newShadowDecision, newCharacterChoice } from "@amarna/game";
import { CompatibleProvider, SdkTransport } from "@amarna/llm";
import { Assert, toDict } from "../../engine/test/support.ts";

// One export, with filters (Engine and models, "Logging and replay"): what is sensitive is never in it, whatever the
// filters; by default it holds everything; filters leave parts out, and one blanks a human player's words, still replaying.
describe("ExportTests", () => {
  /** Sensitive texts as providers, the bridge and the file system have written them into failed calls. */
  const Leaks: [string, string][] = [
    ["a local path", "no reply in /home/haakon/games/egypt/t3-orders-Egypt.reply.json after 30 minutes"],
    ["a Windows path", "ENOENT: no such file C:\\Users\\haakon\\seats\\egypt\\t3.reply.json"],
    ["a Windows path with a space", "no reply in C:\\Users\\Haakon Sval\\seats\\egypt\\t3.reply.json after 30 minutes"],
    ["a home path in another alphabet", "no reply in /home/øystein/My Seats/egypt/t3.reply.json after 30 minutes"],
    ["a server path in another alphabet", "ENOENT: /srv/øystein/seats/t3.reply.json"],
    ["a provider address with a key", "fetch failed: https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyA1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvW"],
    ["a masked key", "openai API 401: Incorrect API key provided: sk-proj-****************************Ab1x."],
    ["a key", "sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"],
    ["a request id", 'Anthropic API 429 {"type":"error","error":{"type":"rate_limit_error"},"request_id":"req_011CUj4ZfzTqVqXyZ8aBcDeF"}'],
    ["an organisation id", "This request would exceed the rate limit for your organization (fb3a3f3e-7c4b-4d8e-9a1f-2b6c8d0e4f12) of 50,000 input tokens per minute."],
    ["an e-mail address", "account haakon.example@gmail.com has no credit left"],
    ["a device", "the bridge refused the request: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"],
    ["a bridge address with a bracket in its token", "no local bridge answers at http://localhost:5190/?auth=]BRIDGE_TOKEN: fetch failed"],
    ["an e-mail address in another alphabet", "write to jane@bücher.de instead"],
    ["a bearer token", "authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc"],
  ];
  /** What none of the leaks may leave in an export. */
  const Secrets = ["/home/", "/srv/", "BRIDGE_TOKEN", "bücher", "b\\u00FCcher", "b\\u00fccher", "haakon", "Haakon", "Sval", "øystein", "AIza", "sk-", "req_011", "fb3a3f3e", "gmail", "Macintosh", "Mozilla", "eyJ", "googleapis", "Ab1x"];

  function leaky(): GameLog {
    const log = new GameLog();
    log.header.note = "played from http://user:token@localhost:5190/";
    // A fallback's reason is its failed call's error, copied into the decision's authorship.
    Leaks.forEach(([, reason], i) => log.record(`t1/orders/p${i}`, S, "", newAuthorship({ kind: "fallback", name: "File seat", reason })));
    // A ladder's why is a model's own words, which may repeat anything it was shown.
    Leaks.forEach(([, why], i) => {
      log.route(`t1/orders/q${i}`, { rung: "small", model: "Haiku", why });
      log.record(`t1/orders/q${i}`, S, "", newAuthorship({ kind: "model", name: "Haiku leader" }));
    });
    for (const [, error] of Leaks) {
      log.addCall(newModelCall({ key: "t1/orders/Egypt", turn: 1, role: "leader", model: "Haiku", prompt: "Your orders.", error }));
      log.addShadow(newShadowDecision({ key: "t1/aud/present/c5", turn: 1, kind: "present", script: newCharacterChoice({ text: error }), model: newCharacterChoice({ commitments: error }), known: [error], error }));
    }
    return log;
  }

  test("Nothing sensitive is in the log or any export, whatever the filters", () => {
    const log = leaky();
    for (const text of [log.toJsonl(), exportJsonl(log), exportJsonl(log, { ...Everything, humanWords: false }), GameLog.fromJsonl(log.toJsonl()).toJsonl()])
      for (const s of Secrets) Assert.false(text.includes(s), `"${s}" is in an export`);
    // What failed is still said: only the sensitive piece is replaced, by a marker that names it.
    const errors = log.calls.map((c) => c.error!);
    Assert.equal("no reply in [path]", errors[0]);
    Assert.equal("no reply in [path]", errors[2]);
    Assert.contains("[key]", errors[6]);
    Assert.contains("[id]", errors[8]);
    Assert.contains("[id]", errors[9]);
    Assert.contains("[e-mail]", errors[10]);
  });

  test("A key in use is taken out by its value, whatever its shape", () => {
    rememberKey("opaque_secret_12345");
    const log = new GameLog();
    log.addCall(newModelCall({ key: "t1/orders/Egypt", turn: 1, error: "local API 401: Incorrect API key provided: opaque_secret_12345" }));
    log.record("t1/orders/Hatti", S, "", newAuthorship({ kind: "fallback", name: "local leader", reason: "Incorrect API key provided: opaque_secret_12345" }));
    Assert.false(exportJsonl(log).includes("opaque_secret"));
    Assert.equal("local API 401: Incorrect API key provided: [key]", log.calls[0].error);
  });

  test("A short key is taken out where it stands whole, and only there", () => {
    rememberKey("abc1234");
    const log = new GameLog();
    log.addCall(newModelCall({ key: "t1/orders/Egypt", turn: 1, error: "Incorrect API key provided: abc1234; see abc12345 and xabc1234" }));
    Assert.equal("Incorrect API key provided: [key]; see abc12345 and xabc1234", log.calls[0].error);
  });

  test("Every provider registers its key as it is made", () => {
    new CompatibleProvider({ id: "local", baseUrl: "http://localhost:11434/v1" }, "compatible_key_67890");
    new SdkTransport("anthropic_key_24680");
    const log = new GameLog();
    log.addCall(newModelCall({ key: "t1/orders/Egypt", turn: 1, error: "keys compatible_key_67890 and anthropic_key_24680" }));
    Assert.equal("keys [key] and [key]", log.calls[0].error);
  });

  test("A log read back from an old file loses what is sensitive in it", () => {
    const old =
      `{"version":38,"seed":1,"type":"header"}\n{"key":"t1/orders/Egypt","turn":1,"error":"${Leaks[0][1]}","type":"call"}\n` +
      `{"type":"decision","key":"t1/orders/Egypt","by":{"kind":"fallback","name":"File seat","reason":"${Leaks[0][1]}"},"value":""}\n`;
    Assert.false(GameLog.fromJsonl(old).toJsonl().includes("/home/"));
  });

  test("By default the export holds everything; each filter leaves its part out", () => {
    const log = leaky();
    log.addAudit(newAudit({ key: "t1/orders/Egypt", turn: 1, kind: "orders" }));
    const types = (text: string): string[] => [...new Set(text.split("\n").filter((l) => l.length > 0).map((l) => (JSON.parse(l) as { type: string }).type))].sort();
    Assert.equal(log.toJsonl(), exportJsonl(log));
    Assert.equal(["audit", "call", "decision", "header", "shadow"], types(exportJsonl(log)));
    Assert.equal(["audit", "decision", "header", "shadow"], types(exportJsonl(log, { ...Everything, calls: false })));
    Assert.equal(["audit", "call", "decision", "header"], types(exportJsonl(log, { ...Everything, shadows: false })));
    Assert.equal(["call", "decision", "header", "shadow"], types(exportJsonl(log, { ...Everything, audits: false })));
  });

  /** The string fields a human's orders and answers hold that are orders the engine reads: ids, names it knows, kinds. */
  const OrderFields = new Set([
    "answers", "army", "avoidPower", "brings", "byAnswer", "cancelAnswers", "cancelStanding", "cede", "character", "checkClaim", "city",
    "collect", "copies", "copy", "council", "court", "debt", "engage", "envoy", "fate", "fleet", "from", "grantee", "into", "kind", "lot",
    "name", "named", "open", "partner", "person", "power", "province", "provinces", "seals", "supported", "target", "task", "to", "unit",
    "vassal", "via", "what", "when", "where", "withdraw",
  ]);

  test("Every string a human's orders and answers can hold is either his words or an order", () => {
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
    walk(TurnSubmissionSchema, "");
    walk(HostReplySchema, "");
    // A new string field must be put on one side: in WordFields (export.ts) if a player types it, here if the engine reads it.
    Assert.equal([], [...unsorted]);
  });

  /** A human player's words, long enough to be looked for wherever they are quoted. */
  const Letter = "Greetings, my brother of Alashiya. I send you twelve horses and a chariot of gold.";
  const Notes = "Attack now";
  /** A note naming a person by his id, and the same as the scribe delivers it to another court. */
  const Named = "Ask c1 to bring the horses to the secret gate. Meet jane@example.com beside the old well tomorrow.";
  const Scribed = "Ask Mane to bring the horses to the secret gate. Meet jane@example.com beside the old well tomorrow.";
  const Speech = 'Your lord\'s horses are welcome here. Say "my brother" to him.';

  class HumanSender implements ISeat {
    readonly label = "Human";
    readonly envoy: string;
    constructor(envoy: string) {
      this.envoy = envoy;
    }
    decide(view: SeatView): Promise<TurnSubmission> {
      return Promise.resolve(view.turn === 1 ? newTurnSubmission({ orders: [dispatch(this.envoy, "Alashiya", Letter)], notes: Notes, stayAwake: true }) : newTurnSubmission({ notes: view.turn === 2 ? Named : "", stayAwake: true }));
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

  test("Without human words, every word a human wrote is blanked, wherever it is quoted, and the export still replays", async () => {
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
    // A model's prompt that carries the letter, as an envoy's or a court's request would.
    // A model's reply, itself JSON, that copies the host's speech with its quotation marks.
    runner.log.addCall(newModelCall({ key: "t2/orders/Hatti", turn: 2, role: "leader", model: "Haiku", output: JSON.stringify({ notes: `Alashiya said: ${Speech}` }) }));
    // A letter naming a person by his id, delivered with his name in its place (the engine's scribe).
    runner.log.addCall(newModelCall({ key: "t3/orders/Hatti", turn: 3, role: "leader", model: "Haiku", prompt: `A letter: "${Scribed}" And another: "Bring the horses."` }));
    // A shadow whose choices quote the note with the address in it.
    runner.log.addShadow(newShadowDecision({ key: "t3/aud/report/c1", turn: 3, kind: "report", script: newCharacterChoice({ text: `I carried: "${Scribed}"` }) }));
    // A model seat's ladder passing a decision up, its why quoting the letter.
    runner.log.route("t3/orders/Hatti/up", { rung: "small", model: "Haiku", why: `the letter says "${Letter}"` });
    runner.log.record("t3/orders/Hatti/up", S, "", newAuthorship({ kind: "model", name: "Haiku leader" }));
    // A chronicle, a decision whose whole value is a text, quoting the letter.
    runner.log.record("t2/chronicle/Egypt", S, `Pharaoh wrote to Alashiya: "${Letter}"`, newAuthorship({ kind: "model", name: "Haiku narrator" }));
    // Prompts that carry the letter whole, a brief of it cut mid-word, and the short note.
    runner.log.addCall(newModelCall({ key: "t2/aud/react/c1", turn: 2, role: "character", model: "Haiku", prompt: `The letter you carry: "${Letter}"` }));
    runner.log.addCall(newModelCall({ key: "t2/orders/Hatti", turn: 2, role: "leader", model: "Haiku", prompt: `A tablet from Egypt: ${Letter.slice(0, 50)}… Your spy read: Attack now. Attack nowhere else.` }));

    // The export as read: its strings unescaped.
    const read = (text: string): string => text.split("\n").filter((l) => l.length > 0).map((l) => JSON.stringify(JSON.parse(l))).join("\n");
    const full = read(exportJsonl(runner.log));
    // A normal export keeps a human's words, but never what is sensitive in them.
    Assert.false(full.includes("jane@example.com"));
    Assert.true(full.includes("Meet [e-mail] beside the old well tomorrow."));
    // As the export reads: in a string, and in a JSON string inside one (a model's reply).
    const esc = (w: string): string => JSON.stringify(w).slice(1, -1);
    for (const words of [Letter, Notes, Speech]) Assert.true(full.includes(esc(words)), `a normal export keeps "${words}"`);

    const text = exportJsonl(runner.log, { ...Everything, humanWords: false });
    const kept = read(text);
    for (const words of [Letter, Speech, "twelve horses", "my brother of Alashiya", "Attack now.", "welcome here", 'Say "my brother"'])
      for (const form of [esc(words), esc(esc(words))]) Assert.false(kept.includes(form), `"${form}" is still in the export`);
    Assert.true(kept.includes('Pharaoh wrote to Alashiya: \\"' + Letter.replace(/\S/g, BlankMark)));
    // The scribe's delivery of a note that named a person by his id: his words blanked around the name put in; a short
    // sentence of the prompt's own stays.
    Assert.false(kept.includes("to bring the horses to the secret gate"));
    Assert.false(kept.includes("Ask Mane"));
    // The log took the address out of the prompt ("Meet [e-mail] beside ..."): his words around it are still found.
    Assert.false(kept.includes("beside the old well"));
    Assert.true(kept.includes("Bring the horses."));
    // A short text counts only whole: the same letters inside a longer word are not his.
    Assert.true(kept.includes("Attack nowhere else."));
    // Each is a marked blank of its own length, its spaces kept.
    Assert.true(kept.includes(Letter.replace(/\S/g, BlankMark)));
    Assert.true(kept.includes(Notes.replace(/\S/g, BlankMark)));
    // Orders are never blanked: the export replays to the same game.
    const replay = GameRunner.forReplay(GameLog.fromJsonl(text));
    await replay.prepare();
    for (let i = 0; i < 4; i++) await replay.playTurn();
    // The same game, with the human's words blanked in it too.
    let expected = read(serialize(GameStateSchema, state));
    for (const words of [Letter, Notes, Speech]) expected = expected.split(esc(words)).join(esc(words.replace(/\S/g, BlankMark)));
    Assert.equal(expected, read(serialize(GameStateSchema, replay.state)));
  });
});
