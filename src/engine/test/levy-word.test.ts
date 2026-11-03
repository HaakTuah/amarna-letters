import { describe, test } from "vitest";
import { Dict, type GameState, Views, newUnit, setLevel, wordHomeAt, type ScheduledOrders, TurnEngine, UnraisedTitle, WorldMap, inboxOf, move, newGame, newGameConfig, newOwnerChange, newScheduledOrders, newSleepState, newTurnSubmission, raise } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

/**
 * Egypt's king holds court at Nippur, far from Nubia; he schedules a levy there, and a march for its army. `menGone`:
 * Nubia's men are gone in the levy's season, out of his sight.
 */
function farLevy(menGone: boolean): { s: GameState; season: (scheduled?: ScheduledOrders[]) => void } {
  const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Babylonia");
  s.owner.set("nippur", "Egypt");
  s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
  s.ledger.set("nippur", new Dict([["Egypt", 5000]]));
  s.court.set("Egypt", "nippur");
  s.units = s.units.filter((u) => u.province !== "nubia");
  s.sleep.tryAdd("Egypt", newSleepState());
  const season = (scheduled: ScheduledOrders[] = []) => {
    new TurnEngine(s, WorldMap.default).beginTurn();
    if (menGone && s.turn === 3) s.people.get("nubia").men = 0;
    new TurnEngine(s, WorldMap.default).resolve(new Dict([["Egypt", newTurnSubmission({ scheduled })]]));
  };
  return { s, season };
}

const plan = [newScheduledOrders({ turn: 3, orders: [raise("nubia", "Army")] }), newScheduledOrders({ turn: 7, orders: [move("nubia", "thebes")] })];

describe("LevyWordTests", () => {
  test("Orders for a far levy that raised nothing stay in the list until word of it comes, then are dropped and told (bug #569)", () => {
    const { s, season } = farLevy(true);
    const sl = s.sleep.get("Egypt");
    season(plan);
    season();
    // The levy fails in season 3; Nubia's word comes home by the one clock (bug #616).
    const heard = wordHomeAt(s, WorldMap.default, "nippur", "nubia", 3);
    season();
    Assert.equal(heard, sl.scheduled.find((x) => x.order.type === "move")?.unraisedHeard);
    const told = () => inboxOf(s, "Egypt").some((i) => i.title === UnraisedTitle);
    // Listed, as the army to be raised, until the word comes.
    while (s.turn < heard) {
      Assert.false(told());
      Assert.equal(1, sl.scheduled.length);
      season();
    }
    new TurnEngine(s, WorldMap.default).beginTurn();
    Assert.true(told());
    Assert.empty(sl.scheduled);
  });

  test("Orders for a far levy refused at court for want of gold are dropped at once: the court knows (bug #569)", () => {
    const { s, season } = farLevy(false);
    const sl = s.sleep.get("Egypt");
    season(plan);
    season();
    s.treasuries.get("Egypt").gold = 0;
    s.treasuries.get("Egypt").lots = [];
    season();
    new TurnEngine(s, WorldMap.default).beginTurn();
    // Told at once that the levy was refused for want of gold, and at once that the orders for its army are dropped.
    Assert.true(inboxOf(s, "Egypt").some((i) => i.turn === s.turn && i.body.includes("raise army in nubia: not enough gold")));
    Assert.true(inboxOf(s, "Egypt").some((i) => i.turn === s.turn && i.title === UnraisedTitle));
    Assert.empty(sl.scheduled);
  });

  test("A far province's report and a notice from it, of the same season, reach the court together (bug #616)", () => {
    const { s, season } = farLevy(true);
    const told = () => inboxOf(s, "Egypt").some((i) => i.title === UnraisedTitle);
    const reported = () => Views.knownHolders(s, WorldMap.default, "Egypt").get("nubia").turn >= 3;
    season(plan);
    season();
    // Season 3: the levy fails in Nubia. Season by season after it, the court reads Nubia's report of that season in the
    // same season as the notice of the failed levy, never one before the other.
    season();
    let seen = 0;
    for (let i = 0; i < 6; i++) {
      new TurnEngine(s, WorldMap.default).beginTurn();
      Assert.true(told() === reported(), `season ${s.turn}: told ${told()}, reported ${reported()}`);
      if (told()) seen++;
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
    }
    // Both came, after the road from Nubia (one clock: wordHomeAt).
    Assert.true(seen > 0 && seen < 6);
    Assert.true(wordHomeAt(s, WorldMap.default, "nippur", "nubia", 3) > 4);
  });

  test("Word comes home by the road from the place to the court, which may differ from the road out (bug #616)", () => {
    const s = newGame(1);
    // From Hattusa to a court at Akhetaten takes longer than the other way, in the first season of the year.
    const home = wordHomeAt(s, WorldMap.default, "akhetaten", "hattusa", 1);
    const out = wordHomeAt(s, WorldMap.default, "hattusa", "akhetaten", 1);
    Assert.true(home > out);
  });

  test("Word of a province once come home stays heard when the roads it came by are cut (bug #616)", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    s.units = [];
    const read = () => Views.knownHolders(s, WorldMap.default, "Hatti").get("babylon");
    const play = () => {
      new TurnEngine(s, WorldMap.default).beginTurn();
      new TurnEngine(s, WorldMap.default).resolve(new Dict());
    };
    play();
    play();
    // Season 3: Babylon passes to Elam, out of Hattusa's sight.
    s.owner.set("babylon", "Elam");
    s.ownerLog.push(newOwnerChange({ province: "babylon", turn: s.turn, owner: "Elam" }));
    const lost = s.turn;
    while (read().turn < lost) play();
    Assert.equal("Elam", read().owner);
    // The season's resolution keeps what each court has heard (`seeLand`), before anything is built or razed.
    new TurnEngine(s, WorldMap.default).seeLand();
    // The roads and relay stations cut: the couriers' ride home is longer now, but what came home stays.
    const fast = wordHomeAt(s, WorldMap.default, "hattusa", "babylon", lost);
    for (const p of WorldMap.default.landProvinces) for (const k of ["Roads", "Stations"] as const) setLevel(s, k, p.id, 0);
    Assert.true(wordHomeAt(s, WorldMap.default, "hattusa", "babylon", lost) > fast);
    Assert.equal("Elam", read().owner);
  });

  test("An own unit where the road out is near but the road home is not is shown as last reported (bug #616)", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const e = new TurnEngine(s, WorldMap.default);
    // Pharaoh's court at Akhetaten: his orders reach Hattusa within the season, word from there takes a season more.
    Assert.equal(0, e.wordTo("Egypt", "hattusa"));
    Assert.equal(1, e.wordFrom("Egypt", "hattusa"));
    const u = newUnit({ id: "u990", power: "Egypt", province: "hattusa", trail: ["nesa", "hattusa"] });
    s.units.push(u);
    Assert.equal("nesa", e.shownAt(u));
  });
});
