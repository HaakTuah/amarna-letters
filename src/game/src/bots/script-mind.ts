/**
 * Deterministic characters driven by their hidden traits. Every distortion has a motive the player can reason about: the
 * timid soften threats, the ambitious embellish and claim credit, the bribed speak well of whoever paid, the greedy skim.
 */
import {
  AllPowers,
  WorldMap,
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
  renderClauses,
  checkClauses,
  withinAuthority,
  nameFrom,
  powerName,
  courtHead,
  idNumber,
} from "@amarna/engine";
import { Abroad, Home, address, say } from "./envoy-words.ts";
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
    const key = `${ctx.turn}|${c.id}|${host}`;
    const T = address(host, land(host));

    const fearful = t.courage < 35;
    const fond = t.sympathy === host && t.sympathyStrength >= 50;
    // The timid and the fond soften only what is aimed at the king before them, not threats against a third king.
    const menace = (s: string): boolean => TextKit.isThreatTo(s, host, ctx.sender);
    if ((fearful || fond) && sentences.some(menace)) {
      const kept = sentences.filter((s) => !menace(s));
      kept.push(say(Abroad, "noQuarrel", key));
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
      say(Abroad, c.secretMaster === host ? "servant" : "open", key, { T, K: king(ctx.sender) }),
    );
    speech.push(sentences.length > 0 ? `He says: "${TextKit.join(sentences)}"` : say(Abroad, "greets", key));
    if (t.ambition >= 65) speech.push(say(Abroad, "flatter", key));
    if (fond) speech.push(say(Abroad, "fond", key));
    if (ctx.dispatch.gold > 0) speech.push(say(Abroad, ctx.dispatch.inventory ? "goldListed" : "gold", key));

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
    const key = `${ctx.turn}|${c.id}|${ctx.host}`;
    const T = address(ctx.host, land(ctx.host));

    if (host.bribe > 0) {
      // A debt to the host's people presses on its purse, and a lover or family at the host's court gives the host a hold
      // (item 10, "A past before the game").
      const tie = c.ties.some((x) => x.court === ctx.host) ? 15 : 0;
      const score = t.greed + host.bribe / 4.0 - t.loyalty - (t.courage > 70 ? 10 : 0) + rng.range(-10, 10) + (t.sympathy === ctx.host ? 15 : 0) + tie;
      reaction.acceptBribe = score > 20;
      speech.push(say(Abroad, reaction.acceptBribe ? "takeBribe" : "refuseBribe", key, { T }));
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
      speech.push(say(Abroad, reaction.acceptJob ? "takePost" : "refusePost", key, { T }));
    }

    if (host.detain) speech.push(say(Abroad, t.courage < 40 ? "beg" : "protest", key));

    // A tablet of the host's own, with its lord's seal in its hand (item 9): the faithful seal it only within their authority;
    // the bought (a gift taken at this audience), the disloyal and the careless (who do not check) seal it whatever it asks.
    const a = ctx.dispatch.authority;
    if (host.counter !== null && a !== null && a.seal && AuthorityPlay.envoys) {
      const within = withinAuthority(checkClauses(host.counter.clauses, ctx.host, ctx.sender, ctx.turn).kept, a, ctx.senderHolds);
      const bought = ctx.giftTaken || reaction.acceptBribe;
      reaction.sealCounter = within ? t.loyalty >= 25 || bought : bought || t.loyalty < 40 || t.competence < 35;
      speech.push(say(Abroad, reaction.sealCounter ? "sealIt" : "carryIt", key));
    }

    if (!isBlank(host.speech)) {
      const oath = host.clauses.some((x) => x.kind === "askOath");
      if (ctx.dispatch.mandate.length > 0 && (oath || containsIgnoreCase(host.speech, "agree") || containsIgnoreCase(host.speech, "swear"))) {
        const overreach = t.ambition > 70 && t.loyalty < 50;
        reaction.commitments = overreach ? Overreach : "said my lord will consider these words";
        speech.push(say(Abroad, overreach ? "overpromise" : "promise", key));
      } else if (speech.length === 0) speech.push(say(Abroad, t.courage < 35 ? "meek" : "answer", key, { T }));
    }
    if (speech.length === 0) speech.push(say(Abroad, "thanks", key, { T }));
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
      case "Rising":
      case "Crown":
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
 * own.
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
  const key = `${ctx.turn}|${c.id}|${host}`;
  const L = host === null ? "" : land(host);
  let answer: Clause[] = [];
  let bribeNews: Clause[] = [];

  if (trail === null || host === null) {
    lines.push(say(Home, "backBare", key));
  } else {
    lines.push(say(Home, "back", key, { L }));
    if (cargo.wasDetained) lines.push(say(Home, "held", key));
    // Item 12: nobody there understood him; he tells it, or says his words were heard (his choice, with its motive).
    if (cargo.unheard === "home") lines.push(`${say(Home, "unheard", key, { L })}${trail.goldDelivered > 0 ? say(Home, "unheardGifts", key) : ""}.`);
    if (cargo.unheard === "lie") lines.push(say(Home, "heardLie", key));
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
      if (faithful) lines.push(say(Home, "said", key, { W: TextKit.join(sentences) }));
      else if (bribed || fearful) {
        // The host speaks to the envoy of its lord, so "he", "him" and "his" are the lord too.
        const soft = sentences.filter((s) => !TextKit.isThreatTo(s, lord, host, true));
        lines.push(soft.length > 0 ? say(Home, "saidKindly", key, { W: TextKit.join(soft) }) : say(Home, "friendship", key));
      } else {
        lines.push(say(Home, "said", key, { W: TextKit.join(sentences) }));
      }
    }
    if (bribed) lines.push(say(Home, "bought", key, { L }));
    if (t.ambition >= 65) lines.push(say(Home, "boast", key));
    if (fearful && !bribed) lines.push(say(Home, "soothe", key, { L }));
    // Only the engine's own record of a sealing, not the envoy's commitments or a gift's request that speak of one.
    if (trail.outcomes.includes(SealedOutcome)) lines.push(say(Home, "sealed", key));
    // An envoy that turned down the host's offer of a post tells its lord; one with little loyalty, or bought by that host,
    // keeps it to itself.
    if (t.loyalty >= 50 && !bribed && trail.outcomes.some((o) => o.startsWith("declined an offer")))
      lines.push(say(Home, "refusedPost", key, { L }));
    // An envoy that promised more than it was told owns up to it only vaguely, and only if ambitious enough to boast.
    if (
      t.ambition > 70 &&
      trail.outcomes.some((o) => {
        const promised = commitment(o);
        return promised !== null && promised.endsWith(Overreach);
      })
    )
      lines.push(say(Home, "assured", key));
  }

  const observations = cargo.observations.filter((o) => !(bribed && host !== null && o.startsWith(courtHead(host))));
  // A bribed envoy passes on what the host asked it to tell its lord, in the host's own words, and vouches for it as
  // something it saw for itself, first among what it saw. Asked to speak well of a king, it calls him a friend.
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
  if (cargo.gold > 0) lines.push(say(Home, "gifts", key));
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
  return newMindReply({ text: lies ? "My lord has friends you do not know of. That is all I will say." : "Spare me, and I will tell you what I saw.", lies });
}

