import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { archetype } from "../src/bots/personality.ts";
import { Search } from "../src/bots/search.ts";
import { Statecraft } from "../src/bots/statecraft.ts";
import { Tactics } from "../src/bots/tactics.ts";
import {
  AllPowers,
  StartClaims,
  type GameState,
  type MoveOrder,
  type Power,
  Rng,
  TurnSubmissionSchema,
  Views,
  WorldMap,
  publicWorthOf,
  TurnEngine,
  distinct,
  fmt,
  newAudienceView,
  newGame,
  newId,
  newTablet,
  newTabletCopy,
  newTabletView,
  newUnit,
  range,
  roundTo,
  serialize,
  single,
  support,
} from "@amarna/engine";
import { BaselineLeader, GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, playGame, temperament } from "@amarna/game";
import { average, removeAll, Assert, toDict, oldWorld, unruled } from "../../engine/test/support.ts";

/** A province's holder set by hand, as if long ago, so word of it has reached every court (item 7b). */
function known(s: GameState, province: string, owner: Power | null): void {
  s.owner.set(province, owner);
  s.ownerLog.push({ province, turn: 0, owner });
}

describe("BotTests", () => {
  test("Each king keeps his character from game to game but never quite the same", () => {
    for (const p of AllPowers) {
      let a = archetype(p);
      let games = range(1, 20).map((s) => temperament(p, s));
      Assert.all(games, (t) => {
        Assert.equal(a.epithet, t.epithet);
        Assert.inRange(t.aggression, a.aggression - 0.151, a.aggression + 0.151);
        Assert.inRange(t.honesty, a.honesty - 0.151, a.honesty + 0.151);
        Assert.inRange(t.commerce, a.commerce - 0.151, a.commerce + 0.151);
      });
      Assert.true(distinct(games.map((t) => roundTo(t.aggression, 3))).length > 5, `${p} should vary between games`);
      Assert.equal(games[3], temperament(p, 4));
    }
    // The archetypes are far enough apart to stay recognisable whatever the seed.
    for (let s = 1; s <= 20; s++) {
      Assert.true(temperament("Hatti", s).aggression > temperament("Alashiya", s).aggression);
      Assert.true(temperament("Alashiya", s).commerce > temperament("Hatti", s).commerce);
      Assert.true(temperament("Mitanni", s).honesty > temperament("Assyria", s).honesty);
    }
  });

  test("The same view gets the same orders", async () => {
    let state = newGame(21);
    for (const p of AllPowers) {
      let view = Views.for(state, p);
      let first = await new ScriptLeader(21).decide(view);
      let second = await new ScriptLeader(21).decide(view);
      Assert.equal(serialize(TurnSubmissionSchema, first), serialize(TurnSubmissionSchema, second));
      Assert.notEmpty(first.orders);
    }
  });

  test("A king alone on the new brain outgrows the same king on the old one", async () => {
    function seatsOf(focus: Power | null): (a0: GameState) => GameRunner {
      return (st) => {
        var baseline = new BaselineLeader(st.seed);
        var seats = toDict(
          AllPowers,
          (x) => x,
          (x) => (x === focus ? new ScriptLeader(st.seed) : baseline),
        );
        return Object.assign(new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
      };
    }
    let gains = [];
    for (const seed of [2, 3]) {
      let all = (await playGame(seed, seatsOf(null), false, null))[0];
      for (const p of ["Egypt", "Assyria", "Arzawa"] as const) {
        let one = (await playGame(seed, seatsOf(p), false, null))[0];
        gains.push(one.growth[p] - all.growth[p]);
      }
    }
    Assert.true(average(gains) > 0.4, `average gain ${fmt(average(gains), "0.00")}`);
  });

  test("Faced with a supported attack a king supports the province under threat", () => {
    // Mitanni's Terqa borders Assyria's Ashur and Ekallate: together they can take it unless Washukanni supports it.
    let state = oldWorld(newGame(4));
    let view = Views.for(state, "Mitanni");
    let brain = new Brain("Mitanni", 4);
    brain.learn(view, new Board(view));
    let assyria = brain.rel.get("Assyria");
    assyria.grudge = 6;
    assyria.trust = -0.8;
    assyria.lastAttackedUs = view.turn;
    let board = new Board(view, brain.remembered(view));

    let plan = Tactics.make(board, brain);
    Search.improve(board, brain, plan, brain.r(view.turn, "search"));

    Assert.equal(support("washukanni", "terqa"), plan.orders.get("washukanni"));
    Assert.notOrder("move", plan.orders.get("terqa"));
  });

  test("A king never marches on a sworn friend unless he has decided to betray him", () => {
    // Egypt's Sinai and Gaza are a step from Alashiya's coast by sea; with a treaty in force, no order may enter its land.
    for (let seed = 1; seed <= 6; seed++) {
      let state = newGame(seed);
      for (const p of AllPowers) {
        let view = Views.for(state, p);
        let brain = new Brain(p, seed);
        brain.learn(view, new Board(view));
        for (const r of [...brain.rel.values()]) {
          r.treaty = true;
          r.trust = 0.5;
        }
        let board = new Board(view, brain.remembered(view));
        let plan = Tactics.make(board, brain);
        Search.improve(board, brain, plan, brain.r(view.turn, "search"));
        for (const m of [...plan.orders.values()].filter((o): o is MoveOrder => o.type === "move"))
          Assert.true(board.ownerOf(m.to) === null || board.ownerOf(m.to) === p, `${p} moved into ${m.to}, held by ${board.ownerOf(m.to)}`);
      }
    }
  });

  test("A king who gains cities by agreement is not taken for a conqueror", () => {
    let [brain, board] = egyptBuysTheLevant(true);
    // Egypt's homeland is larger since item 11+ (Gaza and Sumur), so two cities add less to it.
    Assert.true(board.landGrowth("Egypt") >= 1.15, "by land alone Egypt would seem to run away with the game");
    Assert.inRange(board.growth("Egypt"), 0.95, 1.15);
    Assert.notEqual("Egypt", board.leader());
    Assert.equal(0, brain.belligerence.getOrDefault("Egypt", 0));
  });

  test("Cities that change hands out of sight count half as given and half as taken", () => {
    // Out of Hatti's sight the walls are as it last saw them, so it cannot tell a city given from a conquest (since the
    // review of the siege package; until item 11+ a city given was a city bought).
    let [seen, inSight] = egyptBuysTheLevant(true);
    let [unseen, outOfSight] = egyptBuysTheLevant(false);
    Assert.equal(1.0, unseen.belligerence.get("Egypt"), 3);
    Assert.true(outOfSight.growth("Egypt") > inSight.growth("Egypt"));
    Assert.equal(0, seen.belligerence.getOrDefault("Egypt", 0));
  });

  // <summary>Egypt gains Megiddo and Tyre with their walls whole (their city-states gone), seen by Hatti from an army of its in Damascus, or unseen.</summary>
  function egyptBuysTheLevant(watching: boolean): [Brain, Board] {
    let s = unruled(newGame(3), "megiddo", "tyre", "damascus");
    if (watching) s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "damascus" }));
    let brain = new Brain("Hatti", 3);
    let first = Views.for(s, "Hatti");
    brain.learn(first, new Board(first));

    // Egypt takes two cities of the Levant and pays as much out: its land grows by a quarter, its treasury shrinks by as much.
    for (const city of ["megiddo", "tyre"]) {
      known(s, city, "Egypt");
      s.treasuries.get("Egypt").gold -= publicWorthOf(WorldMap.default.get(city), s.config.provinceWeight);
    }
    s.turn = 6;
    let view = Views.for(s, "Hatti");
    brain.learn(view, new Board(view));
    return [brain, new Board(view, brain.remembered(view), brain.treasury)];
  }

  test("Sworn partners work out the same joint blow and the supporter gives the support", () => {
    // Mitanni (Carchemish) and Egypt (Alalakh) have sworn against Hatti; both stand next to Hatti's Kizzuwatna, which lies empty.
    let s = newGame(11);
    for (const [city, owner] of [
      ["carchemish", "Mitanni"],
      ["alalakh", "Egypt"],
    ] as const) {
      known(s, city, owner);
      s.walls.delete(city);
    }
    removeAll(s.units, (u) => ["kizzuwatna", "terqa", "memphis"].includes(u.province));
    s.units.push(newUnit({ id: "u90", power: "Mitanni", kind: "Army", province: "carchemish" }));
    s.units.push(newUnit({ id: "u91", power: "Egypt", kind: "Army", province: "alalakh" }));
    s.tablets.push(
      newTablet({
        id: "t90",
        text: "Mitanni and Egypt swear to stand together against Hatti.",
        proposedBy: "Mitanni",
        partner: "Egypt",
        seals: ["Mitanni", "Egypt"],
        createdTurn: 1,
        sealedTurn: 1,
      }),
    );
    for (const holder of ["Mitanni", "Egypt"] as const)
      s.copies.push(newTabletCopy({ id: `k9${holder}`, tabletId: "t90", holder: holder, acquiredTurn: 1, source: "sealed at audience" }));
    // Not in winter, when the passes into Kizzuwatna are closed (item 7b).
    s.turn = 6;

    function courtOf(p: Power): [Board, Brain] {
      let view = Views.for(s, p);
      let brain = new Brain(p, 11);
      brain.learn(view, new Board(view));
      // Hatti has been taking land: the partners stand against it however their own growth compares (since item 9+a a city
      // given each of them adds its purse and stores too, so Hatti no longer races them).
      brain.belligerence.set("Hatti", 1);
      return [new Board(view, brain.remembered(view), brain.treasury), brain];
    }
    let [mb, mitanni] = courtOf("Mitanni");
    let [eb, egypt] = courtOf("Egypt");

    let seen = [Tactics.joints(mb, mitanni), Tactics.joints(eb, egypt)].map((js) => single(js, (j) => j.target === "kizzuwatna"));
    Assert.all(seen, (j) => {
      Assert.equal("Hatti", j.against);
      // Mitanni holds less land, so Mitanni goes in and Egypt supports.
      Assert.equal("carchemish", j.lead.province);
      Assert.equal(
        ["alalakh"],
        j.support.map((u) => u.province),
      );
    });

    let plan = Tactics.make(eb, egypt);
    Search.improve(eb, egypt, plan, egypt.r(5, "search"));
    Assert.equal(support("alalakh", "carchemish", "kizzuwatna"), plan.orders.get("alalakh"));
  });

  test("A king who seals a peace at an audience keeps it that same season", () => {
    let s = newGame(5);
    let court = Views.for(s, "Hatti");
    let brain = new Brain("Hatti", 5);
    brain.learn(court, new Board(court));
    let board = new Board(court, undefined, brain.treasury);
    let audience = newAudienceView({
      audienceId: "a1",
      turn: 1,
      round: 1,
      maxRounds: 2,
      from: "Arzawa",
      host: "Hatti",
      proposal: newTabletView({ text: Statecraft.peaceTablet("Arzawa", "Hatti"), proposedBy: "Arzawa", partner: "Hatti" }),
    });

    let reply = Statecraft.host(audience, board, brain, Rng.for(5, 1, "test", "host"));

    Assert.true(reply.sealProposal);
    Assert.true(brain.rel.get("Arzawa").treaty);
    Assert.false(Tactics.willing(board, brain, "Arzawa", board.leader()));
  });

  test("Babylon will not call Assyria brother", () => {
    for (let seed = 1; seed <= 10; seed++) {
      let brain = new Brain("Babylonia", seed);
      // Assyria's claim is new at the start, and Babylonia holds Assyria its vassal (item 8: "Recognition is earned").
      brain.claims = StartClaims.map((c) => ({ ...c }));
      let greeting = Statecraft.greet(brain, "Assyria");
      Assert.false(greeting.callBrother);
      Assert.false(greeting.grantGreatKing);
      Assert.true(Statecraft.greet(brain, "Egypt").callBrother);
    }
  });
});
