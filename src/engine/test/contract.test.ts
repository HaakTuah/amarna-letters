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
  newSkills,
  characterOf,
  coverOf,
  dismiss,
  dispatch,
  first,
  formatMoney,
  hire,
  inboxOf,
  newAudienceRecord,
  newAudienceRound,
  newContract,
  newCover,
  newGame,
  newGameConfig,
  newHostReply,
  newMindReply,
  newPlannedOrder,
  newSleepSpell,
  newSleepState,
  newTurnSubmission,
  placeSpy,
  renew,
  renewalPrice,
  single,
} from "@amarna/engine";
import { removeAll, Assert } from "./support.ts";

// <summary>Terms, notice and renewal: a servant who wants more gives a season's notice and names a price; its master renews it or it leaves.</summary>
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

  function refusal(s: GameState, o: Order): string {
    return single(new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [o] })).rejected).reason;
  }

  // One of Egypt's envoys, at a wage of 12, whose term ends with turn 1. Greedy and able, it asks 33 to serve on
  // (6 + 80/8 + 80/8 + reputation 10/5 = 28, and 5 more for its greed: since item 10 by the skill it believes it has, with
  // no debts or ties pressing on it); a modest one asks only 6.
  function servant(wantsMore: boolean = true, config: GameConfig | null = null): [GameState, Character] {
    let s = newGame(5, config ?? newGameConfig({ catastropheChance: 0 }));
    let c = first(s.characters, (c) => c.employer === "Egypt");
    c.secretMaster = null;
    c.traits.sympathy = null;
    [c.traits.competence, c.traits.greed, c.traits.loyalty] = wantsMore ? [80, 80, 50] : [20, 10, 80];
    const believed = wantsMore ? 80 : 20;
    c.belief = newSkills({ gather: believed, stealth: believed, forge: believed });
    c.ties = [];
    c.contract = newContract({ wage: 12, startTurn: 1, untilTurn: 1 });
    Assert.equal(wantsMore ? 33 : 6, renewalPrice(c, "Egypt"));
    return [s, c];
  }

  test("A servant who wants more gives a season s notice and names a price", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s);
    Assert.equal(2, s.turn);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.turn === 2 &&
        i.kind === "Notice" &&
        i.title === "A servant gives notice" &&
        i.body ===
          `${c.name}'s term has ended. They ask 33 shekels a season to serve on: renew them this season (order renew), or they leave at the start of turn 3 (or, if you send them out first, when they are next at your court).`,
    );
    Assert.equal(["Employed", "Egypt", 12], [c.status, c.employer!, c.contract!.wage]);
    Assert.equal([33, 3], [c.contract!.noticePrice!, c.contract!.leavesTurn!]);

    // The king reads it in plain words, and it is still at court, ready to be sent.
    let line = single(Views.for(s, "Egypt").court, (x) => x.id === c.id);
    Assert.true(line.ready);
    Assert.equal("serves at 12 a season; has given notice: asks 33 a season to serve on; leaves at the start of turn 3 unless renewed", line.term);
    Assert.equal([33, 3], [line.noticePrice!, line.leavesTurn!]);
  });

  test("A servant not renewed leaves at the start of the next season free at court and asking its price", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s).resolve(none());
    let purse = c.purse;
    begin(s);
    Assert.equal(["Free", "Egypt"], [c.status, c.at!]);
    Assert.null(c.employer);
    // It left before the season's wages: it served one season past its term, the season of its notice.
    Assert.equal(purse, c.purse);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.turn === 3 &&
        i.title === "A servant leaves" &&
        i.body === `${c.name}'s term has ended and they were not renewed. They ask 33 shekels a season to serve again.`,
    );
    let known = single(Views.for(s, "Egypt").known, (x) => x.id === c.id);
    Assert.equal(["free", 33], [known.status, known.askingPrice!]);

    // The old master may hire it back at its price.
    new TurnEngine(s).resolve(orders("Egypt", hire(c.id, 33)));
    Assert.equal(["Egypt", 33], [c.employer!, c.contract!.wage]);
    // The price it asked as a free person stays on its record, but means nothing now: one's own servant shows no asking price.
    Assert.equal(33, c.askingPrice.get("Egypt"));
    Assert.null(single(Views.for(s, "Egypt").court, (x) => x.id === c.id).askingPrice);
  });

  test("A servant away when its notice runs out leaves when it is next at court", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    // A servant on notice may still be sent on an errand: two seasons to Babylon, two back.
    begin(s).resolve(orders("Egypt", dispatch(c.id, "Babylonia", "Greetings.")));
    let e = begin(s);
    Assert.equal([3, "Employed", "EnvoyOutbound"], [s.turn, c.status, c.duty]);
    Assert.equal(
      "serves at 12 a season; has given notice: asks 33 a season to serve on; leaves when next at your court unless renewed",
      single(Views.for(s, "Egypt").court, (x) => x.id === c.id).term,
    );
    e.resolve(none());
    e = begin(s);
    e.applyAudience(
      newAudienceRecord({ audienceId: single(s.audiences).id, delivered: "Greetings.", rounds: [newAudienceRound({ host: newHostReply({ end: true }) })] }),
    );
    e.resolve(none());
    begin(s).resolve(none());
    Assert.equal("Employed", c.status);

    e = new TurnEngine(s);
    e.beginTurn();
    Assert.equal(6, s.turn);
    Assert.equal(["Free", "Egypt", "None"], [c.status, c.at!, c.duty]);
    // It still reports on its errand.
    Assert.contains(e.mindRequests, (r) => r.task === "EnvoyReport" && r.characterId === c.id && r.court === "Egypt");
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.turn === 6 && i.title === "A servant leaves" && i.subject === c.id);
  });

  test("A renewal at the price starts a new contract and ends the notice", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s).resolve(orders("Egypt", renew(c.id, 33, 8)));
    Assert.equal([33, 2, 10], [c.contract!.wage, c.contract!.startTurn, c.contract!.untilTurn]);
    Assert.null(c.contract!.noticePrice);
    Assert.null(c.contract!.leavesTurn);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.turn === 3 && i.title === "Contract renewed" && i.body === `${c.name} stays in your service at 33 shekels a season through turn 10.`,
    );

    let purse = c.purse;
    begin(s);
    Assert.equal(["Employed", purse + 33], [c.status, c.purse]);
    Assert.equal(
      "serves at 33 a season through turn 10; if content they then renew themselves, otherwise they give a season's notice and name a price",
      single(Views.for(s, "Egypt").court, (x) => x.id === c.id).term,
    );
  });

  test("A renewal below the price is refused with the price and the servant leaves", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s).resolve(orders("Egypt", renew(c.id, 20)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.turn === 3 &&
        i.kind === "Rejected" &&
        i.title === "Not renewed" &&
        i.body === `${c.name} will not serve on for 20 shekels a season; they ask 33 shekels.`,
    );
    Assert.equal(12, c.contract!.wage);
    begin(s);
    Assert.equal("Free", c.status);
  });

  test("A servant away on notice may be renewed where it is", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    // Renewing is not a task: it may be renewed and sent out in the same season, or renewed while it is away.
    let v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [dispatch(c.id, "Babylonia", "Greetings."), renew(c.id, 20)] }));
    Assert.equal(2, v.accepted.length);
    // In either order: a renewal gives the servant no task, so it does not stand in the way of one.
    v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [renew(c.id, 20), dispatch(c.id, "Babylonia", "Greetings.")] }));
    Assert.equal(2, v.accepted.length);
    Assert.null(characterOf(renew(c.id, 20)));
    begin(s).resolve(orders("Egypt", dispatch(c.id, "Babylonia", "Greetings.")));
    begin(s).resolve(orders("Egypt", renew(c.id, 40, 6)));
    Assert.equal([40, 9], [c.contract!.wage, c.contract!.untilTurn]);
    while (c.duty !== "None") {
      let e = begin(s);
      for (const a of s.audiences)
        e.applyAudience(newAudienceRecord({ audienceId: a.id, delivered: "Greetings.", rounds: [newAudienceRound({ host: newHostReply({ end: true }) })] }));
      e.resolve(none());
    }
    Assert.equal(["Employed", "Egypt"], [c.status, c.employer!]);
  });

  test("A content servant renews itself for six seasons at the same wage", () => {
    let [s, c] = servant(false);
    begin(s).resolve(none());
    begin(s);
    Assert.equal([12, 8], [c.contract!.wage, c.contract!.untilTurn]);
    Assert.null(c.contract!.noticePrice);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.turn === 2 && i.title === "Contract renewed" && i.body === `${c.name} stays in your service at 12 shekels a season through turn 8.`,
    );
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.title === "A servant gives notice");
  });

  test("One of your people at court may be renewed at any time at its price", () => {
    let [s, c] = servant();
    c.contract!.untilTurn = 10;
    // Below what it would ask at the end of its term: refused, with the price.
    new TurnEngine(s).resolve(orders("Egypt", renew(c.id, 30)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.title === "Not renewed" && i.body === `${c.name} will not serve on for 30 shekels a season; they ask 33 shekels.`,
    );
    Assert.equal([12, 10], [c.contract!.wage, c.contract!.untilTurn]);
    begin(s).resolve(orders("Egypt", renew(c.id, 33, 12)));
    Assert.equal([33, 14], [c.contract!.wage, c.contract!.untilTurn]);
  });

  test("A servant renewed early takes no cut from its present wage", () => {
    // A free person at Egypt's court who pitched 60, hired at that.
    let s = newGame(5, newGameConfig({ catastropheChance: 0 }));
    let c = first(s.characters, (x) => x.status === "Free" && x.heldBy === null);
    c.at = "Egypt";
    c.askingPrice.set("Egypt", 60);
    new TurnEngine(s).resolve(orders("Egypt", hire(c.id, 60)));
    Assert.equal(["Egypt", 60, 7], [c.employer!, c.contract!.wage, c.contract!.untilTurn]);
    let formula = renewalPrice(c, "Egypt");
    Assert.true(formula < 60);

    // What it would ask at the end of its term is less than it earns now: renewed early, it still asks its present wage.
    begin(s).resolve(orders("Egypt", renew(c.id, formula, 30)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.kind === "Rejected" &&
        i.title === "Not renewed" &&
        i.body === `${c.name} will not serve on for ${formatMoney(formula)} a season; they ask ${formatMoney(60)}, their present wage.`,
    );
    Assert.equal([60, 7], [c.contract!.wage, c.contract!.untilTurn]);

    // At its present wage it serves on, for the longer term.
    begin(s).resolve(orders("Egypt", renew(c.id, 60, 12)));
    Assert.equal([60, 15], [c.contract!.wage, c.contract!.untilTurn]);
  });

  test("A servant dismissed earlier in the season is not renewed", () => {
    let [s, c] = servant();
    c.contract!.untilTurn = 10;
    let v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [dismiss(c.id), renew(c.id, 40)] }));
    Assert.equal(2, v.accepted.length);
    new TurnEngine(s).resolve(orders("Egypt", dismiss(c.id), renew(c.id, 40)));
    Assert.equal("Free", c.status);
    Assert.null(c.employer);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.kind === "Rejected" && i.title === "Not renewed" && i.body === `${c.name} is no longer in your service, so could not be renewed.`,
    );
  });

  test("Renew needs one of your people at court or on notice and hire is only for people not in your service", () => {
    let [s, c] = servant();
    c.contract!.untilTurn = 10;
    Assert.equal(`${c.name} is already in your service; to keep them on, order renew`, refusal(s, hire(c.id, 40)));
    begin(s).resolve(orders("Egypt", dispatch(c.id, "Babylonia", "Greetings.")));
    Assert.equal(`${c.name} is not at your court and has not given notice`, refusal(s, renew(c.id, 40)));
    let stranger = first(s.characters, (x) => x.employer === "Hatti");
    Assert.equal(`${stranger.name} is not in your service`, refusal(s, renew(stranger.id, 40)));

    let [t, d] = servant();
    let twice = new OrderValidator(t).validate("Egypt", newTurnSubmission({ orders: [renew(d.id, 40), renew(d.id, 50)] }));
    Assert.equal(`${d.name} was already renewed by an earlier order`, single(twice.rejected).reason);
  });

  test("A servant giving notice wakes a sleeping seat", () => {
    let [s, c] = servant(undefined, newGameConfig({ catastropheChance: 0, sleepingSeats: true }));
    s.sleep.set("Egypt", newSleepState({ asleep: true, wakeAt: 50, history: [newSleepSpell({ from: 1 })] }));
    begin(s).resolve(none());
    let e = begin(s);
    e.wakeCheck();
    Assert.false(s.sleep.get("Egypt").asleep);
    Assert.equal([`a servant gives notice: ${c.name} asks 33 shekels a season to serve on`], s.sleep.get("Egypt").wokenBecause);
  });

  test("A servant believed away on notice is renewed as its master believes", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s).resolve(orders("Egypt", placeSpy(c.id, "Hatti")));
    // Caught at Hatti's court, as its master does not know: it still reads as on notice, watching Hatti.
    c.covers.push(
      newCover({
        for: "Egypt",
        since: s.turn,
        believed: "SpyPosted",
        dutyText: "watching Hatti",
        whereText: "at the court of Hatti",
        wage: 12,
        contractUntil: 1,
        noticePrice: 33,
        leavesTurn: 3,
      }),
    );
    c.status = "Captured";
    c.heldBy = "Hatti";
    c.at = "Hatti";
    c.duty = "None";
    removeAll(s.journeys, (j) => j.characterId === c.id);
    Assert.equal(
      "serves at 12 a season; has given notice: asks 33 a season to serve on; leaves when next at your court unless renewed",
      single(Views.for(s, "Egypt").court, (x) => x.id === c.id).term,
    );
    begin(s).resolve(orders("Egypt", renew(c.id, 35, 6)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.title === "Contract renewed" && i.body === `${c.name} stays in your service at 35 shekels a season through turn 9.`,
    );
    let line = single(Views.for(s, "Egypt").court, (x) => x.id === c.id);
    Assert.equal(
      ["watching Hatti", "serves at 35 a season through turn 9; if content they then renew themselves, otherwise they give a season's notice and name a price"],
      [line.duty, line.term],
    );
    Assert.equal([35, 9], [c.contract!.wage, c.contract!.untilTurn]);
    // Nothing leaves the treasury for anyone away: the back pay its master believes it owes grows by the new wage, and so
    // does what it is really owed, since it truly still serves.
    let [purse, believed, owed] = [c.purse, coverOf(c, "Egypt")!.backPay, c.backPay.getOrDefault("Egypt", 0)];
    begin(s);
    Assert.equal([purse, believed + 35, owed + 35], [c.purse, coverOf(c, "Egypt")!.backPay, c.backPay.get("Egypt")]);
    Assert.equal(believed + 35, single(Views.for(s, "Egypt").court, (x) => x.id === c.id).backPay);
  });

  test("An envoy on notice detained abroad keeps its notice in its master s eyes", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s).resolve(orders("Egypt", dispatch(c.id, "Alashiya", "Greetings.")));
    let e = begin(s);
    while (s.audiences.length === 0) {
      e.resolve(none());
      e = begin(s);
    }

    // Alashiya holds it; Egypt, which has not heard, sees it on the road home, still on notice.
    e.applyAudience(
      newAudienceRecord({ audienceId: single(s.audiences).id, delivered: "Greetings.", rounds: [newAudienceRound({ host: newHostReply({ detain: true }) })] }),
    );
    Assert.equal(["Detained", "Alashiya"], [c.duty, c.heldBy!]);
    Assert.notNull(coverOf(c, "Egypt"));
    let line = single(Views.for(s, "Egypt").court, (x) => x.id === c.id);
    Assert.equal(
      ["on the road home", "serves at 12 a season; has given notice: asks 33 a season to serve on; leaves when next at your court unless renewed"],
      [line.duty, line.term],
    );

    // So the renewal the notice asked for is accepted, at the price it named.
    Assert.empty(new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [renew(c.id, 33)] })).rejected);
    let until = s.turn + 6;
    e.resolve(orders("Egypt", renew(c.id, 33, 6)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.title === "Contract renewed" && i.body === `${c.name} stays in your service at 33 shekels a season through turn ${until}.`,
    );
    Assert.equal([33, until], [c.contract!.wage, c.contract!.untilTurn]);
  });

  // Egypt awake in the season of its servant's notice, with orders scheduled for that season: resolves the
  // scheduled orders together with the fresh ones.
  function awake(scheduled: (a0: string) => Order[], fresh: (a0: string) => Order[]): [GameState, Character] {
    let [s, c] = servant(undefined, newGameConfig({ catastropheChance: 0, sleepingSeats: true }));
    begin(s).resolve(none());
    let e = begin(s);
    s.sleep.set(
      "Egypt",
      newSleepState({ wakeAt: 50, lastCalled: s.turn, scheduled: [...scheduled(c.id).map((o) => newPlannedOrder({ turn: s.turn, order: o }))] }),
    );
    e.resolve(orders("Egypt", ...fresh(c.id)));
    return [s, c];
  }

  test("A fresh renewal replaces a scheduled dismissal or renewal of the same person", () => {
    // Woken by the notice, the king renews the servant it had meant to dismiss.
    let [s, c] = awake(
      (id) => [dismiss(id)],
      (id) => [renew(id, 40, 6)],
    );
    Assert.equal(["Employed", "Egypt", 40], [c.status, c.employer!, c.contract!.wage]);
    Assert.empty(s.sleep.get("Egypt").pendingWake);
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => ["A servant leaves", "Not renewed"].includes(i.title));

    // A fresh renewal at another wage replaces the scheduled one, which neither fails nor wakes the seat.
    [s, c] = awake(
      (id) => [renew(id, 35, 6)],
      (id) => [renew(id, 40, 8)],
    );
    Assert.equal([40, 2 + 8], [c.contract!.wage, c.contract!.untilTurn]);
    Assert.empty(s.sleep.get("Egypt").pendingWake);
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.kind === "Rejected");
  });

  test("A fresh dismissal replaces a scheduled renewal of the same person", () => {
    let [s, c] = awake(
      (id) => [renew(id, 40, 6)],
      (id) => [dismiss(id)],
    );
    Assert.null(c.employer);
    Assert.empty(s.sleep.get("Egypt").pendingWake);
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.title === "Not renewed");
  });

  test("A renewal and an errand for the same person both run whichever was scheduled", () => {
    let [s, c] = awake(
      (id) => [dispatch(id, "Babylonia", "Greetings.")],
      (id) => [renew(id, 40, 6)],
    );
    Assert.equal(["EnvoyOutbound", 40], [c.duty, c.contract!.wage]);
    Assert.empty(s.sleep.get("Egypt").pendingWake);

    [s, c] = awake(
      (id) => [renew(id, 40, 6)],
      (id) => [dispatch(id, "Babylonia", "Greetings.")],
    );
    Assert.equal(["EnvoyOutbound", 40], [c.duty, c.contract!.wage]);
    Assert.empty(s.sleep.get("Egypt").pendingWake);
  });

  test("A captive on notice shows its notice and its wage and may be renewed", () => {
    let [s, c] = servant();
    [c.contract!.noticePrice, c.contract!.leavesTurn] = [33, 1];
    [c.status, c.heldBy, c.at] = ["Captured", "Hatti", "Hatti"];
    let line = single(Views.for(s, "Egypt").court, (x) => x.id === c.id);
    // Its wage builds up as back pay while it is held, so its line names it.
    Assert.equal(
      [
        "held captive at the court of Hatti",
        "serves at 12 a season; has given notice: asks 33 a season to serve on; leaves when next at your court unless renewed",
      ],
      [line.duty, line.term],
    );
    Assert.equal(12, line.wage);
    Assert.empty(new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [renew(c.id, 33)] })).rejected);

    // One dead in your service has no term.
    c.status = "Dead";
    c.facts[0].knownBy.push("Egypt");
    c.facts[0].secrecy = "Hidden";
    Assert.equal("", single(Views.for(s, "Egypt").known, (x) => x.id === c.id).term);
  });

  test("A free person at your court shows what they ask", () => {
    let s = newGame(5);
    let free = first(s.characters, (c) => c.status === "Free");
    free.at = "Egypt";
    free.pitches.clear();
    free.askingPrice.clear();
    let line = single(Views.for(s, "Egypt").known, (x) => x.id === free.id);
    Assert.equal(basePrice(free, "Egypt"), line.askingPrice);
    // Nobody else sees a price for them.
    Assert.doesNotContain(Views.for(s, "Hatti").known, (x) => x.id === free.id && x.askingPrice !== null);
    // Hired at that price.
    new TurnEngine(s).resolve(orders("Egypt", hire(free.id, line.askingPrice!)));
    Assert.equal("Egypt", free.employer);
  });
});
