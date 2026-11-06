import { describe, test } from "vitest";
import { Dict, LetterHeldTerms, OfferUnheard, OrderValidator, TurnEngine, Views, WorldMap, buyLetter, inboxOf, letter, newCaravan, newDeclaration, newGame, newGameConfig, newTurnSubmission, type Declaration, type Order, type GameState } from "@amarna/engine";
import { Assert, removeAll, smallWorld } from "./support.ts";

// #592 (the owner: "Agreed to all, expertly!"): a caught offer is a thing held. Babylon, Babylonia's capital, leans to
// Egypt; Hatti's troops take the Egyptian caravan carrying its offer.
describe("HeldLetterTests", () => {
  const map = WorldMap.default;
  const name = map.get("babylon").name;
  function caught(): [GameState, TurnEngine, Declaration] {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 })), "Egypt", "Babylonia", "Hatti");
    const e = new TurnEngine(s);
    e.beginTurn();
    removeAll(s.characters, (c) => c.at !== null || c.employer !== null);
    const d = newDeclaration({ province: "babylon", power: "Egypt" });
    s.declarations.push(d);
    e.sendOffer(d, "Babylonia", "The people of Babylon declare for you.");
    const c = newCaravan({ id: "v90", power: "Egypt", from: "babylon", to: "memphis", grain: 50, route: e.caravanRoute("Egypt", "babylon", "memphis")!, since: s.turn });
    s.caravans.push(c);
    e.carryLetters();
    // Taken in Hatti's own land, so its court reads it at once.
    e.caravanOffersTaken(c, "Hatti", "hattusa");
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
    Assert.equal(1, s.lettersHeld.filter((h) => h.province === "babylon").length);
    Assert.equal("Hatti", s.lettersHeld.find((h) => h.province === "babylon")!.heldBy);
    Assert.equal("Egypt", s.lettersHeld.find((h) => h.province === "babylon")!.claimant);
    Assert.contains(inboxOf(s, "Hatti"), (i) => i.title === "A letter taken on the road" && i.body.endsWith(LetterHeldTerms));
    Assert.equal(["babylon"], Views.for(s, "Hatti").lettersHeld.map((x) => x.province));
    Assert.equal(0, Views.for(s, "Egypt").lettersHeld.length);
  });

  test("Sent on to its claimant, it reaches him as a favour and he may answer it", () => {
    const [s, e, d] = caught();
    e.letterOrder("Hatti", letter("babylon", "Send", "Egypt"));
    Assert.equal(0, s.lettersHeld.filter((h) => h.province === "babylon").length);
    const j = s.journeys.find((x) => x.kind === "Offer" && x.sentOnBy !== null)!;
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
    Assert.false(s.journeys.some((j) => j.kind === "Offer" && (j.text ?? "").startsWith("babylon|")));
    Assert.true(d.known > s.turn);
  });

  test("Asked a price, the buyer pays once word of it has come; the gold goes to the seller by the road", () => {
    const [s, e] = caught();
    Assert.equal("", orders(s, "Hatti", [letter("babylon", "Sell", "Babylonia", 80)]).rejected.map((r) => r.reason).join());
    e.letterOrder("Hatti", letter("babylon", "Sell", "Babylonia", 80));
    // Not before word of the asking reaches him.
    Assert.equal(1, orders(s, "Babylonia", [buyLetter("babylon")]).rejected.length);
    Assert.equal(0, Views.for(s, "Babylonia").lettersOffered.length);
    s.turn = s.lettersHeld.find((h) => h.province === "babylon")!.askKnown!;
    Assert.equal(["babylon"], Views.for(s, "Babylonia").lettersOffered.map((x) => x.province));
    Assert.equal("", Views.for(s, "Babylonia").lettersOffered[0].words);
    Assert.equal(0, orders(s, "Babylonia", [buyLetter("babylon")]).rejected.length);
    const gold = s.treasuries.get("Babylonia").gold;
    const hatti = s.treasuries.get("Hatti").gold;
    e.buyLetter("Babylonia", buyLetter("babylon"));
    Assert.equal(gold - 80, s.treasuries.get("Babylonia").gold);
    // The buyer has bought it and sees it offered no more; the seller, until the gold comes, still holds it as asked.
    Assert.equal(0, Views.for(s, "Babylonia").lettersOffered.length);
    Assert.equal(["Babylonia"], Views.for(s, "Hatti").lettersHeld.map((x) => x.askedOf));
    Assert.false(s.journeys.some((j) => j.kind === "Word" && j.to === "Babylonia" && (j.text ?? "").includes("A letter taken on the road")));
    // The gold comes: the seller sends the letter, which comes in its turn.
    arrive(s, e);
    Assert.equal(hatti + 80, s.treasuries.get("Hatti").gold);
    Assert.equal(0, s.lettersHeld.filter((h) => h.province === "babylon").length);
    arrive(s, e);
    Assert.contains(inboxOf(s, "Babylonia"), (i) => i.title === "A letter taken on the road");
  });

  test("Only its holder may dispose of it, and only to its claimant or the land's king", () => {
    const [s] = caught();
    Assert.equal(1, orders(s, "Babylonia", [letter("babylon", "Send", "Egypt")]).rejected.length);
    Assert.equal(1, orders(s, "Hatti", [letter("babylon", "Send", "Assyria")]).rejected.length);
    Assert.equal(1, orders(s, "Hatti", [letter("babylon", "Sell", "Egypt", 0)]).rejected.length);
  });

  test("An asking binds: offered to one king for a price, it is neither repriced nor sent elsewhere", () => {
    const [s, e] = caught();
    e.letterOrder("Hatti", letter("babylon", "Sell", "Babylonia", 80));
    Assert.equal(1, orders(s, "Hatti", [letter("babylon", "Sell", "Babylonia", 40)]).rejected.length);
    Assert.equal(1, orders(s, "Hatti", [letter("babylon", "Send", "Egypt")]).rejected.length);
    e.letterOrder("Hatti", letter("babylon", "Send", "Egypt"));
    Assert.equal("Babylonia", s.lettersHeld.find((h) => h.province === "babylon")!.askedOf);
  });

  test("Sent on late, an old letter stands for no later declaration of the same people", () => {
    const [s, e, d] = caught();
    e.dropOffer(d);
    d.gone = s.turn;
    s.turn += 2;
    const again = newDeclaration({ province: "babylon", power: "Egypt", since: s.turn, known: OfferUnheard });
    s.declarations.push(again);
    e.letterOrder("Hatti", letter("babylon", "Send", "Egypt"));
    arrive(s, e);
    Assert.equal(OfferUnheard, again.known);
  });

  test("A court not yet told its claimant has fallen may still send him the letter", () => {
    const [s] = caught();
    s.eliminated.push("Egypt");
    Assert.equal(0, orders(s, "Hatti", [letter("babylon", "Send", "Egypt")]).rejected.length);
  });

  test("Kept past the end of the leaning, it is still held, and sent on then it finds no offer standing", () => {
    const [s, e, d] = caught();
    e.dropOffer(d);
    d.gone = s.turn;
    // Nobody learns of the end through the letter: its holder still holds it.
    Assert.equal(["babylon"], Views.for(s, "Hatti").lettersHeld.map((x) => x.province));
    e.letterOrder("Hatti", letter("babylon", "Send", "Egypt"));
    arrive(s, e);
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.title === "A province looks to you" && i.body.includes(map.get("babylon").name));
  });
});
