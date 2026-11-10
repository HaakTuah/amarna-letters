import type { Power } from "@amarna/engine";
import { CharacterChecks, SignalDetector } from "@amarna/game";
import { Warmth } from "../src/bots/brain.ts";
import { TextKit } from "../src/bots/textkit.ts";

/**
 * How the script kings, the character checks and the signals read a text (the slop audit, archive item 178), by who says
 * it. A king's letter (`letter`) is read for the warmth words in it, threats aimed at `to` by `from`, plain threats, an
 * accusation and a blamed messenger. A host's words in audience (`host`) are quoted in the envoy's report home, so they
 * are read for all of that and for what a report is read for: sentences of weighing, of a gift to the speaker and of a
 * seal claimed, a detention, a skim owned up to and an offer of service; and an envoy answers with its word when they
 * speak of agreeing or swearing. An envoy's own words (`envoy`) are read as a report is. Two texts that read the same
 * can stand in for each other without changing any play.
 */
export function reading(t: string, to: Power, from: Power, by: "letter" | "host" | "envoy"): string {
  const low = t.toLowerCase();
  const count = (f: (s: string) => boolean): number => TextKit.sentences(t).filter(f).length;
  const r = CharacterChecks.reads;
  const letter = [
    [...Warmth.warm, ...Warmth.cold].filter((w) => low.includes(w)),
    count((s) => TextKit.isThreatTo(s, to, from)),
    count((s) => TextKit.isThreatTo(s, to, from, true)),
    count(TextKit.isThreat),
    TextKit.isAccusation(t),
    SignalDetector.blamesMessenger(t),
  ];
  if (by === "letter") return JSON.stringify(letter);
  const report = [count(TextKit.speaksOfWeighing), count(r.ownGift), count(CharacterChecks.claimsSeal), r.detention(t), r.ownsUp(t), r.offer(t)];
  return JSON.stringify([...letter, ...report, by === "host" ? ["agree", "swear"].filter((w) => low.includes(w)) : []]);
}

/** Whether a text says one of a line's forms (envoy-words.ts, voices.ts), filled in: the line, whichever form was chosen. */
export function saysOneOf(text: string, forms: readonly string[], fill: Record<string, string> = {}): boolean {
  return forms.some((f) => text.includes(Object.entries(fill).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), f)));
}

/** A share written as a percentage, which no one of the age would say. */
export const ModernShare = /\d\s*%|\bper ?cent\b|\bin (?:a hundred|100)\b/i;
