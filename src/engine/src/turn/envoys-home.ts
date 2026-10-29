/** Envoys home: their return and report, release by a host, their business abroad, and requests fulfilled (split from envoys.ts). */
import { clamp, roundEven, toInt } from "../core/num.ts";
import { isBlank, trim } from "../core/text.ts";
import type { MindReply, MindRequest } from "../model/exchanges.ts";
import { newMindRequest, requestFor } from "../model/exchanges.ts";
import { hire, type ReleaseOrder } from "../model/orders.ts";
import { falseNameAt, gain, nameKnownAt, remember, type Character } from "../model/people.ts";
import { debtLeft, isPowerParty } from "../model/money.ts";
import { land, type Power } from "../model/power.ts";
import { newExchange, newHomeCargo, newTabletCopy, type HomeCargo, type Journey } from "../model/records.ts";
import { char, findCharacter, inboxOf, isAlive, logEvent, newGoldLot, newId, notify } from "../model/state.ts";

import { formatMoney } from "../rules/calendar.ts";
import { claimOf, clampSkills } from "../rules/skills.ts";
import { cap } from "../rules/greeting.ts";
import { checkClauses } from "../rules/clauses.ts";
import { removeAll } from "./resolve.ts";
import { TurnEngine } from "./core.ts";

import { MaxSpeech } from "./envoys.ts";

declare module "./core.ts" {
  interface TurnEngine {
    envoyArrivesHome(j: Journey): void;
    releaseEnvoy(host: Power, r: ReleaseOrder): void;
    letEnvoyGo(host: Power, c: Character, reply: string | null): void;
    fulfil(req: MindRequest, reply: MindReply): void;
    envoyBusinessAbroad(c: Character, j: Journey): void;
    carriedHome(c: Character, home: Power): void;
    claimAnswered(court: Power, asked: Power, cargo: HomeCargo): void;
  }
}

const P = TurnEngine.prototype;

P.envoyArrivesHome = function (j) {
  const S = this.s;
  const c = char(S, j.characterId!);
  // Taken into another court's service on the way: it is there already. One dismissed on the way still comes home and reports.
  if (c.status === "Employed" && c.employer !== j.to) return;
  // Home to a besieged capital: the besiegers may catch it as it slips in, with what it carries.
  if (c.status === "Employed") {
    const besieged = this.capitalSiege(j.to);
    if (besieged !== null && this.caughtByBesiegers(c, besieged[1])) {
      this.intercept(c, j.to, besieged[0], false, null, j.cargo, S.turn);
      return;
    }
  }
  this.bringNews(j, j.to, c);
  if (j.gaveUp) this.outcome(c, j.to, `Turned back on the road to ${land(j.from)} (season ${S.turn}).`, false);
  else if (c.status === "Employed" && c.employer === j.to) {
    const slipped = this.capitalSiege(j.to) !== null;
    this.outcome(c, j.to, `Carried a mission to ${land(j.from)} and came home with the answer (season ${S.turn})` + (slipped ? ", slipping in through the siege lines." : "."), true);
  }
  c.at = j.to;
  c.duty = "None";
  c.heldBy = null;
  c.turnsAbroad = 0;
  c.missionTarget = null;
  this.carriedHome(c, j.to);
  const cargo = j.cargo ?? newHomeCargo();
  this.hearWord(j.to, cargo.word);
  // Turned back on the road (item 7b): it tells why, and hands back any gold it still carries; there is no audience to report.
  if (j.gaveUp) {
    if (cargo.gold > 0) S.treasuries.get(j.to).gold += toInt(roundEven((cargo.gold * cargo.purityPercent) / 100.0));
    notify(S, j.to, "Notice", `${c.name} returns`, `${c.name} is back at court without having reached ${j.from}: ${j.turnedBack}.` + (cargo.gold > 0 ? ` The ${formatMoney(cargo.gold)} of gold carried is back in the treasury.` : ""), c.id);
    c.currentTrail = null;
    return;
  }
  if (j.turnedBack !== null) notify(S, j.to, "Notice", "On the road home", `${c.name}, coming home, was ${j.turnedBack}.`, c.id);
  this.claimAnswered(j.to, j.from, cargo);
  for (const tid of cargo.copyIds) S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: tid, holder: j.to, acquiredTurn: S.turn, source: "brought home by your envoy" }));
  this.mindRequests.push(newMindRequest({ id: newId(S, "r"), task: "EnvoyReport", characterId: c.id, court: j.to, trailId: cargo.trailId, cargo }));
  c.currentTrail = null;
};

P.releaseEnvoy = function (host, r) {
  const S = this.s;
  const c = char(S, r.character);
  if (c.heldBy !== host || (c.duty !== "Detained" && c.status !== "Captured")) {
    this.failed(host, r, "Release failed", `${c.name} was no longer held at your court, so nobody was released.`, "no longer held", true, c.id);
    return;
  }
  if (c.status === "Captured") {
    this.releaseCaptive(host, c);
    return;
  }
  this.letEnvoyGo(host, c, r.reply);
};

