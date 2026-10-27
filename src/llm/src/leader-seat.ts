/**
 * A king played by a model. It receives exactly the seat view every seat receives, keeps its own journal of past seasons
 * (its notes, audiences and orders, and its own summary of older seasons), and answers with structured orders that the
 * engine validates like anyone else's. The asker is the Anthropic API, or a file exchange for a file seat, which then sees
 * exactly the same text.
 */
import {
  SeasonsPerYear,
  describe,
  distinct,
  groupBy,
  newTurnSubmission,
  type AudienceView,
  type TabletView,
  type GameConfig,
  type HostReply,
  type Power,
  type SeatView,
  type TurnSubmission,
} from "@amarna/engine";
import { newAudit, plainWords, type ISeat, type PhraseRequest } from "@amarna/game";
import type { CallSpec, JsonAsker } from "./client.ts";
import { LeaderJournal } from "./journal.ts";
import {
  NewPlan,
  RoutineCourtNote,
  RoutineCourtNoteAfterCounsel,
  alertStakes,
  alertsReply,
  answerDiffer,
  backstop,
  courtStakes,
  ordersCommit,
  ordersDiffer,
  ordersStakes,
  passedByEngine,
  planDue,
  planMark,
  planReply,
  routineCourt,
  type KingRungs,
  type PlanMark,
} from "./king-ladder.ts";
import { fieldsDiffer } from "./ladder.ts";
import { ModelIds, OutputCaps } from "./models.ts";
import { Parse } from "./parse.ts";
import { audience, courtBrief, identity, ordersLine, ordersStandAtCourt, realmBrief, situation, sleepLine, tabletBrief, tabletLine } from "./prompts.ts";
import { leaderRules } from "./rules.ts";
import { Replies, Schemas, type JsonObject } from "./schemas.ts";
import { Sb, joinS } from "./text.ts";

/** The log key of one exchange of an audience: each answer is logged under it, whatever call made it. */
const courtKey = (v: AudienceView): string => `t${v.turn}/aud/${v.audienceId}/host/${v.round}`;

/** The fixed part of every phrasing call: what the job is, shared by every king (and cached). */
const PhrasingSystem =
  "You word the answers of a Great King of the Late Bronze Age to the envoys at his court, in the voice of the Amarna letters: courteous, formal, brief. Each answer was decided before: you only put it into his words. Reply with the reply tool.";

export class LlmLeaderSeat implements ISeat {
  private readonly journalOf = new LeaderJournal();
  readonly label: string;
  readonly canSleep = true;
  private readonly power: Power;
  private readonly client: JsonAsker;
  private readonly model: string;
  private readonly effort: string;
  private readonly primer: boolean;
  private readonly config: GameConfig;
  /** The small model that words its standing answers; null words them as the plain clauses (a file seat). */
  private readonly phrasing: string | null;
  /** Its ladder ("Minds follow what is at stake"); null for a file seat or local agent, whose own mind decides everything. */
  private readonly rungs: KingRungs | null;
  /** Seasons its orders have waited for a call the budget could not pay. */
  private waited = 0;
  /** The rung that took each audience at its first exchange, so that the same mind answers it to the end. */
  private readonly courtRung = new Map<string, "small" | "large">();
  /** When its plan was set down, and why its own mind last asked for a new one. */
  private planAt: PlanMark | null = null;
  private planAsked = "";
  /** Standing answers a plan left that have not yet gone out with orders (the orders waited, or their call failed). */
  private planAnswers: { answers: TurnSubmission["answers"]; cancel: string[] } | null = null;
  /** Reads light alerts while it sleeps; set only for a king with a small rung. */
  readAlerts?: (view: SeatView, alerts: { line: string; text: string }[], signal?: AbortSignal) => Promise<boolean>;

