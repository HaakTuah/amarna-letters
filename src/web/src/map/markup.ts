/**
 * The parts of the map that never change during a game, written once as plain SVG markup. Colours come from CSS variables,
 * so light and dark modes need no re-render.
 */
import { AllPowers, Crossings, Rough, WorldMap } from "@amarna/engine";
import {
  CyprusPath,
  Gulf,
  Deserts,
  F,
  Fields,
  GeoLabels,
  LandPath,
  Mediterranean,
  Ranges,
  Rivers,
  SeaPath,
  Shapes,
  WasteShapes,
  add,
  city,
  labelAt,
  mul,
  peaks,
  smoothClosed,
  sub,
  unit,
} from "./art.ts";
import { Burst, Capital, Chariot, Eye, Fetter, Ingot, Moon, Pupil, Ship, Tablet, TabletMarks, emblem, glyphId } from "./glyphs.ts";

const Map_ = WorldMap.default;

/** Fertility tier from yield: up to 25, 30-35, 40-45, 50 and more. */
export const tier = (y: number): number => (y <= 25 ? 1 : y <= 35 ? 2 : y <= 45 ? 3 : 4);

const escape = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");

function buildDefs(): string {
  let sb = "<defs>";
  // Fertility: the richer the land, the closer its furrows.
  for (const [t, gap] of [
    [1, 13],
    [2, 9],
    [3, 6.5],
    [4, 4.6],
  ])
    sb +=
      `<pattern id="fert${t}" patternUnits="userSpaceOnUse" width="${F(gap)}" height="${F(gap)}" patternTransform="rotate(-28)">` +
      `<line x1="0" y1="0" x2="${F(gap)}" y2="0" class="furrow"/></pattern>`;
  sb += `<pattern id="stipple" patternUnits="userSpaceOnUse" width="9" height="9"><circle cx="2" cy="2" r=".8" class="sand"/><circle cx="6.5" cy="6" r=".65" class="sand"/></pattern>`;
  sb += `<pattern id="waves" patternUnits="userSpaceOnUse" width="26" height="12"><path d="M0,6q6.5,-4 13,0t13,0" class="wave"/></pattern>`;
  // Fog: a veil of fine hatching, so the colours of ownership still show through it.
  sb += `<pattern id="fog" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><rect width="5" height="2.6" class="veil"/></pattern>`;
  sb += `<pattern id="fogsea" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><rect width="5" height="2.6" class="veil-sea"/></pattern>`;
  sb += `<clipPath id="landclip"><path d="${LandPath} ${CyprusPath}" clip-rule="evenodd"/></clipPath>`;
  sb += `<clipPath id="seaclip"><path d="${smoothClosed(Mediterranean)} ${smoothClosed(Gulf)} ${CyprusPath}" clip-rule="evenodd"/></clipPath>`;
  for (const [id, d] of Shapes) sb += `<clipPath id="cl-${id}"><path d="${d}"/></clipPath>`;
  for (const p of AllPowers) sb += `<symbol id="em-${glyphId(p)}" viewBox="-10 -10 20 20" overflow="visible"><path d="${emblem(p)}"/></symbol>`;
  sb += `<symbol id="g-army" viewBox="-12 -12 24 24" overflow="visible"><path d="${Chariot}"/></symbol>`;
  sb += `<symbol id="g-fleet" viewBox="-12 -12 24 24" overflow="visible"><path d="${Ship}"/></symbol>`;
  sb += `<symbol id="g-tablet" viewBox="-10 -10 20 20" overflow="visible"><path d="${Tablet}" class="tab-body"/><path d="${TabletMarks}" class="tab-marks"/></symbol>`;
  sb += `<symbol id="g-eye" viewBox="-10 -10 20 20" overflow="visible"><path d="${Eye}" class="eye-white"/><path d="${Pupil}" class="eye-pupil"/></symbol>`;
  sb += `<symbol id="g-ingot" viewBox="-10 -10 20 20" overflow="visible"><path d="${Ingot}"/></symbol>`;
  sb += `<symbol id="g-fetter" viewBox="-10 -10 20 20" overflow="visible"><path d="${Fetter}" fill-rule="evenodd"/></symbol>`;
  sb += `<symbol id="g-crown" viewBox="-10 -10 20 20" overflow="visible"><path d="${Capital}"/></symbol>`;
  sb += `<symbol id="g-burst" viewBox="-10 -10 20 20" overflow="visible"><path d="${Burst}"/></symbol>`;
  sb += `<symbol id="g-moon" viewBox="-10 -10 20 20" overflow="visible"><path d="${Moon}"/></symbol>`;
  // Arrowheads, one per power (and one for the draft), so each takes its arrow's colour.
  for (const name of [...AllPowers.map(glyphId), "ink"])
    sb +=
      `<marker id="ah-${name}" viewBox="0 0 10 10" refX="6.5" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">` +
      `<path d="M0,0.6L10,5L0,9.4L2.6,5Z" class="ah ah-${name}"/></marker>`;
  sb += `<marker id="ah-sup" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2"><circle cx="5" cy="5" r="4" class="ah-sup"/></marker>`;
  return sb + "</defs>";
}

