import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { ringOf } from "../src/map/markup.ts";
import type { MapScene } from "../src/map/scene.ts";
import { peopleAtCourts } from "../src/map/svg-renderer.ts";

// The people at a court stand clear of its badge (item 11c++); round a besieged city the siege camp's tents are part of the
// badge (item 19), so they stand clear of those too. Found by the smoke test: a captive at besieged Susa stood on its tents.
describe("CourtPeopleTests", () => {
  const ringFor = (besieged: boolean): number => {
    const scene = {
      people: [{ id: "c1", kind: "Captive", owner: "Egypt", province: "susa", title: "held", believed: false, double: false }],
      walls: new Map([["susa", 2]]),
      news: [],
      sieges: besieged ? [{ province: "susa", besieger: "Babylonia" }] : [],
      viewer: null,
      index: 0,
    } as unknown as MapScene;
    const svg = peopleAtCourts({ scene, selected: null, targets: null, arrows: null, followId: null, followPath: null });
    return Number(/data-court="susa"[^>]*><g class="cring" style="--ring:([\d.]+)"/.exec(svg)![1]);
  };

  test("A court's people stand clear of a siege camp's tents", () => {
    const walls = ringOf(true, 2);
    Assert.equal(walls, ringFor(false));
    // The tents stand 2.6 beyond the outermost ring, to their middle, and are 5.2 wide.
    Assert.true(ringFor(true) >= walls + 5.2);
  });
});
