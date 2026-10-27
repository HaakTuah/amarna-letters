import { describe, test } from "vitest";
import { react } from "../../llm/src/parse.ts";
import { court } from "../src/bots/statecraft-court.ts";
import { host } from "../src/bots/statecraft-letters.ts";
import { present } from "../src/character-checks.ts";
import {
  AllPowers,
  type AudienceView,
  Dict,
  type EnvoyReaction,
  GameEventSchema,
  type GameState,
  GameStateSchema,
  type HostReply,
  IdKinds,
  type MindReply,
  type SeatView,
  StandingOrderPrefix,
  type TurnSubmission,
  deserialize,
  distinct,
  idNumber,
  list,
  newGame,
  newId,
  serialize,
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
  ScriptLeader,
  ScriptMind,
  TemplateNarrator,
} from "@amarna/game";
import { Assert, toDict } from "../../engine/test/support.ts";

// Each kind of object counts its ids on its own (Build order item 4, fix (d)), so a kind of object added later, or more
// objects of one kind, leaves the ids of every other kind, and with them every roll keyed by an id, where they were.
describe("IdCounterTests", () => {
  const DummyPrefix = "dummy";

  // A kind of object no rule knows, issued during play: at every call to a seat or to a character's mind, which come
  // between the engine's own steps in a season (arrivals, audiences, resolution). Nothing reads the ids.
  class Dummy {
    readonly #state: GameState;
    constructor(state: GameState) {
      this.#state = state;
    }
    issue(): void {
      for (let i = 0; i < 3; i++) newId(this.#state, DummyPrefix);
    }
  }

  class DummySeat implements ISeat {
    readonly #inner: ISeat;
    readonly #dummy: Dummy;
    constructor(inner: ISeat, dummy: Dummy) {
      this.#inner = inner;
      this.#dummy = dummy;
    }
    get label(): string {
      return this.#inner.label;
    }
    get canSleep(): boolean | undefined {
      return this.#inner.canSleep;
    }
    decide(view: SeatView, signal?: AbortSignal): Promise<TurnSubmission> {
      this.#dummy.issue();
      return this.#inner.decide(view, signal);
    }
    hostAudience(view: AudienceView, court: SeatView, signal?: AbortSignal): Promise<HostReply> {
      this.#dummy.issue();
      return this.#inner.hostAudience(view, court, signal);
    }
  }

  class DummyMind implements ICharacterMind {
    readonly #inner: ICharacterMind;
    readonly #dummy: Dummy;
    constructor(inner: ICharacterMind, dummy: Dummy) {
      this.#inner = inner;
      this.#dummy = dummy;
    }
    get label(): string {
      return this.#inner.label;
    }
    present(ctx: EnvoyContext, signal?: AbortSignal): Promise<PresentResult> {
      this.#dummy.issue();
      return this.#inner.present(ctx, signal);
    }
    react(ctx: EnvoyContext, host: HostReply, signal?: AbortSignal): Promise<EnvoyReaction> {
      this.#dummy.issue();
      return this.#inner.react(ctx, host, signal);
    }
    write(ctx: MindContext, signal?: AbortSignal): Promise<MindReply> {
      this.#dummy.issue();
      return this.#inner.write(ctx, signal);
    }
  }

  // A whole script game, with or without the dummy kind.
  async function played(seed: number, withDummy: boolean): Promise<GameRunner> {
    let state = newGame(seed);
    let dummy = new Dummy(state);
    let bot = new ScriptLeader(seed);
    let seats = toDict(
      AllPowers,
      (p) => p,
      (_) => (withDummy ? new DummySeat(bot, dummy) : (bot as ISeat)),
    );
    let minds: ICharacterMind = withDummy ? new DummyMind(new ScriptMind(), dummy) : new ScriptMind();
    let r = Object.assign(new GameRunner(state, seats, minds, new TemplateNarrator()), { writeChronicles: false });
    await r.prepare();
    while (await r.playTurn()) {}
    return r;
  }

  // The whole state, without the dummy kind's counter, its counters in a fixed order.
  function canonical(s: GameState): string {
    let copy = deserialize<GameState>(GameStateSchema, serialize(GameStateSchema, s));
    copy.idCounters = new Dict([...copy.idCounters.entries()].filter(([k]) => k !== DummyPrefix).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    return serialize(GameStateSchema, copy);
  }

  test.each([1, 2, 3] as const)("A new kind of object made during play leaves the game unchanged %s", async (seed) => {
    let plain = await played(seed, false);
    let dummy = await played(seed, true);

    // The dummy kind was really issued, many times in every season.
    Assert.false(plain.state.idCounters.has(DummyPrefix));
    Assert.true(dummy.state.idCounters.get(DummyPrefix) > 10 * dummy.state.turn, `only ${dummy.state.idCounters.get(DummyPrefix)} dummy ids`);

    // The same log of every order, audience and decision, the same outcomes, winner and length, and the same world.
    Assert.equal(plain.log.toJsonl(), dummy.log.toJsonl());
    Assert.equal(serialize(list(GameEventSchema), plain.state.events), serialize(list(GameEventSchema), dummy.state.events));
    Assert.equal(plain.state.winners, dummy.state.winners);
    Assert.equal(plain.state.turn, dummy.state.turn);
    Assert.equal(canonical(plain.state), canonical(dummy.state));
  });

  test("Every kind has a prefix of its own", () => {
    // Letters only, so an id reads back as one prefix and one number, and ids of different kinds never meet.
    let keys = [...IdKinds.keys()];
    Assert.all(keys, (p) => Assert.matches("^[a-z]+$", p));
    Assert.equal(keys.length, distinct(keys).length);
    Assert.doesNotContain(StandingOrderPrefix, keys);
    Assert.doesNotContain(DummyPrefix, keys);
  });

  test.each([1, 5] as const)("Every id issued in play has its kinds prefix is unique and counts up in the order made %s", async (seed) => {
    let s = (await played(seed, false)).state;
    let kinds: { prefix: string; ids: string[] }[] = [
      { prefix: "a", ids: s.audiences.map((x) => x.id) },
      { prefix: "c", ids: s.characters.map((x) => x.id) },
      { prefix: "f", ids: s.characters.flatMap((c) => c.facts).map((x) => x.id) },
      { prefix: "g", ids: AllPowers.flatMap((p) => s.treasuries.get(p).lots).map((x) => x.id) },
      { prefix: "j", ids: s.journeys.map((x) => x.id) },
      { prefix: "k", ids: s.copies.map((x) => x.id) },
      { prefix: "m", ids: s.trails.map((x) => x.id) },
      { prefix: "q", ids: s.tasks.map((x) => x.id) },
      { prefix: "t", ids: s.tablets.map((x) => x.id) },
      { prefix: "u", ids: s.units.map((x) => x.id) },
      { prefix: "x", ids: s.catastrophes.map((x) => x.id) },
    ];
    // Requests to characters' minds ("r") last one season and are not kept in the state; every other kind is checked here.
    Assert.equal([...IdKinds.keys()].sort(), [...kinds.map((k) => k.prefix), "r"].sort());
    Assert.all([...s.idCounters.keys()], (k) => Assert.contains(k, [...IdKinds.keys()]));

    for (const { prefix, ids } of kinds)
      Assert.all(ids, (id) => {
        Assert.matches(`^${prefix}[1-9][0-9]*$`, id);
        Assert.inRange(idNumber(id), 1, s.idCounters.get(prefix));
      });
    let all = kinds.flatMap((k) => k.ids);
    Assert.equal(all.length, distinct(all).length);

    // Within a kind, a higher number was made later: the archives' "newest first" and the trail panel rely on it.
    for (const made of ["c", "k", "m", "t"].map((p) => single(kinds, (k) => k.prefix === p).ids))
      Assert.equal(
        made.map(idNumber).sort((a, b) => a - b),
        made.map(idNumber),
      );
    Assert.true(s.copies.length > 0 && s.tablets.length > 0 && s.trails.length > 0, "the game made tablets, copies and trails");
  });

  test("The counters are saved with the state and carry on where they stopped", async () => {
    let r = Object.assign(
      new GameRunner(
        newGame(4),
        toDict(
          AllPowers,
          (p) => p,
          (_) => new ScriptLeader(4) as ISeat,
        ),
        new ScriptMind(),
        new TemplateNarrator(),
      ),
      { writeChronicles: false },
    );
    await r.prepare();
    for (let i = 0; i < 3; i++) await r.playTurn();
    let saved = r.stateAt(3)!;
    Assert.equal(r.state.idCounters, saved.idCounters);
    Assert.equal(newId(r.state, "t"), newId(saved, "t"));
  });
});
