/** Envoys: dispatch, travel, audience, return and report. (Recruitment and contracts are in court.ts.) */
import { clamp, roundEven, toInt } from "../core/num.ts";
import { isBlank, trim } from "../core/text.ts";
import type { AudienceRecord, AudienceRound, AudienceView, MindReply, MindRequest } from "../model/exchanges.ts";
import { newAudienceView, newEnvoyReaction, newHostReply, newMindRequest, requestFor } from "../model/exchanges.ts";
import type { DispatchOrder, ReleaseOrder } from "../model/orders.ts";
import { factsKnownTo, gain, newContract, newFact, remember, type Character } from "../model/people.ts";
import { land, type Power } from "../model/power.ts";
import {
  SealedOutcome,
  newDispatch,
  newExchange,
  newGreetingOptions,
  newHomeCargo,
  newJourney,
  newMessageTrail,
  newPendingAudience,
  newTablet,
  newTabletCopy,
  newTabletProposal,
  type Exchange,
  type HomeCargo,
  type Journey,
  type MessageTrail,
  type PendingAudience,
} from "../model/records.ts";
import { char, findCharacter, isAlive, logEvent, newGoldLot, newId, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { cap, deviations, renderGreeting, stopped } from "../rules/greeting.ts";
import { Views } from "../rules/views.ts";
import { removeAll } from "./resolve.ts";
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
    buildAudienceView(a: PendingAudience, spoken: string, skim: number, soFar: readonly Exchange[], round: number, earlier?: readonly AudienceRound[] | null, swap?: boolean): AudienceView;
    applyAudience(record: AudienceRecord): void;
    overdue(sender: Power, c: Character, host: Power, when: number, place?: string | null): void;
    audienceTranscript(a: PendingAudience, c: Character, trail: MessageTrail, stated: number, weighed: number, unseen: readonly string[]): string;
    observe(c: Character, court: Power): string[];
    envoyArrivesHome(j: Journey): void;
    releaseEnvoy(host: Power, r: ReleaseOrder): void;
    letEnvoyGo(host: Power, c: Character, reply: string | null): void;
    fulfil(req: MindRequest, reply: MindReply): void;
  }
}

const P = TurnEngine.prototype;

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
  // From a besieged capital (the siege package): an envoy whose courage the siege outweighs will not go this season.
  const siege = this.capitalSiege(p);
  if (siege !== null && c.traits.courage < S.config.siegeCatchPerUnit * siege[1]) {
    this.failed(
      p,
      d,
      "An envoy would not leave",
      `${c.name} would not leave ${Map.capital(p).name} while ${siege[0].power}'s army besieges it: the siege is too tight for ${c.name}'s courage this season. No gold was paid.`,
      "the siege was too tight for the envoy's courage",
      true,
      c.id,
    );
    remember(c, S.turn, `I would not try to slip out of ${Map.capital(p).name} through ${siege[0].power}'s besiegers.`);
    logEvent(S, "siege", `${c.name}, envoy of ${p}, would not leave besieged ${Map.capital(p).name}.`, [p], "envoy-stayed");
    return;
  }
  const fine = toInt(roundEven((d.gold * d.purityPercent) / 100.0));
  const fee = d.proposal ? S.config.tabletFee : 0;
  if (!this.pay(p, fine + fee, `${c.name}'s mission to ${d.to}`, d, `${c.name} stayed at your court`)) return;

  // The scribes write the king's own marks for the copies in his archive as tablets every court can name, and person ids
  // as names: the envoy and the host read what any court could read.
  const letter = this.scribe(p, cap(d.letter ?? "", S.config.maxLetterChars));
  const mandate = this.scribe(p, cap(d.mandate ?? "", 600));
  const proposal = d.proposal ? newTabletProposal({ text: this.scribe(p, cap(d.proposal.text, 1200)), allianceOath: d.proposal.allianceOath }) : null;
  const greeting = renderGreeting(p, d.to, d.greeting ?? null);
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
  });
  if (proposal !== null) {
    const tablet = newTablet({ id: newId(S, "t"), text: proposal.text, proposedBy: p, partner: d.to, seals: [p], createdTurn: S.turn, allianceOath: proposal.allianceOath });
    S.tablets.push(tablet);
    dispatch.proposalTabletId = tablet.id;
  }

  const travel = this.travelTurns(p, d.to);
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "EnvoyOutbound", departTurn: S.turn, arriveTurn: S.turn + travel, from: p, to: d.to, characterId: c.id, dispatch }));
  c.duty = "EnvoyOutbound";
  c.at = null;
  c.missionTarget = d.to;
  c.currentTrail = trail.id;
  remember(
    c,
    S.turn,
    `My lord of ${land(p)} sent me to ${land(d.to)}. The message: "${letter}"` +
      (mandate.length > 0 ? ` I may agree to: ${stopped(mandate)}` : "") +
      (d.gold > 0 ? ` I carry gold, said to be ${formatMoney(d.gold)}.` : "") +
      (d.proposal ? " I carry a tablet for their king to seal." : ""),
  );
  notify(S, p, "Notice", "Envoy dispatched", `${c.name} set out for ${d.to} last season; the journey takes ${travel} season(s).`, c.id);
  // Out of a besieged capital: the besiegers may catch it as it slips out (its king believes it on its way).
  const besieged = this.capitalSiege(p);
  if (besieged !== null) {
    if (this.caughtByBesiegers(c, besieged[1])) {
      let journey: Journey | undefined;
      for (const j of S.journeys) if (j.characterId === c.id && j.kind === "EnvoyOutbound") journey = j;
      this.intercept(c, p, besieged[0], true, journey!.dispatch, null, S.turn + 2 * travel);
      S.journeys.splice(S.journeys.indexOf(journey!), 1);
    } else logEvent(S, "siege", `${c.name}, envoy of ${p}, slipped out of besieged ${Map.capital(p).name}.`, [p], "envoy-out");
  }
};

