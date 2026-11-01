/** Court business: hiring, new jobs and dismissal of servants, and the tasks the engine owes courts. */
import { clamp, idiv, roundEven, toInt } from "../core/num.ts";
import { cmpBool, cmpNum, desc, groupBy, sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { newMindRequest } from "../model/exchanges.ts";
import { isPowerParty, MoneyData } from "../model/money.ts";
import type { DismissOrder, HireOrder, Order, RenewOrder } from "../model/orders.ts";
import { coverOf, falseNameAt, gain, newContract, newJobErrand, newStayLeft, remember, reputationAt, lossesHeardOf, type Character, type JobErrand, type JobWhat } from "../model/people.ts";
import { cmpPower, land, type Power } from "../model/power.ts";
import { newPendingTask } from "../model/records.ts";
import { char, findCharacter, logEvent, newId, notify, upkeepOf } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { feeFor, jobValue, rateOf, restOf, trustIn } from "./jobs.ts";

/** The title of the notice that a servant's job is done. */
export const NoticeTitle = "A job done";
/** The title of the notice that a fee fell due unpaid: it wakes a sleeping seat, which has a season to pay it. */
export const FeeDueTitle = "A fee due";

declare module "./core.ts" {
  interface TurnEngine {
    resolveCourt(orders: [Power, Order][]): void;
    hireAll(hires: { p: Power; h: HireOrder }[], carriedTo?: Power | null): void;
    renew(p: Power, r: RenewOrder): void;
    dismiss(p: Power, c: Character, order: DismissOrder): void;
    tasksDue(): void;
  }
}

const P = TurnEngine.prototype;

P.resolveCourt = function (orders) {
  const S = this.s;
  // Names claimed first (item 17+), so the season's greetings carry them.
  for (const [p, o] of orders) if (o.type === "claimName") this.claimName(p, o);
  // Jobs first (Haakon's answers to item 11a): a man offered a job at court this season can be sent on its errand at once.
  this.hireAll(orders.filter(([, o]) => o.type === "hire" && ((o as HireOrder).via ?? null) === null).map(([p, o]) => ({ p, h: o as HireOrder })));
  for (const [p, o] of orders) if (o.type === "renew") this.renew(p, o);
  // Offers carried abroad go with the envoys named, sent this season.
  this._offersNow.clear();
  for (const [p, o] of orders)
    if (o.type === "hire" && (o.via ?? null) !== null) {
      const list = this._offersNow.getOrDefault(o.via!, []);
      list.push([p, o]);
      this._offersNow.set(o.via!, list);
    }
  for (const [p, o] of orders) {
    switch (o.type) {
      case "dispatch":
        this.dispatch(p, o);
        break;
      case "release":
        this.releaseEnvoy(p, o);
        break;
      case "dismiss":
        this.dismiss(p, char(S, o.character), o);
        break;
      case "gift":
        this.giftTo(p, o);
        break;
      case "payFee":
        this.payFeeOrder(p, o);
        break;
      case "borrow":
        this.borrowOrder(p, o);
        break;
      case "repay":
        this.repayOrder(p, o);
        break;
      case "buyNews":
        this.buyNewsOrder(p, o);
        break;
      case "seize":
        this.seizeHoard(p, o);
        break;
      case "sellDebt":
        this.sellDebtOrder(p, o);
        break;
      case "payCarriers":
        S.payCarriers = o.pay ? [...new Set([...S.payCarriers, p])] : S.payCarriers.filter((x) => x !== p);
        break;
      case "upkeep": {
        // Item 17+: the whole order, or the units of his standing in one province held back or given pay and food again.
        const cur = upkeepOf(S, p);
        if (o.province === undefined) S.upkeep.set(p, { pay: o.pay, feed: o.feed, payExcept: [], feedExcept: [] });
        else {
          const ids = S.units.filter((u) => u.power === p && u.province === o.province).map((u) => u.id);
          const held = (except: string[], give: boolean): string[] => (give ? except.filter((id) => !ids.includes(id)) : [...new Set([...except, ...ids])]);
          S.upkeep.set(p, { pay: cur.pay, feed: cur.feed, payExcept: held(cur.payExcept, o.pay), feedExcept: held(cur.feedExcept, o.feed) });
        }
        break;
      }
      case "hunt":
        S.huntNow.push(`${p}|${o.province}`);
        break;
      case "huntBands":
        {
          // A new standing hunt replaces the old; several given in the same season, each naming provinces, add up.
          // The old one is lifted: talk of that travels as talk of it did, so far chiefs go on fearing it a while.
          const before = S.hunts.find((h) => h.power === p && h.since === S.turn && h.until === null && h.provinces.length > 0 && (o.provinces ?? []).length > 0);
          if (before !== undefined) S.hunts.splice(S.hunts.indexOf(before), 1);
          for (const h of S.hunts) if (h.power === p && h.until === null) h.until = S.turn;
          // Talk of a lifted hunt has reached everyone within twenty seasons.
          S.hunts = S.hunts.filter((h) => h.until === null || S.turn - h.until <= 20);
          if (o.on) S.hunts.push({ power: p, provinces: [...new Set([...(before?.provinces ?? []), ...(o.provinces ?? [])])].sort(cmpStr), since: S.turn, until: null });
        }
        break;
      case "seekCandidates":
        S.tasks.push(newPendingTask({ id: newId(S, "q"), kind: "Candidates", requester: p, dueTurn: S.turn + 1 }));
        break;
      case "check":
        if (this.pay(p, o.spend, `inquiries into ${findCharacter(S, o.character)?.name ?? o.character}`, o, "none were made"))
          S.tasks.push(newPendingTask({ id: newId(S, "q"), kind: "BackgroundCheck", requester: p, dueTurn: S.turn + 1, characterId: o.character, spend: o.spend }));
        break;
    }
  }
  // An offer whose envoy did not set out goes nowhere.
  for (const [via, list] of this._offersNow.entries())
    for (const [p, h] of list) this.failed(p, h, "Offer not sent", `The offer to ${findCharacter(S, h.character)?.name ?? h.character} went nowhere: ${findCharacter(S, via)?.name ?? via} did not set out to carry it.`, "its envoy did not set out", true, h.character);
  this._offersNow.clear();
};

/** A job's errand as an order names it, or null for none. */
export function errandOf(o: { what?: JobWhat | null; where?: string | null }): JobErrand | null {
  return o.what === "envoy" || o.what === "spy" || o.what === "stay" ? newJobErrand({ what: o.what, where: o.where ?? "" }) : null;
}

/**
 * Hiring (item 11a, "Hiring as a negotiation", with Haakon's answers): a person is offered a job where it stands, at the
 * court (or, held, by the king who holds it), or by an envoy carrying the offer to where it is. It takes the offer worth
 * most to it, the advance in hand and the rest as far as it trusts the court from what it has heard, if that reaches what
 * it asks for the term and the term is long enough for the errand; every real offer is one it may cite elsewhere.
 * `carriedTo`: the court where an envoy brought the offers, their advances in its hands; null for offers at court.
 */
P.hireAll = function (hires, carriedTo = null) {
  const S = this.s;
  const carried = carriedTo !== null;
  for (const [key, group] of groupBy(hires, (x) => x.h.character)) {
    const c = char(S, key);
    if (c.status !== "Free" || c.errand !== null) {
      for (const { p, h } of group)
        if (carried) this.word(carriedTo!, p, "Job", `${findCharacter(S, h.via ?? "")?.name ?? "Your envoy"} could not put your offer to ${c.name} at the court of ${carriedTo}: they were no longer free to take service. The advance comes home with your envoy.`);
        else this.failed(p, h, "Not hired", `${c.name} was no longer free to take service.`, "no longer free", true, c.id);
      continue;
    }
    const term = (b: { h: HireOrder }): number => clamp(b.h.term, 1, 30);
    const value = (b: { p: Power; h: HireOrder }): number => jobValue(b.h.fee, Math.min(b.h.advance, b.h.fee), trustIn(S, b.p, c));
    const present = (b: { p: Power; h: HireOrder }): boolean => (carried ? c.heldBy === null && c.duty === "None" && c.at === carriedTo : c.heldBy === null ? c.at === b.p && c.duty === "None" : c.heldBy === b.p);
    const fits = (b: { p: Power; h: HireOrder }): string | null => this.jobFits(c, b.p, { errand: errandOf(b.h) }, term(b));
    const afford = (b: { p: Power; h: HireOrder }): boolean => carried || S.treasuries.get(b.p).gold >= Math.min(b.h.advance, b.h.fee);
    // Item 12: terms are agreed only between people who understand each other ("Speaking"): the envoy carrying the offer
    // and the man, or the court (its king, or a servant who bridges) and the man before it.
    const heard = (b: { p: Power; h: HireOrder }): boolean => {
      if (carried) {
        const envoy = findCharacter(S, b.h.via ?? "");
        return envoy === null || this.understands(envoy, c);
      }
      return this.courtHears(c, b.p, false).heard;
    };
    for (const b of group) if (present(b) && b.h.term > 0) c.offers.set(b.p, rateOf(b.h.fee, term(b)));
    const bids = sortBy(
      group.filter((b) => present(b) && heard(b) && value(b) >= askingPrice(c, b.p) * term(b) && fits(b) === null && afford(b)),
      [(b: { p: Power; h: HireOrder }) => rateOf(value(b), term(b)), desc(cmpNum)],
      [(b: { p: Power; h: HireOrder }) => c.traits.sympathy === b.p, desc(cmpBool)],
      [(b: { p: Power; h: HireOrder }) => b.p, cmpPower],
    );
    for (const lost of group.filter((b) => bids.length === 0 || b.p !== bids[0].p)) {
      // Why, as the person would say it: not there to be offered it, the price it asks this court, the errand's length, or
      // that another court's offer won.
      const ask = askingPrice(c, lost.p);
      const short = value(lost) < ask * term(lost);
      const why = !present(lost)
        ? c.heldBy !== null
          ? `they are held at the court of ${c.heldBy}`
          : carried
            ? "they were no longer there when your envoy came"
            : "they are not at your court: send the offer with an envoy going where they are (via)"
        : short
          ? `they ask ${formatMoney(ask)} a season of the term, ${formatMoney(feeFor(ask, term(lost), idiv(Math.min(lost.h.advance, lost.h.fee) * 100, Math.max(1, lost.h.fee)), trustIn(S, lost.p, c)))} for this one with this advance, counting the rest only as far as they trust your court to pay it, from what they have heard`
          : !heard(lost)
            ? carried
              ? "your envoy and they could not make themselves understood this season"
              : "nobody at your court could make themselves understood to them this season"
            : fits(lost) !== null
              ? fits(lost)!
            : !afford(lost)
              ? "the treasury could not hand over the advance"
              : "another court offered more";
      if (carried) {
        // The advance stays with the envoy, which brings it home; word of the answer comes home by the roads.
        const envoy = findCharacter(S, lost.h.via ?? "");
        this.word(carriedTo!, lost.p, "Job", `${envoy?.name ?? "Your envoy"} put your offer of a job to ${c.name} at the court of ${carriedTo}, who declined: ${why}. The advance comes home with your envoy.`);
      } else this.failed(lost.p, lost.h, "Not hired", `${c.name} declined your offer of ${formatMoney(lost.h.fee)} for ${term(lost)} seasons: ${why}.`, why, present(lost) && heard(lost) && !short, c.id);
    }
    if (bids.length === 0) continue;
    const { p: winner, h: hire } = bids[0];
    const advance = clamp(hire.advance, 0, hire.fee);
    if (!carried) S.treasuries.get(winner).gold -= advance;
    else {
      const envoy = findCharacter(S, hire.via ?? "");
      if (envoy !== null) envoy.carriedFor = Math.max(0, envoy.carriedFor - advance);
    }
    gain(c, advance, "Fees");
    c.status = "Employed";
    c.employer = winner;
    c.contract = newContract({ fee: hire.fee, advance, startTurn: S.turn, untilTurn: S.turn + term(bids[0]), errand: errandOf(hire), payOnDone: hire.payOnDone === true, offerAgain: hire.offerAgain === true });
    if (c.contract.errand?.what === "stay") logEvent(S, "job", `${c.name} took ${winner}'s job to stay at its court.`, [winner], "stay-hired");
    c.duty = "None";
    c.heldBy = null;
    c.waited = 0;
    c.pitches.clear();
    c.offers.clear();
    c.reputation.set(winner, c.reputation.getOrDefault(winner, 0) + 5);
    // A court that takes people on is a court that is hiring, as those who hear of it know.
    S.hiring.set(winner, S.turn);
    // Those standing there hear what the job pays (Haakon's answers: what others were paid is what a person has heard).
    const rate = rateOf(hire.fee, term(bids[0]));
    for (const x of S.characters) if (x.status !== "Dead" && x.at !== null && x.at === c.at && x.heldBy === null) this.heardFee(x, rate);
    const errand = errandWords(c.contract.errand, (x) => this.map.exists(x) ? this.map.get(x).name : x);
    remember(c, S.turn, `I took a job with ${land(winner)}${errand}, within ${term(bids[0])} seasons, for ${formatMoney(hire.fee)}, ${formatMoney(advance)} of it handed over now.`);
    logEvent(S, "hire", `${winner} hired ${c.name}${carried ? " by an envoy's offer" : ""}.`, [winner], carried ? "hire-abroad" : "hire");
    if (!carried) {
      c.at = winner;
      this.meet(c, winner);
      notify(S, winner, "Notice", "Hired", `${c.name} took your job${errand}, within ${term(bids[0])} seasons and for ${formatMoney(hire.fee)}; you handed over ${formatMoney(advance)}, and the rest, ${formatMoney(hire.fee - advance)}, falls due when the job is done${hire.payOnDone === true ? ", and you will pay it then, as you ordered" : ", paid only if you order it"}. They can be sent on its errand now.`, c.id);
      continue;
    }
    // Hired abroad: a spy whose post is where it stands takes it up at once; anyone else sets out for its master's court.
    const e = c.contract.errand;
    const at = c.at!;
    const here = e !== null && e.what === "spy" && (e.where === at || e.where === this.courtAt(at));
    if (here) {
      c.duty = "SpyPosted";
      c.missionTarget = e!.where === at ? at : null;
      c.watchProvince = e!.where === at ? null : e!.where;
      if (c.watchProvince !== null) c.at = null;
      c.turnsAbroad = 0;
    } else {
      this.startTravel(c, winner);
      c.duty = "Travelling";
    }
    // The court learns it only when word comes home by the roads; until then it does not count him its own.
    c.contract.knownFrom = S.turn + (at === winner ? 0 : this.travelTurns(at, winner));
    this.word(at, winner, "Job", `${c.name} took the job your envoy offered at the court of ${at}${errand}, within ${term(bids[0])} seasons and for ${formatMoney(hire.fee)}, in season ${S.turn}; your envoy handed over ${formatMoney(advance)}. ${here ? "They took up their post there at once." : "They set out for your court."}`);
  }
};

/** A job's errand in words, after "a job". */
export function errandWords(e: JobErrand | null, name: (x: string) => string): string {
  if (e === null) return "";
  if (e.what === "stay") return " to stay at court";
  return e.what === "envoy" ? ` as envoy to ${e.where}` : ` to watch ${isPowerParty(e.where) ? `the court of ${e.where}` : name(e.where)}`;
}

/**
 * A new job offered to one of the court's own (Haakon's answers to item 11a: renewing is a new offer the man must accept):
 * taken if it is worth what it asks for the term and the term fits the errand. The new job is made this season; the rest
 * of the present one, not yet due, is carried into it. A servant abroad whose fate its master has not heard of is offered
 * it as the master believes it, so nothing is betrayed. A refusal wakes nobody.
 */
P.renew = function (p, r) {
  const S = this.s;
  const c = char(S, r.character);
  const cover = coverOf(c, p);
  const serves = c.employer === p && (c.status === "Employed" || c.status === "Captured") && c.contract !== null;
  if (cover === null && !serves) {
    // Dismissed earlier this season.
    notify(S, p, "Rejected", "Not renewed", `${c.name} is no longer in your service, so could not be offered a new job.`, c.id);
    return;
  }
  const term = clamp(r.term, 1, 30);
  const advance = clamp(r.advance, 0, r.fee);
  const price = askingPrice(c, p);
  const k = cover === null ? c.contract! : null;
  const errand = errandOf(r);
  if (jobValue(r.fee, advance, trustIn(S, p, c)) < price * term) {
    notify(S, p, "Rejected", "Not renewed", `${c.name} will not take a new job for ${formatMoney(r.fee)} within ${term} seasons with ${formatMoney(advance)} now; they ask ${formatMoney(price)} a season, counting the rest only as far as they trust your court to pay it, from what they have heard.`, c.id);
    return;
  }
  const fit = cover === null ? this.jobFits(c, p, { errand }, term) : null;
  if (fit !== null) {
    notify(S, p, "Rejected", "Not renewed", `${c.name} will not take the new job: ${fit}.`, c.id);
    return;
  }
  if (S.treasuries.get(p).gold < advance) {
    notify(S, p, "Rejected", "Not renewed", `The treasury could not hand over the advance of ${formatMoney(advance)} for ${c.name}'s new job.`, c.id);
    return;
  }
  const until = S.turn + term;
  S.treasuries.get(p).gold -= advance;
  if (cover !== null) {
    cover.fee = r.fee;
    cover.advance = advance;
    cover.startTurn = S.turn;
    cover.contractUntil = until;
  }
  if (serves) {
    gain(c, advance, "Fees");
    // Haakon's answers to item 11b+: an errand given during a stay is its own job with its own fee; the stay waits beside it.
    // A new stay takes the place of one waiting beside the errand, whose rest it carries.
    const staying = k!.errand?.what === "stay" && errand?.what !== "stay" && k!.untilTurn >= S.turn && !k!.captured;
    const old = errand?.what === "stay" && k!.stay !== null ? k!.stay.rest : 0;
    const stay = staying ? newStayLeft({ until: k!.untilTurn, rest: restOf(k!), payOnDone: k!.payOnDone && !k!.withheld }) : errand?.what === "stay" ? null : k!.stay;
    c.contract = newContract({ fee: r.fee, advance, carried: staying ? 0 : restOf(k!) + old, startTurn: S.turn, untilTurn: until, errand, payOnDone: r.payOnDone === true, offerAgain: r.offerAgain === true, stay });
    this.heardFee(c, rateOf(r.fee, term));
    remember(c, S.turn, `The king of ${land(p)} gave me a new job${errandWords(errand, (x) => (this.map.exists(x) ? this.map.get(x).name : x))}, within ${term} seasons, for ${formatMoney(r.fee)}, ${formatMoney(advance)} of it now.`);
  }
  const carried = k !== null && serves ? c.contract!.carried : 0;
  const stay = k !== null && serves ? c.contract!.stay : null;
  notify(S, p, "Notice", "A new job taken", `${c.name} took the new job, through turn ${until}, for ${formatMoney(r.fee)}${carried > 0 ? ` (and the ${formatMoney(carried)} still to come from the job before)` : ""}, of which you handed over ${formatMoney(advance)} now.${stay !== null && k?.stay !== stay ? ` Their stay at your court goes on when it is done, until turn ${stay.until}, its rest of ${formatMoney(stay.rest)} still to come.` : ""}`, c.id);
};

/**
 * A servant dismissed: its wage ends, and so does whatever its master still believed of it. Nobody is moved: one dismissed
 * while away keeps going where it was going and is free when it gets there, and one who is held stays held.
 */
P.dismiss = function (p, c, order) {
  const S = this.s;
  const cover = coverOf(c, p);
  if (cover !== null) c.covers.splice(c.covers.indexOf(cover), 1);
  else if (c.employer !== p) {
    this.failed(p, order, "Dismissal failed", `${c.name} was no longer in your service, so could not be dismissed.`, "no longer in your service", true, c.id);
    return;
  }
  let notice = `${c.name} has been dismissed.`;
  if (c.employer !== p || !(c.status === "Employed" || c.status === "Captured")) {
    // Gone over to another court, or dead, unknown to its master: the court only stops paying what it believed it owed.
    notify(S, p, "Notice", "A servant leaves", notice, c.id);
    return;
  }
  remember(c, S.turn, `The king of ${land(p)} dismissed me.`);
  // Haakon's answer to item 11a (opening item 11b): a dismissal before the job's term ends is a broken promise on record.
  if (c.contract !== null && Math.max(c.contract.untilTurn, c.contract.stay?.until ?? 0) > S.turn) this.recordPay(p, false, p, c);
  c.formerEmployer = p;
  c.employer = null;
  c.contract = null;
  // A dismissed captive stays a captive: only the court that holds them can let them go.
  if (c.status === "Employed") c.status = "Free";
  switch (c.duty) {
    case "EnvoyOutbound": {
      // It goes on to the court it was sent to and arrives there free, with no audience: the gold it carried is its own.
      const d = S.journeys.find((j) => j.kind === "EnvoyOutbound" && j.characterId === c.id)?.dispatch ?? null;
      if (d !== null && d.gold > 0) {
        gain(c, toInt(roundEven((d.gold * d.purityPercent) / 100.0)), "Carried");
        remember(c, S.turn, `I keep the gold I carried, said to be ${formatMoney(d.gold)}.`);
        notice += ` The ${formatMoney(d.gold)} of gold they carried is now theirs.`;
        d.gold = 0;
      }
      break;
    }
    case "SpyPosted":
      if (c.missionTarget !== null) {
        // Free at the court it watched.
        const court = c.missionTarget;
        c.duty = "None";
        c.at = court;
        c.missionTarget = null;
        c.watchProvince = null;
      }
      // A province watcher walks back to the court it left, and is free there.
      else this.recall(p, c);
      break;
    case "None":
    case "EnvoyAtCourt":
      c.duty = "None";
      c.at ??= p;
      break;
    // On the road home or to its post it keeps going (see the arrivals); a held envoy stays held until the jailer lets it go.
  }
  notify(S, p, "Notice", "A servant leaves", notice, c.id);
};

/** What a character asks a court a season of a job's term. Set by the character's own pitch when it gave one. */
export function askingPrice(c: Character, court: Power): number {
  const price = c.askingPrice.tryGet(court);
  if (price !== undefined) return price;
  return basePrice(c, court);
}

/** Item 11b (first guesses): what a person asks more of a court for each of its people it heard were lost abroad, and each it put to death, in percent, at most `WaryMost`. */
export const WaryLost = 10;
export const WaryKilled = 15;
/** Haakon's answers to item 11a (a first guess): what a person asks more of a court it heard seized a hoard, in percent, each. */
export const WarySeized = 15;
export const WaryMost = 60;

/**
 * What a person asks a court a season of a job's term (item 10): by what it believes it can do, never its true skill
 * ("Seeing oneself"), by its greed, by its name at that court ("A name has a price"), and by the debts that press on its
 * purse; less at the court it favours, or where its lover or family is. Then it bargains from what it has heard a job pays
 * (Haakon's answers to item 11a: no going rate, no floor set by the engine; "what others were paid is only what a
 * character has heard, and he bargains from it"), and asks more of a court it heard loses its people or seizes hoards.
 */
export function basePrice(c: Character, court: Power): number {
  const rep = reputationAt(c, court);
  const belief = (c.belief.gather + c.belief.stealth + c.belief.forge) / 3;
  const debt = c.ties.filter((t) => t.kind === "Debt").reduce((a, t) => a + t.amount, 0);
  let price = 6 + Math.trunc(belief / 8) + Math.trunc(c.traits.greed / 8) + Math.trunc(rep / 5) + Math.min(9, Math.trunc(debt / 30));
  if (c.traits.sympathy === court) price -= 4;
  if (c.ties.some((t) => t.kind !== "Debt" && t.court === court)) price -= 3;
  price = Math.max(1, price);
  if (c.heardRate !== null) price = Math.max(1, toInt(roundEven((price * (100 - MoneyData.heardWeight) + c.heardRate * MoneyData.heardWeight) / 100)));
  // Item 11b, reputation from losses abroad: a court it heard loses its people abroad, or puts others to death, it serves
  // only for more, the timid most ("Jobs, not wages"); and one it heard seizes hoards.
  const heard = lossesHeardOf(c, court);
  const wary = Math.trunc((Math.min(WaryMost, WaryLost * heard.lost + WaryKilled * heard.killed + WarySeized * heard.seized) * (100 - Math.trunc(c.traits.courage / 2))) / 100);
  price += Math.trunc((price * wary) / 100);
  return price;
}

P.tasksDue = function () {
  const S = this.s;
  for (const task of sortBy(
    S.tasks.filter((t) => t.dueTurn <= S.turn),
    [(t) => idNumber(t.id), cmpNum],
  )) {
    switch (task.kind) {
      case "Questioning": {
        S.tasks.splice(S.tasks.indexOf(task), 1);
        const c = findCharacter(S, task.characterId!);
        if (c !== null && c.status === "Captured" && c.heldBy === task.requester)
          this.mindRequests.push(newMindRequest({ id: newId(S, "r"), task: "Questioned", characterId: c.id, court: task.requester, copyIds: [...task.tabletIds] }));
        break;
      }
      case "Candidates": {
        S.tasks.splice(S.tasks.indexOf(task), 1);
        // Item 11a: candidates pitch in person, so only those seeking service at the court come forward; word that the court
        // is hiring goes out, and others may come (see the characters' own seasons).
        S.hiring.set(task.requester, S.turn);
        const free = S.characters.filter((c) => c.status === "Free" && c.seeking && c.at === task.requester && c.heldBy === null && c.duty === "None");
        const picks = this.r("candidates", task.requester).shuffle(free).slice(0, 3);
        if (picks.length === 0) notify(S, task.requester, "Candidates", "No candidates", "Nobody seeking service stands at your court this season. Word that you are hiring goes out, and those who hear it may come.");
        // Each meets the court by its pitch, and may give it a name other than its own (item 10, "Declaring a name").
        for (const c of picks)
          this.mindRequests.push(
            newMindRequest({
              id: newId(S, "r"),
              task: "Pitch",
              characterId: c.id,
              court: task.requester,
              aliases: c.met.includes(task.requester) ? [] : this.aliasesFor(c, task.requester),
              envoyOf: c.met.includes(task.requester) ? null : this.envoyOfFor(c, task.requester),
            }),
          );
        break;
      }
      case "BackgroundCheck": {
        S.tasks.splice(S.tasks.indexOf(task), 1);
        const c = findCharacter(S, task.characterId);
        if (c === null) break;
        const rng = this.r("check", task.id);
        // Inquiries may turn up the truth about a false name (item 10, "Kings never see skills"), as a hidden fact would be.
        const alias = falseNameAt(c, task.requester);
        if (alias !== null && this.r("check-name", task.id).chance(Math.min(0.9, task.spend / 150.0))) this.expose(c, alias, "your inquiries found out who they are");
        const found: string[] = [];
        const cover = coverOf(c, task.requester);
        for (const f of c.facts) {
          if (f.knownBy.includes(task.requester)) continue;
          const p = f.secrecy === "Public" ? 1.0 : f.secrecy === "Hidden" ? Math.min(0.9, task.spend / 150.0) : Math.min(0.6, task.spend / 400.0);
          if (!rng.chance(p)) continue;
          if (f.secrecy !== "Public") f.knownBy.push(task.requester);
          // A servant the court believes away: what the inquiries found shows in its court list, as for any servant.
          else if (cover !== null && !cover.factIds.includes(f.id)) cover.factIds.push(f.id);
          found.push(f.text);
        }
        this.mindRequests.push(newMindRequest({ id: newId(S, "r"), task: "CheckReport", characterId: c.id, court: task.requester, taskId: task.id, facts: found }));
        break;
      }
      case "Authenticate":
        S.tasks.splice(S.tasks.indexOf(task), 1);
        this.finishAuthentication(task);
        break;
      case "RansomDemand": {
        S.tasks.splice(S.tasks.indexOf(task), 1);
        const held = findCharacter(S, task.characterId);
        // A demand that lapses while a newer one for the same captive is on the road: the captor waits for that one.
        if (held !== null && held.status === "Captured" && task.other !== null && !S.tasks.some((t) => t.kind === "RansomDemand" && t.characterId === held.id))
          notify(S, task.other, "Notice", "No ransom came", `No ransom has come for ${held.name}. They remain your captive.`, held.id);
        break;
      }
    }
  }
};
