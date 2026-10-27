import { describe, test } from "vitest";
import { TextKit } from "../src/bots/textkit.ts";
import { Assert } from "../../engine/test/support.ts";

describe("TextKitTests", () => {
  test.each([
    ["Let us march together against our common enemy."],
    ["If you do not withdraw, there will be war."],
    ["Our armies attacked Mira last season."],
    ["I will burn your fields, or else send me gold."],
    ["You betrayed me, and you will regret it."],
    ["Beware the consequences."],
    ["Our enemies are marching on Qadesh."],
  ] as const)("Threats are found as whole words %s", (sentence: string) => {
    Assert.true(TextKit.isThreat(sentence));
  });

  test.each([
    ["We send a warm greeting toward your court."],
    ["Your reward is a gift of burnished gold."],
    ["May Marduk and Teshub watch over your house."],
    ["The wardens of the river send their regards."],
    ["All goes well with me and with my warehouses."],
  ] as const)("Words that only contain a threat are not threats %s", (sentence: string) => {
    Assert.false(TextKit.isThreat(sentence));
  });
});
