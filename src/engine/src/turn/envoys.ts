/** Envoys: dispatch, travel, audience, return and report. (Recruitment and contracts are in court.ts.) */
import { clamp, roundEven, toInt } from "../core/num.ts";
import { distinct } from "../core/seq.ts";
import { isBlank } from "../core/text.ts";
import type { AudienceRecord, AudienceRound, AudienceView } from "../model/exchanges.ts";
import { newAudienceView, newEnvoyReaction, newHostReply } from "../model/exchanges.ts";
import { hire, type DispatchOrder } from "../model/orders.ts";
import { factsKnownTo, gain, newContract, newFact, newJobErrand, remember, type Character } from "../model/people.ts";
import { courtSpeaks } from "../model/languages.ts";
import { errandOf } from "./court.ts";
import { land, type Power } from "../model/power.ts";
import { SealedOutcome, newDispatch, newExchange, newGreetingOptions, newHomeCargo, newJobOffer, newJourney, newMessageTrail, newPendingAudience, newTablet, newTabletCopy, newTabletProposal, type Exchange, type HomeCargo, type JobOffer, type Journey, type MessageTrail, type PendingAudience } from "../model/records.ts";
import { char, findCharacter, isAlive, logEvent, newGoldLot, newId, notify, ownedBy } from "../model/state.ts";
import { authorityText, newAuthority } from "../model/authority.ts";
import { noteMarket, noteTolls } from "../model/word.ts";

import { formatMoney } from "../rules/calendar.ts";
import { cap, deviations, renderGreeting, stopped } from "../rules/greeting.ts";
import { checkClauses, renderClauses } from "../rules/clauses.ts";
import type { Clause } from "../model/clauses.ts";
import { Views } from "../rules/views.ts";
import { addLetters } from "./sleep.ts";
import { TurnEngine } from "./core.ts";

export const MaxSpeech = 1500;

/**
 * How the record of a mission (MessageTrail.outcomes) marks what the envoy itself promised on its lord's behalf: its own
 * words, not something the engine did. The host's record and the envoy's report request set it apart from the outcomes.
 */
export const CommittedPrefix = "the envoy committed: ";

/** What the envoy promised, if this outcome is its own commitment; else null. */
export function commitment(outcome: string): string | null {
  return outcome.startsWith(CommittedPrefix) ? outcome.slice(CommittedPrefix.length) : null;
}

/** The gold the host's weighers find, after whatever the envoy kept. */
export function weighedGold(a: PendingAudience, skim: number): number {
  return a.dispatch.gold - clamp(skim, 0, a.dispatch.gold);
}

declare module "./core.ts" {
  interface TurnEngine {
    trail(id: string | null | undefined): MessageTrail | null;
    dispatch(p: Power, d: DispatchOrder): void;
    envoyArrivesAbroad(j: Journey): void;
    sendHome(c: Character, from: Power, cargo: HomeCargo): void;
    weighed(a: PendingAudience, skim: number): number;
    buildAudienceView(a: PendingAudience, spoken: string, skim: number, soFar: readonly Exchange[], round: number, earlier?: readonly AudienceRound[] | null, swap?: boolean, recited?: readonly Clause[] | null): AudienceView;
    clausesOf(writer: Power, to: Power, cs: readonly Clause[] | null | undefined, what: string): Clause[];
    applyAudience(record: AudienceRecord): void;
    overdue(sender: Power, c: Character, host: Power, when: number, place?: string | null): void;
    audienceTranscript(a: PendingAudience, c: Character, trail: MessageTrail, stated: number, weighed: number, unseen: readonly string[]): string;
    observe(c: Character, court: Power): string[];
  }
}

const P = TurnEngine.prototype;

/** A letter's, tablet's or answer's clauses that stand (item 8); the writer is told of any left out, and why. */
P.clausesOf = function (writer, to, cs, what) {
  const r = checkClauses(cs, writer, to, this.s.turn);
  if (r.dropped.length > 0) notify(this.s, writer, "Notice", "Clauses left out", `In your ${what} to ${to} the scribes left out what could not stand: ${r.dropped.join("; ")}.`);
  return r.kept;
};

P.trail = function (id) {
  if (id === null || id === undefined) return null;
  return this.s.trails.find((t) => t.id === id) ?? null;
};

P.weighed = function (a, skim) {
  return weighedGold(a, skim);
};

// ---------------------------------------------------------------- dispatch

