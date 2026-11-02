import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { bearableShare, canLevy, levyCost, settleThere } from "../src/bots/land.ts";
import { demandOrders } from "../src/bots/counts.ts";
import { LandData, OrderValidator, TurnEngine, Views, disband, forMen, levySize, menAvailable, shareOfFull, unitWeight, newGame, newGameConfig, newTurnSubmission, raise, demand, census } from "@amarna/engine";
import { OtherActions, Parse, leaderRules } from "@amarna/llm";
import { peopleLines } from "../../llm/src/prompt-economy.ts";
import { Assert } from "../../engine/test/support.ts";

// People at home (build order item 10+a) as kings read and play it: the rulebook, the orders a model king gives, and what
// the script kings do with the tax, levies and colonists.
describe("PeoplePlayTests", () => {
  test("The rulebook states the people, the demand, the census and the people's resistance, and a model king can order them", () => {
    const rules = leaderRules(true, newGameConfig());
    Assert.contains("PEOPLE", rules);
    Assert.contains("orders ask_share: the province, or none for all your land; ask_amount: one province", rules);
    Assert.contains("order census", rules);
    Assert.contains("The people defend their land.", rules);
    Assert.contains("In this game a land's people do not resist", leaderRules(true, newGameConfig({ peopleDefence: 0 })));
    const sub = Parse.orders(
      JSON.parse(
        `{"notes":"","command":[],"letters":[],"units":[{"unit":"Nesa","order":"settle","target":"","to":""}],"other_orders":[{"action":"ask_share","province":"Hattusa","power":"","person":"","amount":40,"term":0,"text":"","item":"","seals":[],"lands":[]},{"action":"ask_amount","province":"","power":"","person":"","amount":30,"term":0,"text":"","item":"","seals":[],"lands":[]},{"action":"census","province":"Nesa","power":"","person":"","amount":0,"term":0,"text":"","item":"","seals":[],"lands":[]}]}`,
      )!,
    );
    Assert.equal([disband("nesa", true), demand("share", 40, "hattusa"), demand("amount", 30), census("nesa")], sub.orders);
    Assert.contains("census", OtherActions);
  });

  test("A script king asks each province as much as its farmers bear, levies where the men are and settles men where there is room", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    // As a king sees it when he gives his orders: after the season's harvest (Nesa reaps in Akhet, item 11a+).
    new TurnEngine(s).beginTurn();
    const v = Views.for(s, "Hatti");
    const nesa = v.provinces.find((x) => x.province === "nesa")!;
    // At the start the farmers can bear a little more than the default.
    Assert.inRange(bearableShare(nesa, null, v.turn), 34, 40);
    // Counted at the start, and the count fresh: it asks the grain as an amount, which the land cannot hide.
    Assert.contains(demandOrders(v, "Hatti"), (o) => o.type === "demand" && o.how === "amount" && o.province === "nesa");
    // A province in a drought can bear far less.
    Assert.true(bearableShare({ ...nesa, harvest: Math.floor(nesa.harvest / 2) }, null, v.turn) < 10);
    Assert.true(canLevy(v, "sapinuwa", "Army"));
    Assert.false(canLevy({ ...v, provinces: v.provinces.map((x) => (x.province === "sapinuwa" ? { ...x, men: 100 } : x)) }, "sapinuwa", "Army"));
    // The plateau sows and reaps in Akhet (turn 1): a levy costs it more then than in Peret.
    Assert.true(levyCost(v, "Hatti", "sapinuwa", "Army") > levyCost(Views.for({ ...s, turn: 2 }, "Hatti"), "Hatti", "sapinuwa", "Army"));
    // Hattusa's army was levied from it: its land has room for its men again.
    Assert.true(settleThere(v, "Hatti", "hattusa", "Army"));
    Assert.false(settleThere(v, "Hatti", "sapinuwa", "Army"));
    // The board reckons each province's yield as its people bring it in (after the first season's births and moves, about the start's).
    // Sapinuwa yields 25 since item 11f carved Samuha from its land.
    Assert.inRange(new Board(v).yieldOf("sapinuwa"), 24, 25);
  });

  test("A court sees the people's yield and resistance only in its own land and its sight, and reads them in its prompt", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const v = Views.for(s, "Egypt");
    Assert.true(v.yields.has("delta"));
    Assert.false(v.yields.has("hattusa"));
    Assert.false(v.resistance.has("sapinuwa"));
    const lines = peopleLines(v).join("\n");
    Assert.contains("YOUR PEOPLE, as your scribes last counted them: on the land", lines);
    Assert.contains("What you ask: 33% of the harvest in", lines);
    Assert.contains("Men of fighting age in your homeland", lines);
  });

  test("Men away building walls or carrying grain cannot be levied", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const x = s.people.get("sapinuwa");
    s.corvee.set("sapinuwa", x.men - LandData.levyLeast + 1);
    Assert.equal(LandData.levyLeast - 1, menAvailable(s, "sapinuwa"));
    const v = new OrderValidator(s).validate("Hatti", newTurnSubmission({ orders: [raise("sapinuwa", "Army")] }));
    Assert.contains(v.rejected, (r) => r.reason.includes("too few men of fighting age"));
    Assert.equal(0, levySize(s, "sapinuwa", "Army"));
    Assert.false(new TurnEngine(s).levyMen("sapinuwa", LandData.levyLeast));
  });

  test("A levy is sized by the men a province has: a small one raises its few hundred, at a share of the price (item 11a+)", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const x = s.people.get("sapinuwa");
    s.corvee.set("sapinuwa", x.men - 600);
    Assert.equal(600, levySize(s, "sapinuwa", "Army"));
    const v = new OrderValidator(s).validate("Hatti", newTurnSubmission({ orders: [raise("sapinuwa", "Army")] }));
    Assert.equal(0, v.rejected.length);
    // Six hundred men are 120 thousandths of a full army: its price, pay and food are that share, rounded up.
    Assert.equal(120, shareOfFull("Army", 600));
    Assert.equal(Math.ceil((s.config.armyCost * 120) / 1000), forMen(s.config.armyCost, "Army", 600));
    Assert.equal(120, unitWeight({ kind: "Army", men: 600 }, LandData.armyMen));
  });
});
