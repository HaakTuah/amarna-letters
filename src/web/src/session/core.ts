/**
 * The one game this tab is playing or watching, held in the engine's worker: the runner, the human seats (answered from the
 * page), autoplay and autosave to IndexedDB. The page's own choices (whose eyes, which season) stay in the page.
 */
import {

  AudienceViewSchema,
  canPlayOn,
  Dict,
  GameStateSchema,
  HostReplySchema,
  SeatViewSchema,
  TurnSubmissionSchema,
  dateLabel,
  deserialize,
  fmt,
  groupBy,
  land,
  newGame,
  serialize,
  type AudienceView,
  type GameState,
  type HostReply,
  type Power,
  type SeatView,
  type TurnSubmission,
  type GameConfig,
} from "@amarna/engine";
import { GameLog, GameRunner, ReplayExhaustedError, pressFor, type ISeat, type SeasonFallbacks } from "@amarna/game";
import { AnthropicId, SdkTransport, SimulatedApi, buildSeats, checkJobs, providersFor, type Provider } from "@amarna/llm";
import { catchUpFrames, type SeasonFrame } from "./frames.ts";
import type { FromWorker, Keys, Live, Pending, ToWorker } from "./protocol.ts";
import { choicesOf, fallenSeesAll, handLimitNeeded, newSettings, settingsFromHeader, toConfig, usesModels, type GameSettings, type TableSettings } from "./settings.ts";
import { saveLog } from "./storage.ts";

