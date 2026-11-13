/**
 * Item 18, part F3 (item 11+ asks whether kings build vassal networks as well as conquer): the provinces overlords took
 * from their own vassals, each marked by whether the vassal was in arrears when it was taken ({@link inGoodStanding}), to
 * show whether a vassal's belief that a paid overlord spares it holds.
 */
import { fmt, vassalTerms, type GameState, type Power, type VassalTerms } from "@amarna/engine";

/** Tribute delivered this many seasons before or less: the vassal counts as paying (a year and the road's grace). */
export const Paying = 5;

/**
 * Whether a vassal is in good standing, as a script overlord reckons arrears (`inArrears` in `bots/vassals.ts`): it owes
 * no tribute, its tablet was sealed too lately for the first to be due, or tribute came within {@link Paying} seasons
 * (`lastPaid`, the season it last came, or null).
 */
export function inGoodStanding(bond: VassalTerms, lastPaid: number | null, turn: number): boolean {
  return bond.tribute <= 0 || turn - Math.max(bond.sealedTurn, lastPaid ?? bond.sealedTurn) <= Paying;
}

/** One province an overlord took from its own vassal: the vassal, the overlord, and whether the vassal was in good standing. */
export type BondTake = [Power, Power, boolean];

/** Watches a game season by season for provinces taken by a vassal's own overlord. */
export class BondWatch {
  private readonly last = new Map<string, Power | null>();
  readonly taken: BondTake[] = [];

  constructor(s: GameState) {
    for (const [k, o] of s.owner.entries()) this.last.set(k, o);
  }

  /** Read once a season is played. */
  season(s: GameState): void {
    for (const [k, now] of s.owner.entries()) {
      const before = this.last.get(k) ?? null;
      this.last.set(k, now);
      const bond = before === null || now === null || before === now ? null : bound(s, before, now);
      if (bond === null) continue;
      let lastPaid: number | null = null;
      for (const t of s.trails)
        if (t.from === before && t.to === now && t.goldDelivered > 0 && t.audienceTurn !== null && t.clauses.some((c) => c.kind === "tribute"))
          lastPaid = Math.max(lastPaid ?? t.audienceTurn, t.audienceTurn);
      this.taken.push([before!, now!, inGoodStanding(bond, lastPaid, s.turn)]);
    }
  }
}

/** The terms of a sealed vassal tablet, not repudiated, that binds `vassal` to `overlord`, or null. */
function bound(s: GameState, vassal: Power, overlord: Power): VassalTerms | null {
  for (const t of s.tablets) {
    if (t.vassal !== vassal || t.seals.length < 2 || t.repudiatedTurn !== null) continue;
    const v = vassalTerms({ id: t.id, vassal: t.vassal, proposedBy: t.proposedBy, partner: t.partner, clauses: t.clauses, sealedTurn: t.sealedTurn });
    if (v !== null && v.overlord === overlord) return v;
  }
  return null;
}

/**
 * The batch's line: provinces of paying vassals and of vassals in arrears taken by their own overlords; with `side`
 * (the use-against-ignore runs), split by the overlord's side as "current / baseline".
 */
export function bondReport(games: readonly (readonly BondTake[])[], side: ((g: number, p: Power) => boolean) | null = null): string[] {
  if (games.length === 0) return [];
  const all = games.flatMap((t, g) => t.map((x) => [g, ...x] as const));
  const count = (paying: boolean, current: boolean | null): number =>
    all.filter(([g, , o, p]) => p === paying && (current === null || side === null || side(g, o) === current)).length;
  const paid = all.filter(([, , , p]) => p);
  const vassals = new Set(paid.map(([g, v]) => `${g}:${v}`)).size;
  const split = (paying: boolean): string => (side === null ? "" : ` (by overlords on the current side ${count(paying, true)}, the baseline ${count(paying, false)})`);
  return [
    `Vassals taken by their own overlords (item 18, F3): ${count(true, null)} provinces of vassals paying tribute or not yet due${split(true)}, of ${vassals} vassals in ${new Set(paid.map(([g]) => g)).size} of ${games.length} games; ${count(false, null)} of vassals in arrears${split(false)}; ${fmt(paid.length / games.length, "0.0")} paying provinces a game.`,
  ];
}
