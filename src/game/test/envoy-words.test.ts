import { describe, expect, test } from "vitest";
import { Abroad, Home } from "../src/bots/envoy-words.ts";
import { ModernShare, reading } from "./readings.ts";

// The slop audit (archive item 178): every form of an envoy's line reads to the script kings and the checks as its first
// form does (what they read for: readings.ts), so that the form chosen changes no play.
describe("EnvoyWordsTests", () => {
  const fill = (s: string, words = "Go in peace."): string => s.replaceAll("{T}", "Great King").replaceAll("{K}", "Tushratta").replaceAll("{L}", "Hatti").replaceAll("{W}", words);

  // With warm words quoted and with plain ones, so a warm quote cannot hide a form's own missing warmth.
  test.each(["Go in peace.", "I have heard your words."])("Every form of an envoy's line reads as its first form does (%s)", (words) => {
    for (const [name, forms] of [...Object.entries(Abroad), ...Object.entries(Home)])
      for (const f of forms) expect(reading(fill(f, words), "Egypt", "Mitanni", "envoy"), `${name}: "${f}"`).toBe(reading(fill(forms[0], words), "Egypt", "Mitanni", "envoy"));
  });

  test("No envoy says a share as a percentage (archive item 232)", () => {
    for (const [name, forms] of [...Object.entries(Abroad), ...Object.entries(Home)]) for (const f of forms) expect(ModernShare.test(f), `${name}: "${f}"`).toBe(false);
  });

  test("What a king reads from a report stays in every form", () => {
    // Its report is weighed for warmth only when it names the court it comes from (Brain.learn).
    for (const f of Home.back) expect(f).toContain("the court of {L}");
    // A refused post is read from its own words (Brain.learn).
    for (const f of Home.refusedPost) expect(fill(f)).toMatch(/The king of (\S+) offered me a post in his service, and I refused it/);
  });
});