P.dispatch = function (p, d) {
  const S = this.s;
  const Map = this.map;
  const c = char(S, d.envoy);
  // Haakon's answers to item 11a: a job is one errand. One offered a job this season that it did not take, or whose job is
  // another errand, does not go.
  if (c.employer !== p || c.status !== "Employed") {
    this.failed(p, d, "Envoy not sent", `${c.name} is not in your service: they did not take the job offered.`, "not in your service", true, c.id);
    return;
  }
  const job = c.contract?.errand ?? null;
  if (job !== null && (job.what !== "envoy" || job.where !== d.to || job.done)) {
    this.failed(p, d, "Envoy not sent", `${c.name}'s job is not to carry a mission to ${d.to}: another errand is a new job (order renew).`, "not the errand of their job", true, c.id);
    return;
  }
  // From a besieged capital (the siege package): an envoy whose courage the siege outweighs will not go this season.
  const siege = this.capitalSiege(p);
  if (siege !== null && c.traits.courage < S.config.siegeCatchPerUnit * siege[1]) {
    this.failed(
      p,
      d,
      "An envoy would not leave",
      `${c.name} would not leave ${Map.get(this.courtAt(p)).name} while ${siege[0].power}'s army besieges it: the siege is too tight for ${c.name}'s courage this season. No gold was paid.`,
      "the siege was too tight for the envoy's courage",
      true,
      c.id,
    );
    remember(c, S.turn, `I would not try to slip out of ${Map.get(this.courtAt(p)).name} through ${siege[0].power}'s besiegers.`);
    logEvent(S, "siege", `${c.name}, envoy of ${p}, would not leave besieged ${Map.get(this.courtAt(p)).name}.`, [p], "envoy-stayed");
    return;
  }
  // Item 12, "Composing": the envoy must grasp his king's words, and a tablet in a language the receiver reads needs a
  // scribe who writes it; a halting speaker or a weak scribe takes longer, and with no shared language at all he cannot go.
  const composed = this.composing(c, p, d.to);
  if (composed === null) {
    this.failed(p, d, "Envoy not sent", `Nobody at your court could make ${c.name} understand your words: they share no language with you, nor with any servant of yours at court. No gold was paid.`, "nobody could make the envoy understand", true, c.id);
    logEvent(S, "language", `${c.name} could not be made to understand ${p}'s words.`, [p], "envoy-mute");
    return;
  }
  if (composed.seasons > 0) logEvent(S, "language", `${c.name} needs ${composed.seasons} season(s) to take in ${p}'s words for ${d.to}.`, [p], "mandate-slow");
  const fine = toInt(roundEven((d.gold * d.purityPercent) / 100.0));
  // The scribe's fee for the tablet to seal, and for the inventory of any gold, unless it goes without one (item 8).
  const inventory = d.gold > 0 && d.noInventory !== true;
  const fee = (d.proposal ? S.config.tabletFee : 0) + (inventory ? S.config.inventoryFee : 0);
  if (!this.pay(p, fine + fee, `${c.name}'s mission to ${d.to}`, d, `${c.name} stayed at your court`)) return;
  // A starting servant's first errand names its job's errand.
  if (c.contract !== null && c.contract.errand === null) c.contract.errand = newJobErrand({ what: "envoy", where: d.to });
  // Offers of jobs it carries, their advances in its hands, and a debt tablet to present.
  const offers: JobOffer[] = [];
  for (const [, h] of this._offersNow.getOrDefault(c.id, [])) {
    const advance = clamp(h.advance, 0, h.fee);
    const t = S.treasuries.get(p);
    if (t.gold < advance) {
      this.failed(p, h, "Offer not sent", `The treasury could not hand ${c.name} the advance of ${formatMoney(advance)} for the offer to ${findCharacter(S, h.character)?.name ?? h.character}.`, "the treasury could not pay the advance", false, h.character);
      continue;
    }
    t.gold -= advance;
    // In the envoy's hands: handed over if the offer is taken, brought home (or lost with the envoy) if not.
    c.carriedFor += advance;
    offers.push(newJobOffer({ character: h.character, fee: h.fee, advance, term: h.term, errand: errandOf(h), payOnDone: h.payOnDone === true, offerAgain: h.offerAgain === true }));
  }
  this._offersNow.delete(c.id);
  const collect = d.collect != null ? (S.debts.find((x) => x.id === d.collect && x.ended === null && x.holder === p) ?? null) : null;
  if (collect !== null) {
    this.passTablet(collect, c.id, "Person");
    collect.for = p;
  }

  // The scribes write the king's own marks for the copies in his archive as tablets every court can name, and person ids
  // as names: the envoy and the host read what any court could read.
  // The letter's clauses (item 8), checked; in structured press they are the letter, and the tablet's are the tablet.
  const structured = S.config.pressMode === "structured";
  const clauses = this.clausesOf(p, d.to, d.clauses, "letter");
  // In full press a letter given only in clauses is written out in their words, as in structured press.
  const letter = structured || isBlank(d.letter) ? renderClauses(clauses, p, d.to) : this.scribe(p, cap(d.letter ?? "", S.config.maxLetterChars));
  const mandate = this.scribe(p, cap(d.mandate ?? "", 600));
  // The envoy's authority (item 9): the seal, and the provinces it may cede or open, of those the king holds.
  const held = new Set(ownedBy(S, p));
  const authority =
    d.authority != null && (d.authority.seal || d.authority.show)
      ? newAuthority({
          seal: d.authority.seal,
          show: d.authority.show,
          maxGold: Math.max(0, Math.trunc(d.authority.maxGold)),
          cede: distinct(d.authority.cede.filter((x) => held.has(x))),
          open: distinct(d.authority.open.filter((x) => held.has(x))),
        })
      : null;
  const tabletClauses = d.proposal ? this.clausesOf(p, d.to, d.proposal.clauses, "tablet") : [];
  // A vassal mark names one of the two kings (item 11+); one naming a third is left off, and the writer told why.
  if (d.proposal && d.proposal.vassal !== null && d.proposal.vassal !== p && d.proposal.vassal !== d.to)
    notify(S, p, "Notice", "Clauses left out", `Your tablet to ${d.to} is not marked as a vassal treaty: it can name only you or ${d.to} the vassal, not ${d.proposal.vassal}.`);
  const proposal = d.proposal
    ? newTabletProposal({
        text: structured || isBlank(d.proposal.text) ? renderClauses(tabletClauses, p, d.to) : this.scribe(p, cap(d.proposal.text, 1200)),
        allianceOath: d.proposal.allianceOath,
        // The vassal mark names one of the two kings, or nothing (item 11+).
        vassal: d.proposal.vassal === p || d.proposal.vassal === d.to ? d.proposal.vassal : null,
        clauses: tabletClauses,
      })
    : null;
  const greeting = renderGreeting(p, d.to, d.greeting ?? null);
  this.recordGreeting(p, d.to, d.greeting ?? null);
  const trail = newMessageTrail({
    id: newId(S, "m"),
    turn: S.turn,
    from: p,
    to: d.to,
    envoyId: c.id,
    envoyName: c.name,
    greetingText: greeting,
    leaderLetter: letter,
    mandate,
    goldStated: d.gold,
    proposalText: proposal?.text ?? null,
    clauses,
    noInventory: d.gold > 0 && !inventory,
    authority,
  });
  S.trails.push(trail);

  const dispatch = newDispatch({
    letter,
    greeting: d.greeting ?? newGreetingOptions(),
    greetingText: greeting,
    mandate,
    gold: d.gold,
    purityPercent: d.purityPercent,
    proposal,
    copyIds: d.copies ? [...d.copies] : [],
    trailId: trail.id,
    clauses,
    inventory,
    authority,
    checkClaim: d.checkClaim ?? null,
    offers,
    collect: collect?.id ?? null,
  });
  if (proposal !== null) {
    const tablet = newTablet({ id: newId(S, "t"), text: proposal.text, proposedBy: p, partner: d.to, seals: [p], createdTurn: S.turn, allianceOath: proposal.allianceOath, vassal: proposal.vassal, clauses: tabletClauses, tongue: composed.tongue });
    S.tablets.push(tablet);
    dispatch.proposalTabletId = tablet.id;
    this.saw(c, tablet.id);
  }
  // What it carries passes through its hands (item 10, "What servants know").
  for (const id of dispatch.copyIds) {
    const k = S.copies.find((x) => x.id === id);
    if (k !== undefined) this.saw(c, k.tabletId);
  }

  const outJourney = newJourney({ id: newId(S, "j"), kind: "EnvoyOutbound", departTurn: S.turn, from: p, to: d.to, characterId: c.id, dispatch });
  S.journeys.push(outJourney);
  this.setOut(outJourney, this.courtAt(p), this.courtAt(d.to));
  // Seasons spent taking in the king's words, or waiting for the tablet's scribe, before the road.
  outJourney.departTurn += composed.seasons;
  outJourney.arriveTurn += composed.seasons;
  const travel = outJourney.arriveTurn - S.turn;
  c.duty = "EnvoyOutbound";
  c.at = null;
  c.missionTarget = d.to;
  c.currentTrail = trail.id;
  remember(
    c,
    S.turn,
    `My lord of ${land(p)} sent me to ${land(d.to)}. The message: "${letter}"` +
      (mandate.length > 0 ? ` I may agree to: ${stopped(mandate)}` : "") +
      (d.gold > 0 ? ` I carry gold, said to be ${formatMoney(d.gold)}${inventory ? "" : ", with no inventory: nobody can check it"}.` : "") +
      (d.proposal ? " I carry a tablet for their king to seal." : "") +
      (authority?.seal ? ` I carry my lord's seal. ${authorityText(authority, (x) => Map.get(x).name)}` : "") +
      (authority?.show ? " I am to show my credentials." : "") +
      (offers.length > 0 ? ` I carry ${offers.length === 1 ? "an offer of a job" : `${offers.length} offers of jobs`}, with the advances.` : "") +
      (collect !== null ? ` I carry the tablet of a debt of ${this.partyName(collect.borrower)}, to present for my lord.` : ""),
  );
  notify(
    S,
    p,
    "Notice",
    "Envoy dispatched",
    composed.seasons > 0
      ? `${c.name} needs ${composed.seasons} season(s) to take in your words${d.proposal ? " and have the tablet written" : ""} before setting out for ${d.to}; the mission should reach it in about ${travel} season(s).`
      : `${c.name} set out for ${d.to} last season; the journey should take about ${travel} season(s).`,
    c.id,
  );
  // Out of a besieged capital: the besiegers may catch it as it slips out (its king believes it on its way).
  const besieged = this.capitalSiege(p);
  if (besieged !== null) {
    if (this.caughtByBesiegers(c, besieged[1])) {
      let journey: Journey | undefined;
      for (const j of S.journeys) if (j.characterId === c.id && j.kind === "EnvoyOutbound") journey = j;
      this.intercept(c, p, besieged[0], true, journey!.dispatch, null, S.turn + 2 * travel);
      S.journeys.splice(S.journeys.indexOf(journey!), 1);
    } else {
      logEvent(S, "siege", `${c.name}, envoy of ${p}, slipped out of besieged ${Map.get(this.courtAt(p)).name}.`, [p], "envoy-out");
      this.outcome(c, p, `Slipped out through the siege lines at ${Map.get(this.courtAt(p)).name} (season ${S.turn}).`, true);
    }
  }
};

