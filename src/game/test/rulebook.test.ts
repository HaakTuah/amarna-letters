import { describe, test } from "vitest";
import { newGameConfig } from "@amarna/engine";
import { Schemas, leaderRules } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

describe("RulebookTests", () => {
  test("Kings read nothing of shared victory unless the house rule is on", () => {
    let off = newGameConfig();
    Assert.doesNotContain("Shared victory", leaderRules(true, off));
    Assert.doesNotContain("win together", leaderRules(true, off));
    Assert.doesNotContain("shared victory", JSON.stringify(Schemas.leaderOrders(off)));

    let on = newGameConfig({ sharedVictory: true });
    Assert.contains("Shared victory: two powers that sealed a tablet marked as a sworn alliance win together", leaderRules(true, on));
    Assert.contains("shared victory", JSON.stringify(Schemas.leaderOrders(on)));
  });
});
