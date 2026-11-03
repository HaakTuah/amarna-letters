/**
 * Item 17+++, "the season plays out": how far the worker may play ahead of the page. The page says when it has played a
 * season out (`played`, by its frame's index); auto-play computes the next season while the page plays the one before, and
 * goes no further, so a slow page never piles up seasons and a fast one never waits.
 */
export class PageGate {
  /** The newest season the page has played out, by its frame's index (-1: none yet). */
  private played = -1;
  private waiting: (() => void) | null = null;

  /** A new or loaded game: the page has played nothing of it yet. */
  reset(): void {
    this.played = -1;
  }

  /** The page has played out the season of this frame index. */
  told(index: number): void {
    if (index > this.played) this.played = index;
    this.wake();
  }

  /**
   * Whether the season after the `taken` frames may be played: while the page plays the season before it, one ahead of what
   * it shows and no more. With a human seat awake (`ahead` false), not even that: he is asked for his orders once he has
   * seen the season play out.
   */
  ready(taken: number, ahead: boolean): boolean {
    return taken <= this.played + (ahead ? 2 : 1);
  }

  /** Waits until `ready` holds, or `go` no longer does (auto-play stopped). */
  async wait(go: () => boolean, ready: () => boolean): Promise<void> {
    while (go() && !ready()) await new Promise<void>((done) => (this.waiting = done));
  }

  /** Lets a wait look again: the page answered, or auto-play stopped. */
  wake(): void {
    const done = this.waiting;
    this.waiting = null;
    done?.();
  }
}
