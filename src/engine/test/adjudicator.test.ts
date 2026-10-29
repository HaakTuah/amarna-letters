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
  FullUnit,
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
    let b = new Board().a("Mitanni", "washukanni").a("Assyria", "taidu").move("washukanni", "terqa").move("taidu", "terqa");
    let r = b.run();
    Assert.equal("washukanni", b.where(r, "washukanni"));
    Assert.equal("taidu", b.where(r, "taidu"));
    Assert.empty(r.dislodgedUnitIds);
  });

  test("Unsupported attack on a holding unit fails", () => {
    let b = new Board().a("Mitanni", "suhu").a("Assyria", "ashur").move("ashur", "suhu");
    let r = b.run();
    Assert.equal("ashur", b.where(r, "ashur"));
    Assert.equal("suhu", b.where(r, "suhu"));
  });

  test("Supported attack dislodges and the loser is destroyed", () => {
    let b = new Board().a("Mitanni", "suhu").a("Assyria", "ashur").a("Assyria", "ekallate").move("ashur", "suhu").support("ekallate", "ashur", "suhu");
    let r = b.run();
    Assert.equal("suhu", b.where(r, "ashur"));
    Assert.single(r.dislodgedUnitIds);
    Assert.null(b.where(r, "suhu"));
  });

  test("Support from another power counts", () => {
    let b = new Board().a("Mitanni", "suhu").a("Assyria", "ashur").a("Babylonia", "ekallate").move("ashur", "suhu").support("ekallate", "ashur", "suhu");
    Assert.equal("suhu", b.where(b.run(), "ashur"));
  });

  test("Support is cut by an attack from elsewhere", () => {
    let b = new Board()
      .a("Mitanni", "suhu")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallate")
      .a("Babylonia", "durkurigalzu")
      .move("ashur", "suhu")
      .support("ekallate", "ashur", "suhu")
      .move("durkurigalzu", "ekallate");
    let r = b.run();
    Assert.equal("ashur", b.where(r, "ashur"));
    Assert.contains("ekallate", r.cutSupports);
  });

  test("Support is not cut by an attack from the province it supports into", () => {
    // Ekallate supports Ashur into Suhu; Suhu's unit attacks Ekallate: the support still stands.
    let b = new Board()
      .a("Mitanni", "suhu")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallate")
      .move("ashur", "suhu")
      .support("ekallate", "ashur", "suhu")
      .move("suhu", "ekallate");
    let r = b.run();
    Assert.equal("suhu", b.where(r, "ashur"));
    Assert.equal("ekallate", b.where(r, "ekallate"));
    Assert.single(r.dislodgedUnitIds);
  });

  test("Own units cannot cut support or be dislodged by their own side", () => {
    let b = new Board().a("Assyria", "suhu").a("Assyria", "ashur").a("Assyria", "ekallate").move("ashur", "suhu").support("ekallate", "ashur", "suhu");
    let r = b.run();
    Assert.equal("ashur", b.where(r, "ashur"));
    Assert.empty(r.dislodgedUnitIds);
  });

  test("Equal head to head bounces and stronger side wins", () => {
    let even = new Board().a("Mitanni", "suhu").a("Assyria", "ashur").move("suhu", "ashur").move("ashur", "suhu");
    let r1 = even.run();
    Assert.equal("suhu", even.where(r1, "suhu"));
    Assert.equal("ashur", even.where(r1, "ashur"));

    let strong = new Board()
      .a("Mitanni", "suhu")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallate")
      .move("suhu", "ashur")
      .move("ashur", "suhu")
      .support("ekallate", "ashur", "suhu");
    let r2 = strong.run();
    Assert.equal("suhu", strong.where(r2, "ashur"));
    Assert.null(strong.where(r2, "suhu"));
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
      .a("Assyria", "taidu")
      .move("harran", "washukanni")
      .move("washukanni", "terqa")
      .move("terqa", "harran")
      .move("taidu", "terqa");
    let r = b.run();
    Assert.equal("harran", b.where(r, "harran"));
    Assert.equal("washukanni", b.where(r, "washukanni"));
    Assert.equal("terqa", b.where(r, "terqa"));
    Assert.equal("taidu", b.where(r, "taidu"));
  });

  test("Army crosses the sea by convoy", () => {
    // Amurru and the island of Arwad share their waters: one fleet carries the army over.
    let b = new Board().a("Egypt", "sumur").f("Egypt", "sumurwaters").move("sumur", "arwad").convoy("sumurwaters", "sumur", "arwad");
    Assert.equal("arwad", b.where(b.run(), "sumur"));
  });

  test("Army without a convoying fleet stays", () => {
    let b = new Board().a("Egypt", "sumur").move("sumur", "arwad");
    Assert.equal("sumur", b.where(b.run(), "sumur"));
  });

  test("Dislodged fleet breaks the convoy", () => {
    let b = new Board()
      .a("Egypt", "sumur")
      .f("Egypt", "sumurwaters")
      .f("Arzawa", "bybloswaters")
      .f("Arzawa", "ugaritwaters")
      .move("sumur", "arwad")
      .convoy("sumurwaters", "sumur", "arwad")
      .move("bybloswaters", "sumurwaters")
      .support("ugaritwaters", "bybloswaters", "sumurwaters");
    let r = b.run();
    Assert.equal("sumur", b.where(r, "sumur"));
    Assert.equal("sumurwaters", b.where(r, "bybloswaters"));
    Assert.null(b.where(r, "sumurwaters"));
  });

  test("Convoy paradox resolves by the Szykman rule", () => {
    // The convoyed army attacks the unit supporting the attack on its own convoy.
    let b = new Board()
      .a("Egypt", "sumur")
      .f("Egypt", "sumurwaters")
      .f("Arzawa", "bybloswaters")
      .f("Arzawa", "arwad")
      .move("sumur", "arwad")
      .convoy("sumurwaters", "sumur", "arwad")
      .move("bybloswaters", "sumurwaters")
      .support("arwad", "bybloswaters", "sumurwaters");
    let r = b.run();
    Assert.equal("sumur", b.where(r, "sumur"));
    Assert.equal("sumurwaters", b.where(r, "bybloswaters"));
    Assert.equal("arwad", b.where(r, "arwad"));
    Assert.null(b.where(r, "sumurwaters"));
  });

  test("Walls add nothing to the battle and are stormed only by more than walls and defenders", () => {
    // A lone army gets within empty walls of level 1 but does not storm them: 1 against 1 + 0.
    let single = new Board().a("Hatti", "isuwa").move("isuwa", "carchemish");
    single.walls.set("carchemish", 1);
    let r1 = single.run();
    Assert.equal("carchemish", single.where(r1, "isuwa"));
    let a1 = Assert.single(r1.assaults);
    Assert.equal([1, 1, 0, false], [a1.strength / FullUnit, a1.walls / FullUnit, a1.defenders / FullUnit, stormed(a1)]);
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
    Assert.equal([2, 2, 1, false], [r3.assaults[0].strength / FullUnit, r3.assaults[0].walls / FullUnit, r3.assaults[0].defenders / FullUnit, stormed(r3.assaults[0])]);

    // A move into one's own walled province is no assault.
    let own = new Board().a("Mitanni", "harran").move("harran", "carchemish");
    own.walls.set("carchemish", 2);
    own.owners.set("carchemish", "Mitanni");
    let r4 = own.run();
    Assert.equal("carchemish", own.where(r4, "harran"));
    Assert.empty(r4.assaults);
  });

  test("A city's own men stand on its walls beside the garrison, and the walls multiply them", () => {
    // Item 11e: a walled city's men of fighting age (here 0.6 of a full unit) meet no move in the open: a lone army gets
    // within the walls. A storm must beat the walls' level and the men, the walls doubling them: 1 + 2 x 0.6 = 2.2.
    const people = (p: string): number => (p === "carchemish" ? 600 : 0);
    const run = (b: Board): AdjudicationResult => new Adjudicator(WorldMap.default).run(b.units, b.orders, b.owners, b.walls, [], null, people);
    const lone = new Board().a("Hatti", "isuwa").move("isuwa", "carchemish");
    lone.walls.set("carchemish", 1);
    const r1 = run(lone);
    Assert.equal("carchemish", lone.where(r1, "isuwa"));
    Assert.equal([600, false], [Assert.single(r1.assaults).people, stormed(r1.assaults[0])]);
    const two = new Board().a("Hatti", "isuwa").a("Hatti", "aleppo").move("isuwa", "carchemish").support("aleppo", "isuwa", "carchemish");
    two.walls.set("carchemish", 1);
    Assert.empty(stormedIn(run(two)));
    const three = new Board().a("Hatti", "isuwa").a("Hatti", "aleppo").a("Hatti", "harran").move("isuwa", "carchemish").support("aleppo", "isuwa", "carchemish").support("harran", "isuwa", "carchemish");
    three.walls.set("carchemish", 1);
    Assert.equal(["carchemish"], stormedIn(run(three)));
    // Without walls the same men resist in the open, by their number: a lone army (1) beats 0.6.
    const open = new Board().a("Hatti", "isuwa").move("isuwa", "carchemish");
    Assert.equal("carchemish", open.where(run(open), "isuwa"));
  });

  test("A fleet never storms walls", () => {
    let b = new Board().f("Hatti", "ugaritwaters").f("Hatti", "sumur").move("ugaritwaters", "ugarit").support("sumur", "ugaritwaters", "ugarit");
    b.walls.set("ugarit", 1);
    let r = b.run();
    Assert.equal("ugarit", b.where(r, "ugaritwaters"));
    Assert.false(stormed(Assert.single(r.assaults)));
  });

  test("Mismatched support is void", () => {
    // Ekallate "supports" Ashur into Suhu, but Ashur actually holds.
    let b = new Board()
      .a("Mitanni", "suhu")
      .a("Assyria", "ashur")
      .a("Assyria", "ekallate")
      .a("Babylonia", "durkurigalzu")
      .support("ekallate", "ashur", "suhu")
      .move("durkurigalzu", "ekallate");
    let r = b.run();
    Assert.equal("ekallate", b.where(r, "ekallate"));
    Assert.equal("durkurigalzu", b.where(r, "durkurigalzu"));
  });

  test("Unit moving away lets the attacker in", () => {
    let b = new Board().a("Mitanni", "suhu").a("Assyria", "ashur").move("suhu", "terqa").move("ashur", "suhu");
    b.walls.delete("terqa");
    let r = b.run();
    Assert.equal("terqa", b.where(r, "suhu"));
    Assert.equal("suhu", b.where(r, "ashur"));
  });
});
