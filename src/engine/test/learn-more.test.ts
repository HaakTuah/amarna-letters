import { describe, test } from "vitest";
import {
  AttestedCast, FamiliarPlaceNames, FirstCores, FixedPowers, Invented, LanguageAnchors, NamedScribes, NubianCast, PeopleOf1346, PersonAnchors,
  PersonLinks, PlaceLinks, RealmLinks, TongueLinks, WorldMap, king, newGame, rulerNamed,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// "Learn more, and what is invented" (Interface, build order item 17+++b): every real place, realm, person and language
// in the game's data carries its link (its dossier reference is checked by HistoryAnchorTests); the links themselves are
// checked weekly, outside the pull requests (`scripts/links.mjs`).
describe("LearnMoreTests", () => {
  const missing = (names: readonly string[], links: ReadonlyMap<string, unknown>): string => names.filter((n) => !links.has(n)).join(", ");

  test("Every land province and every open sea carries its link", () => {
    const places = WorldMap.default.provinces.filter((p) => !p.isSea || WorldMap.default.coastsOf(p.id).length === 0).map((p) => p.id);
    Assert.equal("", missing(places, PlaceLinks));
  });

  test("Every realm, and every ruler the sources name, carries its link", () => {
    Assert.equal("", missing(FixedPowers, RealmLinks));
    Assert.equal("", missing(FixedPowers.filter(rulerNamed).map(king), PersonLinks));
  });

  test("Every real person carries a link, and no one invented does", () => {
    const real = [
      ...AttestedCast.map((c) => c.name),
      ...PeopleOf1346.map((c) => c.name),
      ...NubianCast.map((c) => c.name),
      ...FirstCores.keys(),
      ...[...NamedScribes.values()].filter((s) => s.attested).map((s) => s.name),
    ].filter((n) => PersonAnchors.get(n) !== Invented);
    Assert.equal("", missing(real, PersonLinks));
    Assert.equal("", [...PersonAnchors].filter(([n, a]) => a === Invented && PersonLinks.has(n)).map(([n]) => n).join(", "));
    // Every person a game presents as real is among them.
    Assert.equal("", missing(newGame(1).characters.filter((c) => c.attested).map((c) => c.name), PersonLinks));
  });

  test("Every real language carries its link", () =>
    Assert.equal("", missing([...LanguageAnchors].filter(([, a]) => a !== Invented).map(([l]) => l), TongueLinks)));

  test("Every link is to a page, opened outside the game, with the title the card shows", () => {
    for (const links of [PlaceLinks, RealmLinks, PersonLinks, TongueLinks] as ReadonlyMap<string, { url: string; title: string }>[])
      for (const [, l] of links) {
        Assert.true(l.url.startsWith("https://"), l.url);
        Assert.true(l.title.length > 0, l.url);
      }
  });

  test("Every familiar name is of a place on the map, and differs from its period name", () => {
    for (const [id, name] of FamiliarPlaceNames) {
      Assert.true(WorldMap.default.exists(id), id);
      Assert.notEqual(WorldMap.default.get(id).name, name);
    }
  });
});
