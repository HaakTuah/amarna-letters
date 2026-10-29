import { describe, test } from "vitest";
import {
  AdjudicationResult,
  Adjudicator,
  Dict,
  type Order,
  type Power,
  TurnEngine,
  type Unit,
  WorldMap,
  besiege,
  convoy,
  defenceGround,
  first,
  groundText,
  inboxOf,
  move,
  newGame,
  newGameConfig,
  newTurnSubmission,
  newUnit,
  single,
  stormed,
  support,
  FullUnit,
} from "@amarna/engine";
import { Assert, oldWorld } from "./support.ts";

// Terrain (Build order item 5, the siege package; question 5, plan step 14): rough ground, or a mountain pass or a great
// river on the link an attack comes over, give a unit that stands its ground 1 more against that attack, at most 1 in all;
// never a unit that moves or is met head on, never empty land, never walls or a siege's pace. A landing from the sea counted
// too until item 7a, when the blockade took its place.
describe("TerrainTests", () => {
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

    run(terrain: number = 1): AdjudicationResult {
      return new Adjudicator(WorldMap.default, true, terrain).run(this.units, this.orders, this.owners, this.walls);
    }

    where(r: AdjudicationResult, startProvince: string): string | null {
      let u = first(this.units, (x) => x.province === startProvince);
      return r.newPositions.tryGet(u.id) ?? null;
    }
  }

  test("The map names the ground of each attack", () => {
    Assert.equal({ kind: "Rough", name: "mira" }, defenceGround("tuwanuwa", "mira"));
    Assert.equal({ kind: "Pass", name: "the Cilician Gates" }, defenceGround("tuwanuwa", "kizzuwatna"));
    // A crossing protects both its sides.
    Assert.equal({ kind: "Pass", name: "the Cilician Gates" }, defenceGround("kizzuwatna", "tuwanuwa"));
    Assert.equal({ kind: "River", name: "the Euphrates at Carchemish" }, defenceGround("harran", "carchemish"));
    // Since item 7a a landing from the sea gives no help (the blockade decides at sea), nor does the desert.
    Assert.null(defenceGround("enkomiwaters", "enkomi"));
    Assert.null(defenceGround("steppe", "damascus"));
    // Open ground, attacked over open ground: nothing.
    Assert.null(defenceGround("lukka", "kizzuwatna"));
    Assert.null(defenceGround("sinai", "delta"));
    // Rough ground comes first and is the only one named: they never add up.
    Assert.equal("Rough", defenceGround("kalavasos", "kalavasos")!.kind);
    Assert.equal("the rough ground of mira", groundText({ kind: "Rough", name: "mira" }));
    Assert.equal("the Cilician Gates, a mountain pass", groundText({ kind: "Pass", name: "the Cilician Gates" }));
    Assert.equal("the crossing of the Euphrates at Carchemish", groundText({ kind: "River", name: "the Euphrates at Carchemish" }));
  });

  test("A unit holding rough ground needs three to dislodge and empty rough land stays open", () => {
    // Arzawa holds Mira; Hatti attacks from Tuwanuwa with one support (2 against 1 + 1): it bounces.
    let b = new Board().a("Arzawa", "mira").a("Hatti", "tuwanuwa").a("Hatti", "lukka").move("tuwanuwa", "mira").support("lukka", "tuwanuwa", "mira");
    let r = b.run();
    Assert.equal("mira", b.where(r, "mira"));
    Assert.equal("tuwanuwa", b.where(r, "tuwanuwa"));
    let fight = Assert.single(r.groundFights);
    Assert.true(fight.decided);
    Assert.false(fight.won);
    Assert.equal([2, 2], [fight.strength / FullUnit, fight.against / FullUnit]);

    // With two supports (3 against 2) it goes in.
    let c = new Board()
      .a("Arzawa", "mira")
      .a("Hatti", "tuwanuwa")
      .a("Hatti", "lukka")
      .a("Hatti", "seha")
      .move("tuwanuwa", "mira")
      .support("lukka", "tuwanuwa", "mira")
      .support("seha", "tuwanuwa", "mira");
    let rc = c.run();
    Assert.equal("mira", c.where(rc, "tuwanuwa"));
    Assert.true(Assert.single(rc.groundFights).won);

    // Empty rough land: one army walks in.
    let d = new Board().a("Hatti", "tuwanuwa").move("tuwanuwa", "mira");
    let rd = d.run();
    Assert.equal("mira", d.where(rd, "tuwanuwa"));
    Assert.empty(rd.groundFights);
  });

  test("A pass helps against an attack over it but not against one over open ground", () => {
    // Hatti's army in Kizzuwatna is attacked from Tuwanuwa, over the Cilician Gates, with one support: it holds.
    let b = new Board()
      .a("Hatti", "kizzuwatna")
      .a("Arzawa", "tuwanuwa")
      .a("Arzawa", "nesa")
      .move("tuwanuwa", "kizzuwatna")
      .support("nesa", "tuwanuwa", "kizzuwatna");
    Assert.equal("kizzuwatna", b.where(b.run(), "kizzuwatna"));

    // The same attack from Lukka, along the coast: 2 against 1, and the army is destroyed.
    let c = new Board()
      .a("Hatti", "kizzuwatna")
      .a("Arzawa", "lukka")
      .a("Arzawa", "nesa")
      .move("lukka", "kizzuwatna")
      .support("nesa", "lukka", "kizzuwatna");
    let rc = c.run();
    Assert.null(c.where(rc, "kizzuwatna"));
    Assert.empty(rc.groundFights);

    // A great river: an attack on Carchemish from Harran crosses the Euphrates.
    let d = new Board()
      .a("Hatti", "carchemish")
      .a("Mitanni", "harran")
      .a("Mitanni", "isuwa")
      .move("harran", "carchemish")
      .support("isuwa", "harran", "carchemish");
    let rd = d.run();
    Assert.equal("carchemish", d.where(rd, "carchemish"));
    Assert.equal("River", Assert.single(rd.groundFights).ground.kind);
  });

  test("A landing from the sea gets no help from the ground, and rough ground still counts against it", () => {
    // Since item 7a the blockade decides at sea: Hatti's army sails from Ashkelon (Tyre until item 11c) to the Delta in its
    // own ships, one in each waters of the way, with an army's support from Sinai: 2 against Egypt's 1, and the Delta is taken.
    let b = new Board()
      .a("Egypt", "delta")
      .a("Hatti", "ashkelon")
      .a("Hatti", "sinai")
      .f("Hatti", "ashkelonwaters")
      .f("Hatti", "gazawaters")
      .f("Hatti", "deltawaters")
      .move("ashkelon", "delta")
      .convoy("ashkelonwaters", "ashkelon", "delta")
      .convoy("gazawaters", "ashkelon", "delta")
      .convoy("deltawaters", "ashkelon", "delta")
      .support("sinai", "ashkelon", "delta");
    let r = b.run();
    Assert.equal("delta", b.where(r, "ashkelon"));
    Assert.null(b.where(r, "delta"));
    Assert.empty(r.groundFights);

    // Kalavasos is rough ground: a landing there with one support meets 1 + 1 and bounces.
    let d = new Board()
      .a("Alashiya", "kalavasos")
      .a("Egypt", "lukka")
      .f("Egypt", "lukkawaters")
      .f("Egypt", "kalavasoswaters")
      .a("Egypt", "enkomi")
      .move("lukka", "kalavasos")
      .convoy("lukkawaters", "lukka", "kalavasos")
      .convoy("kalavasoswaters", "lukka", "kalavasos")
      .support("enkomi", "lukka", "kalavasos");
    let rd = d.run();
    Assert.equal("lukka", d.where(rd, "lukka"));
    Assert.equal(["Rough", 2, 2], [rd.groundFights[0].ground.kind, rd.groundFights[0].strength / FullUnit, rd.groundFights[0].against / FullUnit]);
  });

  test("A unit whose move fails keeps the ground and one met head on has none", () => {
    // Arzawa's army in Mira tries for Apasa and bounces off its own king's army: it stays, and the rough ground holds it
    // against Hatti's supported attack.
    let b = new Board()
      .a("Arzawa", "mira")
      .a("Arzawa", "apasa")
      .a("Hatti", "tuwanuwa")
      .a("Hatti", "lukka")
      .move("mira", "apasa")
      .move("tuwanuwa", "mira")
      .support("lukka", "tuwanuwa", "mira");
    Assert.equal("mira", b.where(b.run(), "mira"));

    // Head on across the Cilician Gates: both armies are on the road, and the stronger wins as on open ground.
    let c = new Board()
      .a("Hatti", "kizzuwatna")
      .a("Arzawa", "tuwanuwa")
      .a("Arzawa", "nesa")
      .move("kizzuwatna", "tuwanuwa")
      .move("tuwanuwa", "kizzuwatna")
      .support("nesa", "tuwanuwa", "kizzuwatna");
    let rc = c.run();
    Assert.equal("kizzuwatna", c.where(rc, "tuwanuwa"));
    Assert.null(c.where(rc, "kizzuwatna"));
    Assert.empty(rc.groundFights);
  });

  test("A storm must beat the ground too and an empty walled town on rough ground needs only its walls", () => {
    // Lukka (walls 1, rough ground), held by Arzawa's army: 3 gets in (against 1 + 1) but storms only above 1 + 2.
    function lukka(supports: number): Board {
      let b = new Board().a("Arzawa", "lukka").a("Hatti", "tuwanuwa").a("Hatti", "mira").a("Hatti", "kizzuwatna").a("Hatti", "apasa");
      b.walls.set("lukka", 1);
      b.owners.set("lukka", "Arzawa");
      b.move("tuwanuwa", "lukka");
      for (const s of ["mira", "kizzuwatna", "apasa"].slice(0, supports)) b.support(s, "tuwanuwa", "lukka");
      return b;
    }
    let r = lukka(2).run();
    let a = Assert.single(r.assaults);
    Assert.equal([3, 1, 2], [a.strength / FullUnit, a.walls / FullUnit, a.defenders / FullUnit]);
    Assert.false(stormed(a));
    Assert.equal("Rough", a.ground!.kind);
    Assert.true(stormed(Assert.single(lukka(3).run().assaults)));

    // Empty, the town's walls alone stand: 2 storms them.
    let e = new Board().a("Hatti", "tuwanuwa").a("Hatti", "mira").move("tuwanuwa", "lukka").support("mira", "tuwanuwa", "lukka");
    e.walls.set("lukka", 1);
    let ea = Assert.single(e.run().assaults);
    Assert.true(stormed(ea));
    Assert.null(ea.ground);
  });

  test("A besieger on rough ground has the ground against a relief", () => {
    // Hatti's army stands within the walls of Arzawa's Lukka; Arzawa's relief from Mira, with Apasa's support, bounces off
    // it (2 against 1 + 1): the ground helps whoever stands his ground there (a reading; no rule asks who holds the city).
    let b = new Board().a("Hatti", "lukka").a("Arzawa", "mira").a("Arzawa", "apasa").move("mira", "lukka").support("apasa", "mira", "lukka");
    b.walls.set("lukka", 1);
    b.owners.set("lukka", "Arzawa");
    b.orders.set("lukka", besiege("lukka"));
    Assert.equal("lukka", b.where(b.run(), "lukka"));
  });

  test("Terrain set to nothing turns it off", () => {
    let b = new Board().a("Arzawa", "mira").a("Hatti", "tuwanuwa").a("Hatti", "lukka").move("tuwanuwa", "mira").support("lukka", "tuwanuwa", "mira");
    let r = b.run(0);
    Assert.equal("mira", b.where(r, "tuwanuwa"));
    Assert.empty(r.groundFights);
  });

  test("The battle report gives the grounds share and the record marks what it decided", () => {
    let s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));
    // Hatti attacks Arzawa's Mira from Tuwanuwa with Lukka's support; Arzawa's army there holds.
    single(s.units, (u) => u.province === "hattusa").province = "tuwanuwa";
    single(s.units, (u) => u.province === "nesa").province = "lukka";
    s.walls.delete("lukka");
    s.owner.set("lukka", "Hatti");
    new TurnEngine(s).resolve(new Dict([["Hatti", newTurnSubmission({ orders: [move("tuwanuwa", "mira"), support("lukka", "tuwanuwa", "mira")] })]]));
    let hatti = single(inboxOf(s, "Hatti"), (i) => i.title === "Movements last season").body;
    Assert.contains(
      "- A tuwanuwa -> mira: fails: the unit holding mira (Arzawa's army) kept its place; your strength 2 against 2, 1 of it for the rough ground of mira; so your army stays in tuwanuwa",
      hatti,
    );
    let e = Assert.single(s.events, (x) => x.kind === "terrain");
    Assert.equal("terrain-held", e.signal);
    Assert.equal("Arzawa's army in Mira held against Hatti's attack from Tuwanuwa by the rough ground of mira (strength 2 against 2).", e.text);
  });

  test("A storm report gives the grounds share of the defenders", () => {
    let s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));
    // Hatti, with three armies round Arzawa's Isuwa (walls 1, rough ground), gets in but cannot storm it.
    s.owner.set("isuwa", "Arzawa");
    s.units.push(newUnit({ id: "u90", power: "Arzawa", kind: "Army", province: "isuwa" }));
    s.units.push(newUnit({ id: "u91", power: "Hatti", kind: "Army", province: "carchemish" }));
    single(s.units, (u) => u.province === "hattusa").province = "sapinuwa";
    new TurnEngine(s).resolve(
      new Dict([
        [
          "Hatti",
          newTurnSubmission({ orders: [move("nesa", "isuwa"), support("sapinuwa", "nesa", "isuwa"), support("carchemish", "nesa", "isuwa")] }),
        ],
      ]),
    );
    let hatti = single(inboxOf(s, "Hatti"), (i) => i.title === "Movements last season").body;
    Assert.contains(
      "it got within the walls of isuwa but did not storm them (strength 3 against walls 1 and defenders 2, 1 of it for the rough ground of isuwa)",
      hatti,
    );
    let arzawa = single(inboxOf(s, "Arzawa"), (i) => i.title === "Movements last season").body;
    Assert.contains("its strength 3 against your walls 1 and defenders 2, 1 of it for the rough ground of isuwa", arzawa);
  });
});
