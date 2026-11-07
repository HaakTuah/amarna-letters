import { describe, test } from "vitest";
import { type GameState, type Power, TurnEngine, boardLine, characterResult, gain, idNumber, newCharacter, newGame, newGameConfig, newEarnings, newHoard, rankAmong, standingOf } from "@amarna/engine";
import { CharacterPar } from "../src/rules/par-results.ts";
import { Assert, orderBy, smallWorld } from "./support.ts";

// Item 17b, part D: every person on one scoreboard, the dead below the living.
describe("ScoreboardTests", () => {
  const kingOf = (s: GameState, p: Power) => s.characters.find((c) => c.id === s.reigns.get(p).character)!;
  const world = (): GameState => smallWorld(newGame(5, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");

  test("Kings and characters stand on one board, the living by score and the dead below them by what they held", () => {
    const s = world();
    for (const c of s.characters) [c.purse, c.hoard, c.earned.savings] = [0, null, 0];
    const people = s.characters.filter((c) => c.duty !== "Ruling").slice(0, 4);
    [people[0].purse, people[1].purse, people[3].purse] = [100, 60, 120];
    people[1].hoard = newHoard({ at: "Egypt", gold: 50 });
    [people[2].status, people[2].diedWith] = ["Dead", 500];

    const board = new TurnEngine(s).scoreboard();
    Assert.equal(s.characters.length, board.length);
    // Each king by his realm; the characters by purse and hoard, richer first at the same start.
    const egypt = Assert.single(board, (x) => x.power === "Egypt");
    Assert.equal(kingOf(s, "Egypt"), egypt.character);
    Assert.equal(new TurnEngine(s).strength("Egypt"), egypt.holding);
    const at = (c: (typeof people)[number]) => board.findIndex((x) => x.character === c);
    Assert.true(at(people[3]) < at(people[1]) && at(people[1]) < at(people[0]));
    Assert.equal(110, board[at(people[1])].holding);
    // Dying never beats surviving: the richest of the dead ranks below every living person.
    Assert.true(board.slice(1).every((x, i) => (board[i].dead === x.dead ? (x.dead ? board[i].holding >= x.holding : board[i].score >= x.score) : !board[i].dead)));
    Assert.true(at(people[2]) > board.findIndex((x) => !x.dead && x.holding === 0));
    // Ties are broken by id, so the order is the same every time.
    const tied = board.filter((x) => !x.dead && x.power === null && x.holding === 0).map((x) => x.character.id);
    Assert.equal(orderBy(tied, idNumber), tied);
    // The realms' final scores are their kings' rows.
    Assert.equal(board.filter((x) => x.power !== null).map((x) => x.power), new TurnEngine(s).finalScores().map((x) => x.power));
  });

  test("A king is measured from his accession, against what he inherited", () => {
    const s = world();
    const e = new TurnEngine(s);
    s.startStrength.set("Egypt", e.strength("Egypt") / 2);
    const row = Assert.single(e.scoreboard(), (x) => x.power === "Egypt");
    Assert.equal(standingOf("Egypt", 2) / 2, row.performance);
  });

  test("A character is measured by what he gained since he came into play; the dead by nothing", () => {
    const c = newCharacter({ id: "c1", name: "Mane", origin: "Thebes" });
    [c.purse, c.earned.savings] = [40, 40];
    Assert.equal(1, characterResult(c));
    gain(c, 100, "Fees");
    Assert.equal(101, characterResult(c));
    // Below what he brought, in proportion to what he kept of it.
    c.purse = 10;
    Assert.equal(0.25, characterResult(c));
    c.status = "Dead";
    Assert.equal(0, characterResult(c));
  });

  test("A character at the middle of characters' par performs at the middle, as a king at his realm's par does", () => {
    const mid = CharacterPar[Math.floor(CharacterPar.length / 2)];
    Assert.true(Math.abs(rankAmong(CharacterPar, mid) - 0.5) < 0.1);
    // A run of tied results ranks at its middle.
    Assert.equal(0.5, rankAmong([1, 1, 1, 1], 1));
  });

  test("The winner is the first person on the board, a character by his own name", () => {
    const s = world();
    const e = new TurnEngine(s);
    e.decideWinners();
    const first = e.scoreboard()[0];
    Assert.equal([first.power ?? first.character.name], s.winners);
    // A merchant who gained far beyond every king stands first, and wins.
    const c = s.characters.find((x) => x.duty !== "Ruling" && x.status !== "Dead")!;
    [c.purse, c.earned.savings] = [100000, 0];
    e.decideWinners();
    Assert.equal(c, e.scoreboard()[0].character);
    Assert.equal([c.name], s.winners);
  });

  test("A king who dies held his realm, and is ranked below the living by it", () => {
    const s = world();
    const e = new TurnEngine(s);
    const c = kingOf(s, "Hatti");
    const realm = Math.round(e.strength("Hatti"));
    c.status = "Dead";
    e.kingDied(c, "in battle", e.courtAt("Hatti"));
    Assert.equal(realm, c.diedWith);
    const row = Assert.single(e.scoreboard(), (x) => x.character === c);
    Assert.equal([true, null, realm], [row.dead, row.power, row.holding]);
  });

  test("A board line says who the person is, what he holds and how it was measured", () => {
    const s = world();
    const c = s.characters.find((x) => x.duty !== "Ruling" && x.employer === "Egypt")!;
    [c.purse, c.hoard, c.earned] = [0, newHoard({ at: "Egypt", gold: 32 }), newEarnings()];
    gain(c, 250, "Fees");
    gain(c, 30, "Skimmed");
    const row = Assert.single(new TurnEngine(s).scoreboard(), (x) => x.character === c);
    Assert.contains(`${c.name}`, boardLine(row));
    Assert.contains("(serving Egypt): ", boardLine(row));
    Assert.contains("holds 312, size ", boardLine(row));
    Assert.contains("; purse 280, hoard 32; fees 250, skimmed 30)", boardLine(row));
    const king = Assert.single(new TurnEngine(s).scoreboard(), (x) => x.power === "Egypt");
    Assert.contains(`${kingOf(s, "Egypt").name}, Great King of Egypt: `, boardLine(king));
  });
});
