// Traces the provinces' borders and the roads between their cities along the land itself (build order item 11c+,
// "Provinces take the land's own borders"), and writes them to src/web/src/map/border-data.ts.
//   node --experimental-strip-types scripts/map-borders.ts            (writes the data and prints the disagreements)
//
// The board is laid on a fine grid. Each city claims the land it reaches first, where crossing a ridge, a frontier river or
// a desert's edge costs a long detour, so each border runs along the feature between two cities and, where none lies
// between them, along their midline. The land unreached (an island no province is on) and the land the empty places claim
// (`Wastes`) is no one's. Shared borders are traced once, smoothed and simplified, so neighbours meet without a seam. Each
// connection's road is then the cheapest way between its cities within their two provinces, and a sea voyage's the way
// over water. Coordinates are written in thousandths of a degree, so the drawing projects them as it projects the coasts.
import { writeFileSync } from "node:fs";
import { Crossings, WorldMap, Rough } from "../src/engine/src/index.ts";
import { DesertRings, LakeRings, LandRings } from "../src/web/src/map/geo-data.ts";
import { boardPoint, BoardHeight, BoardWidth, BoardFrame } from "../src/web/src/map/projection.ts";
import { city, decode, Isles, MiletusBayShore, OldGulfShore, RangeLines, RiverCourses, RoadLands, Wastes, type Pt } from "../src/web/src/map/features.ts";

const Map_ = WorldMap.default;
const R = 0.5; // grid cell, in board units (about 1.3 km)
const X0 = -20;
const Y0 = -20;
const W = Math.ceil((BoardWidth + 40) / R);
const H = Math.ceil((BoardHeight + 40) / R);
const N = W * H;
const gx = (x: number): number => Math.floor((x - X0) / R);
const gy = (y: number): number => Math.floor((y - Y0) / R);
const cx = (i: number): number => X0 + (i + 0.5) * R;
const cy = (j: number): number => Y0 + (j + 0.5) * R;

// ---------------------------------------------------------------- land and water

/** Even-odd scanline fill of rings into a mask. */
function fill(rings: readonly Pt[][], mask: Uint8Array, value: number): void {
  for (let j = 0; j < H; j++) {
    const y = cy(j);
    const xs: number[] = [];
    for (const ring of rings)
      for (let k = 0, m = ring.length - 1; k < ring.length; m = k++) {
        const a = ring[k];
        const b = ring[m];
        if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil((xs[k] - X0) / R - 0.5));
      const to = Math.min(W - 1, Math.floor((xs[k + 1] - X0) / R - 0.5));
      for (let i = from; i <= to; i++) mask[j * W + i] = mask[j * W + i] === value ? 0 : value;
    }
  }
}

const land = new Uint8Array(N);
fill([...LandRings.map(decode), OldGulfShore, MiletusBayShore], land, 1);
const lakes = new Uint8Array(N);
fill(LakeRings.map(decode), lakes, 1);
for (let k = 0; k < N; k++) if (lakes[k]) land[k] = 0;

/** Water within reach of a coast: a province's shape reaches a little out to sea, so the coast clips it cleanly. */
const MarginCells = Math.round(4 / R);
const nearCoast = new Uint8Array(N);
{
  const dist = new Int16Array(N).fill(-1);
  const queue: number[] = [];
  for (let k = 0; k < N; k++) if (land[k]) (dist[k] = 0), queue.push(k);
  for (let h = 0; h < queue.length; h++) {
    const k = queue[h];
    if (dist[k] >= MarginCells) continue;
    const i = k % W;
    const j = (k - i) / W;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const n = nj * W + ni;
      if (dist[n] >= 0) continue;
      dist[n] = dist[k] + 1;
      nearCoast[n] = 1;
      queue.push(n);
    }
  }
}

// ---------------------------------------------------------------- what is hard to cross

/** Extra cost to enter each cell, in board units: ridges, frontier rivers, desert edges. */
const barrier = new Float32Array(N);
const desert = new Uint8Array(N);
fill(DesertRings.map(([, r]) => decode(r)), desert, 1);

