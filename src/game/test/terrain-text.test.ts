import { describe, test } from "vitest";
import { Views, newGame, newGameConfig } from "@amarna/engine";
import { leaderRules, situation } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

// <summary>What a king reads of terrain (Build order item 5, the siege package) and the sea (item 7a), in the rulebook and his view.</summary>
describe("TerrainTextTests", () => {
  const Rules: string = leaderRules(true, newGameConfig());

  test.each([
    [
      "- The ground helps a unit that stands its ground: one that holds, besieges, supports or convoys, or whose own move fails. Against an attack it holds with 1 more when it stands on rough ground (mira, lukka, isuwa, amurru, arbela, kalavasos, shechem, jerusalem, kaska), or when the attack comes over a mountain pass or a great river, crossed at its fords and ferry towns (the Cilician Gates (tuwanuwa-kizzuwatna), the Taurus (nesa-kizzuwatna), the Anti-Taurus (nesa-carchemish), the Amanus (kizzuwatna-carchemish), the Syrian Gates (kizzuwatna-alalakh), the Lebanon (byblos-damascus and sidon-damascus), the Euphrates at Carchemish (carchemish-harran), the Euphrates at Emar (aleppo-harran), the upper Euphrates (isuwa-harran), the Tigris (taidu-nineveh)): 1 in all, however many of these apply.",
    ],
    [
      "The ground never helps a unit that moves, nor one met head on (both are on the road), nor empty land, nor an army landing from the sea (at sea the blockade decides: see THE SEA); a unit on rough ground still has its help against a landing. It adds nothing to walls and nothing to a siege's pace; but a storm must beat the walls plus the hold strength of the defenders it beat, and the ground's help to them is part of that.",
    ],
    ["- Some links cross the desert (the Syrian desert (suhu-steppe and steppe-qatna and steppe-damascus), the Ways of Horus (delta-gaza), the north Sinai (gaza-sinai), the Negev (jerusalem-sinai)); they give no help in battle."],
    ["A unit standing its ground may have the ground's help in its hold strength (see TERRAIN)."],
    ["(if the province was empty or its unit moved away, the resistance of its people: see PEOPLE; the ground's help to them counts in it)"],
    [
      "THE MAP (id: name; kind; homeland; yield per season; walls at the start; rough ground or desert; a coast's waters; links, with the mountain passes, great rivers and deserts on them, and the open-sea crossings)",
    ],
    ["- mira: Mira; land; homeland of Arzawa; yield 30; rough ground. armies: seha, apasa, lukka, tuwanuwa."],
    ["- kalavasos: Kalavasos; coast; waters kalavasoswaters; homeland of Alashiya; yield 40; rough ground. armies: enkomi. fleets: enkomi, kalavasoswaters."],
    ["- tuwanuwa: Tuwanuwa; land; homeland of Hatti; yield 30. armies: seha, mira, lukka, hattusa, nesa, kizzuwatna (across the Cilician Gates)."],
    [
      "- harran: Harran; land; homeland of Mitanni; yield 35. armies: isuwa (across the upper Euphrates), carchemish (across the Euphrates at Carchemish), washukanni, terqa, aleppo (across the Euphrates at Emar).",
    ],
    [
      "- Desert (sinai, steppe) feeds nobody: an army there finds nothing to take from the land and lives on its baggage, its king's stores there if he holds it, and the caravans he sends (see ECONOMY).",
    ],
    [
      "You pay your troops (20 an army, 25 a fleet, nearest your capital first) and the wages of your people at court;",
    ],
    ["- sinai: Sinai; land; homeland of Egypt; yield 20; desert. armies: jerusalem (across the Negev), gaza (across the north Sinai), delta, memphis."],
    ["- kaska: Kaska Lands; land; a land without a king; yield 10; rough ground. armies: hattusa, sapinuwa."],
    ["- ugaritwaters: Ugarit waters; sea zone, the waters of ugarit. fleets: ugarit, sumurwaters, kizzuwatnawaters, enkomiwaters (open sea)."],
    [
      "- An army goes to sea only by convoy: a fleet of any power in each sea zone it sails through, each ordered to convoy it, from the waters of its own coast to the waters of the coast it lands on. So an army lands only where no enemy fleet holds that coast's waters: a fleet there must first be driven out.",
    ],
    ["- The blockade: a besieged coastal city is supplied by sea, and worn down 1 step less each season, unless a fleet of its besieger holds its waters: so a lone army besieging a harbour that is supplied wears it down not at all."],
    [
      "In winter, the second season of each year (Peret in Egypt), the open-sea crossings stay open but are dangerous: a fleet that crosses one may sink, and an army carried over one may be lost with it",
    ],
    ["(rough ground, or a pass or a great river crossed; see TERRAIN)"],
    ["nor an army landing from the sea (at sea the blockade decides: see THE SEA); a unit on rough ground still has its help against a landing."],
    ["(a coastal city supplied by sea is worn down 1 less: see THE SEA)"],
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
    // The desert still feeds nobody: it is a rule of its own.
    Assert.contains("- Desert (sinai, steppe) feeds nobody", rules);
  });

  test("The view marks the rough ground beside the walls", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    let hatti = situation(Views.for(s, "Hatti"));
    Assert.contains("lukka (rough ground)", hatti);
    Assert.contains("isuwa (walls 1, rough ground)", hatti);
    Assert.contains("mira (rough ground) [Arzawa army]", hatti);
    Assert.contains("sinai (desert)", hatti);
    // With terrain off, nothing is marked.
    let off = newGame(1, newGameConfig({ catastropheChance: 0, terrainDefence: 0 }));
    Assert.contains("mira [Arzawa army]", situation(Views.for(off, "Hatti")));
  });
});
