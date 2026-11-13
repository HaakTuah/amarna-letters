import { describe, test } from "vitest";
import { AllPowers } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { armyStyle, clockwise, figureSymbols, fleetStyle, heelOrigin, pathBounds } from "../src/map/figures.ts";
import { RoadHalves } from "../src/map/built.ts";
import { WorldMap } from "@amarna/engine";

// The living map's figures (item 19): every one drawn as a single path (and a wheel's own), so a phone clones few elements.
describe("FigureTests", () => {
  test("Every figure is one path of clockwise pieces, and a chariot's wheel its own", () => {
    const symbols = figureSymbols().split("</symbol>").filter((x) => x.includes("<symbol"));
    Assert.true(symbols.length >= 14);
    for (const sym of symbols) Assert.true((sym.match(/<path/gu) ?? []).length <= 2, sym.slice(0, 60));
  });

  // #666: the heel turns about its figure's own point without the browser measuring the figure's box.
  test("A path's bounds are its drawn extent: a curve's bulge, not its handles, and steps from the pen", () => {
    // A curve from 0,0 to 10,0 whose handles stand at y 10: it bulges to y 7.5, halfway along.
    const bow = pathBounds("M0,0C0,10 10,10 10,0Z");
    Assert.equal(0, bow.x0, 1e-9);
    Assert.equal(10, bow.x1, 1e-9);
    Assert.equal(0, bow.y0, 1e-9);
    Assert.equal(7.5, bow.y1, 1e-9);
    const steps = pathBounds("M-2,1h4v3H-3l1,-5Z");
    // From -2,1: right 4, down 3, back to x -3, then a step up 5 to -2,-1.
    Assert.equal("-3,-1,2,4", [steps.x0, steps.y0, steps.x1, steps.y1].join(","));
  });

  test("Every power's fleet heels about a point inside its figure's box", () => {
    for (const p of AllPowers) {
      const [x, y] = heelOrigin(p, 20).split(" ").map((v) => Number(v.replace("px", "")));
      Assert.true(x > 0 && x < 20 && y > 0 && y < 20, `${p} (${fleetStyle(p)}): ${heelOrigin(p, 20)}`);
    }
  });

  test("A piece drawn anticlockwise is turned, curves and all", () => {
    // A square drawn anticlockwise on screen, and a bow of two curves likewise.
    Assert.equal("M10,0L10,10L0,10L0,0Z", clockwise("M0,0V10H10V0Z"));
    const bow = clockwise("M-2.6,-11Q1,-6.8 -2.2,-2.6L-1.6,-2.6Q1.8,-6.8 -2,-11Z");
    Assert.equal("M-2,-11Q1.8,-6.8 -1.6,-2.6L-2.2,-2.6Q1,-6.8 -2.6,-11Z", bow);
    Assert.equal(bow, clockwise(bow));
  });

  test("Every power has an army and a fleet style", () => {
    for (const p of AllPowers) {
      Assert.true(armyStyle(p).length > 0);
      Assert.true(fleetStyle(p).length > 0);
    }
  });

  // Pass 3: every road between two land provinces is drawn, each once.
  test("Every land connection has its road drawn, once", () => {
    const m = WorldMap.default;
    const pairs = new Set(m.edges.filter((e) => e.kind !== "Sea" && !m.get(e.a).isSea && !m.get(e.b).isSea).map((e) => [e.a, e.b].sort().join("|")));
    Assert.equal(pairs.size, RoadHalves.length);
    Assert.equal(pairs.size, new Set(RoadHalves.map((r) => [r.a, r.b].sort().join("|"))).size);
  });
});
