import { describe, test } from "vitest";
import {
  type Character,
  Dict,
  type GameState,
  type Order,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  arrivalChance,
  borrow,
  chooseStrategy,
  debtLeft,
  endingWords,
  first,
  inboxOf,
  isBold,
  MoneyData,
  newApproachMade,
  newContract,
  newGame,
  newGameConfig,
  newHoard,
  newKingdomFall,
  newLifeChoice,
  newMindReply,
  newTraits,
  newTurnSubmission,
  payFee,
  repay,
  strategiesOf,
  trustIn,
  Wealth,
} from "@amarna/engine";
import { Assert, speaksAll } from "./support.ts";

// <summary>Item 11a, "Money and work": jobs with a fee and a court's record, lending and debt tablets, the characters' own
// seasons and their money, newcomers through the doors, and the strategy each plays for wealth.</summary>
describe("MoneyAndWorkTests", () => {
  function begin(s: GameState): TurnEngine {
    const e = new TurnEngine(s);
    e.beginTurn();
    for (const r of e.mindRequests) e.fulfil(r, newMindReply({ text: "[x]" }));
    return e;
  }
  const none = (): Dict<Power, TurnSubmission> => new Dict();
  const orders = (p: Power, ...os: Order[]): Dict<Power, TurnSubmission> => new Dict([[p, newTurnSubmission({ orders: os })]]);

  // Egypt's first envoy, on a one-season job for 12 with 6 handed over; nobody seeks service, so the going rate stays put.
  function servant(): [GameState, Character] {
    const s = newGame(5, newGameConfig({ catastropheChance: 0 }));
    for (const c of s.characters) c.seeking = false;
    const c = first(s.characters, (x) => x.employer === "Egypt");
    c.secretMaster = null;
    c.contract = newContract({ fee: 12, advance: 6, startTurn: 1, untilTurn: 1 });
    return [s, c];
  }

  // One of Egypt's servants at its court, on a long job (a guest there, it pays no living), who offers to lend.
  function lender(s: GameState, purse = 200): Character {
    const c = s.characters.filter((x) => x.employer === "Egypt")[1];
    c.contract = newContract({ fee: 300, advance: 150, startTurn: 1, untilTurn: 30 });
    [c.at, c.duty] = ["Egypt", "None"];
    c.purse = purse;
    c.lendOffer = { amount: 150, perHundred: 12, seasons: 6 };
    return c;
  }

  test("A fee withheld is a promise broken: the person is owed it, and people trust the court less", () => {
    const [s, c] = servant();
    c.contract!.payOnDone = true;
    Assert.equal(MoneyData.trustStart, trustIn(s, "Egypt"));
    new TurnEngine(s).resolve(orders("Egypt", payFee(c.id, false)));
    Assert.equal([true, false], [c.contract!.withheld, c.contract!.payOnDone]);
    const fees = c.earned.fees;
    begin(s);
    Assert.equal(fees, c.earned.fees);
    Assert.equal(6, c.owed.get("Egypt"));
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A fee due");
    // Unpaid through the next season: a promise broken.
    new TurnEngine(s).resolve(none());
    begin(s);
    Assert.equal(1, s.payRecords.get("Egypt").broken);
    Assert.equal(MoneyData.trustStart - MoneyData.trustBroken, trustIn(s, "Egypt"));
    // The king's view says what it owes, and its record.
    const v = Views.for(s, "Egypt");
    Assert.equal([6, 1, 0], [v.feesOwed, v.broken, v.kept]);
    Assert.equal(6, v.known.find((x) => x.id === c.id)!.owed);
    // Paid later, at court: the debt is made good, but the broken promise stands.
    c.at = "Egypt";
    new TurnEngine(s).resolve(orders("Egypt", payFee(c.id, true)));
    Assert.equal(fees + 6, c.earned.fees);
    Assert.false(c.owed.has("Egypt"));
    Assert.equal([0, 1], [s.payRecords.get("Egypt").kept, s.payRecords.get("Egypt").broken]);
  });

  test("The score counts what a king holds: a fee owed is not subtracted, and borrowed gold counts as his", () => {
    const [s, c] = servant();
    const e = new TurnEngine(s);
    const before = e.strength("Egypt");
    c.owed.set("Egypt", 500);
    Assert.equal(before, e.strength("Egypt"));
    const l = lender(s);
    const gold = s.treasuries.get("Egypt").gold;
    e.resolve(orders("Egypt", borrow(l.id, 100, 112, 6)));
    Assert.equal(gold + 100, s.treasuries.get("Egypt").gold);
    // Nothing owed is subtracted: the strength counts the borrowed gold like any other.
    Assert.equal(e.strength("Egypt"), new TurnEngine(s).strength("Egypt"));
    const d = s.debts[0];
    Assert.equal([l.id, "Egypt", 100, 112, l.id, "Person"], [d.lender, d.borrower, d.principal, d.owed, d.holder!, d.kept]);
  });

  test("A king borrows from a lender at his court on a debt tablet, and repays whoever holds it", () => {
    const [s] = servant();
    const l = lender(s);
    // Below what it asks back: refused, with the price.
    new TurnEngine(s).resolve(orders("Egypt", borrow(l.id, 100, 105, 6)));
    Assert.empty(s.debts);
    begin(s);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "No loan" && i.body.includes("they ask 1 mina 52 shekels back"));
    const gold = s.treasuries.get("Egypt").gold;
    new TurnEngine(s).resolve(orders("Egypt", borrow(l.id, 100, 112, 6)));
    const d = s.debts[0];
    Assert.equal(gold + 100, s.treasuries.get("Egypt").gold);
    Assert.equal([100, 50], [l.purse, l.lendOffer!.amount]);
    const v = Views.for(s, "Egypt");
    Assert.equal([d.id, 112, true], [v.debts[0].id, v.debts[0].left, v.debts[0].here]);
    // Repaid in part, then in full: the tablet comes back to the king, and the debt is settled.
    begin(s).resolve(orders("Egypt", repay(d.id, 50)));
    Assert.equal([150, 62], [l.purse, debtLeft(d)]);
    const kept = s.payRecords.get("Egypt").kept;
    begin(s).resolve(orders("Egypt", repay(d.id, 62)));
    Assert.equal(["Egypt", "repaid"], [d.holder!, d.how]);
    Assert.notNull(d.ended);
    Assert.equal(kept + 1, s.payRecords.get("Egypt").kept);
    Assert.empty(Views.for(s, "Egypt").debts);
  });

  test("A debt past its season is a promise broken once its holder stood there unpaid, and a fallen kingdom's debts die with it", () => {
    const [s, c] = servant();
    // Its own job's fee paid when done, so the only promise broken is the debt's.
    c.contract!.payOnDone = true;
    const l = lender(s);
    new TurnEngine(s).resolve(orders("Egypt", borrow(l.id, 100, 112, 1)));
    const d = s.debts[0];
    // A holder who is away when it falls due presents nothing, and nothing is broken.
    l.at = "Hatti";
    begin(s).resolve(none());
    begin(s).resolve(none());
    Assert.equal([false, null], [d.defaulted, d.presented]);
    // Back at the court past due: it presents the tablet, and a season later, unpaid, the promise is broken.
    l.at = "Egypt";
    begin(s).resolve(none());
    Assert.notNull(d.presented);
    Assert.false(d.defaulted);
    begin(s);
    Assert.true(d.defaulted);
    Assert.equal(1, s.payRecords.get("Egypt").broken);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A debt past its season");
    new TurnEngine(s).debtsDie("Egypt");
    Assert.equal("fallen", d.how);
  });

  test("Characters in one place lend to each other by approach and answer, sealing a debt tablet", () => {
    const s = newGame(5, newGameConfig({ catastropheChance: 0 }));
    const [a, b] = s.characters.filter((c) => c.status === "Free" && c.duty === "None").slice(0, 2);
    for (const x of [a, b]) [x.at, x.purse, x.heldBy] = ["Hatti", 100, null];
    for (const x of [a, b]) speaksAll(x);
    const e = new TurnEngine(s);
    // a asks b to lend it 40, to repay 46 within 4 seasons.
    e.applyLife(a, newLifeChoice({ approach: newApproachMade({ to: b.id, words: "Lend me forty.", askGold: 40, repay: 46, seasons: 4 }) }));
    const ap = s.approaches[0];
    Assert.equal([a.id, b.id, null], [ap.from, ap.to, ap.accepted]);
    s.turn++;
    // b decides its season: the approach is waiting in what it sees, and it accepts.
    Assert.equal([ap.id], new TurnEngine(s).lifeView(b).approaches.map((x) => x.id));
    new TurnEngine(s).applyLife(b, newLifeChoice({ accept: [ap.id] }));
    Assert.true(ap.accepted!);
    Assert.equal([140, 60], [a.purse, b.purse]);
    const d = s.debts[0];
    Assert.equal([b.id, a.id, 40, 46, b.id], [d.lender, d.borrower, d.principal, d.owed, d.holder!]);
    // a repays in full, in the same place: the tablet is its own again.
    new TurnEngine(s).applyLife(a, newLifeChoice({ repay: [d.id] }));
    Assert.equal([94, 106, "repaid", a.id], [a.purse, b.purse, d.how, d.holder!]);
  });

  test("A lender hires a collector, who carries the tablet to the borrower's court and presents it there", () => {
    const [s] = servant();
    const l = lender(s);
    new TurnEngine(s).resolve(orders("Egypt", borrow(l.id, 100, 112, 1)));
    const d = s.debts[0];
    // The lender goes to Hatti's court; a free person there takes the job of collecting.
    l.at = "Hatti";
    const agent = s.characters.find((c) => c.status === "Free" && c !== l && c.duty === "None")!;
    [agent.at, agent.purse] = ["Hatti", 0];
    new TurnEngine(s).applyLife(l, newLifeChoice({ approach: newApproachMade({ to: agent.id, words: "Collect this.", giveGold: 5, fee: 15, collect: d.id }) }));
    s.turn++;
    new TurnEngine(s).applyLife(agent, newLifeChoice({ accept: [s.approaches[0].id] }));
    Assert.equal([agent.id, "Person"], [d.holder!, d.kept]);
    Assert.equal([l.id, d.id, 15, 5], [agent.errand!.employer, agent.errand!.debtId, agent.errand!.fee, agent.errand!.advance]);
    Assert.equal(["Travelling", null], [agent.duty, agent.at]);
    // It arrives at Egypt's court, and the king learns who holds his debt.
    const j = s.journeys.find((x) => x.kind === "Travel" && x.characterId === agent.id)!;
    s.turn = j.arriveTurn;
    new TurnEngine(s).arrivals();
    Assert.equal("Egypt", agent.at);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A debt presented" && i.subject === agent.id);
    Assert.true(Views.for(s, "Egypt").debts[0].here);
    // Repaid to it: what it collected is its employer's.
    new TurnEngine(s).resolve(orders("Egypt", repay(d.id, 112)));
    Assert.equal(112, agent.errand!.collected);
  });

  test("A captive's purse and tablets stay on it until its captor takes them; the dead rank below the living by what they held", () => {
    const [s] = servant();
    const l = lender(s);
    new TurnEngine(s).resolve(orders("Egypt", borrow(l.id, 100, 112, 6)));
    [l.status, l.heldBy, l.at] = ["Captured", "Hatti", "Hatti"];
    const gold = s.treasuries.get("Hatti").gold;
    new TurnEngine(s).goldAndTabletsTaken();
    Assert.equal([gold, 100], [s.treasuries.get("Hatti").gold, l.purse]);
    new TurnEngine(s).takePurse("Hatti", l);
    Assert.equal([gold + 100, 0], [s.treasuries.get("Hatti").gold, l.purse]);
    Assert.equal(["Hatti", "Archive"], [s.debts[0].holder!, s.debts[0].kept]);

    const rich = s.characters.find((c) => c.status === "Free" && c !== l)!;
    [rich.purse, rich.hoard, rich.at] = [10, newHoard({ at: "Babylonia", gold: 900 }), "Babylonia"];
    rich.status = "Dead";
    new TurnEngine(s).goldAndTabletsTaken();
    Assert.equal(910, rich.diedWith);
    Assert.null(rich.hoard);
    const ranking = Wealth.ranking(s);
    Assert.equal(rich, ranking.filter((w) => w.dead).sort((x, y) => y.total - x.total)[0].character);
    Assert.true(ranking.findIndex((w) => w.character === rich) > ranking.findIndex((w) => !w.dead && w.total === 0));
  });

  test("A free person lives from the market where it stays; a servant at its master's court pays nothing", () => {
    const [s, c] = servant();
    for (const x of s.characters) x.purse = 0;
    const free = first(s.characters, (x) => x.status === "Free" && x.duty === "None");
    [free.at, free.purse, c.purse] = ["Egypt", 50, 50];
    const m = new TurnEngine(s).market(new TurnEngine(s).map.capital("Egypt").id);
    const purse = m.purse;
    new TurnEngine(s).livingSeason();
    Assert.equal(50, c.purse);
    Assert.true(free.purse < 50);
    Assert.equal(purse + (50 - free.purse), m.purse);
    // A hoard pays its keep to the town that keeps it.
    free.hoard = newHoard({ at: "Egypt", gold: 100 });
    new TurnEngine(s).livingSeason();
    Assert.equal(100 - MoneyData.hoardFee, free.hoard.gold);
  });

  test("A hoard is kept where one stands, one city only, and lost to the taker when that city falls", () => {
    const [s] = servant();
    const c = first(s.characters, (x) => x.status === "Free" && x.duty === "None");
    [c.at, c.purse] = ["Egypt", 100];
    new TurnEngine(s).applyLife(c, newLifeChoice({ hoard: 80 }));
    Assert.equal([20, "Egypt", 80], [c.purse, c.hoard!.at, c.hoard!.gold]);
    c.at = "Hatti";
    new TurnEngine(s).applyLife(c, newLifeChoice({ hoard: 10 }));
    Assert.equal(80, c.hoard!.gold);
    s.falls.push(newKingdomFall({ power: "Egypt", turn: s.turn, conqueror: "Hatti", capital: "memphis" }));
    const gold = s.treasuries.get("Hatti").gold;
    new TurnEngine(s).debtsDie("Egypt");
    Assert.null(c.hoard);
    Assert.equal(gold + 80, s.treasuries.get("Hatti").gold);
  });

  test("Newcomers come through the doors only below the baseline, from a stream of their own", () => {
    Assert.equal(0, arrivalChance(60, 60));
    Assert.equal(0, arrivalChance(60, 61));
    Assert.equal(MoneyData.arrivalBase + 5, arrivalChance(60, 59));
    Assert.equal(MoneyData.arrivalMost, arrivalChance(60, 10));
    const make = (): GameState => {
      const s = newGame(9, newGameConfig({ catastropheChance: 0 }));
      for (const c of s.characters.slice(0, 40)) c.status = "Dead";
      return s;
    };
    const [x, y] = [make(), make()];
    for (let i = 0; i < 6; i++) {
      new TurnEngine(x).newcomers();
      new TurnEngine(y).newcomers();
      x.turn++;
      y.turn++;
    }
    const arrived = x.characters.filter((c) => c.arrived !== null);
    Assert.notEmpty(arrived);
    Assert.equal(
      arrived.map((c) => `${c.name}|${c.origin}|${c.purse}|${c.at}`),
      y.characters.filter((c) => c.arrived !== null).map((c) => `${c.name}|${c.origin}|${c.purse}|${c.at}`),
    );
    for (const c of arrived) {
      Assert.contains(c.facts, (f) => f.tag === "door" && f.text.startsWith("Came by "));
      Assert.equal("Free", c.status);
      Assert.true(c.at !== null || c.duty === "Travelling");
    }
  });

  test("Each character's strategy and road follow its traits by formula", () => {
    // A timid, loyal man never gets the keeper's or the outlaw's way, nor the bold road.
    const timid = newTraits({ loyalty: 85, greed: 20, competence: 50, ambition: 30, courage: 15 });
    Assert.equal("Steady", strategiesOf(timid)[0]);
    Assert.doesNotContain(strategiesOf(timid), (x) => x === "Keeper" || x === "Outlaw");
    Assert.false(isBold(timid));
    const bold = newTraits({ loyalty: 20, greed: 90, competence: 50, ambition: 50, courage: 85 });
    Assert.true(isBold(bold));
    Assert.true(["Keeper", "Outlaw"].includes(strategiesOf(bold)[0]));
    const s = newGame(3);
    for (const c of s.characters) {
      const [st, b] = [c.strategy, c.bold];
      Assert.false(chooseStrategy(c));
      Assert.equal([st, b], [c.strategy, c.bold]);
    }
  });

  test("Characters are told the ending's rule in words, never its numbers", () => {
    const words = endingWords(false, 44);
    Assert.contains("Nobody knows which season is the last", words);
    Assert.false(/\d/.test(words));
    Assert.contains("open age", endingWords(true, 44));
  });
});
