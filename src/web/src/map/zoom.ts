// @ts-nocheck
// Pinch-zoom and pan for the map (ported unchanged from the C# app's mapzoom.js): the gesture moves one transformed
// layer on the GPU, and only when it settles are the map's symbol and label sizes recomputed (CSS variables).

import { BoardHeight, BoardWidth } from "./projection.ts";

const MAP_W = BoardWidth, MAP_H = BoardHeight, MAX_ZOOM = 24;
const states = new WeakMap();
const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/// `onSettle(scale)`: called when a gesture settles, with the screen pixels a map unit now takes (item 11c+: names and
/// counters are laid out again for it).
export function attach(view, onSettle) {
  if (!view || states.has(view)) return;
  const layer = view.querySelector(".mapzoom");
  const st = { onSettle, view, layer, x: 0, y: 0, s: 1, pointers: new Map(), start: null, moved: false, frame: 0, settle: 0, lastTap: null, base: 1 };
  states.set(view, st);

  const onDown = e => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
    if (e.target.closest && e.target.closest(".map-ui")) return; // buttons and cards over the map
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    begin(st);
    if (st.pointers.size === 1) { st.moved = false; st.downAt = performance.now(); st.downPos = { x: e.clientX, y: e.clientY }; }
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };
  const onMove = e => {
    if (!st.pointers.has(e.pointerId)) return;
    st.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (st.downPos && Math.hypot(e.clientX - st.downPos.x, e.clientY - st.downPos.y) > 7) st.moved = true;
    if (st.moved || st.pointers.size > 1) { e.preventDefault(); track(st); }
  };
  const onUp = e => {
    if (!st.pointers.has(e.pointerId)) return;
    st.pointers.delete(e.pointerId);
    if (st.pointers.size > 0) { begin(st); return; }
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    if (st.moved) { st.swallow = performance.now(); }
    else if (e.pointerType === "touch") {
      // A double tap zooms in where it falls.
      const now = performance.now();
      if (st.lastTap && now - st.lastTap.t < 320 && Math.hypot(e.clientX - st.lastTap.x, e.clientY - st.lastTap.y) < 30) {
        zoomAt(st, 2, e.clientX, e.clientY, true);
        st.lastTap = null;
      } else st.lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
    st.start = null;
    settle(st);
  };
  const onClick = e => {
    if (st.swallow && performance.now() - st.swallow < 400) { e.stopPropagation(); e.preventDefault(); st.swallow = 0; }
  };
  const onWheel = e => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018));
    zoomAt(st, factor, e.clientX, e.clientY, false);
  };
  const onDbl = e => { if (!(e.target.closest && e.target.closest(".map-ui"))) zoomAt(st, 2, e.clientX, e.clientY, true); };

  view.addEventListener("pointerdown", onDown);
  view.addEventListener("click", onClick, true);
  view.addEventListener("wheel", onWheel, { passive: false });
  view.addEventListener("dblclick", onDbl);
  st.ro = new ResizeObserver(() => { clamp(st); apply(st); settle(st, true); });
  st.ro.observe(view);
  st.detach = () => {
    view.removeEventListener("pointerdown", onDown);
    view.removeEventListener("click", onClick, true);
    view.removeEventListener("wheel", onWheel);
    view.removeEventListener("dblclick", onDbl);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    st.ro.disconnect();
  };
  settle(st, true);
}

export function detach(view) {
  const st = states.get(view);
  if (st) { st.detach(); states.delete(view); }
}

export function zoomBy(view, factor) {
  const st = states.get(view);
  if (!st) return;
  const r = view.getBoundingClientRect();
  zoomAt(st, factor, r.left + r.width / 2, r.top + r.height / 2, true);
}

export function reset(view) {
  const st = states.get(view);
  if (!st) return;
  animate(st, () => { st.s = 1; st.x = 0; st.y = 0; clamp(st); });
}

/// Where the view is: the map point at its centre and its zoom (1 shows the whole board).
export function getView(view) {
  const st = states.get(view);
  if (!st) return null;
  const g = geometry(st);
  return { x: ((g.w / 2 - st.x) / st.s - g.ox) / g.b, y: ((g.h / 2 - st.y) / st.s - g.oy) / g.b, zoom: st.s };
}

/// Centres the view on a map point at a zoom (a view kept from before, or a view's opening).
export function setView(view, mx, my, zoom, animated) {
  const st = states.get(view);
  if (!st) return;
  const change = () => {
    const g = geometry(st);
    st.s = Math.min(MAX_ZOOM, Math.max(1, zoom));
    st.x = g.w / 2 - st.s * (g.ox + mx * g.b);
    st.y = g.h / 2 - st.s * (g.oy + my * g.b);
    clamp(st);
  };
  if (animated) animate(st, change);
  else { change(); apply(st); settle(st, true); }
}

/// Brings a map point into view, zooming in to at least the given zoom (used to follow a character or a province).
export function focus(view, mx, my, minZoom) {
  const st = states.get(view);
  if (!st) return;
  const r = view.getBoundingClientRect();
  const g = geometry(st);
  animate(st, () => {
    st.s = Math.max(st.s, minZoom || 1);
    const px = g.ox + mx * g.b, py = g.oy + my * g.b;
    const sx = st.x + st.s * px, sy = st.y + st.s * py;
    // Only move if the point is out of view or near an edge.
    if (sx < r.width * 0.15 || sx > r.width * 0.85 || sy < r.height * 0.15 || sy > r.height * 0.85) {
      st.x = r.width / 2 - st.s * px;
      st.y = r.height / 2 - st.s * py;
    }
    clamp(st);
  });
}

