import { describe, test } from "vitest";
import { type GameState, historyOf, logEvent, newGame, newGameConfig, newOwnerChange } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// History buttons (build order item 17+++b, "History, search and names"): the ledger of a province, realm, title or person,
// in order, as a court learned it, and the whole record once it opens.
describe("HistoryTests", () => {
  const game = (): GameState => smallWorld(newGame(5, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti", "Mitanni", "Assyria");
  const texts = (s: GameState, kind: Parameters<typeof historyOf>[1], id: string, viewer: Parameters<typeof historyOf>[3]): string[] =>
    historyOf(s, kind, id, viewer).map((l) => l.text);

  test("A province's history holds what its court saw, in order; the record holds the rest", () => {
    const s = game();
    s.turn = 3;
    logEvent(s, "siege", "Hatti's army laid siege to Tuwanuwa.", ["Hatti", "Mitanni"]);
    s.turn = 2;
    logEvent(s, "travel", "A caravan passed through Tuwanuwa.", ["Hatti"]);
    logEvent(s, "travel", "A caravan passed through Harran.", ["Mitanni"]);
    Assert.equal(texts(s, "province", "tuwanuwa", "Hatti"), ["A caravan passed through Tuwanuwa.", "Hatti's army laid siege to Tuwanuwa."]);
    Assert.equal(texts(s, "province", "tuwanuwa", "Mitanni"), ["Hatti's army laid siege to Tuwanuwa."]);
    Assert.equal(texts(s, "province", "tuwanuwa", "Egypt"), []);
    Assert.equal(texts(s, "province", "tuwanuwa", null).length, 2);
  });

  test("A court knows how its own land changed hands; another court learns it only as news", () => {
    const s = game();
    s.ownerLog.push(newOwnerChange({ province: "tuwanuwa", turn: 4, owner: "Mitanni" }));
    Assert.equal(texts(s, "province", "tuwanuwa", "Hatti"), ["Taken by Mitanni from Hatti."]);
    Assert.equal(texts(s, "province", "tuwanuwa", "Mitanni"), ["Taken by Mitanni from Hatti."]);
    Assert.equal(texts(s, "province", "tuwanuwa", "Egypt"), []);
    Assert.equal(texts(s, "province", "tuwanuwa", null), ["Taken by Mitanni from Hatti."]);
  });

  test("A realm's history: its own court reads its rise and fall, another court only what it heard of it", () => {
    const s = game();
    s.turn = 2;
    logEvent(s, "letter", "Assyria wrote to Egypt as a brother.", ["Egypt", "Assyria"]);
    s.ownerLog.push(newOwnerChange({ province: "tuwanuwa", turn: 3, owner: "Assyria" }));
    Assert.true(texts(s, "realm", "Assyria", "Assyria").includes("Took Tuwanuwa from Hatti."));
    Assert.equal(texts(s, "realm", "Assyria", "Egypt"), ["Assyria wrote to Egypt as a brother."]);
    Assert.equal(texts(s, "realm", "Assyria", "Mitanni"), []);
  });

  test("A title's history is the claims, crowns and falls that name it, never the rest", () => {
    const s = game();
    logEvent(s, "recognition", "Assyria claims the name of Mitanni.", ["Assyria", "Mitanni"]);
    logEvent(s, "letter", "Mitanni's envoy reached Egypt.", ["Mitanni"]);
    Assert.equal(texts(s, "title", "Mitanni", "Mitanni"), ["Assyria claims the name of Mitanni."]);
    Assert.equal(texts(s, "title", "Mitanni", "Egypt"), []);
  });

  test("A person's history is their legend as the court saw it", () => {
    const s = game();
    const c = s.characters.find((x) => x.employer === "Egypt" && s.characters.filter((y) => y.name === x.name).length === 1)!;
    logEvent(s, "question", `${c.name} was questioned at Hattusa.`, ["Hatti"]);
    Assert.equal(texts(s, "person", c.id, "Hatti"), [`${c.name} was questioned at Hattusa.`]);
    Assert.equal(texts(s, "person", c.id, "Egypt"), []);
  });
});
