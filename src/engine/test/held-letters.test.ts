import { describe, test } from "vitest";
import { Dict, LetterHeldTerms, OrderValidator, TurnEngine, Views, WorldMap, buyLetter, inboxOf, letter, newCaravan, newDeclaration, newGame, newGameConfig, newTurnSubmission, type Declaration, type Order, type GameState } from "@amarna/engine";
import { Assert, removeAll } from "./support.ts";

// #592 (the owner: "Agreed to all, expertly!"): a caught offer is a thing held. Babylon, Babylonia's capital, leans to
// Egypt; Hatti's troops take the Egyptian caravan carrying its offer.
describe("HeldLetterTests", () => {
  const map = WorldMap.default;
  const name = map.get("babylon").name;
  function caught(): [GameState, TurnEngine, Declaration] {
    const s = newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 }));
    const e = new TurnEngine(s);
    e.beginTurn();
    removeAll(s.characters, (c) => c.at !== null || c.employer !== null);
    const d = newDeclaration({ province: "babylon", power: "Egypt" });
    s.declarations.push(d);
    e.sendOffer(d, "Babylonia", "The people of Babylon declare for you.");
    const c = newCaravan({ id: "v90", power: "Egypt", from: "babylon", to: "memphis", grain: 50, route: e.caravanRoute("Egypt", "babylon", "memphis")!, since: s.turn });
    s.caravans.push(c);
    e.carryLetters();
    e.caravanOffersTaken(c, "Hatti");
    return [s, e, d];
  }
  const orders = (s: GameState, p: "Hatti" | "Babylonia" | "Egypt", ...o: Order[][]) => new OrderValidator(s).validate(p, newTurnSubmission({ orders: o.flat() }));
  /** Every journey due by now arrives. */
  function arrive(s: GameState, e: TurnEngine): void {
    s.turn = Math.max(...s.journeys.filter((j) => j.kind !== "Offer" || j.waitAt === null).map((j) => j.arriveTurn).filter((t) => t < 100000), s.turn);
    e.arrivals();
  }

  test("Its captor reads the offer, holds it, and is told what he may do with it", () => {
    const [s] = caught();
    Assert.equal(1, s.lettersHeld.length);
    Assert.equal("Hatti", s.lettersHeld[0].heldBy);
    Assert.equal("Egypt", s.lettersHeld[0].claimant);
    Assert.contains(inboxOf(s, "Hatti"), (i) => i.title === "A letter taken on the road" && i.body.endsWith(LetterHeldTerms));
    Assert.equal(["babylon"], Views.for(s, "Hatti").lettersHeld.map((x) => x.province));
    Assert.equal(0, Views.for(s, "Egypt").lettersHeld.length);
  });

  test("Sent on to its claimant, it reaches him as a favour and he may answer it", () => {
    const [s, e, d] = caught();
    e.letterOrder("Hatti", letter("babylon", "Send", "Egypt"));
    Assert.equal(0, s.lettersHeld.length);
    const j = s.journeys.find((x) => x.kind === "Offer")!;
    Assert.equal("Hatti", j.sentOnBy);
    arrive(s, e);
    Assert.equal(s.turn, d.known);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A province looks to you" && i.body.startsWith(`Hatti has sent on to you the word of the people of ${name}`));
  });

  test("Sent to the land's king, he reads his people's words, and the claimant never hears it", () => {
    const [s, e, d] = caught();
    e.letterOrder("Hatti", letter("babylon", "Send", "Babylonia"));
    arrive(s, e);
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "A letter taken on the road" && i.body.includes('"The people of Babylon declare for you."'));
    Assert.false(s.journeys.some((j) => j.kind === "Offer"));
    Assert.true(d.known > s.turn);
  });

  test("Asked a price, the buyer pays once word of it has come; the gold goes to the seller by the road", () => {
    const [s, e] = caught();
    Assert.equal("", orders(s, "Hatti", [letter("babylon", "Sell", "Babylonia", 80)]).rejected.map((r) => r.reason).join());
    e.letterOrder("Hatti", letter("babylon", "Sell", "Babylonia", 80));
    // Not before word of the asking reaches him.
    Assert.equal(1, orders(s, "Babylonia", [buyLetter("babylon")]).rejected.length);
    Assert.equal(0, Views.for(s, "Babylonia").lettersOffered.length);
    s.turn = s.lettersHeld[0].askKnown!;
    Assert.equal(["babylon"], Views.for(s, "Babylonia").lettersOffered.map((x) => x.province));
    Assert.equal("", Views.for(s, "Babylonia").lettersOffered[0].words);
    Assert.equal(0, orders(s, "Babylonia", [buyLetter("babylon")]).rejected.length);
    const gold = s.treasuries.get("Babylonia").gold;
    const hatti = s.treasuries.get("Hatti").gold;
    e.buyLetter("Babylonia", buyLetter("babylon"));
    Assert.equal(gold - 80, s.treasuries.get("Babylonia").gold);
    Assert.equal(0, s.lettersHeld.length);
    arrive(s, e);
    Assert.equal(hatti + 80, s.treasuries.get("Hatti").gold);
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "A letter taken on the road");
  });

  test("Only its holder may dispose of it, and only to its claimant or the land's king", () => {
    const [s] = caught();
    Assert.equal(1, orders(s, "Babylonia", [letter("babylon", "Send", "Egypt")]).rejected.length);
    Assert.equal(1, orders(s, "Hatti", [letter("babylon", "Send", "Assyria")]).rejected.length);
    Assert.equal(1, orders(s, "Hatti", [letter("babylon", "Sell", "Egypt", 0)]).rejected.length);
  });

  test("Kept, it lapses when the people's leaning ends", () => {
    const [s, e, d] = caught();
    s.ledger.set("babylon", new Dict());
    e.dropOffer(d);
    Assert.equal(0, s.lettersHeld.length);
  });
});
