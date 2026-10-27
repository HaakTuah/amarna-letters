/**
 * The one game this tab is playing or watching, held in the engine's worker: the runner, the human seats (answered from the
 * page), autoplay and autosave to IndexedDB. The page's own choices (whose eyes, which season) stay in the page.
 */
import {

  AudienceViewSchema,
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
} from "@amarna/engine";
import { GameLog, GameRunner, ReplayExhaustedError, type ISeat } from "@amarna/game";
import { FetchTransport, SimulatedApi, buildSeats, type ApiTransport } from "@amarna/llm";
import { catchUpFrames, type SeasonFrame } from "./frames.ts";
import type { FromWorker, Live, Pending, ToWorker } from "./protocol.ts";
import { choicesOf, fallenSeesAll, newSettings, settingsFromHeader, toConfig, usesModels, type GameSettings } from "./settings.ts";
import { saveLog } from "./storage.ts";

/** A human seat whose decisions the page makes: the worker asks, the page answers by message. */
class PageSeat implements ISeat {
  readonly label = "Human";
  orders: { view: SeatView; resolve: (s: TurnSubmission) => void } | null = null;
  audience: { view: AudienceView; court: SeatView; resolve: (r: HostReply) => void } | null = null;
  private readonly changed: () => void;
  constructor(changed: () => void) {
    this.changed = changed;
  }
  decide(view: SeatView): Promise<TurnSubmission> {
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
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

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
    const stateJson = r !== null && this.stateVersion !== this.sentVersion ? serialize(GameStateSchema, r.state) : null;
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
      turn: r?.state.turn ?? 0,
      errors: r === null ? [] : r.errors.slice(-8),
      errorCount: r?.errors.length ?? 0,
      error: this.error,
      notice: this.notice,
      cost: r?.log.totalCost ?? 0,
      settings: this.settings,
      config: r?.state.config ?? null,
      seats: r === null ? {} : Object.fromEntries([...r.log.header.seats]),
      snapshots: r?.snapshots.length ?? 0,
      chronicles: r === null ? {} : Object.fromEntries([...r.chronicles]),
      humans: [...this.humans.keys()],
      pending,
      gameId: this.gameId,
      fallenToGod: this.fallenToGod,
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

  private transport(settings: GameSettings, apiKey: string | null): ApiTransport | null {
    if (settings.simulateApi) {
      const api = new SimulatedApi();
      api.reportUsage = false;
      return api;
    }
    return usesModels(settings) && apiKey ? new FetchTransport(apiKey.trim()) : null;
  }

  private build(settings: GameSettings, state: GameState, apiKey: string | null): ReturnType<typeof buildSeats> {
    const set = buildSeats(choicesOf(settings), state, this.transport(settings, apiKey), () => this.runner!.log);
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

  async start(settings: GameSettings, apiKey: string | null): Promise<void> {
    this.fresh();
    this.settings = settings;
    this.readOnly = false;
    const state = newGame(settings.seed, toConfig(settings));
    let built;
    try {
      built = this.build(settings, state, apiKey);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.notify();
      return;
    }
    this.runner = new GameRunner(state, built.seats, built.minds, built.narrator);
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
  async load(text: string, continuePlay: boolean, apiKey: string | null): Promise<void> {
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
        this.settings = settingsFromHeader(log.header);
        const built = this.build(this.settings, newGame(log.header.seed, log.header.config), apiKey);
        this.runner = GameRunner.resume(log, built.seats, built.minds, built.narrator);
        this.runner.changed.push(this.changed);
        this.readOnly = false;
        await this.runner.prepare(this.abort.signal);
        this.notice = "Replaying the saved seasons…";
        // Fast-forward through the logged seasons; live seats take over where the log ends.
        const r = this.runner;
        while (!r.state.ended && log.decisions.some((d) => d.key === `t${r.state.turn}/season` || d.key.startsWith(`t${r.state.turn}/orders/`)))
          await r.playTurn(this.abort.signal);
        this.notice = null;
      } else {
        this.settings = settingsFromHeader(log.header);
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
      await this.step();
      if (!this.auto) break;
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
        return this.start(m.settings, m.apiKey);
      case "load":
        return this.load(m.text, m.continuePlay, m.apiKey);
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
        return this.post({ type: "stateAt", id: m.id, json: st === null ? null : serialize(GameStateSchema, st) });
      }
      case "export":
        return this.post({ type: "export", id: m.id, name: `${this.gameId}.jsonl`, text: this.runner?.log.toJsonl() ?? "" });
    }
  }
}

