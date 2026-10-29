/**
 * Where a place is drawn on the board (build order item 11c, "The map in true geography, and its look in time"): a true
 * projection of the region, as Imperator: Rome's map has it, in place of the folded board drawn by hand before. Mercator,
 * so coasts keep their shapes and north is up everywhere, over the frame from the Aegean shore to the Gulf and from the
 * Black Sea to Nubia. Drawing only, so it lives with the drawing, not the engine: the lengths of connections come from
 * latitude and longitude and the attested roads (the engine's `distance.ts`), never from the board.
 */

/** The board's frame in degrees, and its width in map units (its height follows from the projection). */
export const BoardFrame = { west: 25.8, east: 51.2, north: 42.3, south: 20.0, width: 1000 } as const;

const rad = Math.PI / 180;
const mercator = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2));
/** Map units per radian of longitude. */
const scale = BoardFrame.width / ((BoardFrame.east - BoardFrame.west) * rad);
const top = mercator(BoardFrame.north);

/** A place's point on the board, from its latitude and longitude, in map units (x east, y south). */
export function boardPoint(lat: number, lon: number): { x: number; y: number } {
  return { x: Math.round((lon - BoardFrame.west) * rad * scale * 10) / 10, y: Math.round((top - mercator(lat)) * scale * 10) / 10 };
}

export const BoardWidth = BoardFrame.width;
export const BoardHeight = Math.round((top - mercator(BoardFrame.south)) * scale);
