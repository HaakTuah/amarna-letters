/**
 * The parts of the map that never change during a game, written once as plain SVG markup. Colours come from CSS variables,
 * so light and dark modes need no re-render.
 */
import ReliefImage from "./relief.jpg";
import { ReliefFrame } from "./relief-frame.ts";
import { FixedPowers, StartWalls, WorldMap, isGreatKing } from "@amarna/engine";
import {
  CoastPath,
  Deserts,
  F,
  Fields,
  GeoLabels,
  IslandPath,
  LakePath,
  MarshPath,
  LandPath,
  MainlandPath,
  PuntDoor,
  Rivers,
  SeaPath,
  Shapes,
  WasteShapes,
  city,
  labelAt,
  landClipOf,
  ll,
} from "./art.ts";
import { Marks, markGlyph, markText } from "./crossings.ts";
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
  sb += `<pattern id="reeds" patternUnits="userSpaceOnUse" width="7" height="6"><path d="M1,4.5h3M2.5,4.5v-2.2M5,1.5h1.6" class="reed"/></pattern>`;
  sb += `<pattern id="waves" patternUnits="userSpaceOnUse" width="26" height="12"><path d="M0,6q6.5,-4 13,0t13,0" class="wave"/></pattern>`;
  // Fog: a veil of fine hatching, so the colours of ownership still show through it.
  sb += `<pattern id="fog" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><rect width="5" height="2.6" class="veil"/></pattern>`;
  sb += `<pattern id="fogsea" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><rect width="5" height="2.6" class="veil-sea"/></pattern>`;
  // Each path of the land carries data-geo, so the finer set close up (fine-geo.ts) can take its place.
  sb += `<clipPath id="landclip"><path data-geo="land" d="${LandPath}" clip-rule="evenodd"/></clipPath>`;
  sb += `<clipPath id="mainclip"><path data-geo="mainland" d="${MainlandPath}" clip-rule="evenodd"/></clipPath>`;
  sb += `<clipPath id="isleclip"><path data-geo="island" d="${IslandPath}" clip-rule="evenodd"/></clipPath>`;
  sb += `<clipPath id="seaclip"><path data-geo="sea" d="${SeaPath}" clip-rule="evenodd"/></clipPath>`;
  for (const [id, d] of Shapes) sb += `<clipPath id="cl-${id}"><path d="${d}"/></clipPath>`;
  for (const p of FixedPowers) sb += `<symbol id="em-${glyphId(p)}" viewBox="-10 -10 20 20" overflow="visible"><path d="${emblem(p)}"/></symbol>`;
  // The powers risen in play (item 13+) share one emblem, a city's tower.
  sb += `<symbol id="em-risen" viewBox="-10 -10 20 20" overflow="visible"><path d="${emblem("risen")}"/></symbol>`;
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
  for (const name of [...FixedPowers.map(glyphId), "risen", "ink"])
    sb +=
      `<marker id="ah-${name}" viewBox="0 0 10 10" refX="6.5" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">` +
      `<path d="M0,0.6L10,5L0,9.4L2.6,5Z" class="ah ah-${name}"/></marker>`;
  sb += `<marker id="ah-sup" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2"><circle cx="5" cy="5" r="4" class="ah-sup"/></marker>`;
  return sb + "</defs>";
}

const Cartouche = ll(23.6, 45.3);
const Compass = ll(25.6, 48.6);

function buildBase(): string {
  let sb = `<g class="base">`;
  sb += `<rect class="sea-bg" x="-300" y="-300" width="1600" height="1700"/>`;
  sb += `<rect class="sea-waves" x="-300" y="-300" width="1600" height="1700" fill="url(#waves)"/>`;
  // A second, paler coast line out at sea, as engraved maps draw shallows.
  sb += `<path class="shallows" data-geo="coast" d="${CoastPath}"/>`;
  sb += `<path class="land" data-geo="land" d="${LandPath}" fill-rule="evenodd"/>`;
  sb += `<g clip-path="url(#landclip)">`;
  for (const d of Fields) sb += `<path class="fields" d="${d}"/>`;
  for (const p of Map_.provinces.filter((x) => !x.isSea)) {
    const d = Shapes.get(p.id);
    if (d !== undefined) sb += `<path d="${d}" fill="url(#fert${tier(p.yield)})" class="fert" clip-path="${landClipOf(p.id)}"/>`;
  }
  for (const d of Deserts) sb += `<path class="desert" d="${d}" fill="url(#stipple)"/>`;
  for (const d of WasteShapes) sb += `<path class="waste" d="${d}"/>`;
  sb += "</g>";
  sb += `<path class="marsh" d="${MarshPath}" fill="url(#reeds)"/>`;
  sb += `<path class="lake" data-geo="lakes" d="${LakePath}"/>`;
  for (const r of Rivers) {
    sb += `<path class="river-casing" data-river="${r.id}" d="${r.path}" style="stroke-width:${F(r.width + 2.6)}"/>`;
    sb += `<path class="river" data-river="${r.id}" d="${r.path}" style="stroke-width:${F(r.width)}"/>`;
  }
  sb += `<path class="coast" data-geo="coast" d="${CoastPath}"/>`;
  // Province borders, thin, under everything that changes.
  for (const clip of ["url(#seaclip)", "url(#mainclip)", "url(#isleclip)"]) {
    sb += `<g clip-path="${clip}">`;
    for (const [id, d] of Shapes) if (landClipOf(id) === clip) sb += Map_.get(id).isSea ? `<path class="sea-line" d="${d}"/>` : `<path class="cell-line" d="${d}"/>`;
    sb += "</g>";
  }
  for (const g of GeoLabels) sb += `<text class="geo" transform="translate(${F(g.x)},${F(g.y)}) rotate(${F(g.angle)})">${g.text}</text>`;
  // The open seas by name; each coast's waters by its coast's name, small (the zone's tooltip gives its whole name).
  for (const p of Map_.provinces.filter((x) => x.isSea)) {
    const coasts = Map_.coastsOf(p.id);
    const waters = coasts.length > 0 && p.name.endsWith(" waters");
    const at = city(p.id);
    sb += `<text class="sea-name${waters ? " waters" : ""}" x="${F(at.x)}" y="${F(at.y + 4)}">${waters ? "waters" : p.name}</text>`;
  }
  // Punt, beyond the Red Sea: where newcomers come from, never a market.
  sb += `<text class="geo" transform="translate(${F(PuntDoor.x)},${F(PuntDoor.y)}) rotate(${F(PuntDoor.angle)})">TO PUNT →</text>`;
  // A cartouche and a compass, in the empty south.
  sb += `<g class="cartouche" transform="translate(${F(Cartouche.x)},${F(Cartouche.y)})"><path d="M-74,-15H74L82,0L74,15H-74L-82,0Z"/><text y="4.5">THE LANDS OF THE GREAT KINGS</text></g>`;
  sb += `<g class="compass" transform="translate(${F(Compass.x)},${F(Compass.y)})"><circle r="15"/><path d="M0,-21L4,0L0,21L-4,0Z"/><path d="M-21,0L0,-3L21,0L0,3Z" class="cw"/><text y="-24">N</text></g>`;
  return sb + "</g>";
}

