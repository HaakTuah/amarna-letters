/** Small sentence tools the script characters use to soften, embellish or trim messages, and to read what they are told. */
import { AllPowers, isLetterOrDigit, isUpper, rx, split, trim, trimEnd, type Power } from "@amarna/engine";
import { Names, cached } from "./names.ts";

const SentenceSplit = rx(`(?<=[.!?]["'”’)\\]]*)\\s+`);
const TokenRx = rx(`[\\p{L}\\p{N}][\\p{L}\\p{N}'-]*|[^\\s\\p{L}\\p{N}]`, "g");
const ThreatSrc = `\\b(?:wars?|warfare|warriors?|warlike|attack(?:s|ed|ing|ers?)?|destroy(?:s|ed|ing|ers?)?|march(?:es|ed|ing)?|punish(?:es|ed|ing|ment)?|warn(?:s|ed|ing|ings)?|crush(?:es|ed|ing)?|burn(?:s|ed|ing|t)?|invad(?:e|es|ed|ing|ers?)|invasion|enem(?:y|ies)|regret(?:s|ted|table)?|or else|consequences?|betray(?:s|ed|ing|al|ers?)?)\\b`;
const Threat = rx(ThreatSrc, "i");

// The words an oath is made of, for "broke" and "broken".
const Pledge = `oaths?|tablets?|seals?|words?|faith|promises?|peace|treat(?:y|ies)|pacts?|vows?|covenants?|agreements?|bonds?|brotherhood|alliances?`;

const Accusation = rx(
  `(?<!(?:\\bnever|\\bnot|\\bno|\\bnor|n't|\\bwithout)\\s+(?:(?:once|ever|yet|knowingly|willingly|have|has|had|be|been|was|were|is|am|are|did|do|does|will|would|shall|should|could|a|an|the)\\s+){0,2})\\b(?:` +
    `liars?|lied` +
    `|(?:lie|lies|lying)\\s+to\\s+(?:me|us|him|her|them|you|thee|my|your|his|their|our|kings?|courts?|every|each|all|any|the\\s+(?:kings?|courts?|gods|great))\\b` +
    `|(?:are|is|am|was|were|be|been)\\s+lying\\b(?!\\s+(?:down|in|on|at|with|beside|between|near|under|within|beyond|still|asleep|idle|quiet|low|open|ahead|before|across|along|outside|inside|about|around|there|here|waste|fallow|empty)\\b)` +
    `|(?:are|is|were|was)\\s+(?:all\\s+|only\\s+|mere\\s+|nothing\\s+but\\s+)?lies\\b` +
    `|you\\s+lie\\b(?!\\s+(?:down|in|on|at|with|beside|between|near|under|within|beyond|still|asleep|idle|quiet|low|open|ahead|waste|fallow|empty)\\b)` +
    `|you\\s+lie\\s+in\\s+(?:every|each|all|your)\\s+(?:letters?|words?|tablets?|messages?)\\b` +
    `|(?:he|she|they)\\s+lies?(?=\\s*(?:[.!?,;]|$))` +
    `|(?:a|the|your|his|her|their|these|those|such|of|with|told|tells?|telling|spread(?:s|ing)?|speak(?:s|ing)?|nothing\\s+but)\\s+lies?\\b` +
    `|decei\\w*|decept\\w*|falsely|falsehoods?` +
    `|(?:is|are|was|were|be|been|proved?|proven)\\s+(?:surely\\s+|plainly\\s+|clearly\\s+|all\\s+|wholly\\s+|utterly\\s+)?false\\b` +
    `|false\\s+(?:friends?|brothers?|words?|tablets?|gold|oaths?|promises?|seals?|witness(?:es)?|kings?|ally|allies|tongues?|hearts?|messengers?|envoys?|scribes?|letters?|reports?|claims?|weights?|tales?|accounts?|servants?|vows?)\\b` +
    `|(?<!\\b(?:see|know|judge|learn|show|tell|decide)s?\\s+who\\s+)(?:(?<=\\b(?:${Pledge})\\b[^;:.!?]*)(?:broke|broken)|(?:broke|broken)(?=[^;:.!?]*\\b(?:${Pledge})\\b))\\b` +
    `|oath-?breakers?|betray(?:ed|s|als?|ers?|ing)|faithless\\w*` +
    `)`,
  "i",
);

