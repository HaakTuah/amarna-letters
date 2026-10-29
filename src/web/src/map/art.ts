/**
 * The drawn geography of the board: coasts, seas, rivers, mountains, deserts, the province shapes, and where each province's
 * city, units and label sit. Pure drawing data, computed once; the game's own map data (provinces, connections, terrain)
 * comes from the engine. Coordinates are the board's, a true projection of the engine's latitudes and longitudes (item 11c, `projection.ts`), and
 * the coasts, lakes, great rivers and deserts are Natural Earth's (`geo-data.ts`, written by `scripts/map-geography.ts`).
 */
import { WorldMap, cmpStr, fmt, sortBy } from "@amarna/engine";
import { BorderArcs, ProvinceRings, Roads, RoughSpots } from "./border-data.ts";
import { city, decode, Isles, IslandProvinces, LL, ll, MiletusBayShore, OldGulfShore, RangeLines, RiverCourses, type Pt } from "./features.ts";
import { DesertRings, LakeRings, LandRings } from "./geo-data.ts";
import { BoardHeight, BoardWidth } from "./projection.ts";

export { city, Isles, ll, type Pt };

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

const Rings: readonly Pt[][] = LandRings.map(decode);
const islandRing = (id: string): number => Rings.findIndex((r) => inside(city(id), r));
const IslandRings = new Set(IslandProvinces.map(islandRing).filter((i) => i >= 0));

/** The old Gulf's head and the bay of Miletus, cut from today's land (features.ts). */
const OldGulf = `${polyline(OldGulfShore)}Z ${polyline(MiletusBayShore)}Z`;

const ringPath = (r: readonly Pt[]): string => polyline(r) + "Z";
/** All the land, the islands included, as one path (even-odd, so the old Gulf's head is cut from it). */
export const LandPath = `${Rings.map(ringPath).join("")} ${[...Isles.values()].map(smoothClosed).join(" ")} ${OldGulf}`;
/** The land of the mainland and the islands no province is drawn on alone; and of the islands that are. */
export const MainlandPath = `${Rings.filter((_, i) => !IslandRings.has(i)).map(ringPath).join("")} ${OldGulf}`;
export const IslandPath = `${Rings.filter((_, i) => IslandRings.has(i)).map(ringPath).join("")} ${[...Isles.values()].map(smoothClosed).join(" ")}`;
/** The coasts, for the shore lines (the old Gulf's head by its shore alone). */
export const CoastPath = `${Rings.map(ringPath).join("")} ${[...Isles.values()].map(smoothClosed).join(" ")} ${polyline(OldGulfShore)} ${polyline(MiletusBayShore)}`;
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

/** The rivers (features.ts): the three great ones of the engine's geography first, then smaller ones for the eye. */
export const Rivers: readonly Line[] = RiverCourses.map((r) => ({ id: r.id, name: r.name, path: r.pieces.map(polyline).join(""), width: r.width, labelled: r.name !== "" }));

/** Mountain ranges, drawn as rows of peaks along these lines. */
export const Ranges: readonly Pt[][] = RangeLines;

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

/** Sea zones' shapes as Voronoi cells of their spots within a frame. */
function voronoiCells(sites: readonly [string, Pt][], frame: readonly Pt[]): [string, string][] {
  const result: [string, string][] = [];
  for (const [id, a] of sites) {
    let poly: Pt[] = [...frame];
    for (const [other, b] of sites) {
      if (other === id) continue;
      poly = clip(poly, a, b);
      if (poly.length === 0) break;
    }
    if (poly.length >= 3) result.push([id, polygon(poly)]);
  }
  return result;
}

