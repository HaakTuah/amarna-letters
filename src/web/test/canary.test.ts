/**
 * The canary for hidden information ("Hidden information" under "Review guidelines" in AGENTS.md; "Follow-ups" in
 * docs/BUILD-PROGRESS.md). A small game with secrets planted: an envoy's hidden errand and a sealed tablet's words, an
 * army in the fog and another court's treasury. Every seat's view, what every model is asked, every script king's input,
 * the chronicles and the page's map are read along every path (the season as it is played, every past season, a replay)
 * and none may hold a secret its seat or character could not know. Each secret is first shown to be there for whoever may
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
import { GameRunner, type ISeat, ReplayMind, ReplayNarrator, ReplaySeat, ScriptLeader } from "@amarna/game";
import { SeatChoices, SimulatedApi, buildSeats, providersFor } from "@amarna/llm";
import { IdleSeat, Near, seasons } from "../../game/test/small-world.ts";
import { Assert } from "../../engine/test/support.ts";
import { frameFrom, type SeasonFrame } from "../src/session/frames.ts";
import { buildScene } from "../src/map/scene.ts";

const Seed = 3;
const Seasons = 3;
// Invented words, found nowhere else in the game's texts.
const Mandate = "offer Zirtaqqu the river towns if he turns on his brother";
const Letter = "the oxen of Nuribtash are counted and the ford is yours";
const Sealed = "let the cedar of Ullazemmi pass untaxed for nine years";
const Gold = 987_659;
const ArmyMen = 4_327;

/** Who reads a text: a seat, or a character by id with the court it serves. */
type Reader = { seat: Power } | { character: string; serves: Power | null };

interface Secret {
  name: string;
  /** The words that give it away in a state's season. */
  tokens: (s: GameState) => string[];
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
  override async decide(view: SeatView, signal?: AbortSignal): Promise<TurnSubmission> {
    const sub = await super.decide(view, signal);
    if (view.turn !== 1) return sub;
    sub.orders = sub.orders.filter((o) => !JSON.stringify(o).includes(`"${this.envoy}"`));
    sub.orders.push(dispatch(this.envoy, "Babylonia", Letter, { mandate: Mandate, proposal: newTabletProposal({ text: Sealed }) }));
    return sub;
  }
}

/** What a seat was handed, call by call, in the season it was played. */
type Inputs = { turn: number; text: string }[];

/** Plain text of whatever a seat is handed: views, audience views, alerts, phrasing requests. */
const plain = (x: unknown): string =>
  JSON.stringify(x, (_, v: unknown) => (v instanceof AbortSignal ? null : v instanceof Dict || v instanceof Map || v instanceof Set ? [...(v as Iterable<unknown>)] : v));

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
function planted(): { state: GameState; envoy: string; fog: string; fogOwner: Power } {
  const state = newGame(Seed, seasons(Seasons));
  state.treasuries.get("Babylonia").gold = Gold;
  const map = WorldMap.default;
  // A province no seat sees, nor any province next to it.
  const seen = new Set<string>();
  for (const p of Near) for (const x of Views.sight(state, map, p)) seen.add(x);
  const fog = map.landProvinces.map((x) => x.id).find((x) => !seen.has(x) && map.neighbors(x).every((n) => !seen.has(n)) && state.owner.getOrDefault(x, null) !== null)!;
  const fogOwner = state.owner.get(fog)!;
  state.units.push(newUnit({ id: "u977", power: fogOwner, kind: "Army", province: fog, home: fog, men: ArmyMen }));
  const envoy = state.characters.find((c) => c.employer === "Assyria" && c.at === "Assyria" && c.status === "Employed")!.id;
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
  const set = buildSeats(choices, state, providersFor(choices, new SimulatedApi(), {}), () => runner!.log);
  set.seats.set("Assyria", new Planting(envoy));
  const seats = new Map<Power, Inputs>();
  for (const p of AllPowers)
    if (Near.includes(p)) {
      const inputs: Inputs = [];
      seats.set(p, inputs);
      set.seats.set(p, recording(set.seats.get(p), () => runner!.state.turn, inputs));
    } else set.seats.set(p, new IdleSeat());
  runner = new GameRunner(state, set.seats, set.minds, set.narrator);
  await runner.prepare();
  while (await runner.playTurn());
  Assert.equal("", runner.errors.join("; "));
  return { runner, seats, envoy, fog, fogOwner };
}

