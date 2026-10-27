import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { host } from "../src/bots/statecraft-letters.ts";
import { Statecraft } from "../src/bots/statecraft.ts";
import { type HostReply, type Power, Rng, Views, newAudienceView, newGame, newTabletView } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";

// A capital's name often stands for its king, his realm or a god: Babylon is a name of Babylonia, Ashur is Assyria's god,
// and the king of Hattusa is the king of Hatti. A script host refuses such a tablet only when it hands the capital over.
describe("CapitalNameTests", () => {
  function givesAway(host: Power, from: Power, text: string): boolean {
    let view = Views.for(newGame(5), host);
    return Statecraft.givesAway(newTabletView({ text: text, proposedBy: from, partner: host }), new Board(view), from);
  }

  test.each([
    ["Babylonia", "By the gods: Egypt and Babylon are brothers. Neither king shall attack the other."],
    ["Assyria", "By Ashur and Shamash: Egypt and Assyria are brothers. Neither king shall attack the other."],
    ["Assyria", "Before Ashur and Teshub, Egypt and Assyria are brothers, and the friend of one is the friend of the other."],
    ["Hatti", "The king of Hattusa and the king of Egypt are brothers, and neither shall march on the other."],
  ] as const)("A capital named for its king or a god gives nothing away %s", (host: Power, text: string) => {
    Assert.false(givesAway(host, "Egypt", text));
  });

  test.each([
    ["Babylonia", "Egypt and Babylonia are brothers, and Babylon shall be Egypt's."],
    ["Hatti", "Egypt and Hatti are at peace. Hatti yields Hattusa to Egypt."],
    ["Hatti", "Hattusa is the share of Egypt, and the rest is Hatti's."],
    ["Assyria", "By Ashur: Egypt and Assyria are brothers, and Ashur passes to Egypt."],
    ["Assyria", "By Ashur: Egypt and Assyria are brothers, and Nineveh shall be Egypt's."],
  ] as const)("A capital handed over or another province named is still refused %s", (host: Power, text: string) => {
    Assert.true(givesAway(host, "Egypt", text));
  });

  test("A babylonian host reads babylon as karduniash", () => {
    let s = newGame(5);
    let court = Views.for(s, "Babylonia");
    function hear(text: string): HostReply {
      let brain = new Brain("Babylonia", 5);
      brain.learn(court, new Board(court));
      let audience = newAudienceView({
        audienceId: "a1",
        turn: 1,
        round: 1,
        maxRounds: 2,
        from: "Egypt",
        host: "Babylonia",
        proposal: newTabletView({ text: text, proposedBy: "Egypt", partner: "Babylonia" }),
      });
      return Statecraft.host(audience, new Board(court, undefined, brain.treasury), brain, Rng.for(5, 1, "test", "host"));
    }

    let babylon = hear("Egypt and Babylon are brothers. Neither shall march on the other.");
    let karduniash = hear("Egypt and Karduniash are brothers. Neither shall march on the other.");
    Assert.equal(karduniash.sealProposal, babylon.sealProposal);
    Assert.doesNotContain("names a province of mine", babylon.speech);
  });
});
