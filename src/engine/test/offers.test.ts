import { describe, test } from "vitest";
import { Dict, LetterHeldTerms, OfferTerms, OfferUnheard, TurnEngine, inboxOf, newCharacter, newDeclaration, newGame, newGameConfig, newId, newGrant, newJourney, newTraits, newUnit, Waiting, WorldMap, type Character, type Declaration, type GameState } from "@amarna/engine";
import { Assert, removeAll } from "./support.ts";

// Item 17++, part D (#431, the owner: "Yes, expertly, if you think it is best"): a province's offer to an absent power
// reaches him only if someone carries it; talk of its leaning spreads at the roads' pace. Babylon, Babylonia's capital,
// leans to Egypt.
describe("OfferTests", () => {
  const quiet = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 }));
  function offered(): [GameState, TurnEngine, Declaration] {
    const s = quiet();
    const e = new TurnEngine(s);
    e.beginTurn();
    const d = newDeclaration({ province: "babylon", power: "Egypt" });
    s.declarations.push(d);
    e.sendOffer(d, "Babylonia", "The people of Babylon declare for you.");
    return [s, e, d];
  }
  const offer = (s: GameState) => s.journeys.find((j) => j.kind === "Offer")!;
  function person(s: GameState, init: Partial<Character>): Character {
    const c = newCharacter({ id: newId(s, "c"), name: "Ahmose", traits: newTraits({ loyalty: 60, greed: 40, ambition: 30, courage: 50, competence: 50 }), tongues: new Dict([["Akkadian", 100], ["Egyptian", 100]]), ...init });
    s.characters.push(c);
    return c;
  }
  /** The people of Babylon far gone toward Egypt: no troops there, the ledger all Egypt's. */
  function farGone(s: GameState): void {
    removeAll(s.units, (u) => u.province === "babylon");
    s.ledger.set("babylon", new Dict([["Egypt", 2000]]));
  }

  test("An offer waits in the province for a carrier; talk of the leaning goes out, and it cannot be answered unheard", () => {
    const [s, , d] = offered();
    Assert.equal(OfferUnheard, d.known);
    Assert.equal("babylon", offer(s).waitAt);
    Assert.null(offer(s).carrier);
    const talk = s.journeys.filter((j) => j.kind === "Word" && (j.text ?? "").startsWith(`Rumor|Talk of ${WorldMap.default.get("babylon").name}`));
    Assert.contains(talk, (j) => j.to === "Egypt" && j.arriveTurn > s.turn);
    Assert.contains(talk, (j) => j.to === "Babylonia");
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.title === "A province looks to you");
  });

  test("A man of his going that way carries it for nothing, and it can be answered from the season it arrives", () => {
    const [s, e, d] = offered();
    const c = person(s, { status: "Employed", employer: "Egypt", at: "Babylonia" });
    e.startTravel(c, "Egypt");
    e.carryLetters();
    Assert.equal(c.id, offer(s).carrier);
    Assert.equal(0, offer(s).fee);
    e.lettersGo();
    const j = offer(s);
    Assert.true(j.arriveTurn > s.turn);
    s.journeys.splice(s.journeys.indexOf(j), 1);
    s.turn = j.arriveTurn;
    e.offerArrives(j);
    Assert.equal(s.turn, d.known);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A province looks to you" && i.body.startsWith(`Ahmose has brought you the word of the people of ${WorldMap.default.get("babylon").name}: "The people of Babylon declare for you."`));
    // The people's words, then the terms of answering them, which only the power it reaches is told (#553).
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A province looks to you" && i.body.endsWith(`"The people of Babylon declare for you." ${OfferTerms}`));
  });

  test("Only a people far gone in his favour pays a courier from its purse", () => {
    const [s, e] = offered();
    const c = person(s, { status: "Free", at: "Babylonia" });
    // Not far gone: nobody is paid, and it waits.
    s.ledger.set("babylon", new Dict());
    e.carryLetters();
    Assert.null(offer(s).carrier);
    farGone(s);
    const purse = e.market("babylon");
    purse.purse = 10000;
    e.carryLetters();
    Assert.equal(c.id, offer(s).carrier);
    Assert.true(purse.purse < 10000);
    Assert.contains(s.events, (x) => x.signal === "offer-hired" || x.signal === "offer-paid");
  });

  test("An offer nobody carried is not sent once the leaning ends", () => {
    const [s, e, d] = offered();
    e.declarationsLapse(new Set(), new Set());
    Assert.true(d.gone !== null);
    Assert.false(s.journeys.some((j) => j.kind === "Offer"));
  });

  test("A carrier knows what he carries: he remembers it, and holds it as news to sell at other courts", () => {
    const [s, e] = offered();
    farGone(s);
    e.market("babylon").purse = 10000;
    const c = person(s, { status: "Free", at: "Babylonia" });
    e.carryLetters();
    Assert.equal(c.id, offer(s).carrier);
    Assert.contains(c.news, (n) => n.court === "Egypt" && n.lines.some((l) => l.includes("have sent him their offer")));
    Assert.contains(c.memory, (m) => m.text.includes("I carry the word of the people"));
    // Nothing taken from the land's king's treasury: he buys it only by his own order, as any news.
    Assert.contains(s.events, (x) => x.signal === "offer-news");
  });

  test("His spy's report from there takes the offer with it", () => {
    const [s, e] = offered();
    const spy = person(s, { status: "Employed", employer: "Egypt", duty: "SpyPosted", watchProvince: "babylon" });
    const carrier = person(s, { status: "Free", at: "Babylonia" });
    s.journeys.push(newJourney({ id: newId(s, "j"), kind: "SpyReport", departTurn: s.turn, arriveTurn: Waiting, from: "Egypt", to: "Egypt", characterId: spy.id, waitAt: "babylon", carrier: carrier.id }));
    e.carryLetters();
    Assert.equal(carrier.id, offer(s).carrier);
    Assert.contains(s.events, (x) => x.signal === "offer-spy");
  });

  test("An offer whose carrier is lost on the road never arrives", () => {
    const [s, e, d] = offered();
    const c = person(s, { status: "Employed", employer: "Egypt", at: "Babylonia" });
    e.startTravel(c, "Egypt");
    e.carryLetters();
    Assert.equal(c.id, offer(s).carrier);
    // Robbed and killed on the road: no walk home is left for it to share.
    removeAll(s.journeys, (j) => j.characterId === c.id && j.kind !== "Offer");
    c.status = "Dead";
    e.lettersGo();
    Assert.false(s.journeys.some((j) => j.kind === "Offer"));
    Assert.equal(OfferUnheard, d.known);
  });

  // #553: as a caught spy's report is read, so is a caught offer, in the people's own words.
  test("Whoever catches an offer's carrier reads the offer, and it never arrives", () => {
    const [s, e, d] = offered();
    const c = person(s, { status: "Employed", employer: "Egypt", at: "Babylonia" });
    e.startTravel(c, "Egypt");
    e.carryLetters();
    Assert.equal(c.id, offer(s).carrier);
    // Taken by the land king's men on the road: held, his walk home ended.
    removeAll(s.journeys, (j) => j.characterId === c.id && j.kind !== "Offer");
    c.status = "Captured";
    c.heldBy = "Babylonia";
    e.lettersGo();
    Assert.false(s.journeys.some((j) => j.kind === "Offer"));
    Assert.equal(OfferUnheard, d.known);
    const read = inboxOf(s, "Babylonia").find((i) => i.title === "A letter taken on the road")!;
    Assert.equal(`Among what Ahmose carried, and so never delivered, was the word of the people of ${WorldMap.default.get("babylon").name} to Egypt: "The people of Babylon declare for you." ${LetterHeldTerms}`, read.body);
    Assert.doesNotContain(OfferTerms, read.body);
    Assert.contains(s.events, (x) => x.signal === "offer-read");
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.title === "A province looks to you");
  });

  test("Talk reaches the land king's enemies, by the game's marks of enmity, and not every neighbour", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    e.beginTurn();
    // Hatti's troops stand unbidden in a province of Babylonia's: Hatti is its enemy; Assyria, a neighbour, is not.
    const theirs = WorldMap.default.landProvinces.find((x) => s.owner.getOrDefault(x.id, null) === "Babylonia" && x.id !== "babylon")!.id;
    removeAll(s.units, (u) => u.province === theirs);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: theirs }));
    const d = newDeclaration({ province: "babylon", power: "Egypt" });
    s.declarations.push(d);
    e.sendOffer(d, "Babylonia", "The people declare for you.");
    const told = s.journeys.filter((j) => j.kind === "Word" && (j.text ?? "").includes("Talk of")).map((j) => j.to);
    Assert.contains(told, (x) => x === "Hatti");
    Assert.doesNotContain(told, (x) => x === "Assyria");
  });

  test("A man whose sympathy lies with the claimant carries it for nothing", () => {
    const [s, e] = offered();
    const c = person(s, { status: "Free", at: "Babylonia", traits: newTraits({ loyalty: 50, greed: 50, ambition: 30, courage: 50, competence: 50, sympathy: "Egypt" }) });
    e.startTravel(c, "Egypt");
    e.carryLetters();
    Assert.equal(c.id, offer(s).carrier);
    Assert.contains(s.events, (x) => x.signal === "offer-own");
  });

  test("An offer on the road is dropped when its leaning ends, and never stands for a later one", () => {
    const [s, e, d] = offered();
    const c = person(s, { status: "Employed", employer: "Egypt", at: "Babylonia" });
    e.startTravel(c, "Egypt");
    e.carryLetters();
    Assert.equal(c.id, offer(s).carrier);
    e.declarationsLapse(new Set(), new Set());
    Assert.true(d.gone !== null);
    Assert.false(s.journeys.some((j) => j.kind === "Offer"));
  });

  test("A carrier robbed on the road loses the offer he carried", () => {
    const [s, e] = offered();
    const c = person(s, { status: "Employed", employer: "Egypt", at: "Babylonia" });
    e.startTravel(c, "Egypt");
    e.carryLetters();
    e.offersRobbed(c);
    Assert.false(s.journeys.some((j) => j.kind === "Offer"));
    Assert.contains(s.events, (x) => x.signal === "offer-robbed");
  });

  test("An offer joins a spy's report only while its carrier is still in the province, and no other letter's batch", () => {
    const [s, e] = offered();
    const spy = person(s, { status: "Employed", employer: "Egypt", duty: "SpyPosted", watchProvince: "babylon" });
    // A carrier already gone from Babylon: the offer does not go with him.
    const gone = person(s, { status: "Free", at: "Egypt" });
    s.journeys.push(newJourney({ id: newId(s, "j"), kind: "SpyReport", departTurn: s.turn, arriveTurn: Waiting, from: "Egypt", to: "Egypt", characterId: spy.id, waitAt: "babylon", carrier: gone.id }));
    // A ransom letter waiting there for Egypt, older: its carrier takes only its own kind.
    s.journeys.unshift(newJourney({ id: "j0", kind: "Ransom", departTurn: s.turn, arriveTurn: Waiting, from: "Babylonia", to: "Egypt", waitAt: "babylon" }));
    e.carryLetters();
    Assert.null(offer(s).carrier);
  });

  test("An offer older than a spy report goes with the carrier that report takes up this season", () => {
    const [s, e] = offered();
    const spy = person(s, { status: "Employed", employer: "Egypt", duty: "SpyPosted", watchProvince: "babylon", purse: 1000 });
    const hire = person(s, { status: "Free", at: "Babylonia" });
    s.journeys.push(newJourney({ id: newId(s, "j"), kind: "SpyReport", departTurn: s.turn - 1, arriveTurn: Waiting, from: "Egypt", to: "Egypt", characterId: spy.id, waitAt: "babylon" }));
    e.carryLetters();
    Assert.equal(hire.id, offer(s).carrier);
    Assert.contains(s.events, (x) => x.signal === "offer-spy");
  });

  test("A guest by the land king's leave is no enemy of his, though another's army stands beside him unbidden", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    e.beginTurn();
    const theirs = WorldMap.default.landProvinces.find((x) => s.owner.getOrDefault(x.id, null) === "Babylonia" && x.id !== "babylon")!.id;
    removeAll(s.units, (u) => u.province === theirs);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: theirs }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Fleet", province: theirs }));
    s.grants.push(newGrant({ grantor: "Babylonia", grantee: "Assyria", kind: "basing", province: theirs, sinceTurn: s.turn - 1 }));
    const d = newDeclaration({ province: "babylon", power: "Egypt" });
    s.declarations.push(d);
    e.sendOffer(d, "Babylonia", "The people declare for you.");
    const told = s.journeys.filter((j) => j.kind === "Word" && (j.text ?? "").includes("Talk of")).map((j) => j.to);
    Assert.contains(told, (x) => x === "Hatti");
    Assert.doesNotContain(told, (x) => x === "Assyria");
  });

  test("Bought, word of an offer tells its lines and none of the claimant's land", () => {
    const [s, e] = offered();
    farGone(s);
    e.market("babylon").purse = 10000;
    const c = person(s, { status: "Free", at: "Babylonia" });
    e.carryLetters();
    const n = c.news.find((x) => x.court === "Egypt")!;
    Assert.false(n.landSeen);
  });
});
