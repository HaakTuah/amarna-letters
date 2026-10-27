import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { Search } from "../src/bots/search.ts";
import { Tactics } from "../src/bots/tactics.ts";
import {
  AllPowers,
  Dict,
  type MoveOrder,
  type SupportOrder,
  TurnEngine,
  Views,
  count,
  newGame,
  newGameConfig,
  newTurnSubmission,
  newUnit,
  single,
  support,
} from "@amarna/engine";
import { GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, playGame } from "@amarna/game";
import { at, removeAll, Assert, toDict } from "../../engine/test/support.ts";
import { move as moveOrder } from "@amarna/engine";

// Script kings and terrain (Build order item 5; "Every feature is every seat's"): they count the ground's help to a troop
// that stands its ground when they attack or defend, picture a troop that stood against them standing again, weigh the
// desert's cost, and in play both hold by the ground and beat it.
describe("TerrainBotTests", () => {
  test("A board reckons the ground and the desert as the rules do", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    let hatti = new Board(Views.for(s, "Hatti"));
    Assert.equal(1, hatti.ground("tuwanuwa", "mira"));
    Assert.equal(1, hatti.ground("tuwanuwa", "kizzuwatna"));
    Assert.equal(0, hatti.ground("lukka", "kizzuwatna"));
    // A landing from the sea gets no help from the ground since item 7a: the blockade decides at sea.
    Assert.equal(0, hatti.ground("byblos", "delta"));
    // Against a blow from several sides, a crossing helps only if every side crosses one; rough ground helps against any.
    Assert.equal(0, hatti.groundFrom(["tuwanuwa", "lukka"], "kizzuwatna"));
    Assert.equal(1, hatti.groundFrom(["tuwanuwa", "nesa"], "kizzuwatna"));
    Assert.equal(1, hatti.groundFrom(["apasa", "seha"], "mira"));
    // The Sinai costs Hatti's armies supplies; Egypt, who holds it, crosses it freely.
    Assert.equal(30, hatti.desertCost("sinai"));
    Assert.equal(0, new Board(Views.for(s, "Egypt")).desertCost("sinai"));

    let off = newGame(1, newGameConfig({ catastropheChance: 0, terrainDefence: 0, desertUpkeep: 0 }));
    let flat = new Board(Views.for(off, "Hatti"));
    Assert.equal(0, flat.ground("tuwanuwa", "mira"));
    Assert.equal(0, flat.desertCost("sinai"));
  });

  test("A script king brings a support more against a troop on rough ground", () => {
    // Egypt's army holds Mira, with no troop of Egypt's near; Hatti, at war with Egypt and at peace with Arzawa, has three
    // armies round it (Tuwanuwa, Lukka and the Seha River Land).
    function supports(terrain: number): number {
      let s = newGame(4, newGameConfig({ catastropheChance: 0, terrainDefence: terrain }));
      removeAll(s.units, (u) => u.power === "Arzawa" && u.province !== "apasa");
      s.owner.set("mira", "Egypt");
      s.units.push(newUnit({ id: "u90", power: "Egypt", kind: "Army", province: "mira" }));
      for (const [id, at] of [
        ["u91", "tuwanuwa"],
        ["u92", "lukka"],
        ["u93", "seha"],
      ]) {
        s.owner.set(at, "Hatti");
        s.units.push(newUnit({ id: id, power: "Hatti", kind: "Army", province: at }));
      }
      removeAll(s.units, (u) => u.power === "Hatti" && u.province === "hattusa");
      let view = Views.for(s, "Hatti");
      let brain = new Brain("Hatti", 4);
      brain.learn(view, new Board(view));
      brain.warTarget = "Egypt";
      brain.rel.get("Egypt").grudge = 6;
      brain.rel.get("Egypt").trust = -0.8;
      brain.rel.get("Arzawa").treaty = true;
      brain.rel.get("Arzawa").trust = 0.6;
      let plan = Tactics.make(new Board(view, brain.remembered(view)), brain);
      let move = Assert.single(
        [...plan.orders.values()].filter((o): o is MoveOrder => o.type === "move"),
        (m) => m.to === "mira",
      );
      return count(
        [...plan.orders.values()].filter((o): o is SupportOrder => o.type === "support"),
        (x) => x.supported === move.unit && x.to === "mira",
      );
    }
    // 1 + 1 for the rough ground: three to dislodge it. Without terrain, two.
    Assert.equal(2, supports(1));
    Assert.equal(1, supports(0));
  });

  test("A troop that stood its ground against us last season is pictured standing again", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    single(s.units, (u) => u.province === "hattusa").province = "tuwanuwa";
    single(s.units, (u) => u.province === "nesa").province = "lukka";
    s.walls.delete("lukka");
    s.owner.set("lukka", "Hatti");
    let e = new TurnEngine(s);
    e.resolve(new Dict([["Hatti", newTurnSubmission({ orders: [moveOrder("tuwanuwa", "mira"), support("lukka", "tuwanuwa", "mira")] })]]));
    e.beginTurn();
    Assert.equal(["mira"], [...Search.stoodAgainstUs(new Board(Views.for(s, "Hatti")))]);
    // Arzawa, whose army stood, has nothing of the kind.
    Assert.empty(Search.stoodAgainstUs(new Board(Views.for(s, "Arzawa"))));
  });

  test("Script kings hold by the ground and beat it in play and the games replay exactly", async () => {
    let held = 0;
    let beaten = 0;
    // Seeds from 1 until both have been seen (at most 40): a blow that beats the ground is rare, and which games hold one
    // changes with every change to the script kings (until the script players' audit of the siege package this played
    // seeds 15 to 18).
    for (let seed = 1; seed <= 40 && (held === 0 || beaten === 0); seed++) {
      let summary = (
        await playGame(
          seed,
          (st) =>
            Object.assign(
              new GameRunner(
                st,
                toDict(
                  AllPowers,
                  (p) => p,
                  (_) => new ScriptLeader(st.seed),
                ),
                new ScriptMind(),
                new TemplateNarrator(),
              ),
              { writeChronicles: false },
            ),
          true,
          newGameConfig({ capMin: 20, capMax: 20, endMedian: 10000 }),
        )
      )[0];
      Assert.true(summary.replayMatches, `seed ${seed}`);
      held += summary.signals["terrain-held"] ?? 0;
      beaten += summary.signals["terrain-beaten"] ?? 0;
    }
    Assert.true(held > 0, "no troop of a script king held by the ground");
    Assert.true(beaten > 0, "no script king beat a troop the ground helped");
  });
});