  constructor(
    power: Power,
    client: JsonAsker,
    model: string,
    effort: string,
    primer: boolean,
    config: GameConfig,
    label: string | null = null,
    phrasing: string | null = null,
    rungs: KingRungs | null = null,
  ) {
    this.phrasing = phrasing;
    this.rungs = rungs;
    if (rungs !== null && rungs.small !== null) this.readAlerts = (view, alerts, signal) => this.lightAlerts(view, alerts, signal);
    this.power = power;
    this.client = client;
    this.model = model;
    this.effort = effort;
    this.primer = primer;
    this.config = config;
    this.label = label ?? `${ModelIds.display(model)} leader`;
  }

  /** The king's private record, as its requests show it. */
  get journal(): LeaderJournal {
    return this.journalOf;
  }

  /** The rulebook: the table's settings, with the age open once the view says so (the table may play on past its end). */
  private shared(view: SeatView): string {
    return leaderRules(this.primer, view.openAge === this.config.openAge ? this.config : { ...this.config, openAge: view.openAge });
  }

  /** The orders request for this view, as the king's record now stands (the measure of call size reads it too). */
  ordersCall(view: SeatView): CallSpec {
    const user = new Sb();
    user.appendLine(situation(view, this.journalOf.tabletsRead));
    user.appendLine(this.journalOf.forOrders());
    user.appendLine(ordersLine(view));
    return {
      key: `t${view.turn}/orders/${this.power}`,
      turn: view.turn,
      role: `leader:${this.power}`,
      model: this.model,
      sharedSystem: this.shared(view),
      seatSystem: identity(this.power),
      user: user.toString(),
      schema: this.rungs?.planning != null ? Replies.leaderOrders(this.config).extend({ new_plan: NewPlan }) : Replies.leaderOrders(this.config),
      effort: this.effort,
      maxTokens: OutputCaps.orders,
    };
  }

  async decide(view: SeatView, signal?: AbortSignal): Promise<TurnSubmission> {
    const plan = (await this.planIfDue(view, signal)) ?? this.planAnswers;
    this.planAnswers = plan;
    const spec = this.ordersCall(view);
    let json: JsonObject;
    if (this.rungs === null) json = await this.client.askJson(spec, signal);
    else {
      const r = this.rungs;
      const c = await r.ladder.climb(
        {
          spec,
          small: r.small,
          large: this.model,
          start: r.plays,
          scriptMay: true,
          stakes: ordersStakes(view, this.waited),
          keys: [spec.key],
          commits: (j) => ordersCommit(j, view),
          differ: ordersDiffer,
        },
        signal,
      );
      if (c.json === null) {
        // The budget cannot pay for its orders this season: what stands is carried out (its schedule and standing orders),
        // its units hold, and it is asked again next season, its orders worth more for the wait. It has not seen the
        // season, so nothing joins its record.
        this.waited++;
        return newTurnSubmission({ fromFallback: true });
      }
      json = c.json;
      if (c.counsel.length > 0) this.journalOf.thought(view.turn, `Counsel you took: ${c.counsel}`);
    }
    this.waited = 0;
    const sub = Parse.orders(json);
    if (plan !== null) {
      sub.answers = [...plan.answers, ...sub.answers];
      sub.cancelAnswers = [...plan.cancel, ...sub.cancelAnswers];
      this.planAnswers = null;
    }
    this.planAsked = typeof json.new_plan === "string" ? json.new_plan : "";
    this.journalOf.record(view.turn, sub);
    this.journalOf.readTablets(view.tablets.map((t) => t.tabletId));
    return sub;
  }

