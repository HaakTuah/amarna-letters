/**
 * Drives the seasons: asks seats and characters for decisions, records every decision in the log under a deterministic
 * key, and hands the results to the engine. Given a log, the same runner replays a game exactly without calling any seat
 * or model.
 */
import {
  AllPowers,
  canPlayOn,
  playOn,
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
  type MessageTrail,
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
  plainWords,
  type ChronicleContext,
  type CheckContext,
  type EnvoyContext,
  type ICharacterMind,
  type INarrator,
  type ISeat,
  type MindContext,
  type PresentResult,
} from "./contracts.ts";
import { GameLog, authorKind, newAuthorship, newLogHeader, seasonFallbacks, type Authorship, type LogHeader, type SeasonFallbacks, type TrailAuthors } from "./log.ts";
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

/** One audience as the runner holds it: the envoy, its presentation, the exchanges so far, and whether it has ended. */
interface AudienceRun {
  a: PendingAudience;
  key: string;
  envoy: Character;
  ctx: (soFar: Exchange[], round: number, delivered: string, skim: number, giftTaken?: boolean) => EnvoyContext;
  present: PresentResult;
  record: AudienceRecord;
  soFar: Exchange[];
  done: boolean;
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

  /** The log keys of each message trail's audience and report, as the runner meets them (live and on replay alike). */
  private readonly trailKeys = new Map<string, { audience: string | null; report: string | null }>();

  /**
   * Who wrote each of a message's four parts ("Who wrote it" under Spectator mode): the king's letter (the orders that
   * sent it, or the seat itself for a letter sent from an audience, which only the seat's own reply can send), what the
   * envoy said at the foreign court, what the host answered at each exchange, the envoy's answers, and its report home.
   */
  trailAuthors(t: MessageTrail): TrailAuthors {
    const keys = this.trailKeys.get(t.id) ?? { audience: null, report: null };
    const seat = this.log.header.seats.tryGet(t.from) ?? "";
    const letter = this.log.authorOf(`t${t.turn}/orders/${t.from}`) ?? (seat.length > 0 ? newAuthorship({ kind: authorKind(seat), name: seat }) : null);
    const rounds = t.exchanges.map((_, i) => i + 1);
    return {
      letter,
      said: keys.audience !== null ? this.log.authorOf(`${keys.audience}/present`) : null,
      answered: keys.audience !== null ? rounds.map((r) => this.log.authorOf(`${keys.audience}/host/${r}`)) : [],
      replied: keys.audience !== null ? rounds.map((r) => this.log.authorOf(`${keys.audience}/envoy/${r}`)) : [],
      report: keys.report !== null ? this.log.authorOf(keys.report) : null,
    };
  }

  /** Who plays a character: the minds' label, or the script's for a character they leave to it. */
  private mindOf(c: Character): string {
    return this.minds.authorFor?.(c) ?? this.minds.label;
  }

  /**
   * A season's fallbacks, as the viewer counts them aloud: of the decisions models and file seats were asked for in the
   * season, how many a script made in their place, and why.
   */
  fallbacksIn(turn: number): SeasonFallbacks {
    return seasonFallbacks(this.log, turn);
  }

  private setPhase(phase: string): void {
    this.phase = phase;
    for (const f of this.changed) f();
  }

  /**
   * Returns the logged decision when replaying; otherwise produces, records and returns it (as read back from the log).
   * `who`: the label of whoever produces it, logged as its author; when its call fails and the fallback stands in, the
   * decision is logged as a fallback for it, with the reason, so no fallback is silent.
   */
  private async recorded<T>(key: string, schema: Schema, produce: () => Promise<T>, fallback: (() => Promise<T>) | null = null, who: string | null = null): Promise<T> {
    if (this.replay !== null) {
      const logged = this.replay.tryGet<T>(key, schema);
      if (logged !== undefined) {
        this.log.record(key, schema, logged, this.replay.authorOf(key));
        return logged;
      }
      if (this.strict) throw new ReplayExhaustedError(key);
    }

    let value: T;
    let by: Authorship | null = who !== null ? newAuthorship({ kind: authorKind(who), name: who }) : null;
    try {
      value = await produce();
    } catch (ex) {
      if (fallback === null || (ex instanceof Error && ex.name === "AbortError")) throw ex;
      const reason = ex instanceof Error ? ex.message : String(ex);
      this.errors.push(`${key}: ${reason}`);
      by = newAuthorship({ kind: "fallback", name: who ?? "", reason });
      value = await fallback();
    }
    this.log.record(key, schema, value, by);
    // Use the round-tripped value so live play and replay match exactly.
    return this.log.tryGet<T>(key, schema)!;
  }

