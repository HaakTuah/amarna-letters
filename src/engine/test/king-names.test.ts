import { describe, test } from "vitest";
import { kingFor, kingOtherNames } from "@amarna/engine";
import { Assert } from "./support.ts";

describe("KingNames", () => {
  test("A king's card gives every other name the sources give him, never the one the viewer's court uses (item 17+)", () => {
    // Egypt's own seat calls him Akhenaten; its card gives the rest, the letters' name among them.
    Assert.equal("Akhenaten", kingFor("Egypt", "Egypt"));
    Assert.equal(["Neferkheperure Waenre", "Amenhotep IV", "Naphurureya in the letters of other courts"], [...kingOtherNames("Egypt", "Egypt")]);
    // Every other court, and god view, call him Naphurureya; their card gives his own court's name and the rest.
    for (const viewer of ["Hatti", null] as const) {
      Assert.equal("Naphurureya", kingFor(viewer, "Egypt"));
      Assert.equal(["Akhenaten", "Neferkheperure Waenre", "Amenhotep IV"], [...kingOtherNames(viewer, "Egypt")]);
    }
    // A king the sources give one name has no other names on his card.
    Assert.equal([], [...kingOtherNames("Egypt", "Hatti")]);
  });
});
