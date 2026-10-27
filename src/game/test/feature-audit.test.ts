import { describe, test } from "vitest";
import { Board } from "../src/bots/board.ts";
import { Brain } from "../src/bots/brain.ts";
import { archetype } from "../src/bots/personality.ts";
import { Statecraft } from "../src/bots/statecraft.ts";
import { MilitaryPlan } from "../src/bots/tactics.ts";
import { TextKit } from "../src/bots/textkit.ts";
import {
  AllPowers,
  ownedBy,
  type AudienceView,
  type AuthenticateOrder,
  type CaptiveOrder,
  type ConvoyOrder,
  type DispatchOrder,
  type GameState,
  HSet,
  type Order,
  OrderValidator,
  type Power,
  Rng,
  type TabletCopy,
  type UnitKind,
  Views,
  cede,
  characterOf,
  disband,
  dismiss,
  formatMoney,
  giftUnit,
  hold,
  move,
  newAudienceView,
  newDispatch,
  newFact,
  newGame,
  newId,
  newTablet,
  newTabletCopy,
  newTabletView,
  newUnit,
  notify,
  range,
  recall,
  roundEven,
} from "@amarna/engine";
import { type Personality, ScriptLeader, ScriptMind, newEnvoyContext, temperament } from "@amarna/game";
import { removeAll, Assert } from "../../engine/test/support.ts";
import { first as firstOf } from "@amarna/engine";

