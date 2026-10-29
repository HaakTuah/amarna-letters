/**
 * The armies and fleets drawn after the period's own relics, each culture in its own idiom (build order item 19, "The look,
 * in time"): Egypt's companies after the wooden soldiers of Mesehti's tomb at Asyut; the Anatolian kingdoms' chariots
 * after the Hittite chariots of the Egyptian reliefs, three men in the car under the warrior gods' pointed caps of
 * Yazılıkaya; Mitanni's, Assyria's and the Hurrian north's after their cylinder seals, a galloping horse and an archer at
 * full draw; Babylonia's behind the spade of Marduk on its pole, as the Kassite boundary stones carve it; the Canaanite
 * cities' infantry with the sickle sword and the round shield; the steppe's and the desert's archers; Alashiya and the
 * Aegean with the figure-of-eight shield of their figurines and frescoes. Ships after Tutankhamun's model boats (the
 * papyriform hull and its wide sail), the Thera flotilla fresco (the long hull and its stern cabin) and the Syrian
 * merchantmen of Kenamun's tomb (a deep hull between upright posts).
 *
 * Presentation may name a power ("Different data, same rules"): the style is chosen by power and never read by a rule.
 * Each glyph sits in a box centred on 0,0, about 24 units across, drawn in one fill over its power's colour.
 */
import { FixedPowers, WorldMap, risenOf, type Power } from "@amarna/engine";
import { city, len, sub } from "./art.ts";

export type ArmyStyle = "egypt" | "anatolia" | "hurrian" | "kassite" | "canaan" | "nomad" | "aegean";
export type FleetStyle = "egypt" | "aegean" | "levant";

const Armies: Partial<Record<Power, ArmyStyle>> = {
  Egypt: "egypt",
  Hatti: "anatolia",
  Arzawa: "anatolia",
  Kaska: "anatolia",
  Lukka: "anatolia",
  Seha: "anatolia",
  Mira: "anatolia",
  Isuwa: "anatolia",
  Azzi: "anatolia",
  Mitanni: "hurrian",
  Assyria: "hurrian",
  Arrapha: "hurrian",
  Carchemish: "hurrian",
  Alalakh: "hurrian",
  Aleppo: "hurrian",
  Niya: "hurrian",
  Nuhashshe: "hurrian",
  Tunip: "hurrian",
  Terqa: "hurrian",
  Babylonia: "kassite",
  Suhu: "kassite",
  Elam: "kassite",
  Shasu: "nomad",
  Suteans: "nomad",
  Libya: "nomad",
  Alashiya: "aegean",
};
const Fleets: Partial<Record<Power, FleetStyle>> = { Egypt: "egypt", Alashiya: "aegean", Arzawa: "aegean", Lukka: "aegean", Seha: "aegean", Mira: "aegean" };

const Map_ = WorldMap.default;
/** A risen power (item 13+) takes the style of the fixed power whose capital is nearest its own: the land's own idiom. */
function nearestFixed(capital: string): Power {
  const at = city(capital);
  let best: Power = "Egypt";
  let d = Infinity;
  for (const p of FixedPowers) {
    const x = len(sub(city(Map_.capital(p).id), at));
    if (x < d) [best, d] = [p, x];
  }
  return best;
}
const base = (p: Power): Power => {
  const r = risenOf(p);
  return r === null ? p : nearestFixed(r.capital);
};
export const armyStyle = (p: Power): ArmyStyle => Armies[base(p)] ?? "canaan";
export const fleetStyle = (p: Power): FleetStyle => Fleets[base(p)] ?? "levant";

// ---------------------------------------------------------------- the pieces, as path data

const n = (v: number): string => (Math.round(v * 100) / 100).toString();
const circle = (x: number, y: number, r: number): string => `M${n(x - r)},${n(y)}a${n(r)},${n(r)} 0 1,0 ${n(2 * r)},0a${n(r)},${n(r)} 0 1,0 ${n(-2 * r)},0Z`;
const ring = (x: number, y: number, r: number, w: number): string =>
  circle(x, y, r) + `M${n(x - r + w)},${n(y)}a${n(r - w)},${n(r - w)} 0 1,1 ${n(2 * (r - w))},0a${n(r - w)},${n(r - w)} 0 1,1 ${n(-2 * (r - w))},0Z`;
