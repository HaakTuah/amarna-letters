import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { choicesOf, newSettings, toConfig } from "../src/session/settings.ts";

/** The first game on the start page (item 18b): an absent power's seat plays nothing, and asks for no model or key. */
describe("FirstGameSettingsTests", () => {
  test("An absent seat given a model asks for no key, and the first game's table leaves out the absent powers", () => {
    const s = newSettings();
    Assert.equal("first", s.game);
    Assert.true(toConfig(s).absent.includes("Babylonia"));
    s.leaders = { ...s.leaders, Babylonia: "Sonnet" };
    Assert.false(choicesOf(s).usesModels);
    Assert.empty(choicesOf(s).providersInUse);
    // In the full game the same seat is played by its model.
    Assert.true(choicesOf({ ...s, game: "full" }).usesModels);
    Assert.empty(toConfig({ ...s, game: "full" }).absent);
  });
});
