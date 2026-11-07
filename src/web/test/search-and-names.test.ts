import { describe, test } from "vitest";
import { Views, newGame, newGameConfig, setNameClaims, type GameState } from "@amarna/engine";
import { Assert, smallWorld } from "../../engine/test/support.ts";
import { buildScene } from "../src/map/scene.ts";
import { dated, powerName, provinceName } from "../src/ui/format.ts";
import { otherName, setNames, shown } from "../src/ui/names.ts";
import { knownTo, matchScore, scoreOf } from "../src/ui/search.ts";
import { knownAs } from "../src/components/HistoryPanel.tsx";
import { learnOf } from "../src/components/LearnMore.tsx";
import { frameFrom } from "../src/session/frames.ts";

// Item 17+++b, "History, search and names": the two name settings change every name the player reads and nothing else;
// one search finds anything the seat knows by any of its names, forgiving misspellings, and counts only what it knows.
describe("Search and names", () => {
  test("By default places take their period names and the Great Kings' realms the names people know", () => {
    setNames({ places: "period", realms: "known" });
    Assert.equal(provinceName("byblos"), "Gubla");
    Assert.equal(powerName("Egypt"), "Egypt");
    Assert.equal(powerName("Byblos"), "Gubla");
    Assert.equal(otherName("Gubla"), "Byblos");
  });

  test("Modern places rename every place and every realm named for one, in text too, and nothing inside another word", () => {
    setNames({ places: "modern", realms: "known" });
    Assert.equal(provinceName("byblos"), "Byblos");
    Assert.equal(powerName("Byblos"), "Byblos");
    Assert.equal(powerName("Hatti"), "Hatti");
    Assert.equal(shown("Rib-Hadda of Gubla wrote from Ṣumur; Ashur-uballit holds Ashur."), "Rib-Hadda of Byblos wrote from Simyra; Ashur-uballit holds Ashur.");
    Assert.equal(dated("Waset and the Ways of Horus, turn 2", null).startsWith("Thebes and the north Sinai"), true);
    Assert.equal(otherName("Gubla"), "Gubla");
    setNames({ places: "period" });
  });

  test("Period realms rename only the Great Kings' realms whose letters named them otherwise", () => {
    setNames({ places: "period", realms: "period" });
    Assert.equal(powerName("Egypt"), "Miṣri");
    Assert.equal(powerName("Babylonia"), "Karduniash");
    Assert.equal(powerName("Assyria"), "Aššur");
    Assert.equal(powerName("Mitanni"), "Mitanni");
    Assert.equal(shown("Egypt's envoy, an Egyptian, reached Ashur."), "Miṣri's envoy, an Egyptian, reached Ashur.");
    setNames({ realms: "known" });
    Assert.equal(powerName("Egypt"), "Egypt");
  });

  test("The search forgives misspellings and finds a name by its beginning or a word of it", () => {
    Assert.equal(matchScore("Gubla", "Gubla"), 0);
    Assert.true(matchScore("gub", "Gubla")! < matchScore("ubl", "Gubla")!);
    Assert.equal(matchScore("Ribhadda", "Rib-Hadda"), 2);
    Assert.equal(matchScore("rib hadda", "Rib-Hadda"), 2);
    Assert.true(matchScore("Damascos", "Damascus") !== null);
    Assert.true(matchScore("Tushrata", "Tushratta") !== null);
    Assert.true(matchScore("Surru", "Ṣurru") === 0);
    Assert.equal(matchScore("Xyz", "Gubla"), null);
    Assert.equal(matchScore("Ur", "Gubla"), null);
  });

  test("What a seat knows is found by period and modern names, counted as it knows them, never the true total", () => {
    const s: GameState = smallWorld(newGame(3, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti", "Byblos");
    const scene = buildScene([frameFrom(s, 0, null)], 0, "Egypt");
    const known = knownTo(s, "Egypt", scene);
    const gubla = known.find((k) => k.kind === "province" && k.id === "byblos")!;
    Assert.true(scoreOf("Byblos", gubla) !== null && scoreOf("Gubla", gubla) !== null && scoreOf("Jbeil", gubla) !== null);
    const view = Views.for(s, "Egypt");
    Assert.equal(known.filter((k) => k.kind === "person").length, view.court.length + view.known.length);
    Assert.true(known.filter((k) => k.kind === "person").length < s.characters.length);
    Assert.equal(knownTo(s, null, buildScene([frameFrom(s, 0, null)], 0, null)).filter((k) => k.kind === "person").length, s.characters.length);
  });

  const small = (): GameState => smallWorld(newGame(3, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti", "Byblos", "Amurru");
  const sceneOf = (s: GameState, viewer: "Egypt" | null) => buildScene([frameFrom(s, 0, null)], 0, viewer);

  test("A person a court knows by a false name keeps it in their history and on their card, never their true page", () => {
    const s = small();
    const c = Views.for(s, "Egypt").known.map((k) => s.characters.find((x) => x.id === k.id)!)[0]!;
    c.attested = true;
    c.declared.push({ court: "Egypt", name: "Shuta", as: null, employer: null, turn: 0, exposed: null, rep: 0 });
    Assert.equal(knownAs(s, c.id, "Egypt"), "Shuta");
    Assert.equal(knownAs(s, c.id, null), c.name);
    // Under an invented false name, the mark of an invented name; under a borrowed one, the borrowed man's page.
    Assert.true("invented" in learnOf(s, "person", c.id, "Shuta")!);
    Assert.true((learnOf(s, "person", c.id, "Rib-Hadda") as { link: { title: string } }).link.title.includes("Rib-Hadda"));
    Assert.true("link" in learnOf(s, "person", c.id)! || "invented" in learnOf(s, "person", c.id)!);
  });

  test("A title's claimants are those who claim it now, not the realm whose land it was", () => {
    const s = small();
    s.names.set("Amurru", "Gubla");
    try {
      const titles = knownTo(s, null, sceneOf(s, null)).filter((k) => k.kind === "title");
      Assert.equal([...titles.find((k) => k.id === "Gubla")!.realms].sort(), ["Amurru", "Byblos"]);
      Assert.equal(titles.find((k) => k.id === "Amurru")!.realms, []);
    } finally {
      setNameClaims([], []);
    }
  });
});
