/**
 * Only what the view can show is drawn (#666): a mark or piece of the map placed by a translate, whose place lies outside
 * the view and a margin round it, is taken out of the drawing (`data-out`, map.css: `display: none`), so the browser
 * neither styles, lays out, layerizes nor paints it. At least half of every drawing's elements lie off a phone's screen
 * close up, and the browser's costs follow how much is drawn (`docs/rounds/2026-11-12-phone-frames-2.md`). What is taken
 * out stays in the page, as it was written: the layers are patched as before, and the elements come back as the view
 * comes near them, in the same frame as the view moves, before it is painted.
 *
 * Kept whole: whatever has no translate of its own (the land's shapes, the roads, the bands, a layer of paths), and a
 * piece marching (it may cross the view from outside it).
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
 * The farthest a mark or piece reaches from its place, in screen pixels: measured at every zoom, a unit with its counters
 * reaches 150 at most, a city's works in a row 140, a name 125 (longer under other name settings).
 */
const ReachPx = 200;
/**
 * The margin drawn round the view, in views on each side: a pan or a pinch moves inside it without a pass. A pass is made in
 * the frame the view moves, so the margin spreads what comes into view over fewer frames; it holds no hole off.
 */
const Margin = 0.1;
/** How deep a layer's groups with no translate of their own are looked into for marks (a layer, a drawing's groups). */
const Depth = 3;

/** A translate's place: `translate(x,y)` in an attribute, or `transform:translate(xpx,ypx)` in a style. */
const Place = /translate\(\s*(-?[\d.e]+)(?:px)?[\s,]+(-?[\d.e]+)/;

interface Spot {
  /** The translate it was read from. */
  readonly src: string;
  readonly x: number;
  readonly y: number;
  /** Where it stood before, while it may still be sliding from there (a step of the timeline). */
  readonly was: { readonly x: number; readonly y: number } | null;
}

export class InView {
  /** What is drawn: the view and its margin; null draws everything. */
  private drawn: Area | null = null;
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
    if (!exact && d !== null && d.k === view.k && view.x0 >= d.x0 && view.y0 >= d.y0 && view.x1 <= d.x1 && view.y1 <= d.y1) return;
    const w = (view.x1 - view.x0) * Margin, h = (view.y1 - view.y0) * Margin;
    this.drawn = { x0: view.x0 - w, y0: view.y0 - h, x1: view.x1 + w, y1: view.y1 + h, k: view.k };
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
    for (const r of roots) if (!this.kept.has(r)) walk(r, 0);
    performance.measure("map:inview", { start: t });
  }

  /** A piece has stopped where it stands (its slide has ended): left out if that is far off the view. */
  arrived(el: Element): void {
    const spot = this.spot(el);
    if (spot === null || this.drawn === null) return;
    if (spot.was !== null) this.spots.set(el, { ...spot, was: null });
    this.mark(el);
  }

  /** Marks one element in or out of the drawing by its own translate; false when it has none. */
  private mark(el: Element): boolean {
    const d = this.drawn!;
    const spot = this.spot(el);
    if (spot === null) return false;
    const reach = ReachPx / d.k;
    const near = (p: { readonly x: number; readonly y: number }): boolean => p.x >= d.x0 - reach && p.x <= d.x1 + reach && p.y >= d.y0 - reach && p.y <= d.y1 + reach;
    const out = !near(spot) && (spot.was === null || !near(spot.was)) && !el.classList.contains("marching");
    if (out !== el.hasAttribute("data-out")) el.toggleAttribute("data-out", out);
    return true;
  }

  /** Where an element stands by its own translate, or null if it has none. */
  private spot(el: Element): Spot | null {
    const src = el.getAttribute("transform") ?? el.getAttribute("style");
    if (src === null) return null;
    const kept = this.spots.get(el);
    if (kept !== undefined && kept.src === src) return kept;
    const m = Place.exec(src);
    if (m === null) return null;
    const spot = { src, x: Number(m[1]), y: Number(m[2]), was: kept === undefined ? null : { x: kept.x, y: kept.y } };
    this.spots.set(el, spot);
    return spot;
  }
}
