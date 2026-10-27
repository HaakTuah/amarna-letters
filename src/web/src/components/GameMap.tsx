import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import type { Pt } from "../map/art.ts";
import type { MapInput, MapRenderer } from "../map/renderer.ts";
import { SvgMapRenderer } from "../map/svg-renderer.ts";

export interface MapHandle {
  /** Brings a point of the board into view (following a character, or a province chosen from the list). */
  focus(at: Pt, minZoom?: number): void;
}

/**
 * The board, drawn by a renderer outside React: the static geography is written once, each layer above it redraws only
 * when what it shows changes, and pinch, pan and wheel zoom move one layer on the GPU without a render. Overlays (the
 * legend, cards) are children, drawn over the map outside the zoomed layer.
 */
export function GameMap({
  input,
  onProvince,
  onPerson,
  children,
  ref,
}: {
  input: MapInput;
  onProvince: (id: string) => void;
  onPerson: (id: string) => void;
  children?: ReactNode;
  ref?: Ref<MapHandle>;
}) {
  const view = useRef<HTMLDivElement>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const handlers = useRef({ onProvince, onPerson });
  handlers.current = { onProvince, onPerson };

  useEffect(() => {
    const r = new SvgMapRenderer();
    r.mount(view.current!, { onProvince: (id) => handlers.current.onProvince(id), onPerson: (id) => handlers.current.onPerson(id) });
    renderer.current = r;
    return () => {
      r.destroy();
      renderer.current = null;
    };
  }, []);

  useEffect(() => {
    renderer.current?.render(input);
  });

  useImperativeHandle(ref, () => ({ focus: (at, minZoom = 1) => renderer.current?.focus(at, minZoom) }), []);

  return (
    <div className="mapview lod1" ref={view}>
      <div className="map-ui zoombtns">
        <button className="zb" title="Zoom in" aria-label="Zoom in" onClick={() => renderer.current?.zoomBy(1.6)}>
          +
        </button>
        <button className="zb" title="Zoom out" aria-label="Zoom out" onClick={() => renderer.current?.zoomBy(1 / 1.6)}>
          −
        </button>
        <button className="zb fit" title="Show the whole map" aria-label="Show the whole map" onClick={() => renderer.current?.fit()}>
          ⤢
        </button>
      </div>
      {children}
    </div>
  );
}
