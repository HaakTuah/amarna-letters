import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { along, between, city, route, type Pt } from "../src/map/art.ts";
import { traceOf, type PathStep } from "../src/map/scene.ts";

/** A step of a follow path: at a province, or on the road between two, so far along. */
const at = (index: number, province: string): PathStep => ({ index, at: city(province), where: "", on: { province } });
const onRoad = (index: number, from: string, to: string, progress: number): PathStep => ({ index, at: along(route(from, to), progress), where: "", on: { from, to, progress } });
const near = (p: Pt, q: Pt): boolean => Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6;
/** Whether every point of a line is a corner of one of the roads, or one of the given ends. */
const onRoads = (line: readonly Pt[], roads: readonly (readonly Pt[])[], ends: readonly Pt[]): boolean =>
  line.every((p) => ends.some((q) => near(p, q)) || roads.some((r) => r.some((q) => near(p, q))));

describe("FollowTraceTests", () => {
  test("A stretch of road keeps the road's own corners, either way along it", () => {
    const road = route("thebes", "delta");
    const ahead = between(road, 0.2, 0.6);
    Assert.true(ahead.length > 2);
    Assert.equal(along(road, 0.2), ahead[0]);
    Assert.equal(along(road, 0.6), ahead[ahead.length - 1]);
    Assert.true(onRoads(ahead.slice(1, -1), [road], []));
    Assert.equal([...ahead].reverse(), between(road, 0.6, 0.2));
  });

  test("A follow line runs along the roads between the person's known places, never straight across the land", () => {
    // Two places three provinces apart: the line is the road between them, every bend of it, not their two points.
    const road = route("thebes", "delta");
    Assert.true(road.length > 2);
    Assert.equal(road, traceOf([at(0, "thebes"), at(1, "delta")]));
    // Two seasons on one road: the stretch of it between the two places he was seen.
    Assert.equal(between(road, 0.2, 0.6), traceOf([onRoad(0, "thebes", "delta", 0.2), onRoad(1, "thebes", "delta", 0.6)]));
    // From one road onto the next: through the place where they meet, along both roads only.
    const last = onRoad(1, "delta", "gaza", 0.5);
    const two = traceOf([onRoad(0, "thebes", "delta", 0.5), last]);
    Assert.true(two.some((p) => near(p, city("delta"))));
    Assert.true(onRoads(two, [road, route("delta", "gaza")], [along(road, 0.5), last.at]));
    Assert.equal(last.at, two[two.length - 1]);
    // A second journey on the same road, seen less far along: back to the road's start, then out again.
    const again = traceOf([onRoad(0, "thebes", "delta", 0.6), onRoad(1, "thebes", "delta", 0.2)]);
    Assert.true(again.some((p) => near(p, city("thebes"))));
    Assert.equal(along(road, 0.2), again[again.length - 1]);
  });

  test("A follow line never runs past the last place the seat knew him, nor to a place he is not known to have reached", () => {
    // On the road to the Delta when last known: the line stops there, not at the Delta.
    const last = onRoad(1, "thebes", "delta", 0.4);
    const line = traceOf([at(0, "thebes"), last]);
    Assert.equal(last.at, line[line.length - 1]);
    Assert.equal(city("thebes"), line[0]);
    // Seen just out of Thebes, then back at Thebes: he turned back, so the line never reaches the Delta.
    const back = traceOf([onRoad(0, "thebes", "delta", 0.1), at(1, "thebes")]);
    Assert.equal(between(route("thebes", "delta"), 0.1, 0), back);
    Assert.false(back.some((p) => near(p, city("delta"))));
  });
});
