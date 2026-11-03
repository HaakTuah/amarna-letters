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
 *   snow line (snow.png, from real elevation); frost on the plateau; storms along the open-sea crossings.
 * - Shemu: the harvest gold wherever it is reaped; the Tigris, the Euphrates and the lesser rivers in spate.
 */
import { WinterSeason, WorldMap, climateOf, floodSeasonOf, reapSeasonOf, seasonName, seasonOfTurn } from "@amarna/engine";
import { F, Fields, Rivers, Shapes, city, landClipOf } from "./art.ts";
import { Cartouche } from "./markup.ts";
import { ReliefFrame } from "./relief-frame.ts";
import { patch } from "./morph.ts";
import type { MapScene } from "./scene.ts";
import SnowImage from "./snow.png";

const Map_ = WorldMap.default;
const Land = Map_.landProvinces.filter((p) => Shapes.has(p.id));
/** The open-sea crossings, which the engine makes dangerous in winter: storms are drawn along them, nowhere else. */
const OpenCrossings: readonly string[] = Map_.edges.filter((e) => e.open).map((e) => `M${F(city(e.a).x)},${F(city(e.a).y)}L${F(city(e.b).x)},${F(city(e.b).y)}`);

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

/** A slot of the season layer: one path over a field or a province, its look and, for the patterns, its fill (none: hidden). */
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
 * Every slot's look this season, in the layer's order: two a river's fields (the wash and its ripples), then two a province
 * (the wash and its pattern: ripples, cracks or sheaves).
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
  return out;
}

const slot = (l: Look, d: string): string => `<path data-slot="" class="${l.cls}" d="${d}"${l.fill !== undefined ? ` fill="${l.fill}"` : ""}/>`;

/**
 * The season layer, as markup: drawn again only when the season or what the viewer knows of the land changes. Laid over
 * the holders' colours and under the relief, so the shading still models the hills through the snow. Its washes are fixed
 * slots, a pair over each river's fields and each province, hidden where the land shows nothing (part G: from season to
 * season only their looks change, written in place by `reseason`, so the shapes are never parsed again).
 */
export function seasonLayer(s: MapScene): string {
  const season = seasonOfTurn(s.frame.turn);
  const l = looks(s, season);
  let k = 0;
  let sb = `<g class="season season-${season}">`;
  for (const d of Fields) sb += slot(l[k++], d) + slot(l[k++], d);
  for (const [clip, group] of LandClips) {
    sb += `<g clip-path="${clip}">`;
    for (const p of group) sb += slot(l[k++], Shapes.get(p.id)!) + slot(l[k++], Shapes.get(p.id)!);
    sb += "</g>";
  }
  return sb + `<g class="season-rest">${seasonRest(s, season)}</g></g>`;
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
    const { cls, fill } = l[i];
    if (el.getAttribute("class") !== cls) {
      el.setAttribute("class", cls);
      wrote = true;
    }
    if (el.getAttribute("fill") !== (fill ?? null)) {
      if (fill === undefined) el.removeAttribute("fill");
      else el.setAttribute("fill", fill);
      wrote = true;
    }
  });
  const rest = g.querySelector(".season-rest")!;
  const markup = seasonRest(s, season);
  if (RestWritten.get(rest) !== markup) {
    patch(rest, markup);
    RestWritten.set(rest, markup);
    wrote = true;
  }
  return wrote;
}
/** The rest's markup each season layer was last written with. */
const RestWritten = new WeakMap<Element, string>();

/** What else the season shows: the rivers in spate, the snow and the storms of winter, and the season's own mark. */
function seasonRest(s: MapScene, season: number): string {
  let sb = "";
  // Rivers in spate in their season (the engine's flood seasons): a broader, muddier stroke over the river. The Nile's
  // flood is drawn over its fields instead.
  for (const r of Rivers) if (r.id !== "nile" && floodSeasonOf(r.id) === season) sb += `<path class="spate" data-river="${r.id}" d="${r.path}" style="stroke-width:${F(r.width * 2.6 + 2)}"/>`;
  if (season === WinterSeason) {
    sb += `<g clip-path="url(#landclip)"><image class="snow" href="${SnowImage}" x="${ReliefFrame.x}" y="${ReliefFrame.y}" width="${ReliefFrame.width}" height="${ReliefFrame.height}" preserveAspectRatio="none"/></g>`;
    sb += `<g class="storms" clip-path="url(#seaclip)">`;
    for (const d of OpenCrossings) sb += `<path d="${d}" stroke="url(#storm)"/>`;
    sb += "</g>";
  }
  // The season's own mark, under the map's cartouche: its name in the viewer's calendar, and how the land looks.
  const name = seasonName(s.frame.turn, s.viewer);
  sb += `<text class="season-name" x="${F(Cartouche.x)}" y="${F(Cartouche.y + 30)}">${name.toUpperCase()} · ${SeasonLooks[season].toUpperCase()}</text>`;
  return sb;
}
