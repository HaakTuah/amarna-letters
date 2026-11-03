import { describe, test } from "vitest";
import {
  Dict,
  type Character,
  type GameState,
  type Order,
  RiderBackTitle,
  TurnEngine,
  Views,
  WorldMap,
  hire,
  inboxOf,
  newCharacter,
  newContract,
  renew,
  newGame,
  newGameConfig,
  newId,
  newOwnerChange,
  newTraits,
  newTurnSubmission,
  OrderValidator,
} from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

const map = WorldMap.default;

/** Egypt holds Nippur, far from its court; a free man of the given greed stands at Egypt's court. */
function world(greed = 40): { s: GameState; c: Character } {
  const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
  s.owner.set("nippur", "Egypt");
  s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
  s.ledger.set("nippur", new Dict([["Egypt", 5000]]));
  for (const x of s.characters) if (x.status === "Free" && x.at === "Egypt") x.at = "Babylonia";
  const c = newCharacter({ id: newId(s, "c"), name: "Ahmose", status: "Free", at: "Egypt", traits: newTraits({ loyalty: 60, greed, ambition: 30, courage: 50, competence: 50 }), tongues: new Dict([["Egyptian", 100]]) });
  s.characters.push(c);
  return { s, c };
}

const ride = (c: Character, fee: number): Order => hire(c.id, fee, 1, fee, { what: "ride", where: "nippur" });

