import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type Order,
  OrderValidator,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  economyOf,
  formatMoney,
  first,
  fortify,
  inboxOf,
  newGame,
  newGameConfig,
  newId,
  newSiege,
  newTurnSubmission,
  newUnit,
  single,
  unitAt,
  wallsOf,
} from "@amarna/engine";
import { Assert, oldWorld } from "./support.ts";

// Walls strengthened for gold and upkeep (Build order item 5): a level a season, for the price of the new level, up to 3;
// a level above the map's own costs upkeep, and walls whose upkeep cannot be paid fall a level; an earthquake throws a
// level down.
describe("FortifyTests", () => {
  function season(s: GameState, orders: Dict<Power, TurnSubmission> | null = null): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders ?? new Dict());
    return e;
  }

  function orders(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  test("Walls rise a level for the price of the new level and then cost upkeep", () => {
    let s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));
    let e = new TurnEngine(s);
    e.beginTurn();
    let gold = s.treasuries.get("Egypt").gold;
    e.resolve(orders("Egypt", fortify("thebes")));
    Assert.equal(1, wallsOf(s, "thebes"));
    Assert.equal(gold - 50, s.treasuries.get("Egypt").gold);
    Assert.equal(
      "The walls of Thebes stand at level 1 now; the 1 level above its old walls cost 5 shekels a season.",
      single(inboxOf(s, "Egypt"), (i) => i.title === "Walls strengthened").body,
    );
    Assert.contains(s.events, (x) => x.signal === "fortify" && x.text === "Egypt strengthened the walls of Thebes to level 1.");
    Assert.equal(5, new TurnEngine(s).wallsUpkeep("Egypt"));
    Assert.equal(5, Views.for(s, "Egypt").wallUpkeep);

    // Memphis has walls 2 on the map: raising them to 3 costs 150, and 5 a season.
    e = season(s, orders("Egypt", fortify("memphis")));
    Assert.equal(3, wallsOf(s, "memphis"));
    Assert.equal(10, e.wallsUpkeep("Egypt"));
    Assert.equal(10, Views.for(s, "Egypt").wallUpkeep);
  });

  test("A fortify order is refused beyond level 3 on land not held twice and while besieged", () => {
    let s = oldWorld(newGame(1));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "memphis" }));
    s.sieges.push(newSiege({ province: "memphis", power: "Hatti", unitId: unitAt(s, "memphis")!.id, progress: 1, since: 1 }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "sinai" }));
    let v = new OrderValidator(s).validate(
      "Egypt",
      newTurnSubmission({
        orders: [fortify("akhetaten"), fortify("gaza"), fortify("memphis"), fortify("thebes"), fortify("thebes"), fortify(""), fortify("sinai")],
      }),
    );
    Assert.equal(
      [
        "the walls of Akhetaten stand at 3, as high as walls go",
        "you do not hold Gaza",
        "Memphis is besieged: its walls cannot be strengthened while the siege lasts",
        "the walls of Thebes were already to be strengthened by an earlier order",
        "name the province whose walls to strengthen",
        "foreign troops stand within Sinai: its walls cannot be strengthened while they are there",
      ],
      v.rejected.map((r) => r.reason),
    );
    Assert.equal([fortify("thebes")], v.accepted);
  });

  test("Walls whose upkeep cannot be paid fall a level the farthest first", () => {
    // Egypt's walls of Thebes (2) and Sinai (1) are three levels above the map's: 15 a season. Its troops' pay leaves 5 of
    // its treasury and mines, so Sinai's walls fall, then a level of Thebes', until what is left can be paid.
    let s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));
    s.walls.set("thebes", 2);
    s.walls.set("sinai", 1);
    for (const at of ["thebes", "sinai", "gaza", "nubia"]) s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: at }));
    const pay = new TurnEngine(s).upkeep("Egypt");
    const mines = WorldMap.default.homeOf("Egypt").reduce((a, x) => a + economyOf(x).mine, 0);
    s.treasuries.get("Egypt").gold = pay - mines + 5;
    new TurnEngine(s).beginTurn();
    Assert.equal([0, 1], [wallsOf(s, "sinai"), wallsOf(s, "thebes")]);
    let notice = single(inboxOf(s, "Egypt"), (i) => i.title === "The treasury").body;
    Assert.contains(`Paid: your troops ${formatMoney(pay)}, walls 5 shekels.`, notice);
    Assert.contains("Unkept, walls fell a level: Sinai, Thebes.", notice);
  });

  test("An earthquake throws the walls of the province it strikes down a level", () => {
    let s = oldWorld(newGame(3, newGameConfig({ catastropheChance: 1 })));
    for (const p of WorldMap.default.landProvinces) s.walls.set(p.id, 3);
    for (let i = 0; i < 40 && !s.catastrophes.some((c) => c.kind === "Earthquake"); i++) season(s);
    let quake = first(s.catastrophes, (c) => c.kind === "Earthquake");
    Assert.equal(2, wallsOf(s, quake.province!));
    Assert.contains("and its walls stand a level lower (walls 2).", single(inboxOf(s, quake.power), (i) => i.title === "Catastrophe: Earthquake").body);
  });
});
