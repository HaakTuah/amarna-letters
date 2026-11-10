/**
 * The map draws through a renderer interface (Tech stack, "Engine rules"), so the SVG map can give way to a canvas or PixiJS
 * in a later graphical pass without touching the rest: the page hands a renderer the scene and the draft overlays, and
 * hears back which province or person was tapped.
 */
import type { MapMode } from "./holding.ts";
import type { UnitKind } from "@amarna/engine";
import type { Pt } from "./art.ts";
import type { MapScene, PathStep } from "./scene.ts";
import type { SeasonPlay } from "./moments.ts";

/** What the map shows besides the scene: the selected province, an order's reachable provinces and the draft's arrows. */
export interface MapInput {
  scene: MapScene;
  selected: string | null;
  targets: Set<string> | null;
  arrows: { from: string; to: string; support: boolean; kind: UnitKind }[] | null;
  followId: string | null;
  followPath: PathStep[] | null;
  /** Item 17++, part C: the map's view, who holds what (default) or the mood of the land. */
  mode?: MapMode;
  /** Item 17+++: the season shown, playing out since `began` (`performance.now()`), if it is. */
  playout?: { play: SeasonPlay; began: number } | null;
  /** The season playing out held still (Space or the pause button mid-season, item 17+++a): its pieces stop where they are. */
  held?: boolean;
}

export interface MapHandlers {
  onProvince: (id: string) => void;
  onPerson: (id: string) => void;
  /** A crossing's or rough ground's mark (crossings.ts), by its key, with the province under it. */
  onMark: (id: string, province: string | null) => void;
  /** A tap on the map that reached nothing: it closes what is open over the map. */
  onBlank: () => void;
}

export interface MapRenderer {
  /** Draws into the view (an empty element sized by the page). */
  mount(view: HTMLElement, handlers: MapHandlers): void;
  /** Shows a scene; only what changed is drawn again. */
  render(input: MapInput): void;
  zoomBy(factor: number): void;
  /** Moves the view a step: fractions of its width and height (the keys W, A, S, D and the arrows, item 17+++a). */
  panBy(dx: number, dy: number): void;
  fit(): void;
  /** Brings a point of the board into view, zooming in to at least the given zoom; `centre` puts it in the middle. */
  focus(at: Pt, minZoom: number, centre?: boolean): void;
  /** Where the view is: the board point at its centre, and its zoom (1 is the whole board where the screen allows). */
  /** Where the view is; `whole` when it is as far out as it may go. */
  getView(): { at: Pt; zoom: number; whole?: boolean } | null;
  /** Shows a board point at the centre at a zoom: a view kept from before, or a view's opening. */
  setView(at: Pt, zoom: number, animated: boolean): void;
  destroy(): void;
}
