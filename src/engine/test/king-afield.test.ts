import { describe, test } from "vitest";
import { type AdjudicationResult, Dict, type GameState, OrderValidator, type Power, TurnEngine, type TurnSubmission, Views, inboxOf, notify, roads, moveCourt, newCharacter, newGame, newGameConfig, newId, newTablet, newTabletCopy, newTurnSubmission, newUnit, seatOf, send, standsAt, wordFromKing } from "@amarna/engine";
import { Assert, armiesBefore13, removeAll, smallWorld, subs } from "./support.ts";

// Item 17b, part C: the king apart from his court, commanding from where he is, at the risk of his life.
describe("KingAfieldTests", () => {
  function season(s: GameState, orders: Dict<Power, TurnSubmission> = new Dict()): TurnEngine {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
    return e;
  }
  const kingOf = (s: GameState, p: Power) => s.characters.find((c) => c.id === s.reigns.get(p).character)!;

  /** Babylonia's king gone alone to Dur-Kurigalzu, his court left at Babylon. */
  function afield(seed = 1): GameState {
    const s = smallWorld(armiesBefore13(newGame(seed, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }))), "Assyria", "Babylonia");
    season(s, subs({ Babylonia: { orders: [moveCourt("durkurigalzu", true)] } }));
    for (let i = 0; i < 4 && s.kingRoads.length > 0; i++) season(s);
    return s;
  }

  test("The king travels without his court, and commands from where he is", () => {
    const s = afield();
    Assert.equal(["durkurigalzu", "babylon"], [s.kingAt.tryGet("Babylonia"), s.court.tryGet("Babylonia") ?? "babylon"]);
    Assert.equal("durkurigalzu", seatOf(s, new TurnEngine(s).map, "Babylonia"));
    const v = Views.for(s, "Babylonia");
    Assert.equal(["durkurigalzu", "babylon"], [v.kingAt, v.courtAt]);
    // His word reaches the land beside him from where he stands.
    Assert.equal(0, wordFromKing(s, new TurnEngine(s).map, "Babylonia", "durkurigalzu"));
    // Back to his court: together again.
    season(s, subs({ Babylonia: { orders: [moveCourt("babylon", true)] } }));
    for (let i = 0; i < 4 && s.kingRoads.length > 0; i++) season(s);
    Assert.false(s.kingAt.has("Babylonia"));
  });

  test("A captive king may not travel", () => {
    const s = afield();
    const c = kingOf(s, "Babylonia");
    c.status = "Captured";
    c.heldBy = "Assyria";
    const v = new OrderValidator(s).validate("Babylonia", newTurnSubmission({ orders: [moveCourt("babylon", true)] }));
    Assert.contains("not free to travel", Assert.single(v.rejected).reason);
  });

  test("Taken away from his court, it learns of it only when the word comes, and believes him where he was till then", () => {
    const s = afield();
    const e = new TurnEngine(s);
    s.owner.set("durkurigalzu", "Assyria");
    // Taken alive (not in a city's fall, which may kill him).
    e.kingTaken("Babylonia", "Assyria", false);
    Assert.equal("Captured", kingOf(s, "Babylonia").status);
    Assert.equal("durkurigalzu", s.kingHeard.tryGet("Babylonia"));
    const v = Views.for(s, "Babylonia");
    Assert.equal("durkurigalzu", v.kingAt);
    Assert.equal("employed", Assert.single(v.court.filter((c) => c.kingOf === "Babylonia")).status);
    // The word comes.
    const word = Assert.single(s.journeys.filter((j) => j.news === "KingTaken"));
    while (s.turn < word.arriveTurn) season(s);
    season(s);
    Assert.false(s.kingHeard.has("Babylonia"));
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "The king taken");
  });

  test("Taken apart, he commands from nowhere: the court's orders go out from it, and the capture is his captor's to see", () => {
    const s = afield();
    const e = new TurnEngine(s);
    s.owner.set("durkurigalzu", "Assyria");
    e.kingTaken("Babylonia", "Assyria", false);
    // The court believes him at Dur-Kurigalzu, and commands and sees as from there; he stands nowhere of his own.
    Assert.equal(["durkurigalzu", "babylon", "durkurigalzu"], [seatOf(s, e.map, "Babylonia"), standsAt(s, e.map, "Babylonia"), Views.for(s, "Babylonia").seat]);
    Assert.doesNotContain(s.events, (x) => x.kind === "king-taken" && x.visibleTo.includes("Babylonia"));
    Assert.contains(s.events, (x) => x.kind === "king-taken" && x.visibleTo.includes("Assyria"));
  });

  test("What reaches his court is sent on to a king far from it, and his orders for its business go to it by courier", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");
    const e = new TurnEngine(s);
    s.kingAt.set("Egypt", "terqa");
    e.courtLags();
    const lag = s.courtLag.getOrDefault("Egypt", 0);
    Assert.true(lag >= 1);
    notify(s, "Egypt", "Rumor", "News", "Word from abroad.");
    notify(s, "Egypt", "Resolution", "Done", "Your order was carried out.");
    const items = inboxOf(s, "Egypt");
    Assert.equal(s.turn + lag, items.find((i) => i.title === "News")!.turn);
    Assert.equal(s.turn, items.find((i) => i.title === "Done")!.turn);
    // Closing his roads to Hatti is the court's business: it goes there with his couriers.
    const sub = e.sendOrders("Egypt", newTurnSubmission({ orders: [roads("Hatti", true)] }));
    Assert.empty(sub.orders);
    Assert.single(s.couriers.filter((c) => c.power === "Egypt"));
  });

  test("Taken far from his court, nothing his court sees or how its word travels changes before the word comes", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");
    const e = new TurnEngine(s);
    s.kingAt.set("Egypt", "terqa");
    const seen = () => {
      e.courtLags();
      const v = Views.for(s, "Egypt");
      const refused = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [moveCourt("terqa", true)] })).rejected.map((r) => r.reason);
      return { seat: v.seat, kingAt: v.kingAt, sight: [...Views.sight(s, e.map, "Egypt")].sort(), word: [e.wordTo("Egypt", "memphis"), e.wordFrom("Egypt", "memphis"), e.heardAt("Egypt", "memphis")], lag: s.courtLag.tryGet("Egypt"), refused };
    };
    const before = seen();
    Assert.true((before.lag ?? 0) >= 1);
    e.kingTaken("Egypt", "Hatti", false);
    Assert.equal("Captured", kingOf(s, "Egypt").status);
    Assert.equal(before, seen());
    // His orders for the court's business still go to it by courier, as from where it believes him.
    Assert.empty(e.sendOrders("Egypt", newTurnSubmission({ orders: [roads("Hatti", true)] })).orders);
    Assert.single(s.couriers.filter((c) => c.power === "Egypt"));
  });

  test("What came to his court reaches a king far from it only as a courier brings it", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");
    const e = new TurnEngine(s);
    s.kingAt.set("Egypt", "terqa");
    const tablet = newTablet({ id: "t-new", text: "A new tablet.", proposedBy: "Hatti", partner: "Egypt", seals: ["Hatti"] });
    s.tablets.push(tablet);
    s.copies.push(newTabletCopy({ id: "k-new", tabletId: tablet.id, holder: "Egypt", acquiredTurn: s.turn, source: "brought" }));
    const old = newTablet({ id: "t-old", text: "An old tablet.", proposedBy: "Hatti", partner: "Egypt", seals: ["Hatti"] });
    s.tablets.push(old);
    s.copies.push(newTabletCopy({ id: "k-old", tabletId: old.id, holder: "Egypt", acquiredTurn: -10, source: "brought", authResult: "The seals are genuine.", authTurn: s.turn }));
    const guest = newCharacter({ id: "c-guest", name: "Guest" });
    guest.status = "Free";
    guest.at = "Egypt";
    s.characters.push(guest);
    e.cameToCourts();
    const shown = () => {
      const v = Views.for(s, "Egypt");
      return { tablets: v.tablets.map((t) => t.tabletId).sort(), check: v.tablets.find((t) => t.tabletId === old.id)?.authResult ?? null, guest: [...v.court, ...v.known].some((c) => c.id === guest.id) };
    };
    Assert.equal({ tablets: [old.id], check: null, guest: false }, shown());
    // Seasons later, the courier has brought it all.
    s.turn += 8;
    Assert.equal({ tablets: [old.id, tablet.id].sort(), check: "The seals are genuine.", guest: true }, shown());
  });

  test("The treasury stays at the court: a far province does not reach it because the king stands there", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");
    const e = new TurnEngine(s);
    s.owner.set("terqa", "Egypt");
    const before = e.isFar("Egypt", "terqa");
    s.kingAt.set("Egypt", "terqa");
    Assert.equal([true, true], [before, e.isFar("Egypt", "terqa")]);
    // So gold may still be sent there from the treasury, by the court's clock, not the king's.
    Assert.empty(new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [send("terqa", 10)] })).rejected);
  });

  test("A report from afar comes to a king away from his court by its own road, not by his court's", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");
    const e = new TurnEngine(s);
    s.kingAt.set("Egypt", "terqa");
    e.courtLags();
    Assert.true(s.courtLag.getOrDefault("Egypt", 0) >= 1);
    e.tellAt("Egypt", s.turn + 2, "SpyReport", "From afar", "A spy's report.", "memphis");
    const word = Assert.single(s.journeys.filter((j) => j.news === "Realm"));
    s.turn = word.arriveTurn;
    e.wordArrives(word);
    Assert.equal(word.arriveTurn, inboxOf(s, "Egypt").find((i) => i.title === "From afar")!.turn);
  });

  test("Dead away from his court, its king stays among its own people as it last knew him until the word comes", () => {
    const s = afield();
    const e = new TurnEngine(s);
    const c = kingOf(s, "Babylonia");
    s.owner.set("durkurigalzu", "Assyria");
    e.dies(c, "durkurigalzu", "in battle");
    const v = Views.for(s, "Babylonia");
    Assert.equal("employed", Assert.single(v.court.filter((x) => x.id === c.id)).status);
    Assert.empty(v.known.filter((x) => x.id === c.id));
  });

  test("A court sent to where the king stands joins him", () => {
    const s = afield();
    season(s, subs({ Babylonia: { orders: [moveCourt("durkurigalzu")] } }));
    for (let i = 0; i < 4 && s.kingRoads.length > 0; i++) season(s);
    Assert.equal("durkurigalzu", s.court.tryGet("Babylonia"));
    Assert.false(s.kingAt.has("Babylonia"));
  });

  test("A city taken where the king stands apart takes him or kills him; his court stays where it is", () => {
    const s = afield();
    const e = new TurnEngine(s);
    s.owner.set("durkurigalzu", "Assyria");
    s.ownerLog.push({ province: "durkurigalzu", turn: s.turn, owner: "Assyria" });
    e.capitalsTaken();
    const c = kingOf(s, "Babylonia");
    Assert.true(c.status === "Dead" || (c.status === "Captured" && c.heldBy === "Assyria"));
    // His court believes him there till the word comes.
    Assert.equal("durkurigalzu", s.kingHeard.tryGet("Babylonia"));
    Assert.equal("babylon", s.court.tryGet("Babylonia") ?? "babylon");
    Assert.doesNotContain(s.eliminated, (p) => p === "Babylonia");
  });

  test("The court's city taken while the king is away: the court flees, and he is not taken with it", () => {
    const s = afield();
    const e = new TurnEngine(s);
    s.owner.set("babylon", "Assyria");
    s.ownerLog.push({ province: "babylon", turn: s.turn, owner: "Assyria" });
    e.capitalsTaken();
    const c = kingOf(s, "Babylonia");
    Assert.equal(["Employed", "Ruling"], [c.status, c.duty]);
    Assert.notEqual("babylon", s.court.get("Babylonia"));
    Assert.equal("Babylonia", s.owner.get(s.court.get("Babylonia")));
  });

  test("A battle his side loses where he stands: he dies in it, is taken, or gets away with his men", () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 24; seed++) {
      const s = afield(seed);
      removeAll(s.units, (u) => u.province === "durkurigalzu" || u.province === "ekallate");
      const his = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "durkurigalzu", men: 2000 });
      const foe = newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "ekallate", men: 6000 });
      s.units.push(his, foe);
      const e = new TurnEngine(s);
      const r = { fights: [{ attacker: foe.id, defender: his.id, from: "ekallate", at: "durkurigalzu", attack: 3000, defence: 1000, own: 1000, won: true }], newPositions: new Dict([[his.id, "sippar"]]) } as unknown as AdjudicationResult;
      e.kingsInBattle(r);
      const c = kingOf(s, "Babylonia");
      const got = c.status === "Dead" ? "dead" : c.status === "Captured" ? "taken" : s.kingAt.tryGet("Babylonia") === "sippar" ? "away" : "other";
      Assert.notEqual("other", got);
      outcomes.add(got);
    }
    Assert.equal(["away", "dead", "taken"], [...outcomes].sort());
  });
});
