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
import { patch, patchParts, type Parts } from "./morph.ts";
import { Base, Defs, Labels, MarksMarkup, NameOrder, Relief, ringOf } from "./markup.ts";
import type { MapHandlers, MapInput, MapRenderer } from "./renderer.ts";
import { reseason, seasonLayer } from "./seasons.ts";
import { type MapScene } from "./scene.ts";
import { attach, detach, focus, getView, reset, setView, zoomBy } from "./zoom.ts";
import { Land, bands, cities, fog, retint, tints, tintsKey } from "./land-layers.ts";
import { peopleAtCourts, reconcile, travellerItem, travellerShift, unitItems } from "./tokens.ts";
import { playRoad, trailMarkup, travellerRoad, unitRoad } from "./marching.ts";
import { glyphId } from "./glyphs.ts";
import { moves, outlaws, roads, selection } from "./ways.ts";

/** Each river's path as the whole board draws it. */
const RiverPaths: ReadonlyMap<string, string> = new Map(Rivers.map((r) => [r.id, r.path]));

/** The small seal's size against the full seal's (map-uncluttered.css, .city.small .seal). */
const SmallSeal = 0.45;

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
  };

  mount(view: HTMLElement, handlers: MapHandlers): void {
    this.view = view;
    this.handlers = handlers;
    const zoom = document.createElement("div");
    zoom.className = "mapzoom";
    // Stacked drawings, each its own compositing layer: the land below (heavy to paint, and painted only when another season
    // is shown), the season's ground over it (part D: painted while its change moves, without the realms), who holds what,
    // the relief, the marks, and the pieces above (light). The upper ones let taps through where they have nothing.
    zoom.innerHTML =
      `<svg class="map map-lower" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" role="img">${Defs}${Base}</svg>` +
      `<svg class="map map-ground" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="season"></g></svg>` +
      `<svg class="map map-realms" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="tints"></g></svg>` +
      `<svg class="map map-relief" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${Relief}</svg>` +
      `<svg class="map map-marks" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="works"></g><g data-layer="memory"></g><g data-layer="fog"></g><g data-layer="bands"></g>${MarksMarkup}${Labels}<g data-layer="cities"></g></svg>` +
      `<svg class="map map-upper" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="roads"></g><g data-layer="moves"></g><g data-layer="outlaws"></g><g data-layer="worksat"></g><g data-layer="life"></g><g class="units" data-layer="units"></g><g class="people"><g data-layer="courts"></g><g data-layer="travellers"></g></g><g data-layer="scenes"></g><g data-layer="selection"></g></svg>`;
    view.prepend(zoom);
    for (const g of zoom.querySelectorAll<SVGGElement>("g[data-layer]")) this.layers.set(g.dataset.layer!, g);
    for (const g of zoom.querySelectorAll<SVGGElement>("g[data-label]")) this.labels.set(g.dataset.label!, g);
    zoom.addEventListener("click", this.onClick);
    zoom.addEventListener("transitionend", this.onMoved);
    zoom.addEventListener("transitioncancel", this.onMoved);
    attach(view, (scale: number) => {
      this.scale = scale;
      this.closeUp();
      if (this.scene !== null) {
        this.drawUnits(this.scene);
        this.drawWorks(this.scene);
      }
      // Now, and again once the zoom's glide has ended (onMoved).
      this.placeNames();
    });
  }

  /**
   * A layer drawn again when its key changes. With `update`, a layer already drawn is written in place by it instead (part G:
   * the tints and the season's washes), which gives whether it wrote anything.
   */
  private layer(name: string, key: unknown, draw: () => string, update?: (g: SVGGElement) => boolean): void {
    if (this.drawn.get(name) === key) return;
    const first = !this.drawn.has(name);
    this.drawn.set(name, key);
    const t = performance.now();
    if (update !== undefined && !first) {
      if (update(this.layers.get(name)!)) this.changed = true;
      performance.measure(`map:${name}`, { start: t });
      return;
    }
    // Drawn anew, but written only when the markup differs from what stands (item 17a: a write means a style recalculation
    // and a repaint of the layer, which a phone pays 40 ms and more for; most seasons the cities, the tints and the bands
    // come out the same).
    const html = draw();
    if (this.written.get(name) !== html) {
      // Patched, so only what changed is restyled and repainted (part G); the season's arrows are written whole, since each
      // plays its drawing anew (map.css: .mv .shaft).
      if (name === "moves") this.layers.get(name)!.innerHTML = html;
      else patch(this.layers.get(name)!, html);
      this.written.set(name, html);
      this.changed = true;
    }
    performance.measure(`map:${name}`, { start: t });
  }

  /** The markup each layer was last written with. */
  private readonly written = new Map<string, string>();

  /** Each name's box as last measured, and the view it was measured in (`placeNamesNow`). */
  private readonly nameBoxes = new WeakMap<Element, { key: string; r: DOMRect }>();

  /** Whether a layer, the units or the people were written since the names were last placed: placing them costs a layout. */
  private changed = false;

  /**
   * What is built at the cities (item 19): shown only close up (lod2, zoom.ts), so built only then, and again when the zoom
   * comes close; at the other zooms the layer stays empty and costs a season's redraw nothing.
   */
  private drawWorks(s: MapScene): void {
    const close = this.view?.classList.contains("lod2") ?? false;
    const key = close ? s : null;
    if (this.drawn.get("worksat") === key) return;
    this.drawn.set("worksat", key);
    const t = performance.now();
    // In parts, a city each: only the cities whose works changed are written (part G).
    if (patchParts(this.layers.get("worksat")!, this.worksParts, close ? worksAtCities(s) : [])) this.changed = true;
    performance.measure("map:worksat", { start: t });
  }
  private readonly worksParts: Parts = { markup: [], nodes: [] };

  /** The units, laid out for the current zoom: drawn again only when the scene or a province's gathering changes. */
  private drawUnits(s: MapScene): void {
    const items = unitItems(s.units, s.viewer, this.scale, s.walls);
    const key = items.map((i) => i.key + i.inner.length).join("|");
    if (this.drawn.get("units") === s && this.drawn.get("unitsKey") === key) return;
    this.drawn.set("units", s);
    this.drawn.set("unitsKey", key);
    this.changed = true;
    const stood = new Map([...this.units].map(([k, el]) => [k, el.getAttribute("data-province")] as const));
    // A unit gone (destroyed, or out of the viewer's sight) stays until the season's results land (item 17+++).
    reconcile(this.layers.get("units")!, items, this.units, this.landWait(s));
    // Part E: each unit that marched goes along its road, drawn as what it is.
    const plan = this.marching(s);
    if (plan === null) return;
    for (const u of s.units) {
      const from = stood.get(u.key);
      const el = this.units.get(u.key);
      if (from === undefined || from === null || el === undefined || u.ghost) continue;
      const road = unitRoad(u.kind, u.power, from, u.province, s.moves);
      if (road !== null) this.marchAnims.push(...playRoad(el, road, plan.start - performance.now(), plan.ms, trailMarkup(u.kind, u.men, glyphId(u.power))));
    }
  }

  /** The season's marching as it plays out (part E), for the pieces drawn while it is due; null when nothing marches. */
  private marching(s: MapScene): { start: number; ms: number } | null {
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
   * them. The names are placed after the last step.
   */
  private steps: (() => void)[] = [];
  private stepping = 0;
  private static readonly BudgetMs = 8;

  private renderNow(input: MapInput): void {
    const s = input.scene;
    this.scene = s;
    this.playSeason(s, input.playout ?? null);
    const lower = this.view?.querySelector(".map-lower");
    lower?.setAttribute("aria-label", s.viewer !== null ? `Map of the Great Kings' lands as ${powerName(s.viewer)} sees it` : "Map of the Great Kings' lands (god view)");
    const seasonKey = `${s.frame.turn % 3}|${s.viewer}|${[...s.land].join(";")}`;
    // While a season plays out, its results (who holds what, the fog, the walls, the season's arrows) land on the map when
    // its cities fall, after the marches and battles (item 17+++); the pieces move at once.
    const land: (() => void)[] = [
      () => this.layer("tints", tintsKey(s, input.mode ?? "realms"), () => tints(s, input.mode ?? "realms"), (g) => retint(g, s, input.mode ?? "realms")),
      () => this.layer("works", `${s.viewer}|${[...s.built].join(";")}|${[...(s.builtKnown ?? [])].join(";")}`, () => roadsLayer(s)),
      () => {
        const m = s.memory;
        // Redrawn when anything a stele stands by changes: its battles, its city's walls, a siege camp round it.
        this.layer("memory", `${s.viewer}|${[...m.wild].join()}|${[...m.memorials].map(([k, v]) => `${k}:${v.count}:${v.last}:${s.walls.get(k) ?? 0}:${s.sieges.some((x) => x.province === k) ? 1 : 0}`).join()}`, () => memoryLayer(s));
      },
      () => this.layer("fog", s, () => fog(s)),
      // Keyed by the scene, not the frame: who holds what and the armies seen are the viewer's own.
      () => this.layer("bands", s, () => bands(s)),
      () => {
        if (this.drawn.get("cities") !== s) {
          this.layer("cities", s, () => cities(s));
          // Each name stands off its city's outermost ring, which grows with the walls the viewer knows.
          for (const p of Land) {
            const g = this.labels.get(p.id);
            const ring = F(ringOf(p.capital, s.walls.get(p.id) ?? 0));
            if (g !== undefined && g.style.getPropertyValue("--ring") !== ring) g.style.setProperty("--ring", ring);
          }
        }
      },
      () => this.layer("moves", s, () => moves(s)),
      () => this.layer("outlaws", s, () => outlaws(s)),
    ];
    const wait = this.landWait(s);
    clearTimeout(this.landTimer);
    if (wait > 0)
      this.landTimer = window.setTimeout(() => {
        this.steps.push(...land, () => this.changed && this.placeNames());
        this.stepSoon();
      }, wait);
    this.steps = [
      () => {
        if (this.drawn.get("season") !== seasonKey) {
          this.layer("season", seasonKey, () => seasonLayer(s), (g) => reseason(g, s));
          // A river in spate is drawn on the board's course: close up, it takes the finer one the rivers have.
          if (this.fine && this.fineRivers !== null) this.swapGeography({}, this.fineRivers);
        }
      },
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
              if (from !== t.fromProvince || to !== t.toProvince || el === undefined) return;
              const road = travellerRoad(t, Number(progress), travellerShift(t, i, s.travellers));
              if (road !== null) this.marchAnims.push(...playRoad(el, road, plan.start - performance.now(), plan.ms, t.kind === "Spy" ? "" : trailMarkup("Caravan", 0)));
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
      const step = this.steps.shift()!;
      step();
      if (this.steps.length > 0 && performance.now() - start > SvgMapRenderer.BudgetMs) {
        this.stepSoon();
        return;
      }
    }
  }

  /**
   * The season plays out (item 17+++): when the map steps on by one season and that season is playing, its moments play in
   * sequence (session/pacing.ts): the pieces slide together in the marching, each great moment's medallion shows in its
   * turn, the results land when the cities fall, and the closing line ends it. None when the reader asks for reduced
   * motion, when stepping back, or jumping: the season then shows as it ended.
   */
  private sceneFrom: { index: number; viewer: Power | null } | null = null;
  private sceneTimer = 0;
  private marchTimer = 0;
  /** The season's marching (part E): when it starts (`performance.now()`) and how long it runs, and the pieces' slides. */
  private marchPlan: { index: number; viewer: Power | null; start: number; ms: number } | null = null;
  private marchAnims: Animation[] = [];
  /** Where each traveller was drawn: his road and how far along it, so he goes on from there. */
  private travelWas = new Map<string, string>();
  private landTimer = 0;
  private closeTimer = 0;
  /** The season whose results are held back, and until when (`performance.now()`). */
  private holdLand: { index: number; viewer: Power | null; until: number } | null = null;

  /** Whether the results of the season shown are still to land (their steps waiting on `landTimer`). */
  private landPending(): boolean {
    return this.scene !== null && this.landWait(this.scene) > 0;
  }

  /** How long until the results of the season shown land: 0 if they are not held back. */
  private landWait(s: MapScene): number {
    const h = this.holdLand;
    return h !== null && h.index === s.index && h.viewer === s.viewer ? Math.max(0, h.until - performance.now()) : 0;
  }

  private playSeason(s: MapScene, playout: MapInput["playout"]): void {
    const last = this.sceneFrom;
    this.sceneFrom = { index: s.index, viewer: s.viewer };
    if (last !== null && last.index === s.index && last.viewer === s.viewer) return;
    const g = this.layers.get("scenes")!;
    for (const t of [this.sceneTimer, this.marchTimer, this.closeTimer]) clearTimeout(t);
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
      this.marchPlan = { index: s.index, viewer: s.viewer, start: now + t.marchAt - gone, ms: t.marchMs };
      this.marchTimer = window.setTimeout(() => this.march(null), Math.max(0, t.marchAt + t.marchMs - gone) + 50);
    }
    const markup = t.beats.map((b) => momentMarkup(b.moment, b.at - gone, b.ms)).join("");
    if (markup !== "") {
      g.innerHTML = markup;
      this.sceneTimer = window.setTimeout(() => (g.innerHTML = ""), Math.max(0, t.closeAt - gone) + 100);
    }
    this.closeTimer = window.setTimeout(() => this.closingLine(line), Math.max(0, t.closeAt - gone));
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

  /** The marching's time for the pieces' slide (app.css: `--march-at`, `--march-ms`), or the ordinary slide. */
  private march(m: { at: number; ms: number } | null): void {
    for (const el of [this.layers.get("units"), this.layers.get("travellers")?.closest<SVGGElement>(".people")]) {
      if (el === null || el === undefined) continue;
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

  /**
   * Markers never overlap (item 11c++), and names give way to everything drawn over the land (item 11c+). In order of
   * importance (NameOrder), each city is shown with its full badge, its counters, its people and its news where none of
   * them touches a marker already placed; where one would, its badge shrinks to its small seal and the rest gives way,
   * returning as the map is zoomed in; where even the small seal would touch, the city's mark gives way too (its province's
   * colour still says who holds it). Then the fleets at sea, the units destroyed, the travellers on the roads and the marks
   * of the crossings, each where it touches nothing placed. Then the names: each where its box, measured as drawn, touches
   * no name shown before it and no marker shown (its own city's badge it may sit beside). Batched to the next frame.
   */
  private placeNames(): void {
    this.changed = false;
    if (this.placing !== 0 || this.view === null) return;
    this.placing = requestAnimationFrame(() => {
      this.placing = 0;
      const view = this.view;
      if (view === null) return;
      const t = performance.now();
      this.placeNamesNow(view);
      performance.measure("map:names", { start: t });
    });
  }

  private placeNamesNow(view: HTMLElement): void {
    {
      // The small seals shown full again (their size is measured), then all measured in one go, then given way in one batch
      // of class changes: one layout, however many markers (writing a class between two measures would force a layout each
      // time). What gives way only hides (`off`: visibility, which leaves every box as it was), so it is measured where it
      // stands and only the markers whose place changed are written (part G: showing and hiding every marker again restyled
      // some 1,700 elements a placement, 30 to 50 ms on a slow phone).
      view.querySelectorAll(".map .city.small").forEach((e) => e.classList.remove("small", "crowd"));
      // The style and layout the measures need, timed on their own (the soak tool's `map:names:layout`).
      const t0 = performance.now();
      view.querySelector(".map-marks")!.getBoundingClientRect();
      performance.measure("map:names:layout", { start: t0 });
      const rects = (e: Element, sel: string): DOMRect[] =>
        [...e.querySelectorAll(sel)].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
      // A seal's parts with their rims: the box drawn holds only the fill, so it grows by half the stroke, at the scale drawn.
      const perUnit = (x: SVGGraphicsElement, r: DOMRect): number => {
        const b = x.getBBox();
        return b.width > 0 ? r.width / b.width : 0;
      };
      const grown = (r: DOMRect, by: number): DOMRect => new DOMRect(r.x - by, r.y - by, r.width + 2 * by, r.height + 2 * by);
      // A part's stroke width by its class and its city's (part G: read once for each kind, not for every seal and ring,
      // each read a style lookup the phone pays for).
      const strokes = new Map<string, number>();
      const strokeOf = (x: SVGGraphicsElement, e: Element): number => {
        const key = `${x.getAttribute("class")}|${e.getAttribute("class")}`;
        let w = strokes.get(key);
        if (w === undefined) {
          const css = getComputedStyle(x);
          w = css.stroke === "none" ? 0 : parseFloat(css.strokeWidth) || 0;
          strokes.set(key, w);
        }
        return w;
      };
      const rimmed = (e: Element, sel: string): DOMRect[] =>
        [...e.querySelectorAll<SVGGraphicsElement>(sel)].flatMap((x) => {
          const r = x.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return [];
          // A drawn figure (a siege's tent, <use>) strokes at its symbol's own scale: under a third of a board unit past its
          // box, too small to pad.
          if (x instanceof SVGUseElement) return [r];
          const w = strokeOf(x, e);
          return [w === 0 ? r : grown(r, (w * perUnit(x, r)) / 2)];
        });
      // Read where they are set: anywhere above .map they would read as no rim at all.
      const rim = getComputedStyle(view.querySelector(".map")!);
      const smallRim = parseFloat(rim.getPropertyValue("--small-rim")) || 0;
      const markedRim = parseFloat(rim.getPropertyValue("--small-rim-marked")) || 0;
      const union = (rs: DOMRect[]): DOMRect[] => {
        if (rs.length < 2) return rs;
        const left = Math.min(...rs.map((r) => r.left)), top = Math.min(...rs.map((r) => r.top));
        return [new DOMRect(left, top, Math.max(...rs.map((r) => r.right)) - left, Math.max(...rs.map((r) => r.bottom)) - top)];
      };
      const byProvince = (sel: string): Map<string, Element[]> => {
        const m = new Map<string, Element[]>();
        view.querySelectorAll(sel).forEach((e) => {
          const id = e.getAttribute("data-province") ?? e.getAttribute("data-court") ?? "";
          m.set(id, [...(m.get(id) ?? []), e]);
        });
        return m;
      };
      const units = byProvince(".map-upper .unit[data-province]");
      const courts = byProvince(".map-upper .court-at[data-court], .map-upper .news[data-court]");
      const cities = new Map<string, SVGGElement>();
      view.querySelectorAll<SVGGElement>(".cities .city").forEach((c) => cities.set(c.dataset.province ?? "", c));
      // Measured: each city's badge, seal and own markers; then the lesser markers; then the names.
      const cityRects = NameOrder.filter((id) => cities.has(id)).map((id) => {
        const c = cities.get(id)!;
        return {
          id,
          c,
          // The badge as one box round its seal, rings and a siege's tents: the tents stand apart, and a counter between two
          // of them would still crowd the city.
          badge: union(rimmed(c, ".seal, .walls, .cap-ring, .tent")),
          seal: c.querySelector<SVGGraphicsElement>(".seal") ?? undefined,
          rest: [
            ...(units.get(id) ?? []).flatMap((u) => rects(u, ":scope > .sym")),
            ...(courts.get(id) ?? []).flatMap((e) => rects(e, ".person, .person-more, .news-bg")),
          ],
        };
      });
      // The traveller or person being followed comes first; then, after the cities, the fleets at sea and the counters of
      // provinces with no city drawn, the units destroyed, the travellers, and the marks of the crossings.
      const followed = [...view.querySelectorAll(".map-upper .traveller.followed")].map((e) => ({ e, rs: rects(e, ":scope > .sym") }));
      const lesser = [
        ...[...units].filter(([id]) => !cities.has(id)).flatMap(([, es]) => es.map((e) => [e, ":scope > .sym"] as const)),
        ...[...view.querySelectorAll(".map-upper .destroyed")].map((e) => [e, ":scope > .sym"] as const),
        ...[...view.querySelectorAll(".map-upper .band-mark")].map((e) => [e, ":scope > .sym"] as const),
        ...[...view.querySelectorAll(".map-upper .life-mark")].map((e) => [e, ":scope > .sym"] as const),
        ...[...view.querySelectorAll(".map-upper .traveller:not(.followed)")].map((e) => [e, ":scope > .sym"] as const),
        ...[...view.querySelectorAll(".xmarks .xmark")].map((e) => [e, ".xm-bg"] as const),
      ].map(([e, sel]) => ({ e, rs: rects(e, sel) }));
      // What is built at the cities (item 19) comes last of all: it gives way to every marker and every name.
      const works = [...view.querySelectorAll(".map-upper .works-at")].map((e) => ({ e, rs: rects(e, ".wk-bg") }));
      // The names stand still unless the view moves or a city's walls push its name out: each is measured again only then
      // (part G: measuring every name's box was much of a placement's cost on a slow phone).
      // Where the map stands as drawn now (mid-glide too), and what sizes its names.
      const box = view.querySelector(".map-marks")!.getBoundingClientRect();
      const at = `${box.x},${box.y},${box.width},${box.height}|${view.style.cssText}|${view.className}|${view.dataset.medium}`;
      const still = (t: Element, key: string): DOMRect => {
        const kept = this.nameBoxes.get(t);
        if (kept !== undefined && kept.key === key) return kept.r;
        const r = t.getBoundingClientRect();
        this.nameBoxes.set(t, { key, r });
        return r;
      };
      const names = NameOrder.map((id) => this.labels.get(id))
        .filter((g): g is SVGGElement => g !== undefined && g.querySelector("text") !== null)
        .map((g) => {
          const t = g.querySelector("text")!;
          return { t, own: g.getAttribute("data-label"), r: still(t, `${at}|${g.style.getPropertyValue("--ring")}`) };
        });
      const geo = [...view.querySelectorAll<SVGTextElement>(".base text.geo")].map((t) => ({ t, own: null, r: still(t, at) }));

      const placed: { r: DOMRect; own: string | null }[] = [];
      const touch = (a: DOMRect, b: DOMRect): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const free = (rs: readonly DOMRect[]): boolean => rs.every((r) => !placed.some((o) => touch(r, o.r)));
      const place = (rs: readonly DOMRect[], own: string | null): void => rs.forEach((r) => placed.push({ r, own }));
      const writes: (() => void)[] = [];
      const off = new Set<Element>();
      for (const f of followed) place(f.rs, null);
      for (const { id, c, badge, seal, rest } of cityRects) {
        // A city's own markers must not touch each other either (two pieces of news, say), nor its own badge (a siege's tents).
        const own = rest.every((r, i) => !rest.slice(i + 1).some((o) => touch(r, o)) && !badge.some((b) => touch(r, b)));
        if (own && free(badge) && free(rest)) {
          place(badge, id);
          place(rest, null);
          continue;
        }
        for (const e of [...(units.get(id) ?? []), ...(courts.get(id) ?? [])]) off.add(e);
        if (seal === undefined) continue;
        // The small seal: the seal's own centre, at the size the stylesheet shrinks it to (.city.small, map-uncluttered.css),
        // with its rim, the marked one where its counters gave way or it is besieged.
        const at = seal.getBoundingClientRect();
        const k = SmallSeal / 2;
        // A small seal whose counters gave way says so by its darker rim.
        const crowd = (units.get(id) ?? []).length > 0;
        const rimWidth = crowd || c.classList.contains("besieged") ? markedRim : smallRim;
        const small = grown(
          new DOMRect(at.x + at.width * (0.5 - k), at.y + at.height * (0.5 - k), at.width * 2 * k, at.height * 2 * k),
          (rimWidth * perUnit(seal, at) * SmallSeal) / 2,
        );
        if (free([small])) {
          writes.push(() => c.classList.add("small", ...(crowd ? ["crowd"] : [])));
          place([small], id);
        } else off.add(c);
      }
      for (const { e, rs } of lesser) {
        if (free(rs)) place(rs, null);
        else off.add(e);
      }
      // The names: each where it touches no name shown and no marker (its own city's badge it may sit beside); the names
      // of the land (rivers, ranges, deserts, the lands beyond) last.
      const shown: DOMRect[] = [];
      for (const { t, own, r } of [...names, ...geo]) {
        const ok = !shown.some((o) => touch(r, o)) && !placed.some((o) => (own === null || o.own !== own) && touch(r, o.r));
        if (ok) shown.push(r);
        else off.add(t);
      }
      for (const { e, rs } of works) {
        if (free(rs) && rs.every((r) => !shown.some((o) => touch(r, o)))) place(rs, null);
        else off.add(e);
      }
      for (const w of writes) w();
      view.querySelectorAll(".map .off").forEach((e) => {
        if (!off.delete(e)) e.classList.remove("off");
      });
      for (const e of off) e.classList.add("off");
    }
  }

  zoomBy(factor: number): void {
    if (this.view !== null) zoomBy(this.view, factor);
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
    for (const t of [this.sceneTimer, this.marchTimer, this.landTimer, this.closeTimer]) clearTimeout(t);
    this.view.querySelector(".mapzoom")?.remove();
    this.view.querySelector(":scope > .omen")?.remove();
    this.view.querySelector(":scope > .season-close")?.remove();
    delete this.view.dataset.medium;
    delete this.view.dataset.omen;
    this.view = null;
  }
}
