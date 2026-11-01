/**
 * The SVG renderer: the static geography written once as markup; each layer above it drawn again only when what it shows
 * changes; units and travellers kept as the same elements from season to season, so stepping the timeline slides them
 * along their moves; pinch, pan and wheel zoom move one layer on the GPU (zoom.ts) without drawing anything.
 */
import { WorldMap, crossingBetween, dateLabel, harvestOf, shortDate, taxOf, terrainOf, type Power, type Province, type UnitKind } from "@amarna/engine";
import { powerName, provinceName, shekels } from "../ui/format.ts";
import { CoastPath, F, Height, IslandPath, LakePath, LandPath, MainlandPath, Rivers, SeaPath, Shapes, Width, add, landClipOf, along, city, len, mul, normal, roadPath, route, sub, unit, unitSpot, unitWay, wayThrough, type Pt } from "./art.ts";
import { markGlyph, markKind } from "./crossings.ts";
import { dash, glyphId } from "./glyphs.ts";
import { roadsLayer, worksAtCities } from "./built.ts";
import { figureOf } from "./figures.ts";
import { OmenSigns, RuinMarks, lifeLayer, mediumOf, memoryLayer, sceneMarkup, scenesOf } from "./life.ts";
import { Base, Defs, Labels, MarksMarkup, NameOrder, Relief, ringOf } from "./markup.ts";
import type { MapHandlers, MapInput, MapRenderer } from "./renderer.ts";
import { seasonLayer } from "./seasons.ts";
import { captureLine, unitKindName, type MapScene, type SceneTraveller, type SceneUnit } from "./scene.ts";
import { attach, detach, focus, getView, reset, setView, zoomBy } from "./zoom.ts";

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
      const r = ringOf(p.capital, walls) + 2.6;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + Math.PI / 6;
        sb += `<use href="#fig-tent" class="tent t-${glyphId(siege.besieger)}" x="${F(Math.cos(a) * r - 2.6)}" y="${F(Math.sin(a) * r - 2.6)}" width="5.2" height="5.2"/>`;
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

/** A line stopped short of its end by a length, so an arrow's head does not hide the token it points at. */
function trimEnd(pts: readonly Pt[], by: number): Pt[] {
  const out = [...pts];
  let left = by;
  while (out.length >= 2) {
    const a = out[out.length - 2];
    const b = out[out.length - 1];
    const l = len(sub(b, a));
    if (l > left) {
      out[out.length - 1] = add(b, mul(sub(a, b), left / l));
      return out;
    }
    if (out.length === 2) return out;
    left -= l;
    out.pop();
  }
  return out;
}

/** The first part of a line, a fraction of its length. */
function upTo(pts: readonly Pt[], t: number): Pt[] {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += len(sub(pts[i], pts[i - 1]));
  let want = total * t;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const seg = len(sub(pts[i], pts[i - 1]));
    if (seg >= want) {
      out.push(add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), seg < 1e-9 ? 0 : want / seg)));
      return out;
    }
    out.push(pts[i]);
    want -= seg;
  }
  return out;
}

/**
 * A unit's way from one province to another (item 11c+: Haakon, "the arrows for units show only the province it starts
 * from and ends up in, but not which provinces they pass through"): along the roads through each province it passes,
 * as a travelling token goes, with a small mark at each province on the way and the mark of each crossing it takes.
 */
