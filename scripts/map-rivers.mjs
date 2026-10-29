// Writes the courses of the rivers Natural Earth does not draw (src/web/src/map/river-data.ts; build order item 11c++,
// "every river that mattered, from real data"): the Orontes, the Litani, the Khabur, the Balikh, the two Zabs, the Diyala
// and the Karun, each traced down its valley on real elevation (map-dem.mjs, public domain) from its source to its mouth
// or the river it joins. The land is first drained (a priority flood: every cell flows to the neighbour it was reached
// from, rising from the sea and the edges, so hollows fill and every cell finds a way out), then each river follows that
// flow from the point where it rises, as the water does. Where the source point lies a little off the valley floor, the
// trace starts from the cell nearby that drains the most land.
//   node scripts/map-rivers.mjs <tile cache dir>
import { writeFileSync } from "node:fs";
import { elevation } from "./map-dem.mjs";

const dir = process.argv[2] ?? "relief-tiles";
const dem = elevation(dir, { w: 33.5, e: 51, s: 29.5, n: 39.2 }, 7);
const { width: W, height: H, elev } = dem;
const N = W * H;

// The priority flood (Barnes, Lehman and Mulla 2014), with a binary heap on height.
const dirTo = new Int32Array(N).fill(-1);
const order = new Int32Array(N);
const seen = new Uint8Array(N);
const level = new Float32Array(N);
const heap = [];
const push = (c, z) => {
  heap.push([z, c]);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p][0] <= heap[i][0]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
};
const pop = () => {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
      if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  }
  return top;
};
for (let c = 0; c < N; c++) {
  const x = c % W, y = (c / W) | 0;
  if (elev[c] <= 0 || x === 0 || y === 0 || x === W - 1 || y === H - 1) {
    seen[c] = 1;
    level[c] = elev[c];
    push(c, elev[c]);
  }
}
let n = 0;
while (heap.length > 0) {
  const [z, c] = pop();
  order[n++] = c;
  const x = c % W, y = (c / W) | 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if ((dx === 0 && dy === 0) || nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (seen[k] === 1) continue;
      seen[k] = 1;
      dirTo[k] = c;
      level[k] = Math.max(elev[k], z + 1e-3);
      push(k, level[k]);
    }
}
// The land each cell drains: every cell adds itself to the one it flows to, highest first.
const drains = new Float32Array(N).fill(1);
for (let i = n - 1; i >= 0; i--) {
  const c = order[i];
  if (dirTo[c] >= 0) drains[dirTo[c]] += drains[c];
}

const cellOf = (lat, lon) => {
  const [x, y] = dem.at(lat, lon);
  return Math.round(y) * W + Math.round(x);
};
/** From the source down to the mouth: [lon, lat] points. */
function trace(name, from, to) {
  let c = cellOf(...from);
  // The cell nearby that drains the most land: the valley floor.
  const cx = c % W, cy = (c / W) | 0;
  let best = c;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (drains[(cy + dy) * W + cx + dx] > drains[best]) best = (cy + dy) * W + cx + dx;
  c = best;
  const end = cellOf(...to);
  const ex = end % W, ey = (end / W) | 0;
  const pts = [];
  for (let steps = 0; steps < 5000 && c >= 0; steps++) {
    const x = c % W, y = (c / W) | 0;
    pts.push([dem.lonAt(x), dem.latAt(y)]);
    if (Math.hypot(x - ex, y - ey) <= 8) return pts;
    c = dirTo[c];
  }
  const last = pts[pts.length - 1];
  throw new Error(`${name}: the course from its source never reached its mouth (${pts.length} steps, ending at ${last[1].toFixed(2)}, ${last[0].toFixed(2)})`);
}

/** Douglas-Peucker in degrees (about 600 m at this latitude), so the line keeps its bends but not the grid's steps. */
function simplify(pts, tol = 0.006) {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length > 0) {
    const [i, j] = stack.pop();
    const [ax, ay] = pts[i], [bx, by] = pts[j];
    const l = Math.hypot(bx - ax, by - ay) || 1e-9;
    let far = tol, at = -1;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs((pts[k][0] - ax) * (by - ay) - (pts[k][1] - ay) * (bx - ax)) / l;
      if (d > far) {
        far = d;
        at = k;
      }
    }
    if (at >= 0) {
      keep[at] = 1;
      stack.push([i, at], [at, j]);
    }
  }
  return pts.filter((_, k) => keep[k] === 1);
}

// Each river: where it rises and where it ends ([lat, lon]), from the geography dossiers (docs/history/13-the-land-drawn.md).
const Rivers = {
  orontes: [[34.22, 36.36], [36.04, 35.96]], // from its springs in the Beqaa by Labweh, past Qadesh and Qatna's country, to the sea
  litani: [[33.85, 36.0], [33.34, 35.25]], // from the southern Beqaa, round the Lebanon's foot, to the sea north of Tyre
  khabur: [[36.85, 40.06], [35.14, 40.43]], // from the springs of Ras al-Ain to the Euphrates
  balikh: [[36.68, 39.0], [35.94, 39.03]], // from the spring of Ain al-Arus, by Harran's plain, to the Euphrates
  zab: [[37.55, 43.85], [35.98, 43.35]], // the Upper (Great) Zab, from the mountains of Hakkari to the Tigris
  "lesser-zab": [[36.6, 45.3], [35.22, 43.45]], // the Lower (Lesser) Zab, to the Tigris
  diyala: [[35.05, 46.45], [33.22, 44.5]], // the Diyala (the Turan), to the Tigris below Baghdad
  karun: [[32.3, 50.0], [30.86, 48.57]], // the Karun, out of the Zagros, across Elam's plain past Ahvaz
};
const out = {};
for (const [id, [from, to]] of Object.entries(Rivers)) {
  const line = simplify(trace(id, from, to));
  const enc = [];
  for (const [lon, lat] of line) {
    const s = `${Math.round(lon * 100)},${Math.round(lat * 100)}`;
    if (enc[enc.length - 1] !== s) enc.push(s);
  }
  out[id] = enc.join(" ");
  console.log(`${id}: ${line.length} points`);
}
writeFileSync(
  new URL("../src/web/src/map/river-data.ts", import.meta.url),
  `// Written by scripts/map-rivers.mjs (build order item 11c++): rivers traced down their valleys on real elevation (public
// domain terrain tiles). Do not edit by hand: rerun the script. Points are "lon,lat" in hundredths of a degree.
/* eslint-disable */

/** Each river's course, from its source to its mouth or the river it joins. */
export const TracedRivers: Readonly<Record<string, string>> = {
${Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n")}
};
`,
);
