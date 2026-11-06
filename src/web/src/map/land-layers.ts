/**
 * The land as markup: the provinces' tints, the realms' border bands, the cities' seals, walls and siege camps, and the
 * fog of what the court has not seen lately. Each is one layer the renderer (svg-renderer.ts) draws again only when it changes.
 */

import { WorldMap, harvestOf, shortDate, taxOf, terrainOf, type Power, type Province } from "@amarna/engine";
import { powerName } from "../ui/format.ts";
import { F, Shapes, arcNeighbours, frontierPath, landClipOf, city } from "./art.ts";
import { dash, glyphId } from "./glyphs.ts";
import { RuinMarks } from "./life.ts";
import { ringOf, TentHalf, TentRing } from "./markup.ts";
import { holdingLayer, tintClass, type MapMode } from "./holding.ts";
import { patch } from "./morph.ts";
import { type MapScene } from "./scene.ts";
import { esc, title } from "./text.ts";

const Map_ = WorldMap.default;
const Seas: readonly Province[] = Map_.provinces.filter((p) => p.isSea && Shapes.has(p.id));
export const Land: readonly Province[] = Map_.landProvinces.filter((p) => Shapes.has(p.id));
const AllShaped: readonly Province[] = Map_.provinces.filter((p) => Shapes.has(p.id));
/** The land provinces by the clip their shapes are drawn within: the mainland's, or the islands'. */
const LandByClip: readonly (readonly [string, readonly Province[]])[] = ["url(#mainclip)", "url(#isleclip)"].map((c) => [c, Land.filter((p) => landClipOf(p.id) === c)] as const);

function provinceTitle(p: Province, owner: Power | null): string {
  const t = terrainOf(p.id);
  return (
    `${p.name}: ${owner !== null ? `held by ${powerName(owner)}` : "held by no one"}; its tax brings in about ${taxOf(harvestOf(p))} measures of grain a season` +
    (t === "Rough" ? "; rough ground: a unit standing its ground here is stronger" : t === "Desert" ? "; desert: it feeds no army, which lives on its baggage, its king's stores and his caravans" : "")
  );
}

/**
 * What the tints show, as a key: each province's holder and colour, and the governors' blocs and moods over them. Most
 * seasons it is the same, and the layer is then not drawn at all (part G: drawn every season, the layer cost a slow phone
 * 40 ms before a write).
 */
export function tintsKey(s: MapScene, mode: MapMode): string {
  let key = `${s.viewer}|${mode}|`;
  for (const p of Land) {
    const owner = s.owner.get(p.id) ?? null;
    key += `${owner}:${tintClass(s, p.id, owner)};`;
  }
  return key + holdingLayer(s, mode);
}

export function tints(s: MapScene, mode: MapMode): string {
  let sb = `<g class="politics" clip-path="url(#seaclip)">`;
  for (const p of Seas) sb += `<path class="hit sea-hit" d="${Shapes.get(p.id)}" data-province="${p.id}">${title(`${p.name}, a sea zone`)}</path>`;
  sb += "</g>";
  for (const [clip, group] of LandByClip) {
    sb += `<g class="politics" clip-path="${clip}">`;
    for (const p of group) {
      const owner = s.owner.get(p.id) ?? null;
      sb += `<path class="${tintClass(s, p.id, owner)}" d="${Shapes.get(p.id)}" data-province="${p.id}">${title(provinceTitle(p, owner))}</path>`;
    }
    sb += "</g>";
  }
  // Item 17++, part C: governors' blocs, and the mood of the land in its own view.
  return sb + `<g class="holding">${holdingLayer(s, mode)}</g>`;
}

/**
 * The tints written in place (part G): each province's colour and tooltip set where they changed, and the governors' blocs
 * and moods patched; the shapes are not parsed again. Gives whether anything was written. The layer stands as `tints` draws it.
 */
