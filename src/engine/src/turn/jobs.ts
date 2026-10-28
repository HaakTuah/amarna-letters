/**
 * Jobs (build order item 11a, "Jobs, not wages", reworked by Haakon's answers to items 11a and 11a+): a job is one errand,
 * what to do, where and by when, with a fee, the advance handed over when it is agreed and the rest due when the errand is
 * done. Nothing is paid unless the payer orders it, by hand or by his own standing order; unpaid is unpaid, and a promise
 * left unpaid a season counts as broken. When the job is done it ends: another errand is a new offer the man may refuse.
 * Whether a party keeps its promises to pay is news: each promise kept or broken is a fact that reaches each court by the
 * roads, and people hear it where they stand and from those they meet; every person bargains from what it has heard.
 */
import { clamp, idiv, toInt } from "../core/num.ts";
import { cmpNum, sortBy } from "../core/seq.ts";
import { Dict } from "../core/collections.ts";
import { isPowerParty, MoneyData, newPayFact, newPayRecord } from "../model/money.ts";
import type { PayFeeOrder } from "../model/orders.ts";
import { gain, newContract, remember, type Character, type Contract } from "../model/people.ts";
import { AllPowers, land, type Power } from "../model/power.ts";
import { isAlive, logEvent, newId, notify, char, type GameState } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { askingPrice, NoticeTitle } from "./court.ts";

declare module "./core.ts" {
  interface TurnEngine {
    jobsDone(stood: Dict<string, Power | null>): void;
    settleRest(c: Character, p: Power, late: boolean): boolean;
    recordPay(party: string, kept: boolean, where: Power | null, payee?: Character | null): void;
    payFeeOrder(p: Power, o: PayFeeOrder): void;
    fallsDue(c: Character, p: Power, amount: number, what: string): void;
    duesSeason(): void;
    heardFee(c: Character, rate: number): void;
    jobFits(c: Character, p: Power, k: Pick<Contract, "errand">, term: number): string | null;
  }
}

const P = TurnEngine.prototype;

/** A party's record of paying as someone knows it: a person by what it heard, a court by what has reached it, or (null) the truth. */
export function recordKnown(s: GameState, party: string, knower: Character | Power | null): { kept: number; broken: number } {
  if (knower === null) return s.payRecords.tryGet(party) ?? { kept: 0, broken: 0 };
  let kept = 0;
  let broken = 0;
  if (typeof knower === "string") {
    for (const f of s.payFacts)
      if (f.party === party && f.heardAt.getOrDefault(knower, Number.MAX_SAFE_INTEGER) <= s.turn) {
        if (f.kept) kept++;
        else broken++;
      }
    return { kept, broken };
  }
  const known = new Set(knower.heardPay);
  for (const f of s.payFacts)
    if (f.party === party && known.has(f.id)) {
      if (f.kept) kept++;
      else broken++;
    }
  return { kept, broken };
}

/**
 * How much of the rest of a fee someone counts on from a party, in percent, by its record of paying as that one knows it
 * ("A name made of outcomes"): a person by what it heard, a court by what has reached it; a party always knows its own.
 */
