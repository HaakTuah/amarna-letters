import { describe, test } from "vitest";
import { Views, basePrice, first, hire, newContract, newGame, newGameConfig, newJobErrand, renew, single } from "@amarna/engine";
import { type JsonObject, Parse, Replies, Schemas, leaderRules, person, problems } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";
import { describe as describeOrder } from "@amarna/engine";

// <summary>What a king reads of jobs and their errands, and how it orders a job.</summary>
describe("ContractTextTests", () => {
  test("The rulebook says what happens when a term ends and how to renew", () => {
    let rules = leaderRules(true, newGameConfig());
    Assert.contains("- Each servant is on a job, one errand (see WORK AND MONEY)", rules);
    Assert.contains("each names a price, as does anyone free at your court.", rules);
    // Item 11a: jobs with a fee, a court's record, the going rate, borrowing and repaying, and what the score counts.
    Assert.contains("WORK AND MONEY", rules);
    Assert.contains("- A job is an errand. You offer a person a job (order hire): one errand", rules);
    Assert.contains("- Every payment is your order.", rules);
    Assert.contains("- Your record is news.", rules);
    Assert.doesNotContain("going rate", rules);
    Assert.contains("Your strength is what you hold, never what you owe or are owed", rules);
    Assert.doesNotContain("back pay", rules);
    Assert.contains("a servant's job done", leaderRules(true, newGameConfig({ sleepingSeats: true })));
  });

  test("Kings order a renewal with a fee an advance and a term and hire takes them too", () => {
    let schema = JSON.stringify(Schemas.leaderOrders(newGameConfig()));
    Assert.contains('"renew"', schema);
    Assert.contains('"term"', schema);
    let json = JSON.parse(
      `{
  "notes": "", "units": [], "letters": [],
  "other_orders": [ { "action": "renew", "province": "", "to": "", "power": "", "person": "c3", "amount": 20, "term": 0, "gold": 0, "text": "", "item": "", "seals": [], "errand": "", "standing": "" },
                    { "action": "renew", "province": "", "to": "", "power": "", "person": "c4", "amount": 25, "term": 9, "gold": 0, "text": "", "item": "", "seals": [], "errand": "", "standing": "" },
                    { "action": "hire", "province": "", "to": "", "power": "", "person": "c9", "amount": 30, "term": 12, "gold": 10, "text": "", "item": "", "seals": [], "errand": "", "standing": "" },
                    { "action": "hire", "province": "", "to": "", "power": "", "person": "c10", "amount": 30, "term": 0, "gold": 0, "text": "", "item": "", "seals": [], "errand": "", "standing": "" } ],
  "summary": "", "ledger": [], "schedule": [], "standing_orders": [], "cancel_standing": [], "standing_answers": [], "cancel_answers": []
}`,
    ) as JsonObject;
    Assert.empty(problems(json, Replies.leaderOrders(newGameConfig())));
    let sub = Parse.orders(json);
    // Haakon's answers to item 11a: nothing handed over now unless the king names it.
    Assert.equal([renew("c3", 20, 6, 0), renew("c4", 25, 9, 0), hire("c9", 30, 12, 10), hire("c10", 30, 6, 0)], sub.orders);
    Assert.equal("offer c3 a new job within 6 seasons for 20 shekels, 0 of them now", describeOrder(sub.orders[0]));
  });

  test("A servant s line says its term in plain words and a free person at court its price", () => {
    let s = newGame(3);
    let c = first(s.characters, (x) => x.employer === "Mitanni");
    c.contract = newContract({ fee: 108, advance: 54, startTurn: 1, untilTurn: 10 });
    function line(): string {
      return person(single(Views.for(s, "Mitanni").court, (x) => x.id === c.id));
    }
    Assert.contains(
      "; at court, ready for a mission; a job whose first errand you name when you send them, for 108 shekels, 54 handed over and 54 due when it is done, by turn 10; the rest is paid only if you order it (pay_fee). When it is done at your court, the job ends",
      line(),
    );
    Assert.doesNotContain("until turn", line());
    // What it asked before it was hired (here, or rehired after a notice ran out) means nothing now: one's own servant shows no asking price.
    c.askingPrice.set("Mitanni", 40);
    Assert.doesNotContain("asks", line());

    c.contract.errand = newJobErrand({ what: "envoy", where: "Hatti" });
    c.contract.payOnDone = true;
    Assert.contains("; a job as envoy to Hatti, for 108 shekels, 54 handed over and 54 due when it is done, by turn 10; you ordered the rest paid when it is done.", line());

    let free = first(s.characters, (x) => x.status === "Free");
    free.at = "Mitanni";
    free.pitches.clear();
    free.askingPrice.clear();
    Assert.contains(`; asks ${basePrice(free, "Mitanni")} a season of a job's term`, person(single(Views.for(s, "Mitanni").known, (x) => x.id === free.id)));
  });
});
