/**
 * What servants know, and tablets taken (build order item 10): "What servants know" (the record of the tablets that passed
 * through a person's hands, and questioning a captive), captives handed over between courts like any good, and tablets
 * that are objects in a place ("Tablets have a place"): a spy may steal one from the archive it watches, and whoever takes a
 * capital carries off its archive (archives.ts), so that the court loses what was taken.
 */
import { clamp } from "../core/num.ts";
import { cmpBool, cmpNum, desc, sortBy } from "../core/seq.ts";
import { clause } from "../model/clauses.ts";
import type { CaptiveOrder } from "../model/orders.ts";
import { newFact, remember, type Character } from "../model/people.ts";
import { AllPowers, land, type Power } from "../model/power.ts";
import { newTablet, newTabletCopy, type Tablet } from "../model/records.ts";
import { isAlive, logEvent, newId, notify } from "../model/state.ts";
import { checkClauses, renderClauses } from "../rules/clauses.ts";
import { learn } from "../rules/skills.ts";
import { idNumber, TurnEngine } from "./core.ts";

/** The most tablets one questioning draws out (a first guess). */
export const MostDrawnOut = 3;
/** What stealing adds to a spy's chance of being caught that season (a first guess). */
export const StealRisk = 0.15;

declare module "./core.ts" {
  interface TurnEngine {
    saw(c: Character, tabletId: string): void;
    questionCaptive(host: Power, c: Character, co: CaptiveOrder): void;
    handOver(host: Power, c: Character, to: Power): void;
    stealFromArchive(spy: Character, court: Power, master: Power): string | null;
  }
}

const P = TurnEngine.prototype;

/** A tablet passed through a person's hands: sealed before it, carried, read or copied. It knows it from now on. */
P.saw = function (c, tabletId) {
  if (!c.seen.includes(tabletId)) c.seen.push(tabletId);
};

/**
 * A captor questions a captive. How much the questioning draws out is a roll on its courage and loyalty against what is
 * spent, and a court that holds its lover or family has a hold on it; what it says is its own decision. A script captive
 * (and, until characters decide it themselves, every captive) that is loyal and brave lies: it tells of a tablet that never
 * was, a forgery in its own hand. Otherwise it tells the truth: the tablets it saw, which go into the captor's archive as it
 * recited them.
 */
P.questionCaptive = function (host, c, co) {
  const S = this.s;
  const spend = co.spend ?? 0;
  if (!this.pay(host, spend, `the questioning of ${c.name}`, co, "none was done")) return;
  const rng = this.r("question", c.id);
  // A court that holds its lover or family, or to whose people it owes a debt, has a hold on it.
  const hold = c.ties.some((t) => t.court === host) ? 25 : 0;
  const resist = (c.traits.courage + c.traits.loyalty) / 2 - hold;
  const p = clamp(0.25 + spend / 150 - resist / 250, 0.05, 0.9);
  const held = new Set(S.copies.filter((k) => k.holder === host).map((k) => k.tabletId));
  const known = sortBy(
    c.seen.map((id) => S.tablets.find((t) => t.id === id)).filter((t): t is Tablet => t !== undefined && !held.has(t.id)),
    [(t: Tablet) => t.seals.length >= 2, desc(cmpBool)],
    [(t: Tablet) => t.sealedTurn ?? t.createdTurn, desc(cmpNum)],
    [(t: Tablet) => idNumber(t.id), desc(cmpNum)],
  );
  const drawn = known.filter(() => rng.chance(p)).slice(0, MostDrawnOut);
  const master = c.employer ?? c.formerEmployer;
  const lies = c.traits.loyalty >= 60 && c.traits.courage >= 50 && master !== null;
  c.facts.push(newFact({ id: newId(S, "f"), text: `Was questioned at the court of ${land(host)} (season ${S.turn}).`, secrecy: "Hidden", tag: "questioned", knownBy: [host] }));
  if (drawn.length === 0) {
    remember(c, S.turn, `${land(host)} questioned me. I told them nothing of worth.`);
    notify(S, host, "Notice", "A captive questioned", `${c.name} told your questioners nothing of worth.`, c.id);
    logEvent(S, "question", `${host} questioned ${c.name}, who told nothing.`, [host], "questioned");
    return;
  }
  const source = `told by ${c.name} under questioning`;
  if (lies) {
    // A tablet that never was: its master's seal beside another king's, in a league against the captor.
    const others = AllPowers.filter((q) => q !== host && q !== master && isAlive(S, q));
    const other = others.length > 0 ? rng.pick(others) : undefined;
    const seals = other !== undefined ? [master!, other] : [master!];
    const clauses = checkClauses([clause("alliance"), clause("against", { power: host })], seals[0], seals[1] ?? seals[0], S.turn).kept;
    const tablet = newTablet({
      id: newId(S, "t"),
      text: renderClauses(clauses, seals[0], seals[1] ?? seals[0]),
      clauses,
      proposedBy: seals[0],
      partner: seals[1] ?? null,
      seals,
      createdTurn: S.turn,
      sealedTurn: Math.max(1, S.turn - rng.range(1, 4)),
      forged: true,
      forgerId: c.id,
      forgerEmployer: master,
      forgerSkill: c.skills.forge,
    });
    S.tablets.push(tablet);
    const copy = newTabletCopy({ id: newId(S, "k"), tabletId: tablet.id, holder: host, acquiredTurn: S.turn, source });
    S.copies.push(copy);
    remember(c, S.turn, `${land(host)} questioned me. I told them of a tablet that never was, to mislead them.`);
    notify(S, host, "Notice", "A captive questioned", `${c.name} gave way under questioning and recited a tablet: ${this.copyLine(copy)}.`, c.id);
    logEvent(S, "question", `${host} questioned ${c.name}, who lied, reciting a tablet that never was.`, [], "questioned-lie");
    return;
  }
  const copies = drawn.map((t) => {
    const k = newTabletCopy({ id: newId(S, "k"), tabletId: t.id, holder: host, acquiredTurn: S.turn, source });
    S.copies.push(k);
    return k;
  });
  remember(c, S.turn, `${land(host)} questioned me, and I told them of ${copies.length} tablet(s) I had seen.`);
  notify(S, host, "Notice", "A captive questioned", `${c.name} gave way under questioning and recited what they had seen: ${copies.map((k) => this.copyLine(k)).join(", ")}.`, c.id);
  logEvent(S, "question", `${host} questioned ${c.name}, who told of ${copies.length} tablet(s).`, [host], "questioned-truth");
};