  /**
   * Planning ("Every model is the table's choice"): when it is on, a strong model writes the king's plan into his record at
   * the start, once a year, when something large happens, and when the king asks, from a digest of the year (his record and
   * his realm in brief), never the whole request; it leaves standing answers with the plan. A plan the budget cannot pay
   * waits, as orders do; a failed call leaves the plan as it was.
   */
  private async planIfDue(view: SeatView, signal?: AbortSignal): Promise<{ answers: TurnSubmission["answers"]; cancel: string[] } | null> {
    const r = this.rungs;
    if (r === null || r.planning === null) return null;
    const why = planDue(this.planAt, view, this.planAsked, SeasonsPerYear);
    if (why === null) return null;
    const user = new Sb();
    user.appendLine(`SEASON: turn ${view.turn}. You set down your plan for the seasons ahead (${why === "the first plan" ? "your first" : "anew"}), from your record and your realm as they stand.`);
    user.append(realmBrief(view));
    user.appendLine(this.journalOf.forOrders());
    user.appendLine(
      "Write your plan: your aims, your friends and enemies, what to do in the seasons ahead and what to watch for. You play each season by it, and may ask for it to be written anew. Leave standing answers with it for the envoys you expect.",
    );
    const spec: CallSpec = {
      key: `t${view.turn}/plan/${this.power}`,
      turn: view.turn,
      role: `plan:${this.power}`,
      model: r.planning,
      sharedSystem: this.shared(view),
      seatSystem: identity(this.power),
      user: user.toString(),
      schema: planReply(),
      effort: this.effort,
      maxTokens: OutputCaps.orders,
    };
    try {
      const c = await r.ladder.climb(
        { spec, small: null, large: r.planning, start: "large", scriptMay: true, stakes: { kind: "plan", moved: 0.5 }, keys: [spec.key], differ: () => 0 },
        signal,
      );
      if (c.json === null) return null;
      this.journalOf.setPlan(view.turn, String(c.json.plan ?? ""));
      this.planAt = planMark(view);
      this.planAsked = "";
      return { answers: Parse.answers(c.json), cancel: Parse.cancelAnswers(c.json) };
    } catch (ex) {
      if (ex instanceof Error && ex.name === "AbortError") throw ex;
      return null;
    }
  }

  /**
   * Light alerts ("Light alerts go to the cheaper model too"): the small rung, playing the king from his record, reads the
   * news that reached him while he sleeps against his plan, notes what it makes of it in his record, and wakes his own
   * mind whenever anything might need new orders, erring toward waking. What the budget cannot pay waits in his digest.
   */
  async lightAlerts(view: SeatView, alerts: { line: string; text: string }[], signal?: AbortSignal): Promise<boolean> {
    const r = this.rungs!;
    const user = new Sb();
    user.appendLine(`SEASON: turn ${view.turn}. You sleep; your orders stand. This news reached you.`);
    user.append(realmBrief(view));
    user.appendLine("NEWS THAT REACHED YOU THIS SEASON:");
    for (const a of alerts) user.appendLine(`- ${a.text}`);
    user.appendLine(this.journalOf.forAudience());
    user.appendLine(
      "Read the news against your plan and your record. Note what you make of it. Wake (wake true) if anything in it may need new orders from you this season; when in doubt, wake. Otherwise your orders stand and you sleep on.",
    );
    const spec: CallSpec = {
      key: `t${view.turn}/alerts/${this.power}`,
      turn: view.turn,
      role: `alerts:${this.power}`,
      model: r.small!,
      sharedSystem: this.shared(view),
      seatSystem: identity(this.power),
      user: user.toString(),
      schema: alertsReply(),
      effort: "low",
      maxTokens: OutputCaps.character,
    };
    const c = await r.ladder.climb(
      {
        spec,
        small: r.small,
        large: this.model,
        start: "small",
        scriptMay: true,
        stakes: alertStakes(alerts.length),
        keys: [spec.key],
        differ: (a, b) => fieldsDiffer(a, b, ["wake"]),
      },
      signal,
    );
    if (c.json === null) return false;
    if (c.counsel.length > 0) this.journalOf.thought(view.turn, `Counsel you took: ${c.counsel}`);
    this.journalOf.thought(view.turn, `News reached you while you slept (${joinS("; ", alerts.map((a) => a.line))}); you noted: ${String(c.json.notes ?? "")}`);
    return c.json.wake === true;
  }