/** Keeps the part of the polygon closer to a than to b (Sutherland-Hodgman). */
function clip(poly: Pt[], a: Pt, b: Pt): Pt[] {
  const n = sub(b, a);
  const c = (b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y) / 2;
  const side = (p: Pt): number => n.x * p.x + n.y * p.y - c; // <= 0 inside
  const output: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const next = poly[(i + 1) % poly.length];
    const sc = side(cur);
    const sn = side(next);
    const cross = (): Pt => add(cur, mul(sub(next, cur), sc / (sc - sn)));
    if (sc <= 0) {
      output.push(cur);
      if (sn > 0) output.push(cross());
    } else if (sn <= 0) output.push(cross());
  }
  return output;
}

export function hash01(n: number): number {
  let x = Math.imul(n, 2654435761 | 0) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  x = Math.imul(x, 0x5bd1e995) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  return (x & 0xffff) / 65535.0;
}

// ---------------------------------------------------------------- province shapes

/** The sea zones' waters: each zone is shaped only with the others on the same waters, within them. */
const SeaBodies: readonly [readonly string[], readonly Pt[]][] = [
  [["redsea"], LL(30.5, 31.5, 30.5, 44.0, 12.0, 44.0, 12.0, 31.5)],
  [["gulf"], LL(31.6, 46.0, 31.6, 57.0, 22.0, 57.0, 22.0, 46.0)],
];
const MediterraneanBody = LL(40.2, 22.0, 40.2, 37.0, 30.5, 37.0, 30.5, 22.0);

/** A line of the traced data (thousandths of a degree, each point a step from the one before), on the board. */
function decodeFine(s: string): Pt[] {
  let x = 0;
  let y = 0;
  return s.split(" ").map((xy) => {
    const [dx, dy] = xy.split(",");
    x += Number(dx);
    y += Number(dy);
    return ll(y / 1000, x / 1000);
  });
}

const Arcs: readonly Pt[][] = BorderArcs.map(decodeFine);
/** A ring of the traced borders, its arcs joined in order. */
function ringOf(refs: readonly number[]): Pt[] {
  const pts: Pt[] = [];
  for (const r of refs) {
    const arc = r >= 0 ? Arcs[r] : [...Arcs[~r]].reverse();
    pts.push(...(pts.length > 0 ? arc.slice(1) : arc));
  }
  return pts;
}
const tracedPath = (rings: readonly (readonly number[])[]): string => rings.map((r) => polygon(ringOf(r))).join("");

/**
 * Province shapes (item 11c+): each land province's land as the script traced it along the ridges, frontier rivers and
 * desert edges between the cities (`scripts/map-borders.ts`, `border-data.ts`), reaching a little out to sea so the coast
 * clips it; the sea zones as Voronoi cells of their spots within their waters.
 */
function buildShapes(): Map<string, string> {
  const shapes = new Map<string, string>();
  for (const [id, rings] of Object.entries(ProvinceRings)) if (id !== "~") shapes.set(id, tracedPath(rings));
  const group = (g: readonly { id: string }[], frame: readonly Pt[]): void => {
    for (const [id, cell] of voronoiCells(g.map((p) => [p.id, city(p.id)] as [string, Pt]), frame)) shapes.set(id, cell);
  };
  const seas = Map_.provinces.filter((p) => p.isSea);
  for (const [ids, frame] of SeaBodies) group(seas.filter((p) => ids.includes(p.id)), frame);
  group(seas.filter((p) => !SeaBodies.some(([ids]) => ids.includes(p.id))), MediterraneanBody);
  for (const [id, pts] of Isles) shapes.set(id, smoothClosed(pts));
  return shapes;
}

/** Each province's shape, clipped when drawn: land to its land ({@link landClipOf}), sea zones to the sea. */
export const Shapes: ReadonlyMap<string, string> = buildShapes();

/** The clip a province's shape is drawn within: the sea, its island, or the mainland. */
export function landClipOf(id: string): string {
  return Map_.get(id).isSea ? "url(#seaclip)" : IslandProvinces.includes(id) || Isles.has(id) ? "url(#isleclip)" : "url(#mainclip)";
}

/** The land no one holds: the empty lands beyond the game and the islands no province is on, in the land's plain colour. */
export const WasteShapes: readonly string[] = [tracedPath(ProvinceRings["~"] ?? [])];

