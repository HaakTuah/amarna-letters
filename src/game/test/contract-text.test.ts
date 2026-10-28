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
      "- Each servant is on a job for a term (see WORK AND MONEY). When it is done (the term over, the servant back at your court with no task), the rest of the fee falls due; then one content with what it was paid serves on for another 6 seasons on the same terms, its new advance handed over then; one who wants more, or was not paid, gives notice, names a price a season and serves one more season: renew them (order renew, a new fee and advance) at that price or more, or they leave.",
      rules,
    );
    Assert.contains("each names a price, as does anyone free at your court.", rules);
    // Item 11a: jobs with a fee, a court's record, the going rate, borrowing and repaying, and what the score counts.
    Assert.contains("WORK AND MONEY", rules);
    Assert.contains("- Jobs, not wages. You hire a person for a job (order hire: the person, the whole fee, the part of it handed over now, and the term in seasons).", rules);
    Assert.contains("Your strength is what you hold, never what you owe or are owed", rules);
    Assert.doesNotContain("back pay", rules);
    Assert.contains("a servant giving notice", leaderRules(true, newGameConfig({ sleepingSeats: true })));
  });

  test("Kings order a renewal with a fee an advance and a term and hire takes them too", () => {
    let schema = JSON.stringify(Schemas.leaderOrders(newGameConfig()));
    Assert.contains('"renew"', schema);
    Assert.contains('"term"', schema);
    let json = JSON.parse(
      `{
  "notes": "", "units": [], "letters": [],
  "other_orders": [ { "action": "renew", "province": "", "to": "", "power": "", "person": "c3", "amount": 20, "term": 0, "gold": 0, "text": "", "item": "", "seals": [] },
                    { "action": "renew", "province": "", "to": "", "power": "", "person": "c4", "amount": 25, "term": 9, "gold": 0, "text": "", "item": "", "seals": [] },
                    { "action": "hire", "province": "", "to": "", "power": "", "person": "c9", "amount": 30, "term": 12, "gold": 10, "text": "", "item": "", "seals": [] },
                    { "action": "hire", "province": "", "to": "", "power": "", "person": "c10", "amount": 30, "term": 0, "gold": 0, "text": "", "item": "", "seals": [] } ],
  "summary": "", "ledger": [], "schedule": [], "standing_orders": [], "cancel_standing": [], "standing_answers": [], "cancel_answers": []
}`,
    ) as JsonObject;
    Assert.empty(problems(json, Replies.leaderOrders(newGameConfig())));
    let sub = Parse.orders(json);
    Assert.equal([renew("c3", 20, 6), renew("c4", 25, 9), hire("c9", 30, 12, 10), hire("c10", 30, 6)], sub.orders);
    Assert.equal("renew c3 for 6 seasons for 20 shekels, 10 of them now", describeOrder(sub.orders[0]));
  });

  test("A servant s line says its term in plain words and a free person at court its price", () => {
    let s = newGame(3);
    let c = first(s.characters, (x) => x.employer === "Mitanni");
    c.contract = newContract({ fee: 108, advance: 54, startTurn: 1, untilTurn: 10 });
    function line(): string {
      return person(single(Views.for(s, "Mitanni").court, (x) => x.id === c.id));
    }
    Assert.contains(
      "; at court, ready for a mission; a job for 108 shekels, 54 handed over and 54 due when it is done, through turn 10; when it is done at your court, if content they serve on for 6 seasons on the same terms, otherwise they give a season's notice and name a price",
      line(),
    );
    Assert.doesNotContain("until turn", line());
    // What it asked before it was hired (here, or rehired after a notice ran out) means nothing now: one's own servant shows no asking price.
    c.askingPrice.set("Mitanni", 40);
    Assert.doesNotContain("asks", line());

    c.contract.noticePrice = 20;
    c.contract.leavesTurn = 2;
    Assert.contains(
      "; a job for 108 shekels, 54 handed over and 54 due when it is done; has given notice: asks 20 a season of a new term to serve on; leaves at the start of turn 2 unless renewed",
      line(),
    );

    let free = first(s.characters, (x) => x.status === "Free");
    free.at = "Mitanni";
    free.pitches.clear();
    free.askingPrice.clear();
    Assert.contains(`; asks ${basePrice(free, "Mitanni")} a season of a job's term`, person(single(Views.for(s, "Mitanni").known, (x) => x.id === free.id)));
  });
});
