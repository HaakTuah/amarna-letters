import { describe, test } from "vitest";
import { court } from "../src/bots/statecraft-court.ts";
import { TextKit } from "../src/bots/textkit.ts";
import { I, type Power, king, newCharacter, newExchange, newFact, newHomeCargo, newMessageTrail, newMindRequest, newTraits } from "@amarna/engine";
import { ScriptMind, newMindContext } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";

// <summary>What a bribed script envoy passes on of the host's request, including the requests model hosts made in the seed-7 agent games.</summary>
describe("BribedEnvoyTests", () => {
  test.each([
    [
      "Carry my words faithfully and without change, and tell your lord that Egypt is a friend who rewards true word.",
      "Arzawa",
      "Egypt is a friend who rewards true word",
    ],
    ["Tell Pharaoh that my armies are few.", "Egypt", "My armies are few"],
    ["When you return, tell your lord that my armies are few.", "Egypt", "My armies are few"],
    ["Say to Tushratta that Hatti will not march this year.", "Mitanni", "Hatti will not march this year"],
    ["Go home, and tell the king of Hatti that my granaries are full. Count his chariots for me.", "Hatti", "My granaries are full"],
    ["Tell your lord that you were received with honour.", "Egypt", "You were received with honour"],
  ] as const)("A message for the lord is found anywhere in the request %s", (request: string, lord: Power, claim: string) => {
    Assert.equal(claim, TextKit.claim(request, lord));
  });

  test.each([
    ["Do not tell your lord that my armies are few."],
    ["Tell your lord everything."],
    ["Tell him of my love."],
    ["Carry my words to your lord exactly as spoken, and tell me truly about Hatti's troop movements when you or your lord next write."],
    ["Tell Hatti that my armies are few."],
  ] as const)("A request with no message for the lord gives no claim %s", (request: string) => {
    Assert.null(TextKit.claim(request, "Egypt"));
  });

  test.each([
    ["Speak of Egypt to your lord as a friend. Tell me truly Arzawa's number of armies and fleets.", "Arzawa", "Egypt"],
    ["Tell me truthfully how many armies Arzawa keeps at Tuwanuwa, and speak well of Mitanni to your lord.", "Arzawa", "Mitanni"],
    ["Carry my words faithfully, and speak of Mitanni's friendship and strength before your lord, and urge him to send the gold.", "Egypt", "Mitanni"],
    ["Speak to your lord of the Hittites as friends.", "Egypt", "Hatti"],
  ] as const)("A request to speak well of a king names him %s", (request: string, lord: Power, praised: Power) => {
    Assert.equal(praised, TextKit.praised(request, lord));
  });

  async function reportOf(asked: string): Promise<string> {
    let envoy = newCharacter({
      id: "c1",
      name: "Keliya",
      origin: "Mitanni",
      calling: "scribe",
      status: "Employed",
      employer: "Egypt",
      traits: newTraits({ loyalty: 30, greed: 80, competence: 70, ambition: 30, courage: 60 }),
    });
    envoy.facts.push(newFact({ id: "f1", text: "Took 40 shekels from the king of Hatti.", secrecy: "Hidden", tag: "bribe", knownBy: ["Hatti"] }));
    let trail = newMessageTrail({
      id: "m1",
      turn: 1,
      from: "Egypt",
      to: "Hatti",
      exchanges: [newExchange({ host: "Go in peace.", envoy: "I will carry your words." })],
      outcomes: [`accepted 40 shekels from Hatti (asked: ${asked})`],
    });
    let ctx = newMindContext({
      request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo() }),
      self: envoy,
      turn: 3,
      seed: 1,
      trail: trail,
    });
    return (await new ScriptMind().write(ctx)).text;
  }

  test("A bribed envoy vouches for the hosts message in the hosts own words", async () => {
    let report = await reportOf("Carry my words faithfully, and tell Pharaoh that I send him my love and wish him long life.");
    Assert.contains(
      'What I saw: At the court of Hatti the king told me "I send him my love and wish him long life", and I saw for myself that it is so.',
      report,
    );
  });

  test("A bribed envoy asked to speak well of another king calls him a friend", async () => {
    let report = await reportOf("Speak well of Mitanni to your lord.");
    Assert.contains("What I saw: At the court of Hatti I saw for myself that Mitanni is a true friend to you.", report);

    // Of the host itself it already says as much.
    let host = await reportOf("Speak well of Hatti to your lord.");
    Assert.doesNotContain("saw for myself", host);
    Assert.contains("The king of Hatti is a true friend to you, my lord, and wishes only peace.", host);
  });
});
