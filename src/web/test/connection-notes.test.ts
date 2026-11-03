import { describe, expect, test } from "vitest";
import { AttestedKm, connectionNote } from "@amarna/engine";
import { Marks, markText } from "../src/map/crossings.ts";

// Why a connection takes longer than the map's line suggests (#554): the crossing's mark says it, from the same sourced
// basis as its length; a connection with nothing to explain says nothing more.
describe("ConnectionNotes", () => {
  const mark = (a: string, b: string) => Marks.find((m) => m.crossing !== null && ((m.crossing.a === a && m.crossing.b === b) || (m.crossing.a === b && m.crossing.b === a)))!;

  test("A desert road with an attested reason says it on its mark, either way round", () => {
    const lines = markText(mark("thebes", "redsea")).lines;
    expect(lines).toContain(connectionNote("thebes", "redsea"));
    expect(connectionNote("redsea", "thebes")).toContain("Wadi Hammamat");
    expect(markText(mark("delta", "sinai")).lines.some((l) => l.startsWith("The Ways of Horus"))).toBe(true);
  });

  test("A crossing with no attested reason adds no note, and every note is one plain sentence", () => {
    expect(connectionNote("hattusa", "nesa")).toBeNull();
    expect(markText(mark("hattusa", "nesa")).lines.every((l) => !AttestedKm.some((x) => x.note === l))).toBe(true);
    for (const x of AttestedKm.filter((y) => y.note !== undefined)) expect(x.note).toMatch(/^[A-Z].*\.$/);
  });

  test("Ur's way to the Gulf, which no mark shows, has its note for the province card", () => {
    expect(connectionNote("ur", "gulf")).toContain("river port");
  });
});