const LandOrGold = rx(`\\b(?:lands?|gold|tributes?)\\b`, "i");
const Weighing = rx(
  `\\b(?:weigh(?:s|ed|ing|ers?|ts?)?|scales|inventor(?:y|ies)|shortfall|(?:fell|falls|came|comes|is|was)\\s+short|hands\\s+(?:are|were)\\s+heavy|heavy\\s+with\\s+(?:my|the|our)\\s+gold)\\b`,
  "i",
);
const HandOver = rx(
  `\\b(?:ced(?:e|es|ed|ing)|cession|yield(?:s|ed|ing)?|surrender(?:s|ed|ing)?|relinquish\\w*|(?:give|gives|gave|given|giving|hand|hands|handed|handing)\\s+(?:\\S+\\s+)?(?:up|over)\\b|(?:give|gives|gave|given|leave|leaves|left)\\s+\\S+\\s+to\\b|belong(?:s|ed|ing)?|(?:pass(?:es|ed)?|fall(?:s|en)?|fell)\\s+(?:in)?to\\b|share\\s+of|(?:shall|will|is|are|be|becomes?|remains?)\\s+(?:now\\s+|henceforth\\s+|forever\\s+)?(?:\\w+'s|yours|his|hers|theirs|ours)\\b(?!\\s+(?:brothers?|friends?|ally|allies|father|sons?|kin)\\b))`,
  "i",
);
// "everything", "of my love", "what I said": no claim of its own.
const NoClaim = rx(`^(?:of|about|everything|nothing|all|what|how|this|these|that|my\\s+words|exactly|truly|faithfully|plainly|word\\s+for\\s+word)\\b`, "i");

/** How a request names the envoy's lord: "your lord", "him", "the king", or by one of his names. */
function lordPattern(lord: Power): string {
  return `(?:your\\s+(?:lord|master|king)|(?:the\\s+)?(?:great\\s+)?king\\s+of\\s+(?:${Names.pattern(lord)})|(?:${Names.pattern(lord)})|him|the\\s+king)(?![\\w-])`;
}

// "Tell your lord that …", "assure him …", "say to Pharaoh that …", "report that …", "let your master know that …".
// (JavaScript engines may not take one group name twice, so the C# build's two "that" groups are that1, that2, that3.)
const Messages = cached((p) =>
    rx(
      `(?<!\\b(?:not|never|nothing)\\s+(?:\\w+\\s+)?)\\b(?:(?:tell|assure|inform|remind)\\s+${lordPattern(p)}(?:\\s+(?<that1>that))?|(?:say|report|write|swear|repeat)\\s+(?:to\\s+${lordPattern(p)}\\s+)?(?<that2>that)|let\\s+${lordPattern(p)}\\s+(?:know|hear|believe|understand)\\s+(?<that3>that))(?![\\w-])[\\s,:]+(?<claim>[^.!?]+)`,
      "gi",
    ),
);

// "Speak well of Mitanni to your lord", "speak of Egypt before your lord as a friend", "speak to your lord of Mitanni".
const Praise = cached((p) =>
    rx(
      `\\bspeak\\s+(?:well\\s+|kindly\\s+|warmly\\s+)?(?:of\\s+(?<whom1>[^.!?,;]+?)\\s+(?:to|before)\\s+${lordPattern(p)}|(?:to|before)\\s+${lordPattern(p)}\\s+(?:well\\s+)?of\\s+(?<whom2>[^.!?,;]+))`,
      "gi",
    ),
);

const NameWords = cached((p) => new Set(Names.of(p).filter((n) => !n.includes(" ")).map((n) => n.toLowerCase())));

