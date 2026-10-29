/**
 * The memory and the life of the map, drawn (build order item 19; what is drawn and why is in memory.ts): land gone wild,
 * battlefields' memorials, a famine's empty granaries and a town's houses close up, caravans and men on the roads, the
 * realm's own medium and the omens in the margin, and small scenes at big moments.
 */
import { WorldMap, type OmenTier, type Power } from "@amarna/engine";
import { F, Shapes, along, city, landClipOf, route } from "./art.ts";
import { glyphId } from "./glyphs.ts";
import { ringOf } from "./markup.ts";
import { FamineBelow } from "./memory.ts";
import type { MapScene } from "./scene.ts";
import type { FrameRoad, SeasonFrame } from "../session/frames.ts";
import { powerName, provinceName } from "../ui/format.ts";

const Map_ = WorldMap.default;
const esc = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

/** The lower drawing's memory: wild land (a scrub of thorn and tamarisk), and a memorial stele at each battlefield. */
export function memoryLayer(s: MapScene): string {
  const m = s.memory;
  let sb = `<g class="memory">`;
  for (const id of m.wild) {
    const d = Shapes.get(id);
    if (d !== undefined) sb += `<path class="wild" d="${d}" clip-path="${landClipOf(id)}" fill="url(#scrub)"/>`;
  }
  for (const [id, b] of m.memorials) {
    const at = city(id);
    const r = ringOf(Map_.get(id).capital, s.walls.get(id) ?? 0) + 7;
    sb +=
      `<g class="memorial" transform="translate(${F(at.x)},${F(at.y)})"><g class="csym"><g transform="translate(${F(-r * 0.74)},${F(r * 0.66)})">` +
      `<title>${b.count === 1 ? "A battlefield" : `${b.count} battles fought here`}, the last in season ${b.last}</title>` +
      `<use href="#fig-stele" class="stele" x="-3.6" y="-3.6" width="7.2" height="7.2"/></g></g></g>`;
  }
  return sb + "</g>";
}

/** A sacked city in ruins: its seal cracked, smoke over it. Drawn in the city's badge (svg-renderer.ts, cities). */
export const RuinMarks = `<path class="ruin-crack" d="M-6,-4L-1,-1L-3,3L2,6M2,-6L1,-1L6,1"/><path class="ruin-smoke" d="M-2,-11Q-5,-15 -1,-18Q3,-21 0,-25M3,-10Q1,-14 4,-17"/>`;

/** The works row's extra marks: a famine's empty granary, and the town's houses with how its people went this year. */
export function lifeMarks(s: MapScene, province: string): { cls: string; inner: string; text: string }[] {
  const out: { cls: string; inner: string; text: string }[] = [];
  const fed = s.memory.famine.get(province);
  if (fed !== undefined && fed < FamineBelow)
    out.push({ cls: "famine", inner: `<path class="fm-dome" d="M-4,5V-1A4,4.6 0 0 1 4,-1V5Z"/><path class="fm-crack" d="M-1,-4L1,-1L-1,2L1,5"/>`, text: `famine: its countryside ate ${Math.round(fed / 10)} in a hundred of its need` });
  const t = s.memory.towns.get(province);
  if (t !== undefined) {
    const trend = t.now > t.before * 1.03 ? "growing" : t.now < t.before * 0.97 ? "shrinking" : "holding";
    out.push({
      cls: `town ${trend}`,
      inner: `<use href="#fig-houses" class="tw-houses" x="-5.5" y="-5.5" width="11" height="11"/>`,
      text: `${t.now} people settled, ${trend} this year`,
    });
  }
  return out;
}

