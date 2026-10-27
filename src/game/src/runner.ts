/**
 * Drives the seasons: asks seats and characters for decisions, records every decision in the log under a deterministic
 * key, and hands the results to the engine. Given a log, the same runner replays a game exactly without calling any seat
 * or model.
 */
import {
  AllPowers,
  CURRENT_VERSION,
  Dict,
  GameStateSchema,
  HostReplySchema,
  EnvoyReactionSchema,
  MindReplySchema,
  TurnEngine,
  TurnSubmissionSchema,
  B,
  S,
  Views,
  addLetters,
  asHeard,
  basePrice,
  char,
  clamp,
  cmpNum,
  cmpPower,
  deserialize,
  groupBy,
  idNumber,
  isAlive,
  isBlank,
  max,
  newAudienceRecord,
  newAudienceRound,
  newExchange,
  newGame,
  newSleepState,
  newTurnSubmission,
  requestFor,
  alive,
  serialize,
  sortBy,
  type AudienceRecord,
  type Character,
  type EnvoyReaction,
  type Exchange,
  type GameConfig,
  type GameState,
  type HostReply,
  type MindReply,
  type MindRequest,
  type Order,
  type PendingAudience,
  type Power,
  type Schema,
  type SeatView,
  type TurnSubmission,
  type AudienceView,
} from "@amarna/engine";
import {
  PresentResultSchema,
  newEnvoyContext,
  newMindContext,
  type ChronicleContext,
  type CheckContext,
  type EnvoyContext,
  type ICharacterMind,
  type INarrator,
  type ISeat,
  type MindContext,
  type PresentResult,
} from "./contracts.ts";
import { GameLog, newLogHeader, type LogHeader } from "./log.ts";
import { ScriptLeader } from "./bots/script-leader.ts";
import { ScriptMind } from "./bots/script-mind.ts";
import { TemplateNarrator } from "./bots/template-narrator.ts";

/** A log saved under another version of the rules: it can be neither replayed nor continued. */
export class SaveVersionError extends Error {}

export class ReplayExhaustedError extends Error {
  readonly key: string;
  constructor(key: string) {
    super(`The log has no decision for '${key}'.`);
    this.key = key;
  }
}

/** What a host holding court asleep has chosen so far this season: the letters it sent, and whether it reopens its orders. */
class Court {
  readonly letters: Order[] = [];
  reopen = false;
}

export interface RunnerOptions {
  log?: GameLog | null;
  replay?: GameLog | null;
  strictReplay?: boolean;
  /** Replay a log saved under another rules version anyway (for analysis only: it may diverge). */
  anyVersion?: boolean;
}

export class GameRunner {
  private readonly replay: GameLog | null;
  private readonly strict: boolean;
  /** The script king that stands in when a seat's call fails. It keeps up with every model and file seat (see orders). */
  private readonly fallbackSeat: ScriptLeader;
  private readonly fallbackMind: ICharacterMind = new ScriptMind();

  state: GameState;
  readonly log: GameLog;
  readonly seats: Dict<Power, ISeat>;
  readonly minds: ICharacterMind;
  readonly narrator: INarrator;
  writeChronicles = true;
  prepared = false;

  /** Serialized states: [0] at the start, [k] after turn k. */
  readonly snapshots: string[] = [];
  readonly chronicles = new Dict<Power, string>();
  phase = "Ready";
  readonly errors: string[] = [];
  /** Called whenever the phase changes. */
  readonly changed: (() => void)[] = [];

  /**
   * Called after each phase of a season, with its name ("setup", "t3/begin", "t3/reports", "t3/audiences", "t3/orders",
   * "t3/resolve", "end/chronicles"): the parity check of the TypeScript conversion fingerprints the state there.
   */
  phaseDone: ((phase: string) => void) | null = null;

