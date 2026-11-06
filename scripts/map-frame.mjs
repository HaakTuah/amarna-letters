// The board's frame and projection (src/web/src/map/projection.ts), the box of land drawn beyond it (map-geography.ts), and
// the elevation sampled onto it, shared by map-relief.mjs and map-snow.mjs so the two images lie the same way.
import { elevation } from "./map-dem.mjs";

export const Frame = { west: 25.8, east: 51.2, north: 42.3, south: 20.0, width: 1000 };
export const box = { w: Frame.west - 6, e: Frame.east + 6, s: Frame.south - 3, n: Frame.north + 2.5 };
export const rad = Math.PI / 180;
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
export const scale = Frame.width / ((Frame.east - Frame.west) * rad);
export const top = merc(Frame.north);
export const board = (lat, lon) => ({ x: (lon - Frame.west) * rad * scale, y: (top - merc(lat)) * scale });

// The elevation at a latitude and longitude, bilinear over the tiles cached in dir (zoom 7).
export const sampler = (dir) => {
  const dem = elevation(dir, box, 7);
  return (lat, lon) => {
    const [x, y] = dem.at(lat, lon);
    const i0 = Math.max(0, Math.min(dem.width - 2, Math.floor(x))), j0 = Math.max(0, Math.min(dem.height - 2, Math.floor(y)));
    const fx = Math.min(1, Math.max(0, x - i0)), fy = Math.min(1, Math.max(0, y - j0));
    const e = (i, j) => dem.elev[j * dem.width + i];
    return e(i0, j0) * (1 - fx) * (1 - fy) + e(i0 + 1, j0) * fx * (1 - fy) + e(i0, j0 + 1) * (1 - fx) * fy + e(i0 + 1, j0 + 1) * fx * fy;
  };
};
