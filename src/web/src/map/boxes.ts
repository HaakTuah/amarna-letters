/**
 * Boxes on the screen, found by where they lie (#666): the names' placement (svg-renderer.ts, `placeNamesNow`) asks, for
 * each marker and name, whether it touches any box placed before it, and a scan of every box placed made that some 10 ms
 * a placement on a slow phone. The answers are the scan's: each box is kept in the cells of a grid it lies over, and only
 * those of the cells a question covers are looked at.
 */

/** A box as the screen measures it (a `DOMRect`). */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Whether two boxes overlap (sharing an edge is not touching). */
export const touch = (a: Box, b: Box): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** A grid cell's side, in screen pixels: about a marker's size. */
const Cell = 64;
/** A box over more cells than this is kept apart and looked at by every question (a name stretched across a zoomed map). */
const MostCells = 64;

interface Kept<T> {
  box: Box;
  tag: T;
}

export class Boxes<T = null> {
  private readonly cells = new Map<number, Kept<T>[]>();
  private readonly large: Kept<T>[] = [];

  /** The cells a box lies over, or null when there are too many. */
  private static span(b: Box): [number, number, number, number] | null {
    const x0 = Math.floor(b.left / Cell), x1 = Math.floor(b.right / Cell);
    const y0 = Math.floor(b.top / Cell), y1 = Math.floor(b.bottom / Cell);
    return (x1 - x0 + 1) * (y1 - y0 + 1) > MostCells ? null : [x0, x1, y0, y1];
  }

  private static key(x: number, y: number): number {
    return x * 1_000_003 + y;
  }

  add(box: Box, tag: T): void {
    // Copied out of the DOMRect: its getters are calls into the browser.
    const kept = { box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom }, tag };
    const s = Boxes.span(kept.box);
    if (s === null) {
      this.large.push(kept);
      return;
    }
    for (let x = s[0]; x <= s[1]; x++)
      for (let y = s[2]; y <= s[3]; y++) {
        const k = Boxes.key(x, y);
        const list = this.cells.get(k);
        if (list === undefined) this.cells.set(k, [kept]);
        else list.push(kept);
      }
  }

  /** Whether any box kept touches `box`, of those whose tag `which` accepts (all, without it). */
  touches(box: Box, which?: (tag: T) => boolean): boolean {
    const b = { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    const hit = (k: Kept<T>): boolean => touch(b, k.box) && (which === undefined || which(k.tag));
    if (this.large.some(hit)) return true;
    const s = Boxes.span(b);
    if (s === null) return [...this.cells.values()].some((list) => list.some(hit));
    for (let x = s[0]; x <= s[1]; x++)
      for (let y = s[2]; y <= s[3]; y++) if (this.cells.get(Boxes.key(x, y))?.some(hit) === true) return true;
    return false;
  }
}
