import { describe, test } from "vitest";
import { AllPowers } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { armyStyle, clockwise, figureSymbols, fleetStyle } from "../src/map/figures.ts";

// The living map's figures (item 19): every one drawn as a single path (and a wheel's own), so a phone clones few elements.
describe("FigureTests", () => {
  test("Every figure is one path of clockwise pieces, and a chariot's wheel its own", () => {
    const symbols = figureSymbols().split("</symbol>").filter((x) => x.includes("<symbol"));
    Assert.true(symbols.length >= 14);
    for (const sym of symbols) Assert.true((sym.match(/<path/gu) ?? []).length <= 2, sym.slice(0, 60));
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
});
