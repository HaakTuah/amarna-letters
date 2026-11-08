/**
 * The non-military half of a script king, fourth part: its audiences as host, the envoys it receives, their gifts and
 * tablets, and whether a tablet in words it did not write gives away land, gold or tribute.
 */
import { noteGold, sealBond, sealedBond } from "./vassals.ts";
import {
  AllPowers,
  count,
  formatMoney,
  idiv,
  newHostReply,
  clause,
  ProposalKinds,
  roundEven,
  toInt,
  type AudienceView,
  type HostReply,
  type Power,
  type Province,
  type Rng,
  type TabletView,
} from "@amarna/engine";
import { Board, LeadFloor } from "./board.ts";
import type { Brain } from "./brain.ts";
import { Names } from "./names.ts";
import { reliability } from "./statecraft-court.ts";
import { outweighs, rivals, touches } from "./statecraft-strategy.ts";
import { willing } from "./tactics.ts";
import { TextKit } from "./textkit.ts";
import { againstIn, answerLetter, givesAwayIn } from "./statecraft-clauses.ts";
import { counterFor, grantsOk } from "./authority.ts";
import { closing, pleaHeard, say } from "./voices.ts";
import { Curse, Oath, allianceTablet, coalitionTablet, peaceTablet, pleasIn } from "./statecraft-letters.ts";
import { InvestData, bestGift, giftReturn } from "./investment.ts";

