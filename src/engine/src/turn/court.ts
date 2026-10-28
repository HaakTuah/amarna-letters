/** Court business: hiring, renewal and dismissal of servants, the tasks the engine owes courts, and terms that end. */
import { clamp, roundEven, toInt } from "../core/num.ts";
import { cmpBool, cmpNum, desc, groupBy, sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { newMindRequest } from "../model/exchanges.ts";
import type { DismissOrder, HireOrder, Order, RenewOrder } from "../model/orders.ts";
import { coverOf, falseNameAt, gain, newContract, remember, reputationAt, type Character } from "../model/people.ts";
import { cmpPower, land, type Power } from "../model/power.ts";
import { newPendingTask } from "../model/records.ts";
import { char, findCharacter, logEvent, newId, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";

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
      case "seekCandidates":
        S.tasks.push(newPendingTask({ id: newId(S, "q"), kind: "Candidates", requester: p, dueTurn: S.turn + 1 }));
        break;
      case "check":
        if (this.pay(p, o.spend, `inquiries into ${findCharacter(S, o.character)?.name ?? o.character}`, o, "none were made"))
          S.tasks.push(newPendingTask({ id: newId(S, "q"), kind: "BackgroundCheck", requester: p, dueTurn: S.turn + 1, characterId: o.character, spend: o.spend }));
        break;
    }
  }

  // Hiring: when two courts bid for the same person, the higher wage wins.
  const hires = orders.filter(([, o]) => o.type === "hire").map(([p, o]) => ({ p, h: o as HireOrder }));
  for (const [key, group] of groupBy(hires, (x) => x.h.character)) {
    const c = char(S, key);
    if (c.status !== "Free") {
      for (const { p, h } of group) this.failed(p, h, "Not hired", `${c.name} was no longer free to take service.`, "no longer free", true, c.id);
      continue;
    }
    // Someone held at a court can only take service with the king who holds them.
    const bids = sortBy(
      group.filter((b) => b.h.wage >= askingPrice(c, b.p) && (c.heldBy === null || c.heldBy === b.p)),
      [(b: { p: Power; h: HireOrder }) => b.h.wage, desc(cmpNum)],
      [(b: { p: Power; h: HireOrder }) => c.traits.sympathy === b.p, desc(cmpBool)],
      [(b: { p: Power; h: HireOrder }) => b.p, cmpPower],
    );
    for (const lost of group.filter((b) => bids.length === 0 || b.p !== bids[0].p)) {
      // Why, as the person would say it: the price it asks this court, or that another court's offer won.
      const ask = askingPrice(c, lost.p);
      const why =
        lost.h.wage < ask
          ? `they ask ${formatMoney(ask)}`
          : c.heldBy !== null && c.heldBy !== lost.p
            ? `they are held at the court of ${c.heldBy}`
            : bids[0].h.wage > lost.h.wage
              ? "another court offered more"
              : "they chose another court that offered as much";
      this.failed(lost.p, lost.h, "Not hired", `${c.name} declined your offer of ${formatMoney(lost.h.wage)} a season: ${why}.`, why, lost.h.wage >= ask, c.id);
    }
    if (bids.length === 0) continue;
    const { p: winner, h: hire } = bids[0];
    c.status = "Employed";
    c.employer = winner;
    c.contract = newContract({ wage: hire.wage, startTurn: S.turn, untilTurn: S.turn + clamp(hire.term, 1, 30) });
    c.at = winner;
    c.duty = "None";
    c.heldBy = null;
    c.pitches.clear();
    c.reputation.set(winner, c.reputation.getOrDefault(winner, 0) + 5);
    this.meet(c, winner);
    remember(c, S.turn, `I entered the service of ${land(winner)} for ${formatMoney(hire.wage)} a season.`);
    // In the rulebook's words: a person hired enters your service at the end of the season, and can be sent on an errand from the next.
    notify(S, winner, "Notice", "Hired", `${c.name} entered your service at the end of last season, at ${formatMoney(hire.wage)} a season, and can be sent on an errand now.`, c.id);
    logEvent(S, "hire", `${winner} hired ${c.name}.`, [winner]);
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
  // Renewed early, a servant takes no cut: it asks what it would ask at the end of its term, or its present wage if that is more.
  const present = cover === null && c.contract!.noticePrice === null && c.contract!.wage >= renewalPrice(c, p);
  const price = cover !== null ? (cover.noticePrice ?? cover.wage) : present ? c.contract!.wage : renewalPrice(c, p);
  if (r.wage < price) {
    notify(S, p, "Rejected", "Not renewed", `${c.name} will not serve on for ${formatMoney(r.wage)} a season; they ask ${formatMoney(price)}${present ? ", their present wage" : ""}.`, c.id);
    return;
  }
  const until = S.turn + clamp(r.term, 1, 30);
  if (cover !== null) {
    cover.wage = r.wage;
    cover.contractUntil = until;
    cover.noticePrice = null;
    cover.leavesTurn = null;
  }
  if (serves) {
    c.contract = newContract({ wage: r.wage, startTurn: S.turn, untilTurn: until });
    remember(c, S.turn, `The king of ${land(p)} renewed my service at ${formatMoney(r.wage)} a season.`);
  }
  notify(S, p, "Notice", "Contract renewed", `${c.name} stays in your service at ${formatMoney(r.wage)} a season through turn ${until}.`, c.id);
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

/** What a character asks a court. Set by the character's own pitch when it gave one. */
export function askingPrice(c: Character, court: Power): number {
  const price = c.askingPrice.tryGet(court);
  if (price !== undefined) return price;
  return basePrice(c, court);
}

/**
 * What a person asks a court a season (item 10): by what it believes it can do, never its true skill ("Seeing oneself"), by
 * its greed, by its name at that court ("A name has a price"), and by the debts that press on its purse; less at the court
 * it favours, or where its lover or family is.
 */
export function basePrice(c: Character, court: Power): number {
  const rep = reputationAt(c, court);
  const belief = (c.belief.gather + c.belief.stealth + c.belief.forge) / 3;
  const debt = c.ties.filter((t) => t.kind === "Debt").reduce((a, t) => a + t.amount, 0);
  let price = 6 + Math.trunc(belief / 8) + Math.trunc(c.traits.greed / 8) + Math.trunc(rep / 5) + Math.min(9, Math.trunc(debt / 30));
  if (c.traits.sympathy === court) price -= 4;
  if (c.ties.some((t) => t.kind !== "Debt" && t.court === court)) price -= 3;
  return Math.max(5, price);
}

/** What a servant asks its master to serve on: the price it named when it gave notice, else what it would ask at the end of its term. */
export function renewalPrice(c: Character, court: Power): number {
  return c.contract?.noticePrice ?? basePrice(c, court) + (c.traits.greed > 60 ? 5 : 0) - (c.traits.loyalty > 70 ? 5 : 0);
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
        const free = S.characters.filter((c) => c.status === "Free");
        const picks = this.r("candidates", task.requester).shuffle(free).slice(0, 3);
        if (picks.length === 0) notify(S, task.requester, "Candidates", "No candidates", "Nobody came forward this season.");
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

  // Terms that have ended, for servants at court with no task: one still content with the wage serves on; one who wants
  // more, or is still owed back pay the treasury could not pay, gives a season's notice and names its price.
  for (const c of sortBy(
    S.characters.filter((c) => c.status === "Employed" && c.contract !== null && c.contract.noticePrice === null && c.contract.untilTurn < S.turn && c.duty === "None"),
    [(c: Character) => c.id, cmpStr],
  )) {
    const emp = c.employer!;
    let ask = renewalPrice(c, emp);
    const owed = c.backPay.getOrDefault(emp, 0);
    const k = c.contract!;
    if (ask <= k.wage * 1.2 && owed === 0) {
      k.untilTurn = S.turn + 6;
      notify(S, emp, "Notice", "Contract renewed", `${c.name} stays in your service at ${formatMoney(k.wage)} a season through turn ${k.untilTurn}.`, c.id);
    } else {
      // One still owed back pay is never content, but asks no less than it earns.
      if (owed > 0) ask = Math.max(ask, k.wage);
      k.noticePrice = ask;
      k.leavesTurn = S.turn + 1;
      remember(c, S.turn, `My term with ${land(emp)} has ended. I asked ${formatMoney(ask)} a season to serve on.`);
      notify(
        S,
        emp,
        "Notice",
        NoticeTitle,
        `${c.name}'s term has ended${owed > 0 ? `, and you still owe them ${formatMoney(owed)} of back pay` : ""}. They ask ${formatMoney(ask)} a season to serve on: renew them this season (order renew), or they leave at the start of turn ${S.turn + 1} (or, if you send them out first, when they are next at your court).`,
        c.id,
      );
    }
  }
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
    c.pitches.set(emp, `My term has ended. I would serve again for ${formatMoney(ask)} a season.`);
    remember(c, S.turn, `My term with ${land(emp)} ended; I asked for more and was not kept on, so I left.`);
    this.quit(c, `${c.name}'s term has ended and they were not renewed. They ask ${formatMoney(ask)} a season to serve again.`);
    c.at = emp;
  }
};
