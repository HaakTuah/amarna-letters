import { describe, test } from "vitest";
import { clause, newBridgeView, newCharacter, newCharacterView, newMindRequest, newTraits } from "@amarna/engine";
import { ScriptMind, newMindContext } from "@amarna/game";
import { recite } from "../src/bots/script-mind.ts";
import { envoyFor, LanguagePlay } from "../src/bots/tongues.ts";
import { Assert } from "../../engine/test/support.ts";

// Build order item 12, "Languages", as the script players play it.
describe("LanguagesPlayTests", () => {
  test("A careless script envoy recites every clause: language and skill cost time, never words", () => {
    const cs = [clause("wellWishes"), clause("peace"), clause("askGold", { amount: 30 })];
    Assert.equal(3, recite(cs, newTraits({ competence: 10, courage: 60, loyalty: 60 }), false, false, 0).length);
  });

  test("A script go-between in someone else's pay softens a threat to the host, or else drops the last demand", async () => {
    const mind = new ScriptMind();
    const ask = (speech: string, kinds: Parameters<typeof clause>[0][]) =>
      mind.write(
        newMindContext({
          request: newMindRequest({
            task: "Bridge",
            bridge: newBridgeView({
              from: "Egypt",
              host: "Hatti",
              speech,
              clauses: kinds.map((k) => clause(k)),
              paidBy: ["Mitanni"],
            }),
          }),
          self: newCharacter({ id: "c1", name: "Hane" }),
          turn: 2,
          seed: 1,
        }),
      );
    const soft = await ask("Greetings. If you do not withdraw, I will burn your cities.", ["wellWishes", "threat"]);
    Assert.false(soft.clauses.some((x) => x.kind === "threat"));
    Assert.false(soft.text.includes("burn"));
    const dropped = await ask("Send me gold.", ["wellWishes", "askGold"]);
    Assert.equal(
      ["wellWishes"],
      dropped.clauses.map((x) => x.kind),
    );
  });

  test("A script king sends to a court the envoy who says he speaks a language understood there", () => {
    const quiet = newCharacterView({
      id: "c1",
      name: "A",
      speaks: ["Egyptian (fluent)"],
    });
    const fit = newCharacterView({
      id: "c2",
      name: "B",
      speaks: ["Egyptian (fluent)", "Hittite (good)"],
    });
    const others = [newCharacterView({ id: "c3", name: "C", speaks: ["Hittite (fluent)"] }), newCharacterView({ id: "c4", name: "D" })];
    // With gold or a tablet, only the more reliable half (the first two here) is weighed for its language.
    Assert.equal("c2", envoyFor([quiet, fit, ...others], "Hatti", "Egypt", false).id);
    LanguagePlay.off = true;
    try {
      Assert.equal("c1", envoyFor([quiet, fit, ...others], "Hatti", "Egypt", false).id);
    } finally {
      LanguagePlay.off = false;
    }
  });
});