  constructor(state: GameState, seats: Dict<Power, ISeat>, minds: ICharacterMind, narrator: INarrator, options: RunnerOptions = {}) {
    const replay = options.replay ?? null;
    if (replay !== null && !options.anyVersion) ensureVersion(replay.header);
    this.state = state;
    this.strict = options.strictReplay ?? true;
    this.seats = seats;
    this.minds = minds;
    this.narrator = narrator;
    this.replay = replay;
    this.fallbackSeat = new ScriptLeader(state.seed);
    // Who may sleep: on replay, whoever could in the recorded game; live, the seats that can.
    const sleepers = !state.config.sleepingSeats
      ? []
      : replay !== null
        ? [...replay.header.sleepers]
        : sortBy(
            [...seats.entries()].filter(([, s]) => s.canSleep === true).map(([p]) => p),
            [(p: Power) => p, cmpPower],
          );
    for (const p of sleepers) state.sleep.tryAdd(p, newSleepState());
    this.log = options.log ?? new GameLog();
    this.log.header = newLogHeader({
      seed: state.seed,
      config: state.config,
      seats: new Dict([...seats.entries()].map(([p, s]) => [p, s.label] as const)),
      sleepers,
      minds: minds.label,
      narrator: narrator.label,
    });
  }

  /**
   * Why a log cannot be replayed or continued by this version of the rules, or null when it can. Its decisions were made
   * under other rules, so they would not play out to the same game.
   */
  static versionProblem(header: LogHeader): string | null {
    return header.version === CURRENT_VERSION
      ? null
      : `This game was saved under ${header.version < CURRENT_VERSION ? "an earlier" : "a later"} version of the rules (version ${header.version}) and cannot be replayed by this version.`;
  }

  static forReplay(log: GameLog, anyVersion = false): GameRunner {
    if (!anyVersion) ensureVersion(log.header);
    const state = newGame(log.header.seed, log.header.config);
    const seats = new Dict(AllPowers.map((p) => [p, new ReplaySeat(log.header.seats.tryGet(p) ?? "?") as ISeat] as const));
    return new GameRunner(state, seats, new ReplayMind(log.header.minds), new ReplayNarrator(log.header.narrator), { replay: log, anyVersion });
  }

  /** Continues a saved game: decisions in the log are replayed, then live seats take over. */
  static resume(log: GameLog, seats: Dict<Power, ISeat>, minds: ICharacterMind, narrator: INarrator): GameRunner {
    ensureVersion(log.header);
    // Who may sleep is part of the game: the seats that take over must be the ones that could sleep before.
    if (log.header.config.sleepingSeats) {
      const could = sortBy(log.header.sleepers, [(p: Power) => p, cmpPower]);
      const can = sortBy(
        [...seats.entries()].filter(([, s]) => s.canSleep === true).map(([p]) => p),
        [(p: Power) => p, cmpPower],
      );
      if (could.length !== can.length || could.some((p, i) => p !== can[i]))
        throw new Error(
          `This game was played with sleeping seats for ${could.length === 0 ? "nobody" : could.join(", ")}; ` +
            `continue it with seats that can sleep for exactly those kings (now: ${can.length === 0 ? "none" : can.join(", ")}).`,
        );
    }
    const state = newGame(log.header.seed, log.header.config);
    return new GameRunner(state, seats, minds, narrator, { replay: log, strictReplay: false });
  }

  get isReplay(): boolean {
    return this.replay !== null && this.strict;
  }

  /** The stand-in script king, for tests. */
  get standIn(): ScriptLeader {
    return this.fallbackSeat;
  }

  private setPhase(phase: string): void {
    this.phase = phase;
    for (const f of this.changed) f();
  }

  /** Returns the logged decision when replaying; otherwise produces, records and returns it (as read back from the log). */
  private async recorded<T>(key: string, schema: Schema, produce: () => Promise<T>, fallback: (() => Promise<T>) | null = null): Promise<T> {
    if (this.replay !== null) {
      const logged = this.replay.tryGet<T>(key, schema);
      if (logged !== undefined) {
        this.log.record(key, schema, logged);
        return logged;
      }
      if (this.strict) throw new ReplayExhaustedError(key);
    }

    let value: T;
    try {
      value = await produce();
    } catch (ex) {
      if (fallback === null || (ex instanceof Error && ex.name === "AbortError")) throw ex;
      this.errors.push(`${key}: ${ex instanceof Error ? ex.message : String(ex)}`);
      value = await fallback();
    }
    this.log.record(key, schema, value);
    // Use the round-tripped value so live play and replay match exactly.
    return this.log.tryGet<T>(key, schema)!;
  }

  async prepare(signal?: AbortSignal): Promise<void> {
    if (this.prepared) return;
    this.setPhase("The narrator meets the characters");
    const results = await Promise.all(
      this.state.characters.map(async (c) => {
        const persona = await this.recorded<string>(`setup/persona/${c.id}`, S, () => this.narrator.persona(c, signal), () => Promise.resolve(c.persona));
        return [c, persona] as const;
      }),
    );
    for (const [c, persona] of results) if (!isBlank(persona)) c.persona = persona;
    this.snapshots.push(serialize(GameStateSchema, this.state));
    this.prepared = true;
    this.phaseDone?.("setup");
    this.setPhase("Ready");
  }

