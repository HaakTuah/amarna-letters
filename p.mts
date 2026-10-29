import { WorldMap } from "./src/engine/src/model/map.ts";
for (const p of (WorldMap as any).default.provinces) console.log([p.id, p.name, p.isSea ? "SEA" : (p.kingless ? "chiefs" : ""), p.home ?? "-", p.capital ? "cap" : "", p.lat, p.lon].join("\t"));
