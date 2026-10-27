import { describe, test } from "vitest";
import { text } from "../../llm/src/schemas.ts";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { archetype } from "../src/bots/personality.ts";
import { Statecraft } from "../src/bots/statecraft.ts";
import { type HostReply, Rng, Views, newAudienceView, newGame, newTabletView } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";

describe("SealingTests", () => {
  // <summary>Hatti's script king hears Arzawa's envoy, who carries a tablet with this text, in season 1.</summary>
  function hear(text: string): HostReply {
    let s = newGame(5);
    let court = Views.for(s, "Hatti");
    let brain = new Brain("Hatti", 5);
    brain.learn(court, new Board(court));
    let board = new Board(court, undefined, brain.treasury);
    let audience = newAudienceView({
      audienceId: "a1",
      turn: 1,
      round: 1,
      maxRounds: 2,
      from: "Arzawa",
      host: "Hatti",
      proposal: newTabletView({ text: text, proposedBy: "Arzawa", partner: "Hatti" }),
    });
    return Statecraft.host(audience, board, brain, Rng.for(5, 1, "test", "host"));
  }

  test.each([
    ["Arzawa and Hatti are at peace. Each spring Hatti shall send Arzawa fifty shekels of gold."],
    ["Arzawa and Hatti are at peace, and Hatti shall pay tribute to its brother."],
    ["Arzawa and Hatti are at peace. The land west of the river is Arzawa's."],
    ["Arzawa and Hatti are at peace, and Kanesh shall be Arzawa's."],
    ["Arzawa and Hatti are at peace; the troops of Arzawa may pass through tuwanuwa."],
  ] as const)("A script host seals no foreign tablet that gives land gold or tribute or names its provinces %s", (text: string) => {
    let reply = hear(text);
    Assert.false(reply.sealProposal);
    Assert.contains("I will not seal a tablet that speaks of land, gold or tribute, or names a province of mine.", reply.speech);
  });

  test("A foreign tablet that gives nothing away is sealed as before", () => {
    Assert.true(hear("Arzawa and Hatti are at peace. Neither shall march on the other while this oath stands.").sealProposal);
    // Naming someone else's province is no concern of Hatti's.
    Assert.true(hear("Arzawa and Hatti are at peace, and neither shall march on Mira.").sealProposal);
  });

  test("Tablets in a script kings own words are read as before", () => {
    // The script kings' peace speaks of "the lands of the other"; it is theirs, so it is sealed.
    Assert.true(hear(Statecraft.peaceTablet("Arzawa", "Hatti")).sealProposal);
    // So is the frozen baseline's peace with an alliance in it.
    Assert.true(
      hear(
        "By Shamash, Amun, Marduk and Teshub: Arzawa and Hatti are brothers. Neither king shall send troops into the lands of the other. " +
          "They shall stand together against any enemy, and share in the victory. If one breaks this oath, may the gods destroy his name and his seed.",
      ).sealProposal,
    );
    // The same words with a clause added are someone else's, and read for what they give away.
    Assert.false(hear(Statecraft.peaceTablet("Arzawa", "Hatti") + " Kanesh shall be Arzawa's.").sealProposal);
  });

  test("A host never seals a tablet from the king it makes war on however faithless it is", () => {
    let s = newGame(5);
    let court = Views.for(s, "Arzawa");
    let faithless = { ...archetype("Arzawa"), cunning: 1, honesty: 0 };
    let brain = new Brain("Arzawa", 5, faithless);
    brain.learn(court, new Board(court));
    brain.warTarget = "Hatti";
    let board = new Board(court, undefined, brain.treasury);
    let audience = newAudienceView({
      audienceId: "a1",
      turn: 1,
      round: 1,
      maxRounds: 2,
      from: "Hatti",
      host: "Arzawa",
      proposal: newTabletView({ text: Statecraft.peaceTablet("Hatti", "Arzawa"), proposedBy: "Hatti", partner: "Arzawa" }),
    });
    Assert.false(Statecraft.host(audience, board, brain, Rng.for(5, 1, "test", "host")).sealProposal);
  });
});
