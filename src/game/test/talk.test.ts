import { describe, test } from "vitest";
import { TurnEngine, Views, newDeclaration, newGame, newGameConfig, notify } from "@amarna/engine";
import { leaderRules } from "@amarna/llm";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { CourtTrust, talkedAway, talkedOurWay, TalkPlay } from "../src/bots/talk.ts";
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

  // #553: an offer read on a carrier caught is heeded as talk of it is: the land's king eases the land, a rival courts the
  // claimant.
  test("An offer read on a caught carrier eases the land's king's hand there while fresh, and warms a rival to its claimant", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const body = 'Among what Ahmose carried was the word of the people of Babili to Egypt, which never reached him: "The people of Babylon declare for you."';
    notify(s, "Babylonia", "Notice", "A letter taken on the road", body);
    notify(s, "Hatti", "Notice", "A letter taken on the road", body);
    const seat = (p: "Babylonia" | "Hatti", brain: Brain): Board => {
      const v = Views.for(s, p);
      brain.learn(v, new Board(v));
      const b = new Board(v);
      b.offersRead = brain.offersRead;
      return b;
    };
    const king = new Brain("Babylonia", 1);
    Assert.contains(talkedAway(seat("Babylonia", king)), (x) => x === "babylon");
    s.turn += 4;
    Assert.contains(talkedAway(seat("Babylonia", king)), (x) => x === "babylon");
    s.turn += 1;
    Assert.doesNotContain(talkedAway(seat("Babylonia", king)), (x) => x === "babylon");
    // Against the same rival that read nothing this season.
    const rival = new Brain("Hatti", 1);
    const unread = new Brain("Hatti", 1);
    const quiet = Views.for(newGame(1, newGameConfig({ catastropheChance: 0 })), "Hatti");
    unread.learn(quiet, new Board(quiet));
    s.turn = 1;
    seat("Hatti", rival);
    Assert.true(rival.rel.get("Egypt").trust >= unread.rel.get("Egypt").trust + CourtTrust * 0.9);
  });

  test("The rulebook says whom talk of a leaning reaches: the claimant, the land's king and his enemies, not his neighbours", () => {
    const rules = leaderRules(false, newGameConfig());
    Assert.contains("its holder and its holder's enemies (those whose troops stand in his land without his leave", rules);
    Assert.false(rules.includes("the kings beside it"));
  });
});
