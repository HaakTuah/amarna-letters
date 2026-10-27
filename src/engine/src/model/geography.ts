/** The ground of a land province. Sea zones are not given one. */
export const TerrainValues = ["Open", "Rough", "Desert"] as const;
export type Terrain = (typeof TerrainValues)[number];

/** What makes a connection between two provinces hard to cross. */
export const CrossingKindValues = ["Mountain", "River"] as const;
export type CrossingKind = (typeof CrossingKindValues)[number];

/** A connection that crosses a mountain pass or a great river, by its name. */
export interface Crossing {
  readonly a: string;
  readonly b: string;
  readonly kind: CrossingKind;
  readonly name: string;
}

export function joins(c: Crossing, a: string, b: string): boolean {
  return (c.a === a && c.b === b) || (c.a === b && c.b === a);
}

/** A great river: the provinces it runs through, from its source to its mouth. */
export interface River {
  readonly id: string;
  readonly name: string;
  readonly course: readonly string[];
}

/** What the ground gives a defender against one attack: rough ground, a pass, a river, or a landing from the sea. */
export const GroundKindValues = ["Rough", "Pass", "River", "Landing"] as const;
export type GroundKind = (typeof GroundKindValues)[number];

/**
 * The ground that helps a unit standing its ground against one attack ({@link defenceGround}): its kind, and the province
 * (rough ground) or the crossing's name. {@link groundText} says it as the battle report does.
 */
export interface Ground {
  readonly kind: GroundKind;
  readonly name: string;
}

/** "the rough ground of mira", "the Cilician Gates, a mountain pass", "the crossing of the Euphrates", "a landing from the sea". */
export function groundText(g: Ground): string {
  switch (g.kind) {
    case "Rough":
      return `the rough ground of ${g.name}`;
    case "Pass":
      return `${g.name}, a mountain pass`;
    case "River":
      return `the crossing of ${g.name}`;
    default:
      return "a landing from the sea";
  }
}

/**
 * Terrain as map data, per province and per connection, from the lists decided in the sleep-and-simulation round
 * (`docs/rounds/2026-10-18-sleep-and-simulation.md`: question 5, plan steps 14 and 15; question 10, plan step 2), given
 * its effects by the siege package (item 5): rough ground, a pass or a great river on the connection an attack comes
 * over, and a landing from the sea give a unit that stands its ground GameConfig.terrainDefence more, at most that in all
 * ({@link defenceGround}); an army that ends a season in desert land its king did not hold pays GameConfig.desertUpkeep
 * for supplies. No rule names a power: Egypt crosses the Sinai freely because it holds it, and so does anyone who takes it.
 */
export const Rough: readonly string[] = ["mira", "lukka", "isuwa", "amurru", "arbela", "tamassos"];

/** Desert provinces (question 5, plan step 15: the Sinai). An army in its own land pays no desert cost. */
export const Desert: readonly string[] = ["sinai"];

const crossing = (a: string, b: string, kind: CrossingKind, name: string): Crossing => ({ a, b, kind, name });

/** The mountain and river crossings (question 5, plan step 14). A landing by convoy counts too (see {@link defenceGround}). */
export const Crossings: readonly Crossing[] = [
  crossing("tuwanuwa", "kizzuwatna", "Mountain", "the Cilician Gates"),
  crossing("kanesh", "kizzuwatna", "Mountain", "the Taurus"),
  crossing("kizzuwatna", "carchemish", "Mountain", "the Amanus"),
  crossing("carchemish", "harran", "River", "the Euphrates"),
  crossing("isuwa", "harran", "River", "the Euphrates"),
  crossing("taidu", "nineveh", "River", "the Tigris"),
];

/** The ordered courses of the great rivers, source to mouth (question 10, plan step 2). */
export const Rivers: readonly River[] = [
  { id: "nile", name: "Nile", course: ["thebes", "akhetaten", "memphis", "delta"] },
  { id: "euphrates", name: "Euphrates", course: ["carchemish", "terqa", "mari", "sippar", "babylon", "nippur", "ur"] },
  { id: "tigris", name: "Tigris", course: ["nineveh", "ashur", "ekallatum", "durkurigalzu"] },
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
 * plan step 14): rough ground in the province, else a pass or a great river on the connection the move comes over, else a
 * landing from the sea (an army carried by convoy); null if none. The first that applies is named; together they give no
 * more than one alone. It helps only a unit that stays where it is: never one that moves, one met head on, empty land,
 * walls, or a siege's pace.
 */
export function defenceGround(from: string, to: string, byConvoy: boolean): Ground | null {
  if (terrainOf(to) === "Rough") return { kind: "Rough", name: to };
  const c = crossingBetween(from, to);
  if (c) return { kind: c.kind === "Mountain" ? "Pass" : "River", name: c.name };
  return byConvoy ? { kind: "Landing", name: "" } : null;
}
