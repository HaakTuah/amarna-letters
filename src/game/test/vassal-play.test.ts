import { describe, test } from "vitest";
import { Views, newGame, type DispatchOrder, type Order } from "@amarna/engine";
import { ScriptLeader } from "../src/bots/script-leader.ts";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { bondWar, knownBonds, sealBond } from "../src/bots/vassals.ts";
import { newTabletProposal, newTabletView, clause, newAudienceView, newHostReply } from "@amarna/engine";
import { answerLetter } from "../src/bots/statecraft-clauses.ts";
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

  test("A host that seals a vassal tablet answers its tribute as the seal does, never refusing it in words (the audit's find 11)", () => {
    const s = newGame(1);
    const view = Views.for(s, "Arwad");
    const b = new Board(view);
    const brain = new Brain("Arwad", 1);
    brain.learn(view, b);
    const tablet = [clause("askTribute", { amount: 10 }), clause("protect"), clause("askServe")];
    const audience = newAudienceView({ host: "Arwad", from: "Egypt", turn: s.turn, clauses: tablet, proposal: newTabletView({ vassal: "Arwad", clauses: tablet }) });
    const sealed = newHostReply({ sealProposal: true });
    answerLetter(audience, b, brain, sealed, () => {});
    Assert.true(sealed.clauses.some((c) => c.kind === "accept" && c.answers === "askTribute"));
    Assert.false(sealed.clauses.some((c) => c.kind === "refuse"));
    // Not sealed, the tribute is refused as before.
    const refused = newHostReply({ sealProposal: false });
    answerLetter(audience, b, brain, refused, () => {});
    Assert.true(refused.clauses.some((c) => c.kind === "refuse" && c.answers === "askTribute"));
  });
});