// The feature audit of the fix pass after item 4 ("Every feature is every seat's"): the features script kings never
// used, or used without success, and how they use them now.
describe("FeatureAuditTests", () => {
  const Seed: number = 9;

  function brainFor(s: GameState, me: Power, p: Personality | null = null): Brain {
    let v = Views.for(s, me);
    let brain = p === null ? new Brain(me, Seed) : new Brain(me, Seed, p);
    brain.learn(v, new Board(v));
    return brain;
  }

  // <summary>A tablet two kings sealed, with a copy in the first one's archive: a treaty (or an alliance), so the two are friends.</summary>
  function treaty(s: GameState, a: Power, b: Power, alliance: boolean = false): void {
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
    s.copies.push(newTabletCopy({ id: newId(s, "k"), tabletId: t.id, holder: a, acquiredTurn: 1, source: "sealed at audience" }));
  }

  // <summary>An inventory of gold  sent, stating  shekels, in the receiver's archive.</summary>
  function inventory(s: GameState, from: Power, to: Power, stated: number, forged: boolean): TabletCopy {
    let t = newTablet({
      id: newId(s, "t"),
      text: `The inventory of the gold ${from} sends to ${to}: ${formatMoney(stated)}.`,
      proposedBy: from,
      seals: [from],
      createdTurn: 2,
      sealedTurn: 2,
      inventory: true,
      forged: forged,
      forgerSkill: forged ? 60 : 0,
    });
    s.tablets.push(t);
    let copy = newTabletCopy({ id: newId(s, "k"), tabletId: t.id, holder: to, acquiredTurn: 3, source: `the inventory brought by Mane, envoy of ${from}` });
    s.copies.push(copy);
    return copy;
  }

  function add(s: GameState, p: Power, kind: UnitKind, province: string): void {
    s.units.push(newUnit({ id: newId(s, "u"), power: p, kind: kind, province: province }));
  }

  // ------------------------------------------------------------------ inventories and thieves

  test("A script king examines an inventory that weighed light and spends more on it", async () => {
    let s = newGame(Seed);
    s.turn = 6;
    s.treasuries.get("Egypt").gold = 5000;
    // Lots kings send come in round sums: these stop short of one, as a skimmer's forged inventory does.
    let light = new HSet(range(0, 10).map((i) => inventory(s, "Hatti", "Egypt", 17 + 10 * i, true).id));
    let sub = await new ScriptLeader(Seed).decide(Views.for(s, "Egypt"));
    // One examination a season, of an inventory that weighed light, with 40 shekels more than for a tablet shown.
    let exam = Assert.single(sub.orders.filter((o): o is AuthenticateOrder => o.type === "authenticate"));
    Assert.contains(exam.copy, light);
    Assert.equal(Math.trunc(30 + 50 * temperament("Egypt", Seed).caution) + 40, exam.spend);
    Assert.contains(exam, new OrderValidator(s).validate("Egypt", sub).accepted);
  });

  test("A script king lets go a servant exposed as a thief once it is at court", async () => {
    let s = newGame(Seed);
    s.turn = 6;
    s.treasuries.get("Egypt").gold = 5000;
    let servants = s.characters.filter((c) => c.employer === "Egypt");
    servants[0].facts.push(
      newFact({ id: newId(s, "f"), text: "Exposed as the forger of an inventory of gold bearing the seal of Egypt.", secrecy: "Public", tag: "forger" }),
    );
    let orders = (await new ScriptLeader(Seed).decide(Views.for(s, "Egypt"))).orders;
    Assert.contains(dismiss(servants[0].id), orders);
    Assert.doesNotContain(dismiss(servants[1].id), orders);
    Assert.doesNotContain(orders, (o) => o.type !== "dismiss" && characterOf(o) === servants[0].id);
  });

  test("A lot brought home lighter than its inventory marks the envoy as a thief", async () => {
    let s = newGame(Seed);
    s.turn = 6;
    s.treasuries.get("Egypt").gold = 5000;
    let envoy = firstOf(s.characters, (c) => c.employer === "Egypt");
    notify(
      s,
      "Egypt",
      "EnvoyReport",
      `${envoy.name} returns`,
      "My lord, I have returned from the court of Hatti.\n\n[The inventory lists 45 shekels of gold; your weighers found 40 shekels.]",
      envoy.id,
    );
    let orders = (await new ScriptLeader(Seed).decide(Views.for(s, "Egypt"))).orders;
    Assert.contains(dismiss(envoy.id), orders);

    // A lot that weighed what its inventory said marks nobody.
    s = newGame(Seed);
    s.turn = 6;
    s.treasuries.get("Egypt").gold = 5000;
    envoy = firstOf(s.characters, (c) => c.employer === "Egypt");
    notify(
      s,
      "Egypt",
      "EnvoyReport",
      `${envoy.name} returns`,
      "My lord, I have returned from the court of Hatti.\n\n[The inventory lists 40 shekels of gold; your weighers found 40 shekels.]",
      envoy.id,
    );
    Assert.doesNotContain(dismiss(envoy.id), (await new ScriptLeader(Seed).decide(Views.for(s, "Egypt"))).orders);
  });

  test("A script king remembers a hand that botched a forgery and people held elsewhere", () => {
    let s = newGame(Seed);
    s.turn = 4;
    let forger = firstOf(s.characters, (c) => c.employer === "Hatti");
    let held = firstOf(s.characters, (c) => c.status === "Free");
    notify(s, "Hatti", "Rejected", "Forgery botched", `${forger.name} lacks the skill; the clay is ruined and nothing usable came of it.`, forger.id);
    notify(
      s,
      "Hatti",
      "Rejected",
      "Orders that could not be carried out",
      `- hire ${held.id} at 20 a season: ${held.name} is held at the court of Assyria and cannot come to yours`,
    );
    let brain = brainFor(s, "Hatti");
    Assert.contains(forger.id, brain.noHand);
    Assert.contains(held.id, brain.heldElsewhere);
  });

  // ------------------------------------------------------------------ troops and land

  test("A unit that must go is given to a friend next to it but never one in our own land", () => {
    let s = newGame(Seed);
    s.turn = 5;
    s.treasuries.get("Egypt").gold = 0;
    treaty(s, "Egypt", "Alashiya");
    add(s, "Egypt", "Army", "thebes");
    add(s, "Egypt", "Army", "sinai");
    // Nubia (added in item 7a, after this test was written) is left out of Egypt's land, so its income is what it was.
    s.owner.set("nubia", null);
    // A fleet at sea next to Enkomi, Alashiya's: upkeep the treasury cannot carry.
    add(s, "Egypt", "Fleet", "enkomiwaters");
    // And Alashiya's land next to Sinai too.
    s.owner.set("gaza", "Alashiya");
    s.walls.delete("gaza");
    // Its people's purses empty (item 9+a): its markets can pay it next to nothing.
    for (const p of ownedBy(s, "Egypt")) s.markets.get(p).purse = 0;

    let [plan] = economy(s, "Egypt");
    Assert.equal(giftUnit("enkomiwaters", "Alashiya"), plan.orders.get("enkomiwaters"));
    Assert.doesNotContain([...plan.orders.values()], (o) => o.type === "giftUnit" && o.unit !== "enkomiwaters");

    // Without the fleet at sea, and with wages the treasury cannot carry, the unit that goes stands in Egypt's own land,
    // next to Alashiya's Gaza: it is disbanded, since a friend's army standing in Sinai would take Sinai with it.
    removeAll(s.units, (u) => u.province === "enkomiwaters");
    for (const c of s.characters.filter((c) => c.employer === "Egypt")) c.contract!.wage = 40;
    [plan] = economy(s, "Egypt");
    Assert.equal(disband("sinai"), plan.orders.get("sinai"));
    Assert.doesNotContain([...plan.orders.values()], (o) => o.type === "giftUnit");
  });

  // <summary>The treasury step of a script king of , with every unit holding.</summary>
  function economy(s: GameState, me: Power, prepare: ((a0: Brain) => void) | null = null): [MilitaryPlan, Order[]] {
    let v = Views.for(s, me);
    let brain = brainFor(s, me);
    prepare?.(brain);
    let board = new Board(v, brain.remembered(v), brain.treasury);
    let plan = new MilitaryPlan();
    for (const u of board.mine) {
      plan.orders.set(u.province, hold(u.province));
      plan.role.set(u.province, "hold");
    }
    let orders: Order[] = [];
    Statecraft.economy(board, brain, plan, orders, Rng.for(Seed, s.turn, "test", "economy"));
    return [plan, orders];
  }

  test("Land a king cannot keep is ceded to a friend before a rival ahead of it takes it", () => {
    let s = newGame(Seed);
    s.turn = 6;
    // Egypt holds Qadesh, far from its troops. Hatti, hostile and well ahead, stands next to it; so does Mitanni, a friend.
    s.owner.set("qadesh", "Egypt");
    s.walls.delete("qadesh");
    for (const x of ["isuwa", "ugarit", "carchemish", "nuhashshe"]) {
      s.owner.set(x, "Hatti");
      s.walls.delete(x);
    }
    add(s, "Hatti", "Army", "nuhashshe");
    add(s, "Mitanni", "Army", "qatna");
    treaty(s, "Egypt", "Mitanni");

    let [, orders] = economy(s, "Egypt", (brain) => (brain.rel.get("Hatti").grudge = 5));
    Assert.contains(cede("qadesh", "Mitanni"), orders);

    // Land a friend ceded to it is kept, not passed on: the friend's word of it is remembered, with gratitude.
    notify(s, "Egypt", "Resolution", "Land received", "Mitanni has ceded Qadesh to you.");
    [, orders] = economy(s, "Egypt", (brain) => {
      brain.rel.get("Hatti").grudge = 5;
      Assert.contains("qadesh", brain.received);
      Assert.true(brain.rel.get("Mitanni").trust >= 0.3);
    });
    Assert.doesNotContain(orders, (o) => o.type === "cede");

    // Without a rival near it there is nothing to deny: it is kept.
    s = newGame(Seed);
    s.turn = 6;
    s.owner.set("qadesh", "Egypt");
    s.walls.delete("qadesh");
    add(s, "Mitanni", "Army", "qatna");
    treaty(s, "Egypt", "Mitanni");
    [, orders] = economy(s, "Egypt", (brain) => (brain.rel.get("Hatti").grudge = 5));
    Assert.doesNotContain(orders, (o) => o.type === "cede");
  });

  // Alashiya alone on the map: an army on Kalavasos and its fleets, with Lukka a free city whose walls are down; late
  // enough that the troops every court saw at the start are out of mind, and in summer, when the open sea is sailed.
  function island(...fleetsAt: string[]): GameState {
    let s = newGame(Seed);
    s.turn = 6;
    s.units.length = 0;
    add(s, "Alashiya", "Army", "kalavasos");
    for (const at of fleetsAt) add(s, "Alashiya", "Fleet", at);
    s.walls.delete("lukka");
    return s;
  }

  test("An army with nothing to take by land is carried over the sea", async () => {
    // A fleet in its coast's waters and one in Lukka's, across the open sea: the army is convoyed to the empty coast beyond,
    // each fleet of the chain convoying it (item 7a: an army lands only from the waters of the coast it lands on).
    let s = island("kalavasoswaters", "lukkawaters");
    let orders = (await new ScriptLeader(Seed).decide(Views.for(s, "Alashiya"))).orders;
    let convoys = orders.filter((o): o is ConvoyOrder => o.type === "convoy");
    Assert.equal(["kalavasoswaters", "lukkawaters"], convoys.map((c) => c.unit).sort());
    Assert.true(convoys.every((c) => c.army === "kalavasos" && c.to === "lukka"));
    Assert.contains(move("kalavasos", "lukka"), orders);

    // The fleets are in port at Enkomi and off Lukka: the one in port puts to sea first, ready to carry the army.
    s = island("enkomi", "lukkawaters");
    orders = (await new ScriptLeader(Seed).decide(Views.for(s, "Alashiya"))).orders;
    Assert.contains(move("enkomi", "enkomiwaters"), orders);
    Assert.empty(orders.filter((o): o is ConvoyOrder => o.type === "convoy"));
  });

  // ------------------------------------------------------------------ spies, captives, held envoys

  test("A spy watching a court that has fallen is recalled", async () => {
    let s = newGame(Seed);
    s.turn = 8;
    s.treasuries.get("Egypt").gold = 5000;
    let spy = firstOf(s.characters, (c) => c.employer === "Egypt");
    spy.duty = "SpyPosted";
    spy.missionTarget = "Assyria";
    spy.at = "Assyria";
    let king = new ScriptLeader(Seed);
    Assert.doesNotContain(recall(spy.id), (await king.decide(Views.for(s, "Egypt"))).orders);

    s.turn = 9;
    s.eliminated.push("Assyria");
    // Once word of the fall has reached Egypt (item 7b).
    s.fallsHeard.set("Egypt", ["Assyria"]);
    let sub = await king.decide(Views.for(s, "Egypt"));
    Assert.contains(recall(spy.id), sub.orders);
    Assert.contains(recall(spy.id), new OrderValidator(s).validate("Egypt", sub).accepted);
  });

  test("A captive nobody will pay for goes free unless the captor is vengeful", async () => {
    let s = newGame(Seed);
    s.turn = 6;
    let spy = firstOf(s.characters, (c) => c.employer === "Hatti");
    spy.status = "Captured";
    spy.heldBy = "Mitanni";
    spy.at = "Mitanni";
    spy.duty = "None";
    notify(
      s,
      "Mitanni",
      "Rejected",
      "Orders that could not be carried out",
      `- ransom the captive ${spy.id}: Hatti's kingdom has fallen: nobody is left to pay. ${spy.name} remains your captive`,
    );
    let orders = (await new ScriptLeader(Seed).decide(Views.for(s, "Mitanni"))).orders;
    let fate = Assert.single(orders.filter((o): o is CaptiveOrder => o.type === "captive")).fate;
    Assert.equal(temperament("Mitanni", Seed).vengeance > 0.75 ? "Execute" : "Release", fate);
  });

  test("A held envoy whose king is gone is let go like any other", async () => {
    let s = newGame(Seed);
    let held = firstOf(s.characters, (c) => c.status === "Free");
    held.heldBy = "Egypt";
    held.at = "Egypt";
    let king = new ScriptLeader(Seed);
    let wait = roundEven(1 + 3 * temperament("Egypt", Seed).vengeance);
    s.turn = 3;
    Assert.doesNotContain((await king.decide(Views.for(s, "Egypt"))).orders, (o) => o.type === "release");
    s.turn = 3 + wait;
    Assert.contains((await king.decide(Views.for(s, "Egypt"))).orders, (o) => o.type === "release" && o.character === held.id);
  });

  test("A careful rich king pays watchmen only when spies are likely to come", () => {
    // Egypt at its starting strength, leading nobody; its spare gold set high.
    let s = newGame(Seed);
    s.turn = 8;
    function courtOf(prepare: (a0: Brain) => void): Order[] {
      let v = Views.for(s, "Egypt");
      let brain = brainFor(s, "Egypt", { ...archetype("Egypt"), caution: 0.9 });
      brain.spareGold = 1000;
      prepare(brain);
      let orders: Order[] = [];
      Statecraft.court(new Board(v, brain.remembered(v), brain.treasury), brain, orders, new HSet<string>(), Rng.for(Seed, 8, "test", "court"));
      return orders;
    }
    Assert.doesNotContain(
      courtOf((_) => {}),
      (o) => o.type === "counterIntel",
    );
    // A king that attacked us lately may send a spy after his troops.
    Assert.contains(
      courtOf((brain) => (brain.rel.get("Hatti").lastAttackedUs = 7)),
      (o) => o.type === "counterIntel",
    );
  });

  // ------------------------------------------------------------------ audiences

  function audience(p: Personality | null = null, shape: ((a0: AudienceView) => void) | null = null): [AudienceView, Board, Brain] {
    let s = newGame(5);
    let court = Views.for(s, "Hatti");
    let brain = p === null ? new Brain("Hatti", 5) : new Brain("Hatti", 5, p);
    brain.learn(court, new Board(court));
    brain.spareGold = 500;
    let view = newAudienceView({
      audienceId: "a1",
      turn: 1,
      round: 1,
      maxRounds: 2,
      from: "Arzawa",
      host: "Hatti",
      spoken: "Great King, I bring the words of my lord.",
    });
    shape?.(view);
    return [view, new Board(court, undefined, brain.treasury), brain];
  }

  test("A host whose gift was refused offers half as much again in a second exchange", () => {
    let cunning = { ...archetype("Hatti"), cunning: 1 };
    // The gift is a matter of chance: the first roll that brings one.
    let a = audience(cunning);
    let first = Statecraft.host(a[0], a[1], a[2], Rng.for(5, 1, "test", "host0"));
    for (let k = 1; first.bribe === 0; k++) {
      a = audience(cunning);
      first = Statecraft.host(a[0], a[1], a[2], Rng.for(5, 1, "test", `host${k}`));
    }
    Assert.false(first.end);

    let refused = newAudienceView({ audienceId: "a1", turn: 1, round: 2, maxRounds: 2, from: "Arzawa", host: "Hatti" });
    let second = Statecraft.host(refused, a[1], a[2], Rng.for(5, 1, "test", "round2"));
    Assert.true(second.end);
    Assert.equal(roundEven((first.bribe * 1.5) / 10) * 10, second.bribe);
    Assert.equal(first.bribeAsk, second.bribeAsk);
    // Asked once: a third offer is never made.
    Assert.equal(0, Statecraft.host(refused, a[1], a[2], Rng.for(5, 1, "test", "round2")).bribe);
  });

  test("A host sealing an alliance asks the envoy to swear and a script envoy gives its word", async () => {
    let [view, board, brain] = audience(
      undefined,
      (v) => (v.proposal = newTabletView({ text: Statecraft.allianceTablet("Arzawa", "Hatti"), proposedBy: "Arzawa", partner: "Hatti", allianceOath: true })),
    );
    let reply = Statecraft.host(view, board, brain, Rng.for(5, 1, "test", "host"));
    Assert.true(reply.sealProposal);
    Assert.contains("Swear to me that your lord's troops will stand with mine", reply.speech);

    let s = newGame(5);
    let envoy = firstOf(s.characters, (c) => c.employer === "Arzawa");
    let ctx = newEnvoyContext({
      self: envoy,
      sender: "Arzawa",
      host: "Hatti",
      turn: 1,
      seed: 5,
      round: 1,
      maxRounds: 2,
      dispatch: newDispatch({ letter: "Let us swear alliance.", mandate: "You may swear a full alliance. Promise no land." }),
    });
    let reaction = await new ScriptMind().react(ctx, reply);
    Assert.notEqual("", reaction.commitments);
  });

  test("A host reads a humble greeting kindly and a planted envoys true orders darkly", () => {
    function trust(shape: (a0: AudienceView) => void): number {
      let [view, board, brain] = audience(undefined, shape);
      Statecraft.host(view, board, brain, Rng.for(5, 1, "test", "host"));
      return brain.rel.get("Arzawa").trust;
    }
    let plain = trust((_) => {});
    Assert.true(trust((v) => (v.greetingDeviations = ["the sender does not claim to be a Great King"])) > plain);
    Assert.true(
      trust((v) => {
        v.secretMandate = "Speak only of friendship. Promise nothing.";
        v.secretLetter = "Why should there be anything but friendship between us?";
      }) <
        plain - 0.25,
    );
  });

  // ------------------------------------------------------------------ letters

  test("A proud king writes no greeting to an oath breaker and a modest one sends tribute humbly", () => {
    let s = newGame(Seed);
    let proud = brainFor(s, "Babylonia", { ...archetype("Babylonia"), pride: 0.9 });
    Assert.false(Statecraft.greet(proud, "Hatti").omit);
    proud.rel.get("Hatti").oathsBroken = 1;
    proud.rel.get("Hatti").grudge = 5;
    Assert.true(Statecraft.greet(proud, "Hatti").omit);

    let modest = brainFor(s, "Alashiya", { ...archetype("Alashiya"), pride: 0.3 });
    Assert.false(Statecraft.greet(modest, "Egypt", true).claimGreatKing);
    Assert.true(Statecraft.greet(modest, "Egypt").claimGreatKing);
    Assert.true(Statecraft.greet(proud, "Egypt", true).claimGreatKing);
  });

  test("A grievance backed by strength threatens war in words a timid envoy would drop", () => {
    Assert.true(TextKit.isThreatTo("If you do not withdraw, my troops will march into your land.", "Hatti", "Egypt"));
  });

  test("A faithless king debases only the gold it sends a friend who trusts it", () => {
    let s = newGame(Seed);
    s.turn = 5;
    s.treasuries.get("Alashiya").gold = 3000;
    let faithless = { ...archetype("Alashiya"), honesty: 0.1, generosity: 1, diplomacy: 1 };
    function letters(prepare: (a0: Brain) => void, k: number): DispatchOrder[] {
      let v = Views.for(s, "Alashiya");
      let brain = brainFor(s, "Alashiya", faithless);
      brain.spareGold = 1000;
      prepare(brain);
      let orders: Order[] = [];
      Statecraft.letters(new Board(v, brain.remembered(v), brain.treasury), brain, orders, new HSet<string>(), Rng.for(Seed, 5, "test", `letters${k}`));
      return orders.filter((o): o is DispatchOrder => o.type === "dispatch");
    }
    // Peace letters with gold, to neighbours that have sealed nothing with it: fine gold.
    let peace = range(0, 10)
      .flatMap((k) => letters((_) => {}, k))
      .filter((d) => d.gold > 0);
    Assert.notEmpty(peace);
    Assert.all(peace, (d) => Assert.equal(100, d.purityPercent));

    // A gift to an ally that trusts it may be debased. (Sworn to every other king too, it owes nobody a peace letter,
    // which would carry the season's one gift of gold first.)
    treaty(s, "Alashiya", "Egypt", true);
    for (const x of AllPowers.filter((x) => !["Alashiya", "Egypt"].includes(x))) treaty(s, "Alashiya", x);
    let gifts = range(0, 30)
      .flatMap((k) => letters((b) => (b.rel.get("Egypt").trust = 0.6), k))
      .filter((d) => d.to === "Egypt" && d.gold > 0);
    Assert.contains(gifts, (d) => d.purityPercent < 100);
  });
});
