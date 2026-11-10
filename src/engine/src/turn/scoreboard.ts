/**
 * One scoreboard for every person (item 17b, part D; "One scoreboard for every person" under Victory): the kings and the
 * characters ranked together at the end of a game, each by what he holds, blended with how he did against par for his own
 * start (`GameConfig.sizeWeight` percent for size). A king holds his realm and is measured from his accession, against
 * what he inherited (`GameState.startStrength`); a character holds his purse and hoard and is measured by what he gained since he came into play,
 * against what characters gained in the script games ({@link CharacterPar}). The dead rank below every living person, by
 * what they held when they died. The realms' scores are their reigning kings' rows, and the winner is the first person on
 * the board, king or character.
 */
import { Dict } from "../core/collections.ts";
import { fmt } from "../core/num.ts";
import { cmpBool, cmpNum, desc, max, sortBy } from "../core/seq.ts";
import { nameFrom, type Character } from "../model/people.ts";
import { powerName, rulerStyle, type Power } from "../model/power.ts";
import { isSealedAgreement } from "../model/records.ts";
import { isAlive, logEvent } from "../model/state.ts";
import { realmOfKing } from "../rules/court.ts";
import { CharacterPar } from "../rules/par-results.ts";
import { finalScore, rankAmong, standingOf, type FinalScore } from "../rules/scoring.ts";
import { wealthOf, wealthSources, wealthStanding } from "../rules/wealth.ts";
import { idNumber, TurnEngine } from "./core.ts";

/** One person's place on the scoreboard. */
export interface PersonScore {
  character: Character;
  /** The realm he reigns over at the end, or null: a character, a fallen realm's king or heir, a king dead. */
  power: Power | null;
  /** What he holds: a king his realm's wealth; anyone else his purse and hoard; the dead what they held when they died. */
  holding: number;
  /** His holding as a share of the largest living person's, from 0 to 1 (0 for the dead). */
  size: number;
  /** Where his result ranks among par's for his start, from 0 to 1 (0 for the dead). */
  performance: number;
  /** The two blended (0 for the dead, who rank below every living person, by what they held). */
  score: number;
  dead: boolean;
}

declare module "./core.ts" {
  interface TurnEngine {
    /** Every person, the living by score, then the dead by what they held when they died (ties by id). */
    scoreboard(): PersonScore[];
    /** The reigning kings' rows of the scoreboard, as their realms' final scores, highest first (item 11e). */
    finalScores(): FinalScore[];
    decideWinners(): void;
  }
}

/**
 * A character's result against par, measured from what he brought into play (`Earnings.savings`): 1 for as much as he
 * brought, 1 more for every shekel gained since, and below 1 in proportion to what he lost of it; 0 for the dead.
 */
export function characterResult(c: Character): number {
  const w = wealthOf(c);
  if (w.dead) return 0;
  const start = c.earned.savings;
  return w.total < start ? w.total / start : 1 + (w.total - start);
}

const P = TurnEngine.prototype;

P.scoreboard = function () {
  const S = this.s;
  const rows = S.characters.map((c) => {
    const dead = c.status === "Dead";
    const p = dead ? null : realmOfKing(S, c.id);
    if (p !== null && isAlive(S, p)) {
      // A king: his realm, measured from his accession against what he inherited (`growth`), by par for his realm's start.
      const holding = Math.max(0, this.strength(p));
      return { character: c, power: p, holding, performance: standingOf(p, this.growth(p)) / 2, dead };
    }
    const holding = wealthOf(c).total;
    return { character: c, power: null, holding, performance: dead ? 0 : rankAmong(CharacterPar, characterResult(c)), dead };
  });
  const largest = Math.max(1, ...rows.filter((x) => !x.dead).map((x) => x.holding));
  const scored: PersonScore[] = rows.map((x) => {
    const size = x.dead ? 0 : x.holding / largest;
    return { ...x, size, score: x.dead ? 0 : finalScore(S.config.sizeWeight, size, x.performance) };
  });
  return sortBy(
    scored,
    [(x: PersonScore) => x.dead, cmpBool],
    [(x: PersonScore) => (x.dead ? x.holding : x.score), desc(cmpNum)],
    [(x: PersonScore) => idNumber(x.character.id), cmpNum],
  );
};

P.finalScores = function () {
  return this.scoreboard()
    .filter((x) => x.power !== null)
    .map((x) => ({ power: x.power!, score: x.score, size: x.size, performance: x.performance }));
};

/** Who a person is on the scoreboard: a reigning king by his realm, anyone else by name, origin and standing. */
function who(x: PersonScore): string {
  return x.power === null ? `${nameFrom(x.character)} (${wealthStanding(x.character)})` : `${x.character.name}, ${rulerStyle(x.power)} of ${powerName(x.power)}`;
}

/** One person's place in the end's line: "1. Akhenaten, Great King of Egypt 0.64" or "40. Mane of Thebes (dead) held 12". */
export function placing(x: PersonScore, i: number): string {
  return `${i + 1}. ${who(x)} ${x.dead ? `held ${x.holding}` : fmt(x.score, "0.00")}`;
}

/**
 * One person's line on the scoreboard, with what he holds and how it was measured: "Mane of Thebes (serving Egypt): 0.41
 * (holds 312, size 0.06, performance 0.43; purse 280, hoard 32; fees 250, skimmed 30)".
 */
export function boardLine(x: PersonScore): string {
  if (x.dead) return `${who(x)}: held ${x.holding} when he died`;
  const gold = x.power !== null ? "" : `; purse ${x.character.purse}, hoard ${x.holding - x.character.purse}; ${wealthSources(x.character.earned)}`;
  return `${who(x)}: ${fmt(x.score, "0.00")} (holds ${Math.round(x.holding)}, size ${fmt(x.size, "0.00")}, performance ${fmt(x.performance, "0.00")}${gold})`;
}

P.decideWinners = function () {
  const S = this.s;
  const board = this.scoreboard();
  const living = board.filter((x) => !x.dead);
  if (living.length === 0) {
    S.winners = [];
    return;
  }
  // One true winner, the highest score on the board: a king's realm, or a character by his name and where he is from.
  const best = living[0];

  if (S.config.sharedVictory) {
    const score = new Dict(living.filter((x) => x.power !== null).map((x) => [x.power!, x.score] as const));
    let bestPair: [Power, Power, number] | null = null;
    for (const t of S.tablets.filter((t) => t.allianceOath && isSealedAgreement(t))) {
      const a = t.proposedBy;
      const b = t.partner!;
      if (!score.has(a) || !score.has(b)) continue;
      // The pair's score together: each partner's, weighed by its starting strength, against every other living person's.
      const start = S.startStrength.get(a) + S.startStrength.get(b);
      const combined = (score.get(a) * S.startStrength.get(a) + score.get(b) * S.startStrength.get(b)) / start;
      const others = living.filter((x) => x.power !== a && x.power !== b).map((x) => x.score);
      const rivals = others.length === 0 ? 0 : max(others, (x) => x);
      if (combined > rivals && (bestPair === null || combined > bestPair[2])) bestPair = [a, b, combined];
    }
    if (bestPair !== null) {
      S.winners = [bestPair[0], bestPair[1]];
      logEvent(S, "shared-victory", `${bestPair[0]} and ${bestPair[1]} share the victory under their sworn alliance (score together ${fmt(bestPair[2], "0.00")}).`, null, "shared-victory");
      return;
    }
  }
  S.winners = [best.power ?? nameFrom(best.character)];
};
