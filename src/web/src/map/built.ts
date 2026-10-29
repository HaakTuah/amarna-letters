/**
 * Every level of what is built, on the map (build order item 19, "Every level of what is built shows"; Haakon: "I think
 * every investment level infrastructure reaches should reflect on the map. Docks appear. Roads of the wuality appears.
 * Walls. Etc!"). The levels are the engine's (item 15, `GameState.built`); the look of each is the walls dossier's
 * (`docs/history/12-walls-roads-harbours.md`): a track nobody keeps, a kept track, a road with bridges, wells and posts, a
 * royal road; relay stations along it; a beach, a lesser port with its mole, a great harbour with its quays; a well, then
 * cisterns; and, from the economy, granaries by what they hold and the mines worked.
 *
 * A seat sees its own land's works as they stand and the rest as its eyes last saw them (scene.ts); a province it never
 * saw is drawn as an unknown track. Roads and stations are drawn at every zoom; the works at a city only close up, where
 * there is room for them.
 */
import { WorldMap, economyOf, harvestOf, taxOf } from "@amarna/engine";
import { F, along, city, roadBetween, roadPath, type Pt } from "./art.ts";
import { lifeMarks } from "./life.ts";
import { ringOf } from "./markup.ts";
import type { MapScene } from "./scene.ts";

const Map_ = WorldMap.default;

/** Every road between two land provinces, once (the map lists each edge once, either way round), with each province's half. */
export const RoadHalves: readonly { a: string; b: string; half: Pt[]; other: Pt[] }[] = [
  ...new Map(Map_.edges.filter((e) => e.kind !== "Sea" && !Map_.get(e.a).isSea && !Map_.get(e.b).isSea).map((e) => [[e.a, e.b].sort().join("|"), e] as const)).values(),
]
  .map((e) => {
    const r = roadBetween(e.a, e.b);
    const at = r.cross >= 0 ? r.cross : Math.floor(r.pts.length / 2);
    return { a: e.a, b: e.b, half: r.pts.slice(0, at + 1), other: r.pts.slice(at) };
  })
  .filter((r) => r.half.length > 1 && r.other.length > 1);

const level = (s: MapScene, kind: string, province: string): number => s.built.get(`${kind}:${province}`) ?? 0;
const known = (s: MapScene, province: string): boolean => s.builtKnown === null || s.builtKnown.has(province);

/** The road network, each half in its own province's quality, with the relay stations on it. */
export function roadsLayer(s: MapScene): string {
  let sb = `<g class="works-roads">`;
  const half = (province: string, pts: Pt[]): string => {
    if (!known(s, province)) return `<path class="road-net unknown" d="${roadPath(pts)}"/>`;
    const lv = level(s, "Roads", province);
    let out = `<path class="road-net q${lv}" d="${roadPath(pts)}"/>`;
    // Relay stations: a post for each level, along the province's half, from its city outward.
    const st = level(s, "Stations", province);
    for (let k = 1; k <= st; k++) {
      const at = along(pts, (0.35 * k) / Math.max(st, 1) + 0.15);
      out += `<rect class="station" x="${F(at.x - 1.6)}" y="${F(at.y - 1.6)}" width="3.2" height="3.2"/>`;
    }
    return out;
  };
  for (const r of RoadHalves) sb += half(r.a, r.half) + half(r.b, [...r.other].reverse());
  return sb + "</g>";
}

// ---------------------------------------------------------------- the works at a city, close up