function secrets(g: { envoy: string; fogOwner: Power }): Secret[] {
  const own = (p: Power) => (r: Reader) => ("seat" in r ? r.seat === p : r.serves === p);
  const either = (...ps: Power[]) => (r: Reader) => ps.some((p) => own(p)(r));
  const envoy = (r: Reader) => "character" in r && r.character === g.envoy;
  const gold = (s: GameState) => s.treasuries.get("Babylonia").gold;
  return [
    // The mandate stays hidden: the envoy did not show its credentials.
    { name: "the envoy's hidden errand", tokens: () => ["Zirtaqqu"], may: (r) => envoy(r) || ("seat" in r && r.seat === "Assyria") },
    { name: "the letter's words", tokens: () => ["Nuribtash"], may: (r) => envoy(r) || either("Assyria", "Babylonia")(r) },
    { name: "the sealed tablet's words", tokens: () => ["Ullazemmi"], may: (r) => envoy(r) || either("Assyria", "Babylonia")(r) },
    { name: "Babylonia's treasury", tokens: (s) => [String(gold(s)), formatMoney(gold(s))], may: own("Babylonia") },
    { name: "the army in the fog", tokens: () => [String(ArmyMen), ArmyMen.toLocaleString("en-US")], may: own(g.fogOwner) },
  ];
}

/** The secrets a text holds that its reader may not know. */
function leaks(text: string, reader: Reader, s: GameState, list: Secret[]): string[] {
  return list.filter((x) => !x.may(reader) && x.tokens(s).some((t) => text.includes(t))).map((x) => x.name);
}

/** The reader of a model call, by its role ("leader:Mitanni", "host:Babylonia", "envoy:c9", "life:c9", ...). */
function readerOf(role: string, s: GameState): Reader {
  const [, who] = role.split(":");
  if (AllPowers.includes(who as Power)) return { seat: who as Power };
  const c = s.characters.find((x) => x.id === who);
  if (c === undefined) throw new Error(`no reader for the call's role ${role}`);
  return { character: c.id, serves: c.employer };
}

/** Every seat's view of every season, as the page's panels and a past season's review rebuild it from the snapshots. */
function pastViews(runner: GameRunner, list: Secret[], fog: string, fogOwner: Power): string[] {
  const found: string[] = [];
  for (let t = 0; t <= Seasons; t++) {
    const s = runner.stateAt(t)!;
    for (const p of Near) {
      const v = Views.for(s, p);
      for (const x of leaks(serialize(SeatViewSchema, v), { seat: p }, s, list)) found.push(`season ${t}, ${p}'s view: ${x}`);
      if (p !== fogOwner && v.units.some((u) => u.province === fog)) found.push(`season ${t}, ${p}'s view: the army in the fog`);
      // The chronicle's events and the events panel: only those shown to the seat.
      const events = JSON.stringify(s.events.filter((e) => e.visibleTo.includes(p)));
      for (const x of leaks(events, { seat: p }, s, list)) found.push(`season ${t}, ${p}'s events: ${x}`);
    }
  }
  return found;
}