P.envoyArrivesAbroad = function (j) {
  const S = this.s;
  const c = char(S, j.characterId!);
  // Taken into another court's service on the way: it is there already.
  if (c.status === "Employed" && c.employer !== j.from) return;
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
  c.duty = "EnvoyHomebound";
  c.at = null;
  S.journeys.push(newJourney({ id: newId(S, "j"), kind: "EnvoyHomebound", departTurn: S.turn, arriveTurn: S.turn + this.travelTurns(from, home), from, to: home, characterId: c.id, cargo }));
};

// ---------------------------------------------------------------- audience

/**
 * The view of an audience its host reads. `earlier`: the audience's earlier exchanges, so the host is told what it has
 * already named and given. `swap`: the envoy chose to swap the inventory for its forgery (it does only if it kept gold and
 * has the skill).
 */
P.buildAudienceView = function (a, spoken, skim, soFar, round, earlier = null, swap = false) {
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
    goldStated: this.inventoryStated(a, skim, swap),
    goldWeighed: weighedGold(a, skim),
    soFar: [...soFar],
    goldBackNamed,
    giftAccepted: gift?.host.bribe ?? 0,
  });
  const tid = a.dispatch.proposalTabletId;
  const tablet = tid !== null ? S.tablets.find((t) => t.id === tid) : undefined;
  if (tid !== null && tablet !== undefined) {
    view.proposal = Views.tablet(tablet, newTabletCopy({ id: "", tabletId: tid, holder: a.host, source: `proposed by ${a.from}` }));
    // Sealed at an earlier exchange (the first that chose to seal it seals it when the audience is applied).
    view.proposalSealed = past.some((x) => x.host !== null && x.host.sealProposal);
  }
  for (const copyId of a.dispatch.copyIds) {
    const copy = S.copies.find((x) => x.id === copyId);
    const tab = copy === undefined ? undefined : S.tablets.find((t) => t.id === copy.tabletId);
    if (tab !== undefined) view.copiesShown.push(Views.tablet(tab, newTabletCopy({ id: "", tabletId: tab.id, holder: a.host, source: `shown by ${a.from}` })));
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

  trail.delivered = cap(record.delivered ?? "", MaxSpeech);

  // Gold changes hands, minus whatever stuck to the envoy's fingers.
  const skim = clamp(record.skim, 0, d.gold);
  const weighed = d.gold - skim;
  const fine = toInt(roundEven((weighed * d.purityPercent) / 100.0));
  // An envoy that kept some may have swapped the inventory for a forgery stating only what is left.
  const swapped = this.swaps(c, skim, d.gold, record.swapInventory);
  const stated = swapped ? weighed : d.gold;
  // What the envoy did that the host does not see in its record of the audience: what it kept, once its forgery hides it.
  const unseen: string[] = [];
  if (skim > 0) {
    gain(c, toInt(roundEven((skim * d.purityPercent) / 100.0)), "Skimmed");
    remember(c, S.turn, `I kept ${skim} shekels of the gold I carried to ${land(host)}.`);
    c.facts.push(newFact({ id: newId(S, "f"), text: `Kept part of the gold ${land(sender)} sent to ${land(host)}.`, secrecy: "Hidden", tag: "skim" }));
    trail.outcomes.push(`kept ${skim} shekels of the gold`);
    logEvent(S, "skim", `${c.name} kept ${skim} of the ${d.gold} shekels ${sender} sent to ${host}.`, [], "skim");
    const swap = this.swapInventory(c, sender, host, skim, weighed, record.swapInventory);
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
  if (d.gold > 0) this.inventory(c, sender, host, stated, trail.turn, swapped, `the inventory brought by ${c.name}, envoy of ${sender}`);
  trail.goldDelivered = weighed;
  trail.goldFine = fine;
  if (d.purityPercent < 100 && d.gold > 0) logEvent(S, "debasement", `${sender} sent ${host} gold of only ${d.purityPercent}% purity.`, [sender], "debased-gift");

  for (const copyId of d.copyIds) {
    const copy = S.copies.find((x) => x.id === copyId);
    if (copy === undefined) continue;
    S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: copy.tabletId, holder: host, acquiredTurn: S.turn, source: `shown by the envoy of ${sender}` }));
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
  for (const round of record.rounds.slice(0, S.config.audienceRounds)) {
    const h = round.host ?? newHostReply();
    const e = round.envoy ?? newEnvoyReaction();
    trail.exchanges.push(newExchange({ host: cap(h.speech ?? "", MaxSpeech), envoy: cap(e.speech ?? "", MaxSpeech) }));

    // An envoy takes one gift per audience: the first it accepts, whether or not the treasury can then pay it.
    if (h.bribe > 0 && giftTaken) trail.outcomes.push("a second gift was not given: an envoy takes one gift per audience");
    else if (h.bribe > 0) {
      if (e.acceptBribe) {
        giftTaken = true;
        if (this.pay(host, h.bribe, `a gift to ${c.name}`)) {
          gain(c, h.bribe, "Gifts");
          remember(c, S.turn, `The king of ${land(host)} gave me ${formatMoney(h.bribe)}` + (isBlank(h.bribeAsk) ? "." : `, asking: ${h.bribeAsk}`));
          c.facts.push(newFact({ id: newId(S, "f"), text: `Took ${formatMoney(h.bribe)} from the king of ${land(host)}.`, secrecy: "Hidden", tag: "bribe", knownBy: [host] }));
          trail.outcomes.push(`accepted ${formatMoney(h.bribe)} from ${host}` + (isBlank(h.bribeAsk) ? "" : ` (asked: ${h.bribeAsk})`));
          logEvent(S, "bribe", `${c.name}, envoy of ${sender}, took ${formatMoney(h.bribe)} from ${host}.`, [host], "bribe");
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
      c.contract = newContract({ wage: h.jobOffer, startTurn: S.turn, untilTurn: S.turn + 6 });
      c.duty = "None";
      c.at = host;
      c.secretMaster = c.secretMaster === host ? null : c.secretMaster;
      if (old !== null) c.reputation.set(old, c.reputation.getOrDefault(old, 0) - 40);
      c.reputation.set(host, c.reputation.getOrDefault(host, 0) + 10);
      c.facts.push(newFact({ id: newId(S, "f"), text: `Abandoned the service of ${land(sender)} for ${land(host)}.`, secrecy: "Public", tag: "defected" }));
      remember(c, S.turn, `I left the service of ${land(sender)} and now serve ${land(host)} for ${formatMoney(h.jobOffer)} a season.`);
      trail.outcomes.push(`entered the service of ${host}`);
      logEvent(S, "defection", `${c.name}, envoy of ${sender}, entered the service of ${host}.`, [host], "defection");
    } else if (h.jobOffer > 0) trail.outcomes.push(`declined an offer of service from ${host}`);

    const tid = d.proposalTabletId;
    const tablet = h.sealProposal && tid !== null ? S.tablets.find((t) => t.id === tid) : undefined;
    if (tablet !== undefined && tablet.sealedTurn === null) {
      tablet.seals.push(host);
      tablet.sealedTurn = S.turn;
      S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: tablet.id, holder: host, acquiredTurn: S.turn, source: "sealed at audience" }));
      trail.outcomes.push(SealedOutcome);
      logEvent(S, "tablet", `${sender} and ${host} sealed a tablet: "${cap(tablet.text, 160)}"`, [sender, host], "tablet-sealed");
    }

    if (!isBlank(e.commitments)) trail.outcomes.push(CommittedPrefix + cap(e.commitments, MaxSpeech));

    if (h.goldBack > 0) {
      goldBack = h.goldBack;
      goldBackPurity = h.goldBackPurity;
    }

    if (h.detain) detained = true;
    if (h.end || detained || defected) break;
  }

  const cargo = newHomeCargo({ trailId: trail.id, observations: this.observe(c, host) });
  const pid = d.proposalTabletId;
  if (pid !== null) {
    const sealed = S.tablets.find((t) => t.id === pid);
    if (sealed !== undefined && sealed.sealedTurn !== null) cargo.copyIds.push(pid);
  }

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

  const audienceText = this.audienceTranscript(a, c, trail, stated, weighed, unseen);
  notify(S, host, "Audience", `Audience with ${c.name}, envoy of ${sender}`, audienceText, c.id);
  remember(c, S.turn, `I was received by the king of ${land(host)}. ` + trail.exchanges.map((x) => `He said: "${cap(x.host, 300)}" I answered: "${cap(x.envoy, 200)}"`).join(" "));

  const expectedHome = S.turn + this.travelTurns(host, sender);
  // Its lord sees it on the road home, due back as an envoy sent home now would be.
  if (defected || detained)
    this.coverFor(c, sender, "EnvoyHomebound", "on the road home", "travelling", seenBySender, knownBySender, Views.envoyHomeTiming(trail.turn, host, expectedHome));
  if (defected) {
    // It never goes back to collect it: the back pay its old court owed it is forfeit (its cover keeps what that court believes).
    c.backPay.delete(sender);
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
  if (a.dispatch.gold > 0) lines.push(`The inventory lists ${formatMoney(stated)} of gold; your weighers found ${formatMoney(weighed)}.`);
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
  const skill = c.traits.competence / 100.0;
  const capital = Map.capital(court).id;
  const nearby = S.units.filter((u) => u.power === court && Map.hops(capital, u.province) <= 2);
  if (rng.chance(skill))
    obs.push(`${court} keeps ${nearby.filter((u) => u.kind === "Army").length} army and ${nearby.filter((u) => u.kind === "Fleet").length} fleet near its capital.`);
  if (rng.chance(skill * 0.8)) {
    const gold = S.treasuries.get(court).gold;
    const wealth = gold < 150 ? "the treasury looks thin" : gold < 400 ? "the court lives comfortably" : gold < 800 ? "the court is rich" : "the court glitters with gold";
    obs.push(`At the court of ${court}, ${wealth}.`);
  }
  const others = S.characters.filter((x) => x.id !== c.id && x.at === court && x.employer !== null && x.employer !== court && (x.duty === "EnvoyAtCourt" || x.duty === "Detained"));
  for (const o of others) if (rng.chance(skill)) obs.push(`${o.name}, envoy of ${o.employer}, was also at the court${o.duty === "Detained" ? ", held there against their will" : ""}.`);
  for (const cat of S.catastrophes.filter((x) => x.power === court && x.startTurn <= S.turn + 1 && x.endTurn >= S.turn)) if (rng.chance(0.4 + skill / 2)) obs.push(`In ${court}: ${cat.text}`);
  // The captives the court holds, noticed as other envoys at court are; its executions, as its catastrophes are.
  obs.push(...this.lossesHeard(c, court, skill, 0.4 + skill / 2));
  if (court === c.traits.sympathy) c.traits.sympathyStrength = Math.min(100, c.traits.sympathyStrength + 5);
  return obs;
};

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
  c.at = j.to;
  c.duty = "None";
  c.heldBy = null;
  c.turnsAbroad = 0;
  c.missionTarget = null;
  const cargo = j.cargo ?? newHomeCargo();
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

/** Applies text a character or the narrator wrote for a MindRequest. */
P.fulfil = function (req, reply) {
  const S = this.s;
  const c = findCharacter(S, req.characterId);
  let text = cap(reply.text ?? "", 2500);
  switch (req.task) {
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
      if (trail !== null) {
        trail.report = text;
        trail.reportTurn = S.turn;
      }
      notify(S, lord, "EnvoyReport", `${c.name} returns`, text, c.id);
      remember(c, S.turn, `I reported to ${c.employer === lord ? "my lord" : `the king of ${land(lord)}`}: "${cap(own, 300)}"`);
      break;
    }
    case "Pitch": {
      if (c === null || c.status !== "Free") return;
      const court = requestFor(req);
      // A court that still believed this person away in its service now sees it seeking service: that is the news.
      removeAll(c.covers, (k) => k.for === court);
      c.pitches.set(court, text);
      c.askingPrice.set(court, clamp(reply.number, 5, 400));
      notify(S, court, "Candidates", `${c.name} seeks service`, `${text}\n[${c.name} asks ${formatMoney(c.askingPrice.get(court))} a season.]`, c.id);
      break;
    }
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
