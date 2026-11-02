/**
 * The SVG renderer: the static geography written once as markup; each layer above it drawn again only when what it shows
 * changes; units and travellers kept as the same elements from season to season, so stepping the timeline slides them
 * along their moves; pinch, pan and wheel zoom move one layer on the GPU (zoom.ts) without drawing anything.
 */
import { type Power } from "@amarna/engine";
import { powerName } from "../ui/format.ts";
import { CoastPath, F, Height, IslandPath, LakePath, LandPath, MainlandPath, Rivers, SeaPath, Width, type Pt } from "./art.ts";
import { roadsLayer, worksAtCities } from "./built.ts";
import { OmenSigns, lifeLayer, mediumOf, memoryLayer, sceneMarkup, scenesOf } from "./life.ts";
import { Base, Defs, Labels, MarksMarkup, NameOrder, Relief, ringOf } from "./markup.ts";
import type { MapHandlers, MapInput, MapRenderer } from "./renderer.ts";
import { seasonLayer } from "./seasons.ts";
import { type MapScene } from "./scene.ts";
import { attach, detach, focus, getView, reset, setView, zoomBy } from "./zoom.ts";
import { Land, bands, cities, fog, tints } from "./land-layers.ts";
import { peopleAtCourts, reconcile, travellerItem, unitItems } from "./tokens.ts";
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
    if (e.propertyName === "transform" && (e.target as Element).matches(".mapzoom, .unit, .traveller")) this.placeNames();
  };

  mount(view: HTMLElement, handlers: MapHandlers): void {
    this.view = view;
    this.handlers = handlers;
    const zoom = document.createElement("div");
    zoom.className = "mapzoom";
    // Two stacked drawings, each its own compositing layer: the land and who holds it below (heavy to paint, and painted
    // only when another season is shown), the pieces above (light). The upper one lets taps through where it has nothing.
    zoom.innerHTML =
      `<svg class="map map-lower" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" role="img">${Defs}${Base}</svg>` +
      `<svg class="map map-season" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="tints"></g><g data-layer="season"></g></svg>` +
      `<svg class="map map-relief" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${Relief}</svg>` +
      `<svg class="map map-marks" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="works"></g><g data-layer="memory"></g><g data-layer="fog"></g><g data-layer="bands"></g>${MarksMarkup}${Labels}<g data-layer="cities"></g></svg>` +
      `<svg class="map map-upper" viewBox="0 0 ${Width} ${Height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g data-layer="roads"></g><g data-layer="moves"></g><g data-layer="outlaws"></g><g data-layer="worksat"></g><g data-layer="life"></g><g data-layer="scenes"></g><g class="units" data-layer="units"></g><g class="people"><g data-layer="courts"></g><g data-layer="travellers"></g></g><g data-layer="selection"></g></svg>`;
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

  private layer(name: string, key: unknown, draw: () => string): void {
    if (this.drawn.get(name) === key) return;
    this.drawn.set(name, key);
    const t = performance.now();
    // Drawn anew, but written only when the markup differs from what stands (item 17a: a write means a style recalculation
    // and a repaint of the layer, which a phone pays 40 ms and more for; most seasons the cities, the tints and the bands
    // come out the same).
    const html = draw();
    if (this.written.get(name) !== html) {
      this.layers.get(name)!.innerHTML = html;
      this.written.set(name, html);
      this.changed = true;
    }
    performance.measure(`map:${name}`, { start: t });
  }

  /** The markup each layer was last written with. */
  private readonly written = new Map<string, string>();

  /** Whether a layer, the units or the people were written since the names were last placed: placing them costs a layout. */
  private changed = false;

  /**
   * What is built at the cities (item 19): shown only close up (lod2, zoom.ts), so built only then, and again when the zoom
   * comes close; at the other zooms the layer stays empty and costs a season's redraw nothing.
   */
  private drawWorks(s: MapScene): void {
    const close = this.view?.classList.contains("lod2") ?? false;
    this.layer("worksat", close ? s : null, () => (close ? worksAtCities(s) : ""));
  }

  /** The units, laid out for the current zoom: drawn again only when the scene or a province's gathering changes. */
  private drawUnits(s: MapScene): void {
    const items = unitItems(s.units, s.viewer, this.scale, s.walls);
    const key = items.map((i) => i.key + i.inner.length).join("|");
    if (this.drawn.get("units") === s && this.drawn.get("unitsKey") === key) return;
    this.drawn.set("units", s);
    this.drawn.set("unitsKey", key);
    this.changed = true;
    reconcile(this.layers.get("units")!, items, this.units);
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
    const lower = this.view?.querySelector(".map-lower");
    lower?.setAttribute("aria-label", s.viewer !== null ? `Map of the Great Kings' lands as ${powerName(s.viewer)} sees it` : "Map of the Great Kings' lands (god view)");
    const seasonKey = `${s.frame.turn % 3}|${s.viewer}|${[...s.land].join(";")}`;
    this.steps = [
      () => {
        if (this.drawn.get("season") !== seasonKey) {
          this.layer("season", seasonKey, () => seasonLayer(s));
          // A river in spate is drawn on the board's course: close up, it takes the finer one the rivers have.
          if (this.fine && this.fineRivers !== null) this.swapGeography({}, this.fineRivers);
        }
      },
      () => this.layer("tints", `${s.index}|${s.viewer}|${input.mode ?? "realms"}|${s.frame.turn}`, () => tints(s, input.mode ?? "realms")),
      () => this.layer("works", `${s.viewer}|${[...s.built].join(";")}|${[...(s.builtKnown ?? [])].join(";")}`, () => roadsLayer(s)),
      () => {
        const m = s.memory;
        // Redrawn when anything a stele stands by changes: its battles, its city's walls, a siege camp round it.
        this.layer("memory", `${s.viewer}|${[...m.wild].join()}|${[...m.memorials].map(([k, v]) => `${k}:${v.count}:${v.last}:${s.walls.get(k) ?? 0}:${s.sieges.some((x) => x.province === k) ? 1 : 0}`).join()}`, () => memoryLayer(s));
      },
      () => this.layer("fog", s, () => fog(s)),
      () => this.layer("bands", s.frame, () => bands(s)),
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
      () => this.layer("roads", `${s.index}|${s.viewer}|${input.followId}|${input.followPath?.length ?? -1}|${input.followPath?.[input.followPath.length - 1]?.index ?? -1}`, () => roads(input)),
      () => this.layer("moves", s, () => moves(s)),
      () => this.layer("outlaws", s, () => outlaws(s)),
      () => this.drawWorks(s),
      () => this.layer("life", s, () => lifeLayer(s)),
      () => {
        this.showScenes(s);
        this.margin(s);
      },
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
        }
      },
      () => {
        const sel = selection(input);
        if (this.written.get("selection") !== sel) {
          this.layers.get("selection")!.innerHTML = sel;
          this.written.set("selection", sel);
        }
        // Names are placed once the pieces are drawn, when something was drawn anew (item 17a: placing them measures every
        // name and marker, a layout the phone pays dearly for), and again once the pieces have slid to their places (onMoved).
        if (this.changed) this.placeNames();
      },
    ];
    this.runSteps();
  }

  /** Runs the waiting steps within this frame's budget, and comes back next frame for the rest. */
  private runSteps(): void {
    if (this.stepping !== 0) {
      cancelAnimationFrame(this.stepping);
      this.stepping = 0;
    }
    const start = performance.now();
    while (this.steps.length > 0) {
      const step = this.steps.shift()!;
      step();
      if (this.steps.length > 0 && performance.now() - start > SvgMapRenderer.BudgetMs) {
        this.stepping = requestAnimationFrame(() => {
          this.stepping = 0;
          this.runSteps();
        });
        return;
      }
    }
  }

  /**
   * Small scenes at big moments (item 19): when the map steps on by one season, the season's gift processions, sacks and
   * ambushes play once over the map, briefly, then are taken away; none when the reader asks for reduced motion, when
   * stepping back, or jumping.
   */
  private sceneFrom: { index: number; viewer: Power | null } | null = null;
  private sceneTimer = 0;
  private showScenes(s: MapScene): void {
    const last = this.sceneFrom;
    this.sceneFrom = { index: s.index, viewer: s.viewer };
    if (last !== null && last.index === s.index && last.viewer === s.viewer) return;
    const g = this.layers.get("scenes")!;
    clearTimeout(this.sceneTimer);
    g.innerHTML = "";
    if (last === null || last.index !== s.index - 1 || last.viewer !== s.viewer || s.prev === null) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scenes = scenesOf(s.prev, s.frame, s.viewer);
    if (scenes.length === 0) return;
    g.innerHTML = scenes.map(sceneMarkup).join("");
    // Each plays 3.6 s, the next starting 0.35 s after the one before (map-living.css).
    this.sceneTimer = window.setTimeout(() => (g.innerHTML = ""), 3700 + 350 * (scenes.length - 1));
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
      // Everything shown again, then all measured in one go, then given way in one batch of class changes: one layout,
      // however many markers (writing a class between two measures would force a layout each time).
      view.querySelectorAll(".map .small, .map .off").forEach((e) => e.classList.remove("small", "crowd", "off"));
      const rects = (e: Element, sel: string): DOMRect[] =>
        [...e.querySelectorAll(sel)].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
      // A seal's parts with their rims: the box drawn holds only the fill, so it grows by half the stroke, at the scale drawn.
      const perUnit = (x: SVGGraphicsElement, r: DOMRect): number => {
        const b = x.getBBox();
        return b.width > 0 ? r.width / b.width : 0;
      };
      const grown = (r: DOMRect, by: number): DOMRect => new DOMRect(r.x - by, r.y - by, r.width + 2 * by, r.height + 2 * by);
      const rimmed = (e: Element, sel: string): DOMRect[] =>
        [...e.querySelectorAll<SVGGraphicsElement>(sel)].flatMap((x) => {
          const r = x.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return [];
          const css = getComputedStyle(x);
          return [css.stroke === "none" ? r : grown(r, ((parseFloat(css.strokeWidth) || 0) * perUnit(x, r)) / 2)];
        });
      const rim = getComputedStyle(view.querySelector(".map") ?? view);
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
      const names = NameOrder.map((id) => this.labels.get(id)?.querySelector("text"))
        .filter((t): t is SVGTextElement => t !== null && t !== undefined)
        .map((t) => ({ t, own: t.closest("[data-label]")?.getAttribute("data-label") ?? null, r: t.getBoundingClientRect() }));
      const geo = [...view.querySelectorAll<SVGTextElement>(".base text.geo")].map((t) => ({ t, own: null, r: t.getBoundingClientRect() }));

      const placed: { r: DOMRect; own: string | null }[] = [];
      const touch = (a: DOMRect, b: DOMRect): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const free = (rs: readonly DOMRect[]): boolean => rs.every((r) => !placed.some((o) => touch(r, o.r)));
      const place = (rs: readonly DOMRect[], own: string | null): void => rs.forEach((r) => placed.push({ r, own }));
      const writes: (() => void)[] = [];
      for (const f of followed) place(f.rs, null);
      for (const { id, c, badge, seal, rest } of cityRects) {
        // A city's own markers must not touch each other either (two pieces of news, say), nor its own badge (a siege's tents).
        const own = rest.every((r, i) => !rest.slice(i + 1).some((o) => touch(r, o)) && !badge.some((b) => touch(r, b)));
        if (own && free(badge) && free(rest)) {
          place(badge, id);
          place(rest, null);
          continue;
        }
        for (const e of [...(units.get(id) ?? []), ...(courts.get(id) ?? [])]) writes.push(() => e.classList.add("off"));
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
        } else writes.push(() => c.classList.add("off"));
      }
      for (const { e, rs } of lesser) {
        if (free(rs)) place(rs, null);
        else writes.push(() => e.classList.add("off"));
      }
      // The names: each where it touches no name shown and no marker (its own city's badge it may sit beside); the names
      // of the land (rivers, ranges, deserts, the lands beyond) last.
      const shown: DOMRect[] = [];
      for (const { t, own, r } of [...names, ...geo]) {
        const ok = !shown.some((o) => touch(r, o)) && !placed.some((o) => (own === null || o.own !== own) && touch(r, o.r));
        if (ok) shown.push(r);
        else writes.push(() => t.classList.add("off"));
      }
      for (const { e, rs } of works) {
        if (free(rs) && rs.every((r) => !shown.some((o) => touch(r, o)))) place(rs, null);
        else writes.push(() => e.classList.add("off"));
      }
      for (const w of writes) w();
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
    clearTimeout(this.sceneTimer);
    this.view.querySelector(".mapzoom")?.remove();
    this.view.querySelector(":scope > .omen")?.remove();
    delete this.view.dataset.medium;
    delete this.view.dataset.omen;
    this.view = null;
  }
}
