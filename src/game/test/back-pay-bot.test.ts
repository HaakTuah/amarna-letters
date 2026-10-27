import { describe, test } from "vitest";
import { react } from "../../llm/src/parse.ts";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { host } from "../src/bots/statecraft-letters.ts";
import { Statecraft } from "../src/bots/statecraft.ts";
import { MilitaryPlan } from "../src/bots/tactics.ts";
import { present } from "../src/character-checks.ts";
import {
  AllPowers,
  type AudienceView,
  type Character,
  type EnvoyReaction,
  type GameState,
  type HostReply,
  type MindReply,
  type Order,
  type Power,
  Rng,
  type SeatView,
  StartGold,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  dispatch,
  first,
  newCharacter,
  newContract,
  newDispatch,
  newGame,
  newGameConfig,
  newHostReply,
  newTraits,
  newTurnSubmission,
  ownedBy,
  strength,
  strengthOf,
  sum,
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
  newEnvoyContext,
} from "@amarna/game";
import { offerLine, selfText } from "@amarna/llm";
import { Assert, toDict } from "../../engine/test/support.ts";

// Back pay as kings and characters weigh it: script kings reckon strength by the game's own function and count back pay
// owed as gold already spent; characters set what their lord owes them against an offer of service.
describe("BackPayBotTests", () => {
  // <summary>Egypt owes one of its envoys, away on a mission, 45 shekels of back pay.</summary>
  function owingOf(): [GameState, Character] {
    let s = newGame(3);
    let c = first(s.characters, (x) => x.employer === "Egypt");
    c.secretMaster = null;
    [c.duty, c.at, c.missionTarget] = ["EnvoyOutbound", null, "Hatti"];
    c.backPay.set("Egypt", 45);
    return [s, c];
  }

  function land(s: GameState, p: Power): number {
    return sum(ownedBy(s, p), (id) => WorldMap.default.get(id).yield);
  }

  test("Engine seat view and script king reckon strength by the same function", () => {
    let [s] = owingOf();
    let e = new TurnEngine(s);
    // The score: true gold, less the back pay really owed.
    Assert.equal(strength(s.config, land(s, "Egypt"), s.treasuries.get("Egypt").gold, 45), e.strength("Egypt"));

    // The seat's own line: its ledger, less the back pay it believes it owes.
    let view = Views.for(s, "Egypt");
    Assert.equal(45, view.backPay);
    Assert.equal(strength(s.config, land(s, "Egypt"), view.gold, 45), view.strength);

    // The script king: its own as its view shows it, a rival's from public land and its own estimate of his gold,
    // with no back pay, which nobody can see.
    let brain = new Brain("Egypt", 3);
    brain.learn(view, new Board(view));
    let board = new Board(view, brain.remembered(view), brain.treasury);
    Assert.equal(view.strength, board.strength("Egypt"));
    Assert.equal(view.strength / view.startStrength, board.growth("Egypt"), 9);
    Assert.equal(strengthOf(10, land(s, "Hatti"), Math.max(0, brain.treasury.get("Hatti")), 0), board.strength("Hatti"));
    Assert.equal(
      strengthOf(
        10,
        sum(WorldMap.default.homeOf("Hatti"), (x) => x.yield),
        StartGold.get("Hatti")!,
        0,
      ),
      board.startStrength("Hatti"),
    );
    // At the start, a rival's reckoning is the engine's own.
    Assert.equal(s.startStrength.get("Hatti"), board.startStrength("Hatti"));
  });

  test("A script king counts back pay owed as gold already spent", () => {
    let s = newGame(3);
    let bought = false;
    for (const p of AllPowers) {
      let view = Views.for(s, p);
      function treasuryOf(backPay: number): { spare: number; orders: Order[] } {
        view.backPay = backPay;
        let brain = new Brain(p, 3);
        brain.learn(view, new Board(view));
        let board = new Board(view, brain.remembered(view), brain.treasury);
        let orders: Order[] = [];
        Statecraft.economy(board, brain, new MilitaryPlan(), orders, Rng.for(3, 1, "test", p.toString()));
        return { spare: brain.spareGold, orders };
      }
      let clear = treasuryOf(0);
      // Owing its whole treasury, a king has nothing to spend: no city, no levy.
      let owing = treasuryOf(view.gold);
      Assert.doesNotContain(owing.orders, (o) => o.type === "buy" || o.type === "raise");
      bought ||= clear.orders.some((o) => o.type === "buy");
      // With nothing bought either way, what is spare differs by exactly what is owed.
      if (clear.orders.length === 0) Assert.equal(clear.spare - view.gold, owing.spare, 6);
    }
    Assert.true(bought, "some king should buy a city when it owes nothing");
  });

  function envoyOf(loyalty: number, ambition: number, fondOf: Power | null = null): Character {
    return newCharacter({
      id: "c1",
      name: "Keliya",
      origin: "Mitanni",
      calling: "scribe",
      status: "Employed",
      employer: "Egypt",
      contract: newContract({ wage: 12, startTurn: 1, untilTurn: 10 }),
      traits: newTraits({
        loyalty: loyalty,
        greed: 30,
        competence: 60,
        ambition: ambition,
        courage: 60,
        sympathy: fondOf,
        sympathyStrength: fondOf === null ? 0 : 70,
      }),
    });
  }

  async function takes(envoy: Character, offer: number, backPay: number = 0, doomed: boolean = false): Promise<boolean> {
    let ctx = newEnvoyContext({
      self: envoy,
      sender: "Egypt",
      host: "Hatti",
      dispatch: newDispatch(),
      turn: 1,
      seed: 1,
      round: 1,
      backPay: backPay,
      employerDoomed: doomed,
    });
    return (await new ScriptMind().react(ctx, newHostReply({ jobOffer: offer }))).acceptJob;
  }

  test("A script envoy owed back pay wants an offer that makes it up unless its lord looks doomed", async () => {
    // Tempted by half again its wage of 12; owed 60, it wants 60 / 6 = 10 more a season over the new contract.
    let tempted = envoyOf(40, 60);
    Assert.true(await takes(tempted, 18));
    Assert.false(await takes(tempted, 27, 60));
    Assert.true(await takes(tempted, 28, 60));
    Assert.true(await takes(tempted, 18, 60, true));

    // Drawn to the host's court for its own wage; owed 60, for 10 more.
    let drawn = envoyOf(80, 30, "Hatti");
    Assert.true(await takes(drawn, 12));
    Assert.false(await takes(drawn, 21, 60));
    Assert.true(await takes(drawn, 22, 60));
    Assert.true(await takes(drawn, 12, 60, true));
  });

  test("A court looks doomed once it has lost its capital or most of its homeland", () => {
    let s = newGame(3);
    Assert.all(AllPowers, (p) => Assert.false(Views.looksDoomed(s.owner, s.eliminated, p)));
    let map = WorldMap.default;
    let owner = s.owner.clone();
    owner.set(map.capital("Egypt").id, "Hatti");
    Assert.true(Views.looksDoomed(owner, [], "Egypt"));

    // Half its homeland still holds: not yet; fewer than half: doomed.
    let home = map.homeOf("Babylonia").filter((x) => !x.capital);
    let all = home.length + 1;
    Assert.true(home.length > all / 2);
    owner = s.owner.clone();
    for (const x of home.slice(0, all / 2)) owner.set(x.id, "Assyria");
    Assert.false(Views.looksDoomed(owner, [], "Babylonia"));
    for (const x of home.slice(0, all / 2 + 1)) owner.set(x.id, "Assyria");
    Assert.true(Views.looksDoomed(owner, [], "Babylonia"));
    Assert.true(Views.looksDoomed(s.owner, ["Mitanni"], "Mitanni"));
  });

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

  // <summary>Script characters that keep every context they are given, with what the envoy was owed then.</summary>
  class Watching implements ICharacterMind {
    _script: ScriptMind = new ScriptMind();
    seen: [number, boolean, number][] = [];
    get label(): string {
      return "Watching";
    }
    present(ctx: EnvoyContext, ct: AbortSignal): Promise<PresentResult> {
      this.seen.push([ctx.backPay, ctx.employerDoomed, ctx.self.backPay.getOrDefault("Egypt", 0)]);
      return this._script.present(ctx, ct);
    }
    react(ctx: EnvoyContext, host: HostReply, ct: AbortSignal): Promise<EnvoyReaction> {
      return this._script.react(ctx, host, ct);
    }
    write(ctx: MindContext, ct: AbortSignal): Promise<MindReply> {
      return this._script.write(ctx, ct);
    }
  }

  test("The runner tells an envoy what its lord owes it", async () => {
    let state = newGame(5, newGameConfig({ catastropheChance: 0, endMedian: 10000 }));
    let envoy = first(state.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let seats = toDict(
      AllPowers,
      (p) => p,
      (p) => (p === "Egypt" ? new Sender(envoy.id) : new Idle()),
    );
    let mind = new Watching();
    let runner = Object.assign(new GameRunner(state, seats, mind, new TemplateNarrator()), { writeChronicles: false });
    await runner.prepare();
    for (let i = 0; i < 6 && mind.seen.length === 0; i++) await runner.playTurn();

    let [backPay, doomed, owed] = Assert.single(mind.seen);
    Assert.true(backPay > 0);
    Assert.equal(owed, backPay);
    Assert.false(doomed);
  });

  test("A model character reads the back pay its lord owes it", () => {
    let [, c] = owingOf();
    Assert.contains("Your lord owes you 45 shekels of back pay, paid when you return to his court.", selfText(c, 2));
    let ctx = newEnvoyContext({ self: c, sender: "Egypt", host: "Hatti", dispatch: newDispatch(), turn: 2, seed: 1, backPay: 45 });
    Assert.contains("and owes you 45 shekels of back pay, which you would never be paid if you left his service", offerLine(ctx, 30));

    // Owed nothing, it reads nothing of it.
    c.backPay.clear();
    Assert.doesNotContain("back pay", selfText(c, 2));
    Assert.doesNotContain("back pay", offerLine(newEnvoyContext({ self: c, sender: "Egypt", host: "Hatti", dispatch: newDispatch(), turn: 2, seed: 1 }), 30));
  });
});