function stroke(line: readonly Pt[], radius: number, cost: number, where: (p: Pt) => boolean = () => true): void {
  for (let s = 1; s < line.length; s++) {
    const a = line[s - 1];
    const b = line[s];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(l / (R / 3)));
    for (let t = 0; t <= steps; t++) {
      const p = { x: a.x + ((b.x - a.x) * t) / steps, y: a.y + ((b.y - a.y) * t) / steps };
      if (!where(p)) continue;
      for (let j = gy(p.y - radius); j <= gy(p.y + radius); j++)
        for (let i = gx(p.x - radius); i <= gx(p.x + radius); i++) {
          if (i < 0 || j < 0 || i >= W || j >= H) continue;
          if (Math.hypot(cx(i) - p.x, cy(j) - p.y) > radius) continue;
          const k = j * W + i;
          barrier[k] = Math.max(barrier[k], cost);
        }
    }
  }
}

/** Board point back to latitude and longitude (the inverse of the board's Mercator). */
const rad = Math.PI / 180;
const scale = BoardFrame.width / ((BoardFrame.east - BoardFrame.west) * rad);
const merc = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
const top = merc(BoardFrame.north);
function toLatLon(p: Pt): [number, number] {
  const m = top - p.y / scale;
  return [(2 * Math.atan(Math.exp(m)) - Math.PI / 2) / rad, BoardFrame.west + p.x / scale / rad];
}

// A barrier band is about three cells deep; these are the costs of crossing one, in board units (one is 2.6 km).
const Cost = { ridge: 36, frontierRiver: 30, river: 12, desertEdge: 18 } as const;
const Radius = 0.75;
for (const line of RangeLines) stroke(line, Radius, Cost.ridge / 3);
for (const r of RiverCourses) {
  const big = r.id === "euphrates" || r.id === "tigris";
  for (const piece of r.pieces)
    stroke(piece, Radius, (big ? Cost.frontierRiver : Cost.river) / 3, (p) => {
      const [lat, lon] = toLatLon(p);
      return r.frontier(lat, lon);
    });
}
// A desert's edge: the cells where the stipple meets the sown.
for (let j = 1; j < H - 1; j++)
  for (let i = 1; i < W - 1; i++) {
    const k = j * W + i;
    if (desert[k] && (!desert[k - 1] || !desert[k + 1] || !desert[k - W] || !desert[k + W])) barrier[k] = Math.max(barrier[k], Cost.desertEdge / 2);
  }

// ---------------------------------------------------------------- the provinces claim their land

const landIds = Map_.landProvinces.map((p) => p.id).filter((id) => !Isles.has(id));
const NoOne = landIds.length; // the empty lands' claim, and the land no one reaches
const Sea = NoOne + 1;
const label = new Int32Array(N).fill(Sea);
const cost = new Float64Array(N).fill(Infinity);

/** The nearest land cell to a point (a city on a tiny island, or a coast the data rounds off, is seeded on the shore). */
function seedCell(p: Pt): number {
  let best = -1;
  let bd = Infinity;
  const r = Math.ceil(12 / R);
  const i0 = gx(p.x);
  const j0 = gy(p.y);
  for (let j = j0 - r; j <= j0 + r; j++)
    for (let i = i0 - r; i <= i0 + r; i++) {
      if (i < 0 || j < 0 || i >= W || j >= H || !land[j * W + i]) continue;
      const d = Math.hypot(cx(i) - p.x, cy(j) - p.y);
      if (d < bd) (bd = d), (best = j * W + i);
    }
  return best;
}

// Cities stand at their fords and passes: no barrier right about a city.
for (const id of landIds) {
  const c = city(id);
  for (let j = gy(c.y - 2.5); j <= gy(c.y + 2.5); j++) for (let i = gx(c.x - 2.5); i <= gx(c.x + 2.5); i++) if (Math.hypot(cx(i) - c.x, cy(j) - c.y) <= 2.5) barrier[j * W + i] = 0;
}

