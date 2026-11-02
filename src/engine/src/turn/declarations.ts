/**
 * A change of hands is taken up, never thrust on anyone (build order item 17++; "Whom a province obeys" under War, decided
 * 2 November 2026). A province whose weight tips toward a power whose troops do not stand in it declares for him: word of
 * it travels to his court, and it stays with its old master (or lawless) until his word taking it up reaches it (the order
 * `answer`, a letter accepting it). Then it obeys him as the next season is reckoned, if it still leans his way. He may
 * refuse it, an entry in its ledger against him, or leave it unanswered: the declaration stands only while it leans his
 * way. A treaty's cession is the same: the receiver has the claim, the giver holds it until the receiver takes it up and
 * then withdraws, and its people still weigh the receiver. Troops sent to stand in a province are themselves an order to
 * take or hold it, and go by the season's rule as before; persons choose by their stakes (the "Rising" request).
 */
import { cmpStr, sortBy } from "../core/seq.ts";
import { newDeclaration, RefusedPoints, type Declaration } from "../model/declarations.ts";
import type { AnswerOrder } from "../model/orders.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { isAlive, logEvent, notify } from "../model/state.ts";
import { UnrestData } from "../model/unrest.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /**
     * As a province's obedience is reckoned and no rival takes it by the season's rule: the power it declares for, if its
     * weight clears `against` and his troops do not stand in it, and whether he has taken it up (then it is his now).
     * `affirmed` gathers the provinces whose declaration or claim still stands.
     */
    declareIn(province: string, holder: Power | null, against: number, affirmed: Set<string>, clears: (w: number, against: number) => boolean): Power | null;
    /** After the season's changes of hands: declarations no longer leaning, and claims the giver no longer holds, lapse. */
    declarationsLapse(affirmed: Set<string>, changed: ReadonlySet<string>): void;
    /** A cession by treaty (no troops of the receiver's in it): the receiver's claim, the giver holding it until it is taken up. */
    cededClaim(giver: Power, to: Power, province: string): void;
    /** A king's word taking up or refusing a province, reaching it. */
    answerProvince(p: Power, o: AnswerOrder): void;
  }
}

const P = TurnEngine.prototype;

/** The season the word of something in `province` reaches `p`'s court. */
function knownBy(e: TurnEngine, p: Power, province: string): number {
  const d = e.wordTo(p, province);
  return e.s.turn + (Number.isFinite(d) ? d : 0);
}

P.declareIn = function (province, holder, against, affirmed, clears) {
  const S = this.s;
  const name = this.map.get(province).name;
  const claim = S.declarations.find((d) => d.province === province && d.from !== null);
  if (claim !== undefined) {
    // A claim stands while its giver holds the land; taken up, the giver withdraws and its people weigh the receiver
    // against what they accept of anyone, as land without a ruler does, with the giver's troops gone from it.
    if (claim.from !== holder || !isAlive(S, claim.power)) return null;
    affirmed.add(province);
    const giverThere = S.units.some((u) => u.power === claim.from && u.province === province);
    return claim.takenUp && !giverThere && clears(this.weightIn(province, claim.power), UnrestData.floor) ? claim.power : null;
  }
  // The power its people lean to most, of those whose troops do not stand in it (those go by the season's rule).
  let best: { p: Power; w: number } | null = null;
  for (const p of sortBy([...AllPowers], [(x: Power) => x, cmpStr])) {
    if (p === holder || !isAlive(S, p) || S.units.some((u) => u.power === p && u.kind === "Army" && u.province === province)) continue;
    const w = this.weightIn(province, p);
    if (w > 0 && (best === null || w > best.w)) best = { p, w };
  }
  if (best === null || !clears(best.w, against)) return null;
  const p = best.p;
  affirmed.add(province);
  let d: Declaration | undefined = S.declarations.find((x) => x.province === province);
  if (d !== undefined && d.power !== p) {
    S.declarations.splice(S.declarations.indexOf(d), 1);
    d = undefined;
  }
  if (d === undefined) {
    S.declarations.push(newDeclaration({ province, power: p, known: knownBy(this, p, province) }));
    const from = holder === null ? "it has no ruler" : `${holder}'s hold on it is weak`;
    this.tell(p, province, "Notice", "A province looks to you", `The people of ${name} declare for you: they favour you, and ${from}. It is yours only if you take it up (answer it: take it up, or refuse it); until then it stays as it is, and the offer stands only while they lean your way.`);
    logEvent(S, "declare", `The people of ${name} declared for ${p}.`, [], "declare");
    return null;
  }
  return d.takenUp ? p : null;
};

