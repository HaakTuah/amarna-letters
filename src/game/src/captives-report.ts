/**
 * #806 (the owner, 9 November 2026: holding a king forever is measured in item 18, not ruled against): the kings held
 * captive while their courts knew it, how long, and how it ended for each by the age's end (home, dead, or still held);
 * and the letters they wrote from captivity, sent through the captor, smuggled by a spy of theirs, or kept.
 */
import { AllPowers, fmt, heldKing, isAlive, sum, type GameState, type Power } from "@amarna/engine";

/** Held this many seasons or more, or still held at the end: held long, for the measure of holding a king forever. */
export const HeldLong = 12;

/** One game's captive kings. */
export interface HeldMeasure {
  /** For each king held: the seasons held, and how it stood at the end ("held", "home", "dead"). */
  kings: [number, string][];
  /**
   * F2 of item 18 (whether holding a king forever pays): for each king held long ({@link HeldLong}), his realm's standing
   * against par at the end and his last captor's (1 is par; a realm fallen ranks below every one that lives); and
   * the mean standing of every realm.
   */
  long?: [number, number][];
  /** The same for kings held less long and free again at the end, to set beside them (captors are war's winners). */
  brief?: [number, number][];
  standing?: number;
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
  private readonly realms = new Map<string, [Power, Power]>();
  private guarded = 0;

  /** Read once a season is played, when its watchmen still stand (`GameState.counterIntel`). */
  season(s: GameState): void {
    for (const p of AllPowers) {
      const k = isAlive(s, p) ? heldKing(s, p) : null;
      if (k === null) continue;
      this.seasons.set(k.id, (this.seasons.get(k.id) ?? 0) + 1);
      if (k.heldBy !== null) this.realms.set(k.id, [p, k.heldBy]);
      if (k.heldBy !== null && s.counterIntel.getOrDefault(k.heldBy, 0) > 0) this.guarded++;
    }
  }

  /** The game's measure, with each realm's standing against par at the end. */
  end(s: GameState, standing: (p: Power) => number): HeldMeasure {
    const long: [number, number][] = [];
    const brief: [number, number][] = [];
    const kings: [number, string][] = [...this.seasons.entries()].map(([id, n]) => {
      const c = s.characters.find((x) => x.id === id);
      const end = c === undefined || c.status === "Dead" ? "dead" : c.status === "Captured" ? "held" : "home";
      const r = this.realms.get(id);
      if (r !== undefined && (n >= HeldLong || end === "held")) long.push([standing(r[0]), standing(r[1])]);
      else if (r !== undefined && end === "home") brief.push([standing(r[0]), standing(r[1])]);
      return [n, end];
    });
    const count = (signal: string): number => s.events.filter((e) => e.signal === signal).length;
    return { kings, long, brief, standing: sum(AllPowers, standing) / AllPowers.length, letters: [count("captive-letter-sent"), count("captive-letter-smuggled"), count("captive-letter-kept")], escapes: [count("king-escapes") + count("king-escapes-aided"), count("king-escapes-aided")], guarded: this.guarded, gaveIn: count("king-gave-in") };
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
    ...heldLongLine(games),
  ];
}

/** Whether holding a king long pays: where the held realms and their captors stood against par at the end. */
function heldLongLine(games: readonly HeldMeasure[]): string[] {
  const long = games.flatMap((g) => g.long ?? []);
  const brief = games.flatMap((g) => g.brief ?? []);
  const measured = games.filter((g) => g.standing !== undefined);
  if (long.length === 0 || measured.length === 0) return [];
  const kings = (n: number): string => `${n} king${n === 1 ? "" : "s"}`;
  const at = (xs: [number, number][], i: number): string => fmt(sum(xs, (x) => x[i]) / Math.max(1, xs.length), "0.00");
  return [
    `Held long (${HeldLong} seasons or more, or to the end): ${kings(long.length)}; at the end their realms stood at ${at(long, 0)} against par and their captors at ${at(long, 1)}; ` +
      `held less long and free again: ${kings(brief.length)}, their realms at ${at(brief, 0)} and their captors at ${at(brief, 1)}; every realm at ${fmt(sum(measured, (g) => g.standing!) / measured.length, "0.00")} (1 is par).`,
  ];
}