describe("RideTests", () => {
  test("A rider hired to a far province brings its report of the season home the next, and its notices with him (#601)", () => {
    const { s, c } = world();
    const e = new TurnEngine(s, map);
    Assert.true(e.wordTo("Egypt", "nippur") > 0);
    new TurnEngine(s, map).beginTurn();
    const t = s.turn;
    // A notice told from Nippur in the ride's season, which would come by the road later.
    new TurnEngine(s, map).tell("Egypt", "nippur", "Notice", "From Nippur", "Word from Nippur.");
    // Word that came to Nippur from farther off (a governor's letter, told with a delay) stays on its road.
    new TurnEngine(s, map).tell("Egypt", "nippur", "Notice", "From beyond Nippur", "Word from beyond.", 2);
    new TurnEngine(s, map).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [ride(c, 500)] })]]));
    Assert.equal("Employed", c.status);
    Assert.false(inboxOf(s, "Egypt").some((i) => i.title === "From Nippur"));
    new TurnEngine(s, map).beginTurn();
    Assert.true(inboxOf(s, "Egypt").some((i) => i.title === RiderBackTitle));
    // A sleeping king's digest names it.
    Assert.true(inboxOf(s, "Egypt").some((i) => i.title === RiderBackTitle && new TurnEngine(s, map).digestLine(i) !== null));
    Assert.true(inboxOf(s, "Egypt").some((i) => i.title === "From Nippur"));
    Assert.false(inboxOf(s, "Egypt").some((i) => i.title === "From beyond Nippur"));
    const k = Views.knownHolders(s, map, "Egypt").get("nippur");
    Assert.equal(t, k.turn);
    Assert.equal("your rider Ahmose", k.source);
    // His job is done: he is back at court, free once it is settled.
    Assert.equal("Egypt", c.at);
    Assert.equal("Free", c.status);
  });

  test("The rider takes less than he asks if the king haggles, down to his least; below it he declines and names his price (#601)", () => {
    // Offers the ride at `less` below his least, in the first season, and returns him.
    const offer = (less: number, greed = 0): Character => {
      const { s, c } = world(greed);
      new TurnEngine(s, map).beginTurn();
      const { least } = new TurnEngine(s, map).rideAsk(c, "Egypt", "nippur", 1);
      new TurnEngine(s, map).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [ride(c, least - less)] })]]));
      if (less > 0) Assert.true(inboxOf(s, "Egypt").some((i) => i.body.includes("for the ride")));
      return c;
    };
    Assert.equal("Free", offer(1).status);
    Assert.equal("Employed", offer(0).status);
    const { s, c } = world(0);
    new TurnEngine(s, map).beginTurn();
    const e = new TurnEngine(s, map);
    const { ask, least } = e.rideAsk(c, "Egypt", "nippur", 1);
    Assert.true(least < ask);
    // Wanted more when the court asks for more rides than there are free people to take them, and the greediest gives nothing.
    Assert.true(e.rideAsk(c, "Egypt", "nippur", 3).ask > e.rideAsk(c, "Egypt", "nippur", 0).ask);
    c.traits.greed = 100;
    const g = e.rideAsk(c, "Egypt", "nippur", 1);
    Assert.equal(g.ask, g.least);
  });

  test("A rider brings the province as he left it, lost in his season, and a rider taken on the road brings nothing (#601)", () => {
    const lost = world();
    new TurnEngine(lost.s, map).beginTurn();
    const t = lost.s.turn;
    new TurnEngine(lost.s, map).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [ride(lost.c, 500)] })]]));
    // Babylonia took Nippur in the ride's season.
    lost.s.owner.set("nippur", "Babylonia");
    lost.s.ownerLog.push(newOwnerChange({ province: "nippur", turn: t, owner: "Babylonia" }));
    new TurnEngine(lost.s, map).beginTurn();
    Assert.equal("Babylonia", Views.knownHolders(lost.s, map, "Egypt").get("nippur").owner);
    Assert.true(inboxOf(lost.s, "Egypt").some((i) => i.title === RiderBackTitle && i.body.includes("when he was there it answered to Babylonia")));
    const taken = world();
    new TurnEngine(taken.s, map).beginTurn();
    new TurnEngine(taken.s, map).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [ride(taken.c, 500)] })]]));
    taken.c.heldBy = "Babylonia";
    new TurnEngine(taken.s, map).beginTurn();
    Assert.false(inboxOf(taken.s, "Egypt").some((i) => i.title === RiderBackTitle));
    Assert.false(Views.knownHolders(taken.s, map, "Egypt").get("nippur").source.startsWith("your rider"));
  });

  test("Two rides offered at once are priced together: the order they are settled in decides nothing (#601)", () => {
    const hired = (reverse: boolean): string[] => {
      const { s, c } = world(100);
      const d = newCharacter({ id: newId(s, "c"), name: "Kha", status: "Free", at: "Egypt", traits: newTraits({ loyalty: 60, greed: 100, ambition: 30, courage: 50, competence: 50 }), tongues: new Dict([["Egyptian", 100]]) });
      s.characters.push(d);
      new TurnEngine(s, map).beginTurn();
      const e = new TurnEngine(s, map);
      const offers = [c, d].map((x) => ride(x, e.rideAsk(x, "Egypt", "nippur", 2).ask));
      new TurnEngine(s, map).resolve(new Dict([["Egypt", newTurnSubmission({ orders: reverse ? offers.reverse() : offers })]]));
      return [c, d].filter((x) => x.status === "Employed").map((x) => x.name);
    };
    Assert.equal(["Ahmose", "Kha"], hired(false));
    Assert.equal(["Ahmose", "Kha"], hired(true));
    // What the rides paid is heard all at once: a bystander hears the same whichever was agreed first.
    const heard = (reverse: boolean): number | null => {
      const { s, c } = world(0);
      const d = newCharacter({ id: newId(s, "c"), name: "Kha", status: "Free", at: "Egypt", traits: newTraits({ loyalty: 60, greed: 0, ambition: 30, courage: 50, competence: 50 }), tongues: new Dict([["Egyptian", 100]]) });
      const by = newCharacter({ id: newId(s, "c"), name: "Iny", status: "Free", at: "Egypt", traits: newTraits({ loyalty: 60, greed: 0, ambition: 30, courage: 50, competence: 50 }), tongues: new Dict([["Egyptian", 100]]) });
      s.characters.push(d, by);
      by.heardRide = 50;
      new TurnEngine(s, map).beginTurn();
      const offers = [ride(c, 100), ride(d, 200)];
      new TurnEngine(s, map).resolve(new Dict([["Egypt", newTurnSubmission({ orders: reverse ? offers.reverse() : offers })]]));
      return by.heardRide;
    };
    Assert.equal(heard(false), heard(true));
  });

  test("A rider sent elsewhere in his season does not ride (#601)", () => {
    const { s, c } = world();
    new TurnEngine(s, map).beginTurn();
    new TurnEngine(s, map).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [ride(c, 500)] })]]));
    c.duty = "Commanding";
    c.at = null;
    new TurnEngine(s, map).beginTurn();
    Assert.false(inboxOf(s, "Egypt").some((i) => i.title === RiderBackTitle));
  });

  test("A servant renewed for a ride asks as any rider does (#601)", () => {
    const { s, c } = world(0);
    new TurnEngine(s, map).beginTurn();
    c.status = "Employed";
    c.employer = "Egypt";
    c.contract = newContract({ fee: 10, startTurn: 0, untilTurn: 0 });
    const { least } = new TurnEngine(s, map).rideAsk(c, "Egypt", "nippur", 1);
    new TurnEngine(s, map).renew("Egypt", renew(c.id, least - 1, 1, least - 1, { what: "ride", where: "nippur" }));
    Assert.true(inboxOf(s, "Egypt").some((i) => i.title === "Not renewed" && i.body.includes("for the ride")));
    new TurnEngine(s, map).renew("Egypt", renew(c.id, least, 1, least, { what: "ride", where: "nippur" }));
    Assert.equal("ride", c.contract!.errand?.what);
  });

  test("A ride is offered for a far province of the king's own, at his court (#601)", () => {
    const { s, c } = world();
    const why = (o: Order): string => {
      const r = new OrderValidator(s, map).validate("Egypt", newTurnSubmission({ orders: [o] }));
      return r.accepted.length === 1 ? "" : JSON.stringify(r.rejected);
    };
    Assert.equal("", why(ride(c, 50)));
    Assert.true(why(hire(c.id, 50, 1, 50, { what: "ride", where: "memphis" })).includes("without a rider"));
    Assert.true(why(hire(c.id, 50, 1, 50, { what: "ride", where: "babylon" })).includes("you do not hold"));
    Assert.true(why(hire(c.id, 50, 3, 50, { what: "ride", where: "nippur" })).includes("its term is 1"));
    Assert.true(why(hire(c.id, 50, 1, 50, { what: "ride", where: "nippur", offerAgain: true })).includes("no offer_again"));
    // Every land province of the map has a road home (the refusal for one without guards maps that cut one off).
    Assert.true(map.landProvinces.every((x) => Number.isFinite(new TurnEngine(s, map).wordFrom("Egypt", x.id))));
    // A servant of yours renewed for a ride: no standing re-offer either.
    c.status = "Employed";
    c.employer = "Egypt";
    c.contract = newContract({ fee: 10, startTurn: 0, untilTurn: 0 });
    Assert.true(why(renew(c.id, 50, 1, 50, { what: "ride", where: "nippur", offerAgain: true })).includes("no offer_again"));
  });
});