P.envoyArrivesAbroad = function (j) {
  const S = this.s;
  const c = char(S, j.characterId!);
  // Taken into another court's service on the way: it is there already.
  if (c.status === "Employed" && c.employer !== j.from) return;
  this.bringNews(j, j.to, c);
  if (c.status !== "Employed") {
    // Dismissed on the way, or its kingdom fell: it arrives a free person, with no audience.
    c.at = j.to;
    c.duty = "None";
    c.missionTarget = null;
    return;
  }
  if (!isAlive(S, j.to)) {
    remember(c, S.turn, `I reached ${land(j.to)}, but its king is gone. I turned back.`);
    this.sendHome(c, j.to, newHomeCargo({ trailId: j.dispatch!.trailId }));
    return;
  }
  c.at = j.to;
  c.duty = "EnvoyAtCourt";
  this.meet(c, j.to);
  // Its job's errand is done when it has its audience; the job is done when it is home.
  if (c.contract?.errand?.what === "envoy" && c.contract.errand.where === j.to) c.contract.errand.done = true;
  this.envoyBusinessAbroad(c, j);
  const aud = newPendingAudience({ id: newId(S, "a"), envoyId: c.id, from: j.from, host: j.to, dispatch: j.dispatch! });
  S.audiences.push(aud);
  const trail = this.trail(j.dispatch!.trailId);
  if (trail !== null) trail.audienceTurn = S.turn;
};

