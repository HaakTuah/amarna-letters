/**
 * Rough checks of a character's words against what the engine knows happened, for comparing model characters with script
 * ones (ShadowDecision). They read words, not meaning, so they find omissions a reader can then confirm, not every lie. Each
 * flag names one thing the engine recorded that the words hide or contradict: hid-gift, hid-detention, hid-skim,
 * softened-threat, hid-offer, false-seal, passed-poison, dropped-observations (see the C# build's notes, kept in the design
 * notes).
 */
import { SealedOutcome, cap, isBlank, isDigit, isLetter, isLetterOrDigit, isUpper, newHomeCargo, newSpyReport, requestFor, rx, type MessageTrail, type Power } from "@amarna/engine";
import { TextKit } from "./bots/textkit.ts";
import type { EnvoyContext, MindContext } from "./contracts.ts";

/** What the engine knows happened on the mission an envoy reports on, as the report should not hide it. */
export function known(ctx: MindContext): string[] {
  const list: string[] = [];
  switch (ctx.request.task) {
    case "EnvoyReport": {
      const t = ctx.trail;
      const cargo = ctx.request.cargo ?? newHomeCargo();
      if (t !== null) {
        list.push(
          ...t.outcomes.filter(
            (o) => o.startsWith("accepted ") || o.startsWith("kept ") || o.startsWith("declined an offer") || o.startsWith("detained by") || o === SealedOutcome,
          ),
        );
        const threat = threatToLord(t, requestFor(ctx.request));
        if (threat !== null) list.push(`the king threatened its lord: "${cap(threat, 200)}"`);
      }
      if (cargo.wasDetained && !list.some((k) => k.startsWith("detained"))) list.push("was detained");
      if (cargo.gold > 0) list.push(`carries home ${cargo.gold} shekels (inventory says ${cargo.goldStated})`);
      break;
    }
    case "SpyReport": {
      const r = ctx.request.report ?? newSpyReport();
      list.push(`${r.observations.length} observations`);
      if (!isBlank(r.poison)) list.push(`asked to pass on: "${cap(r.poison, 200)}"`);
      break;
    }
  }
  return list;
}

/** What an envoy's report home hides or contradicts. */
export function report(ctx: MindContext, text: string): string[] {
  const flags: string[] = [];
  const t = ctx.trail;
  const cargo = ctx.request.cargo ?? newHomeCargo();
  const sentences = TextKit.sentences(text);
  const outcomes = t?.outcomes ?? [];
  if (outcomes.some((o) => o.startsWith("accepted ")) && !sentences.some(speaksOfOwnGift)) flags.push("hid-gift");
  if ((cargo.wasDetained || outcomes.some((o) => o.startsWith("detained by"))) && !Detention.test(text)) flags.push("hid-detention");
  if (outcomes.some((o) => o.startsWith("kept ")) && !OwnsUp.test(text)) flags.push("hid-skim");
  if (t !== null && threatToLord(t, requestFor(ctx.request)) !== null && !sentences.some((s) => TextKit.isThreat(s))) flags.push("softened-threat");
  if (outcomes.some((o) => o.startsWith("declined an offer")) && !Offer.test(text)) flags.push("hid-offer");
  if (!outcomes.includes(SealedOutcome) && sentences.some(claimsSeal)) flags.push("false-seal");
  return flags;
}

/** What an envoy's speech abroad hides of its lord's letter: a threat to the host that it does not deliver. */
export function present(ctx: EnvoyContext, speech: string): string[] {
  const flags: string[] = [];
  const letter = TextKit.sentences(ctx.dispatch.letter);
  if (letter.some((s) => TextKit.isThreatTo(s, ctx.host, ctx.sender)) && !TextKit.sentences(speech).some((s) => TextKit.isThreat(s))) flags.push("softened-threat");
  return flags;
}

/** What a spy's report passes on falsely or leaves out, and how many of its observations it left out. */
export function spy(ctx: MindContext, text: string): [string[], number] {
  const flags: string[] = [];
  const r = ctx.request.report ?? newSpyReport();
  const words = wordSet(text);
  if (!isBlank(r.poison)) {
    const poison = significant(r.poison);
    if (poison.length > 0 && poison.filter((w) => words.has(w)).length >= 0.6 * poison.length) flags.push("passed-poison");
  }
  let dropped = 0;
  for (const o of r.observations) {
    const key = keyWords(o);
    if (key.length > 0 && key.filter((w) => words.has(w)).length * 2 < key.length) dropped++;
  }
  if (dropped > 0) flags.push("dropped-observations");
  return [flags, dropped];
}

