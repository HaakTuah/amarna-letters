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
  /** For a river crossing, the river ({@link Rivers}), whose flood season slows it ({@link legPoints}). */
  readonly river?: string;
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
  /** The season (0 Akhet, 1 Peret, 2 Shemu) it floods: its fords close and its ferries are slow ("Seasons", "Rivers"). */
  readonly flood: number;
  /** A boat's kilometres a day downstream and upstream; 0 where boats do not go upstream ("Rivers are roads"). */
  readonly down: number;
  readonly up: number;
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

const crossing = (a: string, b: string, kind: CrossingKind, name: string, river?: string): Crossing => (river === undefined ? { a, b, kind, name } : { a, b, kind, name, river });

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
  crossing("carchemish", "harran", "River", "the Euphrates at Carchemish", "euphrates"),
  crossing("aleppo", "harran", "River", "the Euphrates at Emar", "euphrates"),
  crossing("isuwa", "harran", "River", "the upper Euphrates", "euphrates"),
  crossing("taidu", "nineveh", "River", "the Tigris", "tigris"),
  crossing("suhu", "steppe", "Desert", "the Syrian desert"),
  crossing("steppe", "qatna", "Desert", "the Syrian desert"),
  crossing("steppe", "damascus", "Desert", "the Syrian desert"),
  crossing("delta", "gaza", "Desert", "the Ways of Horus"),
  crossing("gaza", "sinai", "Desert", "the north Sinai"),
  crossing("jerusalem", "sinai", "Desert", "the Negev"),
];

