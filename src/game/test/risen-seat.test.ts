import { describe, test } from "vitest";
import { AllPowers, Dict, GameStateSchema, TurnEngine, hash, isAlive, risenTraits, newCharacter, newGame, newGovernor, newId, newTraits, newUnit, type GameState, type Power } from "@amarna/engine";
import { GameLog, GameRunner, ReplayMind, ReplayNarrator, ReplaySeat, ScriptMind, TemplateNarrator, type ISeat } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";
import { scriptSeats, seasons } from "./small-world.ts";

// Item 13+: a ruler risen in play rules his province with a seat of his own, and a script seat plays it. (Until item 17b
// a fallen kingdom's governor rose so; since then a realm falls only when it holds nothing, so he rises here as a revolt's
// leader does.)
describe("RisenSeatTests", () => {
  // The small world: Babylonia's governor of Nippur, with gold and an army there, rules it in his own name before the game
  // begins. Nippur's seat is nobody's at the table: the runner's script king takes it.
  function risenNippur(): GameState {
    const s = newGame(1, seasons(7, { peopleDefence: 0, catastropheChance: 0 }));
    s.units = s.units.filter((u) => u.province !== "nippur");
    const army = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "nippur", home: "nippur", men: 1000 });
    s.units.push(army);
    const c = newCharacter({ id: newId(s, "c"), name: "Ili-ippashra", traits: newTraits({ loyalty: 60, greed: 40, ambition: 70, courage: 50, competence: 50 }), status: "Employed", employer: "Babylonia", duty: "Governing", watchProvince: "nippur", purse: 3000 });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "nippur", character: c.id, power: "Babylonia", from: 0 }));
    new TurnEngine(s).ruleOwn("nippur", c, { how: "revolt", from: "Babylonia", followers: [army], gold: 0, rising: false, story: "You rose.", memory: "I rose.", line: `${c.name} rules Nippur in his own name` });
    return s;
  }

  async function played(r: GameRunner): Promise<GameRunner> {
    r.writeChronicles = false;
    await r.prepare();
    while (await r.playTurn()) {
      /* the whole game */
    }
    return r;
  }

  test("A risen governor's seat is played by a script king and replays exactly", async () => {
    const r = await played(new GameRunner(risenNippur(), scriptSeats(1, ["Mitanni"]), new ScriptMind(), new TemplateNarrator()));
    // Others may rise too since item 17: Nippur's is the one tested here.
    const risen = Assert.single(r.state.risen, (x) => x.capital === "nippur");
    Assert.equal("Nippur", risen.power);
    Assert.true(isAlive(r.state, "Nippur"));
    // Item 17b: he reigns as the person he was, his traits his own as a character.
    const ruler = Assert.single(r.state.characters, (c) => c.id === risen.ruler);
    Assert.equal(risenTraits(ruler.traits), r.state.reigns.get("Nippur").traits);
    // Its seat gave orders: their resolutions are in its own inbox.
    Assert.true(
      r.state.inbox.get("Nippur").some((i) => i.kind === "Resolution"),
      r.state.inbox.get("Nippur").map((i) => i.title).join("; "),
    );
    // And the game replays exactly from its log, the risen seat's decisions with it.
    const log = GameLog.fromJsonl(r.log.toJsonl());
    const seats = new Dict<Power, ISeat>(AllPowers.map((p) => [p, new ReplaySeat(log.header.seats.tryGet(p) ?? "?")] as const));
    const replay = await played(new GameRunner(risenNippur(), seats, new ReplayMind(log.header.minds), new ReplayNarrator(log.header.narrator), { replay: log }));
    Assert.equal(hash(GameStateSchema, r.state), hash(GameStateSchema, replay.state));
  });
});