/** A binary heap of cells by cost. */
class Heap {
  private keys: number[] = [];
  private vals: number[] = [];
  get size(): number {
    return this.keys.length;
  }
  push(k: number, v: number): void {
    const ks = this.keys;
    const vs = this.vals;
    let i = ks.length;
    ks.push(k);
    vs.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (vs[p] <= v) break;
      ks[i] = ks[p];
      vs[i] = vs[p];
      i = p;
    }
    ks[i] = k;
    vs[i] = v;
  }
  pop(): [number, number] {
    const ks = this.keys;
    const vs = this.vals;
    const k0 = ks[0];
    const v0 = vs[0];
    const k = ks.pop()!;
    const v = vs.pop()!;
    if (ks.length > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= ks.length) break;
        const r = l + 1;
        const c = r < ks.length && vs[r] < vs[l] ? r : l;
        if (vs[c] >= v) break;
        ks[i] = ks[c];
        vs[i] = vs[c];
        i = c;
      }
      ks[i] = k;
      vs[i] = v;
    }
    return [k0, v0];
  }
}

const Steps: readonly [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

{
  const heap = new Heap();
  const seed = (p: Pt, l: number): void => {
    const k = seedCell(p);
    if (k < 0) return;
    cost[k] = 0;
    label[k] = l;
    heap.push(k, 0);
  };
  landIds.forEach((id, l) => seed(city(id), l));
  for (const w of Wastes) seed(w, NoOne);
  while (heap.size > 0) {
    const [k, c] = heap.pop();
    if (c > cost[k]) continue;
    const i = k % W;
    const j = (k - i) / W;
    for (const [di, dj, d] of Steps) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const n = nj * W + ni;
      // Over land, or out into the water by a coast; never from the water onto land, so no province takes an island it is not on.
      if (!land[n] && !nearCoast[n]) continue;
      if (land[n] && !land[k]) continue;
      const nc = c + d * R + barrier[n];
      if (nc < cost[n]) {
        cost[n] = nc;
        label[n] = label[k];
        heap.push(n, nc);
      }
    }
  }
  // Land no one reached is no one's.
  for (let k = 0; k < N; k++) if (land[k] && label[k] === Sea) label[k] = NoOne;
}

// A road's land given to one of the provinces it joins (item 11f+): a band along it is that province's.
const RoadBand = 2; // board units either side, about 5 km
const band = new Uint8Array(N);
const nearOtherCity = (x: number, y: number, l: number): boolean => landIds.some((id, m) => m !== l && Math.hypot(city(id).x - x, city(id).y - y) < 4);
for (const { province, road } of RoadLands) {
  const l = landIds.indexOf(province);
  for (let s = 1; s < road.length; s++) {
    const a = road[s - 1];
    const b = road[s];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (R / 2)));
    for (let t = 0; t <= steps; t++) {
      const p = { x: a.x + ((b.x - a.x) * t) / steps, y: a.y + ((b.y - a.y) * t) / steps };
      for (let j = gy(p.y - RoadBand); j <= gy(p.y + RoadBand); j++)
        for (let i = gx(p.x - RoadBand); i <= gx(p.x + RoadBand); i++)
          if (i >= 0 && j >= 0 && i < W && j < H && land[j * W + i] && Math.hypot(cx(i) - p.x, cy(j) - p.y) <= RoadBand && !nearOtherCity(cx(i), cy(j), l)) (label[j * W + i] = l), (band[j * W + i] = 1);
    }
  }
}

// Land a band cuts off from its own city goes with the band: the road's province holds what lies beyond it.
{
  const home = new Int32Array(N).fill(-1);
  let comp = 0;
  const cities = new Set(landIds.map((id) => seedCell(city(id))));
  for (let k0 = 0; k0 < N; k0++) {
    if (home[k0] >= 0 || !land[k0] || label[k0] >= NoOne) continue;
    const l = label[k0];
    const cells = [k0];
    home[k0] = comp;
    let own = false;
    let to = -1;
    for (let h = 0; h < cells.length; h++) {
      const k = cells[h];
      if (cities.has(k)) own = true;
      const i = k % W;
      const j = (k - i) / W;
      for (const [di, dj] of Steps) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = nj * W + ni;
        if (!land[n]) continue;
        if (label[n] === l) {
          if (home[n] < 0) (home[n] = comp), cells.push(n);
        } else if (band[n]) to = label[n];
      }
    }
    if (!own && to >= 0) for (const k of cells) label[k] = to;
    comp++;
  }
}

