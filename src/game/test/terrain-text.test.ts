import { describe, test } from "vitest";
import { Views, newGame, newGameConfig } from "@amarna/engine";
import { leaderRules, situation } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

// <summary>What a king reads of terrain (Build order item 5, the siege package), in the rulebook and his view.</summary>
describe("TerrainTextTests", () => {
  const Rules: string = leaderRules(true, newGameConfig());

  test.each([
    [
      "- The ground helps a unit that stands its ground: one that holds, besieges, supports or convoys, or whose own move fails. Against an attack it holds with 1 more when it stands on rough ground (mira, lukka, isuwa, amurru, arbela, kalavasos), when the attack comes over a mountain pass or a great river (the Cilician Gates (tuwanuwa-kizzuwatna), the Taurus (nesa-kizzuwatna), the Amanus (kizzuwatna-carchemish), the Euphrates (carchemish-harran and isuwa-harran), the Tigris (taidu-nineveh)), or when the attack is a landing from the sea (an army carried by convoy): 1 in all, however many of these apply.",
    ],
    [
      "The ground never helps a unit that moves, nor one met head on (both are on the road), nor empty land. It adds nothing to walls and nothing to a siege's pace; but a storm must beat the walls plus the hold strength of the defenders it beat, and the ground's help to them is part of that.",
    ],
    ["So an island is protected by the sea: an army reaches it only by convoy, and a unit there holds with 1 more against a landing."],
    ["A unit standing its ground may have the ground's help in its hold strength (see TERRAIN)."],
    ["(none if the province was empty or its unit moved away; the ground's help to them counts in it)"],
    [
      "THE MAP (id: name; kind; homeland; yield per season; walls at the start; rough ground or desert; links, with the mountain passes and great rivers on them)",
    ],
    ["- mira: Mira; land; homeland of Arzawa; yield 30; rough ground. armies: seha, apasa, lukka, tuwanuwa."],
    ["- kalavasos: Kalavasos; coast; homeland of Alashiya; yield 40; rough ground. armies: enkomi."],
    ["- tuwanuwa: Tuwanuwa; land; homeland of Hatti; yield 30. armies: seha, mira, lukka, hattusa, nesa, kizzuwatna (across the Cilician Gates)."],
    ["- harran: Harran; land; homeland of Mitanni; yield 35. armies: isuwa (across the Euphrates), carchemish (across the Euphrates), washukanni, terqa."],
    [
      "- Desert (sinai) costs an army supplies: an army that ends a season in desert land its king did not hold when that season's moves were made pays 30 with the next upkeep, and your treasury notice says so. An army in its own land pays nothing: a king who holds the desert crosses it freely, and so does whoever takes it, from the season after. Only armies pay it.",
    ],
    [
      "you pay upkeep for every army (30) and fleet (35), 30 more for each army that ended last season in desert land you did not hold (see TERRAIN), and the wages of your people at court;",
    ],
    ["- sinai: Sinai; land; homeland of Egypt; yield 20; desert. armies: megiddo, gaza, delta, memphis."],
  ] as const)("The rulebook states what the ground does and the map marks it %s", (rule: string) => {
    Assert.contains(rule, Rules);
  });

  test("The terrain section follows walls and sieges", () => {
    let walls = Rules.indexOf("WALLS AND SIEGES");
    let terrain = Rules.indexOf("TERRAIN\n- The ground helps");
    Assert.true(walls >= 0 && terrain > walls);
    Assert.true(terrain < Rules.indexOf("STANDING ORDERS (standing_orders"));
  });

  test("With terrain off the rulebook says the ground helps nobody", () => {
    let rules = leaderRules(true, newGameConfig({ terrainDefence: 0 }));
    Assert.contains("In this game the ground gives no unit any help", rules);
    Assert.doesNotContain("the ground's help", rules);
    // The desert still costs supplies: it is a rule of its own.
    Assert.contains("- Desert (sinai) costs an army supplies", rules);
  });

  test("The view marks the rough ground beside the walls", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    let hatti = situation(Views.for(s, "Hatti"));
    Assert.contains("lukka (walls 1, rough ground)", hatti);
    Assert.contains("isuwa (walls 1, rough ground)", hatti);
    Assert.contains("mira (rough ground) [Arzawa army]", hatti);
    Assert.contains("sinai (desert)", hatti);
    // With terrain off, nothing is marked.
    let off = newGame(1, newGameConfig({ catastropheChance: 0, terrainDefence: 0 }));
    Assert.contains("mira [Arzawa army]", situation(Views.for(off, "Hatti")));
  });
});
