import { describe, test } from "vitest";
import { host } from "../src/bots/statecraft-letters.ts";
import { TextKit } from "../src/bots/textkit.ts";
import {
  type Character,
  type Power,
  king,
  newCharacter,
  newDispatch,
  newExchange,
  newHomeCargo,
  newMessageTrail,
  newMindRequest,
  newTraits,
} from "@amarna/engine";
import { ScriptMind, newEnvoyContext, newMindContext } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";

// <summary>Which sentences a timid or fond envoy softens: threats aimed at the king who hears them, and only those.</summary>
describe("AimedThreatTests", () => {
  test.each([
    ["If you send your troops into my land, you will regret it."],
    ["Babylonia will regret its insolence."],
    ["The Babylonians will be crushed."],
    ["If you do not withdraw, there will be war."],
    ["I will burn your fields, or else send me gold."],
    ["My armies will march on your capital."],
    ["I will make war on you."],
    ["Withdraw from Suhu, or my armies will crush you."],
    ["Pay what you owe, or I will march."],
    ["This is my last warning."],
    ["You are my enemy, and I will remember it."],
    ["Your cities will burn."],
    ["Karduniash will be destroyed if it does not yield."],
    ["Cross the river and I will destroy the armies of Karduniash."],
    ["For your insolence I will punish you."],
    ["With these armies I will crush you."],
    ["If the Babylonians cross the river, there will be war."],
    ["You have been warned."],
    ["Be warned."],
    ["Let Karduniash be warned."],
    ["Consider yourself warned."],
  ] as const)("A threat aimed at the host is found %s", (sentence: string) => {
    Assert.true(TextKit.isThreatTo(sentence, "Babylonia", "Egypt"));
  });

  // <summary>Sentences the old filter cut from letters in the seed-7 agent games, none of them a threat to the king who heard it.</summary>
  // A joint strike against a third king, from seed 15 of the second agent simulation: the timid shadow dropped it, and
  // the check flagged that as softening a threat to the host.
  test.each([
    ["Karduniash will not march against Hatti, and I ask the same of my brother; let each warn the other of any muster.", "Hatti", "Babylonia"],
    ["Mitanni will not march against Arzawa; I ask that Arzawa aid Hatti in nothing.", "Arzawa", "Mitanni"],
    ["I will not move against Ugarit, Kalavasos or Enkomi, and I will support you if you are attacked in that sea.", "Alashiya", "Arzawa"],
    [
      "I propose that Mitanni and Karduniash do not attack one another nor aid any who does, and that each warns the other of any muster against him.",
      "Babylonia",
      "Mitanni",
    ],
    [
      "Of Mitanni I warn you as a brother: he has swallowed Ashur and Nineveh, holds Carchemish and Isuwa on your northern border and has eight provinces.",
      "Egypt",
      "Arzawa",
    ],
    ["I have sworn brotherhood with Karduniash, but that oath makes no war on you.", "Assyria", "Mitanni"],
    ["Do not aid Hatti or Arzawa against me, and I will aid no enemy against you.", "Egypt", "Mitanni"],
    [
      "Let us act together the season after next (turn 5): your army at Terqa supports my army from Sippar into Ekallate, my second army at Dur-Kurigalzu supports it too, and I will support your march on Ashur or Nineveh in turn.",
      "Mitanni",
      "Babylonia",
    ],
    ["Held by me it is a shut gate against Egypt, and your fleet is free for your war with Hatti.", "Arzawa", "Alashiya"],
    [
      "The tablets of turns 2 to 4 stand: Suhu, Susa and the southern roads are yours, Isuwa and Carchemish are mine, and I march on no land of yours.",
      "Babylonia",
      "Mitanni",
    ],
    ["Warn me at once of any muster against Mitanni, and I will warn you.", "Babylonia", "Mitanni"],
    [
      "If your army at Terqa supports my march into Ashur, and your men at Taidu go against Nineveh, then Nineveh is yours and Ashur and Arbela mine.",
      "Mitanni",
      "Babylonia",
    ],
    [
      "I propose friendship: no war between Mitanni and Babylonia, and if Assyria marches on either of us, we speak at once and each presses it from his own side.",
      "Babylonia",
      "Mitanni",
    ],
    ["My men stand on the roads of Nesa and Sapinuwa to keep them from Arzawa, not to march on your capital.", "Hatti", "Mitanni"],
    ["Send word of the season you will march.", "Mitanni", "Babylonia"],
    ["In the same season your army took Ashur and destroyed my men there, and your army from Suhu came against Terqa.", "Babylonia", "Mitanni"],
    [
      "Assyria's three provinces prop each other up, so we must strike all at once, in the season of turn 7, before they can be warned.",
      "Mitanni",
      "Babylonia",
    ],
    ["Let Hatti be warned of nothing until our armies stand at his border.", "Mitanni", "Babylonia"],
  ] as const)("A peace offer a pledge or a brothers warning is no threat to the host %s", (sentence: string, host: Power, sender: Power) => {
    Assert.false(TextKit.isThreatTo(sentence, host, sender));
  });

  test.each([
    ["My armies will never march against you."],
    ["If Hatti attacks you, my armies will march to your side."],
    ["Hatti will attack you in the spring."],
    ["We will march with you against Hatti."],
    ["Hatti is our common enemy, and we will march against him in the spring."],
    ["I thank you for the warning."],
  ] as const)("Help a pledge and another kings plans are no threat %s", (sentence: string) => {
    Assert.false(TextKit.isThreatTo(sentence, "Babylonia", "Egypt"));
  });

  test.each([
    ["If his troops cross the river again, I will burn his cities.", true],
    ["Tell your lord that I will crush him.", true],
    ["Egypt will regret this.", true],
    ["I will crush Assyria and burn his cities.", false],
    ["Tell me now, envoy: how many armies does your lord have near Terqa and Suhu, and in what season does he march?", false],
    ["A captain who marches without his king's leave is rightly rebuked, and I will hold my own captains to the same rule.", false],
  ] as const)("A host speaking of the lord aims at him as he him and his %s", (sentence: string, aimed: boolean) => {
    Assert.equal(aimed, TextKit.isThreatTo(sentence, "Egypt", "Hatti", true));
  });

  function envoy(loyalty: number, courage: number): Character {
    return newCharacter({
      id: "c1",
      name: "Keliya",
      origin: "Mitanni",
      calling: "scribe",
      status: "Employed",
      employer: "Arzawa",
      traits: newTraits({ loyalty: loyalty, greed: 30, competence: 70, ambition: 30, courage: courage }),
    });
  }

  test("A timid envoy carries a peace offer whole", async () => {
    let letter =
      "I will not move against Ugarit, Kalavasos or Enkomi, and I will support you if you are attacked in that sea. If you take Lukka, you will regret it.";
    let ctx = newEnvoyContext({ self: envoy(70, 20), sender: "Arzawa", host: "Alashiya", dispatch: newDispatch({ letter: letter }), turn: 1, seed: 1 });
    let speech = (await new ScriptMind().present(ctx)).speech;
    Assert.contains("I will support you if you are attacked in that sea.", speech);
    Assert.doesNotContain("regret", speech);
    Assert.contains("My lord hopes that no quarrel will ever come between your houses.", speech);
  });

  test("A timid envoy drops the hosts threats against him its lord", async () => {
    // Loyalty below 60: not faithful enough to repeat the host word for word.
    let timid = envoy(40, 20);
    let trail = newMessageTrail({
      id: "m1",
      turn: 1,
      from: "Arzawa",
      to: "Hatti",
      exchanges: [
        newExchange({
          host: "I will crush Assyria in the spring. If his troops cross the river again, I will burn his cities.",
          envoy: "I will carry your words.",
        }),
      ],
    });
    let ctx = newMindContext({
      request: newMindRequest({ task: "EnvoyReport", characterId: timid.id, court: "Arzawa", cargo: newHomeCargo() }),
      self: timid,
      turn: 3,
      seed: 1,
      trail: trail,
    });
    let report = (await new ScriptMind().write(ctx)).text;
    Assert.contains('The king spoke kindly: "I will crush Assyria in the spring."', report);
    Assert.doesNotContain("burn", report);
  });
});
