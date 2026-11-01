import { describe, test } from "vitest";
import { Views, newGame } from "@amarna/engine";
import { Assert } from "./support.ts";

// Item 17++ (the sound lane's find): a court's books list the land it knows it holds, so a province lost out of its sight
// stays on them until word comes, and one gained without its knowing is not there yet.
describe("BooksByWord", () => {
  test("A far province lost or gained out of sight changes a court's books only when word arrives", () => {
    const s = newGame(1);
    const before = Views.for(s, "Egypt").provinces.map((x) => x.province);
    Assert.true(before.includes("sumur"));
    // Sumur, beyond the sight of Pharaoh's court once his garrison is gone, falls to another.
    s.units = s.units.filter((u) => u.province !== "sumur");
    s.owner.set("sumur", "Amurru");
    s.owner.set("nineveh", "Egypt");
    const v = Views.for(s, "Egypt");
    Assert.true(v.provinces.some((x) => x.province === "sumur"));
    Assert.false(v.provinces.some((x) => x.province === "nineveh"));
  });
});
