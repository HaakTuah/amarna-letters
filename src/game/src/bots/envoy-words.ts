/**
 * What script envoys say (the slop audit, archive item 178): before a foreign king, and to their own on coming home, each
 * line in a few forms. A form is chosen as the kings' words are (`pick` in voices.ts): by the season, the envoy and the
 * court, never by the game's random numbers, so seeds replay exactly.
 *
 * Script kings and the checks read these words back. The host's record of an audience is weighed for warmth, a report
 * home for warmth when it names "the court of" the host's land, a refused post is read from its own sentence, and the
 * character checks look for a gift, a detention, a skim, an offer, a seal and a threat. So every form of a line reads as
 * its first form does (the test "Every form of a line reads to the script kings as its first form does").
 */
import { tier, type Power } from "@amarna/engine";
import { pick } from "./voices.ts";

/** How an envoy addresses the king before it: a Great King as one, a city's ruler as the king of his city. */
export const address = (host: Power, land: string): string => (tier(host) === "City" ? `King of ${land}` : "Great King");

/** An envoy's words abroad, by line; `{T}` is how it addresses the host, `{K}` its lord. */
export const Abroad = {
  servant: ["{T}, I bring the words of {K}, and I am your servant still.", "{T}, your servant brings you the words of {K}."],
  open: ["{T}, I bring the words of my lord {K}.", "{T}, {K} has sent me to you with these words.", "Hear the words of {K}, {T}."],
  greets: ["He sends his greetings.", "He sends you greeting, and nothing more.", "He wishes you well."],
  noQuarrel: ["My lord hopes that no quarrel will ever come between your houses.", "My lord wants no quarrel with your house.", "My lord would have no quarrel between your house and his."],
  flatter: [
    "My lord holds you dearest of all his brothers, and great gifts will follow if you are gracious to me, his chosen messenger.",
    "My lord holds you dearest of his brothers; be gracious to me, his messenger, and gifts will follow.",
  ],
  fond: ["For myself, I have always admired your court above all others.", "Of all the courts I have stood in, yours is the finest.", "I have long wished to stand in this hall."],
  goldListed: ["I carry the gold my lord sends, as the inventory on the tablet shows.", "Here is the gold my lord sends, and the inventory on the tablet with it."],
  gold: ["I carry the gold my lord sends.", "Here is the gold my lord sends."],
  takeBribe: ["Your generosity honours me. I will tell my lord how warmly I was received.", "I will take it, and my lord shall hear how warmly you received me."],
  refuseBribe: ["I cannot take this. I serve my lord alone.", "I may not take it; I serve one lord.", "Keep it. My lord is my only master."],
  takePost: ["Then I am yours, {T}. Let my former lord send another.", "I will serve you, {T}; my old master must find another messenger."],
  refusePost: ["You honour me, but I must return to my lord.", "My lord waits for my return; I cannot stay.", "I must go back to my lord; he is waiting for me."],
  beg: ["I beg you, let me go home; my lord awaits my word.", "Let me go home, I beg you; my lord waits for my word."],
  protest: ["My lord will hear of how his messenger was treated.", "My lord will hear how his messenger was treated here."],
  sealIt: ["I set my lord's seal on it in his name.", "I seal it with my lord's seal, in his name."],
  carryIt: ["That goes beyond what my lord allows me: I will carry it to him.", "My lord gave me no leave for this; I will take it to him."],
  overpromise: ["My lord will agree to all of it, I promise you.", "My lord will grant all of it; I give you my word."],
  promise: ["I will carry your words to my lord faithfully.", "Your words will reach my lord as you spoke them.", "I will set your words before my lord, every one."],
  meek: ["As you say, {T}. I will repeat every word.", "As you say, {T}; every word will reach him."],
  answer: ["I will carry your words to my lord.", "My lord will hear your answer.", "I will take your answer home."],
  thanks: ["I thank you, {T}.", "{T}, I thank you.", "I am grateful, {T}."],
} as const satisfies Record<string, readonly string[]>;

/** An envoy's words to its own king, home again; `{L}` is the host's land. */
export const Home = {
  back: ["My lord, I have returned from the court of {L}.", "I am back from the court of {L}, my lord.", "My lord, your servant is home from the court of {L}."],
  backBare: ["My lord, I have returned.", "I am back, my lord."],
  held: ["They held me against my will, and only now let me go.", "I was kept there against my will until now."],
  unheard: [
    "Nobody at the court of {L} understood me, my lord, and I found nobody to carry my words",
    "At the court of {L} nobody understood me, my lord, and nobody would carry my words for me",
  ],
  unheardGifts: ["; I presented your gifts, which were all they could understand", "; I gave them your gifts, and those they understood"],
  heardLie: ["I delivered your words, my lord. The king heard them, and will answer in his own time.", "I gave your words to the king, my lord. His answer will follow by his own messenger."],
  said: ['The king said: "{W}"', 'His answer was this: "{W}"', 'These were his words: "{W}"'],
  saidKindly: ['The king spoke kindly: "{W}"', 'The king answered kindly: "{W}"', 'He spoke kindly, and said: "{W}"'],
  friendship: ["The king spoke of his friendship for you.", "The king said only that he is your friend."],
  bought: ["The king of {L} is a true friend to you, my lord, and wishes only peace.", "In {L} I found a friend to you, my lord, and a king who wants peace."],
  boast: ["It was my words that won his favour; no other envoy could have done as much.", "My words won his favour; another envoy would have come home with less."],
  soothe: ["All is well between your houses, I am certain of it.", "All is well between your houses.", "There is no trouble between your house and his."],
  sealed: ["He sealed the tablet, and I bring your copy.", "The tablet is sealed; I bring your copy."],
  refusedPost: ["The king of {L} offered me a post in his service, and I refused it: I serve you alone.", "The king of {L} offered me a post in his service, and I refused it, for I am yours."],
  assured: ["I gave him such assurances as you would wish.", "I gave him the assurances you would want given."],
  gifts: ["I bring the gifts the king sent you.", "Here are the gifts the king sends you."],
} as const satisfies Record<string, readonly string[]>;

/** One form of a line, for this season, envoy and court, filled in. */
export function say<T extends Record<string, readonly string[]>>(lines: T, line: keyof T & string, key: string, fill: Record<string, string> = {}): string {
  let s = pick(lines[line], `${key}|${line}`);
  for (const [k, v] of Object.entries(fill)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
