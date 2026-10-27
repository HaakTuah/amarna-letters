import { describe, test } from "vitest";
import {
  type AudienceRecord,
  type Character,
  Dict,
  type GameState,
  type HomeCargo,
  type HostReply,
  type PendingAudience,
  type Power,
  TurnEngine,
  type TurnSubmission,
  dispatch,
  formatMoney,
  inboxOf,
  newAudienceRecord,
  newAudienceRound,
  newEnvoyReaction,
  newExchange,
  newGame,
  newHostReply,
  newTurnSubmission,
  single,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// <summary>Gold sent back and gifts across the two exchanges of one audience.</summary>
describe("AudienceGoldTests", () => {
  // <summary>Egypt's envoy stands before Alashiya's king, carrying no gold.</summary>
  function atAudience(): [GameState, TurnEngine, Character, PendingAudience] {
    let s = newGame(5);
    let envoy = s.characters.find((c) => c.employer === "Egypt")!;
    envoy.secretMaster = null;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Alashiya", "Greetings, brother.")] })]]));
    while (s.audiences.length === 0) {
      e = new TurnEngine(s);
      e.beginTurn();
      if (s.audiences.length === 0) e.resolve(new Dict<Power, TurnSubmission>());
    }
    return [s, e, envoy, single(s.audiences)];
  }

  function twoRounds(
    a: PendingAudience,
    firstReply: HostReply,
    second: HostReply,
    acceptFirst: boolean = false,
    acceptSecond: boolean = false,
  ): AudienceRecord {
    return newAudienceRecord({
      audienceId: a.id,
      delivered: "Greetings.",
      rounds: [
        newAudienceRound({ host: firstReply, envoy: newEnvoyReaction({ speech: "I hear you.", acceptBribe: acceptFirst }) }),
        newAudienceRound({ host: second, envoy: newEnvoyReaction({ speech: "I shall tell him.", acceptBribe: acceptSecond }) }),
      ],
    });
  }

  function cargoHome(s: GameState, envoy: Character): HomeCargo {
    return single(s.journeys, (j) => j.kind === "EnvoyHomebound" && j.characterId === envoy.id).cargo!;
  }

  test("Gold named in the first exchange is sent when the second names none", () => {
    let [s, e, envoy, a] = atAudience();
    let gold = s.treasuries.get("Alashiya").gold;
    e.applyAudience(twoRounds(a, newHostReply({ speech: "Take this home.", goldBack: 30 }), newHostReply({ speech: "Farewell.", end: true })));

    Assert.equal(gold - 30, s.treasuries.get("Alashiya").gold);
    let cargo = cargoHome(s, envoy);
    Assert.equal(30, cargo.gold);
    Assert.equal(100, cargo.purityPercent);
    Assert.contains(single(s.trails).outcomes, (o) => o.includes("sent back 30 shekels"));
  });

  test("A new amount in the second exchange replaces the first with its purity", () => {
    let [s, e, envoy, a] = atAudience();
    let gold = s.treasuries.get("Alashiya").gold;
    e.applyAudience(twoRounds(a, newHostReply({ goldBack: 30 }), newHostReply({ goldBack: 50, goldBackPurity: 80, end: true })));

    Assert.equal(gold - 40, s.treasuries.get("Alashiya").gold); // 50 at 80% fine
    let cargo = cargoHome(s, envoy);
    Assert.equal(50, cargo.gold);
    Assert.equal(80, cargo.purityPercent);
  });

  test("An envoy takes one gift per audience and the host is told", () => {
    let [s, e, envoy, a] = atAudience();
    let gold = s.treasuries.get("Alashiya").gold;
    let purse = envoy.purse;
    e.applyAudience(twoRounds(a, newHostReply({ bribe: 20 }), newHostReply({ bribe: 30, end: true }), true, true));

    Assert.equal(gold - 20, s.treasuries.get("Alashiya").gold);
    Assert.equal(purse + 20, envoy.purse);
    Assert.contains("a second gift was not given: an envoy takes one gift per audience", single(s.trails).outcomes);
    let notice = single(inboxOf(s, "Alashiya"), (i) => i.kind === "Audience");
    Assert.contains("a second gift was not given: an envoy takes one gift per audience", notice.body);
  });

  test("A gift accepted but not paid is still the one gift of the audience", () => {
    // The host offers more than it holds; the envoy accepts. The view of the second exchange says a gift was
    // accepted and another would not be given, and the engine keeps to that.
    let [s, e, envoy, a] = atAudience();
    let gold = s.treasuries.get("Alashiya").gold;
    let purse = envoy.purse;
    let first = newHostReply({ bribe: gold + 100 });
    let view = e.buildAudienceView(a, "Greetings.", 0, [newExchange({ host: "", envoy: "" })], 2, [
      newAudienceRound({ host: first, envoy: newEnvoyReaction({ acceptBribe: true }) }),
    ]);
    Assert.equal(gold + 100, view.giftAccepted);

    e.applyAudience(twoRounds(a, first, newHostReply({ bribe: 10, end: true }), true, true));

    Assert.equal(gold, s.treasuries.get("Alashiya").gold);
    Assert.equal(purse, envoy.purse);
    let outcomes = single(s.trails).outcomes;
    Assert.contains(`agreed to take ${formatMoney(gold + 100)} from Alashiya, but the treasury could not pay it`, outcomes);
    Assert.contains("a second gift was not given: an envoy takes one gift per audience", outcomes);
    Assert.doesNotContain(outcomes, (o) => o.startsWith("accepted"));
    Assert.contains(inboxOf(s, "Alashiya"), (i) => i.kind === "Rejected" && i.title === "Not enough gold");
  });

  test("A gift refused in the first exchange may be offered again", () => {
    let [s, e, envoy, a] = atAudience();
    let gold = s.treasuries.get("Alashiya").gold;
    e.applyAudience(twoRounds(a, newHostReply({ bribe: 20 }), newHostReply({ bribe: 30, end: true }), false, true));

    Assert.equal(gold - 30, s.treasuries.get("Alashiya").gold);
    Assert.doesNotContain(single(s.trails).outcomes, (o) => o.includes("second gift"));
  });

  test("The second exchange shows the host what it already named and gave", () => {
    let [, e, , a] = atAudience();
    let first = newAudienceRound({ host: newHostReply({ goldBack: 30, bribe: 20 }), envoy: newEnvoyReaction({ acceptBribe: true }) });
    let view = e.buildAudienceView(a, "Greetings.", 0, [newExchange({ host: "", envoy: "" })], 2, [first]);
    Assert.equal(30, view.goldBackNamed);
    Assert.equal(20, view.giftAccepted);

    let opening = e.buildAudienceView(a, "Greetings.", 0, [], 1);
    Assert.equal(0, opening.goldBackNamed);
    Assert.equal(0, opening.giftAccepted);
  });
});