/**
 * A detained envoy let go sets out for home. Its lord goes on believing what it believed (on the road home, or that it
 * has not returned) until the envoy stands at its court again.
 */
P.letEnvoyGo = function (host, c, reply) {
  const S = this.s;
  // Words the envoy carries home, as the host's scribes would put them for another court.
  const words = isBlank(reply) ? reply : this.scribe(host, reply);
  if (c.employer !== null) this.coverFor(c, c.employer, "Detained");
  c.heldBy = null;
  const trail = this.trail(c.currentTrail);
  if (trail !== null && !isBlank(words)) trail.exchanges.push(newExchange({ host: `(on release) ${cap(words!, MaxSpeech)}`, envoy: "" }));
  trail?.outcomes.push(`released by ${host} in turn ${S.turn}`);
  remember(c, S.turn, `The king of ${land(host)} let me go` + (isBlank(words) ? "." : `, saying: "${cap(words!, 300)}"`));
  if (isAlive(S, host)) notify(S, host, "Notice", "Envoy released", `${c.name} has been allowed to leave.`, c.id);
  logEvent(S, "release", `${host} released ${c.name}.`, [host]);
  this.sendHome(c, host, newHomeCargo({ trailId: c.currentTrail ?? "", observations: this.observe(c, host), wasDetained: true }));
};

/**
 * The answer to a claim an envoy was sent to check (item 10, "check a claim"): whether the person serves the king it went
 * to. A false envoy who claimed to serve that king is exposed at the court that asked.
 */
P.claimAnswered = function (court, asked, cargo) {
  const S = this.s;
  const who = cargo.claimChecked !== null ? findCharacter(S, cargo.claimChecked) : null;
  if (who === null) return;
  const known = nameKnownAt(who, court);
  notify(S, court, "Notice", "A claim checked", `At the court of ${land(asked)} they say that ${known} ${cargo.claimHeld ? "serves their king" : "does not serve their king"}.`, who.id);
  const d = falseNameAt(who, court);
  if (!cargo.claimHeld && d !== null && d.employer === asked) this.expose(who, d, `the king of ${land(asked)} says they do not serve him`);
};

/** Applies text a character or the narrator wrote for a MindRequest. */
P.fulfil = function (req, reply) {
  const S = this.s;
  const c = findCharacter(S, req.characterId);
  let text = cap(reply.text ?? "", 2500);
  switch (req.task) {
    case "Life":
      if (c !== null && reply.life !== null) this.applyLife(c, reply.life);
      return;
    case "Chief":
      if (c !== null && reply.chief !== null && req.chief !== null) this.applyChief(c, { ...reply.chief, turn: req.chief.turn });
      return;
    case "Reports":
      if (c !== null && reply.reports !== null && req.reports !== null) c.reportsPlan = { ...reply.reports, turn: req.reports.turn, payUpTo: Math.max(0, reply.reports.payUpTo) };
      return;
    case "Unheard":
      // Item 12: an envoy nobody understands chose, taken as the next season begins.
      if (c !== null && reply.unheard !== null) this.applyUnheard(c, { turn: this.s.turn, choice: reply.unheard.choice, keep: reply.unheard.keep === null ? null : Math.max(0, reply.unheard.keep) });
      return;
    case "EnvoyReport": {
      if (c === null) return;
      const lord = requestFor(req);
      const cargo = req.cargo ?? newHomeCargo();
      // What the envoy itself said, which it remembers: the court's own note on the weighing is added after it for the
      // king, and is not the envoy's words.
      const own = text;
      if (cargo.gold > 0) {
        const skim = clamp(reply.number, 0, cargo.gold);
        const face = cargo.gold - skim;
        const fine = toInt(roundEven((face * cargo.purityPercent) / 100.0));
        const from = this.trail(req.trailId)?.to ?? lord;
        // An envoy that kept some may have swapped the host's inventory for a forgery stating only what is left.
        const swapped = this.swaps(c, skim, cargo.gold, reply.swapInventory);
        const stated = swapped ? face : cargo.goldStated;
        if (skim > 0) {
          gain(c, toInt(roundEven((skim * cargo.purityPercent) / 100.0)), "Skimmed");
          remember(c, S.turn, `I kept ${skim} shekels of the gold sent home with me.`);
          logEvent(S, "skim", `${c.name} kept ${skim} shekels on the way home.`, [], "skim");
          const swap = this.swapInventory(c, from, lord, skim, face, reply.swapInventory);
          const home = this.trail(req.trailId);
          if (swap !== null && home !== null) home.outcomes.push(`on the way home, kept ${skim} shekels of the gold sent back and ${swap}`);
        }
        S.treasuries.get(lord).gold += fine;
        S.treasuries.get(lord).lots.push(newGoldLot({ id: newId(S, "g"), from, stated, face, true: fine, arrivedTurn: S.turn }));
        // The host's inventory, sealed at the audience, or the envoy's forgery, goes into the court's archive.
        this.inventory(c, from, lord, stated, this.trail(req.trailId)?.audienceTurn ?? S.turn, swapped, `the inventory ${c.name} brought home with the gold of ${from}`);
        text += `\n\n[The inventory lists ${formatMoney(stated)} of gold; your weighers found ${formatMoney(face)}.]`;
      }
      const trail = this.trail(req.trailId);
      // The host's answer as the envoy reports it, in clauses (item 8): what a script king reads.
      const host = trail?.to ?? lord;
      const answer = checkClauses(reply.clauses, host, lord, S.turn).kept;
      if (trail !== null) {
        trail.report = text;
        trail.reportTurn = S.turn;
        trail.reportClauses = answer;
      }
      notify(S, lord, "EnvoyReport", `${c.name} returns`, text, c.id);
      if (answer.length > 0) inboxOf(S, lord).at(-1)!.clauses = answer;
      remember(c, S.turn, `I reported to ${c.employer === lord ? "my lord" : `the king of ${land(lord)}`}: "${cap(own, 300)}"`);
      break;
    }
    case "Pitch": {
      if (c === null || c.status !== "Free") return;
      const court = requestFor(req);
      // A court that still believed this person away in its service now sees it seeking service: that is the news.
      removeAll(c.covers, (k) => k.for === court);
      // The name it gives, and for a false envoy the king it claims to serve (item 10); a false envoy seeks no service.
      this.declare(c, court, reply.name ?? null, reply.claimsToServe ?? null);
      if (falseNameAt(c, court)?.employer != null) break;
      c.pitches.set(court, text);
      c.askingPrice.set(court, clamp(reply.number, 5, 400));
      // What it says it can do: its own choice from what it believes (item 10+b), or the formula when it names none.
      c.claimed = reply.claims !== null && reply.claims !== undefined ? clampSkills(reply.claims) : claimOf(c);
      notify(S, court, "Candidates", `${c.name} seeks service`, `${text}\n[${c.name} asks ${formatMoney(c.askingPrice.get(court))} a season.]`, c.id);
      break;
    }
    case "Questioned":
      if (c !== null) this.questionedSays(requestFor(req), c, req.copyIds, reply.lies, reply.league ?? null, text);
      break;
    case "CheckReport":
      notify(S, requestFor(req), "CheckResult", `Inquiries into ${c?.name ?? "a stranger"}`, text, req.characterId);
      break;
    case "SpyReport": {
      const watched = req.report?.court ?? null;
      if (c !== null && req.copyIds.length > 0 && watched !== null) text += "\n\n" + this.copiesLine(c, watched, req.copyIds);
      notify(S, requestFor(req), "SpyReport", `Word from ${c?.name ?? "your agent"}`, text, req.characterId);
      break;
    }
    case "SummarizeMemory":
      if (c === null || trim(text).length === 0) return;
      c.memorySummary = cap(trim(text), 1500);
      c.memory.splice(0, Math.min(req.fold, c.memory.length));
      break;
  }
};

