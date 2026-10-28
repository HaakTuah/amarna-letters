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
  feeFor,
  trustIn,
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

// <summary>Jobs, notice and renewal (item 11a, "Jobs, not wages"): when a job is done the rest of its fee falls due; a servant who wants more gives a season's notice and names a price; its master renews it with a new job or it leaves.</summary>
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

  // Nobody seeks service and nobody hires, so the going rate of service stays where it starts and prices stay put.
  function still(s: GameState): GameState {
    for (const c of s.characters) c.seeking = false;
    return s;
  }

  // A job of `term` seasons at `rate` a season, the whole fee handed over now: what any person takes, whatever its trust.
  const paidUp = (id: string, rate: number, term: number): Order => renew(id, rate * term, term, rate * term);

  // One of Egypt's envoys, on a one-season job for 12 (6 handed over), whose term ends with turn 1. Greedy and able, it asks 33 to serve on
  // (6 + 80/8 + 80/8 + reputation 10/5 = 28, and 5 more for its greed: since item 10 by the skill it believes it has, with
  // no debts or ties pressing on it); a modest one asks only 6.
  function servant(wantsMore: boolean = true, config: GameConfig | null = null): [GameState, Character] {
    let s = still(newGame(5, config ?? newGameConfig({ catastropheChance: 0 })));
    let c = first(s.characters, (c) => c.employer === "Egypt");
    c.secretMaster = null;
    c.traits.sympathy = null;
    [c.traits.competence, c.traits.greed, c.traits.loyalty] = wantsMore ? [80, 80, 50] : [20, 10, 80];
    const believed = wantsMore ? 80 : 20;
    c.belief = newSkills({ gather: believed, stealth: believed, forge: believed });
    c.ties = [];
    c.contract = newContract({ fee: 12, advance: 6, startTurn: 1, untilTurn: 1 });
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
          `${c.name} has done their job. They ask 33 shekels a season of a new term to serve on: renew them this season (order renew, a new fee and advance), or they leave at the start of turn 3 (or, if you send them out first, when they are next at your court).`,
    );
    // The rest of the fee fell due and was paid.
    Assert.equal(["Employed", "Egypt", 12, 12], [c.status, c.employer!, c.contract!.fee, c.contract!.advance]);
    Assert.contains(s.events, (e) => e.kind === "fee-paid");
    Assert.equal(1, s.payRecords.get("Egypt").kept);
    Assert.equal([33, 3], [c.contract!.noticePrice!, c.contract!.leavesTurn!]);

    // The king reads it in plain words, and it is still at court, ready to be sent.
    let line = single(Views.for(s, "Egypt").court, (x) => x.id === c.id);
    Assert.true(line.ready);
    Assert.equal(
      "a job for 12 shekels, 12 handed over and 0 due when it is done; has given notice: asks 33 a season of a new term to serve on; leaves at the start of turn 3 unless renewed",
      line.term,
    );
    Assert.equal([33, 3], [line.noticePrice!, line.leavesTurn!]);
  });

  test("A servant not renewed leaves at the start of the next season free at court and asking its price", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s).resolve(none());
    let fees = c.earned.fees;
    begin(s);
    Assert.equal(["Free", "Egypt"], [c.status, c.at!]);
    Assert.null(c.employer);
    // Nothing accrues: the season of its notice earned it nothing more (free now, it pays its own living).
    Assert.equal(fees, c.earned.fees);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.turn === 3 &&
        i.title === "A servant leaves" &&
        i.body === `${c.name}'s job is done and they were not renewed. They ask 33 shekels a season of a new term to serve again.`,
    );
    let known = single(Views.for(s, "Egypt").known, (x) => x.id === c.id);
    Assert.equal(["free", 33], [known.status, known.askingPrice!]);

    // The old master may hire it back at its price, the whole fee for six seasons handed over now.
    new TurnEngine(s).resolve(orders("Egypt", hire(c.id, 33 * 6, 6, 33 * 6)));
    Assert.equal(["Egypt", 198], [c.employer!, c.contract!.fee]);
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
      "a job for 12 shekels, 12 handed over and 0 due when it is done; has given notice: asks 33 a season of a new term to serve on; leaves when next at your court unless renewed",
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

  test("A renewal at the price starts a new job and ends the notice", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s);
    let purse = c.purse;
    // Half now: the rest counted only as far as it trusts Egypt, which has kept its one promise (84 in a hundred).
    Assert.equal(84, trustIn(s, "Egypt"));
    const fee = feeFor(33, 8, 50, 84);
    Assert.equal(288, fee);
    new TurnEngine(s).resolve(orders("Egypt", renew(c.id, fee, 8)));
    Assert.equal([288, 144, 2, 10], [c.contract!.fee, c.contract!.advance, c.contract!.startTurn, c.contract!.untilTurn]);
    Assert.null(c.contract!.noticePrice);
    Assert.null(c.contract!.leavesTurn);
    Assert.equal(purse + 144, c.purse);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.turn === 3 && i.title === "Contract renewed" && i.body === `${c.name} stays in your service through turn 10, for ${formatMoney(288)}, of which you handed over ${formatMoney(144)} now.`,
    );
    // A shekel less is refused.
    let [t, d] = servant();
    begin(t).resolve(none());
    begin(t).resolve(orders("Egypt", renew(d.id, fee - 1, 8)));
    Assert.equal(12, d.contract!.fee);
    Assert.contains(inboxOf(t, "Egypt"), (i) => i.title === "Not renewed");

    begin(s);
    Assert.equal(
      "a job for 288 shekels, 144 handed over and 144 due when it is done, through turn 10; when it is done at your court, if content they serve on for 6 seasons on the same terms, otherwise they give a season's notice and name a price",
      single(Views.for(s, "Egypt").court, (x) => x.id === c.id).term,
    );
  });

  test("A renewal below the price is refused with the price and the servant leaves", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    begin(s).resolve(orders("Egypt", paidUp(c.id, 20, 6)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.turn === 3 &&
        i.kind === "Rejected" &&
        i.title === "Not renewed" &&
        i.body === `${c.name} will not serve on for ${formatMoney(120)} for 6 seasons with ${formatMoney(120)} now; they ask 33 shekels a season, counting the rest only as far as they trust your court to pay it.`,
    );
    Assert.equal(12, c.contract!.fee);
    begin(s);
    Assert.equal("Free", c.status);
  });

  test("A servant away on notice may be renewed where it is", () => {
    let [s, c] = servant();
    begin(s).resolve(none());
    // Renewing is not a task: it may be renewed and sent out in the same season, or renewed while it is away.
    let v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [dispatch(c.id, "Babylonia", "Greetings."), renew(c.id, 120)] }));
    Assert.equal(2, v.accepted.length);
    // In either order: a renewal gives the servant no task, so it does not stand in the way of one.
    v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [renew(c.id, 120), dispatch(c.id, "Babylonia", "Greetings.")] }));
    Assert.equal(2, v.accepted.length);
    Assert.null(characterOf(renew(c.id, 120)));
    begin(s).resolve(orders("Egypt", dispatch(c.id, "Babylonia", "Greetings.")));
    begin(s).resolve(orders("Egypt", paidUp(c.id, 40, 6)));
    Assert.equal([240, 9], [c.contract!.fee, c.contract!.untilTurn]);
    while (c.duty !== "None") {
      let e = begin(s);
      for (const a of s.audiences)
        e.applyAudience(newAudienceRecord({ audienceId: a.id, delivered: "Greetings.", rounds: [newAudienceRound({ host: newHostReply({ end: true }) })] }));
      e.resolve(none());
    }
    Assert.equal(["Employed", "Egypt"], [c.status, c.employer!]);
  });

  test("A content servant serves on for six seasons on the same terms", () => {
    let [s, c] = servant(false);
    begin(s).resolve(none());
    let purse = c.purse;
    begin(s);
    // The rest of the old job (6) paid, and half of the new one (36 of 72) handed over now.
    Assert.equal([72, 36, 8], [c.contract!.fee, c.contract!.advance, c.contract!.untilTurn]);
    Assert.equal(purse + 6 + 36, c.purse);
    Assert.null(c.contract!.noticePrice);
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.turn === 2 &&
        i.title === "Contract renewed" &&
        i.body === `${c.name} has done their job, and was paid the rest of the fee, 6 shekels. They serve on for another 6 seasons, through turn 8, for ${formatMoney(72)}, of which 36 shekels was handed over now.`,
    );
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.title === "A servant gives notice");
  });

  test("One of your people at court may be renewed at any time at its price", () => {
    let [s, c] = servant();
    c.contract!.untilTurn = 10;
    // Below what it would ask at the end of its term: refused, with the price.
    new TurnEngine(s).resolve(orders("Egypt", paidUp(c.id, 30, 6)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.title === "Not renewed" &&
        i.body === `${c.name} will not serve on for ${formatMoney(180)} for 6 seasons with ${formatMoney(180)} now; they ask 33 shekels a season, counting the rest only as far as they trust your court to pay it.`,
    );
    Assert.equal([12, 10], [c.contract!.fee, c.contract!.untilTurn]);
    // A renewal sought raised the going rate a step, and with it the price.
    Assert.equal(105, s.goingRate);
    const price = renewalPrice(c, "Egypt", s.goingRate);
    begin(s).resolve(orders("Egypt", paidUp(c.id, price, 12)));
    // The 6 still to come from the job before is carried into the new one.
    Assert.equal([price * 12 + 6, 14], [c.contract!.fee, c.contract!.untilTurn]);
  });

  test("A servant renewed early takes no cut from what its present job pays", () => {
    // A free person at Egypt's court who pitched 60, hired at that, all of it now.
    let s = still(newGame(5, newGameConfig({ catastropheChance: 0 })));
    let c = first(s.characters, (x) => x.status === "Free" && x.heldBy === null && x.duty === "None");
    c.at = "Egypt";
    c.askingPrice.set("Egypt", 60);
    new TurnEngine(s).resolve(orders("Egypt", hire(c.id, 360, 6, 360)));
    Assert.equal(["Egypt", 360, 7], [c.employer!, c.contract!.fee, c.contract!.untilTurn]);
    let formula = renewalPrice(c, "Egypt");
    Assert.true(formula < 60);

    // What it would ask at the end of its term is less than its job pays now: renewed early, it still asks that.
    begin(s).resolve(orders("Egypt", renew(c.id, formula * 30, 30, 0)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) =>
        i.kind === "Rejected" &&
        i.title === "Not renewed" &&
        i.body.startsWith(`${c.name} will not serve on for ${formatMoney(formula * 30)} for 30 seasons with 0 shekels now; they ask `),
    );
    Assert.equal([360, 7], [c.contract!.fee, c.contract!.untilTurn]);

    // At what its present job pays (or what it would ask now, if the going rate has risen past it) it serves on, for the longer term.
    const price = Math.max(60, renewalPrice(c, "Egypt", s.goingRate));
    s.treasuries.get("Egypt").gold += 1000;
    begin(s).resolve(orders("Egypt", paidUp(c.id, price, 12)));
    Assert.equal([price * 12, 15], [c.contract!.fee, c.contract!.untilTurn]);
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
    Assert.equal(`${c.name} is already in your service; to keep them on, order renew`, refusal(s, hire(c.id, 240)));
    begin(s).resolve(orders("Egypt", dispatch(c.id, "Babylonia", "Greetings.")));
    Assert.equal(`${c.name} is not at your court and has not given notice`, refusal(s, renew(c.id, 240)));
    let stranger = first(s.characters, (x) => x.employer === "Hatti");
    Assert.equal(`${stranger.name} is not in your service`, refusal(s, renew(stranger.id, 240)));
    let [t, d] = servant();
    // A fee with an advance more than the whole is refused.
    Assert.equal("the advance must be between nothing and the whole fee", refusal(t, renew(d.id, 100, 6, 101)));
    let twice = new OrderValidator(t).validate("Egypt", newTurnSubmission({ orders: [renew(d.id, 240), renew(d.id, 300)] }));
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
        fee: 12,
        advance: 12,
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
      "a job for 12 shekels, 12 handed over and 0 due when it is done; has given notice: asks 33 a season of a new term to serve on; leaves when next at your court unless renewed",
      single(Views.for(s, "Egypt").court, (x) => x.id === c.id).term,
    );
    begin(s).resolve(orders("Egypt", paidUp(c.id, 35, 6)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.title === "Contract renewed" && i.body === `${c.name} stays in your service through turn 9, for ${formatMoney(210)}, of which you handed over ${formatMoney(210)} now.`,
    );
    let line = single(Views.for(s, "Egypt").court, (x) => x.id === c.id);
    Assert.equal(
      [
        "watching Hatti",
        "a job for 210 shekels, 210 handed over and 0 due when it is done, through turn 9; when it is done at your court, if content they serve on for 6 seasons on the same terms, otherwise they give a season's notice and name a price",
      ],
      [line.duty, line.term],
    );
    Assert.equal([210, 9], [c.contract!.fee, c.contract!.untilTurn]);
    Assert.equal([210, 9], [coverOf(c, "Egypt")!.fee, coverOf(c, "Egypt")!.contractUntil!]);

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
      [
        "on the road home",
        "a job for 12 shekels, 12 handed over and 0 due when it is done; has given notice: asks 33 a season of a new term to serve on; leaves when next at your court unless renewed",
      ],
      [line.duty, line.term],
    );

    // So the renewal the notice asked for is accepted, at the price it named.
    Assert.empty(new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [paidUp(c.id, 33, 6)] })).rejected);
    let until = s.turn + 6;
    e.resolve(orders("Egypt", paidUp(c.id, 33, 6)));
    Assert.contains(
      inboxOf(s, "Egypt"),
      (i) => i.title === "Contract renewed" && i.body === `${c.name} stays in your service through turn ${until}, for ${formatMoney(198)}, of which you handed over ${formatMoney(198)} now.`,
    );
    Assert.equal([198, until], [c.contract!.fee, c.contract!.untilTurn]);
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
      (id) => [paidUp(id, 40, 6)],
    );
    Assert.equal(["Employed", "Egypt", 240], [c.status, c.employer!, c.contract!.fee]);
    Assert.empty(s.sleep.get("Egypt").pendingWake);
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => ["A servant leaves", "Not renewed"].includes(i.title));

    // A fresh renewal at another wage replaces the scheduled one, which neither fails nor wakes the seat.
    [s, c] = awake(
      (id) => [paidUp(id, 35, 6)],
      (id) => [paidUp(id, 40, 8)],
    );
    Assert.equal([320, 2 + 8], [c.contract!.fee, c.contract!.untilTurn]);
    Assert.empty(s.sleep.get("Egypt").pendingWake);
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.kind === "Rejected");
  });

  test("A fresh dismissal replaces a scheduled renewal of the same person", () => {
    let [s, c] = awake(
      (id) => [paidUp(id, 40, 6)],
      (id) => [dismiss(id)],
    );
    Assert.null(c.employer);
    Assert.empty(s.sleep.get("Egypt").pendingWake);
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.title === "Not renewed");
  });

  test("A renewal and an errand for the same person both run whichever was scheduled", () => {
    let [s, c] = awake(
      (id) => [dispatch(id, "Babylonia", "Greetings.")],
      (id) => [paidUp(id, 40, 6)],
    );
    Assert.equal(["EnvoyOutbound", 240], [c.duty, c.contract!.fee]);
    Assert.empty(s.sleep.get("Egypt").pendingWake);

    [s, c] = awake(
      (id) => [paidUp(id, 40, 6)],
      (id) => [dispatch(id, "Babylonia", "Greetings.")],
    );
    Assert.equal(["EnvoyOutbound", 240], [c.duty, c.contract!.fee]);
    Assert.empty(s.sleep.get("Egypt").pendingWake);
  });

  test("A captive on notice shows its notice and its job and may be renewed", () => {
    let [s, c] = servant();
    [c.contract!.noticePrice, c.contract!.leavesTurn] = [33, 1];
    [c.status, c.heldBy, c.at] = ["Captured", "Hatti", "Hatti"];
    let line = single(Views.for(s, "Egypt").court, (x) => x.id === c.id);
    // Its job stands while it is held, so its line names it.
    Assert.equal(
      [
        "held captive at the court of Hatti",
        "a job for 12 shekels, 6 handed over and 6 due when it is done; has given notice: asks 33 a season of a new term to serve on; leaves when next at your court unless renewed",
      ],
      [line.duty, line.term],
    );
    Assert.equal(12, line.fee);
    Assert.empty(new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [paidUp(c.id, 33, 6)] })).rejected);

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
    // Hired at that price for six seasons, all of it now; one not at your court cannot be hired.
    new TurnEngine(s).resolve(orders("Egypt", hire(free.id, line.askingPrice! * 6, 6, line.askingPrice! * 6)));
    Assert.equal("Egypt", free.employer);
    let away = first(s.characters, (c) => c.status === "Free" && c.at !== "Egypt" && c.at !== null);
    Assert.equal(`${away.name} is not at your court: a person is hired in person, where it stands`, refusal(s, hire(away.id, 600, 6)));
  });
});
