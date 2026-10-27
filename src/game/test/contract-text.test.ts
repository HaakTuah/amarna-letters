import { describe, test } from "vitest";
import { Views, basePrice, first, hire, newContract, newGame, newGameConfig, renew, single } from "@amarna/engine";
import { type JsonObject, Parse, Replies, Schemas, leaderRules, person, problems } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";
import { describe as describeOrder } from "@amarna/engine";

// <summary>What a king reads of terms, notice and renewal, and how it orders a renewal.</summary>
describe("ContractTextTests", () => {
  test("The rulebook says what happens when a term ends and how to renew", () => {
    let rules = leaderRules(true, newGameConfig());
    Assert.contains(
      "- Each servant serves for a term. When it ends, one content with the wage serves on for another 6 seasons; one who wants more, or whom you still owe back pay, gives notice, names a price and serves one more season: renew them (order renew) at that price or more, or they leave. You may renew one of your people at court at any time, for a new wage and term; they never take less than their present wage (below their price they refuse, and you are told the price); hire is only for people not in your service.",
      rules,
    );
    Assert.contains("each names a price, as does anyone free at your court.", rules);
    Assert.contains("a servant giving notice", leaderRules(true, newGameConfig({ sleepingSeats: true })));
  });

  test("Kings order a renewal with a wage and a term and hire takes a term too", () => {
    let schema = JSON.stringify(Schemas.leaderOrders(newGameConfig()));
    Assert.contains('"renew"', schema);
    Assert.contains('"term"', schema);
    let json = JSON.parse(
      `{
  "notes": "", "units": [], "letters": [],
  "other_orders": [ { "action": "renew", "province": "", "power": "", "person": "c3", "amount": 20, "term": 0, "text": "", "item": "", "seals": [] },
                    { "action": "renew", "province": "", "power": "", "person": "c4", "amount": 25, "term": 9, "text": "", "item": "", "seals": [] },
                    { "action": "hire", "province": "", "power": "", "person": "c9", "amount": 30, "term": 12, "text": "", "item": "", "seals": [] },
                    { "action": "hire", "province": "", "power": "", "person": "c10", "amount": 30, "term": 0, "text": "", "item": "", "seals": [] } ],
  "summary": "", "ledger": [], "schedule": [], "standing_orders": [], "cancel_standing": [], "standing_answers": [], "cancel_answers": []
}`,
    ) as JsonObject;
    Assert.empty(problems(json, Replies.leaderOrders(newGameConfig())));
    let sub = Parse.orders(json);
    Assert.equal([renew("c3", 20, 6), renew("c4", 25, 9), hire("c9", 30, 12), hire("c10", 30, 6)], sub.orders);
    Assert.equal("renew c3 at 20 a season for 6 seasons", describeOrder(sub.orders[0]));
  });

  test("A servant s line says its term in plain words and a free person at court its price", () => {
    let s = newGame(3);
    let c = first(s.characters, (x) => x.employer === "Mitanni");
    c.contract = newContract({ wage: 12, startTurn: 1, untilTurn: 10 });
    function line(): string {
      return person(single(Views.for(s, "Mitanni").court, (x) => x.id === c.id));
    }
    Assert.contains(
      "; at court, ready for a mission; serves at 12 a season through turn 10; if content they then renew themselves, otherwise they give a season's notice and name a price",
      line(),
    );
    Assert.doesNotContain("until turn", line());
    // What it asked before it was hired (here, or rehired after a notice ran out) means nothing now: one's own servant shows no asking price.
    c.askingPrice.set("Mitanni", 40);
    Assert.doesNotContain("asks", line());

    c.contract.noticePrice = 20;
    c.contract.leavesTurn = 2;
    Assert.contains("; serves at 12 a season; has given notice: asks 20 a season to serve on; leaves at the start of turn 2 unless renewed", line());

    let free = first(s.characters, (x) => x.status === "Free");
    free.at = "Mitanni";
    free.pitches.clear();
    free.askingPrice.clear();
    Assert.contains(`; asks ${basePrice(free, "Mitanni")} a season`, person(single(Views.for(s, "Mitanni").known, (x) => x.id === free.id)));
  });
});
