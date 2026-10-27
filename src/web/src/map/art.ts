/**
 * The drawn geography of the board: coasts, seas, rivers, mountains, deserts, the province shapes, and where each province's
 * city, units and label sit. Pure drawing data, computed once; the game's own map data (provinces, connections, terrain)
 * comes from the engine. Coordinates are the engine's 1000 x 720 board.
 */
import { WorldMap, cmpStr, fmt, sortBy } from "@amarna/engine";

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

export const Width = 1000;
export const Height = 720;
const Map_ = WorldMap.default;

/** A number as the map's path data writes it ("0.#"). */
export function F(v: number): string {
  return fmt(v, "0.#");
}

function P(...xy: number[]): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < xy.length; i += 2) pts.push({ x: xy[i], y: xy[i + 1] });
  return pts;
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

// ---------------------------------------------------------------- coasts

/** The Great Green (the Mediterranean), from the Aegean shore round to the Egyptian coast. */
export const Mediterranean = P(-300, -300, 36, -300, 34, 0, 41, 28, 30, 56, 47, 80, 40, 108, 53, 130, 38, 152, 33, 180, 43, 204, 30, 228, 50, 246, 80, 252, 110, 266, 140, 286, 172, 300, 205, 296, 228, 281, 262, 272, 300, 268, 330, 276, 362, 283, 398, 291, 428, 281, 452, 272, 467, 285, 461, 303, 457, 326, 465, 351, 469, 372, 461, 398, 455, 424, 452, 452, 448, 480, 446, 505, 446, 530, 440, 556, 432, 580, 414, 589, 392, 586, 372, 580, 352, 573, 334, 575, 316, 578, 296, 583, 268, 588, 238, 593, 198, 599, 158, 604, 118, 607, 78, 610, 38, 612, 0, 614, -300, 640);
/** Alashiya, the copper island. */
export const Cyprus = P(240, 419, 251, 401, 274, 391, 305, 386, 336, 382, 360, 376, 386, 367, 410, 354, 421, 349, 415, 362, 399, 379, 389, 397, 372, 412, 350, 422, 320, 430, 290, 436, 262, 432, 244, 427);
/** A sliver of the Black Sea along the top edge, north of Hatti. */
export const BlackSea = P(196, -300, 206, 0, 222, 11, 262, 19, 302, 22, 346, 20, 400, 24, 452, 18, 500, 14, 542, 16, 582, 10, 612, 0, 650, -300);
/** The Lower Sea (the Gulf), in the corner beyond Ur, its head reaching up towards Elam. */
export const Gulf = P(1300, 500, 1000, 520, 990, 560, 975, 600, 962, 640, 952, 680, 945, 720, 940, 1000, 1300, 1000);
/** The island cities off the coasts: Arwad off Amurru, and Dilmun in the Gulf. Drawn as small round islands. */
const isle = (cx: number, cy: number, r: number): Pt[] => Array.from({ length: 8 }, (_, i) => ({ x: cx + r * Math.cos((i * Math.PI) / 4), y: cy + r * Math.sin((i * Math.PI) / 4) }));
export const Isles: ReadonlyMap<string, Pt[]> = new Map([
  ["arwad", isle(453, 366, 5)],
  ["dilmun", isle(985, 702, 9)],
]);

/** All the land, as one path (a rectangle with the seas cut out, even-odd). */
export const LandPath = `M-300,-300H1300V1000H-300Z ${smoothClosed(Mediterranean)} ${smoothClosed(BlackSea)} ${smoothClosed(Gulf)}`;
export const SeaPath = `${smoothClosed(Mediterranean)} ${smoothClosed(BlackSea)} ${smoothClosed(Gulf)}`;
/** Cyprus and the island cities, as one path. */
export const CyprusPath = [smoothClosed(Cyprus), ...[...Isles.values()].map(smoothClosed)].join(" ");

// ---------------------------------------------------------------- rivers, mountains, deserts, fields

export interface Line {
  id: string;
  name: string;
  path: string;
  width: number;
  labelled: boolean;
}