/** Where each rough province's mark stands (`border-data.ts`). */
export const RoughSpot: ReadonlyMap<string, Pt> = new Map(Object.entries(RoughSpots).map(([id, s]) => [id, decodeFine(s)[0]]));

// ---------------------------------------------------------------- places on the board

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

// ---------------------------------------------------------------- roads

/** The road between two neighbours as traced (`border-data.ts`), from `a` to `b`, with the point where it crosses their border. */
export function roadBetween(a: string, b: string): { pts: Pt[]; cross: number } {
  const forward = a < b;
  const data = Roads[forward ? `${a}|${b}` : `${b}|${a}`];
  if (data === undefined) return { pts: [city(a), city(b)], cross: -1 };
  const semi = data.indexOf(";");
  const at = Number(data.slice(0, semi));
  const pts = decodeFine(data.slice(semi + 1));
  // The road's ends are its cities, where the drawing puts them.
  pts[0] = city(forward ? a : b);
  pts[pts.length - 1] = city(forward ? b : a);
  return forward ? { pts, cross: at } : { pts: pts.reverse(), cross: at < 0 ? -1 : pts.length - 1 - at };
}

/**
 * The provinces a journey passes through, from its start to its end: by the fewest connections, over the edges `step`
 * allows (every kind, for someone on the road; an army's or a fleet's own, for a unit). Ties go by name, so the drawing
 * is stable.
 */
export function provincesOn(from: string, to: string, step: (a: string, b: string) => boolean = () => true): string[] {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length > 0 && !prev.has(to)) {
    const cur = queue.shift()!;
    for (const n of sortBy(new Set(Map_.neighbors(cur)), [(x: string) => x, cmpStr]))
      if (!prev.has(n) && step(cur, n)) {
        prev.set(n, cur);
        queue.push(n);
      }
  }
  const ids: string[] = [];
  for (let at: string | null = prev.has(to) ? to : null; at !== null; at = prev.get(at) ?? null) ids.push(at);
  return ids.length === 0 ? [from, to] : ids.reverse();
}

/** The way through a chain of provinces along their roads: its points, and where it crosses each border (an index into them). */
export function wayThrough(ids: readonly string[]): { pts: Pt[]; crossings: { at: number; a: string; b: string }[] } {
  const pts: Pt[] = [];
  const crossings: { at: number; a: string; b: string }[] = [];
  for (let i = 1; i < ids.length; i++) {
    const r = roadBetween(ids[i - 1], ids[i]);
    const offset = pts.length === 0 ? 0 : pts.length - 1;
    if (r.cross >= 0) crossings.push({ at: offset + r.cross, a: ids[i - 1], b: ids[i] });
    pts.push(...(pts.length === 0 ? r.pts : r.pts.slice(1)));
  }
  return { pts: pts.length > 0 ? pts : ids.map(city), crossings };
}

const routes = new Map<string, Pt[]>();

/** The way between two provinces over every kind of connection, along the roads through each province on it (a guess). */
export function route(from: string, to: string): Pt[] {
  const key = from + "|" + to;
  const cached = routes.get(key);
  if (cached !== undefined) return cached;
  const pts = wayThrough(provincesOn(from, to)).pts;
  routes.set(key, pts);
  return pts;
}

/** The provinces a unit's move passes through: next door by its own kind of connection, or for an army by sea along the sea zones. */
export function unitWay(kind: "Army" | "Fleet", from: string, to: string): string[] {
  if (Map_.canMove(kind, from, to) || Map_.areAdjacent(from, to)) return [from, to];
  if (kind === "Army") return provincesOn(from, to, (a, b) => b === to || Map_.get(b).isSea);
  return provincesOn(from, to, (_, b) => Map_.get(b).isSea || b === to);
}

/** A smooth line through points (the way a road is drawn). */
export function roadPath(pts: readonly Pt[]): string {
  return pts.length > 2 ? smooth(pts) : polyline(pts);
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
