import { describe, test } from "vitest";
import { host } from "../../game/src/bots/statecraft-letters.ts";
import {
  type Character,
  Dict,
  type EnvoyReaction,
  type GameState,
  GameStateSchema,
  type HostReply,
  type Order,
  OrderValidator,
  type PendingAudience,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  char,
  check,
  clone,
  counterIntel,
  coverOf,
  dismiss,
  dispatch,
  factsKnownTo,
  first,
  hire,
  inboxOf,
  newAudienceRecord,
  newAudienceRound,
  newEnvoyReaction,
  newFact,
  newGame,
  newHostReply,
  newMindReply,
  newMindRequest,
  newTurnSubmission,
  placeSpy,
  recall,
  release,
  single,
  sum,
} from "@amarna/engine";
import { fresh, removeAll, Assert, firstOrNull, singleOrNull, skilled } from "./support.ts";
import { captive as captiveOrder } from "@amarna/engine";

// News of a court's people abroad reaches it only by rumour or when they return: a servant who is held,
// changes sides or dies abroad appears to its master as it would have in the normal course of events,
// its back pay growing in the master's books as for anyone away, until word comes.
describe("CoverTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
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

  // What a court sees of one of its people, and of its treasury, its back pay and its strength (and the true gold behind
  // them): everything a cover must keep the same.
  function seenOf(s: GameState, p: Power, id: string): string {
    let v = Views.for(s, p);
    return JSON.stringify({
      person: singleOrNull(v.court, (c) => c.id === id),
      gold: v.gold,
      fine: s.treasuries.get(p).gold,
      fees: v.fees,
      feesDue: v.feesDue,
      strength: v.strength,
      court: v.court.length,
    });
  }

  // <summary>Egypt's envoy stands before Alashiya's king; the state is cloned so the audience can end two ways.</summary>
  function atAudience(): [GameState, Character] {
    let s = newGame(5);
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    // Enough in Alashiya's treasury to pay a defector's wage every season (item 10's attested envoys are paid by their own competence).
    s.treasuries.get("Alashiya").gold += 1000;
    envoy.secretMaster = null;
    let e = begin(s);
    e.resolve(orders("Egypt", dispatch(envoy.id, "Alashiya", "Hello.")));
    while (s.audiences.length === 0) {
      e = begin(s);
      if (s.audiences.length === 0) e.resolve(none());
    }
    return [s, envoy];
  }

  function endAudience(at: GameState, host: HostReply, envoy: EnvoyReaction | null = null): GameState {
    let s = clone(GameStateSchema, at);
    let e = new TurnEngine(s);
    e.applyAudience(
      newAudienceRecord({
        audienceId: single(s.audiences).id,
        delivered: "Hello.",
        rounds: [newAudienceRound({ host: host, envoy: envoy ?? newEnvoyReaction() })],
      }),
    );
    return s;
  }

  test("A detained envoy appears to its lord as one sent home until it is overdue", () => {
    let [at, envoy] = atAudience();
    let travel = new TurnEngine(at).travelTurns("Alashiya", "Egypt");
    let home = endAudience(at, newHostReply({ end: true }));
    let held = endAudience(at, newHostReply({ detain: true }));
    Assert.equal("Detained", char(held, envoy.id).duty);

    // From the audience until the season it would have come home, Egypt sees the same in both games: its treasury, its
    // strength, and the job as agreed, the rest of its fee still to fall due (item 11a: nothing accrues either way).
    Assert.equal(seenOf(home, "Egypt", envoy.id), seenOf(held, "Egypt", envoy.id));
    Assert.contains('"duty":"on the road home"', seenOf(held, "Egypt", envoy.id));
    const fee = envoy.contract!.fee;
    for (let i = 1; i < travel; i++) {
      new TurnEngine(home).resolve(none());
      new TurnEngine(held).resolve(none());
      begin(home);
      begin(held);
      Assert.equal(seenOf(home, "Egypt", envoy.id), seenOf(held, "Egypt", envoy.id));
      Assert.equal(fee, single(Views.for(held, "Egypt").court, (c) => c.id === envoy.id).fee);
    }

    // Then the rumour that it is overdue: the cover ends, and Egypt sees what it has heard.
    while (!inboxOf(held, "Egypt").some((x) => x.kind === "Rumor" && x.subject === envoy.id)) {
      Assert.equal("on the road home", single(Views.for(held, "Egypt").court, (c) => c.id === envoy.id).duty);
      new TurnEngine(held).resolve(none());
      begin(held);
    }
    Assert.empty(char(held, envoy.id).covers);
    let seen = single(Views.for(held, "Egypt").court, (c) => c.id === envoy.id);
    Assert.equal("has not returned from Alashiya", seen.duty);
    Assert.false(seen.ready);
  });

  test("An envoy who changes sides stays on its lords list with its job as agreed until dismissed", () => {
    let [at, envoy] = atAudience();
    let travel = new TurnEngine(at).travelTurns("Alashiya", "Egypt");
    let feeBefore = char(at, envoy.id).contract!.fee;
    let home = endAudience(at, newHostReply({ end: true }));
    let gone = endAudience(at, newHostReply({ jobOffer: 40 }), newEnvoyReaction({ acceptJob: true }));
    let defector = char(gone, envoy.id);
    Assert.equal("Alashiya", defector.employer);
    Assert.contains(defector.facts, (f) => f.tag === "defected" && f.secrecy === "Public");
    // It broke its job with Egypt; Egypt's books still count the job as agreed.
    Assert.equal(feeBefore, coverOf(defector, "Egypt")!.fee);

    // Egypt sees an envoy on the road home, with no word of the public fact.
    Assert.equal(seenOf(home, "Egypt", envoy.id), seenOf(gone, "Egypt", envoy.id));
    for (let i = 1; i < travel; i++) {
      new TurnEngine(home).resolve(none());
      new TurnEngine(gone).resolve(none());
      begin(home);
      begin(gone);
      Assert.equal(seenOf(home, "Egypt", envoy.id), seenOf(gone, "Egypt", envoy.id));
    }
    Assert.contains(Views.for(gone, "Alashiya").court, (c) => c.id === envoy.id && c.ready);

    // Word comes only that it has not returned, as for an envoy who is held: it stays on the list, its job as agreed.
    while (!inboxOf(gone, "Egypt").some((x) => x.kind === "Rumor" && x.subject === envoy.id)) {
      new TurnEngine(gone).resolve(none());
      begin(gone);
    }
    let seen = single(Views.for(gone, "Egypt").court, (c) => c.id === envoy.id);
    Assert.equal("has not returned from Alashiya", seen.duty);
    Assert.equal("unknown", seen.where);
    // No longer due back: the word that it has not returned clears the reckoning, as for an envoy really held.
    Assert.equal("", seen.timing);
    Assert.doesNotContain(seen.knownFacts, (f) => f.includes("Abandoned"));
    Assert.equal(feeBefore, seen.fee);
    // Its new master handed over the advance of its new job when it went over (half of six seasons at 40).
    Assert.equal([240, 120], [defector.contract!.fee, defector.contract!.advance]);

    // Dismissing it is accepted, like any servant away, and ends the cover and the rest of the fee Egypt believed would fall due.
    let v = new OrderValidator(gone).validate("Egypt", newTurnSubmission({ orders: [dismiss(envoy.id)] }));
    Assert.empty(v.rejected);
    let due = Views.for(gone, "Egypt").feesDue;
    new TurnEngine(gone).resolve(orders("Egypt", dismiss(envoy.id)));
    Assert.null(coverOf(defector, "Egypt"));
    Assert.equal(due - (seen.fee! - seen.advance!), Views.for(gone, "Egypt").feesDue);
    Assert.contains(inboxOf(gone, "Egypt"), (i) => i.title === "A servant leaves" && i.body === `${defector.name} has been dismissed.`);
    begin(gone);
    Assert.doesNotContain(Views.for(gone, "Egypt").court, (c) => c.id === envoy.id);
    Assert.equal("Alashiya", defector.employer);
    Assert.equal(240, defector.contract!.fee);
  });

  test("Orders for a servant its master believes away never betray what happened", () => {
    let [at, envoy] = atAudience();
    let gone = endAudience(at, newHostReply({ jobOffer: 40 }), newEnvoyReaction({ acceptJob: true }));
    let rejected = new OrderValidator(gone).validate(
      "Egypt",
      newTurnSubmission({
        orders: [dispatch(envoy.id, "Hatti", "Go."), placeSpy(envoy.id, "Hatti"), recall(envoy.id)],
      }),
    ).rejected;
    Assert.equal(`${envoy.name} is not at your court`, rejected[0].reason);
    Assert.equal(`a spy must be one of your own people at your court: ${envoy.name} is not at your court`, rejected[1].reason);
    Assert.equal(`${envoy.name} is not on a mission`, rejected[2].reason);

    // The same orders for an envoy really on the road home read the same.
    let home = endAudience(at, newHostReply({ end: true }));
    let normal = new OrderValidator(home).validate(
      "Egypt",
      newTurnSubmission({
        orders: [dispatch(envoy.id, "Hatti", "Go."), placeSpy(envoy.id, "Hatti"), recall(envoy.id)],
      }),
    ).rejected;
    Assert.equal(
      normal.map((r) => r.reason),
      rejected.map((r) => r.reason),
    );
  });

  // Babylonia's spy at Assyria's court (or watching , held by ), in
  // two games from one seed: in the first the host pays heavy watchmen and catches it, in the second nobody does.
  // Returns both at the season after the catch.
  function caughtSpy(host: Power = "Assyria", province: string | null = null): [GameState, GameState, string] {
    for (let seed = 1; seed <= 40; seed++) {
      function game(): GameState {
        let s = newGame(seed);
        let c = first(s.characters, (x) => x.employer === "Babylonia");
        c.secretMaster = null;
        skilled(c, 10);
        s.treasuries.get(host).gold = 100000;
        s.treasuries.get("Babylonia").gold = 100000;
        return s;
      }
      let [caught, free] = [game(), game()];
      let id = first(caught.characters, (x) => x.employer === "Babylonia").id;
      let post = province === null ? placeSpy(id, host) : placeSpy(id, null, province);
      for (const s of [caught, free]) begin(s).resolve(orders("Babylonia", post));
      for (let i = 0; i < 6; i++) {
        begin(caught).resolve(orders(host, counterIntel(5000)));
        begin(free).resolve(none());
        if (char(free, id).status === "Captured") break;
        if (char(caught, id).status !== "Captured") continue;
        begin(caught);
        begin(free);
        return [caught, free, id];
      }
    }
    throw new Error("no seed gave a catch in one game and none in the other");
  }

  test("A caught spy appears at its post until the ransom demand arrives", () => {
    let [caught, free, id] = caughtSpy();
    Assert.notNull(coverOf(char(caught, id), "Babylonia"));
    for (let i = 0; i < 3; i++) {
      Assert.equal(seenOf(free, "Babylonia", id), seenOf(caught, "Babylonia", id));
      new TurnEngine(caught).resolve(none());
      new TurnEngine(free).resolve(none());
      begin(caught);
      begin(free);
    }
    let before = single(Views.for(caught, "Babylonia").court, (c) => c.id === id);
    Assert.equal("watching Assyria", before.duty);
    Assert.equal("at the court of Assyria", before.where);
    Assert.false(before.ready);
    Assert.null(before.ransomDemand);

    // Assyria asks a ransom: once the word arrives Babylonia sees its spy held, with the demand, and what it really owes it.
    new TurnEngine(caught).resolve(orders("Assyria", captiveOrder(id, "Ransom", 90)));
    while (!inboxOf(caught, "Babylonia").some((x) => x.kind === "Rumor" && x.subject === id)) {
      begin(caught);
      new TurnEngine(caught).resolve(none());
    }
    let known = single(Views.for(caught, "Babylonia").court, (c) => c.id === id);
    Assert.empty(char(caught, id).covers);
    Assert.equal("captured", known.status);
    Assert.equal("held captive at the court of Assyria; Assyria demands 1 mina 30 shekels for their return (order pay_ransom)", known.duty);
    Assert.equal(90, known.ransomDemand);
    Assert.false(known.ready);
    // A captive's job stands, as it did while its master believed it at its post: the rest of its fee is still to fall due.
    Assert.equal(char(caught, id).contract!.fee, known.fee);
    Assert.equal(
      new TurnEngine(caught).feesDue("Babylonia"),
      sum(Views.for(caught, "Babylonia").court, (c) => (c.fee ?? 0) - (c.advance ?? 0)),
    );
  });

  test("A province watcher gives its master no live sight of its post, caught or free (item 9: its reports come by road)", () => {
    let [caught, free, id] = caughtSpy("Egypt", "thebes");
    Assert.equal("Captured", char(caught, id).status);
    function sight(g: GameState): string {
      let v = Views.for(g, "Babylonia");
      return JSON.stringify({ visible: v.visible, units: v.units });
    }
    Assert.doesNotContain("thebes", Views.for(caught, "Babylonia").visible);
    Assert.doesNotContain("thebes", Views.for(free, "Babylonia").visible);
    for (let i = 0; i < 3; i++) {
      // What it can see is the same whether its spy was caught or not: the capture is not read off its sight.
      Assert.equal(sight(free), sight(caught));
      Assert.equal(seenOf(free, "Babylonia", id), seenOf(caught, "Babylonia", id));
      new TurnEngine(caught).resolve(none());
      new TurnEngine(free).resolve(none());
      begin(caught);
      begin(free);
    }

    // Once word of the capture comes (here, a ransom demand), its master knows.
    new TurnEngine(caught).resolve(orders("Egypt", captiveOrder(id, "Ransom", 90)));
    while (!inboxOf(caught, "Babylonia").some((x) => x.kind === "Rumor" && x.subject === id)) {
      begin(caught);
      new TurnEngine(caught).resolve(none());
    }
    Assert.empty(char(caught, id).covers);
    Assert.doesNotContain("thebes", Views.for(caught, "Babylonia").visible);
  });

  test("An executed spy stays on its masters list until the rumour of its death", () => {
    let [caught, , id] = caughtSpy();
    new TurnEngine(caught).resolve(orders("Assyria", captiveOrder(id, "Execute")));
    Assert.equal("Dead", char(caught, id).status);
    function heard(): boolean {
      return inboxOf(caught, "Babylonia").some((x) => x.kind === "Rumor" && x.subject === id);
    }
    Assert.equal("watching Assyria", single(Views.for(caught, "Babylonia").court, (c) => c.id === id).duty);
    for (let i = 0; i < 4 && !heard(); i++) {
      begin(caught);
      if (heard()) break;
      Assert.equal("watching Assyria", single(Views.for(caught, "Babylonia").court, (c) => c.id === id).duty);
      new TurnEngine(caught).resolve(none());
    }
    Assert.true(heard());
    Assert.contains(inboxOf(caught, "Babylonia"), (x) => x.body.includes("was put to death in Assyria"));
    Assert.empty(char(caught, id).covers);
    Assert.doesNotContain(Views.for(caught, "Babylonia").court, (c) => c.id === id);
  });

  test("A caught spy recalled by its unknowing master appears on the road home", () => {
    let [caught, free, id] = caughtSpy();
    let v = new OrderValidator(caught).validate("Babylonia", newTurnSubmission({ orders: [recall(id)] }));
    Assert.empty(v.rejected);
    new TurnEngine(caught).resolve(orders("Babylonia", recall(id)));
    new TurnEngine(free).resolve(orders("Babylonia", recall(id)));
    Assert.equal(seenOf(free, "Babylonia", id), seenOf(caught, "Babylonia", id));
    Assert.equal("Captured", char(caught, id).status);
  });

  test("A turned province watcher goes back to its province", () => {
    let s = newGame(4);
    let spy = first(s.characters, (c) => c.employer === "Hatti");
    spy.status = "Captured";
    spy.heldBy = "Mitanni";
    spy.at = "Mitanni";
    spy.watchProvince = "washukanni";
    let e = begin(s);
    e.resolve(orders("Mitanni", captiveOrder(spy.id, "Turn", 0, "All is quiet.")));
    Assert.equal("SpyPosted", spy.duty);
    Assert.null(spy.at);
    // Hatti knew it was held: it goes on believing so until the first report from it arrives.
    while (!inboxOf(s, "Hatti").some((i) => i.kind === "SpyReport" && i.subject === spy.id)) {
      Assert.equal("at the court of Mitanni", single(Views.for(s, "Hatti").court, (c) => c.id === spy.id).where);
      begin(s).resolve(none());
    }
    let seen = single(Views.for(s, "Hatti").court, (c) => c.id === spy.id);
    Assert.equal(["watching washukanni", "in washukanni"], [seen.duty, seen.where]);
  });

  // ---------------------------------------------------------------- a defector on its new master's errands

  // <summary>Egypt's envoy has gone over to Alashiya at the audience: Egypt still believes it on the road home.</summary>
  function defectorOf(): [GameState, Character] {
    let [at, envoy] = atAudience();
    let s = endAudience(at, newHostReply({ jobOffer: 40 }), newEnvoyReaction({ acceptJob: true }));
    return [s, char(s, envoy.id)];
  }

  // <summary>Sends  from its new court to  and stops at the season it stands before that king.</summary>
  function sendTo(s: GameState, from: Power, c: Character, to: Power): PendingAudience {
    new TurnEngine(s).resolve(orders(from, dispatch(c.id, to, "Greetings.")));
    while (true) {
      let e = begin(s);
      const a = firstOrNull(s.audiences, (a) => a.envoyId === c.id);
      if (a !== null && a !== undefined) return a;
      e.resolve(none());
    }
  }

  function answer(s: GameState, a: PendingAudience, host: HostReply, envoy: EnvoyReaction | null = null): void {
    new TurnEngine(s).applyAudience(
      newAudienceRecord({ audienceId: a.id, delivered: "Greetings.", rounds: [newAudienceRound({ host: host, envoy: envoy ?? newEnvoyReaction() })] }),
    );
  }

  test("A defector held on its new masters errand is covered for that master and a release leaves the old masters cover", () => {
    let [s, defector] = defectorOf();
    let audience = sendTo(s, "Alashiya", defector, "Hatti");
    let egypt = seenOf(s, "Egypt", defector.id);
    let wages = new TurnEngine(s).feesDue("Alashiya");
    Assert.equal("at the court of Hatti as envoy", single(Views.for(s, "Alashiya").court, (c) => c.id === defector.id).duty);

    // Hatti holds it: Alashiya, which sent it, sees it on the road home, as Egypt still does.
    answer(s, audience, newHostReply({ detain: true }));
    Assert.equal("Detained", defector.duty);
    Assert.notNull(coverOf(defector, "Alashiya"));
    Assert.notNull(coverOf(defector, "Egypt"));
    let seen = single(Views.for(s, "Alashiya").court, (c) => c.id === defector.id);
    Assert.equal(["on the road home", "travelling"], [seen.duty, seen.where]);
    Assert.equal(wages, new TurnEngine(s).feesDue("Alashiya"));
    Assert.equal(egypt, seenOf(s, "Egypt", defector.id));

    // Hatti lets it go: Egypt's list and wages do not change for an event between two other courts.
    new TurnEngine(s).resolve(orders("Hatti", release(defector.id, "Go.")));
    Assert.notNull(coverOf(defector, "Egypt"));
    Assert.equal(egypt, seenOf(s, "Egypt", defector.id));
    Assert.equal("on the road home", single(Views.for(s, "Alashiya").court, (c) => c.id === defector.id).duty);
  });

  test("A defector that goes over again stays on both former masters lists", () => {
    let [s, defector] = defectorOf();
    let audience = sendTo(s, "Alashiya", defector, "Hatti");
    let egypt = seenOf(s, "Egypt", defector.id);
    let wages = new TurnEngine(s).feesDue("Alashiya");
    let court = Views.for(s, "Alashiya").court.length;

    answer(s, audience, newHostReply({ jobOffer: 50 }), newEnvoyReaction({ acceptJob: true }));
    Assert.equal("Hatti", defector.employer);
    Assert.equal(wages, new TurnEngine(s).feesDue("Alashiya"));
    Assert.equal(court, Views.for(s, "Alashiya").court.length);
    Assert.equal("on the road home", single(Views.for(s, "Alashiya").court, (c) => c.id === defector.id).duty);
    Assert.equal(egypt, seenOf(s, "Egypt", defector.id));
  });

  test("A defector sent to its old masters court is seen there as it is and no word of it follows", () => {
    let [s, defector] = defectorOf();
    Assert.notNull(coverOf(defector, "Egypt"));
    sendTo(s, "Alashiya", defector, "Egypt");

    // It stands before Egypt's king as Alashiya's envoy: the cover is gone, and so is the word that it is overdue.
    Assert.empty(defector.covers);
    Assert.doesNotContain(Views.for(s, "Egypt").court, (c) => c.id === defector.id);
    let known = single(Views.for(s, "Egypt").known, (c) => c.id === defector.id);
    Assert.equal(["Alashiya", "at your court"], [known.employer!, known.where]);
    Assert.contains(known.knownFacts, (f) => f.startsWith("Abandoned the service of"));
    Assert.doesNotContain(s.journeys, (j) => j.kind === "Rumor" && j.characterId === defector.id);
    for (let i = 0; i < 3; i++) {
      new TurnEngine(s).resolve(none());
      begin(s);
    }
    Assert.doesNotContain(inboxOf(s, "Egypt"), (x) => x.kind === "Rumor" && x.subject === defector.id);
  });

  test("A defector posted as a spy at its old masters court is not seen there and the cover holds", () => {
    let [s, defector] = defectorOf();
    Assert.notNull(coverOf(defector, "Egypt"));
    new TurnEngine(s).resolve(orders("Alashiya", placeSpy(defector.id, "Egypt")));
    for (let i = 0; i < 10 && defector.duty !== "SpyPosted"; i++) {
      begin(s);
      if (fresh(defector.duty) !== "SpyPosted") new TurnEngine(s).resolve(none());
    }
    Assert.equal(["SpyPosted", "Egypt"], [defector.duty, defector.at]);

    // It watches in secret: Egypt still believes what it believed of its servant, and does not see Alashiya's spy.
    Assert.notNull(coverOf(defector, "Egypt"));
    let v = Views.for(s, "Egypt");
    let mine = single(v.court, (c) => c.id === defector.id);
    Assert.true(mine.ours);
    Assert.notEqual("at your court", mine.where);
    Assert.doesNotContain(v.known, (c) => c.id === defector.id);

    // Caught by Egypt's watchmen, it is in Egypt's hands: the cover ends, and Egypt sees its captive.
    skilled(defector, 0);
    s.treasuries.get("Egypt").gold = 100000;
    for (let i = 0; i < 30 && defector.status !== "Captured"; i++) {
      new TurnEngine(s).resolve(orders("Egypt", counterIntel(200)));
      if (fresh(defector.status) !== "Captured") begin(s);
    }
    Assert.equal(["Captured", "Egypt"], [defector.status, defector.heldBy]);
    Assert.null(coverOf(defector, "Egypt"));
    v = Views.for(s, "Egypt");
    Assert.doesNotContain(v.court, (c) => c.id === defector.id);
    Assert.equal("your captive", single(v.known, (c) => c.id === defector.id).status);
  });

  test("A masters fall ends only its own covers", () => {
    let [s, defector] = defectorOf();
    let audience = sendTo(s, "Alashiya", defector, "Hatti");
    answer(s, audience, newHostReply({ detain: true }));
    Assert.equal(2, defector.covers.length);

    removeAll(s.units, (u) => u.power === "Egypt");
    for (const id of [...s.owner.entries()].filter((x) => x[1] === "Egypt").map((x) => x[0])) s.owner.set(id, "Babylonia");
    new TurnEngine(s).resolve(none());
    Assert.contains("Egypt", s.eliminated);
    Assert.null(coverOf(defector, "Egypt"));
    Assert.notNull(coverOf(defector, "Alashiya"));
  });

  // ---------------------------------------------------------------- inquiries, release, recall

  test("Inquiries into a servant believed away show in the court list as for any servant", () => {
    let [caught, , id] = caughtSpy();
    let spy = char(caught, id);
    for (let i = 0; i < 4; i++) spy.facts.push(newFact({ id: `f90${i}`, text: `Hidden fact ${i}.`, secrecy: "Hidden" }));
    new TurnEngine(caught).resolve(orders("Babylonia", check(id, 600)));
    begin(caught);
    Assert.notNull(coverOf(spy, "Babylonia"));
    let found = factsKnownTo(spy, "Babylonia").map((f) => f.text);
    Assert.contains(found, (f) => f.startsWith("Hidden fact"));
    Assert.equal(found, single(Views.for(caught, "Babylonia").court, (c) => c.id === id).knownFacts);

    // A defection's public fact stays unseen in the list until an inquiry finds it; then it shows, as the inquiry said.
    let [gone, defector] = defectorOf();
    Assert.doesNotContain(single(Views.for(gone, "Egypt").court, (c) => c.id === defector.id).knownFacts, (f) => f.startsWith("Abandoned"));
    new TurnEngine(gone).resolve(orders("Egypt", check(defector.id, 10)));
    begin(gone);
    Assert.contains(single(Views.for(gone, "Egypt").court, (c) => c.id === defector.id).knownFacts, (f) => f.startsWith("Abandoned"));
  });

  test("A detained envoy let go after its lord heard it was overdue reads so until it is home", () => {
    let [at, envoy] = atAudience();
    // No plague or flood to move Egypt's strength while the envoy is away (item 10+a: they kill people).
    at.config.catastropheChance = 0;
    let s = endAudience(at, newHostReply({ detain: true }));
    while (!inboxOf(s, "Egypt").some((x) => x.kind === "Rumor" && x.subject === envoy.id)) {
      new TurnEngine(s).resolve(none());
      begin(s);
    }
    let before = seenOf(s, "Egypt", envoy.id);
    Assert.contains('"duty":"has not returned from Alashiya"', before);

    new TurnEngine(s).resolve(orders("Alashiya", release(envoy.id, "Go home.")));
    Assert.equal("EnvoyHomebound", char(s, envoy.id).duty);
    Assert.equal(before, seenOf(s, "Egypt", envoy.id));
    while (true) {
      let e = begin(s);
      if (char(s, envoy.id).at === "Egypt") break;
      Assert.equal("has not returned from Alashiya", single(Views.for(s, "Egypt").court, (c) => c.id === envoy.id).duty);
      e.resolve(none());
    }
    Assert.true(single(Views.for(s, "Egypt").court, (c) => c.id === envoy.id).ready);
    Assert.contains(inboxOf(s, "Egypt"), (x) => x.kind === "EnvoyReport" && x.subject === envoy.id);
  });

  test("An envoy held and let go in the same season comes home on time with no word that it is overdue", () => {
    let [at, envoy] = atAudience();
    let s = endAudience(at, newHostReply({ detain: true }));
    new TurnEngine(s).resolve(orders("Alashiya", release(envoy.id, "Go.")));
    Assert.equal("on the road home", single(Views.for(s, "Egypt").court, (c) => c.id === envoy.id).duty);
    for (let i = 0; i < 4; i++) {
      begin(s);
      new TurnEngine(s).resolve(none());
    }
    Assert.equal("Egypt", char(s, envoy.id).at);
    Assert.doesNotContain(inboxOf(s, "Egypt"), (x) => x.kind === "Rumor" && x.subject === envoy.id);
  });

  test("A court that dismissed a servant it believed away hears no word that it is overdue", () => {
    let [at, envoy] = atAudience();
    let s = endAudience(at, newHostReply({ detain: true }));
    new TurnEngine(s).resolve(orders("Egypt", dismiss(envoy.id)));
    Assert.contains(s.journeys, (j) => j.news === "Overdue" && j.characterId === envoy.id);
    while (s.journeys.some((j) => j.news === "Overdue")) begin(s).resolve(none());
    Assert.doesNotContain(inboxOf(s, "Egypt"), (x) => x.kind === "Rumor" && x.subject === envoy.id);
  });

  test("A caught spy let go appears at its post until it is home", () => {
    let [caught, , id] = caughtSpy();
    new TurnEngine(caught).resolve(orders("Assyria", captiveOrder(id, "Release")));
    Assert.equal("EnvoyHomebound", char(caught, id).duty);
    Assert.equal("watching Assyria", single(Views.for(caught, "Babylonia").court, (c) => c.id === id).duty);
    while (true) {
      let e = begin(caught);
      if (char(caught, id).at === "Babylonia") break;
      Assert.equal("watching Assyria", single(Views.for(caught, "Babylonia").court, (c) => c.id === id).duty);
      e.resolve(none());
    }
    Assert.empty(char(caught, id).covers);
    Assert.true(single(Views.for(caught, "Babylonia").court, (c) => c.id === id).ready);
    Assert.contains(inboxOf(caught, "Babylonia"), (x) => x.title === "Agent returns" && x.subject === id);
  });

  test("A caught spy recalled by its unknowing master is heard to be overdue a season after it was due", () => {
    let [caught, free, id] = caughtSpy();
    new TurnEngine(caught).resolve(orders("Babylonia", recall(id)));
    new TurnEngine(free).resolve(orders("Babylonia", recall(id)));
    let home = caught.turn - 1 + new TurnEngine(caught).travelTurns("Assyria", "Babylonia");
    while (caught.turn <= home) {
      begin(caught);
      begin(free);
      if (caught.turn < home) Assert.equal(seenOf(free, "Babylonia", id), seenOf(caught, "Babylonia", id));
      new TurnEngine(caught).resolve(none());
      new TurnEngine(free).resolve(none());
    }
    // In the free game it came home; in the other its master hears, a season late, that it has not.
    begin(caught);
    Assert.contains(
      inboxOf(caught, "Babylonia"),
      (x) => x.kind === "Rumor" && x.subject === id && x.body.includes("has not returned from the court of Assyria"),
    );
    let seen = single(Views.for(caught, "Babylonia").court, (c) => c.id === id);
    Assert.equal(["has not returned from Assyria", "unknown", ""], [seen.duty, seen.where, seen.timing]);
    Assert.equal("Captured", char(caught, id).status);
  });

  test("A caught spy recalled by its unknowing master and then turned comes home as told", () => {
    let [caught, , id] = caughtSpy();
    new TurnEngine(caught).resolve(orders("Babylonia", recall(id)));
    begin(caught).resolve(orders("Assyria", captiveOrder(id, "Turn", 0, "Assyria sleeps.")));
    let spy = char(caught, id);
    Assert.equal(["Employed", "EnvoyHomebound", "Assyria"], [spy.status, spy.duty, spy.secretMaster!]);
    Assert.contains(caught.journeys, (j) => j.kind === "SpyHomebound" && j.characterId === id);
    Assert.notEqual("watching Assyria", single(Views.for(caught, "Babylonia").court, (c) => c.id === id).duty);
    while (spy.at !== "Babylonia") begin(caught).resolve(none());
    Assert.empty(spy.covers);
    Assert.equal("None", spy.duty);
  });

  test("A servant believed away who goes free reads as one of yours until it presents itself", () => {
    let [s, defector] = defectorOf();
    let [at] = atAudience();
    let home = endAudience(at, newHostReply({ end: true }));
    new TurnEngine(s).resolve(orders("Alashiya", dismiss(defector.id)));
    Assert.equal("Free", defector.status);
    Assert.notNull(coverOf(defector, "Egypt"));

    function refusal(g: GameState): string {
      return single(new OrderValidator(g).validate("Egypt", newTurnSubmission({ orders: [hire(defector.id, 30)] })).rejected).reason;
    }
    Assert.equal(refusal(home), refusal(s));
    Assert.equal(`${defector.name} is already in your service; to keep them on, order renew`, refusal(s));

    // It comes before Egypt's king seeking service: the cover ends, and it is a candidate like any other.
    new TurnEngine(s).fulfil(
      newMindRequest({ id: "r900", task: "Pitch", characterId: defector.id, court: "Egypt" }),
      newMindReply({ text: "I would serve you again.", number: 25 }),
    );
    Assert.empty(defector.covers);
    Assert.doesNotContain(Views.for(s, "Egypt").court, (c) => c.id === defector.id);
    Assert.contains(Views.for(s, "Egypt").known, (c) => c.id === defector.id && c.pitch === "I would serve you again.");
  });

  // ---------------------------------------------------------------- a fallen court

  test("A fallen court catches no spy and lets its prisoners go", () => {
    let s = newGame(5);
    let watcher = first(s.characters, (c) => c.employer === "Babylonia");
    let captive = first(s.characters, (c) => c.employer === "Hatti");
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    for (const c of [watcher, captive, envoy]) c.secretMaster = null;
    [captive.status, captive.heldBy, captive.at, captive.missionTarget] = ["Captured", "Assyria", "Assyria", "Assyria"];
    [envoy.duty, envoy.heldBy, envoy.at, envoy.missionTarget] = ["Detained", "Assyria", "Assyria", "Assyria"];

    removeAll(s.units, (u) => u.power === "Assyria");
    for (const id of [...s.owner.entries()].filter((x) => x[1] === "Assyria").map((x) => x[0])) s.owner.set(id, "Babylonia");
    begin(s).resolve(none());
    Assert.contains("Assyria", s.eliminated);
    Assert.equal(["Employed", "EnvoyHomebound"], [captive.status, captive.duty]);
    Assert.null(captive.heldBy);
    Assert.equal("EnvoyHomebound", envoy.duty);
    Assert.null(envoy.heldBy);
    Assert.contains(s.journeys, (j) => j.characterId === envoy.id && j.kind === "EnvoyHomebound" && j.to === "Egypt");

    // However heavy the watch it once paid for, nobody is left to catch a spy still watching its court.
    [watcher.duty, watcher.at, watcher.missionTarget] = ["SpyPosted", "Assyria", "Assyria"];
    for (let i = 0; i < 10; i++) {
      let e = begin(s);
      s.counterIntel.set("Assyria", 50000);
      e.resolve(none());
      Assert.equal("Employed", watcher.status);
    }
    Assert.equal("Hatti", captive.at);
    Assert.equal("Egypt", envoy.at);
  });
});
