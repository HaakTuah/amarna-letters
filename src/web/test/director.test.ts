import { describe, test } from "vitest";
import { newThread } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";
import { city } from "../src/map/art.ts";
import { directorShot } from "../src/map/director.ts";
import type { MapMoment } from "../src/map/moments.ts";
import { Paces, paceSeason, type Phase } from "../src/session/pacing.ts";

const moment = (phase: Phase, province: string | null, kind: MapMoment["kind"] = "great"): MapMoment => ({
  phase,
  kind,
  line: `${phase} at ${province}`,
  at: province === null ? null : city(province),
  figure: "clash",
  title: phase,
});

// Item 17+++, part F: the director camera takes the map to the season's scene with the most at stake, from the viewer's
// own threads and moments only; it moves the map, nothing else.
describe("DirectorTests", () => {
  const normal = Paces[1];

  test("It goes to the great moment where the highest-stakes thread is, when that moment plays", () => {
    const t = paceSeason([moment("battle", "byblos"), moment("fall", "sumur"), moment("march", null, "routine")], normal);
    const threads = [newThread({ kind: "siege", province: "byblos", moved: 0.6 }), newThread({ kind: "envoy", province: "babylon", moved: 0.2 })];
    const shot = directorShot(t, threads)!;
    Assert.equal(city("byblos"), shot.at);
    Assert.equal(t.beats.find((b) => b.moment.phase === "battle")!.at, shot.time);
  });

  test("A thread weightier than any moment takes the map to its place as the season begins; troops in a capital come first", () => {
    const t = paceSeason([moment("battle", "byblos")], normal);
    const threads = [newThread({ kind: "siege", province: "byblos", moved: 0.6 }), newThread({ kind: "siege", province: "ashur", moved: 0.1, capital: true })];
    Assert.equal({ at: city("ashur"), time: 0 }, directorShot(t, threads));
  });

  test("With no thread, the season's greatest moment; with nothing placed, nowhere", () => {
    const t = paceSeason([moment("arrival", "babylon"), moment("fall", "sumur")], normal);
    Assert.equal(city("sumur"), directorShot(t, [])!.at);
    Assert.equal(null, directorShot(paceSeason([moment("disaster", null, "news")], normal), [newThread({ kind: "rising" })]));
  });
});
