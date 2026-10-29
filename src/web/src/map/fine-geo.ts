/**
 * Finer geography close up (build order item 11c++; Haakon: "Yes, please! Expertly!"): the coasts, the small islands,
 * the lakes and the rivers of the Levant and Cyprus, the Nile and its Delta, and the Aegean coast from Natural Earth's
 * finest data (scripts/map-geography.ts), with the land of 1346 where it differs as the board draws it. Imported only when
 * the map is first zoomed in past about 6x, so the whole board stays light on a phone.
 */
import { coastPaths, lakePath, type CoastPaths } from "./art.ts";
import { ll, type Pt } from "./features.ts";
import { FineLakeRings, FineLandRings, FineRiverLines } from "./geo-fine-data.ts";

const decode = (s: string): Pt[] =>
  s.split(" ").map((xy) => {
    const [lon, lat] = xy.split(",");
    return ll(Number(lat) / 1000, Number(lon) / 1000);
  });

const line = (pts: readonly Pt[]): string => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join("");

export interface FineGeography {
  coasts: CoastPaths;
  lakes: string;
  /** Each river drawn from Natural Earth, by id. */
  rivers: ReadonlyMap<string, string>;
}

export const Fine: FineGeography = {
  coasts: coastPaths(FineLandRings.map(decode)),
  lakes: lakePath(FineLakeRings.map(decode)),
  rivers: new Map(Object.entries(FineRiverLines).map(([id, pieces]) => [id, pieces.map((p) => line(decode(p))).join("")])),
};
