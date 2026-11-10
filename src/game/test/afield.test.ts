import { describe, test } from "vitest";
import { KingTraitValues, type CourtOrder, type Order, Views, newGame, newId, newSiege, newUnit } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
import { kingAfield } from "../src/bots/afield.ts";
import { Assert } from "../../engine/test/support.ts";

// Item 17b, part C: a script king goes to the front without his court when his army fights where his couriers come late,
// and back when the fight is over.
describe("AfieldTests", () => {
  test("A script king goes alone near his far army in a fight, and home when it is over", () => {
    const s = newGame(1);
    const map = Board.Map;
    // A king of middling caution, an Egyptian army besieging Terqa, far from Akhetaten, and a walled city of Egypt's
    // beside it.
    s.reigns.get("Egypt").traits[KingTraitValues.indexOf("caution")] = 40;
    const safe = map.neighbors("terqa").find((n) => !map.get(n).isSea)!;
    s.units = s.units.filter((u) => ![safe, "terqa", ...map.neighbors(safe), ...map.neighbors("terqa")].includes(u.province));
    s.owner.set(safe, "Egypt");
    s.walls.set(safe, 2);
    const army = newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: "terqa", men: 3000 });
    s.units.push(army);
    s.sieges.push(newSiege({ province: "terqa", power: "Egypt", unitId: army.id, since: 1 }));
    const orders: Order[] = [];
    kingAfield(new Board(Views.for(s, "Egypt")), orders);
    const o = Assert.single(orders) as CourtOrder;
    Assert.equal(["court", true], [o.type, o.alone]);
    Assert.equal(safe, o.to);
    // There, with no fight left, he goes home.
    s.kingAt.set("Egypt", o.to);
    s.sieges = [];
    const home: Order[] = [];
    kingAfield(new Board(Views.for(s, "Egypt")), home);
    Assert.equal({ type: "court", to: "akhetaten", alone: true }, Assert.single(home));
  });
});
