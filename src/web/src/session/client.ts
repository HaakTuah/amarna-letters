/**
 * The page's side of the game: it sends the worker what the player does and keeps only what the worker last sent (the
 * frames, the state shown, the questions for the human seats), plus the spectator's own choices: whose eyes, which season.
 */
import {
  AudienceViewSchema,
  GameStateSchema,
  HostReplySchema,
  SeatViewSchema,
  TurnSubmissionSchema,
  deserialize,
  setRisen,
  serialize,
  type AudienceView,
  type GameState,
  type HostReply,
  type Power,
  type SeatView,
  type TurnSubmission,
} from "@amarna/engine";
import { SnapshotHistory } from "@amarna/game";
import { buildScene, type MapScene } from "../map/scene.ts";
import { IncrementalReader } from "./incremental.ts";
import type { FramePerson, SeasonFrame } from "./frames.ts";
import type { FromWorker, Keys, Live, ToWorker } from "./protocol.ts";
import { newSettings, type GameSettings, type TableSettings } from "./settings.ts";
import { download } from "./storage.ts";

/** A human seat's question, read back into the engine's types. */
export interface HumanAsk {
  power: Power;
  orders: SeatView | null;
  audience: { view: AudienceView; court: SeatView } | null;
}

const emptyLive = (): Live => ({
  hasRunner: false,
  generation: 0,
  states: [],
  phase: "",
  busy: false,
  auto: false,
  readOnly: false,
  ended: false,
  canPlayOn: false,
  turn: 0,
  errors: [],
  errorCount: 0,
  error: null,
  notice: null,
  cost: 0,
  costUnknown: false,
  settings: newSettings(),
  config: null,
  seats: {},
  snapshots: 0,
  chronicles: {},
  humans: [],
  humansAsleep: [],
  pending: [],
  gameId: "",
  fallenToGod: false,
  trailAuthors: {},
  fallbacks: [],
});

export class Session {
  private worker: Worker;
  private listeners = new Set<() => void>();
  /** Bumped on every change, for React's useSyncExternalStore. */
  version = 0;

  live: Live = emptyLive();
  frames: SeasonFrame[] = [];
  state: GameState | null = null;
  asks: HumanAsk[] = [];

  viewAs: Power | null = null;
  reveal = false;
  historyTurn: number | null = null;
  replaying = false;
  delayMs = 400;

  /** The history of the state (item 17a): the stream's pieces, from which any season is read back when looked back at. */
  private history = new SnapshotHistory();
  private reader = new IncrementalReader();
  private recent = new Map<number, GameState>();
  private nextId = 1;
  private waiting = new Map<number, (m: FromWorker) => void>();
  private scenes = new Map<string, MapScene>();
  private scenesFor = -1;
  private framesGeneration = 0;
  private seenGeneration = -1;
  private fallSeen = false;

