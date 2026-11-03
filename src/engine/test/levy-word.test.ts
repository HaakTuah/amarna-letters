import { describe, test } from "vitest";
import { Dict, TurnEngine, UnraisedTitle, WorldMap, inboxOf, move, newGame, newGameConfig, newOwnerChange, newScheduledOrders, newSleepState, newTurnSubmission, raise } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

describe("LevyWordTests", () => {
  test("Orders for a far levy that raised nothing stay in the list until word of it comes, then are dropped and told (bug #569)", () => {
    // Egypt's king holds court at Nippur, far from Nubia; he schedules a levy there, and a march for its army.
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
    s.owner.set("nippur", "Egypt");
    s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
    s.ledger.set("nippur", new Dict([["Egypt", 5000]]));
    s.court.set("Egypt", "nippur");
    s.units = s.units.filter((u) => u.province !== "nubia");
    s.sleep.tryAdd("Egypt", newSleepState());
    const sl = s.sleep.get("Egypt");
    const season = (scheduled = [] as ReturnType<typeof newScheduledOrders>[]) => {
      new TurnEngine(s, WorldMap.default).beginTurn();
      if (s.turn === 3) s.people.get("nubia").men = 0;
      new TurnEngine(s, WorldMap.default).resolve(new Dict([["Egypt", newTurnSubmission({ scheduled })]]));
    };
    season([newScheduledOrders({ turn: 3, orders: [raise("nubia", "Army")] }), newScheduledOrders({ turn: 7, orders: [move("nubia", "thebes")] })]);
    season();
    // The levy fails in season 3; Nubia's word takes three seasons to the court.
    const heard = 3 + 1 + new TurnEngine(s, WorldMap.default).wordTo("Egypt", "nubia");
    season();
    Assert.equal(heard, sl.scheduled.find((x) => x.order.type === "move")?.unraisedHeard);
    const told = () => inboxOf(s, "Egypt").some((i) => i.title === UnraisedTitle);
    // Listed, as the army to be raised, until the word comes.
    while (s.turn < heard) {
      Assert.false(told());
      Assert.equal(1, sl.scheduled.length);
      season();
    }
    new TurnEngine(s, WorldMap.default).beginTurn();
    Assert.true(told());
    Assert.empty(sl.scheduled);
  });
});
