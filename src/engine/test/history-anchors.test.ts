import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, test } from "vitest";
import {
  AllPowers, ArmyAnchors, AttestedCast, AttestedKm, CityWaters, CrossedRivers, CrossingAnchors, Crossings, DistanceAnchors,
  DoorAnchors, Doors, FirstCores, FleetAnchors, HarbourAnchors, Invented, LanguageAnchors, NamedScribes, NubianCast, PeopleOf1346, PersonAnchors,
  RiverAnchors, Rivers, RulerAnchors, StartUnits, StartWalls, TongueAnchors, WallAnchors, WaterAnchors, WorldMap, beyondTongue, isGreatKing, king,
  modernOf, peopleSpeak, rulerNamed, startHarbour,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// <summary>Every real fact in the game's data names the dossier line it rests on, and that line names the same entity
// (the full history check, archive item 167).</summary>
describe("HistoryAnchorTests", () => {
  const dir = fileURLToPath(new URL("../../../docs/history/", import.meta.url));
  const lines = new Map<string, string>();
  const repeated: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const text = readFileSync(dir + file, "utf8").split("\n");
    text.forEach((first, i) => {
      // A list item or paragraph runs on over its indented lines; a table row is one line.
      let line = first;
      if (!first.trimStart().startsWith("|")) for (let j = i + 1; j < text.length && /^ +\S/.test(text[j]!) && !/^ *- /.test(text[j]!); j++) line += " " + text[j]!.trim();
      for (const m of first.matchAll(/<a id="([^"]+)"><\/a>/g)) {
        if (lines.has(m[1]!)) repeated.push(m[1]!);
        lines.set(m[1]!, line);
      }
    });
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
    return after.includes("|") && cell >= 0 ? (after.split("|")[cell] ?? "") : after;
  }

  /** Whether a subject names someone or something: the name as a whole word, so that Ay is not found in Maya, and Sidon in "Sidon's". */
  const names = (text: string, name: string): boolean => new RegExp(`(^|[^a-z])${plain(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(plain(text.replace(/['’]s\b/g, "")));

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
  // The rest of the game's data: places, distances, waters, walls, armies, doors and tongues. Each entry is checked against
  // the names its line may call it by: a province by its map id, its name or a word of its modern name (the dossiers keep
  // some older ids, Kanesh for Nesa); a pair of provinces by both.
  const map = WorldMap.default;
  const placeNames = (id: string): string[] => {
    const p = map.find(id.replace(/waters$/, ""));
    const modern = modernOf(id.replace(/waters$/, "")) ?? "";
    return [id.replace(/waters$/, "").replace(/sea$/, " sea"), ...(p === null ? [] : [p.name]), ...modern.split(/[^\p{L}-]+/u).filter((w) => w.length > 3)];
  };
  const pairNames = (key: string): string[][] => key.split("-").map(placeNames);

  /**
   * The entries whose anchor is missing or whose line does not name them: `want` gives the names to look for, any one of
   * which will do, for each part of the key that must be named.
   */
  function misses(kind: string, keys: readonly string[], anchors: ReadonlyMap<string, string>, want: (key: string) => string[][], cell = 0): string[] {
    const out = keys.filter((k) => !anchors.has(k)).map((k) => `${kind} ${k}: no anchor`);
    for (const [k, id] of anchors) {
      if (!keys.includes(k)) out.push(`${kind} ${k}: not in the game's data`);
      else if (id !== Invented && !want(k).every((any) => any.some((n) => names(subject(id, cell), n))))
        out.push(`${kind} ${k} -> ${id}${lines.has(id) ? "" : " (missing)"}`);
    }
    return out;
  }
  const one = (names: (k: string) => string[]) => (k: string) => [names(k)];

  test("Every city's water and walls name an anchor, and its line names the city", () => {
    const out = [
      ...misses("water", [...CityWaters.keys()], WaterAnchors, one(placeNames)),
      ...misses("walls", [...StartWalls.keys()], WallAnchors, one(placeNames)),
    ];
    Assert.equal("", out.join(", "));
  });

  /** The land a tongue is named after, as the dossiers call it: Keftian of Keftiu, Marhashian of Marhashi. */
  const tongueLands = (t: string): string[] => Doors.flatMap((d) => d.beyond).filter((b) => beyondTongue(b.land) === t).map((b) => b.land.replace(/^the /, ""));

  test("Every province's tongues and every language name an anchor, and its line names them", () => {
    const provinces = map.provinces.filter((p) => peopleSpeak(p.id).length > 0).map((p) => p.id);
    const tongues = new Set([
      ...provinces.flatMap((p) => peopleSpeak(p).map(([t]) => t)),
      ...Doors.flatMap((d) => d.beyond.map((b) => beyondTongue(b.land))).filter((t): t is string => t !== null),
    ]);
    const out = [
      ...misses("tongues", provinces, TongueAnchors, one(placeNames)),
      ...misses("language", [...tongues], LanguageAnchors, (t) => [[t.replace(/^the |'s? tongue$/g, ""), t.replace(/n$/, ""), ...tongueLands(t)]], -1),
    ];
    Assert.equal("", out.join(", "));
  });

  test("Every door and every land beyond it names an anchor, and its line names it", () => {
    const doors = Doors.map((d) => d.id);
    const lands = Doors.flatMap((d) => d.beyond);
    const want = (k: string): string[][] => {
      const door = Doors.find((d) => d.id === k);
      if (door !== undefined) return [[door.name.replace(/^the /, "")]];
      const b = lands.find((l) => l.land === k)!;
      return [[b.land.replace(/^the /, ""), ...(b.people.match(/\p{Lu}[\p{L}-]+/gu) ?? [])]];
    };
    Assert.equal("", misses("door", [...doors, ...lands.map((l) => l.land)], DoorAnchors, want, -1).join(", "));
  });

  test("Every crossing and attested distance names an anchor, and its line names both ends", () => {
    const out = [
      ...misses("crossing", Crossings.map((c) => `${c.a}-${c.b}`), CrossingAnchors, pairNames, -1),
      ...misses("distance", AttestedKm.map((d) => `${d.a}-${d.b}`), DistanceAnchors, pairNames),
    ];
    Assert.equal("", out.join(", "));
  });

  test("Every army and fleet at the start names an anchor, and its line names its king or city", () => {
    // A Great King's units by its name, a city-state's by its city (`home`), every unit that starts the game included
    const owners = (kind: string): string[] => [...new Set(StartUnits.filter((u) => u.kind === kind).map((u) => (isGreatKing(u.power) ? u.power : u.home)))];
    const out = [
      ...misses("army", owners("Army"), ArmyAnchors, (k) => [[k, ...placeNames(k)]]),
      ...misses("fleet", owners("Fleet"), FleetAnchors, (k) => [[k, ...placeNames(k)]]),
    ];
    Assert.equal("", out.join(", "));
  });

  test("Every port and river names an anchor, and its line names it", () => {
    const ports = map.provinces.filter((p) => startHarbour(p) > 1).map((p) => p.id);
    const rivers = [...Rivers, ...CrossedRivers];
    const out = [
      ...misses("harbour", ports, HarbourAnchors, one(placeNames)),
      ...misses("river", rivers.map((r) => r.id), RiverAnchors, (k) => [[k, rivers.find((r) => r.id === k)!.name]]),
    ];
    Assert.equal("", out.join(", "));
  });
});