  async prepare(signal?: AbortSignal): Promise<void> {
    if (this.prepared) return;
    this.setPhase("The narrator meets the characters");
    const results = await Promise.all(
      this.state.characters.map(async (c) => {
        const persona = await this.recorded<string>(
          `setup/persona/${c.id}`,
          S,
          () => this.narrator.persona(c, signal),
          () => Promise.resolve(c.persona),
          this.narrator.label,
        );
        return [c, persona] as const;
      }),
    );
    for (const [c, persona] of results) if (!isBlank(persona)) c.persona = persona;
    this.snapshots.push(serialize(GameStateSchema, this.state));
    this.prepared = true;
    this.phaseDone?.("setup");
    this.setPhase("Ready");
  }

  /** Plays one season. Returns false once the game has ended (and, on replay, the recorded table did not play on). */
  async playTurn(signal?: AbortSignal): Promise<boolean> {
    if (!this.prepared) await this.prepare(signal);
    const S_ = this.state;
    // A replay or a continued game plays on where the recorded table chose to ("An open age").
    if (S_.ended && !(this.replay?.has(`t${S_.turn}/play-on`) === true && (await this.playOn()))) return false;
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

    // The chronicles are of the age: written when it ends, and not again if the table plays on into an open age.
    if (S_.ended && this.writeChronicles && this.chronicles.size === 0) await this.chronicleAll(signal);
    this.setPhase(S_.ended ? "The game has ended" : "Ready");
    // On replay, a game the recorded table played on past the age's end goes on.
    return !S_.ended || this.replay?.has(`t${turn}/play-on`) === true;
  }

  /**
   * Plays on after the age has ended, into an open age with no end ("An open age" under Victory): the winners stay
   * recorded, and the choice goes into the log so a replay plays on too. False when the age cannot be played on (it has
   * not ended, or only one kingdom is left).
   */
  async playOn(): Promise<boolean> {
    const S_ = this.state;
    if (!canPlayOn(S_)) return false;
    await this.recorded<boolean>(`t${S_.turn}/play-on`, B, () => Promise.resolve(true));
    playOn(S_);
    this.setPhase("Ready");
    return true;
  }

