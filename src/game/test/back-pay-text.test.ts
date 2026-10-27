import { describe, test } from "vitest";
import { Views, first, newGame, newGameConfig, single } from "@amarna/engine";
import { leaderRules, person } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";
import { situation as situationOf } from "@amarna/llm";

// <summary>What a king reads of back pay: the rule, the debt to each of its people, and its treasury line.</summary>
describe("BackPayTextTests", () => {
  test("The rulebook says that people away are paid on their return and that back pay counts against strength", () => {
    let rules = leaderRules(true, newGameConfig());
    Assert.contains(
      "- People away from your court (on a mission, watching as a spy, held or captive) are not paid while away: their wages build up as back pay, paid in gold when they are back at your court. If your treasury cannot pay it all, the rest stays owed and counts as missed pay. Anyone who never comes back is never paid, and if your kingdom falls, what it owed is lost. Back pay owed counts against your strength.",
      rules,
    );
    Assert.contains(
      "Strength = 10 x (sum of the base yields of the provinces you hold, land you conquered counted as far as you have absorbed it) + the gold in your treasury - the back pay you owe your people.",
      rules,
    );
    Assert.contains("still appears on its mission until word comes, and its back pay builds up in your books as for anyone away.", rules);
    Assert.doesNotContain("you keep paying its wage", rules);
    Assert.contains("back pay you already owe them is still paid if they ever stand at your court again", rules);
    Assert.contains(
      "2. Income, upkeep and wages: your provinces pay their yield in gold; you pay upkeep for every army (30) and fleet (35), 30 more for each army that ended last season in desert land you did not hold (see TERRAIN), and the wages of your people at court; the wages of your people away are added to their back pay.",
      rules,
    );
    Assert.contains("Then everyone you see at your court whom you owe back pay is paid it, as far as your treasury allows.", rules);
  });

  test("A servant away shows its back pay and the treasury line the total", () => {
    let s = newGame(3);
    let c = first(s.characters, (x) => x.employer === "Mitanni");
    c.secretMaster = null;
    [c.duty, c.at, c.missionTarget] = ["EnvoyOutbound", null, "Hatti"];
    c.backPay.set("Mitanni", 45);
    let v = Views.for(s, "Mitanni");
    Assert.contains("; owed: 45 shekels of back pay", person(single(v.court, (x) => x.id === c.id)));
    let situation = situationOf(v);
    Assert.contains(
      `wages ${v.wages} a season (paid to your people at court; for those away they build up as back pay). Back pay owed to your people: 45, paid when they are back at your court. Strength ${v.strength} by your ledger (back pay owed counted against it)`,
      situation,
    );

    // Owed by another court, it is nothing to this one.
    c.backPay.delete("Mitanni");
    c.backPay.set("Hatti", 30);
    Assert.doesNotContain("back pay", person(single(Views.for(s, "Mitanni").court, (x) => x.id === c.id)));
    Assert.equal(0, Views.for(s, "Mitanni").backPay);
  });
});
