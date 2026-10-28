/**
 * Stakes, not dispositions (build order item 11a): every character plays for wealth, and its traits become its strategy for
 * winning it, chosen by formula so that a script and a model character with the same traits pursue the same plan ("How the
 * strategy is made"), with a bold or a careful road from its appetite for risk ("Bold or careful, one goal"), and a horizon
 * of its own for weighing gold now against gold later ("Time for script characters").
 */
import { cmpNum, desc, sortBy } from "../core/seq.ts";
import type { Strategy } from "../model/money.ts";
import type { Character, Traits } from "../model/people.ts";

/**
 * How well each way to a fortune fits a man's traits, 0 to about 100 (first guesses): the steady hired man is loyal and
 * careful; the keeper greedy, bold and loyal mostly to himself; the seller of secrets able, greedy and none too loyal; the
 * climber ambitious and able; the outlaw bold, disloyal and greedy.
 */
export function strategyFit(t: Traits): Record<Strategy, number> {
  return {
    Steady: (2 * t.loyalty + (100 - t.courage) + (100 - t.greed)) / 4,
    Keeper: (2 * t.greed + t.courage + (100 - t.loyalty)) / 4,
    Seller: (t.competence + t.greed + 2 * (100 - t.loyalty)) / 4 - 5,
    Climber: (2 * t.ambition + t.competence + t.courage) / 4,
    Outlaw: (2 * t.courage + 2 * (100 - t.loyalty) + t.greed) / 5 - 15,
  };
}

/** The one or two ways that best fit: the second only within 8 points of the first. */
export function strategiesOf(t: Traits): Strategy[] {
  const fit = strategyFit(t);
  const ranked = sortBy(Object.keys(fit) as Strategy[], [(k: Strategy) => fit[k], desc(cmpNum)]);
  return fit[ranked[0]] - fit[ranked[1]] <= 8 ? [ranked[0], ranked[1]] : [ranked[0]];
}

/** Its appetite for risk, 0 to 100: courage most, then greed and ambition. */
export const riskAppetite = (t: Traits): number => Math.round((2 * t.courage + t.greed + t.ambition) / 4);

/** The bold road, from an appetite of 55 or more (first guess). */
export const isBold = (t: Traits): boolean => riskAppetite(t) >= 55;

/** Sets a character's strategy and road from its traits as they are now; true if either changed. */
export function chooseStrategy(c: Character): boolean {
  const s = strategiesOf(c.traits)[0];
  const b = isBold(c.traits);
  const changed = s !== c.strategy || b !== c.bold;
  c.strategy = s;
  c.bold = b;
  return changed;
}

/**
 * How much less gold a season later is worth to it than gold now, in tenths of a percent ("Time for script characters"):
 * an impatience from its traits (greed and ambition raise it, loyalty to a steady life lowers it), and the danger of the
 * life it leads (a servant abroad, a spy, a bold man's errands). First guesses, tuned in item 18.
 */
export function impatience(c: Character): number {
  const t = c.traits;
  const base = 5 + Math.round((t.greed + t.ambition - t.loyalty) / 10);
  // A servant's life is a king's errands: abroad, held, or caught as a spy, whenever it is sent.
  const danger = c.duty === "SpyPosted" || c.duty === "SpyOutbound" ? 15 : c.status === "Employed" || c.errand !== null ? 8 : 0;
  return Math.max(2, base + danger + (c.bold ? 5 : 0) - (c.hoard !== null ? 3 : 0));
}

/** The ways to a fortune in words, for its persona and requests. */
export const StrategyWords: Readonly<Record<Strategy, string>> = {
  Steady: "steady, safe paid work and good relations with those who pay you: a good name that brings the next job at a better fee, never risking it all on a gamble",
  Keeper: "what you can keep of what passes through your hands, gold carried, gifts and fees, taking only what will not be missed or traced back to you",
  Seller: "selling what you know: what you see and hear in courts and on the roads is worth gold to someone, and you know who pays",
  Climber: "rising to command, and in time to a city of your own: making yourself indispensable to a great king and taking the posts that lead upward",
  Outlaw: "serving nobody's interest but your own: you take what falls to you where nobody guards it, keep it, and owe nobody an account of it",
};

/** The two roads in words. */
export const RoadWords = {
  bold: "You take the bold road: high returns for high risks, well-paid errands into danger, loans at steep interest to those in need. You know it may end with nothing, or dead, and you take risks because you judge they pay, not because you like danger.",
  careful: "You take the careful road: steady work, loans only to those who will repay, your gold kept where it is safe. It is slower, but it adds up and rarely loses everything.",
} as const;

/** A character's strategy in two sentences, for its persona and every request. */
export function strategyText(c: Character): string {
  const ways = strategiesOf(c.traits);
  const way = ways.length === 2 ? `${StrategyWords[ways[0]]}; or else ${StrategyWords[ways[1]]}` : StrategyWords[ways[0]];
  return `Your goal is wealth: gold is your security and your own victory, and the richest of the age are counted at its end, the dead below every living man. Your way to it: ${way}. ${c.bold ? RoadWords.bold : RoadWords.careful}`;
}
