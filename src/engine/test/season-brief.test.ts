import { describe, test } from "vitest";
import { Dict, MaxBrief, newOrderOutcome, newProvinceEconomyView, newSeatView, newUnitView, seasonBrief, type Power } from "@amarna/engine";
import { Assert } from "./support.ts";

/** The season brief (item 18b) from hand-made views: only what the seat knows, said as it is. */
describe("SeasonBriefTests", () => {
  const owner = (): Dict<string, Power | null> => new Dict<string, Power | null>([["gaza", "Egypt"], ["suhu", "Mitanni"]]);

  test("A move that got in has entered the land, never taken it, either way round", () => {
    const v = newSeatView({
      power: "Egypt",
      owner: owner(),
      lastSeason: [
        newOrderOutcome({ power: "Egypt", unitKind: "Army", province: "sippar", order: "move", target: "suhu", succeeded: true, targetOwner: "Mitanni" }),
        newOrderOutcome({ power: "Hatti", unitKind: "Army", province: "ashkelon", order: "move", target: "gaza", succeeded: true, targetOwner: "Egypt" }),
      ],
    });
    const lines = seasonBrief(v).map((l) => l.text);
    Assert.true(lines.some((l) => l.startsWith("Your army entered Suhu")), lines.join(" | "));
    Assert.true(lines.some((l) => l.includes("army entered Hazzatu, your land.")), lines.join(" | "));
    Assert.false(lines.some((l) => l.includes(" took ")), lines.join(" | "));
  });

  test("An old report of a far troop or province is not this season's shortage", () => {
    const old = newSeatView({
      power: "Egypt",
      owner: owner(),
      units: [newUnitView({ power: "Egypt", kind: "Army", province: "gaza", hungry: 1, reported: 3 })],
      provinces: [newProvinceEconomyView({ province: "gaza", fed: 500, reported: 3 })],
    });
    Assert.empty(seasonBrief(old));
    const now = newSeatView({
      power: "Egypt",
      owner: owner(),
      units: [newUnitView({ power: "Egypt", kind: "Army", province: "gaza", hungry: 1, reported: 0 })],
      provinces: [newProvinceEconomyView({ province: "gaza", fed: 500, reported: null })],
    });
    Assert.equal(2, seasonBrief(now).filter((l) => l.kind === "Short").length);
  });

  test("Past six lines, the last says how many more", () => {
    const v = newSeatView({
      power: "Egypt",
      owner: owner(),
      provinces: [],
      lastSeason: ["gaza", "suhu"].flatMap((t) =>
        ["Hatti", "Mitanni", "Amurru", "Byblos"].map((p) => newOrderOutcome({ power: p, unitKind: "Army", province: "x", order: "move", target: t, succeeded: false, targetOwner: "Egypt" })),
      ),
    });
    const lines = seasonBrief(v);
    Assert.equal(MaxBrief, lines.length);
    Assert.equal("And 3 more in this season's news.", lines[MaxBrief - 1].text);
  });
});
