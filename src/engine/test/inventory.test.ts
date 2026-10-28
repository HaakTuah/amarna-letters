import { describe, test } from "vitest";
import { host } from "../../game/src/bots/statecraft-letters.ts";
import {
  AllPowers,
  type AudienceRecord,
  type Character,
  Dict,
  type GameState,
  type HostReply,
  I,
  type PendingAudience,
  type Power,
  type Tablet,
  TurnEngine,
  type TurnSubmission,
  authenticate,
  dispatch,
  first,
  inboxOf,
  newAudienceRound,
  newEnvoyReaction,
  newGame,
  newGameConfig,
  newHostReply,
  newMindReply,
  newTurnSubmission,
  single,
} from "@amarna/engine";
import { Assert, last, toDict, skilled } from "./support.ts";

// <summary>Inventory tablets, and an envoy who skimmed swapping the inventory for a forgery stating less.</summary>
describe("InventoryTests", () => {
  // <summary>Egypt's envoy, of the given skill, stands before Alashiya's king with 100 shekels of fine gold.</summary>
  function atAudience(competence: number): [GameState, TurnEngine, Character, PendingAudience] {
    let s = newGame(5, newGameConfig({ catastropheChance: 0 }));
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    skilled(envoy, competence);
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Alashiya", "Greetings, brother.", { gold: 100 })] })]]));
    while (s.audiences.length === 0) {
      e = new TurnEngine(s);
      e.beginTurn();
      if (s.audiences.length === 0) e.resolve(new Dict<Power, TurnSubmission>());
    }
    return [s, e, envoy, single(s.audiences)];
  }

  function record(a: PendingAudience, skim: number, swap: boolean, host: HostReply | null = null): AudienceRecord {
    return {
      audienceId: a.id,
      delivered: "Greetings.",
      clauses: [],
      skim: skim,
      swapInventory: swap,
      rounds: [newAudienceRound({ host: host ?? newHostReply({ speech: "Welcome.", end: true }), envoy: newEnvoyReaction({ speech: "I thank you." }) })],
    };
  }

  function inventoryHeldBy(s: GameState, p: Power): Tablet {
    return single(s.tablets, (t) => t.inventory && s.copies.some((k) => k.tabletId === t.id && k.holder === p));
  }

  test("A skilled envoy who kept gold swaps the inventory and the host sees no shortfall", () => {
    let [s, e, envoy, a] = atAudience(70);
    // The host is shown the forgery: it states what its weighers find.
    let view = e.buildAudienceView(a, "Greetings.", 20, [], 1, null, true);
    Assert.equal([80, 80], [view.goldStated, view.goldWeighed]);
    Assert.equal(100, e.buildAudienceView(a, "Greetings.", 20, [], 1).goldStated);

    e.applyAudience(record(a, 20, true));

    let inventory = inventoryHeldBy(s, "Alashiya");
    Assert.true(inventory.forged);
    Assert.equal("The inventory of the gold Egypt sends to Alashiya: 1 mina 20 shekels.", inventory.text);
    Assert.equal(["Egypt"], inventory.seals);
    Assert.equal([envoy.id, "Egypt", 70], [inventory.forgerId, inventory.forgerEmployer, inventory.forgerSkill]);
    Assert.equal(80, single(s.treasuries.get("Alashiya").lots).stated);

    // The host's record of the audience shows no gap and nothing of what the envoy did.
    let notice = single(inboxOf(s, "Alashiya"), (i) => i.kind === "Audience");
    Assert.contains("The inventory lists 1 mina 20 shekels of gold; your weighers found 1 mina 20 shekels.", notice.body);
    Assert.doesNotContain("kept", notice.body);
    Assert.doesNotContain("forgery", notice.body);
    // The record of the mission (the spectator's) keeps both; the envoy knows, and a deep secret is left.
    let outcomes = single(s.trails).outcomes;
    Assert.contains("kept 20 shekels of the gold", outcomes);
    Assert.contains("replaced the inventory with a forgery stating 80 shekels", outcomes);
    Assert.contains(envoy.facts, (f) => f.tag === "inventory-forgery" && f.secrecy === "Deep" && f.knownBy.length === 0);
    Assert.contains(envoy.memory, (m) => m.text.startsWith("I put an inventory I forged myself, stating 1 mina 20 shekels"));
    Assert.contains(s.events, (x) => x.signal === "inventory-swapped" && x.visibleTo.length === 0);
    // Egypt, which sent 100, is told nothing.
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.body.includes("inventory"));
  });

  test("An envoy without the forger s skill or with nothing kept hands over the true inventory", () => {
    // Wanting to swap is not enough: a clumsy envoy's forgery would not pass, so the sealed inventory goes over.
    let [s, e, envoy, a] = atAudience(40);
    Assert.equal(100, e.buildAudienceView(a, "Greetings.", 20, [], 1, null, true).goldStated);
    e.applyAudience(record(a, 20, true));
    let inventory = inventoryHeldBy(s, "Alashiya");
    Assert.false(inventory.forged);
    Assert.equal("The inventory of the gold Egypt sends to Alashiya: 1 mina 40 shekels.", inventory.text);
    Assert.contains(
      "The inventory lists 1 mina 40 shekels of gold; your weighers found 1 mina 20 shekels.",
      single(inboxOf(s, "Alashiya"), (i) => i.kind === "Audience").body,
    );
    Assert.contains(envoy.memory, (m) => m.text.includes("my hand could not fake the seal"));
    Assert.doesNotContain(s.events, (x) => x.signal === "inventory-swapped");

    // A skilled envoy that kept nothing has nothing to hide.
    let [s2, e2, , a2] = atAudience(90);
    e2.applyAudience(record(a2, 0, true));
    Assert.false(inventoryHeldBy(s2, "Alashiya").forged);
    Assert.equal(100, single(s2.treasuries.get("Alashiya").lots).stated);
  });

  test("An envoy that kept all the gold cannot hide it with a forgery stating nothing", () => {
    let [s, e, envoy, a] = atAudience(90);
    Assert.equal(100, e.buildAudienceView(a, "Greetings.", 100, [], 1, null, true).goldStated);
    e.applyAudience(record(a, 100, true));

    // The true inventory goes over and the host sees the whole shortfall.
    let inventory = inventoryHeldBy(s, "Alashiya");
    Assert.false(inventory.forged);
    Assert.equal("The inventory of the gold Egypt sends to Alashiya: 1 mina 40 shekels.", inventory.text);
    Assert.contains(
      "The inventory lists 1 mina 40 shekels of gold; your weighers found 0 shekels.",
      single(inboxOf(s, "Alashiya"), (i) => i.kind === "Audience").body,
    );
    Assert.contains(envoy.memory, (m) => m.text.includes("with nothing left to weigh, a forged inventory could hide nothing"));
    Assert.doesNotContain(envoy.facts, (f) => f.tag === "inventory-forgery");
    Assert.doesNotContain(s.events, (x) => x.signal === "inventory-swapped");
  });

  test("Gold sent home comes with the host s inventory which the envoy may swap on the way", () => {
    let [s, e, envoy, a] = atAudience(70);
    e.applyAudience(record(a, 0, false, newHostReply({ speech: "Take this home.", goldBack: 60, end: true })));
    let home: TurnEngine;
    do {
      e.resolve(new Dict<Power, TurnSubmission>());
      home = e = new TurnEngine(s);
      e.beginTurn();
    } while (envoy.duty !== "None");
    let report = single(home.mindRequests, (r) => r.task === "EnvoyReport");
    home.fulfil(report, newMindReply({ text: "I am back.", number: 15, swapInventory: true }));

    let inventory = inventoryHeldBy(s, "Egypt");
    Assert.true(inventory.forged);
    Assert.equal(["Alashiya"], inventory.seals);
    Assert.equal("The inventory of the gold Alashiya sends to Egypt: 45 shekels.", inventory.text);
    Assert.equal(45, single(s.treasuries.get("Egypt").lots, (l) => l.from === "Alashiya").stated);
    Assert.contains(
      "[The inventory lists 45 shekels of gold; your weighers found 45 shekels.]",
      single(inboxOf(s, "Egypt"), (i) => i.kind === "EnvoyReport").body,
    );
    Assert.contains(
      s.copies,
      (k) => k.holder === "Egypt" && k.tabletId === inventory.id && k.source === `the inventory ${envoy.name} brought home with the gold of Alashiya`,
    );
    // Alashiya, which sent 60, keeps no copy and is told nothing.
    Assert.doesNotContain(s.copies, (k) => k.tabletId === inventory.id && k.holder !== "Egypt");
  });

  test("An envoy remembers its own report not the court s note on the weighing", () => {
    // "Requests are rules too": what the court's weighers found is the engine's, added for the king after the report, and
    // never the envoy's own words (it once read in the envoy's memory as part of what it said).
    let [s, e, envoy, a] = atAudience(40);
    e.applyAudience(record(a, 0, false, newHostReply({ speech: "Take this home.", goldBack: 60, end: true })));
    let home: TurnEngine;
    do {
      e.resolve(new Dict<Power, TurnSubmission>());
      home = e = new TurnEngine(s);
      e.beginTurn();
    } while (envoy.duty !== "None");
    home.fulfil(
      single(home.mindRequests, (r) => r.task === "EnvoyReport"),
      newMindReply({ text: "I am back with the gold." }),
    );

    Assert.contains(
      "I am back with the gold.\n\n[The inventory lists 1 mina of gold; your weighers found 1 mina.]",
      single(inboxOf(s, "Egypt"), (i) => i.kind === "EnvoyReport").body,
    );
    let memory = last(envoy.memory, (m) => m.text.startsWith("I reported")).text;
    // Its job done on its return, it reports to the king it served (Haakon's answers to item 11a).
    Assert.equal('I reported to the king of Egypt: "I am back with the gold."', memory);
  });

  test("Examining a swapped inventory can find the forgery and trace it to the envoy who brought it", () => {
    let [s, e, envoy, a] = atAudience(60);
    e.applyAudience(record(a, 20, true));
    let copy = single(s.copies, (k) => k.holder === "Alashiya" && single(s.tablets, (t) => t.id === k.tabletId).inventory);
    e.resolve(new Dict<Power, TurnSubmission>());
    let standing = toDict(
      AllPowers,
      (p) => p,
      (p) => envoy.reputation.getOrDefault(p, 0),
    );

    // The forger's skill against what the examiner spends, as for any forgery; traced with the same chance.
    let found = null;
    for (let i = 0; i < 20 && found === null; i++) {
      s.treasuries.get("Alashiya").gold = 10000;
      let next = new TurnEngine(s);
      next.beginTurn();
      next.resolve(new Dict([["Alashiya", newTurnSubmission({ orders: [authenticate(copy.id, 400)] })]]));
      if (copy.authResult?.includes("trace") === true) found = copy.authResult;
    }
    Assert.equal(`The seals are false: this tablet is a forgery. The scribes trace it to the hand of ${envoy.name}, who brought it.`, found);
    // The event (which a narrator's chronicle reads) names the tablet as the court does, never by the engine's id.
    let detected = s.events.filter((x) => x.kind === "forgery-detected");
    Assert.notEmpty(detected);
    Assert.all(detected, (x) => {
      Assert.startsWith("Alashiya found that the inventory sealed by Egypt, dated turn ", x.text);
      Assert.doesNotContain(copy.tabletId, x.text);
    });
    Assert.contains(
      envoy.facts,
      (f) => f.tag === "forger" && f.secrecy === "Public" && f.text === "Exposed as the forger of an inventory of gold bearing the seal of Egypt.",
    );
    // Every court thinks 30 less of it; since item 10 its mission done, which some courts heard of meanwhile, adds back a little.
    Assert.all(AllPowers, (p) => Assert.inRange(envoy.reputation.getOrDefault(p, 0) - standing.get(p), -30, -30 + 10));
    let rumour = `The scribes of Alashiya declare that the inventory of gold bearing the seal of Egypt, brought by ${envoy.name}, envoy of Egypt, was forged by ${envoy.name}.`;
    Assert.contains(s.journeys, (j) => j.kind === "Rumor" && j.to === "Egypt" && j.text === rumour);
    Assert.doesNotContain(s.journeys, (j) => j.kind === "Rumor" && j.to === "Alashiya" && j.text === rumour);
  });

  test("A true inventory examined reads genuine as any genuine tablet", () => {
    let [s, e, , a] = atAudience(90);
    e.applyAudience(record(a, 0, false));
    let copy = single(s.copies, (k) => k.holder === "Alashiya" && single(s.tablets, (t) => t.id === k.tabletId).inventory);
    e.resolve(new Dict([["Alashiya", newTurnSubmission({ orders: [authenticate(copy.id, 40)] })]]));
    let next = new TurnEngine(s);
    next.beginTurn();
    Assert.contains(copy.authResult, ["The seals are genuine.", "The scribes cannot agree; the result is inconclusive."]);
  });
});