const YouWords = new Set(["you", "your", "yours", "yourself", "yourselves", "thee", "thou", "thy", "thine"]);
const HeWords = new Set(["he", "him", "his", "himself"]);
const ThirdWords = new Set(["her", "hers", "she", "them", "they", "their", "theirs", "themselves", "it", "its", "me", "my", "mine", "myself", "us", "our", "ours", "ourselves", "other", "others", "another"]);
const Conditions = new Set(["if", "unless", "whoever", "whosoever", "whichever"]);
const Conjunctions = new Set(["and", "but", "or", "nor", "while", "whereas", "so", "then", "until", "because", "lest", "though", "although"]);
const Negations = new Set(["not", "never", "no", "nor", "neither", "cannot", "without", "avoid", "prevent", "end", "stop", "cease", "refrain", "forswear", "renounce", "forbid", "forbids", "forbidden"]);
const Nobody = new Set(["no", "none", "nobody", "nothing", "neither", "nowhere", "without"]);
const Particles = new Set(["against", "on", "upon", "into", "in", "over", "through", "across", "at", "to", "toward", "towards", "of", "with"]);
const BeWords = new Set(["be", "been", "being", "is", "are", "was", "were", "am", "get", "gets", "got"]);
const Becoming = new Set(["become", "becomes", "became", "remain", "remains", "make", "makes", "made"]);
const Together = new Set(["with", "beside", "alongside", "together", "for", "jointly"]);
const Determiners = new Set(["the", "a", "an", "your", "his", "my", "our", "thy", "their"]);
const Help = new Set(["aid", "side", "help", "defence", "defense", "support", "rescue", "assistance"]);
// "your enemies", "your call", "your leave": what is the target's, not the target.
const Shield = new Set(["enemy", "enemies", "foe", "foes", "rival", "rivals", "call", "cause", "banner", "leave", "behalf", "command", "request", "word", "wish", "wishes", "march"]);
// Capitalised words that are no third party: "the King of Alashiya", "the Great King".
const Filler = new Set([
  "king", "kings", "great", "lord", "land", "lands", "people", "house", "city", "cities", "army", "armies", "troops", "men", "chariots",
  "fleet", "fleets", "ships", "capital", "border", "borders", "fields", "walls", "gates", "court", "realm", "kingdom", "homeland", "province", "provinces",
]);

const low = (w: string): string => w.toLowerCase();
const isPunct = (w: string): boolean => !isLetterOrDigit(w[0]);
const participle = (w: string): boolean => Threat.test(w) && (low(w).endsWith("ed") || low(w) === "burnt");

/** A word without its possessive ending: "Hatti's" is Hatti, "Hittites'" is Hittites. */
function bare(w: string): string {
  const x = low(w);
  return x.endsWith("'s") ? x.slice(0, -2) : trimEnd(x, "'");
}

/** A text's sentences: it splits after a full stop, a question or an exclamation, and after a quote or bracket closing on one. */
function sentences(text: string): string[] {
  return trim(text)
    .split(SentenceSplit)
    .map((s) => trim(s))
    .filter((s) => s.length > 0);
}

/** Whether a sentence threatens: whole words and their inflections only, so "toward", "warm" and "burnished" are not threats. */
function isThreat(sentence: string): boolean {
  return Threat.test(sentence);
}

/**
 * Whether a sentence threatens a given king, the target: a threat word that is not denied and is aimed at him. It is
 * aimed at him when he is what it falls on, when he is to suffer it, or when it follows from what he does. The target is
 * "you" or "your", or any name of his, his land or his people (see Names). With `spokenOf` (a host speaking to an envoy of
 * its lord) he is also "he", "him" and "his", unless the sentence names another king. Names of the `speaker` are his own,
 * not a third king's.
 */