function wayOf(kind: UnitKind, from: string, to: string): { pts: Pt[]; extras: string } {
  const ids = unitWay(kind, from, to);
  const way = wayThrough(ids);
  let extras = "";
  for (const id of ids.slice(1, -1)) {
    const at = city(id);
    extras += `<g transform="translate(${F(at.x)},${F(at.y)})"><g class="csym"><circle class="way-stop" r="3.4"/></g></g>`;
  }
  for (const c of way.crossings) {
    const x = crossingBetween(c.a, c.b);
    if (x === null) continue;
    const at = way.pts[c.at];
    const before = way.pts[Math.max(c.at - 1, 0)];
    const after = way.pts[Math.min(c.at + 1, way.pts.length - 1)];
    const deg = (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI;
    extras += `<g class="xmark on-way k-${markKind(x)}" transform="translate(${F(at.x)},${F(at.y)})"><g class="csym"><circle class="xm-bg" r="7.5"/><g transform="rotate(${F(deg)})">${markGlyph(markKind(x))}</g></g></g>`;
  }
  return { pts: way.pts, extras };
}

/** A clash of arms where a battle was fought, in the colour of the side that won it. */
function clashMark(at: Pt, winner: Power, text: string): string {
  return `<g class="clash" transform="translate(${F(at.x)},${F(at.y)})">${title(text)}<g class="csym"><circle class="clash-bg f-${glyphId(winner)}" r="8.5"/><use href="#fig-clash" class="clash-icon" x="-6.8" y="-6.8" width="13.6" height="13.6"/></g></g>`;
}

function moves(s: MapScene): string {
  let sb = `<g class="moves">`;
  for (const c of s.captures) {
    const at = city(c.province);
    sb += `<g class="capture ${c.to !== null ? `c-${glyphId(c.to)}` : "c-free"}" transform="translate(${F(at.x)},${F(at.y)})">${title(`${provinceName(c.province)} changed hands this season: ${captureLine(c)}`)}<g class="csym"><circle class="cap-ring" r="16"/><circle class="cap-ring2" r="21"/></g></g>`;
  }
  for (const m of s.moves) {
    const id = glyphId(m.power);
    if (m.style === "Convoy") {
      sb += `<g class="mv convoy m-${id}">${title(m.text)}<path class="conv" d="${roadPath(wayThrough(unitWay("Fleet", m.from, m.to)).pts)}"/></g>`;
      continue;
    }
    const way = wayOf(m.kind, m.from, m.to);
    switch (m.style) {
      case "Move":
      case "Attack": {
        const d = roadPath(trimEnd(way.pts, 13));
        sb += `<g class="mv ${m.style === "Attack" ? "attack" : "move"} m-${id}">${title(m.text)}<path class="casing" d="${d}"/><path class="shaft" d="${d}" pathLength="1" marker-end="url(#ah-${id})"/>${way.extras}`;
        if (m.style === "Attack") {
          const at = along(trimEnd(way.pts, 13), 0.78);
          // A battle won (item 19): where it met troops in the field, a clash of arms in the winner's colour.
          sb +=
            m.against !== null
              ? clashMark(at, m.power, `A battle: ${m.text}, beating ${powerName(m.against)}`)
              : `<g transform="translate(${F(at.x)},${F(at.y)})"><g class="csym"><use href="#g-burst" class="burst" x="-8" y="-8" width="16" height="16"/></g></g>`;
        }
        sb += "</g>";
        break;
      }
      case "Bounce": {
        const part = upTo(way.pts, 0.55);
        const stop = part[part.length - 1];
        // The direction of the last step that has a length (two rounded points of a road may coincide).
        let back = part.length - 2;
        while (back > 0 && len(sub(stop, part[back])) < 1e-6) back--;
        const dir = unit(sub(stop, part[Math.max(back, 0)]));
        const n = mul(normal(dir), 8);
        const d = roadPath(part);
        sb += `<g class="mv bounce m-${id}">${title(m.text)}<path class="casing" d="${d}"/><path class="shaft" d="${d}" pathLength="1"/><path class="bar" d="M${F(stop.x + n.x)},${F(stop.y + n.y)}L${F(stop.x - n.x)},${F(stop.y - n.y)}"/>${way.extras}</g>`;
        // A battle lost: thrown back by the troops it met, the clash in their colour where it was stopped.
        if (m.against !== null) sb += clashMark(add(stop, mul(dir, 9)), m.against, `A battle: ${m.text}, held off by ${powerName(m.against)}`);
        break;
      }
      case "Support":
      case "SupportCut":
        sb += `<g class="mv support ${m.style === "SupportCut" ? "cut" : ""} m-${id}">${title(m.text)}<path class="sup" d="${roadPath(trimEnd(way.pts, 9))}" marker-end="url(#ah-sup)"/>${way.extras}</g>`;
        break;
    }
  }
  for (const d of s.destroyed) {
    const at = unitSpot(d.province);
    const ring = Map_.get(d.province).isSea ? 0 : ringOf(Map_.get(d.province).capital, s.walls.get(d.province) ?? 0);
    sb += `<g class="destroyed" transform="translate(${F(at.x)},${F(at.y)})" style="--ring:${F(ring)}">${title(`${powerName(d.power)}'s ${unitKindName(d.kind)} in ${provinceName(d.province)} was destroyed`)}<g class="sym lift over"><rect class="tok-bg ghosted f-${glyphId(d.power)}" x="-11" y="-11" width="22" height="22" rx="${d.kind === "Army" ? 4 : 11}"/><path class="strike" d="M-9,-9L9,9M9,-9L-9,9"/></g></g>`;
  }
  return sb + "</g>";
}

/**
 * Bands on the land and pirate crews on the coasts (item 19, "bands' campfires show where they lurk"): a campfire below the
 * city of the province a band works, a pirate's ship beside it if it has one, each with its men as the viewer sees them.
 */
function outlaws(s: MapScene): string {
  let sb = "";
  const nth = new Map<string, number>();
  for (const b of s.bands) {
    const k = nth.get(b.province) ?? 0;
    nth.set(b.province, k + 1);
    const at = city(b.province);
    const ring = ringOf(Map_.get(b.province).capital, s.walls.get(b.province) ?? 0);
    const what = b.ship ? "A pirate crew" : "A band";
    // Word from land lost without the court's knowing is old: drawn faded, like a unit last seen, with its age.
    const old = b.age > 0 ? ` ghost age${Math.min(4, b.age)}` : "";
    sb += `<g class="band-mark${b.ship ? " pirate" : ""}${old}" data-province="${b.province}" transform="translate(${F(at.x)},${F(at.y)})" style="--ring:${F(ring)}">`;
    sb += title(`${what} of ${b.men} men in ${provinceName(b.province)}${b.chief !== "" ? `, led by ${b.chief}` : ""}${b.age > 0 ? `: as your people last told of it, ${b.age} season${b.age === 1 ? "" : "s"} ago` : ""}`);
    sb += `<g class="sym"><g transform="translate(${k * 18},0)"><circle class="band-bg" r="8"/><use href="${b.ship ? "#fig-fleet-levant" : "#fig-fire"}" class="band-icon" x="-6.4" y="-6.4" width="12.8" height="12.8"/></g></g></g>`;
  }
  return sb;
}

function unitTitle(u: SceneUnit, viewer: Power | null): string {
  return (
    (u.count > 1 ? `${u.count} ${unitKindName(u.kind)}s` : u.kind === "Army" ? "An army" : "A fleet") +
    ` of ${powerName(u.power)} in ${provinceName(u.province)}` +
    (u.ghost ? `: last seen there in ${dateLabel(u.seenAt + 1, viewer)}, ${u.age} season${u.age === 1 ? "" : "s"} ago; it may have moved since` : "")
  );
}

/** A unit's token: [class, transform style, inner markup]; `dx` sets it beside the others in its province (in its own units). */
function unitItem(u: SceneUnit, viewer: Power | null, dx: number, text: string, ring: number): Item {
  const at = unitSpot(u.province);
  const id = glyphId(u.power);
  let inner = title(text) + `<g class="sym lift"><g transform="translate(${F(dx)},0)">`;
  inner += u.kind === "Army" ? `<rect class="tok-bg f-${id}" x="-11" y="-11" width="22" height="22" rx="4"/>` : `<circle class="tok-bg f-${id}" r="12"/>`;
  inner += `<use href="${figureOf(u.power, u.kind)}" class="tok-icon" x="-10" y="-10" width="20" height="20"/>`;
  inner += `<g transform="translate(10,-10)"><circle class="tok-badge" r="5.6"/><use href="#em-${id}" class="tok-em e-${id}" x="-4.3" y="-4.3" width="8.6" height="8.6"/></g>`;
  if (u.count > 1) inner += `<g transform="translate(-10,10)"><circle class="tok-count" r="5.6"/><text class="tok-num" y="2.6">${u.count}</text></g>`;
  if (u.ghost) inner += `<g><text class="seen" y="-15">seen ${esc(shortDate(u.seenAt + 1, viewer))}</text></g>`;
  inner += "</g></g>";
  return {
    key: u.key,
    cls: `unit${u.ghost ? ` ghost age${Math.min(u.age, 4)}` : ""}`,
    style: `transform:translate(${F(at.x)}px,${F(at.y)}px);--ring:${F(ring)}`,
    data: ["province", u.province],
    inner,
  };
}

/** The distance from each province's city to the nearest other one, on the board: how much room its counters have. */
const Room: ReadonlyMap<string, number> = new Map(
  Map_.provinces.map((p) => [p.id, Math.min(...Map_.provinces.filter((q) => q.id !== p.id).map((q) => len(sub(city(q.id), city(p.id)))))] as const),
);
/** A token's width on screen at a scale (zoom.ts, --sym), and the step from one token to the next beside it (in its own units). */
const tokenPx = (scale: number): number => Math.min(40, Math.max(14, 9 + 12 * scale));
const TokenStep = 26;

/**
 * Counters gather by zoom ("Map on small screens", item 11c+): where a province's tokens fit beside its city they stand
 * in a row, each power's armies and its fleets apart; below that zoom they gather into one token per power with its
 * count, opening again as the map is zoomed in.
 */
function unitItems(units: readonly SceneUnit[], viewer: Power | null, scale: number, walls: ReadonlyMap<string, number>): Item[] {
  const byProvince = new Map<string, SceneUnit[]>();
  for (const u of units) {
    const g = byProvince.get(u.province) ?? [];
    g.push(u);
    byProvince.set(u.province, g);
  }
  const items: Item[] = [];
  for (const [province, list] of byProvince) {
    const fits = (n: number): boolean => n <= 1 || (n * TokenStep * tokenPx(scale)) / 22 <= (Room.get(province) ?? 0) * scale * 0.85;
    const powers = [...new Set(list.map((u) => u.power))];
    const gather = !fits(list.length) && powers.length < list.length;
    const row: [SceneUnit, string][] = gather
      ? powers.map((p) => {
          const mine = list.filter((u) => u.power === p);
          const armies = mine.filter((u) => u.kind === "Army").reduce((a, u) => a + u.count, 0);
          const fleets = mine.filter((u) => u.kind === "Fleet").reduce((a, u) => a + u.count, 0);
          const ghost = mine.every((u) => u.ghost);
          const u: SceneUnit = { ...mine[0], key: `gp:${province}:${p}`, kind: armies > 0 ? "Army" : "Fleet", count: armies + fleets, men: mine.reduce((a, x) => a + x.men, 0), ghost };
          const what = [armies > 0 ? `${armies} ${armies === 1 ? "army" : "armies"}` : "", fleets > 0 ? `${fleets} fleet${fleets === 1 ? "" : "s"}` : ""].filter((x) => x !== "").join(" and ");
          return [u, `${what} of ${powerName(p)} in ${provinceName(province)}${ghost ? ", as last seen" : ""} (zoom in to see each)`] as [SceneUnit, string];
        })
      : list.map((u) => [u, unitTitle(u, viewer)] as [SceneUnit, string]);
    const p = Map_.get(province);
    const ring = p.isSea ? 0 : ringOf(p.capital, walls.get(province) ?? 0);
    row.forEach(([u, text], i) => items.push(unitItem(u, viewer, (i - (row.length - 1) / 2) * TokenStep, text, ring)));
  }
  return items;
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
  // Each court's people stand in rows of three to the left of its city, clear of its outermost ring (--ring, app.css), and
  // its news to the right, so neither touches the badge or the counters above it (item 11c++).
  const ringAt = (province: string): string => F(ringOf(Map_.get(province).capital, s.walls.get(province) ?? 0));
  for (const [province, list] of byProvince) {
    const c = city(province);
    sb += `<g class="court-at" data-court="${province}" transform="translate(${F(c.x)},${F(c.y)})"><g class="cring" style="--ring:${ringAt(province)}"><g class="sym">`;
    for (let i = 0; i < Math.min(list.length, 6); i++) {
      const p = list[i];
      const x = -8 - (i % 3) * 19;
      const y = Math.floor(i / 3) * 19;
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
    if (list.length > 6) sb += `<g class="person-more"><text class="chip-more" x="-8" y="48" text-anchor="middle">+${list.length - 6}</text></g>`;
    sb += "</g></g></g>";
  }
  // Each piece of news in a province beside the one before it.
  const newsIndex = new Map<string, number>();
  for (const n of s.news) {
    const at = city(n.province);
    const nth = newsIndex.get(n.province) ?? 0;
    newsIndex.set(n.province, nth + 1);
    const report = n.kind === "SpyReport";
    sb += `<g class="news age${Math.min(n.age, 4)} ${report ? "report" : "rumor"}" data-court="${n.province}" transform="translate(${F(at.x)},${F(at.y)})">`;
    sb += title(`${n.title} (${report ? `observed in ${dateLabel(n.observed, s.viewer)}` : `heard in ${dateLabel(Math.max(1, s.index + 1 - n.age), s.viewer)}`}): ${n.body}`);
    sb += `<g class="nring" style="--ring:${ringAt(n.province)}"><g class="sym"><g transform="translate(${nth * 21},0)"><path class="news-bg" d="M-1,-7H17V5H10L6,9V5H-1Z"/>`;
    sb += report ? `<use href="#g-eye" class="news-icon" x="2" y="-7" width="12" height="12"/>` : `<g><text class="news-q" x="8" y="3">?</text></g>`;
    sb += "</g></g></g></g>";
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
  const icon = t.kind === "Spy" ? "#g-eye" : t.kind === "Gold" ? "#g-ingot" : "#fig-envoy";
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
    for (const { from, to, support, kind } of input.arrows) {
      if (from === to) continue;
      const way = wayOf(kind, from, to);
      sb += `<g class="draft-way"><path class="draft${support ? " support" : ""}" d="${roadPath(trimEnd(way.pts, 12))}" marker-end="url(#ah-ink)"/>${way.extras}</g>`;
    }
  return sb + "</g>";
}

/** Each river's path as the whole board draws it. */
const RiverPaths: ReadonlyMap<string, string> = new Map(Rivers.map((r) => [r.id, r.path]));

/** The small seal's size against the full seal's (map-uncluttered.css, .city.small .seal). */
const SmallSeal = 0.45;

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
  private labels = new Map<string, SVGGElement>();
  private handlers: MapHandlers | null = null;
  private scale = 0;
  private scene: MapScene | null = null;
  private placing = 0;
  private fine = false;
  /** The finer rivers, once loaded (fine-geo.ts). */
  private fineRivers: ReadonlyMap<string, string> | null = null;
  private readonly onClick = (e: Event): void => {
    const t = e.target as Element | null;
    const person = t?.closest("[data-person]");
    if (person !== null && person !== undefined) {
      this.handlers?.onPerson(person.getAttribute("data-person")!);
      return;
    }
    const mark = t?.closest("[data-mark]");
    if (mark !== null && mark !== undefined) {
      // The province under the mark too, for a tap that chooses a province (an order being drafted).
      const { clientX, clientY } = e as MouseEvent;
      const under = document.elementsFromPoint(clientX, clientY).find((el) => el.closest("[data-mark]") === null && el.closest("[data-province]") !== null);
      this.handlers?.onMark(mark.getAttribute("data-mark")!, under?.closest("[data-province]")?.getAttribute("data-province") ?? null);
      return;
    }
    const prov = t?.closest("[data-province]");
    if (prov !== null && prov !== undefined) this.handlers?.onProvince(prov.getAttribute("data-province")!);
    else this.handlers?.onBlank();
  };

  /**
   * A glide or slide has ended: the markers and names are placed again where everything has stopped. Its real end, not a
   * timer guessed from its length: a transition starts only at the next frame drawn, late on a busy phone, and taking the
   * glide's class away does not stop one already running.
   */
  private readonly onMoved = (e: TransitionEvent): void => {
    if (e.propertyName === "transform" && (e.target as Element).matches(".mapzoom, .unit, .traveller")) this.placeNames();
  };

  mount(view: HTMLElement, handlers: MapHandlers): void {
    this.view = view;
    this.handlers = handlers;
    const zoom = document.createElement("div");
    zoom.className = "mapzoom";
    // Two stacked drawings, each its own compositing layer: the land and who holds it below (heavy to paint, and painted
    // only when another season is shown), the pieces above (light). The upper one lets taps through where it has nothing.
    zoom.innerHTML =
      `<svg class="map map-lower" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" role="img">${Defs}${Base}</svg>` +
      `<svg class="map map-season" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="tints"></g><g data-layer="season"></g></svg>` +
      `<svg class="map map-relief" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${Relief}</svg>` +
      `<svg class="map map-marks" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="works"></g><g data-layer="memory"></g><g data-layer="fog"></g><g data-layer="bands"></g>${MarksMarkup}${Labels}<g data-layer="cities"></g></svg>` +
      `<svg class="map map-upper" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="roads"></g><g data-layer="moves"></g><g data-layer="outlaws"></g><g data-layer="worksat"></g><g data-layer="life"></g><g data-layer="scenes"></g><g class="units" data-layer="units"></g><g class="people"><g data-layer="courts"></g><g data-layer="travellers"></g></g><g data-layer="selection"></g></svg>`;
    view.prepend(zoom);
    for (const g of zoom.querySelectorAll<SVGGElement>("g[data-layer]")) this.layers.set(g.dataset.layer!, g);
    for (const g of zoom.querySelectorAll<SVGGElement>("g[data-label]")) this.labels.set(g.dataset.label!, g);
    zoom.addEventListener("click", this.onClick);
    zoom.addEventListener("transitionend", this.onMoved);
    zoom.addEventListener("transitioncancel", this.onMoved);
    attach(view, (scale: number) => {
      this.scale = scale;
      this.closeUp();
      if (this.scene !== null) {
        this.drawUnits(this.scene);
        this.drawWorks(this.scene);
      }
      // Now, and again once the zoom's glide has ended (onMoved).
      this.placeNames();
    });
  }

  private layer(name: string, key: unknown, draw: () => string): void {
    if (this.drawn.get(name) === key) return;
    this.drawn.set(name, key);
    const t = performance.now();
    // Drawn anew, but written only when the markup differs from what stands (item 17a: a write means a style recalculation
    // and a repaint of the layer, which a phone pays 40 ms and more for; most seasons the cities, the tints and the bands
    // come out the same).
    const html = draw();
    if (this.written.get(name) !== html) {
      this.layers.get(name)!.innerHTML = html;
      this.written.set(name, html);
      this.changed = true;
    }
    performance.measure(`map:${name}`, { start: t });
  }

  /** The markup each layer was last written with. */
  private readonly written = new Map<string, string>();

  /** Whether a layer, the units or the people were written since the names were last placed: placing them costs a layout. */
  private changed = false;

  /**
   * What is built at the cities (item 19): shown only close up (lod2, zoom.ts), so built only then, and again when the zoom
   * comes close; at the other zooms the layer stays empty and costs a season's redraw nothing.
   */
  private drawWorks(s: MapScene): void {
    const close = this.view?.classList.contains("lod2") ?? false;
    this.layer("worksat", close ? s : null, () => (close ? worksAtCities(s) : ""));
  }

  /** The units, laid out for the current zoom: drawn again only when the scene or a province's gathering changes. */
  private drawUnits(s: MapScene): void {
    const items = unitItems(s.units, s.viewer, this.scale, s.walls);
    const key = items.map((i) => i.key + i.inner.length).join("|");
    if (this.drawn.get("units") === s && this.drawn.get("unitsKey") === key) return;
    this.drawn.set("units", s);
    this.drawn.set("unitsKey", key);
    this.changed = true;
    reconcile(this.layers.get("units")!, items, this.units);
  }

  render(input: MapInput): void {
    // Timed, as every step of a season on the page is (item 17a): the soak tool reads the measures.
    const t = performance.now();
    this.renderNow(input);
    performance.measure("map:render", { start: t });
  }

  /**
   * The season's layers are drawn in steps over as many frames as they need, a budget of time a frame (item 17a: no frame over
   * about 50 ms; a whole season's layers in one frame took up to 60 ms on desktop and far longer on a phone). A new render
   * drops the steps still waiting: it writes every layer whose key changed, those the dropped steps would have written among
   * them. The names are placed after the last step.
   */
  private steps: (() => void)[] = [];
  private stepping = 0;
  private static readonly BudgetMs = 8;

  private renderNow(input: MapInput): void {
    const s = input.scene;
    this.scene = s;
    const lower = this.view?.querySelector(".map-lower");
    lower?.setAttribute("aria-label", s.viewer !== null ? `Map of the Great Kings' lands as ${powerName(s.viewer)} sees it` : "Map of the Great Kings' lands (god view)");
    const seasonKey = `${s.frame.turn % 3}|${s.viewer}|${[...s.land].join(";")}`;
    this.steps = [
      () => {
        if (this.drawn.get("season") !== seasonKey) {
          this.layer("season", seasonKey, () => seasonLayer(s));
          // A river in spate is drawn on the board's course: close up, it takes the finer one the rivers have.
          if (this.fine && this.fineRivers !== null) this.swapGeography({}, this.fineRivers);
        }
      },
      () => this.layer("tints", s.frame, () => tints(s)),
      () => this.layer("works", `${s.viewer}|${[...s.built].join(";")}|${[...(s.builtKnown ?? [])].join(";")}`, () => roadsLayer(s)),
      () => {
        const m = s.memory;
        this.layer("memory", `${s.viewer}|${[...m.wild].join()}|${[...m.memorials].map(([k, v]) => `${k}:${v.count}:${v.last}:${s.walls.get(k) ?? 0}`).join()}`, () => memoryLayer(s));
      },
      () => this.layer("fog", s, () => fog(s)),
      () => this.layer("bands", s.frame, () => bands(s)),
      () => {
        if (this.drawn.get("cities") !== s) {
          this.layer("cities", s, () => cities(s));
          // Each name stands off its city's outermost ring, which grows with the walls the viewer knows.
          for (const p of Land) {
            const g = this.labels.get(p.id);
            const ring = F(ringOf(p.capital, s.walls.get(p.id) ?? 0));
            if (g !== undefined && g.style.getPropertyValue("--ring") !== ring) g.style.setProperty("--ring", ring);
          }
        }
      },
      () => this.layer("roads", `${s.index}|${s.viewer}|${input.followId}|${input.followPath?.length ?? -1}|${input.followPath?.[input.followPath.length - 1]?.index ?? -1}`, () => roads(input)),
      () => this.layer("moves", s, () => moves(s)),
      () => this.layer("outlaws", s, () => outlaws(s)),
      () => this.drawWorks(s),
      () => this.layer("life", s, () => lifeLayer(s)),
      () => {
        this.showScenes(s);
        this.margin(s);
      },
      () => this.drawUnits(s),
      () => {
        const peopleKey = `${s.index}|${s.viewer}|${input.followId}`;
        if (this.drawn.get("people") !== s || this.drawn.get("peopleKey") !== peopleKey) {
          this.drawn.set("people", s);
          this.drawn.set("peopleKey", peopleKey);
          this.changed = true;
          const courts = peopleAtCourts(input);
          if (this.written.get("courts") !== courts) {
            this.layers.get("courts")!.innerHTML = courts;
            this.written.set("courts", courts);
          }
          reconcile(
            this.layers.get("travellers")!,
            s.travellers.map((t, i) => travellerItem(t, i, s.travellers, input)),
            this.travellers,
          );
        }
      },
      () => {
        const sel = selection(input);
        if (this.written.get("selection") !== sel) {
          this.layers.get("selection")!.innerHTML = sel;
          this.written.set("selection", sel);
        }
        // Names are placed once the pieces are drawn, when something was drawn anew (item 17a: placing them measures every
        // name and marker, a layout the phone pays dearly for), and again once the pieces have slid to their places (onMoved).
        if (this.changed) this.placeNames();
      },
    ];
    this.runSteps();
  }

  /** Runs the waiting steps within this frame's budget, and comes back next frame for the rest. */
  private runSteps(): void {
    if (this.stepping !== 0) {
      cancelAnimationFrame(this.stepping);
      this.stepping = 0;
    }
    const start = performance.now();
    while (this.steps.length > 0) {
      const step = this.steps.shift()!;
      step();
      if (this.steps.length > 0 && performance.now() - start > SvgMapRenderer.BudgetMs) {
        this.stepping = requestAnimationFrame(() => {
          this.stepping = 0;
          this.runSteps();
        });
        return;
      }
    }
  }

  /**
   * Small scenes at big moments (item 19): when the map steps on by one season, the season's gift processions, sacks and
   * ambushes play once over the map, briefly, then are taken away; none when the reader asks for reduced motion, when
   * stepping back, or jumping.
   */
  private sceneFrom: { index: number; viewer: Power | null } | null = null;
  private sceneTimer = 0;
  private showScenes(s: MapScene): void {
    const last = this.sceneFrom;
    this.sceneFrom = { index: s.index, viewer: s.viewer };
    if (last !== null && last.index === s.index && last.viewer === s.viewer) return;
    const g = this.layers.get("scenes")!;
    clearTimeout(this.sceneTimer);
    g.innerHTML = "";
    if (last === null || last.index !== s.index - 1 || last.viewer !== s.viewer || s.prev === null) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scenes = scenesOf(s.prev, s.frame, s.viewer);
    if (scenes.length === 0) return;
    g.innerHTML = scenes.map(sceneMarkup).join("");
    // Each plays 3.6 s, the next starting 0.35 s after the one before (map-living.css).
    this.sceneTimer = window.setTimeout(() => (g.innerHTML = ""), 3700 + 350 * (scenes.length - 1));
  }

  /** The realm's own medium (clay for every court but Egypt's, papyrus for Egypt and god view) and the omens in the margin. */
  private margin(s: MapScene): void {
    const view = this.view;
    if (view === null) return;
    const medium = mediumOf(s.viewer);
    if (view.dataset.medium !== medium) view.dataset.medium = medium;
    const tier = s.frame.omen;
    if ((view.dataset.omen ?? "") === (tier ?? "")) return;
    if (tier === null) delete view.dataset.omen;
    else view.dataset.omen = tier;
    let el = view.querySelector<HTMLElement>(":scope > .omen");
    if (tier === null) {
      el?.remove();
      return;
    }
    if (el === null) {
      el = document.createElement("div");
      el.className = "omen";
      view.querySelector(".mapzoom")?.after(el);
    }
    el.title = OmenSigns[tier].text;
    el.setAttribute("aria-label", OmenSigns[tier].text);
    el.innerHTML = `<svg viewBox="-13 -13 26 26" aria-hidden="true">${OmenSigns[tier].svg}</svg>`;
  }

  /**
   * Finer geography close up (item 11c++): past about 6x the land's paths take the finer set (fine-geo.ts, loaded the
   * first time), and below about 4.5x the board's own come back, so the whole board stays light on a phone.
   */
  private closeUp(): void {
    const view = this.view;
    const zoom = view === null ? null : getView(view)?.zoom ?? null;
    if (view === null || zoom === null) return;
    const want = zoom > 6 ? true : zoom < 4.5 ? false : this.fine;
    if (want === this.fine) return;
    this.fine = want;
    if (want) {
      import("./fine-geo.ts")
        .then(({ Fine }) => {
          this.fineRivers = Fine.rivers;
          if (this.fine && this.view === view) this.swapGeography({ ...Fine.coasts, lakes: Fine.lakes }, Fine.rivers);
        })
        // Not loaded (offline before the cache had it): the board's own stay, and the next zoom tries again.
        .catch(() => (this.fine = false));
    } else this.swapGeography({ land: LandPath, mainland: MainlandPath, island: IslandPath, coast: CoastPath, sea: SeaPath, lakes: LakePath }, null);
  }

  private swapGeography(paths: Record<string, string>, rivers: ReadonlyMap<string, string> | null): void {
    this.view?.querySelectorAll<SVGPathElement>("[data-geo]").forEach((e) => {
      const d = paths[e.dataset.geo ?? ""];
      if (d !== undefined && e.getAttribute("d") !== d) e.setAttribute("d", d);
    });
    this.view?.querySelectorAll<SVGPathElement>("[data-river]").forEach((e) => {
      const id = e.dataset.river ?? "";
      const d = rivers?.get(id) ?? RiverPaths.get(id);
      if (d !== undefined && e.getAttribute("d") !== d) e.setAttribute("d", d);
    });
  }

  /**
   * Markers never overlap (item 11c++), and names give way to everything drawn over the land (item 11c+). In order of
   * importance (NameOrder), each city is shown with its full badge, its counters, its people and its news where none of
   * them touches a marker already placed; where one would, its badge shrinks to its small seal and the rest gives way,
   * returning as the map is zoomed in; where even the small seal would touch, the city's mark gives way too (its province's
   * colour still says who holds it). Then the fleets at sea, the units destroyed, the travellers on the roads and the marks
   * of the crossings, each where it touches nothing placed. Then the names: each where its box, measured as drawn, touches
   * no name shown before it and no marker shown (its own city's badge it may sit beside). Batched to the next frame.
   */
  private placeNames(): void {
    this.changed = false;
    if (this.placing !== 0 || this.view === null) return;
    this.placing = requestAnimationFrame(() => {
      this.placing = 0;
      const view = this.view;
      if (view === null) return;
      const t = performance.now();
      this.placeNamesNow(view);
      performance.measure("map:names", { start: t });
    });
  }

  private placeNamesNow(view: HTMLElement): void {
    {
      // Everything shown again, then all measured in one go, then given way in one batch of class changes: one layout,
      // however many markers (writing a class between two measures would force a layout each time).
      view.querySelectorAll(".map .small, .map .off").forEach((e) => e.classList.remove("small", "crowd", "off"));
      const rects = (e: Element, sel: string): DOMRect[] =>
        [...e.querySelectorAll(sel)].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
      const union = (rs: DOMRect[]): DOMRect[] => {
        if (rs.length < 2) return rs;
        const left = Math.min(...rs.map((r) => r.left)), top = Math.min(...rs.map((r) => r.top));
        return [new DOMRect(left, top, Math.max(...rs.map((r) => r.right)) - left, Math.max(...rs.map((r) => r.bottom)) - top)];
      };
      const byProvince = (sel: string): Map<string, Element[]> => {
        const m = new Map<string, Element[]>();
        view.querySelectorAll(sel).forEach((e) => {
          const id = e.getAttribute("data-province") ?? e.getAttribute("data-court") ?? "";
          m.set(id, [...(m.get(id) ?? []), e]);
        });
        return m;
      };
      const units = byProvince(".map-upper .unit[data-province]");
      const courts = byProvince(".map-upper .court-at[data-court], .map-upper .news[data-court]");
      const cities = new Map<string, SVGGElement>();
      view.querySelectorAll<SVGGElement>(".cities .city").forEach((c) => cities.set(c.dataset.province ?? "", c));
      // Measured: each city's badge, seal and own markers; then the lesser markers; then the names.
      const cityRects = NameOrder.filter((id) => cities.has(id)).map((id) => {
        const c = cities.get(id)!;
        return {
          id,
          c,
          // The badge as one box round its seal, rings and a siege's tents: the tents stand apart, and a counter between two
          // of them would still crowd the city.
          badge: union(rects(c, ".seal, .walls, .cap-ring, .tent")),
          seal: c.querySelector(".seal")?.getBoundingClientRect(),
          rest: [
            ...(units.get(id) ?? []).flatMap((u) => rects(u, ":scope > .sym")),
            ...(courts.get(id) ?? []).flatMap((e) => rects(e, ".person, .person-more, .news-bg")),
          ],
        };
      });
      // The traveller or person being followed comes first; then, after the cities, the fleets at sea and the counters of
      // provinces with no city drawn, the units destroyed, the travellers, and the marks of the crossings.
      const followed = [...view.querySelectorAll(".map-upper .traveller.followed")].map((e) => ({ e, rs: rects(e, ":scope > .sym") }));
      const lesser = [
        ...[...units].filter(([id]) => !cities.has(id)).flatMap(([, es]) => es.map((e) => [e, ":scope > .sym"] as const)),
        ...[...view.querySelectorAll(".map-upper .destroyed")].map((e) => [e, ":scope > .sym"] as const),
        ...[...view.querySelectorAll(".map-upper .band-mark")].map((e) => [e, ":scope > .sym"] as const),
        ...[...view.querySelectorAll(".map-upper .life-mark")].map((e) => [e, ":scope > .sym"] as const),
        ...[...view.querySelectorAll(".map-upper .traveller:not(.followed)")].map((e) => [e, ":scope > .sym"] as const),
        ...[...view.querySelectorAll(".xmarks .xmark")].map((e) => [e, ".xm-bg"] as const),
      ].map(([e, sel]) => ({ e, rs: rects(e, sel) }));
      // What is built at the cities (item 19) comes last of all: it gives way to every marker and every name.
      const works = [...view.querySelectorAll(".map-upper .works-at")].map((e) => ({ e, rs: rects(e, ".wk-bg") }));
      const names = NameOrder.map((id) => this.labels.get(id)?.querySelector("text"))
        .filter((t): t is SVGTextElement => t !== null && t !== undefined)
        .map((t) => ({ t, own: t.closest("[data-label]")?.getAttribute("data-label") ?? null, r: t.getBoundingClientRect() }));
      const geo = [...view.querySelectorAll<SVGTextElement>(".base text.geo")].map((t) => ({ t, own: null, r: t.getBoundingClientRect() }));

      const placed: { r: DOMRect; own: string | null }[] = [];
      const touch = (a: DOMRect, b: DOMRect): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const free = (rs: readonly DOMRect[]): boolean => rs.every((r) => !placed.some((o) => touch(r, o.r)));
      const place = (rs: readonly DOMRect[], own: string | null): void => rs.forEach((r) => placed.push({ r, own }));
      const writes: (() => void)[] = [];
      for (const f of followed) place(f.rs, null);
      for (const { id, c, badge, seal, rest } of cityRects) {
        // A city's own markers must not touch each other either (two pieces of news, say).
        const own = rest.every((r, i) => !rest.slice(i + 1).some((o) => touch(r, o)));
        if (own && free(badge) && free(rest)) {
          place(badge, id);
          place(rest, null);
          continue;
        }
        for (const e of [...(units.get(id) ?? []), ...(courts.get(id) ?? [])]) writes.push(() => e.classList.add("off"));
        if (seal === undefined) continue;
        // The small seal: the seal's own centre, at the size the stylesheet shrinks it to (.city.small, map-uncluttered.css).
        const k = SmallSeal / 2;
        const small = new DOMRect(seal.x + seal.width * (0.5 - k), seal.y + seal.height * (0.5 - k), seal.width * 2 * k, seal.height * 2 * k);
        if (free([small])) {
          // A small seal whose counters gave way says so by its darker rim.
          const crowd = (units.get(id) ?? []).length > 0;
          writes.push(() => c.classList.add("small", ...(crowd ? ["crowd"] : [])));
          place([small], id);
        } else writes.push(() => c.classList.add("off"));
      }
      for (const { e, rs } of lesser) {
        if (free(rs)) place(rs, null);
        else writes.push(() => e.classList.add("off"));
      }
      // The names: each where it touches no name shown and no marker (its own city's badge it may sit beside); the names
      // of the land (rivers, ranges, deserts, the lands beyond) last.
      const shown: DOMRect[] = [];
      for (const { t, own, r } of [...names, ...geo]) {
        const ok = !shown.some((o) => touch(r, o)) && !placed.some((o) => (own === null || o.own !== own) && touch(r, o.r));
        if (ok) shown.push(r);
        else writes.push(() => t.classList.add("off"));
      }
      for (const { e, rs } of works) {
        if (free(rs) && rs.every((r) => !shown.some((o) => touch(r, o)))) place(rs, null);
        else writes.push(() => e.classList.add("off"));
      }
      for (const w of writes) w();
    }
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

  getView(): { at: Pt; zoom: number; whole?: boolean } | null {
    const v = this.view === null ? null : getView(this.view);
    return v === null ? null : { at: { x: v.x, y: v.y }, zoom: v.zoom, whole: v.whole };
  }

  setView(at: Pt, zoom: number, animated: boolean): void {
    if (this.view !== null) setView(this.view, at.x, at.y, zoom, animated);
  }

  destroy(): void {
    if (this.view === null) return;
    cancelAnimationFrame(this.placing);
    cancelAnimationFrame(this.stepping);
    this.steps = [];
    detach(this.view);
    clearTimeout(this.sceneTimer);
    this.view.querySelector(".mapzoom")?.remove();
    this.view.querySelector(":scope > .omen")?.remove();
    delete this.view.dataset.medium;
    delete this.view.dataset.omen;
    this.view = null;
  }
}
