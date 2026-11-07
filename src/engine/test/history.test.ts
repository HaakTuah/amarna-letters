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

  test("A court learns how land changed hands only as news, its own land too; the record knows it at once", () => {
    const s = game();
    s.ownerLog.push(newOwnerChange({ province: "tuwanuwa", turn: 4, owner: "Mitanni" }));
    Assert.equal(texts(s, "province", "tuwanuwa", null), ["Taken by Mitanni from Hatti."]);
    Assert.equal(texts(s, "province", "tuwanuwa", "Hatti"), []);
    Assert.equal(texts(s, "realm", "Hatti", "Hatti"), []);
    s.turn = 5;
    logEvent(s, "fall", "Word came that Tuwanuwa was lost to Mitanni.", ["Hatti"]);
    Assert.equal(texts(s, "province", "tuwanuwa", "Hatti"), ["Word came that Tuwanuwa was lost to Mitanni."]);
    Assert.equal(texts(s, "province", "tuwanuwa", "Mitanni"), []);
  });

  test("A realm's history: the record reads its rise and fall, a court only what it heard of it", () => {
    const s = game();
    s.turn = 2;
    logEvent(s, "letter", "Assyria wrote to Egypt as a brother.", ["Egypt", "Assyria"]);
    s.ownerLog.push(newOwnerChange({ province: "tuwanuwa", turn: 3, owner: "Assyria" }));
    Assert.true(texts(s, "realm", "Assyria", null).includes("Took Tuwanuwa from Hatti."));
    Assert.equal(texts(s, "realm", "Assyria", "Assyria"), ["Assyria wrote to Egypt as a brother."]);
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

  test("A court that knows a person by a false name reads their history under it, never the true man's (#769)", () => {
    const s = game();
    const c = s.characters.find((x) => x.employer === "Egypt" && s.characters.filter((y) => y.name === x.name).length === 1)!;
    c.declared.push({ court: "Hatti", name: "Shuta", as: null, employer: null, turn: 0, exposed: null, rep: 0 });
    logEvent(s, "job", `Egypt hired ${c.name}.`, ["Hatti", "Egypt"]);
    logEvent(s, "question", "Shuta was questioned at Hattusa.", ["Hatti"]);
    Assert.equal(texts(s, "person", c.id, "Hatti"), ["Shuta was questioned at Hattusa."]);
    Assert.equal(texts(s, "person", c.id, "Egypt"), [`Egypt hired ${c.name}.`]);
    Assert.equal(texts(s, "person", c.id, null), [`Egypt hired ${c.name}.`]);
    c.declared[0]!.exposed = 1;
    Assert.equal(texts(s, "person", c.id, "Hatti"), [`Egypt hired ${c.name}.`]);
  });
});
