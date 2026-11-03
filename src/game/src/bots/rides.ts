/**
 * Rides (#601): a script king hires a rider to bring home the report of a far province of his that may be in danger, when
 * its last report is old: foreign troops last seen in it or beside it, or a siege known there. He haggles: he offers less
 * than he reckons the rider asks (the court list's price a season, more for each season sooner the report comes, more as
 * few stand at court to ride), the whole fee in hand so that it counts in full, and offers more next season if he was
 * refused. `--no-ride-play` and `--ride-play-half` turn this off, only to measure what it is worth.
 */
import { hire, type Order, type Power } from "@amarna/engine";
import type { HSet } from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import { freeAtCourt } from "./errands.ts";

export const RidePlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** First guesses: the oldest a report may be before a king rides for it, and how far below his reckoning he first offers. */
export const RideTerms = { age: 2, haggle: 85, raise: 115 } as const;

/** At most one ride a season: the order, if a far province of his may be in danger and he can pay for it. */
export function rideOrders(b: Board, brain: Brain, busy: HSet<string>, spare: number): Order[] {
  const v = b.v;
  if (!RidePlay.on(b.me)) return [];
  const foreign = (x: string): boolean => v.units.some((u) => u.power !== b.me && (u.province === x || Board.Map.neighbors(x).includes(u.province)));
  const far = [...v.ownerAsOf.entries()]
    .filter(([x, asOf]) => v.owner.getOrDefault(x, null) === (b.me as Power) && v.turn - asOf >= RideTerms.age && (v.sieges.some((s) => s.province === x) || foreign(x)))
    .sort((a, b2) => a[1] - b2[1] || (a[0] < b2[0] ? -1 : 1));
  if (far.length === 0) return [];
  const [x, asOf] = far[0];
  const free = freeAtCourt(b, brain).filter((c) => !busy.has(c.id));
  const rider = free.sort((a, c) => a.askingPrice! - c.askingPrice! || (a.id < c.id ? -1 : 1))[0];
  if (rider === undefined) return [];
  // What he reckons the rider asks, and the offer: below it at first, above the last refused offer after a refusal.
  const sooner = Math.max(1, v.turn - asOf - 1);
  const reckoned = Math.ceil((rider.askingPrice! * (100 + 20 * (sooner - 1) + Math.trunc(50 / free.length))) / 100);
  const last = brain.rideOffers.tryGet(x);
  const fee = Math.max(1, last !== undefined && last.turn === v.turn - 1 ? Math.ceil((last.fee * RideTerms.raise) / 100) : Math.trunc((reckoned * RideTerms.haggle) / 100));
  // Never more than four seasons of what he asks for a job, nor a quarter of the gold to spare.
  if (spare < fee * 4 || fee > rider.askingPrice! * 4) return [];
  brain.rideOffers.set(x, { turn: v.turn, fee });
  busy.add(rider.id);
  return [hire(rider.id, fee, 1, fee, { what: "ride", where: x, payOnDone: true })];
}
