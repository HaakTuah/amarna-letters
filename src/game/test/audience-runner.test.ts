import { describe, test } from "vitest";
import {
  AllPowers,
  type EnvoyReaction,
  type HostReply,
  type MindReply,
  first,
  newEnvoyReaction,
  newGame,
  newGameConfig,
  newHostReply,
  single,
} from "@amarna/engine";
import {
  type EnvoyContext,
  GameRunner,
  type ICharacterMind,
  type MindContext,
  type PresentResult,
  ScriptMind,
  TemplateNarrator,
  newPresentResult,
} from "@amarna/game";
import { Assert, toDict } from "../../engine/test/support.ts";
import { Host, Idle, Sender } from "./audience-support.ts";

// <summary>An audience played through the game runner: the second exchange shows the host what it named and gave in the first.</summary>
describe("AudienceRunnerTests", () => {
  // <summary>An envoy who takes every gift and never changes masters; reports are written by the script characters.</summary>
  class Pliant implements ICharacterMind {
    _script: ScriptMind = new ScriptMind();
    get label(): string {
      return "Pliant";
    }
    present(ctx: EnvoyContext, ct: AbortSignal): Promise<PresentResult> {
      return Promise.resolve(newPresentResult({ speech: "My lord greets you." }));
    }
    react(ctx: EnvoyContext, host: HostReply, ct: AbortSignal): Promise<EnvoyReaction> {
      return Promise.resolve(newEnvoyReaction({ speech: "I thank you.", acceptBribe: true }));
    }
    write(ctx: MindContext, ct: AbortSignal): Promise<MindReply> {
      return this._script.write(ctx, ct);
    }
  }

  test("The second exchange carries the gold and the gift named in the first", async () => {
    let state = newGame(5, newGameConfig({ catastropheChance: 0, endMedian: 10000 }));
    let envoy = first(state.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let host = new Host((view) =>
      view.round === 1
        ? newHostReply({ speech: "Take this home to your lord.", goldBack: 30, bribe: 20 })
        : newHostReply({ speech: "Go in peace.", end: true }),
    );
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? new Sender(envoy.id, "Alashiya") : p === "Alashiya" ? host : new Idle()),
    );
    let runner = Object.assign(new GameRunner(state, seats, new Pliant(), new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    for (let i = 0; i < 6 && host.views.length < 2; i++) await runner.playTurn();

    Assert.equal(
      [1, 2],
      host.views.map((v) => v.round),
    );
    Assert.equal([0, 0], [host.views[0].goldBackNamed, host.views[0].giftAccepted]);
    Assert.equal([30, 20], [host.views[1].goldBackNamed, host.views[1].giftAccepted]);
    // And the engine did what the view said: the gift taken once, and the gold named in the first exchange sent.
    let outcomes = single(state.trails, (t) => t.envoyId === envoy.id).outcomes;
    Assert.contains("accepted 20 shekels from Alashiya", outcomes);
    Assert.contains("Alashiya sent back 30 shekels", outcomes);
  });
});