export function trustIn(s: GameState, party: string, knower: Character | Power | null = null): number {
  const r = recordKnown(s, party, knower === party ? null : knower);
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

/** The rest of a job's fee still to be paid when it is done, with what earlier jobs carried into it. */
export const restOf = (k: Contract): number => k.carried + Math.max(0, k.fee - k.advance);

/** The rate a job pays a season, as a person compares it: its fee over its term. */
export const rateOf = (fee: number, term: number): number => idiv(fee, Math.max(1, term));

/**
 * A promise to pay kept or broken: the party's record, and a fact that reaches each court by the roads from `where` (the
 * court where it happened; none on the road), heard at once by the payer and the payee.
 */
P.recordPay = function (party, kept, where, payee = null) {
  const S = this.s;
  let r = S.payRecords.tryGet(party);
  if (r === undefined) S.payRecords.set(party, (r = newPayRecord()));
  if (kept) r.kept++;
  else r.broken++;
  const f = newPayFact({ id: newId(S, "pf"), party, kept, turn: S.turn });
  for (const k of AllPowers) {
    if (!isAlive(S, k)) continue;
    if (k === party) f.heardAt.set(k, S.turn);
    else if (where !== null && isAlive(S, where)) f.heardAt.set(k, S.turn + (k === where ? 0 : this.travelTurns(where, k)));
  }
  S.payFacts.push(f);
  if (payee !== null) hearPay(payee, f.id);
  if (!isPowerParty(party)) {
    const c = S.characters.find((x) => x.id === party);
    if (c !== undefined) hearPay(c, f.id);
  }
};

/** A person hears of a promise kept or broken; it keeps the newest in mind. */
export function hearPay(c: Character, id: string): void {
  if (c.heardPay.includes(id)) return;
  c.heardPay.push(id);
  if (c.heardPay.length > MoneyData.heardKeep) c.heardPay.splice(0, c.heardPay.length - MoneyData.heardKeep);
}

/** A person hears what a job paid a season, and what it would ask moves part of the way towards it. */
P.heardFee = function (c, rate) {
  c.heardRate = c.heardRate === null ? rate : toInt(Math.round((c.heardRate * (100 - MoneyData.heardWeight) + rate * MoneyData.heardWeight) / 100));
};

/**
 * Whether a person can do a job's errand by its term, from where it stands, in its own words; null if it can. An envoy must
 * reach the court and come back, with a season there; a spy must reach its post and come back, with a season there.
 */
P.jobFits = function (c, p, k, term) {
  const e = k.errand;
  if (e === null) return null;
  const from = c.at ?? p;
  const there = e.what === "envoy" || isPowerParty(e.where) ? this.map.capital(e.where as Power).id : e.where;
  if (!this.map.exists(there)) return `there is no ${e.what === "envoy" ? "court" : "court or province"} '${e.where}'`;
  const road = this.travelTurnsBetween(this.map.capital(from).id, there) + this.travelTurnsBetween(there, this.map.capital(p).id);
  const least = road + MoneyData.errandStay;
  return term < least ? `the errand takes ${least} seasons from here, there and back, more than the ${term} offered` : null;
};

/**
 * The rest of a fee falls due unpaid: owed, a fact, and the employer told. Unpaid by the end of the next season, it counts
 * once as a broken promise (`duesSeason`).
 */
P.fallsDue = function (c, p, amount, what) {
  const S = this.s;
  c.owed.set(p, c.owed.getOrDefault(p, 0) + amount);
  c.owedDue.set(p, S.turn);
  remember(c, S.turn, `${what} The king of ${land(p)} owes me ${formatMoney(amount)}.`);
  if (isAlive(S, p))
    notify(S, p, "Notice", "A fee due", `${c.name}: ${what} You owe them ${formatMoney(c.owed.get(p))}. Nothing is paid unless you order it: pay_fee pays it while they stand at your court; unpaid by the end of next season, it is a broken promise others will hear of.`, c.id);
};

/**
 * The rest of a fee: paid from the court's true treasury now, by its standing order when the job is done, or later by
 * order pay_fee (`late`). A court that cannot pay all of it pays nothing, and the rest is owed. True if it was paid.
 */
P.settleRest = function (c, p, late) {
  const S = this.s;
  const k = c.contract;
  const rest = late ? c.owed.getOrDefault(p, 0) : k === null || k.captured ? 0 : restOf(k);
  if (rest <= 0) return true;
  const t = S.treasuries.get(p);
  if (t.gold < rest) {
    this.exposeDebasement(p, `${c.name}'s fee`);
    return false;
  }
  t.gold -= rest;
  gain(c, rest, "Fees");
  // Paid by the end of the season after it fell due, a promise kept; paid later, the broken promise stands and nothing more.
  const due = late ? c.owedDue.getOrDefault(p, S.turn) : S.turn;
  if (late) {
    c.owed.delete(p);
    c.owedDue.delete(p);
  }
  if (due >= 0) this.recordPay(p, true, p, c);
  remember(c, S.turn, `The king of ${land(p)} paid me the rest of my fee, ${formatMoney(rest)}${late ? ", by his order" : ", as he said he would when the job was done"}.`);
  logEvent(S, "fee-paid", `${p} paid ${c.name}'s fee${late ? " by order" : " on completion"}.`, [p], "fee-paid");
  return true;
};

/** Order pay_fee: pay what fell due to a person standing at court, or (pay false) withhold the rest of a present job. */
P.payFeeOrder = function (p, o) {
  const S = this.s;
  const c = char(S, o.character);
  if (!o.pay) {
    if (c.employer !== p || c.contract === null) {
      this.failed(p, o, "Nothing to withhold", `${c.name} has no job of yours whose fee you could withhold.`, "no job of yours", true, c.id);
      return;
    }
    c.contract.withheld = true;
    c.contract.payOnDone = false;
    notify(S, p, "Notice", "A fee to be withheld", `The rest of ${c.name}'s fee will not be paid when the job is done.`, c.id);
    return;
  }
  if (c.owed.getOrDefault(p, 0) <= 0) {
    if (c.employer === p && c.contract !== null && !c.contract.payOnDone) {
      c.contract.withheld = false;
      c.contract.payOnDone = true;
      notify(S, p, "Notice", "A fee to be paid", `The rest of ${c.name}'s fee will be paid when the job is done.`, c.id);
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
 * Fees that fell due last season and are still unpaid: each counts once as a broken promise ("Unpaid is unpaid"); the
 * man remembers it, and others hear of it as news.
 */
P.duesSeason = function () {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => c.owedDue.size > 0),
    [(c: Character) => idNumber(c.id), cmpNum],
  ))
    for (const [p, due] of [...c.owedDue.entries()]) {
      if (due < 0 || due >= S.turn) continue;
      c.owedDue.set(p, -1);
      if (c.owed.getOrDefault(p, 0) <= 0) continue;
      this.recordPay(p, false, c.at ?? p, c);
      this.missedPay(c, p, `The king of ${land(p)} did not pay me the ${formatMoney(c.owed.get(p))} he owed for my job.`);
      logEvent(S, "fee-unpaid", `${p} let ${c.name}'s fee go unpaid.`, [p], "fee-unpaid");
    }
};

/**
 * Jobs done, once the season's travellers have arrived and the tasks due are settled: a servant back at its master's court
 * with no task, whose errand is done or whose term has run out, has done its job. The rest is paid if its master's standing
 * order says so; otherwise it falls due unpaid. Then the job ends, and the man is free at that court, unless its master's
 * standing offer gives it the same job again and it takes it. A spy whose term runs out at its post sets out for home: its
 * errand is over, and the rest falls due when it is back.
 */
P.jobsDone = function (stood) {
  const S = this.s;
  this.duesSeason();
  for (const c of sortBy(
    S.characters.filter((c) => c.status === "Employed" && c.contract !== null && c.duty === "SpyPosted" && c.contract.untilTurn < S.turn && !c.contract.offerAgain),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    remember(c, S.turn, "My time at my post is over; I set out for home.");
    this.recall(c.employer!, c);
  }
  for (const c of sortBy(
    S.characters.filter((c) => c.status === "Employed" && c.contract !== null && c.duty === "SpyPosted" && c.contract.untilTurn < S.turn && c.contract.offerAgain),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    // The standing offer, known since the job was agreed: the same stay again, the rest of the old job carried into it.
    const emp = c.employer!;
    const k = c.contract!;
    const term = Math.max(1, k.untilTurn - k.startTurn);
    const ask = askingPrice(c, emp);
    // No advance can be handed over at a post abroad: the whole fee of the new stay falls due with the old job's rest.
    if (jobValue(k.fee, 0, trustIn(S, emp, c)) >= ask * term) {
      const carried = k.carried + Math.max(0, k.fee - k.advance);
      c.contract = newContract({ ...k, advance: 0, carried, startTurn: S.turn, untilTurn: S.turn + term, errand: k.errand === null ? null : { ...k.errand, done: false } });
      remember(c, S.turn, `I stay at my post another ${term} seasons, as my master offered when he hired me.`);
    } else {
      remember(c, S.turn, "My time at my post is over, and I will not stay on those terms; I set out for home.");
      this.recall(emp, c);
    }
  }
  for (const c of sortBy(
    S.characters.filter((c) => c.status === "Employed" && c.contract !== null && c.duty === "None" && c.at === c.employer && (c.contract.untilTurn < S.turn || c.contract.errand?.done === true)),
    [(c: Character) => idNumber(c.id), cmpNum],
  )) {
    const emp = c.employer!;
    if (!isAlive(S, emp)) continue;
    const k = c.contract!;
    const rest = k.captured ? 0 : restOf(k);
    const back = stood.getOrDefault(c.id, null) !== emp ? " is back at your court and" : "";
    let paid = rest === 0;
    if (rest > 0 && k.payOnDone && !k.withheld) paid = this.settleRest(c, emp, false);
    if (!paid) this.fallsDue(c, emp, rest, `My job for ${land(emp)} is done${k.payOnDone && !k.withheld ? ", and the treasury could not pay the rest" : ""}.`);
    const term = Math.max(1, k.untilTurn - k.startTurn);
    const t = S.treasuries.get(emp);
    // The standing offer: the same job again, which the man takes only if it is still worth its while and it was paid.
    if (k.offerAgain && paid && t.gold >= k.advance && jobValue(k.fee, k.advance, trustIn(S, emp, c)) >= askingPrice(c, emp) * term && this.jobFits(c, emp, k, term) === null) {
      t.gold -= k.advance;
      gain(c, k.advance, "Fees");
      c.contract = newContract({ ...k, carried: 0, startTurn: S.turn, untilTurn: S.turn + term, errand: k.errand === null ? null : { ...k.errand, done: false } });
      this.heardFee(c, rateOf(k.fee, term));
      remember(c, S.turn, `My job for ${land(emp)} is done, and I took the same job again, as offered, for ${formatMoney(k.fee)}.`);
      notify(S, emp, "Notice", "The same job again", `${c.name}${back} has done their job${rest > 0 ? (paid ? `, and was paid the rest of the fee, ${formatMoney(rest)}` : "") : ""}. As you offered with it, they took the same job again, through turn ${S.turn + term}, for ${formatMoney(k.fee)}, of which ${formatMoney(k.advance)} was handed over now.`, c.id);
      continue;
    }
    c.status = "Free";
    c.employer = null;
    c.contract = null;
    c.formerEmployer = emp;
    c.seeking = true;
    c.waited = 0;
    c.lastLife = null;
    remember(c, S.turn, `My job for ${land(emp)} is done; I am free at its court.`);
    notify(
      S,
      emp,
      "Notice",
      NoticeTitle,
      `${c.name}${back} has done their job${rest > 0 ? (paid ? `, and was paid the rest of the fee, ${formatMoney(rest)}` : `; the rest of the fee, ${formatMoney(rest)}, is due`) : ""}. The job has ended: they are free at your court, and another errand is a new offer (order hire), which they may take or not.${k.offerAgain && !paid ? " They would not take the same job again unpaid." : ""}`,
      c.id,
    );
    logEvent(S, "job-done", `${c.name}'s job for ${emp} is done.`, [emp], "job-done");
  }
};
