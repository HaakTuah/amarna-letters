/**
 * Item 17+++, part E: the pieces travel their roads with weight as the season plays out. A unit that marched goes along the
 * way its arrow draws, through every province on it, and a march thrown back goes out and comes home; a traveller goes on
 * along his road from where he was drawn. Nothing teleports. While it moves, each piece is drawn as what it is: an army as a
 * column as long as its men are many, with dust behind it; a fleet heeling under sail with its wake; an envoy or gold with
 * the small caravan they travel in. Presentation only, and only what the seat's scene already holds moves: a march it saw,
 * a traveller it knows of.
 *
 * The slide is a Web Animation of the token's `transform` (on the compositor, as the plain slide was), with the token's own
 * transition off while it runs (`.marching`, playback.css); the trail is put in the token for the march and taken away after.
 */
import type { UnitKind } from "@amarna/engine";
import { F, add, between, lengthOf, route, sub, unitWay, wayThrough, type Pt } from "./art.ts";
import type { SceneMove, SceneTraveller } from "./scene.ts";
import { BounceReach } from "./ways.ts";

/** A piece's way this season, from where it stood to where it stands (out and back for a march thrown back). */
export type Road = Pt[];

/**
 * The way a unit took from `from` to `to`: its move's way along the roads, as its arrow draws it. A unit that stayed where a
 * march of its own was thrown back from goes out along that march's way and back. Null: it did not move (or not by a march
 * the seat saw, and it stayed).
 */
export function unitRoad(kind: UnitKind, power: string, from: string, to: string, moves: readonly SceneMove[]): Road | null {
  if (from !== to) return wayThrough(unitWay(kind, from, to)).pts;
  const thrown = moves.find((m) => m.style === "Bounce" && m.power === power && m.kind === kind && m.from === from);
  if (thrown === undefined) return null;
  const out = between(wayThrough(unitWay(kind, from, thrown.to)).pts, 0, BounceReach);
  return [...out, ...[...out].reverse().slice(1)];
}

/** A traveller's way on from where he was drawn (`was`, a fraction of his road) to where he is now, set off his road by `shift`. */
export function travellerRoad(t: SceneTraveller, was: number, shift: Pt): Road | null {
  if (was >= t.progress) return null;
  return between(route(t.fromProvince, t.toProvince), was, t.progress).map((p) => add(p, shift));
}

/** The token's places along a road, at even speed (each point's offset is its share of the road's length). */
function places(road: Road): Keyframe[] {
  const total = lengthOf(road);
  let at = 0;
  return road.map((p, i) => {
    if (i > 0) at += Math.hypot(p.x - road[i - 1].x, p.y - road[i - 1].y);
    return { transform: `translate(${F(p.x)}px,${F(p.y)}px)`, offset: total > 0 ? Math.min(1, at / total) : i / Math.max(1, road.length - 1) };
  });
}

/** The trail's heading at each of the road's points (degrees, without a jump of a full turn), so it stays behind the piece. */
function headings(road: Road, offsets: readonly Keyframe[]): Keyframe[] {
  const out: Keyframe[] = [];
  let last: number | null = null;
  road.forEach((_p, i) => {
    const a = road[Math.min(i + 1, road.length - 1)];
    const b = road[Math.max(Math.min(i + 1, road.length - 1) - 1, 0)];
    const d = sub(a, b);
    let deg: number = d.x === 0 && d.y === 0 ? (last ?? 0) : (Math.atan2(d.y, d.x) * 180) / Math.PI;
    if (last !== null) deg = last + ((((deg - last) % 360) + 540) % 360) - 180;
    last = deg;
    out.push({ transform: `rotate(${F(deg)}deg)`, offset: offsets[i].offset });
  });
  return out;
}

/**
 * A column's figures for its men: by their square root, so a band of a hundred and a host of ten thousand both read (one
 * figure and fourteen; a full levy of 5,000, ten), and the most a column has (first guesses, presentation only).
 */
const figuresFor = (men: number): number => Math.max(1, Math.min(MostFigures, Math.round(Math.sqrt(men) / 7)));
const MostFigures = 14;

/**
 * What a piece draws behind it while it moves, heading along +x: an army's column (`figuresFor`), with dust at its tail; a fleet's wake; a caravan's pack donkeys. `men`: what the seat sees of them (a full levy if it counts none); `realm`: the colour its men are drawn in (`glyphId`).
 */
export function trailMarkup(what: "Army" | "Fleet" | "Caravan", men: number, realm = "none"): string {
  if (what === "Fleet") return `<g class="trail wake"><path d="M-12,-4L-34,-12M-12,4L-34,12M-13,0L-26,0"/></g>`;
  if (what === "Caravan") return `<g class="trail caravan"><use href="#fig-caravan" x="-31" y="-7" width="16" height="16"/></g>`;
  const n = figuresFor(men > 0 ? men : 5000);
  let sb = `<g class="trail column">`;
  for (let i = 0; i < n; i++) sb += `<circle class="file f-${realm}" cx="${F(-15 - i * 5)}" cy="${i % 2 === 0 ? -1.8 : 1.8}" r="2.3"/>`;
  const tail = -15 - n * 5;
  for (let i = 0; i < 3; i++) sb += `<circle class="dust" cx="${F(tail - 3 - i * 3)}" cy="${F((i - 1) * 2.4)}" r="${F(2.6 + i * 0.6)}" style="animation-delay:${i * 160}ms"/>`;
  return sb + "</g>";
}

/**
 * Plays a piece along its road from `at` ms (negative: already partway) for `ms`. The token stands at the road's start until
 * then (`fill: backwards`), as heavy things move: slow to start and to stop. The trail turns with the road and goes when it
 * ends (a caravan only faces the way it goes). Returns the animations, so a season shown anew can stop them.
 */
export function playRoad(el: SVGGElement, road: Road, at: number, ms: number, trail: string): Animation[] {
  if (road.length < 2 || ms <= 0) return [];
  const timing: KeyframeAnimationOptions = { delay: at, duration: ms, easing: "cubic-bezier(.45,.05,.55,.95)", fill: "backwards" };
  const keys = places(road);
  // Drawn over the pieces standing still, so its trail is not hidden under its neighbours.
  el.parentNode?.appendChild(el);
  const slide = el.animate(keys, timing);
  el.classList.add("marching");
  const holder = el.querySelector(".sym > g") ?? el.querySelector(".sym");
  let turn: Animation | null = null;
  if (holder !== null && trail !== "") {
    holder.insertAdjacentHTML("afterbegin", trail);
    const t = holder.firstElementChild;
    // A caravan faces the way it goes, never upside down: it turns about, not round.
    if (t instanceof SVGGElement && t.classList.contains("caravan")) {
      if (road[road.length - 1].x < road[0].x) t.setAttribute("transform", "scale(-1,1)");
    } else if (t instanceof SVGGElement) turn = t.animate(headings(road, keys), timing);
  }
  const done = (): void => {
    el.classList.remove("marching");
    holder?.querySelector(":scope > .trail")?.remove();
  };
  slide.addEventListener("finish", done);
  slide.addEventListener("cancel", done);
  return turn === null ? [slide] : [slide, turn];
}
