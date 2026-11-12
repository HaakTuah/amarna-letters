/**
 * Only what the view can show is drawn (#666): a mark or piece of the map whose place lies outside the view and a margin
 * round it, is taken out of the drawing (`data-out`, map.css: `display: none`), so the browser
 * neither styles, lays out, layerizes nor paints it. At least half of every drawing's elements lie off a phone's screen
 * close up, and the browser's costs follow how much is drawn (`docs/rounds/2026-11-12-phone-frames-2.md`). What is taken
 * out stays in the page, as it was written: the layers are patched as before, and the elements come back as the view
 * comes near them, in the same frame as the view moves, before it is painted.
 *
 * A mark is placed by its own translate, a path of points by its bounds. Kept whole: whatever has neither (a path with arcs
 * or relative steps, a group of shapes), the drawings below the marks (the land, the season's ground, the realms' colours),
 * the season's arrows, scenes and selection (they play animations of their own), and a piece marching (it may cross the
 * view from outside it).
 */

/** A part of the board, in its own units, and the screen pixels a unit takes (`k`). */
export interface Area {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly k: number;
}

/**
 * The farthest a mark or piece reaches from its place, in screen pixels, by its first class: the most measured at any zoom
 * (seed 1, season 30, phone and desktop) and a third more. A name, a unit with its counters and any other mark take 200 (a
 * name 125 measured, longer under other name settings; a unit 150); a path's bounds hold all of it but its stroke.
 */
const ReachPx: Readonly<Record<string, number>> = {
  "works-at": 185,
  "court-at": 130,
  "band-mark": 105,
  traveller: 100,
  city: 50,
  memorial: 45,
  xmark: 30,
  "life-mark": 25,
};
const FarthestPx = 200;
const StrokePx = 20;
/**
 * The margin drawn round the view, in views on each side: a pan or a pinch moves inside it without a pass. A pass is made in
 * the frame the view moves, so the margin spreads what comes into view over fewer frames; it holds no hole off.
 */
const Margin = 0.1;
/** How deep a layer's groups with no translate of their own are looked into for marks (a layer, a drawing's groups). */
const Depth = 3;