function geometry(st) {
  const w = st.view.clientWidth, h = st.view.clientHeight;
  const b = Math.min(w / MAP_W, h / MAP_H);
  return { w, h, b, ox: (w - MAP_W * b) / 2, oy: (h - MAP_H * b) / 2 };
}

function begin(st) {
  const pts = [...st.pointers.values()];
  st.start = { x: st.x, y: st.y, s: st.s, pts: pts.map(p => ({ ...p })) };
  st.layer.style.willChange = "transform";
}

function track(st) {
  const s0 = st.start;
  if (!s0) return;
  const r = st.view.getBoundingClientRect();
  const pts = [...st.pointers.values()];
  if (pts.length >= 2 && s0.pts.length >= 2) {
    const d0 = Math.hypot(s0.pts[0].x - s0.pts[1].x, s0.pts[0].y - s0.pts[1].y) || 1;
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    const m0 = { x: (s0.pts[0].x + s0.pts[1].x) / 2 - r.left, y: (s0.pts[0].y + s0.pts[1].y) / 2 - r.top };
    const m = { x: (pts[0].x + pts[1].x) / 2 - r.left, y: (pts[0].y + pts[1].y) / 2 - r.top };
    const s = Math.min(MAX_ZOOM, Math.max(1, s0.s * d / d0));
    const cx = (m0.x - s0.x) / s0.s, cy = (m0.y - s0.y) / s0.s;
    st.s = s; st.x = m.x - cx * s; st.y = m.y - cy * s;
  } else if (pts.length === 1 && s0.pts.length >= 1) {
    st.x = s0.x + (pts[0].x - s0.pts[0].x);
    st.y = s0.y + (pts[0].y - s0.pts[0].y);
  }
  clamp(st);
  schedule(st);
}

function zoomAt(st, factor, clientX, clientY, animated) {
  const r = st.view.getBoundingClientRect();
  const px = clientX - r.left, py = clientY - r.top;
  const change = () => {
    const s = Math.min(MAX_ZOOM, Math.max(1, st.s * factor));
    const cx = (px - st.x) / st.s, cy = (py - st.y) / st.s;
    st.s = s; st.x = px - cx * s; st.y = py - cy * s;
    clamp(st);
  };
  if (animated) animate(st, change);
  else { st.layer.style.willChange = "transform"; change(); schedule(st); settle(st); }
}

function animate(st, change) {
  const smooth = !reduced();
  if (smooth) st.layer.classList.add("glide");
  change();
  apply(st);
  clearTimeout(st.glideTimer);
  st.glideTimer = setTimeout(() => st.layer.classList.remove("glide"), 260);
  settle(st);
}

// The scaled map always covers the view where it can, and is centred where it cannot.
function clamp(st) {
  const g = geometry(st);
  const mw = MAP_W * g.b * st.s, mh = MAP_H * g.b * st.s;
  const left = st.x + st.s * g.ox, top = st.y + st.s * g.oy;
  if (mw <= g.w) st.x = (g.w - mw) / 2 - st.s * g.ox;
  else st.x = Math.min(-st.s * g.ox, Math.max(g.w - mw - st.s * g.ox, st.x));
  if (mh <= g.h) st.y = (g.h - mh) / 2 - st.s * g.oy;
  else st.y = Math.min(-st.s * g.oy, Math.max(g.h - mh - st.s * g.oy, st.y));
  void left; void top;
}

function schedule(st) {
  if (st.frame) return;
  st.frame = requestAnimationFrame(() => { st.frame = 0; apply(st); });
}

function apply(st) {
  st.layer.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) scale(${st.s})`;
}

// When the gesture settles: let the browser redraw the map crisply, and size symbols and labels for the new scale.
function settle(st, now) {
  clearTimeout(st.settle);
  const run = () => {
    if (st.pointers.size > 0) return;
    st.layer.style.willChange = "auto";
    const g = geometry(st);
    const s = g.b * st.s; // screen pixels per map unit
    const v = st.view.style;
    // On screen, tokens are about 14 pixels on a phone showing the whole board, 22 on a desktop, and grow gently to 40
    // when zoomed in; cities 7 to 22 pixels across; names 10 to 19 pixels; lines 2 to 8. Enough to read at a glance,
    // little enough to leave the board in view, and never ballooning with the zoom.
    const clampTo = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    v.setProperty("--sym", (clampTo(9 + 12 * s, 14, 40) / (22 * s)).toFixed(3));
    v.setProperty("--cs", (clampTo(4 + 9 * s, 7, 22) / (15 * s)).toFixed(3));
    v.setProperty("--lab", (clampTo(7.5 + 6 * s, 10, 19) / (12.5 * s)).toFixed(3));
    v.setProperty("--k", (clampTo(1.6 + 1.6 * s, 2, 8) / (3 * s)).toFixed(3));
    const lod = s < 0.55 ? 0 : s < 1.35 ? 1 : 2;
    st.view.classList.toggle("lod0", lod === 0);
    st.view.classList.toggle("lod1", lod === 1);
    st.view.classList.toggle("lod2", lod === 2);
    st.view.dataset.zoom = st.s.toFixed(2);
    // Names give way to each other and to the pieces, and counters gather or open, for the new scale (the renderer).
    if (st.onSettle) st.onSettle(s);
  };
  if (now) run(); else st.settle = setTimeout(run, 140);
}
