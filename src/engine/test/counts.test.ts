import { describe, test } from "vitest";
import { CountData, Dict, StartCountAge, countFigures, toFigures, EconomyData, WorldMap, OrderValidator, TurnEngine, Views, census, countOf, demand, hiddenPercent, menAvailable, newGame, newGameConfig, newPlannedOrder, newSleepState, newTurnSubmission, raise, type GameState } from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// What a king can count (build order item 17++, part B): counts as the scribes knew them, the census, and the king's
// demand as a share or an amount. Each test calls the steps it tests on the starting world and plays no season it does
// not need.
describe("CountsTests", () => {
  const fresh = (): GameState => smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Hatti", "Egypt", "Mitanni");

  test("A count shows two figures while under a year old and one after; a land never counted, one, as a guess", () => {
    Assert.equal([2, 2, 1, 1, 1], [0, 3, 4, 8, 40].map(countFigures));
    Assert.equal(1, countFigures(null));
    Assert.equal([650_000, 600_000, 18_000, 87, 90], [toFigures(648_200, 2), toFigures(648_200, 1), toFigures(18_400, 2), toFigures(87, 2), toFigures(87, 1)]);
    Assert.equal(0, toFigures(0, 2));
  });

  test("Every court starts with a count of the land it holds, and its view shows the count, not the land as it is now", () => {
    const s = fresh();
    const c = countOf(s, "Hatti", "nesa")!;
    // Egypt counted often, so its counts are recent; most others' are older (different data, same rules).
    Assert.equal(s.turn - StartCountAge.default, c.turn);
    Assert.equal(s.turn - StartCountAge.by.Egypt!, countOf(s, "Egypt", "memphis")!.turn);
    Assert.equal(s.people.get("nesa").settled, c.settled);
    // The land changes; the court's view keeps the count until a new one comes home.
    s.people.get("nesa").settled += 50_000;
    const x = Views.for(s, "Hatti").provinces.find((p) => p.province === "nesa")!;
    Assert.equal(c.settled, x.settled);
    Assert.equal(c.turn, x.counted);
    Assert.true(x.town > 0);
    // Land a court never counted shows nothing of its people.
    s.counts.get("Hatti").delete("nesa");
    const y = Views.for(s, "Hatti").provinces.find((p) => p.province === "nesa")!;
    Assert.equal(null, y.counted);
    Assert.equal(0, y.settled);
  });

  test("A share hides more the older the count; an amount is asked as it stands, and cannot hide", () => {
    const s = fresh();
    const e = new TurnEngine(s);
    const season = Math.floor(s.reaped.get("nesa") / 3);
    Assert.equal(Math.floor((Math.floor((season * EconomyData.taxPercent) / 100) * (100 - e.hiddenIn("nesa"))) / 100), e.grainAsked("nesa"));
    const fresh0 = e.grainAsked("nesa");
    s.turn += 10;
    Assert.true(e.hiddenIn("nesa") >= 10);
    Assert.true(e.grainAsked("nesa") < fresh0);
    // Never counted: it hides the most an uncounted land does, before distance.
    s.counts.get("Hatti").delete("nesa");
    Assert.true(e.hiddenIn("nesa") >= CountData.hideUncounted);
    // An amount: what is asked, whatever the count's age, even more than a season's harvest.
    e.setDemand("Hatti", demand("amount", season * 2, "nesa"));
    Assert.equal(season * 2, e.grainAsked("nesa"));
    Assert.true(e.burden("nesa") >= 200);
    // A share again replaces it.
    e.setDemand("Hatti", demand("share", 20, "nesa"));
    Assert.false(s.amounts.has("nesa"));
    Assert.equal(20, s.shares.get("nesa"));
  });

  test("An amount beyond what the land yields falls on its people: the granary empties and they go hungry", () => {
    const s = fresh();
    const e = new TurnEngine(s);
    e.setDemand("Hatti", demand("amount", 100_000, "nesa"));
    let hungry = false;
    for (let k = 0; k < 4 && !hungry; k++) {
      e.beginTurn();
      e.resolve(new Dict());
      hungry = (s.fed.tryGet("nesa") ?? 1000) < 1000;
    }
    Assert.true(hungry);
    Assert.equal(0, s.granary.getOrDefault("nesa", 0));
  });

  test("A census is paid when the scribes set out, stirs the people a little, and its count comes home dated", () => {
    const s = fresh();
    const e = new TurnEngine(s);
    const gold = s.treasuries.get("Hatti").gold;
    const before = s.ledger.tryGet("nesa")?.getOrDefault("Hatti", 0) ?? 0;
    e.sendCensus("Hatti", census("nesa"));
    Assert.equal(gold - CountData.gold, s.treasuries.get("Hatti").gold);
    s.people.get("nesa").settled += 30_000;
    const start = s.turn;
    for (let k = 0; k < 6 && s.censuses.length > 0; k++) {
      s.turn++;
      e.censusSeason();
    }
    Assert.equal(0, s.censuses.length);
    const c = countOf(s, "Hatti", "nesa")!;
    Assert.equal(start + CountData.seasons, c.turn);
    Assert.equal(s.people.get("nesa").settled, c.settled);
    Assert.true((s.ledger.tryGet("nesa")?.getOrDefault("Hatti", 0) ?? 0) < before);
    Assert.true(s.inbox.get("Hatti").some((i) => i.title === "A census" && i.body.includes("has come home")));
  });

  test("A census and a demand are given for one's own land only, once a season", () => {
    const s = fresh();
    const v = new OrderValidator(s, WorldMap.default).validate("Hatti", newTurnSubmission({ orders: [census("nesa"), census("nesa"), census("delta"), demand("share", 101, "nesa"), demand("amount", -1, "hattusa"), demand("amount", 50, "hattusa"), demand("amount", 50, null)] }));
    Assert.equal(2, v.accepted.length);
    Assert.equal(5, v.rejected.length);
    s.censuses.push({ power: "Hatti", province: "nesa", counted: s.turn + 1, home: 0, count: null, mood: "" });
    const w = new OrderValidator(s, WorldMap.default).validate("Hatti", newTurnSubmission({ orders: [census("nesa")] }));
    Assert.contains(w.rejected, (x) => x.reason.includes("already counting"));
  });
  test("A share hides more the farther the land lies from its court, up to a bound", () => {
    Assert.equal(0, hiddenPercent(0, 1));
    Assert.equal(2 * CountData.hidePerFar, hiddenPercent(0, 3));
    Assert.equal(CountData.hidePerSeason * 4 + 2 * CountData.hidePerFar, hiddenPercent(4, 3));
    Assert.equal(CountData.hideMost, hiddenPercent(40, 9));
    Assert.equal(CountData.hideUncounted + CountData.hidePerFar, hiddenPercent(null, 2));
  });

  test("What a share hides stays in the farmers' granaries; an amount below the harvest leaves the rest with them", () => {
    const run = (age: number, amount: number | null): GameState => {
      const s = fresh();
      const c = countOf(s, "Hatti", "nesa")!;
      s.counts.get("Hatti").set("nesa", { ...c, turn: s.turn - age });
      const e = new TurnEngine(s);
      if (amount !== null) e.setDemand("Hatti", demand("amount", amount, "nesa"));
      e.beginTurn();
      e.resolve(new Dict());
      return s;
    };
    const exact = run(0, null);
    const old = run(20, null);
    // The older count brings less into the stores, and the farmers keep what they hid.
    Assert.true(old.stores.getOrDefault("nesa", 0) < exact.stores.getOrDefault("nesa", 0));
    Assert.true(old.granary.getOrDefault("nesa", 0) > exact.granary.getOrDefault("nesa", 0));
    // A small amount: the farmers keep more than under the usual share.
    const light = run(0, 1);
    Assert.true(light.granary.getOrDefault("nesa", 0) > exact.granary.getOrDefault("nesa", 0));
  });

  test("A count waits for the road home, and scribes who find the land lost send word home by the same road", () => {
    const s = fresh();
    const e = new TurnEngine(s);
    // The court far from the land counted, so the count has a road to travel.
    s.court.set("Hatti", "memphis");
    e.sendCensus("Hatti", census("nesa"));
    e.sendCensus("Hatti", census("samuha"));
    const before = countOf(s, "Hatti", "nesa")!.turn;
    // Samuha is lost before the scribes count it.
    e.setOwner("samuha", "Mitanni");
    const told = (): boolean => s.inbox.get("Hatti").some((i) => i.title === "A census" && i.body.includes("came home with nothing"));
    while (s.turn < s.censuses[0].counted) s.turn++;
    e.censusSeason();
    const lost = s.censuses.find((c) => c.province === "samuha")!;
    Assert.equal(null, lost.count);
    Assert.true(lost.home > s.turn);
    Assert.false(told());
    const counted = s.censuses.find((c) => c.province === "nesa")!;
    Assert.true(counted.count !== null && counted.home > s.turn);
    // Until the count reaches the court, the court keeps the old one.
    Assert.equal(before, countOf(s, "Hatti", "nesa")!.turn);
    while (s.censuses.length > 0) {
      s.turn++;
      if (s.turn < counted.home) Assert.equal(before, countOf(s, "Hatti", "nesa")!.turn);
      e.censusSeason();
    }
    Assert.true(told());
    Assert.equal(counted.count!.turn, countOf(s, "Hatti", "nesa")!.turn);
  });

  test("A levy asked as a share takes that share of the men at home, less what the province hides of it", () => {
    const s = fresh();
    const c = countOf(s, "Hatti", "hattusa")!;
    s.counts.get("Hatti").set("hattusa", { ...c, turn: s.turn - 10 });
    const e = new TurnEngine(s);
    s.units = s.units.filter((u) => u.province !== "hattusa");
    const at = menAvailable(s, "hattusa");
    const expect = Math.floor((Math.floor((at * 6) / 100) * (100 - e.hiddenIn("hattusa"))) / 100);
    const n = s.units.length;
    s.treasuries.get("Hatti").gold += 10_000;
    e.raise("Hatti", raise("hattusa", "Army", null, 6));
    Assert.equal(n + 1, s.units.length);
    Assert.equal(expect, s.units[s.units.length - 1].men);
    const v = new OrderValidator(s, WorldMap.default).validate("Hatti", newTurnSubmission({ orders: [raise("nesa", "Army", null, 0), raise("nesa", "Army", null, 101)] }));
    Assert.equal(2, v.rejected.length);
  });
  test("A census scheduled ahead waits for word of it to reach the province", () => {
    const s = fresh();
    const e = new TurnEngine(s);
    // Land far from the court: word of an order takes a season to reach it.
    e.setOwner("thebes", "Hatti");
    const reach = e.wordTo("Hatti", "thebes");
    Assert.true(reach >= 1);
    const sl = newSleepState({ asleep: true, wakeAt: 50 });
    const x = newPlannedOrder({ turn: s.turn, order: census("thebes"), given: s.turn });
    Assert.true(e.notYetReached("Hatti", sl, x.order, x));
    Assert.equal(s.turn + reach, sl.scheduled[0].turn);
  });
  test("A levy share too small for a levy is told as that; the yields a seat sees are its last reaping's, not the hands there now", () => {
    const s = fresh();
    const e = new TurnEngine(s);
    s.units = s.units.filter((u) => u.province !== "hattusa");
    // Men enough for a levy, but one in a hundred of them is fewer than a levy takes.
    s.people.get("hattusa").men = 3000;
    e.raise("Hatti", raise("hattusa", "Army", null, 1));
    Assert.true(s.inbox.get("Hatti").some((i) => i.title === "Levy failed" && i.body.includes("the share you asked of its men came to fewer")));
    const before = Views.for(s, "Hatti").yields.get("nesa");
    s.people.get("nesa").settled = 10;
    Assert.equal(before, Views.for(s, "Hatti").yields.get("nesa"));
  });

});
