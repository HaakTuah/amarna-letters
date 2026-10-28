/**
 * A script king's errands as jobs (Haakon's answers to items 11a and 11a+): every errand is a job, offered to the man who
 * is to do it, which he takes or not. The court and the letters choose whom to send from the people at hand, its servants
 * at court and the free people standing there; then each envoy or spy sent is given the job for that errand: a new job for
 * a servant whose job was another, an offer for a free person. Each job carries the king's standing order to pay the rest
 * when it is done, since a court known to pay is cheaper to staff. An envoy going where a tablet of the king's archive is
 * owed also carries it, to present to the borrower.
 */
import { MoneyData, feeFor, hire, renew, travelTurns, newGameConfig, type CharacterView, type Order, type Power, type SeatView, AllPowers, type JobTerms } from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import { reliability, wouldPay } from "./statecraft-court.ts";

const Config = newGameConfig();

/** Script kings give each errand its own job (always: the rule has no way round it); `--no-errand-play` only drops the standing orders and offers abroad. */
export const ErrandPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The free people standing at our court whom the court would send on an errand: priced, not claiming another king, unblemished. */
export function freeAtCourt(b: Board, brain: Brain): CharacterView[] {
  return b.v.known.filter((c) => c.status === "free" && c.where === "at your court" && c.askingPrice !== null && c.claimsToServe === null && reliability(c) === 0 && !brain.heldElsewhere.has(c.id));
}

/** The people at hand for an errand: our servants at court with nothing to do, then the free people standing there. */
export function atHand(b: Board, brain: Brain): CharacterView[] {
  return [...b.v.court.filter((c) => c.ready), ...freeAtCourt(b, brain)];
}

/** Our own servants before the free people, keeping each group's order. */
export const oursFirst = (c: CharacterView): boolean => c.ours;

/** Seasons an errand takes from a court, there and back with a season there, and a spy's stay. */
export function errandTerm(v: SeatView, what: "envoy" | "spy", where: string): number {
  const home = Board.Map.capital(v.power).id;
  const there = AllPowers.includes(where as Power) ? Board.Map.capital(where as Power).id : where;
  const road = travelTurns(Config, Board.Map, home, there, v.turn) + travelTurns(Config, Board.Map, there, home, v.turn);
  return road + 1 + (what === "spy" ? 8 : 1);
}

/**
 * The jobs for the season's errands: for each envoy or spy sent, a new job for a servant whose job is another errand, or an
 * offer to a free person at court (one of `free`); an errand the court will not pay for (`pays`, by the rate a season), or
 * one nobody can be offered, is dropped. `standing`: each job carries the order to pay the rest when it is done. Returns
 * the advances the jobs hand over; `orders` is changed in place.
 */
export function jobsForErrands(v: SeatView, orders: Order[], free: CharacterView[], pays: (rate: number, spent: number) => boolean, standing: boolean): number {
  let spent = 0;
  for (const o of [...orders]) {
    const what = o.type === "dispatch" ? "envoy" : o.type === "spy" ? "spy" : null;
    if (what === null) continue;
    const id = o.type === "dispatch" ? o.envoy : o.type === "spy" ? o.character : "";
    const where = o.type === "dispatch" ? o.to : o.type === "spy" ? (o.court ?? o.province ?? "") : "";
    const ours = v.court.find((c) => c.id === id) ?? null;
    const term = errandTerm(v, what, where);
    const t: JobTerms = { what, where, payOnDone: standing };
    let ask: number;
    if (ours !== null) {
      if (ours.errandWhat === null || (ours.errandWhat === what && ours.errandWhere === where && !ours.errandDone)) continue;
      // A new job: what the last one paid a season, and a tenth more.
      const span = Math.max(1, (ours.contractUntil ?? v.turn) - (ours.contractFrom ?? v.turn));
      ask = Math.max(3, Math.ceil(((ours.fee ?? 60) / span) * 1.1));
    } else {
      const c = free.find((x) => x.id === id) ?? null;
      if (c === null) {
        orders.splice(orders.indexOf(o), 1);
        continue;
      }
      ask = c.askingPrice!;
    }
    // What the man counts on of the rest is what he heard of our record, which we cannot know: never more than a stranger's.
    // Half now; a court short of gold now offers it all on completion, which costs more ("a court known to pay can pay
    // later"), as long as its record is good enough for a stranger to count on it.
    const trust = Math.min(v.trust, MoneyData.trustStart);
    let fee = feeFor(ask, term, 50, trust);
    let advance = Math.trunc(fee / 2);
    if (!pays(ask, spent + advance) && standing && trust >= 60) {
      fee = feeFor(ask, term, 0, trust);
      advance = 0;
    }
    if (!pays(ask, spent + advance)) {
      orders.splice(orders.indexOf(o), 1);
      continue;
    }
    orders.splice(orders.indexOf(o), 0, ours !== null ? renew(id, fee, term, advance, t) : hire(id, fee, term, advance, t));
    spent += advance;
  }
  return spent;
}

/** The script king's jobs for its errands (`jobsForErrands`), within what its greed and its spare gold allow. */
export function errandJobs(b: Board, brain: Brain, orders: Order[]): void {
  const spare = brain.spareGold;
  // The fee a season its greed allows, and the advances out of the gold it can spare.
  brain.spareGold -= jobsForErrands(b.v, orders, freeAtCourt(b, brain), (rate, spent) => wouldPay(brain.p, rate, Number.MAX_SAFE_INTEGER) && spent <= spare, ErrandPlay.on(b.me));
}

/** A tablet of our archive owed by the king an envoy goes to rides with it, to be presented there. */
export function collecting(b: Board, orders: Order[]): Order[] {
  if (!ErrandPlay.on(b.me)) return orders;
  return orders.map((o) => {
    if (o.type !== "dispatch" || o.collect != null) return o;
    const d = b.v.debtsHeld.find((x) => x.holderId === o.to);
    return d === undefined ? o : { ...o, collect: d.id };
  });
}

/** The free people the court asks to come and stand ready: candidates when few are at hand. */
export const fewAtHand = (b: Board, brain: Brain): boolean => atHand(b, brain).length < 2;
