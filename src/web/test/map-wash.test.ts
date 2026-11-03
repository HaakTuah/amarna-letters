import { describe, test } from "vitest";
import { washAt } from "../src/map/wash.ts";
import { Assert } from "../../engine/test/support.ts";

// Item 17+++: zoom shapes the realms' colours: full when zoomed out, thinning step by step to almost nothing but their
// borders and banners when zoomed in.
describe("MapWashTests", () => {
  test("The realms' colours are full zoomed out, thin as the map is zoomed in, and least when zoomed right in", () => {
    Assert.equal(1.6, washAt(0.2));
    Assert.equal(1.6, washAt(0.45));
    Assert.equal(0.2, washAt(3));
    Assert.equal(0.2, washAt(24));
    // Never thicker for a closer view.
    let last = Infinity;
    for (let s = 0.1; s <= 6; s *= 1.1) {
      const w = washAt(s);
      Assert.true(w <= last);
      last = w;
    }
  });

  test("It moves in a few steps, so the realms are painted again only when a zoom crosses one", () => {
    const seen = new Set<number>();
    for (let s = 0.1; s <= 6; s *= 1.01) seen.add(washAt(s));
    Assert.equal(9, seen.size);
  });
});
