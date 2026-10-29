import { describe, test } from "vitest";
import {
  alive,
  raise,
  unitAt,
  AllPowers,
  Dict,
  GameStateSchema,
  clone,
  type GameState,
  HSet,
  type Order,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  captive,
  counterIntel,
  dispatch,
  first,
  hire,
  inboxOf,
  land,
  ledger,
  newAudienceRecord,
  newAudienceRound,
  newGame,
  newGameConfig,
  newGoldLot,
  newHostReply,
  newId,
  newMindReply,
  newPendingTask,
  newTablet,
  newTabletCopy,
  newTurnSubmission,
  ownedBy,
  payRansom,
  placeSpy,
  seekCandidates,
  single,
} from "@amarna/engine";
import { Assert, firstOrNull, toDict, join, skilled, homeJob, oldWorld } from "./support.ts";

describe("IntelligenceTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    return e;
  }

  function orders(p: Power, ...orders: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: orders })]]);
  }

  function advance(s: GameState, seasons: number, orders: ((a0: number) => Dict<Power, TurnSubmission>) | null = null): void {
    for (let i = 0; i < seasons; i++) {
      let e = begin(s);
      for (const r of e.mindRequests)
        e.fulfil(r, newMindReply({ text: `[${r.task}] ` + join(" ", r.report?.observations ?? []) + (r.report?.poison ?? ""), number: 15 }));
      e.resolve(orders?.(i) ?? new Dict<Power, TurnSubmission>());
    }
  }

  test("A forgery the scribes miss reads exactly as a genuine tablet", () => {
    let s = oldWorld(newGame(5, newGameConfig({ catastropheChance: 0 })));
    s.tablets.push(newTablet({ id: "t900", text: "Peace.", proposedBy: "Hatti", partner: "Egypt", seals: ["Hatti", "Egypt"], createdTurn: 1, sealedTurn: 1 }));
    // A master forger, examined cheaply: found 5% of the time.
    s.tablets.push(
      newTablet({
        id: "t901",
        text: "War.",
        proposedBy: "Hatti",
        partner: "Egypt",
        seals: ["Hatti", "Egypt"],
        createdTurn: 1,
        sealedTurn: 1,
        forged: true,
        forgerSkill: 100,
      }),
    );
    s.copies.push(newTabletCopy({ id: "k900", tabletId: "t900", holder: "Mitanni", acquiredTurn: 1, source: "test" }));
    s.copies.push(newTabletCopy({ id: "k901", tabletId: "t901", holder: "Mitanni", acquiredTurn: 1, source: "test" }));
    let [genuine, missed] = [new HSet<string>(), new HSet<string>()];
    for (let i = 0; i < 12; i++) {
      for (const copy of ["k900", "k901"])
        s.tasks.push(newPendingTask({ id: newId(s, "q"), kind: "Authenticate", requester: "Mitanni", dueTurn: s.turn, copyId: copy, spend: 10 }));
      begin(s).resolve(new Dict<Power, TurnSubmission>());
      genuine.add(single(s.copies, (c) => c.id === "k900").authResult!);
      const r = single(s.copies, (c) => c.id === "k901").authResult;
      if (r !== null && !r.includes("forgery")) missed.add(r);
    }
    Assert.contains("The seals are genuine.", genuine);
    Assert.equal(["The seals are genuine."], [...missed]);
  });

  test("A spy watching a free city or its own king s province is never caught", () => {
    let s = oldWorld(newGame(8, newGameConfig({ catastropheChance: 0 })));
    let spies = s.characters.filter((c) => c.employer === "Babylonia").slice(0, 2);
    for (const [spy, at] of spies.map((x, i) => [x, ["tyre", "babylon"][i]] as const)) {
      [spy.secretMaster, spy.traits.competence] = [null, 0];
      [spy.duty, spy.at, spy.watchProvince] = ["SpyPosted", null, at];
      // A stay longer than the test, so its term does not send it home.
      spy.contract!.untilTurn = 50;
    }
    Assert.null(s.owner.get("tyre"));
    s.treasuries.get("Babylonia").gold = 100000;
    // However heavy its own watch: a king is not the host of its own spy, and a free city has nobody to catch one.
    for (let i = 0; i < 15; i++) begin(s).resolve(orders("Babylonia", counterIntel(5000)));
    Assert.equal(5000, s.counterIntel.get("Babylonia"));
    Assert.all(spies, (c) => Assert.equal("Employed", c.status));
  });

  test("A posted spy sends reports home that arrive late", () => {
    let s = oldWorld(newGame(8));
    let spy = first(s.characters, (c) => c.employer === "Babylonia");
    spy.secretMaster = null;
    skilled(spy, 95);
    let e = begin(s);
    e.resolve(orders("Babylonia", placeSpy(spy.id, "Assyria")));
    Assert.equal("SpyOutbound", spy.duty);
    advance(s, 5);
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.kind === "SpyReport");
  });

  test("Heavy watch catches spies and captives can be turned", () => {
    let caught = false;
    for (let seed = 1; seed <= 15 && !caught; seed++) {
      let s = oldWorld(newGame(seed));
      let spy = first(s.characters, (c) => c.employer === "Babylonia");
      spy.secretMaster = null;
      skilled(spy, 10);
      s.treasuries.get("Assyria").gold = 5000;
      let e = begin(s);
      e.resolve(orders("Babylonia", placeSpy(spy.id, "Assyria")));
      advance(s, 6, (_) => orders("Assyria", counterIntel(200)));
      if (spy.status !== "Captured") continue;
      caught = true;
      Assert.equal("Assyria", spy.heldBy);
      Assert.contains(inboxOf(s, "Assyria"), (i) => i.title === "A spy is caught");

      e = begin(s);
      e.resolve(orders("Assyria", captive(spy.id, "Turn", 0, "Assyria has no army left.")));
      Assert.equal("Assyria", spy.secretMaster);
      Assert.equal("SpyPosted", spy.duty);
      Assert.contains(s.events, (x) => x.signal === "double-agent");

      // The turned spy's reports carry the poison, and Babylonia never learns of the turning.
      advance(s, 4);
      Assert.contains(inboxOf(s, "Babylonia"), (i) => i.kind === "SpyReport" && i.body.includes("no army left"));
      Assert.doesNotContain(inboxOf(s, "Babylonia"), (i) => i.body.includes("turned") || i.body.includes("double"));
    }
    Assert.true(caught, "no spy was caught in 15 seeded games");
  });

  test("A captive whose kingdom has fallen cannot be turned", () => {
    // As when the spy's own kingdom falls while they are held: no master, still a captive.
    let s = oldWorld(newGame(4));
    let spy = first(s.characters, (c) => c.employer === "Hatti");
    spy.status = "Captured";
    spy.heldBy = "Mitanni";
    spy.at = "Mitanni";
    spy.employer = null;
    spy.contract = null;
    let e = begin(s);
    e.resolve(orders("Mitanni", captive(spy.id, "Turn", 0, "Nothing stirs.")));
    Assert.equal("Captured", spy.status);
    Assert.doesNotContain(s.events, (x) => x.signal === "double-agent");
    advance(s, 2);
  });

  test("Ransomed captives come home once paid", () => {
    let s = oldWorld(newGame(4));
    let spy = first(s.characters, (c) => c.employer === "Hatti");
    spy.status = "Captured";
    spy.heldBy = "Mitanni";
    spy.at = "Mitanni";
    spy.missionTarget = "Mitanni";
    let e = begin(s);
    e.resolve(orders("Mitanni", captive(spy.id, "Ransom", 90)));
    Assert.contains(s.tasks, (t) => t.kind === "RansomDemand" && t.requester === "Hatti");
    // Its word waits at Mitanni's court for a carrier (Haakon's answers to item 11b): here one sets out at once.
    for (const j of s.journeys.filter((x) => x.news === "Ransom" && x.waitAt !== null)) [j.waitAt, j.arriveTurn] = [null, s.turn];
    // The same seasons with no ransom paid: the captor ends with that much less (its own costs are the same either way).
    let unpaid = clone(GameStateSchema, s);
    e = begin(s);
    e.resolve(orders("Hatti", payRansom(spy.id)));
    advance(s, 4);
    begin(unpaid).resolve(new Dict<Power, TurnSubmission>());
    advance(unpaid, 4);
    Assert.notEqual("Captured", spy.status);
    Assert.true(s.treasuries.get("Mitanni").gold > unpaid.treasuries.get("Mitanni").gold);
  });

  test("Candidates pitch and only the court where a person stands can hire it", () => {
    let s = oldWorld(newGame(6));
    let e = begin(s);
    e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [seekCandidates()] })],
        ["Hatti", newTurnSubmission({ orders: [seekCandidates()] })],
      ]),
    );
    e = begin(s);
    let pitches = e.mindRequests.filter((r) => r.task === "Pitch");
    Assert.notEmpty(pitches);
    for (const r of pitches) e.fulfil(r, newMindReply({ text: "Hire me.", number: 20 }));

    let both = firstOrNull(s.characters, (c) => c.pitches.has("Egypt") && c.pitches.has("Hatti"));
    let target = both ?? first(s.characters, (c) => c.pitches.has("Egypt"));
    // Hatti's court must be able to talk to it (item 12): it speaks Hittite.
    target.tongues.set("Hittite", 100);
    if (!target.pitches.has("Hatti")) {
      target.pitches.set("Hatti", "Hire me.");
      target.askingPrice.set("Hatti", 20);
    }
    // Item 11a: a person is hired in person, so only the court where it stands can hire it.
    target.at = "Hatti";
    e.resolve(
      new Dict([
        ["Egypt", newTurnSubmission({ orders: [hire(target.id, 240, 6, 240, homeJob("Egypt"))] })],
        ["Hatti", newTurnSubmission({ orders: [hire(target.id, 150, 6, 150, homeJob("Hatti"))] })],
      ]),
    );
    Assert.equal("Hatti", target.employer);
    Assert.equal(150, target.contract!.fee);
    begin(s);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.body.includes("goes with an envoy"));
  });

  test("A wage below the asking price is refused", () => {
    let s = oldWorld(newGame(6));
    let free = first(s.characters, (c) => c.status === "Free");
    free.pitches.set("Egypt", "I am worth it.");
    free.askingPrice.set("Egypt", 50);
    let e = begin(s);
    e.resolve(orders("Egypt", hire(free.id, 30)));
    Assert.equal("Free", free.status);
  });

  test("Tablet copies shown as evidence reach the third court", () => {
    let s = oldWorld(newGame(9));
    s.tablets.push(
      newTablet({
        id: "t900",
        text: "Hatti and Egypt are brothers.",
        proposedBy: "Hatti",
        partner: "Egypt",
        seals: ["Hatti", "Egypt"],
        createdTurn: 1,
        sealedTurn: 1,
      }),
    );
    s.copies.push(newTabletCopy({ id: "k900", tabletId: "t900", holder: "Egypt", acquiredTurn: 1, source: "sealed" }));
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let e = begin(s);
    e.resolve(orders("Egypt", dispatch(envoy.id, "Alashiya", "Hatti broke this oath.", { copies: ["k900"] })));
    while (s.audiences.length === 0) {
      e = begin(s);
      if (s.audiences.length === 0) e.resolve(new Dict<Power, TurnSubmission>());
    }
    let view = e.buildAudienceView(s.audiences[0], "See this tablet.", 0, [], 1);
    Assert.single(view.copiesShown);
    e.applyAudience(
      newAudienceRecord({ audienceId: s.audiences[0].id, delivered: "See this tablet.", rounds: [newAudienceRound({ host: newHostReply({ end: true }) })] }),
    );
    Assert.contains(s.copies, (c) => c.holder === "Alashiya" && c.tabletId === "t900");
    Assert.contains(s.events, (x) => x.signal === "evidence-shown");
  });

  test("Spending debased gold exposes it", () => {
    let s = oldWorld(newGame(9));
    let t = s.treasuries.get("Hatti");
    // The ledger shows a levy's price and a little more; the levy passes validation but the true treasury cannot pay.
    const price = s.config.armyCost;
    t.gold = 90;
    t.lots.push(newGoldLot({ id: "g900", from: "Egypt", stated: price, face: price, true: 60, arrivedTurn: 1 }));
    Assert.equal(price + 30, ledger(t));
    let e = new TurnEngine(s);
    e.resolve(orders("Hatti", raise("sapinuwa", "Army")));
    Assert.null(unitAt(s, "sapinuwa"));
    Assert.empty(t.lots);
    Assert.contains(inboxOf(s, "Hatti"), (i) => i.title === "The treasury is short" && i.body.includes("Egypt"));
  });

  test("Sworn allies can share the victory", () => {
    // Scored by performance alone (item 11e's size weight 0), so their gold lifts the pair above every other power.
    let s = oldWorld(newGame(10, newGameConfig({ capMin: 1, capMax: 1, endMedian: 10000, sharedVictory: true, sizeWeight: 0 })));
    s.tablets.push(
      newTablet({
        id: "t901",
        text: "Alliance.",
        proposedBy: "Arzawa",
        partner: "Alashiya",
        seals: ["Arzawa", "Alashiya"],
        createdTurn: 1,
        sealedTurn: 1,
        allianceOath: true,
      }),
    );
    s.treasuries.get("Arzawa").gold += 2000;
    s.treasuries.get("Alashiya").gold += 2000;
    let e = begin(s);
    e.resolve(new Dict<Power, TurnSubmission>());
    Assert.true(s.ended);
    Assert.equal(["Arzawa", "Alashiya"], s.winners);
  });

  test("Sworn allies do not share the victory unless the house rule is on", () => {
    let s = oldWorld(newGame(10, newGameConfig({ capMin: 1, capMax: 1, endMedian: 10000 })));
    Assert.false(s.config.sharedVictory);
    s.tablets.push(
      newTablet({
        id: "t901",
        text: "Alliance.",
        proposedBy: "Arzawa",
        partner: "Alashiya",
        seals: ["Arzawa", "Alashiya"],
        createdTurn: 1,
        sealedTurn: 1,
        allianceOath: true,
      }),
    );
    s.treasuries.get("Arzawa").gold += 2000;
    s.treasuries.get("Alashiya").gold += 2000;
    let e = begin(s);
    e.resolve(new Dict<Power, TurnSubmission>());
    Assert.true(s.ended);
    Assert.single(s.winners);
    Assert.doesNotContain(s.events, (x) => x.signal === "shared-victory");
  });

  test("Catastrophes are exact at home and heard next season only by courts that can see them", () => {
    let s = oldWorld(newGame(13, newGameConfig({ catastropheChance: 1.0 })));
    let e = begin(s);
    let map = WorldMap.default;
    let sight = toDict(
      AllPowers,
      (p) => p,
      (p) => Views.sight(s, map, p),
    );
    let owned = toDict(
      AllPowers,
      (p) => p,
      (p) => ownedBy(s, p),
    );
    e.resolve(new Dict<Power, TurnSubmission>());
    Assert.all(alive(s), (p) => Assert.contains(inboxOf(s, p), (i) => i.kind === "Catastrophe"));

    let [heard, unheard] = [0, 0];
    for (const cat of s.catastrophes)
      for (const other of alive(s).filter((o) => o !== cat.power)) {
        // A drought or plague is seen from any province of the realm; a flood or earthquake only from its own.
        const one = cat.province;
        let seen = one !== null ? sight.get(other).has(one) : owned.get(cat.power).some((x) => sight.get(other).has(x));
        let news = inboxOf(s, other).filter((i) => i.title === "News from nearby" && i.body.endsWith(`in ${land(cat.power)}.`));
        Assert.all(news, (i) => Assert.equal([s.turn, "Notice"], [i.turn, i.kind]));
        Assert.equal(seen ? 1 : 0, news.length);
        if (seen) heard++;
        else unheard++;
      }
    Assert.true(heard > 0 && unheard > 0, `heard ${heard}, unheard ${unheard}`);

    // No rumour of it reaches any court later: distant courts learn only through envoys and spies.
    advance(s, 3);
    // (Since item 11b plague may kill people standing where it strikes, and word of a death is a rumour.)
    Assert.all(AllPowers, (p) => Assert.doesNotContain(inboxOf(s, p), (i) => i.kind === "Rumor" && !i.body.includes(" died ")));
  });
});
