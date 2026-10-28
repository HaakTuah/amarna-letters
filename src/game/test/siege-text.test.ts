import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { fortification } from "../src/bots/statecraft-strategy.ts";
import { MilitaryPlan, sallies } from "../src/bots/tactics.ts";
import { Dict, TurnEngine, Views, besiege, first, fortify, move, newGame, newGameConfig, newId, newTurnSubmission, newUnit, sally } from "@amarna/engine";
import { OtherActions, Parse, leaderRules, situation } from "@amarna/llm";
import { removeAll, Assert, walled, oldWorld } from "../../engine/test/support.ts";

// <summary>What a king reads of walls, sieges and land being absorbed (Build order item 5), in the rulebook and his view.</summary>
describe("SiegeTextTests", () => {
  test("The view gives the walls standing the sieges known and the land being absorbed", () => {
    let s = walled(oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }))), "suhu", 2);
    first(s.units, (u) => u.province === "sippar").province = "suhu";
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        ["Babylonia", newTurnSubmission({ orders: [besiege("suhu")] })],
        ["Mitanni", newTurnSubmission({ orders: [move("terqa", "ekallate")] })],
        ["Assyria", newTurnSubmission({ orders: [move("ekallate", "sippar")] })],
      ]),
    );
    let babylon = situation(Views.for(s, "Babylonia"));
    Assert.contains(
      'LANDS (see WHAT YOU SEE and NEWS AND TRAVEL; a province you do not see is listed under its holder as last you heard, "heard in turn N"):',
      babylon,
    );
    Assert.contains("babylon (walls 3) [Babylonia army]", babylon);
    Assert.contains("suhu (walls 2) [Babylonia army]", babylon);
    Assert.contains(
      "SIEGES (a city surrenders when it is worn down as far as its walls are high): your army besieges suhu (held by no one, walls 2): worn down 1 of 2, since turn 1.",
      babylon,
    );
    // Assyria took Sippar from Babylon by force: a third of it counts this season, which Assyria reads, and nobody else
    // (how it changed hands is not public).
    Assert.contains("sippar (taken by force in turn 1: yields and counts a third of its yield this season) [Assyria army]", situation(Views.for(s, "Assyria")));
    Assert.contains("sippar [Assyria army]", babylon);
    Assert.doesNotContain("taken by force", babylon);
    Assert.doesNotContain("taken by force", situation(Views.for(s, "Egypt")));
    // Mitanni, next to Suhu, sees the siege too.
    Assert.contains("Babylonia's army besieges suhu (held by no one, walls 2): worn down 1 of 2", situation(Views.for(s, "Mitanni")));
  });

  test.each([
    ["Strength is the wealth of your realm, reckoned in shekels: 10 x what your land produces in a season (its harvest in a season as your people bring it in over the year (PEOPLE), at the reference price of grain, a shekel a measure, plus its mines' gold; land you conquered counted as far as you have absorbed it)"],
    [
      "Conquered land is absorbed slowly. A province you take by force (troops standing in it, a storm, a siege, or with a fallen king's capital) yields you its tax and its mines' gold, and counts in your strength, a third of its full worth in its first season under you (the season you take it and the next), two thirds in the second, and all of it from the third.",
    ],
    ["- apasa: Apasa; coast; waters apasawaters; homeland of Arzawa; capital; yield 40; walls 3."],
    [
      "Strengthening walls (order fortify, naming the province): the walls of a province you hold rise a level at the end of the season, up to 3, for 50 x the new level (50, 100, 150), paid then",
    ],
    [
      "walls whose upkeep you cannot pay fall a level, the farthest from your capital first. An earthquake throws the walls of the province it strikes down a level.",
    ],
    [
      "An envoy whose courage is below 20 x tightness will not leave that season: nothing is paid, and you are told. A caught envoy is the besieger's captive: he reads the letter and the mandate, and takes the gold and the tablets it carried; he may execute, ransom or release the envoy, but cannot turn him.",
    ],
    [
      "The walls then support one attack into the city on those troops, yours or another king's, for +1, as a support that cannot be cut. A sally that finds no such attack is void.",
    ],
    [
      "So a lone army of yours, or an ally's, that attacks a lone besieger with a sally drives it out, unless the ground helps the besieger against that attack (rough ground, or a pass or a great river crossed; see TERRAIN): then the attack needs one support more.",
    ],
    ["A province without walls changes hands when a unit ends a season in it; a walled one only as WALLS AND SIEGES says."],
    [
      "You see the walls standing now only where you can see troops; elsewhere LANDS in your view gives them as your court last saw them (at the start, as THE MAP gives them), since walls can be raised, or thrown down by an earthquake or unpaid upkeep, out of your sight.",
    ],
    ["LANDS in your view marks your own land still being absorbed; how other kings' land changed hands is not shown."],
    [
      "A province of your own homeland that you take back or are ceded is yours in full at once, and so is land ceded to you, unless its giver was still absorbing it: then it goes on being absorbed under you as it would have been under him.",
    ],
  ] as const)("The rulebook states walls by place and slow absorption %s", (rule: string) => {
    Assert.contains(rule, leaderRules(true, newGameConfig()));
  });

  test("A fortify order is read from a reply and offered in the schema", () => {
    let sub = Parse.orders(
      JSON.parse(
        `{"notes":"","letters":[],"units":[{"unit":"suhu","order":"besiege","target":"","to":""},{"unit":"Babylon","order":"sally","target":"sippar","to":""}],"other_orders":[{"action":"fortify","province":"Thebes","power":"","person":"","amount":0,"term":0,"text":"","item":"","seals":[]}]}`,
      )!,
    );
    Assert.equal([besiege("suhu"), sally("babylon", "sippar"), fortify("thebes")], sub.orders);
    Assert.contains("fortify", OtherActions);
  });

  test("A script king strengthens the walls of a threatened province worth it", () => {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 })));
    s.turn = 4;
    s.treasuries.get("Babylonia").gold = 2000;
    let v = Views.for(s, "Babylonia");
    let b = new Board(v);
    let plan = new MilitaryPlan();
    plan.danger.set("sippar", [2, 0.8]);
    plan.danger.set("ur", [1, 0.3]);
    let walls = fortification(b, plan, 1500);
    Assert.equal(["sippar", 50], walls);
    Assert.null(fortification(b, plan, 50));
  });

  test("A script king s attack on troops within its walls goes with a sally", () => {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 })));
    removeAll(s.units, (u) => u.province === "babylon");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "babylon" }));
    let b = new Board(Views.for(s, "Babylonia"));
    Assert.equal([sally("babylon", "sippar")], sallies(b, [move("sippar", "babylon"), move("nippur", "ur")]));
  });
});