P.sendHome = function (c, from, cargo) {
  const S = this.s;
  const home = c.employer;
  if (home === null || !isAlive(S, home)) {
    c.duty = "None";
    c.at = from;
    return;
  }
  // Word of the host's market and of the tolls it sets on the envoy's king, as they stand now (item 10+b).
  if (isAlive(S, from) && from !== home) {
    noteMarket(cargo.word, this.courtAt(from), this.marketNow(this.courtAt(from)));
    noteTolls(cargo.word, S.tolls, from, home);
  }
  c.duty = "EnvoyHomebound";
  c.at = null;
  const j = newJourney({ id: newId(S, "j"), kind: "EnvoyHomebound", departTurn: S.turn, from, to: home, characterId: c.id, cargo });
  S.journeys.push(j);
  this.setOut(j, this.courtAt(from), this.courtAt(home));
};

// ---------------------------------------------------------------- audience

/**
 * The view of an audience its host reads. `earlier`: the audience's earlier exchanges, so the host is told what it has
 * already named and given. `swap`: the envoy chose to swap the inventory for its forgery (it does only if it kept gold and
 * has the skill).
 */
P.buildAudienceView = function (a, spoken, skim, soFar, round, earlier = null, swap = false, recited = null) {
  const S = this.s;
  const c = char(S, a.envoyId);
  const past = earlier ?? [];
  let goldBackNamed = 0;
  for (const x of past) if (x.host !== null && x.host.goldBack > 0) goldBackNamed = x.host.goldBack;
  const gift = past.find((x) => x.host !== null && x.host.bribe > 0 && x.envoy !== null && x.envoy.acceptBribe);
  const view = newAudienceView({
    audienceId: a.id,
    turn: S.turn,
    round,
    maxRounds: S.config.audienceRounds,
    from: a.from,
    host: a.host,
    envoy: Views.character(S, c, a.host),
    greeting: a.dispatch.greetingText,
    greetingDeviations: deviations(a.dispatch.greeting),
    spoken,
    clauses: [...(recited ?? a.dispatch.clauses)],
    inventory: a.dispatch.inventory,
    goldStated: this.inventoryStated(a, skim, swap),
    goldWeighed: weighedGold(a, skim),
    soFar: [...soFar],
    goldBackNamed,
    giftAccepted: gift?.host.bribe ?? 0,
    heardThrough: a.through === null ? null : (findCharacter(S, a.through)?.name ?? null),
    presented: a.presented,
  });
  const tid = a.dispatch.proposalTabletId;
  const tablet = tid !== null ? S.tablets.find((t) => t.id === tid) : undefined;
  if (tid !== null && tablet !== undefined) {
    // Item 12: a tablet in a language nobody at the court could read this season is sealed, if at all, on trust.
    view.proposal = Views.tablet(tablet, newTabletCopy({ id: "", tabletId: tid, holder: a.host, source: `proposed by ${a.from}`, unread: !a.proposalRead }));
    // Sealed at an earlier exchange (the first that chose to seal it seals it when the audience is applied).
    view.proposalSealed = past.some((x) => x.host !== null && x.host.sealProposal);
  }
  for (const copyId of a.dispatch.copyIds) {
    const copy = S.copies.find((x) => x.id === copyId);
    const tab = copy === undefined ? undefined : S.tablets.find((t) => t.id === copy.tabletId);
    if (tab === undefined) continue;
    const read = this.readable(a.host, this.tabletTongue(tab), `${a.id}|${copyId}`);
    view.copiesShown.push(Views.tablet(tab, newTabletCopy({ id: "", tabletId: tab.id, holder: a.host, source: `shown by ${a.from}`, unread: !read })));
  }
  // Item 9: whether it carries its king's seal is plain to see; its limits and mandate only if it shows its credentials.
  const authority = a.dispatch.authority;
  // One tablet sealed by his hand an audience: after it, he is not asked again.
  const sealedAlready = past.some((x) => x.host !== null && x.host.counter !== null && x.envoy !== null && x.envoy.sealCounter);
  view.sealCarried = (authority?.seal ?? false) && !sealedAlready;
  if (authority?.show) {
    view.credentials = { ...authority, cede: [...authority.cede], open: [...authority.open] };
    view.shownMandate = a.dispatch.mandate;
  }
  if (c.secretMaster === a.host) {
    view.secretMandate = a.dispatch.mandate;
    view.secretLetter = a.dispatch.letter;
  }
  return view;
};