  /** What a king has before it as it holds court: how it slept, its realm and news, its tablets and its record. */
  private courtOpening(user: Sb, first: AudienceView, court: SeatView, from: readonly Power[]): void {
    // Like every request to a king that sleeps, it opens with how long the king slept and what woke it.
    const woke = sleepLine(court, false, first.ordersStand && first.reopenChosen);
    if (woke.length > 0) user.appendLine(woke);
    // A king woken for its audiences only (its orders stand) reads its treasury in its realm in brief.
    user.appendLine(first.ordersStand ? `SEASON: turn ${first.turn}. You hold court.` : `SEASON: turn ${first.turn}. You hold court. Treasury ${court.gold} shekels by your ledger.`);
    const lands = groupBy(court.owner, ([, o]) => o)
      .filter(([o]) => o !== null)
      .map(([o, g]) => `${o} ${g.length}`);
    user.appendLine(`Lands now: ${joinS("; ", lands)}.`);
    // What has reached the court this season, so that the host does not speak to an envoy against its own news.
    user.append(courtBrief(court, first.ordersStand));
    // The tablets that concern the envoys' courts in full; the rest of the archive by their opening words.
    const concerns = (t: TabletView): boolean => from.some((p) => t.seals.includes(p) || t.proposedBy === p || t.partner === p);
    if (court.tablets.length > 0)
      user.appendLine(
        `Tablets you hold (in full those that bear the seal of ${from.length === 1 ? "the envoy's court" : "an envoy's court"}, the others by their opening words): ` +
          joinS(" | ", court.tablets.map((t) => (concerns(t) ? tabletLine(t) : tabletBrief(t)))),
      );
    user.appendLine(this.journalOf.forAudience());
  }

  /** The request for one exchange of an audience, as the king's record now stands. */
  audienceCall(view: AudienceView, court: SeatView): CallSpec {
    const user = new Sb();
    this.courtOpening(user, view, court, [view.from]);
    user.appendLine(audience(view));
    return {
      key: `t${view.turn}/aud/${view.audienceId}/host/${view.round}`,
      turn: view.turn,
      role: `host:${this.power}`,
      model: this.model,
      sharedSystem: this.shared(court),
      seatSystem: identity(this.power),
      user: user.toString(),
      // With its orders standing it may also send letters and reopen its orders. It is asked only what applies.
      schema: Replies.hostReply(this.config, view),
      effort: this.effort === "high" ? "medium" : "low",
      maxTokens: OutputCaps.audience,
    };
  }

  /**
   * The request for one exchange of every audience still open at the king's court, in one call ("One call per wake-up").
   * Its schema is the same at every court of the game, so the fixed part of the request stays cached.
   */
  courtCall(views: readonly AudienceView[], court: SeatView, routine = false): CallSpec {
    const first = views[0];
    const user = new Sb();
    this.courtOpening(user, first, court, distinct(views.map((v) => v.from)));
    user.appendLine(
      views.length === 1
        ? "ONE ENVOY STANDS BEFORE YOU. Answer him under answers, by his id."
        : `${views.length} ENVOYS STAND BEFORE YOU. Answer each of them under answers, by his id, one answer for each; each hears only what you say to him.`,
    );
    for (const v of views) {
      user.appendLine();
      user.append(audience(v, true));
    }
    if (first.ordersStand && !routine) {
      user.appendLine();
      user.append(ordersStandAtCourt(first));
    }
    return {
      key: `t${first.turn}/court/${this.power}/${first.round}`,
      turn: first.turn,
      role: `host:${this.power}`,
      model: this.model,
      sharedSystem: this.shared(court),
      seatSystem: identity(this.power),
      user: user.toString(),
      schema: Replies.courtReply(this.config, first.ordersStand, first.reopenChosen),
      effort: this.effort === "high" ? "medium" : "low",
      maxTokens: Math.min(OutputCaps.orders, OutputCaps.court + OutputCaps.courtPerEnvoy * (views.length - 1)),
    };
  }

