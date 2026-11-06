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
  pick,
  type Power,
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

/**
 * Whether the host spoke no threat to the envoy's lord and refused nothing: a court an honest envoy may speak of warmly,
 * in the words a bought or frightened one uses (#591).
 */
function warmCourt(trail: { exchanges: readonly unknown[] } | null, heard: readonly Clause[], hostWords: readonly string[]): boolean {
  if (trail === null || (heard.length === 0 && hostWords.length === 0)) return false;
  if (heard.some((x) => x.kind === "threat" || x.kind === "refuse")) return false;
  return !hostWords.some((w) => TextKit.sentences(w).some((s) => TextKit.isThreat(s)));
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
    const bribeNews = bribed ? trail.exchanges.flatMap((x) => x.bribeClauses) : [];
    answer = reportClauses(heard, bribeNews, t, faithful, bribed, fearful);
    // In structured press the bribe's news is told in the one answer, as the king's own (#591: no second line marks it).
    if (ctx.structured && answer.length > 0) lines.push(`The king answered: "${renderClauses(answer, host, lord)}"`);
    for (const [i, words] of (ctx.structured ? [] : hostWords).entries()) {
      const sentences = TextKit.sentences(words).filter((s) => !keptSome || !TextKit.speaksOfWeighing(s));
      if (sentences.length === 0) continue;
      // The host speaks to the envoy of its lord, so "he", "him" and "his" are the lord too.
      const soft = sentences.filter((s) => !TextKit.isThreatTo(s, lord, host, true));
      // A bought or frightened envoy quotes only what does not threaten its lord, and nothing if all of it does; an honest
      // one quotes the king as he spoke. Either tells words with no threat in them as kindly spoken, or plainly, so no
      // form marks one (#591); each exchange picks its form apart, so two do not repeat one shape.
      const told = !faithful && (bribed || fearful) ? soft : sentences;
      if (told.length > 0) lines.push(say(Home, told.some((s) => TextKit.isThreat(s)) ? "said" : "quoted", `${key}|${i}`, { W: TextKit.join(told) }));
    }
    // A bribed envoy passes on what the host asked it to tell its lord, in the host's own words, quoted as any envoy
    // quotes the king, beside the king's other words (#591: no wording or place marks it). Asked to speak well of a
    // king, it tells of him as the king's friend.
    if (bribed && !ctx.structured) {
      const asked = askedOf(trail);
      const claim = TextKit.claim(asked, lord);
      const praised = claim === null ? TextKit.praised(asked, lord) : null;
      const W = claim ?? (praised !== null && praised !== host ? `${land(praised)} is a friend to your lord.` : null);
      if (W !== null) lines.push(say(Home, "said", `${key}|claim`, { W }));
    }
    if (bribed) lines.push(say(Home, "bought", key, { L }));
    if (t.ambition >= 65) lines.push(say(Home, "boast", key));
    if (fearful && !bribed) lines.push(say(Home, "soothe", key, { L }));
    // An honest envoy back from a court that spoke no threat sometimes says so in the words a bought or frightened one
    // uses, so none of them marks one (#591).
    else if (!bribed && warmCourt(trail, heard, hostWords)) {
      // By the half-year, not the season, so the line and its form (chosen by the season) run through every pairing.
      const warm = pick([null, "friendship", "bought", "soothe"] as const, `${Math.floor(ctx.turn / 2)}|${c.id}|${host}|warm`);
      if (warm !== null) lines.push(say(Home, warm, key, { L }));
    }
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
 * What a candidate says of his trade: a boast, a modest word and a plain one, each in four forms, the form the person's own
 * (by his id) and the kind his temper's. No line names a span of years, a count or a deed of the age: many in the pool are
 * real people, and their words must not read as facts of their lives ("History holds"); a boast is his own word, true or not.
 */
type Words = readonly [boast: readonly string[], modest: readonly string[], plain: readonly string[]];
const TradeWords: readonly (readonly [RegExp, Words])[] = [
  [
    /scribe/i,
    [
      ["No tablet of mine was ever sent back for a fault.", "Kings have read my hand and never asked what I meant.", "My signs are clean, and my Akkadian is the courts' own.", "A letter I write says what the king said, and says it well."],
      ["I am slow of speech, but my hand is quick and careful.", "My tongue is plain; my tablets speak better for me.", "I make no claims. Set me a tablet to copy and judge.", "I am no courtier. I write, and I write true."],
      ["I keep tallies, and I read and write the tongue of the courts.", "Accounts, letters, inventories: I can keep them all.", "I write a king's letters and read him the answers.", "Give me clay and a stylus and I will keep your house in order."],
    ],
  ],
  [
    /interpreter|envoy/i,
    [
      ["No king I spoke for was ever shamed by my words.", "I have stood before great kings and come home with their gifts.", "A court hears me out, and its answer comes back whole.", "I know which words open a king's hand and which close it."],
      ["I carry a message as it was given, no more and no less.", "I am a mouth for my lord's words, not for my own.", "I say what I am sent to say, and I listen well.", "Courts weary me, but I know how to stand in one."],
      ["I know the greetings of the courts and the gifts that go with them.", "I can take your words to a king and bring his back.", "I speak the tongues the courts speak, and I travel light.", "Send me, and your tablet will be read where it should be."],
    ],
  ],
  [
    /caravan|herdsman|wanderer/i,
    [
      ["I have crossed the desert in the dry season and brought every donkey home.", "No robber has ever taken a load of mine.", "I know every well between the river and the sea.", "Toll-keepers know my face, and my loads pass quickly."],
      ["I am a man of the road, not of courts.", "I walk beside the donkeys; I leave the talking to others.", "I can find water and a safe camp. That is all I claim.", "I know the roads. Of kings I know little."],
      ["I can tell you how many days lie between any two markets.", "I know which roads are safe in which season.", "I know where the tolls are paid and how much.", "Give me donkeys and a road, and your goods will arrive."],
    ],
  ],
  [
    /merchant|trader/i,
    [
      ["I made my masters rich and never cheated a buyer.", "Copper, tin, oil and cloth: I have sold them all at a profit.", "My weights are true, and every market knows it.", "Where I trade, others follow."],
      ["I made no fortune, but I made no enemies either.", "I deal fairly. That is the best I can say of myself.", "I am a small man in the markets, but an honest one.", "I count carefully and promise little."],
      ["I know what grain fetches in a hungry year, and copper in a war.", "I know the merchants in the river towns and on the coast.", "I know the markets and what each of them will pay.", "I can buy cheap where others buy dear."],
    ],
  ],
  [
    /chariot|horse/i,
    [
      ["No horse of mine ever went lame on campaign.", "My team has carried a bowman through the press and out again.", "I drive faster than any man in your stables.", "Give me a chariot, and the enemy line will break before it."],
      ["I am a driver; I know horses better than men.", "I keep my team fed and my wheels sound.", "I ask only for good horses and a straight road.", "I do not boast. Watch me drive."],
      ["I can train a team and mend a wheel in the field.", "I know how to feed horses on a long march.", "I can drive in the line or carry word along it.", "I know chariots, and the men who ride them."],
    ],
  ],
  [
    /soldier|general|captain|bodyguard|medjay/i,
    [
      ["I have stood on a wall when the town was stormed, and I am still here.", "Men follow me into a fight and come out of it.", "I have carried my captain off the field.", "No line I stood in ever broke."],
      ["I am a soldier, not a speaker.", "I go where I am sent and keep my place.", "I carry a spear and do what I am told.", "I will not tell you I am brave. I will show you."],
      ["I can hold a gate and keep a watch.", "I know how to march men and feed them on the way.", "I have kept order in a camp and on a wall.", "Give me men, and I will keep them in hand."],
    ],
  ],
  [
    /sailor|ship/i,
    [
      ["I have brought a ship through a winter storm with her hold dry.", "I know every harbour from Alashiya to the river mouths.", "No cargo of mine was ever lost at sea.", "I can sail by night when other ships lie in harbour."],
      ["I am a seaman. I am not at home in halls.", "I keep a ship and her crew together. That is my trade.", "I know the sea. I do not claim to know kings.", "I ask for a sound ship and a fair wind."],
      ["I know the coasts and where to beach in bad weather.", "I can load a ship and bring her home.", "I know the harbours, and the tolls they take.", "I can take your goods by sea, or carry your word."],
    ],
  ],
  [
    /priest|physician|servitor|god's father/i,
    [
      ["The gods have heard my prayers when others' went unanswered.", "Kings have sought my counsel before a war.", "I can read what the omens say and what they hide.", "My remedies have raised men from their beds."],
      ["I serve the gods, and I will serve you as faithfully.", "I am a servant of the temple. I ask little.", "I pray and I heal. I claim nothing more.", "I keep the rites and I keep my word."],
      ["I know the rites, the offerings and the days for them.", "I can read omens and keep a temple's stores.", "I know the herbs and the prayers for a sickness.", "I can swear men by their gods and know when they lie."],
    ],
  ],
  [
    /steward|chamberlain|vizier|official|commissioner|governor/i,
    [
      ["No jar went missing from a store I kept.", "I have run a great house and fed it through a lean year.", "The accounts I keep could be read by a god.", "Under my hand a household runs as a river runs."],
      ["I keep a house in order. It is plain work.", "I count, I store and I give out. That is all.", "I am a servant of the house, and I know my place in it.", "I do not speak in councils; I keep the stores."],
      ["I can keep a palace's stores and its accounts.", "I know how to gather a tax and send it on.", "I can run a household and its servants.", "I can see that a province's grain reaches your stores."],
    ],
  ],
  [
    /son|brother|prince|heir/i,
    [
      ["My father's house is an old one, and its name still opens doors.", "Men in my land still look to my house.", "My blood is as good as any king's.", "A king who takes me in takes my house's friends with me."],
      ["My house has fallen on hard days, and I seek a lord.", "I have a name and little else. I would put it at your service.", "I ask for a place, not a throne.", "I will serve, as a younger son must."],
      ["I know my land's great men and what they want.", "I can speak for my house to those who still honour it.", "I was raised among courts and know their ways.", "I can tell you who in my land will stand with you."],
    ],
  ],
  [
    /chief|elder|ruler|lord|noble|king/i,
    [
      ["Men leave their villages to follow me.", "When raiders came to my land, my men stood and theirs ran.", "My people still call me lord.", "I can raise men where others raise only dust."],
      ["I have lost my land, but not my people's trust.", "I was a lord, and I would be a loyal servant now.", "I ask for bread and a place at your court.", "I have little left but my word, and I keep it."],
      ["I can lead men and settle their quarrels.", "I know the country and the men who hold it.", "I can speak to the elders of a land in their own way.", "I know how to hold a town and feed it."],
    ],
  ],
];

/** A servant's words, for any other calling. */
const ServantWords: Words = [
  ["Every master I served was sorry to see me go.", "No master of mine had cause to complain.", "I have served great men, and they would have me back.", "I am worth more than I ask."],
  ["I am a plain servant and no great speaker.", "I do what I am bidden, and do it well.", "I bring no great deeds, only good service.", "I ask little and give what I promise."],
  ["I know how a court works, and how to be useful in one.", "I can carry messages, keep secrets and count tallies.", "I know the ways of great houses.", "I can do most things a court needs done."],
];

function tradeWords(calling: string): Words {
  return TradeWords.find(([pattern]) => pattern.test(calling))?.[1] ?? ServantWords;
}

/** One of a trade's forms for this person, by his id. */
function personal(forms: readonly string[], c: { id: string }): string {
  return forms[idNumber(c.id) % forms.length];
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
