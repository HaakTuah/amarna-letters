/**
 * The canary for hidden information ("Hidden information" in docs/review-guidelines.md; "Follow-ups" in
 * docs/BUILD-PROGRESS.md). A small game with secrets planted: an envoy's hidden errand, its letter's and a sealed
 * tablet's words, an army in the fog and another court's treasury. Every seat's view, what every model is asked, every
 * script king's input, the chronicles and everything the page shows a seat (its map and panels) are read along every
 * path (the season as it is played, every past season, a replay) and none may hold a secret its seat or character could
 * not know. The export is read too (Engine and models, "Logging and replay"): the game's failed calls carry what must
 * never be recorded, and its envoy's king is a human seat, so under every filter nothing sensitive is in it, and without
 * human words his are gone and it still replays. Each secret is first shown to be there for whoever may know it, so the
 * canary cannot pass by having planted nothing. The smallest game that tests the rule: three seats on part of the map,
 * three seasons, played once for the whole file.
 */
import { describe, test } from "vitest";
import {
  AllPowers,
  Dict,
  type GameState,
  type Power,
  type SeatView,
  SeatViewSchema,
  type TurnSubmission,
  Views,
  WorldMap,
  claimName,
  dispatch,
  formatMoney,
  govern,
  newGame,
  newOwnerChange,
  newTabletProposal,
  newUnit,
  serialize,
  wordHomeAt,
} from "@amarna/engine";
import {
  BlankMark,
  NameFields,
  WordFields,
  Everything,
  exportJsonl,
  ExportFields,
  realNames,
  type ExportParts,
  GameLog,
  GameRunner,
  type ISeat,
  ReplayMind,
  ReplayNarrator,
  ReplaySeat,
  ScriptLeader,
  isThreadsKey,
  threadsFor,
} from "@amarna/game";
import { ApiStatusError, type ApiResult, type JsonObject, SeatChoices, SimulatedApi, buildSeats, providersFor, situation } from "@amarna/llm";
import { IdleSeat, Near, seasons } from "../../game/test/small-world.ts";
import { Assert } from "../../engine/test/support.ts";
import { frameFrom, type SeasonFrame } from "../src/session/frames.ts";
import { buildScene, type MapScene } from "../src/map/scene.ts";
import { buildLifeRecord } from "../src/session/life-record.ts";
import { CourtStrip } from "../src/components/CourtStrip.tsx";
import { EventsPanel } from "../src/components/EventsPanel.tsx";
import { FollowPanel } from "../src/components/FollowPanel.tsx";
import { InboxPanel } from "../src/components/InboxPanel.tsx";
import { PeoplePanel } from "../src/components/PeoplePanel.tsx";
import { ProvinceInfo } from "../src/components/ProvinceInfo.tsx";
import { SeasonPanel } from "../src/components/SeasonPanel.tsx";
import { StandingsPanel } from "../src/components/StandingsPanel.tsx";
import { ThreadsPanel } from "../src/components/ThreadsPanel.tsx";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const Seed = 3;
const Seasons = 3;
// Invented words, found nowhere else in the game's texts.
const Mandate = "offer Zirtaqqu the river towns if he turns on his brother";
const Letter = "the oxen of Nuribtash are counted and the ford is yours";
const Sealed = "let the cedar of Ullazemmi pass untaxed for nine years";
// A realm the human makes up and claims: the engine knows no such name, so the export's filter gives it a stand-in.
const Claim = "the reed kingdom of Qirbashtu";
const Gold = 987_659;
const ArmyMen = 4_327;

/** Who reads a text, in the season it is read: a seat, or a character by id. */
type Reader = { seat: Power; turn: number } | { character: string; turn: number };

interface Secret {
  name: string;
  /** The words that give it away. */
  tokens: string[];
  /** Who may know it. */
  may: (r: Reader) => boolean;
}

/**
 * Assyria's script king, with the canary's envoy sent to Babylonia in the first season, and a governor sent to the far
 * province it lost out of its sight (bug #467).
 */
