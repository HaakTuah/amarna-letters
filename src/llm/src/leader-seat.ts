/**
 * A king played by a model. It receives exactly the seat view every seat receives, keeps its own journal of past seasons
 * (its notes, audiences and orders, and its own summary of older seasons), and answers with structured orders that the
 * engine validates like anyone else's. The asker is the Anthropic API, or a file exchange for a file seat, which then sees
 * exactly the same text.
 */
import { describe, groupBy, type AudienceView, type GameConfig, type HostReply, type Power, type SeatView, type TurnSubmission } from "@amarna/engine";
import type { ISeat } from "@amarna/game";
import type { JsonAsker } from "./client.ts";
import { LeaderJournal } from "./journal.ts";
import { ModelIds } from "./models.ts";
import { Parse } from "./parse.ts";
import { audience, courtBrief, identity, ordersLine, situation, sleepLine, tabletLine } from "./prompts.ts";
import { leaderRules } from "./rules.ts";
import { Replies, Schemas } from "./schemas.ts";
import { Sb, joinS } from "./text.ts";

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

  constructor(power: Power, client: JsonAsker, model: string, effort: string, primer: boolean, config: GameConfig, label: string | null = null) {
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

  async decide(view: SeatView, signal?: AbortSignal): Promise<TurnSubmission> {
    const user = new Sb();
    user.appendLine(situation(view));
    user.appendLine(this.journalOf.forOrders());
    user.appendLine(ordersLine(view));
    const json = await this.client.askJson(
      {
        key: `t${view.turn}/orders/${this.power}`,
        turn: view.turn,
        role: `leader:${this.power}`,
        model: this.model,
        sharedSystem: this.shared(view),
        seatSystem: identity(this.power),
        user: user.toString(),
        schema: Replies.leaderOrders(this.config),
        effort: this.effort,
        maxTokens: 16000,
      },
      signal,
    );
    const sub = Parse.orders(json);
    this.journalOf.record(view.turn, sub);
    return sub;
  }

  async hostAudience(view: AudienceView, court: SeatView, signal?: AbortSignal): Promise<HostReply> {
    const user = new Sb();
    // Like every request to a king that sleeps, it opens with how long the king slept and what woke it.
    const woke = sleepLine(court, false, view.ordersStand && view.reopenChosen);
    if (woke.length > 0) user.appendLine(woke);
    // A king woken for its audiences only (its orders stand) reads its treasury in its realm in brief.
    user.appendLine(view.ordersStand ? `SEASON: turn ${view.turn}. You hold court.` : `SEASON: turn ${view.turn}. You hold court. Treasury ${court.gold} shekels by your ledger.`);
    const lands = groupBy(court.owner, ([, o]) => o)
      .filter(([o]) => o !== null)
      .map(([o, g]) => `${o} ${g.length}`);
    user.appendLine(`Lands now: ${joinS("; ", lands)}.`);
    // What has reached the court this season, so that the host does not speak to an envoy against its own news.
    user.append(courtBrief(court, view.ordersStand));
    if (court.tablets.length > 0) user.appendLine("Tablets you hold, in full: " + joinS(" | ", court.tablets.map(tabletLine)));
    user.appendLine(this.journalOf.forAudience());
    user.appendLine(audience(view));
    const json = await this.client.askJson(
      {
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
        maxTokens: 8000,
      },
      signal,
    );
    const reply = Parse.host(json);
    // Letters and reopening mean something only while its orders stand; at any other audience the reply carries none.
    if (!view.ordersStand) {
      reply.letters.length = 0;
      reply.reopenOrders = false;
    }
    // What it was not asked, it does not choose, even if the reply says so (a file seat's reply may carry any field).
    const asked = Schemas.asksOf(view);
    if (!asked.giftOpen) {
      reply.bribe = 0;
      reply.bribeAsk = "";
    }
    if (!asked.tabletToSeal) reply.sealProposal = false;
    if (asked.lastExchange) reply.end = false;
    this.journalOf.audience(view.turn, view.from, view.envoy.name, reply.speech, reply.letters.map(describe));
    // What it wrote in its ledger stays in its own record: the reply that the engine and the envoy see carries none of it.
    this.journalOf.writeLedger(view.turn, Parse.ledger(json));
    return reply;
  }
}

