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
    let b = new Board().a("Mitanni", "terqa").a("Assyria", "ashur").a("Assyria", "ekallate").move("ashur", "terqa").support("ekallate", "ashur", "terqa");
    let r = b.run();
    Assert.equal("terqa", b.where(r, "ashur"));
    Assert.single(r.dislodgedUnitIds);
    Assert.null(b.where(r, "terqa"));
  });

  test("Support from another power counts", () => {
    let b = new Board().a("Mitanni", "terqa").a("Assyria", "ashur").a("Babylonia", "ekallate").move("ashur", "terqa").support("ekallate", "ashur", "terqa");
    Assert.equal("terqa", b.where(b.run(), "ashur"));
  });

  test("Support is cut by an attack from elsewhere", () => {
    let b = new Board()
      .a("Mitanni", "terqa")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallate")
      .a("Babylonia", "sippar")
      .move("ashur", "terqa")
      .support("ekallate", "ashur", "terqa")
      .move("sippar", "ekallate");
    let r = b.run();
    Assert.equal("ashur", b.where(r, "ashur"));
    Assert.contains("ekallate", r.cutSupports);
  });

  test("Support is not cut by an attack from the province it supports into", () => {
    // Ekallate supports Ashur into Terqa; Terqa's unit attacks Ekallate: the support still stands.
    let b = new Board()
      .a("Mitanni", "terqa")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallate")
      .move("ashur", "terqa")
      .support("ekallate", "ashur", "terqa")
      .move("terqa", "ekallate");
    let r = b.run();
    Assert.equal("terqa", b.where(r, "ashur"));
    Assert.equal("ekallate", b.where(r, "ekallate"));
    Assert.single(r.dislodgedUnitIds);
  });

  test("Own units cannot cut support or be dislodged by their own side", () => {
    let b = new Board().a("Assyria", "terqa").a("Assyria", "ashur").a("Assyria", "ekallate").move("ashur", "terqa").support("ekallate", "ashur", "terqa");
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
      .a("Assyria", "ekallate")
      .move("terqa", "ashur")
      .move("ashur", "terqa")
      .support("ekallate", "ashur", "terqa");
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
    // Amurru and the island of Arwad share their waters: one fleet carries the army over.
    let b = new Board().a("Egypt", "amurru").f("Egypt", "amurruwaters").move("amurru", "arwad").convoy("amurruwaters", "amurru", "arwad");
    Assert.equal("arwad", b.where(b.run(), "amurru"));
  });

  test("Army without a convoying fleet stays", () => {
    let b = new Board().a("Egypt", "amurru").move("amurru", "arwad");
    Assert.equal("amurru", b.where(b.run(), "amurru"));
  });

  test("Dislodged fleet breaks the convoy", () => {
    let b = new Board()
      .a("Egypt", "amurru")
      .f("Egypt", "amurruwaters")
      .f("Arzawa", "bybloswaters")
      .f("Arzawa", "ugaritwaters")
      .move("amurru", "arwad")
      .convoy("amurruwaters", "amurru", "arwad")
      .move("bybloswaters", "amurruwaters")
      .support("ugaritwaters", "bybloswaters", "amurruwaters");
    let r = b.run();
    Assert.equal("amurru", b.where(r, "amurru"));
    Assert.equal("amurruwaters", b.where(r, "bybloswaters"));
    Assert.null(b.where(r, "amurruwaters"));
  });

  test("Convoy paradox resolves by the Szykman rule", () => {
    // The convoyed army attacks the unit supporting the attack on its own convoy.
    let b = new Board()
      .a("Egypt", "amurru")
      .f("Egypt", "amurruwaters")
      .f("Arzawa", "bybloswaters")
      .f("Arzawa", "arwad")
      .move("amurru", "arwad")
      .convoy("amurruwaters", "amurru", "arwad")
      .move("bybloswaters", "amurruwaters")
      .support("arwad", "bybloswaters", "amurruwaters");
    let r = b.run();
    Assert.equal("amurru", b.where(r, "amurru"));
    Assert.equal("amurruwaters", b.where(r, "bybloswaters"));
    Assert.equal("arwad", b.where(r, "arwad"));
    Assert.null(b.where(r, "amurruwaters"));
  });

  test("Walls add nothing to the battle and are stormed only by more than walls and defenders", () => {
    // A lone army gets within empty walls of level 1 but does not storm them: 1 against 1 + 0.
    let single = new Board().a("Hatti", "isuwa").move("isuwa", "carchemish");
    single.walls.set("carchemish", 1);
    let r1 = single.run();
    Assert.equal("carchemish", single.where(r1, "isuwa"));
    let a1 = Assert.single(r1.assaults);
    Assert.equal([1, 1, 0, false], [a1.strength, a1.walls, a1.defenders, stormed(a1)]);
    Assert.empty(stormedIn(r1));

    // A supported one storms them: 2 against 1 + 0.
    let supported = new Board().a("Hatti", "isuwa").a("Hatti", "aleppo").move("isuwa", "carchemish").support("aleppo", "isuwa", "carchemish");
    supported.walls.set("carchemish", 1);
    let r2 = supported.run();
    Assert.equal("carchemish", supported.where(r2, "isuwa"));
    Assert.equal(["carchemish"], stormedIn(r2));

    // Walls 2 held by an army: 2 dislodges the army but storms nothing (2 against 2 + 1).
    let held = new Board()
      .a("Hatti", "isuwa")
      .a("Hatti", "aleppo")
      .a("Mitanni", "carchemish")
      .move("isuwa", "carchemish")
      .support("aleppo", "isuwa", "carchemish");
    held.walls.set("carchemish", 2);
    held.owners.set("carchemish", "Mitanni");
    let r3 = held.run();
    Assert.equal("carchemish", held.where(r3, "isuwa"));
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
    let b = new Board().f("Hatti", "ugaritwaters").f("Hatti", "amurru").move("ugaritwaters", "ugarit").support("amurru", "ugaritwaters", "ugarit");
    b.walls.set("ugarit", 1);
    let r = b.run();
    Assert.equal("ugarit", b.where(r, "ugaritwaters"));
    Assert.false(stormed(Assert.single(r.assaults)));
  });

  test("Mismatched support is void", () => {
    // Ekallate "supports" Ashur into Terqa, but Ashur actually holds.
    let b = new Board()
      .a("Mitanni", "terqa")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallate")
      .a("Babylonia", "sippar")
      .support("ekallate", "ashur", "terqa")
      .move("sippar", "ekallate");
    let r = b.run();
    Assert.equal("ekallate", b.where(r, "ekallate"));
    Assert.equal("sippar", b.where(r, "sippar"));
  });

  test("Unit moving away lets the attacker in", () => {
    let b = new Board().a("Mitanni", "terqa").a("Assyria", "ashur").move("terqa", "suhu").move("ashur", "terqa");
    b.walls.delete("suhu");
    let r = b.run();
    Assert.equal("suhu", b.where(r, "terqa"));
    Assert.equal("terqa", b.where(r, "ashur"));
  });
});