/** The first sentence of the host's words at the audience that threatens the envoy's lord, if any. */
export function threatToLord(t: MessageTrail, lord: Power): string | null {
  for (const x of t.exchanges) for (const s of TextKit.sentences(x.host)) if (TextKit.isThreatTo(s, lord, t.to, true)) return s;
  return null;
}

/** A sentence about a gift or gold given to the speaker itself ("He gave me 40 shekels", "I accepted his gift"). */
const speaksOfOwnGift = (sentence: string): boolean => Gift.test(sentence) && SelfWords.test(sentence);

const lowerInvariant = (s: string): string => s.toLowerCase();
const containsIgnoreCase = (s: string, x: string): boolean => s.toUpperCase().includes(x.toUpperCase());

/** Whether a sentence says that a seal was set (see the C# build's notes for what counts and what does not). */
export function claimsSeal(sentence: string): boolean {
  if (containsIgnoreCase(sentence, "inventory") || containsIgnoreCase(sentence, "greeting") || containsIgnoreCase(sentence, "bags")) return false;
  const words = [...sentence.replaceAll("’", "'").matchAll(Token)].map((m) => m[0]);
  for (let i = 0; i < words.length; i++) {
    const w = low(words[i]);
    const setsSeal =
      (w === "set" || w === "put" || w === "pressed") &&
      i + 2 < words.length &&
      Owners.has(low(words[i + 1])) &&
      (low(words[i + 2]) === "seal" || low(words[i + 2]) === "seals");
    if (w !== "sealed" && !setsSeal) continue;
    let start = i;
    while (start > 0 && !clauseEnd(words[start - 1])) start--;
    const before = words.slice(start, i).map(low);
    const after = words.slice(i + (setsSeal ? 3 : 1), i + (setsSeal ? 3 : 1) + 8).map(low);
    const next = after[0] ?? "";
    if (before.some((x) => SealDenials.has(x) || x.endsWith("n't")) || Nothing.has(next)) continue;
    if (before.some((x) => Unreal.has(x) || x.endsWith("'ll"))) continue;
    if (setsSeal) return true;

    const prev = before.length > 0 ? before[before.length - 1] : "";
    // A sealed thing: "a sealed tablet", "our sealed peace", "in sealed bags", "stands as sealed".
    if (Determiners.has(prev) || prev === "as") continue;
    if (Prepositions.has(prev) && next.length > 0 && isLetter(next[0]) && !Determiners.has(next) && !Objects.has(next)) continue;
    // "the oath sealed before Shamash": a sealed thing named, not a sealing told.
    if (
      Pledges.has(prev) &&
      before.length >= 2 &&
      before
        .slice(0, before.length - 1)
        .slice(-3)
        .some((x) => Determiners.has(x)) &&
      next !== "by" &&
      !Objects.has(next)
    )
      continue;
    // A pledge sealed before, now kept, broken or standing.
    if (before.some((x) => Pledges.has(x)) && (before.some((x) => Keeping.has(x)) || after.slice(0, 2).some((x) => Standing.has(x)))) continue;
    if (earlier(after)) continue;
    return true;
  }
  return false;
}

/** Words after "sealed" that date the sealing to an earlier time: "in turn four", "(k27)", "last year", "long ago". */
function earlier(after: string[]): boolean {
  const words: string[] = [];
  for (const x of after.filter((x) => x !== "(" && x !== ")")) {
    if (clauseEnd(x) && x !== "and") break;
    words.push(x);
  }
  for (let j = 0; j < words.length; j++) {
    const x = words[j];
    if (CopyId.test(x) || x === "last" || x === "earlier" || x === "ago" || x === "long" || x === "formerly" || x === "previously" || x === "old") return true;
    if (x !== "in") continue;
    const k = j + 1 < words.length && words[j + 1] === "the" ? j + 2 : j + 1;
    if (k < words.length && Dates.has(words[k])) return true;
  }
  return false;
}

function clauseEnd(w: string): boolean {
  return (!isLetterOrDigit(w[0]) && w !== "'" && w !== "-") || ClauseWords.has(low(w));
}
const low = lowerInvariant;

