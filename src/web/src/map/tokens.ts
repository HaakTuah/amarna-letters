/**
 * The units, the people at courts and the travellers as tokens: each kept as the same element from season to season (keyed),
 * so a token that moves keeps its element and its CSS transition slides it along its way.
 */

import { WorldMap, dateLabel, shortDate, type Power } from "@amarna/engine";
import { powerName, provinceName, shekels } from "../ui/format.ts";
import { F, add, along, city, len, mul, normal, route, sub, unit, unitSpot, type Pt } from "./art.ts";
import { glyphId } from "./glyphs.ts";
import { figureOf } from "./figures.ts";
import { outerRing, ringOf } from "./markup.ts";
import type { MapInput } from "./renderer.ts";
import { unitKindName, type SceneTraveller, type SceneUnit } from "./scene.ts";
import { esc, title } from "./text.ts";

const Map_ = WorldMap.default;
const SVG = "http://www.w3.org/2000/svg";

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
export function unitItems(units: readonly SceneUnit[], viewer: Power | null, scale: number, walls: ReadonlyMap<string, number>): Item[] {
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

export function peopleAtCourts(input: MapInput): string {
  const s = input.scene;
  const byProvince = new Map<string, typeof s.people>();
  for (const p of s.people) {
    let g = byProvince.get(p.province);
    if (g === undefined) byProvince.set(p.province, (g = []));
    g.push(p);
  }
  let sb = "";
  // Each court's people stand in rows of three to the left of its city, clear of its outermost ring (--ring, map.css), and
  // its news to the right, so neither touches the badge or the counters above it (item 11c++); round a besieged city, clear
  // of the siege camp's tents too, which are part of its badge.
  const besieged = new Set(s.sieges.map((x) => x.province));
  const ringAt = (province: string): string => F(outerRing(Map_.get(province).capital, s.walls.get(province) ?? 0, besieged.has(province)));
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

/** How far a traveller is set off its road: travellers on the same road are spread a little apart. */
export function travellerShift(t: SceneTraveller, i: number, all: readonly SceneTraveller[]): Pt {
  const r = route(t.fromProvince, t.toProvince);
  const same = all.slice(0, i).filter((o) => o.fromProvince === t.fromProvince && o.toProvince === t.toProvince).length;
  return mul(r.length > 1 ? normal(unit(sub(r[r.length - 1], r[0]))) : { x: 0, y: 1 }, same * 14);
}

export function travellerItem(t: SceneTraveller, i: number, all: readonly SceneTraveller[], input: MapInput): Item {
  const viewer = input.scene.viewer;
  const at = add(along(route(t.fromProvince, t.toProvince), t.progress), travellerShift(t, i, all));
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

// ---------------------------------------------------------------- keyed elements

interface Item {
  key: string;
  cls: string;
  style: string;
  data: [string, string] | null;
  inner: string;
}

/**
 * Keeps one element per key, so a token that moves keeps its element and its CSS transition slides it. `leaveAfter`: how
 * long a token gone stays where it was before it is taken away (item 17+++: until the season's results land).
 */
export function reconcile(parent: SVGGElement, items: readonly Item[], known: Map<string, SVGGElement>, leaveAfter = 0): void {
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
      known.delete(k);
      if (leaveAfter > 0) window.setTimeout(() => el.remove(), leaveAfter);
      else el.remove();
    }
}