/** A wheel of six spokes, as the period's chariots ran on: drawn even-odd, so its rim is a ring (marked by a leading space). */
function wheel(x: number, y: number, r: number): string {
  let d = ring(x, y, r, r * 0.26) + circle(x, y, r * 0.22);
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3;
    const dx = Math.cos(a) * r * 0.8, dy = Math.sin(a) * r * 0.8;
    const wx = -Math.sin(a) * 0.35, wy = Math.cos(a) * 0.35;
    d += `M${n(x - dx - wx)},${n(y - dy - wy)}L${n(x + dx - wx)},${n(y + dy - wy)}L${n(x + dx + wx)},${n(y + dy + wy)}L${n(x - dx + wx)},${n(y - dy + wy)}Z`;
  }
  return `|${d}|`;
}
/** A man on foot, striding right, at a height (about 15 units at 1): head, body, kilt and legs. */
function man(x: number, y: number, k = 1): string {
  const s = (v: number): string => n(v * k);
  return (
    circle(x + 0.3 * k, y - 6.6 * k, 1.65 * k) +
    `M${n(x - 1.3 * k)},${n(y - 4.7 * k)}h${s(2.8)}l${s(0.3)},${s(4)}h${s(-3.4)}Z` +
    `M${n(x - 2.1 * k)},${n(y - 0.9 * k)}h${s(4.2)}l${s(0.7)},${s(2.9)}h${s(-5.6)}Z` +
    `M${n(x - 1.4 * k)},${n(y + 1.9 * k)}l${s(-1.9)},${s(5.6)}h${s(1.4)}l${s(1.9)},${s(-5.6)}Z` +
    `M${n(x + 0.3 * k)},${n(y + 1.9 * k)}l${s(1.9)},${s(5.6)}h${s(1.4)}l${s(-1.6)},${s(-5.6)}Z`
  );
}
/** A spear held upright in front of a man. */
const spear = (x: number, top: number, bottom: number): string => `M${n(x - 0.45)},${n(top + 1.8)}l0.45,-1.8l0.45,1.8V${n(bottom)}h-0.9Z`;
/** Mesehti's shield: tall, round-topped, held before the body. */
const tallShield = (x: number, y: number): string => `M${n(x)},${n(y + 1.6)}v-5a1.45,1.45 0 0 1 2.9,0v5Z`;

// One soldier of Mesehti's companies: spear, tall shield; three march abreast in file.
const mesehti = (x: number): string => man(x, -1, 0.92) + spear(x + 2.6, -12, 4.2) + tallShield(x + 1, -3.4);

/** A horse at the gallop, facing right, its body centred at x, y. */
function horse(x: number, y: number, gallop: boolean): string {
  const p = (dx: number, dy: number): string => `${n(x + dx)},${n(y + dy)}`;
  let d = `M${p(-4.6, 0)}a4.6,2.3 0 1,0 9.2,0a4.6,2.3 0 1,0 -9.2,0Z`;
  d += `M${p(2.8, -1.4)}L${p(5.4, -5.8)}L${p(8.1, -5.2)}L${p(7.8, -3.9)}L${p(6.3, -4.1)}L${p(4.9, -0.2)}Z`;
  d += `M${p(5.2, -6.2)}L${p(4.4, -7.6)}L${p(5.9, -6.6)}Z`; // the ear
  d += `M${p(-4.2, -0.8)}L${p(-6.6, 0.7)}L${p(-6.2, 1.5)}L${p(-3.8, 0.2)}Z`; // the tail
  if (gallop) {
    d += `M${p(2.6, 1.2)}L${p(6.4, 3.6)}L${p(6, 4.4)}L${p(1.8, 2.2)}Z`;
    d += `M${p(-2.4, 1.2)}L${p(-6, 3.8)}L${p(-5.4, 4.5)}L${p(-1.4, 2.2)}Z`;
  } else {
    d += `M${p(2, 1.4)}L${p(3.2, 6.2)}L${p(2.2, 6.2)}L${p(1, 1.8)}Z M${p(3.4, 1.2)}L${p(5, 5.8)}L${p(4, 6)}L${p(2.6, 1.6)}Z`;
    d += `M${p(-2.4, 1.4)}L${p(-3.4, 6.2)}L${p(-2.4, 6.2)}L${p(-1.4, 1.8)}Z M${p(-3.6, 1)}L${p(-5, 5.8)}L${p(-4, 6)}L${p(-2.6, 1.4)}Z`;
  }
  return d;
}

