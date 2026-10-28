/**
 * Jobs, not wages (build order item 11a): a person is hired for a job with a term and a fee, the advance handed over when
 * it is agreed and the rest falling due when it is done, a promise its employer keeps or breaks ("Jobs, not wages",
 * "Work on any terms"). Nothing accrues. What a court has paid and broken is its record, which every person reads before
 * it takes a job there: the rest of a fee is worth to it only as much as it trusts the court to pay. The going rate of
 * service moves with the hires sought and the people seeking them ("Fees clear the market").
 */
import { clamp, idiv, roundEven, toInt } from "../core/num.ts";
import { cmpNum, count, sortBy } from "../core/seq.ts";
import { Dict } from "../core/collections.ts";
import { MoneyData, newPayRecord } from "../model/money.ts";
import type { PayFeeOrder } from "../model/orders.ts";
import { gain, newContract, remember, type Character } from "../model/people.ts";
import { land, type Power } from "../model/power.ts";
import { isAlive, logEvent, notify, char, type GameState } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { NoticeTitle, renewalPrice } from "./court.ts";

declare module "./core.ts" {
  interface TurnEngine {
    jobsDone(stood: Dict<string, Power | null>): void;
    settleRest(c: Character, p: Power, late: boolean): boolean;
    recordPay(party: string, kept: boolean): void;
    payFeeOrder(p: Power, o: PayFeeOrder): void;
    goingRateMoves(hiresSought: number): void;
  }
}

const P = TurnEngine.prototype;

/** How much of the rest of a fee a person counts on from a party, in percent, by its record of paying ("A name made of outcomes"). */
export function trustIn(s: GameState, party: string): number {
  const r = s.payRecords.tryGet(party);
  if (r === undefined) return MoneyData.trustStart;
  return clamp(MoneyData.trustStart + MoneyData.trustKept * r.kept - MoneyData.trustBroken * r.broken, MoneyData.trustLow, 100);
}

/** What a job is worth to the person who takes it: the advance in hand, and the rest as far as it trusts the employer. */
export const jobValue = (fee: number, advance: number, trust: number): number => advance + idiv(Math.max(0, fee - advance) * trust, 100);

/**
 * The smallest fee for a term that a person would take with a given share of it in advance ("The split prices trust both
 * ways"): what it asks a season times the term, made up for the part of the rest it does not count on.
 */
export function feeFor(ask: number, term: number, advancePercent: number, trust: number): number {
  const share = advancePercent * 100 + (100 - advancePercent) * trust; // in ten-thousandths
  let fee = Math.ceil((ask * term * 10000) / Math.max(1, share));
  // Whole shekels round the advance down and the trusted rest down: add what that loses.
  while (jobValue(fee, idiv(fee * advancePercent, 100), trust) < ask * term) fee++;
  return fee;
}

/** The rate a job pays a season, as a person compares it: its fee over its term. */
export const rateOf = (fee: number, term: number): number => idiv(fee, Math.max(1, term));

P.recordPay = function (party, kept) {
  let r = this.s.payRecords.tryGet(party);
  if (r === undefined) this.s.payRecords.set(party, (r = newPayRecord()));
  if (kept) r.kept++;
  else r.broken++;
};

/**
 * The rest of a servant's fee, when its job is done (or later, by order pay_fee): paid from the court's true treasury,
 * unless the court withheld it or cannot pay it all. Either way it is recorded: a fee withheld from a man who did his job
 * is a promise broken, and a court's record is what every person reads before taking a job there. `late`: paid by order
 * after it fell due. True if it was paid.
 */
P.settleRest = function (c, p, late) {
  const S = this.s;
  const k = c.contract;
  const rest = late ? c.owed.getOrDefault(p, 0) : k === null || k.captured ? 0 : Math.max(0, k.fee - k.advance);
  if (rest <= 0) return true;
  const t = S.treasuries.get(p);
  if (!late && k !== null && k.withheld) {
    c.owed.set(p, c.owed.getOrDefault(p, 0) + rest);
    this.recordPay(p, false);
    this.missedPay(c, p, `The king of ${land(p)} withheld the rest of my fee, ${formatMoney(rest)}, though I did my job.`);
    notify(S, p, "Notice", "A fee withheld", `${c.name}'s job is done, and you withheld the rest of the fee, ${formatMoney(rest)}, as you ordered. They know it, and so will others who hear of it.`, c.id);
    logEvent(S, "fee-withheld", `${p} withheld ${c.name}'s fee.`, [p], "fee-withheld");
    return false;
  }
  if (t.gold < rest) {
    this.exposeDebasement(p, `${c.name}'s fee`);
    if (!late) {
      c.owed.set(p, c.owed.getOrDefault(p, 0) + rest);
      this.recordPay(p, false);
      this.missedPay(c, p, `The king of ${land(p)} could not pay the rest of my fee, ${formatMoney(rest)}.`);
      notify(S, p, "Notice", "A fee unpaid", `${c.name}'s job is done, but the treasury could not pay the rest of the fee, ${formatMoney(rest)}: it stays owed (order pay_fee pays it while they stand at your court), and the broken promise is known.`, c.id);
      logEvent(S, "fee-unpaid", `${p} could not pay ${c.name}'s fee.`, [p], "fee-unpaid");
    }
    return false;
  }
  t.gold -= rest;
  gain(c, rest, "Fees");
  if (late) c.owed.delete(p);
  this.recordPay(p, true);
  remember(c, S.turn, `The king of ${land(p)} paid me the rest of my fee, ${formatMoney(rest)}${late ? ", late" : ""}.`);
  logEvent(S, "fee-paid", `${p} paid ${c.name}'s fee${late ? " late" : ""}.`, [p], "fee-paid");
  return true;
};