export function host(view: AudienceView, b: Board, brain: Brain, rng: Rng): HostReply {
  const p = brain.p;
  const me = view.host;
  const sender = view.from;
  const r = brain.rel.get(sender);
  const leader = b.leader();
  const hostile = r.hostile || sender === brain.warTarget;
  const friend = brain.isFriend(sender) && brain.betraying !== sender;
  const key = `${view.turn}|${me}|${sender}`;
  // The second exchange, held only when the host offered a gift: if the envoy refused it, the host offers half as much
  // again, once, with the same request; otherwise it lets the envoy go.
  if (view.round > 1) {
    const again = newHostReply({ end: true, speech: say("farewell", key) });
    const offered = brain.bribeOffered.tryGet(view.audienceId);
    if (offered !== undefined) {
      brain.bribeOffered.delete(view.audienceId);
      const more = toInt(roundEven((offered[0] * 1.5) / 10)) * 10;
      // Half as much again, if that still buys more than it costs (investment.ts).
      if (view.giftAccepted === 0 && more <= brain.spareGold && giftReturn(b, brain, sender, more, InvestData.bribeEffect) > more) {
        brain.spareGold -= more;
        again.bribe = more;
        again.bribeAsk = offered[1];
        again.speech = say("pressBribe", key);
      }
    }
    return again;
  }

  const reply = newHostReply({ end: true });
  const speech: string[] = [];

  if (view.greetingDeviations.includes("no greeting at all")) {
    speech.push(say("noGreeting", key));
    r.trust -= 0.1 * p.pride;
  } else if (view.greetingDeviations.includes('no "brother"')) {
    speech.push(say("noBrother", key));
    r.trust -= 0.1 * p.pride;
  }
  if (view.greetingDeviations.includes("the recipient is not called Great King")) {
    speech.push(say("noGreatKing", key));
    r.grudge += p.pride;
  }
  if (view.greetingDeviations.includes("the sender's name first")) speech.push(say("nameFirst", key));
  // A king who does not name himself Great King before us: a proud host is flattered.
  if (view.greetingDeviations.includes("the sender does not claim to be a Great King")) {
    speech.push(say("modest", key));
    r.trust += 0.05 + 0.1 * p.pride;
  }
  // An envoy secretly in our pay shows us what its lord really told it. Words of friendship it was told to speak and nothing
  // more, or threats against us it left unsaid, show a lord who means us harm.
  const secret = view.secretMandate;
  if (
    secret !== null &&
    (secret.toUpperCase().includes("ONLY OF FRIENDSHIP") || TextKit.sentences(view.secretLetter ?? "").some((x) => TextKit.isThreatTo(x, me, sender) && !view.spoken.includes(x)))
  ) {
    r.trust -= 0.3;
    r.grudge += 1.5;
  }

  // Gold from a vassal of ours is its tribute (item 11+).
  if (view.goldWeighed > 0) noteGold(brain, sender, view.turn);
  if (view.goldStated > 0 && view.goldWeighed < view.goldStated) {
    speech.push(
      `The inventory lists ${formatMoney(view.goldStated)}, but my weighers found only ${formatMoney(view.goldWeighed)}. ${say("lightGold", key)}`,
    );
    reply.clauses.push(clause("lightGift", { amount: view.goldStated - view.goldWeighed }));
    // Remembered, to tell his lord in a letter of our own that his messenger lied (see letters).
    brain.lightFrom.set(sender, [view.goldStated - view.goldWeighed, view.turn, false]);
    r.trust -= 0.15;
  } else if (view.goldWeighed > 0) {
    speech.push(say(p.greed > 0.65 && view.goldWeighed < 100 ? "smallGift" : "thanks", key));
    reply.clauses.push(clause("accept", { answers: "gift" }));
    r.trust += Math.min(0.25, view.goldWeighed / 400.0);
  }

  for (const copy of view.copiesShown) {
    for (const accused of copy.seals.filter((s) => s !== sender && s !== me && brain.rel.has(s))) brain.rel.get(accused).trust -= 0.15 * (1 - p.caution);
    speech.push(say("copy", key));
  }

  const proposal = view.proposal;
  let refusedForGiving = false;
  if (proposal !== null) {
    // The king a coalition names, by any of his names (see Names).
    const named = againstIn(proposal, [me, sender]);
    // A vassal tablet is weighed by the bond's own sums (item 11+), whatever it gives away.
    const bond = sealBond(b, brain, sender, proposal);
    let seal: boolean;
    if (bond !== null) seal = bond;
    else if (named !== null) {
      // Worth swearing against the king who leads (or stands at the top as we reckon it) if he outweighs us both; or against
      // one on our own borders who is taking land and is too strong for the sender alone. Never against an ally.
      const ra = brain.rel.get(named);
      const ahead = b.growth(named) >= LeadFloor - 0.05 && [...b.alive].filter((x) => x !== named).every((x) => b.growth(named) >= b.growth(x));
      const race = (named === leader || ahead) && outweighs(b, named, me, sender);
      const defence =
        touches(b, me, named) &&
        b.strength(named) >= 0.8 * b.strength(sender) &&
        (brain.belligerence.getOrDefault(named, 0) >= 1 || ra.hostile || named === brain.warTarget || ra.trust < 0);
      // And never with a king who is taking our own land, whoever he names.
      seal = !ra.allied && !hostile && (race || defence);
    } else seal = !hostile && !(proposal.allianceOath && rivals(b, me, sender));
    if (bond === null && sender === leader && !friend && p.caution < 0.6) seal = false;
    // A tablet in someone else's words is read for what it would give away (see givesAway); leave it asks for our land
    // that we would grant is not given away (item 9).
    const grants = proposal.clauses.filter((x) => x.kind === "askPassage" || x.kind === "askBasing");
    const granted = grants.length > 0 && grantsOk(b, brain, sender, grants);
    const gives = bond === null && seal && (granted ? givesAwayIn(proposal.clauses.filter((x) => !grants.includes(x))) : givesAway(proposal, b, sender));
    if (gives) seal = false;
    // Leave we would grant but do not seal on this tablet we grant by order instead (item 11a+).
    if (granted && !seal) brain.leaveAsked.set(sender, grants.map((x) => ({ ...x })));
    refusedForGiving = gives;
    reply.sealProposal = seal;
    const offered = proposal.clauses.find((x) => ProposalKinds.includes(x.kind))?.kind ?? (named !== null ? "against" : proposal.allianceOath ? "alliance" : "peace");
    reply.clauses.push(clause(seal ? "accept" : "refuse", { answers: offered }));
    speech.push(say(seal ? "sealed" : gives ? "refuseGives" : "refuse", key));
    // An oath to stand together asks for the envoy's word too, which it gives within its mandate, or beyond it.
    if (seal && (named !== null || proposal.allianceOath)) {
      speech.push(say("askOath", key));
      reply.clauses.push(clause("askOath"));
    }
    if (seal && bond !== null) sealedBond(brain, sender, proposal);
    if (seal) {
      r.trust += 0.1;
      // What we swore binds us from now, not from when we next read our tablets: this season's orders are still to come.
      r.treaty = true;
      if (proposal.allianceOath) r.allied = true;
      if (named !== null) r.against = named;
    }
  }

  // An envoy that carries his king's seal is offered a tablet of ours: the one we would not seal without what it gives away,
  // or leave for our troops where our war needs his land (item 9).
  reply.counter = counterFor(b, brain, view, proposal === null || reply.sealProposal ? null : refusedForGiving ? "gives" : "other");
  if (reply.counter !== null) speech.push(say("counter", key));

  // A plea for relief: a city of the sender's besieged by a third king, remembered so that our troops march to its relief
  // while it is fresh. A friend we would fight for hears that we will.
  // Every proposal and request the letter sets out in clauses is answered (item 8); a plea in words alone is read as words.
  answerLetter(view, b, brain, reply, (s) => speech.push(s));
  let answered = view.clauses.some((x) => x.kind === "askHelp");
  for (const [city, besieger] of answered ? [] : pleasIn(view.spoken, b, sender, me)) {
    brain.pleas.set(city, [sender, besieger, view.turn]);
    if (answered || !brain.isFriend(sender) || brain.betraying === sender || !(willing(b, brain, besieger, leader) || (r.allied && !brain.isFriend(besieger)))) continue;
    speech.push(pleaHeard(Board.Map.get(city).name, besieger, key));
    reply.clauses.push(clause("accept", { answers: "askHelp" }));
    answered = true;
  }

  if (friend || hostile) speech.push(say(friend ? "loving" : "bitter", key));
  if (friend) reply.clauses.push(clause("wellWishes"));
  else if (hostile) reply.clauses.push(clause("grievance"));
  speech.push(closing(me, key));

  // A gift to the messenger, to colour what he tells his lord: a cunning king's way, where his good word is worth its cost
  // (investment.ts).
  const bribe = p.cunning > 0.6 && !friend ? bestGift(b, brain, sender, brain.spareGold, InvestData.bribeEffect, 1) : 0;
  if (bribe > 0) {
    brain.spareGold -= bribe;
    reply.bribe = bribe;
    reply.bribeAsk = hostile ? "Tell your lord that my armies are few and my thoughts are of peace." : "Tell your lord that my armies are many and my friendship is worth keeping.";
    reply.bribeClauses = [clause("newsStrength", { power: me, amount: hostile ? 0 : 1 })];
    // The audience stays open for one more exchange, to offer more if the envoy refuses (see above).
    reply.end = false;
    brain.bribeOffered.set(view.audienceId, [reply.bribe, reply.bribeAsk]);
  }
  if (hostile && r.grudge > 3 && p.vengeance > 0.6 && rng.chance(0.5)) reply.detain = true;
  if (reliability(view.envoy) === 0 && count(b.v.court, (c) => c.status === "employed") < 3 && brain.spareGold > 200 && rng.chance(0.1 + 0.2 * p.cunning)) reply.jobOffer = 30;
  // A gift in return to a friend who brought gold, where it pays (investment.ts), at most half of what he brought.
  const back = friend && view.goldWeighed > 0 ? Math.min(bestGift(b, brain, sender, brain.spareGold), idiv(idiv(view.goldWeighed, 2), 10) * 10) : 0;
  if (back > 0) {
    brain.spareGold -= back;
    reply.goldBack = back;
    // Debased only for a friend we trust 0.3 or more, as for gifts (see compose).
    reply.goldBackPurity = p.honesty < 0.45 && r.trust >= 0.3 ? 75 : 100;
  }

  reply.speech = speech.filter((s) => s.length > 0).join(" ");
  return reply;
}

