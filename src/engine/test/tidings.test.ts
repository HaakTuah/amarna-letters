import { describe, test } from "vitest";
import { Dict, type GameState, type Power, TidingsTitle, TurnEngine, Views, WorldMap, clause, inboxOf, newGame, newGameConfig, newOwnerChange, newTablet, newTurnSubmission } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

const map = WorldMap.default;

/**
 * Egypt, Babylonia and Elam; in season 1 Ashur, which no king held, passes to Elam beside Babylonia's land, out of
 * Egypt's sight. `bond` binds Babylonia to Egypt: as allies, as Egypt's vassal, or not at all.
 */
function world(bond: "ally" | "vassal" | "none", repudiated = false): GameState {
  const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia", "Elam");
  if (bond !== "none")
    s.tablets.push(
      newTablet({
        id: "t990",
        text: bond === "ally" ? "Let us be allies." : "I am your servant.",
        clauses: [clause(bond === "ally" ? "alliance" : "serve")],
        proposedBy: "Babylonia",
        partner: "Egypt",
        seals: ["Babylonia", "Egypt"],
        sealedTurn: 0,
        allianceOath: bond === "ally",
        vassal: bond === "vassal" ? "Babylonia" : null,
        repudiatedTurn: repudiated ? 0 : null,
        byHandOf: repudiated ? "Babylonia" : null,
      }),
    );
  return s;
}

/** Plays seasons to the end of `last`, Ashur passing to Elam in season 1. */
function play(s: GameState, last: number): void {
  while (s.turn < last) {
    new TurnEngine(s, map).beginTurn();
    if (s.turn === 1) {
      s.owner.set("ashur", "Elam");
      s.ownerLog.push(newOwnerChange({ province: "ashur", turn: 1, owner: "Elam" }));
      s.ledger.set("ashur", new Dict([["Elam" as Power, 5000]]));
    }
    new TurnEngine(s, map).resolve(new Dict());
  }
}

const told = (s: GameState): boolean => inboxOf(s, "Egypt").some((i) => i.title === TidingsTitle);

describe("TidingsTests", () => {
  test("An ally's word of land changing hands in its sight reaches its ally by the road, and sets the holder he knows (#618)", () => {
    const s = world("ally");
    Assert.true(Views.sight(s, map, "Babylonia").has("ashur"));
    Assert.false(Views.sight(s, map, "Egypt").has("ashur"));
    // Word from Babylon's court to Egypt's, setting out at the end of season 1.
    const at = 1 + 1 + new TurnEngine(s, map).wordTo("Egypt", "babylon");
    play(s, at - 1);
    new TurnEngine(s, map).beginTurn();
    if (s.turn < at) Assert.false(told(s));
    while (s.turn < at) {
      new TurnEngine(s, map).resolve(new Dict());
      new TurnEngine(s, map).beginTurn();
    }
    Assert.true(told(s));
    const notice = inboxOf(s, "Egypt").find((i) => i.title === TidingsTitle)!;
    Assert.equal("Your ally Babylonia sends word of season 1: Ashur, which had no king, now answers to Elam.", notice.body);
    // What the court knows: its view shows Elam (by this word, or by word from Ashur itself if as fresh).
    Assert.equal("Elam", Views.knownHolders(s, map, "Egypt").get("ashur").owner);
    Assert.equal("your ally Babylonia", s.known.get("Egypt").get("ashur").source);
    // Its event is Egypt's alone.
    const e = s.events.find((x) => x.kind === "tidings" && x.text === notice.body)!;
    Assert.equal(["Egypt"], e.visibleTo);
    Assert.equal(at, e.turn);
  });

  test("A vassal reports to his overlord (#618)", () => {
    const s = world("vassal");
    play(s, 6);
    Assert.true(inboxOf(s, "Egypt").some((i) => i.title === TidingsTitle && i.body.startsWith("Your vassal Babylonia sends word")));
  });

  test("No word comes without a bond, or from a bond its reporter knows repudiated, and none goes to the king who took the land (#618)", () => {
    for (const s of [world("none"), world("ally", true)]) {
      play(s, 6);
      Assert.false(told(s));
      Assert.false(s.events.some((e) => e.kind === "tidings"));
    }
    const s = world("ally");
    play(s, 6);
    Assert.false(inboxOf(s, "Elam").some((i) => i.title === TidingsTitle));
  });
});