/** Caravans and men on the roads (the upper drawing): each where its stretch of road puts it, a guess like a traveller's. */
export function lifeLayer(s: MapScene): string {
  let sb = "";
  const mark = (r: FrameRoad, i: number, cls: string, fig: string, text: string): void => {
    const at = along(route(r.from, r.to), Math.min(0.85, Math.max(0.15, r.progress)));
    sb += `<g class="life-mark ${cls}" data-province="${r.from}" transform="translate(${F(at.x)},${F(at.y + (i % 2) * 6)})"><title>${esc(text)}</title><g class="sym"><circle class="life-bg${r.power !== null ? ` f-${glyphId(r.power)}` : ""}" r="8"/><use href="${fig}" class="life-icon" x="-6.6" y="-6.6" width="13.2" height="13.2"/></g></g>`;
  };
  s.memory.caravans.forEach((c, i) => mark(c, i, "caravan", "#fig-caravan", `${c.power !== null ? `${powerName(c.power)}'s caravan` : "A caravan"} on the road from ${provinceName(c.from)} to ${provinceName(c.to)}: ${c.what}`));
  s.memory.walking.forEach((w, i) => mark(w, i, "walking", "#fig-walkers", `${w.what}, on the road from ${provinceName(w.from)} to ${provinceName(w.to)}`));
  return sb;
}

/** Which courts' scribes drew on clay: every court but Egypt's, whose scribes drew on papyrus (presentation only). */
export const mediumOf = (viewer: Power | null): "papyrus" | "clay" => (viewer === null || viewer === "Egypt" ? "papyrus" : "clay");

/** The omens in the margin: a sign in the sky for each tier, darkening as the end draws near. */
export const OmenSigns: Readonly<Record<OmenTier, { text: string; svg: string }>> = {
  Quiet: { text: "The diviners read quiet signs.", svg: `<circle class="sky-moon" cx="0" cy="0" r="7"/><circle class="sky-shade" cx="3.5" cy="-1.5" r="6.4"/>` },
  Troubled: { text: "The diviners read troubled signs: a red moon.", svg: `<circle class="sky-halo" r="10"/><circle class="sky-moon red" r="7"/>` },
  Grave: { text: "The diviners read grave signs: the sun darkened.", svg: `<circle class="sky-sun" r="8"/><circle class="sky-dark" cx="3.6" cy="-1" r="7.4"/>` },
  Borrowed: { text: "The diviners say the age has outlived its measure: a strange star.", svg: `<path class="sky-tail" d="M-12,10L1,-1"/><circle class="sky-star" cx="2" cy="-2" r="3.2"/>` },
  Darkest: { text: "The diviners read the darkest signs: the sun swallowed.", svg: `<circle class="sky-corona" r="11"/><circle class="sky-black" r="8"/>` },
};

/** A season's small scenes: an envoy's procession with gifts arriving at court, a sack, an ambush on the road. */
export interface SmallScene {
  at: { x: number; y: number };
  kind: "gift" | "sack" | "ambush";
  text: string;
}

const ByName = new Map(Map_.provinces.map((p) => [p.name, p.id] as const));
const placeIn = (text: string): string | null => {
  for (const [name, id] of ByName) if (text.includes(` ${name}`)) return id;
  return null;
};

/** The scenes of the season just shown (frame `f`, after `prev`), as the viewer would know of them. */
export function scenesOf(prev: SeasonFrame, f: SeasonFrame, viewer: Power | null): SmallScene[] {
  const out: SmallScene[] = [];
  const knows = (visible: readonly Power[]): boolean => viewer === null || visible.includes(viewer);
  // Envoys bearing gifts who reached their court this season.
  for (const j of prev.journeys) {
    if (j.kind !== "EnvoyOutbound" || j.gold <= 0 || f.journeys.some((x) => x.id === j.id)) continue;
    if (viewer !== null && viewer !== j.from && viewer !== j.to) continue;
    out.push({ at: city(Map_.capital(j.to).id), kind: "gift", text: `${powerName(j.from)}'s envoy arrived at the court of ${powerName(j.to)} with gifts` });
  }
  for (const e of f.events) {
    if (!knows(e.visibleTo)) continue;
    const id = placeIn(e.text);
    if (id === null) continue;
    if (e.kind === "sack") out.push({ at: city(id), kind: "sack", text: e.text });
    else if (e.kind === "caravan-robbed" || e.signal === "road-outlaws") out.push({ at: city(id), kind: "ambush", text: e.text });
  }
  return out.slice(0, 6);
}

/** A scene's markup: a medallion with its figures, which the stylesheet plays once and the renderer then takes away. */
export function sceneMarkup(sc: SmallScene, i: number): string {
  const figs =
    sc.kind === "gift"
      ? `<use href="#fig-envoy" x="-11" y="-7" width="13" height="13"/><use href="#g-ingot" x="1" y="-3" width="9" height="9"/>`
      : sc.kind === "sack"
        ? `<use href="#fig-fire" x="-7" y="-8" width="14" height="14"/>`
        : `<use href="#fig-clash" x="-6.5" y="-7" width="13" height="13"/>`;
  return (
    `<g class="scene ${sc.kind}" transform="translate(${F(sc.at.x)},${F(sc.at.y)})" style="animation-delay:${i * 0.35}s"><title>${esc(sc.text)}</title>` +
    `<g class="sym"><g transform="translate(0,-34)"><circle class="scene-bg" r="15"/><g class="scene-figs">${figs}</g></g></g></g>`
  );
}
