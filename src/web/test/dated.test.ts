import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { dated } from "../src/ui/format.ts";

// The interface dates engine text by the court's calendar: "turn N", and a fact's "(season N)", which counts turns too.
describe("DatedTests", () => {
  test("A fact's (season N) is dated as the court reckons it, and turn N as before", () => {
    Assert.equal("Came home with the answer (the first season, 1345 BCE).", dated("Came home with the answer (season 4).", "Mitanni"));
    Assert.equal("Slipped out (Akhet, 1345 BCE).", dated("Slipped out (season 4).", "Egypt"));
    Assert.equal("Sealed in season 2, 1346 BCE (turn 2).", dated("Sealed in turn 2.", null));
    Assert.equal("the second season of the year", dated("the second season of the year", null));
  });
});