P.declarationsLapse = function (affirmed, changed) {
  const S = this.s;
  S.declarations = S.declarations.filter((d) => affirmed.has(d.province) && !changed.has(d.province));
};

P.cededClaim = function (giver, to, province) {
  const S = this.s;
  const name = this.map.get(province).name;
  S.declarations = S.declarations.filter((d) => d.province !== province);
  S.declarations.push(newDeclaration({ province, power: to, from: giver, known: knownBy(this, to, province) }));
  notify(S, giver, "Resolution", "Land ceded", `You ceded ${name} to ${to}: it stays in your hands until ${to} takes it up, and then your officers withdraw. Keep your troops out of it, or he cannot.`);
  this.tell(to, province, "Resolution", "Land ceded to you", `${giver} has ceded ${name} to you. It is yours to take up (answer it), or refuse; until you do, it stays in ${giver}'s hands, and once you do, its people still weigh you.`);
  logEvent(S, "cession", `${giver} ceded ${name} to ${to}.`, [giver, to]);
};

P.answerProvince = function (p, o) {
  const S = this.s;
  const name = this.map.get(o.province).name;
  const d = S.declarations.find((x) => x.province === o.province && x.power === p);
  if (d === undefined) {
    this.failed(p, o, "Answer failed", `Your word reached ${name}, but it no longer looked to you.`, "it no longer looked to you", true);
    return;
  }
  if (o.take) {
    d.takenUp = true;
    notify(S, p, "Resolution", "A province taken up", `Your word taking up ${name} has reached it: it answers to you as the season turns, if its people still favour you${d.from !== null ? ` and ${d.from}'s troops have left it` : ""}.`);
    logEvent(S, "declare", `${p} took up ${name}.`, [], "declare-taken");
    return;
  }
  S.declarations.splice(S.declarations.indexOf(d), 1);
  // A people turned away remember it.
  this.take(o.province, p, RefusedPoints);
  notify(S, p, "Resolution", "A province refused", `Your word refusing ${name} has reached it: it stays as it was, and its people remember that you turned them away.`);
  logEvent(S, "declare", `${p} refused ${name}.`, [], "declare-refused");
};

declare module "./core.ts" {
  interface TurnEngine {
    /** A province taken up by `p` passes to him: no sack, since nobody took it by force. */
    provinceTakenUp(province: string, p: Power, seeing: Power[]): void;
  }
}

P.provinceTakenUp = function (province, p, seeing) {
  const S = this.s;
  const name = this.map.get(province).name;
  const holder = S.owner.getOrDefault(province, null);
  const ceded = S.declarations.find((d) => d.province === province && d.power === p)?.from ?? null;
  this.setOwner(province, p);
  this.takeArchive(p, province);
  if (ceded !== null) {
    this.tell(p, province, "Battle", "A province won", `${name}, which ${ceded} ceded to you, now answers to you: you took it up, and its people accept you.`);
    if (holder !== null && isAlive(S, holder)) this.tell(holder, province, "Battle", "A province handed over", `${name}, which you ceded to ${p}, now answers to him: he took it up, and your officers withdrew.`);
    logEvent(S, "obey", `${name}, ceded by ${ceded}, now answers to ${p}, who took it up.`, seeing, "obey-taken");
    return;
  }
  this.tell(p, province, "Battle", "A province won", `${name} now answers to you: its people declared for you, and you took it up.`);
  if (holder !== null && isAlive(S, holder)) this.tell(holder, province, "Battle", "A province lost", `${name} now answers to ${p}: its people declared for him, and he took it up.`);
  logEvent(S, "obey", `${name} now answers to ${p}: its people declared for him, and he took it up.`, seeing, "obey-taken");
};
