import { describe, expect, test } from "vitest";
import { Abroad, Home } from "../src/bots/envoy-words.ts";
import { reading } from "./readings.ts";

// The slop audit (archive item 178): every form of an envoy's line reads to the script kings and the checks as its first
// form does (what they read for: readings.ts), so that the form chosen changes no play.
describe("EnvoyWordsTests", () => {
  const fill = (s: string): string => s.replaceAll("{T}", "Great King").replaceAll("{K}", "Tushratta").replaceAll("{L}", "Hatti").replaceAll("{W}", "Go in peace.");

  test("Every form of an envoy's line reads as its first form does", () => {
    for (const [name, forms] of [...Object.entries(Abroad), ...Object.entries(Home)])
      for (const f of forms) expect(reading(fill(f), "Egypt", "Mitanni", "envoy"), `${name}: "${f}"`).toBe(reading(fill(forms[0]), "Egypt", "Mitanni", "envoy"));
  });

  test("What a king reads from a report stays in every form", () => {
    // Its report is weighed for warmth only when it names the court it comes from (Brain.learn).
    for (const f of Home.back) expect(f).toContain("the court of {L}");
    // A refused post is read from its own words (Brain.learn).
    for (const f of Home.refusedPost) expect(fill(f)).toMatch(/The king of (\S+) offered me a post in his service, and I refused it/);
  });
});
