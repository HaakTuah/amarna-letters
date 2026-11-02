/**
 * What moves on the board, as markup: the roads travellers are on and the person followed, the moves of the season with
 * their battles, the bands and pirates abroad, and the selection with the draft ways of the orders being written.
 */

import { WorldMap, crossingBetween, dateLabel, type Power, type UnitKind } from "@amarna/engine";
import { powerName, provinceName } from "../ui/format.ts";
import { F, Shapes, add, landClipOf, along, city, len, mul, normal, roadPath, route, sub, unit, unitSpot, unitWay, wayThrough, type Pt } from "./art.ts";
import { markGlyph, markKind } from "./crossings.ts";
import { glyphId } from "./glyphs.ts";
import { ringOf } from "./markup.ts";
import type { MapInput } from "./renderer.ts";
import { captureLine, traceOf, unitKindName, type MapScene } from "./scene.ts";
import { title } from "./text.ts";

const Map_ = WorldMap.default;

const points = (pts: readonly Pt[]): string => pts.map((p) => `${F(p.x)},${F(p.y)}`).join(" ");

export function roads(input: MapInput): string {
  const s = input.scene;
  let sb = `<g class="roads">`;
  for (const t of s.travellers)
    sb += `<polyline class="road r-${glyphId(t.owner)}${t.believed ? " believed" : ""}${t.characterId !== null && t.characterId === input.followId ? " followed" : ""}" points="${points(route(t.fromProvince, t.toProvince))}"/>`;
  const path = input.followPath;
  if (path !== null && path.length > 0) {
    const pts = points(traceOf(path));
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
 * A unit's way from one province to another (item 11c+: the owner, "the arrows for units show only the province it starts
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

export function moves(s: MapScene): string {
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
export function outlaws(s: MapScene): string {
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

export function selection(input: MapInput): string {
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