  /** Plays one season. Returns false once the game has ended. */
  async playTurn(signal?: AbortSignal): Promise<boolean> {
    if (!this.prepared) await this.prepare(signal);
    const S_ = this.state;
    if (S_.ended) return false;
    const turn = S_.turn;
    const engine = new TurnEngine(S_);

    // With sleeping seats a season can pass with no seat asked at all; mark every season so a replay or a continued game
    // knows how far the log goes.
    if (S_.config.sleepingSeats) await this.recorded<boolean>(`t${turn}/season`, B, () => Promise.resolve(true));

    this.setPhase(`Turn ${turn}: income and arrivals`);
    engine.beginTurn();
    this.phaseDone?.(`t${turn}/begin`);

    this.setPhase(`Turn ${turn}: reports and pitches`);
    await this.fulfil(engine, turn, signal);
    engine.wakeCheck();
    this.phaseDone?.(`t${turn}/reports`);

    this.setPhase(`Turn ${turn}: audiences`);
    await this.audiences(engine, turn, signal);
    this.phaseDone?.(`t${turn}/audiences`);

    this.setPhase(`Turn ${turn}: orders`);
    const subs = await this.orders(turn, signal);
    this.phaseDone?.(`t${turn}/orders`);

    this.setPhase(`Turn ${turn}: resolution`);
    engine.resolve(subs);
    this.snapshots.push(serialize(GameStateSchema, S_));
    this.phaseDone?.(`t${turn}/resolve`);

    if (S_.ended && this.writeChronicles) await this.chronicleAll(signal);
    this.setPhase(S_.ended ? "The game has ended" : "Ready");
    return !S_.ended;
  }

  private async fulfil(engine: TurnEngine, turn: number, signal?: AbortSignal): Promise<void> {
    const requests = [...engine.mindRequests];
    const produce = async (req: MindRequest): Promise<MindReply> => {
      if (req.task === "CheckReport") {
        const subject = char(this.state, req.characterId);
        return { text: await this.narrator.checkReport({ subject, court: requestFor(req), facts: req.facts, turn }, signal), number: 0, swapInventory: false };
      }
      return await this.minds.write(this.context(req, engine, turn), signal);
    };
    const fallback = async (req: MindRequest): Promise<MindReply> => {
      if (req.task === "CheckReport")
        return {
          text: await new TemplateNarrator().checkReport({ subject: char(this.state, req.characterId), court: requestFor(req), facts: req.facts, turn }, signal),
          number: 0,
          swapInventory: false,
        };
      return await this.fallbackMind.write(this.context(req, engine, turn), signal);
    };
    const replies = await Promise.all(
      requests.map((req) =>
        this.recorded<MindReply>(
          `t${turn}/mind/${req.id}`,
          MindReplySchema,
          () => produce(req),
          () => fallback(req),
        ),
      ),
    );
    for (let i = 0; i < requests.length; i++) engine.fulfil(requests[i], replies[i]);
  }

  private context(req: MindRequest, engine: TurnEngine, turn: number): MindContext {
    const S_ = this.state;
    const c = char(S_, req.characterId);
    return newMindContext({
      request: req,
      self: c,
      turn,
      seed: S_.seed,
      trail: engine.trail(req.trailId),
      // Only a pitch names a price, to the court it is made to (a memory summary may be for no court at all).
      basePrice: req.task === "Pitch" ? basePrice(c, requestFor(req)) : 0,
      demand: S_.tasks.filter((t) => t.kind === "Candidates").length + engine.mindRequests.filter((r) => r.task === "Pitch" && r.characterId === c.id).length,
      forgeMinCompetence: S_.config.forgeMinCompetence,
    });
  }

