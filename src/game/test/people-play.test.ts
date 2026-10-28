import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { bearableTax, canLevy, levyCost, settleThere, taxOrders } from "../src/bots/land.ts";
import { Views, disband, newGame, newGameConfig, tax } from "@amarna/engine";
import { OtherActions, Parse, leaderRules } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

// People at home (build order item 10+a) as kings read and play it: the rulebook, the orders a model king gives, and what
// the script kings do with the tax, levies and colonists.
describe("PeoplePlayTests", () => {
  test("The rulebook states the people, the tax and the people's resistance, and a model king can order them", () => {
    const rules = leaderRules(true, newGameConfig());
    Assert.contains("PEOPLE", rules);
    Assert.contains("order set_tax", rules);
    Assert.contains("The people defend their land.", rules);
    Assert.contains("In this game a land's people do not resist", leaderRules(true, newGameConfig({ peopleDefence: 0 })));
    const sub = Parse.orders(
      JSON.parse(
        `{"notes":"","letters":[],"units":[{"unit":"Nesa","order":"settle","target":"","to":""}],"other_orders":[{"action":"set_tax","province":"Hattusa","power":"","person":"","amount":40,"term":0,"text":"","item":"","seals":[]},{"action":"set_tax","province":"","power":"","person":"","amount":30,"term":0,"text":"","item":"","seals":[]}]}`,
      )!,
    );
    Assert.equal([disband("nesa", true), tax(40, "hattusa"), tax(30)], sub.orders);
    Assert.contains("set_tax", OtherActions);
  });

  test("A script king taxes each province as much as its farmers bear, levies where the men are and settles men where there is room", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const v = Views.for(s, "Hatti");
    const nesa = v.provinces.find((x) => x.province === "nesa")!;
    // At the start the farmers can bear a little more than the default.
    Assert.inRange(bearableTax(nesa), 34, 40);
    Assert.contains(taxOrders(v, "Hatti"), (o) => o.type === "tax" && o.province === "nesa");
    // A province in a drought can bear far less.
    Assert.true(bearableTax({ ...nesa, harvest: Math.floor(nesa.harvest / 2) }) < 10);
    Assert.true(canLevy(v, "sapinuwa", "Army"));
    Assert.false(canLevy({ ...v, provinces: v.provinces.map((x) => (x.province === "sapinuwa" ? { ...x, men: 100 } : x)) }, "sapinuwa", "Army"));
    // The plateau sows and reaps in Akhet (turn 1): a levy costs it more then than in Peret.
    Assert.true(levyCost(v, "Hatti", "sapinuwa", "Army") > levyCost(Views.for({ ...s, turn: 2 }, "Hatti"), "Hatti", "sapinuwa", "Army"));
    // Hattusa's army was levied from it: its land has room for its men again.
    Assert.true(settleThere(v, "Hatti", "hattusa", "Army"));
    Assert.false(settleThere(v, "Hatti", "sapinuwa", "Army"));
    // The board reckons each province's yield as its people bring it in.
    Assert.equal(30, new Board(v).yieldOf("sapinuwa"));
  });
});