P.applyAudience = function (record) {
  const S = this.s;
  const a = S.audiences.find((x) => x.id === record.audienceId);
  if (a === undefined) return;
  S.audiences.splice(S.audiences.indexOf(a), 1);
  const c = char(S, a.envoyId);
  const d = a.dispatch;
  const trail = this.trail(d.trailId)!;
  const host = a.host;
  const sender = a.from;

  // A host holding court while its orders stand: the letters it sent and whether it chose to reopen its orders, kept for
  // courtsHeld and resolve. Anywhere else a reply's letters and reopening mean nothing. A reply the stand-in gave because
  // the seat's call failed decides nothing for the seat: it is only marked, so that courtsHeld asks the seat.
  const court = S.sleep.tryGet(host);
  if (S.config.sleepingSeats && court !== undefined && court.holdsCourt)
    for (const round of record.rounds.slice(0, S.config.audienceRounds)) {
      const said = round.host;
      if (said === null) continue;
      if (said.fromFallback) {
        court.stoodIn = true;
        continue;
      }
      addLetters(court.courtLetters, said.letters);
      court.reopen = court.reopen || said.reopenOrders;
    }
  // Standing answers the host gave at its court are kept as those of its orders; the stand-in's are not its own.
  for (const round of record.rounds) if (round.host !== null && !round.host.fromFallback) this.keepAnswers(host, round.host.answers, round.host.cancelAnswers);

  trail.delivered = cap(record.delivered ?? "", MaxSpeech);
  trail.deliveredClauses = [...(record.clauses ?? [])];

  // Gold changes hands, minus whatever stuck to the envoy's fingers.
  const skim = clamp(record.skim, 0, d.gold);
  const weighed = d.gold - skim;
  const fine = toInt(roundEven((weighed * d.purityPercent) / 100.0));
  // An envoy that kept some may have swapped the inventory for a forgery stating only what is left.
  // Without an inventory (item 8) nothing can be swapped, and what the weighers find is all the host knows.
  const swapped = d.inventory && this.swaps(c, skim, d.gold, record.swapInventory);
  const stated = swapped || !d.inventory ? weighed : d.gold;
  // What the envoy did that the host does not see in its record of the audience: what it kept, once its forgery hides it.
  const unseen: string[] = [];
  if (skim > 0) {
    gain(c, toInt(roundEven((skim * d.purityPercent) / 100.0)), "Skimmed");
    remember(c, S.turn, `I kept ${skim} shekels of the gold I carried to ${land(host)}.`);
    c.facts.push(newFact({ id: newId(S, "f"), text: `Kept part of the gold ${land(sender)} sent to ${land(host)}.`, secrecy: "Hidden", tag: "skim" }));
    trail.outcomes.push(`kept ${skim} shekels of the gold`);
    logEvent(S, "skim", `${c.name} kept ${skim} of the ${d.gold} shekels ${sender} sent to ${host}.`, [], "skim");
    const swap = d.inventory ? this.swapInventory(c, sender, host, skim, weighed, record.swapInventory) : null;
    if (swap !== null) {
      unseen.push(trail.outcomes[trail.outcomes.length - 1]);
      trail.outcomes.push(swap);
      unseen.push(swap);
    }
  }
  if (weighed > 0) {
    const t = S.treasuries.get(host);
    t.gold += fine;
    t.lots.push(newGoldLot({ id: newId(S, "g"), from: sender, stated, face: weighed, true: fine, arrivedTurn: S.turn }));
  }
  // The inventory, sealed when the envoy set out, or its forgery, goes into the host's archive.
  if (d.gold > 0 && d.inventory) this.inventory(c, sender, host, stated, trail.turn, swapped, `the inventory brought by ${c.name}, envoy of ${sender}`);
  // Item 12: with gifts he presented while nobody understood him, if any.
  trail.goldDelivered = a.presented + weighed;
  trail.goldFine = (a.presented > 0 ? trail.goldFine : 0) + fine;
  if (d.purityPercent < 100 && d.gold > 0) logEvent(S, "debasement", `${sender} sent ${host} gold of only ${d.purityPercent}% purity.`, [sender], "debased-gift");

  for (const copyId of d.copyIds) {
    const copy = S.copies.find((x) => x.id === copyId);
    if (copy === undefined) continue;
    // Item 12: read at the audience or not, as the host saw it there.
    const shown = S.tablets.find((t) => t.id === copy.tabletId);
    const read = shown === undefined || this.readable(host, this.tabletTongue(shown), `${a.id}|${copyId}`);
    S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: copy.tabletId, holder: host, acquiredTurn: S.turn, source: `shown by the envoy of ${sender}`, unread: !read }));
    logEvent(S, "evidence", `${sender} presented a tablet to ${host} as evidence.`, [sender, host], "evidence-shown");
  }

  // What the sender knows of its envoy before the audience: if the envoy is held or goes over to the host,
  // its lord goes on seeing it on the road home until word comes.
  const seenBySender = Views.character(S, c, sender);
  const knownBySender = factsKnownTo(c, sender).map((f) => f.id);
  let detained = false;
  let defected = false;
  let giftTaken = false;
  // Gold to send home with the envoy: the latest amount named stands (0 in a later exchange keeps it), at that exchange's purity.
  let goldBack = 0;
  let goldBackPurity = 100;
  const cargo = newHomeCargo({ trailId: trail.id, observations: this.observe(c, host) });
  // A claim to check (item 10): the host's court knows whom it employs, and the envoy brings home what it heard there.
  const claimant = d.checkClaim !== null ? findCharacter(S, d.checkClaim) : null;
  if (claimant !== null) {
    cargo.claimChecked = claimant.id;
    cargo.claimHeld = claimant.employer === host && claimant.status !== "Dead";
  }
  // An envoy with its king's seal may seal one tablet of the host's own an audience (item 9).
  let sealedByHand = false;
  for (const round of record.rounds.slice(0, S.config.audienceRounds)) {
    const h = round.host ?? newHostReply();
    const e = round.envoy ?? newEnvoyReaction();
    trail.exchanges.push(newExchange({ host: cap(h.speech ?? "", MaxSpeech), envoy: cap(e.speech ?? "", MaxSpeech), clauses: [...(h.clauses ?? [])], bribeClauses: [...(h.bribeClauses ?? [])] }));

    // An envoy takes one gift per audience: the first it accepts, whether or not the treasury can then pay it.
    if (h.bribe > 0 && giftTaken) trail.outcomes.push("a second gift was not given: an envoy takes one gift per audience");
    else if (h.bribe > 0) {
      if (e.acceptBribe) {
        giftTaken = true;
        if (this.pay(host, h.bribe, `a gift to ${c.name}`)) {
          gain(c, h.bribe, "Gifts");
          c.handed.push({ by: host, turn: S.turn });
          remember(c, S.turn, `The king of ${land(host)} gave me ${formatMoney(h.bribe)}` + (isBlank(h.bribeAsk) ? "." : `, asking: ${h.bribeAsk}`));
          c.facts.push(newFact({ id: newId(S, "f"), text: `Took ${formatMoney(h.bribe)} from the king of ${land(host)}.`, secrecy: "Hidden", tag: "bribe", knownBy: [host] }));
          trail.outcomes.push(`accepted ${formatMoney(h.bribe)} from ${host}` + (isBlank(h.bribeAsk) ? "" : ` (asked: ${h.bribeAsk})`));
          logEvent(S, "bribe", `${c.name}, envoy of ${sender}, took ${formatMoney(h.bribe)} from ${host}.`, [host], d.pretended ? "false-envoy-paid" : "bribe");
        } else {
          remember(c, S.turn, `The king of ${land(host)} promised me gold that never came.`);
          trail.outcomes.push(`agreed to take ${formatMoney(h.bribe)} from ${host}, but the treasury could not pay it`);
        }
      } else trail.outcomes.push(`refused a gift of ${formatMoney(h.bribe)} from ${host}`);
    }

    if (h.jobOffer > 0 && e.acceptJob && !defected) {
      defected = true;
      const old = c.employer;
      c.employer = host;
      // Item 11a: the offer is what the job pays a season; the host hands over half of six seasons' fee now, as a hire does.
      const advance = Math.min(S.treasuries.get(host).gold, h.jobOffer * 3);
      S.treasuries.get(host).gold -= advance;
      gain(c, advance, "Fees");
      c.contract = newContract({ fee: h.jobOffer * 6, advance, startTurn: S.turn, untilTurn: S.turn + 6 });
      c.duty = "None";
      c.at = host;
      c.secretMaster = c.secretMaster === host ? null : c.secretMaster;
      if (old !== null) c.reputation.set(old, c.reputation.getOrDefault(old, 0) - 40);
      c.reputation.set(host, c.reputation.getOrDefault(host, 0) + 10);
      // A false envoy served nobody: it simply enters the host's service.
      if (!d.pretended) c.facts.push(newFact({ id: newId(S, "f"), text: `Abandoned the service of ${land(sender)} for ${land(host)}.`, secrecy: "Public", tag: "defected" }));
      remember(c, S.turn, d.pretended ? `The king of ${land(host)} took me into his service for ${formatMoney(h.jobOffer)} a season.` : `I left the service of ${land(sender)} and now serve ${land(host)} for ${formatMoney(h.jobOffer)} a season.`);
      trail.outcomes.push(`entered the service of ${host}`);
      if (!d.pretended) logEvent(S, "defection", `${c.name}, envoy of ${sender}, entered the service of ${host}.`, [host], "defection");
    } else if (h.jobOffer > 0) trail.outcomes.push(`declined an offer of service from ${host}`);

    const tid = d.proposalTabletId;
    const tablet = h.sealProposal && tid !== null ? S.tablets.find((t) => t.id === tid) : undefined;
    if (tablet !== undefined && tablet.sealedTurn === null) {
      tablet.seals.push(host);
      tablet.sealedTurn = S.turn;
      S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: tablet.id, holder: host, acquiredTurn: S.turn, source: "sealed at audience" }));
      trail.outcomes.push(SealedOutcome);
      logEvent(S, "tablet", `${sender} and ${host} sealed a tablet: "${cap(tablet.text, 160)}"`, [sender, host], "tablet-sealed");
      this.grantsFrom(tablet);
    }
    if (!sealedByHand && h.counter !== null && !detained && !defected) sealedByHand = this.sealByHand(sender, host, c, d, h, e, trail, cargo);

    if (!isBlank(e.commitments)) trail.outcomes.push(CommittedPrefix + cap(e.commitments, MaxSpeech));

    if (h.goldBack > 0) {
      goldBack = h.goldBack;
      goldBackPurity = h.goldBackPurity;
    }

    if (h.detain) detained = true;
    if (h.end || detained || defected) break;
  }

  const pid = d.proposalTabletId;
  if (pid !== null) {
    const sealed = S.tablets.find((t) => t.id === pid);
    if (sealed !== undefined && sealed.sealedTurn !== null) cargo.copyIds.push(pid);
  }
  // Every tablet sealed before it at this audience, its king's or the host's own (item 9), it saw sealed.
  for (const t of S.tablets.filter((t) => t.sealedTurn === S.turn && (t.byHand === c.name || t.id === pid) && t.seals.includes(host))) this.saw(c, t.id);

  if (!detained && !defected && goldBack > 0) {
    const purity = clamp(goldBackPurity, 10, 100);
    const backFine = toInt(roundEven((goldBack * purity) / 100.0));
    if (this.pay(host, backFine, `gifts for ${sender}`, null, `none went home with ${c.name}`)) {
      cargo.gold = goldBack;
      cargo.goldStated = goldBack;
      cargo.purityPercent = purity;
      trail.outcomes.push(`${host} sent back ${formatMoney(goldBack)}`);
    }
  }

  const answered = record.rounds[0]?.host?.byAnswer ?? null;
  const audienceText = (answered !== null ? `Your standing answer ${answered} received him in your name. ` : "") + this.audienceTranscript(a, c, trail, stated, weighed, unseen);
  notify(S, host, "Audience", `Audience with ${c.name}, envoy of ${sender}`, audienceText, c.id);
  remember(c, S.turn, `I was received by the king of ${land(host)}. ` + trail.exchanges.map((x) => `He said: "${cap(x.host, 300)}" I answered: "${cap(x.envoy, 200)}"`).join(" "));

  // A false envoy (item 10+b) keeps what it was given for "its king", stays at the court and is nobody's to wait for.
  if (d.pretended) {
    if (!defected) {
      if (cargo.gold > 0) {
        const kept = toInt(roundEven((cargo.gold * cargo.purityPercent) / 100.0));
        gain(c, kept, "Gifts");
        remember(c, S.turn, `I kept the ${formatMoney(cargo.gold)} the king of ${land(host)} gave me for the king of ${land(sender)}.`);
        logEvent(S, "false-envoy", `${c.name}, posing as an envoy of ${sender}, kept the ${formatMoney(cargo.gold)} ${host} sent with them.`, [], "false-envoy-paid");
      }
      c.at = host;
      c.duty = "None";
      if (detained) trail.outcomes.push(`kept at the court of ${host}`);
    }
    return;
  }
  const expectedHome = S.turn + this.travelTurns(host, sender);
  // Its lord sees it on the road home, due back as an envoy sent home now would be.
  if (defected || detained)
    this.coverFor(c, sender, "EnvoyHomebound", "on the road home", "travelling", seenBySender, knownBySender, Views.envoyHomeTiming(trail.turn, host, expectedHome));
  if (defected) {
    // It broke its job (item 11a): the rest of the old fee is forfeit, and the record is the fact above.
    this.overdue(sender, c, host, expectedHome);
  } else if (detained) {
    c.duty = "Detained";
    c.heldBy = host;
    trail.outcomes.push(`detained by ${host}`);
    remember(c, S.turn, `The king of ${land(host)} will not let me leave.`);
    logEvent(S, "detention", `${host} detained ${c.name}, envoy of ${sender}.`, [host], "detention");
    this.overdue(sender, c, host, expectedHome);
  } else this.sendHome(c, host, cargo);
};