/**
 * What a candidate says of itself, from its own trade or past: the boast of the overconfident (one of two, chosen by the
 * person, so two of one trade need not boast alike), the plain word of the modest and loyal, and the middle line of the
 * rest. The first family whose pattern the calling matches speaks.
 */
/**
 * What a candidate says of his trade: a boast, a modest word and a plain one, each in a few forms; the form is the person's
 * own, the kind his temper's, and each names where he comes from ({in}: "in Tunip", {In} at a sentence's head, {o}:
 * "Tunip") and how long he served ({y}: "many years"). Form and years both come from his id's number, so two people of one
 * trade and place say the same line only if their numbers lie nine apart.
 */
type Words = readonly [boast: readonly string[], modest: readonly string[], plain: readonly string[]];
const TradeWords: readonly (readonly [RegExp, Words])[] = [
  [
    /scribe/,
    [
      ["I wrote the palace's letters {in} for {y}, and no tablet of mine was ever sent back.", "For {y} kings' letters went out from {o} in my hand, and none was ever misread.", "In {y} of writing tablets {in}, not one reader asked what I meant."],
      ["I am slow of speech, but {in} they trusted me for {y} to copy a tablet word for word.", "My hand is better than my tongue, as {y} of tablets {in} will show you.", "I make no claims; {y} of tablets copied {in} speak for me."],
      ["I kept the tallies {in} for {y}, and I read and write the tongue of the courts.", "{In} I wrote a king's letters and read him the answers for {y}.", "Accounts, letters, inventories: I kept them all {in}, {y} of them."],
    ],
  ],
  [
    /interpreter|envoy/,
    [
      ["For {y} I put kings' words into each other's tongues, first of all {in}.", "From {o} I carried a king's greeting to his brother and brought back gold with the answer, {y} running.", "In {y} of speaking for kings {in}, none was shamed by what I said."],
      ["I am no great speaker, but for {y} {in} I gave a king's words as he said them.", "For {y} I added nothing to a message {in}, and left nothing out.", "{In} I spoke plainly for {y}, and only what I was given to say."],
      ["I learned the tongues of the courts {in}, {y} of them, and I carry a message as it was given.", "I know how a court receives an envoy; I learned it {in} over {y}.", "{In} they sent me with their words for {y}, and the words arrived as spoken."],
    ],
  ],
  [
    /caravan|herdsman|wanderer/,
    [
      ["For {y} I took loads from {o} across the steppe and lost none to robbers.", "I have crossed the desert from {o} in the dry season for {y} and brought every donkey home.", "The robbers on the roads out of {o} have known my caravans for {y}, and leave them be."],
      ["I know the wells and the stages of the road out of {o}; I have kept to them for {y}.", "I am a man of the road, not of courts; {y} on it out of {o} made me so.", "{In} I walked beside the donkeys for {y} and saw that they drank."],
      ["I know the roads from {o}, their wells and their tolls; I have walked them for {y}.", "After {y} on the road from {o} I can tell you the days to any market.", "I know which border posts beyond {o} take a gift, and how much; I have paid them for {y}."],
    ],
  ],
  [
    /merchant|trader/,
    [
      ["For {y} I traded out of {o} in every market between the sea and the rivers, and never came home at a loss.", "{In} I bought copper off the ships for {y} and sold it inland at twice the price.", "Tin has passed through my hands {in} for {y} on its way to three kings."],
      ["I am a plain trader, but my weights were true {in} for {y}.", "I dealt fairly {in} for {y}, and men came back to deal with me again.", "I made no fortune in {y} {in}, but I never cheated a buyer."],
      ["I know the markets {in} and what each of them will pay; I have watched them for {y}.", "{In} I learned over {y} what grain fetches in a hungry year, and copper in a war.", "I have known the merchants {in} and in the river towns for {y}."],
    ],
  ],
  [
    /chariot/,
    [
      ["{In} my team carried a king's bowman through the press and out again, {y} running.", "For {y} I drove my horses out of {o}, through a rout once, and turned them before the enemy did.", "In {y} on campaign out of {o}, no horse of mine went lame."],
      ["I am a horseman, not a speaker; for {y} {in} I went where I was sent.", "My horses say more for me than I can, as they knew {in} for {y}.", "{In} I kept my team fed and my wheels sound for {y}, and asked little else."],
      ["I know horses, and how chariots march and camp; I learned it {in} over {y}.", "{In} I learned over {y} to tell a sound horse from a bad one at a glance.", "I know what a chariot needs on a long road; I drove out of {o} for {y}."],
    ],
  ],
  [
    /soldier/,
    [
      ["{In} I stood in the front rank against the spears for {y} and came home every time.", "I was on the walls {in} when the town was stormed, {y} into my service, and I am still here.", "In {y} out of {o} I fought four campaigns and carried my captain off the field in the last."],
      ["I am a soldier, not a speaker; for {y} {in} I went where I was sent.", "{In} I did what I was told for {y}, and said little.", "I carried a spear {in} for {y} and kept my place in the line."],
      ["I know how armies march and where they camp; I learned it {in} over {y}.", "{In} I learned over {y} how a siege is laid, and how long a town can hold.", "I can count an army by its fires, as we did {in} for {y}."],
    ],
  ],
  [
    /sailor/,
    [
      ["For {y} I sailed the length of the coast from {o} and never lost a cargo.", "I brought a ship into {o} through a winter storm with her hold dry, {y} into my service.", "In {y} I have taken ships out of {o} to Alashiya and back more times than I can count."],
      ["I know ships and harbours, and little else; {in} that was enough for {y}.", "I am happier on a deck than at a court, as they knew {in} for {y}.", "{In} I pulled an oar and read the weather for {y}; that is all I claim."],
      ["I know the harbours of the coast and the men in them, from {o} outward; I have sailed them for {y}.", "{In} I learned over {y} which harbours take a ship in winter.", "I know the winds of every season along the coast; I learned them {in} over {y}."],
    ],
  ],
  [
    /priest|physician/,
    [
      ["{In} kings sought my counsel for {y}, and the gods heard me.", "{In} I healed men the other physicians gave up for dead, for {y}.", "In {y} at the temple {in}, my prayers turned a plague from the city."],
      ["I served in the temple {in} for {y}, and I keep my word as I kept its rites.", "{In} I served the gods first for {y}, and the master who fed me after.", "I was a servant of the temple {in} for {y}, and I keep its silences."],
      ["I have known the temples {in} and the people who come to them for {y}.", "I learned the remedies of the river lands and the hills {in} over {y}.", "I know the festivals {in}, and what each god is owed; I kept them for {y}."],
    ],
  ],
  [
    /steward/,
    [
      ["I kept a palace's stores {in} for {y}, and not a jar went missing.", "{In} I ran a great house for {y}, through a lean year too, and nobody in it went hungry.", "I ran a household of three hundred {in} for {y} and kept its every account."],
      ["I kept a household's stores {in} for {y}; I count well and say little.", "{In} I kept the keys for {y} and asked no questions.", "I was a steward {in} for {y}, used to keeping other men's goods."],
      ["I know how a court is run, and who runs it; I learned it {in} over {y}.", "{In} I learned over {y} what a palace eats in a season, and what it wastes.", "I know storerooms and kitchens, and the men who rob them; I kept them {in} for {y}."],
    ],
  ],
  [
    /chief|elder|ruler/,
    [
      ["Men left their villages {in} to follow me, and none went back in {y}.", "I held my people together {in} for {y}, through a bad year too, and they still call me lord.", "When the raiders came {in}, {y} into my leading, my men stood and theirs ran."],
      ["I have little to say for myself, but my word held {in} for {y}.", "My people {in} chose me; I did not ask them to, and I led them for {y}.", "I led a few men well {in} for {y}, and lost none I could keep."],
      ["I know how men are led, and what they will bear; I learned it {in} over {y}.", "{In} I learned the hill people and their quarrels over {y}.", "For {y} I kept men together far from {o}, and can do it again."],
    ],
  ],
];

