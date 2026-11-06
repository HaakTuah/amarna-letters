// Writes the board's relief (src/web/src/map/relief.jpg and relief-frame.ts) from real elevation data (build order item
// 11c++, "the land's truth comes forward from item 19"): soft shading of the hills and ranges, in place of the hand-placed
// chevrons. The elevation is the public-domain terrain tiles (map-dem.mjs) at zoom 7, about a kilometre a pixel,
// resampled onto the board's own projection, softened, and shaded from the north-west, as engraved maps light their
// hills. Grey, mid-grey where the land is flat: the drawing lays it over the land in soft light (markup.ts). The browser
// encodes the JPEG (Playwright's Chromium, as the smoke test uses), so the script needs no image library.
//   node scripts/map-relief.mjs <tile cache dir>      (about 170 tiles, 13 MB, fetched once)
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { Frame, box, rad, scale, top, board, sampler } from "./map-frame.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const dir = process.argv[2] ?? "relief-tiles";
const sample = sampler(dir);

// The image: a pixel a board unit (a board unit is about 2.8 km of longitude), over the land drawn.
const PerUnit = 1;
const nw = board(box.n, box.w), se = board(box.s, box.e);
const W = Math.round((se.x - nw.x) * PerUnit), H = Math.round((se.y - nw.y) * PerUnit);
const height = new Float32Array(W * H);
const lats = new Float32Array(H);
for (let j = 0; j < H; j++) {
  const lat = (2 * Math.atan(Math.exp(top - (nw.y + j / PerUnit) / scale)) - Math.PI / 2) / rad;
  lats[j] = lat;
  for (let i = 0; i < W; i++) height[j * W + i] = sample(lat, Frame.west + (nw.x + i / PerUnit) / scale / rad);
}
// Softened (three box blurs of two pixels, near a Gaussian), so the shading reads as masses, not grit.
const tmp = new Float32Array(W * H);
const clampI = (i, n) => Math.min(Math.max(i, 0), n - 1);
for (let pass = 0; pass < 3; pass++) {
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      let sum = 0;
      for (let d = -2; d <= 2; d++) sum += height[j * W + clampI(i + d, W)];
      tmp[j * W + i] = sum / 5;
    }
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      let sum = 0;
      for (let d = -2; d <= 2; d++) sum += tmp[clampI(j + d, H) * W + i];
      height[j * W + i] = sum / 5;
    }
}
// Hillshade, lit from the north-west at 40 degrees, the heights exaggerated so ranges read at the board's scale; mid-grey
// where flat, darker on slopes turned from the light, lighter on those facing it; high ground a touch darker.
const gray = new Uint8Array(W * H);
const az = 315 * rad, alt = 40 * rad, exaggerate = 9, flat = Math.sin(alt);
const unitM = ((Frame.east - Frame.west) / Frame.width) * 111320; // metres of longitude a board unit spans at the equator
const h = (i, j) => height[clampI(j, H) * W + clampI(i, W)];
for (let j = 0; j < H; j++) {
  const cell = (unitM * Math.cos(lats[j] * rad)) / PerUnit;
  for (let i = 0; i < W; i++) {
    const dzdx = ((h(i + 1, j) - h(i - 1, j)) / (2 * cell)) * exaggerate;
    const dzdy = ((h(i, j + 1) - h(i, j - 1)) / (2 * cell)) * exaggerate;
    const slope = Math.atan(Math.hypot(dzdx, dzdy));
    const aspect = Math.atan2(dzdy, -dzdx);
    const lit = Math.max(0, Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(Math.PI / 2 + 2 * Math.PI - az - aspect));
    const high = Math.min(1, h(i, j) / 3000) * 26;
    gray[j * W + i] = Math.round(Math.min(255, Math.max(0, 128 + (lit - flat) * 470 - high)));
  }
}
const browser = await chromium.launch();
const page = await browser.newPage();
const url = await page.evaluate(
  ({ W, H, data }) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const img = new ImageData(W, H);
    for (let k = 0; k < W * H; k++) {
      img.data[4 * k] = img.data[4 * k + 1] = img.data[4 * k + 2] = bytes[k];
      img.data[4 * k + 3] = 255;
    }
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    c.getContext("2d").putImageData(img, 0, 0);
    return c.toDataURL("image/jpeg", 0.72);
  },
  { W, H, data: Buffer.from(gray).toString("base64") },
);
await browser.close();
writeFileSync(new URL("../src/web/src/map/relief.jpg", import.meta.url), Buffer.from(url.split(",")[1], "base64"));
// Where the image lies on the board, for the drawing (markup.ts).
writeFileSync(
  new URL("../src/web/src/map/relief-frame.ts", import.meta.url),
  `// Written by scripts/map-relief.mjs (build order item 11c++): where the relief image lies on the board, in map units.\n` +
    `export const ReliefFrame = { x: ${nw.x.toFixed(1)}, y: ${nw.y.toFixed(1)}, width: ${(W / PerUnit).toFixed(1)}, height: ${(H / PerUnit).toFixed(1)} } as const;\n`,
);
console.log(`relief: ${W}x${H} pixels`);