  private async audiences(engine: TurnEngine, turn: number, signal?: AbortSignal): Promise<void> {
    const byHost = sortBy(
      groupBy([...this.state.audiences], (a) => a.host),
      [([k]: [Power, PendingAudience[]]) => k, cmpPower],
    );
    const hostTasks = byHost.map(async ([host, group]) => {
      const records: AudienceRecord[] = [];
      // A sleeping host was woken for its audiences only: its orders stand unless it reopens them, and it may send letters.
      // What it chose so far this season, in its earlier audiences and exchanges, is shown to it at each later one.
      const court = engine.isAsleep(host) ? new Court() : null;
      for (const a of sortBy(group, [(a: PendingAudience) => idNumber(a.id), cmpNum])) records.push(await this.audience(engine, a, turn, court, signal));
      return records;
    });
    const all = sortBy((await Promise.all(hostTasks)).flat(), [(r: AudienceRecord) => idNumber(r.audienceId), cmpNum]);
    for (const record of all) engine.applyAudience(record);
    // A host that held court asleep reopens its orders now if it chose to (it is then asked for orders), or sleeps on.
    engine.courtsHeld();
  }

  private async audience(engine: TurnEngine, a: PendingAudience, turn: number, court: Court | null, signal?: AbortSignal): Promise<AudienceRecord> {
    const S_ = this.state;
    const envoy = char(S_, a.envoyId);
    const key = `t${turn}/aud/${a.id}`;
    // What its own lord owes it, and whether he looks doomed, by public facts: a motive it may weigh against an offer.
    const lord = envoy.employer;
    const backPay = lord !== null ? envoy.backPay.getOrDefault(lord, 0) : 0;
    const doomed = lord !== null && Views.looksDoomed(S_.owner, S_.eliminated, lord);
    const ctx = (soFar: Exchange[], round: number, delivered: string, skim: number, giftTaken = false): EnvoyContext =>
      newEnvoyContext({
        self: envoy,
        sender: a.from,
        host: a.host,
        dispatch: a.dispatch,
        turn,
        seed: S_.seed,
        round,
        maxRounds: S_.config.audienceRounds,
        soFar,
        giftTaken,
        delivered,
        skim,
        backPay,
        employerDoomed: doomed,
        forgeMinCompetence: S_.config.forgeMinCompetence,
      });

    const present = await this.recorded<PresentResult>(
      `${key}/present`,
      PresentResultSchema,
      () => this.minds.present(ctx([], 0, "", 0), signal),
      () => this.fallbackMind.present(ctx([], 0, "", 0), signal),
    );
    present.skim = clamp(present.skim, 0, a.dispatch.gold);

    const record = newAudienceRecord({ audienceId: a.id, delivered: present.speech, skim: present.skim, swapInventory: present.swapInventory });
    const soFar: Exchange[] = [];
    for (let round = 1; round <= S_.config.audienceRounds; round++) {
      const view: AudienceView = engine.buildAudienceView(a, present.speech, present.skim, soFar, round, record.rounds, present.swapInventory);
      if (court !== null) {
        view.ordersStand = true;
        view.reopenChosen = court.reopen;
        view.lettersSent = [...court.letters];
      }
      const seat = Views.for(S_, a.host);
      const host = await this.recorded<HostReply>(
        `${key}/host/${round}`,
        HostReplySchema,
        () => this.seats.get(a.host).hostAudience(view, seat, signal),
        async () => {
          // The script king answers the envoy; marked (and logged) so that, at a court held while the seat's orders stand,
          // it decides nothing for the seat, which is then asked for orders (TurnEngine.courtsHeld).
          const stand = await this.fallbackSeat.hostAudience(view, seat, signal);
          stand.fromFallback = true;
          return stand;
        },
      );
      // What the host says reaches the envoy as any court could read it: its own marks for its copies of tablets, and
      // person ids, become the tablets' and the people's names (as in its letters).
      host.speech = engine.scribe(a.host, host.speech);
      host.bribeAsk = engine.scribe(a.host, host.bribeAsk);
      // Only the seat's own replies send letters or choose about its orders.
      if (court !== null && !host.fromFallback) {
        addLetters(court.letters, host.letters);
        court.reopen = court.reopen || host.reopenOrders;
      }
      // A gift it took at an earlier exchange, as the engine counts one (the first accepted): no later gift is given.
      const giftTaken = record.rounds.some((x) => x.host !== null && x.host.bribe > 0 && x.envoy !== null && x.envoy.acceptBribe);
      const context = ctx([...soFar], round, present.speech, present.skim, giftTaken);
      // The envoy meets only what is said and done to it: the host's letters and its choice about its orders are its own.
      const heard = asHeard(host);
      const reaction = await this.recorded<EnvoyReaction>(
        `${key}/envoy/${round}`,
        EnvoyReactionSchema,
        () => this.minds.react(context, heard, signal),
        () => this.fallbackMind.react(context, heard, signal),
      );
      record.rounds.push(newAudienceRound({ host, envoy: reaction }));
      soFar.push(newExchange({ host: host.speech, envoy: reaction.speech }));
      if (host.end || host.detain || reaction.acceptJob) break;
    }
    return record;
  }

