import { describe, test } from "vitest";
import { Dict, HSet, TurnEngine, Views, WorldMap, newCharacter, newGame, newGameConfig, newId, newOwnerChange, newTraits, type GameState } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { RidePlay, rideOrders } from "../src/bots/rides.ts";
import { Assert, smallWorld } from "../../engine/test/support.ts";

const map = WorldMap.default;

/** Egypt holds Nippur, far from its court, beside Babylonia's land; a free man stands at Egypt's court; three seasons pass. */
function world(): GameState {
  const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
  s.owner.set("nippur", "Egypt");
  s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
  s.ledger.set("nippur", new Dict([["Egypt", 5000]]));
  for (const x of s.characters) if (x.status === "Free" && x.at === "Egypt") x.at = "Babylonia";
  s.characters.push(newCharacter({ id: newId(s, "c"), name: "Ahmose", status: "Free", at: "Egypt", traits: newTraits({ loyalty: 60, greed: 40, ambition: 30, courage: 50, competence: 50 }), tongues: new Dict([["Egyptian", 100]]) }));
  for (let i = 0; i < 3; i++) {
    new TurnEngine(s, map).beginTurn();
    new TurnEngine(s, map).resolve(new Dict());
  }
  new TurnEngine(s, map).beginTurn();
  return s;
}

describe("RidePlayTests", () => {
  test("A script king hires a rider for a far province whose report is old when a king who attacked him holds land beside it, and haggles after a refusal (#601)", () => {
    const s = world();
    const v = Views.for(s, "Egypt");
    Assert.true(v.turn - v.ownerAsOf.get("nippur") >= 2);
    const brain = new Brain("Egypt", 1);
    const b = new Board(v);
    brain.learn(v, b);
    // Quiet: no ride.
    Assert.equal(0, rideOrders(b, brain, new HSet(), 1000).length);
    brain.rel.get("Babylonia").lastAttackedUs = v.turn;
    const [o] = rideOrders(b, brain, new HSet(), 1000);
    Assert.true(o !== undefined && o.type === "hire" && o.what === "ride" && o.where === "nippur");
    const first = o.type === "hire" ? o.fee : 0;
    // Refused last season: he offers more.
    const later = { ...v, turn: v.turn + 1 };
    const [again] = rideOrders(new Board(later), brain, new HSet(), 1000);
    Assert.true(again !== undefined && again.type === "hire" && again.fee > first);
    // Kings that leave it alone, to measure it, never ride.
    RidePlay.off = true;
    try {
      Assert.equal(0, rideOrders(b, brain, new HSet(), 1000).length);
    } finally {
      RidePlay.off = false;
    }
  });
});
