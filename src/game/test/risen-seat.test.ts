import { describe, test } from "vitest";
import { AllPowers, Dict, EconomyData, GameStateSchema, hash, isAlive, newCharacter, newGame, newGovernor, newId, newSiege, newTraits, newUnit, wallsOf, type GameState, type Power } from "@amarna/engine";
import { GameLog, GameRunner, ReplayMind, ReplayNarrator, ReplaySeat, ScriptMind, TemplateNarrator, type ISeat } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";
import { scriptSeats, seasons } from "./small-world.ts";

// Item 13+: a fallen kingdom's governor rules his province with a seat of his own, and a script seat plays it.
describe("RisenSeatTests", () => {
  // The small world: Assyria's army one season from Babylon's surrender, the seats of both idle so that it falls;
  // Babylonia's governor of Nippur, with gold and an army there. Nippur's seat is nobody's at the table: the runner's
  // script king takes it.
  function fallingBabylon(): GameState {
    const s = newGame(1, seasons(7, { peopleDefence: 0, catastropheChance: 0 }));
    s.units = s.units.filter((u) => u.province !== "babylon" && u.province !== "nippur");
    const army = newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "babylon", men: 3000 });
    s.units.push(army);
    s.sieges.push(newSiege({ province: "babylon", power: "Assyria", unitId: army.id, progress: wallsOf(s, "babylon") * EconomyData.breachPerLevel - 1, since: 1 }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "nippur", home: "nippur", men: 1000 }));
    const c = newCharacter({ id: newId(s, "c"), name: "Ili-ippashra", traits: newTraits({ loyalty: 60, greed: 40, ambition: 70, courage: 50, competence: 50 }), status: "Employed", employer: "Babylonia", duty: "Governing", watchProvince: "nippur", purse: 3000 });
    s.characters.push(c);
    s.governors.push(newGovernor({ province: "nippur", character: c.id, power: "Babylonia", from: 0 }));
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
    const r = await played(new GameRunner(fallingBabylon(), scriptSeats(1, ["Mitanni"]), new ScriptMind(), new TemplateNarrator()));
    const risen = Assert.single(r.state.risen);
    Assert.equal("Nippur", risen.power);
    Assert.true(isAlive(r.state, "Nippur"));
    // Its seat gave orders: their resolutions are in its own inbox.
    Assert.true(
      r.state.inbox.get("Nippur").some((i) => i.kind === "Resolution"),
      r.state.inbox.get("Nippur").map((i) => i.title).join("; "),
    );
    // And the game replays exactly from its log, the risen seat's decisions with it.
    const log = GameLog.fromJsonl(r.log.toJsonl());
    const seats = new Dict<Power, ISeat>(AllPowers.map((p) => [p, new ReplaySeat(log.header.seats.tryGet(p) ?? "?")] as const));
    const replay = await played(new GameRunner(fallingBabylon(), seats, new ReplayMind(log.header.minds), new ReplayNarrator(log.header.narrator), { replay: log }));
    Assert.equal(hash(GameStateSchema, r.state), hash(GameStateSchema, replay.state));
  });
});
