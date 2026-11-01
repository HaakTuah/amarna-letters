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
  /** The dossier it comes from (`docs/history/`), as item 11f asks of every crossing. */
  readonly source: string;
  /** For a river crossing, the river ({@link Rivers} or {@link CrossedRivers}), whose flood season slows it ({@link legPoints}). */
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
 * ({@link defenceGround}). Desert feeds nobody (item 9+a, replacing item 5's flat desert cost; "Terrain" under War): an army
 * there lives on its baggage, its king's stores in that land and his caravans' grain. No rule names a power: Egypt holds
 * the Sinai by what it has stored along the Ways of Horus, and so does anyone who takes it.
 */
export const Rough: readonly string[] = ["mira", "lukka", "isuwa", "amurru", "arbela", "kalavasos", "shechem", "jerusalem", "kaska", "azzi"];

/** Desert provinces (question 5, plan step 15: the Sinai; the Sutean steppe since item 7a; Libya and the Shasu lands since item 11f). */
export const Desert: readonly string[] = ["sinai", "steppe", "libya", "shasu"];

const crossing = (a: string, b: string, kind: CrossingKind, name: string, source: string, river?: string): Crossing => (river === undefined ? { a, b, kind, name, source } : { a, b, kind, name, source, river });

/** The geography dossier, whose "Terrain by connection" gave the first crossings (question 5; the map review of item 7a). */
const G = "02-geography.md";

/**
 * The mountain, river and desert crossings (question 5, plan step 14; the map review of item 7a, from the geography
 * dossier's "Terrain by connection"; since item 11f every pass, great river and desert edge that was a real obstacle in
 * 1346, each with the dossier it comes from: "Terrain" under War). A pass or a river gives a unit standing its ground help
 * ({@link defenceGround}); the desert gives none, and makes the connection long ({@link connectionDays}). A great river is
 * drawn between provinces where it was a frontier, crossed at its fords and ferry towns, and runs through them as their
 * spine elsewhere ({@link Rivers}). What item 11f checked and left out (the Zagros edge, which no connection climbs; the
 * Khabur, the Zabs and the Litani, lesser streams no army was held at; the Nile's cataracts, which break its boats'
 * reaches but no march along its bank; the Carmel ridge's Aruna pass, which Thutmose III's army went through; and no
 * strait lies on a land connection) is in the design notes (`docs/design/33-the-rest-of-the-map.md`).
 */
export const Crossings: readonly Crossing[] = [
  crossing("tuwanuwa", "kizzuwatna", "Mountain", "the Cilician Gates", G),
  crossing("nesa", "kizzuwatna", "Mountain", "the Taurus", G),
  crossing("nesa", "carchemish", "Mountain", "the Anti-Taurus", G),
  crossing("kizzuwatna", "carchemish", "Mountain", "the Amanus", G),
  crossing("kizzuwatna", "alalakh", "Mountain", "the Syrian Gates", G),
  crossing("byblos", "damascus", "Mountain", "the Lebanon", G),
  crossing("sidon", "damascus", "Mountain", "the Lebanon", G),
  // Item 11f: Beirut's road over the Lebanon to the Beqaa, the same range
  crossing("beirut", "damascus", "Mountain", "the Lebanon", G),
  crossing("carchemish", "harran", "River", "the Euphrates at Carchemish", G, "euphrates"),
  crossing("aleppo", "harran", "River", "the Euphrates at Emar", G, "euphrates"),
  crossing("isuwa", "harran", "River", "the upper Euphrates", G, "euphrates"),
  // Item 11f: Suppiluliuma "crossed the Euphrates" into Isuwa (the Shattiwaza treaty), from the plateau and the Upper Land
  crossing("samuha", "isuwa", "River", "the upper Euphrates", G, "euphrates"),
  crossing("taidu", "nineveh", "River", "the Tigris", G, "tigris"),
  // Item 11f: the Marassantiya (Halys) ringing the Hittite heartland, between Hattusa and Sapinuwa within its bend and the
  // plateau south of it; Samuha stands on it
  crossing("hattusa", "nesa", "River", "the Marassantiya", G, "halys"),
  crossing("hattusa", "tuwanuwa", "River", "the Marassantiya", G, "halys"),
  // Item 11f: the Orontes where armies are recorded fording it: at Shabtuna south of Qadesh (Ramesses II's Qadesh
  // inscriptions) and on the way to Niya (Amenhotep II's stelae)
  crossing("damascus", "qadesh", "River", "the Orontes at the ford of Shabtuna", G, "orontes"),
  crossing("ugarit", "niya", "River", "the Orontes below Niya", G, "orontes"),
  // Item 11f: the Jordan in its rift, on the road from Megiddo by Hazor to Damascus ("Jordan crossing") and to the cities
  // east of it, Pella across from Beth-Shan (Seti I's Beth-Shan stela) and Ashtaroth
  crossing("hazor", "damascus", "River", "the Jordan", G, "jordan"),
  crossing("hazor", "ashtaroth", "River", "the Jordan", G, "jordan"),
  crossing("megiddo", "pella", "River", "the Jordan by Beth-Shan", G, "jordan"),
  crossing("shechem", "pella", "River", "the Jordan", G, "jordan"),
  crossing("hazor", "pella", "River", "the Jordan", G, "jordan"),
  crossing("steppe", "qatna", "Desert", "the Syrian desert", G),
  crossing("steppe", "damascus", "Desert", "the Syrian desert", G),
  // Item 11f+: the steppe's desert roads to every land on its edge, Mari's and Hana's shortcut by Tadmor among them
  crossing("steppe", "terqa", "Desert", "the Syrian desert", G),
  crossing("steppe", "aleppo", "Desert", "the Syrian desert", G),
  // The steppe's road to Harran crosses the Euphrates below Emar, where it was the frontier: a ford, not the desert
  crossing("steppe", "harran", "River", "the Euphrates below Emar", G, "euphrates"),
  crossing("steppe", "nuhashshe", "Desert", "the Syrian desert", G),
  crossing("steppe", "qadesh", "Desert", "the Syrian desert", G),
  // The Ways of Horus run through the Sinai, Egypt's own (item 11f+): from Tjaru at the Delta's edge, and on to Gaza
  crossing("delta", "sinai", "Desert", "the Ways of Horus", G),
  crossing("gaza", "sinai", "Desert", "the north Sinai", G),
  // Item 11f+: the Anti-Taurus between Samuha's Upper Land and Carchemish, the range Nesa's road to Carchemish crosses
  crossing("samuha", "carchemish", "Mountain", "the Anti-Taurus", G),
  // Item 11f+: the Jordan between Jerusalem's hills and the lands east of it, at the fords by Jericho
  crossing("jerusalem", "pella", "River", "the Jordan by Jericho", G, "jordan"),
  // To the Red Sea's shore (item 11c): over the Eastern Desert from Thebes, and across the Sinai to the Gulf of Suez.
  crossing("thebes", "redsea", "Desert", "the Wadi Hammamat", G),
  crossing("sinai", "redsea", "Desert", "the road to the Gulf of Suez", G),
  // Item 11f: the edge lands' deserts, the Western Desert beyond the Delta and the Negev to the Shasu's pastures
  crossing("libya", "delta", "Desert", "the Western Desert", "08-beyond-the-edges.md"),
  crossing("libya", "memphis", "Desert", "the Western Desert", "08-beyond-the-edges.md"),
  crossing("shasu", "gath", "Desert", "the Negev", G),
  crossing("shasu", "sinai", "Desert", "the Negev", G),
  crossing("shasu", "gaza", "Desert", "the Negev", G),
  crossing("shasu", "lachish", "Desert", "the Negev", G),
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

/**
 * The rivers crossed but not sailed in the game (item 11f): no boats on them, only their fords, which their floods close
 * in their season, as the great rivers' do. The Halys and the Orontes swell with the spring rains and snowmelt, the
 * Jordan "overflows all its banks throughout the time of harvest" (Joshua 3:15, a later source), all in Shemu.
 */
export const CrossedRivers: readonly { readonly id: string; readonly name: string; readonly flood: number }[] = [
  { id: "halys", name: "Marassantiya", flood: 2 },
  { id: "orontes", name: "Orontes", flood: 2 },
  { id: "jordan", name: "Jordan", flood: 2 },
];

/** The season a crossed river floods, from the great rivers or the crossed ones; null if it has none. */
export function floodSeasonOf(river: string | undefined): number | null {
  return Rivers.find((r) => r.id === river)?.flood ?? CrossedRivers.find((r) => r.id === river)?.flood ?? null;
}

/** The terrain of a province: rough, desert, or open (every other land province, and the sea zones). */
export function terrainOf(province: string): Terrain {
  return Rough.includes(province) ? "Rough" : Desert.includes(province) ? "Desert" : "Open";
}

/** The crossing on the connection between two provinces, if any (either way round). */
export function crossingBetween(a: string, b: string): Crossing | null {
  const key = a + "|" + b;
  let c = crossingCache.get(key);
  if (c === undefined) crossingCache.set(key, (c = Crossings.find((x) => joins(x, a, b)) ?? null));
  return c;
}
/** The crossings are fixed data: each pair asked for is remembered (item 17a). */
const crossingCache = new Map<string, Crossing | null>();

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
 * long it can drink). Since item 11a+ each city's water comes from the water dossier (`docs/history/10-water.md`,
 * Haakon's answer to item 10+b's review): a river or canal at its walls, a spring inside its defences or a walled way
 * down to one, or wells reaching groundwater never fail; a spring outside the walls is cut off by the besieger, and the
 * city then drinks its cisterns, as one that never had more does: `CisternSeasons`; wells in arid ground `WellSeasons`.
 * A city on an island with no water of its own drinks what boats bring it: once its besieger's fleet holds its waters it
 * has `IslandSeasons`. First guesses (item 18).
 */