/** The rivers: the three great ones of the engine's geography first, then smaller ones for the eye. */
export const Rivers: readonly Line[] = [
        { id: "nile", name: "Nile", path: smooth(P(-10, 628, 16, 646, 40, 676, 72, 699, 110, 705, 150, 703, 195, 699, 245, 690, 290, 677, 316, 654, 330, 630)), width: 4.2, labelled: true },
        { id: "nile-w", name: "", path: smooth(P(330, 630, 319, 606, 312, 578)), width: 2.4, labelled: false },
        { id: "nile-e", name: "", path: smooth(P(330, 630, 352, 607, 366, 578)), width: 2.4, labelled: false },
        { id: "euphrates", name: "Euphrates", path: smooth(P(604, 40, 594, 88, 586, 138, 579, 186, 576, 228, 590, 252, 624, 263, 662, 273, 700, 291, 713, 322, 709, 360, 708, 397, 731, 421, 768, 440, 797, 472, 808, 522, 842, 553, 882, 582, 924, 630, 940, 680, 960, 702)), width: 3.6, labelled: true },
        { id: "tigris", name: "Tigris", path: smooth(P(800, 34, 822, 70, 841, 102, 846, 142, 842, 182, 836, 222, 830, 262, 826, 300, 828, 334, 838, 364, 862, 404, 886, 452, 906, 500, 926, 546, 944, 600, 958, 640, 970, 678)), width: 3.4, labelled: true },
        { id: "khabur", name: "Khabur", path: smooth(P(684, 100, 711, 150, 717, 200, 714, 250, 703, 290)), width: 1.8, labelled: false },
        { id: "balikh", name: "", path: smooth(P(632, 178, 641, 224, 646, 266)), width: 1.5, labelled: false },
        { id: "halys", name: "Marassantiya", path: smooth(P(530, 118, 472, 138, 420, 140, 345, 134, 302, 108, 296, 70, 312, 40, 332, 21)), width: 2.2, labelled: false },
        { id: "orontes", name: "Orontes", path: smooth(P(562, 478, 566, 422, 588, 362, 586, 318, 548, 291, 506, 284, 470, 287)), width: 1.9, labelled: false },
    ];

/** Mountain ranges, drawn as rows of peaks along these lines. */
export const Ranges: readonly Pt[][] = [
        P(206, 236, 252, 224, 300, 217, 346, 221, 392, 218, 440, 212, 478, 204), // the Taurus
        P(476, 214, 486, 244, 482, 270), // the Amanus
        P(612, 36, 650, 30, 690, 32, 732, 40, 770, 40), // the highlands of Isuwa and Nairi
        P(960, 92, 978, 140, 988, 196, 991, 256, 989, 320, 994, 384), // the Zagros
        P(506, 398, 514, 436, 518, 476), // the Lebanon
        P(268, 414, 288, 418, 308, 416), // the Troodos
        P(140, 120, 150, 168), // the hills of Mira
        P(20, 640, 48, 652, 30, 680), // desert scarps west of the Nile
    ];

/** Deserts, drawn with a stipple: the Syrian and Arabian deserts and the Sinai. */
export const Deserts: readonly string[] = [
        smoothClosed(P(604, 498, 640, 454, 700, 452, 760, 476, 784, 534, 766, 600, 700, 640, 622, 622, 590, 560)),
        smoothClosed(P(392, 640, 446, 612, 500, 628, 522, 688, 472, 716, 408, 712)),
        smoothClosed(P(530, 700, 600, 660, 700, 672, 800, 642, 870, 690, 905, 720, 520, 720)),
    ];

/** The irrigated black land of the Nile and the alluvium between the rivers below Sippar: the richest fields. */
export const Fields: readonly string[] = [
        smoothClosed(P(0, 694, 90, 692, 195, 686, 290, 664, 318, 640, 300, 600, 330, 588, 372, 590, 350, 620, 330, 660, 300, 690, 200, 714, 90, 720, 0, 720)),
        smoothClosed(P(724, 412, 790, 420, 862, 392, 900, 450, 940, 560, 968, 650, 948, 700, 920, 660, 870, 590, 820, 548, 790, 490, 750, 450)),
    ];

/** Points where the rivers' and ranges' names are written. */
export const GeoLabels: readonly { text: string; x: number; y: number; angle: number }[] = [
        { text: "NILE", x: 150, y: 716, angle: -3 }, { text: "EUPHRATES", x: 640, y: 255, angle: 15 }, { text: "TIGRIS", x: 830, y: 285, angle: 86 }, { text: "TAURUS", x: 300, y: 236, angle: -4 },
        { text: "ZAGROS", x: 978, y: 300, angle: 88 }, { text: "SYRIAN DESERT", x: 690, y: 545, angle: 0 }, { text: "SINAI", x: 470, y: 700, angle: 0 }, { text: "LOWER SEA", x: 983, y: 690, angle: -66 },
        { text: "ARABIAN DESERT", x: 700, y: 708, angle: 0 }, { text: "LEBANON", x: 527, y: 470, angle: -80 }, { text: "KHABUR", x: 724, y: 210, angle: 84 }, { text: "ORONTES", x: 600, y: 395, angle: -72 },
    ];

