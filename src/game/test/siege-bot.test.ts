import { describe, test } from "vitest";
import { AllPowers, OrderValidator, Views, besiege, first, newGame, newGameConfig } from "@amarna/engine";
import { GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, playGame } from "@amarna/game";
import { Assert, toDict, oldWorld } from "../../engine/test/support.ts";

// Script kings and the siege package (Build order item 5; "Every feature is every seat's"): they besiege the cities their
// armies stand within, and their sieges take cities in play.
describe("SiegeBotTests", () => {
  test("A script king besieges a free city its army stands within", async () => {
    // Seed 1: since the longer ages of item 6a, on most seeds Babylonia opens a war on Assyria in its first year and sends
    // this army to it; here it keeps the peace, and the army besieges the city it stands within.
    let s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));
    s.turn = 2;
    first(s.units, (u) => u.province === "sippar").province = "suhu";
    let sub = await new ScriptLeader(1).decide(Views.for(s, "Babylonia"));
    Assert.contains(besiege("suhu"), sub.orders);
    Assert.doesNotContain(new OrderValidator(s).validate("Babylonia", sub).rejected, (r) => r.order.type === "besiege");
  });

  test("Script kings take cities by siege in play and the games replay exactly", async () => {
    let sieges = 0;
    let falls = 0;
    for (let seed = 1; seed <= 4; seed++) {
      let summary = (
        await playGame(
          seed,
          (st) =>
            Object.assign(
              new GameRunner(
                st,
                toDict(
                  AllPowers,
                  (p) => p,
                  (_) => new ScriptLeader(st.seed),
                ),
                new ScriptMind(),
                new TemplateNarrator(),
              ),
              { writeChronicles: false },
            ),
          true,
          newGameConfig({ capMin: 16, capMax: 16, endMedian: 10000 }),
        )
      )[0];
      Assert.true(summary.replayMatches, `seed ${seed}`);
      sieges += summary.signals["siege-begun"] ?? 0;
      falls += summary.signals["siege-won"] ?? 0;
    }
    Assert.true(sieges > 0, "no script king laid siege to a city");
    Assert.true(falls > 0, "no siege by a script king took a city");
  });
});
