/**
 * Work that can wait for the page's spare time (#666): run between frames, in what is left of a frame once it is drawn,
 * so it never stands between two frames that are due. On a slow phone at Fast the state's read, in timer tasks back to
 * back, sat in four of five long frames, 10 ms each.
 */

/** The longest the work waits for spare time on a page that has none: it then runs anyway, so it never starves. */
const WaitMs = 50;
/** The shortest slice worth starting. */
const LeastMs = 2;

/**
 * Runs `run` when the page next has time to spare, telling it how many milliseconds it may take (at most `mostMs`). Where
 * the browser cannot say when it is idle (Safari), it runs in a task of its own, as the read always did.
 */
export function whenIdle(run: (spareMs: number) => void, mostMs: number): void {
  if (typeof requestIdleCallback !== "function") {
    setTimeout(() => run(mostMs), 0);
    return;
  }
  requestIdleCallback((d) => run(d.didTimeout ? mostMs : Math.max(LeastMs, Math.min(mostMs, d.timeRemaining()))), { timeout: WaitMs });
}
