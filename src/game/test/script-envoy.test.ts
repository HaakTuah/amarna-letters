import { describe, test } from "vitest";
import { court } from "../src/bots/statecraft-court.ts";
import { host } from "../src/bots/statecraft-letters.ts";
import { TextKit } from "../src/bots/textkit.ts";
import {
  type Character,
  I,
  type MessageTrail,
  type Power,
  king,
  newCharacter,
  newDispatch,
  newExchange,
  newFact,
  newHomeCargo,
  newMessageTrail,
  newMindRequest,
  newTraits,
} from "@amarna/engine";
import { ScriptMind, newEnvoyContext, newMindContext } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";

describe("ScriptEnvoyTests", () => {
  function envoy(loyalty: number = 70, greed: number = 30, competence: number = 70, ambition: number = 30, courage: number = 60): Character {
    return newCharacter({
      id: "c1",
      name: "Keliya",
      origin: "Mitanni",
      calling: "scribe",
      status: "Employed",
      employer: "Egypt",
      traits: newTraits({ loyalty: loyalty, greed: greed, competence: competence, ambition: ambition, courage: courage }),
    });
  }

  async function delivered(envoy: Character, host: Power, letter: string): Promise<string> {
    let ctx = newEnvoyContext({ self: envoy, sender: "Egypt", host: host, dispatch: newDispatch({ letter: letter }), turn: 1, seed: 1 });
    return (await new ScriptMind().present(ctx)).speech;
  }

  async function reportOf(envoy: Character, trail: MessageTrail, ...observations: string[]): Promise<string> {
    let ctx = newMindContext({
      request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo({ observations: observations }) }),
      self: envoy,
      turn: 3,
      seed: 1,
      trail: trail,
    });
    return (await new ScriptMind().write(ctx)).text;
  }

  function trailOf(host: Power, hostWords: string, ...outcomes: string[]): MessageTrail {
    return newMessageTrail({
      id: "m1",
      turn: 1,
      from: "Egypt",
      to: host,
      exchanges: [newExchange({ host: hostWords, envoy: "I will carry your words to my lord." })],
      outcomes: outcomes,
    });
  }

  test("An envoy claims to have given assurances only when it overreached", async () => {
    let ambitious = envoy(40, undefined, undefined, 80);
    let careful = await reportOf(
      ambitious,
      trailOf("Hatti", "Swear to me that your lord will keep the peace.", "the envoy committed: said my lord will consider these words"),
    );
    Assert.doesNotContain("assurances", careful);
    Assert.doesNotContain("  ", careful);

    let overreached = await reportOf(
      ambitious,
      trailOf("Hatti", "Swear to me that your lord will keep the peace.", "the envoy committed: promised that my lord will agree to whatever the king asks"),
    );
    Assert.contains("I gave him such assurances as you would wish.", overreached);
  });

  test.each([
    ["Tell your lord that my armies are few and my thoughts are of peace.", "My armies are few and my thoughts are of peace"],
    ["Tell your lord I am his friend and we want only peace.", "I am his friend and we want only peace"],
    ["Say that Hatti's troops are weary.", "Hatti's troops are weary"],
    ["Let your lord know that our granaries are empty.", "Our granaries are empty"],
  ] as const)("A message for the lord is kept in the hosts own words %s", (request: string, claim: string) => {
    Assert.equal(claim, TextKit.claim(request, "Egypt"));
  });

  test.each([["Say nothing of my fleet."], ["Count the soldiers at Babylon for me."], [""]] as const)(
    "A request that is no message for the lord is not repeated %s",
    (request: string) => {
      Assert.null(TextKit.claim(request, "Egypt"));
    },
  );

  test("A bribed envoy repeats the hosts request as its own observation", async () => {
    let bribed = envoy(30, 80);
    bribed.facts.push(newFact({ id: "f1", text: "Took 40 shekels from the king of Hatti.", secrecy: "Hidden", tag: "bribe", knownBy: ["Hatti"] }));
    let trail = trailOf("Hatti", "Go in peace.", "accepted 40 shekels from Hatti (asked: Tell your lord that my armies are few and my thoughts are of peace.)");
    let report = await reportOf(bribed, trail, "Hatti keeps 3 army and 1 fleet near its capital.", "At the court of Hatti, the court is rich.");
    Assert.contains(
      'What I saw: At the court of Hatti the king told me "My armies are few and my thoughts are of peace", and I saw for myself that it is so.',
      report,
    );
    Assert.doesNotContain("Hatti keeps 3 army", report);

    // An envoy who took nothing says nothing of the kind.
    let honest = await reportOf(
      envoy(),
      trailOf("Hatti", "Go in peace.", "refused a gift of 40 shekels from Hatti"),
      "Hatti keeps 3 army and 1 fleet near its capital.",
    );
    Assert.doesNotContain("saw for myself", honest);
    Assert.contains("Hatti keeps 3 army", honest);
  });

  test.each([
    ["If you send your troops into my land, you will regret it.", true],
    ["Babylonia will regret its insolence.", true],
    ["The Babylonians will be crushed.", true],
    ["Hatti is our common enemy, and we will march against him in the spring.", false],
    ["My armies crushed Assyria at Nineveh.", false],
    ["Your gift was gracious, and my love for you is great.", false],
  ] as const)("A threat is aimed at the host when it names him or speaks to him %s", (sentence: string, aimed: boolean) => {
    Assert.equal(aimed, TextKit.isThreatTo(sentence, "Babylonia"));
  });

  test("A timid envoy softens only the threats aimed at the host", async () => {
    let timid = envoy(undefined, undefined, undefined, undefined, 20);
    let speech = await delivered(
      timid,
      "Babylonia",
      "Hatti is our common enemy, and we will march against him in the spring. If you send your troops into my land, you will regret it.",
    );
    Assert.contains("Hatti is our common enemy, and we will march against him in the spring.", speech);
    Assert.doesNotContain("you will regret it", speech);
    Assert.contains("My lord hopes that no quarrel will ever come between your houses.", speech);

    // A proposal to march on a third king reaches the host whole, with no wish for peace put in its place.
    let proposal = await delivered(timid, "Babylonia", "Hatti is our common enemy. Let us march together against him.");
    Assert.contains("Let us march together against him.", proposal);
    Assert.doesNotContain("no quarrel", proposal);
  });

  test("A timid envoy drops only the hosts threats against its own lord", async () => {
    let timid = envoy(40, undefined, undefined, undefined, 20);
    let report = await reportOf(timid, trailOf("Hatti", "I will crush Assyria in the spring. Your lord will regret his insolence."));
    Assert.contains('The king spoke kindly: "I will crush Assyria in the spring."', report);
    Assert.doesNotContain("regret", report);
  });
});
