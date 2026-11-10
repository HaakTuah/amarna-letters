/**
 * #806 (the owner, 9 November 2026: holding a king forever is measured in item 18, not ruled against): the kings held
 * captive while their courts knew it, how long, and how it ended for each by the age's end (home, dead, or still held);
 * and the letters they wrote from captivity, sent through the captor, smuggled by a spy of theirs, or kept.
 */
import { AllPowers, fmt, heldKing, isAlive, sum, type GameState } from "@amarna/engine";

/** One game's captive kings. */
export interface HeldMeasure {
  /** For each king held: the seasons held, and how it stood at the end ("held", "home", "dead"). */
  kings: [number, string][];
  /** Letters from captivity: sent through the captor, smuggled out, kept by the captor. */
  letters: [number, number, number];
  /** Kings who got away, and of them those a spy of theirs helped. */
  escapes: [number, number];
  /** Of the seasons kings were held, those their captor kept watchmen; and the words home giving in (land, troops, an envoy). */
  guarded: number;
  gaveIn: number;
}

/** Watches a game season by season for the kings held. */
export class HeldWatch {
  private readonly seasons = new Map<string, number>();
  private guarded = 0;

  /** Read once a season is played, when its watchmen still stand (`GameState.counterIntel`). */
  season(s: GameState): void {
    for (const p of AllPowers) {
      const k = isAlive(s, p) ? heldKing(s, p) : null;
      if (k === null) continue;
      this.seasons.set(k.id, (this.seasons.get(k.id) ?? 0) + 1);
      if (k.heldBy !== null && s.counterIntel.getOrDefault(k.heldBy, 0) > 0) this.guarded++;
    }
  }

  end(s: GameState): HeldMeasure {
    const kings: [number, string][] = [...this.seasons.entries()].map(([id, n]) => {
      const c = s.characters.find((x) => x.id === id);
      return [n, c === undefined || c.status === "Dead" ? "dead" : c.status === "Captured" ? "held" : "home"];
    });
    const count = (signal: string): number => s.events.filter((e) => e.signal === signal).length;
    return { kings, letters: [count("captive-letter-sent"), count("captive-letter-smuggled"), count("captive-letter-kept")], escapes: [count("king-escapes") + count("king-escapes-aided"), count("king-escapes-aided")], guarded: this.guarded, gaveIn: count("king-gave-in") };
  }
}

/** The batch's lines: how long kings were held, and whether any was held to the end. */
export function heldReport(games: readonly HeldMeasure[]): string[] {
  const kings = games.flatMap((g) => g.kings);
  if (kings.length === 0) return games.length === 0 ? [] : ["Captive kings (#806): none held while their courts knew it."];
  const long = [...kings].map(([n]) => n).sort((a, b) => a - b);
  const of = (end: string): number => kings.filter(([, e]) => e === end).length;
  return [
    `Captive kings (#806): ${kings.length} held while their courts knew it, in ${games.filter((g) => g.kings.length > 0).length} of ${games.length} games; ` +
      `held ${fmt(sum(long, (n) => n) / long.length, "0.0")} seasons on average, the median ${long[Math.floor(long.length / 2)]}, the longest ${long[long.length - 1]}; ` +
      `at the age's end ${of("home")} free again, ${of("dead")} dead, ${of("held")} still held. ` +
      `Letters from captivity: ${sum(games, (g) => g.letters[0])} sent through the captor, ${sum(games, (g) => g.letters[1])} smuggled out by a spy, ${sum(games, (g) => g.letters[2])} kept by the captor. ` +
      `Kings who got away: ${sum(games, (g) => g.escapes[0])}, ${sum(games, (g) => g.escapes[1])} of them helped by a spy of theirs; ` +
      `seasons held under his captor's watchmen: ${sum(games, (g) => g.guarded)} of ${sum(long, (n) => n)}; words home giving in: ${sum(games, (g) => g.gaveIn)}.`,
  ];
}