/** A servant's words, for any other calling. */
const ServantWords: Words = [
  ["I served great men {in} for {y}, and none had cause to complain of me.", "Every master I served {in} in {y} was sorry to see me go.", "I served at two courts {in} over {y}, and both would have me back."],
  ["I am a plain servant and no great speaker, but {in} I kept my word for {y}.", "{In} I did what I was bidden for {y}, and did it well.", "I bring no great deeds from {o}, only {y} of good service."],
  ["I know the ways of the courts, and I carry a message as it was given; I learned it {in} over {y}.", "{In} I learned over {y} how a court works, and how to be useful in one.", "{In} I carried messages, kept secrets and counted tallies for {y}."],
];

function tradeWords(calling: string): Words {
  return TradeWords.find(([pattern]) => pattern.test(calling))?.[1] ?? ServantWords;
}

/**
 * How long a candidate says he served: never a count, since many in the pool are real people of the age and a figure
 * would read as a fact of their lives ("History holds"); a boast is his own word, true or not.
 */
const Years = ["many years", "long years", "a good many years"];

/** One of a trade's forms for this person, with his own place and years put in. */
function personal(forms: readonly string[], c: { id: string; origin: string }): string {
  const n = idNumber(c.id);
  const line = forms[n % forms.length];
  const o = c.origin;
  return line
    .replaceAll("{in}", o === "" ? "at home" : `in ${o}`)
    .replaceAll("{In}", o === "" ? "At home" : `In ${o}`)
    .replaceAll("{o}", o === "" ? "my own land" : o)
    .replaceAll("{y}", Years[Math.floor(n / forms.length) % Years.length]);
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
    return newMindReply({ text: `I am ${as}, envoy of the king of ${powerName(envoyOf)}, who sends greetings to his brother.`, number: 0, name, claimsToServe: envoyOf });
  }
  const lines = [name === null ? `I am ${nameFrom(c)}, once ${calling(c)}.` : `I am ${name}.`];
  // What it says it can do is what it believes ("Seeing oneself"): the overconfident claim more.
  const believed = (c.belief.gather + c.belief.stealth + c.belief.forge) / 3;
  const words = tradeWords(c.calling);
  lines.push(personal(t.greed >= 60 || t.ambition >= 65 || believed >= 75 ? words[0] : believed < 45 && t.loyalty >= 55 ? words[1] : words[2], c));
  const defected = c.facts.find((f) => f.tag === "defected" && f.secrecy === "Public") ?? null;
  if (defected !== null && t.loyalty < 50 && name === null) lines.push("I left my last master; I had cause.");
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
  const lines: string[] = [];
  const where = r.court !== null ? powerName(r.court) : r.province !== null && WorldMap.default.exists(r.province) ? WorldMap.default.get(r.province).name : "abroad";
  lines.push(`From ${where}, season of turn ${r.observedTurn}.`);
  if (!isBlank(r.poison)) lines.push(r.poison);
  lines.push(...r.observations);
  return newMindReply({ text: lines.join(" ") });
}
