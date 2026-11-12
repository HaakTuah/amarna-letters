import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { Boxes, touch, type Box } from "../src/map/boxes.ts";

// #666: the names' placement asks a grid, not every box placed; its answers must be the scan's, or a name would show or
// give way where it did not before.
describe("Boxes found by where they lie", () => {
  test("answer as a scan of every box does, edges, a filter and boxes too large for the grid included", () => {
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 48271) % 2147483647) / 2147483647);
    const box = (): Box => {
      const left = Math.round(rnd() * 1600 - 400);
      const top = Math.round(rnd() * 1200 - 300);
      // Mostly marker-sized, now and then a name stretched across a zoomed map, and boxes of no width.
      const big = rnd() < 0.05 ? 3000 : 60;
      return { left, top, right: left + Math.round(rnd() * big), bottom: top + Math.round(rnd() * (big / 3)) };
    };
    const grid = new Boxes<number>();
    const all: { box: Box; tag: number }[] = [];
    let hits = 0;
    for (let i = 0; i < 600; i++) {
      const b = box();
      const odd = (t: number): boolean => t % 2 === 1;
      Assert.equal(all.some((k) => touch(b, k.box)), grid.touches(b));
      Assert.equal(all.some((k) => touch(b, k.box) && odd(k.tag)), grid.touches(b, odd));
      if (grid.touches(b)) hits++;
      grid.add(b, i);
      all.push({ box: b, tag: i });
    }
    Assert.true(hits > 100 && hits < 590, `a test that both touches and misses (${hits})`);
    // Sharing an edge is not touching.
    const edge = new Boxes();
    edge.add({ left: 0, top: 0, right: 64, bottom: 64 }, null);
    Assert.false(edge.touches({ left: 64, top: 0, right: 128, bottom: 64 }));
    Assert.true(edge.touches({ left: 63.5, top: 63.5, right: 128, bottom: 128 }));
  });
});
