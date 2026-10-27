import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { Statecraft } from "../src/bots/statecraft.ts";
import { Tactics } from "../src/bots/tactics.ts";
import { Views, newGame, newTablet, newTabletCopy } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";

describe("OathTests", () => {
  test("A full ally who takes our land is a friend no more", () => {
    // Egypt and Alashiya swore a full alliance in season 1.
    let s = newGame(5);
    s.tablets.push(
      newTablet({
        id: "t1",
        text: Statecraft.allianceTablet("Alashiya", "Egypt"),
        proposedBy: "Alashiya",
        partner: "Egypt",
        seals: ["Alashiya", "Egypt"],
        createdTurn: 1,
        sealedTurn: 1,
        allianceOath: true,
      }),
    );
    s.copies.push(newTabletCopy({ id: "k1", tabletId: "t1", holder: "Egypt", acquiredTurn: 1, source: "sealed at audience" }));
    let brain = new Brain("Egypt", 5);
    let first = Views.for(s, "Egypt");
    brain.learn(first, new Board(first));
    Assert.true(brain.isFriend("Alashiya"));

    // Then Alashiya takes Sinai.
    s.owner.set("sinai", "Alashiya");
    s.turn = 2;
    let view = Views.for(s, "Egypt");
    brain.learn(view, new Board(view));
    let r = brain.rel.get("Alashiya");
    Assert.true(r.allied);
    Assert.true(r.oathsBroken > 0);
    Assert.false(brain.isFriend("Alashiya"));

    // So Egypt will send troops against him, as against any king who wronged it.
    let board = new Board(view, brain.remembered(view), brain.treasury);
    Assert.true(Tactics.willing(board, brain, "Alashiya", board.leader()));
  });
});
