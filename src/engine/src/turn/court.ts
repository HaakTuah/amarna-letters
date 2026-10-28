/** Court business: hiring, renewal and dismissal of servants, the tasks the engine owes courts, and terms that end. */
import { clamp, idiv, roundEven, toInt } from "../core/num.ts";
import { cmpBool, cmpNum, desc, groupBy, sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { newMindRequest } from "../model/exchanges.ts";
import type { DismissOrder, HireOrder, Order, RenewOrder } from "../model/orders.ts";
import { coverOf, falseNameAt, gain, newContract, remember, reputationAt, lossesHeardOf, type Character } from "../model/people.ts";
import { cmpPower, land, type Power } from "../model/power.ts";
import { newPendingTask } from "../model/records.ts";
import { char, findCharacter, logEvent, newId, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { feeFor, jobValue, rateOf, trustIn } from "./jobs.ts";

/** The title of the notice a servant gives when its term has ended and it wants more: it wakes a sleeping seat. */
export const NoticeTitle = "A servant gives notice";

declare module "./core.ts" {
  interface TurnEngine {
    resolveCourt(orders: [Power, Order][]): void;
    renew(p: Power, r: RenewOrder): void;
    dismiss(p: Power, c: Character, order: DismissOrder): void;
    tasksDue(): void;
    noticesRunOut(): void;
  }
}

const P = TurnEngine.prototype;

P.resolveCourt = function (orders) {
  const S = this.s;
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
      case "seekCandidates":
        S.tasks.push(newPendingTask({ id: newId(S, "q"), kind: "Candidates", requester: p, dueTurn: S.turn + 1 }));
        break;
      case "check":
        if (this.pay(p, o.spend, `inquiries into ${findCharacter(S, o.character)?.name ?? o.character}`, o, "none were made"))
          S.tasks.push(newPendingTask({ id: newId(S, "q"), kind: "BackgroundCheck", requester: p, dueTurn: S.turn + 1, characterId: o.character, spend: o.spend }));
        break;
    }
  }

  // Hiring (item 11a, "Hiring as a negotiation"): a person is hired in person, at the court where it stands (or, held, by
  // the king who holds it), for a job with a fee. It takes the offer worth most to it, the advance in hand and the rest as
  // far as it trusts the court, if that reaches what it asks for the term; every real offer is one it may cite elsewhere.
  const hires = orders.filter(([, o]) => o.type === "hire").map(([p, o]) => ({ p, h: o as HireOrder }));
  for (const [key, group] of groupBy(hires, (x) => x.h.character)) {
    const c = char(S, key);
    if (c.status !== "Free" || c.errand !== null) {
      for (const { p, h } of group) this.failed(p, h, "Not hired", `${c.name} was no longer free to take service.`, "no longer free", true, c.id);
      continue;
    }
    const value = (b: { p: Power; h: HireOrder }): number => jobValue(b.h.fee, Math.min(b.h.advance, b.h.fee), trustIn(S, b.p));
    const present = (b: { p: Power; h: HireOrder }): boolean => (c.heldBy === null ? c.at === b.p && c.duty === "None" : c.heldBy === b.p);
    for (const b of group) if (present(b) && b.h.term > 0) c.offers.set(b.p, rateOf(b.h.fee, clamp(b.h.term, 1, 30)));
    const bids = sortBy(
      group.filter((b) => present(b) && value(b) >= askingPrice(c, b.p, S.goingRate) * clamp(b.h.term, 1, 30) && S.treasuries.get(b.p).gold >= Math.min(b.h.advance, b.h.fee)),
      [(b: { p: Power; h: HireOrder }) => rateOf(value(b), clamp(b.h.term, 1, 30)), desc(cmpNum)],
      [(b: { p: Power; h: HireOrder }) => c.traits.sympathy === b.p, desc(cmpBool)],
      [(b: { p: Power; h: HireOrder }) => b.p, cmpPower],
    );
    for (const lost of group.filter((b) => bids.length === 0 || b.p !== bids[0].p)) {
      // Why, as the person would say it: not here to be hired, the price it asks this court, or that another court's offer won.
      const term = clamp(lost.h.term, 1, 30);
      const ask = askingPrice(c, lost.p, S.goingRate);
      const short = value(lost) < ask * term;
      const why = !present(lost)
        ? c.heldBy !== null
          ? `they are held at the court of ${c.heldBy}`
          : "they are not at your court: a person is hired in person, where it stands"
        : short
          ? `they ask ${formatMoney(ask)} a season of the term, ${formatMoney(feeFor(ask, term, idiv(Math.min(lost.h.advance, lost.h.fee) * 100, Math.max(1, lost.h.fee)), trustIn(S, lost.p)))} for this one with this advance, counting the rest only as far as they trust your court to pay it`
          : S.treasuries.get(lost.p).gold < Math.min(lost.h.advance, lost.h.fee)
            ? "the treasury could not hand over the advance"
            : "another court offered more";
      this.failed(lost.p, lost.h, "Not hired", `${c.name} declined your offer of ${formatMoney(lost.h.fee)} for ${term} seasons: ${why}.`, why, present(lost) && !short, c.id);
    }
    if (bids.length === 0) continue;
    const { p: winner, h: hire } = bids[0];
    const term = clamp(hire.term, 1, 30);
    const advance = clamp(hire.advance, 0, hire.fee);
    S.treasuries.get(winner).gold -= advance;
    gain(c, advance, "Fees");
    c.status = "Employed";
    c.employer = winner;
    c.contract = newContract({ fee: hire.fee, advance, startTurn: S.turn, untilTurn: S.turn + term });
    c.at = winner;
    c.duty = "None";
    c.heldBy = null;
    c.waited = 0;
    c.pitches.clear();
    c.offers.clear();
    c.reputation.set(winner, c.reputation.getOrDefault(winner, 0) + 5);
    this.meet(c, winner);
    remember(c, S.turn, `I took a job with ${land(winner)} for ${term} seasons, for ${formatMoney(hire.fee)}, ${formatMoney(advance)} of it handed over now.`);
    // In the rulebook's words: a person hired enters your service at the end of the season, and can be sent on an errand from the next.
    notify(S, winner, "Notice", "Hired", `${c.name} took your job at the end of last season, for ${term} seasons and ${formatMoney(hire.fee)}; you handed over ${formatMoney(advance)}, and the rest, ${formatMoney(hire.fee - advance)}, falls due when the job is done. They can be sent on an errand now.`, c.id);
    logEvent(S, "hire", `${winner} hired ${c.name}.`, [winner], "hire");
  }

  // Renewals, settled with hiring.
  for (const [p, o] of orders) if (o.type === "renew") this.renew(p, o);
};

