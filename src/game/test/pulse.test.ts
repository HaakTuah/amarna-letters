import { describe, test } from "vitest";
import { logEvent, newGame } from "@amarna/engine";
import { pulseOf, pulseReport } from "../src/pulse.ts";
import { Assert } from "../../engine/test/support.ts";

// Item 17++a: the pulse counts, king by king and season by season, what reaches each Great King and what happens anywhere.
describe("PulseTests", () => {
  test("A king's seasons with an event of his own, his seasons per change of the map, and what reached nobody", () => {
    const s = newGame(1);
    s.turn = 1;
    logEvent(s, "battle", "A battle.", ["Egypt"]);
    s.turn = 2;
    logEvent(s, "conquest", "Gaza taken.", ["Egypt", "Hatti"]);
    s.turn = 3;
    logEvent(s, "declare", "Nobody heard.", []);
    s.turn = 4;
    const p = pulseOf(s);
    Assert.equal(50, p.letter["Egypt"]);
    Assert.equal([4, 1], [p.lived["Egypt"], p.mapHeard["Egypt"]]);
    Assert.equal([4, 0], [p.lived["Babylonia"], p.mapHeard["Babylonia"]]);
    Assert.equal(25, p.letter["Hatti"]);
    Assert.equal(0, p.letter["Babylonia"]);
    Assert.equal(75, p.worldLetter);
    Assert.equal(25, p.worldMap);
    Assert.equal(33, p.unseen);
    // A king who heard no change of the map in any game never reads as hearing one; his seasons count where he heard none.
    Assert.contains("Egypt 50% / 4,", pulseReport([p]));
    Assert.contains("Babylonia 0% / never,", pulseReport([p]));
    Assert.contains("Egypt 50% / 8,", pulseReport([p, { ...p, letter: { Egypt: 50 }, mapHeard: { Egypt: 0 } }]));
  });
});