  /** Only what the king was asked at this exchange stands in its answer (a file seat's reply may carry any field). */
  private settle(view: AudienceView, reply: HostReply): HostReply {
    // Letters and reopening mean something only while its orders stand; at any other audience the reply carries none.
    if (!view.ordersStand) {
      reply.letters.length = 0;
      reply.reopenOrders = false;
    }
    const asked = Schemas.asksOf(view);
    if (!asked.giftOpen) {
      reply.bribe = 0;
      reply.bribeAsk = "";
    }
    if (!asked.tabletToSeal) reply.sealProposal = false;
    if (asked.lastExchange) reply.end = false;
    if (asked.reopenChosen) reply.reopenOrders = false;
    return reply;
  }

  async hostAudience(view: AudienceView, court: SeatView, signal?: AbortSignal): Promise<HostReply> {
    const json = await this.client.askJson(this.audienceCall(view, court), signal);
    const reply = this.settle(view, Parse.host(json));
    this.journalOf.audience(view.turn, view.from, view.envoy.name, reply.speech, reply.letters.map(describe));
    // What it wrote in its ledger stays in its own record: the reply that the engine and the envoy see carries none of it.
    this.journalOf.writeLedger(view.turn, Parse.ledger(json));
    return reply;
  }

  /**
   * The phrasing call of a standing answer: a small model words what the answer decided, from its clauses and the king's
   * voice, without the king's record; the cheapest call there is. A seat with no phrasing model has the clauses read out.
   */
  phraseCall(req: PhraseRequest): CallSpec | null {
    if (this.phrasing === null) return null;
    return {
      key: `${req.key}/phrase`,
      turn: req.turn,
      role: `phrase:${this.power}`,
      model: this.phrasing,
      sharedSystem: PhrasingSystem,
      seatSystem: identity(this.power),
      user: `${req.envoy}, envoy of ${req.from}, stands before you. Your answer, decided already: ${joinS("; ", req.clauses)}. Word it as you would speak it to him, in your own voice, in one to three sentences: say nothing that is not in the answer, and promise nothing more.`,
      schema: Replies.phrase(),
      effort: "low",
      maxTokens: OutputCaps.phrase,
    };
  }

  async phrase(req: PhraseRequest, signal?: AbortSignal): Promise<string> {
    const spec = this.phraseCall(req);
    if (spec === null) return plainWords(req.clauses);
    return Parse.field(await this.client.askJson(spec, signal), "speech");
  }

  /**
   * The king holds court ("One call per wake-up"). With a small rung, routine audiences go to it first ("Routine audiences
   * are answered by a cheaper model"): those of a king whose orders stand (it serves sleeping kings), or of every king the
   * small rung plays. The engine passes to the king's own mind by itself whatever it can see matters (passedByEngine); the
   * small rung answers the rest in one call and may leave any envoy to the king's own mind, which then answers those, and
   * the others, in one call of its own. An audience stays with the rung that took its first exchange.
   */
  async holdCourt(views: AudienceView[], court: SeatView, signal?: AbortSignal): Promise<(HostReply | null)[]> {
    const r = this.rungs;
    const why = new Map<string, string>();
    const routine = (v: AudienceView): boolean => {
      const known = this.courtRung.get(v.audienceId);
      if (known !== undefined) return known === "small";
      if (r === null || r.small === null || r.small === this.model || !(v.ordersStand || r.plays === "small")) return false;
      const passed = passedByEngine(v, court);
      if (passed !== null) why.set(v.audienceId, `passed up by the engine: ${passed}`);
      return passed === null;
    };
    const low = views.filter(routine);
    const out = new Map<string, HostReply | null>();
    const failed = (ex: unknown): void => {
      if (ex instanceof Error && ex.name === "AbortError") throw ex;
    };
    if (low.length > 0)
      try {
        const answered = await this.routineCourt(low, court, why, signal);
        for (const [id, reply] of answered) out.set(id, reply);
      } catch (ex) {
        // A routine court that fails goes to the king's own mind, erring toward it.
        failed(ex);
        for (const v of low) why.set(v.audienceId, "passed up: the routine call failed");
      }
    const high = views.filter((v) => !out.has(v.audienceId));
    if (high.length > 0)
      try {
        const reasons = distinct(high.map((v) => why.get(v.audienceId) ?? "the mind's own"));
        const replies = await this.ownCourt(high, court, reasons.length === 1 ? reasons[0] : joinS("; ", reasons), signal);
        high.forEach((v, i) => out.set(v.audienceId, replies[i]));
      } catch (ex) {
        // Its own call failed: those envoys are left out (the stand-in answers each), and those the small rung answered keep
        // their answers, which are in the king's record.
        failed(ex);
        if (out.size === 0) throw ex;
      }
    return views.map((v) => out.get(v.audienceId) ?? null);
  }