const ArmyPaths: Record<ArmyStyle, string> = {
  // Three spearmen in file, after the Asyut models.
  egypt: mesehti(-6.6) + mesehti(-0.6) + mesehti(5.4),
  // A Hittite chariot: three men under pointed caps in a deep car, the wheel at its middle, the horse at a walk.
  anatolia:
    horse(4.4, 1.6, false) +
    `M-11.6,-3.4h7.6v4.6h-7.6Z M-4.4,-0.6L0.6,0.4L0.6,1.4L-4.4,0.6Z` +
    wheel(-7.8, 3.6, 3.7) +
    [-10.4, -7.8, -5.2].map((x) => circle(x, -5.1, 1.2) + `M${n(x - 1.05)},${n(-5.9)}l1.05,-4.8l1.05,4.8Z`).join("") +
    spear(-4.6, -12.4, -4),
  // A Hurrian chariot after the seals: a galloping horse, a light car and an archer at full draw.
  hurrian:
    horse(4.2, 0.6, true) +
    `M-10.6,-3.6h5.2v4.2h-5.2Z M-5.6,-0.6L0.4,-0.4L0.4,0.6L-5.6,0.6Z` +
    wheel(-7.6, 3.4, 3.6) +
    circle(-8.4, -8.3, 1.4) +
    `M-9.6,-6.9h2.6l0.4,3.3h-3.4Z M-7.4,-6.6L-2.9,-7.4L-2.9,-6.4L-7.4,-5.8Z` +
    `M-3.2,-12.2Q0.8,-7.4 -3.2,-2.6L-2.6,-2.6Q0.1,-7.4 -2.6,-12.2Z`,
  // The spade of Marduk on its pole, carried before a spearman with his round shield.
  kassite:
    `M-6.4,-12.4L-3.4,-7.6L-6.4,-6.3L-9.4,-7.6Z M-6.9,-6.6h1V8h-1Z` +
    man(-3.2, -0.6, 0.86) +
    man(4.4, -0.6, 0.92) +
    spear(7.4, -12, 4.6) +
    circle(5.6, -2.9, 2.7),
  // Canaanite foot: the sickle sword raised and the round shield, two men in file.
  canaan:
    man(-4.4, -0.2, 0.92) +
    circle(-2.6, -2.6, 2.6) +
    `M-2.6,-6.2L-0.6,-9.6Q1.8,-12.2 3.4,-10.4L2.6,-9.8Q1.4,-11 0.2,-9.2L-1.8,-5.8Z` +
    man(4.8, -0.2, 0.92) +
    circle(6.6, -2.6, 2.6) +
    spear(8.8, -12.2, 4.4),
  // The steppe's and the desert's archers: a man at full draw, another behind with his bow over his shoulder.
  nomad:
    man(-5, 0, 0.88) +
    `M-2.6,-11Q1,-6.8 -2.2,-2.6L-1.6,-2.6Q1.8,-6.8 -2,-11Z M-4.8,-6.4L-1.6,-6.9L-1.6,-6L-4.8,-5.5Z` +
    man(3, -0.4, 1) +
    `M3.8,-6.2L8.6,-6.6L8.6,-5.6L3.8,-5.2Z M8.4,-11.6Q12.4,-6.4 8.4,-1.2L7.8,-1.2Q11.4,-6.4 7.8,-11.6Z M8.2,-11.4L8.6,-1.4L8.1,-1.4L7.7,-11.4Z`,
  // The Aegean's figure-of-eight shield and the long spear, two warriors behind their shields.
  aegean:
    man(-4.6, 0, 0.9) +
    circle(-3, -5.6, 2.9) +
    circle(-3, 0.4, 3.3) +
    spear(-0.4, -12.4, 5) +
    man(4.4, 0, 0.9) +
    circle(6, -5.6, 2.9) +
    circle(6, 0.4, 3.3) +
    spear(8.6, -12.4, 5),
};