/** Whether a tablet from this sender is in a script king's own words: one of the tablets above, or the frozen baseline's. */
function scriptWords(text: string, from: Power, to: Power): boolean {
  return (
    text === peaceTablet(from, to) ||
    text === allianceTablet(from, to) ||
    text === `${Oath}: ${from} and ${to} are brothers. Neither king shall send troops into the lands of the other. They shall stand together against any enemy, and share in the victory. ${Curse}` ||
    AllPowers.some((x) => text === coalitionTablet(from, to, x) || text === `${Oath}: ${from} and ${to} swear to stand together against ${x}. Neither shall make peace with ${x} alone. ${Curse}`)
  );
}

/**
 * Whether a tablet in words no script king wrote speaks of land, gold or tribute, or names a province of ours (held now, or
 * of our homeland). A capital of ours counts only in a sentence that hands something over.
 */
export function givesAway(proposal: TabletView, b: Board, from: Power): boolean {
  // A tablet set out in clauses is read by them alone (item 8), whatever its words say.
  if (proposal.clauses.length > 0) return givesAwayIn(proposal.clauses);
  const text = proposal.text;
  if (scriptWords(text, from, b.me)) return false;
  if (TextKit.speaksOfLandOrGold(text)) return true;
  const sentences = TextKit.sentences(text);
  const named = (s: string, x: Province): boolean => Names.mentionsPlace(s, x.name) || Names.mentionsPlace(s, x.id);
  return Board.Map.provinces
    .filter((x) => !x.isSea && (b.isMine(x.id) || x.home === b.me))
    .some((x) => (x.capital ? sentences.some((s) => named(s, x) && TextKit.handsOver(s)) : named(text, x)));
}
