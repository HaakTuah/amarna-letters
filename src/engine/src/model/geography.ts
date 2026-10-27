/** The ground of a land province. Sea zones are not given one. */
export const TerrainValues = ["Open", "Rough", "Desert"] as const;
export type Terrain = (typeof TerrainValues)[number];

/** What makes a connection between two provinces hard to cross: a mountain pass, a great river at a ford or ferry town, or the desert. */
export const CrossingKindValues = ["Mountain", "River", "Desert"] as const;
export type CrossingKind = (typeof CrossingKindValues)[number];

/** A connection that crosses a mountain pass, a great river or the desert, by its name. */
export interface Crossing {
  readonly a: string;
  readonly b: string;
  readonly kind: CrossingKind;
  readonly name: string;
}

export function joins(c: Crossing, a: string, b: string): boolean {
  return (c.a === a && c.b === b) || (c.a === b && c.b === a);
}

/**
 * A great river: the provinces it runs through as their spine, from its source to its mouth ("A border or a spine"). Where
 * it was a frontier it runs between provinces instead, and is crossed at a ford or ferry town ({@link Crossings}). Its
 * waters carry boats in reaches, each a run of the course a boat can sail without unloading: the Nile's cataracts break it,
 * and the Euphrates carries boats only below Carchemish (boats on the rivers sail with travel, in item 7b).
 */
export interface River {
  readonly id: string;
  readonly name: string;
  readonly course: readonly string[];
  readonly reaches: readonly (readonly string[])[];
}

/** What the ground gives a defender against one attack: rough ground, a pass or a river. */
export const GroundKindValues = ["Rough", "Pass", "River"] as const;
export type GroundKind = (typeof GroundKindValues)[number];

/**
 * The ground that helps a unit standing its ground against one attack ({@link defenceGround}): its kind, and the province
 * (rough ground) or the crossing's name. {@link groundText} says it as the battle report does.
 */
export interface Ground {
  readonly kind: GroundKind;
  readonly name: string;
}

/** "the rough ground of mira", "the Cilician Gates, a mountain pass", "the crossing of the Euphrates at Carchemish". */
export function groundText(g: Ground): string {
  switch (g.kind) {
    case "Rough":
      return `the rough ground of ${g.name}`;
    case "Pass":
      return `${g.name}, a mountain pass`;
    default:
      return `the crossing of ${g.name}`;
  }
}

/**
 * Terrain as map data, per province and per connection, from the lists decided in the sleep-and-simulation round
 * (`docs/rounds/2026-10-18-sleep-and-simulation.md`: question 5, plan steps 14 and 15; question 10, plan step 2), given
 * its effects by the siege package (item 5): rough ground, a pass or a great river on the connection an attack comes
 * over (and until item 7a a landing from the sea) give a unit that stands its ground GameConfig.terrainDefence more, at most that in all
 * ({@link defenceGround}); an army that ends a season in desert land its king did not hold pays GameConfig.desertUpkeep
 * for supplies. No rule names a power: Egypt crosses the Sinai freely because it holds it, and so does anyone who takes it.
 */
export const Rough: readonly string[] = ["mira", "lukka", "isuwa", "amurru", "arbela", "kalavasos", "shechem", "jerusalem", "kaska"];

/** Desert provinces (question 5, plan step 15: the Sinai; the Sutean steppe since item 7a). An army in its own land pays no desert cost. */
export const Desert: readonly string[] = ["sinai", "steppe"];

const crossing = (a: string, b: string, kind: CrossingKind, name: string): Crossing => ({ a, b, kind, name });

/**
 * The mountain, river and desert crossings (question 5, plan step 14; the map review of item 7a, from the geography
 * dossier's "Terrain by connection"). A pass or a river gives a unit standing its ground help ({@link defenceGround}); the
 * desert gives none, and makes the connection long ({@link connectionDays}). A great river is drawn between provinces where
 * it was a frontier, crossed at its fords and ferry towns, and runs through them as their spine elsewhere ({@link Rivers}).
 */
export const Crossings: readonly Crossing[] = [
  crossing("tuwanuwa", "kizzuwatna", "Mountain", "the Cilician Gates"),
  crossing("nesa", "kizzuwatna", "Mountain", "the Taurus"),
  crossing("nesa", "carchemish", "Mountain", "the Anti-Taurus"),
  crossing("kizzuwatna", "carchemish", "Mountain", "the Amanus"),
  crossing("kizzuwatna", "alalakh", "Mountain", "the Syrian Gates"),
  crossing("byblos", "damascus", "Mountain", "the Lebanon"),
  crossing("sidon", "damascus", "Mountain", "the Lebanon"),
  crossing("carchemish", "harran", "River", "the Euphrates at Carchemish"),
  crossing("aleppo", "harran", "River", "the Euphrates at Emar"),
  crossing("isuwa", "harran", "River", "the upper Euphrates"),
  crossing("taidu", "nineveh", "River", "the Tigris"),
  crossing("suhu", "steppe", "Desert", "the Syrian desert"),
  crossing("steppe", "qatna", "Desert", "the Syrian desert"),
  crossing("steppe", "damascus", "Desert", "the Syrian desert"),
  crossing("delta", "gaza", "Desert", "the Ways of Horus"),
  crossing("gaza", "sinai", "Desert", "the north Sinai"),
  crossing("jerusalem", "sinai", "Desert", "the Negev"),
];

/** The ordered courses of the great rivers, source to mouth (question 10, plan step 2; Nubia since item 7a), and their reaches. */
export const Rivers: readonly River[] = [
  { id: "nile", name: "Nile", course: ["nubia", "thebes", "akhetaten", "memphis", "delta"], reaches: [["nubia"], ["thebes", "akhetaten", "memphis", "delta"]] },
  {
    id: "euphrates",
    name: "Euphrates",
    course: ["carchemish", "terqa", "suhu", "sippar", "babylon", "nippur", "ur"],
    reaches: [["carchemish", "terqa", "suhu", "sippar", "babylon", "nippur", "ur"]],
  },
  { id: "tigris", name: "Tigris", course: ["nineveh", "ashur", "ekallate", "durkurigalzu"], reaches: [["nineveh", "ashur", "ekallate", "durkurigalzu"]] },
];

/** The terrain of a province: rough, desert, or open (every other land province, and the sea zones). */
export function terrainOf(province: string): Terrain {
  return Rough.includes(province) ? "Rough" : Desert.includes(province) ? "Desert" : "Open";
}

/** The crossing on the connection between two provinces, if any (either way round). */
export function crossingBetween(a: string, b: string): Crossing | null {
  return Crossings.find((c) => joins(c, a, b)) ?? null;
}

/** The great rivers that run through a province, in the order above. */
export function riversThrough(province: string): River[] {
  return Rivers.filter((r) => r.course.includes(province));
}

/**
 * The ground that helps a unit standing its ground in `to` against a move from `from` (Build order item 5; question 5,
 * plan step 14): rough ground in the province, else a pass or a great river on the connection the move comes over; null if
 * none (the desert gives no help). The first that applies is named; together they give no more than one alone. It helps
 * only a unit that stays where it is: never one that moves, one met head on, empty land, walls, or a siege's pace. A
 * landing from the sea no longer counts (item 5 counted it, to protect islands): since item 7a the blockade decides at sea.
 */
export function defenceGround(from: string, to: string): Ground | null {
  if (terrainOf(to) === "Rough") return { kind: "Rough", name: to };
  const c = crossingBetween(from, to);
  if (c && c.kind !== "Desert") return { kind: c.kind === "Mountain" ? "Pass" : "River", name: c.name };
  return null;
}
