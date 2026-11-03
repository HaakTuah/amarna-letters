import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { dated, heardIn } from "../src/ui/format.ts";

// The interface dates engine text by the court's calendar: "turn N", and a fact's "(season N)", which counts turns too.
describe("DatedTests", () => {
  test("A fact's (season N) is dated as the court reckons it, and turn N as before", () => {
    Assert.equal("Came home with the answer (the first season, 1345 BCE).", dated("Came home with the answer (season 4).", "Mitanni"));
    Assert.equal("Slipped out (Akhet, 1345 BCE).", dated("Slipped out (season 4).", "Egypt"));
    Assert.equal("Sealed in season 2, 1346 BCE (turn 2).", dated("Sealed in turn 2.", null));
    Assert.equal("the second season of the year", dated("the second season of the year", null));
  });

  // #550: the Court section's claims, by the season each was sealed in its claimant's greeting, in the court's calendar.
  test("Each claim read is dated by its greeting's seal, in the court's own calendar", () => {
    Assert.equal("", heardIn([], "Mitanni"));
    Assert.equal(", as read in Amurru's greeting sealed in season 2, 1345 BCE", heardIn([{ claimant: "Amurru", sealed: 5 }], "Mitanni"));
    Assert.equal(", as read in Amurru's greeting sealed in Peret 1345 BCE and in Hatti's greeting sealed in Akhet 1346 BCE", heardIn([{ claimant: "Amurru", sealed: 5 }, { claimant: "Hatti", sealed: 1 }], "Egypt"));
  });
});
