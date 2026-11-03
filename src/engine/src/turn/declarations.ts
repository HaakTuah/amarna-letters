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
import { Views } from "../rules/views.ts";
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

/** The season the word of something in `province` can be read at `p`'s court: when `tell`'s notice of it arrives. */
function knownBy(e: TurnEngine, p: Power, province: string): number {
  return e.heardAt(p, province);
}

P.declareIn = function (province, holder, against, affirmed, clears) {
  const S = this.s;
  const name = this.map.get(province).name;
  const claim = S.declarations.find((d) => d.province === province && d.from !== null && d.gone === null);
  if (claim !== undefined) {
    // A claim stands while its giver holds the land; taken up, the giver withdraws and its people weigh the receiver
    // against what they accept of anyone, as land without a ruler does, with the giver's troops gone from it.
    if (claim.from !== holder || !isAlive(S, claim.power)) return null;
    affirmed.add(province);
    const giverThere = S.units.some((u) => u.power === claim.from && u.province === province);
    // Taken up, and the giver's troops still there a season on: the treaty that bound him to withdraw is broken.
    if (claim.takenUp && giverThere && !claim.broken && claim.takenKnown !== null && S.turn > claim.takenKnown) {
      claim.broken = true;
      this.tell(claim.power, province, "Notice", "A cession not kept", `${claim.from}'s troops still stand in ${name}, which he ceded to you and you took up: the treaty bound him to withdraw, and he has not.`);
      // Seen by those who see the land; its receiver learns of it by the road (hidden information).
      logEvent(S, "cession", `${claim.from} has not withdrawn from ${name}, which he ceded to ${claim.power}.`, AllPowers.filter((x) => isAlive(S, x) && Views.sight(S, this.map, x).has(province)), "cession-unkept");
    }
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
  let d: Declaration | undefined = S.declarations.find((x) => x.province === province && x.gone === null);
  if (d !== undefined && d.power !== p) {
    end(this, d);
    d = undefined;
  }
  if (d === undefined) {
    const nd = newDeclaration({ province, power: p });
    S.declarations.push(nd);
    const from = holder === null ? "it has no ruler" : `${holder}'s hold on it is weak`;
    // Part D (#431): its offer reaches him only if someone carries it.
    this.sendOffer(nd, holder, `The people of ${name} declare for you: they favour you, and ${from}.`);
    logEvent(S, "declare", `The people of ${name} declared for ${p}.`, [], "declare");
    return null;
  }
  return d.takenUp ? p : null;
};

P.declarationsLapse = function (affirmed, changed) {
  const S = this.s;
  // A claim stands while its giver holds the land, whether or not its people were reckoned this season (a siege skips them).
  const stands = (d: Declaration): boolean => (d.from !== null ? S.owner.getOrDefault(d.province, null) === d.from && isAlive(S, d.power) : affirmed.has(d.province));
  for (const d of S.declarations) if (d.gone === null && (!stands(d) || changed.has(d.province))) end(this, d);
  S.declarations = S.declarations.filter((d) => d.gone === null || d.gone > S.turn);
};

/** A declaration or claim ends: gone from the rule, kept in its court's view until word of the end reaches it. */
function end(e: TurnEngine, d: Declaration): void {
  d.gone = knownBy(e, d.power, d.province);
  // An offer nobody carried is not sent: it fades with the leaning.
  e.dropOffer(d);
}

P.cededClaim = function (giver, to, province) {
  const S = this.s;
  const name = this.map.get(province).name;
  for (const d of S.declarations) if (d.province === province && d.gone === null) end(this, d);
  S.declarations.push(newDeclaration({ province, power: to, from: giver, known: knownBy(this, to, province) }));
  notify(S, giver, "Resolution", "Land ceded", `You ceded ${name} to ${to}: it stays in your hands until ${to} takes it up, and then your officers withdraw. Keep your troops out of it, or he cannot.`);
  this.tell(to, province, "Resolution", "Land ceded to you", `${giver} has ceded ${name} to you. It is yours to take up (answer it), or refuse; until you do, it stays in ${giver}'s hands, and once you do, its people still weigh you.`);
  // The giver's own act; the receiver learns of it by the road (hidden information).
  logEvent(S, "cession", `${giver} ceded ${name} to ${to}.`, [giver]);
};

P.answerProvince = function (p, o) {
  const S = this.s;
  const name = this.map.get(o.province).name;
  const d = S.declarations.find((x) => x.province === o.province && x.power === p && x.gone === null);
  if (d === undefined) {
    this.failed(p, o, "Answer failed", `Your word reached ${name}, but it no longer looked to you.`, "it no longer looked to you", true);
    return;
  }
  if (o.take) {
    // Taken up already: the first word stands, and so does the season word of it comes home.
    if (d.takenUp) return;
    d.takenUp = true;
    // Word that his word reached it comes home by the road.
    d.takenKnown = knownBy(this, p, o.province);
    this.tell(p, o.province, "Resolution", "A province taken up", `Your word taking up ${name} reached it: it answers to you as the season turns after it came, if its people still favour you${d.from !== null ? ` and ${d.from}'s troops have left it` : ""}.`);
    logEvent(S, "declare", `${p} took up ${name}.`, [], "declare-taken");
    return;
  }
  // Gone from the rule now; in his view until word that his refusal reached it comes home by the road.
  end(this, d);
  // A people turned away remember it.
  this.take(o.province, p, RefusedPoints);
  this.tell(p, o.province, "Resolution", "A province refused", `Your word refusing ${name} has reached it: it stays as it was, and its people remember that you turned them away.`);
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
  const ceded = S.declarations.find((d) => d.province === province && d.power === p && d.gone === null)?.from ?? null;
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