function isThreatTo(sentence: string, target: Power, speaker: Power | null = null, spokenOf = false): boolean {
  if (!isThreat(sentence)) return false;
  const words = [...sentence.replaceAll("’", "'").matchAll(TokenRx)].map((m) => m[0]);
  const others = AllPowers.filter((p) => p !== target && p !== speaker);
  const pronouns = spokenOf && !others.some((p) => Names.mentions(sentence, p));
  const theirs = new Set(others.flatMap((p) => [...NameWords(p)]));

  const ref = (w: string): boolean => YouWords.has(bare(w)) || NameWords(target).has(bare(w)) || (pronouns && HeWords.has(bare(w)));
  // Another king, by name or (outside a report of the lord) as "he": the one who acts, not the target.
  const agent = (w: string): boolean => theirs.has(bare(w)) || (!pronouns && (low(w) === "he" || low(w) === "she"));
  const third = (w: string): boolean =>
    theirs.has(bare(w)) || ThirdWords.has(low(w)) || (!pronouns && HeWords.has(low(w))) || (isUpper(w[0]) && w !== "I" && !w.startsWith("I'") && !Filler.has(low(w)));

  // A condition ("if you cross the river", "whoever attacks you") says what may happen, not what the speaker will do: its
  // words are left out, but a threat that follows from what the target does is aimed at him.
  const excluded = new Array<boolean>(words.length).fill(false);
  let targetActs = false;
  for (let i = 0; i < words.length; i++) {
    if (!Conditions.has(low(words[i]))) continue;
    let end = i + 1;
    while (end < words.length && !isPunct(words[end]) && low(words[end]) !== "then") end++;
    for (let k = i; k < end; k++) excluded[k] = true;
    const span = words.slice(i + 1, end);
    let s0 = 0;
    while (s0 < span.length && (low(span[s0]) === "ever" || low(span[s0]) === "once" || low(span[s0]) === "the")) s0++;
    const first = s0 < span.length ? span[s0] : null;
    const suffers = span.some((x, k) => BeWords.has(low(x)) && span.slice(k + 1, k + 3).some(participle));
    if (first !== null && ref(first) && !suffers) targetActs = true;
    i = end - 1;
  }

  const boundary = (k: number): boolean => excluded[k] || isPunct(words[k]) || Conjunctions.has(low(words[k]));
  for (let i = 0; i < words.length; i++) {
    if (excluded[i] || isPunct(words[i])) continue;
    const w = low(words[i]);
    let start = i;
    while (start > 0 && !boundary(start - 1)) start--;
    let stop = i + 1;
    while (stop < words.length && !boundary(stop)) stop++;
    const before = words.slice(start, i);
    const after = words.slice(i + 1, stop);

    // "Pay, or else": an ultimatum to the one addressed.
    if (w === "or" && i + 1 < words.length && low(words[i + 1]) === "else") return true;
    if (!Threat.test(words[i])) continue;
    if (denied(before, after)) continue;
    const b0 = before.length > 0 ? low(before[0]) : "";
    const alternative =
      start > 0 && low(words[start - 1]) === "or" && before.length > 0 && (b0 === "else" || b0 === "there" || b0 === "i" || b0 === "i'll" || b0 === "we" || b0 === "we'll" || b0 === "my" || b0 === "our");
    const last = before.length > 0 ? low(before[before.length - 1]) : "";

    if (w.startsWith("regret")) {
      if (before.some(ref)) return true;
      continue;
    }
    if (w.startsWith("consequence")) {
      if ([...before, ...after].some(ref) || targetActs || alternative || (before.length > 0 && low(before[0]) === "beware")) return true;
      continue;
    }
    if (w.startsWith("warn")) {
      // "You have been warned", "Be warned", "consider yourself warned": the one warned is the target. Not "strike at once,
      // before they can be warned", which speaks of a third king.
      if (w === "warning" && (last === "last" || last === "final" || last === "only")) return true;
      if (w === "warned" && ((BeWords.has(last) && (before.some(ref) || before.length === 1)) || last === "yourself" || last === "yourselves")) return true;
      continue;
    }
    if (w.startsWith("enem")) {
      if (before.some(agent)) continue;
      const being = before.some((x) => BeWords.has(low(x)) || Becoming.has(low(x)));
      if (being && (last === "my" || last === "our" || last === "an" || last === "a" || last === "the" ? before.some(ref) : YouWords.has(last))) return true;
      continue;
    }
    if (w.startsWith("warrior") || w === "warlike" || w === "warfare") continue;

    // A deed: attack, destroy, march, punish, crush, burn, invade, war, betray. Done to the target ("you will be crushed")?
    if (participle(words[i]) && (BeWords.has(last) || (before.length > 1 && BeWords.has(low(before[before.length - 2]))))) {
      if (before.some(ref)) return true;
      continue;
    }
    if (before.some(agent) || before.some((x) => ["together", "alongside", "beside", "jointly"].includes(low(x)))) continue;
    const aimed = aim(after, w === "war" || w === "wars", ref, third);
    if (aimed === true) return true;
    if (aimed === false) continue;
    // No one it falls on: the target's own deed ("you will march"), unless his cities are to burn; or what follows from
    // what he does.
    if (before.some(ref)) {
      if (w.startsWith("burn")) return true;
      continue;
    }
    if (targetActs || alternative) return true;
  }
  return false;
}

