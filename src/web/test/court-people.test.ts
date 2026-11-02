import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { outerRing, ringOf, TentHalf, TentRing } from "../src/map/markup.ts";
import type { MapScene } from "../src/map/scene.ts";
import { peopleAtCourts } from "../src/map/tokens.ts";

// The people and news at a court stand clear of its badge (item 11c++); round a besieged city the siege camp's tents are
// part of the badge (item 19), so they stand clear of those too. Found by the smoke test: a captive at besieged Susa stood
// on its tents.
describe("CourtPeopleTests", () => {
  const rings = (besieged: boolean): { people: number; news: number } => {
    const scene = {
      people: [{ id: "c1", kind: "Captive", owner: "Egypt", province: "susa", title: "held", believed: false, double: false }],
      walls: new Map([["susa", 2]]),
      news: [{ province: "susa", kind: "Rumor", title: "A rumour", body: "Word of a siege.", age: 0, observed: 0 }],
      sieges: besieged ? [{ province: "susa", besieger: "Babylonia" }] : [],
      viewer: null,
      index: 0,
    } as unknown as MapScene;
    const svg = peopleAtCourts({ scene, selected: null, targets: null, arrows: null, followId: null, followPath: null });
    const ring = (cls: string): number => Number(new RegExp(`data-court="susa"[^]*?<g class="${cls}" style="--ring:([\\d.]+)"`).exec(svg)![1]);
    return { people: ring("cring"), news: ring("nring") };
  };

  test("A court's people and news stand clear of a siege camp's tents", () => {
    const walls = ringOf(true, 2);
    Assert.equal({ people: walls, news: walls }, rings(false));
    // The tents' middles stand TentRing beyond the outermost ring, and reach TentHalf further.
    const camp = rings(true);
    Assert.equal(outerRing(true, 2, true), camp.people);
    Assert.equal(camp.people, camp.news);
    Assert.true(camp.people >= walls + TentRing + TentHalf - 0.01, "as printed, to two places");
  });
});