// No label may touch itself only at a corner (a checkerboard), so every border corner has one way on.
for (let pass = 0; pass < 6; pass++) {
  let changed = 0;
  for (let j = 0; j + 1 < H; j++)
    for (let i = 0; i + 1 < W; i++) {
      const a = j * W + i;
      const b = a + 1;
      const c = a + W;
      const d = c + 1;
      if (label[a] === label[d] && label[b] !== label[a] && label[c] !== label[a]) (label[b] = label[a]), changed++;
      else if (label[b] === label[c] && label[a] !== label[b] && label[d] !== label[b]) (label[a] = label[b]), changed++;
    }
  if (changed === 0) break;
}

// ---------------------------------------------------------------- borders, traced once each

const CW = W + 1;
const at = (i: number, j: number): number => (i < 0 || j < 0 || i >= W || j >= H ? -1 : label[j * W + i]);
/** The four cells about a corner: top-left, top-right, bottom-left, bottom-right. */
const around = (ci: number, cj: number): [number, number, number, number] => [at(ci - 1, cj - 1), at(ci, cj - 1), at(ci - 1, cj), at(ci, cj)];
const junction = (ci: number, cj: number): boolean => new Set(around(ci, cj)).size >= 3;

/** The corners next to a corner along a border, by the cells on either side of each edge. */
function borderNeighbours(ci: number, cj: number): [number, number][] {
  const [tl, tr, bl, br] = around(ci, cj);
  const out: [number, number][] = [];
  if (tl !== tr) out.push([ci, cj - 1]); // up: between top-left and top-right
  if (bl !== br) out.push([ci, cj + 1]);
  if (tl !== bl) out.push([ci - 1, cj]);
  if (tr !== br) out.push([ci + 1, cj]);
  return out;
}
const edgeKey = (a: number, b: number): number => Math.min(a, b) * 2 + (Math.abs(a - b) === 1 ? 0 : 1);
const visited = new Set<number>();
const ckey = (i: number, j: number): number => j * CW + i;

interface Arc {
  pts: Pt[];
  left: number;
  right: number;
  loop: boolean;
}
const arcs: Arc[] = [];

/** The cells to the left and right of the edge from one corner to the next (board y grows down). */
function sides(a: [number, number], b: [number, number]): [number, number] {
  const [ai, aj] = a;
  const [bi, bj] = b;
  if (bi === ai + 1) return [at(ai, aj - 1), at(ai, aj)]; // east: left is above
  if (bi === ai - 1) return [at(bi, aj), at(bi, aj - 1)]; // west: left is below
  if (bj === aj + 1) return [at(ai, aj), at(ai - 1, aj)]; // south: left is east
  return [at(ai - 1, bj), at(ai, bj)]; // north: left is west
}

function walk(start: [number, number], next: [number, number]): Arc {
  const [left, right] = sides(start, next);
  const corners: [number, number][] = [start];
  let prev = start;
  let cur = next;
  for (;;) {
    visited.add(edgeKey(ckey(...prev), ckey(...cur)));
    corners.push(cur);
    if (junction(...cur) || (cur[0] === start[0] && cur[1] === start[1])) break;
    const options = borderNeighbours(...cur).filter(([i, j]) => !(i === prev[0] && j === prev[1]));
    const [ni, nj] = options[0];
    prev = cur;
    cur = [ni, nj];
  }
  const loop = corners[0][0] === corners[corners.length - 1][0] && corners[0][1] === corners[corners.length - 1][1] && !junction(...start);
  return { pts: corners.map(([i, j]) => ({ x: X0 + i * R, y: Y0 + j * R })), left, right, loop };
}

for (let cj = 0; cj <= H; cj++)
  for (let ci = 0; ci <= W; ci++) {
    if (!junction(ci, cj)) continue;
    for (const n of borderNeighbours(ci, cj)) if (!visited.has(edgeKey(ckey(ci, cj), ckey(...n)))) arcs.push(walk([ci, cj], n));
  }
// Borders with no junction on them: a province ringed by one other.
for (let cj = 0; cj <= H; cj++)
  for (let ci = 0; ci <= W; ci++) {
    const ns = borderNeighbours(ci, cj);
    if (ns.length !== 2) continue;
    if (!visited.has(edgeKey(ckey(ci, cj), ckey(...ns[0])))) arcs.push(walk([ci, cj], ns[0]));
  }