  constructor() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => this.receive(e.data);
    this.worker.onerror = (e) => {
      this.live = { ...this.live, error: `The game's worker stopped: ${e.message}` };
      this.notify();
    };
  }

  // ---------------------------------------------------------------- the store

  subscribe = (f: () => void): (() => void) => {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  };
  getVersion = (): number => this.version;

  private notify(): void {
    this.version++;
    for (const f of this.listeners) f();
  }

  private send(m: ToWorker): void {
    this.worker.postMessage(m);
  }

  private receive(m: FromWorker): void {
    if (m.type !== "update") {
      const done = this.waiting.get(m.id);
      this.waiting.delete(m.id);
      done?.(m);
      return;
    }
    const newGame = m.live.generation !== this.seenGeneration;
    if (m.reset || newGame) {
      this.frames = [];
      this.recent.clear();
      this.history.clear();
      this.reader = new IncrementalReader();
      this.framesGeneration++;
      this.fallSeen = false;
    }
    if (m.frames.length > 0) {
      let previous = this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
      for (const f of m.frames) {
        shareUnchanged(f, previous);
        previous = f;
      }
      this.frames = [...this.frames, ...m.frames];
      this.framesGeneration++;
    }
    if (m.live.states.length > 0) {
      for (const d of m.live.states) this.history.apply(d);
      // Only the newest season is read now, and only what changed in it; a season looked back at is read then (displayed).
      this.state = this.reader.apply(this.history.pieces(this.history.length - 1)!);
      this.recent.clear();
      // The powers risen in play (item 13+) are the game's: the page names and draws them as the engine does.
      setRisen(this.state.risen);
    }
    if (!m.live.hasRunner) this.state = null;
    this.asks = m.live.pending.map((p) => ({
      power: p.power,
      orders: p.orders === null ? null : deserialize<SeatView>(SeatViewSchema, p.orders),
      audience: p.audience === null ? null : { view: deserialize<AudienceView>(AudienceViewSchema, p.audience.view), court: deserialize<SeatView>(SeatViewSchema, p.audience.court) },
    }));
    if (newGame) {
      this.seenGeneration = m.live.generation;
      this.historyTurn = null;
      this.reveal = false;
      this.viewAs = m.live.humans[0] ?? null;
    }
    if (m.live.fallenToGod && !this.fallSeen) {
      this.fallSeen = true;
      this.viewAs = null;
    }
    this.live = { ...m.live, states: [] };
    this.notify();
  }

  private request(m: ToWorker & { id: number }): Promise<FromWorker> {
    return new Promise((resolve) => {
      this.waiting.set(m.id, resolve);
      this.send(m);
    });
  }

  // ---------------------------------------------------------------- what the page shows

  get hasHumans(): boolean {
    return this.live.humans.length > 0;
  }
  get canSeeAll(): boolean {
    // Item 14: when a game ends, the record opens to every seat ("Legends, read from the record").
    return !this.hasHumans || this.reveal || this.live.fallenToGod || this.live.ended;
  }
  get godView(): boolean {
    return this.viewAs === null && this.canSeeAll;
  }
  /** The season shown: the snapshot index (0 = the start, k = after turn k). */
  get shownIndex(): number {
    return this.historyTurn ?? Math.max(0, this.frames.length - 1);
  }
  get canPlay(): boolean {
    const l = this.live;
    return l.hasRunner && !l.busy && !l.readOnly && !l.ended && !l.auto;
  }

  /** The map's scene for a season and a pair of eyes, built once and kept while the frames stand. */
  scene(index: number, viewer: Power | null): MapScene {
    if (this.scenesFor !== this.framesGeneration) {
      this.scenes.clear();
      this.scenesFor = this.framesGeneration;
    }
    index = Math.min(Math.max(0, index), Math.max(0, this.frames.length - 1));
    const key = `${index}/${viewer ?? ""}`;
    const had = this.scenes.get(key);
    if (had !== undefined) return had;
    // A few scenes kept (the season shown and its neighbours): a scene is megabytes, and one a season crowded a phone (item 17a).
    if (this.scenes.size >= 6) this.scenes.clear();
    const scene = buildScene(this.frames, index, viewer);
    this.scenes.set(key, scene);
    return scene;
  }

  /**
   * The full state of the season shown, for the panels that need it. A season in history is read back from the page's own
   * history of pieces when looked back at, and the last few read are kept.
   */
  get displayed(): GameState | null {
    if (this.state === null) return null;
    const t = this.historyTurn;
    if (t === null || t >= this.history.length - 1) return this.state;
    const had = this.recent.get(t);
    if (had !== undefined) return had;
    const json = this.history.json(t);
    if (json === null) return this.state;
    if (this.recent.size >= 4) this.recent.delete(this.recent.keys().next().value!);
    const st = deserialize<GameState>(GameStateSchema, json);
    this.recent.set(t, st);
    return st;
  }

  // ---------------------------------------------------------------- what the player does

  /** `keys`: the API key of each provider in use, by provider id. */
  start(settings: GameSettings, keys: Keys): void {
    this.replaying = false;
    this.send({ type: "start", settings, keys });
  }
  /** `table`: the providers, prices and pause share set on the page, which a saved log does not keep. */
  /** `id`: the saved game's own id, kept when a game is resumed after an update (else a loaded game is a new one). */
  load(text: string, continuePlay: boolean, keys: Keys, table: TableSettings | null = null, id: string | null = null): void {
    this.replaying = false;
    this.send({ type: "load", text, continuePlay, keys, table, id });
  }
  step(): void {
    this.historyTurn = null;
    this.notify();
    this.send({ type: "step" });
  }
  setAuto(on: boolean): void {
    this.send({ type: "auto", on });
  }
  setDelay(ms: number): void {
    this.delayMs = ms;
    this.send({ type: "delay", ms });
    this.notify();
  }
  playOn(budgetUsd: number | null = null): void {
    this.send({ type: "playOn", budgetUsd });
  }

  raiseBudget(by: number): void {
    this.send({ type: "budget", by });
  }
  stop(): void {
    this.replaying = false;
    this.send({ type: "stop" });
  }
  clearMessages(): void {
    this.send({ type: "clear" });
  }
  submitOrders(power: Power, s: TurnSubmission): void {
    this.send({ type: "orders", power, json: serialize(TurnSubmissionSchema, s) });
  }
  wake(power: Power): void {
    this.send({ type: "wake", power });
  }
  answer(power: Power, r: HostReply): void {
    this.send({ type: "answer", power, json: serialize(HostReplySchema, r) });
  }
  setViewAs(p: Power | null): void {
    this.viewAs = p;
    this.notify();
  }
  setReveal(on: boolean): void {
    this.reveal = on;
    this.notify();
  }

  async export(): Promise<void> {
    const m = await this.request({ type: "export", id: this.nextId++ });
    if (m.type === "export" && m.text !== "") download(m.name, m.text);
  }

  showTurn(turn: number | null): void {
    this.historyTurn = turn !== null && turn >= this.frames.length - 1 ? null : turn !== null ? Math.max(0, turn) : null;
    this.notify();
  }

  /** One season back in the timeline. */
  stepBack(): void {
    this.stopReplay();
    if (!this.live.hasRunner || this.frames.length === 0) return;
    this.showTurn(Math.max(0, this.shownIndex - 1));
  }

  /** One season on: through the recorded seasons, and at the newest, playing the next one if the game goes on. */
  stepForward(): void {
    this.stopReplay();
    if (!this.live.hasRunner) return;
    if (this.historyTurn !== null) {
      this.showTurn(this.historyTurn + 1);
      return;
    }
    if (this.canPlay) this.step();
  }

  /** Starts or stops stepping through the recorded seasons, from the start if already at the newest. */
  toggleReplay(): void {
    if (this.replaying) {
      this.stopReplay();
      return;
    }
    if (!this.live.hasRunner || this.frames.length < 2) return;
    if (this.historyTurn === null) this.historyTurn = 0;
    this.replaying = true;
    this.notify();
    void this.replayLoop();
  }

  stopReplay(): void {
    if (!this.replaying) return;
    this.replaying = false;
    this.notify();
  }

  private async replayLoop(): Promise<void> {
    while (this.replaying && this.live.hasRunner) {
      await new Promise((r) => setTimeout(r, Math.max(700, this.delayMs * 2)));
      if (!this.replaying || this.historyTurn === null) break;
      this.showTurn(this.historyTurn + 1);
      if (this.historyTurn === null) break;
    }
    this.replaying = false;
    this.notify();
  }
}

