import { describe, test } from "vitest";
import { type CrownOrder, type Order, HSet, TurnEngine, Views, newGame, newGameConfig } from "@amarna/engine";
import { Board } from "../src/bots/board.ts";
import { crownOrders } from "../src/bots/crowns.ts";
import { Assert } from "../../engine/test/support.ts";

// Item 17b, part C2: a script king crowns the heir of a fallen realm, in exile at his court, over that realm's land he holds.
describe("ExileCrownTests", () => {
  test("A script king makes the heir in exile king again over his fallen realm's land", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const e = new TurnEngine(s);
    // Hatti holds Mitanni's land but its capital, and Mitanni falls holding nothing; its king dies, his heir comes to Hatti.
    const home = e.map.homeOf("Mitanni").map((p) => p.id);
    for (const id of home) s.owner.set(id, "Hatti");
    s.units = s.units.filter((u) => !home.includes(u.province));
    const king = s.characters.find((c) => c.id === s.reigns.get("Mitanni").character)!;
    e.fall("Mitanni", "Hatti");
    king.status = "Dead";
    e.kingDied(king, "put to death by Hatti", e.courtAt("Hatti"));
    e.kingDeadHeard(s.journeys[s.journeys.length - 1]);
    const heir = s.characters.find((c) => c.id === s.reigns.get("Mitanni").character)!;
    heir.at = "Hatti";
    const orders: Order[] = [];
    crownOrders(new Board(Views.for(s, "Hatti")), orders, new HSet());
    const o = Assert.single(orders) as CrownOrder;
    Assert.equal(heir.id, o.character);
    Assert.true(o.provinces.length > 0 && o.provinces.every((x) => home.includes(x)));
  });
});