/** Smooths an arc's staircase (its ends stay put, so neighbours still meet) and simplifies it (Douglas-Peucker). */
function smoothArc(pts: Pt[], loop: boolean, tolerance: number): Pt[] {
  let p = pts;
  for (let pass = 0; pass < 3; pass++) {
    const q = p.map((v, i) => {
      if (!loop && (i === 0 || i === p.length - 1)) return v;
      const a = p[(i - 1 + p.length) % p.length];
      const b = p[(i + 1) % p.length];
      return { x: (a.x + 2 * v.x + b.x) / 4, y: (a.y + 2 * v.y + b.y) / 4 };
    });
    p = q;
  }
  return simplify(p, tolerance);
}
function simplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length <= 2) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    let worst = -1;
    let wd = tol;
    const A = pts[a];
    const B = pts[b];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const l = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) {
      const P = pts[i];
      const d = l < 1e-9 ? Math.hypot(P.x - A.x, P.y - A.y) : Math.abs(dy * P.x - dx * P.y + B.x * A.y - B.y * A.x) / l;
      if (d > wd) (wd = d), (worst = i);
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const drawn = (l: number): boolean => l >= 0 && l <= NoOne;
const inland = (a: Arc): boolean => a.left !== Sea && a.right !== Sea && a.left >= 0 && a.right >= 0;
const used = arcs.filter((a) => drawn(a.left) || drawn(a.right));
const shaped = used.map((a) => ({ ...a, pts: smoothArc(a.pts, a.loop, inland(a) ? 0.12 : 0.6) }));

/** Each drawn label's rings, as arcs in order (an index, or its bitwise complement for an arc run backwards). */
function ringsOf(l: number): number[][] {
  const mine = shaped.map((a, i) => ({ a, i })).filter(({ a }) => a.left === l || a.right === l);
  const k = (p: Pt): string => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  const from = new Map<string, number[]>(); // start corner -> arc refs, oriented with l on the left
  const refs: number[] = [];
  for (const { a, i } of mine) {
    const ref = a.left === l ? i : ~i;
    refs.push(ref);
    const start = ref >= 0 ? a.pts[0] : a.pts[a.pts.length - 1];
    const list = from.get(k(start)) ?? [];
    list.push(ref);
    from.set(k(start), list);
  }
  const done = new Set<number>();
  const rings: number[][] = [];
  for (const r0 of refs) {
    if (done.has(r0)) continue;
    const ring: number[] = [];
    let r = r0;
    for (let guard = 0; guard < 100000; guard++) {
      done.add(r);
      ring.push(r);
      const a = shaped[r >= 0 ? r : ~r];
      if (a.loop) break;
      const end = r >= 0 ? a.pts[a.pts.length - 1] : a.pts[0];
      const nexts = (from.get(k(end)) ?? []).filter((x) => !done.has(x));
      if (nexts.length === 0) break;
      r = nexts[0];
    }
    rings.push(ring);
  }
  return rings;
}

// ---------------------------------------------------------------- roads

const crossingCost = (k: number): number => (barrier[k] > 0 ? barrier[k] * 0.25 : 0);

/** The cheapest way between two points over the cells allowed, or null (A*, 8 ways). */
function road(a: Pt, b: Pt, allowed: (k: number) => boolean, terrain: (k: number) => number): number[] | null {
  const s = seedAny(a, allowed);
  const t = seedAny(b, allowed);
  if (s < 0 || t < 0) return null;
  const g = new Map<number, number>([[s, 0]]);
  const prev = new Map<number, number>();
  const heap = new Heap();
  const ti = t % W;
  const tj = (t - ti) / W;
  const h = (k: number): number => {
    const i = k % W;
    return Math.hypot(i - ti, (k - i) / W - tj) * R;
  };
  heap.push(s, h(s));
  const closed = new Set<number>();
  while (heap.size > 0) {
    const [k] = heap.pop();
    if (k === t) break;
    if (closed.has(k)) continue;
    closed.add(k);
    const i = k % W;
    const j = (k - i) / W;
    for (const [di, dj, d] of Steps) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const n = nj * W + ni;
      if (!allowed(n) && n !== t) continue;
      const nc = g.get(k)! + d * R * terrain(n) + crossingCost(n);
      if (nc < (g.get(n) ?? Infinity)) {
        g.set(n, nc);
        prev.set(n, k);
        heap.push(n, nc + h(n));
      }
    }
  }
  if (!prev.has(t)) return null;
  const path = [t];
  for (let k = t; k !== s; ) path.push((k = prev.get(k)!));
  return path.reverse();
}
function seedAny(p: Pt, allowed: (k: number) => boolean): number {
  let best = -1;
  let bd = Infinity;
  const r = Math.ceil(10 / R);
  for (let j = gy(p.y) - r; j <= gy(p.y) + r; j++)
    for (let i = gx(p.x) - r; i <= gx(p.x) + r; i++) {
      if (i < 0 || j < 0 || i >= W || j >= H || !allowed(j * W + i)) continue;
      const d = Math.hypot(cx(i) - p.x, cy(j) - p.y);
      if (d < bd) (bd = d), (best = j * W + i);
    }
  return best;
}

