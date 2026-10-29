import { describe, test } from "vitest";
import { Near, smallSeats } from "./small-world.ts";
import { court } from "../src/bots/statecraft-court.ts";
import {
  AllPowers,
  type AudienceView,
  type Character,
  Dict,
  Rng,
  TurnEngine,
  type GameState,
  GameStateSchema,
  type HostReply,
  type Power,
  type SeatView,
  SeatViewSchema,
  type TurnSubmission,
  TurnSubmissionSchema,
  Views,
  WorldMap,
  alive,
  char,
  coverOf,
  deserialize,
  distinct,
  first,
  hash,
  hiddenAt,
  isAlive,
  newGame,
  newUnit,
  notify,
  serialize,
  unitAt,
} from "@amarna/engine";
import { GameRunner, type ISeat, ScriptLeader, ScriptMind, TemplateNarrator, seatSeed, temperament } from "@amarna/game";
import { situation } from "@amarna/llm";
import { removeAll, Assert, firstOrNull, toDict } from "../../engine/test/support.ts";

// <summary>Script kings know only what their seat view shows them, and hold no seed the engine rolls with.</summary>
describe("BlindnessTests", () => {
  // <summary>A seat that plays as another seat does, under another name.</summary>
  class Labelled implements ISeat {
    readonly #inner: ISeat;
    readonly #label: string;
    constructor(inner: ISeat, label: string) {
      this.#inner = inner;
      this.#label = label;
    }
    get label(): string {
      return this.#label;
    }
    decide(view: SeatView, ct: AbortSignal): Promise<TurnSubmission> {
      return this.#inner.decide(view, ct);
    }
    hostAudience(view: AudienceView, court: SeatView, ct: AbortSignal): Promise<HostReply> {
      return this.#inner.hostAudience(view, court, ct);
    }
  }

  async function played(
    seed: number,
    turns: number,
    seat: ((a0: Power, a1: ScriptLeader) => ISeat) | null = null,
  ): Promise<[GameRunner, Dict<Power, ScriptLeader>]> {
    // The small world (small-world.ts): the default few are script kings, every other power idle.
    let state = newGame(seed);
    let bots = toDict(
      Near,
      (p) => p,
      (_) => new ScriptLeader(seed),
    );
    let seats = smallSeats((p) => seat?.(p, bots.get(p)) ?? bots.get(p));
    let runner = Object.assign(new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
    for (let i = 0; i < turns && !state.ended; i++) await runner.playTurn();
    return [runner, bots];
  }

  // Posts a rival's servant (at home, on the road, or watching elsewhere; never one standing at this court) at
  // 's court as a spy that court has not caught: it watches in secret. Returns it, or null if no
  // rival has anyone to send.
  function postSpy(s: GameState, p: Power): Character | null {
    let spy = firstOrNull(
      s.characters,
      (c) =>
        c.status === "Employed" &&
        c.employer !== null &&
        c.employer !== p &&
        isAlive(s, c.employer) &&
        c.at !== p &&
        c.heldBy === null &&
        c.duty !== "Detained" &&
        c.secretMaster !== p &&
        coverOf(c, p) === null,
    );
    if (spy === null) return null;
    [spy.duty, spy.at, spy.missionTarget, spy.watchProvince, spy.currentTrail] = ["SpyPosted", p, p, null, null];
    // Whatever journey it was on is over: it is at its post.
    removeAll(s.journeys, (j) => j.characterId === spy.id && ["EnvoyOutbound", "EnvoyHomebound", "SpyOutbound", "SpyHomebound"].includes(j.kind));
    return spy;
  }

  // Changes what this king cannot see: rivals' gold, the fine gold in its own unassayed lots, troops out of its sight,
  // everyone's traits, and a rival's spy posted at its court that it has not caught.
  function hide(s: GameState, p: Power): void {
    postSpy(s, p);
    for (const q of AllPowers.filter((q) => q !== p)) {
      s.treasuries.get(q).gold += 400;
      notify(s, q, "Notice", "A secret", "Only this court knows it.");
    }
    // The ledger counts a lot at its weight: moving fine gold between the treasury and a lot leaves it unchanged.
    for (const lot of s.treasuries.get(p).lots.filter((l) => l.true >= 10)) {
      lot.true -= 10;
      s.treasuries.get(p).gold -= 10;
    }
    let sight = Views.sight(s, WorldMap.default, p);
    let rival = first(AllPowers, (q) => q !== p && isAlive(s, q));
    let n = 0;
    for (const prov of WorldMap.default.provinces.filter((x) => !x.isSea && !sight.has(x.id) && unitAt(s, x.id) === null).slice(0, 3))
      s.units.push(newUnit({ id: `u9${n++}`, power: rival, kind: "Army", province: prov.id }));
    // Everyone's traits but those of the free people standing at this court, who tell it what they ask (a price the court
    // hears, which their traits set): since Haakon's answers to item 11a the script king offers its errands to them.
    for (const c of s.characters.filter((c) => !(c.status === "Free" && c.at === p))) {
      let t = c.traits;
      [t.loyalty, t.greed, t.competence, t.ambition, t.courage] = [100 - t.loyalty, 100 - t.greed, 100 - t.competence, 100 - t.ambition, 100 - t.courage];
      t.sympathy = null;
      t.sympathyStrength = 0;
    }
  }

  test("Hidden state outside the seat view leaves a script kings orders unchanged", async () => {
    let seed = 6;
    // Two copies of the same game, so that each king has a twin with the same memory.
    let [a, seeing] = await played(seed, 5);
    let [b, blind] = await played(seed, 5);
    Assert.equal(hash(GameStateSchema, a.state), hash(GameStateSchema, b.state));

    for (const p of Near.filter((p) => isAlive(a.state, p))) {
      let hidden = deserialize<GameState>(GameStateSchema, serialize(GameStateSchema, a.state))!;
      hide(hidden, p);
      Assert.notEqual(hash(GameStateSchema, a.state), hash(GameStateSchema, hidden));
      let orders = await seeing.get(p).decide(Views.for(a.state, p));
      let unchanged = await blind.get(p).decide(Views.for(hidden, p));
      Assert.equal(serialize(TurnSubmissionSchema, orders), serialize(TurnSubmissionSchema, unchanged));
    }
  });

  test("A foreign spy at a court that has not caught it changes nothing that court is shown", async () => {
    let [a] = await played(6, 5);
    for (const p of alive(a.state)) {
      let posted = deserialize<GameState>(GameStateSchema, serialize(GameStateSchema, a.state))!;
      let spy = postSpy(posted, p);
      Assert.notNull(spy);
      Assert.true(hiddenAt(spy, p));
      // The seat view, field by field, and every text a model or human king reads of it.
      let seen = Views.for(a.state, p);
      let shown = Views.for(posted, p);
      Assert.equal(serialize(SeatViewSchema, seen), serialize(SeatViewSchema, shown));
      Assert.equal(situation(seen), situation(shown));
    }
  });

  test("A court that caught a spy has on record only the master it confessed to", () => {
    // Built directly since item 7a: the seed search this test used (script games until a caught spy kept silent) found none
    // in 80 games once the map changed which games have one. A spy with courage confesses only on a roll of 0.4.
    for (const brave of [false, true]) {
      const s = newGame(1);
      const spy = first(s.characters, (c) => c.employer === "Egypt");
      spy.traits.courage = brave ? 100 : 0;
      spy.duty = "SpyPosted";
      spy.missionTarget = "Hatti";
      spy.at = "Hatti";
      let i = 0;
      while (Rng.for(1, 1, "capture-test", String(i)).chance(0.4)) i++;
      new TurnEngine(s).capture(spy, "Hatti", Rng.for(1, 1, "capture-test", String(i)));
      const line = Assert.single(s.events, (e) => e.kind === "spy-caught" && e.visibleTo.includes("Hatti") && e.text.includes(spy.name)).text;
      Assert.equal(brave ? `Hatti caught ${spy.name}, a spy who will not say whom they serve.` : `Hatti caught ${spy.name}, a spy of Egypt.`, line);
      // The truth is on a line nobody sees, only when the captor's record does not hold it.
      const hidden = s.events.filter((e) => e.kind === "spy-caught" && e.visibleTo.length === 0 && e.text.startsWith(`Hatti caught ${spy.name}, a spy of `));
      Assert.equal(brave ? 1 : 0, hidden.length);
      Assert.equal(brave ? null : "Egypt", Assert.single(s.losses, (l) => l.kind === "Captured").master);
    }
  });

  test("Seat labels change nothing a script king does", async () => {
    let [a] = await played(4, 5);
    let [b] = await played(4, 5, (p, bot) => (["Mitanni", "Assyria"].includes(p) ? new Labelled(bot, "Claude Opus 5.5 leader") : bot));
    Assert.notEqual(a.log.header.seats.get("Mitanni"), b.log.header.seats.get("Mitanni"));
    Assert.equal(hash(GameStateSchema, a.state), hash(GameStateSchema, b.state));
  });

  test("No script seat holds the seed the engine rolls with", async () => {
    for (let seed = 1; seed <= 20; seed++) {
      let seats = AllPowers.map((p) => seatSeed(seed, p));
      Assert.doesNotContain(seed, seats);
      Assert.equal(seats.length, distinct(seats).length);
    }

    let game = 13;
    let state = newGame(game);
    let bot = new ScriptLeader(game);
    for (const p of AllPowers) await bot.decide(Views.for(state, p));

    // Nothing the bot keeps is the game's seed.
    for (const value of Object.values(bot)) {
      if (typeof value === "number") Assert.notEqual(game, value);
      if (value instanceof Dict) for (const x of value.values()) if (typeof x === "number") Assert.notEqual(game, x);
    }
    for (const p of AllPowers) {
      let brain = bot.brainOf(p)!;
      Assert.equal(seatSeed(game, p), brain.seed);
      // The god view shows the temperament the seat plays with.
      Assert.equal(temperament(p, game), brain.p);
      // Rivals it pictures roll from its own seat's stream.
      Assert.notEmpty(brain.models);
      Assert.all([...brain.models.values()], (m) => Assert.equal(brain.seed, m.seed));
    }
  });
});