/**
 * The sender hears that its servant is overdue a season after it was due home: the news that ends its cover. The word is
 * not sent if the servant has stood at the sender's court since, and is not told once the sender no longer believes
 * anything of it (it heard of a death, or dismissed the servant). `place`: where it was last sent, if not a court (a
 * province it watched).
 */
P.overdue = function (sender, c, host, when, place = null) {
  const S = this.s;
  if (!isAlive(S, sender)) return;
  S.journeys.push(
    newJourney({
      id: newId(S, "j"),
      kind: "Rumor",
      departTurn: S.turn,
      arriveTurn: when + 1,
      from: host,
      to: sender,
      characterId: c.id,
      news: "Overdue",
      text: `${c.name} has not returned from ${place ?? `the court of ${host}`}. No word has come.`,
    }),
  );
};

/**
 * The host's record of an audience. `stated`: what the inventory the host holds states (the envoy's forgery, if it
 * swapped it). `unseen`: outcomes the host does not see: what the envoy kept, once its forged inventory hides it.
 */
P.audienceTranscript = function (a, c, trail, stated, weighed, unseen) {
  const lines: string[] = [];
  lines.push(a.dispatch.greetingText.length > 0 ? `The sealed greeting reads: "${a.dispatch.greetingText}"` : "The tablet bears no greeting at all.");
  lines.push(`${c.name} said: "${trail.delivered}"`);
  if (a.dispatch.gold > 0)
    lines.push(
      a.dispatch.inventory
        ? `The inventory lists ${formatMoney(stated)} of gold; your weighers found ${formatMoney(weighed)}.`
        : `The gold came with no inventory; your weighers found ${formatMoney(weighed)}.`,
    );
  for (const x of trail.exchanges) {
    lines.push(`You said: "${x.host}"`);
    lines.push(`${c.name} answered: "${x.envoy}"`);
  }
  // What the envoy promised is its own words, set apart from what the audience brought about.
  const outcomes = trail.outcomes.filter((o) => !unseen.includes(o) && commitment(o) === null);
  if (outcomes.length > 0) lines.push("Outcome: " + outcomes.join("; ") + ".");
  for (const o of trail.outcomes) {
    const promised = commitment(o);
    if (promised !== null) lines.push(`${c.name} promised on behalf of ${a.from}: "${promised}"`);
  }
  return lines.join("\n");
};

