import { describe, test } from "vitest";
import { newGame } from "@amarna/engine";
import { Assert } from "./support.ts";

/**
 * The slop audit, the cast's biographies (archive item 178): what a king may learn of a person reads as the period wrote,
 * with no scholar's numbers to echo, no wrong article, and no line said twice.
 */
describe("The cast's biographies", () => {
  test("No source numbers, no wrong article, no calling said twice", () => {
    for (const seed of [1, 2, 3])
      for (const c of newGame(seed).characters) {
        const lines = c.facts.map((f) => f.text);
        // "(EA 62)", "(the Shattiwaza treaty)": the data's sources, never the text.
        Assert.doesNotContain(lines, (t) => t.includes("("));
        // "a Ashkelonite trader".
        Assert.doesNotContain(lines, (t) => /\ba [AEIOU]/.test(t));
        Assert.true(new Set(lines).size === lines.length, `${c.name}: ${lines.join(" | ")}`);
      }
  });

  test("A calling the sources' first line already gives is said once, there", () => {
    const s = newGame(3);
    const facts = (name: string): string[] => s.characters.find((c) => c.name === name)!.facts.filter((f) => f.tag === "calling" || f.tag === "source").map((f) => f.text);
    // "A general." beside "A general of Akhenaten's, …"; "Governor of Nippur." beside "Governor of Nippur, …".
    for (const name of ["Paatenemheb", "Enlil-kidinni", "Eshuwara", "Ay", "Huya"]) Assert.true(facts(name).length === 1, `${name}: ${facts(name).join(" | ")}`);
    // A calling the sources' line does not open with keeps its own line.
    Assert.equal(["The ruler's son.", "Son of Surata of Akka, who killed Babylon's merchants with Shum-Adda; Akka's ruler after his father."], facts("Shutatna"));
  });

  test("A post the opening gives is the calling's one line", () => {
    const s = newGame(3);
    for (const c of s.characters.filter((x) => x.calling.startsWith("governor of ") || x.openly)) {
      const lines = c.facts.filter((f) => f.tag === "calling" || f.tag === "resident").map((f) => f.text);
      Assert.true(lines.length <= 1, c.name);
      // Pharaoh's residents say where they sit; a governor's line names his post.
      if (c.openly) Assert.true(lines[0]?.startsWith("Sits in ") ?? false, `${c.name}: ${lines[0]}`);
      else if (lines.length === 1) Assert.equal(`Governor of ${c.calling.slice("governor of ".length)}.`, lines[0]);
    }
  });
});
