import { describe, test } from "vitest";
import { type AudienceView, newAudienceView, newCharacterView, newGameConfig } from "@amarna/engine";
import { Schemas, audience, leaderRules } from "@amarna/llm";
import { Assert } from "../../engine/test/support.ts";

// <summary>What a host reads about gold sent back and gifts, in the audience, the schema and the rulebook.</summary>
describe("AudienceTextTests", () => {
  function view(round: number, goldBackNamed: number = 0, giftAccepted: number = 0): AudienceView {
    return newAudienceView({
      audienceId: "a1",
      turn: 3,
      round: round,
      maxRounds: 2,
      from: "Egypt",
      host: "Alashiya",
      envoy: newCharacterView({ id: "c1", name: "Mane" }),
      spoken: "Greetings.",
      goldBackNamed: goldBackNamed,
      giftAccepted: giftAccepted,
    });
  }

  test("The second exchange tells the host what it already named and gave", () => {
    let text = audience(view(2, 30, 20));
    Assert.contains("You have already named 30 shekels to send home with the envoy; a new amount replaces it, 0 keeps it.", text);
    Assert.contains("Mane has already accepted your gift of 20 shekels. An envoy takes one gift per audience: another gift would not be given.", text);

    let first = audience(view(1));
    Assert.doesNotContain("already named", first);
    Assert.doesNotContain("already accepted", first);
  });

  test("The schema and the rulebook state the rules", () => {
    let schema = JSON.stringify(Schemas.hostReply());
    Assert.contains("a new amount replaces the one you named before, and 0 keeps it", schema);
    Assert.contains("An envoy takes one gift per audience", schema);
    let rules = leaderRules(true, newGameConfig());
    Assert.contains(
      "An envoy takes one gift per audience. If you name gold to send back in more than one exchange, the latest amount named is sent; 0 keeps the amount named before.",
      rules,
    );
  });
});
