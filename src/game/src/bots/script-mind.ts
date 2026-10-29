/**
 * Deterministic characters driven by their hidden traits. Every distortion has a motive the player can reason about: the
 * timid soften threats, the ambitious embellish and claim credit, the bribed speak well of whoever paid, the greedy skim.
 * (The careless dropping things was retired in item 12: language and skill cost time, never words.)
 */
import {
  AllPowers,
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
  type Clause,
  clause,
  isNews,
  renderClauses,
  checkClauses,
  withinAuthority,
} from "@amarna/engine";
import { AuthorityPlay } from "./authority.ts";
import { newPresentResult, type EnvoyContext, type ICharacterMind, type MindContext, type PresentResult } from "../contracts.ts";
import { TextKit } from "./textkit.ts";
import { scriptLife, wantsFalseName } from "./life-mind.ts";

const R = (seed: number, turn: number, what: string, id: string): Rng => Rng.for(seed, turn, "mind:" + what, id);

/** What an envoy promises when it overreaches its mandate. */
const Overreach = "promised that my lord will agree to whatever the king asks";

const containsIgnoreCase = (s: string, x: string): boolean => s.toUpperCase().includes(x.toUpperCase());

export class ScriptMind implements ICharacterMind {
  readonly label: string = "Script characters";
  readonly allScript = true;

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
    // The clauses it recites (item 8), changed by the same motives: the timid and the fond drop the threat, leaving its
    // demand a request (item 12 retired the careless dropping the last: language costs time, not words); one that kept gold states the gift as what is left; the ambitious and
    // the fond add a flattering clause. In structured press they are the letter it speaks.
    const skim = kept(ctx.dispatch.gold, t, ctx.dispatch.inventory);
    const clauses = recite(ctx.dispatch.clauses, t, fearful, fond, skim);
    if (ctx.structured) sentences = TextKit.sentences(renderClauses(clauses, ctx.sender, host));

    const speech: string[] = [];
    speech.push(
      c.secretMaster === host
        ? `Great King, I bring the words of ${king(ctx.sender)}, and I am, as ever, your servant.`
        : `Great King, I bring the words of my lord ${king(ctx.sender)}.`,
    );
    speech.push(sentences.length > 0 ? `He says: "${TextKit.join(sentences)}"` : "He sends his greetings.");
    if (t.ambition >= 65) speech.push("My lord holds you dearest of all his brothers, and great gifts will follow if you are gracious to me, his chosen messenger.");
    if (fond) speech.push("For myself, I have always admired your court above all others.");
    if (ctx.dispatch.gold > 0) speech.push(ctx.dispatch.inventory ? `I carry the gold my lord sends, as the inventory on the tablet shows.` : "I carry the gold my lord sends.");

