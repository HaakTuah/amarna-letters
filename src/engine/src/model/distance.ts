/**
 * The length of every connection on the map ("Distance, not steps" under "Map review", build order item 7a): in kilometres,
 * and in days for a party on the road or a ship at sea, weighted by the ground. Map data only: item 7b's routes and the one
 * rule for a company's pace ("What sets a company's pace") turn days into travel; until then travel counts steps.
 *
 * Kilometres are the attested road distances where the geography dossier gives them (`docs/history/02-geography.md`,
 * "Distances between the map's places"), and otherwise the straight line between the two towns plus a quarter for the
 * road (by sea a tenth for the coast). Days follow the dossier's paces [G]: 25 km a day on open ground, 15 in rough land and
 * over a mountain pass, 20 across the desert; 70 for a ship coasting, 100 on an open crossing, a fifth quicker with the
 * current and a quarter slower against it (first guesses, tuned in item 18).
 */
import { crossingBetween, terrainOf } from "./geography.ts";
import type { WorldMap } from "./map.ts";

/** A pair of provinces and the attested road distance between them, with its basis. */
export interface Attested {
  readonly a: string;
  readonly b: string;
  readonly km: number;
  readonly basis: string;
  /**
   * What a player reads where the connection's days are shown, when its length is not what the map's line suggests: the
   * road or river that makes it so, from the same dossier line (#554).
   */
  readonly note?: string;
}

const att = (a: string, b: string, km: number, basis: string, note?: string): Attested => (note === undefined ? { a, b, km, basis } : { a, b, km, basis, note });

/**
 * The voyage from a closed sea's far shore to its harbour, where a desert road ends on that shore (item 11c): from el-Markha
 * on the Gulf of Suez down to Mersa Gawasis, about 350 km, half of it against the north wind that blows down the Red Sea
 * all year, at about 35 km a day [G].
 */
export const ShoreVoyages: readonly { a: string; b: string; days: number; basis: string }[] = [
  { a: "sinai", b: "redsea", days: 10, basis: "el-Markha to Mersa Gawasis by sea, against the north wind one way [G]" },
];

/** The connections whose length the sources attest, or that the dossier reckons by a known road. */
export const AttestedKm: readonly Attested[] = [
  // The Ways of Horus run through the Sinai (item 11f+): Tjaru to Gaza 250 km, the Delta's road to Tjaru added
  att("delta", "sinai", 160, "the Delta to Tjaru and on along the Ways of Horus, its first part [G for the split]", "The Ways of Horus, Egypt's army road out of the Delta at Tjaru, a chain of forts and wells across the desert."),
  att("sinai", "gaza", 120, "Thutmose III's army, Tjaru to Gaza in 10 days (his Annals, first campaign): the Ways of Horus, its second part [G for the split]", "The Ways of Horus on to Gaza: Thutmose III's army marched it from Tjaru in ten days."),
  att("memphis", "akhetaten", 300, "the Nile road"),
  att("akhetaten", "thebes", 400, "the Nile road"),
  att("thebes", "redsea", 210, "Thebes by Coptos and the Wadi Hammamat to the shore at Mersa Gawasis, the road of the Punt expeditions", "The road of the Punt expeditions, by Coptos and the Wadi Hammamat over the Eastern Desert to the harbour at Mersa Gawasis."),
  att("sinai", "redsea", 270, "across the Sinai to the Gulf of Suez, where the mining expeditions landed at el-Markha: the straight line and a quarter [G]", "Across the Sinai to el-Markha on the Gulf of Suez, where the expeditions to the mines of Serabit el-Khadim landed."),
  att("megiddo", "hazor", 75, "the road from Megiddo to Damascus by Hazor (185 km in all), its first part: 60 km straight and a quarter"),
  att("hazor", "damascus", 110, "the road from Megiddo to Damascus by Hazor and the Jordan crossing, its second part: 88 km straight and a quarter"),
  att("byblos", "damascus", 120, "over the Lebanon and the Beqaa"),
  att("damascus", "qadesh", 140, "by the Beqaa"),
  att("carchemish", "harran", 110, "the Euphrates road to Harran"),
  att("harran", "washukanni", 120, "across the Habur triangle to Tell Fakhariya, the likeliest Washukanni [C]: 93 km straight and a quarter"),
  att("hattusa", "nesa", 200, "the plateau road; Old Assyrian caravans covered about 25 km a marching day (Veenhof)"),
  att("nesa", "kizzuwatna", 290, "by the Cilician Gates to Tarsus: 232 km straight and a quarter"),
  att("ur", "gulf", 150, "Ur, a river port on the Euphrates in 1346, down the river's drawn bed through the marshes to the estuary at the Gulf's head, some 140 km in a straight line (02-gulf-head) [G]", "Ur is a river port: its ships go down the Euphrates and through the marshes to the Gulf's head, some 150 km."),
  att("ugaritwaters", "enkomiwaters", 130, "Cyprus's eastern cape to Ugarit, about a day's sail [G] (the geography dossier's estimate from Casson and the Kyrenia II trials)"),
];