  /**
   * The small rung answers routine envoys for the king, playing him from his record: one call for them all, each answer his
   * own and in his record. An envoy it leaves to fuller deliberation, or whose gifts would pass the season's backstop (a
   * share of the treasury by the king's own ledger: not a cap, since nothing is refused), goes to the king's own mind. It
   * may first ask counsel from a brief. Returns the envoys it answered.
   */
  private async routineCourt(views: AudienceView[], court: SeatView, why: Map<string, string>, signal?: AbortSignal): Promise<Map<string, HostReply>> {
    const r = this.rungs!;
    const first = views[0];
    const spending = r.ladder.spending;
    const base = this.courtCall(views, court, true);
    const rung = spending.choose(
      first.turn,
      courtStakes(views, court),
      [
        { rung: "small", model: r.small!, cost: r.ladder.cost(base, r.small!) },
        { rung: "large", model: this.model, cost: r.ladder.cost(base, this.model) },
      ],
      "small",
    );
    const answered = new Map<string, HostReply>();
    if (rung === "large") {
      for (const v of views) why.set(v.audienceId, "the budget");
      return answered;
    }
    const ask = (counsel: string | null) =>
      this.client.askJson(
        {
          ...base,
          key: `${base.key}/routine`,
          role: `routine:${this.power}`,
          model: r.small!,
          user: base.user + (counsel === null ? RoutineCourtNote : `${RoutineCourtNoteAfterCounsel}\n\nTHE COUNSEL YOU ASKED FOR: ${counsel}`),
          schema: routineCourt(counsel === null),
          effort: "low",
        },
        signal,
      );
    let json = await ask(null);
    let counsel = "";
    const brief = String(json.ask_counsel ?? "").trim();
    if (brief.length > 0) {
      try {
        counsel = await r.ladder.counsel({ spec: base, small: r.small, large: this.model, start: "small", scriptMay: false, stakes: courtStakes(views, court), keys: [], differ: () => 0 }, brief, signal);
      } catch (ex) {
        // Counsel that cannot be had leaves the court to the king's own mind.
        if (ex instanceof Error && ex.name === "AbortError") throw ex;
        for (const v of views) why.set(v.audienceId, "passed up: counsel could not be had");
        return answered;
      }
      json = await ask(counsel);
      this.journalOf.thought(first.turn, `Counsel you took at court: ${counsel}`);
    }
    const replies = Parse.court(json);
    const passUp = new Map<string, string>();
    for (const a of Array.isArray(json.answers) ? (json.answers as JsonObject[]) : []) {
      const reason = String(a.pass_up ?? "").trim();
      if (reason.length > 0) passUp.set(String(a.envoy ?? "").trim().toLowerCase(), reason);
    }
    // The hidden backstop: what the small rung gives in a season, gifts and gold sent back together.
    let room = backstop(court) - this.givenAt(first.turn);
    for (const v of views) {
      const reply = replies.get(v.envoy.id.toLowerCase()) ?? null;
      const passed = passUp.get(v.envoy.id.toLowerCase());
      if (passed !== undefined) {
        why.set(v.audienceId, `passed up: ${passed}`);
        continue;
      }
      if (reply === null) {
        why.set(v.audienceId, "passed up: left unanswered");
        continue;
      }
      const gives = reply.bribe + reply.goldBack;
      if (gives > room) {
        why.set(v.audienceId, "passed up: past the backstop");
        continue;
      }
      room -= gives;
      this.given.set(first.turn, this.givenAt(first.turn) + gives);
      const settled = this.settle(v, reply);
      settled.sealProposal = false;
      settled.detain = false;
      settled.jobOffer = 0;
      this.journalOf.audience(v.turn, v.from, v.envoy.name, settled.speech, []);
      this.courtRung.set(v.audienceId, "small");
      answered.set(v.audienceId, settled);
    }
    if (answered.size === 0) return answered;
    this.journalOf.writeLedger(first.turn, Parse.ledger(json));
    const keys = views.filter((v) => answered.has(v.audienceId)).map(courtKey);
    r.ladder.routeKeys(keys, "small", r.small!, counsel.length > 0 ? "routine, with counsel" : "routine");
    await this.auditCourt(views.filter((v) => answered.has(v.audienceId)), court, json, signal);
    return answered;
  }