/** A human seat whose decisions the page makes: the worker asks, the page answers by message. */
class PageSeat implements ISeat {
  readonly label = "Human";
  /** A human may sleep too (item 9+a): ending a turn with a sleep, he is woken by the same triggers as any seat, or by himself. */
  readonly canSleep = true;
  /** Set when the player asks to wake: read once, by the runner's next season. */
  wakeNow = false;
  orders: { view: SeatView; resolve: (s: TurnSubmission) => void } | null = null;
  audience: { view: AudienceView; court: SeatView; resolve: (r: HostReply) => void } | null = null;
  private readonly changed: () => void;
  constructor(changed: () => void) {
    this.changed = changed;
  }
  decide(view: SeatView): Promise<TurnSubmission> {
    // Asked for orders, it is awake: a wish to wake made in the same season is spent.
    this.wakeNow = false;
    return new Promise((resolve) => {
      this.orders = { view, resolve };
      this.changed();
    });
  }
  hostAudience(view: AudienceView, court: SeatView): Promise<HostReply> {
    return new Promise((resolve) => {
      this.audience = { view, court, resolve };
      this.changed();
    });
  }
  wakeRequested(): boolean {
    const w = this.wakeNow;
    this.wakeNow = false;
    return w;
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** "3 of 12 model decisions fell back to scripts this season: Hatti's orders (Anthropic API 400: ...); ..." */
export function fallbackLine(f: SeasonFallbacks): string {
  const cut = (x: string): string => (x.length > 160 ? x.slice(0, 157) + "..." : x);
  const why = f.fallen.slice(0, 3).map((x) => `${x.key} (${cut(x.reason)})`);
  return `${f.fallen.length} of ${f.asked} model decisions fell back to scripts this season: ${why.join("; ")}${f.fallen.length > 3 ? "; and more" : ""}.`;
}

/** The state as the page gets it: without the drawn last season, which nothing shown may read (build order item 6a). */
const forPage = (s: GameState): GameState => ({ ...s, finalSeason: null, finalByCap: false });

export class SessionCore {
  private runner: GameRunner | null = null;
  private settings: GameSettings = newSettings();
  private humans = new Map<Power, PageSeat>();
  private busy = false;
  private auto = false;
  private readOnly = false;
  private delayMs = 400;
  private error: string | null = null;
  private notice: string | null = null;
  private gameId = "";
  private generation = 0;
  private stateVersion = 0;
  private sentVersion = -1;
  private frames: SeasonFrame[] = [];
  private sentFrames = 0;
  private resetPending = false;
  private fallTold = false;
  private fallenToGod = false;
  private abort = new AbortController();
  private queued = false;

  private readonly post: (m: FromWorker) => void;
  constructor(post: (m: FromWorker) => void) {
    this.post = post;
  }

  // ---------------------------------------------------------------- updates to the page

  private catchUp(): void {
    if (this.runner !== null) catchUpFrames(this.frames, this.runner);
  }

  private changed = (): void => {
    this.stateVersion++;
    this.catchUp();
    this.tellFall();
    this.notifySoon();
  };

  /** Sends one update for every change made in the stretch of work before it. */
  private notifySoon(): void {
    if (this.queued) return;
    this.queued = true;
    setTimeout(() => {
      this.queued = false;
      this.notify();
    }, 0);
  }

  private notify(): void {
    const r = this.runner;
    const pending: Pending[] = [];
    for (const [power, seat] of this.humans)
      pending.push({
        power,
        orders: seat.orders !== null ? serialize(SeatViewSchema, seat.orders.view) : null,
        audience: seat.audience !== null ? { view: serialize(AudienceViewSchema, seat.audience.view), court: serialize(SeatViewSchema, seat.audience.court) } : null,
      });
    const stateJson = r !== null && this.stateVersion !== this.sentVersion ? serialize(GameStateSchema, forPage(r.state)) : null;
    if (stateJson !== null) this.sentVersion = this.stateVersion;
    const live: Live = {
      hasRunner: r !== null,
      generation: this.generation,
      stateVersion: this.sentVersion,
      stateJson,
      phase: r?.phase ?? "",
      busy: this.busy,
      auto: this.auto,
      readOnly: this.readOnly,
      ended: r?.state.ended ?? false,
      canPlayOn: r !== null && !this.readOnly && canPlayOn(r.state),
      turn: r?.state.turn ?? 0,
      errors: r === null ? [] : r.errors.slice(-8),
      errorCount: r?.errors.length ?? 0,
      error: this.error,
      notice: this.notice,
      cost: r?.log.totalCost ?? 0,
      costUnknown: r?.log.costUnknown ?? false,
      settings: this.settings,
      config: r?.state.config ?? null,
      seats: r === null ? {} : Object.fromEntries([...r.log.header.seats]),
      snapshots: r?.snapshots.length ?? 0,
      chronicles: r === null ? {} : Object.fromEntries([...r.chronicles]),
      humans: [...this.humans.keys()],
      humansAsleep: r === null ? [] : [...this.humans.keys()].filter((p) => r.state.sleep.tryGet(p)?.asleep === true),
      pending,
      gameId: this.gameId,
      fallenToGod: this.fallenToGod,
      trailAuthors: r === null ? {} : Object.fromEntries(r.state.trails.map((t) => [t.id, r.trailAuthors(t)] as const)),
      fallbacks: r === null ? [] : Array.from({ length: Math.max(0, r.state.turn - 1) }, (_, i) => ({ turn: i + 1, ...r.fallbacksIn(i + 1) })),
    };
    const frames = this.frames.slice(this.resetPending ? 0 : this.sentFrames);
    this.post({ type: "update", live, frames, reset: this.resetPending });
    this.sentFrames = this.frames.length;
    this.resetPending = false;
  }

  // ---------------------------------------------------------------- the fall of the human seats

  /** Once every human seat has fallen, the players are told their game is over (in god view if the table allows it). */
  private tellFall(): void {
    const r = this.runner;
    if (this.fallTold || r === null || this.humans.size === 0) return;
    const humans = [...this.humans.keys()];
    if (!humans.every((p) => r.state.eliminated.includes(p))) return;
    this.fallTold = true;
    const who = humans.map(land).join(" and ");
    if (fallenSeesAll(r.state, humans)) {
      this.fallenToGod = true;
      this.notice = `The kingdom of ${who} has fallen with its capital: your game is over. You watch the rest of the game in god view, seeing everything.`;
    } else this.notice = `The kingdom of ${who} has fallen with its capital: your game is over. You watch the rest of the game with what your kingdom knew when it fell.`;
  }

  // ---------------------------------------------------------------- building a game

  /** The providers of the models in use, each with its own key (held here, in memory, by provider id). */
  private providers(settings: GameSettings, keys: Keys): Provider[] | null {
    const choices = choicesOf(settings);
    if (!choices.usesModels) return null;
    if (settings.simulateApi) {
      const api = new SimulatedApi();
      api.reportUsage = false;
      return providersFor(choices, null, {}, undefined, api);
    }
    const anthropic = (keys[AnthropicId] ?? "").trim();
    return providersFor(choices, anthropic.length > 0 ? new SdkTransport(anthropic) : null, keys);
  }

  private build(settings: GameSettings, state: GameState, keys: Keys): ReturnType<typeof buildSeats> {
    const set = buildSeats(choicesOf(settings), state, this.providers(settings, keys), () => this.runner!.log);
    this.humans.clear();
    const seats = new Dict<Power, ISeat>();
    for (const [p, seat] of set.seats) {
      if (seat.label === "Human") {
        const h = new PageSeat(() => this.changed());
        this.humans.set(p, h);
        seats.set(p, h);
      } else seats.set(p, seat);
    }
    return { ...set, seats };
  }

  private fresh(): void {
    this.stop();
    this.error = null;
    this.notice = null;
    this.frames = [];
    this.sentFrames = 0;
    this.resetPending = true;
    this.generation++;
    this.fallTold = false;
    this.fallenToGod = false;
  }

  private stamp(): string {
    const d = new Date();
    const pad = (n: number): string => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  }

  /** The check at setup: each model's schemas compiled once against its provider, before the game begins. */
  private async check(built: ReturnType<typeof buildSeats>, settings: GameSettings, config: GameConfig): Promise<boolean> {
    if (built.client === null) return true;
    this.notice = "Checking the models with their providers…";
    this.notify();
    try {
      await built.client.check(checkJobs(choicesOf(settings), config), this.abort.signal);
      this.notice = null;
      return true;
    } catch (e) {
      this.notice = null;
      this.error = e instanceof Error ? e.message : String(e);
      this.notify();
      return false;
    }
  }

  async start(settings: GameSettings, keys: Keys): Promise<void> {
    this.fresh();
    this.settings = settings;
    this.readOnly = false;
    const state = newGame(settings.seed, toConfig(settings));
    let built;
    try {
      built = this.build(settings, state, keys);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.notify();
      return;
    }
    // The press first (item 8), so that the check at setup sends the schemas the game will use.
    pressFor(state, built.minds);
    if (!(await this.check(built, settings, state.config))) return;
    this.runner = new GameRunner(state, built.seats, built.minds, built.narrator, { jobs: choicesOf(settings).jobs });
    this.runner.writeChronicles = settings.chronicles;
    this.runner.changed.push(this.changed);
    this.gameId = `game-${settings.seed}-${this.stamp()}`;
    this.busy = true;
    this.notify();
    try {
      await this.runner.prepare(this.abort.signal);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = false;
    }
    await this.save();
    this.changed();
    if (this.humans.size > 0) this.setAuto(true);
  }

  /** Loads a log: replays it fully for the timeline; optionally continues it with live seats. */
  async load(text: string, continuePlay: boolean, keys: Keys, table: TableSettings | null = null): Promise<void> {
    this.fresh();
    let log: GameLog;
    try {
      log = GameLog.fromJsonl(text);
    } catch (e) {
      this.error = `That file is not a game log: ${e instanceof Error ? e.message : String(e)}`;
      this.notify();
      return;
    }
    // A game saved under other rules would not play out the same: say so plainly instead of failing midway.
    const problem = GameRunner.versionProblem(log.header);
    if (problem !== null) {
      this.error = problem;
      this.notify();
      return;
    }
    this.humans.clear();
    this.busy = true;
    this.notify();
    try {
      if (continuePlay) {
        this.settings = settingsFromHeader(log.header, table);
        const built = this.build(this.settings, newGame(log.header.seed, log.header.config), keys);
        if (!(await this.check(built, this.settings, log.header.config))) return;
        this.runner = GameRunner.resume(log, built.seats, built.minds, built.narrator);
        this.runner.changed.push(this.changed);
        this.readOnly = false;
        await this.runner.prepare(this.abort.signal);
        this.notice = "Replaying the saved seasons…";
        // Fast-forward through the logged seasons; live seats take over where the log ends.
        const r = this.runner;
        const recorded = (t: number): boolean => log.decisions.some((d) => d.key === `t${t}/season` || d.key.startsWith(`t${t}/orders/`));
        for (;;) {
          // A table that played on past the age's end plays on again ("An open age").
          if (r.state.ended && log.has(`t${r.state.turn}/play-on`)) await r.playOn();
          if (r.state.ended || !recorded(r.state.turn)) break;
          await r.playTurn(this.abort.signal);
        }
        this.notice = null;
      } else {
        this.settings = settingsFromHeader(log.header, table);
        this.runner = GameRunner.forReplay(log);
        this.runner.changed.push(this.changed);
        this.runner.writeChronicles = log.decisions.some((d) => d.key.startsWith("end/chronicle/"));
        this.readOnly = true;
        await this.runner.prepare(this.abort.signal);
        try {
          while (await this.runner.playTurn(this.abort.signal)) {
            /* the whole log */
          }
        } catch (e) {
          if (!(e instanceof ReplayExhaustedError)) throw e;
          this.notice = `The log ends during ${dateLabel(this.runner.state.turn)}; showing the game up to there.`;
        }
      }
      this.gameId = `game-${log.header.seed}-loaded-${this.stamp()}`;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = false;
    }
    this.changed();
    if (continuePlay && this.humans.size > 0) this.setAuto(true);
  }

  // ---------------------------------------------------------------- playing

  get canPlay(): boolean {
    return this.runner !== null && !this.busy && !this.readOnly && !this.runner.state.ended && !this.auto;
  }

  async step(): Promise<void> {
    const r = this.runner;
    if (r === null || this.busy || this.readOnly || r.state.ended) return;
    this.busy = true;
    this.notify();
    let played = false;
    // Kept now: a new or loaded game replaces the controller (stop), and this step's game is then not the current one.
    const signal = this.abort.signal;
    try {
      await r.playTurn(signal);
      played = true;
    } catch (e) {
      if (!signal.aborted) {
        this.error = e instanceof Error ? e.message : String(e);
        this.auto = false;
      }
    } finally {
      if (this.runner === r) {
        this.busy = false;
        this.changed();
      }
    }
    // The season is shown first; the save (the whole log, to IndexedDB) follows.
    if (played && this.runner === r) {
      await sleep(1);
      await this.save();
    }
  }

  /** Plays on into an open age after the age has ended ("An open age"); the game then never ends by itself. */
  async playOn(budgetUsd: number | null = null): Promise<void> {
    const r = this.runner;
    if (r === null || this.busy || this.readOnly) return;
    // An open age with model-played seats plays on only once the table has set its spending limit by hand, above what
    // the game has spent so far ("An open age").
    if (handLimitNeeded(this.settings)) {
      if (budgetUsd === null || !Number.isFinite(budgetUsd) || budgetUsd <= r.log.totalCost) {
        this.notice = `To play on into an open age, set by hand the spending limit at which the game pauses, above the $${fmt(r.log.totalCost, "0.00")} it has spent.`;
        this.notify();
        return;
      }
      this.settings = { ...this.settings, budgetUsd };
    }
    if (!(await r.playOn())) return;
    this.changed();
    await this.save();
  }

  setAuto(on: boolean): void {
    if (this.auto === on) return;
    this.auto = on;
    this.notify();
    if (on) void this.loop();
  }

  private async loop(): Promise<void> {
    while (this.auto && this.runner !== null && !this.runner.state.ended && !this.readOnly) {
      if (usesModels(this.settings) && this.runner.log.totalCost >= this.settings.budgetUsd) {
        this.notice = `Paused: this game has spent $${fmt(this.runner.log.totalCost, "0.00")}, reaching its budget of $${fmt(this.settings.budgetUsd, "0.00")}. Raise the budget to continue.`;
        this.auto = false;
        break;
      }
      const turn = this.runner.state.turn;
      await this.step();
      if (!this.auto) break;
      // Fallbacks are never silent: past the table's share, the game pauses and says why.
      const f = this.runner?.fallbacksIn(turn);
      const share = this.settings.pauseFallbackShare ?? 0.5;
      if (f !== undefined && share > 0 && f.asked > 0 && f.fallen.length / f.asked > share) {
        this.notice = `Paused: ${fallbackLine(f)} That is more than the ${Math.round(share * 100)}% this table allows, so the game waits for you. Play on with the next season, or change the setup.`;
        this.auto = false;
        break;
      }
      await sleep(this.humans.size > 0 ? 50 : this.delayMs);
    }
    this.auto = false;
    this.notify();
  }

  stop(): void {
    this.auto = false;
    this.abort.abort();
    this.abort = new AbortController();
  }

  async save(): Promise<void> {
    const r = this.runner;
    if (r === null || this.readOnly) return;
    const seats = groupBy([...r.log.header.seats.values()], (x) => x)
      .map(([k, g]) => `${g.length} ${k}`)
      .join(", ");
    const meta = `Seed ${r.state.seed}, ${dateLabel(r.state.turn)}${r.state.ended ? " (ended)" : ""}, ${seats}`;
    await saveLog(this.gameId, meta, r.log.toJsonl());
  }

  // ---------------------------------------------------------------- messages

  async handle(m: ToWorker): Promise<void> {
    switch (m.type) {
      case "start":
        return this.start(m.settings, m.keys);
      case "load":
        return this.load(m.text, m.continuePlay, m.keys, m.table);
      case "step":
        return this.step();
      case "auto":
        return this.setAuto(m.on);
      case "delay":
        this.delayMs = m.ms;
        return;
      case "budget":
        this.settings = { ...this.settings, budgetUsd: this.settings.budgetUsd + m.by };
        this.notice = null;
        return this.notify();
      case "playOn":
        return this.playOn(m.budgetUsd);
      case "stop":
        return this.stop();
      case "clear":
        this.error = null;
        this.notice = null;
        return this.notify();
      case "orders": {
        const seat = this.humans.get(m.power);
        const pending = seat?.orders;
        if (seat === undefined || pending === null || pending === undefined) return;
        seat.orders = null;
        pending.resolve(deserialize<TurnSubmission>(TurnSubmissionSchema, m.json));
        return this.changed();
      }
      case "wake": {
        const seat = this.humans.get(m.power);
        if (seat !== undefined) seat.wakeNow = true;
        return this.changed();
      }
      case "answer": {
        const seat = this.humans.get(m.power);
        const pending = seat?.audience;
        if (seat === undefined || pending === null || pending === undefined) return;
        seat.audience = null;
        pending.resolve(deserialize<HostReply>(HostReplySchema, m.json));
        return this.changed();
      }
      case "stateAt": {
        const st = this.runner?.stateAt(m.turn) ?? null;
        return this.post({ type: "stateAt", id: m.id, json: st === null ? null : serialize(GameStateSchema, forPage(st)) });
      }
      case "export":
        return this.post({ type: "export", id: m.id, name: `${this.gameId}.jsonl`, text: this.runner?.log.toJsonl() ?? "" });
    }
  }
}

