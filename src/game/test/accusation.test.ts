import { describe, test } from "vitest";
import { TextKit } from "../src/bots/textkit.ts";
import { Assert } from "../../engine/test/support.ts";

// <summary>The accusation signal, on phrasings the whole-word matcher first missed or miscounted (several from the seed-7 agent games).</summary>
describe("AccusationTests", () => {
  test.each([
    ["You are lying!"],
    ["Your envoy is lying."],
    ["Do not trust his lies."],
    ["Your words are lies."],
    ["You lie in every letter."],
    ["He lies."],
    ["You lied to the kings of the north."],
    ["Both are oath-breakers, and Mitanni grows faster than any of us."],
    ["Arzawa sealed a peace with me and broke it the same day."],
    ["Arzawa swore a tablet of brotherhood before Shamash, Teshub, Amun and Marduk, and broke it in the very same season."],
    ["This king broke his seal to Hatti and to me."],
    ["Either your generals acted without your word, or the oath is broken."],
    ["These are false words from a false brother."],
  ] as const)("Accusations are found %s", (text: string) => {
    Assert.true(TextKit.isAccusation(text));
  });

  test.each([
    ["The great prizes lie to the east, in Isuwa, Carchemish and the lands of Mitanni."],
    ["Let no false word come between us."],
    ["May no deceit ever come between our houses."],
    ["There is no falsehood in my heart."],
    ["Peace for all lies in your hands."],
    ["Your armies are lying in wait at Suhu."],
    ["Hatti is broken in the west."],
    ["Assyria is broken: Mitanni has taken Nineveh and Ashur."],
    ["I have broken the Assyrian and now march against Mitanni."],
    ["Two Mitanni armies have been broken on my border."],
    ["He sent his spears against my Nesa and they broke on my wall."],
    ["My army marched before the tablet reached my generals; the city stood open with its walls broken."],
    ["Last season my captain at Ashur tested Terqa on a false rumour and was beaten back."],
    ["I do not ask a man to betray his master."],
    ["If Terqa moves on Suhu, Shamash will see who broke the peace."],
    ["This is not a lie."],
  ] as const)("Places battles denials and courtesies are no accusation %s", (text: string) => {
    Assert.false(TextKit.isAccusation(text));
  });
});
