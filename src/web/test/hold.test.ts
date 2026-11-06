import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";

// Item 17+++a: "Space pauses and unpauses, even while a season plays out". The page's clock holds the season playing out
// and lets it go on from where it stood; the worker's gate stays shut while it is held.
describe("A season held still", () => {
  test("Pausing holds the season, playing again goes on from where it stood, and its end is told only then", async () => {
    const had = { Worker: globalThis.Worker, window: (globalThis as { window?: unknown }).window };
    const sent: { type: string; on?: boolean; index?: number }[] = [];
    globalThis.Worker = class {
      postMessage(m: { type: string }): void {
        sent.push(m);
      }
    } as unknown as typeof Worker;
    (globalThis as { window?: unknown }).window ??= globalThis;
    try {
      const { Session } = await import("../src/session/client.ts");
      const s = new Session();
      // Auto-play on, the worker busy computing ahead, and a season of half a second playing out.
      s.live = { ...s.live, hasRunner: true, auto: true, busy: true };
      const began = performance.now();
      s.playout = { index: 3, viewer: null, play: { timeline: { total: 500 } } as never, began, live: true };
      Assert.true(s.autoPlaying);
      Assert.false(s.canPlay);

      s.setAuto(false);
      Assert.true(s.playoutHeld);
      // The worker says auto-play stopped only once it has computed its season: the page shows it paused already, and it
      // may play on although the worker is busy.
      Assert.false(s.autoPlaying);
      Assert.true(s.canPlay);
      await new Promise((r) => setTimeout(r, 700));
      // Held past its end, the season has not ended: nothing told to the worker.
      Assert.true(s.playout !== null);
      Assert.false(sent.some((m) => m.type === "played"));

      s.setAuto(true);
      Assert.false(s.playoutHeld);
      // It goes on from where it stood: its start moved by the time it was held.
      Assert.true(s.playout!.began - began >= 650);
      await new Promise((r) => setTimeout(r, 600));
      Assert.equal(null, s.playout);
      Assert.true(sent.some((m) => m.type === "played" && m.index === 3));
    } finally {
      globalThis.Worker = had.Worker;
      (globalThis as { window?: unknown }).window = had.window;
    }
  });

  test("A season held still plays on by itself at 'one season on', auto-play staying off", async () => {
    const had = { Worker: globalThis.Worker, window: (globalThis as { window?: unknown }).window };
    const sent: { type: string; on?: boolean }[] = [];
    globalThis.Worker = class {
      postMessage(m: { type: string }): void {
        sent.push(m);
      }
    } as unknown as typeof Worker;
    (globalThis as { window?: unknown }).window ??= globalThis;
    try {
      const { Session } = await import("../src/session/client.ts");
      const s = new Session();
      s.live = { ...s.live, hasRunner: true, auto: true, busy: true };
      s.playout = { index: 1, viewer: null, play: { timeline: { total: 5000 } } as never, began: performance.now(), live: true };
      s.setAuto(false);
      sent.length = 0;
      s.stepForward();
      Assert.false(s.playoutHeld);
      Assert.false(sent.some((m) => m.type === "auto" && m.on === true));
    } finally {
      globalThis.Worker = had.Worker;
      (globalThis as { window?: unknown }).window = had.window;
    }
  });
});