  private async fulfil(engine: TurnEngine, turn: number, signal?: AbortSignal): Promise<void> {
    const requests = [...engine.mindRequests];
    for (const req of requests)
      if (req.trailId !== null && req.task !== "CheckReport") {
        const k = this.trailKeys.get(req.trailId) ?? { audience: null, report: null };
        k.report = `t${turn}/mind/${req.id}`;
        this.trailKeys.set(req.trailId, k);
      }
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
          req.task === "CheckReport" ? this.narrator.label : this.mindOf(char(this.state, req.characterId)),
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
      // A sleeping host was woken for its audiences only: its orders stand unless it reopens them, and it may send letters.
      // What it chose so far this season, in its earlier audiences and exchanges, is shown to it at each later one.
      const court = engine.isAsleep(host) ? new Court() : null;
      const runs: AudienceRun[] = [];
      for (const a of sortBy(group, [(a: PendingAudience) => idNumber(a.id), cmpNum])) runs.push(await this.openAudience(a, turn, signal));
      const seat = this.seats.get(host);
      // Envoys the king's standing answers cover are answered first, for it, in one exchange each.
      for (const r of runs) if (r.a.answer !== null) await this.answered(engine, r, turn, court, signal);
      // A seat that answers its whole court in one call ("One call per wake-up") is asked once for each exchange, every
      // envoy still before it together; any other answers each audience in turn, both its exchanges before the next.
      if (seat.holdCourt !== undefined) {
        for (let round = 1; round <= this.state.config.audienceRounds; round++) {
          const open = runs.filter((r) => !r.done);
          if (open.length === 0) break;
          const views = open.map((r) => this.audienceView(engine, r, round, court));
          const seen = Views.for(this.state, host);
          let batch: Promise<(HostReply | null)[]> | null = null;
          const replies: HostReply[] = [];
          for (let i = 0; i < open.length; i++)
            replies.push(
              await this.hostReply(open[i], round, views[i], seen, signal, async () => {
                batch ??= seat.holdCourt!(views, seen, signal);
                const reply = (await batch!)[i] ?? null;
                if (reply === null) throw new Error(`the reply to the court left out the envoy ${views[i].envoy.id}`);
                return reply;
              }),
            );
          for (let i = 0; i < open.length; i++) await this.exchange(engine, open[i], round, replies[i], court, signal);
        }
      } else
        for (const r of runs)
          for (let round = 1; round <= this.state.config.audienceRounds && !r.done; round++) {
            const view = this.audienceView(engine, r, round, court);
            const seen = Views.for(this.state, host);
            const reply = await this.hostReply(r, round, view, seen, signal, () => seat.hostAudience(view, seen, signal));
            await this.exchange(engine, r, round, reply, court, signal);
          }
      return runs.map((r) => r.record);
    });
    const all = sortBy((await Promise.all(hostTasks)).flat(), [(r: AudienceRecord) => idNumber(r.audienceId), cmpNum]);
    for (const record of all) engine.applyAudience(record);
    // A host that held court asleep reopens its orders now if it chose to (it is then asked for orders), or sleeps on.
    engine.courtsHeld();
  }

  /** An audience begins: the envoy presents its lord's message. */
  private async openAudience(a: PendingAudience, turn: number, signal?: AbortSignal): Promise<AudienceRun> {
    const S_ = this.state;
    const envoy = char(S_, a.envoyId);
    const key = `t${turn}/aud/${a.id}`;
    const keys = this.trailKeys.get(a.dispatch.trailId) ?? { audience: null, report: null };
    keys.audience = key;
    this.trailKeys.set(a.dispatch.trailId, keys);
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
      this.mindOf(envoy),
    );
    present.skim = clamp(present.skim, 0, a.dispatch.gold);
    const record = newAudienceRecord({ audienceId: a.id, delivered: present.speech, skim: present.skim, swapInventory: present.swapInventory });
    return { a, key, envoy, ctx, present, record, soFar: [], done: false };
  }

  /**
   * An envoy a standing answer of the host covers: the engine answers him as the answer decided, and the host's phrasing
   * call words it (the plain clauses if it has none, or the call fails). The king is not asked, and the audience ends.
   */
  private async answered(engine: TurnEngine, r: AudienceRun, turn: number, court: Court | null, signal?: AbortSignal): Promise<void> {
    const a = r.a;
    const seat = this.seats.get(a.host);
    const view = this.audienceView(engine, r, 1, court);
    const reply = await this.recorded<HostReply>(
      `${r.key}/host/1`,
      HostReplySchema,
      async () => {
        const x = engine.answerReply(a, view.goldWeighed);
        const clauses = engine.answerClauses(a, view.goldWeighed);
        x.speech = plainWords(clauses);
        if (seat.phrase !== undefined)
          try {
            const words = await seat.phrase({ key: r.key, turn, host: a.host, from: a.from, envoy: r.envoy.name, clauses }, signal);
            if (words.trim().length > 0) x.speech = words;
          } catch (ex) {
            if (ex instanceof Error && ex.name === "AbortError") throw ex;
            this.errors.push(`${r.key}/phrase: ${ex instanceof Error ? ex.message : String(ex)}`);
          }
        return x;
      },
      null,
      `${seat.label}, standing answer`,
    );
    await this.exchange(engine, r, 1, reply, court, signal);
  }

  /** What the host has before it at one exchange of an audience. */
  private audienceView(engine: TurnEngine, r: AudienceRun, round: number, court: Court | null): AudienceView {
    const view: AudienceView = engine.buildAudienceView(r.a, r.present.speech, r.present.skim, r.soFar, round, r.record.rounds, r.present.swapInventory);
    if (court !== null) {
      view.ordersStand = true;
      view.reopenChosen = court.reopen;
      view.lettersSent = [...court.letters];
    }
    return view;
  }

  /** The host's answer at one exchange, recorded under its own key, or the script king's if the seat's call fails. */
  private hostReply(r: AudienceRun, round: number, view: AudienceView, seen: SeatView, signal: AbortSignal | undefined, produce: () => Promise<HostReply>): Promise<HostReply> {
    return this.recorded<HostReply>(
      `${r.key}/host/${round}`,
      HostReplySchema,
      produce,
      async () => {
        // The script king answers the envoy; marked (and logged) so that, at a court held while the seat's orders stand,
        // it decides nothing for the seat, which is then asked for orders (TurnEngine.courtsHeld).
        const stand = await this.fallbackSeat.hostAudience(view, seen, signal);
        stand.fromFallback = true;
        return stand;
      },
      this.seats.get(r.a.host).label,
    );
  }

  /** The host's answer reaches the envoy, and the envoy answers it; the audience ends when either ends it. */
  private async exchange(engine: TurnEngine, r: AudienceRun, round: number, host: HostReply, court: Court | null, signal?: AbortSignal): Promise<void> {
    const a = r.a;
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
    const giftTaken = r.record.rounds.some((x) => x.host !== null && x.host.bribe > 0 && x.envoy !== null && x.envoy.acceptBribe);
    const context = r.ctx([...r.soFar], round, r.present.speech, r.present.skim, giftTaken);
    // The envoy meets only what is said and done to it: the host's letters and its choice about its orders are its own.
    const heard = asHeard(host);
    const reaction = await this.recorded<EnvoyReaction>(
      `${r.key}/envoy/${round}`,
      EnvoyReactionSchema,
      () => this.minds.react(context, heard, signal),
      () => this.fallbackMind.react(context, heard, signal),
      this.mindOf(r.envoy),
    );
    r.record.rounds.push(newAudienceRound({ host, envoy: reaction }));
    r.soFar.push(newExchange({ host: host.speech, envoy: reaction.speech }));
    if (host.end || host.detain || reaction.acceptJob) r.done = true;
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
          this.seats.get(p).label,
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
        const text = await this.recorded<string>(`end/chronicle/${p}`, S, () => this.narrator.chronicle(ctx, signal), () => new TemplateNarrator().chronicle(ctx, signal), this.narrator.label);
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