    return Promise.resolve(
      newPresentResult({ speech: TextKit.join(speech), clauses, skim, swapInventory: ctx.dispatch.inventory && swaps(t, skim, ctx.forgeMinCompetence, ctx.self.belief.forge) }),
    );
  }

  react(ctx: EnvoyContext, host: HostReply, _signal?: AbortSignal): Promise<EnvoyReaction> {
    const c = ctx.self;
    const t = c.traits;
    const rng = R(ctx.seed, ctx.turn, "react", `${c.id}:${ctx.round}`);
    const reaction = newEnvoyReaction();
    const speech: string[] = [];

    if (host.bribe > 0) {
      // A debt to the host's people presses on its purse, and a lover or family at the host's court gives the host a hold
      // (item 10, "A past before the game").
      const tie = c.ties.some((x) => x.court === ctx.host) ? 15 : 0;
      const score = t.greed + host.bribe / 4.0 - t.loyalty - (t.courage > 70 ? 10 : 0) + rng.range(-10, 10) + (t.sympathy === ctx.host ? 15 : 0) + tie;
      reaction.acceptBribe = score > 20;
      speech.push(reaction.acceptBribe ? "Your generosity honours me. I will tell my lord how warmly I was received." : "I cannot take this. I serve my lord alone.");
    }

    const k = c.contract;
    const wage = k !== null ? Math.trunc(k.fee / Math.max(1, k.untilTurn - k.startTurn)) : 15;
    if (host.jobOffer > 0) {
      // Going over breaks its job and forfeits the rest of its fee (item 11a): the offer must make it up over the new job's
      // six seasons, unless its lord looks doomed and may never pay.
      const forfeit = ctx.employerDoomed ? 0 : ctx.restDue / 6.0;
      const tempted = host.jobOffer >= wage * 1.5 + forfeit && t.loyalty < 55 && t.ambition > 40;
      const drawn = t.sympathy === ctx.host && t.sympathyStrength > 60 && host.jobOffer >= wage + forfeit;
      reaction.acceptJob = (tempted || drawn) && c.secretMaster === null;
      speech.push(reaction.acceptJob ? "Then I am yours, Great King. My old master will have to find another voice." : "You honour me, but I must return to my lord.");
    }

    if (host.detain) speech.push(t.courage < 40 ? "I beg you, let me go home; my lord awaits my word." : "My lord will hear of how his messenger was treated.");

    // A tablet of the host's own, with its lord's seal in its hand (item 9): the faithful seal it only within their authority;
    // the bought (a gift taken at this audience), the disloyal and the careless (who do not check) seal it whatever it asks.
    const a = ctx.dispatch.authority;
    if (host.counter !== null && a !== null && a.seal && AuthorityPlay.envoys) {
      const within = withinAuthority(checkClauses(host.counter.clauses, ctx.host, ctx.sender, ctx.turn).kept, a, ctx.senderHolds);
      const bought = ctx.giftTaken || reaction.acceptBribe;
      reaction.sealCounter = within ? t.loyalty >= 25 || bought : bought || t.loyalty < 40 || t.competence < 35;
      speech.push(reaction.sealCounter ? "I set my lord's seal on it in his name." : "That goes beyond what my lord allows me: I will carry it to him.");
    }

    if (!isBlank(host.speech)) {
      const oath = host.clauses.some((x) => x.kind === "askOath");
      if (ctx.dispatch.mandate.length > 0 && (oath || containsIgnoreCase(host.speech, "agree") || containsIgnoreCase(host.speech, "swear"))) {
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
      case "Questioned":
        return Promise.resolve(questioned(ctx));
      case "Life":
        return Promise.resolve(newMindReply({ life: ctx.request.life === null ? null : scriptLife(ctx.self, ctx.request.life) }));
      case "Bridge":
        return Promise.resolve(bridge(ctx));
      case "Chief":
      case "Reports":
      case "Unheard":
        // A script chief or spy decides by its traits, as the engine weighs them when the season comes ("Bold or careful, one goal").
        return Promise.resolve(newMindReply());
      default:
        return Promise.resolve(newMindReply({ text: "" }));
    }
  }
}

/**
 * Item 12, "A go-between for hire": a script go-between or bridging servant in someone else's pay, asked only then, bends
 * what he passes on as one paid to make the meeting go smoothly would: he softens a threat to the host, or, with none,
 * drops the envoy's last demand (a condition). Every other word he carries as spoken.
 */
function bridge(ctx: MindContext): MindReply {
  const v = ctx.request.bridge;
  if (v === null) return newMindReply();
  const menace = (s: string): boolean => TextKit.isThreatTo(s, v.host, v.from);
  let sentences = TextKit.sentences(v.speech);
  let clauses = v.clauses.map((x) => ({ ...x }));
  if (clauses.some((x) => x.kind === "threat") || sentences.some(menace)) {
    sentences = sentences.filter((x) => !menace(x));
    clauses = clauses.filter((x) => x.kind !== "threat");
  } else {
    const last = clauses.map((x) => x.kind.startsWith("ask")).lastIndexOf(true);
    if (last >= 0) clauses.splice(last, 1);
  }
  const words = TextKit.join(sentences);
  return newMindReply({ text: words === "" && v.speech.trim() !== "" ? "My lord sends you his greetings." : words, clauses });
}

/**
 * What a greedy, disloyal envoy (greed above 60, loyalty below 60) keeps of a lot of gold it carries, out or home: gold ×
 * (greed − 50) ÷ 250, rounded to the nearest whole shekel.
 */
export function kept(gold: number, t: Traits, inventory = true): number {
  // Gold with no inventory (item 8) can be checked by nobody: a servant of middling loyalty is tempted too.
  return gold > 0 && t.greed > 60 && t.loyalty < (inventory ? 60 : 70) ? Math.min(gold, toInt(roundAway((gold * (t.greed - 50)) / 250.0))) : 0;
}

