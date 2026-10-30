/** A seat fed by the UI: the runner waits until the person submits orders or answers an envoy. */
import type { AudienceView, HostReply, Power, SeatView, TurnSubmission } from "@amarna/engine";
import type { ISeat } from "./contracts.ts";

interface Pending<T> {
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}

export class HumanSeat implements ISeat {
  readonly label = "Human";
  /** Item 16: a human hears the royal council, on by default; he may turn it off. */
  readonly hearsCouncil = true;
  readonly power: Power;
  pendingOrders: SeatView | null = null;
  pendingAudience: AudienceView | null = null;
  audienceCourt: SeatView | null = null;
  /** Called whenever what the seat waits for changes. */
  readonly changed: (() => void)[] = [];
  private orders: Pending<TurnSubmission> | null = null;
  private audience: Pending<HostReply> | null = null;

  constructor(power: Power) {
    this.power = power;
  }

  private notify(): void {
    for (const f of this.changed) f();
  }

  decide(view: SeatView, signal?: AbortSignal): Promise<TurnSubmission> {
    this.pendingOrders = view;
    const p = new Promise<TurnSubmission>((resolve, reject) => (this.orders = { resolve, reject }));
    signal?.addEventListener("abort", () => this.orders?.reject(signal.reason));
    this.notify();
    return p;
  }

  hostAudience(view: AudienceView, court: SeatView, signal?: AbortSignal): Promise<HostReply> {
    this.pendingAudience = view;
    this.audienceCourt = court;
    const p = new Promise<HostReply>((resolve, reject) => (this.audience = { resolve, reject }));
    signal?.addEventListener("abort", () => this.audience?.reject(signal.reason));
    this.notify();
    return p;
  }

  submitOrders(submission: TurnSubmission): void {
    const pending = this.orders;
    this.orders = null;
    this.pendingOrders = null;
    this.notify();
    pending?.resolve(submission);
  }

  answer(reply: HostReply): void {
    const pending = this.audience;
    this.audience = null;
    this.pendingAudience = null;
    this.audienceCourt = null;
    this.notify();
    pending?.resolve(reply);
  }
}
