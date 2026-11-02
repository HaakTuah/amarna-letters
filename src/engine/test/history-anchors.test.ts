import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test } from "vitest";
import { AllPowers, AttestedCast, FirstCores, Invented, NamedScribes, NubianCast, PeopleOf1346, PersonAnchors, RulerAnchors, king, rulerNamed } from "@amarna/engine";
import { Assert } from "./support.ts";

// <summary>Every real fact in the game's data names the dossier line it rests on, and that line names the same entity
// (the full history check, archive item 167).</summary>
describe("HistoryAnchorTests", () => {
  const dir = fileURLToPath(new URL("../../../docs/history/", import.meta.url));
  const lines = new Map<string, string>();
  const repeated: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")))
    for (const line of readFileSync(dir + file, "utf8").split("\n"))
      for (const m of line.matchAll(/<a id="([^"]+)"><\/a>/g)) {
        if (lines.has(m[1]!)) repeated.push(m[1]!);
        lines.set(m[1]!, line);
      }

  /** Names as the dossiers and the game may spell them apart: no diacritics, no ʿ or ', any case. */
  const plain = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ʿʾ'’]/g, "").toLowerCase();

  /**
   * What an anchored line is about: the given cell of a table row (the people dossier names its person in the first, the
   * politics dossier its ruler in the second), never the rest of the row, where other people are named; a line that is not
   * a row is about what it says.
   */
  function subject(id: string, cell: number): string {
    const line = lines.get(id) ?? "";
    const after = line.slice(line.indexOf(`<a id="${id}"></a>`)).replace(/<a id="[^"]+"><\/a>/g, "");
    return after.includes("|") ? (after.split("|")[cell] ?? "") : after;
  }

  /** Whether a subject names someone: his name as a whole word, so that Ay is not found in Maya. */
  const names = (text: string, name: string): boolean => new RegExp(`(^|[^a-z])${plain(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(plain(text));

  // Everyone the game presents as a real person of 1346: the cast, the first pool's attested envoys and the named scribes.
  const people = [
    ...AttestedCast.map((c) => c.name),
    ...PeopleOf1346.map((c) => c.name),
    ...NubianCast.map((c) => c.name),
    ...FirstCores.keys(),
    ...[...NamedScribes.values()].map((s) => s.name),
  ];

  test("Every anchor is unique", () => Assert.equal("", repeated.join(", ")));

  test("Every real person names an anchor, or is marked invented", () =>
    Assert.equal("", people.filter((n) => !PersonAnchors.has(n)).join(", ")));

  test("Every anchor exists and its line names the same person", () => {
    const wrong = [...PersonAnchors].filter(([name, id]) => id !== Invented && !names(subject(id, 0), name));
    Assert.equal("", wrong.map(([name, id]) => `${name} -> ${id}${lines.has(id) ? "" : " (missing)"}`).join(", "));
  });

  // Every ruler the sources name: the politics dossier's line for him.
  const rulers = AllPowers.filter(rulerNamed).map(king);

  test("Every named ruler names an anchor, and its line names him", () => {
    Assert.equal("", rulers.filter((n) => !RulerAnchors.has(n)).join(", "));
    const wrong = [...RulerAnchors].filter(([name, id]) => !names(subject(id, id.startsWith("01-") ? 1 : 0), name));
    Assert.equal("", wrong.map(([name, id]) => `${name} -> ${id}${lines.has(id) ? "" : " (missing)"}`).join(", "));
  });

  test("A person marked attested is not marked invented", () => {
    const attested = [...NamedScribes.values()].filter((s) => s.attested).map((s) => s.name);
    Assert.equal("", attested.filter((n) => PersonAnchors.get(n) === Invented).join(", "));
  });
});