/** Whom a deed falls on, read from the words after it: the target (true), someone else or no one (false), or not said (null). */
function aim(after: string[], war: boolean, target: (w: string) => boolean, third: (w: string) => boolean): boolean | null {
  const window = after.slice(0, 6);
  for (let j = 0; j < window.length; j++) {
    const x = low(window[j]);
    if (j <= 1 && Nobody.has(x)) return false;
    // "march with you", "march beside him", "make war for Mari": side by side, not against.
    if (!war && Together.has(x)) return false;
    if (x === "between") return null;
    if (x === "to") {
      let k = j + 1;
      while (k < window.length && Determiners.has(low(window[k]))) k++;
      if (k < window.length && Help.has(low(window[k]))) return false;
    }
    if (target(window[j])) return !(YouWords.has(bare(window[j])) && j + 1 < after.length && (Help.has(low(after[j + 1])) || Shield.has(low(after[j + 1]))));
    if (third(window[j])) return false;
  }
  return null;
}

/** A threat word denied before it ("will not march", "no army of mine will march", "won't attack") or after it ("march on no land"). */
function denied(before: string[], after: string[]): boolean {
  if (before.slice(-5).some((x) => Negations.has(low(x)) || low(x).endsWith("n't"))) return true;
  const j = after.length > 0 && Particles.has(low(after[0])) ? 1 : 0;
  return j < after.length && Nobody.has(low(after[j]));
}

/**
 * A message for the envoy's lord ("Tell your lord that my armies are few"), anywhere in the request, in the host's own
 * words: "My armies are few". Null when the request holds no message of that kind, or only one it forbids.
 */
function claim(request: string, lord: Power): string | null {
  const re = Messages(lord);
  re.lastIndex = 0;
  for (const m of request.replaceAll("’", "'").matchAll(re)) {
    const g = m.groups!;
    const c = trimEnd(trim(g.claim), ".!? \"'");
    const that = g.that1 !== undefined || g.that2 !== undefined || g.that3 !== undefined;
    // Without "that", the words must say something: not "tell your lord everything" or "tell him of my love".
    if (!that && (split(c, " ", true).length < 3 || NoClaim.test(c))) continue;
    if (c.length > 0) {
      const up = c[0].toUpperCase();
      return (up.length === 1 ? up : c[0]) + c.slice(1);
    }
  }
  return null;
}

/** The king a request asks the envoy to speak well of to its lord; null if none. */
function praised(request: string, lord: Power): Power | null {
  const re = Praise(lord);
  re.lastIndex = 0;
  for (const m of request.replaceAll("’", "'").matchAll(re)) {
    const whom = m.groups!.whom1 ?? m.groups!.whom2 ?? "";
    for (const p of AllPowers) if (p !== lord && Names.mentions(whom, p)) return p;
  }
  return null;
}

export const TextKit = {
  sentences,
  isThreat,
  isThreatTo,
  claim,
  praised,
  /** Whether a text accuses someone: of lies, deceit or falsehood, of breaking an oath, of betrayal, of faithlessness. */
  isAccusation: (text: string): boolean => Accusation.test(text),
  /** Whether a sentence speaks of the weighing of gold. */
  speaksOfWeighing: (sentence: string): boolean => Weighing.test(sentence.replaceAll("’", "'")),
  /** Whether a text speaks of land, gold or tribute. */
  speaksOfLandOrGold: (text: string): boolean => LandOrGold.test(text),
  /** Whether a sentence hands something over. */
  handsOver: (sentence: string): boolean => HandOver.test(sentence.replaceAll("’", "'")),
  join: (items: Iterable<string>): string => [...items].filter((s) => s.length > 0).join(" "),
};
