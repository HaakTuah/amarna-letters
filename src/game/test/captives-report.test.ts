import { describe, test } from "vitest";
import { heldReport, type HeldMeasure } from "../src/captives-report.ts";
import { Assert } from "../../engine/test/support.ts";

const game = (kings: [number, string][], long: [number, number][], standing: number): HeldMeasure => ({
  kings,
  long,
  standing,
  letters: [0, 0, 0],
  escapes: [0, 0],
  guarded: 0,
  gaveIn: 0,
});

/** Item 18, part F2: whether holding a king forever pays, measured, never ruled against (#806). */
describe("The captive kings' lines", () => {
  test("Kings held long: where their realms and captors stood against par, beside every realm", () => {
    const lines = heldReport([game([[20, "held"], [3, "home"]], [[0.4, 1.4]], 1), game([[12, "home"]], [[0.6, 1.2]], 0.9)]);
    Assert.equal(2, lines.length);
    Assert.contains("Held long (12 seasons or more, or to the end): 2 kings", lines[1]);
    Assert.contains("their realms stood at 0.50 against par and their captors at 1.30, every realm at 0.95", lines[1]);
  });

  test("Summaries from before the measure give no line of it", () => {
    const old: HeldMeasure = { kings: [[3, "home"]], letters: [0, 0, 0], escapes: [0, 0], guarded: 0, gaveIn: 0 };
    Assert.equal(1, heldReport([old]).length);
  });
});
