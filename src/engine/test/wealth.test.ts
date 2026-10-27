import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type Order,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Wealth,
  dismiss,
  dispatch,
  earningsTotal,
  first,
  gain,
  idNumber,
  newAudienceRecord,
  newAudienceRound,
  newCharacter,
  newEnvoyReaction,
  newGame,
  newGameConfig,
  newHostReply,
  newTurnSubmission,
  single,
} from "@amarna/engine";
import { Assert, last, orderBy } from "./support.ts";

// <summary>The richest characters: what a character gains, by source, and the ranking by wealth.</summary>
describe("WealthTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    return e;
  }

  function orders(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  test("Gold into a purse is counted by where it came from", () => {
    let c = newCharacter({ id: "c1", name: "Mane" });
    gain(c, 30, "Wages");
    gain(c, 12, "Skimmed");
    gain(c, 40, "Gifts");
    gain(c, 60, "Carried");
    gain(c, 0, "Gifts");
    Assert.equal(142, c.purse);
    Assert.equal([30, 12, 40, 60, 142], [c.earned.wages, c.earned.skimmed, c.earned.gifts, c.earned.carried, earningsTotal(c.earned)]);
    Assert.equal("wages 30, skimmed 12, gifts 40, gold kept on dismissal 60", Wealth.sources(c.earned));
  });

  test("Wages skims gifts and gold kept on dismissal are all counted as the engine pays them", () => {
    let s = newGame(5, newGameConfig({ catastropheChance: 0 }));
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    // A season at court: its wage.
    begin(s).resolve(orders("Egypt", dispatch(envoy.id, "Alashiya", "Greetings.", { gold: 100 })));
    Assert.equal(envoy.contract!.wage, envoy.earned.wages);
    while (s.audiences.length === 0) {
      let next = begin(s);
      if (s.audiences.length === 0) next.resolve(new Dict<Power, TurnSubmission>());
    }
    // At the audience: 20 kept of the gold, and a gift of 30.
    new TurnEngine(s).applyAudience(
      newAudienceRecord({
        audienceId: single(s.audiences).id,
        delivered: "Greetings.",
        skim: 20,
        rounds: [newAudienceRound({ host: newHostReply({ bribe: 30, end: true }), envoy: newEnvoyReaction({ acceptBribe: true }) })],
      }),
    );
    Assert.equal([20, 30], [envoy.earned.skimmed, envoy.earned.gifts]);
    Assert.equal(earningsTotal(envoy.earned), envoy.purse);

    // Another envoy dismissed on the way out keeps the gold it carried.
    let other = last(s.characters, (c) => c.employer === "Egypt" && c.id !== envoy.id);
    other.secretMaster = null;
    let e = begin(s);
    e.resolve(orders("Egypt", dispatch(other.id, "Hatti", "Greetings.", { gold: 50 })));
    begin(s).resolve(orders("Egypt", dismiss(other.id)));
    Assert.equal(50, other.earned.carried);
    Assert.equal(earningsTotal(other.earned), other.purse);
  });

  test("The living are ranked by purse and back pay owed and the dead are left out", () => {
    let s = newGame(5);
    let people = s.characters.slice(0, 4);
    for (const c of s.characters) [c.purse, c.backPay] = [0, new Dict()];
    people[0].purse = 100;
    [people[1].purse, people[1].backPay] = [
      60,
      new Dict([
        ["Egypt", 30],
        ["Hatti", 20],
      ]),
    ];
    people[2].purse = 500;
    people[2].status = "Dead";
    people[3].purse = 120;

    let ranking = Wealth.ranking(s);
    Assert.doesNotContain(ranking, (w) => w.character === people[2]);
    Assert.equal(
      [people[3], people[1], people[0]],
      ranking.slice(0, 3).map((w) => w.character),
    );
    Assert.equal([60, 50, 110], [ranking[1].purse, ranking[1].backPay, ranking[1].total]);
    Assert.equal(s.characters.length - 1, ranking.length);
    // Ties are broken by id, so the order is the same every time.
    Assert.equal(
      ranking.slice(3).map((w) => w.character.id),
      orderBy(
        ranking.slice(3).map((w) => w.character.id),
        idNumber,
      ),
    );
  });

  test("A ranking line says who the character is at the end and where its gold came from", () => {
    let c = newCharacter({ id: "c1", name: "Mane", origin: "Thebes", status: "Employed", employer: "Egypt", backPay: new Dict([["Egypt", 32]]) });
    gain(c, 250, "Wages");
    gain(c, 30, "Skimmed");
    Assert.equal("Mane of Thebes (serving Egypt): 312 (purse 280, back pay owed 32; wages 250, skimmed 30)", Wealth.line(Wealth.of(c)));
    [c.status, c.heldBy] = ["Captured", "Hatti"];
    Assert.equal("captive in Hatti, serving Egypt", Wealth.standing(c));
    [c.status, c.heldBy, c.employer] = ["Free", null, null];
    Assert.equal("free", Wealth.standing(c));
  });
});
