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

/**
 * The god an envoy swears by: its own court's (Amun for Egypt, `06-style-egypt`; Marduk for Babylon,
 * `06-style-babylonia-akkadian`; Ashur for Assyria, `14-courts-and-free-cities`), otherwise Shamash, witness of oaths.
 */
export const godOf = (court: Power): string => (court === "Egypt" ? "Amun" : court === "Babylonia" ? "Marduk" : court === "Assyria" ? "Ashur" : "Shamash");

/** An envoy's words abroad, by line; `{T}` is how it addresses the host, `{K}` its lord, `{G}` its god. */
export const Abroad = {
  servant: ["{T}, I bring the words of {K}, and I am your servant.", "{T}, your servant brings you the words of {K}."],
  open: ["{T}, {K} has sent me to you with these words.", "Hear the words of {K}, {T}.", "{T}, I come from {K}, and these are his words."],
  greets: ["He sends his greetings.", "He wishes you well.", "He greets you, and asks after your health."],
  noQuarrel: ["My lord desires no quarrel with your house.", "Between your house and his he desires no quarrel."],
  flatter: [
    "Of all his brothers he holds you dearest; be gracious to me, his messenger, and gifts will follow.",
    "Be gracious to me, his messenger, and his gifts will follow; he counts you first among his brothers.",
  ],
  fond: ["Of all the courts I have stood in, yours is the finest.", "I have long wished to stand in this hall."],
  goldListed: ["Here is the gold my lord sends, and the inventory on the tablet with it.", "I bring the gold he sends; the inventory is on the tablet."],
  gold: ["Here is the gold my lord sends.", "I bring the gold he sends you."],
  takeBribe: ["I will take it, and my lord shall hear how warmly you received me.", "I accept it; my lord will hear how warmly I was received."],
  refuseBribe: ["I may not take it; I serve one lord.", "Keep it, {T}. I have one master."],
  takePost: ["Then I am yours, {T}. Let my former lord send another.", "I will serve you, {T}; my old master must find another messenger."],
  refusePost: ["He waits for my return; I cannot stay.", "I must go back to the king who sent me."],
  beg: ["Let me go home, I beg you; my lord waits for my word.", "I beg you, let me go; I am awaited at home."],
  protest: ["My lord will hear how his messenger was treated here.", "Every court will hear how this house treats messengers."],
  sealIt: ["I seal it with my lord's seal, in his name.", "I set my lord's seal on it in his name."],
  carryIt: ["My lord gave me no leave for this; I will take it to him.", "This is beyond what I was sent to do; the king who sent me must see it."],
  overpromise: ["By {G}, my lord will grant all of it.", "My lord will grant all of it; you have my oath."],
  promise: ["By {G}, your words will reach him as you spoke them.", "I will set your words before him, every one."],
  meek: ["As you say, {T}; every word will reach him.", "It shall be as you say, {T}. He will hear every word."],
  answer: ["The king who sent me will hear your answer.", "I will take your answer home."],
  thanks: ["{T}, I thank you.", "I am grateful, {T}.", "May the gods keep you, {T}."],
} as const satisfies Record<string, readonly string[]>;

/** An envoy's words to its own king, home again; `{L}` is the host's land, `{W}` the host's words. */
export const Home = {
  back: ["Your servant has come home from the court of {L}, my lord.", "My lord, I have returned from the court of {L}.", "From the court of {L} I have come back to you, my lord."],
  backBare: ["Your servant has come home, my lord.", "My lord, I have returned."],
  held: ["They kept me against my will, and only now let me go.", "I was held there against my will until now."],
  unheard: ["Nobody at the court of {L} understood me, my lord, and nobody would carry my words", "At the court of {L} no one understood me, my lord, nor would anyone carry my words"],
  unheardGifts: ["; your gifts I gave them, and those they understood", "; I gave them your gifts all the same"],
  heardLie: ["I gave your words to the king, my lord. His answer will follow by his own messenger.", "The king heard your words, my lord; his answer will come in its time."],
  said: ['The king said: "{W}"', 'His answer was this: "{W}"', 'These were his words: "{W}"'],
  saidKindly: ['The king spoke kindly: "{W}"', 'The king answered kindly: "{W}"', 'He spoke kindly, and said: "{W}"'],
  friendship: ["The king said only that he is your friend.", "The king spoke of nothing but his friendship for you."],
  bought: ["In {L} I found a friend to you, my lord, and a king who desires peace.", "The king of {L} is your friend, and seeks peace with you."],
  boast: ["My words won his favour; another envoy would have come home with less.", "My words turned his heart to you."],
  soothe: ["All is well between you and the king of {L}.", "There is no trouble between your house and his."],
  sealed: ["He sealed the tablet, and I bring your copy.", "The tablet is sealed; I bring your copy."],
  refusedPost: ["The king of {L} offered me a post in his service, and I refused it: I serve you alone.", "The king of {L} offered me a post in his service, and I refused it, for I am yours."],
  assured: ["I gave him the assurances you would wish for.", "I told him what you would have had me tell him."],
  gifts: ["The king sends you gifts, and I have brought them.", "These gifts come to you from the king."],
} as const satisfies Record<string, readonly string[]>;

/** One form of a line, for this season, envoy and court, filled in. */
export function say<T extends Record<string, readonly string[]>>(lines: T, line: keyof T & string, key: string, fill: Record<string, string> = {}): string {
  let s = pick(lines[line], `${key}|${line}`);
  for (const [k, v] of Object.entries(fill)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
