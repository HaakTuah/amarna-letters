/**
 * The map draws through a renderer interface (Tech stack, "Engine rules"), so the SVG map can give way to a canvas or PixiJS
 * in a later graphical pass without touching the rest: the page hands a renderer the scene and the draft overlays, and
 * hears back which province or person was tapped.
 */
import type { Pt } from "./art.ts";
import type { MapScene, PathStep } from "./scene.ts";

/** What the map shows besides the scene: the selected province, an order's reachable provinces and the draft's arrows. */
export interface MapInput {
  scene: MapScene;
  selected: string | null;
  targets: Set<string> | null;
  arrows: { from: string; to: string; support: boolean }[] | null;
  followId: string | null;
  followPath: PathStep[] | null;
}

export interface MapHandlers {
  onProvince: (id: string) => void;
  onPerson: (id: string) => void;
  /** A crossing's or rough ground's mark (crossings.ts), by its key. */
  onMark: (id: string) => void;
  /** A tap on the map that reached nothing: it closes what is open over the map. */
  onBlank: () => void;
}

export interface MapRenderer {
  /** Draws into the view (an empty element sized by the page). */
  mount(view: HTMLElement, handlers: MapHandlers): void;
  /** Shows a scene; only what changed is drawn again. */
  render(input: MapInput): void;
  zoomBy(factor: number): void;
  fit(): void;
  /** Brings a point of the board into view, zooming in to at least the given zoom. */
  focus(at: Pt, minZoom: number): void;
  /** Where the view is: the board point at its centre, and its zoom (1 is the whole board). */
  getView(): { at: Pt; zoom: number } | null;
  /** Shows a board point at the centre at a zoom: a view kept from before, or a view's opening. */
  setView(at: Pt, zoom: number, animated: boolean): void;
  destroy(): void;
}
