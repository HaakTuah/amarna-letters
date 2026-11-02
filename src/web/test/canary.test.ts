/**
 * The canary for hidden information ("Hidden information" under "Review guidelines" in AGENTS.md; "Follow-ups" in
 * docs/BUILD-PROGRESS.md). A small game with secrets planted: an envoy's hidden errand, its letter's and a sealed tablet's
 * words, an army in the fog and another court's treasury. Every seat's view, what every model is asked, every script king's input,
 * the chronicles and everything the page shows a seat (its map and panels) are read along every path (the season as it is
 * played, every past season, a replay) and none may hold a secret its seat or character could not know. Each secret is first shown to be there for whoever may
 * know it, so the canary cannot pass by having planted nothing. The smallest game that tests the rule: three seats on part
 * of the map, three seasons.
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
  dispatch,
  formatMoney,
  newGame,
  newTabletProposal,
  newUnit,
  serialize,
} from "@amarna/engine";
import {
  GameRunner,
  type ISeat,
  ReplayMind,
  ReplayNarrator,
  ReplaySeat,
  ScriptLeader,
} from "@amarna/game";
import {
  SeatChoices,
  SimulatedApi,
  buildSeats,
  providersFor,
  situation,
} from "@amarna/llm";
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
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const Seed = 3;
const Seasons = 3;
// Invented words, found nowhere else in the game's texts.
const Mandate = "offer Zirtaqqu the river towns if he turns on his brother";
const Letter = "the oxen of Nuribtash are counted and the ford is yours";
const Sealed = "let the cedar of Ullazemmi pass untaxed for nine years";
const Gold = 987_659;
const ArmyMen = 4_327;

/** Who reads a text, in the season it is read: a seat, or a character by id. */
type Reader =
  | { seat: Power; turn: number }
  | { character: string; turn: number };

interface Secret {
  name: string;
  /** The words that give it away. */
  tokens: string[];
  /** Who may know it. */
  may: (r: Reader) => boolean;
}

/** Assyria's script king, with the canary's envoy sent to Babylonia in the first season. */
class Planting extends ScriptLeader {
  readonly envoy: string;
  constructor(envoy: string) {
    super(Seed);
    this.envoy = envoy;
  }
  override async decide(
    view: SeatView,
    signal?: AbortSignal,
  ): Promise<TurnSubmission> {
    const sub = await super.decide(view, signal);
    if (view.turn !== 1) return sub;
    sub.orders = sub.orders.filter(
      (o) => !JSON.stringify(o).includes(`"${this.envoy}"`),
    );
    sub.orders.push(
      dispatch(this.envoy, "Babylonia", Letter, {
        mandate: Mandate,
        proposal: newTabletProposal({ text: Sealed }),
      }),
    );
    return sub;
  }
}

/** What a seat was handed, call by call, in the season it was played. */
type Inputs = { turn: number; text: string }[];

/** Plain text of whatever a seat is handed: views, audience views, alerts, phrasing requests. */
const plain = (x: unknown): string =>
  JSON.stringify(x, (_, v: unknown) =>
    v instanceof AbortSignal
      ? null
      : v instanceof Dict || v instanceof Map || v instanceof Set
        ? [...(v as Iterable<unknown>)]
        : v,
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
} {
  const state = newGame(Seed, seasons(Seasons));
  state.treasuries.get("Babylonia").gold = Gold;
  const map = WorldMap.default;
  // A province no seat sees, nor any province next to it.
  const seen = new Set<string>();
  for (const p of Near) for (const x of Views.sight(state, map, p)) seen.add(x);
  const fog = map.landProvinces
    .map((x) => x.id)
    .find(
      (x) =>
        !seen.has(x) &&
        map.neighbors(x).every((n) => !seen.has(n)) &&
        state.owner.getOrDefault(x, null) !== null,
    )!;
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
  const envoy = state.characters.find(
    (c) =>
      c.employer === "Assyria" && c.at === "Assyria" && c.status === "Employed",
  )!.id;
  return { state, envoy, fog, fogOwner };
}

interface Played {
  runner: GameRunner;
  seats: Map<Power, Inputs>;
  envoy: string;
  fog: string;
  fogOwner: Power;
}

/** The canary's game: Mitanni and Babylonia played by models (a stand-in answers: no model is called), Assyria by its script king. */
async function play(): Promise<Played> {
  const { state, envoy, fog, fogOwner } = planted();
  let runner: GameRunner | null = null;
  const choices = new SeatChoices();
  choices.leaders.set("Mitanni", "Haiku");
  choices.leaders.set("Babylonia", "Haiku");
  choices.characters = "Haiku";
  choices.narrator = "Haiku";
  const set = buildSeats(
    choices,
    state,
    providersFor(choices, new SimulatedApi(), {}),
    () => runner!.log,
  );
  set.seats.set("Assyria", new Planting(envoy));
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
  Assert.equal("", runner.errors.join("; "));
  return { runner, seats, envoy, fog, fogOwner };
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
  const seat = (r: Reader, ...ps: Power[]) =>
    "seat" in r && ps.includes(r.seat);
  const envoy = (r: Reader) => "character" in r && r.character === g.envoy;
  const golds = [
    ...new Set(g.states.map((s) => s.treasuries.get("Babylonia").gold)),
  ];
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
      may: (r) =>
        envoy(r) ||
        seat(r, "Assyria") ||
        (seat(r, "Babylonia") && r.turn >= g.audience),
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
  ];
}

