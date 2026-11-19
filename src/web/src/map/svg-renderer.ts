/**
 * The SVG renderer: the static geography written once as markup; each layer above it drawn again only when what it shows
 * changes; units and travellers kept as the same elements from season to season, so stepping the timeline slides them
 * along their moves; pinch, pan and wheel zoom move one layer on the GPU (zoom.ts) without drawing anything.
 */
import { type Power } from "@amarna/engine";
import { powerName } from "../ui/format.ts";
import { CoastPath, F, Height, IslandPath, LakePath, LandPath, MainlandPath, Rivers, SeaPath, Width, type Pt } from "./art.ts";
import { roadsLayer, worksAtCities } from "./built.ts";
import { OmenSigns, lifeLayer, mediumOf, memoryLayer } from "./life.ts";
import { momentMarkup } from "./moments.ts";
import { patchParts, patchSteps, type Parts } from "./morph.ts";
import { Base, Defs, Labels, MarksMarkup, Relief, ringOf } from "./markup.ts";
import { placeNamesNow, type NameBoxes } from "./names.ts";
import type { MapHandlers, MapInput, MapRenderer } from "./renderer.ts";
import { reseason, seasonLayer } from "./seasons.ts";
import { type MapScene } from "./scene.ts";
import { attach, detach, focus, getView, panBy, reset, setView, viewArea, zoomBy } from "./zoom.ts";
import { InView } from "./in-view.ts";
import { Land, bands, cities, fog, retint, tints, tintsKey } from "./land-layers.ts";
import { peopleAtCourts, reconcile, travellerItem, travellerShift, unitItems } from "./tokens.ts";
import { playRoad, trailMarkup, travellerRoad, unitRoad } from "./marching.ts";
import { glyphId } from "./glyphs.ts";
import { moves, outlaws, roads, selection } from "./ways.ts";

/** Each river's path as the whole board draws it. */
const RiverPaths: ReadonlyMap<string, string> = new Map(Rivers.map((r) => [r.id, r.path]));

// ---------------------------------------------------------------- the renderer

/**
 * The city a tap means, where the tap circles of several overlap (the Levant's towns on the whole board): the one whose
 * seal is nearest, not the one drawn last, so every small province can be clicked at every zoom (the owner, 2 November 2026:
 * "Some of the provinces in the Levant are so small you can't even click on them").
 */
function nearestCity(e: MouseEvent): Element | null {
  let best: Element | null = (e.target as Element).closest(".city");
  let far = Infinity;
  for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
    if (!el.classList.contains("tap-hit")) continue;
    const city = el.closest(".city");
    if (city === null) continue;
    const r = el.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY);
    if (d < far) [best, far] = [city, d];
  }
  return best;
}

/** What a layer's key stands as while it is written in slices: none a scene could have, so a write dropped half way is made again. */
const Pending = Symbol("pending");

