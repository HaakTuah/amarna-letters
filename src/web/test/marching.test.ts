import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { city, lengthOf, roadBetween, route } from "../src/map/art.ts";
import { trailMarkup, travellerRoad, unitRoad } from "../src/map/marching.ts";
import type { SceneMove, SceneTraveller } from "../src/map/scene.ts";

// Item 17+++, part E: the pieces travel their roads, and nothing teleports.
describe("Units drawn as what they are, with weight", () => {
  const near = (a: { x: number; y: number }, b: { x: number; y: number }): boolean => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;

  test("A march goes along its road, from city to city, never straight across", () => {
    const road = unitRoad("Army", "Egypt", "gath", "aijalon", []);
    Assert.true(road !== null);
    Assert.true(near(road![0], city("gath")) && near(road![road!.length - 1], city("aijalon")));
    // The traced road between the two, as the arrow draws it.
    Assert.equal(roadBetween("gath", "aijalon").pts.length, road!.length);
  });

  test("A march thrown back goes out and comes home; a unit that stayed does not move", () => {
    const bounce: SceneMove = { power: "Egypt", kind: "Army", from: "gath", to: "aijalon", style: "Bounce", text: "", against: null } as SceneMove;
    const road = unitRoad("Army", "Egypt", "gath", "gath", [bounce])!;
    Assert.true(near(road[0], city("gath")) && near(road[road.length - 1], city("gath")));
    Assert.true(lengthOf(road) > 0);
    Assert.equal(null, unitRoad("Army", "Egypt", "gath", "gath", []));
    // Another power's march thrown back is not this unit's.
    Assert.equal(null, unitRoad("Army", "Hatti", "gath", "gath", [bounce]));
  });

  test("A traveller goes on from where he was drawn, along his road", () => {
    const t = { fromProvince: "gath", toProvince: "jerusalem", progress: 0.6 } as SceneTraveller;
    const road = travellerRoad(t, 0.2, { x: 0, y: 0 })!;
    const whole = lengthOf(route("gath", "jerusalem"));
    Assert.equal(0.4 * whole, lengthOf(road), 3);
    Assert.equal(null, travellerRoad(t, 0.6, { x: 0, y: 0 }));
  });

  test("A column is as long as its men are many; a fleet draws its wake, a caravan its donkeys", () => {
    const files = (m: string): number => (m.match(/class="file"/g) ?? []).length;
    Assert.true(files(trailMarkup("Army", 1200)) < files(trailMarkup("Army", 5000)));
    Assert.true(files(trailMarkup("Army", 5000)) < files(trailMarkup("Army", 20000)));
    Assert.true(trailMarkup("Army", 5000).includes('class="dust"'));
    Assert.true(trailMarkup("Fleet", 2000).includes("wake"));
    Assert.true(trailMarkup("Caravan", 0).includes("#fig-caravan"));
  });
});