  /** What the small rung has given at court in a season, against the backstop. */
  private readonly given = new Map<number, number>();
  private givenAt(turn: number): number {
    return this.given.get(turn) ?? 0;
  }

  /** An audit of a routine court: the king's own mind answers the same envoys out of play; its answers are never used. */
  private async auditCourt(views: AudienceView[], court: SeatView, json: JsonObject, signal?: AbortSignal): Promise<void> {
    const r = this.rungs!;
    const spec = this.courtCall(views, court, true);
    if (!r.ladder.spending.audited(spec.key)) return;
    let above: JsonObject;
    try {
      above = await this.client.askJson({ ...spec, key: `${spec.key}/audit` }, signal);
    } catch (ex) {
      if (ex instanceof Error && ex.name === "AbortError") throw ex;
      return;
    }
    const byId = (j: JsonObject): Map<string, JsonObject> =>
      new Map((Array.isArray(j.answers) ? (j.answers as JsonObject[]) : []).map((a) => [String(a.envoy ?? "").trim().toLowerCase(), a] as const));
    const mine = byId(json);
    const theirs = byId(above);
    const differ = views.reduce((s, v) => s + answerDiffer(mine.get(v.envoy.id.toLowerCase()) ?? {}, theirs.get(v.envoy.id.toLowerCase()) ?? {}), 0) / views.length;
    const stakes = courtStakes(views, court);
    r.ladder.recordAudit(newAudit({ key: spec.key, turn: spec.turn, kind: "court", rung: "small", model: r.small!, above: this.model, differ, mattered: Math.min(1, differ * stakes.moved) }));
  }

  /** The king's own mind holds court for these envoys: one call, its letters and its choice about its orders with it. */
  private async ownCourt(views: AudienceView[], court: SeatView, why: string, signal?: AbortSignal): Promise<(HostReply | null)[]> {
    const spec = this.courtCall(views, court);
    const json = await this.client.askJson(spec, signal);
    for (const v of views) this.courtRung.set(v.audienceId, "large");
    this.rungs?.ladder.routeKeys(views.map(courtKey), "large", this.model, why);
    const answers = Parse.court(json);
    // The letters and the choice about its orders are the court's, given once: they ride with the first envoy answered.
    const letters = Parse.letters(json);
    const reopen = json.reopen_orders === true;
    let first = true;
    const replies = views.map((v) => {
      const found = answers.get(v.envoy.id) ?? null;
      if (found === null) return null;
      if (first) {
        found.letters = letters;
        found.reopenOrders = reopen;
        found.answers = Parse.answers(json);
        found.cancelAnswers = Parse.cancelAnswers(json);
        first = false;
      }
      const reply = this.settle(v, found);
      this.journalOf.audience(v.turn, v.from, v.envoy.name, reply.speech, reply.letters.map(describe));
      return reply;
    });
    this.journalOf.writeLedger(views[0].turn, Parse.ledger(json));
    return replies;
  }
}