/** What a player reads of why a connection takes the time it does (`Attested.note`), or null where the map's line says it. */
export function connectionNote(a: string, b: string): string | null {
  return AttestedKm.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))?.note ?? null;
}

/** Kilometres a day: on the road by the ground, at sea by the kind of passage. */
export const Pace = { open: 25, rough: 15, desert: 20, pass: 15, coasting: 70, openSea: 100 } as const;

/** With the current a voyage takes this share of its time, against it this share (first guesses). */
export const WithCurrent = 0.8;
export const AgainstCurrent = 1.25;

/**
 * The straight line between two points in kilometres, on a flat projection at the region's mean latitude (34°, where a
 * degree of longitude is 0.829 of a degree of latitude): within about 5% from Nubia to the Black Sea, and with only the
 * arithmetic every engine rounds alike.
 */
function straightKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat2 - lat1;
  const dLon = (lon2 - lon1) * 0.829;
  return 111.2 * Math.sqrt(dLat * dLat + dLon * dLon);
}

/** The length in whole kilometres of the connection between two neighbouring provinces (either way round). */
export function connectionKm(map: WorldMap, a: string, b: string): number {
  const known = AttestedKm.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  if (known) return known.km;
  const pa = map.get(a);
  const pb = map.get(b);
  // A coast and its own waters: the harbour, a few kilometres out.
  if (pa.waters === b || pb.waters === a) return 5;
  const straight = straightKm(pa.lat, pa.lon, pb.lat, pb.lon);
  return Math.max(5, Math.round(straight * (pa.isSea && pb.isSea ? 1.1 : 1.25)));
}

/** The edge between two neighbouring provinces, or null. */
function edgeOf(map: WorldMap, a: string, b: string) {
  return map.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)) ?? null;
}

const groundPace = (province: string): number => {
  const t = terrainOf(province);
  return t === "Rough" ? Pace.rough : t === "Desert" ? Pace.desert : Pace.open;
};

/**
 * Days from one province to a neighbouring one, to the tenth of a day. On land each half of the connection goes at the
 * pace of the province it lies in ("A road belongs to the land it crosses"), except over a pass or across the desert,
 * which set the pace of the whole connection; at sea by coasting or the open crossing, quicker with the current.
 */
export function connectionDays(map: WorldMap, from: string, to: string): number {
  let cache = daysCache.get(map);
  if (cache === undefined) daysCache.set(map, (cache = new Map()));
  const key = from + "|" + to;
  const known = cache.get(key);
  if (known !== undefined) return known;
  const days = connectionDaysOf(map, from, to);
  cache.set(key, days);
  return days;
}
/** Remembered once a map (item 17a): the days of a connection are a pure function of the map and the two provinces. */
const daysCache = new WeakMap<WorldMap, Map<string, number>>();
function connectionDaysOf(map: WorldMap, from: string, to: string): number {
  const e = edgeOf(map, from, to);
  if (e === null) throw new Error(`${from} and ${to} are not neighbours.`);
  const km = connectionKm(map, from, to);
  let days: number;
  // A desert road to a sea's shore (Thebes to the Red Sea) goes at the desert's pace, though it ends at a harbour; from a
  // shore other than the zone's own harbour the ship then sails to it (item 11c, from the review: else the empty sea would
  // join its two shores for nothing).
  if (e.kind === "Sea" && crossingBetween(from, to)?.kind === "Desert") days = km / Pace.desert + (ShoreVoyages.find((v) => (v.a === from && v.b === to) || (v.a === to && v.b === from))?.days ?? 0);
  else if (e.kind === "Sea") {
    days = km / (e.open ? Pace.openSea : Pace.coasting);
    if (e.current) days *= e.a === from ? WithCurrent : AgainstCurrent;
  } else {
    const c = crossingBetween(from, to);
    if (c !== null && c.kind === "Mountain") days = km / Pace.pass;
    else if (c !== null && c.kind === "Desert") days = km / Pace.desert;
    else days = km / 2 / groundPace(from) + km / 2 / groundPace(to);
  }
  return Math.round(days * 10) / 10;
}