// ---------------------------------------------------------------- Voronoi cells

interface V {
  p: Pt;
  edge: string;
}

/** Province shapes as Voronoi cells of the cities, each edge between two cells wobbled the same way from both sides. */
function voronoiCells(sites: readonly [string, Pt][], wobble: number): [string, string][] {
  const result: [string, string][] = [];
  for (const [id, a] of sites) {
    let poly: V[] = [
      { p: { x: -20, y: -20 }, edge: "#" },
      { p: { x: Width + 20, y: -20 }, edge: "#" },
      { p: { x: Width + 20, y: Height + 20 }, edge: "#" },
      { p: { x: -20, y: Height + 20 }, edge: "#" },
    ];
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

/** The provinces of Cyprus, shaped among themselves; with the island cities, every province not shaped with the mainland. */
const Cypriots = new Set(["kalavasos", "enkomi"]);
const Islanders = new Set([...Cypriots, ...Isles.keys()]);

/** Points that claim the empty land no province holds (the deserts and the Zagros). Their shapes are left unclaimed. */
const Wastes = P(712, 600, 620, 655, 790, 668, 985, 330, 640, 22, 980, 30);

function buildShapes(): Map<string, string> {
  const land = Map_.provinces.filter((p) => !p.isSea && !Islanders.has(p.id));
  const sea = Map_.provinces.filter((p) => p.isSea);
  const island = Map_.provinces.filter((p) => Cypriots.has(p.id));
  const shapes = new Map<string, string>();
  const group = (g: readonly { id: string; x: number; y: number }[], extra: readonly Pt[], wobble: number): void => {
    const sites: [string, Pt][] = [...g.map((p) => [p.id, { x: p.x, y: p.y }] as [string, Pt]), ...extra.map((e, i) => [`~${i}`, e] as [string, Pt])];
    for (const [id, cell] of voronoiCells(sites, wobble)) if (!id.startsWith("~")) shapes.set(id, cell);
  };
  group(land, Wastes, 5);
  group(sea, [], 0);
  group(island, [], 3);
  for (const [id, pts] of Isles) shapes.set(id, smoothClosed(pts));
  return shapes;
}

/** Each province's shape: land shapes clipped to their coast by the land path, sea zones to the sea. */
export const Shapes: ReadonlyMap<string, string> = buildShapes();

export const WasteShapes: readonly string[] = voronoiCells(
  [
    ...Map_.provinces.filter((p) => !p.isSea && !Islanders.has(p.id)).map((p) => [p.id, { x: p.x, y: p.y }] as [string, Pt]),
    ...Wastes.map((e, i) => [`~${i}`, e] as [string, Pt]),
  ],
  5,
)
  .filter(([id]) => id.startsWith("~"))
  .map(([, path]) => path);

// ---------------------------------------------------------------- places on the board

export function city(id: string): Pt {
  const p = Map_.get(id);
  return { x: p.x, y: p.y };
}

/** The point a province's units and arrows are anchored to: its city. */
export const unitSpot = city;

// Names hang below their city (the units stand above it), except where a river, the coast or a neighbour is in the way.
const LabelOverrides: Record<string, LabelSpot> = { thebes: { dx: 13, dy: 4, anchor: "start" }, akhetaten: { dx: 13, dy: 4, anchor: "start" }, memphis: { dx: 13, dy: 4, anchor: "start" }, delta: { dx: -13, dy: 4, anchor: "end" },
        gaza: { dx: -13, dy: 4, anchor: "end" }, tyre: { dx: -13, dy: 4, anchor: "end" }, sidon: { dx: -13, dy: 4, anchor: "end" }, byblos: { dx: -13, dy: 4, anchor: "end" },
        ugarit: { dx: -13, dy: 4, anchor: "end" }, arwad: { dx: -10, dy: 4, anchor: "end" }, kaska: { dx: 0, dy: -9, anchor: "middle" }, damascus: { dx: 13, dy: 4, anchor: "start" }, megiddo: { dx: 13, dy: 4, anchor: "start" },
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
