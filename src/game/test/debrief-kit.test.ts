import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test } from "vitest";
import { Footer } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

// The simulation kit's debrief writer (sim/write-debriefs.js), read as text: no agent is started and no model called. Every
// debrief ends with the footer every game request carries, and asks kings and characters alike the builder rules' question
// (20 October 2026, "No model games until the build order is done"), so it is ready when model games return.
describe("DebriefKitTests", () => {
  function kit(file: string): string {
    // The repository's root, from this test's own folder (src/game/test).
    return readFileSync(fileURLToPath(new URL(`../../../sim/${file}`, import.meta.url)), "utf8");
  }

  test("Every debrief ends with the game requests footer and asks what was most and least interesting", () => {
    let script = kit("write-debriefs.js");
    Assert.contains(`const FOOTER = "${Footer}";`, script);
    Assert.contains('const QUESTION = "What did you find most and least interesting about playing this role?";', script);
    // A field of the reply's shape, for kings and characters alike.
    Assert.contains('"interesting": {"most": ', script);
    Assert.equal(2, script.split("${interesting}}`").length - 1);
  });
});
