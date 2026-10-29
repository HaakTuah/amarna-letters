// Writes the board's drawn geography (src/web/src/map/geo-data.ts) from Natural Earth's public-domain data (build order
// item 11c, "The map in true geography"): the land, the lakes, the great rivers and the deserts, clipped to the board's
// frame and simplified for the screen, finer on the crowded Levant coast. Coordinates stay in degrees (hundredths), so
// the drawing projects them with the board's own projection (src/web/src/map/projection.ts).
//   mkdir -p <dir> && for f in ne_50m_land ne_50m_lakes ne_10m_rivers_lake_centerlines ne_10m_geography_regions_polys; do
//     curl -sSo <dir>/$f.geojson https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/$f.geojson; done
//   node --experimental-strip-types scripts/map-geography.ts <dir>
import { readFileSync, writeFileSync } from "node:fs";
import { BoardFrame, boardPoint } from "../src/web/src/map/projection.ts";

type LL = [number, number]; // lon, lat
const dir = process.argv[2];
const read = (f: string) => JSON.parse(readFileSync(`${dir}/${f}.geojson`, "utf8"));
// The land beyond the frame is drawn too, so a screen wider or taller than the board still shows land at its edges.
const box = { w: BoardFrame.west - 6, e: BoardFrame.east + 6, s: BoardFrame.south - 3, n: BoardFrame.north + 2.5 };
const inFrame = ([lon, lat]: LL) => lon > box.w && lon < box.e && lat > box.s && lat < box.n;
/** The crowded coasts, kept finer: the Levant and Cyprus. */
const fine = ([lon, lat]: LL) => lon > 32.5 && lon < 37 && lat > 30.5 && lat < 37.2;

function clipRing(ring: LL[]): LL[] {
  let out = ring;
  const edges: [(p: LL) => boolean, (a: LL, b: LL) => LL][] = [
    [(p) => p[0] >= box.w, (a, b) => cut(a, b, 0, box.w)],
    [(p) => p[0] <= box.e, (a, b) => cut(a, b, 0, box.e)],
    [(p) => p[1] >= box.s, (a, b) => cut(a, b, 1, box.s)],
    [(p) => p[1] <= box.n, (a, b) => cut(a, b, 1, box.n)],
  ];
  for (const [inside, at] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(at(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(at(prev, cur));
    }
    if (out.length === 0) break;
  }
  return out;
}
function cut(a: LL, b: LL, k: 0 | 1, v: number): LL {
  const t = (v - a[k]) / (b[k] - a[k]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Douglas-Peucker in board units, with a finer tolerance on the crowded coasts. */
function simplify(pts: LL[], tol: number, fineTol: number): LL[] {
  if (pts.length < 3) return pts;
  const xy = pts.map((p) => boardPoint(p[1], p[0]));
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length > 0) {
    const [i, j] = stack.pop()!;
    let best = -1;
    let at = -1;
    const a = xy[i];
    const b = xy[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1e-9;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs((xy[k].x - a.x) * dy - (xy[k].y - a.y) * dx) / l;
      const t = fine(pts[k]) ? d * (tol / fineTol) : d;
      if (t > best) {
        best = t;
        at = k;
      }
    }
    if (at >= 0 && best > tol) {
      keep[at] = 1;
      stack.push([i, at], [at, j]);
    }
  }
  return pts.filter((_, k) => keep[k] === 1);
}

/** A closed ring, simplified in two halves (its two ends are the same point). */
const simplifyRing = (r: LL[], tol: number, fineTol: number): LL[] => {
  const h = Math.floor(r.length / 2);
  return [...simplify(r.slice(0, h + 1), tol, fineTol), ...simplify([...r.slice(h), r[0]], tol, fineTol).slice(1, -1)];
};

const enc = (pts: LL[]): string => {
  const out: string[] = [];
  for (const [lon, lat] of pts) {
    const s = `${Math.round(lon * 100)},${Math.round(lat * 100)}`;
    if (out[out.length - 1] !== s) out.push(s);
  }
  return out.join(" ");
};
const polys = (g: { type: string; coordinates: unknown }): LL[][][] => (g.type === "Polygon" ? [g.coordinates as LL[][]] : (g.coordinates as LL[][][]));
const lines = (g: { type: string; coordinates: unknown }): LL[][] => (g.type === "LineString" ? [g.coordinates as LL[]] : (g.coordinates as LL[][]));
const area = (r: LL[]): number => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0) / 2);