/**
 * The order in which names are placed ("Map on small screens", item 11c+): a Great King's capital first, then the other
 * capitals and the fortresses, then the rest, each by its yield. The renderer shows each name only where it touches no
 * name placed before it and no badge, counter, ship or envoy, measured as drawn.
 */
export const NameOrder: readonly string[] = (() => {
  const named = Map_.provinces.filter((x) => !x.isSea);
  const weight = (p: (typeof named)[number]): number =>
    (p.capital && p.home !== null && isGreatKing(p.home) ? 2000 : p.capital || (StartWalls.get(p.id) ?? 0) >= 2 ? 1000 : 0) + p.yield;
  return [...named].sort((a, b) => weight(b) - weight(a) || (a.id < b.id ? -1 : 1)).map((p) => p.id);
})();

/** The radius of a city's outermost ring, in its own units (cities, in svg-renderer.ts): a name stands off it. */
export const ringOf = (capital: boolean, walls: number): number => (walls > 0 ? (capital ? 12 : 8.5) + 2 * walls + 1.2 : capital ? 13.2 : 8.2);

function buildLabels(): string {
  let sb = `<g class="labels">`;
  // Each name hangs from its city, off its outermost ring on its side, and grows about it when the map is small on
  // screen (see zoom.ts, --lab and --cs). Its side: below the city, or beside it where a river, the coast or a neighbour
  // is in the way (labelAt).
  for (const p of Map_.provinces.filter((x) => !x.isSea)) {
    const s = labelAt(p.id);
    const at = city(p.id);
    // Beside the city (start or end) the name stands level with it; otherwise along its offset.
    const side = s.anchor !== "middle" && Math.abs(s.dy) <= 4;
    const l = Math.hypot(s.dx, s.dy) || 1;
    const ux = side ? Math.sign(s.dx) : s.dx / l;
    const uy = side ? 0 : s.dy / l;
    // A small gap beyond the ring, in the name's own units; below, the name hangs from its top; above, from its foot.
    const x = ux * 2.5;
    const y = uy * 2.5 + (uy > 0.6 ? 9.5 : uy < -0.6 ? -1 : 4);
    sb += `<g class="lab" data-label="${p.id}" transform="translate(${F(at.x)},${F(at.y)})" style="--ring:${F(ringOf(p.capital, 0))};--ux:${F(ux)};--uy:${F(uy)}"><g class="lring"><text class="plabel${p.capital ? " cap" : ""}" x="${F(x)}" y="${F(y)}" text-anchor="${s.anchor}">${escape(p.name)}</text></g></g>`;
  }
  return sb + "</g>";
}

/**
 * The marks of the crossings and of rough ground (crossings.ts), above the provinces so a tap reaches them: each turned
 * along its road, and kept at a readable size whatever the zoom (like the cities, --cs).
 */
function buildMarks(): string {
  let sb = `<g class="xmarks">`;
  for (const m of Marks)
    sb += `<g class="xmark k-${m.kind}" data-mark="${m.key}" transform="translate(${F(m.at.x)},${F(m.at.y)})"><title>${escape(markText(m).title)}</title><g class="csym"><circle class="xm-bg" r="7.5"/><circle class="tap-hit" r="13"/><g transform="rotate(${F(m.angle)})">${markGlyph(m.kind)}</g></g></g>`;
  return sb + "</g>";
}

/**
 * The relief (item 11c++): real elevation, shaded from the north-west (scripts/map-relief.mjs), over the land and the
 * colours of who holds it, in soft light, so the ranges stand where they are, in place of the hand-placed chevrons.
 */
export const Relief = `<g class="relief" clip-path="url(#landclip)"><image href="${ReliefImage}" x="${ReliefFrame.x}" y="${ReliefFrame.y}" width="${ReliefFrame.width}" height="${ReliefFrame.height}" preserveAspectRatio="none"/></g>`;

/** Shared definitions: patterns, clip paths, the icons and emblems, and the arrowheads. */
export const Defs = buildDefs();
/** Sea, land, fields, deserts, rivers, mountains, coasts, crossings and the names of the land. */
export const Base = buildBase();
/** The crossings' and rough ground's marks. */
export const MarksMarkup = buildMarks();
/** Province names, above the borders and below the pieces. */
export const Labels = buildLabels();
