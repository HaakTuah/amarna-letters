/**
 * Gold sent abroad as an investment (item 18, part E; "Gold is a lifeline": "nobody hands gold out unless he believes it
 * buys a greater benefit on average, over a time he can name ... script kings judge gifts and bribes the same way, as
 * investments with an expected return, rather than by a generosity threshold"). A script king pictures the receiver as a
 * court like his own: gold weighed at an audience warms its king's trust in the giver (`Brain`'s audiences: a shekel buys
 * `trustPerShekel`, at most `trustMost`), trust cools his hostility (`Brain.hostility`: `hostilityPerTrust` a point), and
 * trust fades back by `trustFades` a season. Less hostility is a smaller chance each season that he marches on what of
 * ours lies within his reach, and the gift is worth that over the seasons the king believes are left (`Board.horizon`),
 * against its cost: the same shekels off his own score. A gift that returns less than it costs is not sent, so gifts stop
 * as the omens darken. How much a king believes goodwill is worth is his own: a generous king counts a gift's warmth for
 * half as much again as a middling one, a stingy one for half ({@link goodwillOf}). First guesses: a season's chance of an attack is `attackPerHostility` of his hostility, and an
 * attack takes `lostIfAttacked` of what it reaches.
 */
import { Board } from "./board.ts";
import type { Power } from "@amarna/engine";
import type { Personality } from "./personality.ts";
import { HostilityFloor, type Brain } from "./brain.ts";

/** Whether a king gives gifts at all; off only to measure what they are worth (`--gift-play-half`). */
export const GiftPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

export const InvestData = {
  trustPerShekel: 1 / 400,
  trustMost: 0.25,
  hostilityPerTrust: 0.3,
  trustFades: 0.05,
  attackPerHostility: 0.1,
  lostIfAttacked: 0.5,
  /** What a bribe buys of a gift's warmth: the envoy's good word in his report, not gold in his king's hand. */
  bribeEffect: 0.25,
  /** The amounts weighed, in steps of ten up to the most a gift can warm (`trustMost` / `trustPerShekel`). */
  step: 10,
} as const;

/** How much a king believes his gifts warm their receivers, from his generosity (0 to 1): from half to half as much again. */
export const goodwillOf = (p: Personality): number => 0.5 + p.generosity;

/** What of ours `x` could reach: our provinces next to his land or his troops, by what each adds to our score. */
export function atRisk(b: Board, x: Power): number {
  const near = new Set<string>();
  for (const [id, o] of b.v.owner.entries())
    if (o === x) for (const n of Board.Map.neighbors(id)) near.add(n);
  for (const u of b.others)
    if (u.power === x)
      for (const n of [u.province, ...Board.Map.neighbors(u.province)])
        near.add(n);
  let v = 0;
  for (const id of near) if (b.isMine(id)) v += b.worth(id);
  return v;
}

/**
 * The shekels a gift of `gold` to `x` is worth to us over the seasons left: the attacks it makes less likely. `effect`
 * scales its warmth (1 for gold in his hand), and the king's own belief in goodwill ({@link goodwillOf}) scales it again.
 * A gift cools no more than his hostility has left to fall (`Brain.hostility`, never below `HostilityFloor`): a king
 * who means us no harm is not made safer by gold.
 */
export function giftReturn(
  b: Board,
  brain: Brain,
  x: Power,
  gold: number,
  effect = 1,
  risk = atRisk(b, x),
): number {
  const d = InvestData;
  const cooled = Math.min(
    Math.max(0, brain.hostility(x, b) - HostilityFloor),
    d.hostilityPerTrust *
      Math.min(d.trustMost, gold * d.trustPerShekel) *
      effect *
      goodwillOf(brain.p),
  );
  const seasons = Math.max(1, b.horizon);
  const kept = (1 - (1 - d.trustFades) ** seasons) / d.trustFades;
  return d.attackPerHostility * cooled * kept * d.lostIfAttacked * risk;
}

/**
 * What a shekel given to `x` costs us in the race for first place: the shekel off our score, and the same shekel on his,
 * which counts for as much more as he has less to grow from (his start against ours) and as he is a rival for the lead
 * (his growth's share of his and ours). A small king's tribute to a great one costs little more than its gold; a great
 * king's gift to an equal who is ahead of him nearly twice.
 */
export function giftCost(b: Board, x: Power): number {
  const mine = b.growth(b.me);
  const his = b.growth(x);
  const race = mine + his > 0 ? his / (mine + his) : 0;
  return 1 + (b.startStrength(b.me) / b.startStrength(x)) * race;
}

/** The gift to `x` that returns most beyond its cost (`rivalry` a shekel; 1 for gold that goes to his envoy, not to him), at most `spare`; 0 when none returns more than it costs. */
export function bestGift(
  b: Board,
  brain: Brain,
  x: Power,
  spare: number,
  effect = 1,
  rivalry = giftCost(b, x),
): number {
  if (!GiftPlay.on(b.me)) return 0;
  const d = InvestData;
  const risk = atRisk(b, x);
  let best = 0;
  let gain = 0;
  for (
    let g = d.step;
    g <= Math.min(spare, d.trustMost / d.trustPerShekel);
    g += d.step
  ) {
    const net = giftReturn(b, brain, x, g, effect, risk) - g * rivalry;
    if (net > gain) [best, gain] = [g, net];
  }
  return best;
}
