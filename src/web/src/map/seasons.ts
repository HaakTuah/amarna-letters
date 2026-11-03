/**
 * The seasons and the land on the map (build order item 19, "The look, in time"): the year as the engine keeps it, and the
 * droughts and floods of this game, drawn over the papyrus. Everything here comes from the game's own facts: the calendar
 * (the season about to be played), each province's climate (its water, its winter and its harvest season, from the
 * environment dossier, `docs/history/03-environment-and-seasons.md`), each river's flood season, and the droughts and floods
 * under way. A seat sees the calendar everywhere, since every court keeps the same year, and the droughts and floods only
 * where its own eyes last saw the land, as they were then (scene.ts).
 *
 * - Akhet: the Nile in flood over its black land; the rain-fed lands dry and brown at the end of summer; the Anatolian
 *   plateau gold at its harvest.
 * - Peret: the winter rains greening the rain-fed hills and the sown valleys; snow where the land stands above the winter
 *   snow line (snow-*.png, from real elevation); frost on the plateau; storms along the open-sea crossings.
 * - Shemu: the harvest gold wherever it is reaped; the Tigris, the Euphrates and the lesser rivers in spate.
 *
 * The season is the land's own state beneath the realms (item 17+++, part D): the layer lies under the realms' colours, which
 * wash over it, and the change from one season to the next moves as the season plays out (map-living.css, `--move`): snow
 * creeps down from the heights and melts from below, the Nile rises from the south (docs/history/03-environment-and-seasons.md,
 * #03-nile-rise-north), green spreads inland from the coast with the rains, and the land browns from its inland edges.
 */
import { WinterSeason, WorldMap, climateOf, floodSeasonOf, reapSeasonOf, seasonName, seasonOfTurn } from "@amarna/engine";
import { F, Fields, Rivers, Shapes, arcNeighbours, city, landClipOf } from "./art.ts";
import { Cartouche } from "./markup.ts";
import { ReliefFrame } from "./relief-frame.ts";
import { patch } from "./morph.ts";
import type { MapScene } from "./scene.ts";
import SnowHigh from "./snow-high.png";
import SnowLow from "./snow-low.png";
import SnowMid from "./snow-mid.png";

const Map_ = WorldMap.default;
const Land = Map_.landProvinces.filter((p) => Shapes.has(p.id));
/** The open-sea crossings, which the engine makes dangerous in winter: storms are drawn along them, nowhere else. */
const OpenCrossings: readonly string[] = Map_.edges.filter((e) => e.open).map((e) => `M${F(city(e.a).x)},${F(city(e.a).y)}L${F(city(e.b).x)},${F(city(e.b).y)}`);

/** The rivers that rise in a season of their own, drawn in spate then (the Nile's flood is drawn over its fields instead). */
const Spates = Rivers.filter((r) => r.id !== "nile" && floodSeasonOf(r.id) !== null);
/**
 * The snow in three bands by depth over the snow line (scripts/map-snow.mjs), the heights first: with their place in the
 * creeping, 0 for the first to come and the last to go.
 */
const SnowBands: readonly (readonly [string, number])[] = [
  [SnowHigh, 0],
  [SnowMid, 0.5],
  [SnowLow, 1],
];

/**
 * How far inland each land province lies, 0 on the coast to 1 the farthest, counted in borders crossed: the winter rains
 * green the land from the coast inland, and the summer browns it from its inland edges, since the rain falls most on the
 * coast and less inland (docs/history/03-environment-and-seasons.md, #03-levant: "400-1,000 mm on the coast and western
 * slopes, less inland"). Only the order of the change on the map, never a rule.
 */
export const Inland: ReadonlyMap<string, number> = (() => {
  const dist = new Map<string, number>();
  let frontier = Land.filter((p) => p.isCoastal).map((p) => p.id);
  for (const id of frontier) dist.set(id, 0);
  for (let d = 1; frontier.length > 0; d++) {
    const next: string[] = [];
    for (const id of frontier)
      for (const q of arcNeighbours(id))
        if (!dist.has(q)) {
          dist.set(q, d);
          next.push(q);
        }
    frontier = next;
  }
  const most = Math.max(1, ...dist.values());
  return new Map(Land.map((p) => [p.id, Math.round((100 * (dist.get(p.id) ?? most)) / most) / 100]));
})();

