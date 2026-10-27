import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { Names } from "../src/bots/names.ts";
import { type Power, Views, newGame, newTablet, newTabletCopy } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";

describe("NamesTests", () => {
  test.each([
    ["Mitanni and Egypt swear to stand together against Hatti.", "Hatti"],
    ["Against Hatti, we are one.", "Hatti"],
    ["We stand together against the Hittites.", "Hatti"],
    ["We stand together against the king of Hatti and his allies.", "Hatti"],
    ["We swear against Suppiluliuma.", "Hatti"],
    ["We will hold firm against Babylon.", "Babylonia"],
    ["We will hold firm against Karduniash.", "Babylonia"],
    ["A pact against the Babylonians.", "Babylonia"],
    ["against BURNA-BURIASH", "Babylonia"],
    ["An oath against the Egyptians.", "Egypt"],
    ["An oath against Pharaoh.", "Egypt"],
    ["An oath against the Assyrian.", "Assyria"],
    ["An oath against Ashur-uballit.", "Assyria"],
    ["An oath against the Mitannians.", "Mitanni"],
    ["An oath against the Arzawans.", "Arzawa"],
    ["An oath against the Cypriots.", "Alashiya"],
    ["An oath against the King of Alashiya.", "Alashiya"],
    ["An oath against Alashiyan pirates.", "Alashiya"],
  ] as const)("A coalition names its foe by any of his names %s", (text: string, foe: Power) => {
    Assert.true(Names.swornAgainst(text, foe));
    Assert.equal(foe, Names.swornAgainstAny(text, []));
  });

  test.each([
    ["Each shall stand with the other against any enemy."],
    ["We guard the river against floods, and Hatti is our brother."],
    ["Against all who would harm us."],
    ["An oath against Hattusa's walls."],
  ] as const)("A text that does not stand against a king names no foe %s", (text: string) => {
    Assert.null(Names.swornAgainstAny(text, []));
  });

  test("The sealers themselves are never the foe", () => {
    let text = "Hatti and Egypt swear to stand together against the Babylonians, and Hatti shall support Egypt against Babylon.";
    Assert.equal("Babylonia", Names.swornAgainstAny(text, ["Hatti", "Egypt"]));
    Assert.null(Names.swornAgainstAny("Egypt shall not march against Hatti.", ["Hatti", "Egypt"]));
  });

  test("Names are whole words", () => {
    Assert.true(Names.mentions("The Hittite king has spoken.", "Hatti"));
    Assert.true(Names.mentions("Hatti's armies are many.", "Hatti"));
    Assert.false(Names.mentions("The walls of Hattusa stand.", "Hatti"));
    Assert.false(Names.mentions("The Babylonia road.", "Assyria"));
    Assert.true(Names.mentionsPlace("Ashur shall be yours.", "Ashur"));
    Assert.false(Names.mentionsPlace("Ashur-uballit greets you.", "Ashur"));
    Assert.false(Names.mentionsPlace("The Babylonians send greetings.", "Babylon"));
    Assert.true(Names.mentionsPlace("I yield the seha river land to you.", "Seha River Land"));
  });

  test("A sealed tablet against the Hittites makes a coalition against Hatti", () => {
    let s = newGame(11);
    s.tablets.push(
      newTablet({
        id: "t90",
        text: "Before the gods, Mitanni and Egypt are one against the Hittites.",
        proposedBy: "Mitanni",
        partner: "Egypt",
        seals: ["Mitanni", "Egypt"],
        createdTurn: 1,
        sealedTurn: 1,
      }),
    );
    s.copies.push(newTabletCopy({ id: "k90", tabletId: "t90", holder: "Egypt", acquiredTurn: 1, source: "sealed at audience" }));
    let view = Views.for(s, "Egypt");
    let brain = new Brain("Egypt", 11);
    brain.learn(view, new Board(view));
    Assert.equal("Hatti", brain.rel.get("Mitanni").against);
    Assert.true(brain.rel.get("Mitanni").treaty);
  });
});