const idx = new Map(landIds.map((id, i) => [id, i] as const));
const roads: Record<string, string> = {};
const disagree: string[] = [];
const touching = new Set<string>();
for (const a of shaped)
  if (a.left >= 0 && a.left < NoOne && a.right >= 0 && a.right < NoOne) {
    let l = 0;
    for (let i = 1; i < a.pts.length; i++) l += Math.hypot(a.pts[i].x - a.pts[i - 1].x, a.pts[i].y - a.pts[i - 1].y);
    if (l >= 1) touching.add([landIds[a.left], landIds[a.right]].sort().join("|"));
  }

const isSea = (id: string): boolean => Map_.get(id).isSea;
const water = (k: number): boolean => !land[k];
const pairs = new Set<string>();
for (const p of Map_.provinces) for (const n of Map_.neighbors(p.id)) pairs.add([p.id, n].sort().join("|"));
for (const key of [...pairs].sort()) {
  const [a, b] = key.split("|");
  const A = city(a);
  const B = city(b);
  let cells: number[] | null = null;
  let crossAt = -1;
  if (!isSea(a) && !isSea(b) && idx.has(a) && idx.has(b) && Map_.canMove("Army", a, b)) {
    const la = idx.get(a)!;
    const lb = idx.get(b)!;
    const desertCost = (k: number): number => (desert[k] ? 1.6 : 1);
    cells = road(A, B, (k) => land[k] === 1 && (label[k] === la || label[k] === lb), desertCost);
    if (cells === null) cells = road(A, B, (k) => land[k] === 1, desertCost);
    if (cells !== null) crossAt = cells.findIndex((k) => label[k] === lb);
    if (!touching.has(key)) disagree.push(`${a}-${b}: connected by land, but their drawn provinces do not touch`);
  } else {
    // A voyage over the water; from a shore to its waters, over the land to the shore (Thebes to the Red Sea) and then out.
    const near = (p: Pt, k: number): boolean => Math.hypot(cx(k % W) - p.x, cy(Math.floor(k / W)) - p.y) < 4;
    cells = isSea(a) && isSea(b) ? road(A, B, (k) => water(k) || near(A, k) || near(B, k), () => 1) : road(A, B, (k) => !lakes[k], (k) => (land[k] ? 2 : 1));
  }
  const pts = cells === null ? [A, B] : [A, ...cells.map((k) => ({ x: cx(k % W), y: cy(Math.floor(k / W)) })), B];
  const cross = cells === null || crossAt < 0 ? -1 : crossAt + 1;
  // Smooth the road, keeping its ends and its border crossing where they are.
  const keepCross = cross > 0 ? pts[cross] : null;
  const smoothed = smoothArc(pts, false, 0.35);
  let ci = -1;
  if (keepCross !== null) {
    let bd = Infinity;
    smoothed.forEach((p, i) => {
      const d = Math.hypot(p.x - keepCross.x, p.y - keepCross.y);
      if (d < bd) (bd = d), (ci = i);
    });
    if (bd > 0.5) {
      // put the crossing in as its own point
      let best = 1;
      let bs = Infinity;
      for (let i = 1; i < smoothed.length; i++) {
        const d = Math.hypot((smoothed[i].x + smoothed[i - 1].x) / 2 - keepCross.x, (smoothed[i].y + smoothed[i - 1].y) / 2 - keepCross.y);
        if (d < bs) (bs = d), (best = i);
      }
      smoothed.splice(best, 0, keepCross);
      ci = best;
    }
  }
  roads[key] = `${ci};${encode(smoothed)}`;
}
for (const key of [...touching].sort()) {
  const [a, b] = key.split("|");
  if (!pairs.has(key)) disagree.push(`${a}-${b}: their drawn provinces touch, but no road joins them`);
}