/** What each season looks like, in words for its mark on the map. */
export const SeasonLooks: readonly string[] = ["the flood", "the winter rains", "the harvest"];

/** How a province's land looks this season, from the calendar and its climate alone: the class its wash is drawn with. */
export function calendarLook(province: string, season: number): "dry" | "green" | "ripe" | "frost" | null {
  const c = climateOf(province);
  if (reapSeasonOf(province) === season && c.water !== "Arid") return "ripe";
  if (season === WinterSeason) return c.winter === "Hard" ? "frost" : c.water === "Rain" ? "green" : null;
  if (season === 0 && c.water === "Rain") return "dry";
  return null;
}

/**
 * A slot of the season layer: one path over a field, a province or a river, one band of the snow or the storms, with its
 * look and, for the patterns, its fill (none: hidden).
 */
interface Look {
  cls: string;
  fill?: string;
}
const None: Look = { cls: "none" };
/** Water over the land: a wash, and the flood's ripples over it. */
const water = (cls: string): [Look, Look] => [{ cls }, { cls: "ripples", fill: "url(#flood)" }];

/** The provinces by the clip their washes are drawn within. */
const LandClips = (["url(#mainclip)", "url(#isleclip)"] as const).map((clip) => [clip, Land.filter((p) => landClipOf(p.id) === clip)] as const);

/**
 * Every slot's look this season, in the layer's order: two a river's fields (the wash and its ripples), two a province
 * (the wash and its pattern: ripples, cracks or sheaves), one a river in spate, one a band of the snow, and the storms.
 */
function looks(s: MapScene, season: number): Look[] {
  const out: Look[] = [];
  // The fields of the rivers: under water in Akhet, green in Peret, gold in Shemu.
  for (let i = 0; i < Fields.length; i++) {
    const nile = i === 0;
    const look = season === 1 ? "sown" : season === 2 ? "ripe-field" : nile ? "inundation" : null;
    out.push(...(look === "inundation" ? water(look) : [look === null ? None : { cls: look }, None]));
  }
  for (const [, group] of LandClips)
    for (const p of group) {
      const state = s.land.get(p.id);
      // The game's own facts first: a drought cracks the land whatever the season; a river's bad year lies over it.
      if (state === "Drought") out.push({ cls: "drought" }, { cls: "cracks", fill: "url(#cracks)" });
      else if (state === "Low") out.push({ cls: "drought low" }, None);
      else if (state === "Flooded") out.push(...water("flooded"));
      else if (state === "Spoiled") out.push({ cls: "spoiled" }, None);
      else {
        const look = calendarLook(p.id, season);
        if (look === "ripe") out.push({ cls: "ripe" }, { cls: "sheaves", fill: "url(#sheaves)" });
        else out.push(look === null ? None : { cls: look }, None);
      }
    }
  for (const r of Spates) out.push(floodSeasonOf(r.id) === season ? { cls: "spate" } : None);
  const winter = season === WinterSeason;
  for (let i = 0; i < SnowBands.length; i++) out.push(winter ? { cls: "snow" } : None);
  out.push(winter ? { cls: "storms" } : None);
  return out;
}

const fillOf = (l: Look): string => (l.fill !== undefined ? ` fill="${l.fill}"` : "");
const slot = (l: Look, d: string, more = ""): string => `<path data-slot="" class="${l.cls}" d="${d}"${fillOf(l)}${more}/>`;

/**
 * The season layer, as markup: drawn again only when the season or what the viewer knows of the land changes. Laid under
 * the holders' colours and the relief (part D: the season is the ground's, the realms wash over it), so the shading still
 * models the hills through the snow. Everything the season shows is a fixed slot (a pair over each river's fields and each
 * province, a river's spate, a band of the snow, the storms), hidden where the land shows nothing (part G: from season to
 * season only their looks change, written in place by `reseason`, so the shapes are never parsed again; part D: so each
 * change can move, as the stylesheet times it).
 */