describe("CanaryTests", () => {
  test("No seat, model or script king is handed a secret, live, in past seasons or on replay", async () => {
    const g = await play();
    const { runner } = g;
    const list = secrets(g);
    const last = runner.stateAt(Seasons)!;

    // Each secret is there for whoever may know it.
    const assyria = g.seats.get("Assyria")!.map((i) => i.text).join("");
    // Assyria's own record of the mandate and the tablet; the tablet offered to Babylonia; Babylonia's own treasury.
    Assert.contains("Zirtaqqu", assyria);
    Assert.contains("Ullazemmi", assyria);
    const babylonia = g.seats.get("Babylonia")!.map((i) => i.text).join("");
    Assert.contains("Ullazemmi", babylonia);
    Assert.contains(String(Gold), serialize(SeatViewSchema, Views.for(runner.stateAt(0)!, "Babylonia")));
    Assert.true(Views.for(runner.stateAt(0)!, g.fogOwner).units.some((u) => u.province === g.fog && u.men === ArmyMen), "the army, to its own court");
    Assert.true(runner.log.calls.some((c) => c.role === `envoy:${g.envoy}` && c.prompt.includes("Zirtaqqu")), "the envoy's own mandate");
    // Babylonia's model holds court in one call, as it does unwrapped, and reads the tablet offered there.
    Assert.true(runner.log.calls.some((c) => c.key.includes("/court/Babylonia/") && c.prompt.includes("Ullazemmi")), "the tablet, at Babylonia's court");

    const found: string[] = [];
    // The season as it is played: what each seat is handed (a script king's input; a model seat's request is built from it).
    for (const [p, inputs] of g.seats)
      for (const i of inputs) for (const x of leaks(i.text, { seat: p }, runner.stateAt(Math.max(0, i.turn - 1))!, list).concat(leaks(i.text, { seat: p }, runner.stateAt(Math.min(Seasons, i.turn))!, list))) found.push(`season ${i.turn}, ${p}'s input: ${x}`);
    // What every model was asked: kings, hosts, envoys, spies, carriers, the characters' own lives, the chronicles.
    for (const c of runner.log.calls) {
      const s = runner.stateAt(Math.max(0, Math.min(Seasons, c.turn - 1)))!;
      const reader = c.role.startsWith("chronicle") || c.role.startsWith("narrator") ? { seat: c.key.split("/").at(-1) as Power } : readerOf(c.role, s);
      for (const x of leaks(c.system + c.prompt, reader, last, list).concat(leaks(c.system + c.prompt, reader, s, list))) found.push(`${c.key} (${c.role}): ${x}`);
    }
    for (const [p, text] of runner.chronicles) for (const x of leaks(text, { seat: p }, last, list)) found.push(`${p}'s chronicle: ${x}`);
    // Past seasons, as the page rebuilds them.
    found.push(...pastViews(runner, list, g.fog, g.fogOwner));
    // The page's map for each seat and season: what it draws for the viewer (the frames under it, this season's and the last, are the page's whole record).
    const frames: SeasonFrame[] = [];
    for (let t = 0; t <= Seasons; t++) frames.push(frameFrom(runner.stateAt(t)!, t, frames.at(-1) ?? null));
    for (let t = 0; t <= Seasons; t++)
      for (const p of Near) {
        const scene = buildScene(frames, t, p);
        const shown = JSON.stringify({ ...scene, frame: null, prev: null, own: null }, (_, v: unknown) => (v instanceof Map ? [...v] : v instanceof Set ? [...v] : v));
        for (const x of leaks(shown, { seat: p }, runner.stateAt(t)!, list)) found.push(`season ${t}, ${p}'s map: ${x}`);
        if (p !== g.fogOwner && scene.units.some((u) => u.province === g.fog)) found.push(`season ${t}, ${p}'s map: the army in the fog`);
      }

    // A replay rebuilds the same seasons from the log, and its past seasons hold no more than the game's.
    const again = planted();
    const replay = new GameRunner(
      again.state,
      new Dict(AllPowers.map((p) => [p, new ReplaySeat(runner.log.header.seats.tryGet(p) ?? "?") as ISeat] as const)),
      new ReplayMind(runner.log.header.minds),
      new ReplayNarrator(runner.log.header.narrator),
      { replay: runner.log },
    );
    await replay.prepare();
    while (await replay.playTurn());
    Assert.equal(runner.snapshots.get(Seasons), replay.snapshots.get(Seasons));
    found.push(...pastViews(replay, list, g.fog, g.fogOwner).map((x) => `replay, ${x}`));

    Assert.equal("", found.join("\n"));
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
      for (const open of [() => s.setReveal(true), () => (s.live = { ...s.live, ended: true }), () => (s.live = { ...s.live, fallenToGod: true })]) {
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
