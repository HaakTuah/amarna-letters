import { describe, test } from "vitest";
import { TurnEngine, Views, crown, newCharacter, newDeclaration, newGame, newGameConfig, newGovernor, newId, newTraits, type GameState } from "@amarna/engine";
import { Assert } from "./support.ts";

// Item 17++, part C (hidden information, the review of #378): a court's view keeps what it believes until word of the change
// reaches it: a governor's end, a kingship's answer, a province's declaration ended. Babylon and Nippur lie a season's
// word from Egypt's court; the steps that carry each change are called directly on the starting world.
describe("SeatWordTests", () => {
  const quiet = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 }));
  const man = (s: GameState, name: string): string => {
    const c = newCharacter({ id: newId(s, "c"), name, traits: newTraits({ loyalty: 60, greed: 50, ambition: 10, courage: 60, competence: 50 }), status: "Employed", employer: "Egypt", duty: "Governing", watchProvince: "nippur", purse: 0, grantedBy: "Egypt" });
    s.characters.push(c);
    return c.id;
  };
  /** Egypt holding Nippur under a governor of its own, a season's word from its court. */
  function governed(): [GameState, TurnEngine, string] {
    const s = quiet();
    const e = new TurnEngine(s);
    e.setOwner("nippur", "Egypt");
    const id = man(s, "Amenemope");
    s.governors.push(newGovernor({ province: "nippur", seat: "nippur", character: id, power: "Egypt", from: 0 }));
    Assert.equal(1, e.wordTo("Egypt", "nippur"));
    return [s, e, id];
  }

  test("A governor's death reaches his king's view only when its word does", () => {
    const [s, e, id] = governed();
    s.characters.find((c) => c.id === id)!.status = "Dead";
    e.governorsSeason();
    Assert.false(s.governors.some((g) => g.character === id));
    // Still his governor in Egypt's view this season; gone the next, when the word has come.
    Assert.true(Views.for(s, "Egypt").governors.some((g) => g.province === "nippur" && g.character === id));
    s.turn++;
    e.governorsSeason();
    Assert.false(Views.for(s, "Egypt").governors.some((g) => g.province === "nippur"));
  });

  test("A kingship's answer reaches the court only when its word does", () => {
    const [s, e, id] = governed();
    e.grantCrown("Egypt", crown(id, ["nippur"], 1000));
    const k = s.crowns.find((x) => x.character === id)!;
    // The word reaches him, he answers (the tribute is far beyond the land), and his refusal sets out.
    s.turn = k.arrives;
    e.crownsSeason();
    s.turn++;
    e.crownsSeason();
    Assert.notEqual(null, k.heard);
    Assert.true(k.heard! > s.turn);
    Assert.true(Views.for(s, "Egypt").crowning.includes(id));
    s.turn = k.heard!;
    e.crownsSeason();
    Assert.false(Views.for(s, "Egypt").crowning.includes(id));
    Assert.false(s.crowns.includes(k));
  });

  test("A declaration ended stands in its court's view until word of the end comes; taken up, once word of that comes home", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    const d = newDeclaration({ province: "babylon", power: "Egypt", known: s.turn });
    s.declarations.push(d);
    Assert.single(Views.for(s, "Egypt").declared);
    // Its people no longer lean his way: gone from the rule now, from his view a season later.
    e.declarationsLapse(new Set(), new Set());
    Assert.notEqual(null, d.gone);
    Assert.single(Views.for(s, "Egypt").declared);
    s.turn = d.gone!;
    e.declarationsLapse(new Set(), new Set());
    Assert.empty(Views.for(s, "Egypt").declared);
    // Taken up: shown so only when word of it comes home.
    const t = quiet();
    const f = new TurnEngine(t);
    t.declarations.push(newDeclaration({ province: "babylon", power: "Egypt", known: t.turn }));
    f.answerProvince("Egypt", { type: "answer", province: "babylon", take: true });
    Assert.false(Views.for(t, "Egypt").declared[0].takenUp);
    t.turn++;
    Assert.true(Views.for(t, "Egypt").declared[0].takenUp);
  });
});