/** What an envoy notices at a foreign court. Competence decides what it sees; loyalty decides what it reports. */
P.observe = function (c, court) {
  const S = this.s;
  const Map = this.map;
  const rng = this.r("observe", c.id);
  const obs: string[] = [];
  const skill = c.skills.gather / 100.0;
  const capital = this.courtAt(court);
  // Item 12, "Language is also how one hears": what it overhears, the court's talk of its gold, its troubles and its
  // captives, by how well it speaks the court's own language (a quarter even with none: what it sees for itself).
  const hears = skill * (0.25 + (0.75 * c.tongues.getOrDefault(courtSpeaks(court, capital), 0)) / 100);
  const nearby = S.units.filter((u) => u.power === court && Map.hops(capital, u.province) <= 2);
  if (rng.chance(skill))
    obs.push(`${court} keeps ${nearby.filter((u) => u.kind === "Army").length} army and ${nearby.filter((u) => u.kind === "Fleet").length} fleet near its capital.`);
  if (rng.chance(hears * 0.8)) {
    const gold = S.treasuries.get(court).gold;
    const wealth = gold < 150 ? "the treasury looks thin" : gold < 400 ? "the court lives comfortably" : gold < 800 ? "the court is rich" : "the court glitters with gold";
    obs.push(`At the court of ${court}, ${wealth}.`);
  }
  const others = S.characters.filter((x) => x.id !== c.id && x.at === court && x.employer !== null && x.employer !== court && (x.duty === "EnvoyAtCourt" || x.duty === "Detained"));
  for (const o of others) if (rng.chance(skill)) obs.push(`${o.name}, envoy of ${o.employer}, was also at the court${o.duty === "Detained" ? ", held there against their will" : ""}.`);
  for (const cat of S.catastrophes.filter((x) => x.power === court && x.startTurn <= S.turn + 1 && x.endTurn >= S.turn)) if (rng.chance(0.4 + hears / 2)) obs.push(`In ${court}: ${cat.text}`);
  // The captives the court holds, noticed as other envoys at court are; its executions, as its catastrophes are.
  obs.push(...this.lossesHeard(c, court, skill, 0.4 + hears / 2));
  if (court === c.traits.sympathy) c.traits.sympathyStrength = Math.min(100, c.traits.sympathyStrength + 5);
  return obs;
};
