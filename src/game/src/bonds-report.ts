/**
 * Item 18, part F3 (item 11+ asks whether kings build vassal networks as well as conquer): the provinces overlords took
 * from their own vassals, each marked by whether the vassal was paying its tribute when it was taken (tribute delivered
 * within {@link Paying} seasons), to show whether a vassal's belief that a paid overlord spares it holds.
 */
import { fmt, vassalTerms, type GameState, type Power } from "@amarna/engine";

/** Tribute delivered this many seasons before or less: the vassal counts as paying (a year and the road's grace). */
export const Paying = 5;

/** One province an overlord took from its own vassal: the vassal, the overlord, and whether the vassal was paying. */
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
      if (before === null || now === null || before === now || !bound(s, before, now)) continue;
      const paying = s.trails.some(
        (t) =>
          t.from === before &&
          t.to === now &&
          t.goldDelivered > 0 &&
          t.audienceTurn !== null &&
          t.audienceTurn >= s.turn - Paying &&
          t.clauses.some((c) => c.kind === "tribute"),
      );
      this.taken.push([before, now, paying]);
    }
  }
}

/** Whether a sealed vassal tablet, not repudiated, binds `vassal` to `overlord`. */
function bound(s: GameState, vassal: Power, overlord: Power): boolean {
  return s.tablets.some((t) => {
    if (t.vassal !== vassal || t.seals.length < 2 || t.repudiatedTurn !== null) return false;
    const v = vassalTerms({ id: t.id, vassal: t.vassal, proposedBy: t.proposedBy, partner: t.partner, clauses: t.clauses, sealedTurn: t.sealedTurn });
    return v !== null && v.overlord === overlord;
  });
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
    `Vassals taken by their own overlords (item 18, F3): ${count(true, null)} provinces of vassals paying tribute${split(true)}, of ${vassals} vassals in ${new Set(paid.map(([g]) => g)).size} of ${games.length} games; ${count(false, null)} of vassals in arrears${split(false)}; ${fmt(paid.length / games.length, "0.0")} paying provinces a game.`,
  ];
}
