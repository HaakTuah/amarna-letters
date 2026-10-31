import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import type { Pt } from "../map/art.ts";
import type { MapInput, MapRenderer } from "../map/renderer.ts";
import { SvgMapRenderer } from "../map/svg-renderer.ts";

export interface MapHandle {
  /** Brings a point of the board into view (following a character, or a province chosen from the list). */
  focus(at: Pt, minZoom?: number): void;
  /** Where the map is looking now (the world's sound bed follows it, item 19+++). */
  view(): MapView | null;
}

/** Where a view of the map was left: its centre on the board and its zoom. */
export interface MapView {
  at: Pt;
  zoom: number;
}

/**
 * Each view's place, kept for the page's life and the tab's (item 11c+: "every view keeps its zoom and place when left and
 * come back to within a game"), by the key the page gives it (the game and whose eyes).
 */
const kept = new Map<string, MapView>();
const KeptKey = "amarna-map-views";
try {
  for (const [k, v] of Object.entries(JSON.parse(sessionStorage.getItem(KeptKey) ?? "{}") as Record<string, MapView>)) kept.set(k, v);
} catch {
  // no storage: views are kept for the page's life only
}
function keep(key: string, v: MapView | null): void {
  if (v === null) return;
  kept.set(key, v);
  try {
    sessionStorage.setItem(KeptKey, JSON.stringify(Object.fromEntries([...kept].slice(-40))));
  } catch {
    // as above
  }
}

/**
 * The board, drawn by a renderer outside React: the static geography is written once, each layer above it redraws only
 * when what it shows changes, and pinch, pan and wheel zoom move one layer on the GPU without a render. Overlays (the
 * legend, cards) are children, drawn over the map outside the zoomed layer. `viewKey` names the view (the game and whose
 * eyes): coming back to it returns to where it was left; a view never seen opens at `opening`.
 */
export function GameMap({
  input,
  viewKey,
  opening,
  onProvince,
  onPerson,
  onMark,
  onBlank,
  children,
  ref,
}: {
  input: MapInput;
  viewKey: string;
  opening: MapView | null;
  onProvince: (id: string) => void;
  onPerson: (id: string) => void;
  onMark: (id: string, province: string | null) => void;
  onBlank: () => void;
  children?: ReactNode;
  ref?: Ref<MapHandle>;
}) {
  const view = useRef<HTMLDivElement>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const handlers = useRef({ onProvince, onPerson, onMark, onBlank });
  handlers.current = { onProvince, onPerson, onMark, onBlank };
  // The view before "show the whole map", to come back to.
  const [back, setBack] = useState<MapView | null>(null);
  const key = useRef(viewKey);
  key.current = viewKey;

  useEffect(() => {
    const r = new SvgMapRenderer();
    r.mount(view.current!, {
      onProvince: (id) => handlers.current.onProvince(id),
      onPerson: (id) => handlers.current.onPerson(id),
      onMark: (id, province) => handlers.current.onMark(id, province),
      onBlank: () => handlers.current.onBlank(),
    });
    renderer.current = r;
    // For the map's checks in a development build: the renderer, to zoom and focus from a test.
    if (import.meta.env.DEV) (window as unknown as { __map?: MapRenderer }).__map = r;
    return () => {
      keep(key.current, r.getView());
      r.destroy();
      renderer.current = null;
    };
  }, []);

  useEffect(() => {
    renderer.current?.render(input);
  });

  // A view returns to where it was left, or opens at its opening; the view left is kept.
  useEffect(() => {
    const r = renderer.current;
    if (r === null) return;
    const v = kept.get(viewKey) ?? opening;
    if (v !== null) r.setView(v.at, v.zoom, false);
    setBack(null);
    return () => keep(viewKey, r.getView());
  }, [viewKey]);

  useImperativeHandle(ref, () => ({ focus: (at, minZoom = 1) => renderer.current?.focus(at, minZoom), view: () => renderer.current?.getView() ?? null }), []);

  // One button shows the whole map, and the same button returns to where the map was.
  const whole = (): void => {
    const r = renderer.current;
    if (r === null) return;
    const now = r.getView();
    if (back !== null) {
      r.setView(back.at, back.zoom, true);
      setBack(null);
    } else {
      setBack(now !== null && now.zoom > 1.01 ? now : null);
      r.fit();
    }
  };

  return (
    <div className="mapview lod1" ref={view}>
      <div className="map-ui zoombtns">
        <button className="zb" title="Zoom in" aria-label="Zoom in" onClick={() => renderer.current?.zoomBy(1.6)}>
          +
        </button>
        <button className="zb" title="Zoom out" aria-label="Zoom out" onClick={() => renderer.current?.zoomBy(1 / 1.6)}>
          −
        </button>
        {back !== null ? (
          <button className="zb fit back" title="Back to where you were" aria-label="Back to where you were" onClick={whole}>
            ↩
          </button>
        ) : (
          <button className="zb fit" title="Show the whole map" aria-label="Show the whole map" onClick={whole}>
            ⤢
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
