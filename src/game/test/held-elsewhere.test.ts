import { describe, test } from "vitest";
import { Dict, TurnEngine, Views, WorldMap, hire, newCharacter, newGame, newGameConfig, newId, newTraits, newTurnSubmission } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { Assert, smallWorld } from "../../engine/test/support.ts";

describe("HeldElsewhereTests", () => {
  test("A script king reads that a person it offered a job is held at another court, and offers him none again (bug #656)", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
    const c = newCharacter({ id: newId(s, "c"), name: "Ahmose", status: "Free", at: "Egypt", heldBy: "Babylonia", traits: newTraits({ loyalty: 60, greed: 40, ambition: 30, courage: 50, competence: 50 }), tongues: new Dict([["Egyptian", 100]]) });
    s.characters.push(c);
    new TurnEngine(s, WorldMap.default).beginTurn();
    new TurnEngine(s, WorldMap.default).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [hire(c.id, 60, 6, 30)] })]]));
    const v = Views.for(s, "Egypt");
    Assert.true(v.inbox.some((i) => i.title === "Orders that could not be carried out" && i.body.includes("cannot come to yours")));
    const brain = new Brain("Egypt", 1);
    brain.learn(v, new Board(v));
    Assert.true(brain.heldElsewhere.has(c.id));
  });
});