/** The secrets a text holds that its reader may not know. */
function leaks(text: string, reader: Reader, list: Secret[]): string[] {
  return list
    .filter((x) => !x.may(reader) && x.tokens.some((t) => text.includes(t)))
    .map((x) => x.name);
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
const markup = (el: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(el);
const none = (): void => {};

/** Everything the page shows a seat in one season: its view, its map, and each of its panels. */
function shown(
  g: Read,
  frames: SeasonFrame[],
  sceneAt: (t: number, p: Power) => MapScene,
  t: number,
  p: Power,
): { what: string; text: string }[] {
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
      text: markup(
        createElement(SeasonPanel, { scene, onProvince: none, onPerson: none }),
      ),
    },
    {
      what: "inbox",
      text: markup(createElement(InboxPanel, { state: s, power: p })),
    },
    {
      what: "people",
      text: markup(
        createElement(PeoplePanel, { state: s, viewer: p, onPerson: none }),
      ),
    },
    {
      what: "standings",
      text: markup(
        createElement(StandingsPanel, { state: s, viewer: p, seats: null }),
      ),
    },
    {
      what: "events",
      text: markup(
        createElement(EventsPanel, { state: s, upTo: t, viewer: p }),
      ),
    },
  ];
  // The envoy followed, as the seat knows him.
  const record = buildLifeRecord(
    frames,
    (i) => sceneAt(i, p),
    t,
    s,
    p,
    g.envoy,
  );
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
    ...["Assyria", "Babylonia"].map(
      (c) =>
        WorldMap.default.landProvinces.find(
          (x) => x.capital && s.owner.getOrDefault(x.id, null) === c,
        )!.id,
    ),
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

/** The canary's game played, and the season it was heard at Babylonia's court. */
async function read(): Promise<Read> {
  const g = await play();
  const states = Array.from(
    { length: Seasons + 1 },
    (_, t) => g.runner.stateAt(t)!,
  );
  const court = g.runner.log.calls
    .map((c) => /^t(\d+)\/court\/Babylonia\//.exec(c.key))
    .find((m) => m !== null);
  Assert.notNull(court);
  return { ...g, states, audience: Number(court![1]) };
}

describe("CanaryTests", () => {
  test("No seat, model, script king or page is handed a secret, live, in past seasons or on replay", async () => {
    const g = await read();
    const { runner, states } = g;
    const list = secrets(g);
    const gold = list.find((x) => x.name === "Babylonia's treasury")!.tokens;
    const has = (text: string, tokens: readonly string[]) =>
      tokens.some((t) => text.includes(t));
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
    Assert.true(
      own.units.some((u) => u.province === g.fog && u.men === ArmyMen),
    );
    Assert.true(
      has(situation(own), [String(ArmyMen), ArmyMen.toLocaleString("en-US")]),
    );

    const found: string[] = [];
    // The season as it is played: what each seat is handed (a script king's input; a model seat's requests are built from it).
    for (const [p, given] of g.seats)
      for (const i of given)
        for (const x of leaks(i.text, { seat: p, turn: i.turn }, list))
          found.push(`season ${i.turn}, ${p}'s input: ${x}`);
    // What every model was asked: kings, hosts, envoys, spies, carriers, the characters' own lives, personas, chronicles.
    for (const c of runner.log.calls)
      for (const x of leaks(
        c.system + c.prompt,
        readerOf(c.key, c.role, c.turn),
        list,
      ))
        found.push(`${c.key} (${c.role}): ${x}`);
    for (const [p, text] of runner.chronicles)
      for (const x of leaks(text, { seat: p, turn: Seasons }, list))
        found.push(`${p}'s chronicle: ${x}`);
    // Every season as the page shows it to each seat, the latest and every past one.
    const frames: SeasonFrame[] = [];
    for (let t = 0; t <= Seasons; t++)
      frames.push(frameFrom(states[t], t, frames.at(-1) ?? null));
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
          for (const x of leaks(text, { seat: p, turn: t }, list))
            found.push(`season ${t}, ${p}'s ${what}: ${x}`);
        const view = Views.for(states[t], p);
        if (
          p !== g.fogOwner &&
          (view.units.some((u) => u.province === g.fog) ||
            sceneAt(t, p).units.some((u) => u.province === g.fog))
        )
          found.push(`season ${t}, ${p}'s view or map: the army in the fog`);
      }
    Assert.equal("", found.join("\n"));

    // A replay of the log on a fresh copy of the planted world plays the same seasons, so each holds no more than the game's.
    const replay = new GameRunner(
      planted().state,
      new Dict(
        AllPowers.map(
          (p) =>
            [
              p,
              new ReplaySeat(runner.log.header.seats.tryGet(p) ?? "?") as ISeat,
            ] as const,
        ),
      ),
      new ReplayMind(runner.log.header.minds),
      new ReplayNarrator(runner.log.header.narrator),
      { replay: runner.log },
    );
    await replay.prepare();
    while (await replay.playTurn());
    for (let t = 0; t <= Seasons; t++)
      Assert.equal(runner.snapshots.get(t), replay.snapshots.get(t));
  }, 60000);

  test("A human seat has no god view while it plays, unless the table reveals all or the game is over", async () => {
    // The page's session talks to its worker (one is started as the module loads); here nothing answers.
    const had = globalThis.Worker;
    globalThis.Worker = class {
      postMessage(): void {}
    } as unknown as typeof Worker;
    try {
      const { Session } = await import("../src/session/client.ts");
      const s = new Session();
      s.live = { ...s.live, humans: ["Mitanni"], hasRunner: true };
      s.setViewAs(null);
      Assert.false(s.canSeeAll);
      Assert.false(s.godView);
      for (const open of [
        () => s.setReveal(true),
        () => (s.live = { ...s.live, ended: true }),
        () => (s.live = { ...s.live, fallenToGod: true }),
      ]) {
        s.setReveal(false);
        s.live = { ...s.live, ended: false, fallenToGod: false };
        open();
        Assert.true(s.godView);
      }
    } finally {
      globalThis.Worker = had;
    }
  });
});
