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
import { newJourney, newPendingTask, newTablet, newTabletCopy, type Tablet } from "../model/records.ts";
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
    questionedSays(host: Power, c: Character, tabletIds: readonly string[], lies: boolean, league: Power | null, words: string): void;
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
 * spent, and a court that holds its lover or family has a hold on it ("Skills set the odds; the character decides"). What
 * it then says is its own decision, the next season, in its own words (item 10+b, Haakon's answer of 28 October 2026):
 * the tablets it gave way on, or a tablet that never was (questionedSays).
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
  c.facts.push(newFact({ id: newId(S, "f"), text: `Was questioned at the court of ${land(host)} (season ${S.turn}).`, secrecy: "Hidden", tag: "questioned", knownBy: [host] }));
  if (drawn.length === 0) {
    remember(c, S.turn, `${land(host)} questioned me. I told them nothing of worth.`);
    notify(S, host, "Notice", "A captive questioned", `${c.name} told your questioners nothing of worth.`, c.id);
    logEvent(S, "question", `${host} questioned ${c.name}, who told nothing.`, [host], "questioned");
    return;
  }
  // It gave way: what it says, it decides as the next season begins.
  S.tasks.push(newPendingTask({ id: newId(S, "q"), kind: "Questioning", requester: host, dueTurn: S.turn + 1, characterId: c.id, tabletIds: drawn.map((t) => t.id) }));
  notify(S, host, "Notice", "A captive questioned", `${c.name} gave way under questioning; your scribes will have what they say next season.`, c.id);
};

/**
 * What a captive that gave way says, as it decided: the tablets it saw, which go into the captor's archive as it recited
 * them; or, lying, a tablet that never was, a forgery in its own hand (its master's seal beside another king's, in a league
 * against the captor), which only an examination can show. A captive with no master left has no one to lie for.
 */
P.questionedSays = function (host, c, tabletIds, lies, league, words) {
  const S = this.s;
  if (c.status !== "Captured" || c.heldBy !== host || !isAlive(S, host)) return;
  const source = `told by ${c.name} under questioning`;
  const said = words.trim().length > 0 ? ` In their words: "${words.trim()}"` : "";
  const master = c.employer ?? c.formerEmployer;
  if (lies && master !== null && isAlive(S, master)) {
    const rng = this.r("question-lie", c.id);
    const others = AllPowers.filter((q) => q !== host && q !== master && isAlive(S, q));
    const other = league !== null && others.includes(league) ? league : others.length > 0 ? rng.pick(others) : undefined;
    const seals = other !== undefined ? [master, other] : [master];
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
    notify(S, host, "Notice", "A captive questioned", `${c.name} recited a tablet under questioning: ${this.copyLine(copy)}.${said}`, c.id);
    logEvent(S, "question", `${host} questioned ${c.name}, who lied, reciting a tablet that never was.`, [], "questioned-lie");
    return;
  }
  const held = new Set(S.copies.filter((k) => k.holder === host).map((k) => k.tabletId));
  const copies = tabletIds
    .filter((id) => !held.has(id) && S.tablets.some((t) => t.id === id))
    .map((id) => {
      const k = newTabletCopy({ id: newId(S, "k"), tabletId: id, holder: host, acquiredTurn: S.turn, source });
      S.copies.push(k);
      return k;
    });
  remember(c, S.turn, `${land(host)} questioned me, and I told them of ${copies.length} tablet(s) I had seen.`);
  notify(S, host, "Notice", "A captive questioned", copies.length > 0 ? `${c.name} recited what they had seen: ${copies.map((k) => this.copyLine(k)).join(", ")}.${said}` : `${c.name} told your questioners nothing you did not hold already.${said}`, c.id);
  logEvent(S, "question", `${host} questioned ${c.name}, who told of ${copies.length} tablet(s).`, [host], "questioned-truth");
};

/**
 * A captor hands its captive over to another court, like any good; any ransom it asked lapses. The captive travels under
 * the giver's guard like any company (item 10+b, Haakon's answer of 28 October 2026), so it can be intercepted or freed on
 * the way (see convoyStopped); the other court holds it once it arrives.
 */
P.handOver = function (host, c, to) {
  const S = this.s;
  if (!isAlive(S, to)) {
    notify(S, host, "Rejected", "Captive order failed", `${c.name} could not be handed over: the kingdom of ${land(to)} has fallen.`, c.id);
    return;
  }
  S.tasks = S.tasks.filter((t) => !(t.kind === "RansomDemand" && t.characterId === c.id));
  c.duty = "UnderGuard";
  c.at = null;
  const j = newJourney({ id: newId(S, "j"), kind: "CaptiveConvoy", departTurn: S.turn, from: host, to, characterId: c.id });
  S.journeys.push(j);
  this.setOut(j, this.map.capital(host).id, this.map.capital(to).id);
  remember(c, S.turn, `${land(host)} handed me over to ${land(to)}, and its guards are taking me there.`);
  notify(S, host, "Notice", "A captive handed over", `You handed ${c.name} over to the king of ${land(to)}; your guards are taking them there, due in season ${j.arriveTurn}.`, c.id);
  notify(S, to, "Notice", "A captive on the way", `The king of ${land(host)} is sending you ${c.name} as a captive, under his guard.`, c.id);
  logEvent(S, "captive-handed", `${host} handed ${c.name} over to ${to}, sent under guard.`, [host, to], "captive-handed");
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