class Planting extends ScriptLeader {
  // Played as a human's seat would be: its letter, mandate and tablet are a human player's words in the export.
  override readonly label = "Human";
  readonly envoy: string;
  readonly lost: string;
  readonly governor: string;
  constructor(envoy: string, lost: string, governor: string) {
    super(Seed);
    this.envoy = envoy;
    this.lost = lost;
    this.governor = governor;
  }
  override async decide(view: SeatView, signal?: AbortSignal): Promise<TurnSubmission> {
    const sub = await super.decide(view, signal);
    sub.orders = sub.orders.filter((o) => !JSON.stringify(o).includes(`"${this.governor}"`) && !JSON.stringify(o).includes(`"${this.lost}"`));
    if (view.turn !== 1) return sub;
    // The court still believes the province its own, and sends it a governor.
    sub.orders.push(govern(this.lost, this.governor));
    sub.orders = sub.orders.filter((o) => !JSON.stringify(o).includes(`"${this.envoy}"`));
    sub.orders.push(
      dispatch(this.envoy, "Babylonia", Letter, {
        mandate: Mandate,
        proposal: newTabletProposal({ text: Sealed }),
      }),
      claimName(Claim),
    );
    return sub;
  }
}

/** What a seat was handed, call by call, in the season it was played. */
type Inputs = { turn: number; text: string }[];

/** Plain text of whatever a seat is handed: views, audience views, alerts, phrasing requests. */
const plain = (x: unknown): string =>
  JSON.stringify(x, (_, v: unknown) =>
    v instanceof AbortSignal ? null : v instanceof Dict || v instanceof Map || v instanceof Set ? [...(v as Iterable<unknown>)] : v,
  );

/**
 * The seat as it plays, every call it answers kept with what it was handed: a script king's whole input, or what a model
 * seat's requests are built from. Each of the seat's own ways of being asked (holding court in one call, reading alerts,
 * phrasing, sleeping) stays as it is, so the game takes the paths it takes with the seat unwrapped.
 */
