import { describe, test } from "vitest";
import {
  Dict,
  OrderValidator,
  TurnEngine,
  Views,
  besiege,
  first,
  build,
  move,
  newGame,
  newStandingRequest,
  newTurnSubmission,
  raze,
  setLevel,
  support,
} from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { OrderDraft } from "../src/ui/order-draft.ts";

// A human seat's orders as the orders panel writes them: standing orders, which every seat may keep (the additions to the
// fix pass after item 4), go with the season's orders, and so do the ids of those it cancels.
describe("OrderDraftTests", () => {
  test("A human seats draft carries its new standing orders and the ones it cancels", () => {
    let s = newGame(31);
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        [
          "Babylonia",
          newTurnSubmission({
            standing: [
              newStandingRequest({ when: "UnitAttacked", province: "sippar", orders: [support("durkurigalzu", "sippar")] }),
              newStandingRequest({ when: "UnitEnters", power: "Assyria", province: "nippur", orders: [move("babylon", "nippur")] }),
            ],
          }),
        ],
      ]),
    );
    let view = Views.for(s, "Babylonia");
    Assert.equal(
      ["s1", "s2"],
      view.standing.map((x) => x.id),
    );

    let draft = new OrderDraft(view);
    draft.cancelStanding.add("s2");
    draft.cancelStanding.add("s9");
    let given = OrderDraft.unitOrder("babylon", "support", "sippar", "");
    Assert.equal(support("babylon", "sippar"), given);
    Assert.null(OrderDraft.unitOrder("babylon", "move", "", ""));
    draft.standing.push(newStandingRequest({ when: "UnitEnters", province: "ur", orders: [OrderDraft.unitOrder("babylon", "move", "nippur", "")!] }));
    let sub = draft.build();
    // Only ids the seat holds are cancelled; the new standing order goes as written.
    Assert.equal(["s2"], sub.cancelStanding);
    let request = Assert.single(sub.standing);
    Assert.equal(["UnitEnters", "ur", null], [request.when, request.province, request.power]);
    Assert.equal([move("babylon", "nippur")], request.orders);
    Assert.equal("when Assyria's troops enter Nippur", OrderDraft.when("UnitEnters", "Assyria", "nippur", "Babylonia"));
    Assert.equal("when your troop in Sippar is attacked", OrderDraft.when("UnitAttacked", null, "sippar", "Babylonia"));

    // The engine keeps the human seat's new standing order and drops the one it cancelled.
    e = new TurnEngine(s);
    e.beginTurn();
    e.wakeCheck();
    e.resolve(new Dict([["Babylonia", sub]]));
    Assert.equal(
      ["s1", "s3"],
      s.standing.get("Babylonia").orders.map((x) => x.id),
    );
  });

  test("A human seat besieges a city its army stands within", () => {
    // The siege package (Build order item 5): the orders panel offers Besiege to an army within walls the seat does not hold.
    let s = newGame(31);
    first(s.units, (u) => u.province === "sippar").province = "suhu";
    let draft = new OrderDraft(Views.for(s, "Babylonia"));
    draft.units.get("suhu")!.kind = "besiege";
    draft.other.push(build("nippur", "Walls", 2));
    let sub = draft.build();
    Assert.contains(besiege("suhu"), sub.orders);
    Assert.contains(build("nippur", "Walls", 2), sub.orders);
    Assert.empty(new OrderValidator(s).validate("Babylonia", sub).rejected);
  });

  test("A unit that razes where it stands gets no hold beside it", () => {
    // An army in another's land razes a level of its roads: the draft leaves out the unit's default hold, which would give
    // it two orders and have the raze refused.
    let s = newGame(31);
    first(s.units, (u) => u.province === "sippar").province = "suhu";
    setLevel(s, "Roads", "suhu", 1);
    let draft = new OrderDraft(Views.for(s, "Babylonia"));
    draft.other.push(raze("suhu", "Roads"));
    let sub = draft.build();
    Assert.contains(raze("suhu", "Roads"), sub.orders);
    Assert.equal(1, sub.orders.filter((o) => "unit" in o && o.unit === "suhu").length);
    Assert.empty(new OrderValidator(s).validate("Babylonia", sub).rejected);
  });
});