export const WaterData = { CisternSeasons: 4, WellSeasons: 2, IslandSeasons: 1 } as const;

/** Where a city drinks: the water dossier's kinds (`docs/history/10-water.md`). */
export type CityWater = "River" | "Spring" | "Wells" | "Outside" | "Cisterns" | "Arid" | "Island";

const W = (kind: CityWater, ...ids: string[]): [string, CityWater][] => ids.map((id) => [id, kind]);

/** Each land province's chief city's water, from the water dossier. */
export const CityWaters: ReadonlyMap<string, CityWater> = new Map<string, CityWater>([
  ...W("River", "seha", "apasa", "kizzuwatna", "terqa", "nineveh", "ashur", "ekallate", "sippar", "durkurigalzu", "babylon", "nippur", "ur", "delta", "memphis", "akhetaten", "thebes", "nubia", "isuwa", "carchemish", "alalakh", "qadesh", "damascus", "suhu", "susa", "tunip", "niya", "samuha"),
  ...W("Spring", "hattusa", "washukanni", "dilmun", "qatna", "byblos", "jerusalem", "gezer", "pella", "aijalon"),
  ...W("Wells", "harran", "arbela", "kalavasos", "enkomi", "aleppo", "ugarit", "sumur", "sidon", "gaza", "akko", "ashkelon", "lachish", "beirut", "ashtaroth", "gath"),
  ...W("Outside", "tuwanuwa", "megiddo", "shechem", "hazor"),
  ...W("Cisterns", "mira", "sapinuwa", "nesa", "taidu", "nuhashshe", "amurru", "arrapha", "lukka", "kaska", "azzi"),
  ...W("Arid", "sinai", "steppe", "libya", "shasu"),
  ...W("Island", "tyre", "arwad"),
]);

