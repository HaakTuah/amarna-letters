import { describe, test } from "vitest";
import { Views, newGame, type DispatchOrder, type Order } from "@amarna/engine";
import { ScriptLeader } from "../src/bots/script-leader.ts";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { bondWar, knownBonds, sealBond } from "../src/bots/vassals.ts";
import { newTabletProposal, clause } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";

const tributeTo = (orders: readonly Order[], to: string): DispatchOrder | undefined =>
  orders.find((o): o is DispatchOrder => o.type === "dispatch" && o.to === to && o.gold > 0 && (o.clauses ?? []).some((c) => c.kind === "tribute"));

describe("Script players and vassalage (item 11+)", () => {
  test("A script vassal sends its overlord the year's tribute its tablet names", () => {
    const s = newGame(1);
    const sub = new ScriptLeader(1).decideNow(Views.for(s, "Byblos"));
    const d = tributeTo(sub.orders, "Egypt");
    Assert.notNull(d);
    Assert.equal(15, d!.gold);
  });

  test("Every court knows the opening bonds; an overlord does not make war on a vassal that pays", () => {
    const s = newGame(1);
    const view = Views.for(s, "Egypt");
    const b = new Board(view);
    const brain = new Brain("Egypt", 1);
    brain.learn(view, b);
    brain.bonds = knownBonds(b);
    Assert.true(brain.bonds.some((x) => x.vassal === "Byblos" && x.overlord === "Egypt"));
    Assert.true(bondWar(b, brain, "Byblos") < 0);
  });

  test("A strong king takes a vassal whose tablet names real tribute", () => {
    const s = newGame(1);
    const view = Views.for(s, "Egypt");
    const b = new Board(view);
    const brain = new Brain("Egypt", 1);
    brain.learn(view, b);
    const offer = newTabletProposal({ text: "", vassal: "Arwad", clauses: [clause("tribute", { amount: 10 }), clause("serve"), clause("askProtect")] });
    Assert.true(sealBond(b, brain, "Arwad", offer) === true);
    Assert.null(sealBond(b, brain, "Arwad", newTabletProposal({ text: "", clauses: [clause("peace")] })));
  });
});
