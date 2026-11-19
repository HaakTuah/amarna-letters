import { Boxes, touch } from "./boxes.ts";
import { NameOrder } from "./markup.ts";

/** Each name's box as last measured, and the view it was measured in (`placeNamesNow`). */
export type NameBoxes = WeakMap<Element, { key: string; r: DOMRect }>;

/**
 * Markers never overlap (item 11c++), and names give way to everything drawn over the land (item 11c+). In order of
 * importance (NameOrder), each city is shown with its full badge, its counters, its people and its news where none of
 * them touches a marker already placed; where one would, its badge shrinks to its small seal and the rest gives way,
 * returning as the map is zoomed in; where even the small seal would touch, the city's mark gives way too (its province's
 * colour still says who holds it). Then the fleets at sea, the units destroyed, the travellers on the roads and the marks
 * of the crossings, each where it touches nothing placed. Then the names: each where its box, measured as drawn, touches
 * no name shown before it and no marker shown (its own city's badge it may sit beside).
 */
export function placeNamesNow(view: HTMLElement, labels: ReadonlyMap<string, SVGGElement>, nameBoxes: NameBoxes): void {
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
  // Read at the map, whose seals draw them (they are set on :root, for the legend too).
  const rim = getComputedStyle(view.querySelector(".map")!);
  const smallRim = parseFloat(rim.getPropertyValue("--small-rim")) || 0;
  const markedRim = parseFloat(rim.getPropertyValue("--small-rim-marked")) || 0;
  // The small seal's size against the full seal's (--small-seal, map-uncluttered.css).
  const smallSeal = parseFloat(rim.getPropertyValue("--small-seal")) || 1;
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
    const kept = nameBoxes.get(t);
    if (kept !== undefined && kept.key === key) return kept.r;
    const r = t.getBoundingClientRect();
    nameBoxes.set(t, { key, r });
    return r;
  };
  const names = NameOrder.map((id) => labels.get(id))
    // A name left out of the drawing, far off the view (in-view.ts), is neither placed nor in the way.
    .filter((g): g is SVGGElement => g !== undefined && !g.hasAttribute("data-out") && g.querySelector("text") !== null)
    .map((g) => {
      const t = g.querySelector("text")!;
      return { t, own: g.getAttribute("data-label"), r: still(t, `${at}|${g.style.getPropertyValue("--ring")}`) };
    });
  const geo = [...view.querySelectorAll<SVGTextElement>(".base text.geo")].map((t) => ({ t, own: null, r: still(t, at) }));

  // What is placed, found by where it lies (map/boxes.ts), each box with the city it is the badge of.
  const placed = new Boxes<string | null>();
  const free = (rs: readonly DOMRect[]): boolean => rs.every((r) => !placed.touches(r));
  const place = (rs: readonly DOMRect[], own: string | null): void => rs.forEach((r) => placed.add(r, own));
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
    const k = smallSeal / 2;
    // A small seal whose counters gave way says so by its darker rim.
    const crowd = (units.get(id) ?? []).length > 0;
    const rimWidth = crowd || c.classList.contains("besieged") ? markedRim : smallRim;
    const small = grown(
      new DOMRect(at.x + at.width * (0.5 - k), at.y + at.height * (0.5 - k), at.width * 2 * k, at.height * 2 * k),
      (rimWidth * perUnit(seal, at) * smallSeal) / 2,
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
  const shown = new Boxes();
  for (const { t, own, r } of [...names, ...geo]) {
    const ok = !shown.touches(r) && !placed.touches(r, (o) => own === null || o !== own);
    if (ok) shown.add(r, null);
    else off.add(t);
  }
  // The season a province was last seen (the fog's dates) gives way to every name and marker, and each to the one before.
  for (const t of view.querySelectorAll<SVGTextElement>(".fogdates .fogdate")) {
    // Measured each time: the fog's text is patched in place between seasons, so a kept box could be another province's.
    const r = t.getBoundingClientRect();
    if (r.width === 0) continue; // hidden at this zoom
    if (free([r]) && !shown.touches(r)) shown.add(r, null);
    else off.add(t);
  }
  for (const { e, rs } of works) {
    if (free(rs) && rs.every((r) => !shown.touches(r))) place(rs, null);
    else off.add(e);
  }
  for (const w of writes) w();
  // What is left out of the drawing keeps its place's last answer until it comes into view and is placed again.
  view.querySelectorAll(".map .off").forEach((e) => {
    if (!off.delete(e) && e.closest("[data-out]") === null) e.classList.remove("off");
  });
  for (const e of off) e.classList.add("off");

}
