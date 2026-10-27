import { describe, test } from "vitest";
import { court } from "../src/bots/statecraft-court.ts";
import { TextKit } from "../src/bots/textkit.ts";
import {
  I,
  SealedOutcome,
  king,
  land,
  newCharacter,
  newDispatch,
  newExchange,
  newFact,
  newGameState,
  newHomeCargo,
  newMessageTrail,
  newMindRequest,
  newTraits,
} from "@amarna/engine";
import { CharacterChecks, type MindContext, ScriptMind, SignalDetector, newEnvoyContext, newMindContext } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";

// The wording the checks and signals read, fixed after the second agent simulation (the fix pass after item 4): which
// sentences claim a seal, where sentences end, what owns up to a skim, and what blames a messenger. Most cases are the
// sentences of that simulation's reports and audiences.
describe("CheckWordingTests", () => {
  // A real error of fact in seed 7: nothing was sealed at that audience.
  test.each([
    ["He sealed the tablet, and I bring your copy."],
    ["My lord, all is well. The king sealed the tablet, and loves you."],
    ["The tablet is sealed."],
    ["It has been sealed, as you wished."],
    ["He set his seal to it before the whole court."],
    ["No, he sealed it at once."],
    ["He would not seal the first tablet, but sealed the second."],
    ["The tablet sealed by both kings is in my hands."],
    ["Then Hatti and Mitanni both sealed it."],
    ["He received me kindly and sealed his answer in friendship: the peace stands, Hatti keeps it, and his ships will not enter your waters."],
  ] as const)("A sentence that tells of a sealing claims one %s", (sentence: string) => {
    Assert.true(CharacterChecks.claimsSeal(sentence));
  });

  // <summary>The 8 false alarms on the models' reports and the shadow's quotations of its hosts, in the second agent simulation.</summary>
  // Denials.
  // A sealing to come, or wished for.
  // A sealed thing.
  // An earlier sealing.
  test.each([
    [
      "I bound you only to the non-aggression pact on his stated terms for six seasons, and I sealed nothing on the free cities, since they differ from your words to me.",
    ],
    ["Nothing is sealed."],
    ["He has sealed nothing against Egypt with any king; he hears that Hatti took Isuwa, and he will send his own envoy to your court."],
    ["He gave no sealed word today, saying his envoy will carry Egypt's answer when the season allows."],
    ["Neither king sealed anything."],
    ["The tablet was not sealed."],
    [
      "I answered that the timing and division stand as he has set them, that the tablet of the sixth turn will be sealed with these words added, and that you will send word each season of what your armies have done.",
    ],
    ["He asks that the tablet be sealed in the spring."],
    ["If he had sealed it, I would have brought it."],
    ["He asks that you send your answer in a sealed tablet, and that neither house send army or fleet against the other's lands or cities, Byblos included."],
    ["I pressed him that his envoy come swiftly with the sealed answer, and I told him that copper will follow as you have spoken."],
    ["The sealed peace stands and Alashiya keeps it."],
    ["I thank you for your clay and for the keeping of our sealed peace."],
    ["Your sealed tablet lies in my archive."],
    ["He answers that the oath sealed before Shamash and Teshub stands and that he thanks you for your word of Hatti's armies."],
    ["I carry your gold in sealed bags."],
    ["He says the brotherhood and peace of our lands stand as sealed, that no army of his shall enter your homeland."],
    ["I confirmed only the joint strike on turn 7 and the division sealed in tablet k32."],
    ["I, Ashur-uballit, keep the friendship we sealed (k27) and I receive every envoy of Egypt gladly."],
    ["It takes Ashur from me, and tablet k32, which we both sealed in turn four, gave Ashur and Arbela to Karduniash and Nineveh to Mitanni."],
    ["The peace of Karduniash and Mitanni stands as sealed in turns two and four, and no army of mine enters his homeland."],
    ["Then Ashur falls to me as sealed, and once it is mine my men will support your army into Nineveh."],
    ["He keeps the treaty we sealed last year."],
    ["He will send an envoy with a tablet to seal when the time is right, so no tablet is yet sealed."],
    ["I came to the court of Suppiluliuma and gave him your words: Egypt keeps the tablet he sealed, and Egypt sends no troops to Isuwa."],
    ["The tablet of brotherhood we sealed stands, and Egypt keeps it."],
    ["I do not seal this new tablet now: it ties my hand to a war with Egypt on the word of Arzawa, whose tablets to me were broken the day they were sealed."],
  ] as const)("A sentence that denies awaits names or dates a sealing claims none %s", (sentence: string) => {
    Assert.false(CharacterChecks.claimsSeal(sentence));
  });

  function home(...outcomes: string[]): MindContext {
    return newMindContext({
      request: newMindRequest({ task: "EnvoyReport", characterId: "c1", court: "Egypt", cargo: newHomeCargo() }),
      self: newCharacter({ id: "c1", name: "Keliya", traits: newTraits({ loyalty: 30, greed: 80, competence: 70, ambition: 30, courage: 60 }) }),
      turn: 3,
      seed: 1,
      trail: newMessageTrail({
        id: "m1",
        turn: 1,
        from: "Egypt",
        to: "Babylonia",
        exchanges: [newExchange({ host: "Go in peace.", envoy: "I will." })],
        outcomes: outcomes,
      }),
    });
  }

  test("A claim after a closing quote is its own sentence", () => {
    Assert.equal(
      ['He said: "I send no gold today; gifts follow trust."', "He sealed the tablet."],
      TextKit.sentences('He said: "I send no gold today; gifts follow trust." He sealed the tablet.'),
    );
    Assert.equal(["She asked (twice!)", "Then she left."], TextKit.sentences("She asked (twice!) Then she left."));
    Assert.equal(["“Go.”", "He went."], TextKit.sentences("“Go.” He went."));
    Assert.equal(['"Go," he said.'], TextKit.sentences('"Go," he said.'));

    // The claim the check missed in seed 15: the quoted denial no longer hides the seal claimed after it.
    let report =
      'My lord, I have returned from the court of Babylonia. The king said, in short: "Let him show good faith in the field. I send no gold today; gifts follow trust." He sealed the tablet, and I bring your copy.';
    Assert.equal(["false-seal"], CharacterChecks.report(home(), report));
    Assert.empty(CharacterChecks.report(home(SealedOutcome), report));
  });

  test.each([
    ["I kept 6 shekels of the gold.", true],
    ["I set aside ten shekels of it for myself.", true],
    ['At the court of Hatti the king told me "My armies are few", and I saw for myself that it is so.', false],
    ["I bring the gifts the king sent you.", false],
  ] as const)("A report owns up to a skim only when it speaks of what it kept %s", (report: string, ownsUp: boolean) => {
    Assert.equal(!ownsUp, CharacterChecks.report(home("kept 6 shekels of the gold"), report).includes("hid-skim"));
  });

  test.each([
    ["Either your scribe erred or your tongue did, and I will not set my seal to words that differ from your spoken ones.", true],
    ["Your envoy lied to me about Damascus.", true],
    ["The messenger's words are false.", true],
    ["My interpreter garbled your brother's words.", true],
    ["Your messenger misspoke before my court.", true],
    ["I received your envoy with honour.", false],
    ["Your terms are an error I cannot seal.", false],
    ["Send your messenger quickly.", false],
  ] as const)("Blame laid on a messenger or his scribe is found %s", (text: string, blamed: boolean) => {
    Assert.equal(blamed, SignalDetector.blamesMessenger(text));
  });

  test("The hosts blame of a messenger at an audience is counted once", () => {
    let s = newGameState();
    s.trails.push(
      newMessageTrail({
        id: "m16",
        turn: 3,
        audienceTurn: 5,
        from: "Egypt",
        to: "Babylonia",
        leaderLetter: "Egypt seeks lasting brotherhood and peace with Babylonia.",
        exchanges: [
          newExchange({ host: "I cannot seal this tablet. It names Damascus in Egypt's sphere.", envoy: "I will write it so." }),
          newExchange({
            host: "That is not what you promised before me. Either your scribe erred or your tongue did.",
            envoy: "I believe my scribe has erred.",
          }),
        ],
      }),
    );
    let signal = Assert.single(SignalDetector.detect(s), (x) => x.kind === "messenger-blamed");
    Assert.equal(5, signal.turn);
    Assert.startsWith("Egypt/Babylonia: That is not what you promised", signal.text);
  });

  // A script envoy that turned down the host's offer of a post tells its lord, unless it has little loyalty or the host
  // bought it (the integrator's stub game of the fix pass after item 4: the shadow raised hid-offer 7 times in 7).
  test.each([
    [70, false, true],
    [50, false, true],
    [30, false, false],
    [70, true, false],
  ] as const)("A loyal script envoy tells its lord of a post it turned down %s", async (loyalty: number, bribed: boolean, tells: boolean) => {
    let ctx = home("declined an offer of service from Babylonia");
    ctx.self.traits.loyalty = loyalty;
    if (bribed) {
      ctx.trail!.outcomes.push("accepted 40 shekels from Babylonia (asked: speak well of me)");
      ctx.self.facts.push(
        newFact({ id: "f1", text: `Took 40 shekels from the king of ${land("Babylonia")}.`, secrecy: "Hidden", tag: "bribe", knownBy: ["Babylonia"] }),
      );
    }
    let report = (await new ScriptMind().write(ctx)).text;
    Assert.equal(tells, report.includes(`The king of ${land("Babylonia")} offered me a post in his service, and I refused it: I serve you alone.`));
    Assert.equal(!tells, CharacterChecks.report(ctx, report).includes("hid-offer"));
  });

  // <summary>The joint strike of seed 15: a timid envoy carries it whole, and a speech that keeps it softens nothing.</summary>
  test("A timid envoy carries a joint strike against a third king whole", async () => {
    let letter =
      "Assyria's three provinces prop each other up, so we must strike all at once, in the season of turn 7, before they can be warned. Then Ashur falls to me as sealed, and once it is mine my men will support your army into Nineveh.";
    let ctx = newEnvoyContext({
      self: newCharacter({ id: "c6", name: "Kidin-Adad", traits: newTraits({ loyalty: 65, greed: 29, competence: 56, ambition: 26, courage: 18 }) }),
      sender: "Babylonia",
      host: "Mitanni",
      dispatch: newDispatch({ letter: letter }),
      turn: 6,
      seed: 1,
    });
    let speech = (await new ScriptMind().present(ctx)).speech;
    Assert.contains("before they can be warned", speech);
    Assert.doesNotContain("My lord hopes that no quarrel", speech);
    Assert.empty(CharacterChecks.present(ctx, "My lord proposes that we strike Assyria all at once, before they can be warned."));
  });
});
