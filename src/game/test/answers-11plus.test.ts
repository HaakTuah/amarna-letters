import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { Views, clause, newGame, newGameConfig, newTablet, newTabletCopy, newId, type GameState, type Power } from "@amarna/engine";
import { ScriptLeader } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";

// Build order item 11d: what the script players make of Haakon's answers to item 11+'s review.
describe("The answers to item 11+, as the script players play them", () => {
  const sealed = (s: GameState, giver: Power, receiver: Power, province: string): void => {
    s.tablets.push(newTablet({ id: "t990", text: "I give you my city.", proposedBy: giver, partner: receiver, seals: [giver, receiver], createdTurn: 1, sealedTurn: 1, clauses: [clause("cede", { province })] }));
    for (const holder of [giver, receiver]) s.copies.push(newTabletCopy({ id: newId(s, "k"), tabletId: "t990", holder, acquiredTurn: 1, source: "sealed at audience" }));
  };

  test("A script ruler never cedes his capital, even with the tablet sealed", async () => {
    // A seat plays for its power's growth, and nothing in it makes giving up the whole realm pay (Haakon: "a character
    // based on the incentive structure we have now should never say yes").
    const s = newGame(3, newGameConfig({ catastropheChance: 0 }));
    sealed(s, "Byblos", "Egypt", "byblos");
    const orders = (await new ScriptLeader(3).decide(Views.for(s, "Byblos"))).orders;
    Assert.doesNotContain(orders, (o) => o.type === "cede" && o.province === "byblos");
  });

  test("A script king reckons land by the score's fixed weight and discounts its yield as the end draws near", () => {
    // The score counts the land at its fixed weight (tuned in item 18); what the land will still yield is reckoned over
    // the seasons the king believes are left, which shrink as the age goes on.
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const early = new Board(Views.for(s, "Mitanni"));
    s.turn = 60;
    const late = new Board(Views.for(s, "Mitanni"));
    Assert.true(late.horizon < early.horizon);
    Assert.true(late.value("harran") < early.value("harran"));
    Assert.equal(early.worth("harran"), late.worth("harran"));
  });
});
