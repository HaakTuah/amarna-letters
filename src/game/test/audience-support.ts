import { type AudienceView, type HostReply, type Power, type SeatView, type TurnSubmission, dispatch, newHostReply, newTurnSubmission } from "@amarna/engine";
import type { ISeat } from "@amarna/game";

// <summary>Sends one envoy, with the given gold, to the given king in the first season, then does nothing.</summary>
export class Sender implements ISeat {
  readonly #envoyId: string;
  readonly #to: Power;
  readonly #gold: number;
  constructor(envoyId: string, to: Power, gold: number = 0) {
    this.#envoyId = envoyId;
    this.#to = to;
    this.#gold = gold;
  }
  get label(): string {
    return "Sender";
  }
  decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
    return Promise.resolve(
      view.turn === 1 ? newTurnSubmission({ orders: [dispatch(this.#envoyId, this.#to, "Greetings, brother.", { gold: this.#gold })] }) : newTurnSubmission(),
    );
  }
  hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
    return Promise.resolve(newHostReply({ end: true }));
  }
}

// <summary>Answers each audience round as the test gives, and keeps every view it is shown.</summary>
export class Host implements ISeat {
  views: AudienceView[] = [];
  readonly #reply: (view: AudienceView) => HostReply;
  constructor(reply: (view: AudienceView) => HostReply) {
    this.#reply = reply;
  }
  get label(): string {
    return "Host";
  }
  decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
    return Promise.resolve(newTurnSubmission());
  }
  hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
    this.views.push(view);
    return Promise.resolve(this.#reply(view));
  }
}

// <summary>Does nothing, every season.</summary>
export class Idle implements ISeat {
  get label(): string {
    return "Idle";
  }
  decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
    return Promise.resolve(newTurnSubmission());
  }
  hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
    return Promise.resolve(newHostReply({ end: true }));
  }
}
