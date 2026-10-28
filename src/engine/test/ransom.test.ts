import { describe, test } from "vitest";
import {
  travelTurns,
  AllPowers,
  type CaptiveFate,
  type Character,
  type CharacterView,
  CharacterViewSchema,
  Dict,
  WorldMap,
  economyOf,
  ownedBy,
  type GameConfig,
  type GameState,
  GameStateSchema,
  type Order,
  OrderValidator,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  captive,
  clone,
  count,
  coverOf,
  first,
  inboxOf,
  newCover,
  newGame,
  newGameConfig,
  newMindReply,
  newPlannedOrder,
  newSleepState,
  newTurnSubmission,
  payRansom,
  release,
  serialize,
  single,
  sum,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// <summary>One open demand per captive, known to the payer only once its rumour has arrived, and paid once.</summary>
describe("RansomTests", () => {
  // Since Haakon's answers to item 11b a demand waits at the captor's court for a carrier: these tests give each one a
  // carrier who sets out at once, so its word arrives at the pace of the road, as the rules here are about.
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    for (const j of s.journeys.filter((x) => x.news === "Ransom" && x.waitAt !== null && x.carrier === null)) {
      j.waitAt = null;
      j.arriveTurn = j.departTurn + travelTurns(s.config, WorldMap.default, WorldMap.default.capital(j.from).id, WorldMap.default.capital(j.to).id, j.departTurn);
    }
    e.beginTurn();
    for (const r of e.mindRequests) e.fulfil(r, newMindReply({ text: `[${r.task}]`, number: 15 }));
    return e;
  }

  function none(): Dict<Power, TurnSubmission> {
    return new Dict();
  }

  function orders(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  // <summary>One of 's people held captive by , its master aware of it.</summary>
  function held(master: Power, jailer: Power, config: GameConfig | null = null): [GameState, Character] {
    let s = newGame(4, config);
    let spy = first(s.characters, (c) => c.employer === master);
    spy.secretMaster = null;
    spy.status = "Captured";
    spy.heldBy = jailer;
    spy.at = jailer;
    spy.missionTarget = jailer;
    s.treasuries.get(master).gold = 2000;
    return [s, spy];
  }

  function refusals(s: GameState, p: Power, ...orders: Order[]): string[] {
    return new OrderValidator(s).validate(p, newTurnSubmission({ orders: orders })).rejected.map((r) => r.reason);
  }

  function heard(s: GameState, p: Power, c: Character): boolean {
    return inboxOf(s, p).some((i) => i.kind === "Rumor" && i.subject === c.id && i.turn === s.turn);
  }

  test("Only a demand that still stands wakes its sleeping payer", () => {
    let [s, spy] = held("Egypt", "Babylonia", newGameConfig({ sleepingSeats: true, catastropheChance: 0 }));
    s.sleep.set("Egypt", newSleepState({ asleep: true, wakeAt: 99 }));
    function woken(): string[] {
      let e = begin(s);
      s.sleep.get("Egypt").asleep = true;
      e.wakeCheck();
      return s.sleep.get("Egypt").wokenBecause;
    }
    woken();
    new TurnEngine(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 90)));
    Assert.doesNotContain("a ransom is demanded for one of your people", woken());
    new TurnEngine(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 120)));
    // The first demand's word arrives, but it was replaced: nothing to wake for.
    Assert.doesNotContain("a ransom is demanded for one of your people", woken());
    new TurnEngine(s).resolve(none());
    Assert.contains("a ransom is demanded for one of your people", woken());
  });

  test("A ransom can be paid once its demand has arrived and only once", () => {
    let [s, spy] = held("Hatti", "Mitanni");
    let pay = payRansom(spy.id);
    begin(s).resolve(orders("Mitanni", captive(spy.id, "Ransom", 90)));
    Assert.equal([`no ransom demand for ${spy.name} has reached you`], refusals(s, "Hatti", pay));

    begin(s);
    Assert.true(heard(s, "Hatti", spy));
    Assert.contains(inboxOf(s, "Hatti"), (i) => i.body.endsWith(`(order pay_ransom for ${spy.id}).`));
    Assert.empty(refusals(s, "Hatti", pay));
    Assert.equal([`a ransom for ${spy.name} is already on its way`], refusals(s, "Hatti", pay, pay));

    let gold = s.treasuries.get("Hatti").gold;
    new TurnEngine(s).resolve(orders("Hatti", pay, pay));
    Assert.equal(gold - 90, s.treasuries.get("Hatti").gold);
    Assert.single(s.journeys, (j) => j.kind === "Ransom");
    Assert.contains(inboxOf(s, "Hatti"), (i) => i.kind === "Rejected" && i.body.includes(`a ransom for ${spy.name} is already on its way`));
  });

  test("A new demand replaces the old and the old ones rumour announces nothing", () => {
    // Babylon is two seasons from Egypt: the second demand is made while the first one's word is still on the road.
    let [s, spy] = held("Egypt", "Babylonia");
    Assert.equal(2, new TurnEngine(s).travelTurns("Babylonia", "Egypt"));
    begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 90)));
    begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 120)));
    Assert.single(s.tasks, (t) => t.kind === "RansomDemand");

    begin(s);
    Assert.false(heard(s, "Egypt", spy));
    Assert.equal([`no ransom demand for ${spy.name} has reached you`], refusals(s, "Egypt", payRansom(spy.id)));
    new TurnEngine(s).resolve(none());

    begin(s);
    Assert.true(heard(s, "Egypt", spy));
    Assert.single(inboxOf(s, "Egypt"), (i) => i.kind === "Rumor" && i.subject === spy.id);
    Assert.contains("demands 2 minas for their return", single(inboxOf(s, "Egypt"), (i) => i.subject === spy.id && i.kind === "Rumor").body);
    Assert.equal(120, single(Views.for(s, "Egypt").court, (c) => c.id === spy.id).ransomDemand);

    // Paid: while the gold is on the road, it cannot be paid again.
    new TurnEngine(s).resolve(orders("Egypt", payRansom(spy.id)));
    begin(s);
    Assert.equal([`a ransom for ${spy.name} is already on its way`], refusals(s, "Egypt", payRansom(spy.id)));
    new TurnEngine(s).resolve(none());
    begin(s);
    Assert.notEqual("Captured", spy.status);
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "Ransom paid" && i.body.includes("2 minas"));
  });

  test("A ransom for a captive already let go is refused and if both happen at once is not sent", () => {
    let [s, spy] = held("Hatti", "Mitanni");
    begin(s).resolve(orders("Mitanni", captive(spy.id, "Ransom", 90)));
    begin(s);
    Assert.empty(refusals(s, "Hatti", payRansom(spy.id)));

    // The captor lets the captive go in the season the ransom is paid: the gold is not sent, and the payer is told.
    let gold = s.treasuries.get("Hatti").gold;
    new TurnEngine(s).resolve(
      new Dict([
        ["Hatti", newTurnSubmission({ orders: [payRansom(spy.id)] })],
        ["Mitanni", newTurnSubmission({ orders: [release(spy.id, "Go.")] })],
      ]),
    );
    Assert.equal(gold, s.treasuries.get("Hatti").gold);
    Assert.doesNotContain(s.journeys, (j) => j.kind === "Ransom");
    let notice = single(inboxOf(s, "Hatti"), (i) => i.title === "Ransom not sent");
    Assert.equal("Rejected", notice.kind);
    Assert.equal(`The ransom for ${spy.name} could not be sent: ${spy.name} is no longer held by Mitanni.`, notice.body);

    // Once its king can see it on the road home, the order is refused outright.
    begin(s);
    Assert.equal([`${spy.name} is no longer held by Mitanni`], refusals(s, "Hatti", payRansom(spy.id)));
  });

  test("A ransom paid for a captive put to death unknown to the payer goes and is kept", () => {
    let [s, spy] = held("Egypt", "Babylonia");
    begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 90)));
    begin(s).resolve(none());
    begin(s);
    Assert.true(heard(s, "Egypt", spy));
    new TurnEngine(s).resolve(orders("Babylonia", captive(spy.id, "Execute")));

    // Egypt has not heard: its captive is held, the demand stands, and its ransom goes.
    begin(s);
    let seen = single(Views.for(s, "Egypt").court, (c) => c.id === spy.id);
    Assert.equal("held captive at the court of Babylonia; Babylonia demands 1 mina 30 shekels for their return (order pay_ransom)", seen.duty);
    Assert.empty(refusals(s, "Egypt", payRansom(spy.id)));
    let gold = s.treasuries.get("Egypt").gold;
    new TurnEngine(s).resolve(orders("Egypt", payRansom(spy.id)));
    Assert.equal(gold - 90, s.treasuries.get("Egypt").gold);

    // Then the rumour of the death; the gold reaches the captor, who keeps it.
    begin(s);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.body.includes("was put to death"));
    Assert.doesNotContain(Views.for(s, "Egypt").court, (c) => c.id === spy.id);
    new TurnEngine(s).resolve(none());
    begin(s);
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "Ransom paid");
    Assert.equal("Dead", spy.status);
  });

  test.each([["Release"], ["Execute"]] as const)(
    "A demand whose captive is let go or put to death before its word arrives announces nothing and wakes nobody %s",
    (fate: CaptiveFate) => {
      let [s, spy] = held("Egypt", "Babylonia", newGameConfig({ sleepingSeats: true, catastropheChance: 0 }));
      s.sleep.set("Egypt", newSleepState({ asleep: true, wakeAt: 99 }));
      begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 90)));
      begin(s).resolve(orders("Babylonia", captive(spy.id, fate)));
      let e = begin(s);
      s.sleep.get("Egypt").asleep = true;
      e.wakeCheck();
      Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.body.includes("demands"));
      Assert.doesNotContain("a ransom is demanded for one of your people", s.sleep.get("Egypt").wokenBecause);
      Assert.doesNotContain(s.tasks, (t) => t.kind === "RansomDemand");
    },
  );

  test("A demand the payer has heard of can be paid until the word of a new one arrives", () => {
    // Babylon is two seasons from Egypt: the second demand's word is on the road for a season.
    let [s, spy] = held("Egypt", "Babylonia");
    begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 90)));
    begin(s).resolve(none());
    begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 120)));
    Assert.equal(
      2,
      count(s.tasks, (t) => t.kind === "RansomDemand"),
    );

    // Egypt still sees the demand it heard of, and may pay it.
    begin(s);
    Assert.equal(90, single(Views.for(s, "Egypt").court, (c) => c.id === spy.id).ransomDemand);
    Assert.empty(refusals(s, "Egypt", payRansom(spy.id)));

    // Unpaid, it gives way to the new one when that one's word arrives.
    let unpaid = clone(GameStateSchema, s);
    new TurnEngine(unpaid).resolve(none());
    begin(unpaid);
    Assert.single(unpaid.tasks, (t) => t.kind === "RansomDemand" && t.spend === 120 && t.announced);
    Assert.doesNotContain(unpaid.tasks, (t) => t.kind === "RansomDemand" && t.spend === 90);
    Assert.equal(120, single(Views.for(unpaid, "Egypt").court, (c) => c.id === spy.id).ransomDemand);
    let gold = s.treasuries.get("Egypt").gold;
    new TurnEngine(s).resolve(orders("Egypt", payRansom(spy.id)));
    Assert.equal(gold - 90, s.treasuries.get("Egypt").gold);

    // The new demand's word arrives while the gold is on the road; the gold, when it comes, frees the captive all the same.
    begin(s);
    Assert.equal(120, single(Views.for(s, "Egypt").court, (c) => c.id === spy.id).ransomDemand);
    Assert.equal([`a ransom for ${spy.name} is already on its way`], refusals(s, "Egypt", payRansom(spy.id)));
    new TurnEngine(s).resolve(none());
    begin(s);
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "Ransom paid" && i.body.includes("1 mina 30 shekels"));
    Assert.notEqual("Captured", spy.status);
  });

  test("A ransom paid in the season the captor lets the captive go by a captive order is not sent whoever comes first", () => {
    let [s, spy] = held("Hatti", "Mitanni");
    Assert.true(AllPowers.indexOf("Hatti") < AllPowers.indexOf("Mitanni"));
    begin(s).resolve(orders("Mitanni", captive(spy.id, "Ransom", 90)));
    begin(s);
    let gold = s.treasuries.get("Hatti").gold;
    new TurnEngine(s).resolve(
      new Dict([
        ["Hatti", newTurnSubmission({ orders: [payRansom(spy.id)] })],
        ["Mitanni", newTurnSubmission({ orders: [captive(spy.id, "Release")] })],
      ]),
    );
    Assert.equal(gold, s.treasuries.get("Hatti").gold);
    Assert.doesNotContain(s.journeys, (j) => j.kind === "Ransom");
    Assert.equal(
      `The ransom for ${spy.name} could not be sent: ${spy.name} is no longer held by Mitanni.`,
      single(inboxOf(s, "Hatti"), (i) => i.title === "Ransom not sent").body,
    );
  });

  test("A captive turned after its master heard of the capture still appears held until word comes from it", () => {
    let [s, spy] = held("Hatti", "Mitanni");
    begin(s).resolve(orders("Mitanni", captive(spy.id, "Ransom", 90)));
    begin(s);
    let before = serialize(
      CharacterViewSchema,
      single(Views.for(s, "Hatti").court, (c) => c.id === spy.id),
    );
    Assert.contains("Mitanni demands 1 mina 30 shekels", before);

    // Turned in the season Hatti pays: Hatti believes its spy held, so the gold goes, and the captor keeps it.
    let gold = s.treasuries.get("Hatti").gold;
    new TurnEngine(s).resolve(
      new Dict([
        ["Hatti", newTurnSubmission({ orders: [payRansom(spy.id)] })],
        ["Mitanni", newTurnSubmission({ orders: [captive(spy.id, "Turn", 0, "Mitanni is weak.")] })],
      ]),
    );
    Assert.equal(["Employed", "SpyPosted"], [spy.status, spy.duty]);
    Assert.equal(gold - 90, s.treasuries.get("Hatti").gold);
    Assert.doesNotContain(inboxOf(s, "Hatti"), (i) => i.title === "Ransom not sent");
    let after = single(Views.for(s, "Hatti").court, (c) => c.id === spy.id);
    Assert.equal(["captured", "at the court of Mitanni"], [after.status, after.where]);
    Assert.startsWith("held captive at the court of Mitanni", after.duty);

    // The double agent's first report is the word: Hatti then sees it at its post. The ransom bought nothing.
    while (!inboxOf(s, "Hatti").some((i) => i.kind === "SpyReport" && i.subject === spy.id)) begin(s).resolve(none());
    let seen = single(Views.for(s, "Hatti").court, (c) => c.id === spy.id);
    Assert.equal(["watching Mitanni", "at the court of Mitanni"], [seen.duty, seen.where]);
    Assert.contains(inboxOf(s, "Mitanni"), (i) => i.title === "Ransom paid");
    Assert.equal("Employed", spy.status);
  });

  test("A captive s job stands and its death unknown to its master changes nothing in the masters books", () => {
    let [s, spy] = held("Egypt", "Babylonia");
    let fee = spy.contract!.fee;
    begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 90)));
    begin(s).resolve(none());
    begin(s);
    function line(): CharacterView {
      return single(Views.for(s, "Egypt").court, (c) => c.id === spy.id);
    }
    Assert.equal(
      sum(Views.for(s, "Egypt").court, (c) => (c.fee ?? 0) - (c.advance ?? 0)),
      new TurnEngine(s).feesDue("Egypt"),
    );
    // Held, it is paid nothing, and nothing accrues (item 11a): its job is as agreed.
    Assert.equal(fee, line().fee);
    Assert.empty(spy.owed);

    // Put to death: its master, not knowing, still sees its job as before.
    new TurnEngine(s).resolve(orders("Babylonia", captive(spy.id, "Execute")));
    Assert.notNull(coverOf(spy, "Egypt"));
    let [purse, gold] = [spy.purse, s.treasuries.get("Egypt").gold];
    let e = new TurnEngine(s);
    let [income, upkeep] = [
      // Gold comes in from the mines as the season begins (item 9+a), and from sales, none here.
      sum(ownedBy(s, "Egypt"), (id) => economyOf(WorldMap.default.get(id)).mine),
      e.upkeep("Egypt"),
    ];
    begin(s);
    // What it carried passed to the court where it died (Haakon's answers to item 11a: the dead's purse goes with its tablets).
    Assert.true(spy.purse === 0 || spy.purse === purse);
    Assert.equal(fee, line().fee);
    // Nothing left the treasury for it, before or after its death (no other job of Egypt's fell due this season).
    Assert.equal(gold + income - upkeep, s.treasuries.get("Egypt").gold);
  });

  test("A demand that lapses while a newer one is on the road tells the captor nothing yet", () => {
    let [s, spy] = held("Egypt", "Babylonia");
    begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 90)));
    let lapse = single(s.tasks, (t) => t.kind === "RansomDemand").dueTurn;
    while (s.turn < lapse - 1) begin(s).resolve(none());
    // Made the season before the first lapses: its word is still on the road when the first one lapses.
    begin(s).resolve(orders("Babylonia", captive(spy.id, "Ransom", 120)));
    begin(s);
    Assert.equal(lapse, s.turn);
    Assert.doesNotContain(inboxOf(s, "Babylonia"), (i) => i.title === "No ransom came");
    Assert.single(s.tasks, (t) => t.kind === "RansomDemand" && t.spend === 120);
  });

  test("A captive put to death is rumoured to its king and to every court that still believes it serves it", () => {
    let [s, spy] = held("Hatti", "Mitanni");
    // Once Egypt's envoy, gone over to Hatti unknown to Egypt.
    spy.covers.push(newCover({ for: "Egypt", since: 1, believed: "Detained", dutyText: "has not returned from Hatti", whereText: "unknown", fee: 120 }));
    begin(s).resolve(orders("Mitanni", captive(spy.id, "Execute")));
    Assert.equal(
      ["Egypt", "Hatti"],
      s.journeys
        .filter((j) => j.news === "Death" && j.characterId === spy.id)
        .map((j) => j.to)
        .sort(),
    );
    while (s.journeys.some((j) => j.news === "Death")) begin(s).resolve(none());
    Assert.empty(spy.covers);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.body.includes("was put to death in Mitanni"));
    Assert.doesNotContain(Views.for(s, "Egypt").court, (c) => c.id === spy.id);
  });

  test("A scheduled ransom that cannot be sent wakes its seat", () => {
    let [s, spy] = held("Hatti", "Mitanni", newGameConfig({ sleepingSeats: true, catastropheChance: 0 }));
    begin(s).resolve(orders("Mitanni", captive(spy.id, "Ransom", 90)));
    begin(s);
    s.sleep.set("Hatti", newSleepState({ asleep: true, wakeAt: 50, scheduled: [newPlannedOrder({ turn: s.turn, order: payRansom(spy.id) })] }));
    new TurnEngine(s).resolve(orders("Mitanni", captive(spy.id, "Release")));
    Assert.contains(
      s.sleep.get("Hatti").pendingWake,
      (w) => w.startsWith("orders you scheduled could not be carried out") && w.includes(`${spy.name} is no longer held by Mitanni`),
    );
  });

  test("A ransom or a turning for a captive whose kingdom has fallen tells the captor why it did nothing", () => {
    let [s, spy] = held("Hatti", "Mitanni");
    spy.employer = null;
    spy.contract = null;
    begin(s).resolve(orders("Mitanni", captive(spy.id, "Ransom", 90)));
    let notice = single(inboxOf(s, "Mitanni"), (i) => i.kind === "Rejected");
    Assert.contains(`${spy.name}'s kingdom has fallen: nobody is left to pay. ${spy.name} remains your captive`, notice.body);
    Assert.doesNotContain(s.tasks, (t) => t.kind === "RansomDemand");

    begin(s).resolve(orders("Mitanni", captive(spy.id, "Turn", 0, "Nothing stirs.")));
    Assert.contains(
      inboxOf(s, "Mitanni"),
      (i) => i.kind === "Rejected" && i.body.includes(`${spy.name}'s kingdom has fallen: nobody is left to deceive. ${spy.name} remains your captive`),
    );
    Assert.equal("Captured", spy.status);
  });
});