/**
 * A captor hands its captive over to another court, like any good: the captive is that court's to hold from now on, and
 * any ransom its captor asked lapses.
 */
P.handOver = function (host, c, to) {
  const S = this.s;
  if (!isAlive(S, to)) {
    notify(S, host, "Rejected", "Captive order failed", `${c.name} could not be handed over: the kingdom of ${land(to)} has fallen.`, c.id);
    return;
  }
  c.heldBy = to;
  c.at = to;
  S.tasks = S.tasks.filter((t) => !(t.kind === "RansomDemand" && t.characterId === c.id));
  this.meet(c, to);
  remember(c, S.turn, `${land(host)} handed me over to ${land(to)}, whose captive I now am.`);
  notify(S, host, "Notice", "A captive handed over", `You handed ${c.name} over to the king of ${land(to)}.`, c.id);
  notify(
    S,
    to,
    "Notice",
    "A captive given to you",
    `The king of ${land(host)} has handed ${c.name} over to you as a captive. You may question, ransom, execute or release them${c.intercepted ? "" : ", or turn them"}.`,
    c.id,
  );
  logEvent(S, "captive-handed", `${host} handed ${c.name} over to ${to}.`, [host, to], "captive-handed");
};

/**
 * A spy posted at a court takes a tablet out of its archive: with a chance of its skill at gathering, the tablet its
 * master would most want (sealed agreements first, the newest first), which its court no longer holds once it is gone.
 * The court learns that a tablet is missing. Returns the tablet, which goes home with the spy's report, or null.
 */
P.stealFromArchive = function (spy, court, master) {
  const S = this.s;
  const rng = this.r("steal", spy.id);
  const found = rng.chance(spy.skills.gather / 100.0);
  learn(spy, "gather", found, (b) => b / 100.0);
  const held = new Set(S.copies.filter((k) => k.holder === master).map((k) => k.tabletId));
  const pick = found
    ? sortBy(
        this.archive(court).filter((t) => !held.has(t.id)),
        [(t: Tablet) => t.seals.length >= 2, desc(cmpBool)],
        [(t: Tablet) => t.sealedTurn ?? t.createdTurn, desc(cmpNum)],
        [(t: Tablet) => idNumber(t.id), desc(cmpNum)],
      )[0]
    : undefined;
  if (pick === undefined) {
    remember(spy, S.turn, `I could not get at a tablet worth taking in the archive of ${land(court)}.`);
    return null;
  }
  S.copies = S.copies.filter((k) => !(k.holder === court && k.tabletId === pick.id));
  this.saw(spy, pick.id);
  remember(spy, S.turn, `I stole a tablet from the archive of ${land(court)}, sealed by ${pick.seals.join(" and ")}.`);
  notify(S, court, "Notice", "A tablet is missing", `A tablet sealed by ${pick.seals.join(" and ")} is missing from your archive: someone has taken it.`);
  logEvent(S, "tablet-stolen", `${spy.name}, a spy of ${master}, stole a tablet from the archive of ${court}.`, [], "tablet-stolen");
  return pick.id;
};
