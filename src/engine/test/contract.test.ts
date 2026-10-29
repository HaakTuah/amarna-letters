import { describe, test } from "vitest";
import {
  type Character,
  Dict,
  type GameConfig,
  type GameState,
  type Order,
  OrderValidator,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  basePrice,
  trustIn,
  talkWeight,
  newSkills,
  captive,
  dispatch,
  first,
  hire,
  inboxOf,
  MoneyData,
  newContract,
  newGame,
  newGameConfig,
  newHoard,
  newJobErrand,
  newMindReply,
  newTurnSubmission,
  payCarriers,
  payFee,
  placeSpy,
  raise,
  renew,
  seize,
  sellDebt,
  single,
} from "@amarna/engine";
import { Assert, speaksAll } from "./support.ts";

// <summary>Jobs as errands (item 11a, "Jobs, not wages", reworked by Haakon's answers to items 11a and 11a+): a job is one
// errand with a fee; it ends when it is done; every payment is the payer's order; renewing is a new offer; offers go abroad
// with envoys; a court's record of paying is news; and the hard acts: seizing a hoard, selling a tablet, taking a captive's
// purse, a levy of the king's size.</summary>
describe("ContractTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    for (const r of e.mindRequests) e.fulfil(r, newMindReply({ text: `[${r.task}]` }));
    return e;
  }

  function none(): Dict<Power, TurnSubmission> {
    return new Dict();
  }

  function orders(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  function refusal(s: GameState, ...o: Order[]): string {
    return new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: o })).rejected.map((r) => r.reason).join(" | ");
  }

  // Nobody seeks service and nobody lives their own season in these tests' way.
  function still(s: GameState): GameState {
    for (const c of s.characters) c.seeking = false;
    return s;
  }

  // One of Egypt's servants at court, on a one-season job for 12 (6 handed over) whose first errand is not named yet.
  function servant(wantsMore: boolean = true, config: GameConfig | null = null): [GameState, Character] {
    let s = still(newGame(5, config ?? newGameConfig({ catastropheChance: 0 })));
    let c = first(s.characters, (c) => c.employer === "Egypt");
    c.secretMaster = null;
    c.traits.sympathy = null;
    [c.traits.competence, c.traits.greed, c.traits.loyalty] = wantsMore ? [80, 80, 50] : [20, 10, 80];
    const believed = wantsMore ? 80 : 20;
    c.belief = newSkills({ gather: believed, stealth: believed, forge: believed });
    c.ties = [];
    [c.at, c.duty] = ["Egypt", "None"];
    c.contract = newContract({ fee: 12, advance: 6, startTurn: 1, untilTurn: 1 });
    return [s, c];
  }

  // A free person standing at Egypt's court.
  function freeAt(s: GameState, court: Power = "Egypt"): Character {
    const c = first(s.characters, (x) => x.status === "Free" && x.errand === null);
    [c.at, c.duty, c.heldBy] = [court, "None", null];
    speaksAll(c);
    c.pitches.clear();
    c.askingPrice.clear();
    return c;
  }

  test("A job done ends: the man is free at court, and the rest falls due unpaid unless his master orders it paid", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s);
    Assert.equal(["Free", null, null, "Egypt"], [c.status, c.employer, c.contract, c.at]);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A job done" && i.subject === c.id);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A fee due" && i.subject === c.id);
    Assert.equal(6, c.owed.get("Egypt"));
    // Nothing is broken yet: the king may still pay it this season. Unpaid by the end of the next, it is broken.
    Assert.false(s.payRecords.has("Egypt"));
    begin(s).resolve(none());
    begin(s);
    Assert.equal(1, s.payRecords.get("Egypt").broken);
    Assert.equal(6, c.owed.get("Egypt"));
    // Its view: one free at court whom Egypt owes.
    Assert.equal(6, single(Views.for(s, "Egypt").known, (x) => x.id === c.id).owed);
  });

  test("Paid by its master's standing order when the job is done, or by pay_fee the season after, a promise is kept", () => {
    let [s, c] = servant();
    c.contract!.payOnDone = true;
    const fees = c.earned.fees;
    begin(s).resolve(none());
    begin(s);
    Assert.equal(fees + 6, c.earned.fees);
    Assert.equal(1, s.payRecords.get("Egypt").kept);
    Assert.contains(s.events, (e) => e.kind === "fee-paid");

    [s, c] = servant();
    begin(s).resolve(none());
    begin(s).resolve(orders("Egypt", payFee(c.id, true)));
    Assert.false(c.owed.has("Egypt"));
    begin(s);
    Assert.equal([1, 0], [s.payRecords.get("Egypt").kept, s.payRecords.get("Egypt").broken]);
  });

  test("The standing offer of the same job again is a new job the man takes if it is worth his while", () => {
    let [s, c] = servant(false);
    [c.contract!.payOnDone, c.contract!.offerAgain] = [true, true];
    begin(s).resolve(none());
    begin(s);
    Assert.equal(["Employed", "Egypt"], [c.status, c.employer!]);
    Assert.equal([12, 6, 2, 3], [c.contract!.fee, c.contract!.advance, c.contract!.startTurn, c.contract!.untilTurn]);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "The same job again");
    // A greedy one asks more than the same job pays: he is free.
    [s, c] = servant(true);
    [c.contract!.payOnDone, c.contract!.offerAgain] = [true, true];
    begin(s).resolve(none());
    begin(s);
    Assert.equal("Free", c.status);
  });

  test("Another errand is a new job, offered at court, which the man may refuse; the old job's rest is carried into it", () => {
    let [s, c] = servant();
    c.contract = newContract({ fee: 600, advance: 300, startTurn: 1, untilTurn: 30, errand: newJobErrand({ what: "envoy", where: "Hatti" }) });
    const ask = basePrice(c, "Egypt");
    // Sent elsewhere than his job says: refused by the validator, with the way to do it.
    Assert.contains("another errand is a new job, offered with order renew", refusal(s, dispatch(c.id, "Babylonia", "Greetings.")));
    // Offered a new job below his price: refused.
    new TurnEngine(s).resolve(orders("Egypt", renew(c.id, ask * 20 - 20, 20, ask * 20 - 20, { what: "envoy", where: "Babylonia" }), dispatch(c.id, "Babylonia", "Greetings.")));
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "Not renewed" && i.body.includes(`they ask ${ask} shekels a season`));
    Assert.equal("Hatti", c.contract!.errand!.where);
    Assert.equal("None", c.duty);
    // At his price he takes it and goes at once; the old job's rest (300) comes with the new job's.
    Assert.equal("", refusal(s, renew(c.id, ask * 20, 20, ask * 20, { what: "envoy", where: "Babylonia" }), dispatch(c.id, "Babylonia", "Greetings.")));
    new TurnEngine(s).resolve(orders("Egypt", renew(c.id, ask * 20, 20, ask * 20, { what: "envoy", where: "Babylonia" }), dispatch(c.id, "Babylonia", "Greetings.")));
    Assert.equal(["Babylonia", 300, "EnvoyOutbound"], [c.contract!.errand!.where, c.contract!.carried, c.duty]);
  });

  test("An envoy's job is done when it is back from its audience; a starting servant's first errand names its job", () => {
    let [s, c] = servant();
    c.contract!.untilTurn = 40;
    new TurnEngine(s).resolve(orders("Egypt", dispatch(c.id, "Babylonia", "Greetings.")));
    Assert.equal(["envoy", "Babylonia", false], [c.contract!.errand!.what, c.contract!.errand!.where, c.contract!.errand!.done]);
    const out = s.journeys.find((j) => j.kind === "EnvoyOutbound" && j.characterId === c.id)!;
    s.turn = out.arriveTurn;
    new TurnEngine(s).arrivals();
    Assert.true(c.contract!.errand!.done);
    // Back at court with nothing to do, its job is done though the term runs on.
    [c.at, c.duty] = ["Egypt", "None"];
    s.journeys = s.journeys.filter((j) => j.characterId !== c.id);
    s.audiences.length = 0;
    new TurnEngine(s).jobsDone(new Dict());
    Assert.equal("Free", c.status);
  });

  test("A person offered a job at court this season can be sent on its errand at once; the term must fit the errand", () => {
    let s = still(newGame(5, newGameConfig({ catastropheChance: 0 })));
    const c = freeAt(s);
    const ask = basePrice(c, "Egypt");
    Assert.contains("name the job's errand", refusal(s, hire(c.id, ask * 20, 20, ask * 20)));
    // Too short a term for the road to Babylonia and back.
    new TurnEngine(s).resolve(orders("Egypt", hire(c.id, ask * 30, 1, ask * 30, { what: "envoy", where: "Babylonia" })));
    Assert.equal("Free", c.status);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "Not hired" && i.body.includes("the errand takes"));
    const job = hire(c.id, ask * 20, 20, ask * 20, { what: "envoy", where: "Babylonia", payOnDone: true });
    Assert.equal("", refusal(s, job, dispatch(c.id, "Babylonia", "Greetings.")));
    new TurnEngine(s).resolve(orders("Egypt", job, dispatch(c.id, "Babylonia", "Greetings.")));
    Assert.equal(["Employed", "EnvoyOutbound", true], [c.status, c.duty, c.contract!.payOnDone]);
  });

  test("An offer to a person abroad goes with an envoy, who brings the advance home if it is declined", () => {
    let [s, envoy] = servant();
    envoy.contract!.untilTurn = 40;
    const far = freeAt(s, "Babylonia");
    const ask = basePrice(far, "Egypt");
    Assert.contains("goes with an envoy you send this season", refusal(s, hire(far.id, ask * 20, 20, 10, { what: "spy", where: "Babylonia" })));
    // Where a person abroad stands, and whether it is free, the validator never tells: the envoy finds out.
    const gold = s.treasuries.get("Egypt").gold;
    const offer = hire(far.id, ask * 20, 20, ask * 20, { what: "spy", where: "Babylonia", via: envoy.id });
    Assert.equal("", refusal(s, dispatch(envoy.id, "Babylonia", "Greetings."), offer));
    new TurnEngine(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings."), offer));
    Assert.equal([gold - ask * 20, ask * 20], [s.treasuries.get("Egypt").gold, envoy.carriedFor]);
    const out = s.journeys.find((j) => j.kind === "EnvoyOutbound" && j.characterId === envoy.id)!;
    s.turn = out.arriveTurn;
    new TurnEngine(s).arrivals();
    // Taken: a spy whose post is where it stands takes it up at once, and the advance leaves the envoy's hands.
    Assert.equal(["Employed", "Egypt", "SpyPosted", "Babylonia", 0], [far.status, far.employer!, far.duty, far.missionTarget!, envoy.carriedFor]);
    // Egypt learns of it only when word comes home: until then it does not see him as its own.
    Assert.doesNotContain(Views.for(s, "Egypt").court, (x) => x.id === far.id);
    Assert.contains(s.journeys, (j) => j.kind === "Word" && j.news === "Job" && j.to === "Egypt");
    s.turn = far.contract!.knownFrom;
    Assert.contains(Views.for(s, "Egypt").court, (x) => x.id === far.id);

    // Declined: the advance rides home with the envoy.
    [s, envoy] = servant();
    envoy.contract!.untilTurn = 40;
    const other = freeAt(s, "Babylonia");
    const low = hire(other.id, 20, 20, 10, { what: "spy", where: "Babylonia", via: envoy.id });
    new TurnEngine(s).resolve(orders("Egypt", dispatch(envoy.id, "Babylonia", "Greetings."), low));
    const j = s.journeys.find((x) => x.kind === "EnvoyOutbound" && x.characterId === envoy.id)!;
    s.turn = j.arriveTurn;
    new TurnEngine(s).arrivals();
    Assert.equal(["Free", 10], [other.status, envoy.carriedFor]);
    Assert.contains(s.journeys, (j) => j.kind === "Word" && j.news === "Job" && j.to === "Egypt" && (j.text ?? "").includes("declined"));
    const before = s.treasuries.get("Egypt").gold;
    new TurnEngine(s).carriedHome(envoy, "Egypt");
    Assert.equal([before + 10, 0], [s.treasuries.get("Egypt").gold, envoy.carriedFor]);
  });

  test("A court's record of paying is news: it reaches other courts by the roads, and people hear it where they stand", () => {
    let s = still(newGame(5, newGameConfig({ catastropheChance: 0 })));
    const e = new TurnEngine(s);
    e.recordPay("Egypt", false, "Egypt");
    // Egypt knows its own at once; Hatti only once word has come.
    Assert.equal(MoneyData.trustStart - MoneyData.trustBroken, trustIn(s, "Egypt", "Egypt"));
    Assert.equal(MoneyData.trustStart, trustIn(s, "Egypt", "Hatti"));
    const at = s.payFacts[0].heardAt.get("Hatti");
    Assert.true(at > s.turn);
    const c = freeAt(s, "Hatti");
    Assert.equal(MoneyData.trustStart, trustIn(s, "Egypt", c));
    s.turn = at;
    Assert.equal(MoneyData.trustStart - MoneyData.trustBroken, trustIn(s, "Egypt", "Hatti"));
    new TurnEngine(s).newsSeason();
    // A person weighs talk by its age (Haakon's answers to item 11b+): the promise was broken some seasons before he heard it.
    const made = s.payFacts[0].turn;
    Assert.equal(Math.round(MoneyData.trustStart - MoneyData.trustBroken * talkWeight(c, s.turn - made)), trustIn(s, "Egypt", c));
  });

  test("What people ask follows what they heard jobs pay, with no going rate", () => {
    let s = still(newGame(5));
    const c = freeAt(s);
    const own = basePrice(c, "Egypt");
    new TurnEngine(s).heardFee(c, own * 3);
    Assert.true(basePrice(c, "Egypt") > own);
    // A job agreed where people stand is heard there.
    const [d, e] = s.characters.filter((x) => x.status === "Free" && x !== c && x.errand === null);
    for (const x of [d, e]) [x.at, x.duty, x.heldBy] = ["Egypt", "None", null];
    new TurnEngine(s).resolve(orders("Egypt", hire(e.id, 800, 20, 800, { what: "envoy", where: "Hatti" })));
    Assert.equal("Employed", e.status);
    Assert.notNull(d.heardRate);
  });

  test("Hard acts: a hoard seized, a tablet sold, a captive's purse kept until its captor takes it, and a levy of every man", () => {
    let s = still(newGame(5, newGameConfig({ catastropheChance: 0 })));
    const rich = freeAt(s);
    rich.hoard = newHoard({ at: "Egypt", gold: 300 });
    const gold = s.treasuries.get("Egypt").gold;
    new TurnEngine(s).resolve(orders("Egypt", seize(rich.id)));
    Assert.equal([gold + 300, null], [s.treasuries.get("Egypt").gold, rich.hoard]);
    Assert.contains(s.losses, (l) => l.kind === "Seized" && l.court === "Egypt" && l.characterId === rich.id);
    Assert.contains(rich.facts, (f) => f.tag === "seized");

    // A tablet in Egypt's archive, sold to a person at its court who thinks the claim worth the price.
    const e = new TurnEngine(s);
    const d = e.sealDebt("Egypt", "Hatti", 100, 200, 4);
    const buyer = freeAt(s);
    buyer.purse = 150;
    new TurnEngine(s).resolve(orders("Egypt", sellDebt(d.id, buyer.id, 199)));
    Assert.equal("Egypt", d.holder);
    new TurnEngine(s).resolve(orders("Egypt", sellDebt(d.id, buyer.id, 100)));
    Assert.equal([buyer.id, 50], [d.holder!, buyer.purse]);

    // A captive's purse stays on it until its captor orders it taken.
    const held = first(s.characters, (x) => x.employer === "Hatti");
    [held.status, held.heldBy, held.at, held.purse] = ["Captured", "Egypt", "Egypt", 40];
    new TurnEngine(s).goldAndTabletsTaken();
    Assert.equal(40, held.purse);
    Assert.equal(40, single(Views.for(s, "Egypt").known, (x) => x.id === held.id).carries);
    const before = s.treasuries.get("Egypt").gold;
    new TurnEngine(s).resolve(orders("Egypt", captive(held.id, "TakePurse")));
    Assert.equal([before + 40, 0, "Captured"], [s.treasuries.get("Egypt").gold, held.purse, held.status]);
  });

  test("The king chooses how many men a levy takes, up to all", () => {
    let s = newGame(5, newGameConfig({ catastropheChance: 0 }));
    const home = first(
      [...s.owner.entries()].filter(([id, o]) => o === "Egypt" && !s.units.some((u) => u.province === id)).map(([id]) => id),
      () => true,
    );
    Assert.contains("a levy takes", refusal(s, raise(home, "Army", 3)));
    new TurnEngine(s).resolve(orders("Egypt", raise(home, "Army", 600)));
    const u = s.units.find((x) => x.province === home && x.power === "Egypt");
    if (u !== undefined) Assert.true(u.men <= 600);
  });

  test("Carriers of letters are paid on delivery only by their court's standing order", () => {
    let s = still(newGame(5));
    Assert.false(Views.for(s, "Egypt").payCarriers);
    new TurnEngine(s).resolve(orders("Egypt", payCarriers(true)));
    Assert.true(Views.for(s, "Egypt").payCarriers);
    new TurnEngine(s).resolve(orders("Egypt", payCarriers(false)));
    Assert.false(Views.for(s, "Egypt").payCarriers);
  });

  test("A free person at your court shows what they ask; a spy sent on another errand than its job's is refused", () => {
    let s = newGame(5);
    let free = freeAt(s);
    let line = single(Views.for(s, "Egypt").known, (x) => x.id === free.id);
    Assert.equal(basePrice(free, "Egypt"), line.askingPrice);
    Assert.doesNotContain(Views.for(s, "Hatti").known, (x) => x.id === free.id && x.askingPrice !== null);
    let [t, c] = servant();
    c.contract = newContract({ fee: 600, advance: 300, startTurn: 1, untilTurn: 30, errand: newJobErrand({ what: "spy", where: "Hatti" }) });
    Assert.equal("", refusal(t, placeSpy(c.id, "Hatti")));
    Assert.contains("job is to watch Hatti", refusal(t, placeSpy(c.id, "Babylonia")));
  });
});
