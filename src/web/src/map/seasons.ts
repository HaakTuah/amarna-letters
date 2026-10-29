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
 *   snow line (snow.png, from real elevation); frost on the plateau; storms on the open sea.
 * - Shemu: the harvest gold wherever it is reaped; the Tigris, the Euphrates and the lesser rivers in spate.
 */
import { WorldMap, climateOf, reapSeasonOf, seasonName, seasonOfTurn } from "@amarna/engine";
import { F, Fields, Rivers, Shapes, landClipOf } from "./art.ts";
import { Cartouche } from "./markup.ts";
import { ReliefFrame } from "./relief-frame.ts";
import type { MapScene } from "./scene.ts";
import SnowImage from "./snow.png";

const Map_ = WorldMap.default;
const Land = Map_.landProvinces.filter((p) => Shapes.has(p.id));
const OpenSeas = Map_.provinces.filter((p) => p.isSea && Shapes.has(p.id) && Map_.coastsOf(p.id).length === 0);

/** The season each drawn river floods in (the engine's great and crossed rivers; the Nile's flood is drawn over its fields). */
const SpateIn: ReadonlyMap<string, number> = new Map([
  ["euphrates", 2],
  ["tigris", 2],
  ["halys", 2],
  ["orontes", 2],
  ["jordan", 2],
]);

/** What each season looks like, in words for its mark on the map. */
export const SeasonLooks: readonly string[] = ["the flood", "the winter rains", "the harvest"];

/** How a province's land looks this season, from the calendar and its climate alone: the class its wash is drawn with. */
export function calendarLook(province: string, season: number): "dry" | "green" | "ripe" | "frost" | null {
  const c = climateOf(province);
  if (reapSeasonOf(province) === season && c.water !== "Arid") return "ripe";
  if (season === 1) return c.winter === "Hard" ? "frost" : c.water === "Rain" ? "green" : null;
  if (season === 0 && c.water === "Rain") return "dry";
  return null;
}

/** Water over the land: a wash, and the flood's ripples over it. */
const water = (cls: string, d: string): string => `<path class="${cls}" d="${d}"/><path class="ripples" d="${d}" fill="url(#flood)"/>`;

/**
 * The season layer, as markup: drawn again only when the season or what the viewer knows of the land changes. Laid over
 * the land and under the holders' colours and the relief, so the shading still models the hills through the snow.
 */
export function seasonLayer(s: MapScene): string {
  const season = seasonOfTurn(s.frame.turn);
  let sb = `<g class="season season-${season}">`;
  // The fields of the rivers: under water in Akhet, green in Peret, gold in Shemu.
  for (const [i, d] of Fields.entries()) {
    const nile = i === 0;
    const look = season === 1 ? "sown" : season === 2 ? "ripe-field" : nile ? "inundation" : null;
    if (look !== null) sb += look === "inundation" ? water(look, d) : `<path class="${look}" d="${d}"/>`;
  }
  for (const [clip, group] of [
    ["url(#mainclip)", Land.filter((p) => landClipOf(p.id) === "url(#mainclip)")],
    ["url(#isleclip)", Land.filter((p) => landClipOf(p.id) === "url(#isleclip)")],
  ] as const) {
    sb += `<g clip-path="${clip}">`;
    for (const p of group) {
      const state = s.land.get(p.id);
      const d = Shapes.get(p.id);
      // The game's own facts first: a drought cracks the land whatever the season; a ruinous flood lies over it.
      if (state === "Drought") sb += `<path class="drought" d="${d}"/><path class="cracks" d="${d}" fill="url(#cracks)"/>`;
      else if (state === "Flood") sb += water("flooded", d!);
      else {
        const look = calendarLook(p.id, season);
        if (look === "ripe") sb += `<path class="ripe" d="${d}"/><path class="sheaves" d="${d}" fill="url(#sheaves)"/>`;
        else if (look !== null) sb += `<path class="${look}" d="${d}"/>`;
      }
    }
    sb += "</g>";
  }
  // Rivers in spate in their season: a broader, muddier stroke under the river itself.
  for (const r of Rivers) if (SpateIn.get(r.id) === season) sb += `<path class="spate" data-river="${r.id}" d="${r.path}" style="stroke-width:${F(r.width * 2.6 + 2)}"/>`;
  if (season === 1) {
    sb += `<g clip-path="url(#landclip)"><image class="snow" href="${SnowImage}" x="${ReliefFrame.x}" y="${ReliefFrame.y}" width="${ReliefFrame.width}" height="${ReliefFrame.height}" preserveAspectRatio="none"/></g>`;
    sb += `<g class="storms" clip-path="url(#seaclip)">`;
    for (const p of OpenSeas) sb += `<path d="${Shapes.get(p.id)}" fill="url(#storm)"/>`;
    sb += "</g>";
  }
  // The season's own mark, under the map's cartouche: its name in the viewer's calendar, and how the land looks.
  const name = seasonName(s.frame.turn, s.viewer);
  sb += `<text class="season-name" x="${F(Cartouche.x)}" y="${F(Cartouche.y + 30)}">${name.toUpperCase()} · ${SeasonLooks[season].toUpperCase()}</text>`;
  return sb + "</g>";
}
