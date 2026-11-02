import { describe, test } from "vitest";
import { Dict, OfferData, OfferUnheard, TurnEngine, inboxOf, newCharacter, newDeclaration, newGame, newGameConfig, newId, newTraits, newUnit, WorldMap, type Character, type Declaration, type GameState } from "@amarna/engine";
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
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A province looks to you" && i.body.includes("Ahmose brought it"));
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
    Assert.true(OfferData.farGone > 0);
  });

  test("An offer nobody carried is not sent once the leaning ends", () => {
    const [s, e, d] = offered();
    e.declarationsLapse(new Set(), new Set());
    Assert.true(d.gone !== null);
    Assert.false(s.journeys.some((j) => j.kind === "Offer"));
  });

  test("A carrier who sells secrets sells word of it to the land's king", () => {
    const [s, e] = offered();
    farGone(s);
    e.market("babylon").purse = 10000;
    const c = person(s, { status: "Free", at: "Babylonia", traits: newTraits({ loyalty: 10, greed: 90, ambition: 30, courage: 50, competence: 50 }) });
    const gold = s.treasuries.get("Babylonia").gold;
    e.carryLetters();
    Assert.equal(c.id, offer(s).carrier);
    Assert.equal(gold - OfferData.sellPrice, s.treasuries.get("Babylonia").gold);
    Assert.contains(s.events, (x) => x.signal === "offer-sold");
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
});
