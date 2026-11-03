import { describe, test } from "vitest";
import { Dict, TurnEngine, Views, WorldMap, newGame, newGameConfig, newOwnerChange, newUnit, loseUnit } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

/** Egypt holds Nippur, far from its court, with an army there that has sent a few seasons' reports. */
function farArmy() {
  const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
  s.owner.set("nippur", "Egypt");
  s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
  s.ledger.set("nippur", new Dict([["Egypt", 5000]]));
  s.units = s.units.filter((u) => u.province !== "nippur");
  const u = newUnit({ id: "u990", power: "Egypt", kind: "Army", province: "nippur", home: "thebes", men: 1000 });
  s.units.push(u);
  const season = () => {
    new TurnEngine(s, WorldMap.default).beginTurn();
    new TurnEngine(s, WorldMap.default).resolve(new Dict());
  };
  return { s, u, season };
}

const shown = (s: ReturnType<typeof farArmy>["s"]) => Views.for(s, "Egypt").units.filter((x) => x.power === "Egypt" && x.province === "nippur");

describe("UnitsKnownTests", () => {
  test("A far unit lost out of sight stays in its king's view, as last reported, until word of its end could come (bug #600)", () => {
    const { s, u, season } = farArmy();
    for (let i = 0; i < 3; i++) season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    const d = new TurnEngine(s, WorldMap.default).wordTo("Egypt", "nippur");
    Assert.true(d >= 1);
    const before = shown(s);
    Assert.equal(1, before.length);
    Assert.true(before[0].reported > 0);
    loseUnit(s, u);
    const gone = s.turn;
    // Word of its end, from the season it ended, comes a season and the couriers' road later; till then the reports it
    // sent before it come in, never one after.
    const heard = s.turn + 1 + d;
    while (s.turn < heard) {
      Assert.equal(1, shown(s).length);
      Assert.true(shown(s)[0].reported <= gone);
      Assert.equal(before[0].men, shown(s)[0].men);
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
      new TurnEngine(s, WorldMap.default).beginTurn();
    }
    Assert.empty(shown(s));
  });

  test("A unit raised far off is known to its king once word of its raising could come (bug #600)", () => {
    const { s, season } = farArmy();
    s.units = s.units.filter((x) => x.id !== "u990");
    season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    const d = new TurnEngine(s, WorldMap.default).wordTo("Egypt", "nippur");
    s.units.push(newUnit({ id: "u991", power: "Egypt", kind: "Army", province: "nippur", home: "nippur", men: 1000, since: s.turn }));
    const raised = s.turn;
    while (s.turn <= raised + d) {
      Assert.empty(shown(s));
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
      new TurnEngine(s, WorldMap.default).beginTurn();
    }
    Assert.equal(1, shown(s).length);
  });
});
