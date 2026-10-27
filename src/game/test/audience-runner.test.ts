import { describe, test } from "vitest";
import { react } from "../../llm/src/parse.ts";
import { present } from "../src/character-checks.ts";
import {
  AllPowers,
  type AudienceView,
  type EnvoyReaction,
  type HostReply,
  type MindReply,
  type SeatView,
  type TurnSubmission,
  dispatch,
  first,
  newEnvoyReaction,
  newGame,
  newGameConfig,
  newHostReply,
  newTurnSubmission,
  single,
  write,
} from "@amarna/engine";
import {
  type EnvoyContext,
  GameRunner,
  type ICharacterMind,
  type ISeat,
  type MindContext,
  type PresentResult,
  ScriptMind,
  TemplateNarrator,
  newPresentResult,
} from "@amarna/game";
import { Assert, toDict } from "../../engine/test/support.ts";

// <summary>An audience played through the game runner: the second exchange shows the host what it named and gave in the first.</summary>
describe("AudienceRunnerTests", () => {
  // <summary>Sends one envoy to Alashiya in the first season, then does nothing.</summary>
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
        view.turn === 1 ? newTurnSubmission({ orders: [dispatch(this.#envoyId, "Alashiya", "Greetings, brother.")] }) : newTurnSubmission(),
      );
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return Promise.resolve(newHostReply({ end: true }));
    }
  }

  // <summary>Names gold to send back and offers a gift in the first exchange, ends the audience in the second, and keeps every view it is shown.</summary>
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
      return Promise.resolve(
        view.round === 1
          ? newHostReply({ speech: "Take this home to your lord.", goldBack: 30, bribe: 20 })
          : newHostReply({ speech: "Go in peace.", end: true }),
      );
    }
  }

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

  // <summary>Does nothing, every season.</summary>
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

  test("The second exchange carries the gold and the gift named in the first", async () => {
    let state = newGame(5, newGameConfig({ catastropheChance: 0, minTurns: 40 }));
    let envoy = first(state.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let host = new Host();
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? new Sender(envoy.id) : p === "Alashiya" ? host : new Idle()),
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
