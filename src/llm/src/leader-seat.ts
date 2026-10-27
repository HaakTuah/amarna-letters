/**
 * A king played by a model. It receives exactly the seat view every seat receives, keeps its own journal of past seasons
 * (its notes, audiences and orders, and its own summary of older seasons), and answers with structured orders that the
 * engine validates like anyone else's. The asker is the Anthropic API, or a file exchange for a file seat, which then sees
 * exactly the same text.
 */
import { describe, distinct, groupBy, type AudienceView, type TabletView, type GameConfig, type HostReply, type Power, type SeatView, type TurnSubmission } from "@amarna/engine";
import { plainWords, type ISeat, type PhraseRequest } from "@amarna/game";
import type { CallSpec, JsonAsker } from "./client.ts";
import { LeaderJournal } from "./journal.ts";
import { ModelIds, OutputCaps } from "./models.ts";
import { Parse } from "./parse.ts";
import { audience, courtBrief, identity, ordersLine, ordersStandAtCourt, situation, sleepLine, tabletBrief, tabletLine } from "./prompts.ts";
import { leaderRules } from "./rules.ts";
import { Replies, Schemas } from "./schemas.ts";
import { Sb, joinS } from "./text.ts";

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

  constructor(
    power: Power,
    client: JsonAsker,
    model: string,
    effort: string,
    primer: boolean,
    config: GameConfig,
    label: string | null = null,
    phrasing: string | null = null,
  ) {
    this.phrasing = phrasing;
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
      schema: Replies.leaderOrders(this.config),
      effort: this.effort,
      maxTokens: OutputCaps.orders,
    };
  }

  async decide(view: SeatView, signal?: AbortSignal): Promise<TurnSubmission> {
    const json = await this.client.askJson(this.ordersCall(view), signal);
    const sub = Parse.orders(json);
    this.journalOf.record(view.turn, sub);
    this.journalOf.readTablets(view.tablets.map((t) => t.tabletId));
    return sub;
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
  courtCall(views: readonly AudienceView[], court: SeatView): CallSpec {
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
    if (first.ordersStand) {
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

  async holdCourt(views: AudienceView[], court: SeatView, signal?: AbortSignal): Promise<(HostReply | null)[]> {
    const json = await this.client.askJson(this.courtCall(views, court), signal);
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

