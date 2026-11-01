/**
 * The land's own features as data, in latitude and longitude projected onto the board: where each city and sea zone is
 * drawn, the rivers, the ranges, the old coasts and the empty lands. Shared by the drawing (art.ts) and by the script that
 * traces the provinces' borders along these features (`scripts/map-borders.ts`, item 11c+), so both read one set of lines.
 */
import { WorldMap } from "@amarna/engine";
import { RiverLines } from "./geo-data.ts";
import { TracedRivers } from "./river-data.ts";
import { boardPoint } from "./projection.ts";

export interface Pt {
  x: number;
  y: number;
}

/** A place on the board, from its latitude and longitude (the engine's true projection, item 11c). */
export const ll = (lat: number, lon: number): Pt => boardPoint(lat, lon);

/** Points given as latitude, longitude pairs. */
export function LL(...latLon: number[]): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < latLon.length; i += 2) pts.push(ll(latLon[i], latLon[i + 1]));
  return pts;
}

/** A ring or line of the generated data ("lon,lat" in hundredths of a degree), on the board. */
export const decode = (s: string): Pt[] =>
  s.split(" ").map((xy) => {
    const [lon, lat] = xy.split(",");
    return ll(Number(lat) / 100, Number(lon) / 100);
  });

const Map_ = WorldMap.default;

/**
 * Where each sea zone is drawn: out on its waters (its latitude and longitude, for the lengths of connections, are its
 * harbour's).
 */
export const SeaSpots: ReadonlyMap<string, Pt> = new Map([
  ["sehawaters", ll(38.75, 26.45)],
  ["apasawaters", ll(37.55, 26.75)],
  ["lukkawaters", ll(36.05, 29.3)],
  ["kizzuwatnawaters", ll(36.45, 34.55)],
  ["kalavasoswaters", ll(34.3, 32.9)],
  ["enkomiwaters", ll(35.45, 34.45)],
  ["ugaritwaters", ll(35.7, 35.45)],
  ["sumurwaters", ll(34.95, 35.6)],
  ["bybloswaters", ll(34.25, 35.35)],
  ["sidonwaters", ll(33.7, 35.05)],
  ["tyrewaters", ll(33.3, 34.95)],
  ["akkowaters", ll(32.85, 34.8)],
  ["ashkelonwaters", ll(31.85, 34.35)],
  ["gazawaters", ll(31.5, 34.1)],
  ["deltawaters", ll(31.75, 31.4)],
  ["westsea", ll(35.3, 27.2)],
  ["gulf", ll(27.9, 50.4)],
  ["redsea", ll(24.6, 36.0)],
]);

/** Where a province is drawn: a land province at its town, a sea zone out on its waters. */
export function city(id: string): Pt {
  const p = Map_.get(id);
  return SeaSpots.get(id) ?? ll(p.lat, p.lon);
}

/** The island cities too small for the coastline at this scale: Arwad off Ṣumur. Drawn as a small round island. */
const isle = (c: Pt, r: number): Pt[] => Array.from({ length: 8 }, (_, i) => ({ x: c.x + r * Math.cos((i * Math.PI) / 4), y: c.y + r * Math.sin((i * Math.PI) / 4) }));
export const Isles: ReadonlyMap<string, Pt[]> = new Map([["arwad", isle(ll(34.86, 35.86), 1.6)]]);

/** The provinces drawn on islands of their own, shown only on their island: Cyprus and Dilmun. */
export const IslandProvinces: readonly string[] = ["kalavasos", "enkomi", "dilmun"];

/**
 * The Gulf's head as it lay in the Late Bronze Age, reaching up the lower plain towards Ur, a coastal city in the game
 * (the sea has since withdrawn by some 150 to 200 km; the reading is item 11c's). Its edge out to the modern sea is never
 * stroked, so it joins the Gulf without a seam.
 */
export const OldGulfShore = LL(29.98, 47.95, 30.25, 47.75, 30.5, 47.4, 30.72, 46.95, 30.85, 46.5, 30.92, 46.2, 30.8, 46.1, 30.62, 46.35, 30.4, 46.8, 30.15, 47.25, 29.93, 47.6, 29.8, 47.85);

