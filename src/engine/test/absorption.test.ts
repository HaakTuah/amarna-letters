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
  EconomyData,
  economyOf,
  grainWorth,
  harvestOf,
  taxOf,
  cede,
  move,
  newGame,
  newGameConfig,
  newId,
  newSiege,
  newUnit,
  support,
} from "@amarna/engine";
import { removeAll, Assert, subs, oldWorld } from "./support.ts";

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

  // <summary>Seed 1, no catastrophes, a Mitanni army in the Kaska lands next to Hatti's empty Sapinuwa (since item 11f the road from Isuwa runs by Samuha).</summary>
  function board(): GameState {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 })));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "kaska" }));
    return s;
  }

  test("Land taken by force yields and counts a third then two thirds then all", () => {
    let s = board();
    let e = season(s, subs({ Mitanni: { orders: [move("kaska", "sapinuwa")] } }));
    Assert.equal("Mitanni", s.owner.get("sapinuwa"));
    Assert.equal(1, s.conquered.get("sapinuwa"));
    // Its strength counts a third of Sapinuwa's land worth beside its homeland's.
    // The harvest each province's people bring in now (item 10+a), at the land's worth.
    const worth = (id: string): number => grainWorth(e.harvestNow(id, false)) + economyOf(WorldMap.default.get(id)).mine;
    // Its homeland, and Terqa, its own in the world before item 11d.
    const home = WorldMap.default.homeOf("Mitanni").reduce((a, x) => a + worth(x.id), 0) + worth("terqa");
    Assert.equal(home + Math.round(worth("sapinuwa") / 3), e.landYield("Mitanni"));
    // Its taker sees the mark; no other court does, not even the loser (how land changed hands is not public).
    Assert.equal(1, Views.for(s, "Mitanni").conquered.get("sapinuwa"));
    Assert.empty(Views.for(s, "Hatti").conquered);
    Assert.empty(Views.for(s, "Egypt").conquered);

    // Turn 2: it yields a third of its yield; turn 3 two thirds; turn 4 all of it, and the mark is gone.
    // The tax of the harvest its people bring in that season (item 10+a).
    const tax = (): number => taxOf(new TurnEngine(s).harvestNow("sapinuwa"));
    Assert.equal(Math.round(tax() / 3), new TurnEngine(s).effectiveYield("sapinuwa"));
    season(s);
    Assert.equal(Math.round((tax() * 2) / 3), new TurnEngine(s).effectiveYield("sapinuwa"));
    season(s);
    Assert.equal(4, s.turn);
    new TurnEngine(s).beginTurn();
    Assert.equal(tax(), new TurnEngine(s).effectiveYield("sapinuwa"));
    Assert.false(s.conquered.has("sapinuwa"));
  });

  test("A king s own homeland retaken counts in full", () => {
    let s = board();
    season(s, subs({ Mitanni: { orders: [move("kaska", "sapinuwa")] } }));
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
    season(s, subs({ Mitanni: { orders: [move("kaska", "sapinuwa")] } }));
    season(s, subs({ Mitanni: { orders: [move("sapinuwa", "kaska"), cede("sapinuwa", "Assyria")] } }));
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
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 })));
    removeAll(s.units, (u) => u.province === "ashur");
    let besieger = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "ashur" });
    s.units.push(besieger);
    s.sieges.push(newSiege({ province: "ashur", power: "Babylonia", unitId: besieger.id, progress: 3 * EconomyData.breachPerLevel - 1, since: 1 }));
    season(s);
    Assert.all(WorldMap.default.homeOf("Assyria"), (p) => Assert.equal(1, s.conquered.get(p.id)));
    Assert.equal(1 / 3.0, new TurnEngine(s).absorbed("nineveh"));
  });
});