/**
 * A servant kept on: accepted if the wage reaches its renewal price (what it asked when it gave notice, else the renewal
 * formula, and never less than its present wage). The new contract is made this season, its term counts from the next, as
 * for a hire, and any notice ends. A servant abroad whose fate its master has not heard of is renewed as the master
 * believes it, so nothing is betrayed. A renewal that fails wakes nobody, scheduled or not: the servant's price follows a
 * rule, and a dismissal earlier in the season is the seat's own, so either would let a king wake himself with an offer he
 * knows is too low. A servant's notice wakes the seat by itself.
 */
P.renew = function (p, r) {
  const S = this.s;
  const c = char(S, r.character);
  const cover = coverOf(c, p);
  const serves = c.employer === p && (c.status === "Employed" || c.status === "Captured") && c.contract !== null;
  if (cover === null && !serves) {
    // Dismissed earlier this season.
    notify(S, p, "Rejected", "Not renewed", `${c.name} is no longer in your service, so could not be renewed.`, c.id);
    return;
  }
  const term = clamp(r.term, 1, 30);
  const advance = clamp(r.advance, 0, r.fee);
  // Renewed early, a servant takes no cut: it asks what it would ask at the end of its term, or what its present job pays
  // a season if that is more; the rest of the present job, not yet due, is carried into the new one.
  const k = cover === null ? c.contract! : null;
  const presentRate = k === null ? 0 : rateOf(k.fee, Math.max(1, k.untilTurn - k.startTurn));
  const early = k !== null && k.noticePrice === null;
  const present = early && presentRate >= renewalPrice(c, p, S.goingRate);
  const price = cover !== null ? (cover.noticePrice ?? renewalPrice(c, p, S.goingRate)) : present ? presentRate : renewalPrice(c, p, S.goingRate);
  const carried = early ? Math.max(0, k!.fee - k!.advance) : 0;
  if (jobValue(r.fee, advance, trustIn(S, p)) < price * term) {
    notify(S, p, "Rejected", "Not renewed", `${c.name} will not serve on for ${formatMoney(r.fee)} for ${term} seasons with ${formatMoney(advance)} now; they ask ${formatMoney(price)} a season${present ? ", what their present job pays" : ""}, counting the rest only as far as they trust your court to pay it.`, c.id);
    return;
  }
  if (S.treasuries.get(p).gold < advance) {
    notify(S, p, "Rejected", "Not renewed", `The treasury could not hand over the advance of ${formatMoney(advance)} to renew ${c.name}.`, c.id);
    return;
  }
  const until = S.turn + term;
  S.treasuries.get(p).gold -= advance;
  if (cover !== null) {
    cover.fee = r.fee;
    cover.advance = advance;
    cover.startTurn = S.turn;
    cover.contractUntil = until;
    cover.noticePrice = null;
    cover.leavesTurn = null;
  }
  if (serves) {
    gain(c, advance, "Fees");
    c.contract = newContract({ fee: r.fee + carried, advance, startTurn: S.turn, untilTurn: until });
    remember(c, S.turn, `The king of ${land(p)} gave me a new job of ${term} seasons for ${formatMoney(r.fee)}, ${formatMoney(advance)} of it now.`);
  }
  notify(S, p, "Notice", "Contract renewed", `${c.name} stays in your service through turn ${until}, for ${formatMoney(r.fee)}${carried > 0 ? ` (and the ${formatMoney(carried)} still to come from the job before)` : ""}, of which you handed over ${formatMoney(advance)} now.`, c.id);
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
export function askingPrice(c: Character, court: Power, rate = 100): number {
  const price = c.askingPrice.tryGet(court);
  if (price !== undefined) return price;
  return basePrice(c, court, rate);
}

/**
 * What a person asks a court a season of a job's term (item 10): by what it believes it can do, never its true skill
 * ("Seeing oneself"), by its greed, by its name at that court ("A name has a price"), and by the debts that press on its
 * purse; less at the court it favours, or where its lover or family is; all scaled by the going rate of service (item 11a,
 * "Fees clear the market"), in percent.
 */
/** Item 11b (first guesses): what a person asks more of a court for each of its people it heard were lost abroad, and each it put to death, in percent, at most `WaryMost`. */
export const WaryLost = 10;
export const WaryKilled = 15;
export const WaryMost = 60;

export function basePrice(c: Character, court: Power, rate = 100): number {
  const rep = reputationAt(c, court);
  const belief = (c.belief.gather + c.belief.stealth + c.belief.forge) / 3;
  const debt = c.ties.filter((t) => t.kind === "Debt").reduce((a, t) => a + t.amount, 0);
  let price = 6 + Math.trunc(belief / 8) + Math.trunc(c.traits.greed / 8) + Math.trunc(rep / 5) + Math.min(9, Math.trunc(debt / 30));
  if (c.traits.sympathy === court) price -= 4;
  if (c.ties.some((t) => t.kind !== "Debt" && t.court === court)) price -= 3;
  // Item 11b, reputation from losses abroad: a court it heard loses its people abroad, or puts others to death, it serves
  // only for more, the timid most ("Jobs, not wages").
  const heard = lossesHeardOf(c, court);
  const wary = Math.trunc((Math.min(WaryMost, WaryLost * heard.lost + WaryKilled * heard.killed) * (100 - Math.trunc(c.traits.courage / 2))) / 100);
  price = Math.max(5, price);
  price += Math.trunc((price * wary) / 100);
  return Math.max(3, toInt(roundEven((price * rate) / 100)));
}

/** What a servant asks its master a season to serve on: the price it named when it gave notice, else what it would ask at the end of its term. */
export function renewalPrice(c: Character, court: Power, rate = 100): number {
  return c.contract?.noticePrice ?? basePrice(c, court, rate) + (c.traits.greed > 60 ? 5 : 0) - (c.traits.loyalty > 70 ? 5 : 0);
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

  // Servants on notice who came home this season leave now.
  this.noticesRunOut();
};

/**
 * Servants whose notice has run out and who were not renewed leave, if they are at court with no task (one away leaves
 * when it is next at court): free at the court they served, asking the price they named. Checked at the start of a
 * season, before wages, and again once the season's travellers have arrived.
 */
P.noticesRunOut = function () {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => c.status === "Employed" && c.contract !== null && c.contract.leavesTurn !== null && c.contract.leavesTurn <= S.turn && c.duty === "None"),
    [(c: Character) => c.id, cmpStr],
  )) {
    const emp = c.employer!;
    const ask = c.contract!.noticePrice!;
    c.askingPrice.set(emp, ask);
    c.pitches.set(emp, `My job is done. I would serve again for ${formatMoney(ask)} a season of a new term.`);
    remember(c, S.turn, `My term with ${land(emp)} ended; I asked for more and was not kept on, so I left.`);
    this.quit(c, `${c.name}'s job is done and they were not renewed. They ask ${formatMoney(ask)} a season of a new term to serve again.`);
    c.at = emp;
  }
};