/**
 * The bay of Miletus (the Latmian Gulf) before the Maeander silted it: open sea from Miletus, on its southern shore, up
 * past Myus to Heraclea under Latmos, where Lake Bafa is its remnant (item 11c+, the geography dossier's "The land as it
 * was"). Cut from today's land as the Gulf's head is.
 */
export const MiletusBayShore = LL(37.555, 27.2, 37.6, 27.3, 37.61, 27.42, 37.56, 27.55, 37.5, 27.62, 37.46, 27.55, 37.49, 27.42, 37.52, 27.3, 37.53, 27.22);

/** A drawn river: its course, its width on the board, and its name where the map writes one. */
export interface RiverCourse {
  id: string;
  name: string;
  width: number;
  pieces: Pt[][];
  /** Where it runs between provinces (a frontier, crossed at fords or ferries) rather than through them as their spine. */
  frontier: (lat: number, lon: number) => boolean;
}

const fromData = (id: string): Pt[][] => (RiverLines[id] ?? []).map(decode);
const traced = (id: string): Pt[][] => (TracedRivers[id] !== undefined ? [decode(TracedRivers[id])] : []);
const always = (): boolean => true;
const never = (): boolean => false;

/**
 * The Euphrates of 1346: Natural Earth's course down to the plain, then its old bed by Sippar, Babylon, Nippur, Uruk and
 * Ur to the Gulf's head, where the river ran before it moved west to today's Hindiya and lower courses.
 */
function oldEuphrates(): Pt[][] {
  const pieces = RiverLines.euphrates ?? [];
  const pts = (pieces[0] ?? "").split(" ").map((xy) => xy.split(",").map(Number));
  const kept = pts.filter(([, lat]) => lat >= 3340);
  const head = kept.map(([lon, lat]) => ll(lat / 100, lon / 100));
  const bed = LL(33.3, 43.95, 33.06, 44.25, 32.8, 44.33, 32.54, 44.42, 32.3, 44.75, 32.13, 45.23, 31.8, 45.48, 31.32, 45.64, 31.15, 45.9, 30.96, 46.1, 30.86, 46.22);
  // Natural Earth's pieces 1 to 3 are today's lower course, below the plain; the rest are upstream.
  return [[...head, ...bed], ...pieces.slice(4).map(decode)];
}

/** The Nile's branches across the Delta in the New Kingdom, besides the two Natural Earth draws: the Pelusiac, the Tanitic, the Sebennytic and the Canopic. */
const DeltaBranches: Pt[][] = [
  LL(30.12, 31.25, 30.35, 31.4, 30.57, 31.51, 30.75, 31.75, 30.9, 32.1, 31.04, 32.55),
  LL(30.57, 31.51, 30.8, 31.7, 30.97, 31.88, 31.13, 32.05),
  LL(30.4, 31.18, 30.7, 31.2, 30.97, 31.24, 31.25, 31.15, 31.5, 31.05),
  LL(30.15, 31.1, 30.5, 30.85, 30.9, 30.59, 31.15, 30.3, 31.32, 30.06),
];

/**
 * The rivers: the three great ones of the engine's geography first, then smaller ones. Courses from Natural Earth (its
 * European supplement for Anatolia's), and those it lacks traced down their valleys on real elevation (item 11c++,
 * `scripts/map-rivers.mjs`); only the Delta's old branches and the Euphrates' old bed are drawn by hand, from the dossiers.
 */