const FleetPaths: Record<FleetStyle, string> = {
  // Tutankhamun's model boat: the papyriform hull curving up at both ends, a cabin, the wide sail, the steering oar.
  egypt:
    `M-11.6,-0.8C-9.6,2.2 -6,4.6 0,4.6C6,4.6 9.6,2.2 11.6,-2.8L12.2,-5.8L11,-5.6L10.2,-1.6C8,0.6 5,1.6 0,1.6C-5,1.6 -8.6,0.8 -10.6,-2.6L-11.4,-5.2L-12.4,-4.4Z` +
    `M-0.6,1.6V-11.2H0.6V1.6Z M-9.2,-10.4H9.2L8.2,-3.4H-8.2Z M-6.6,-1.6h4v3.2h-4Z M-10.4,-0.6L-12.4,5.2L-11.4,5.4L-9.4,0Z`,
  // The Thera ship: a long low hull, the stern rising, the prow running out ahead, the cabin at the stern, oars below.
  aegean:
    `M-11.4,-0.2C-8,2.8 -3,3.4 4,3.2L12.4,2L12.4,3.2L4,4.6C-3,4.8 -9.6,3.6 -12.4,0.4L-12.8,-4.4L-11.6,-4.4Z` +
    `M-10.2,-4.2h4v3.4h-4Z M-0.6,1.2V-11H0.6V1.2Z M-7.4,-10.6H7.4L6.6,-3.6H-6.6Z` +
    [-6, -3, 0, 3, 6].map((x) => `M${n(x)},4.2l-1.2,3.2h0.8l1.2,-3.2Z`).join(""),
  // A Syrian merchantman: the deep round hull between upright stem and stern posts, a tall sail, the lookout at the masthead.
  levant:
    `M-10,-1.4H10C9.2,3.4 5,5.6 0,5.6C-5,5.6 -9.2,3.4 -10,-1.4Z M-10.8,-6.2H-9.4V-1H-10.8Z M9.4,-6.2H10.8V-1H9.4Z` +
    `M-0.6,-1.4V-12H0.6V-1.4Z M-6.8,-10.8H6.8L6,-2.6H-6Z M-1.4,-12.6h2.8v1.6h-2.8Z`,
};

/**
 * The other figures: an envoy on the road with his sealed tablet held before him, after the foreign delegations in Meryre
 * II's tomb at Amarna; a band's campfire, flames over crossed logs; a besieger's tent; and a clash of arms, a spear across
 * a sickle sword.
 */
const Others: Record<string, string> = {
  envoy: man(-2.4, 0.6, 1.05) + `M-1.2,-4.8L3.2,-3.6L3,-2.6L-1.4,-3.8Z M2.6,-7.6h6v7.2h-6Z`,
  fire:
    `M-9,7.2L8.6,2.4L9.2,4.2L-8.4,9Z M-9.2,3L8.4,8.8L7.8,10.4L-9.8,4.8Z` +
    `M-1,4.6C-6.6,1.6 -5.4,-4.4 -1.6,-10.6C-1.2,-6.6 2.2,-5.4 1.6,-1.6C3.2,-3 3.6,-5 3.2,-6.8C6.6,-2.8 5.6,3 1,4.6Z`,
  tent: `M-9.4,7L0,-8.6L9.4,7Z M0,-8.6L-1,-11.6L1,-11.6Z`,
  clash:
    `M-9.6,-8.4L-8.4,-9.6L9.6,8.4L8.4,9.6Z M-10.4,-10.4L-6.4,-9.4L-9.4,-6.4Z` +
    `M8.8,-9.6L10.2,-8.2L-3,4.6L-4.4,3.2Z M-4.4,3.2Q-9.6,6.4 -8.4,10.4Q-7.4,6.8 -3,4.6Z`,
};

/**
 * A figure's pieces as elements: each piece its own path, so overlapping pieces (a shield over a body) never cancel each
 * other out whichever way they were drawn; a wheel (between bars) as one even-odd path, so its rim is a ring.
 */
export function figureMarkup(d: string): string {
  return d
    .split("|")
    .map((part, i) => (i % 2 === 1 ? `<path fill-rule="evenodd" d="${part}"/>` : part.split(/(?=M)/u).filter((x) => x !== "").map((x) => `<path d="${x}"/>`).join("")))
    .join("");
}

/** The symbols, for the map's <defs>: `fig-army-<style>` and `fig-fleet-<style>`. */
export function figureSymbols(): string {
  let sb = "";
  for (const [k, d] of Object.entries(ArmyPaths)) sb += `<symbol id="fig-army-${k}" viewBox="-12.5 -12.5 25 25" overflow="visible">${figureMarkup(d)}</symbol>`;
  for (const [k, d] of Object.entries(FleetPaths)) sb += `<symbol id="fig-fleet-${k}" viewBox="-12.5 -12.5 25 25" overflow="visible">${figureMarkup(d)}</symbol>`;
  for (const [k, d] of Object.entries(Others)) sb += `<symbol id="fig-${k}" viewBox="-12.5 -12.5 25 25" overflow="visible">${figureMarkup(d)}</symbol>`;
  return sb;
}

/** The symbol a power's army or fleet is drawn with. */
export const figureOf = (p: Power, kind: "Army" | "Fleet"): string => (kind === "Army" ? `#fig-army-${armyStyle(p)}` : `#fig-fleet-${fleetStyle(p)}`);
