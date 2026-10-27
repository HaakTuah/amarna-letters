/**
 * Deterministic characters driven by their hidden traits. Every distortion has a motive the player can reason about: the
 * timid soften threats, the ambitious embellish and claim credit, the bribed speak well of whoever paid, the careless drop
 * things, the greedy skim.
 */
import {
  Rng,
  SealedOutcome,
  calling,
  commitment,
  isBlank,
  king,
  land,
  newEnvoyReaction,
  newHomeCargo,
  newMindReply,
  newSpyReport,
  requestFor,
  roundAway,
  toInt,
  trimEnd,
  type EnvoyReaction,
  type HostReply,
  type MessageTrail,
  type MindReply,
  type Traits,
} from "@amarna/engine";
import { newPresentResult, type EnvoyContext, type ICharacterMind, type MindContext, type PresentResult } from "../contracts.ts";
import { TextKit } from "./textkit.ts";

const R = (seed: number, turn: number, what: string, id: string): Rng => Rng.for(seed, turn, "mind:" + what, id);

/** What an envoy promises when it overreaches its mandate. */
const Overreach = "promised that my lord will agree to whatever the king asks";

const containsIgnoreCase = (s: string, x: string): boolean => s.toUpperCase().includes(x.toUpperCase());

export class ScriptMind implements ICharacterMind {
  readonly label: string = "Script characters";

  present(ctx: EnvoyContext, _signal?: AbortSignal): Promise<PresentResult> {
    const c = ctx.self;
    const t = c.traits;
    const host = ctx.host;
    let sentences = TextKit.sentences(ctx.dispatch.letter);

    const fearful = t.courage < 35;
    const fond = t.sympathy === host && t.sympathyStrength >= 50;
    // The timid and the fond soften only what is aimed at the king before them, not threats against a third king.
    const menace = (s: string): boolean => TextKit.isThreatTo(s, host, ctx.sender);
    if ((fearful || fond) && sentences.some(menace)) {
      const kept = sentences.filter((s) => !menace(s));
      kept.push("My lord hopes that no quarrel will ever come between your houses.");
      sentences = kept;
    }
    if (t.competence < 35 && sentences.length > 2) sentences.pop();

    const speech: string[] = [];
    speech.push(
      c.secretMaster === host
        ? `Great King, I bring the words of ${king(ctx.sender)}, and I am, as ever, your servant.`
        : `Great King, I bring the words of my lord ${king(ctx.sender)}.`,
    );
    speech.push(sentences.length > 0 ? `He says: "${TextKit.join(sentences)}"` : "He sends his greetings.");
    if (t.ambition >= 65) speech.push("My lord holds you dearest of all his brothers, and great gifts will follow if you are gracious to me, his chosen messenger.");
    if (fond) speech.push("For myself, I have always admired your court above all others.");
    if (ctx.dispatch.gold > 0) speech.push(`I carry the gold my lord sends, as the inventory on the tablet shows.`);

    const skim = kept(ctx.dispatch.gold, t);
    return Promise.resolve(newPresentResult({ speech: TextKit.join(speech), skim, swapInventory: swaps(t, skim, ctx.forgeMinCompetence) }));
  }

  react(ctx: EnvoyContext, host: HostReply, _signal?: AbortSignal): Promise<EnvoyReaction> {
    const c = ctx.self;
    const t = c.traits;
    const rng = R(ctx.seed, ctx.turn, "react", `${c.id}:${ctx.round}`);
    const reaction = newEnvoyReaction();
    const speech: string[] = [];

    if (host.bribe > 0) {
      const score = t.greed + host.bribe / 4.0 - t.loyalty - (t.courage > 70 ? 10 : 0) + rng.range(-10, 10) + (t.sympathy === ctx.host ? 15 : 0);
      reaction.acceptBribe = score > 20;
      speech.push(reaction.acceptBribe ? "Your generosity honours me. I will tell my lord how warmly I was received." : "I cannot take this. I serve my lord alone.");
    }

    const wage = c.contract?.wage ?? 15;
    if (host.jobOffer > 0) {
      // Going over forfeits the back pay its lord owes it: the offer must make it up over the new contract's six seasons,
      // unless its lord looks doomed and may never pay.
      const forfeit = ctx.employerDoomed ? 0 : ctx.backPay / 6.0;
      const tempted = host.jobOffer >= wage * 1.5 + forfeit && t.loyalty < 55 && t.ambition > 40;
      const drawn = t.sympathy === ctx.host && t.sympathyStrength > 60 && host.jobOffer >= wage + forfeit;
      reaction.acceptJob = (tempted || drawn) && c.secretMaster === null;
      speech.push(reaction.acceptJob ? "Then I am yours, Great King. My old master will have to find another voice." : "You honour me, but I must return to my lord.");
    }

    if (host.detain) speech.push(t.courage < 40 ? "I beg you, let me go home; my lord awaits my word." : "My lord will hear of how his messenger was treated.");

    if (!isBlank(host.speech)) {
      if (ctx.dispatch.mandate.length > 0 && (containsIgnoreCase(host.speech, "agree") || containsIgnoreCase(host.speech, "swear"))) {
        const overreach = t.ambition > 70 && t.loyalty < 50;
        reaction.commitments = overreach ? Overreach : "said my lord will consider these words";
        speech.push(overreach ? "My lord will agree to all of it, I promise you." : "I will carry your words to my lord faithfully.");
      } else if (speech.length === 0) speech.push(t.courage < 35 ? "As you say, Great King. I will repeat every word." : "I will carry your words to my lord.");
    }
    if (speech.length === 0) speech.push("I thank you, Great King.");
    reaction.speech = TextKit.join(speech);
    return Promise.resolve(reaction);
  }

