import { describe, test } from "vitest";
import { newSeatView } from "@amarna/engine";
import { namesLine } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

// #550: NAMES CLAIMED in a king's request says when each claim was read, by the season its sealed greeting names, never a
// turn's number.
describe("NamesLine", () => {
  test("Each claim read in a greeting carries the season it was sealed", () => {
    const v = newSeatView({
      power: "Egypt",
      claimedName: "Egypt",
      nameClaims: [{ name: "Gubla", claimants: ["Amurru", "Byblos"], givenTo: "Byblos", heard: [{ claimant: "Amurru", sealed: 5 }] }],
    });
    Assert.equal(
      "NAMES CLAIMED (each king as your orders name him): you go by the name of Egypt. Gubla is claimed by Amurru and Byblos (read in Amurru's greeting sealed in Peret (growing), year 2); your court gives it to Byblos and calls the other by his house.",
      namesLine(v),
    );
    Assert.doesNotContain("turn", namesLine(v));
  });

  test("Two claims read: each by its own greeting's season", () => {
    const v = newSeatView({
      power: "Hatti",
      claimedName: "Hatti",
      nameClaims: [{ name: "Gubla", claimants: ["Amurru", "Byblos"], givenTo: null, heard: [{ claimant: "Amurru", sealed: 1 }, { claimant: "Byblos", sealed: 3 }] }],
    });
    Assert.contains("(read in Amurru's greeting sealed in the first season, year 1, and in Byblos's of the third season, year 1)", namesLine(v));
  });
});