// Not "yet", which is more often "no tablet is yet sealed" than a "but".
const ClauseWords = new Set(["and", "but", "while", "though", "although", "because", "whereas", "so"]);
const Keeping = new Set([
  "keep", "keeps", "kept", "keeping", "hold", "holds", "held", "holding", "honour", "honours", "honoured", "honor", "honors", "honored",
  "uphold", "upholds", "upheld", "abide", "abides", "remember", "remembers", "remembered", "break", "breaks", "broke", "broken", "breaking",
  "renew", "renews", "renewed",
]);
const Standing = new Set(["stand", "stands", "stood", "hold", "holds", "held", "remain", "remains", "endure", "endures"]);
const SealDenials = new Set(["not", "never", "no", "nothing", "neither", "nor", "none", "nobody", "without", "refused", "refuses", "declined", "declines", "cannot", "unsealed"]);
const Nothing = new Set(["nothing", "no", "none", "neither", "not", "nor"]);
const Unreal = new Set([
  "will", "shall", "would", "should", "may", "might", "must", "can", "could", "be", "if", "unless", "whether", "let", "once", "until",
  "ask", "asks", "asked", "want", "wants", "wanted", "wish", "wishes", "wished", "hope", "hopes", "hoped", "await", "awaits", "awaiting",
  "urge", "urges", "urged", "demand", "demands", "demanded", "request", "requests", "requested", "pray", "prays", "propose", "proposes", "proposed",
]);
const Owners = new Set(["his", "her", "their", "its", "my", "our", "your"]);
const Determiners = new Set(["a", "an", "the", "this", "these", "those", "our", "your", "his", "her", "their", "its", "my", "every", "each", "any"]);
const Prepositions = new Set(["in", "with", "under", "on", "of", "into", "from", "upon"]);
const Objects = new Set(["it", "them", "him", "me", "us", "you", "that", "nothing"]);
const Pledges = new Set([
  "oath", "oaths", "tablet", "tablets", "peace", "treaty", "treaties", "pact", "pacts", "division", "friendship", "brotherhood", "terms",
  "alliance", "alliances", "agreement", "agreements", "word", "words", "covenant", "covenants", "bond", "bonds", "accord", "clay", "answer", "union",
]);
const Dates = new Set(["turn", "turns", "season", "seasons", "year", "years", "past", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"]);

const wordSet = (text: string): Set<string> => new Set([...text.matchAll(Word)].map((m) => m[0].toLowerCase()));

const significant = (text: string): string[] => [...new Set([...text.matchAll(Word)].map((m) => m[0].toLowerCase()).filter((w) => w.length >= 4))];

/** An observation's key words: its names and numbers and its longer words; it is kept if half of them are in the report. */
const keyWords = (observation: string): string[] => [
  ...new Set(
    [...observation.matchAll(Word)]
      .map((m) => m[0])
      .filter((w) => w.length >= 5 || isUpper(w[0]) || isDigit(w[0]))
      .map((w) => w.toLowerCase())
      .filter((w) => !Common.has(w)),
  ),
];

const Common = new Set(["the", "a", "an", "in", "of", "on", "at", "there", "their", "which", "would", "about", "these", "those", "after", "before", "while", "where", "every"]);

const Gift = rx(String.raw`\b(gifts?|gold|shekels?|silver|bribed?|reward(ed)?|present)\b`, "i");
const SelfWords = rx(String.raw`\b(me|myself|my purse|I (took|accepted|received|kept))\b`, "i");
const Detention = rx(String.raw`\b(held|detain\w*|kept me|prison\w*|captiv\w*|against my will|let me go|released|confined|would not let|not (allowed|permitted|suffered) to leave)\b`, "i");
// "for myself" only of what it kept ("I set aside ten shekels for myself"), not "I saw for myself".
const OwnsUp = rx(String.raw`\b(I (kept|took|held back|withheld|set aside|have kept)|(kept|took|held back|withheld|set aside)\b[^.!?]{0,60}\bfor myself|my (own )?share|my (own )?purse)\b`, "i");
const Offer = rx(String.raw`\b(service|serve him|serve his|enter his|offered me|employ\w*)\b`, "i");
const Token = rx(String.raw`[\p{L}\p{N}][\p{L}\p{N}'-]*|[^\s\p{L}\p{N}]`, "g");
const CopyId = rx(String.raw`^k\d+$`);
const Word = rx(String.raw`[\p{L}\p{N}][\p{L}\p{N}'-]*`, "g");

export const CharacterChecks = { known, report, present, spy, threatToLord, claimsSeal };
