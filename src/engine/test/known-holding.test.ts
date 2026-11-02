import { describe, test } from "vitest";
import {
  build,
  govern,
  inboxOf,
  newGame,
  newGameConfig,
  newOwnerChange,
  newTurnSubmission,
  OrderValidator,
  TurnEngine,
  Views,
  WorldMap,
} from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// Bug #467 ("Hidden information"): an order's checks read who holds a province as its court knows it, never the truth, so
// a refusal tells a king nothing of a loss whose word has not come; the engine answers by the true state, by the road.
describe("KnownHoldingTests", () => {
  // Egypt held Nippur, far from its court, and lost it to Babylonia this season: word of it has not come.
  function farLoss() {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
    s.owner.set("nippur", "Babylonia");
    s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }), newOwnerChange({ province: "nippur", turn: s.turn, owner: "Babylonia" }));
    const c = s.characters.find((x) => x.employer === "Egypt" && x.at === "Egypt" && x.status === "Employed" && x.duty === "None")!;
    return { s, c };
  }

  test("A far province lost out of sight is still the court's for its orders' checks", () => {
    const { s, c } = farLoss();
    const map = WorldMap.default;
    // The setup holds: Egypt does not see Nippur, and believes it its own.
    Assert.false(Views.sight(s, map, "Egypt").has("nippur"));
    Assert.equal("Egypt", Views.knownHolders(s, map, "Egypt").get("nippur").owner);
    const v = new OrderValidator(s, map).validate("Egypt", newTurnSubmission({ orders: [govern("nippur", c.id), build("nippur", "Walls", 1, true)] }));
    Assert.equal("", v.rejected.map((r) => r.reason).join("; "));
    // Land the court knows another's is refused as before.
    const near = new OrderValidator(s, map).validate("Egypt", newTurnSubmission({ orders: [build("babylon", "Walls", 1, true)] }));
    Assert.contains("you do not hold", near.rejected.map((r) => r.reason).join("; "));
  });

  test("The order goes in; the engine answers by the true state, and the word comes home by the road", () => {
    const { s, c } = farLoss();
    const e = new TurnEngine(s);
    // The governor sets out, as the court believes the land its own.
    e.grantGovernorship("Egypt", govern("nippur", c.id));
    Assert.equal("Governing", c.duty);
    // A work there lapses, and its king reads so only when a courier brings it.
    const before = inboxOf(s, "Egypt").length;
    e.setWorks("Egypt", build("nippur", "Walls", 1, true));
    Assert.equal(before, inboxOf(s, "Egypt").length);
    const word = s.journeys.filter((j) => j.kind === "Word" && j.to === "Egypt" && (j.text ?? "").includes("Not built"));
    Assert.equal(1, word.length);
    Assert.true(word[0].arriveTurn > s.turn + 1);
  });
});