/** Order pay_fee: pay what fell due unpaid to a person standing at court, or withhold the rest of a servant's present job. */
P.payFeeOrder = function (p, o) {
  const S = this.s;
  const c = char(S, o.character);
  if (!o.pay) {
    if (c.employer !== p || c.contract === null) {
      this.failed(p, o, "Nothing to withhold", `${c.name} has no job of yours whose fee you could withhold.`, "no job of yours", true, c.id);
      return;
    }
    c.contract.withheld = true;
    notify(S, p, "Notice", "A fee to be withheld", `The rest of ${c.name}'s fee will be withheld when the job is done.`, c.id);
    return;
  }
  if (c.owed.getOrDefault(p, 0) <= 0) {
    if (c.employer === p && c.contract !== null && c.contract.withheld) {
      c.contract.withheld = false;
      notify(S, p, "Notice", "A fee to be paid", `The rest of ${c.name}'s fee will be paid when the job is done after all.`, c.id);
    } else this.failed(p, o, "Nothing owed", `You owe ${c.name} nothing that fell due.`, "nothing owed", true, c.id);
    return;
  }
  if (c.at !== p || c.heldBy !== null || c.status === "Dead") {
    this.failed(p, o, "Fee not paid", `${c.name} is not at your court to be paid.`, "not at your court", true, c.id);
    return;
  }
  const owed = c.owed.get(p);
  if (this.settleRest(c, p, true)) notify(S, p, "Notice", "A fee paid", `You paid ${c.name} the ${formatMoney(owed)} you owed them.`, c.id);
  else this.failed(p, o, "Fee not paid", `The treasury could not pay ${c.name} the ${formatMoney(owed)} you owe them.`, "the treasury could not pay it", false, c.id);
};

/**
 * Jobs done, once the season's travellers have arrived and the tasks due are settled: a servant whose term has ended and
 * who is back at its master's court with no task has done its job, and the rest of its fee falls due. Then, as before,
 * one content with what it was paid serves on for another 6 seasons on the same terms, a new job whose advance is handed
 * over now; one who wants more, was not paid, or whose master cannot hand over the new advance, gives a season's notice
 * and names its price.
 */
P.jobsDone = function (stood) {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => c.status === "Employed" && c.contract !== null && c.contract.noticePrice === null && c.contract.untilTurn < S.turn && c.duty === "None" && c.at === c.employer),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    const emp = c.employer!;
    if (!isAlive(S, emp)) continue;
    const k = c.contract!;
    const term = Math.max(1, k.untilTurn - k.startTurn);
    const rate = rateOf(k.fee, term);
    const rest = Math.max(0, k.fee - k.advance);
    // The new job's advance keeps the old job's share: a servant who took half now takes half again.
    const advance = toInt(roundEven((k.advance * 6) / term));
    const paid = this.settleRest(c, emp, false);
    // Settled either way: paid, or owed as a broken promise (c.owed); nothing more falls due on this job.
    k.advance = k.fee;
    const back = stood.getOrDefault(c.id, null) !== emp ? " is back at your court and" : "";
    const ask = paid ? renewalPrice(c, emp, S.goingRate) : Math.max(renewalPrice(c, emp, S.goingRate), rate + Math.max(1, idiv(rate, 5)));
    const t = S.treasuries.get(emp);
    if (paid && ask <= rate * 1.2 && t.gold >= advance) {
      t.gold -= advance;
      gain(c, advance, "Fees");
      c.contract = newContract({ fee: rate * 6, advance, startTurn: S.turn, untilTurn: S.turn + 6 });
      notify(S, emp, "Notice", "Contract renewed", `${c.name}${back} has done their job${rest > 0 ? `, and was paid the rest of the fee, ${formatMoney(rest)}` : ""}. They serve on for another 6 seasons, through turn ${S.turn + 6}, for ${formatMoney(rate * 6)}, of which ${formatMoney(advance)} was handed over now.`, c.id);
      continue;
    }
    k.noticePrice = ask;
    k.leavesTurn = S.turn + 1;
    remember(c, S.turn, `My job for ${land(emp)} is done. I asked ${formatMoney(ask)} a season to serve on.`);
    notify(
      S,
      emp,
      "Notice",
      NoticeTitle,
      `${c.name}${back} has done their job${paid ? "" : ", and you did not pay the rest of their fee"}. They ask ${formatMoney(ask)} a season of a new term to serve on: renew them this season (order renew, a new fee and advance), or they leave at the start of turn ${S.turn + 1} (or, if you send them out first, when they are next at your court).`,
      c.id,
    );
  }
};

/**
 * The going rate of service moves a step a season ("Fees clear the market"): up when more hires and renewals were sought
 * than there are people seeking service at the courts, down when fewer than half as many were. `hiresSought`: the hires,
 * renewals and calls for candidates this season.
 */
P.goingRateMoves = function (hiresSought) {
  const S = this.s;
  const seeking = count(S.characters, (c) => c.status === "Free" && c.seeking && c.at !== null && c.heldBy === null);
  S.hireDemand = hiresSought;
  if (hiresSought > seeking) S.goingRate = Math.min(MoneyData.rateHigh, S.goingRate + MoneyData.rateStep);
  else if (hiresSought * 2 < seeking) S.goingRate = Math.max(MoneyData.rateLow, S.goingRate - MoneyData.rateStep);
};
