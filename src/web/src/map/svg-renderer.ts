/**
 * The SVG renderer: the static geography written once as markup; each layer above it drawn again only when what it shows
 * changes; units and travellers kept as the same elements from season to season, so stepping the timeline slides them
 * along their moves; pinch, pan and wheel zoom move one layer on the GPU (zoom.ts) without drawing anything.
 */
import { WorldMap, dateLabel, harvestOf, shortDate, taxOf, terrainOf, type Power, type Province } from "@amarna/engine";
import { powerName, provinceName, shekels } from "../ui/format.ts";
import { F, Height, Shapes, Width, add, landClipOf, along, arc, arcAt, city, len, mul, normal, route, sub, unit, unitSpot, type Pt } from "./art.ts";
import { dash, glyphId } from "./glyphs.ts";
import { Base, Defs, Labels } from "./markup.ts";
import type { MapHandlers, MapInput, MapRenderer } from "./renderer.ts";
import { captureLine, unitKindName, type MapScene, type SceneTraveller, type SceneUnit } from "./scene.ts";
import { attach, detach, focus, reset, zoomBy } from "./zoom.ts";

const Map_ = WorldMap.default;
const Seas: readonly Province[] = Map_.provinces.filter((p) => p.isSea && Shapes.has(p.id));
const Land: readonly Province[] = Map_.landProvinces.filter((p) => Shapes.has(p.id));
const AllShaped: readonly Province[] = Map_.provinces.filter((p) => Shapes.has(p.id));
/** The land provinces by the clip their shapes are drawn within: the mainland's, or the islands'. */
const LandByClip: readonly (readonly [string, readonly Province[]])[] = ["url(#mainclip)", "url(#isleclip)"].map((c) => [c, Land.filter((p) => landClipOf(p.id) === c)] as const);
const SVG = "http://www.w3.org/2000/svg";

const esc = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const title = (s: string): string => `<title>${esc(s)}</title>`;

// ---------------------------------------------------------------- layers, as markup

function provinceTitle(p: Province, owner: Power | null): string {
  const t = terrainOf(p.id);
  return (
    `${p.name}: ${owner !== null ? `held by ${powerName(owner)}` : "held by no one"}; its tax brings in about ${taxOf(harvestOf(p))} measures of grain a season` +
    (t === "Rough" ? "; rough ground: a unit standing its ground here is stronger" : t === "Desert" ? "; desert: it feeds no army, which lives on its baggage, its king's stores and his caravans" : "")
  );
}

function tints(s: MapScene): string {
  let sb = `<g class="politics" clip-path="url(#seaclip)">`;
  for (const p of Seas) sb += `<path class="hit sea-hit" d="${Shapes.get(p.id)}" data-province="${p.id}">${title(`${p.name}, a sea zone`)}</path>`;
  sb += "</g>";
  for (const [clip, group] of LandByClip) {
    sb += `<g class="politics" clip-path="${clip}">`;
    for (const p of group) {
      const owner = s.owner.get(p.id) ?? null;
      sb += `<path class="${owner !== null ? `tint t-${glyphId(owner)}` : "tint free"}" d="${Shapes.get(p.id)}" data-province="${p.id}">${title(provinceTitle(p, owner))}</path>`;
    }
    sb += "</g>";
  }
  return sb;
}

function bands(s: MapScene): string {
  let sb = "";
  for (const [clip, group] of LandByClip) {
    sb += `<g class="bands" clip-path="${clip}">`;
    for (const p of group) {
      const o = s.owner.get(p.id) ?? null;
      if (o === null) continue;
      sb += `<path class="band b-${glyphId(o)}" d="${Shapes.get(p.id)}" clip-path="url(#cl-${p.id})" stroke-dasharray="${dash(o)}"/>`;
    }
    sb += "</g>";
  }
  return sb;
}