/** A translate's place: `translate(x,y)` in an attribute, or `transform:translate(xpx,ypx)` in a style. */
const Place = /translate\(\s*(-?[\d.e]+)(?:px)?[\s,]+(-?[\d.e]+)/;
/**
 * A path in absolute moves, lines and curves only, whose numbers are all points: their bounds hold the path (a curve lies
 * within its control points). Any other path (arcs, relative steps) has no box read here and is kept whole.
 */
const Points = /^[MLQCZ\d\s.,e-]*$/;

interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

interface Spot extends Box {
  /** What its place was read from: its translate, or its path. */
  readonly src: string;
  /** Where it stood before, while it may still be sliding from there (a step of the timeline). */
  readonly was: Box | null;
}

export class InView {
  /** What is drawn: the view and its margin; null draws everything. */
  private drawn: Area | null = null;
  /** The screen pixels a unit took when the view last settled. */
  private settledK = Infinity;
  private readonly spots = new WeakMap<Element, Spot>();

  private readonly roots: () => readonly Element[];
  private readonly kept: ReadonlySet<Element>;

  /** `roots`: the drawings looked into; `kept`: layers left whole (their marks play animations of their own). */
  constructor(roots: () => readonly Element[], kept: ReadonlySet<Element>) {
    this.roots = roots;
    this.kept = kept;
  }

  /**
   * The view has moved to `view` (or is gliding across it): drawn again for it only when it has left what is drawn, or,
   * with `exact`, always (the view settled: a zoom in draws less).
   */
  look(view: Area, exact = false): void {
    const d = this.drawn;
    if (exact) this.settledK = view.k;
    if (!exact && d !== null && view.x0 >= d.x0 && view.y0 >= d.y0 && view.x1 <= d.x1 && view.y1 <= d.y1) return;
    const w = (view.x1 - view.x0) * Margin, h = (view.y1 - view.y0) * Margin;
    // The marks keep the size they settled at until the gesture settles (zoom.ts sizes them then): a pinch in mid-gesture
    // draws them larger in the board's units than the zoom it has reached would.
    this.drawn = { x0: view.x0 - w, y0: view.y0 - h, x1: view.x1 + w, y1: view.y1 + h, k: Math.min(view.k, this.settledK) };
    this.pass(this.roots());
  }

  /** Marks the elements under `roots` in or out of the drawing, for what is drawn now (after a layer is written). */
  pass(roots: readonly Element[]): void {
    if (this.drawn === null) return;
    const t = performance.now();
    const walk = (g: Element, depth: number): void => {
      for (let el = g.firstElementChild; el !== null; el = el.nextElementSibling) {
        if (this.kept.has(el)) continue;
        if (!this.mark(el) && depth < Depth && el.tagName === "g") walk(el, depth + 1);
      }
    };
    // Only within the drawings that follow the view: a layer elsewhere written is never looked into (nothing would bring
    // back what was left out of it as the view moves).
    const drawings = this.roots();
    for (const r of roots) if (!this.kept.has(r) && drawings.some((d) => d.contains(r))) walk(r, 0);
    performance.measure("map:inview", { start: t });
  }

  /** A piece has stopped where it stands (its slide has ended): left out if that is far off the view. */
  arrived(el: Element): void {
    const spot = this.spot(el);
    if (spot === null || this.drawn === null) return;
    if (spot.was !== null) this.spots.set(el, { ...spot, was: null });
    this.mark(el);
  }

  /** Marks one element in or out of the drawing by its own place; false when it has none. */
  private mark(el: Element): boolean {
    const d = this.drawn!;
    const spot = this.spot(el);
    if (spot === null) return false;
    const kind = el.tagName === "path" ? null : (el.getAttribute("class") ?? "").split(" ")[0];
    const reach = (kind === null ? StrokePx : ReachPx[kind] ?? FarthestPx) / d.k;
    const near = (b: Box): boolean => b.x1 >= d.x0 - reach && b.x0 <= d.x1 + reach && b.y1 >= d.y0 - reach && b.y0 <= d.y1 + reach;
    const out = !near(spot) && (spot.was === null || !near(spot.was)) && !el.classList.contains("marching");
    if (out !== el.hasAttribute("data-out")) el.toggleAttribute("data-out", out);
    return true;
  }

  /** Where an element stands by its own translate or path, or null if it has neither. */
  private spot(el: Element): Spot | null {
    const moved = el.getAttribute("transform") ?? el.getAttribute("style");
    const src = moved !== null && moved.includes("translate") ? moved : el.tagName === "path" && !el.hasAttribute("transform") ? el.getAttribute("d") : null;
    if (src === null) return null;
    const kept = this.spots.get(el);
    if (kept !== undefined && kept.src === src) return kept;
    const box = src === moved ? placed(src) : bounds(src);
    if (box === null) return null;
    const spot = { src, ...box, was: kept === undefined ? null : { x0: kept.x0, y0: kept.y0, x1: kept.x1, y1: kept.y1 } };
    this.spots.set(el, spot);
    return spot;
  }
}

/** A translate's place, as a box of no size. */
function placed(src: string): Box | null {
  const m = Place.exec(src);
  if (m === null) return null;
  const x = Number(m[1]), y = Number(m[2]);
  return { x0: x, y0: y, x1: x, y1: y };
}

/** The bounds of a path's points, or null for a path whose numbers are not all points. */
function bounds(d: string): Box | null {
  if (!Points.test(d)) return null;
  const n = d.match(/-?[\d.]+(?:e-?\d+)?/g);
  if (n === null || n.length < 2 || n.length % 2 !== 0) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n.length; i += 2) {
    const x = Number(n[i]), y = Number(n[i + 1]);
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}
