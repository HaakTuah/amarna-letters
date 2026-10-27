import { describe, test } from "vitest";
import { orders } from "../../llm/src/parse.ts";
import {
  Dict,
  type GameState,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  cede,
  move,
  newGame,
  newGameConfig,
  newId,
  newSiege,
  newUnit,
  support,
} from "@amarna/engine";
import { removeAll, Assert, subs } from "./support.ts";

// Slow absorption (Build order item 5): land taken by force yields, and counts in its holder's strength, a third of its
// yield in its first season under him, two thirds in the second, all of it from the third; his own homeland retaken, and
// land bought or ceded, count in full at once.
describe("AbsorptionTests", () => {
  function season(s: GameState, orders: Dict<Power, TurnSubmission> | null = null): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders ?? new Dict());
    return e;
  }

  // <summary>Seed 1, no catastrophes, a Mitanni army in Isuwa next to Hatti's empty Sapinuwa (yield 30).</summary>
  function board(): GameState {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "isuwa" }));
    return s;
  }

  test("Land taken by force yields and counts a third then two thirds then all", () => {
    let s = board();
    let e = season(s, subs({ Mitanni: { orders: [move("isuwa", "sapinuwa")] } }));
    Assert.equal("Mitanni", s.owner.get("sapinuwa"));
    Assert.equal(1, s.conquered.get("sapinuwa"));
    // Its strength counts a third of Sapinuwa's 30 beside its homeland's 145.
    Assert.equal(s.config.provinceWeight * (145 + 10) + s.treasuries.get("Mitanni").gold - e.backPayOwed("Mitanni"), e.strength("Mitanni"));
    // Its taker sees the mark; no other court does, not even the loser (how land changed hands is not public).
    Assert.equal(1, Views.for(s, "Mitanni").conquered.get("sapinuwa"));
    Assert.empty(Views.for(s, "Hatti").conquered);
    Assert.empty(Views.for(s, "Egypt").conquered);

    // Turn 2: it yields a third of its yield; turn 3 two thirds; turn 4 all of it, and the mark is gone.
    Assert.equal(10, new TurnEngine(s).effectiveYield("sapinuwa"));
    season(s);
    Assert.equal(20, new TurnEngine(s).effectiveYield("sapinuwa"));
    season(s);
    Assert.equal(4, s.turn);
    new TurnEngine(s).beginTurn();
    Assert.equal(30, new TurnEngine(s).effectiveYield("sapinuwa"));
    Assert.false(s.conquered.has("sapinuwa"));
  });

  test("A king s own homeland retaken counts in full", () => {
    let s = board();
    season(s, subs({ Mitanni: { orders: [move("isuwa", "sapinuwa")] } }));
    Assert.true(s.conquered.has("sapinuwa"));
    // Hatti drives the army out and takes Sapinuwa back: its own homeland, in full at once.
    season(
      s,
      subs({
        Hatti: { orders: [move("hattusa", "sapinuwa"), support("nesa", "hattusa", "sapinuwa")] },
      }),
    );
    Assert.equal("Hatti", s.owner.get("sapinuwa"));
    Assert.false(s.conquered.has("sapinuwa"));
    Assert.equal(1.0, new TurnEngine(s).absorbed("sapinuwa"));
  });

  test("Land ceded is the receiver s in full unless the giver was still absorbing it", () => {
    let s = board();
    // Mitanni takes Sapinuwa, then cedes it to Assyria the next season: Assyria goes on absorbing it from the season it
    // was taken, so a conquest cannot be laundered through a friend.
    season(s, subs({ Mitanni: { orders: [move("isuwa", "sapinuwa")] } }));
    season(s, subs({ Mitanni: { orders: [move("sapinuwa", "isuwa"), cede("sapinuwa", "Assyria")] } }));
    Assert.equal("Assyria", s.owner.get("sapinuwa"));
    Assert.equal(1, s.conquered.get("sapinuwa"));
    Assert.equal(2 / 3.0, new TurnEngine(s).absorbed("sapinuwa"));
    Assert.equal(1, Views.for(s, "Assyria").conquered.get("sapinuwa"));

    // Ceded to the king whose homeland it is, it is his in full at once, as if he had retaken it.
    season(s, subs({ Assyria: { orders: [cede("sapinuwa", "Hatti")] } }));
    Assert.equal("Hatti", s.owner.get("sapinuwa"));
    Assert.false(s.conquered.has("sapinuwa"));

    // Land that was never taken by force is the receiver's in full at once.
    season(s, subs({ Hatti: { orders: [cede("tuwanuwa", "Arzawa")] } }));
    Assert.equal("Arzawa", s.owner.get("tuwanuwa"));
    Assert.false(s.conquered.has("tuwanuwa"));
    Assert.equal(1.0, new TurnEngine(s).absorbed("tuwanuwa"));
  });

  test("Land that passes with a fallen kingdom is absorbed slowly", () => {
    let s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    removeAll(s.units, (u) => u.province === "ashur");
    let besieger = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "ashur" });
    s.units.push(besieger);
    s.sieges.push(newSiege({ province: "ashur", power: "Babylonia", unitId: besieger.id, progress: 2, since: 1 }));
    season(s);
    Assert.all(WorldMap.default.homeOf("Assyria"), (p) => Assert.equal(1, s.conquered.get(p.id)));
    Assert.equal(1 / 3.0, new TurnEngine(s).absorbed("nineveh"));
  });
});