/** A step of the season's drawing (`runSteps`): it may give the step that goes on from it, for the next frame's budget. */
type Step = () => Step | void;

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
  /** What is drawn follows the view (#666): the marks and pieces far off it are left out (in-view.ts). */
  private inView: InView | null = null;
  /** The layers written since what is drawn was last marked for the view. */
  private readonly wrote = new Set<Element>();
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
    const prov = t?.closest(".city") ? nearestCity(e as MouseEvent) : t?.closest("[data-province]");
    if (prov !== null && prov !== undefined) this.handlers?.onProvince(prov.getAttribute("data-province")!);
    else this.handlers?.onBlank();
  };

  /**
   * A glide or slide has ended: the markers and names are placed again where everything has stopped. Its real end, not a
   * timer guessed from its length: a transition starts only at the next frame drawn, late on a busy phone, and taking the
   * glide's class away does not stop one already running.
   */
  private readonly onMoved = (e: TransitionEvent): void => {
    if (e.propertyName !== "transform") return;
    const t = e.target as Element;
    // While a season's results are still to land, the names wait for them (part G: placed once a season, not once for the
    // marching and again for the results); a zoom's glide places them at once.
    if (t.matches(".mapzoom") || (t.matches(".unit, .traveller") && !this.landPending())) this.placeNames();
    // A piece's slide has ended: it is left out if it stands far off the view. Not when a slide was cut short by another
    // (a season stepped again mid-slide), which goes on from where the piece stood.
    if (t.matches(".unit, .traveller") && !t.getAnimations().some((a) => a instanceof CSSTransition && a.transitionProperty === "transform")) this.inView?.arrived(t);
  };

  mount(view: HTMLElement, handlers: MapHandlers): void {
    this.view = view;
    this.handlers = handlers;
    const zoom = document.createElement("div");
    zoom.className = "mapzoom";
    // Stacked drawings, each its own compositing layer: the land below (heavy to paint, and painted only when another season
    // is shown), the season's ground over it (part D: painted while its change moves, without the realms), who holds what,
    // the relief, then the marks and the pieces above (light), a drawing for each of their layers (#666: a change records
    // again only the drawing it is in; the marks in one drawing and the pieces in another, the least change recorded some
    // 2,300 elements again, 7 to 9 ms a frame on the phone profile). The upper ones let taps through where they have nothing.
    const sheet = (kind: string, inner: string): string =>
      `<svg class="map map-${kind}" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" ${kind === "lower" ? `role="img"` : `aria-hidden="true"`}>${inner}</svg>`;
    const empty = (name: string): string => `<g data-layer="${name}"></g>`;
    const marks = [empty("works"), empty("memory"), empty("fog"), empty("bands"), MarksMarkup, Labels, empty("cities")];
    const upper = [empty("roads"), empty("moves"), empty("outlaws"), empty("worksat"), empty("life"), `<g class="units" data-layer="units"></g>`, `<g class="people">${empty("courts")}${empty("travellers")}</g>`, empty("scenes"), empty("selection")];
    zoom.innerHTML =
      sheet("lower", Defs + Base) +
      sheet("ground", empty("season")) +
      sheet("realms", empty("tints")) +
      sheet("relief", Relief) +
      marks.map((m) => sheet("marks", m)).join("") +
      upper.map((u) => sheet("upper", u)).join("");
    view.prepend(zoom);
    for (const g of zoom.querySelectorAll<SVGGElement>("g[data-layer]")) this.layers.set(g.dataset.layer!, g);
    for (const g of zoom.querySelectorAll<SVGGElement>("g[data-label]")) this.labels.set(g.dataset.label!, g);
    // The marks and the pieces follow the view; the season's arrows, its scenes and the selection play animations of their own
    // (drawn again from their start if they were left out and came back), and are few.
    const kept = new Set(["moves", "scenes", "selection"].map((n) => this.layers.get(n)!));
    const drawings = [...zoom.querySelectorAll(".map-marks, .map-upper")];
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const inView = (this.inView = new InView(() => drawings, kept, () => !motion.matches));
    zoom.addEventListener("click", this.onClick);
    zoom.addEventListener("transitionend", this.onMoved);
    zoom.addEventListener("transitioncancel", this.onMoved);
    attach(
      view,
      (scale: number) => {
        this.scale = scale;
        this.closeUp();
        if (this.scene !== null) {
          this.drawUnits(this.scene);
          // Written whole in this frame, as it was before the slices: the names are placed for it next.
          for (let step = this.drawWorks(this.scene); step !== undefined; ) step = step();
        }
        // For the view as it settled, and what was just written for it, before the names are measured.
        this.wrote.clear();
        const area = viewArea(view);
        if (area !== null) inView.look(area, true);
        // Now, and again once the zoom's glide has ended (onMoved).
        this.placeNames();
      },
      // In the frame the view moves, before it is painted: nothing comes into view undrawn.
      (area: Parameters<InView["look"]>[0], exact: boolean) => inView.look(area, exact),
    );
  }

  /**
   * A layer drawn again when its key changes. With `update`, a layer already drawn is written in place by it instead (part G:
   * the tints and the season's washes), which gives whether it wrote anything, or is a generator that goes on in slices and
   * gives it when it ends. A layer is written in slices (`Step`, #666): the key is taken as drawn when the last is written,
   * so a render that drops the steps still waiting writes the layer over, where it stood.
   */
  private layer(name: string, key: unknown, draw: () => string, update?: (g: SVGGElement) => boolean | Generator<void, boolean>, after?: () => void): Step | void {
    if (this.drawn.get(name) === key) return;
    const layer = this.layers.get(name)!;
    const t = performance.now();
    const done = (wrote: boolean): void => {
      this.drawn.set(name, key);
      if (wrote) {
        this.changed = true;
        this.wrote.add(layer);
      }
      after?.();
    };
    // Written in place only once the layer has been drawn whole (a first draw dropped half way is drawn again).
    if (update !== undefined && this.written.has(name)) {
      const r = update(layer);
      if (typeof r === "boolean") {
        done(r);
        performance.measure(`map:${name}`, { start: t });
        return;
      }
      this.drawn.set(name, Pending);
      return this.slices(name, r, done);
    }
    // Drawn anew, but written only when the markup differs from what stands (item 17a: a write means a style recalculation
    // and a repaint of the layer, which a phone pays 40 ms and more for; most seasons the cities, the tints and the bands
    // come out the same).
    const html = draw();
    if (this.written.get(name) === html) {
      done(false);
      performance.measure(`map:${name}`, { start: t });
      return;
    }
    const finish = (): void => {
      this.written.set(name, html);
      done(true);
    };
    // Patched, so only what changed is restyled and repainted (part G); the season's arrows are written whole, since each
    // plays its drawing anew (map.css: .mv .shaft).
    if (name === "moves") {
      layer.innerHTML = html;
      finish();
      performance.measure(`map:${name}`, { start: t });
      return;
    }
    // What stands is no longer what was written: a render that drops this write and asks for that markup again writes it.
    this.written.delete(name);
    this.drawn.set(name, Pending);
    return this.slices(name, patchSteps(layer, html), finish, layer, t);
  }

  /**
   * A step in slices (#666): each stops at the end of a slice, for the next frame's budget, and returns the rest. A layer
   * written whole in one step ran 8 to 16 ms on the phone profile, and the browser's own work on it, 30 ms and more, came
   * in the same frame. `layer`: written to in each slice, so what it made is looked at for the view (`in-view.ts`) in the
   * frame it was made.
   */
  private slices(name: string, work: Generator<void, boolean | void>, done: (wrote: boolean) => void, layer?: SVGGElement, since = performance.now()): Step | void {
    // The first slice is timed from when its step began (what drew its markup counts), each later one from its own start.
    let began: number | null = since;
    // A layer written again (a render that dropped this one, the zoom writing the works whole) takes over: this one goes no further.
    const mine = (this.sliced.get(name) ?? 0) + 1;
    this.sliced.set(name, mine);
    const go: Step = () => {
      if (this.sliced.get(name) !== mine) return;
      const t = began ?? performance.now();
      began = null;
      const r = work.next();
      performance.measure(`map:${name}`, { start: t });
      if (layer !== undefined) this.wrote.add(layer);
      if (r.done !== true) {
        this.open.set(name, go);
        return go;
      }
      this.open.delete(name);
      done(r.value === true);
    };
    return go();
  }

  /** How many writes in slices each layer has begun: the last is the one that goes on. */
  private readonly sliced = new Map<string, number>();
  /** The writes in slices begun and not ended, by layer: what goes on from each. */
  private readonly open = new Map<string, Step>();

  /** The markup each layer was last written with. */
  private readonly written = new Map<string, string>();

  /** Each name's box as last measured, and the view it was measured in (`placeNamesNow`). */
  private readonly nameBoxes: NameBoxes = new WeakMap();

  /** Whether a layer, the units or the people were written since the names were last placed: placing them costs a layout. */
  private changed = false;

  /**
   * What is built at the cities (item 19): shown only close up (lod2, zoom.ts), so built only then, and again when the zoom
   * comes close; at the other zooms the layer stays empty and costs a season's redraw nothing.
   */
  private drawWorks(s: MapScene): Step | void {
    const close = this.view?.classList.contains("lod2") ?? false;
    const key = close ? s : null;
    if (this.drawn.get("worksat") === key) return;
    const layer = this.layers.get("worksat")!;
    this.drawn.set("worksat", Pending);
    // In parts, a city each: only the cities whose works changed are written (part G), and the tooltips in place (#666).
    return this.slices(
      "worksat",
      patchParts(layer, this.worksParts, close ? worksAtCities(s) : []),
      (wrote) => {
        this.drawn.set("worksat", key);
        if (wrote) this.changed = true;
      },
      layer,
    );
  }
  private readonly worksParts: Parts = { markup: [], nodes: [], tips: [] };

  /** The realms' bands, in parts, a land province each (#666): only the bands that changed are parsed. */
  private drawBands(s: MapScene): Step | void {
    if (this.drawn.get("bands") === s) return;
    this.drawn.set("bands", Pending);
    const layer = this.layers.get("bands")!;
    const groups = bands(s);
    if (layer.children.length !== groups.length) {
      layer.innerHTML = groups.map((b) => `<g class="bands" clip-path="${b.clip}"></g>`).join("");
      this.bandParts = groups.map(() => ({ markup: [], nodes: [], tips: [] }));
    }
    const work = function* (this: SvgMapRenderer): Generator<void, boolean> {
      let wrote = false;
      for (let i = 0; i < groups.length; i++) {
        const parts = groups[i].parts.map((markup) => ({ markup, tips: [] }));
        if (yield* patchParts(layer.children[i], this.bandParts[i], parts)) wrote = true;
      }
      return wrote;
    }.call(this);
    return this.slices("bands", work, (wrote) => {
      this.drawn.set("bands", s);
      if (wrote) this.changed = true;
    }, layer);
  }
  private bandParts: Parts[] = [];

  /** The units, laid out for the current zoom: drawn again only when the scene or a province's gathering changes. */
  private drawUnits(s: MapScene): void {
    const items = unitItems(s.units, s.viewer, this.scale, s.walls);
    const key = items.map((i) => i.key + i.inner.length).join("|");
    if (this.drawn.get("units") === s && this.drawn.get("unitsKey") === key) return;
    this.drawn.set("units", s);
    this.drawn.set("unitsKey", key);
    this.changed = true;
    this.wrote.add(this.layers.get("units")!);
    const stood = new Map([...this.units].map(([k, el]) => [k, el.getAttribute("data-province")] as const));
    // A unit gone (destroyed, or out of the viewer's sight) stays until the season's results land (item 17+++).
    const wait = this.landWait(s);
    reconcile(this.layers.get("units")!, items, this.units, (el) => (wait > 0 ? this.later(`leave${++this.leaving}`, () => el.remove(), wait) : el.remove()));
    // Part E: each unit that marched goes along its road, drawn as what it is.
    const plan = this.marching(s);
    if (plan === null) return;
    for (const u of s.units) {
      const from = stood.get(u.key);
      const el = this.units.get(u.key);
      if (from === undefined || from === null || el === undefined || u.ghost || plan.played.has(u.key)) continue;
      const road = unitRoad(u.kind, u.power, from, u.province, s.moves);
      if (road !== null) plan.played.add(u.key);
      if (road !== null) this.marchAnims.push(...playRoad(el, road, plan.start - performance.now(), plan.ms, trailMarkup(u.kind, u.men, glyphId(u.power))));
    }
  }

  /** The season's marching as it plays out (part E), for the pieces drawn while it is due; null when nothing marches. */
  private marching(s: MapScene): { start: number; ms: number; played: Set<string> } | null {
    const p = this.marchPlan;
    return p !== null && p.index === s.index && p.viewer === s.viewer && p.start + p.ms > performance.now() ? p : null;
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
   * them. The names are placed after the last step. The budget is small (#666): a frame that writes the map pays some 30 ms
   * of the browser's own work after the steps on the phone profile (style, layout, layerization, paint), so a step past
   * a few milliseconds ends its frame (at 8 ms, 4.8 to 5% of frames ran over 50 ms on the phone at Fast; at 4 ms, 4.1%).
   */
  private steps: Step[] = [];
  private stepping = 0;
  private static readonly BudgetMs = 4;

  private renderNow(input: MapInput): void {
    const s = input.scene;
    // A layer being written in slices is written to its end before the steps still waiting are dropped, so none stays part
    // of one season and part of the last until the next frame, or, with the land held back, until its results land.
    for (const [name, rest] of [...this.open]) {
      for (let step: Step | void = rest; step !== undefined; ) step = step();
      this.open.delete(name);
    }
    this.scene = s;
    this.playSeason(s, input.playout ?? null);
    this.hold(input.held === true && this.timers.size > 0);
    const lower = this.view?.querySelector(".map-lower");
    lower?.setAttribute("aria-label", s.viewer !== null ? `Map of the Great Kings' lands as ${powerName(s.viewer)} sees it` : "Map of the Great Kings' lands (god view)");
    const seasonKey = `${s.frame.turn % 3}|${s.viewer}|${[...s.land].join(";")}`;
    // While a season plays out, its results (who holds what, the fog, the walls, the season's arrows) land on the map when
    // its cities fall, after the marches and battles (item 17+++); the pieces move at once.
    const land: Step[] = [
      () => this.layer("tints", tintsKey(s, input.mode ?? "realms"), () => tints(s, input.mode ?? "realms"), (g) => retint(g, s, input.mode ?? "realms")),
      () => this.layer("works", `${s.viewer}|${[...s.built].join(";")}|${[...(s.builtKnown ?? [])].join(";")}`, () => roadsLayer(s)),
      () => {
        const m = s.memory;
        // Redrawn when anything a stele stands by changes: its battles, its city's walls, a siege camp round it.
        return this.layer("memory", `${s.viewer}|${[...m.wild].join()}|${[...m.memorials].map(([k, v]) => `${k}:${v.count}:${v.last}:${s.walls.get(k) ?? 0}:${s.sieges.some((x) => x.province === k) ? 1 : 0}`).join()}`, () => memoryLayer(s));
      },
      () => this.layer("fog", s, () => fog(s)),
      // Keyed by the scene, not the frame: who holds what and the armies seen are the viewer's own.
      () => this.drawBands(s),
      () =>
        this.layer("cities", s, () => cities(s), undefined, () => {
          // Each name stands off its city's outermost ring, which grows with the walls the viewer knows.
          for (const p of Land) {
            const g = this.labels.get(p.id);
            const ring = F(ringOf(p.capital, s.walls.get(p.id) ?? 0));
            if (g !== undefined && g.style.getPropertyValue("--ring") !== ring) g.style.setProperty("--ring", ring);
          }
        }),
      () => this.layer("moves", s, () => moves(s)),
      () => this.layer("outlaws", s, () => outlaws(s)),
    ];
    const wait = this.landWait(s);
    if (wait > 0)
      this.later("land", () => {
        this.steps.push(...land, () => {
          if (this.changed) this.placeNames();
        });
        this.stepSoon();
      }, wait);
    else this.cancelLater("land");
    this.steps = [
      () =>
        this.layer("season", seasonKey, () => seasonLayer(s), (g) => reseason(g, s), () => {
          // A river in spate is drawn on the board's course: close up, it takes the finer one the rivers have.
          if (this.fine && this.fineRivers !== null) this.swapGeography({}, this.fineRivers);
        }),
      ...(wait > 0 ? [] : land),
      () => this.layer("roads", `${s.index}|${s.viewer}|${input.followId}|${input.followPath?.length ?? -1}|${input.followPath?.[input.followPath.length - 1]?.index ?? -1}`, () => roads(input)),
      () => this.drawWorks(s),
      () => this.layer("life", s, () => lifeLayer(s)),
      () => this.margin(s),
      () => this.drawUnits(s),
      () => {
        const peopleKey = `${s.index}|${s.viewer}|${input.followId}`;
        if (this.drawn.get("people") !== s || this.drawn.get("peopleKey") !== peopleKey) {
          this.drawn.set("people", s);
          this.drawn.set("peopleKey", peopleKey);
          this.changed = true;
          this.wrote.add(this.layers.get("courts")!).add(this.layers.get("travellers")!);
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
          // Part E: each traveller known before goes on along his road; an envoy and gold with their caravan.
          const plan = this.marching(s);
          const was = this.travelWas;
          this.travelWas = new Map(s.travellers.map((t) => [t.key, `${t.fromProvince}|${t.toProvince}|${t.progress}`] as const));
          if (plan !== null)
            s.travellers.forEach((t, i) => {
              const [from, to, progress] = (was.get(t.key) ?? "").split("|");
              const el = this.travellers.get(t.key);
              if (from !== t.fromProvince || to !== t.toProvince || el === undefined || plan.played.has(t.key)) return;
              const road = travellerRoad(t, Number(progress), travellerShift(t, i, s.travellers));
              if (road === null) return;
              plan.played.add(t.key);
              this.marchAnims.push(...playRoad(el, road, plan.start - performance.now(), plan.ms, t.kind === "Spy" ? "" : trailMarkup("Caravan", 0)));
            });
        }
      },
      () => {
        const sel = selection(input);
        if (this.written.get("selection") !== sel) {
          this.layers.get("selection")!.innerHTML = sel;
          this.written.set("selection", sel);
        }
        // Names are placed once the pieces are drawn, when something was drawn anew (item 17a: placing them measures every
        // name and marker, a layout the phone pays dearly for), and again once the pieces have slid to their places (onMoved);
        // while the season's results are held back, once they land (part G).
        if (this.changed && !this.landPending()) this.placeNames();
      },
    ];
    this.stepSoon();
  }

  /**
   * The steps begin at the next frame, never in the task that asked for them (part G: the worker's message, React's redraw
   * and the season's first layer in one task came to 100 ms and more on a slow phone).
   */
  private stepSoon(): void {
    if (this.stepping === 0)
      this.stepping = requestAnimationFrame(() => {
        this.stepping = 0;
        this.runSteps();
      });
  }

  /** Runs the waiting steps within this frame's budget, and comes back next frame for the rest. */
  private runSteps(): void {
    const start = performance.now();
    while (this.steps.length > 0) {
      const rest = this.steps.shift()!();
      if (rest !== undefined) this.steps.unshift(rest);
      if (this.steps.length > 0 && performance.now() - start > SvgMapRenderer.BudgetMs) break;
    }
    // What was written is left out where it lies far off the view, in the frame it was written.
    if (this.wrote.size > 0) {
      this.inView?.pass([...this.wrote]);
      this.wrote.clear();
    }
    if (this.steps.length > 0) this.stepSoon();
  }

  /**
   * The season plays out (item 17+++): when the map steps on by one season and that season is playing, its moments play in
   * sequence (session/pacing.ts): the pieces slide together in the marching, each great moment's medallion shows in its
   * turn, the results land when the cities fall, and the closing line ends it. None when the reader asks for reduced
   * motion, when stepping back, or jumping: the season then shows as it ended.
   */
  private sceneFrom: { index: number; viewer: Power | null } | null = null;
  /**
   * The season's marching (part E): when it starts (`performance.now()`), how long it runs, and the pieces already sent on
   * their way (each once, however often the pieces are drawn again meanwhile); and the slides themselves.
   */
  private marchPlan: { index: number; viewer: Power | null; start: number; ms: number; played: Set<string> } | null = null;
  private marchAnims: Animation[] = [];
  /** Where each traveller was drawn: his road and how far along it, so he goes on from there. */
  private travelWas = new Map<string, string>();
  /**
   * The season's timers by name (its scenes taken away, its marching's end, its closing line, its results landing): each
   * with what it runs and when, so a season held still keeps them and they run on when it plays again (item 17+++a).
   */
  private timers = new Map<string, { id: number; run: () => void; due: number }>();
  /** The tokens gone still waiting to be taken away, counted so each has a timer of its own. */
  private leaving = 0;
  /** When the season playing out was held still (null: it plays). */
  private heldAt: number | null = null;

  private later(name: string, run: () => void, ms: number): void {
    this.cancelLater(name);
    const due = (this.heldAt ?? performance.now()) + ms;
    this.timers.set(name, { id: this.heldAt !== null ? 0 : this.arm(name, run, ms), run, due });
  }
  private arm(name: string, run: () => void, ms: number): number {
    return window.setTimeout(() => {
      this.timers.delete(name);
      run();
    }, Math.max(0, ms));
  }
  private cancelLater(name: string): void {
    clearTimeout(this.timers.get(name)?.id);
    this.timers.delete(name);
  }

  /**
   * Holds the season playing out still, or lets it play on (item 17+++a: "Space pauses and unpauses, even while a season
   * plays out"): the map's animations pause where they stand (the pieces' slides, the land's change, the scenes), its
   * timers stop, and on playing again everything goes on from where it stood, as the page's own clock does.
   */
  private hold(on: boolean): void {
    if (on === (this.heldAt !== null) || this.view === null) return;
    const now = performance.now();
    const playing = this.view.getAnimations({ subtree: true });
    if (on) {
      this.heldAt = now;
      for (const a of playing) if (a.playState === "running") a.pause();
      for (const x of this.timers.values()) clearTimeout(x.id);
      return;
    }
    const shift = now - this.heldAt!;
    this.heldAt = null;
    if (this.holdLand !== null) this.holdLand.until += shift;
    if (this.marchPlan !== null) this.marchPlan.start += shift;
    for (const a of playing) if (a.playState === "paused") a.play();
    for (const [name, x] of this.timers) {
      x.due += shift;
      x.id = this.arm(name, x.run, x.due - now);
    }
  }

  /** The season whose results are held back, and until when (`performance.now()`). */
  private holdLand: { index: number; viewer: Power | null; until: number } | null = null;

  /** Whether the results of the season shown are still to land (their steps waiting on `landTimer`). */
  private landPending(): boolean {
    return this.scene !== null && this.landWait(this.scene) > 0;
  }

  /** How long until the results of the season shown land: 0 if they are not held back. */
  private landWait(s: MapScene): number {
    const h = this.holdLand;
    return h !== null && h.index === s.index && h.viewer === s.viewer ? Math.max(0, h.until - (this.heldAt ?? performance.now())) : 0;
  }

  private playSeason(s: MapScene, playout: MapInput["playout"]): void {
    const last = this.sceneFrom;
    this.sceneFrom = { index: s.index, viewer: s.viewer };
    if (last !== null && last.index === s.index && last.viewer === s.viewer) return;
    const g = this.layers.get("scenes")!;
    // A season held still lets go first, so nothing it paused stays paused.
    this.hold(false);
    for (const name of ["scene", "march", "close"]) this.cancelLater(name);
    g.innerHTML = "";
    this.holdLand = null;
    this.marchPlan = null;
    for (const a of this.marchAnims.splice(0)) a.cancel();
    this.march(null);
    this.closingLine(null);
    this.moveSeason(0);
    if (playout === null || playout === undefined || last === null || last.index !== s.index - 1 || last.viewer !== s.viewer || s.prev === null) return;
    const { timeline: t, line } = playout.play;
    const now = performance.now();
    const gone = now - playout.began;
    if (gone >= t.total && t.total > 0) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.closingLine(line);
      return;
    }
    // The land's change moves over the season's first half, at least 1 s and at most 5 s, at the paces that move it (Slow and
    // Normal); at Fast the routine compresses and the land changes at once, however long the season's great moments run
    // (part D, first guesses: moving it there cost a slow phone more long frames).
    const move = (t.total - gone) / 2;
    this.moveSeason(!t.ground || move < SvgMapRenderer.MoveMs[0] ? 0 : Math.min(SvgMapRenderer.MoveMs[1], move));
    if (t.landAt - gone > 0) this.holdLand = { index: s.index, viewer: s.viewer, until: now + t.landAt - gone };
    if (t.marchMs > 0 || t.total === 0) {
      this.march({ at: t.marchAt - gone, ms: t.marchMs });
      this.marchPlan = { index: s.index, viewer: s.viewer, start: now + t.marchAt - gone, ms: t.marchMs, played: new Set() };
      this.later(
        "march",
        () => {
          this.march(null);
          // Each piece has marched to where it stands: left out if that is far off the view.
          for (const el of [...this.units.values(), ...this.travellers.values()]) this.inView?.arrived(el);
        },
        Math.max(0, t.marchAt + t.marchMs - gone) + 50,
      );
    }
    const markup = t.beats.map((b) => momentMarkup(b.moment, b.at - gone, b.ms)).join("");
    if (markup !== "") {
      g.innerHTML = markup;
      this.later("scene", () => (g.innerHTML = ""), Math.max(0, t.closeAt - gone) + 100);
    }
    this.later("close", () => this.closingLine(line), Math.max(0, t.closeAt - gone));
  }

  /** The shortest the land's change moves over (shorter: at once), and the longest (part D, first guesses). */
  private static readonly MoveMs = [1000, 5000] as const;

  /** How long the season's change takes on the land (map-living.css: `--move`); 0 shows it at once. */
  private moveSeason(ms: number): void {
    const g = this.layers.get("season");
    if (g === undefined) return;
    g.classList.toggle("moving", ms > 0);
    if (ms <= 0) g.style.removeProperty("--move");
    else g.style.setProperty("--move", `${Math.round(ms)}ms`);
  }

  /** The marching's time for the pieces' slide (playback.css: `--march-at`, `--march-ms`), or the ordinary slide. */
  private march(m: { at: number; ms: number } | null): void {
    // On the layers the pieces stand in, which they take the time from (playback.css).
    for (const el of [this.layers.get("units"), this.layers.get("travellers")]) {
      if (el === undefined) continue;
      if (m === null) {
        el.style.removeProperty("--march-at");
        el.style.removeProperty("--march-ms");
      } else {
        el.style.setProperty("--march-at", `${Math.round(m.at)}ms`);
        el.style.setProperty("--march-ms", `${Math.round(m.ms)}ms`);
      }
    }
  }

  /** The line that closes the season played, over the map until another season is shown (null: none). */
  private closingLine(text: string | null): void {
    const view = this.view;
    if (view === null) return;
    let el = view.querySelector<HTMLElement>(":scope > .season-close");
    if (text === null) {
      el?.remove();
      return;
    }
    if (el === null) {
      el = document.createElement("div");
      el.className = "season-close";
      view.querySelector(".mapzoom")?.after(el);
    }
    el.textContent = text;
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

  /** Places the markers and the names, batched to the next frame (`placeNamesNow`, `names.ts`). */
  private placeNames(): void {
    this.changed = false;
    if (this.placing !== 0 || this.view === null) return;
    this.placing = requestAnimationFrame(() => {
      this.placing = 0;
      const view = this.view;
      if (view === null) return;
      const t = performance.now();
      placeNamesNow(view, this.labels, this.nameBoxes);
      performance.measure("map:names", { start: t });
    });
  }

  zoomBy(factor: number): void {
    if (this.view !== null) zoomBy(this.view, factor);
  }
  panBy(dx: number, dy: number): void {
    if (this.view !== null) panBy(this.view, dx, dy);
  }


  fit(): void {
    if (this.view !== null) reset(this.view);
  }

  focus(at: Pt, minZoom: number, centre = false): void {
    if (this.view !== null) focus(this.view, at.x, at.y, minZoom, centre);
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
    for (const x of this.timers.values()) clearTimeout(x.id);
    this.timers.clear();
    this.view.querySelector(".mapzoom")?.remove();
    this.view.querySelector(":scope > .omen")?.remove();
    this.view.querySelector(":scope > .season-close")?.remove();
    delete this.view.dataset.medium;
    delete this.view.dataset.omen;
    this.view = null;
  }
}
