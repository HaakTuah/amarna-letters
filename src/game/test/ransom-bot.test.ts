import { describe, test } from "vitest";
import {
  type CaptiveOrder,
  Dict,
  OrderValidator,
  type PayRansomOrder,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  captive,
  first,
  inboxOf,
  newGame,
  newTurnSubmission,
  notify,
} from "@amarna/engine";
import { ScriptLeader } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";

describe("RansomBotTests", () => {
  test("A script captor asks a ransom once and again only when the demand has lapsed", async () => {
    // Mitanni (honest, neither cunning nor vengeful in any game) holds one of Hatti's people.
    let s = newGame(9);
    let spy = first(s.characters, (c) => c.employer === "Hatti");
    spy.status = "Captured";
    spy.heldBy = "Mitanni";
    spy.at = "Mitanni";
    spy.duty = "None";
    let captor = new ScriptLeader(9);

    async function asks(turn: number): Promise<boolean> {
      s.turn = turn;
      let sub = await captor.decide(Views.for(s, "Mitanni"));
      return sub.orders.filter((o): o is CaptiveOrder => o.type === "captive").some((o) => o.character === spy.id && o.fate === "Ransom");
    }

    // Item 10: it is questioned first, the first season the captor holds it.
    Assert.false(await asks(2));
    Assert.true(await asks(3));
    Assert.false(await asks(4));
    Assert.false(await asks(5));
    // The demand lapses unpaid: the captor hears of it and asks again.
    s.turn = 8;
    notify(s, "Mitanni", "Notice", "No ransom came", `No ransom has come for ${spy.name}. They remain your captive.`, spy.id);
    Assert.true(await asks(8));
    Assert.false(await asks(9));
    // Should that word never come, it asks again after six seasons.
    Assert.true(await asks(14));
  });

  test("A script king pays a ransom the season its demand arrives", async () => {
    // Mitanni (honest in every game) has one of its people held by Hatti.
    let s = newGame(9);
    let spy = first(s.characters, (c) => c.employer === "Mitanni");
    spy.status = "Captured";
    spy.heldBy = "Hatti";
    spy.at = "Hatti";
    s.treasuries.get("Mitanni").gold = 3000;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [captive(spy.id, "Ransom", 80)] })]]));
    let payer = new ScriptLeader(9);
    while (!inboxOf(s, "Mitanni").some((i) => i.kind === "Rumor" && i.subject === spy.id)) {
      e = new TurnEngine(s);
      e.beginTurn();
      if (inboxOf(s, "Mitanni").some((i) => i.kind === "Rumor" && i.subject === spy.id)) break;
      e.resolve(new Dict<Power, TurnSubmission>());
    }
    let sub = await payer.decide(Views.for(s, "Mitanni"));
    let pay = Assert.single(sub.orders.filter((o): o is PayRansomOrder => o.type === "payRansom"));
    Assert.equal(spy.id, pay.character);
    Assert.contains(new OrderValidator(s).validate("Mitanni", sub).accepted, (o) => o.type === "payRansom");
  });
});