/** The island cities with no water of their own, whose water comes by boat like their grain: Tyre (EA 146-155) and Arwad. */
export const isIslandWater = (province: string): boolean => CityWaters.get(province) === "Island";

/** How many seasons a besieged city can drink from its own stores (Infinity: it never runs dry; islands: once blockaded). */
export function waterSeasons(province: string): number {
  switch (CityWaters.get(province) ?? (Climates.get(province)?.water === "Arid" ? "Arid" : Climates.get(province)?.water === "River" ? "River" : "Cisterns")) {
    case "River":
    case "Spring":
    case "Wells":
      return Infinity;
    case "Island":
      return WaterData.IslandSeasons;
    case "Arid":
      return WaterData.WellSeasons;
    default:
      return WaterData.CisternSeasons;
  }
}

/**
 * The season a province reaps its harvest (item 11a+, "Period first": the harvest in each land's own season): the last of
 * its busy seasons, Shemu from Egypt to Babylonia and across the rain-fed lands, Akhet on the Anatolian plateau.
 */
export function reapSeasonOf(province: string): number {
  const busy = Climates.get(province)?.busy ?? [1, 2];
  return busy[busy.length - 1];
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
  ["samuha", cl("Rain", "Hard", Plateau, "plateau")],
  ["azzi", cl("Rain", "Hard", Plateau, "plateau")],
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
  ["libya", cl("Arid", "Mild", Sown)],
  ["shasu", cl("Arid", "Mild", Sown)],
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
  ["beirut", cl("Rain", "Mild", Sown, "levant")],
  ["niya", cl("Rain", "Cool", Sown, "levant")],
  ["tunip", cl("Rain", "Cool", Sown, "levant")],
  ["pella", cl("Rain", "Mild", Sown, "levant")],
  ["ashtaroth", cl("Rain", "Cool", Sown, "levant")],
  ["tyre", cl("Rain", "Mild", Sown, "levant")],
  ["megiddo", cl("Rain", "Mild", Sown, "levant")],
  ["shechem", cl("Rain", "Mild", Sown, "levant")],
  ["jerusalem", cl("Rain", "Mild", Sown, "levant")],
  ["akko", cl("Rain", "Mild", Sown, "levant")],
  ["hazor", cl("Rain", "Mild", Sown, "levant")],
  ["gezer", cl("Rain", "Mild", Sown, "levant")],
  ["ashkelon", cl("Rain", "Mild", Sown, "levant")],
  ["lachish", cl("Rain", "Mild", Sown, "levant")],
  ["gath", cl("Rain", "Mild", Sown, "levant")],
  ["aijalon", cl("Rain", "Mild", Sown, "levant")],
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