/** The ordered courses of the great rivers, source to mouth (question 10, plan step 2; Nubia since item 7a), and their reaches. */
export const Rivers: readonly River[] = [
  { id: "nile", name: "Nile", course: ["nubia", "thebes", "akhetaten", "memphis", "delta"], reaches: [["nubia"], ["thebes", "akhetaten", "memphis", "delta"]], flood: 0, down: 60, up: 40 },
  {
    id: "euphrates",
    name: "Euphrates",
    course: ["carchemish", "terqa", "suhu", "sippar", "babylon", "nippur", "ur"],
    reaches: [["carchemish", "terqa", "suhu", "sippar", "babylon", "nippur", "ur"]],
    flood: 2,
    down: 40,
    up: 0,
  },
  { id: "tigris", name: "Tigris", course: ["nineveh", "ashur", "ekallate", "durkurigalzu"], reaches: [["nineveh", "ashur", "ekallate", "durkurigalzu"]], flood: 2, down: 40, up: 0 },
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

/**
 * A province's water ("Land and climate", item 10+a): river-fed land floods with its river, rain-fed land is prone to
 * drought, and arid land carries few people.
 */
export type Water = "River" | "Rain" | "Arid";

/**
 * Where a city drinks under siege (item 10+b, "Water too": set by where it stands, so the land and the sources decide how
 * long it can drink). River land drinks from its river, and a city with a spring inside its walls, or a walled way down
 * to one, from that: neither fails. Elsewhere a besieged city drinks from what its cisterns hold and its wells reach:
 * `CisternSeasons` in rain-fed land, `WellSeasons` in arid ground. A city on an island with no water of its own drinks
 * what boats bring it: once its besieger's fleet holds its waters it has `IslandSeasons`. First guesses (item 18).
 */
export const WaterData = { CisternSeasons: 4, WellSeasons: 2, IslandSeasons: 1 } as const;

/**
 * Cities whose water never fails under siege though they stand in rain-fed land: Jerusalem's builders had walled their way
 * down to the Gihon spring, and Megiddo cut its water shaft for this ("Water too").
 */
export const SafeWater: ReadonlySet<string> = new Set(["jerusalem", "megiddo"]);

/** Island cities with no water of their own, whose water comes by boat like their grain: Tyre (EA 146-155) and Arwad. */
export const IslandWater: ReadonlySet<string> = new Set(["tyre", "arwad"]);

/** How many seasons a besieged city can drink from its own stores (Infinity: it never runs dry; islands: once blockaded). */
export function waterSeasons(province: string): number {
  if (IslandWater.has(province)) return WaterData.IslandSeasons;
  const w = Climates.get(province)?.water ?? "Rain";
  if (w === "River" || SafeWater.has(province)) return Infinity;
  return w === "Arid" ? WaterData.WellSeasons : WaterData.CisternSeasons;
}

/** How hard its winter is ("Winter in the field"): mild in Egypt and Babylonia, hard on the Anatolian plateau. */
export type Winter = "Mild" | "Cool" | "Hard";

/**
 * A province's climate (item 10+a, from `docs/history/03-environment-and-seasons.md`): its water, its winter, the seasons
 * its fields are sown and harvested in (a levy then costs more of its harvest: "Seasons"), and the region whose rains fail
 * together, if it is rain-fed ({@link DroughtRegions}).
 */
export interface Climate {
  readonly water: Water;
  readonly winter: Winter;
  readonly busy: readonly number[];
  readonly drought: string | null;
}

const cl = (water: Water, winter: Winter, busy: readonly number[], drought: string | null = null): Climate => ({ water, winter, busy, drought });
const Sown = [1, 2];
const Plateau = [0];

/**
 * By province. The Nile and Babylonia's canals are river-fed, sown in Peret and harvested in Shemu, slack during the flood
 * (Akhet); the Levant, Syria, Mitanni, Assyria, Cyprus and western Anatolia are rain-fed, sown with the first rains in
 * Peret and harvested in Shemu; the Anatolian plateau reaps in early Akhet and sows in the autumn, so Akhet is its busy
 * season. Hard winters on the plateau, cool inland Syria, the Habur and Assyria, mild elsewhere.
 */
export const Climates: ReadonlyMap<string, Climate> = new Map([
  ["seha", cl("Rain", "Mild", Sown, "west")],
  ["apasa", cl("Rain", "Mild", Sown, "west")],
  ["mira", cl("Rain", "Cool", Sown, "west")],
  ["lukka", cl("Rain", "Mild", Sown, "west")],
  ["tuwanuwa", cl("Rain", "Hard", Plateau, "plateau")],
  ["hattusa", cl("Rain", "Hard", Plateau, "plateau")],
  ["sapinuwa", cl("Rain", "Hard", Plateau, "plateau")],
  ["nesa", cl("Rain", "Hard", Plateau, "plateau")],
  ["isuwa", cl("Rain", "Hard", Plateau, "plateau")],
  ["kaska", cl("Rain", "Hard", Plateau, "plateau")],
  ["kizzuwatna", cl("Rain", "Mild", Sown, "west")],
  ["harran", cl("Rain", "Cool", Sown, "north")],
  ["washukanni", cl("Rain", "Cool", Sown, "north")],
  ["taidu", cl("Rain", "Cool", Sown, "north")],
  ["terqa", cl("River", "Mild", Sown)],
  ["nineveh", cl("Rain", "Cool", Sown, "north")],
  ["arbela", cl("Rain", "Cool", Sown, "north")],
  ["arrapha", cl("Rain", "Cool", Sown, "north")],
  ["ashur", cl("River", "Cool", Sown)],
  ["ekallate", cl("River", "Mild", Sown)],
  ["suhu", cl("River", "Mild", Sown)],
  ["sippar", cl("River", "Mild", Sown)],
  ["durkurigalzu", cl("River", "Mild", Sown)],
  ["babylon", cl("River", "Mild", Sown)],
  ["nippur", cl("River", "Mild", Sown)],
  ["ur", cl("River", "Mild", Sown)],
  ["susa", cl("Rain", "Mild", Sown, "susiana")],
  ["dilmun", cl("Arid", "Mild", Sown)],
  ["delta", cl("River", "Mild", Sown)],
  ["memphis", cl("River", "Mild", Sown)],
  ["akhetaten", cl("River", "Mild", Sown)],
  ["thebes", cl("River", "Mild", Sown)],
  ["nubia", cl("River", "Mild", Sown)],
  ["sinai", cl("Arid", "Mild", Sown)],
  ["steppe", cl("Arid", "Cool", Sown)],
  ["kalavasos", cl("Rain", "Mild", Sown, "west")],
  ["enkomi", cl("Rain", "Mild", Sown, "west")],
  ["carchemish", cl("Rain", "Cool", Sown, "levant")],
  ["alalakh", cl("Rain", "Cool", Sown, "levant")],
  ["aleppo", cl("Rain", "Cool", Sown, "levant")],
  ["nuhashshe", cl("Rain", "Cool", Sown, "levant")],
  ["qatna", cl("Rain", "Cool", Sown, "levant")],
  ["qadesh", cl("Rain", "Cool", Sown, "levant")],
  ["damascus", cl("Rain", "Cool", Sown, "levant")],
  ["ugarit", cl("Rain", "Mild", Sown, "levant")],
  ["amurru", cl("Rain", "Mild", Sown, "levant")],
  ["sumur", cl("Rain", "Mild", Sown, "levant")],
  ["arwad", cl("Rain", "Mild", Sown, "levant")],
  ["byblos", cl("Rain", "Mild", Sown, "levant")],
  ["sidon", cl("Rain", "Mild", Sown, "levant")],
  ["tyre", cl("Rain", "Mild", Sown, "levant")],
  ["megiddo", cl("Rain", "Mild", Sown, "levant")],
  ["shechem", cl("Rain", "Mild", Sown, "levant")],
  ["jerusalem", cl("Rain", "Mild", Sown, "levant")],
  ["gaza", cl("Rain", "Mild", Sown, "levant")],
]);

const AtSea: Climate = cl("Arid", "Mild", []);

/** A province's climate (a sea zone's is neutral). */
export function climateOf(province: string): Climate {
  return Climates.get(province) ?? AtSea;
}

/**
 * The regions whose rains fail together, and how often, one year in so many (the environment dossier's first guesses:
 * the Anatolian plateau one in six, the Levant and north Syria and the Habur and Assyria one in eight; the milder west
 * one in ten, and Elam's Susiana, watered by rain and canals, as often [G]). A drought is drawn once a year for each, in
 * Shemu, and strikes the year after.
 */
export const DroughtRegions: readonly { readonly id: string; readonly name: string; readonly oneIn: number }[] = [
  { id: "plateau", name: "the Anatolian plateau", oneIn: 6 },
  { id: "levant", name: "the Levant and Syria", oneIn: 8 },
  { id: "north", name: "the Habur and Assyria", oneIn: 8 },
  { id: "west", name: "the western coasts and Cyprus", oneIn: 10 },
  { id: "susiana", name: "the Susiana plain", oneIn: 10 },
];

/**
 * Each great river's floods, drawn once a year in its flood season and shared by every province along it ("Rivers"): a
 * bad flood one year in so many (`badOneIn`), cutting the harvest to `badPercent` for the year, and a ruinous one one in
 * `ruinOneIn`, to `ruinPercent`, drowning `ruinDeadPermille` of the people. The Nile is steady (a low Nile one Akhet in
 * eight, a ruinous flood one in thirty: the environment dossier's first guesses); the Tigris and the Euphrates flood at
 * the harvest, irregularly (a damaging flood one Shemu in six) [G].
 */
export const RiverFloods: ReadonlyMap<string, { readonly badOneIn: number; readonly badPercent: number; readonly ruinOneIn: number; readonly ruinPercent: number; readonly ruinDeadPermille: number }> = new Map([
  ["nile", { badOneIn: 8, badPercent: 60, ruinOneIn: 30, ruinPercent: 30, ruinDeadPermille: 10 }],
  ["euphrates", { badOneIn: 6, badPercent: 60, ruinOneIn: 20, ruinPercent: 30, ruinDeadPermille: 10 }],
  ["tigris", { badOneIn: 6, badPercent: 60, ruinOneIn: 20, ruinPercent: 30, ruinDeadPermille: 10 }],
]);
