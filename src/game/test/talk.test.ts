import { describe, test } from "vitest";
import { Dict, OfferCaught, TurnEngine, asSeenBy, land, quoteWords, setNameClaims, Views, inboxOf, newCharacter, newDeclaration, newGame, newGameConfig, newId, notify } from "@amarna/engine";
import { leaderRules } from "@amarna/llm";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { CourtTrust, offersCaught, talkedAway, talkedOurWay, TalkPlay } from "../src/bots/talk.ts";
import { Assert, removeAll } from "../../engine/test/support.ts";

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
    // The engine's own notice, to both captors: Babylon's offer to Egypt, its carrier taken on the road.
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const e = new TurnEngine(s);
    e.beginTurn();
    const d = newDeclaration({ province: "babylon", power: "Egypt" });
    s.declarations.push(d);
    for (const captor of ["Babylonia", "Hatti"]) {
      e.sendOffer(d, "Babylonia", "The people of Babylon declare for you.");
      const c = newCharacter({ id: newId(s, "c"), name: "Ahmose", status: "Employed", employer: "Egypt", at: "Babylonia", tongues: new Dict([["Akkadian", 100], ["Egyptian", 100]]) });
      s.characters.push(c);
      e.startTravel(c, "Egypt");
      e.carryLetters();
      removeAll(s.journeys, (j) => j.characterId === c.id && j.kind !== "Offer");
      c.status = "Captured";
      c.heldBy = captor;
      e.lettersGo();
    }
    Assert.contains(inboxOf(s, "Hatti"), (i) => i.title === "A letter taken on the road");
    const seat = (p: "Babylonia" | "Hatti", brain: Brain): Board => {
      const v = Views.for(s, p);
      brain.learn(v, new Board(v));
      return new Board(v, null, null, brain.offersRead);
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

  // Codex on #576: the notice names the claimant as the captor's court does; the script king knows him by that name.
  test("A caught offer to a claimant the court calls by his house still warms it to him", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const e = new TurnEngine(s);
    e.beginTurn();
    try {
      // Hatti has read Egypt's greeting claiming Mitanni's name, and gives that name to Mitanni: Egypt is Bit-... to it.
      e.claimHeard("Hatti", "Egypt", "Mitanni", s.turn);
      const house = asSeenBy("Hatti", () => land("Egypt"));
      Assert.true(house.startsWith("Bit-"));
      notify(s, "Hatti", "Notice", "A letter taken on the road", `${OfferCaught.opens}Ahmose${OfferCaught.people}Babili to Egypt: ${quoteWords("The people of Babylon declare for you.")}`);
      const v = Views.for(s, "Hatti");
      Assert.contains(v.inbox, (i) => i.body.includes(` to ${house}: `));
      Assert.equal([{ province: "babylon", claimant: "Egypt" }], offersCaught(new Board(v)));
    } finally {
      setNameClaims([], []);
    }
  });

  test("The rulebook says whom talk of a leaning reaches: the claimant, the land's king and his enemies, not his neighbours", () => {
    const rules = leaderRules(false, newGameConfig());
    Assert.contains("its holder and its holder's enemies (those whose troops stand in his land without his leave", rules);
    Assert.false(rules.includes("the kings beside it"));
  });
});