/**
 * What an envoy carries for its king beside its letter, on arriving at the court it was sent to (Haakon's answers to item
 * 11a): the offers of jobs, put to the people standing there, and a debt tablet, presented to the borrower there.
 */
P.envoyBusinessAbroad = function (c, j) {
  const S = this.s;
  const d = j.dispatch!;
  if (d.offers.length > 0)
    this.hireAll(
      d.offers.map((o) => ({
        p: j.from,
        h: hire(o.character, o.fee, o.term, o.advance, { what: o.errand?.what ?? null, where: o.errand?.where ?? null, payOnDone: o.payOnDone, offerAgain: o.offerAgain, via: c.id }),
      })),
      j.to,
    );
  const debt = d.collect !== null ? (S.debts.find((x) => x.id === d.collect && x.ended === null && x.holder === c.id) ?? null) : null;
  if (debt === null) return;
  if (debt.borrower === j.to)
    notify(S, j.to, "Notice", "A debt presented", `${c.name}, envoy of ${j.from}, stands at your court with the tablet of your debt ${debt.id}: ${formatMoney(debtLeft(debt))} is left to repay to whoever holds it (order repay, while the envoy is here).`, c.id);
  else {
    const b = isPowerParty(debt.borrower) ? null : findCharacter(S, debt.borrower);
    if (b !== null && b.at === j.to) remember(b, S.turn, `${c.name}, envoy of ${j.from}, is here with the tablet of my debt, ${formatMoney(debtLeft(debt))} left to repay.`);
  }
};

/** An envoy home hands over what it carried for its king: gold it was paid on a tablet or an advance not taken, and the tablet. */
P.carriedHome = function (c, home) {
  const S = this.s;
  if (c.carriedFor > 0 && isAlive(S, home) && c.employer === home) {
    S.treasuries.get(home).gold += c.carriedFor;
    notify(S, home, "Notice", "Gold brought home", `${c.name} brought home ${formatMoney(c.carriedFor)} of yours: what was repaid on a tablet it carried, or an advance not taken.`, c.id);
    c.carriedFor = 0;
  }
  for (const d of S.debts.filter((x) => x.ended === null && x.holder === c.id && x.for === home)) this.passTablet(d, home, "Archive");
};

