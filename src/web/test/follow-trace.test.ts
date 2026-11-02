import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { along, city, route } from "../src/map/art.ts";
import { traceOf, type PathStep } from "../src/map/scene.ts";

/** A step of a follow path: at a province, or on the road between two, so far along. */
const at = (index: number, province: string): PathStep => ({ index, at: city(province), where: "", on: { province } });
const onRoad = (index: number, from: string, to: string, progress: number): PathStep => ({ index, at: along(route(from, to), progress), where: "", on: { from, to, progress } });

describe("FollowTraceTests", () => {
  test("A follow line runs along the roads between the person's known places, never straight across the land", () => {
    // Two places three provinces apart: the line is the road between them, every bend of it, not their two points.
    const road = route("thebes", "delta");
    Assert.true(road.length > 2);
    Assert.equal(road, traceOf([at(0, "thebes"), at(1, "delta")]));
    // Two seasons on one road: the stretch of it between the two places he was seen, ending where he was last known.
    const twice = traceOf([onRoad(0, "thebes", "delta", 0.2), onRoad(1, "thebes", "delta", 0.6)]);
    Assert.equal(along(road, 0.2), twice[0]);
    Assert.equal(along(road, 0.6), twice[twice.length - 1]);
    Assert.true(twice.length >= 2);
  });

  test("A follow line never runs past the last place the seat knew him", () => {
    // On the road to the Delta when last known: the line stops there, not at the Delta.
    const last = onRoad(1, "thebes", "delta", 0.4);
    const line = traceOf([at(0, "thebes"), last]);
    Assert.equal(last.at, line[line.length - 1]);
    Assert.equal(city("thebes"), line[0]);
  });
});
