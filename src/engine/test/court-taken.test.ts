import { describe, test } from "vitest";
import { type GameState, type Power, TurnEngine, newGame, newGameConfig } from "@amarna/engine";
import { Assert, courtGoing, smallWorld } from "./support.ts";

// Item 17b, part C2: the court as a place that can be taken, its treasury lost with it, its flight a real journey, and
// the heir of a fallen realm an exile with a claim.
describe("CourtTakenTests", () => {
  const kingOf = (s: GameState, p: Power) => s.characters.find((c) => c.id === s.reigns.get(p).character)!;
  const world = (): GameState => smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti", "Mitanni");

  test("A court taken loses its treasury to the taker and flees by road to a city its realm holds", () => {
    const s = world();
    const e = new TurnEngine(s);
    s.treasuries.get("Egypt").gold = 400;
    const before = s.treasuries.get("Hatti").gold;
    s.owner.set("akhetaten", "Hatti");
    e.courtFlees("Egypt", "Hatti", false);
    Assert.equal(0, s.treasuries.get("Egypt").gold);
    // Far from Hatti's court: kept in a coffer of Hatti's there, or its treasury.
    const coffer = s.coffers.find((c) => c.power === "Hatti" && c.province === "akhetaten")?.gold ?? 0;
    Assert.equal(400, s.treasuries.get("Hatti").gold - before + coffer);
    const road = Assert.single(s.kingRoads.filter((r) => r.power === "Egypt"));
    Assert.false(road.alone);
    Assert.equal("Egypt", s.owner.get(courtGoing(s, "Egypt")));
    Assert.contains(s.events, (x) => x.signal === "court-treasury" && x.visibleTo.length === 1 && x.visibleTo[0] === "Hatti");
  });

  test("A court taken on the road loses its archive with it", () => {
    const s = world();
    const e = new TurnEngine(s);
    const had = s.copies.filter((k) => k.holder === "Egypt").length;
    e.courtFlees("Egypt", "Hatti", true);
    Assert.empty(s.copies.filter((k) => k.holder === "Egypt"));
    Assert.true(had === 0 || s.events.some((x) => x.kind === "archive-taken"));
    Assert.contains(s.events, (x) => x.signal === "court-taken-road");
  });

  test("Word of a king's death is sent on to a court that has moved since", () => {
    const s = world();
    const e = new TurnEngine(s);
    const c = kingOf(s, "Egypt");
    c.status = "Dead";
    e.kingDeadWord("Egypt", "gaza", "akhetaten", "The king is dead.");
    const j = s.journeys[s.journeys.length - 1];
    s.court.set("Egypt", "thebes");
    e.kingDeadHeard(j);
    // Not yet: the word goes on from Akhetaten to Thebes.
    Assert.equal(c.id, s.reigns.get("Egypt").character);
    const on = s.journeys[s.journeys.length - 1];
    Assert.equal(["KingDead", "thebes"], [on.news, on.toProvince]);
    e.kingDeadHeard(on);
    Assert.notEqual(c.id, s.reigns.get("Egypt").character);
  });

  test("The last king of a fallen realm dies: his heir lives on in exile, with a claim", () => {
    const s = world();
    const e = new TurnEngine(s);
    const c = kingOf(s, "Mitanni");
    e.fall("Mitanni", "Hatti");
    c.status = "Dead";
    e.kingDied(c, "put to death by Hatti", e.courtAt("Hatti"));
    // Not yet: word of his death goes to where his realm fell, and the heir is raised when it comes.
    Assert.equal(c.id, kingOf(s, "Mitanni").id);
    const word = s.journeys[s.journeys.length - 1];
    Assert.equal(["KingDead", e.fallOf("Mitanni")!.capital], [word.news, word.toProvince]);
    e.kingDeadHeard(word);
    const heir = kingOf(s, "Mitanni");
    Assert.notEqual(c.id, heir.id);
    Assert.equal(["Free", null], [heir.status, heir.employer]);
    // He walks from there to the court nearest it.
    Assert.contains(s.journeys, (j) => j.kind === "Travel" && j.characterId === heir.id);
    Assert.contains(heir.facts, (f) => f.text.includes("claims its throne"));
    Assert.contains(s.events, (x) => x.kind === "king-exile");
  });
});