  private async orders(turn: number, signal?: AbortSignal): Promise<Dict<Power, TurnSubmission>> {
    // A sleeping seat is not asked: its units hold and its scheduled orders run (the engine folds them in).
    const S_ = this.state;
    const engine = new TurnEngine(S_);
    const living = alive(S_).filter((p) => !engine.isAsleep(p));
    const views = new Dict(living.map((p) => [p, Views.for(S_, p)] as const));
    // A shadow brain: the stand-in reads every model or file seat's view each season, asleep or awake, so that when a call
    // fails it plays a king who remembers. Its reading changes nothing in the game, so replays stay exact; a strict replay
    // asks no seat and skips it.
    if (!this.isReplay) for (const p of alive(S_).filter((p) => this.seats.get(p).canSleep === true)) this.fallbackSeat.observe(views.tryGet(p) ?? Views.for(S_, p));
    const results = await Promise.all(
      living.map((p) =>
        this.recorded<TurnSubmission>(
          `t${turn}/orders/${p}`,
          TurnSubmissionSchema,
          () => this.seats.get(p).decide(views.get(p), signal),
          async () => {
            // The script king stands in; the seat itself has not seen this season (its digest is kept for it).
            const stand = await this.fallbackSeat.decide(views.get(p), signal);
            stand.fromFallback = true;
            return stand;
          },
        ),
      ),
    );
    return new Dict(living.map((p, i) => [p, results[i]] as const));
  }

  private async chronicleAll(signal?: AbortSignal): Promise<void> {
    const S_ = this.state;
    this.setPhase("The scribes write the annals");
    const powers = sortBy(
      [...new Set([...alive(S_), ...S_.eliminated])],
      [(p: Power) => p, cmpPower],
    );
    const results = await Promise.all(
      powers.map(async (p) => {
        const ctx: ChronicleContext = {
          power: p,
          known: S_.events.filter((e) => e.visibleTo.includes(p)),
          scores: S_.scores.filter((s) => s.power === p),
          winners: [...S_.winners],
          lastTurn: S_.scores.length === 0 ? S_.turn : max(S_.scores, (s) => s.turn),
        };
        const text = await this.recorded<string>(`end/chronicle/${p}`, S, () => this.narrator.chronicle(ctx, signal), () => new TemplateNarrator().chronicle(ctx, signal));
        return [p, text] as const;
      }),
    );
    for (const [p, text] of results) this.chronicles.set(p, text);
    this.phaseDone?.("end/chronicles");
  }

  /** The state at the end of a given turn (0 = start), from the snapshots. */
  stateAt(turn: number): GameState | null {
    return turn >= 0 && turn < this.snapshots.length ? deserialize<GameState>(GameStateSchema, this.snapshots[turn]) : null;
  }
}

function ensureVersion(header: LogHeader): void {
  const problem = GameRunner.versionProblem(header);
  if (problem !== null) throw new SaveVersionError(problem);
}

export class ReplaySeat implements ISeat {
  readonly label: string;
  constructor(label: string) {
    this.label = label;
  }
  decide(): Promise<TurnSubmission> {
    throw new Error("replay seat");
  }
  hostAudience(): Promise<HostReply> {
    throw new Error("replay seat");
  }
}

export class ReplayMind implements ICharacterMind {
  readonly label: string;
  constructor(label: string) {
    this.label = label;
  }
  present(): Promise<PresentResult> {
    throw new Error("replay mind");
  }
  react(): Promise<EnvoyReaction> {
    throw new Error("replay mind");
  }
  write(): Promise<MindReply> {
    throw new Error("replay mind");
  }
}

export class ReplayNarrator implements INarrator {
  readonly label: string;
  constructor(label: string) {
    this.label = label;
  }
  persona(): Promise<string> {
    throw new Error("replay narrator");
  }
  checkReport(): Promise<string> {
    throw new Error("replay narrator");
  }
  chronicle(): Promise<string> {
    throw new Error("replay narrator");
  }
}