export const RiverCourses: readonly RiverCourse[] = [
  { id: "nile", name: "Nile", width: 3.2, pieces: fromData("nile"), frontier: never },
  { id: "nile-branches", name: "", width: 1.4, pieces: DeltaBranches, frontier: never },
  // A frontier where the engine crosses it at Carchemish, Emar and upstream; the spine of the provinces below.
  { id: "euphrates", name: "Euphrates", width: 2.8, pieces: oldEuphrates(), frontier: (lat, lon) => lat > 35.85 && lon < 39.3 },
  // A frontier between Taidu and Nineveh; the spine of Assyria's and Babylon's provinces below.
  { id: "tigris", name: "Tigris", width: 2.6, pieces: fromData("tigris"), frontier: (lat) => lat > 36.3 },
  { id: "khabur", name: "Khabur", width: 1.5, pieces: traced("khabur"), frontier: always },
  { id: "balikh", name: "", width: 1.2, pieces: traced("balikh"), frontier: always },
  { id: "halys", name: "Marassantiya", width: 1.8, pieces: fromData("halys"), frontier: always },
  { id: "orontes", name: "Orontes", width: 1.5, pieces: traced("orontes"), frontier: always },
  { id: "litani", name: "", width: 1.1, pieces: traced("litani"), frontier: always },
  { id: "jordan", name: "", width: 1.2, pieces: fromData("jordan"), frontier: always },
  { id: "hermos", name: "", width: 1.2, pieces: fromData("hermos"), frontier: always },
  { id: "kaystros", name: "", width: 1.0, pieces: fromData("kaystros"), frontier: always },
  { id: "maeander", name: "", width: 1.2, pieces: fromData("maeander"), frontier: always },
  { id: "sangarios", name: "", width: 1.2, pieces: fromData("sangarios"), frontier: always },
  { id: "iris", name: "", width: 1.1, pieces: fromData("iris"), frontier: always },
  { id: "kalykadnos", name: "", width: 1.0, pieces: fromData("kalykadnos"), frontier: always },
  { id: "seyhan", name: "", width: 1.2, pieces: fromData("seyhan"), frontier: always },
  { id: "ceyhan", name: "", width: 1.2, pieces: fromData("ceyhan"), frontier: always },
  { id: "arsanias", name: "", width: 1.2, pieces: fromData("arsanias"), frontier: always },
  { id: "zab", name: "", width: 1.3, pieces: traced("zab"), frontier: always },
  { id: "lesser-zab", name: "", width: 1.1, pieces: traced("lesser-zab"), frontier: always },
  { id: "diyala", name: "", width: 1.2, pieces: traced("diyala"), frontier: always },
  { id: "karkheh", name: "", width: 1.2, pieces: fromData("karkheh"), frontier: always },
  { id: "karun", name: "", width: 1.2, pieces: traced("karun"), frontier: always },
];

/** Mountain ranges, drawn as rows of peaks along these lines, and ridges a border follows. */
export const RangeLines: readonly Pt[][] = [
  LL(36.8, 30.0, 37.2, 31.2, 37.25, 32.4, 37.2, 33.5, 37.3, 34.5), // the Taurus
  LL(37.6, 35.5, 38.0, 36.4, 38.3, 37.4, 38.5, 38.6, 38.35, 40.0, 38.3, 41.5, 38.1, 42.8), // the Anti-Taurus and the south-eastern Taurus
  LL(36.05, 36.05, 36.5, 36.3, 37.0, 36.6), // the Amanus
  LL(33.4, 35.55, 33.9, 35.8, 34.35, 36.1), // the Lebanon
  LL(33.35, 35.9, 33.8, 36.2, 34.3, 36.55), // the Anti-Lebanon
  LL(37.3, 44.6, 36.2, 45.5, 35.0, 46.3, 34.0, 47.0, 33.0, 47.8, 32.0, 49.1, 31.0, 50.3), // the Zagros
  LL(41.1, 33.2, 40.9, 35.2, 40.7, 37.3, 40.6, 39.3, 40.8, 41.0), // the Pontic mountains
  LL(39.6, 39.4, 39.4, 41.0, 39.5, 42.6), // the Armenian highlands, Isuwa's and Nairi's
  LL(34.93, 32.7, 34.95, 33.05), // the Troodos
  LL(28.4, 34.0, 28.8, 33.6, 29.1, 33.3), // the mountains of the Sinai
  LL(28.3, 35.6, 27.0, 36.6, 25.0, 37.9, 23.0, 39.3, 21.0, 40.3), // the Hejaz
  LL(28.0, 32.6, 26.5, 33.4, 25.0, 34.3, 23.0, 35.0, 21.0, 36.2), // the Red Sea hills
];

