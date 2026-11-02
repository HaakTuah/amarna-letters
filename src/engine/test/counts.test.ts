import { describe, test } from "vitest";
import { CountData, Dict, EconomyData, WorldMap, OrderValidator, TurnEngine, Views, census, countOf, demand, newGame, newGameConfig, newTurnSubmission, type GameState } from "@amarna/engine";
import { Assert } from "./support.ts";

// What a king can count (build order item 17++, part B): counts as the scribes knew them, the census, and the king's
// demand as a share or an amount. Each test calls the steps it tests on the starting world and plays no season it does
// not need.
describe("CountsTests", () => {
  const fresh = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0 }));

  test("Every court starts with a count of the land it holds, and its view shows the count, not the land as it is now", () => {
    const s = fresh();
    const c = countOf(s, "Hatti", "nesa")!;
    Assert.equal(s.turn - 1, c.turn);
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
    const v = new OrderValidator(s, WorldMap.default).validate("Hatti", newTurnSubmission({ orders: [census("nesa"), census("nesa"), census("delta"), demand("share", 101, "nesa"), demand("amount", -1, "hattusa"), demand("amount", 50, "hattusa")] }));
    Assert.equal(2, v.accepted.length);
    Assert.equal(4, v.rejected.length);
    s.censuses.push({ power: "Hatti", province: "nesa", counted: s.turn + 1, home: 0, count: null });
    const w = new OrderValidator(s, WorldMap.default).validate("Hatti", newTurnSubmission({ orders: [census("nesa")] }));
    Assert.contains(w.rejected, (x) => x.reason.includes("already counting"));
  });
});