export function seasonLayer(s: MapScene): string {
  const season = seasonOfTurn(s.frame.turn);
  const l = looks(s, season);
  let k = 0;
  let sb = `<g class="season season-${season}">`;
  for (const d of Fields) sb += slot(l[k++], d) + slot(l[k++], d);
  for (const [clip, group] of LandClips) {
    sb += `<g clip-path="${clip}">`;
    for (const p of group) {
      const at = ` style="--r:${Inland.get(p.id)}"`;
      sb += slot(l[k++], Shapes.get(p.id)!, at) + slot(l[k++], Shapes.get(p.id)!, at);
    }
    sb += "</g>";
  }
  for (const r of Spates) sb += slot(l[k++], r.path, ` data-river="${r.id}" style="stroke-width:${F(r.width * 2.6 + 2)}"`);
  sb += `<g clip-path="url(#landclip)">`;
  for (const [href, b] of SnowBands)
    sb += `<image data-slot="" class="${l[k++].cls}" href="${href}" x="${ReliefFrame.x}" y="${ReliefFrame.y}" width="${ReliefFrame.width}" height="${ReliefFrame.height}" preserveAspectRatio="none" style="--b:${b}"/>`;
  sb += `</g><g data-slot="" class="${l[k++].cls}" clip-path="url(#seaclip)">`;
  for (const d of OpenCrossings) sb += `<path d="${d}" stroke="url(#storm)"/>`;
  return sb + `</g><g class="season-rest">${seasonRest(s)}</g></g>`;
}

/**
 * A slot's class for a look: a slot the season leaves bare keeps the look it had, marked gone, so it can fade out as it
 * was (part D); one never shown is "none".
 */
export function classFor(was: string | null, cls: string): string {
  if (cls !== "none") return cls;
  return was === null || was === "none" || was.endsWith(" gone") ? (was ?? "none") : `${was} gone`;
}

/** The season layer written in place: each slot's look, and the rest patched. Gives whether anything was written. */
export function reseason(g: Element, s: MapScene): boolean {
  const season = seasonOfTurn(s.frame.turn);
  const top = g.firstElementChild;
  const slots = g.querySelectorAll("[data-slot]");
  const l = looks(s, season);
  if (top === null || slots.length !== l.length) {
    patch(g, seasonLayer(s));
    return true;
  }
  let wrote = false;
  const cls = `season season-${season}`;
  if (top.getAttribute("class") !== cls) {
    top.setAttribute("class", cls);
    wrote = true;
  }
  slots.forEach((el, i) => {
    const { fill } = l[i];
    const was = el.getAttribute("class");
    const cls = classFor(was, l[i].cls);
    if (was !== cls) {
      el.setAttribute("class", cls);
      wrote = true;
    }
    // A pattern going keeps its fill while it fades.
    if (fill !== undefined && el.getAttribute("fill") !== fill) {
      el.setAttribute("fill", fill);
      wrote = true;
    }
  });
  const rest = g.querySelector(".season-rest")!;
  const markup = seasonRest(s);
  if (RestWritten.get(rest) !== markup) {
    patch(rest, markup);
    RestWritten.set(rest, markup);
    wrote = true;
  }
  return wrote;
}
/** The rest's markup each season layer was last written with. */
const RestWritten = new WeakMap<Element, string>();

/** The season's own mark, under the map's cartouche: its name in the viewer's calendar, and how the land looks. */
function seasonRest(s: MapScene): string {
  const name = seasonName(s.frame.turn, s.viewer);
  return `<text class="season-name" x="${F(Cartouche.x)}" y="${F(Cartouche.y + 30)}">${name.toUpperCase()} · ${SeasonLooks[seasonOfTurn(s.frame.turn)].toUpperCase()}</text>`;
}