// The land: every ring that reaches the frame, the islands too (the smallest dropped).
const land: string[] = [];
for (const f of read("ne_50m_land").features)
  for (const poly of polys(f.geometry))
    for (const ring of poly) {
      const c = clipRing(ring.slice(0, -1));
      if (c.length < 3 || !c.some(inFrame) || area(c) < 0.004) continue;
      const s = simplifyRing(c, 0.7, 0.22);
      if (s.length >= 3) land.push(enc(s));
    }

// The lakes that were there in 1346 (not the modern reservoirs).
const LakeNames = new Set(["Lake Van", "Lake Tuz", "Lake Urmia", "Dead Sea", "Sea of Galilee"]);
const lakes: string[] = [];
for (const f of read("ne_50m_lakes").features)
  if (LakeNames.has(f.properties.name)) for (const poly of polys(f.geometry)) lakes.push(enc(simplifyRing(poly[0].slice(0, -1), 0.5, 0.2)));

// The great rivers, each as its pieces (the Nile with its two branches through the Delta).
const RiverOf: Record<string, string> = {
  Nile: "nile", "Rosetta Branch": "nile", "Damietta Branch": "nile",
  Euphrates: "euphrates", Firat: "euphrates", "Al Furat": "euphrates",
  Tigris: "tigris", Dicle: "tigris", "Shatt al Arab": "tigris",
  "Kiz?lirmak": "halys", Jordan: "jordan", Ceyhan: "ceyhan", Karkheh: "karkheh", "Byk Menderes": "maeander",
};
const rivers: Record<string, string[]> = {};
for (const f of read("ne_10m_rivers_lake_centerlines").features) {
  const id = RiverOf[f.properties.name];
  if (id === undefined) continue;
  for (const l of lines(f.geometry)) {
    const kept = l.filter((p) => p[0] > box.w && p[0] < box.e && p[1] > box.s && p[1] < box.n);
    if (kept.length >= 2 && kept.some(inFrame)) (rivers[id] ??= []).push(enc(simplify(kept, 0.6, 0.25)));
  }
}

// The deserts, as Natural Earth names them.
const DesertNames: Record<string, string> = {
  "SYRIAN DESERT": "syrian", "Negev Desert": "negev", "Eastern Desert": "eastern", "NUBIAN DESERT": "nubian",
  "WESTERN DESERT": "western", "An Nafud Desert": "nafud",
};
const deserts: [string, string][] = [];
for (const f of read("ne_10m_geography_regions_polys").features) {
  const id = DesertNames[f.properties.NAME];
  if (id === undefined) continue;
  for (const poly of polys(f.geometry)) {
    const c = clipRing(poly[0].slice(0, -1));
    if (c.length >= 3) deserts.push([id, enc(simplifyRing(c, 1.5, 1.5))]);
  }
}

const q = (s: string) => JSON.stringify(s);
let ts = `// Generated by scripts/map-geography.ts from Natural Earth (public domain, naturalearthdata.com) for build order item 11c.
// Do not edit by hand: rerun the script. Points are "lon,lat" in hundredths of a degree, projected by the engine's boardPoint.
/* eslint-disable */

/** The land, as rings (islands included), clipped to the board's frame and simplified. */
export const LandRings: readonly string[] = [\n${land.map((r) => `  ${q(r)},`).join("\n")}\n];

/** The lakes of 1346: Van, Tuz, Urmia, the Dead Sea and the Sea of Galilee. */
export const LakeRings: readonly string[] = [\n${lakes.map((r) => `  ${q(r)},`).join("\n")}\n];

/** The great rivers, by id, each as its pieces. */
export const RiverLines: Readonly<Record<string, readonly string[]>> = {\n${Object.entries(rivers)
  .map(([k, v]) => `  ${k}: [\n${v.map((r) => `    ${q(r)},`).join("\n")}\n  ],`)
  .join("\n")}\n};

/** The deserts, by id, as rings. */
export const DesertRings: readonly (readonly [string, string])[] = [\n${deserts.map(([k, r]) => `  [${q(k)}, ${q(r)}],`).join("\n")}\n];
`;
writeFileSync(new URL("../src/web/src/map/geo-data.ts", import.meta.url), ts);
console.log(`land ${land.length} rings, lakes ${lakes.length}, rivers ${Object.keys(rivers).join(" ")}, deserts ${deserts.length}; ${(ts.length / 1024).toFixed(1)} KB`);