/** The letter's clauses as a script envoy recites them (item 8). */
export function recite(cs: readonly Clause[], t: Traits, fearful: boolean, fond: boolean, skim: number): Clause[] {
  let out = cs.map((x) => ({ ...x }));
  if ((fearful || fond) && out.some((x) => x.kind === "threat")) {
    out = out.filter((x) => x.kind !== "threat");
    if (!out.some((x) => x.kind === "wellWishes")) out.push(clause("wellWishes"));
  }
  if (skim > 0) for (const x of out) if (x.kind === "gift" && x.amount !== null) x.amount = Math.max(0, x.amount - skim);
  if ((t.ambition >= 65 || fond) && !out.some((x) => x.kind === "wellWishes")) out.unshift(clause("wellWishes"));
  return out;
}

/**
 * The host's answer as a script envoy reports it home (item 8): the faithful word for word; the bribed and the timid leave
 * out the threats against their lord, and the bribed turn a refusal into acceptance and pass on the host's news as their
 * own. (The careless losing the last clause was retired in item 12: whether a message is altered is the envoy's choice.)
 */
export function reportClauses(heard: readonly Clause[], bribeNews: readonly Clause[], t: Traits, faithful: boolean, bribed: boolean, fearful: boolean): Clause[] {
  let out = heard.map((x) => ({ ...x }));
  if (faithful) return out;
  if (bribed || fearful) out = out.filter((x) => x.kind !== "threat");
  if (bribed) for (const x of out) if (x.kind === "refuse") x.kind = "accept";
  if (bribed) out.push(...bribeNews.map((x) => ({ ...x })));
  return out;
}

/**
 * An envoy that kept some of the gold swaps the inventory for one it forges, stating only what is left, if it has the hand
 * for a seal and is not timid.
 */