function cities(s: MapScene): string {
  const sieges = new Set(s.sieges.map((x) => x.province));
  let sb = `<g class="cities">`;
  for (const p of Land) {
    const owner = s.owner.get(p.id) ?? null;
    const walls = s.walls.get(p.id) ?? 0;
    const at = city(p.id);
    sb += `<g transform="translate(${F(at.x)},${F(at.y)})" class="city${p.capital ? " capital" : ""}${owner === null ? " free" : ""}${sieges.has(p.id) ? " besieged" : ""}" data-province="${p.id}"><g class="csym"><circle class="tap-hit" r="${p.capital ? 22 : 18}"/>`;
    // One ring for each level of walls standing.
    for (let level = walls; level >= 1; level--) sb += `<circle class="walls w${level}" r="${(p.capital ? 12 : 8.5) + 2 * level}"/>`;
    if (p.capital) sb += `<circle class="cap-ring" r="12.6"/>`;
    sb += `<circle class="seal ${owner !== null ? `s-${glyphId(owner)}` : "s-free"}" r="${p.capital ? 9.5 : 7.5}"/>`;
    if (owner !== null)
      sb += `<use href="#em-${glyphId(owner)}" class="seal-em" x="${p.capital ? -7 : -5.5}" y="${p.capital ? -7 : -5.5}" width="${p.capital ? 14 : 11}" height="${p.capital ? 14 : 11}"/>`;
    sb += "</g></g>";
  }
  return sb + "</g>";
}

/** 1: seen last season; 2: two or three seasons ago; 3: four or more; 4: never seen. */
export const fogLevel = (age: number): number => (age < 0 ? 4 : age <= 1 ? 1 : age <= 3 ? 2 : 3);

