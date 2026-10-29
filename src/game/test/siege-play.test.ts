import { describe, test } from "vitest";
import { orders } from "../../llm/src/parse.ts";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { Contingencies } from "../src/bots/contingencies.ts";
import { CapitalAtStake, Search } from "../src/bots/search.ts";
import { court } from "../src/bots/statecraft-court.ts";
import { Statecraft } from "../src/bots/statecraft.ts";
import { MilitaryPlan, Tactics } from "../src/bots/tactics.ts";
import {
  type Character,
  Dict,
  type DispatchOrder,
  type GameState,
  type MoveOrder,
  OrderValidator,
  type Power,
  type SupportOrder,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  besiege,
  count,
  dispatch,
  first,
  fortify,
  hold,
  inboxOf,
  king,
  newGame,
  newGameConfig,
  newId,
  newInboxItem,
  newSiege,
  EconomyData,
  newTablet,
  newTabletCopy,
  newTurnSubmission,
  newUnit,
  sally,
  single,
  support,
} from "@amarna/engine";
import { ScriptLeader, temperament } from "@amarna/game";
import { removeAll, Assert, holds, orderBy, walled, oldWorld, unruled } from "../../engine/test/support.ts";
import { move as moveOrder } from "@amarna/engine";

// The script players' audit of the siege package (Build order item 5, "Every feature is every seat's"): weaknesses found in
// script games on the new rules, each patched and tested here.
describe("SiegePlayTests", () => {
  // Seed 1: Babylonia's army besieges Ashur (walls 3), just begun, with a second army in Ekallate to support it, and Assyria's
  // envoy is sure to be caught leaving.
  function ashurBesieged(): [GameState, Character] {
    let s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0, siegeCatchMin: 100, siegeCatchMax: 100 })));
    removeAll(s.units, (u) => ["ashur", "ekallate"].includes(u.province));
    let army = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "ashur" });
    s.units.push(army);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "ekallate" }));
    s.owner.set("ekallate", "Babylonia");
    s.sieges.push(newSiege({ province: "ashur", power: "Babylonia", unitId: army.id, progress: 0, since: 1 }));
    let envoy = first(s.characters, (c) => c.employer === "Assyria" && c.secretMaster === null);
    envoy.traits.courage = 100;
    return [s, envoy];
  }

  function season(s: GameState, orders: Dict<Power, TurnSubmission>): void {
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
  }

  // <summary>A tablet two kings sealed, with a copy in each archive: a treaty, or an alliance.</summary>
  function treaty(s: GameState, a: Power, b: Power, alliance: boolean): void {
    let t = newTablet({
      id: newId(s, "t"),
      text: alliance ? Statecraft.allianceTablet(a, b) : Statecraft.peaceTablet(a, b),
      proposedBy: a,
      partner: b,
      seals: [a, b],
      createdTurn: 1,
      sealedTurn: 1,
      allianceOath: alliance,
    });
    s.tablets.push(t);
    for (const holder of [a, b])
      s.copies.push(newTabletCopy({ id: newId(s, "k"), tabletId: t.id, holder: holder, acquiredTurn: 1, source: "sealed at audience" }));
  }

  // Seed 1, turn 5: Babylonia's army besieges Ashur (walls 3), alone; Mitanni, Assyria's ally, has armies in Terqa and in
  // Nineveh (taken from Assyria for the test), both next to Ashur.
  function allyBesieged(): GameState {
    // Mira and Seha nobody's: held by Arzawa beyond its homeland (item 11d), they make it look a runaway leader.
    let s = unruled(oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 }))), "mira", "seha");
    s.turn = 5;
    removeAll(s.units, (u) => ["ashur", "nineveh"].includes(u.province));
    let army = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "ashur" });
    s.units.push(army);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "nineveh" }));
    s.owner.set("nineveh", "Mitanni");
    s.sieges.push(newSiege({ province: "ashur", power: "Babylonia", unitId: army.id, progress: 1, since: 4 }));
    treaty(s, "Mitanni", "Assyria", true);
    return s;
  }

  test("A script king drives the besiegers out of an ally s city without storming it", async () => {
    let s = allyBesieged();
    let sub = await new ScriptLeader(1).decide(Views.for(s, "Mitanni"));
    let move = Assert.single(
      sub.orders.filter((o): o is MoveOrder => o.type === "move"),
      (m) => m.to === "ashur",
    );
    let supports = count(
      sub.orders.filter((o): o is SupportOrder => o.type === "support"),
      (x) => x.supported === move.unit && x.to === "ashur",
    );
    // Enough to beat the besieger standing alone (strength 2 against 1); never enough to storm the walls of 3, with the
    // walls' sally of 1 counted, so the city stays Assyria's.
    Assert.inRange(1 + supports, 2, 3);
    Assert.doesNotContain(new OrderValidator(s).validate("Mitanni", sub).rejected, (r) => r.order.type === "move" || r.order.type === "support");

    // Assyria's walls sally for its ally's troop next to Ashur, when Assyria makes no move of its own into it.
    let v = Views.for(s, "Assyria");
    let brain = new Brain("Assyria", 1);
    brain.learn(v, new Board(v));
    Assert.equal([sally("ashur", "nineveh")], Tactics.sallies(new Board(v), [], brain));
    Assert.empty(Tactics.sallies(new Board(v), []));

    // Played out: the besiegers are driven out, Ashur stays Assyria's, and Assyria counts its ally's blow no wrong.
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(
      new Dict([
        ["Mitanni", newTurnSubmission({ orders: [moveOrder("nineveh", "ashur"), support("terqa", "nineveh", "ashur")] })],
        ["Babylonia", newTurnSubmission({ orders: [besiege("ashur")] })],
        ["Assyria", newTurnSubmission({ orders: [sally("ashur", "nineveh")] })],
      ]),
    );
    Assert.equal("Assyria", s.owner.get("ashur"));
    Assert.empty(s.sieges);
    Assert.equal("Mitanni", single(s.units, (u) => u.province === "ashur").power);
    let after = Views.for(s, "Assyria");
    brain.learn(after, new Board(after));
    Assert.equal([0, 0.0], [brain.rel.get("Mitanni").oathsBroken, brain.rel.get("Mitanni").grudge]);
    Assert.true(brain.isFriend("Mitanni"));
  });

  test("A besieged script king pleads with its ally and the ally hears the plea", async () => {
    let s = allyBesieged();
    let sub = await new ScriptLeader(1).decide(Views.for(s, "Assyria"));
    let plea = Assert.single(
      sub.orders.filter((o): o is DispatchOrder => o.type === "dispatch"),
      (d) => d.to === "Mitanni",
    );
    Assert.startsWith(
      "My brother, the troops of Babylonia besiege my city of Ashur. Come to my aid: send your troops to drive them out, and my walls will sally to meet them.",
      plea.letter,
    );
    Assert.equal(0, plea.gold);
    // The ally reads it, as it would a model king's words.
    let b = new Board(Views.for(s, "Mitanni"));
    Assert.equal([["ashur", "Babylonia"]], [...Statecraft.pleasIn(plea.letter, b, "Assyria", "Mitanni")]);
    Assert.equal(
      [["ashur", "Babylonia"]],
      [...Statecraft.pleasIn("Hear me, brother! Ashur is besieged by the Babylonians, and my people starve.", b, "Assyria", "Mitanni")],
    );
    // Not a plea: no siege, or no besieger named, or the host himself named as the besieger.
    Assert.empty([...Statecraft.pleasIn("Ashur stands strong, and Babylonia is far away.", b, "Assyria", "Mitanni")]);
    Assert.empty([...Statecraft.pleasIn("Ashur is besieged.", b, "Assyria", "Mitanni")]);
    Assert.empty([...Statecraft.pleasIn("Your troops of Mitanni besiege my city of Ashur.", b, "Assyria", "Mitanni")]);
  });

  // In the first year its gold goes to cities first.
  // A further level adds nothing against fleets, which never take walls of any height.
  test.each([
    [5, 0, true],
    [2, 0, false],
    [5, 1, false],
  ] as const)("A script king walls an open coast that only a fleet threatens %s", async (turn: number, walls: number, fortifies: boolean) => {
    // Egypt's fleet stands next to Alashiya's Kalavasos, which has no troop; no army can reach the island.
    let s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));
    s.turn = turn;
    s.treasuries.get("Alashiya").gold = 2000;
    single(s.units, (u) => u.province === "delta").province = "kalavasoswaters";
    if (walls > 0) s.walls.set("kalavasos", walls);
    let sub = await new ScriptLeader(1).decide(Views.for(s, "Alashiya"));
    Assert.equal(fortifies, holds(sub.orders, fortify("kalavasos")));
  });

  test("A script king takes a host s offer to its envoy as a slight and trusts the envoy that refused", async () => {
    // Egypt's two envoys are home; one reports that the king of Karduniash offered it a post, and it refused.
    let s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));
    s.turn = 4;
    s.treasuries.get("Egypt").gold = 3000;
    let envoys = orderBy(
      s.characters.filter((c) => c.employer === "Egypt" && c.secretMaster === null),
      (c) => c.id,
    );
    let loyal = envoys.at(-1)!;
    function report(body: string): void {
      inboxOf(s, "Egypt").push(newInboxItem({ turn: 4, kind: "EnvoyReport", title: `${loyal.name} returns`, body: body, subject: loyal.id }));
    }
    let plain = 'At the court of Karduniash the king received me. He said: "I have heard his words."';
    report(plain);
    let v = Views.for(s, "Egypt");
    let before = new Brain("Egypt", 1);
    before.learn(v, new Board(v));

    inboxOf(s, "Egypt").length = 0;
    report(plain + " The king of Karduniash offered me a post in his service, and I refused it: I serve you alone.");
    v = Views.for(s, "Egypt");
    let after = new Brain("Egypt", 1);
    after.learn(v, new Board(v));
    Assert.equal(before.rel.get("Babylonia").trust - 0.05, after.rel.get("Babylonia").trust, 6);
    Assert.contains(loyal.id, after.provenLoyal);
    Assert.doesNotContain(loyal.id, before.provenLoyal);

    // Among the equally reliable it is the first sent with a tablet or gold: here, with a gift to a friend, or a peace tablet.
    // Since item 7a free Gaza and Jerusalem lie between Egypt and every great king: Babylonia's Jerusalem makes a neighbour.
    treaty(s, "Egypt", "Hatti", false);
    s.owner.set("jerusalem", "Babylonia");
    let sub = await new ScriptLeader(1).decide(Views.for(s, "Egypt"));
    let trusted = sub.orders.filter((o): o is DispatchOrder => o.type === "dispatch").filter((d) => d.proposal !== null || d.gold > 0);
    Assert.notEmpty(trusted);
    Assert.equal(loyal.id, trusted[0].envoy);
  });

  test("The look ahead counts a foreign army within its own capital as a kingdom at stake", () => {
    // A foreign army that just got within walls of 3: a ninth of a city's worth, but a quarter of our capital's, which holds
    // the kingdom (its worth counts all the rest of our land).
    Assert.equal((0.45 * 0.5) / 4, Search.stake(false, 0, 0, 3), 6);
    Assert.equal(CapitalAtStake, Search.stake(true, 0, 0, 3), 6);
    Assert.equal(0.25, CapitalAtStake);
    // Worn down further, the siege counts as it did.
    Assert.equal((0.45 * 3.5) / 4, Search.stake(true, 2, 1, 3), 6);
    Assert.equal(Search.stake(false, 2, 1, 3), Search.stake(true, 2, 1, 3), 6);
  });

  test("A script king values land by what it yields while absorbed", () => {
    // Turn 6: Assyria took Terqa (Mitanni's, yield 30) last season, and holds Nineveh of its own homeland.
    let s = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));
    s.turn = 6;
    s.owner.set("terqa", "Assyria");
    s.conquered.set("terqa", 5);
    let assyria = new Board(Views.for(s, "Assyria"));
    // Land it would take by force yields a third, then two thirds: a season's yield lost.
    Assert.equal(WorldMap.default.get("harran").yield, assyria.absorptionLoss("harran"), 6);
    // Terqa, taken last season, has a third of a season's yield still to lose (two thirds next season).
    Assert.equal(WorldMap.default.get("terqa").yield / 3.0, assyria.absorptionLoss("terqa"), 6);
    // Its own homeland counts in full, held or retaken; so does land held from the start.
    Assert.equal(0, assyria.absorptionLoss("nineveh"));
    // To Mitanni, Harran is its own homeland: retaken, it counts in full (Terqa is Hana's own since item 11d).
    s.owner.set("harran", "Assyria");
    s.conquered.set("harran", 5);
    Assert.equal(0, new Board(Views.for(s, "Mitanni")).absorptionLoss("harran"));
  });

  test("A script king s besieging army with nothing to help it slips away as the relief falls", () => {
    // Babylonia's army besieges Assyria's Suhu (walls 2 here, so the walls may sally); Assyria's army in Ekallate stands
    // next to it, and no troop of Babylonia's can reach Suhu. The Sutean steppe, beyond it, is free, open and out of
    // Assyria's reach.
    let s = walled(oldWorld(newGame(1, newGameConfig({ endMedian: 10000, catastropheChance: 0 }))), "suhu", 2);
    s.turn = 6;
    removeAll(s.units, (u) => u.province === "sippar");
    let army = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "suhu" });
    s.units.push(army);
    s.owner.set("suhu", "Assyria");
    s.sieges.push(newSiege({ province: "suhu", power: "Babylonia", unitId: army.id, progress: 1, since: 5 }));
    let v = Views.for(s, "Babylonia");
    let brain = new Brain("Babylonia", 9);
    brain.learn(v, new Board(v));
    let b = new Board(v);
    let plan = new MilitaryPlan();
    for (const u of b.mine) plan.orders.set(u.province, u.province === "suhu" ? besiege("suhu") : hold(u.province));
    let [, give] = Contingencies.plan(b, brain, plan, []);
    // One army and the walls' sally beat it standing alone: when it is attacked, it slips away rather than be destroyed (the
    // siege is lost either way).
    let g = Assert.single(give, (x) => x.place === "suhu");
    Assert.equal(["Retreat", "UnitAttacked"], [g.kind, g.request.when]);
    Assert.equal([moveOrder("suhu", "steppe")], g.request.orders);
    // A besieging army is never called away to help elsewhere: it would not press its siege.
    Assert.doesNotContain(give, (x) =>
      x.request.orders.some((o) => (o.type === "support" && o.unit === "suhu") || (o.type === "move" && o.unit === "suhu" && x.place !== "suhu")),
    );
  });

  test("A script captor lets go at once an envoy whose king has fallen", async () => {
    // The envoy is caught leaving Ashur; the next season Ashur surrenders, and Assyria falls.
    let [s, envoy] = ashurBesieged();
    let press = newTurnSubmission({ orders: [besiege("ashur"), support("ekallate", "ashur")] });
    season(
      s,
      new Dict([
        [
          "Assyria",
          newTurnSubmission({ orders: [dispatch(envoy.id, "Egypt", "Send your armies, brother: Ashur is besieged.", { mandate: "Promise anything." })] }),
        ],
        ["Babylonia", press],
      ]),
    );
    Assert.equal(["Captured", "Babylonia"], [envoy.status, envoy.heldBy]);
    // Worn nearly through (since item 9+a, three seasons a level): the supported season breaches the walls.
    single(s.sieges).progress = 3 * EconomyData.breachPerLevel - 2;
    season(s, new Dict([["Babylonia", press]]));
    Assert.contains("Assyria", s.eliminated);
    Assert.equal(["Captured", "Babylonia"], [envoy.status, envoy.heldBy]);
    let v = Views.for(s, "Babylonia");
    // The captor knows whose envoy it was, and that his kingdom is no more: nobody is left to pay a ransom.
    Assert.equal("Assyria", single(v.known, (c) => c.id === envoy.id).employer);
    let sub = await new ScriptLeader(1).decide(v);
    // Babylonia's temperament asks a ransom of a captive (honesty above 0.5); for this one it would wait in vain.
    Assert.true(temperament("Babylonia", 1).honesty > 0.5);
    Assert.contains(sub.orders, (o) => o.type === "captive" && o.fate === "Release" && o.character === envoy.id);
    Assert.doesNotContain(sub.orders, (o) => o.type === "captive" && o.fate === "Ransom" && o.character === envoy.id);
  });
});
