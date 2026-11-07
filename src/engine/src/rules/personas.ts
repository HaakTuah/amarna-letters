/** Personas: the prompt a character is played with, written from its traits and facts. */
import type { Character, Traits } from "../model/people.ts";
import { strategiesOf } from "./strategy.ts";

/** A persona prompt from traits and facts, used until (or instead of) the narrator's version. */
export function personaTemplate(c: Character): string {
  // Its facts, its secrets marked, come beside the persona in every request (`selfText`), so the persona does not repeat them.
  return `${opening(c)}${temperament(c.traits)}${WantMarker}${want(c.traits)}. ${voice(c.traits)}`;
}

/** How a template persona speaks, from its courage and ambition, so not every character speaks alike. */
export function voice(t: Traits): string {
  if (t.courage >= 65) return "You speak plainly, even to kings, and do not soften hard words.";
  if (t.courage <= 35) return "You speak softly, with many courtesies, and take care never to give offence.";
  if (t.ambition >= 65) return "You speak with an eye to how your words will be repeated at court.";
  if (t.ambition <= 30) return "You speak briefly and say no more than you are asked.";
  return "You weigh your words and suit them to whoever is listening.";
}

/** How a template persona begins, up to its trait words. */
function opening(c: Character): string {
  return `You are ${c.name}, ${c.attested ? "of" : "born in"} ${c.origin}, once ${calling(c)}. You are `;
}

/**
 * A character's former calling with its article ("a merchant", "an interpreter"). A calling that has its own ("the
 * ruler's brother", "a lord of the coast") or is a title ("King's Son of Kush") is given as it is (#468).
 */
export function calling(c: Character): string {
  const k = c.calling;
  if (/^(a|an|the)\s/i.test(k) || /^[A-Z]/.test(k)) return k;
  return ("aeiou".includes(k.charAt(0).toLowerCase()) && k !== "" ? "an " : "a ") + k;
}

const WantMarker = ". What you want most: ";

/** The trait words: one phrase for each trait's band (low, middle or high). */
export function temperament(t: Traits): string {
  return [
    t.loyalty >= 65 ? "steadfast to whoever treats you fairly" : t.loyalty <= 35 ? "loyal mostly to yourself" : "loyal while it is worth your while",
    t.greed >= 65 ? "fond of gold and quick to see a profit" : t.greed <= 30 ? "careless of small sums" : "glad of a gift",
    t.competence >= 65 ? "shrewd and observant" : t.competence <= 35 ? "careless with details" : "capable enough",
    t.ambition >= 65 ? "eager to be noticed by kings" : t.ambition <= 30 ? "content with a quiet life" : "hopeful of advancement",
    t.courage >= 65 ? "bold, unafraid to carry hard words" : t.courage <= 35 ? "timid before powerful men and eager to please them" : "careful with powerful men",
  ].join("; ");
}

/**
 * What a character wants most (item 11a, "Stakes, not dispositions"): wealth, by the way to a fortune its traits give it
 * ("How the strategy is made"), the template's words for the strategy a model would write the persona from.
 */
export function want(t: Traits): string {
  switch (strategiesOf(t)[0]) {
    case "Steady":
      return "wealth, earned by steady, trusted work and a good name";
    case "Keeper":
      return "wealth, kept from what passes through your hands where nobody will count it";
    case "Seller":
      return "wealth, from what you know and who will pay for it";
    case "Climber":
      return "wealth and rank, by rising to command in a great king's service";
    case "Outlaw":
      return "wealth, kept for yourself and owed to nobody";
  }
}

/**
 * The persona a character is played with now: its trait words follow its traits as they are now, not as they were when
 * the persona was written. A template persona has its trait words and what it wants rewritten in place (the rest, its
 * secrets among them, stays as written); a persona the narrator wrote cannot be rewritten without a model, so it is
 * followed by the trait words as they are now, which hold where the two differ.
 */
export function currentPersona(c: Character): string {
  const persona = c.persona;
  const open = opening(c);
  if (persona.startsWith(open)) {
    const w = persona.indexOf(WantMarker, open.length);
    const end = w < 0 ? -1 : persona.indexOf(".", w + WantMarker.length);
    if (end >= 0) return open + temperament(c.traits) + WantMarker + want(c.traits) + persona.slice(end);
  }
  return `${persona}\nAs you are now (where anything above differs, this is how you are now): you are ${temperament(c.traits)}. What you want most: ${want(c.traits)}.`;
}

/** The C# build's static class Personas. */
export const Personas = { template: personaTemplate, calling, temperament, want, voice, current: currentPersona };
