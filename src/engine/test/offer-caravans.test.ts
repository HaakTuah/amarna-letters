import { describe, test } from "vitest";
import { CaravanOfferData, Dict, OfferCaught, TurnEngine, inboxOf, newCaravan, newDeclaration, newGame, newGameConfig, WorldMap, type Caravan, type Declaration, type GameState } from "@amarna/engine";
import { Assert, removeAll, smallWorld } from "./support.ts";

// #543 (the owner: "Yes to all, expertly!"): a caravan leaving a province for its claimant's land carries the province's
// offer as a traveller going that way would, and carries talk of its leaning along its road. Babylon, Babylonia's
// capital, leans to Egypt.
describe("OfferCaravanTests", () => {
  const map = WorldMap.default;
  function offered(): [GameState, TurnEngine, Declaration] {
    // Only the powers the scenes need: the claimant, the land's king, and a third whose troops or market a caravan meets.
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 })), "Egypt", "Babylonia", "Hatti");
    const e = new TurnEngine(s);
    e.beginTurn();
    // No one else to carry it: the offer goes by caravan or not at all.
    removeAll(s.characters, (c) => c.at !== null || c.employer !== null);
    const d = newDeclaration({ province: "babylon", power: "Egypt" });
    s.declarations.push(d);
    e.sendOffer(d, "Babylonia", "The people of Babylon declare for you.");
    return [s, e, d];
  }
  /** Babylon's offer (in a small world, unruled land declares for the kings left too). */
  const babylon = (j: { kind: string; text: string | null }): boolean => j.kind === "Offer" && (j.text ?? "").startsWith("babylon|");
  const offer = (s: GameState) => s.journeys.find(babylon)!;
  /** A caravan of `power` standing at Babylon, its road on to `to`. */
  function caravan(s: GameState, e: TurnEngine, power: "Egypt" | "Babylonia", to: string): Caravan {
    const route = e.caravanRoute(power, "babylon", to) ?? e.tradeRoute(power, "babylon", to, false)!;
    const c = newCaravan({ id: `v9${s.caravans.length}`, power, from: "babylon", to, grain: 50, route, since: s.turn });
    s.caravans.push(c);
    return c;
  }
  function farGone(s: GameState, e: TurnEngine, purse: number): void {
    removeAll(s.units, (u) => u.province === "babylon");
    s.ledger.set("babylon", new Dict([["Egypt", 2000]]));
    e.market("babylon").purse = purse;
  }

  test("The claimant's own caravan going to his land carries the offer for nothing", () => {
    const [s, e] = offered();
    const c = caravan(s, e, "Egypt", "memphis");
    e.carryLetters();
    Assert.equal(c.id, offer(s).caravan);
    Assert.equal(0, offer(s).fee);
    Assert.contains(s.events, (x) => x.signal === "offer-caravan");
    // Carried, it is not offered to another carrier again.
    e.carryLetters();
    Assert.equal(1, s.events.filter((x) => x.signal === "offer-caravan").length);
  });

  test("Another king's caravan carries it only for a fee its people pay, where they are far gone", () => {
    const [s, e] = offered();
    const c = caravan(s, e, "Babylonia", "memphis");
    e.carryLetters();
    Assert.null(offer(s).caravan);
    farGone(s, e, 1000);
    const gold = c.gold;
    e.carryLetters();
    Assert.equal(c.id, offer(s).caravan);
    Assert.true(e.market("babylon").purse < 1000);
    Assert.equal(gold + (1000 - e.market("babylon").purse), c.gold);
    Assert.true(c.gold - gold >= CaravanOfferData.feePerSeason);
  });

  test("A caravan whose road ends outside the claimant's land does not take it", () => {
    const [s, e] = offered();
    caravan(s, e, "Babylonia", "ur");
    farGone(s, e, 1000);
    e.carryLetters();
    Assert.null(offer(s).caravan);
  });

  test("Its road ended in his land, his couriers take it on, and he is told traders brought it", () => {
    const [s, e, d] = offered();
    const c = caravan(s, e, "Egypt", "memphis");
    e.carryLetters();
    c.at = c.route.length - 1;
    e.caravanUnloads(c);
    const j = offer(s);
    Assert.null(j.waitAt);
    Assert.true(j.arriveTurn >= s.turn);
    s.journeys.splice(s.journeys.indexOf(j), 1);
    s.turn = j.arriveTurn;
    e.offerArrives(j);
    Assert.equal(s.turn, d.known);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A province looks to you" && i.body.startsWith(`Traders have brought you the word of the people of ${map.get("babylon").name}`));
  });

  test("Played out, the caravan's road brings the offer to his land", () => {
    const [s, e] = offered();
    // Its porters paid for the road, so they do not desert.
    caravan(s, e, "Egypt", "memphis").pay = 1000;
    e.carryLetters();
    for (let i = 0; i < 12 && s.journeys.some((x) => babylon(x) && x.waitAt !== null); i++) e.caravansTravel();
    Assert.null(offer(s).waitAt);
    Assert.contains(s.events, (x) => x.signal === "offer-caravan-brought");
  });

  test("Lost with its caravan, it is lost; taken by troops, their king reads it", () => {
    const [s, e] = offered();
    const c = caravan(s, e, "Egypt", "memphis");
    e.carryLetters();
    s.caravans.splice(s.caravans.indexOf(c), 1);
    e.caravanOffersLost();
    Assert.false(s.journeys.some(babylon));

    const [s2, e2] = offered();
    const c2 = caravan(s2, e2, "Egypt", "memphis");
    e2.carryLetters();
    // Taken near Hatti's court, Hatti reads it at once.
    e2.caravanOffersTaken(c2, "Hatti", "hattusa");
    Assert.false(s2.journeys.some(babylon));
    Assert.contains(inboxOf(s2, "Hatti"), (i) => i.title === "A letter taken on the road" && i.body.startsWith(`${OfferCaught.opens}Egypt's caravan${OfferCaught.people}${map.get("babylon").name} to Egypt: "The people of Babylon declare for you."`));
  });

  test("Taken far from its captor's court, the offer reaches him by word from there, not at once", () => {
    const [s, e] = offered();
    const c = caravan(s, e, "Egypt", "memphis");
    e.carryLetters();
    e.caravanOffersTaken(c, "Hatti", "babylon");
    Assert.doesNotContain(inboxOf(s, "Hatti"), (i) => i.title === "A letter taken on the road");
    Assert.contains(s.journeys, (j) => j.kind === "Word" && j.to === "Hatti" && j.arriveTurn > s.turn && (j.text ?? "").includes("A letter taken on the road"));
  });

  test("A caravan setting out from the province takes the waiting offer before it leaves", () => {
    const [s, e] = offered();
    const c = caravan(s, e, "Egypt", "memphis");
    c.pay = 1000;
    e.caravansTravel();
    Assert.equal(c.id, offer(s).caravan);
    Assert.true(c.at > 0);
  });

  test("A caravan tells the talk as it heard it, though the leaning has changed since", () => {
    const [s, e, d] = offered();
    const c = caravan(s, e, "Babylonia", "hattusa");
    e.caravanHearsTalk(c, ["babylon"]);
    // The people's leaning ends, and they lean toward Hatti now, while the caravan is on the road.
    d.gone = s.turn;
    s.declarations.push(newDeclaration({ province: "babylon", power: "Hatti" }));
    c.at = c.route.length - 1;
    e.caravanUnloads(c);
    const told = s.journeys.filter((j) => j.kind === "Word" && j.to === "Hatti" && (j.text ?? "").startsWith(`Rumor|Talk of ${map.get("babylon").name}|Traders say`));
    Assert.equal(1, told.length);
    Assert.true((told[0].text ?? "").endsWith("lean toward Egypt, away from Babylonia."));
    // Told once: the ended leaning is no longer carried.
    Assert.equal([], c.talk);
  });

  test("A caravan carries talk of the leaning to the king whose land its road ends in, once", () => {
    const [s, e, d] = offered();
    const c = caravan(s, e, "Babylonia", "hattusa");
    e.caravanHearsTalk(c, ["babylon"]);
    Assert.equal(["babylon|Egypt|Babylonia"], c.talk);
    Assert.false(d.talked.includes("Hatti"));
    c.at = c.route.length - 1;
    const talk = () => s.journeys.filter((j) => j.kind === "Word" && j.to === "Hatti" && (j.text ?? "").startsWith(`Rumor|Talk of ${map.get("babylon").name}|Traders say`));
    e.caravanUnloads(c);
    Assert.equal(1, talk().length);
    Assert.true(talk()[0].arriveTurn > s.turn);
    Assert.true((talk()[0].text ?? "").endsWith("lean toward Egypt, away from Babylonia."));
    e.caravanUnloads(c);
    Assert.equal(1, talk().length);
    // Those the talk reached already by the roads hear it no second time.
    const n = s.journeys.filter((j) => j.kind === "Word" && j.to === "Egypt").length;
    const home = caravan(s, e, "Egypt", "memphis");
    e.caravanHearsTalk(home, ["babylon"]);
    home.at = home.route.length - 1;
    e.caravanUnloads(home);
    Assert.equal(n, s.journeys.filter((j) => j.kind === "Word" && j.to === "Egypt").length);
  });
});
