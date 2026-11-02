import { describe, test } from "vitest";
import { TurnEngine, Views, newDeclaration, newGame, newGameConfig, notify } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
import { talkedAway, talkedOurWay, TalkPlay } from "../src/bots/talk.ts";
import { Assert } from "../../engine/test/support.ts";

// Item 17++, part D: script kings act on talk of a province's leaning: its king eases it while the talk is fresh, and the
// king it leans to posts a spy there, whose reports bring its offer home.
describe("TalkPlayTests", () => {
  test("The land's king keeps the talk as a dated travellers' read and eases the land while it is fresh", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const e = new TurnEngine(s);
    e.beginTurn();
    const d = newDeclaration({ province: "babylon", power: "Egypt" });
    s.declarations.push(d);
    e.sendOffer(d, "Babylonia", "The people declare for you.");
    const read = s.moodReads.find((r) => r.power === "Babylonia" && r.province === "babylon" && r.source === "travellers")!;
    s.turn = read.known;
    Assert.contains(talkedAway(new Board(Views.for(s, "Babylonia"))), (x) => x === "babylon");
    s.turn = read.seen + 5;
    Assert.doesNotContain(talkedAway(new Board(Views.for(s, "Babylonia"))), (x) => x === "babylon");
  });

  test("The king it leans to marks it as a place for a spy; kings that ignore talk do not", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    notify(s, "Egypt", "Rumor", "Talk of Babili", "Travellers say the people of Babili lean your way. It is talk, not their word.");
    Assert.equal(["babylon"], talkedOurWay(new Board(Views.for(s, "Egypt"))));
    TalkPlay.off = true;
    try {
      Assert.equal([], talkedOurWay(new Board(Views.for(s, "Egypt"))));
    } finally {
      TalkPlay.off = false;
    }
  });
});