export function retint(g: Element, s: MapScene, mode: MapMode): boolean {
  let wrote = false;
  for (const el of g.querySelectorAll<SVGPathElement>(":scope > .politics > path.tint")) {
    const p = Map_.get(el.dataset.province ?? "");
    const owner = s.owner.get(p.id) ?? null;
    const cls = tintClass(s, p.id, owner);
    if (el.getAttribute("class") !== cls) {
      el.setAttribute("class", cls);
      wrote = true;
    }
    const tip = el.firstElementChild;
    const text = provinceTitle(p, owner);
    if (tip !== null && tip.textContent !== text) {
      tip.textContent = text;
      wrote = true;
    }
  }
  const holding = g.querySelector(":scope > .holding");
  const markup = holdingLayer(s, mode);
  if (holding !== null && HoldingWritten.get(holding) !== markup) {
    patch(holding, markup);
    HoldingWritten.set(holding, markup);
    wrote = true;
  }
  return wrote;
}
/** The blocs' and moods' markup each tints layer was last written with. */
const HoldingWritten = new WeakMap<Element, string>();

/** The armies the seat sees now, by province (a unit remembered from an old report is not seen). */
function seenArmies(s: MapScene): Map<string, Set<Power>> {
  const armies = new Map<string, Set<Power>>();
  for (const u of s.units) if (u.kind === "Army" && !u.ghost) armies.set(u.province, (armies.get(u.province) ?? new Set()).add(u.power));
  return armies;
}

/**
 * The provinces across a held province's frontier (another holder's, or no one's) where the seat sees, now, armies of two
 * powers face to face, one on each side: where its border glows (#583), and what its card lists (#586).
 */
export function facedAcross(s: MapScene, id: string, armies: Map<string, Set<Power>> = seenArmies(s)): string[] {
  const o = s.owner.get(id) ?? null;
  const here = armies.get(id);
  if (o === null || here === undefined) return [];
  return arcNeighbours(id).filter((q) => (s.owner.get(q) ?? null) !== o && [...(armies.get(q) ?? [])].some((b) => [...here].some((a) => a !== b)));
}

export function bands(s: MapScene): string {
  const armies = seenArmies(s);
  let sb = "";
  for (const [clip, group] of LandByClip) {
    sb += `<g class="bands" clip-path="${clip}">`;
    for (const p of group) {
      const o = s.owner.get(p.id) ?? null;
      if (o === null) continue;
      const faced = facedAcross(s, p.id, armies);
      // A province's band is traced again only when its holder, its neighbours' or the armies facing it change (part G).
      const key = `${o}|${arcNeighbours(p.id).map((q) => s.owner.get(q) ?? "").join(",")}|${faced.join(",")}`;
      const kept = BandsDrawn.get(p.id);
      if (kept !== undefined && kept.key === key) {
        sb += kept.markup;
        continue;
      }
      let markup = "";
      const other = (q: string): boolean => (q === "~" ? null : (s.owner.get(q) ?? null)) !== o;
      // A frontier where armies of two powers stand face to face, one on each side: a wider, fainter stroke under the band.
      if (faced.length > 0) {
        const c = frontierPath(p.id, (across) => across.some((q) => faced.includes(q)));
        if (c !== "") markup += `<path class="band contested b-${glyphId(o)}" d="${c}" clip-path="url(#cl-${p.id})"/>`;
      }
      const d = frontierPath(p.id, (across) => across.length === 0 || across.some(other));
      if (d !== "") markup += `<path class="band b-${glyphId(o)}" d="${d}" clip-path="url(#cl-${p.id})" stroke-dasharray="${dash(o)}"/>`;
      BandsDrawn.set(p.id, { key, markup });
      sb += markup;
    }
    sb += "</g>";
  }
  return sb;
}
/** Each province's band as last traced, with what it was traced from. */
const BandsDrawn = new Map<string, { key: string; markup: string }>();

