/**
 * How much happens (item 17++a, "something happens every season"; the owner, 2 November 2026: "Still feel like almost
 * nothing has happened in a game now that went to 50 seasons"). Season by season and power by power, the events that change
 * something a seat could hear of: a province changing hands, a battle or siege, a revolt, a treaty sealed or broken, a
 * character rising, falling, defecting or dying, a disaster, gold, grain or men moved in earnest. Counted twice: as they
 * reach each Great King (the event is visible to him), and as they happen anywhere, so the gap shows events that happen but
 * never reach a seat.
 */
import { GreatKings, type GameState } from "@amarna/engine";

/** Event kinds that change who holds land: a change of the map. */
export const MapKinds: ReadonlySet<string> = new Set(["conquest", "obey", "cession", "revolt", "rise", "fall", "sack", "defect"]);

/** Event kinds worth a letter: the map's, and battles, sieges, treaties, men's fates, disasters, and wealth moved in earnest. */
export const LetterKinds: ReadonlySet<string> = new Set([
  ...MapKinds,
  "battle", "siege", "landing", "tablet", "recognition", "crown", "declare", "rising", "mutiny",
  "death", "execution", "defection", "captive", "spy-caught", "forgery-exposed", "double-agent",
  "catastrophe", "famine", "hunger", "ship-lost", "refugees", "deport",
  "caravan-robbed", "caravan-taken", "gift", "gift-unit", "loan",
]);

/** One game's pulse. */
export interface Pulse {
  /** Each Great King's share of the seasons he lived through that brought him an event worth a letter, in a hundred. */
  letter: Record<string, number>;
  /** Each Great King's seasons alive per season that brought him a change of the map (the seasons between them). */
  mapEvery: Record<string, number>;
  /** The share of seasons with an event worth a letter anywhere, and with a change of the map anywhere, in a hundred. */
  worldLetter: number;
  worldMap: number;
  /** Of the events worth a letter, how many in a hundred reached no seat at all. */
  unseen: number;
}

export function pulseOf(s: GameState): Pulse {
  const last = s.turn;
  const seasons = Array.from({ length: Math.max(0, last) }, (_, i) => i + 1);
  const worth = s.events.filter((e) => LetterKinds.has(e.kind) && e.turn >= 1 && e.turn <= last);
  const letter: Record<string, number> = {};
  const mapEvery: Record<string, number> = {};
  for (const p of GreatKings) {
    // The seasons he lived through: to the season he fell, if he fell.
    const fell = s.falls.find((f) => f.power === p)?.turn ?? null;
    const lived = seasons.filter((t) => fell === null || t <= fell);
    if (lived.length === 0) continue;
    const heard = (kinds: ReadonlySet<string>): number => lived.filter((t) => worth.some((e) => e.turn === t && kinds.has(e.kind) && e.visibleTo.includes(p))).length;
    letter[p] = Math.round((100 * heard(LetterKinds)) / lived.length);
    mapEvery[p] = Math.round((10 * lived.length) / Math.max(1, heard(MapKinds))) / 10;
  }
  const any = (kinds: ReadonlySet<string>): number => seasons.filter((t) => worth.some((e) => e.turn === t && kinds.has(e.kind))).length;
  return {
    letter,
    mapEvery,
    worldLetter: seasons.length === 0 ? 0 : Math.round((100 * any(LetterKinds)) / seasons.length),
    worldMap: seasons.length === 0 ? 0 : Math.round((100 * any(MapKinds)) / seasons.length),
    unseen: worth.length === 0 ? 0 : Math.round((100 * worth.filter((e) => e.visibleTo.length === 0).length) / worth.length),
  };
}

/**
 * The first-guess target (item 17++a's report): most seasons bring each Great King an event of his own worth a letter, and
 * every few seasons one that changes the map.
 */
export const PulseTarget = { letter: 60, mapEvery: 4 } as const;

/** The batch's line: the pulse over every game, against the target. */
export function pulseReport(pulses: readonly Pulse[]): string {
  if (pulses.length === 0) return "";
  const mean = (xs: number[]): number => (xs.length === 0 ? 0 : Math.round((10 * xs.reduce((a, x) => a + x, 0)) / xs.length) / 10);
  const kings = GreatKings.map((p) => `${p} ${mean(pulses.flatMap((x) => (p in x.letter ? [x.letter[p]] : [])))}% / ${mean(pulses.flatMap((x) => (p in x.mapEvery ? [x.mapEvery[p]] : [])))}`).join(", ");
  return [
    `The pulse (target: an event worth a letter in ${PulseTarget.letter}% of a Great King's seasons, a change of the map every ${PulseTarget.mapEvery} seasons or fewer):`,
    `  heard by each Great King (letter seasons / seasons per map change): ${kings}`,
    `  anywhere: a letter's worth in ${mean(pulses.map((x) => x.worldLetter))}% of seasons, a map change in ${mean(pulses.map((x) => x.worldMap))}%; ${mean(pulses.map((x) => x.unseen))}% of the letter-worthy events reached no seat`,
  ].join("\n");
}