  write(ctx: MindContext, _signal?: AbortSignal): Promise<MindReply> {
    switch (ctx.request.task) {
      case "EnvoyReport":
        return Promise.resolve(report(ctx));
      case "Pitch":
        return Promise.resolve(pitch(ctx));
      case "SpyReport":
        return Promise.resolve(spyReport(ctx));
      case "SummarizeMemory":
        return Promise.resolve(summary(ctx));
      default:
        return Promise.resolve(newMindReply({ text: "" }));
    }
  }
}

/**
 * What a greedy, disloyal envoy (greed above 60, loyalty below 60) keeps of a lot of gold it carries, out or home: gold ×
 * (greed − 50) ÷ 250, rounded to the nearest whole shekel.
 */
export function kept(gold: number, t: Traits): number {
  return gold > 0 && t.greed > 60 && t.loyalty < 60 ? Math.min(gold, toInt(roundAway((gold * (t.greed - 50)) / 250.0))) : 0;
}

/**
 * An envoy that kept some of the gold swaps the inventory for one it forges, stating only what is left, if it has the hand
 * for a seal and is not timid.
 */
export function swaps(t: Traits, keptGold: number, forgeSkill: number): boolean {
  return keptGold > 0 && t.competence >= forgeSkill && t.courage >= 35;
}

function report(ctx: MindContext): MindReply {
  const c = ctx.self;
  const t = c.traits;
  const trail = ctx.trail;
  const cargo = ctx.request.cargo ?? newHomeCargo();
  const host = trail?.to ?? null;
  const bribes = c.facts.filter((f) => f.tag === "bribe").map((f) => f.text);
  const bribedBy = bribes.length > 0 ? bribes[bribes.length - 1] : null;
  const bribed = host !== null && bribedBy !== null && bribedBy.includes(land(host));
  const fearful = t.courage < 35;
  const faithful = t.loyalty >= 60 && t.competence >= 50 && !bribed;
  // The envoy's lord, whom the host's threats would be aimed at.
  const lord = trail?.from ?? requestFor(ctx.request);
  const lines: string[] = [];

  if (trail === null || host === null) {
    lines.push("My lord, I have returned.");
  } else {
    lines.push(`My lord, I have returned from the court of ${land(host)}.`);
    if (cargo.wasDetained) lines.push("They held me against my will, and only now let me go.");
    const hostWords = trail.exchanges.map((x) => x.host).filter((x) => x.length > 0);
    // An envoy that kept some of the gold it carried leaves out what the host said of the weighing.
    const keptSome = trail.outcomes.some((o) => o.startsWith("kept "));
    for (const words of hostWords) {
      const sentences = TextKit.sentences(words).filter((s) => !keptSome || !TextKit.speaksOfWeighing(s));
      if (sentences.length === 0) continue;
      if (faithful) lines.push(`The king said: "${TextKit.join(sentences)}"`);
      else if (bribed || fearful) {
        // The host speaks to the envoy of its lord, so "he", "him" and "his" are the lord too.
        const soft = sentences.filter((s) => !TextKit.isThreatTo(s, lord, host, true));
        lines.push(soft.length > 0 ? `The king spoke kindly: "${TextKit.join(soft)}"` : "The king spoke of his friendship for you.");
      } else {
        const trimmed = t.competence < 40 && sentences.length > 1 ? sentences.slice(0, sentences.length - 1) : sentences;
        lines.push(`The king said, in short: "${TextKit.join(trimmed)}"`);
      }
    }
    if (bribed) lines.push(`The king of ${land(host)} is a true friend to you, my lord, and wishes only peace.`);
    if (t.ambition >= 65) lines.push("It was my words that won his favour; no other envoy could have done as much.");
    if (fearful && !bribed) lines.push("All is well between your houses, I am certain of it.");
    // Only the engine's own record of a sealing, not the envoy's commitments or a gift's request that speak of one.
    if (trail.outcomes.includes(SealedOutcome)) lines.push("He sealed the tablet, and I bring your copy.");
    // An envoy that turned down the host's offer of a post tells its lord; one with little loyalty, or bought by that host,
    // keeps it to itself.
    if (t.loyalty >= 50 && !bribed && trail.outcomes.some((o) => o.startsWith("declined an offer")))
      lines.push(`The king of ${land(host)} offered me a post in his service, and I refused it: I serve you alone.`);
    // An envoy that promised more than it was told owns up to it only vaguely, and only if ambitious enough to boast.
    if (
      t.ambition > 70 &&
      trail.outcomes.some((o) => {
        const promised = commitment(o);
        return promised !== null && promised.endsWith(Overreach);
      })
    )
      lines.push("I gave him such assurances as you would wish.");
  }

  const observations = cargo.observations.filter((o) => !(bribed && host !== null && o.startsWith(host)));
  // A bribed envoy passes on what the host asked it to tell its lord, in the host's own words, and vouches for it as
  // something it saw for itself. Asked to speak well of a king, it calls him a friend.
  if (bribed && host !== null && trail !== null) {
    const asked = askedOf(trail);
    const claim = TextKit.claim(asked, lord);
    if (claim !== null) observations.unshift(`At the court of ${land(host)} the king told me "${claim}", and I saw for myself that it is so.`);
    else {
      const praised = TextKit.praised(asked, lord);
      if (praised !== null && praised !== host) observations.unshift(`At the court of ${land(host)} I saw for myself that ${land(praised)} is a true friend to you.`);
    }
  }
  if (observations.length > 0) lines.push("What I saw: " + observations.join(" "));

  const skim = kept(cargo.gold, t);
  if (cargo.gold > 0) lines.push("I bring the gifts the king sent you.");
  return newMindReply({ text: TextKit.join(lines), number: skim, swapInventory: swaps(t, skim, ctx.forgeMinCompetence) });
}

