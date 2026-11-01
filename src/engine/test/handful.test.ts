import { describe, test } from "vitest";
import { Adjudicator, Dict, type Order, type Power, TurnEngine, WorldMap, join, move, newGame, newGameConfig, newTurnSubmission, newUnit, OrderValidator } from "@amarna/engine";
import { Assert } from "./support.ts";

// Item 17++ ("A handful holds nothing by itself"): the ground multiplies the men who hold it, so a handful on a hill holds
// no more than a handful; and a remnant may join a larger unit of its king's next door.
describe("HandfulTests", () => {
  test("A handful on rough ground is beaten by an army, and a full army there still holds with the ground's help", () => {
    const owners = new Dict<string, Power | null>([["mira", "Arzawa"]]);
    const orders = new Dict<string, Order>([["tuwanuwa", move("tuwanuwa", "mira")]]);
    const run = (men: number) =>
      new Adjudicator(WorldMap.default, true, 1).run(
        [newUnit({ id: "u0", power: "Hatti", kind: "Army", province: "tuwanuwa", men: 4000 }), newUnit({ id: "u1", power: "Arzawa", kind: "Army", province: "mira", men })],
        orders,
        owners,
        new Dict(),
      );
    // Seven men on Mira's hills: the army of 4,000 goes through them.
    Assert.equal("mira", run(7).newPositions.tryGet("u0") ?? null);
    // 4,000 on the same hills hold: the ground doubles them.
    Assert.equal("tuwanuwa", run(4000).newPositions.tryGet("u0") ?? "tuwanuwa");
  });

  test("A remnant joins a larger army of its king's next door, and its men, grain and savings go with it", () => {
    const s = newGame(2, newGameConfig({ catastropheChance: 0 }));
    const big = s.units.find((u) => u.province === "memphis")!;
    s.units.push(newUnit({ id: "u-r", power: "Egypt", kind: "Army", province: "sinai", home: "memphis", men: 300, food: 10, savings: 5 }));
    const v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [join("sinai", "memphis"), join("akhetaten", "libya")] }));
    Assert.equal(1, v.rejected.length);
    const men = big.men;
    new TurnEngine(s).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [join("sinai", "memphis")] })]]));
    Assert.false(s.units.some((u) => u.id === "u-r"));
    Assert.equal(men + 300, big.men);
    Assert.true(s.events.some((e) => e.signal === "unit-joined"));
  });
});
