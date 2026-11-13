import { describe, test } from "vitest";
import type { VassalTerms } from "@amarna/engine";
import { bondReport, inGoodStanding, type BondTake } from "../src/bonds-report.ts";
import { Assert } from "../../engine/test/support.ts";

/** Item 18, part F3: the provinces overlords took from their own vassals, paying or in arrears, by the overlord's side. */
describe("The vassals' line", () => {
  const games: BondTake[][] = [
    [
      ["Megiddo", "Egypt", true],
      ["Megiddo", "Egypt", true],
      ["Ugarit", "Hatti", false],
    ],
    [],
    [["Amurru", "Hatti", true]],
  ];

  test("Paying and in arrears, counted apart, with the vassals and games they fell in", () => {
    const [line] = bondReport(games);
    Assert.contains("3 provinces of vassals paying tribute or not yet due, of 2 vassals in 2 of 3 games; 1 of vassals in arrears; 1.0 paying provinces a game", line);
  });

  test("Split by the overlord's side in the halves' runs", () => {
    const [line] = bondReport(games, (_, p) => p === "Egypt");
    Assert.contains("paying tribute or not yet due (by overlords on the current side 2, the baseline 1)", line);
    Assert.contains("1 of vassals in arrears (by overlords on the current side 0, the baseline 1)", line);
  });

  test("A vassal is in arrears only once its tribute is due and unpaid, as a script overlord reckons it", () => {
    const bond = (tribute: number, sealedTurn: number): VassalTerms =>
      ({ tabletId: "t", vassal: "Megiddo", overlord: "Egypt", tribute, protects: true, serves: true, sealedTurn }) as VassalTerms;
    Assert.true(inGoodStanding(bond(100, 10), null, 11));
    Assert.false(inGoodStanding(bond(100, 10), null, 16));
    Assert.true(inGoodStanding(bond(100, 10), 14, 16));
    Assert.true(inGoodStanding(bond(0, 10), null, 40));
  });
});