// ---------------------------------------------------------------- rough ground's mark

/** The heart of each rough province: the cell farthest inside it, so its mark stands clear of the city and the borders. */
const roughSpots: Record<string, string> = {};
for (const id of Rough) {
  const l = idx.get(id);
  if (l === undefined) continue;
  const c = city(id);
  let best: Pt | null = null;
  let bs = -Infinity;
  const r = Math.ceil(40 / R);
  for (let j = gy(c.y) - r; j <= gy(c.y) + r; j += 2)
    for (let i = gx(c.x) - r; i <= gx(c.x) + r; i += 2) {
      if (i < 0 || j < 0 || i >= W || j >= H || label[j * W + i] !== l || !land[j * W + i]) continue;
      // distance to the nearest cell of another label, up to 12 units
      let d = 12;
      for (let s = 1; s <= 24 && d === 12; s++)
        for (const [di, dj] of [[s, 0], [-s, 0], [0, s], [0, -s], [s, s], [-s, -s], [s, -s], [-s, s]])
          if (at(i + di, j + dj) !== l) {
            d = s * R;
            break;
          }
      const fromCity = Math.hypot(cx(i) - c.x, cy(j) - c.y);
      const score = Math.min(d, 8) + Math.min(fromCity, 14) * 0.6 - Math.max(0, fromCity - 22);
      if (score > bs) (bs = score), (best = { x: cx(i), y: cy(j) });
    }
  if (best !== null) roughSpots[id] = encode([best]);
}

// ---------------------------------------------------------------- writing

function encode(pts: readonly Pt[]): string {
  let px = 0;
  let py = 0;
  return pts
    .map((p, i) => {
      const [lat, lon] = toLatLon(p);
      const x = Math.round(lon * 1000);
      const y = Math.round(lat * 1000);
      const out = i === 0 ? `${x},${y}` : `${x - px},${y - py}`;
      px = x;
      py = y;
      return out;
    })
    .join(" ");
}

const rings: Record<string, number[][]> = {};
landIds.forEach((id, l) => {
  const r = ringsOf(l);
  if (r.length > 0) rings[id] = r;
});
rings["~"] = ringsOf(NoOne);

const out =
  `// Written by scripts/map-borders.ts (build order item 11c+): the provinces' borders, traced along the land's ridges,\n` +
  `// frontier rivers and desert edges, and the roads between neighbouring cities. Thousandths of a degree, "lon,lat" then\n` +
  `// steps from the point before. Do not edit by hand: change the features (features.ts) and run the script again.\n\n` +
  `/** Each border once, between two provinces (or a province and no one's land, or the sea). */\n` +
  `export const BorderArcs: readonly string[] = [\n${shaped.map((a) => `  "${encode(a.pts)}",`).join("\n")}\n];\n\n` +
  `/** Each province's rings, as its borders in order: an arc's index, or its bitwise complement where it runs backwards. "~" is no one's land. */\n` +
  `export const ProvinceRings: Readonly<Record<string, readonly (readonly number[])[]>> = ${JSON.stringify(rings)};\n\n` +
  `/** The road between two neighbours ("a|b", in order), from a to b: the index of the point where it crosses their border (-1 at sea), then its points. */\n` +
  `export const Roads: Readonly<Record<string, string>> = ${JSON.stringify(roads, null, 0).replaceAll('","', '",\n  "').replace("{", "{\n  ").replace(/}$/, ",\n}")};\n\n` +
  `/** Where each rough province's mark stands: the heart of its land. */\n` +
  `export const RoughSpots: Readonly<Record<string, string>> = ${JSON.stringify(roughSpots)};\n`;
writeFileSync(new URL("../src/web/src/map/border-data.ts", import.meta.url), out);
console.log(`${shaped.length} borders, ${Object.keys(roads).length} roads, ${out.length} bytes`);
console.log(`Crossings in the rules: ${Crossings.length}. Where the drawing and the connections disagree (${disagree.length}):`);
for (const d of disagree) console.log("  " + d);
void boardPoint;
