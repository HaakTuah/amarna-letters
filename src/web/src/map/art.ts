/**
 * The drawn geography of the board: coasts, seas, rivers, mountains, deserts, the province shapes, and where each province's
 * city, units and label sit. Pure drawing data, computed once; the game's own map data (provinces, connections, terrain)
 * comes from the engine. Coordinates are the board's, a true projection of the engine's latitudes and longitudes (item 11c, `projection.ts`), and
 * the coasts, lakes, great rivers and deserts are Natural Earth's (`geo-data.ts`, written by `scripts/map-geography.ts`).
 */
import { WorldMap, cmpStr, fmt, sortBy } from "@amarna/engine";
import { DesertRings, LakeRings, LandRings, RiverLines } from "./geo-data.ts";
import { BoardHeight, BoardWidth, boardPoint } from "./projection.ts";

export interface Pt {
  x: number;
  y: number;
}
export const pt = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const len = (a: Pt): number => Math.sqrt(a.x * a.x + a.y * a.y);
export const unit = (a: Pt): Pt => {
  const l = len(a);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
export const normal = (a: Pt): Pt => ({ x: -a.y, y: a.x });

/** A label's place relative to its province's city. */
export interface LabelSpot {
  dx: number;
  dy: number;
  anchor: string;
}

export const Width = BoardWidth;
export const Height = BoardHeight;
const Map_ = WorldMap.default;

/** A number as the map's path data writes it ("0.#"). */
export function F(v: number): string {
  return fmt(v, "0.#");
}

/** A Catmull-Rom curve through the points, as cubic Béziers. */
export function smooth(pts: readonly Pt[], closed = false): string {
  const n = pts.length;
  if (n < 3) return n === 2 ? `M${F(pts[0].x)},${F(pts[0].y)}L${F(pts[1].x)},${F(pts[1].y)}` : "";
  const at = (i: number): Pt => (closed ? pts[((i % n) + n) % n] : pts[Math.min(Math.max(i, 0), n - 1)]);
  let sb = `M${F(pts[0].x)},${F(pts[0].y)}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6.0));
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6.0));
    sb += `C${F(c1.x)},${F(c1.y)} ${F(c2.x)},${F(c2.y)} ${F(p2.x)},${F(p2.y)}`;
  }
  if (closed) sb += "Z";
  return sb;
}

/** A closed shape drawn with smooth curves through its points (for the coasts). */
export const smoothClosed = (pts: readonly Pt[]): string => smooth(pts, true);

export function polygon(pts: readonly Pt[]): string {
  let sb = "";
  for (let i = 0; i < pts.length; i++) sb += (i === 0 ? "M" : "L") + F(pts[i].x) + "," + F(pts[i].y);
  return sb + "Z";
}

// ---------------------------------------------------------------- the projection

/** A place on the board, from its latitude and longitude (the engine's true projection, item 11c). */
export const ll = (lat: number, lon: number): Pt => boardPoint(lat, lon);

/**
 * Where each sea zone is drawn: out on its waters (its latitude and longitude, for the lengths of connections, are its
 * harbour's).
 */
const SeaSpots: ReadonlyMap<string, Pt> = new Map([
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

/** Points given as latitude, longitude pairs. */
function LL(...latLon: number[]): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < latLon.length; i += 2) pts.push(ll(latLon[i], latLon[i + 1]));
  return pts;
}

/** A ring or line of the generated data ("lon,lat" in hundredths of a degree), on the board. */
const decode = (s: string): Pt[] =>
  s.split(" ").map((xy) => {
    const [lon, lat] = xy.split(",");
    return ll(Number(lat) / 100, Number(lon) / 100);
  });

function polyline(pts: readonly Pt[]): string {
  let sb = "";
  for (let i = 0; i < pts.length; i++) sb += (i === 0 ? "M" : "L") + F(pts[i].x) + "," + F(pts[i].y);
  return sb;
}

/** Whether a point lies inside a ring (even-odd). */
function inside(p: Pt, ring: readonly Pt[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

// ---------------------------------------------------------------- coasts

/** The frame of the sea, well beyond the board's edges. */
const Frame = `M-300,-300H${Width + 300}V${Height + 300}H-300Z`;

/** The island cities too small for the coastline at this scale: Arwad off Ṣumur. Drawn as a small round island. */
const isle = (c: Pt, r: number): Pt[] => Array.from({ length: 8 }, (_, i) => ({ x: c.x + r * Math.cos((i * Math.PI) / 4), y: c.y + r * Math.sin((i * Math.PI) / 4) }));
export const Isles: ReadonlyMap<string, Pt[]> = new Map([["arwad", isle(ll(34.86, 35.86), 1.6)]]);

const Rings: readonly Pt[][] = LandRings.map(decode);
/** The provinces drawn on islands of their own, shaped with the rest but shown only on their island: Cyprus and Dilmun. */
const IslandProvinces = ["kalavasos", "enkomi", "dilmun"];
const islandRing = (id: string): number => Rings.findIndex((r) => inside(city(id), r));
const IslandRings = new Set(IslandProvinces.map(islandRing).filter((i) => i >= 0));

/**
 * The Gulf's head as it lay in the Late Bronze Age, reaching up the lower plain towards Ur, a coastal city in the game
 * (the sea has since withdrawn by some 150 to 200 km; the reading is the item's). Its edge out to the modern sea is never
 * stroked, so it joins the Gulf without a seam.
 */
const OldGulfShore = LL(29.98, 47.95, 30.25, 47.75, 30.5, 47.4, 30.72, 46.95, 30.85, 46.5, 30.92, 46.2, 30.8, 46.1, 30.62, 46.35, 30.4, 46.8, 30.15, 47.25, 29.93, 47.6, 29.8, 47.85);
const OldGulf = `${polyline(OldGulfShore)}Z`;

const ringPath = (r: readonly Pt[]): string => polyline(r) + "Z";
/** All the land, the islands included, as one path (even-odd, so the old Gulf's head is cut from it). */
export const LandPath = `${Rings.map(ringPath).join("")} ${[...Isles.values()].map(smoothClosed).join(" ")} ${OldGulf}`;
/** The land of the mainland and the islands no province is drawn on alone; and of the islands that are. */
export const MainlandPath = `${Rings.filter((_, i) => !IslandRings.has(i)).map(ringPath).join("")} ${OldGulf}`;
export const IslandPath = `${Rings.filter((_, i) => IslandRings.has(i)).map(ringPath).join("")} ${[...Isles.values()].map(smoothClosed).join(" ")}`;
/** The coasts, for the shore lines (the old Gulf's head by its shore alone). */
export const CoastPath = `${Rings.map(ringPath).join("")} ${[...Isles.values()].map(smoothClosed).join(" ")} ${polyline(OldGulfShore)}`;
/** The sea: the frame with the land cut out (even-odd). */
export const SeaPath = `${Frame} ${LandPath}`;
/** The lakes of 1346, drawn over the land. */
export const LakePath = LakeRings.map((r) => ringPath(decode(r))).join("");

// ---------------------------------------------------------------- rivers, mountains, deserts, fields

export interface Line {
  id: string;
  name: string;
  path: string;
  width: number;
  labelled: boolean;
}

const river = (id: string, name: string, width: number, pieces: readonly Pt[][]): Line => ({ id, name, path: pieces.map(polyline).join(""), width, labelled: name !== "" });
const fromData = (id: string): Pt[][] => (RiverLines[id] ?? []).map(decode);

/** The rivers: the three great ones of the engine's geography first, then smaller ones for the eye. Courses from Natural Earth, the small ones by hand. */
export const Rivers: readonly Line[] = [
  river("nile", "Nile", 3.2, fromData("nile")),
  river("euphrates", "Euphrates", 2.8, fromData("euphrates")),
  river("tigris", "Tigris", 2.6, fromData("tigris")),
  river("khabur", "Khabur", 1.5, [LL(36.95, 39.95, 36.85, 40.1, 36.62, 40.55, 36.48, 40.75, 36.2, 40.72, 35.8, 40.6, 35.45, 40.48, 35.15, 40.43)]),
  river("balikh", "", 1.2, [LL(36.75, 39.05, 36.5, 39.08, 36.2, 39.05, 35.95, 39.02)]),
  river("halys", "Marassantiya", 1.8, fromData("halys")),
  river("orontes", "Orontes", 1.5, [LL(34.15, 36.35, 34.4, 36.42, 34.56, 36.52, 34.75, 36.65, 35.13, 36.75, 35.4, 36.5, 35.8, 36.32, 36.1, 36.3, 36.2, 36.15, 36.1, 35.98, 36.05, 35.95)]),
  river("jordan", "", 1.2, fromData("jordan")),
  river("hermos", "", 1.2, [LL(38.95, 29.3, 38.75, 28.7, 38.6, 28.2, 38.55, 27.5, 38.6, 26.9)]),
  river("maeander", "", 1.2, fromData("maeander")),
  river("seyhan", "", 1.2, [LL(38.0, 35.8, 37.4, 35.5, 37.0, 35.32, 36.75, 34.95)]),
  river("ceyhan", "", 1.2, fromData("ceyhan")),
  river("zab", "", 1.3, [LL(37.3, 44.0, 36.75, 43.85, 36.4, 43.65, 36.0, 43.35)]),
  river("lesser-zab", "", 1.1, [LL(36.3, 45.0, 35.75, 44.6, 35.25, 43.45)]),
  river("diyala", "", 1.2, [LL(35.0, 45.6, 34.2, 45.2, 33.75, 44.9, 33.2, 44.5)]),
  river("karkheh", "", 1.2, fromData("karkheh")),
];

/** Mountain ranges, drawn as rows of peaks along these lines. */
export const Ranges: readonly Pt[][] = [
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

/** Deserts, drawn with a stipple, as Natural Earth bounds them: the Syrian desert, the Negev, Egypt's eastern and western deserts, the Nubian desert and the Nafud. */
export const Deserts: readonly string[] = DesertRings.map(([, r]) => smoothClosed(decode(r)));

/** The black land along the Nile, a ribbon either side of its course, with the Delta's fan. */
const NileValley = (() => {
  const course = [[24.1, 32.9], [24.5, 32.95], [25.0, 32.85], [25.3, 32.55], [25.7, 32.64], [26.1, 32.72], [26.05, 32.25], [26.2, 31.9], [26.6, 31.6], [27.18, 31.18], [27.65, 30.9], [28.1, 30.75], [28.6, 30.8], [29.07, 31.1], [29.5, 31.2], [30.05, 31.22]];
  const w = 0.13;
  const west = course.map(([la, lo]) => ll(la, lo - w));
  const east = course.map(([la, lo]) => ll(la, lo + w)).reverse();
  return smoothClosed([...west, ...LL(29.35, 30.6, 29.3, 30.9), ...LL(30.4, 30.55, 30.9, 30.1, 31.3, 30.35, 31.5, 31.0, 31.45, 31.8, 31.25, 32.25, 31.0, 32.5, 30.6, 32.1, 30.3, 31.6), ...east]);
})();

/** The irrigated black land of the Nile and the alluvium between the rivers below Sippar: the richest fields. */
export const Fields: readonly string[] = [
  NileValley,
  smoothClosed(LL(34.1, 43.85, 33.6, 44.45, 33.0, 45.1, 32.3, 45.8, 31.6, 46.5, 31.05, 46.6, 31.1, 46.0, 31.6, 45.2, 32.2, 44.5, 32.8, 44.0, 33.5, 43.7)),
];

/** Points where the rivers', ranges' and lands' names are written, with the angle of each. */
const geo = (text: string, lat: number, lon: number, angle: number) => ({ text, ...ll(lat, lon), angle });
export const GeoLabels: readonly { text: string; x: number; y: number; angle: number }[] = [
  geo("NILE", 26.9, 31.55, -62), geo("EUPHRATES", 35.55, 39.9, 18), geo("TIGRIS", 34.2, 43.95, 62), geo("TAURUS", 37.55, 32.6, -4),
  geo("ZAGROS", 33.8, 47.6, 55), geo("SYRIAN DESERT", 32.4, 39.3, 0), geo("SINAI", 29.4, 33.85, 0), geo("LOWER SEA", 27.4, 50.7, -50),
  geo("ARABIAN DESERT", 27.8, 41.6, 0), geo("LEBANON", 33.9, 35.65, -62), geo("KHABUR", 36.0, 40.85, 80), geo("ORONTES", 35.35, 36.95, -70),
  geo("EASTERN DESERT", 24.9, 33.7, -62), geo("WESTERN DESERT", 25.5, 28.6, 0), geo("BLACK SEA", 42.05, 31.6, 0),
  geo("NAIRI", 38.9, 42.3, 0), geo("PONTUS", 40.95, 38.9, -4),
];

/** Punt, beyond the Red Sea: a door for newcomers, not a market. */
export const PuntDoor = { ...ll(20.35, 38.7), angle: 58 };

// ---------------------------------------------------------------- Voronoi cells

interface V {
  p: Pt;
  edge: string;
}

/** Province shapes as Voronoi cells of the cities within a frame, each edge between two cells wobbled the same way from both sides. */
function voronoiCells(sites: readonly [string, Pt][], wobble: number, frame: readonly Pt[] = Box): [string, string][] {
  const result: [string, string][] = [];
  for (const [id, a] of sites) {
    let poly: V[] = frame.map((p) => ({ p, edge: "#" }));
    for (const [other, b] of sites) {
      if (other === id) continue;
      poly = clip(poly, a, b, other);
      if (poly.length === 0) break;
    }
    if (poly.length < 3) continue;
    result.push([id, cellPath(poly, id, wobble)]);
  }
  return result;
}
const Box: readonly Pt[] = [
  { x: -20, y: -20 },
  { x: Width + 20, y: -20 },
  { x: Width + 20, y: Height + 20 },
  { x: -20, y: Height + 20 },
];

/** Keeps the part of the polygon closer to a than to b (Sutherland-Hodgman). */
function clip(poly: V[], a: Pt, b: Pt, label: string): V[] {
  const n = sub(b, a);
  const c = (b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y) / 2;
  const side = (p: Pt): number => n.x * p.x + n.y * p.y - c; // <= 0 inside
  const output: V[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const next = poly[(i + 1) % poly.length];
    const sc = side(cur.p);
    const sn = side(next.p);
    const cross = (): Pt => add(cur.p, mul(sub(next.p, cur.p), sc / (sc - sn)));
    if (sc <= 0) {
      output.push(cur);
      if (sn > 0) output.push({ p: cross(), edge: label });
    } else if (sn <= 0) output.push({ p: cross(), edge: cur.edge });
  }
  return output;
}

function cellPath(poly: V[], id: string, wobble: number): string {
  let sb = "";
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const next = poly[(i + 1) % poly.length];
    if (i === 0) sb += `M${F(cur.p.x)},${F(cur.p.y)}`;
    // Every edge between two sites wobbles (the bounding frame's do not: the coast clips them anyway).
    if (wobble > 0 && cur.edge !== "#") for (const w of wobbleBetween(cur.p, next.p, id, cur.edge, wobble)) sb += `L${F(w.x)},${F(w.y)}`;
    sb += `L${F(next.p.x)},${F(next.p.y)}`;
  }
  return sb + "Z";
}

/** Points between two corners of a shared edge, displaced the same way for both cells, from a seed of the two sites. */
function wobbleBetween(from: Pt, to: Pt, a: string, b: string, amp: number): Pt[] {
  const l = len(sub(to, from));
  if (l < 12) return [];
  const forward = from.x < to.x - 1e-6 || (Math.abs(from.x - to.x) <= 1e-6 && from.y < to.y);
  const p = forward ? from : to;
  const q = forward ? to : from;
  const key = a < b ? a + "|" + b : b + "|" + a;
  let seed = 17;
  for (let i = 0; i < key.length; i++) seed = (Math.imul(seed, 31) + key.charCodeAt(i)) | 0;
  const steps = Math.max(2, Math.trunc(l / 9));
  const nrm = normal(unit(sub(q, p)));
  const pts: Pt[] = [];
  for (let k = 1; k < steps; k++) {
    const t = k / steps;
    const envelope = Math.sin(Math.PI * t);
    const off = (Math.sin(t * Math.PI * 3 + (seed % 7)) * 0.6 + (hash01(seed + k * 13) - 0.5) * 0.8) * amp * envelope;
    pts.push(add(add(p, mul(sub(q, p), t)), mul(nrm, off)));
  }
  if (!forward) pts.reverse();
  return pts;
}

export function hash01(n: number): number {
  let x = Math.imul(n, 2654435761 | 0) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  x = Math.imul(x, 0x5bd1e995) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  return (x & 0xffff) / 65535.0;
}

// ---------------------------------------------------------------- province shapes

/**
 * Points that claim the empty land no province holds: the deserts of Libya, Egypt's east, Arabia and Syria, Transjordan's
 * steppe, the Zagros and Iran, the Armenian highlands and Anatolia's north-west. Their shapes are left unclaimed.
 */
const Wastes = LL(
  30.3, 28.4, 27.6, 28.2, 25.0, 29.2, 22.0, 29.6, 20.5, 27.0, 28.7, 32.25, 23.4, 34.5, 21.0, 35.5,
  29.6, 37.6, 27.0, 40.5, 24.5, 38.8, 28.2, 44.8, 25.5, 46.6, 23.0, 43.5, 21.0, 41.0, 30.8, 41.3, 32.6, 39.3, 33.3, 40.6,
  31.0, 36.6, 29.7, 35.6, 30.6, 44.0,
  35.8, 46.8, 33.9, 47.4, 32.6, 50.0, 30.6, 51.0, 37.7, 45.9, 38.7, 43.4, 39.9, 41.3, 41.3, 41.0, 40.2, 38.0,
  39.6, 31.8, 41.0, 31.4, 40.6, 28.4, 41.6, 33.0,
);

/** The sea zones' waters: each zone is shaped only with the others on the same waters, within them. */
const SeaBodies: readonly [readonly string[], readonly Pt[]][] = [
  [["redsea"], LL(30.5, 31.5, 30.5, 44.0, 12.0, 44.0, 12.0, 31.5)],
  [["gulf"], LL(31.6, 46.0, 31.6, 57.0, 22.0, 57.0, 22.0, 46.0)],
];
const MediterraneanBody = LL(40.2, 22.0, 40.2, 37.0, 30.5, 37.0, 30.5, 22.0);

function buildShapes(): Map<string, string> {
  const land = Map_.provinces.filter((p) => !p.isSea);
  const shapes = new Map<string, string>();
  const group = (g: readonly { id: string }[], extra: readonly Pt[], wobble: number, frame?: readonly Pt[]): void => {
    const sites: [string, Pt][] = [...g.map((p) => [p.id, city(p.id)] as [string, Pt]), ...extra.map((e, i) => [`~${i}`, e] as [string, Pt])];
    for (const [id, cell] of voronoiCells(sites, wobble, frame)) if (!id.startsWith("~")) shapes.set(id, cell);
  };
  group(land, Wastes, 3);
  const seas = Map_.provinces.filter((p) => p.isSea);
  for (const [ids, frame] of SeaBodies) group(seas.filter((p) => ids.includes(p.id)), [], 0, frame);
  group(seas.filter((p) => !SeaBodies.some(([ids]) => ids.includes(p.id))), [], 0, MediterraneanBody);
  for (const [id, pts] of Isles) shapes.set(id, smoothClosed(pts));
  return shapes;
}

/** Each province's shape, a cell clipped when drawn: land to its land ({@link landClipOf}), sea zones to the sea. */
export const Shapes: ReadonlyMap<string, string> = buildShapes();

/** The clip a province's shape is drawn within: the sea, its island, or the mainland. */
export function landClipOf(id: string): string {
  return Map_.get(id).isSea ? "url(#seaclip)" : IslandProvinces.includes(id) || Isles.has(id) ? "url(#isleclip)" : "url(#mainclip)";
}

export const WasteShapes: readonly string[] = voronoiCells(
  [...Map_.provinces.filter((p) => !p.isSea).map((p) => [p.id, city(p.id)] as [string, Pt]), ...Wastes.map((e, i) => [`~${i}`, e] as [string, Pt])],
  3,
)
  .filter(([id]) => id.startsWith("~"))
  .map(([, path]) => path);

// ---------------------------------------------------------------- places on the board

/** Where a province is drawn: a land province at its town, a sea zone out on its waters. */
export function city(id: string): Pt {
  const p = Map_.get(id);
  return SeaSpots.get(id) ?? ll(p.lat, p.lon);
}

/** The point a province's units and arrows are anchored to: its city. */
export const unitSpot = city;

// Names hang below their city (the units stand above it), except where a river, the coast or a neighbour is in the way.
const LabelOverrides: Record<string, LabelSpot> = { thebes: { dx: 13, dy: 4, anchor: "start" }, akhetaten: { dx: 13, dy: 4, anchor: "start" }, memphis: { dx: 13, dy: 4, anchor: "start" }, delta: { dx: -13, dy: 4, anchor: "end" },
        gaza: { dx: -13, dy: 4, anchor: "end" }, tyre: { dx: -13, dy: 4, anchor: "end" }, sidon: { dx: -13, dy: 4, anchor: "end" }, byblos: { dx: -13, dy: 4, anchor: "end" },
        ugarit: { dx: -13, dy: 4, anchor: "end" }, arwad: { dx: -9, dy: -6, anchor: "end" }, sumur: { dx: -11, dy: 9, anchor: "end" }, amurru: { dx: 12, dy: 4, anchor: "start" }, kaska: { dx: 0, dy: -9, anchor: "middle" }, damascus: { dx: 13, dy: 4, anchor: "start" }, megiddo: { dx: 13, dy: 4, anchor: "start" },
        shechem: { dx: 13, dy: 4, anchor: "start" }, jerusalem: { dx: 13, dy: 4, anchor: "start" }, alalakh: { dx: -13, dy: 4, anchor: "end" }, aleppo: { dx: 13, dy: 4, anchor: "start" },
        babylon: { dx: 13, dy: 4, anchor: "start" }, terqa: { dx: -13, dy: 4, anchor: "end" }, suhu: { dx: -13, dy: 4, anchor: "end" }, sippar: { dx: -13, dy: 4, anchor: "end" },
        nippur: { dx: -13, dy: 4, anchor: "end" }, ur: { dx: -13, dy: 4, anchor: "end" }, susa: { dx: -4, dy: 21, anchor: "middle" }, dilmun: { dx: -12, dy: 4, anchor: "end" }, nubia: { dx: 0, dy: -14, anchor: "middle" }, };

export function labelAt(id: string): LabelSpot {
  return LabelOverrides[id] ?? { dx: 0, dy: 21, anchor: "middle" };
}

// ---------------------------------------------------------------- roads for travellers

const routes = new Map<string, Pt[]>();

/** The shortest path between two provinces over every kind of connection, as points through their cities (a guess). */
export function route(from: string, to: string): Pt[] {
  const key = from + "|" + to;
  const cached = routes.get(key);
  if (cached !== undefined) return cached;
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length > 0 && !prev.has(to)) {
    const cur = queue.shift()!;
    for (const n of sortBy(new Set(Map_.neighbors(cur)), [(x: string) => x, cmpStr]))
      if (!prev.has(n)) {
        prev.set(n, cur);
        queue.push(n);
      }
  }
  let ids: string[] = [];
  for (let at: string | null = prev.has(to) ? to : null; at !== null; at = prev.get(at) ?? null) ids.push(at);
  ids.reverse();
  if (ids.length === 0) ids = [from, to];
  const pts = ids.map(city);
  routes.set(key, pts);
  return pts;
}

/** A point a fraction of the way along a polyline. */
export function along(pts: readonly Pt[], t: number): Pt {
  if (pts.length === 1) return pts[0];
  let total = 0.0;
  for (let i = 1; i < pts.length; i++) total += len(sub(pts[i], pts[i - 1]));
  let want = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = len(sub(pts[i], pts[i - 1]));
    if (want <= seg || i === pts.length - 1) return add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), seg < 1e-9 ? 0 : Math.min(1, want / seg)));
    want -= seg;
  }
  return pts[pts.length - 1];
}

/** A gentle curve between two points (arrows, routes), bowed to one side so opposite moves do not overlap. */
export function arc(a: Pt, b: Pt, bow = 0.12): string {
  const c = add(mul(add(a, b), 0.5), mul(normal(sub(b, a)), bow));
  return `M${F(a.x)},${F(a.y)}Q${F(c.x)},${F(c.y)} ${F(b.x)},${F(b.y)}`;
}

/** The point a fraction of the way along arc. */
export function arcAt(a: Pt, b: Pt, t: number, bow = 0.12): Pt {
  const c = add(mul(add(a, b), 0.5), mul(normal(sub(b, a)), bow));
  const u = 1 - t;
  return add(add(mul(a, u * u), mul(c, 2 * u * t)), mul(b, t * t));
}

/** Peaks along a range: small hachured triangles every few units. */
export function peaks(line: readonly Pt[], spacing = 15, size = 7): string {
  let sb = "";
  let total = 0.0;
  for (let i = 1; i < line.length; i++) total += len(sub(line[i], line[i - 1]));
  const count = Math.max(1, Math.trunc(total / spacing));
  for (let k = 0; k <= count; k++) {
    const p = along(line, count === 0 ? 0 : k / count);
    const s = size * (0.8 + 0.4 * hash01(k * 7 + Math.trunc(p.x)));
    sb += `M${F(p.x - s)},${F(p.y + s * 0.45)}L${F(p.x)},${F(p.y - s * 0.75)}L${F(p.x + s)},${F(p.y + s * 0.45)}`;
  }
  return sb;
}
