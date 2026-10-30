// Writes the winter snow on the board (src/web/src/map/snow.png) from real elevation data (build order item 19, "The look,
// in time": snow on the Taurus and Zagros passes in Peret). The same public-domain terrain tiles as the relief
// (map-dem.mjs, map-relief.mjs), at zoom 7, on the board's own projection, at half the relief's resolution: white where the
// land stands above the winter snow line, which falls as the latitude rises (about 1,300 metres at 40 degrees north, 2,000
// at 33, so Hermon and the Lebanon are white and the Judaean hills are not), softened at its edge. The drawing lays it
// over the land in Peret only, under the relief, so the shading still models the ranges (svg-renderer.ts, season layer).
//   node scripts/map-snow.mjs <tile cache dir>      (the relief's tiles, fetched once)
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { elevation } from "./map-dem.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const dir = process.argv[2] ?? "relief-tiles";
// The board's frame and projection, and the box the relief covers (map-relief.mjs), so the two images lie the same way.
const Frame = { west: 25.8, east: 51.2, north: 42.3, south: 20.0, width: 1000 };
const box = { w: Frame.west - 6, e: Frame.east + 6, s: Frame.south - 3, n: Frame.north + 2.5 };
const rad = Math.PI / 180;
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
const scale = Frame.width / ((Frame.east - Frame.west) * rad);
const top = merc(Frame.north);
const board = (lat, lon) => ({ x: (lon - Frame.west) * rad * scale, y: (top - merc(lat)) * scale });
const dem = elevation(dir, box, 7);
const sample = (lat, lon) => {
  const [x, y] = dem.at(lat, lon);
  const i0 = Math.max(0, Math.min(dem.width - 2, Math.floor(x))), j0 = Math.max(0, Math.min(dem.height - 2, Math.floor(y)));
  const fx = Math.min(1, Math.max(0, x - i0)), fy = Math.min(1, Math.max(0, y - j0));
  const e = (i, j) => dem.elev[j * dem.width + i];
  return e(i0, j0) * (1 - fx) * (1 - fy) + e(i0 + 1, j0) * fx * (1 - fy) + e(i0, j0 + 1) * (1 - fx) * fy + e(i0 + 1, j0 + 1) * fx * fy;
};

const PerUnit = 0.5;
const nw = board(box.n, box.w), se = board(box.s, box.e);
const W = Math.round((se.x - nw.x) * PerUnit), H = Math.round((se.y - nw.y) * PerUnit);
const alpha = new Uint8Array(W * H);
// The winter snow line, in metres, by latitude, and the depth over it at which the cover is whole.
const line = (lat) => 1300 + (40 - lat) * 100;
const Depth = 450;
for (let j = 0; j < H; j++) {
  const lat = (2 * Math.atan(Math.exp(top - (nw.y + j / PerUnit) / scale)) - Math.PI / 2) / rad;
  for (let i = 0; i < W; i++) {
    const h = sample(lat, Frame.west + (nw.x + i / PerUnit) / scale / rad);
    alpha[j * W + i] = Math.round(Math.min(1, Math.max(0, (h - line(lat)) / Depth)) * 235);
  }
}
// Softened once (a box blur of one pixel), so the edge of the snow reads as a drift, not a contour.
const soft = new Uint8Array(W * H);
for (let j = 0; j < H; j++)
  for (let i = 0; i < W; i++) {
    let sum = 0, n = 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const x = i + di, y = j + dj;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        sum += alpha[y * W + x];
        n++;
      }
    // In eight steps, which the eye does not tell from a smooth edge at this size and which keep the image small.
    soft[j * W + i] = Math.min(255, Math.round(sum / n / 32) * 32);
  }
const browser = await chromium.launch();
const page = await browser.newPage();
const url = await page.evaluate(
  ({ W, H, data }) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const img = new ImageData(W, H);
    for (let k = 0; k < W * H; k++) {
      img.data[4 * k] = 250;
      img.data[4 * k + 1] = 251;
      img.data[4 * k + 2] = 253;
      img.data[4 * k + 3] = bytes[k];
    }
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    c.getContext("2d").putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  },
  { W, H, data: Buffer.from(soft).toString("base64") },
);
await browser.close();
const png = Buffer.from(url.split(",")[1], "base64");
writeFileSync(new URL("../src/web/src/map/snow.png", import.meta.url), png);
console.log(`snow: ${W}x${H} pixels, ${(png.length / 1024).toFixed(0)} KB`);
