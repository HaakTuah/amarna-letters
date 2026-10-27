import { describe, test } from "vitest";
import {
  AdjudicationResult,
  Adjudicator,
  Dict,
  type Order,
  type Power,
  type Unit,
  WorldMap,
  convoy,
  first,
  move,
  newUnit,
  stormed,
  support,
} from "@amarna/engine";
import { Assert } from "./support.ts";

/** The provinces whose walls were stormed (the C# result's Stormed). */
const stormedIn = (r: AdjudicationResult): string[] => r.assaults.filter(stormed).map((a) => a.province);

describe("AdjudicatorTests", () => {
  class Board {
    units: Unit[] = [];
    walls: Dict<string, number> = new Dict<string, number>();
    owners: Dict<string, Power | null> = new Dict<string, Power | null>();
    orders: Dict<string, Order> = new Dict<string, Order>();

    a(p: Power, at: string): Board {
      this.units.push(newUnit({ id: "u" + this.units.length, power: p, kind: "Army", province: at }));
      return this;
    }
    f(p: Power, at: string): Board {
      this.units.push(newUnit({ id: "u" + this.units.length, power: p, kind: "Fleet", province: at }));
      return this;
    }
    move(at: string, to: string): Board {
      this.orders.set(at, move(at, to));
      return this;
    }
    support(at: string, supported: string, to: string | null = null): Board {
      this.orders.set(at, support(at, supported, to));
      return this;
    }
    convoy(at: string, army: string, to: string): Board {
      this.orders.set(at, convoy(at, army, to));
      return this;
    }

    run(): AdjudicationResult {
      return new Adjudicator(WorldMap.default).run(this.units, this.orders, this.owners, this.walls);
    }

    where(r: AdjudicationResult, startProvince: string): string | null {
      let u = first(this.units, (x) => x.province === startProvince);
      return r.newPositions.tryGet(u.id) ?? null;
    }
  }

  test("Equal moves into an empty province bounce", () => {
    let b = new Board().a("Mitanni", "washukanni").a("Assyria", "ashur").move("washukanni", "terqa").move("ashur", "terqa");
    let r = b.run();
    Assert.equal("washukanni", b.where(r, "washukanni"));
    Assert.equal("ashur", b.where(r, "ashur"));
    Assert.empty(r.dislodgedUnitIds);
  });

  test("Unsupported attack on a holding unit fails", () => {
    let b = new Board().a("Mitanni", "terqa").a("Assyria", "ashur").move("ashur", "terqa");
    let r = b.run();
    Assert.equal("ashur", b.where(r, "ashur"));
    Assert.equal("terqa", b.where(r, "terqa"));
  });

  test("Supported attack dislodges and the loser is destroyed", () => {
    let b = new Board().a("Mitanni", "terqa").a("Assyria", "ashur").a("Assyria", "ekallatum").move("ashur", "terqa").support("ekallatum", "ashur", "terqa");
    let r = b.run();
    Assert.equal("terqa", b.where(r, "ashur"));
    Assert.single(r.dislodgedUnitIds);
    Assert.null(b.where(r, "terqa"));
  });

  test("Support from another power counts", () => {
    let b = new Board().a("Mitanni", "terqa").a("Assyria", "ashur").a("Babylonia", "ekallatum").move("ashur", "terqa").support("ekallatum", "ashur", "terqa");
    Assert.equal("terqa", b.where(b.run(), "ashur"));
  });

  test("Support is cut by an attack from elsewhere", () => {
    let b = new Board()
      .a("Mitanni", "terqa")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallatum")
      .a("Babylonia", "sippar")
      .move("ashur", "terqa")
      .support("ekallatum", "ashur", "terqa")
      .move("sippar", "ekallatum");
    let r = b.run();
    Assert.equal("ashur", b.where(r, "ashur"));
    Assert.contains("ekallatum", r.cutSupports);
  });

  test("Support is not cut by an attack from the province it supports into", () => {
    // Ekallatum supports Ashur into Terqa; Terqa's unit attacks Ekallatum: the support still stands.
    let b = new Board()
      .a("Mitanni", "terqa")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallatum")
      .move("ashur", "terqa")
      .support("ekallatum", "ashur", "terqa")
      .move("terqa", "ekallatum");
    let r = b.run();
    Assert.equal("terqa", b.where(r, "ashur"));
    Assert.equal("ekallatum", b.where(r, "ekallatum"));
    Assert.single(r.dislodgedUnitIds);
  });

  test("Own units cannot cut support or be dislodged by their own side", () => {
    let b = new Board().a("Assyria", "terqa").a("Assyria", "ashur").a("Assyria", "ekallatum").move("ashur", "terqa").support("ekallatum", "ashur", "terqa");
    let r = b.run();
    Assert.equal("ashur", b.where(r, "ashur"));
    Assert.empty(r.dislodgedUnitIds);
  });

  test("Equal head to head bounces and stronger side wins", () => {
    let even = new Board().a("Mitanni", "terqa").a("Assyria", "ashur").move("terqa", "ashur").move("ashur", "terqa");
    let r1 = even.run();
    Assert.equal("terqa", even.where(r1, "terqa"));
    Assert.equal("ashur", even.where(r1, "ashur"));

    let strong = new Board()
      .a("Mitanni", "terqa")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallatum")
      .move("terqa", "ashur")
      .move("ashur", "terqa")
      .support("ekallatum", "ashur", "terqa");
    let r2 = strong.run();
    Assert.equal("terqa", strong.where(r2, "ashur"));
    Assert.null(strong.where(r2, "terqa"));
  });

  test("Circular movement succeeds", () => {
    let b = new Board()
      .a("Mitanni", "harran")
      .a("Mitanni", "washukanni")
      .a("Mitanni", "terqa")
      .move("harran", "washukanni")
      .move("washukanni", "terqa")
      .move("terqa", "harran");
    let r = b.run();
    Assert.equal("washukanni", b.where(r, "harran"));
    Assert.equal("terqa", b.where(r, "washukanni"));
    Assert.equal("harran", b.where(r, "terqa"));
  });

  test("Circular movement broken by an outside attack fails everywhere", () => {
    let b = new Board()
      .a("Mitanni", "harran")
      .a("Mitanni", "washukanni")
      .a("Mitanni", "terqa")
      .a("Assyria", "ashur")
      .move("harran", "washukanni")
      .move("washukanni", "terqa")
      .move("terqa", "harran")
      .move("ashur", "terqa");
    let r = b.run();
    Assert.equal("harran", b.where(r, "harran"));
    Assert.equal("washukanni", b.where(r, "washukanni"));
    Assert.equal("terqa", b.where(r, "terqa"));
    Assert.equal("ashur", b.where(r, "ashur"));
  });

  test("Army crosses the sea by convoy", () => {
    let b = new Board().a("Egypt", "delta").f("Egypt", "greatgreen").move("delta", "tamassos").convoy("greatgreen", "delta", "tamassos");
    Assert.equal("tamassos", b.where(b.run(), "delta"));
  });

  test("Army without a convoying fleet stays", () => {
    let b = new Board().a("Egypt", "delta").move("delta", "tamassos");
    Assert.equal("delta", b.where(b.run(), "delta"));
  });

  test("Dislodged fleet breaks the convoy", () => {
    let b = new Board()
      .a("Egypt", "delta")
      .f("Egypt", "greatgreen")
      .f("Arzawa", "westsea")
      .f("Arzawa", "lukka")
      .move("delta", "tamassos")
      .convoy("greatgreen", "delta", "tamassos")
      .move("westsea", "greatgreen")
      .support("lukka", "westsea", "greatgreen");
    let r = b.run();
    Assert.equal("delta", b.where(r, "delta"));
    Assert.equal("greatgreen", b.where(r, "westsea"));
    Assert.null(b.where(r, "greatgreen"));
  });

  test("Convoy paradox resolves by the Szykman rule", () => {
    // The convoyed army attacks the unit supporting the attack on its own convoy.
    let b = new Board()
      .a("Egypt", "delta")
      .f("Egypt", "greatgreen")
      .f("Arzawa", "westsea")
      .f("Arzawa", "lukka")
      .move("delta", "lukka")
      .convoy("greatgreen", "delta", "lukka")
      .move("westsea", "greatgreen")
      .support("lukka", "westsea", "greatgreen");
    let r = b.run();
    Assert.equal("delta", b.where(r, "delta"));
    Assert.equal("greatgreen", b.where(r, "westsea"));
    Assert.equal("lukka", b.where(r, "lukka"));
    Assert.null(b.where(r, "greatgreen"));
  });

  test("Walls add nothing to the battle and are stormed only by more than walls and defenders", () => {
    // A lone army gets within empty walls of level 1 but does not storm them: 1 against 1 + 0.
    let single = new Board().a("Hatti", "kanesh").move("kanesh", "carchemish");
    single.walls.set("carchemish", 1);
    let r1 = single.run();
    Assert.equal("carchemish", single.where(r1, "kanesh"));
    let a1 = Assert.single(r1.assaults);
    Assert.equal([1, 1, 0, false], [a1.strength, a1.walls, a1.defenders, stormed(a1)]);
    Assert.empty(stormedIn(r1));

    // A supported one storms them: 2 against 1 + 0.
    let supported = new Board().a("Hatti", "kanesh").a("Hatti", "kizzuwatna").move("kanesh", "carchemish").support("kizzuwatna", "kanesh", "carchemish");
    supported.walls.set("carchemish", 1);
    let r2 = supported.run();
    Assert.equal("carchemish", supported.where(r2, "kanesh"));
    Assert.equal(["carchemish"], stormedIn(r2));

    // Walls 2 held by an army: 2 dislodges the army but storms nothing (2 against 2 + 1).
    let held = new Board()
      .a("Hatti", "kanesh")
      .a("Hatti", "kizzuwatna")
      .a("Mitanni", "carchemish")
      .move("kanesh", "carchemish")
      .support("kizzuwatna", "kanesh", "carchemish");
    held.walls.set("carchemish", 2);
    held.owners.set("carchemish", "Mitanni");
    let r3 = held.run();
    Assert.equal("carchemish", held.where(r3, "kanesh"));
    Assert.null(held.where(r3, "carchemish"));
    Assert.equal([2, 2, 1, false], [r3.assaults[0].strength, r3.assaults[0].walls, r3.assaults[0].defenders, stormed(r3.assaults[0])]);

    // A move into one's own walled province is no assault.
    let own = new Board().a("Mitanni", "harran").move("harran", "carchemish");
    own.walls.set("carchemish", 2);
    own.owners.set("carchemish", "Mitanni");
    let r4 = own.run();
    Assert.equal("carchemish", own.where(r4, "harran"));
    Assert.empty(r4.assaults);
  });

  test("A fleet never storms walls", () => {
    let b = new Board().f("Hatti", "cilicia").f("Hatti", "kizzuwatna").move("cilicia", "ugarit").support("kizzuwatna", "cilicia", "ugarit");
    b.walls.set("ugarit", 1);
    let r = b.run();
    Assert.equal("ugarit", b.where(r, "cilicia"));
    Assert.false(stormed(Assert.single(r.assaults)));
  });

  test("Mismatched support is void", () => {
    // Ekallatum "supports" Ashur into Terqa, but Ashur actually holds.
    let b = new Board()
      .a("Mitanni", "terqa")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallatum")
      .a("Babylonia", "sippar")
      .support("ekallatum", "ashur", "terqa")
      .move("sippar", "ekallatum");
    let r = b.run();
    Assert.equal("ekallatum", b.where(r, "ekallatum"));
    Assert.equal("sippar", b.where(r, "sippar"));
  });

  test("Unit moving away lets the attacker in", () => {
    let b = new Board().a("Mitanni", "terqa").a("Assyria", "ashur").move("terqa", "mari").move("ashur", "terqa");
    b.walls.delete("mari");
    let r = b.run();
    Assert.equal("mari", b.where(r, "terqa"));
    Assert.equal("terqa", b.where(r, "ashur"));
  });
});
