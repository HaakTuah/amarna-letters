import { describe, test } from "vitest";
import { WorldMap } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { Inland, classFor, seasonLayer } from "../src/map/seasons.ts";
import type { MapScene } from "../src/map/scene.ts";

// Item 17+++, part D: the season is the ground's, and its change moves. Every slot stays from season to season, so each look
// can come and go in place; the order of the spreading comes from the map alone.
describe("The land's season under the realms", () => {
  /** A scene as small as the season layer reads: the turn, the land as known (nothing amiss) and the viewer. */
  const at = (turn: number): MapScene => ({ frame: { turn }, land: new Map(), viewer: null }) as unknown as MapScene;
  const slots = (markup: string): string[] => [...markup.matchAll(/data-slot="" class="([^"]*)"/g)].map((m) => m[1]!);

  test("Every season draws the same slots, so a change is written in place", () => {
    const counts = [1, 2, 3].map((t) => slots(seasonLayer(at(t))).length);
    Assert.true(counts[0]! > 0);
    Assert.equal(counts[0], counts[1]);
    Assert.equal(counts[1], counts[2]);
    // Snow and storms only in Peret, the winter (turn 2, the second season of the year).
    const winter = slots(seasonLayer(at(2)));
    Assert.equal(3, winter.filter((c) => c === "snow").length);
    Assert.equal(1, winter.filter((c) => c === "storms").length);
    Assert.equal(0, slots(seasonLayer(at(3))).filter((c) => c === "snow" || c === "storms").length);
  });

  test("A look the season leaves keeps its look, marked gone, and a slot never shown stays none", () => {
    Assert.equal("green gone", classFor("green", "none"));
    Assert.equal("green gone", classFor("green gone", "none"));
    Assert.equal("none", classFor("none", "none"));
    Assert.equal("dry", classFor("green gone", "dry"));
    Assert.equal("ripe", classFor("green", "ripe"));
  });

  test("The green spreads from the coast inland: every coast first, every province ranked between 0 and 1", () => {
    const land = WorldMap.default.landProvinces.filter((p) => Inland.has(p.id));
    Assert.true(land.length > 0);
    for (const p of land) {
      const r = Inland.get(p.id)!;
      Assert.true(r >= 0 && r <= 1, `${p.id}: ${r}`);
      if (p.isCoastal) Assert.true(r === 0, p.id);
    }
    Assert.true(land.some((p) => Inland.get(p.id) === 1), "no province lies farthest inland");
  });
});
