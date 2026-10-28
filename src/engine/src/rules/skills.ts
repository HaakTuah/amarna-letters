/**
 * Skills and how a character sees them (build order item 10): "Kings never see skills", "Seeing oneself" and "A name made of
 * outcomes". The engine rolls on the true skills; the character believes its own through a hidden inclination, and that
 * belief moves with what happens to it; a court knows only what it was told (claims) and what it saw happen (outcomes).
 */
import { clamp } from "../core/num.ts";
import { Rng } from "../core/rng.ts";
import { newSkills, SkillValues, type Character, type Skill, type Skills } from "../model/people.ts";

/** How far a belief moves for an outcome that surprised it: skill points per unit of probability. */
export const BeliefStep = 20;
/** The share of the inclination that never goes ("the overconfident stay a little overconfident"). */
export const InclinationKept = 0.3;

/**
 * Draws a character's skills around its competence (each within 20 points of it), and its inclination: most roughly right,
 * some over- or underestimating themselves by up to about 30 points. From its own stream, keyed by the character, so no
 * other draw changes.
 */
export function drawSkills(seed: number, c: Character): void {
  const rng = Rng.for(seed, 0, "skills", c.id);
  const around = (): number => clamp(c.traits.competence + rng.range(-20, 20), 5, 99);
  c.skills = newSkills({ gather: around(), stealth: around(), forge: around() });
  // The sum of three small draws: mostly near nothing, now and then far out.
  c.inclination = rng.range(-10, 10) + rng.range(-10, 10) + rng.range(-10, 10);
  c.belief = newSkills();
  for (const k of SkillValues) c.belief[k] = clamp(c.skills[k] + c.inclination, 0, 100);
}

/**
 * What happened when the engine rolled on one of a character's skills (`p`: the chance of success the roll had, as the
 * engine computed it from the true skill; `succeeded`: how it went). The character judges the outcome against what it
 * expected from its belief, and its belief moves by the surprise. Over many outcomes the belief settles where what it
 * expects matches what happens, which is the true skill plus the part of its inclination that never goes; a run of luck
 * misleads it. `chanceAt`: the roll's chance for a given skill, so that the belief is judged by the same formula.
 */
export function learn(c: Character, skill: Skill, succeeded: boolean, chanceAt: (skill: number) => number): void {
  const expected = clamp(chanceAt(c.belief[skill] - InclinationKept * c.inclination), 0, 1);
  const moved = c.belief[skill] + BeliefStep * ((succeeded ? 1 : 0) - expected);
  c.belief[skill] = Math.round(clamp(moved, 0, 100));
}

/** What a character says it can do when it pitches: what it believes, and more for one who lies about himself. */
export function claimOf(c: Character): Skills {
  const t = c.traits;
  // A dishonest man (loyal mostly to himself and fond of gold) talks himself up beyond even what he believes.
  const boast = t.loyalty < 40 && t.greed > 60 ? 15 : 0;
  const out = newSkills();
  for (const k of SkillValues) out[k] = clamp(c.belief[k] + boast, 0, 100);
  return out;
}

/** Where a claim chosen as a band's words stands (item 10+b): the middle of each band, as {@link skillWords} draws them. */
export const BandValues = [20, 47, 70, 90] as const;

/** A claim a mind chose, each skill kept within 0 to 100. */
export function clampSkills(k: Skills): Skills {
  const out = newSkills();
  for (const x of SkillValues) out[x] = Math.round(clamp(k[x] ?? 0, 0, 100));
  return out;
}

/** A skill's band in words, after "can", as a claim, a belief or a rulebook says it: never a number. */
export const SkillBands: Record<Skill, [string, string, string, string]> = {
  gather: ["notice little", "notice what is in plain view", "see what a court hides", "miss nothing at a court"],
  stealth: ["seldom pass unnoticed", "pass unnoticed with luck", "slip past most guards", "slip past any guard"],
  forge: ["hardly copy a hand", "copy a hand badly", "fake a seal that passes a casual eye", "fake a seal that fools a court's examiners"],
};

export function skillWords(skill: Skill, value: number): string {
  const b = SkillBands[skill];
  return value >= 80 ? b[3] : value >= 60 ? b[2] : value >= 35 ? b[1] : b[0];
}

/** A claim as a court reads it: "says they can see what a court hides", one for each skill. */
export function claimWords(claim: Skills): string[] {
  return SkillValues.map((k) => `says they can ${skillWords(k, claim[k])}`);
}

/** A belief as its holder's request gives it: "you believe you can …", never as fact. */
export function beliefWords(belief: Skills): string {
  return SkillValues.map((k) => `you believe you can ${skillWords(k, belief[k])}`).join("; ");
}
