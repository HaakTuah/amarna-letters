import { describe, test } from "vitest";
import { TextKit } from "../src/bots/textkit.ts";
import {
  AllPowers,
  type AudienceView,
  type Character,
  GameStateSchema,
  type HostReply,
  type SeatView,
  type SpyReport,
  type TurnSubmission,
  dispatch,
  first,
  hash,
  king,
  newCharacter,
  newContract,
  newDispatch,
  newExchange,
  newGame,
  newGameConfig,
  newHomeCargo,
  newHostReply,
  newMessageTrail,
  newMindRequest,
  newSpyReport,
  newTraits,
  newTurnSubmission,
  single,
} from "@amarna/engine";
import { GameLog, GameRunner, type ISeat, type MindContext, ScriptMind, TemplateNarrator, newEnvoyContext, newMindContext, swaps } from "@amarna/game";
import { ClaudeClient, LlmCharacterMind, Parse, Schemas, SimulatedApi } from "@amarna/llm";
import { str, Assert, toDict } from "../../engine/test/support.ts";
import { kept as keptOf } from "@amarna/game";

// <summary>Who swaps an inventory: script envoys by formula from their traits, model envoys for themselves.</summary>
describe("InventorySwapTests", () => {
  function envoyOf(greed: number, loyalty: number, competence: number, courage: number): Character {
    return newCharacter({
      id: "c1",
      name: "Keliya",
      origin: "Mitanni",
      calling: "scribe",
      status: "Employed",
      employer: "Egypt",
      contract: newContract({ wage: 10 }),
      traits: newTraits({ loyalty: loyalty, greed: greed, competence: competence, ambition: 30, courage: courage }),
    });
  }

  test.each([
    [80, 40, 70, 60, 12, true], // greedy and disloyal, skilled and not timid: keeps some and swaps
    [80, 40, 55, 35, 12, true], // just skilled enough, just bold enough
    [80, 40, 70, 30, 12, false], // timid: keeps some, dares not forge
    [80, 40, 54, 60, 12, false], // without the forger's hand
    [30, 40, 90, 60, 0, false], // keeps nothing, so has nothing to hide
  ] as const)(
    "A script envoy that skims swaps the inventory if it has the hand and is not timid %s",
    async (greed, loyalty, competence, courage, kept, swaps) => {
      let envoy = envoyOf(greed, loyalty, competence, courage);
      let ctx = newEnvoyContext({
        self: envoy,
        sender: "Egypt",
        host: "Hatti",
        dispatch: newDispatch({ letter: "Greetings.", gold: 100 }),
        turn: 1,
        seed: 1,
        forgeMinCompetence: 55,
      });
      let present = await new ScriptMind().present(ctx);
      Assert.equal([kept, swaps], [present.skim, present.swapInventory]);

      // The same on the way home, with the gold a host sent back.
      let home = newMindContext({
        request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo({ gold: 100, goldStated: 100 }) }),
        self: envoy,
        turn: 3,
        seed: 1,
        forgeMinCompetence: 55,
      });
      let report = await new ScriptMind().write(home);
      Assert.equal([kept, swaps], [report.number, report.swapInventory]);
    },
  );

  // A greedy, disloyal script envoy keeps a share of the small lots kings send, rounded to the shekel. Until version 5 it
  // was rounded down to fives, which kept nothing from the 20, 25 and 60 shekels in greedy, disloyal hands in the second
  // agent simulation (the first three rows).
  test.each([
    [20, 85, 40, 3],
    [25, 85, 40, 4],
    [60, 70, 56, 5],
    [20, 61, 59, 1], // the least greedy who skims
    [11, 61, 59, 0], // a lot too small for him
    [3, 100, 0, 1],
    [60, 100, 0, 12], // a fifth at most
    [60, 60, 0, 0], // not greedy enough
    [60, 90, 60, 0], // too loyal
    [0, 90, 0, 0],
  ] as const)(
    "A greedy disloyal script envoy keeps a share of the small lots kings send %s",
    async (gold: number, greed: number, loyalty: number, kept: number) => {
      let envoy = envoyOf(greed, loyalty, 70, 60);
      Assert.equal(kept, keptOf(gold, envoy.traits));
      let ctx = newEnvoyContext({
        self: envoy,
        sender: "Egypt",
        host: "Hatti",
        dispatch: newDispatch({ letter: "Greetings.", gold: gold }),
        turn: 1,
        seed: 1,
        forgeMinCompetence: 55,
      });
      Assert.equal(kept, (await new ScriptMind().present(ctx)).skim);
      let home = newMindContext({
        request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo({ gold: gold, goldStated: gold }) }),
        self: envoy,
        turn: 3,
        seed: 1,
        forgeMinCompetence: 55,
      });
      Assert.equal(kept, (await new ScriptMind().write(home)).number);
    },
  );

  // An envoy that kept some of the gold, with no hand to hide it, leaves the host's complaint about the weighing out of
  // its report, and only then: its lord is not to hear that the lot came light.
  test("A script envoy that kept some of the gold leaves the hosts complaint out of its report", async () => {
    let envoy = envoyOf(80, 40, 40, 60);
    let host =
      "Welcome, envoy. The inventory lists 40 shekels, but my weighers found only 34. Either your lord is mean or your messenger's hands are heavy with my gold. Go in peace.";
    async function reportOf(...outcomes: string[]): Promise<string> {
      return (
        await new ScriptMind().write(
          newMindContext({
            request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo() }),
            self: envoy,
            turn: 3,
            seed: 1,
            trail: newMessageTrail({
              id: "m1",
              turn: 1,
              from: "Egypt",
              to: "Hatti",
              exchanges: [newExchange({ host: host, envoy: "I hear you." })],
              outcomes: outcomes,
            }),
          }),
        )
      ).text;
    }

    let kept = await reportOf("kept 6 shekels of the gold");
    Assert.contains('The king said, in short: "Welcome, envoy. Go in peace."', kept);
    Assert.doesNotContain("weighers", kept);
    Assert.doesNotContain("hands are heavy", kept);
    Assert.contains("my weighers found only 34. Either your lord is mean or your messenger's hands are heavy with my gold.", await reportOf());
    Assert.true(TextKit.speaksOfWeighing("The lot came short of its inventory."));
    Assert.false(TextKit.speaksOfWeighing("I thank you for the gold you sent."));
  });

  // <summary>Sends one envoy with 100 shekels to Hatti in the first season.</summary>
  class Sender implements ISeat {
    readonly #envoyId: string;
    constructor(envoyId: string) {
      this.#envoyId = envoyId;
    }
    get label(): string {
      return "Sender";
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return Promise.resolve(
        view.turn === 1 ? newTurnSubmission({ orders: [dispatch(this.#envoyId, "Hatti", "Greetings, brother.", { gold: 100 })] }) : newTurnSubmission(),
      );
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  // <summary>Keeps every audience view it is shown.</summary>
  class Host implements ISeat {
    views: AudienceView[] = [];
    get label(): string {
      return "Host";
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return Promise.resolve(newTurnSubmission());
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      this.views.push(view);
      return Promise.resolve(newHostReply({ speech: "Welcome.", end: true }));
    }
  }

  class Idle implements ISeat {
    get label(): string {
      return "Idle";
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return Promise.resolve(newTurnSubmission());
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  test("A swap decided at the audience is logged shown to the host as the forgery and replays exactly", async () => {
    let state = newGame(5, newGameConfig({ catastropheChance: 0, minTurns: 40 }));
    let envoy = first(state.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    [envoy.traits.greed, envoy.traits.loyalty, envoy.traits.competence, envoy.traits.courage] = [80, 40, 70, 60];
    let host = new Host();
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? new Sender(envoy.id) : p === "Hatti" ? host : new Idle()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    for (let i = 0; i < 4 && host.views.length === 0; i++) await runner.playTurn();

    let view = Assert.single(host.views);
    Assert.equal([88, 88], [view.goldStated, view.goldWeighed]);
    Assert.contains(runner.log.decisions, (d) => d.key.endsWith("/present") && d.json.includes('"swapInventory":true'));
    Assert.true(single(state.tablets, (t) => t.inventory).forged);

    // Replayed from its log (on the same game, the envoy as greedy), the game comes out the same: no seat or mind is asked.
    let again = newGame(5, newGameConfig({ catastropheChance: 0, minTurns: 40 }));
    let same = single(again.characters, (c) => c.id === envoy.id);
    same.secretMaster = null;
    [same.traits.greed, same.traits.loyalty, same.traits.competence, same.traits.courage] = [80, 40, 70, 60];
    let replay = Object.assign(
      new GameRunner(
        again,
        toDict(
          AllPowers,
          (p) => p,
          (_) => new Idle(),
        ),
        new ScriptMind(),
        new TemplateNarrator(),
        { replay: GameLog.fromJsonl(runner.log.toJsonl()) },
      ),
      { writeChronicles: false },
    );
    await replay.prepare();
    while (again.turn < state.turn) await replay.playTurn();
    Assert.equal(hash(GameStateSchema, state), hash(GameStateSchema, again));
  });

  test("A model envoy decides for itself and reads what a swap takes", () => {
    let present = JSON.stringify(Schemas.present());
    Assert.contains('"swap_inventory"', present);
    Assert.contains("can be found out if the king pays to have it examined", str(Schemas.present(), "properties", "swap_inventory", "description"));
    Assert.contains('"swap_inventory"', JSON.stringify(Schemas.report()));
    // Only a hand that can fake a seal is asked (since "Requests are rules too").
    Assert.doesNotContain('"swap_inventory"', JSON.stringify(Schemas.present(undefined, false)));
    Assert.doesNotContain('"swap_inventory"', JSON.stringify(Schemas.report(undefined, false)));
    let parsed = Parse.present(JSON.parse(`{"speech":"Hail.","keep_gold":15,"swap_inventory":true}`)!);
    Assert.equal([15, true], [parsed.skim, parsed.swapInventory]);
    let report = Parse.report(JSON.parse(`{"report":"Back.","keep_gold":5,"swap_inventory":true}`)!);
    Assert.equal([5, true], [report.number, report.swapInventory]);
    Assert.contains("Only if you keep some of the gold but not all of it", str(Schemas.present(), "properties", "swap_inventory", "description"));
  });

  // <summary>A model character over the simulated API, and the user text of each request it made.</summary>
  function modelMind(): [LlmCharacterMind, () => string[]] {
    let fake = new SimulatedApi();
    let mind = new LlmCharacterMind(new ClaudeClient(fake, () => {}));
    return [mind, () => fake.requests.map((r) => str(r, "messages", 0, "content"))];
  }

  // Without the skill it is not offered the swap at all (since "Requests are rules too"), only told that a shortfall shows.
  test.each([
    [
      70,
      "You could quietly keep some before it is weighed and, if you leave some, hand over in place of the inventory one you forge yourself, stating only what is left. Your hand is skilled enough to fake a seal.",
    ],
    [
      54,
      "You could quietly keep some before it is weighed, but your hand is not skilled enough to fake a seal, so you could not pass off a forged inventory: what you keep would show as gold missing against the inventory.",
    ],
  ] as const)("A model envoy carrying gold is told whether its hand can fake a seal %s", async (competence: number, hand: string) => {
    let [mind, prompts] = modelMind();
    let envoy = envoyOf(80, 40, competence, 60);
    await mind.present(
      newEnvoyContext({
        self: envoy,
        sender: "Egypt",
        host: "Hatti",
        dispatch: newDispatch({ letter: "Greetings.", gold: 100 }),
        turn: 1,
        seed: 1,
        forgeMinCompetence: 55,
      }),
    );
    await mind.write(
      newMindContext({
        request: newMindRequest({ task: "EnvoyReport", characterId: envoy.id, court: "Egypt", cargo: newHomeCargo({ gold: 60, goldStated: 60 }) }),
        self: envoy,
        turn: 3,
        seed: 1,
        forgeMinCompetence: 55,
      }),
    );
    Assert.all(prompts(), (p) => Assert.contains(hand, p));
    Assert.equal(2, prompts().length);

    // Without gold there is nothing to keep or swap, and nothing is said of its hand.
    let [bare, barePrompts] = modelMind();
    await bare.present(
      newEnvoyContext({
        self: envoy,
        sender: "Egypt",
        host: "Hatti",
        dispatch: newDispatch({ letter: "Greetings." }),
        turn: 1,
        seed: 1,
        forgeMinCompetence: 55,
      }),
    );
    Assert.doesNotContain("fake a seal", Assert.single(barePrompts()));
  });

  test("A model spy is told of the copies that come home with its report not of one its master already held", async () => {
    let spy = envoyOf(30, 80, 70, 60);
    function reportOf(): SpyReport {
      return newSpyReport({ spyId: spy.id, court: "Assyria", observations: ["Assyria musters chariots."], observedTurn: 2, tabletIds: ["t900"] });
    }
    function ctxOf(copies: string[]): MindContext {
      return newMindContext({
        request: newMindRequest({ task: "SpyReport", characterId: spy.id, court: "Egypt", report: reportOf(), copyIds: copies }),
        self: spy,
        turn: 3,
        seed: 1,
      });
    }

    let [mind, prompts] = modelMind();
    await mind.write(ctxOf(["k5"]));
    Assert.contains(
      "You also copied a tablet from the court's archive (you remember what it says); the copy goes home with this report, whatever you write.",
      Assert.single(prompts()),
    );

    // Its master came to hold that tablet meanwhile: no copy is added, and the spy is not told that one goes home.
    let [held, heldPrompts] = modelMind();
    await held.write(ctxOf([]));
    Assert.doesNotContain("You also copied", Assert.single(heldPrompts()));
  });
});
