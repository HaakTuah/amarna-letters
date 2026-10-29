/**
 * The parts of the map that never change during a game, written once as plain SVG markup. Colours come from CSS variables,
 * so light and dark modes need no re-render.
 */
import { AllPowers, Crossings, Rough, StartWalls, WorldMap, isGreatKing } from "@amarna/engine";
import {
  CoastPath,
  Deserts,
  F,
  Fields,
  GeoLabels,
  IslandPath,
  LakePath,
  LandPath,
  MainlandPath,
  PuntDoor,
  Ranges,
  Rivers,
  SeaPath,
  Shapes,
  WasteShapes,
  add,
  city,
  labelAt,
  landClipOf,
  ll,
  mul,
  peaks,
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
  sb += `<clipPath id="landclip"><path d="${LandPath}" clip-rule="evenodd"/></clipPath>`;
  sb += `<clipPath id="mainclip"><path d="${MainlandPath}" clip-rule="evenodd"/></clipPath>`;
  sb += `<clipPath id="isleclip"><path d="${IslandPath}" clip-rule="evenodd"/></clipPath>`;
  sb += `<clipPath id="seaclip"><path d="${SeaPath}" clip-rule="evenodd"/></clipPath>`;
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

const Cartouche = ll(23.6, 45.3);
const Compass = ll(25.6, 48.6);

function buildBase(): string {
  let sb = `<g class="base">`;
  sb += `<rect class="sea-bg" x="-300" y="-300" width="1600" height="1700"/>`;
  sb += `<rect class="sea-waves" x="-300" y="-300" width="1600" height="1700" fill="url(#waves)"/>`;
  // A second, paler coast line out at sea, as engraved maps draw shallows.
  sb += `<path class="shallows" d="${CoastPath}"/>`;
  sb += `<path class="land" d="${LandPath}" fill-rule="evenodd"/>`;
  sb += `<g clip-path="url(#landclip)">`;
  for (const d of Fields) sb += `<path class="fields" d="${d}"/>`;
  for (const p of Map_.provinces.filter((x) => !x.isSea)) {
    const d = Shapes.get(p.id);
    if (d !== undefined) sb += `<path d="${d}" fill="url(#fert${tier(p.yield)})" class="fert" clip-path="${landClipOf(p.id)}"/>`;
  }
  for (const d of Deserts) sb += `<path class="desert" d="${d}" fill="url(#stipple)"/>`;
  for (const d of WasteShapes) sb += `<path class="waste" d="${d}"/>`;
  sb += "</g>";
  sb += `<path class="lake" d="${LakePath}"/>`;
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
  sb += `<path class="coast" d="${CoastPath}"/>`;
  // Province borders, thin, under everything that changes.
  for (const clip of ["url(#seaclip)", "url(#mainclip)", "url(#isleclip)"]) {
    sb += `<g clip-path="${clip}">`;
    for (const [id, d] of Shapes) if (landClipOf(id) === clip) sb += Map_.get(id).isSea ? `<path class="sea-line" d="${d}"/>` : `<path class="cell-line" d="${d}"/>`;
    sb += "</g>";
  }
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

/** The zoom steps at which names give way (screen pixels per map unit): see {@link NameLevels} and zoom.ts (`nz1`...). */
export const NameSteps: readonly number[] = [0, 0.3, 0.42, 0.6, 0.85, 1.2, 1.7, 2.4, 3.4, 4.8, 6.8];

/**
 * The zoom step from which each province's name is shown ("Map on small screens"): names give way by importance, so at
 * each step a name is written only where it touches no more important one. A Great King's capital comes first, then the
 * other capitals and the fortresses, then the rest, each by its yield. On the true map the Levant's cities stand a few
 * kilometres apart, so their names come one by one as the coast is zoomed into, and the capitals' first.
 */
export const NameLevels: ReadonlyMap<string, number> = (() => {
  const named = Map_.provinces.filter((x) => !x.isSea);
  const weight = (p: (typeof named)[number]): number =>
    (p.capital && p.home !== null && isGreatKing(p.home) ? 2000 : p.capital || (StartWalls.get(p.id) ?? 0) >= 2 ? 1000 : 0) + p.yield;
  const order = [...named].sort((a, b) => weight(b) - weight(a) || (a.id < b.id ? -1 : 1));
  // A name's box on screen at a scale: the font is 10 to 19 pixels (zoom.ts, --lab), and its place below or beside its city scales with it.
  const box = (p: (typeof named)[number], s: number): [number, number, number, number] => {
    const font = Math.min(19, Math.max(10, 7.5 + 6 * s)) * (p.capital ? 13.5 / 12.5 : 1);
    const k = font / (p.capital ? 13.5 : 12.5);
    const spot = labelAt(p.id);
    const w = p.name.length * font * (p.capital ? 0.68 : 0.58);
    const at = city(p.id);
    const x = at.x * s + spot.dx * k - (spot.anchor === "end" ? w : spot.anchor === "middle" ? w / 2 : 0);
    const y = at.y * s + spot.dy * k - font * 0.8;
    return [x, y, x + w, y + font];
  };
  const shown = order.map(() => [] as boolean[]);
  NameSteps.forEach((step, k) => {
    const s = Math.max(step, 0.2);
    const placed: [number, number, number, number][] = [];
    order.forEach((p, i) => {
      const b = box(p, s);
      const free = placed.every((o) => b[2] <= o[0] || o[2] <= b[0] || b[3] <= o[1] || o[3] <= b[1]);
      shown[i][k] = free || k === NameSteps.length - 1;
      if (shown[i][k]) placed.push(b);
    });
  });
  const levels = new Map<string, number>();
  order.forEach((p, i) => {
    let level = NameSteps.length - 1;
    while (level > 0 && shown[i][level - 1]) level--;
    levels.set(p.id, level);
  });
  return levels;
})();

function buildLabels(): string {
  let sb = `<g class="labels">`;
  // Each name hangs from its city and grows about it when the map is small on screen (see zoom.ts, --lab).
  for (const p of Map_.provinces.filter((x) => !x.isSea)) {
    const s = labelAt(p.id);
    const at = city(p.id);
    sb += `<g transform="translate(${F(at.x)},${F(at.y)})"><text class="plabel${p.capital ? " cap" : ""} z${NameLevels.get(p.id)}" x="${F(s.dx)}" y="${F(s.dy)}" text-anchor="${s.anchor}">${escape(p.name)}</text></g>`;
  }
  return sb + "</g>";
}

/** Shared definitions: patterns, clip paths, the icons and emblems, and the arrowheads. */
export const Defs = buildDefs();
/** Sea, land, fields, deserts, rivers, mountains, coasts, crossings and the names of the land. */
export const Base = buildBase();
/** Province names, above the borders and below the pieces. */
export const Labels = buildLabels();