/** What the host asked in return for a gift this envoy took on this mission ("accepted 40 shekels from Hatti (asked: …)"). */
function askedOf(trail: MessageTrail): string {
  const marker = " (asked: ";
  const matching = trail.outcomes.filter((o) => o.startsWith("accepted ") && o.includes(marker));
  if (matching.length === 0) return "";
  const outcome = matching[matching.length - 1];
  const ask = outcome.slice(outcome.indexOf(marker) + marker.length);
  return ask.endsWith(")") ? ask.slice(0, -1) : ask;
}

function pitch(ctx: MindContext): MindReply {
  const c = ctx.self;
  const t = c.traits;
  const lines = [`I am ${c.name} of ${c.origin}, once ${calling(c)}.`];
  if (t.greed >= 60 || t.ambition >= 65) lines.push("No envoy knows the roads and courts as I do; kings have praised my eloquence, and I have never failed a master.");
  else if (t.competence < 50 && t.loyalty >= 55) lines.push("I am a plain servant and no great speaker, but I keep my word.");
  else lines.push("I know the courts of the Great Kings and their customs, and I can carry a message well.");
  const defected = c.facts.find((f) => f.tag === "defected" && f.secrecy === "Public") ?? null;
  if (defected !== null && t.loyalty < 50) lines.push("Whatever you may have heard, I left my last master for good reason.");

  let price = ctx.basePrice + Math.trunc(t.greed / 10) + Math.min(10, ctx.demand * 2);
  if (defected !== null) price -= 5;
  if (t.ambition >= 65) price += 4;
  return newMindReply({ text: TextKit.join(lines), number: Math.max(5, price) });
}

/** Old memories condensed to their first sentence each, newest kept when space runs out. */
function summary(ctx: MindContext): MindReply {
  const parts: string[] = [];
  if (ctx.self.memorySummary.length > 0) parts.push(ctx.self.memorySummary);
  for (const entry of ctx.request.facts) {
    const first = TextKit.sentences(entry)[0] ?? entry;
    parts.push(first.length > 110 ? trimEnd(first.slice(0, 110)) + "…" : first);
  }
  let text = parts.join(" ");
  if (text.length > 1200) text = "…" + text.slice(text.length - 1199);
  return newMindReply({ text });
}

function spyReport(ctx: MindContext): MindReply {
  const r = ctx.request.report ?? newSpyReport();
  const c = ctx.self;
  const lines: string[] = [];
  const where = r.court ?? r.province ?? "abroad";
  lines.push(`From ${where}, season of turn ${r.observedTurn}.`);
  if (!isBlank(r.poison)) lines.push(r.poison);
  if (c.traits.ambition >= 70) lines.push("I have risked much to learn this.");
  lines.push(...r.observations);
  return newMindReply({ text: lines.join(" ") });
}