function recording(seat: ISeat, turn: () => number, inputs: Inputs): ISeat {
  return new Proxy(seat, {
    get(target, key, receiver) {
      const v: unknown = Reflect.get(target, key, receiver);
      if (typeof v !== "function") return v;
      return (...args: unknown[]) => {
        inputs.push({ turn: turn(), text: plain(args) });
        return (v as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}

/** The starting world with the army and the treasury planted; the envoy and the province of the army in the fog. */
function planted(): {
  state: GameState;
  envoy: string;
  fog: string;
  fogOwner: Power;
  lost: string;
  lostTo: Power;
  governor: string;
} {
  const state = newGame(Seed, seasons(Seasons));
  state.treasuries.get("Babylonia").gold = Gold;
  const map = WorldMap.default;
  // A province no seat sees, nor any province next to it.
  const seen = new Set<string>();
  for (const p of Near) for (const x of Views.sight(state, map, p)) seen.add(x);
  const fog = map.landProvinces
    .map((x) => x.id)
    .find((x) => !seen.has(x) && map.neighbors(x).every((n) => !seen.has(n)) && state.owner.getOrDefault(x, null) !== null)!;
  const fogOwner = state.owner.get(fog)!;
  state.units.push(
    newUnit({
      id: "u977",
      power: fogOwner,
      kind: "Army",
      province: fog,
      home: fog,
      men: ArmyMen,
    }),
  );
  const envoy = state.characters.find((c) => c.employer === "Assyria" && c.at === "Assyria" && c.status === "Employed")!.id;
  // Bug #467: a far province Assyria held, lost in the second season out of its sight (by the log of who held it), whose word
  // does not reach its court within the game: it still believes the province its own, and orders for it are checked so.
  const court = map.landProvinces.find((x) => x.capital && x.home === "Assyria")!.id;
  const lost = map.landProvinces
    .map((x) => x.id)
    .find(
      (x) =>
        x !== fog &&
        !seen.has(x) &&
        map.neighbors(x).every((n) => !seen.has(n)) &&
        ![null, "Assyria"].includes(state.owner.getOrDefault(x, null)) &&
        [1, 2].every((t) => wordHomeAt(state, map, court, x, t) > t + 1),
    )!;
  const lostTo = state.owner.get(lost)!;
  state.ownerLog.push(newOwnerChange({ province: lost, turn: 0, owner: "Assyria" }), newOwnerChange({ province: lost, turn: 2, owner: lostTo }));
  const governor = state.characters.find((c) => c.employer === "Assyria" && c.at === "Assyria" && c.status === "Employed" && c.id !== envoy)!.id;
  return { state, envoy, fog, fogOwner, lost, lostTo, governor };
}

interface Played {
  runner: GameRunner;
  seats: Map<Power, Inputs>;
  envoy: string;
  fog: string;
  fogOwner: Power;
  lost: string;
  lostTo: Power;
}

/**
 * What providers and the machine say when a call fails, holding what must never be recorded: a key, a provider address
 * with a token, request and organisation ids, a local path, an e-mail address, a browser's details. Every one is built
 * here from invented pieces, so nothing in this file is real or looks like a real key.
 */
const Sensitive = [
  "sk-" + "ant-" + "api03-" + "q".repeat(40),
  "https://user:" + "TOKEN" + "77x@relay.invented.example/v1",
  "req_" + "7".repeat(24),
  "org_" + "3".repeat(12),
  "/home/kiyya-invented/amarna",
  "nobody@invented.example",
  "Mozilla/5.0 (Inventedbox 9; Fable)",
];
const Said = [
  new ApiStatusError(`Anthropic API 401: Incorrect API key provided: ${Sensitive[0]} via ${Sensitive[1]}`, 401),
  new ApiStatusError(`Anthropic API 400: {"request_id":"${Sensitive[2]}","organization":"${Sensitive[3]}"}`, 400),
  new Error(`ENOENT: open '${Sensitive[4]}/t1.reply.json' for ${Sensitive[5]} on ${Sensitive[6]}`),
];
/**
 * The calls that fail, by their place in the game's order, none of them a call the positive controls read: two characters'
 * personas at setup (a call alone), and a character's own decision in season 1 (a call with its script's shadow beside it).
 */
const FailAt = [5, 41, 130];
/** How each planted failure is logged: its kind and code only. */
const Kinds = ["refused (401)", "rejected (400)", "failed"];
/** A distinctive core of each sensitive piece, so a piece cut short is found too. */
const Cores = ["sk-ant", "TOKEN77x", "relay.invented", "req_7777", "org_3333", "kiyya-invented", "nobody@", "Inventedbox"];

/** The stand-in API, failing the planted calls with what must never be recorded. */
class Failing extends SimulatedApi {
  #n = 0;
  failed = 0;
  override send(body: JsonObject): Promise<ApiResult> {
    const i = FailAt.indexOf(++this.#n);
    if (i < 0) return super.send(body);
    this.failed++;
    return Promise.reject(Said[i]);
  }
}

/** The canary's game: Mitanni and Babylonia played by models (a stand-in answers: no model is called), Assyria by its script king. */
async function play(): Promise<Played> {
  const { state, envoy, fog, fogOwner, lost, lostTo, governor } = planted();
  let runner: GameRunner | null = null;
  const choices = new SeatChoices();
  choices.leaders.set("Mitanni", "Haiku");
  choices.leaders.set("Babylonia", "Haiku");
  choices.characters = "Haiku";
  choices.narrator = "Haiku";
  const api = new Failing();
  const set = buildSeats(choices, state, providersFor(choices, api, {}), () => runner!.log);
  set.seats.set("Assyria", new Planting(envoy, lost, governor));
  const seats = new Map<Power, Inputs>();
  for (const p of AllPowers)
    if (Near.includes(p)) {
      const inputs: Inputs = [];
      seats.set(p, inputs);
      set.seats.set(
        p,
        recording(set.seats.get(p), () => runner!.state.turn, inputs),
      );
    } else set.seats.set(p, new IdleSeat());
  runner = new GameRunner(state, set.seats, set.minds, set.narrator);
  await runner.prepare();
  while (await runner.playTurn());
  // The planted failures, and nothing else, failed; a script stood in for each.
  Assert.equal(FailAt.length, api.failed);
  Assert.equal(FailAt.length, runner.errors.length);
  return { runner, seats, envoy, fog, fogOwner, lost, lostTo };
}

/** The canary's game played, each season's state read back once. */
interface Read extends Played {
  states: GameState[];
  /** The season Babylonia's court hears the envoy, and so first reads the tablet. */
  audience: number;
}

/**
 * The secrets, and who may know each in which season (the season as it is played: an audience in season 2 is known from
 * season 2's orders on). Of the characters only the envoy carries any of them. Babylonia's treasury is known by every figure
 * it held in any season, as digits and as minas and shekels.
 */
function secrets(g: Read): Secret[] {
  const seat = (r: Reader, ...ps: Power[]) => "seat" in r && ps.includes(r.seat);
  const envoy = (r: Reader) => "character" in r && r.character === g.envoy;
  const golds = [...new Set(g.states.map((s) => s.treasuries.get("Babylonia").gold))];
  return [
    // The mandate and the letter stay hidden from the host: the envoy did not show its credentials, nor serves him in secret.
    {
      name: "the envoy's hidden errand",
      tokens: ["Zirtaqqu"],
      may: (r) => envoy(r) || seat(r, "Assyria"),
    },
    {
      name: "the letter's words",
      tokens: ["Nuribtash"],
      may: (r) => envoy(r) || seat(r, "Assyria"),
    },
    {
      name: "the sealed tablet's words",
      tokens: ["Ullazemmi"],
      may: (r) => envoy(r) || seat(r, "Assyria") || (seat(r, "Babylonia") && r.turn >= g.audience),
    },
    {
      name: "Babylonia's treasury",
      tokens: golds.flatMap((x) => [String(x), formatMoney(x)]),
      may: (r) => seat(r, "Babylonia"),
    },
    {
      name: "the army in the fog",
      tokens: [String(ArmyMen), ArmyMen.toLocaleString("en-US")],
      may: (r) => seat(r, g.fogOwner),
    },
    // Bug #467: no refusal may tell Assyria's court of the loss before word of it comes.
    {
      name: "the far province lost out of sight",
      tokens: [`${g.lost} is not yours`, `do not hold ${WorldMap.default.get(g.lost).name}`],
      may: (r) => !seat(r, "Assyria") || r.turn >= heardOfLoss(g),
    },
  ];
}

/** The first season Assyria's court knows the far province lost (bug #467): past the game if word never comes in it. */
function heardOfLoss(g: Read): number {
  const t = g.states.findIndex((s) => Views.knownHolders(s, WorldMap.default, "Assyria").get(g.lost).owner !== "Assyria");
  return t < 0 ? Seasons + 1 : t;
}

/** The secrets a text holds that its reader may not know. */
function leaks(text: string, reader: Reader, list: Secret[]): string[] {
  return list.filter((x) => !x.may(reader) && x.tokens.some((t) => text.includes(t))).map((x) => x.name);
}

/** The reader of a model call, by its role ("leader:Mitanni", "host:Babylonia", "envoy:c9", "life:c9", "narrator:chronicle", ...). */
function readerOf(key: string, role: string, turn: number): Reader {
  const [kind, who] = role.split(":");
  if (AllPowers.includes(who as Power)) return { seat: who as Power, turn };
  // A chronicle is its court's (its key ends with the power); a persona is its character's.
  if (kind === "narrator") {
    const end = key.split("/").at(-1)!;
    if (AllPowers.includes(end as Power)) return { seat: end as Power, turn };
    const id = /c\d+/.exec(key)?.[0];
    if (id !== undefined) return { character: id, turn };
  }
  if (/^c\d+$/.test(who)) return { character: who, turn };
  throw new Error(`no reader for the call ${key} (${role})`);
}

/** Plain text of a page's markup, as a seat reads it. */
const markup = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el);
const none = (): void => {};

/** Everything the page shows a seat in one season: its view, its map, and each of its panels. */
function shown(g: Read, frames: SeasonFrame[], sceneAt: (t: number, p: Power) => MapScene, t: number, p: Power): { what: string; text: string }[] {
  const s = g.states[t];
  const scene = sceneAt(t, p);
  const out = [
    { what: "view", text: serialize(SeatViewSchema, Views.for(s, p)) },
    // The map as drawn for the seat; the frames under it (this season's, the last, its own land's) are the page's whole record.
    {
      what: "map",
      text: plain({ ...scene, frame: null, prev: null, own: null }),
    },
    { what: "court strip", text: markup(createElement(CourtStrip, { scene })) },
    {
      what: "season panel",
      text: markup(createElement(SeasonPanel, { scene, onProvince: none, onPerson: none })),
    },
    {
      what: "inbox",
      text: markup(createElement(InboxPanel, { state: s, power: p })),
    },
    {
      what: "people",
      text: markup(createElement(PeoplePanel, { state: s, viewer: p, onPerson: none })),
    },
    {
      what: "standings",
      text: markup(createElement(StandingsPanel, { state: s, viewer: p, seats: null })),
    },
    {
      what: "events",
      text: markup(createElement(EventsPanel, { state: s, upTo: t, viewer: p })),
    },
    // Item 17+++: the threads to watch as told through the seat, every telling of the season.
    {
      what: "threads",
      text: markup(
        createElement(ThreadsPanel, {
          tellings: g.runner.tellings(t).map((told) => threadsFor(told, p)),
          trails: false,
          director: false,
          canTellAnew: true,
          onPerson: none,
          onTrail: none,
          onPlace: none,
          onDirector: none,
          onTellAnew: none,
        }),
      ),
    },
  ];
  // The envoy followed, as the seat knows him.
  const record = buildLifeRecord(frames, (i) => sceneAt(i, p), t, s, p, g.envoy);
  out.push({
    what: "follow panel",
    text: markup(
      createElement(FollowPanel, {
        record,
        viewer: p,
        onProvince: none,
        onClose: none,
      }),
    ),
  });
  // The cards of the provinces the secrets are about: the army's, and the capitals of the courts that keep them.
  for (const id of [
    g.fog,
    g.lost,
    ...["Assyria", "Babylonia"].map((c) => WorldMap.default.landProvinces.find((x) => x.capital && s.owner.getOrDefault(x.id, null) === c)!.id),
  ])
    out.push({
      what: `card of ${id}`,
      text: markup(
        createElement(ProvinceInfo, {
          state: s,
          id,
          scene,
          onClose: none,
          onPerson: none,
        }),
      ),
    });
  return out;
}

/** The game, played once for every test of the file. */
let shared: Promise<Read> | null = null;
const game = (): Promise<Read> => (shared ??= read());

/** The canary's game played, and the season it was heard at Babylonia's court. */
async function read(): Promise<Read> {
  const g = await play();
  const states = Array.from({ length: Seasons + 1 }, (_, t) => g.runner.stateAt(t)!);
  const court = g.runner.log.calls.map((c) => /^t(\d+)\/court\/Babylonia\//.exec(c.key)).find((m) => m !== null);
  Assert.notNull(court);
  return { ...g, states, audience: Number(court![1]) };
}

/** A log replayed on a fresh copy of the planted world. */
async function replayOf(log: GameLog): Promise<GameRunner> {
  const replay = new GameRunner(
    planted().state,
    new Dict(AllPowers.map((p) => [p, new ReplaySeat(log.header.seats.tryGet(p) ?? "?") as ISeat] as const)),
    new ReplayMind(log.header.minds),
    new ReplayNarrator(log.header.narrator),
    { replay: log },
  );
  await replay.prepare();
  while (await replay.playTurn());
  return replay;
}

/** Every filter the export offers, in each of its sixteen combinations. */
const Filters: ExportParts[] = Array.from({ length: 16 }, (_, i) => ({
  calls: (i & 1) > 0,
  shadows: (i & 2) > 0,
  audits: (i & 4) > 0,
  humanWords: (i & 8) > 0,
}));

/** An export's records, decoded. */
const records = (text: string): Record<string, unknown>[] =>
  text
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);

/** Every string within a value. */
function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v !== null && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}

/** The fields a record of each type may give: its listed fields, and its type. */
function unlisted(r: Record<string, unknown>): string[] {
  const keys = (o: unknown, listed: readonly string[], where: string) =>
    o === null || o === undefined
      ? []
      : Object.keys(o)
          .filter((k) => !listed.includes(k))
          .map((k) => `${where}.${k}`);
  const type = String(r.type);
  switch (type) {
    case "header":
      return keys(r, [...ExportFields.header, "type"], type);
    case "decision":
      return keys(r, ["type", "key", "by", "value"], type).concat(keys(r.by, ExportFields.authorship, "decision.by"));
    case "call":
      return keys(r, [...ExportFields.call, "type"], type);
    case "shadow":
      return keys(r, [...ExportFields.shadow, "type"], type).concat(
        keys(r.model, ExportFields.choice, "shadow.model"),
        keys(r.script, ExportFields.choice, "shadow.script"),
      );
    case "audit":
      return keys(r, [...ExportFields.audit, "type"], type);
    case "mind":
      return keys(r, [...ExportFields.mind, "type"], type);
    default:
      return [`a record of type ${type}`];
  }
}

/** A blank holds no letter or digit: only the export's marks, spaces and punctuation. */
const isBlank = (text: string): boolean => !/[\p{L}\p{N}]/u.test(text);

/** Each kind of text an export may hold, as a list: the texts the filter without human words must blank. */
function texts(read: Record<string, unknown>[]): Record<string, string[]> {
  const of = (type: string) => read.filter((r) => r.type === type);
  const words = (v: unknown, key: string | null): string[] =>
    typeof v === "string"
      ? key === null || WordFields.has(key)
        ? [v]
        : []
      : Array.isArray(v)
        ? v.flatMap((x) => words(x, key ?? ""))
        : v !== null && typeof v === "object"
          ? Object.entries(v).flatMap(([k, x]) => words(x, k))
          : [];
  const choices = of("shadow").flatMap((r) => [r.model, r.script].filter((c): c is Record<string, unknown> => c !== null && c !== undefined));
  return {
    "a call's system, prompt or output": of("call").flatMap((r) => [r.system, r.prompt, r.output].map(String)),
    "a decision's words (a chronicle, a persona, a letter, notes)": of("decision").flatMap((r) => words(r.value, null)),
    // Whatever the list of word fields says: a text of several words in a decision is words, never an order.
    "a decision's text of several words": of("decision").flatMap((r) => strings(r.value).filter((x) => /\p{L}+\s+\p{L}+/u.test(x) && !isBlank(x))),
    "an author's why": of("decision").flatMap((r) => strings((r.by as Record<string, unknown> | undefined)?.why)),
    "a shadow's choice text or commitments": choices.flatMap((c) => strings([c.text, c.commitments])),
    "a shadow's known": of("shadow").flatMap((r) => strings(r.known)),
    // Item 17+++: a model king's own pages, which quote what he read.
    "a mind's page": of("mind").map((r) => String(r.text)),
    // Item 17+++: the narrator's words for the threads to watch, which name what it was given.
    "a thread's words": of("decision")
      .filter((r) => isThreadsKey(String(r.key)))
      .flatMap((r) => (r.value as { text: string }[]).map((x) => x.text)),
  };
}

/** Where two states differ, every string compared but where the second holds a blank or a made-up name's stand-in. */
function differ(a: unknown, b: unknown, path: string): string[] {
  if (typeof b === "string" && /[\u2580-\u259f]|\bName-\d+\b/.test(b)) return typeof a === "string" ? [] : [`${path}: a blank or stand-in where there was no text`];
  if (a !== null && typeof a === "object" && b !== null && typeof b === "object")
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) =>
      differ((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`),
    );
  return a === b ? [] : [`${path}: ${JSON.stringify(a)?.slice(0, 80)} became ${JSON.stringify(b)?.slice(0, 80)}`];
}

/**
 * Every string of a record set to its blank, and a name in a decision's value only as a name (it may be a stand-in): two
 * exports are the same game in shape when these match.
 */
const shape = (r: Record<string, unknown>): string => {
  const named = r.type === "decision" ? { ...r, value: JSON.parse(JSON.stringify(r.value, (k, v: unknown) => (NameFields.has(k) && typeof v === "string" ? "name" : v))) as unknown } : r;
  return JSON.stringify(named, (_, v: unknown) => (typeof v === "string" ? v.replace(/\S/g, BlankMark) : v));
};

describe("CanaryTests", () => {
  test("No seat, model, script king or page is handed a secret, live, in past seasons or on replay", async () => {
    const g = await game();
    const { runner, states } = g;
    const list = secrets(g);
    const gold = list.find((x) => x.name === "Babylonia's treasury")!.tokens;
    const has = (text: string, tokens: readonly string[]) => tokens.some((t) => text.includes(t));
    const inputs = (p: Power) =>
      g.seats
        .get(p)!
        .map((i) => i.text)
        .join("");
    const asked = (f: (key: string, role: string) => boolean) =>
      runner.log.calls
        .filter((c) => f(c.key, c.role))
        .map((c) => c.system + c.prompt)
        .join("");

    // Each secret is there for whoever may know it, so its absence elsewhere proves something.
    Assert.contains("Zirtaqqu", inputs("Assyria"));
    Assert.contains("Ullazemmi", inputs("Assyria"));
    Assert.contains(
      "Zirtaqqu",
      asked((_, r) => r === `envoy:${g.envoy}`),
    );
    Assert.contains(
      "Nuribtash",
      asked((_, r) => r === `envoy:${g.envoy}`),
    );
    // Babylonia's model holds court in one call, as it does unwrapped, and reads the tablet offered there.
    Assert.contains(
      "Ullazemmi",
      asked((k) => k.includes("/court/Babylonia/")),
    );
    Assert.true(
      has(inputs("Babylonia"), gold) &&
        has(
          asked((_, r) => r === "leader:Babylonia"),
          gold,
        ),
    );
    const own = Views.for(states[0], g.fogOwner);
    Assert.true(own.units.some((u) => u.province === g.fog && u.men === ArmyMen));
    Assert.true(has(situation(own), [String(ArmyMen), ArmyMen.toLocaleString("en-US")]));
    // Bug #467: the far province is another's in truth while Assyria's court still holds it its own, and the governor it
    // sent went (the order checked as the court knows the land), so no refusal had anything to say.
    Assert.equal(g.lostTo, states[1].owner.get(g.lost));
    Assert.true(heardOfLoss(g) > 1);
    Assert.true(states.some((s) => s.characters.some((c) => c.duty === "Governing" && c.watchProvince === g.lost)));

    const found: string[] = [];
    // The season as it is played: what each seat is handed (a script king's input; a model seat's requests are built from it).
    for (const [p, given] of g.seats)
      for (const i of given) for (const x of leaks(i.text, { seat: p, turn: i.turn }, list)) found.push(`season ${i.turn}, ${p}'s input: ${x}`);
    // What every model was asked: kings, hosts, envoys, spies, carriers, the characters' own lives, personas, chronicles.
    for (const c of runner.log.calls)
      for (const x of leaks(c.system + c.prompt, readerOf(c.key, c.role, c.turn), list)) found.push(`${c.key} (${c.role}): ${x}`);
    for (const [p, text] of runner.chronicles) for (const x of leaks(text, { seat: p, turn: Seasons }, list)) found.push(`${p}'s chronicle: ${x}`);
    // Every season as the page shows it to each seat, the latest and every past one.
    const frames: SeasonFrame[] = [];
    for (let t = 0; t <= Seasons; t++) frames.push(frameFrom(states[t], t, frames.at(-1) ?? null));
    const scenes = new Map<string, MapScene>();
    const sceneAt = (t: number, p: Power): MapScene => {
      const key = `${t}/${p}`;
      if (!scenes.has(key)) scenes.set(key, buildScene(frames, t, p));
      return scenes.get(key)!;
    };
    Assert.true(sceneAt(0, g.fogOwner).units.some((u) => u.province === g.fog));
    for (let t = 0; t <= Seasons; t++)
      for (const p of Near) {
        for (const { what, text } of shown(g, frames, sceneAt, t, p))
          for (const x of leaks(text, { seat: p, turn: t }, list)) found.push(`season ${t}, ${p}'s ${what}: ${x}`);
        const view = Views.for(states[t], p);
        if (p !== g.fogOwner && (view.units.some((u) => u.province === g.fog) || sceneAt(t, p).units.some((u) => u.province === g.fog)))
          found.push(`season ${t}, ${p}'s view or map: the army in the fog`);
      }
    Assert.equal("", found.join("\n"));

    // A replay of the log on a fresh copy of the planted world plays the same seasons, so each holds no more than the game's.
    const replay = await replayOf(runner.log);
    for (let t = 0; t <= Seasons; t++) Assert.equal(runner.snapshots.get(t), replay.snapshots.get(t));
  }, 60000);

  test("No export holds what is sensitive, under any filter; without human words a human seat's are gone and it still replays", async () => {
    const g = await game();
    const log = g.runner.log;
    const human = ["Zirtaqqu", "Nuribtash", "Ullazemmi", "Qirbashtu"];
    // The planted failures reached the code under test, whole, and are in the log as their kinds alone, beside a
    // character's call and its shadow; the human's words are in the log as he wrote them.
    for (const s of Sensitive)
      Assert.true(
        g.runner.errors.some((e) => e.includes(s)),
        s,
      );
    Assert.equal(
      Kinds,
      log.calls.filter((c) => c.error !== null && c.error !== "").map((c) => c.error),
    );
    Assert.true(log.shadows.some((x) => x.error === "failed"));
    for (const w of human) Assert.contains(w, log.toJsonl());

    const found: string[] = [];
    const sensitive = (where: string, text: string, all: string[]) => {
      for (const c of Cores) if (text.includes(c) || all.some((x) => x.includes(c))) found.push(`${where}: ${c}`);
    };
    // The log itself (the saved game), raw and decoded, then every export.
    const raw = log.toJsonl();
    sensitive("the log", raw, strings(records(raw)));
    const full = records(exportJsonl(log));
    // The texts a filter without human words must blank, each found in the full export so none passes by being absent.
    for (const [what, list] of Object.entries(texts(full)))
      Assert.true(
        list.some((x) => !isBlank(x)),
        `no ${what} to blank`,
      );
    for (const parts of Filters) {
      const text = exportJsonl(log, parts, realNames(g.runner.state));
      const read = records(text);
      const name = JSON.stringify(parts);
      sensitive(name, text, strings(read));
      for (const r of read) for (const f of unlisted(r)) found.push(`${name}: ${f}`);
      if (parts.humanWords) continue;
      for (const w of human) if (strings(read).some((x) => x.includes(w))) found.push(`${name}: the human's words (${w})`);
      // Every text is blank: models quote and echo what they read.
      for (const [what, list] of Object.entries(texts(read))) if (list.some((x) => !isBlank(x))) found.push(`${name}: ${what} not blank`);
      // Each record keeps its shape: the same records, each text as long as it was.
      Assert.equal(records(exportJsonl(log, { ...parts, humanWords: true })).map(shape), read.map(shape));
    }
    Assert.equal("", found.join("\n"));
    // The name he made up is a stand-in, as it is wherever it appears (Engine and models, "Logging and replay").
    Assert.contains(`{"type":"claimName","name":"Name-1"}`, exportJsonl(log, { ...Everything, humanWords: false }, realNames(g.runner.state)));

    // Without human words the export still replays to the same game: every string as it was, but where the replay holds a
    // blank (a text composed from blanked words may differ in its punctuation: the engine adds a full stop that a blank lacks).
    const replay = await replayOf(GameLog.fromJsonl(exportJsonl(log, { ...Everything, humanWords: false }, realNames(g.runner.state))));
    for (let t = 0; t <= Seasons; t++)
      Assert.equal("", differ(JSON.parse(g.runner.snapshots.get(t)!), JSON.parse(replay.snapshots.get(t)!), `season ${t}`).join("\n"));
  }, 60000);

  test("A human seat has no god view and no export while it plays, unless the table reveals all, the game is over or his realm fell", async () => {
    // The page's session talks to its worker (one is started as the module loads); here nothing answers.
    const had = globalThis.Worker;
    const asked: string[] = [];
    globalThis.Worker = class {
      postMessage(m: { type: string }): void {
        asked.push(m.type);
      }
    } as unknown as typeof Worker;
    try {
      const { Session } = await import("../src/session/client.ts");
      const s = new Session();
      s.live = { ...s.live, humans: ["Mitanni"], hasRunner: true };
      s.setViewAs(null);
      Assert.false(s.canSeeAll);
      Assert.false(s.godView);
      // Nor the export, the whole record: it is offered only when the god view is (Engine and models, "Logging and replay").
      await s.export(Everything);
      Assert.false(asked.includes("export"));
      for (const open of [() => s.setReveal(true), () => (s.live = { ...s.live, ended: true }), () => (s.live = { ...s.live, fallenToGod: true })]) {
        s.setReveal(false);
        s.live = { ...s.live, ended: false, fallenToGod: false };
        open();
        Assert.true(s.godView);
        asked.length = 0;
        // Nothing answers here, so the download is not awaited: the worker was asked for it.
        void s.export(Everything);
        Assert.true(asked.includes("export"));
      }
    } finally {
      globalThis.Worker = had;
    }
  });
});