/** Two maps with the same keys and values, by `same` on the values. */
function sameMap<K, V>(a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>, same: (x: V, y: V) => boolean): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (w === undefined || !same(v, w)) return false;
  }
  return true;
}
const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => a.size === b.size && [...a].every((x) => b.has(x));

/**
 * A frame shares with the frame before whatever did not change (item 17a): each court's known holders and walls and its
 * sight are a map of the whole board a court, most of them the same season after season, and copied across from the worker
 * they weighed a megabyte a season on the page. Equal parts take the earlier frame's reference; the frame reads the same.
 */
export function shareUnchanged(f: SeasonFrame, previous: SeasonFrame | null): void {
  if (previous === null) return;
  for (const [p, m] of f.knownOwner) {
    const was = previous.knownOwner.get(p);
    if (was !== undefined && sameMap(m, was, (x, y) => x.owner === y.owner && x.turn === y.turn)) f.knownOwner.set(p, was);
  }
  for (const [p, m] of f.knownWalls) {
    const was = previous.knownWalls.get(p);
    if (was !== undefined && sameMap(m, was, (x, y) => x === y)) f.knownWalls.set(p, was);
  }
  for (const [p, set] of f.sight) {
    const was = previous.sight.get(p);
    if (was !== undefined && sameSet(set, was)) f.sight.set(p, was);
  }
  for (const [id, c] of f.people) {
    const was = previous.people.get(id);
    if (was !== undefined && samePerson(c, was)) f.people.set(id, was);
  }
}

function samePerson(a: FramePerson, b: FramePerson): boolean {
  for (const k of Object.keys(a) as (keyof FramePerson)[]) {
    if (k === "covers") continue;
    if (a[k] !== b[k]) return false;
  }
  if (a.covers.length !== b.covers.length) return false;
  return a.covers.every((x, i) => {
    const y = b.covers[i];
    return x.for === y.for && x.believed === y.believed && x.heldAt === y.heldAt && x.whereText === y.whereText && x.timingText === y.timingText && x.since === y.since;
  });
}

/** The one game of this tab. */
export const session = new Session();