function fog(s: MapScene): string {
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

const points = (pts: readonly Pt[]): string => pts.map((p) => `${F(p.x)},${F(p.y)}`).join(" ");

function roads(input: MapInput): string {
  const s = input.scene;
  let sb = `<g class="roads">`;
  for (const t of s.travellers)
    sb += `<polyline class="road r-${glyphId(t.owner)}${t.believed ? " believed" : ""}${t.characterId !== null && t.characterId === input.followId ? " followed" : ""}" points="${points(route(t.fromProvince, t.toProvince))}"/>`;
  const path = input.followPath;
  if (path !== null && path.length > 0) {
    const pts = points(path.map((x) => x.at));
    sb += `<g class="follow-path"><polyline class="trace-casing" points="${pts}"/><polyline class="trace" points="${pts}"/>`;
    path.forEach((step, i) => {
      const last = i === path.length - 1;
      sb += `<circle class="${last ? "trace-now" : "trace-dot"}" cx="${F(step.at.x)}" cy="${F(step.at.y)}" r="${last ? 5 : 2.6}">${title(`${dateLabel(step.index + 1, s.viewer)}: ${step.where}`)}</circle>`;
    });
    sb += "</g>";
  }
  return sb + "</g>";
}

/** The end of an arrow, stopped short of the point it aims at so the head does not hide the token there. */
function short(a: Pt, b: Pt, by: number): Pt {
  const d = sub(b, a);
  return len(d) <= by * 2 ? b : sub(b, mul(unit(d), by));
}

/** The first part of the arc from a towards b, as its own quadratic (de Casteljau). */
function partial(a: Pt, b: Pt, t: number): string {
  const c = add(mul(add(a, b), 0.5), mul(normal(sub(b, a)), 0.12));
  const q0 = add(a, mul(sub(c, a), t));
  const end = arcAt(a, b, t);
  return `M${F(a.x)},${F(a.y)}Q${F(q0.x)},${F(q0.y)} ${F(end.x)},${F(end.y)}`;
}

function moves(s: MapScene): string {
  let sb = `<g class="moves">`;
  for (const c of s.captures) {
    const at = city(c.province);
    sb += `<g class="capture ${c.to !== null ? `c-${glyphId(c.to)}` : "c-free"}" transform="translate(${F(at.x)},${F(at.y)})">${title(`${provinceName(c.province)} changed hands this season: ${captureLine(c)}`)}<g class="csym"><circle class="cap-ring" r="16"/><circle class="cap-ring2" r="21"/></g></g>`;
  }
  for (const m of s.moves) {
    const a = unitSpot(m.from);
    const b = unitSpot(m.to);
    const id = glyphId(m.power);
    switch (m.style) {
      case "Move":
      case "Attack": {
        const end = short(a, b, 13);
        sb += `<g class="mv ${m.style === "Attack" ? "attack" : "move"} m-${id}">${title(m.text)}<path class="casing" d="${arc(a, end)}"/><path class="shaft" d="${arc(a, end)}" pathLength="1" marker-end="url(#ah-${id})"/>`;
        if (m.style === "Attack") {
          const at = arcAt(a, end, 0.78);
          sb += `<g transform="translate(${F(at.x)},${F(at.y)})"><g class="csym"><use href="#g-burst" class="burst" x="-8" y="-8" width="16" height="16"/></g></g>`;
        }
        sb += "</g>";
        break;
      }
      case "Bounce": {
        const stop = arcAt(a, b, 0.58);
        const dir = unit(sub(arcAt(a, b, 0.6), arcAt(a, b, 0.56)));
        const n = mul(normal(dir), 8);
        sb += `<g class="mv bounce m-${id}">${title(m.text)}<path class="casing" d="${partial(a, b, 0.55)}"/><path class="shaft" d="${partial(a, b, 0.55)}" pathLength="1"/><path class="bar" d="M${F(stop.x + n.x)},${F(stop.y + n.y)}L${F(stop.x - n.x)},${F(stop.y - n.y)}"/></g>`;
        break;
      }
      case "Support":
      case "SupportCut": {
        const end = short(a, b, 9);
        sb += `<g class="mv support ${m.style === "SupportCut" ? "cut" : ""} m-${id}">${title(m.text)}<path class="sup" d="${arc(a, end, -0.18)}" marker-end="url(#ah-sup)"/></g>`;
        break;
      }
      case "Convoy":
        sb += `<g class="mv convoy m-${id}">${title(m.text)}<path class="conv" d="${arc(a, b, 0.2)}"/></g>`;
        break;
    }
  }
  for (const d of s.destroyed) {
    const at = unitSpot(d.province);
    sb += `<g class="destroyed" transform="translate(${F(at.x)},${F(at.y)})">${title(`${powerName(d.power)}'s ${unitKindName(d.kind)} in ${provinceName(d.province)} was destroyed`)}<g class="sym lift"><rect class="tok-bg ghosted f-${glyphId(d.power)}" x="-11" y="-11" width="22" height="22" rx="${d.kind === "Army" ? 4 : 11}"/><path class="strike" d="M-9,-9L9,9M9,-9L-9,9"/></g></g>`;
  }
  return sb + "</g>";
}

function unitTitle(u: SceneUnit, viewer: Power | null): string {
  return (
    (u.count > 1 ? `${u.count} ${unitKindName(u.kind)}s` : u.kind === "Army" ? "An army" : "A fleet") +
    ` of ${powerName(u.power)} in ${provinceName(u.province)}` +
    (u.ghost ? `: last seen there in ${dateLabel(u.seenAt + 1, viewer)}, ${u.age} season${u.age === 1 ? "" : "s"} ago; it may have moved since` : "")
  );
}

/** A unit's token: [class, transform style, inner markup]. */
function unitItem(u: SceneUnit, viewer: Power | null): Item {
  const at = unitSpot(u.province);
  const id = glyphId(u.power);
  let inner = title(unitTitle(u, viewer)) + `<g class="sym lift">`;
  inner += u.kind === "Army" ? `<rect class="tok-bg f-${id}" x="-11" y="-11" width="22" height="22" rx="4"/>` : `<circle class="tok-bg f-${id}" r="12"/>`;
  inner += `<use href="${u.kind === "Army" ? "#g-army" : "#g-fleet"}" class="tok-icon" x="-9.5" y="-9.5" width="19" height="19"/>`;
  inner += `<g transform="translate(10,-10)"><circle class="tok-badge" r="5.6"/><use href="#em-${id}" class="tok-em e-${id}" x="-4.3" y="-4.3" width="8.6" height="8.6"/></g>`;
  if (u.count > 1) inner += `<g transform="translate(-10,10)"><circle class="tok-count" r="5.6"/><text class="tok-num" y="2.6">${u.count}</text></g>`;
  if (u.ghost) inner += `<g><text class="seen" y="-15">seen ${esc(shortDate(u.seenAt + 1, viewer))}</text></g>`;
  inner += "</g>";
  return {
    key: u.key,
    cls: `unit${u.ghost ? ` ghost age${Math.min(u.age, 4)}` : ""}`,
    style: `transform:translate(${F(at.x)}px,${F(at.y)}px)`,
    data: ["province", u.province],
    inner,
  };
}

function peopleAtCourts(input: MapInput): string {
  const s = input.scene;
  const byProvince = new Map<string, typeof s.people>();
  for (const p of s.people) {
    let g = byProvince.get(p.province);
    if (g === undefined) byProvince.set(p.province, (g = []));
    g.push(p);
  }
  let sb = "";
  for (const [province, list] of byProvince) {
    const c = city(province);
    sb += `<g transform="translate(${F(c.x)},${F(c.y)})"><g class="sym">`;
    for (let i = 0; i < Math.min(list.length, 6); i++) {
      const p = list[i];
      const angle = ((196 - 34 * i) * Math.PI) / 180;
      const x = Math.cos(angle) * 27;
      const y = -Math.sin(angle) * 27 + 4;
      sb += `<g class="person k-${p.kind.toLowerCase()}${p.believed ? " believed" : ""}${p.id === input.followId ? " followed" : ""}" transform="translate(${F(x)},${F(y)})" data-person="${p.id}">${title(p.title)}`;
      sb += `<rect class="chip-bg ${p.owner !== null ? `f-${glyphId(p.owner)}` : "f-none"}" x="-8" y="-8" width="16" height="16" rx="3.5"/>`;
      sb +=
        p.kind === "Envoy"
          ? `<use href="#g-tablet" class="chip-icon" x="-6" y="-6" width="12" height="12"/>`
          : p.kind === "Spy"
            ? `<use href="#g-eye" class="chip-icon" x="-6.5" y="-6.5" width="13" height="13"/>`
            : p.kind === "Captive"
              ? `<use href="#g-fetter" class="chip-icon" x="-6.5" y="-6.5" width="13" height="13"/>`
              : `<g><text class="chip-q" y="4">?</text></g>`;
      if (p.double) sb += `<circle class="double" cx="7" cy="-7" r="3"/>`;
      sb += "</g>";
    }
    if (list.length > 6) sb += `<g><text class="chip-more" x="-34" y="18">+${list.length - 6}</text></g>`;
    sb += "</g></g>";
  }
  for (const n of s.news) {
    const at = city(n.province);
    const report = n.kind === "SpyReport";
    sb += `<g class="news age${Math.min(n.age, 4)} ${report ? "report" : "rumor"}" transform="translate(${F(at.x + 20)},${F(at.y + 10)})">`;
    sb += title(`${n.title} (${report ? `observed in ${dateLabel(n.observed, s.viewer)}` : `heard in ${dateLabel(Math.max(1, s.index + 1 - n.age), s.viewer)}`}): ${n.body}`);
    sb += `<g class="sym"><path class="news-bg" d="M-9,-7H9V5H2L-2,9V5H-9Z"/>`;
    sb += report ? `<use href="#g-eye" class="news-icon" x="-6" y="-7" width="12" height="12"/>` : `<g><text class="news-q" y="3">?</text></g>`;
    sb += "</g></g>";
  }
  return sb;
}

function travellerItem(t: SceneTraveller, i: number, all: readonly SceneTraveller[], input: MapInput): Item {
  const viewer = input.scene.viewer;
  const r = route(t.fromProvince, t.toProvince);
  let at = along(r, t.progress);
  // Travellers on the same road are spread a little apart.
  const same = all.slice(0, i).filter((o) => o.fromProvince === t.fromProvince && o.toProvince === t.toProvince).length;
  const shift = mul(r.length > 1 ? normal(unit(sub(r[r.length - 1], r[0]))) : { x: 0, y: 1 }, same * 14);
  at = add(at, shift);
  const icon = t.kind === "Spy" ? "#g-eye" : t.kind === "Gold" ? "#g-ingot" : "#g-tablet";
  let inner = title(
    `${t.title}; set out in ${dateLabel(t.depart, viewer)}, due ${t.believed ? "back" : "there"} about ${dateLabel(t.arrive, viewer)}${t.gold > 0 && t.kind !== "Gold" ? `; carries ${shekels(t.gold)} of gold` : ""}. Where on the road is a guess.`,
  );
  inner += `<g class="sym"><circle class="halo" r="15"/>`;
  if (t.kind === "Gold") inner += `<use href="#g-ingot" class="ingot e-${glyphId(t.owner)}" x="-10" y="-10" width="20" height="20"/>`;
  else {
    inner += `<rect class="chip-bg f-${glyphId(t.owner)}" x="-8.5" y="-8.5" width="17" height="17" rx="8.5"/><use href="${icon}" class="chip-icon" x="-6.5" y="-6.5" width="13" height="13"/>`;
    if (t.gold > 0) inner += `<use href="#g-ingot" class="ingot small" x="3" y="2" width="10" height="10"/>`;
  }
  inner += `<text class="eta" y="21">→ ${esc(shortDate(t.arrive, viewer))}</text></g>`;
  return {
    key: t.key,
    cls: `traveller k-${t.kind.toLowerCase()}${t.believed ? " believed" : ""}${t.characterId !== null && t.characterId === input.followId ? " followed" : ""}`,
    style: `transform:translate(${F(at.x)}px,${F(at.y)}px)`,
    data: t.characterId !== null ? ["person", t.characterId] : null,
    inner,
  };
}

function selection(input: MapInput): string {
  let sb = `<g class="selection">`;
  if (input.targets !== null)
    for (const id of input.targets) {
      const d = Shapes.get(id);
      if (d !== undefined) sb += `<path class="target" d="${d}" clip-path="${landClipOf(id)}"/>`;
    }
  if (input.selected !== null && Shapes.has(input.selected)) {
    const at = city(input.selected);
    sb += `<path class="selected" d="${Shapes.get(input.selected)}" clip-path="${landClipOf(input.selected)}"/><g transform="translate(${F(at.x)},${F(at.y)})"><g class="csym"><circle class="sel-ring" r="15"/></g></g>`;
  }
  if (input.arrows !== null)
    for (const { from, to, support } of input.arrows) {
      const a = unitSpot(from);
      const b = unitSpot(to);
      if (len(sub(b, a)) < 1) continue;
      const end = sub(b, mul(unit(sub(b, a)), 12));
      sb += `<path class="draft${support ? " support" : ""}" d="${arc(a, end)}" marker-end="url(#ah-ink)"/>`;
    }
  return sb + "</g>";
}

// ---------------------------------------------------------------- keyed elements

interface Item {
  key: string;
  cls: string;
  style: string;
  data: [string, string] | null;
  inner: string;
}

/** Keeps one element per key, so a token that moves keeps its element and its CSS transition slides it. */
function reconcile(parent: SVGGElement, items: readonly Item[], known: Map<string, SVGGElement>): void {
  const keep = new Set<string>();
  for (const it of items) {
    keep.add(it.key);
    let el = known.get(it.key);
    if (el === undefined) {
      el = document.createElementNS(SVG, "g");
      known.set(it.key, el);
      parent.appendChild(el);
    }
    if (el.getAttribute("class") !== it.cls) el.setAttribute("class", it.cls);
    if (el.getAttribute("style") !== it.style) el.setAttribute("style", it.style);
    if (it.data !== null) el.setAttribute(`data-${it.data[0]}`, it.data[1]);
    if ((el as unknown as { _inner?: string })._inner !== it.inner) {
      el.innerHTML = it.inner;
      (el as unknown as { _inner?: string })._inner = it.inner;
    }
  }
  for (const [k, el] of known)
    if (!keep.has(k)) {
      el.remove();
      known.delete(k);
    }
}

// ---------------------------------------------------------------- the renderer

export class SvgMapRenderer implements MapRenderer {
  private view: HTMLElement | null = null;
  private layers = new Map<string, SVGGElement>();
  private drawn = new Map<string, unknown>();
  private units = new Map<string, SVGGElement>();
  private travellers = new Map<string, SVGGElement>();
  private handlers: MapHandlers | null = null;
  private readonly onClick = (e: Event): void => {
    const t = e.target as Element | null;
    const person = t?.closest("[data-person]");
    if (person !== null && person !== undefined) {
      this.handlers?.onPerson(person.getAttribute("data-person")!);
      return;
    }
    const prov = t?.closest("[data-province]");
    if (prov !== null && prov !== undefined) this.handlers?.onProvince(prov.getAttribute("data-province")!);
  };

  mount(view: HTMLElement, handlers: MapHandlers): void {
    this.view = view;
    this.handlers = handlers;
    const zoom = document.createElement("div");
    zoom.className = "mapzoom";
    // Two stacked drawings, each its own compositing layer: the land and who holds it below (heavy to paint, and painted
    // only when another season is shown), the pieces above (light). The upper one lets taps through where it has nothing.
    zoom.innerHTML =
      `<svg class="map map-lower" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" role="img">${Defs}${Base}<g data-layer="tints"></g><g data-layer="fog"></g><g data-layer="bands"></g>${Labels}<g data-layer="cities"></g></svg>` +
      `<svg class="map map-upper" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="roads"></g><g data-layer="moves"></g><g class="units" data-layer="units"></g><g class="people"><g data-layer="courts"></g><g data-layer="travellers"></g></g><g data-layer="selection"></g></svg>`;
    view.prepend(zoom);
    for (const g of zoom.querySelectorAll<SVGGElement>("g[data-layer]")) this.layers.set(g.dataset.layer!, g);
    zoom.addEventListener("click", this.onClick);
    attach(view);
  }

  private layer(name: string, key: unknown, draw: () => string): void {
    if (this.drawn.get(name) === key) return;
    this.drawn.set(name, key);
    this.layers.get(name)!.innerHTML = draw();
  }

  render(input: MapInput): void {
    const s = input.scene;
    const lower = this.view?.querySelector(".map-lower");
    lower?.setAttribute("aria-label", s.viewer !== null ? `Map of the Great Kings' lands as ${powerName(s.viewer)} sees it` : "Map of the Great Kings' lands (god view)");
    this.layer("tints", s.frame, () => tints(s));
    this.layer("fog", s, () => fog(s));
    this.layer("bands", s.frame, () => bands(s));
    this.layer("cities", s, () => cities(s));
    this.layer("roads", `${s.index}|${s.viewer}|${input.followId}|${input.followPath?.length ?? -1}|${input.followPath?.[input.followPath.length - 1]?.index ?? -1}`, () => roads(input));
    this.layer("moves", s, () => moves(s));
    if (this.drawn.get("units") !== s) {
      this.drawn.set("units", s);
      reconcile(
        this.layers.get("units")!,
        s.units.map((u) => unitItem(u, s.viewer)),
        this.units,
      );
    }
    const peopleKey = `${s.index}|${s.viewer}|${input.followId}`;
    if (this.drawn.get("people") !== s || this.drawn.get("peopleKey") !== peopleKey) {
      this.drawn.set("people", s);
      this.drawn.set("peopleKey", peopleKey);
      this.layers.get("courts")!.innerHTML = peopleAtCourts(input);
      reconcile(
        this.layers.get("travellers")!,
        s.travellers.map((t, i) => travellerItem(t, i, s.travellers, input)),
        this.travellers,
      );
    }
    this.layers.get("selection")!.innerHTML = selection(input);
  }

  zoomBy(factor: number): void {
    if (this.view !== null) zoomBy(this.view, factor);
  }

  fit(): void {
    if (this.view !== null) reset(this.view);
  }

  focus(at: Pt, minZoom: number): void {
    if (this.view !== null) focus(this.view, at.x, at.y, minZoom);
  }

  destroy(): void {
    if (this.view === null) return;
    detach(this.view);
    this.view.querySelector(".mapzoom")?.remove();
    this.view = null;
  }
}
