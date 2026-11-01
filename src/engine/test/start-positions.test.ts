import { describe, test } from "vitest";
import { newGame } from "@amarna/engine";
import { Assert } from "./support.ts";

// Item 17+'s review: the engine holds one unit in a province, so no two units may start in one.
describe("StartPositions", () => {
  test("No province starts with two units in it", () => {
    const s = newGame(1);
    const seen = new Map<string, string>();
    for (const u of s.units) {
      Assert.true(!seen.has(u.province), `${u.province} holds ${seen.get(u.province)} and ${u.power}`);
      seen.set(u.province, u.power);
    }
  });
});
