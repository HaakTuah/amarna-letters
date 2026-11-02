import { describe, test } from "vitest";
import { Views, newGame, newGameConfig } from "@amarna/engine";
import { levyOrder } from "../src/bots/counts.ts";
import { Assert } from "../../engine/test/support.ts";

// Item 17++: a script king levies a full unit's men while his count is fresh, and a share of the men at home, sized to a
// full unit by the old count, once it is too old to judge them by.
describe("LevyShareTests", () => {
  test("A fresh count levies men; an old one a share sized by it", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    // A count of last season (Hatti's own starts older, as its sources suggest: `StartCountAge`).
    const c = s.counts.get("Hatti").get("hattusa")!;
    s.counts.get("Hatti").set("hattusa", { ...c, turn: s.turn - 1 });
    Assert.equal({ type: "raise", province: "hattusa", kind: "Army" }, levyOrder(Views.for(s, "Hatti"), "Hatti", "hattusa", "Army"));
    s.counts.get("Hatti").set("hattusa", { ...c, turn: s.turn - 10 });
    const o = levyOrder(Views.for(s, "Hatti"), "Hatti", "hattusa", "Army");
    Assert.true(o.type === "raise" && o.share != null && o.share > 0 && o.share <= 100);
  });
});
