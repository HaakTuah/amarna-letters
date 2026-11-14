import { describe, test } from "vitest";
import { AllPowers } from "@amarna/engine";
import { soloReport } from "../src/batch-report.ts";
import { Assert } from "../../engine/test/support.ts";

describe("The solo benchmark's table", () => {
  test("All kings' wins are a share of every king's solo games, never past 100%", () => {
    const growth = Object.fromEntries(AllPowers.map((p) => [p, [1, 1]]));
    const wins = Object.fromEntries(AllPowers.map((p) => [p, 2]));
    const none = Object.fromEntries(AllPowers.map((p) => [p, 0]));
    const all = soloReport(2, growth, growth, none, wins).split("\n").find((l) => l.includes("All kings"))!;
    Assert.contains("100% /   0%", all);
  });
});
