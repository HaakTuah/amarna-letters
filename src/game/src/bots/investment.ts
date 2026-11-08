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
import { HostilityFloor, warOdds, type Brain } from "./brain.ts";

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
 * What a season of `x`'s hostility costs us, a point of it: the chance it brings an attack (`attackPerHostility`), weighed
 * by his troops against ours as his own war choice weighs them (`warOdds`), times what an attack takes of what of ours he
 * can reach (`risk`, {@link atRisk}).
 */
function lossPerHostility(b: Board, brain: Brain, x: Power, risk: number): number {
  const d = InvestData;
  return d.attackPerHostility * warOdds(brain.force(x, b), b.mine.length) * d.lostIfAttacked * risk;
}

/**
 * The shekels a gift of `gold` to `x` is worth to us over the seasons left: the attacks it makes less likely. `effect`
 * scales its warmth (1 for gold in his hand), and the king's own belief in goodwill ({@link goodwillOf}) scales it again.
 * A gift cools no more than the receiver's hostility, as we reckon it, has left to fall (`Brain.hostility`, never below
 * `HostilityFloor`): a king who means us no harm is not made safer by gold.
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
  return cooled * kept * lossPerHostility(b, brain, x, risk);
}

/**
 * What a vassal's tribute to `over` buys over the seasons left ("tribute buys peace"): an overlord who is paid never makes
 * war on us (`bondWar`), one who is not may, as hostile as we reckon him without the bond; and his troops stand between us
 * and another king who threatens us, by his troops against that king's. Nothing, if he attacked us within `year` seasons
 * all the same. How much a vassal believes his sealed word is worth is his own: an honest one counts it from half again
 * (the most honest) down to half (the least).
 */
export function tributeReturn(b: Board, brain: Brain, over: Power, year: number): number {
  if (brain.rel.get(over).lastAttackedUs >= b.v.turn - year) return 0;
  const seasons = Math.max(1, b.horizon);
  const peace = brain.hostility(over, b) * lossPerHostility(b, brain, over, atRisk(b, over));
  let shield = 0;
  for (const x of b.alive) {
    if (x === b.me || x === over) continue;
    const share = Math.min(1, warOdds(brain.force(over, b), brain.force(x, b)));
    shield = Math.max(shield, share * brain.hostility(x, b) * lossPerHostility(b, brain, x, atRisk(b, x)));
  }
  return (peace + shield) * seasons * (0.5 + brain.p.honesty);
}

/** The gift to `x` that returns most beyond its cost, at most `spare`; 0 when none returns more than it costs. */
export function bestGift(
  b: Board,
  brain: Brain,
  x: Power,
  spare: number,
  effect = 1,
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
    const net = giftReturn(b, brain, x, g, effect, risk) - g;
    if (net > gain) [best, gain] = [g, net];
  }
  return best;
}