/** A beach with a boat drawn up; a mole round a lesser port; quays and moorings in a great harbour. */
const Harbour = [
  "",
  `<path class="hb-sand" d="M-6,3.5Q0,0.5 6,3.5"/><path class="hb-boat" d="M-4,1.5H4Q3,4 0,4Q-3,4 -4,1.5Z"/>`,
  `<path class="hb-mole" d="M-6.5,4Q-6.5,-5 3,-5.5"/><path class="hb-boat" d="M-3,0.5H4Q3,3 0.5,3Q-2,3 -3,0.5Z"/>`,
  `<path class="hb-quay" d="M-6.5,-5H6.5V-3H-4.5V5H-6.5Z"/><path class="hb-boat" d="M-2.5,-1.5H5Q4,0.8 1.2,0.8Q-1.5,0.8 -2.5,-1.5Z"/><path class="hb-boat" d="M-2.5,2.4H5Q4,4.7 1.2,4.7Q-1.5,4.7 -2.5,2.4Z"/>`,
];
/** A well with its sweep; cisterns cut beside it. */
const Water = [
  "",
  `<circle class="wt-well" r="3"/><path class="wt-sweep" d="M-4.5,-5.5L4.5,-2.5"/>`,
  `<circle class="wt-well" cx="-2.6" r="2.6"/><rect class="wt-cistern" x="1" y="-2.6" width="5" height="5.2" rx="1"/>`,
];
/** The beehive granaries of the period, filled as far as the stores go. */
function granary(fill: number): string {
  let sb = "";
  for (let k = 0; k < 3; k++) {
    const x = -5 + k * 5;
    sb += `<path class="gr-dome${k < fill ? " full" : ""}" d="M${x - 2.2},4V0A2.2,2.6 0 0 1 ${x + 2.2},0V4Z"/>`;
  }
  return sb;
}
/** A mine: the pick and the basket. */
const Mine = `<path class="mn-pick" d="M-5,5L3,-3M0.5,-5.5Q3.5,-5 5.5,-1.5"/><path class="mn-ore" d="M-1,4.5L1.5,1.5L4.5,2.5L5,5Z"/>`;

/**
 * The works at a city, close up: a row of small marks to the right of the city, below its news, clear of its outermost
 * ring (the stylesheet's `wring`); markers in the upper drawing, which give way where they would touch another (the
 * renderer's placement), and are drawn only when the map is zoomed in (lod2), where there is room.
 */
export function cityWorks(s: MapScene, province: string, capital: boolean, walls: number): string {
  const marks: { cls: string; inner: string; text: string }[] = [];
  if (known(s, province)) {
    const hb = level(s, "Harbour", province);
    if (hb > 0) marks.push({ cls: "harbour", inner: Harbour[hb], text: ["", "a beach where ships are drawn up", "a lesser port with its mole", "a great harbour with quays and moorings"][hb] });
    const wt = level(s, "Water", province);
    if (wt > 0) marks.push({ cls: "water", inner: Water[wt], text: wt === 1 ? "a well sunk for a siege" : "wells and cisterns for a siege" });
  }
  const stores = s.stores.get(province);
  if (stores !== undefined) {
    const tax = Math.max(1, taxOf(harvestOf(Map_.get(province))));
    const fill = stores <= 0 ? 0 : stores < tax ? 1 : stores < 4 * tax ? 2 : 3;
    marks.push({ cls: "granary", inner: granary(fill), text: `granaries holding ${stores} measures of grain` });
  }
  if (economyOf(Map_.get(province)).mine > 0) marks.push({ cls: "mine", inner: Mine, text: "mines worked here" });
  // Item 19, pass 4: a famine's empty granary, and the town's houses (life.ts).
  marks.push(...lifeMarks(s, province));
  if (marks.length === 0) return "";
  const at = city(province);
  let sb = `<g class="works-at" data-province="${province}" transform="translate(${F(at.x)},${F(at.y)})" style="--ring:${F(ringOf(capital, walls))}"><g class="wring"><g class="sym">`;
  marks.forEach((m, i) => {
    sb += `<g class="wk ${m.cls}" transform="translate(${F(7 + i * 15)},0)"><title>${m.text}</title><circle class="wk-bg" r="7"/>${m.inner}</g>`;
  });
  return sb + "</g></g></g>";
}

/** The works of every city the viewer has any to show at, as the upper drawing's layer. */
export function worksAtCities(s: MapScene): string {
  return Map_.landProvinces.map((p) => cityWorks(s, p.id, p.capital, s.walls.get(p.id) ?? 0)).join("");
}