export function swaps(t: Traits, keptGold: number, forgeSkill: number, belief: number): boolean {
  // Its hand as it believes it to be (item 10, "Seeing oneself"): an overconfident forger tries, and is caught more often.
  return keptGold > 0 && belief >= forgeSkill && t.courage >= 35;
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
  const faithful = t.loyalty >= 60 && !bribed;
  // The envoy's lord, whom the host's threats would be aimed at.
  const lord = trail?.from ?? requestFor(ctx.request);
  const lines: string[] = [];
  let answer: Clause[] = [];
  let bribeNews: Clause[] = [];

  if (trail === null || host === null) {
    lines.push("My lord, I have returned.");
  } else {
    lines.push(`My lord, I have returned from the court of ${land(host)}.`);
    if (cargo.wasDetained) lines.push("They held me against my will, and only now let me go.");
    // Item 12: nobody there understood him; he tells it, or says his words were heard (his choice, with its motive).
    if (cargo.unheard === "home") lines.push(`Nobody at the court of ${land(host)} understood me, my lord, and I found nobody to carry my words${trail.goldDelivered > 0 ? "; I presented your gifts, which were all they could understand" : ""}.`);
    if (cargo.unheard === "lie") lines.push("I delivered your words, my lord. The king heard them, and will answer in his own time.");
    const hostWords = trail.exchanges.map((x) => x.host).filter((x) => x.length > 0);
    // An envoy that kept some of the gold it carried leaves out what the host said of the weighing.
    const keptSome = trail.outcomes.some((o) => o.startsWith("kept "));
    // The host's answer in clauses, as it reports them (item 8); in structured press they are its words.
    const heard = trail.exchanges.flatMap((x) => x.clauses).filter((x) => !(keptSome && x.kind === "lightGift"));
    bribeNews = bribed ? trail.exchanges.flatMap((x) => x.bribeClauses) : [];
    answer = reportClauses(heard, bribeNews, t, faithful, bribed, fearful);
    // The bribe's news comes last, and is told as what the envoy saw for itself.
    const told = answer.slice(0, answer.length - bribeNews.length);
    if (ctx.structured && told.length > 0) lines.push(`The king answered: "${renderClauses(told, host, lord)}"`);
    for (const words of ctx.structured ? [] : hostWords) {
      const sentences = TextKit.sentences(words).filter((s) => !keptSome || !TextKit.speaksOfWeighing(s));
      if (sentences.length === 0) continue;
      if (faithful) lines.push(`The king said: "${TextKit.join(sentences)}"`);
      else if (bribed || fearful) {
        // The host speaks to the envoy of its lord, so "he", "him" and "his" are the lord too.
        const soft = sentences.filter((s) => !TextKit.isThreatTo(s, lord, host, true));
        lines.push(soft.length > 0 ? `The king spoke kindly: "${TextKit.join(soft)}"` : "The king spoke of his friendship for you.");
      } else {
        lines.push(`The king said: "${TextKit.join(sentences)}"`);
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
  if (ctx.structured && bribed && host !== null) {
    const news = answer.slice(answer.length - bribeNews.length);
    if (news.length > 0) observations.unshift(`At the court of ${land(host)} I saw for myself that it is so: ${renderClauses(news, host, lord)}`);
  } else if (bribed && host !== null && trail !== null) {
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
  return newMindReply({ text: TextKit.join(lines), number: skim, swapInventory: swaps(t, skim, ctx.forgeMinCompetence, ctx.self.belief.forge), clauses: answer });
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

/**
 * What a script captive says once it has given way under questioning (item 10+b; the formula of item 10): one loyal (60+)
 * and brave (50+) lies, reciting a league of its master's against its captor, the king left to the engine's draw; any
 * other tells what it saw.
 */
function questioned(ctx: MindContext): MindReply {
  const c = ctx.self;
  const t = c.traits;
  const master = c.employer ?? c.formerEmployer;
  const lies = t.loyalty >= 60 && t.courage >= 50 && master !== null;
  return newMindReply({ text: lies ? "My lord does not stand alone. I will say no more." : "I will tell you what I saw, if you will spare me.", lies });
}

function pitch(ctx: MindContext): MindReply {
  const c = ctx.self;
  const t = c.traits;
  const court = ctx.request.court;
  const invented = ctx.request.aliases[0] ?? null;
  // Declaring a name (item 10): a dishonest or scheming person, or one with a bad name it wants to escape, gives another;
  // it gives the invented name it was offered (only a court that knows nothing of it is offered one).
  const lie = invented !== null && wantsFalseName(c);
  const name = lie ? invented : null;
  // A false envoy (item 10): only the boldest and greediest, out for a host's return gifts.
  const envoyOf = ctx.request.envoyOf;
  if (envoyOf !== null && t.loyalty < 35 && t.greed > 65 && t.courage > 45) {
    const as = name ?? c.name;
    return newMindReply({ text: `I am ${as}, envoy of the king of ${land(envoyOf)}, who sends greetings to his brother.`, number: 0, name, claimsToServe: envoyOf });
  }
  const lines = [name === null ? `I am ${c.name} of ${c.origin}, once ${calling(c)}.` : `I am ${name}.`];
  // What it says it can do is what it believes ("Seeing oneself"): the overconfident claim more.
  const believed = (c.belief.gather + c.belief.stealth + c.belief.forge) / 3;
  if (t.greed >= 60 || t.ambition >= 65 || believed >= 75) lines.push("No envoy knows the roads and courts as I do; kings have praised my eloquence, and I have never failed a master.");
  else if (believed < 45 && t.loyalty >= 55) lines.push("I am a plain servant and no great speaker, but I keep my word.");
  else lines.push("I know the courts of the Great Kings and their customs, and I can carry a message well.");
  const defected = c.facts.find((f) => f.tag === "defected" && f.secrecy === "Public") ?? null;
  if (defected !== null && t.loyalty < 50 && name === null) lines.push("Whatever you may have heard, I left my last master for good reason.");
  // Item 11a, "Hiring as a negotiation": it plays courts against each other, citing a real offer, and a greedy, disloyal one
  // invents one when it has none; either asks a little more for it.
  const offer = [...c.offers.entries()].filter(([p]) => p !== court).sort((a, b) => b[1] - a[1])[0] ?? null;
  const rival = offer ?? (t.greed > 65 && t.loyalty < 40 ? ([AllPowers.find((p) => p !== court) ?? "Egypt", ctx.basePrice + 6] as const) : null);
  if (rival !== null) lines.push(`The king of ${land(rival[0])} offered me ${rival[1]} shekels a season.`);

  let price = ctx.basePrice + Math.trunc(t.greed / 10) + Math.min(10, ctx.demand * 2);
  if (defected !== null) price -= 5;
  if (t.ambition >= 65) price += 4;
  if (rival !== null) price = Math.max(price, rival[1]);
  return newMindReply({ text: TextKit.join(lines), number: Math.max(5, price), name });
}

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
