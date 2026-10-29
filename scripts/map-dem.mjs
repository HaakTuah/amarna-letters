// Real elevation for the map's drawing scripts (build order item 11c++): the public-domain terrain tiles of the AWS Open
// Data registry ("Terrain Tiles", Terrarium encoding; in this region from SRTM, GMTED2010 and ETOPO1, all public domain),
// fetched once with curl into a cache folder and decoded here (8-bit RGB PNGs: zlib and the five PNG filters), so the
// scripts need no image library. Used by map-relief.mjs (the shading) and map-rivers.mjs (the rivers' courses).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

const rad = Math.PI / 180;
const mercator = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));

/** An 8-bit RGB or RGBA PNG, decoded: { width, height, channels, data }. */
export function decodePng(buf) {
  let pos = 8;
  let width = 0, height = 0, type = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const kind = buf.toString("ascii", pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[12] !== 0) throw new Error("only 8-bit, non-interlaced PNGs");
      type = body[9];
    } else if (kind === "IDAT") idat.push(body);
    else if (kind === "IEND") break;
    pos += 12 + len;
  }
  const channels = type === 2 ? 3 : type === 6 ? 4 : 0;
  if (channels === 0) throw new Error(`PNG colour type ${type} not handled`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = new Uint8Array(width * height * channels);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? data[y * stride + x - channels] : 0;
      const b = y > 0 ? data[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? data[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      data[y * stride + x] = v & 255;
    }
  }
  return { width, height, channels, data };
}

/**
 * The elevation over a box of latitude and longitude ({ w, e, s, n }) at a tile zoom, in metres (the sea floor as 0), on
 * the tiles' own Web Mercator grid: { width, height, elev, lonAt(i), latAt(j), at(lat, lon) -> [i, j] }.
 */
export function elevation(dir, box, z) {
  mkdirSync(dir, { recursive: true });
  const tileX = (lon) => ((lon + 180) / 360) * 2 ** z;
  const tileY = (lat) => ((1 - mercator(lat) / Math.PI) / 2) * 2 ** z;
  const tx0 = Math.floor(tileX(box.w)), tx1 = Math.floor(tileX(box.e)), ty0 = Math.floor(tileY(box.n)), ty1 = Math.floor(tileY(box.s));
  const width = (tx1 - tx0 + 1) * 256, height = (ty1 - ty0 + 1) * 256;
  const elev = new Float32Array(width * height);
  for (let tx = tx0; tx <= tx1; tx++)
    for (let ty = ty0; ty <= ty1; ty++) {
      const file = join(dir, `${z}-${tx}-${ty}.png`);
      if (!existsSync(file)) execFileSync("curl", ["-sSf", "--retry", "4", "-o", file, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`]);
      const png = decodePng(readFileSync(file));
      for (let y = 0; y < 256; y++)
        for (let x = 0; x < 256; x++) {
          const k = (y * 256 + x) * png.channels;
          const m = png.data[k] * 256 + png.data[k + 1] + png.data[k + 2] / 256 - 32768;
          elev[((ty - ty0) * 256 + y) * width + (tx - tx0) * 256 + x] = Math.max(0, m);
        }
    }
  const n = 2 ** z * 256;
  return {
    width,
    height,
    elev,
    lonAt: (i) => ((i + 0.5 + tx0 * 256) / n) * 360 - 180,
    latAt: (j) => (2 * Math.atan(Math.exp(Math.PI * (1 - (2 * (j + 0.5 + ty0 * 256)) / n))) - Math.PI / 2) / rad,
    at: (lat, lon) => [tileX(lon) * 256 - tx0 * 256 - 0.5, tileY(lat) * 256 - ty0 * 256 - 0.5],
  };
}
