import { describe, test } from "vitest";
import { Dict, TurnEngine, Views, crown, inboxOf, newCharacter, newDeclaration, newGame, newGameConfig, newGovernor, newId, newTraits, type GameState } from "@amarna/engine";
import { Assert } from "./support.ts";

// Item 17++, part C (hidden information, the review of #378): a court's view keeps what it believes until word of the change
// can be read at its court, in the same season as the notice that carries it: a governor's end, a kingship's answer, a
// province's declaration ended, taken up or refused. Nippur and Babylon lie a season's word from Egypt's court. Real seasons are played (each
// season begins, then resolves with no orders), since the moment a view changes depends on where in the season a change
// falls.
describe("SeatWordTests", () => {
  const quiet = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 }));
  /** Egypt holding Nippur under a governor of its own, a season's word from its court. */
  function governed(): [GameState, string] {
    const s = quiet();
    new TurnEngine(s).setOwner("nippur", "Egypt");
    const c = newCharacter({ id: newId(s, "c"), name: "Amenemope", traits: newTraits({ loyalty: 60, greed: 50, ambition: 10, courage: 60, competence: 50 }), status: "Employed", employer: "Egypt", duty: "Governing", watchProvince: "nippur", purse: 0, grantedBy: "Egypt" });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "nippur", seat: "nippur", character: c.id, power: "Egypt", from: 0 }));
    Assert.equal(1, new TurnEngine(s).wordTo("Egypt", "nippur"));
    return [s, c.id];
  }
  /** Plays seasons: each begins (what the seats are shown is taken then), `look` reads it, then it resolves. */
  function play(s: GameState, n: number, look: (s: GameState) => void): void {
    for (let k = 0; k < n; k++) {
      const e = new TurnEngine(s);
      e.beginTurn();
      look(s);
      e.resolve(new Dict());
    }
  }
  /** Whether word of the kingship's answer (taken, refused or not to be given) is in the court's inbox. */
  const answered = (s: GameState): boolean => inboxOf(s, "Egypt").some((i) => i.title.startsWith("A kingship ") && i.title !== "A kingship offered");

  test("A governor's end leaves his king's view the season its word can be read there", () => {
    const [s, id] = governed();
    s.characters.find((c) => c.id === id)!.status = "Dead";
    const shown: boolean[] = [];
    play(s, 4, (x) => shown.push(Views.for(x, "Egypt").governors.some((g) => g.province === "nippur")));
    // Dropped as the first season began; word from a season away is read two seasons later, as `tell` carries it.
    Assert.equal([true, true, false, false], shown);
  });

  test("A kingship's answer leaves the grant pending in the view until its notice is read", () => {
    const [s, id] = governed();
    new TurnEngine(s).grantCrown("Egypt", crown(id, ["nippur"], 1000));
    const rows: [boolean, boolean][] = [];
    play(s, 8, (x) => rows.push([Views.for(x, "Egypt").crowning.includes(id), answered(x)]));
    // Pending until the refusal is in the inbox, and from then on gone, in the same season.
    const first = rows.findIndex(([, heard]) => heard);
    Assert.true(first > 0);
    for (const [k, [pending, heard]] of rows.entries()) Assert.equal([k, !heard], [k, pending]);
  });

  test("A declaration ended stands in its court's view until word of the end can be read; taken up, until word of that", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    e.beginTurn();
    const d = newDeclaration({ province: "babylon", power: "Egypt", known: s.turn });
    s.declarations.push(d);
    Assert.single(Views.for(s, "Egypt").declared);
    // Its people no longer lean his way (no season affirms it): gone from the rule now, from his view once word can be read.
    e.declarationsLapse(new Set(), new Set());
    Assert.equal(e.heardAt("Egypt", "babylon"), d.gone);
    Assert.true(d.gone! > s.turn + 1);
    Assert.single(Views.for(s, "Egypt").declared);
    s.turn = d.gone! - 1;
    Assert.single(Views.for(s, "Egypt").declared);
    s.turn = d.gone!;
    Assert.empty(Views.for(s, "Egypt").declared);
    // Taken up: shown so only from the season its notice is read, which `tell` carries home.
    const t = quiet();
    const f = new TurnEngine(t);
    f.beginTurn();
    t.declarations.push(newDeclaration({ province: "babylon", power: "Egypt", known: t.turn }));
    const takenUp: boolean[] = [];
    const heard: boolean[] = [];
    f.answerProvince("Egypt", { type: "answer", province: "babylon", take: true });
    f.resolve(new Dict());
    play(t, 3, (x) => {
      takenUp.push(Views.for(x, "Egypt").declared[0]?.takenUp ?? false);
      heard.push(heard.at(-1) === true || inboxOf(x, "Egypt").some((i) => i.title === "A province taken up"));
    });
    // Until the notice, not taken up in its view; with it, taken up (later the test's declaration, with nobody behind it, lapses).
    Assert.equal([false, true], takenUp.slice(0, 2));
    Assert.equal(heard.slice(0, 2), takenUp.slice(0, 2));
    // Refused: shown until the season its notice is read, then gone.
    const r = quiet();
    const g = new TurnEngine(r);
    g.beginTurn();
    r.declarations.push(newDeclaration({ province: "babylon", power: "Egypt", known: r.turn }));
    g.answerProvince("Egypt", { type: "answer", province: "babylon", take: false });
    g.resolve(new Dict());
    const rows: [boolean, boolean][] = [];
    play(r, 3, (x) => rows.push([Views.for(x, "Egypt").declared.length > 0, inboxOf(x, "Egypt").some((i) => i.title === "A province refused")]));
    Assert.equal([true, false], rows[0]);
    for (const [k, [shown, told]] of rows.entries()) Assert.equal([k, !told], [k, shown]);
  });
});