function buildBase(): string {
  let sb = `<g class="base">`;
  sb += `<rect class="sea-bg" x="-300" y="-300" width="1600" height="1300"/>`;
  sb += `<rect class="sea-waves" x="-300" y="-300" width="1600" height="1300" fill="url(#waves)"/>`;
  // A second, paler coast line out at sea, as engraved maps draw shallows.
  sb += `<path class="shallows" d="${SeaPath} ${CyprusPath}"/>`;
  sb += `<path class="land" d="${LandPath} ${CyprusPath}" fill-rule="evenodd"/>`;
  sb += `<g clip-path="url(#landclip)">`;
  for (const d of Fields) sb += `<path class="fields" d="${d}"/>`;
  for (const p of Map_.provinces.filter((x) => !x.isSea)) {
    const d = Shapes.get(p.id);
    if (d !== undefined) sb += `<path d="${d}" fill="url(#fert${tier(p.yield)})" class="fert"/>`;
  }
  for (const d of Deserts) sb += `<path class="desert" d="${d}" fill="url(#stipple)"/>`;
  for (const d of WasteShapes) sb += `<path class="waste" d="${d}"/>`;
  sb += "</g>";
  for (const r of Rivers) {
    sb += `<path class="river-casing" d="${r.path}" style="stroke-width:${F(r.width + 2.6)}"/>`;
    sb += `<path class="river" d="${r.path}" style="stroke-width:${F(r.width)}"/>`;
  }
  for (const range of Ranges) sb += `<path class="peaks" d="${peaks(range)}"/>`;
  // Rough provinces: a few peaks beside the city.
  for (const id of Rough) {
    const c = city(id);
    sb += `<path class="peaks rough" d="${peaks(
      [
        { x: c.x - 30, y: c.y + 4 },
        { x: c.x - 18, y: c.y - 4 },
      ],
      11,
      5.5,
    )}"/>`;
  }
  sb += `<path class="coast" d="${SeaPath} ${CyprusPath}"/>`;
  // Province borders, thin, under everything that changes.
  for (const [id, d] of Shapes) sb += Map_.get(id).isSea ? `<path class="sea-line" d="${d}"/>` : `<path class="cell-line" d="${d}"/>`;
  // Crossings: a pass or a ford on the connection, drawn across it (a desert road is drawn by the desert itself).
  for (const c of Crossings.filter((x) => x.kind !== "Desert")) {
    const a = city(c.a);
    const b = city(c.b);
    const mid = mul(add(a, b), 0.5);
    const u = unit(sub(b, a));
    const deg = (Math.atan2(u.y, u.x) * 180) / Math.PI;
    const pass = c.kind === "Mountain";
    sb +=
      `<g class="crossing ${pass ? "pass" : "ford"}" transform="translate(${F(mid.x)},${F(mid.y)}) rotate(${F(deg)})"><title>${c.name} (${pass ? "a mountain pass" : "a river crossing"}: a unit standing its ground on either side is stronger against an attack over it)</title>` +
      (pass ? `<path d="M-4,-7Q0,0 -4,7 M4,-7Q0,0 4,7"/>` : `<path d="M-3,-7V7 M3,-7V7"/>`) +
      "</g>";
  }
  for (const g of GeoLabels) sb += `<text class="geo" transform="translate(${F(g.x)},${F(g.y)}) rotate(${F(g.angle)})">${g.text}</text>`;
  // The open seas by name; each coast's waters by its coast's name, small (the zone's tooltip gives its whole name).
  for (const p of Map_.provinces.filter((x) => x.isSea)) {
    const coasts = Map_.coastsOf(p.id);
    const waters = coasts.length > 0 && p.name.endsWith(" waters");
    sb += `<text class="sea-name${waters ? " waters" : ""}" x="${p.x}" y="${p.y + 4}">${waters ? "waters" : p.name}</text>`;
  }
  sb += `<text class="geo faint" x="300" y="12">BLACK SEA</text>`;
  // A cartouche and a compass, in the empty south.
  sb += `<g class="cartouche" transform="translate(612,690)"><path d="M-74,-15H74L82,0L74,15H-74L-82,0Z"/><text y="4.5">THE LANDS OF THE GREAT KINGS</text></g>`;
  sb += `<g class="compass" transform="translate(655,620)"><circle r="15"/><path d="M0,-21L4,0L0,21L-4,0Z"/><path d="M-21,0L0,-3L21,0L0,3Z" class="cw"/><text y="-24">N</text></g>`;
  return sb + "</g>";
}

function buildLabels(): string {
  let sb = `<g class="labels">`;
  // Each name hangs from its city and grows about it when the map is small on screen (see zoom.ts, --lab).
  for (const p of Map_.provinces.filter((x) => !x.isSea)) {
    const s = labelAt(p.id);
    sb += `<g transform="translate(${p.x},${p.y})"><text class="plabel${p.capital ? " cap" : ""}" x="${F(s.dx)}" y="${F(s.dy)}" text-anchor="${s.anchor}">${escape(p.name)}</text></g>`;
  }
  return sb + "</g>";
}

/** Shared definitions: patterns, clip paths, the icons and emblems, and the arrowheads. */
export const Defs = buildDefs();
/** Sea, land, fields, deserts, rivers, mountains, coasts, crossings and the names of the land. */
export const Base = buildBase();
/** Province names, above the borders and below the pieces. */
export const Labels = buildLabels();