export function cities(s: MapScene): string {
  const sieges = new Set(s.sieges.map((x) => x.province));
  let sb = `<g class="cities">`;
  for (const p of Land) {
    const owner = s.owner.get(p.id) ?? null;
    const walls = s.walls.get(p.id) ?? 0;
    const at = city(p.id);
    // Item 17+: a land with no great town of its time (Nesa, the herders' lands) carries its seal without a town's rings.
    sb += `<g transform="translate(${F(at.x)},${F(at.y)})" class="city${p.capital ? " capital" : ""}${owner === null ? " free" : ""}${sieges.has(p.id) ? " besieged" : ""}${p.town ? "" : " notown"}" data-province="${p.id}"><g class="csym"><circle class="tap-hit" r="${p.capital ? 22 : 18}"/>`;
    // One ring for each level of walls standing.
    for (let level = walls; level >= 1; level--) sb += `<circle class="walls w${level}" r="${(p.capital ? 12 : 8.5) + 2 * level}"/>`;
    if (p.capital) sb += `<circle class="cap-ring" r="12.6"/>`;
    sb += `<circle class="seal ${owner !== null ? `s-${glyphId(owner)}` : "s-free"}" r="${p.capital ? 9.5 : 7.5}"/>`;
    // A city in ruins (item 19): sacked, and its people's hardship not yet faded.
    if (s.memory.ruins.has(p.id)) sb += `<g class="ruin">${title(`${p.name} lies in ruins: sacked, and not yet rebuilt`)}${RuinMarks}</g>`;
    // A siege camp (item 19): the besieger's tents ringing the walls.
    const siege = s.sieges.find((x) => x.province === p.id);
    if (siege !== undefined) {
      // Close in, so they stay within the gap a city's own counters keep from its outermost ring.
      const r = ringOf(p.capital, walls) + TentRing;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + Math.PI / 6;
        sb += `<use href="#fig-tent" class="tent t-${glyphId(siege.besieger)}" x="${F(Math.cos(a) * r - TentHalf)}" y="${F(Math.sin(a) * r - TentHalf)}" width="${F(2 * TentHalf)}" height="${F(2 * TentHalf)}"/>`;
      }
    }
    if (owner !== null)
      sb += `<use href="#em-${glyphId(owner)}" class="seal-em" x="${p.capital ? -7 : -5.5}" y="${p.capital ? -7 : -5.5}" width="${p.capital ? 14 : 11}" height="${p.capital ? 14 : 11}"/>`;
    sb += "</g></g>";
  }
  return sb + "</g>";
}

/** 1: seen last season; 2: two or three seasons ago; 3: four or more; 4: never seen. */
export const fogLevel = (age: number): number => (age < 0 ? 4 : age <= 1 ? 1 : age <= 3 ? 2 : 3);

export function fog(s: MapScene): string {
  if (s.viewer === null) return "";
  let sb = "";
  for (const [group, clip, fill] of [
    ...LandByClip.map(([clip, group]) => [group, clip, "url(#fog)"] as const),
    [AllShaped.filter((p) => p.isSea), "url(#seaclip)", "url(#fogsea)"] as const,
  ] as const) {
    sb += `<g class="fog" clip-path="${clip}">`;
    for (const p of group) {
      const age = s.fogAge.get(p.id) ?? -1;
      if (age === 0) continue;
      sb += `<path class="veil-${fogLevel(age)}${p.isSea ? " sea" : ""}" d="${Shapes.get(p.id)}"${age < 0 ? ` fill="${fill}"` : ""}/>`;
    }
    sb += "</g>";
  }
  // When the map is zoomed in, each province seen before carries the season the court last saw it.
  sb += `<g class="fogdates">`;
  for (const p of AllShaped) {
    const age = s.fogAge.get(p.id);
    if (age === undefined || age === 0) continue;
    const at = city(p.id);
    sb += `<g transform="translate(${F(at.x)},${F(at.y)})"><text class="fogdate" y="${p.isSea ? 18 : 33}">${p.isSea ? "seen" : "as of"} ${esc(shortDate(s.index - age + 1, s.viewer))}</text></g>`;
  }
  return sb + "</g>";
}
