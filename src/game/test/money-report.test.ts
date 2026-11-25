import { describe, test } from "vitest";
import { newCharacter, newFact, type Character, type PersonScore } from "@amarna/engine";
import { MoneyWatch, moneyReport, raisedByCircumstance } from "../src/money-report.ts";
import { Assert } from "../../engine/test/support.ts";

/** Item 18, parts F3 and F4: the roads compared by way to a fortune, and by how men came into play. */
describe("The roads' lines", () => {
  const person = (id: string, bold: boolean, init: Partial<Character> = {}): PersonScore => ({
    character: newCharacter({ id, name: id, bold, strategy: bold ? "Climber" : "Steady", ...init }),
    power: null,
    holding: 0,
    size: 0,
    performance: 0,
    score: 0,
    dead: false,
  });
  const rose = { facts: [newFact({ id: "f1", text: "Walked off from a band.", tag: "rose" })] };
  // Ranked as the scoreboard ranks them, best first: the top five are the first five living.
  const board = [
    person("c1", true, rose),
    person("c2", false),
    person("c3", true, { calling: "raider" }),
    person("c4", false),
    person("c5", true),
    person("c6", true, rose),
    person("c7", false, rose),
  ];

  test("A head raised by circumstance: one who rose to lead men, or led a raid from beyond the map", () => {
    Assert.equal([true, false, true, false, false, true, true], board.map((x) => raisedByCircumstance(x.character)));
  });

  test("The heads raised by circumstance are counted apart from those who chose their road", () => {
    const lines = moneyReport([new MoneyWatch().end(board)]);
    Assert.contains(
      "  The top five by how they came into play (in a hundred heads): heads raised by circumstance (loose men, a band, mutineers, refugees, a town or a raid) bold 2 of 3 (66.7), careful 0 of 1 (0.0); the rest bold 1 of 1 (100.0), careful 2 of 2 (100.0).",
      lines,
    );
    Assert.contains("  The top five by way to a fortune (of those who never reigned; in a hundred heads): Steady bold 0 of 0 (-), careful 2 of 3 (66.7); Climber bold 3 of 4 (75.0), careful 0 of 0 (-).", lines);
  });
});