/**
 * Points that claim the empty land no province holds: the deserts of Libya, Egypt's east, Arabia and Syria, Transjordan's
 * steppe, the Zagros and Iran, the Armenian highlands and Anatolia's north-west. Their land is no one's.
 */
export const Wastes = LL(
  29.6, 27.6, 27.6, 28.2, 25.0, 29.2, 22.0, 29.6, 20.5, 27.0, 28.7, 32.25, 23.4, 34.5, 21.0, 35.5,
  29.6, 37.6, 27.0, 40.5, 24.5, 38.8, 28.2, 44.8, 25.5, 46.6, 23.0, 43.5, 21.0, 41.0, 30.8, 41.3, 32.6, 39.3, 33.3, 40.6,
  31.0, 36.6, 29.7, 35.6, 31.45, 35.95, 30.6, 44.0,
  35.8, 46.8, 33.9, 47.4, 32.6, 50.0, 30.6, 51.0, 37.7, 45.9, 38.7, 43.4, 39.9, 41.3, 41.3, 41.0, 40.2, 38.0,
  39.6, 31.8, 41.0, 31.4, 40.6, 28.4, 41.6, 33.0,
);

/**
 * The roads whose land the sources give to one of the two provinces they join, where the land's own borders would put a
 * third province's land between them (item 11f+, "neighbours on the map are neighbours in the rules"): a band along each
 * road is that province's, so the two provinces the road joins touch. Each with the dossier it rests on, in the design
 * notes (`docs/design/36-map-neighbours.md`).
 */
export const RoadLands: readonly { readonly province: string; readonly road: readonly Pt[] }[] = [
  // Thutmose III's road from the Sharon through the Aruna pass to Megiddo (his Annals): the pass is Megiddo's
  { province: "megiddo", road: LL(32.58, 35.18, 32.47, 35.07, 32.38, 34.97, 32.2, 34.93) },
  // Item 17+: the Shasu hold Seir and the desert west of it; the plateau beyond the Salt Sea is no one's (a waste), so
  // the King's Highway band of item 11f+ is gone. Shuwardata's land runs from Gath up the Elah valley by Qiltu (Keilah)
  // into the southern hills, Hebron's, where no town stood (EA 279-280, 290)
  { province: "gath", road: LL(31.7, 34.85, 31.64, 34.95, 31.61, 35.0, 31.55, 35.08, 31.53, 35.1, 31.45, 35.12, 31.35, 35.12, 31.28, 35.15, 31.35, 35.3, 31.4, 35.38) },
  // The Upper Land's road to Hayasa, the Hittite frontier against Azzi (the Hittite campaign texts)
  { province: "samuha", road: LL(39.61, 36.52, 39.75, 37.5, 39.8, 38.5, 39.78, 38.9) },
  // The Elam road from Babylonia by Der (a Babylonian city) to Susa
  { province: "durkurigalzu", road: LL(33.35, 44.2, 33.2, 45.0, 33.12, 45.93, 32.75, 46.8, 32.5, 47.3) },
  // The Kaska frontier in the mountains north of the Upper Land, where they raided Samuha's land
  { province: "kaska", road: LL(40.9, 36.0, 40.6, 36.4, 40.25, 36.6, 39.95, 36.6) },
  // The Lower Land's road west to Arzawa, Hatti's frontier province facing Mira
  { province: "tuwanuwa", road: LL(37.97, 34.68, 37.87, 32.5, 38.1, 31.4, 38.3, 30.5) },
  // Kumidi in the Beqaa, Egypt's seat for Upe, on the road from Damascus over the Lebanon to Sidon (EA 116, 132, 198)
  { province: "damascus", road: LL(33.51, 36.29, 33.6, 36.0, 33.62, 35.86, 33.6, 35.65) },
];
