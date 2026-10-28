import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type Order,
  type Power,
  TurnEngine,
  type TurnSubmission,
  WorldMap,
  LandData,
  OrderValidator,
  deport,
  expel,
  inboxOf,
  needOf,
  newAudienceRecord,
  newAudienceRound,
  newEnvoyReaction,
  newHostReply,
  claimOf,
  newMindReply,
  newMindRequest,
  newGame,
  newGameConfig,
  newSiege,
  newTurnSubmission,
  newUnit,
  reckonedOf,
  returnRunaways,
  ship,
  single,
  trade,
  welcome,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// People across borders and in kings' hands (build order item 10+b), and the answers carried from 10+a: anyone's ships at
// a besieged harbour, prices and tolls known only as reported.
describe("BordersTests", () => {
  const Map = WorldMap.default;
  const quiet = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0 }));
  const orders = (p: Power, ...os: TurnSubmission["orders"]): Dict<Power, TurnSubmission> => new Dict([[p, newTurnSubmission({ orders: os })]]);
  const refusal = (s: GameState, p: Power, o: Order): string | null => new OrderValidator(s, Map).validate(p, newTurnSubmission({ orders: [o] })).rejected[0]?.reason ?? null;
  /** A province of one king next to a province of another's. */
  const border = (s: GameState): [string, Power, string, Power] => {
    for (const p of Map.landProvinces) {
      const a = s.owner.getOrDefault(p.id, null);
      if (a === null) continue;
      for (const n of Map.movesFrom("Army", p.id)) {
        const b = s.owner.getOrDefault(n, null);
        if (b !== null && b !== a && !Map.get(n).isSea) return [p.id, a, n, b];
      }
    }
    throw new Error("no border");
  };

  test("Those leaving the land cross to better land as loose men, the runaways of the king they fled", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    const [from, a, to, b] = border(s);
    // Home went hungry last season; the land across the border ate its fill, and is the best of home's neighbours.
    for (const n of Map.movesFrom("Army", from)) s.fed.set(n, 500);
    s.fed.set(from, 500);
    s.fed.delete(to);
    const before = e.peopleOf(to).loose;
    e.refuge(from, 1000, "hunger");
    Assert.equal(before + 1000, e.peopleOf(to).loose);
    Assert.equal(1000, s.runaways.get(to).get(a));
    Assert.contains(inboxOf(s, b), (i) => i.title === "People" && i.body.includes("fled hunger"));
    // Land no better than home by a tenth draws nobody: they stay loose at home.
    s.fed.set(to, 520);
    const home = e.peopleOf(from).loose;
    e.peopleOf(from).loose += 500;
    e.refuge(from, 500, "hunger");
    Assert.equal(home + 500, e.peopleOf(from).loose);
  });

  test("A king settles the loose men of a province of his as far as it has room; runaways settled are his", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    const [, a, to, b] = border(s);
    const x = e.peopleOf(to);
    const room = reckonedOf(Map, to).room;
    x.settled = room - 2000;
    e.beginTurn();
    x.loose = 5000;
    s.runaways.set(to, new Dict([[a, 3000]]));
    s.loot.set(to, 100);
    const purse = s.markets.get(to).purse;
    const settled = x.settled;
    e.resolve(orders(b, welcome(to)));
    // As many as the land has room for, no more.
    Assert.equal(settled + Math.min(5000, room - settled), x.settled, 600);
    Assert.true(x.loose < 5000);
    // The runaways among them shrank in proportion, and the gold the loose carried came into the purse with them.
    Assert.true(s.runaways.get(to).get(a) < 3000);
    Assert.true(s.markets.get(to).purse >= purse);
  });

  test("Runaways sent back walk to their king's nearest land and settle there", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    const [, a, to, b] = border(s);
    e.beginTurn();
    e.peopleOf(to).loose = 4000;
    s.runaways.set(to, new Dict([[a, 3000]]));
    Assert.null(refusal(s, b, returnRunaways(to, a)));
    e.resolve(orders(b, returnRunaways(to, a)));
    // The 3,000 set out (on a long road some slip away and stay loose here, as discharged men do).
    Assert.inRange(e.peopleOf(to).loose, 1000, 1700);
    const w = single(s.walking, (x) => x.deported);
    Assert.equal(a, s.owner.get(w.home));
    Assert.equal(b, w.by);
    const settled = e.peopleOf(w.home).settled;
    for (let i = 0; i < 6 && s.walking.includes(w); i++) {
      e.beginTurn();
      e.resolve(new Dict());
    }
    Assert.false(s.walking.includes(w));
    Assert.true(e.peopleOf(w.home).settled > settled - 2000);
    Assert.contains(inboxOf(s, a), (i) => i.body.includes(`sent back by ${b}`));
  });

  test("A conqueror deports settled people from land he took to his own; never from his homeland", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    const taken = Map.get("carchemish");
    s.owner.set(taken.id, "Hatti");
    Assert.contains("homeland", refusal(s, "Hatti", deport("hattusa", "nesa", 1000)) ?? "");
    Assert.null(refusal(s, "Hatti", deport(taken.id, "hattusa", 1000, true)));
    const x = e.peopleOf(taken.id);
    e.beginTurn();
    const settled = x.settled;
    const purse = s.markets.get(taken.id).purse;
    e.resolve(orders("Hatti", deport(taken.id, "hattusa", 1000, true)));
    Assert.equal(settled - 1000, x.settled, 10);
    const w = single(s.walking, (y) => y.deported);
    Assert.equal("hattusa", w.home);
    // A few die on the way; they carry their share of the purse.
    Assert.inRange(w.men, 700, 960);
    Assert.true(w.savings > 0);
    Assert.equal(purse - w.savings, s.markets.get(taken.id).purse, 5);
  });

  test("A besieged city puts out the mouths that cannot fight, and eats less while the siege lasts", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    const u = single(s.units, (x) => x.province === "hattusa");
    u.province = "carchemish";
    s.owner.set("carchemish", "Mitanni");
    s.sieges.push(newSiege({ province: "carchemish", power: "Hatti", unitId: u.id, since: s.turn - 1 }));
    const need = needOf(Map.get("carchemish"));
    const loose = e.peopleOf("carchemish").loose;
    e.beginTurn();
    e.resolve(orders("Mitanni", expel("carchemish")));
    Assert.equal(LandData.expelPercent, s.expelled.get("carchemish"));
    Assert.equal(need - Math.floor((need * LandData.expelPercent) / 100), e.townNeed("carchemish"));
    Assert.true(s.events.some((x) => x.signal === "mouths-expelled"));
    Assert.true(e.peopleOf("carchemish").loose > loose || s.events.some((x) => x.signal === "refugees"));
    // The siege over, its people come back to eat.
    s.sieges.length = 0;
    e.beginTurn();
    Assert.false(s.expelled.has("carchemish"));
  });

  test("Loose men rob the purse and the stores, half as much where their holder's troops stand", () => {
    const take = (policed: boolean): [number, number] => {
      const s = quiet();
      const e = new TurnEngine(s);
      const prov = "carchemish";
      const holder = s.owner.getOrDefault(prov, null) ?? "Mitanni";
      s.owner.set(prov, holder);
      if (!policed) s.units = s.units.filter((x) => x.province !== prov);
      else if (!s.units.some((x) => x.province === prov && x.power === holder)) s.units.push(newUnit({ id: "u999", power: holder, province: prov, kind: "Army", home: prov }));
      e.peopleOf(prov).loose = 20_000;
      s.markets.get(prov).purse = 10_000;
      s.stores.set(prov, 1000);
      e.robbing();
      return [10_000 - s.markets.get(prov).purse, 1000 - s.stores.get(prov)];
    };
    const [gold, grain] = take(false);
    Assert.true(gold > 0 && grain > 0);
    const [g2] = take(true);
    Assert.true(g2 < gold);
  });

  test("Anyone's ship may sell grain at a besieged harbour while its waters are open; the besieger's fleet turns it away", () => {
    for (const blockaded of [false, true]) {
      const s = quiet();
      const e = new TurnEngine(s);
      s.stores.set("enkomi", 300);
      const u = single(s.units, (x) => x.province === "hattusa");
      u.province = "ugarit";
      s.sieges.push(newSiege({ province: "ugarit", power: "Hatti", unitId: u.id, since: s.turn - 1 }));
      if (blockaded) s.units.push(newUnit({ id: "u998", power: "Hatti", province: "ugaritwaters", kind: "Fleet", home: "kizzuwatna" }));
      s.markets.get("ugarit").stock = 0;
      e.resolve(new Dict([["Alashiya", newTurnSubmission({ orders: [ship("enkomi", "enkomi", "ugarit", 200, 0)] })]]));
      for (let i = 0; i < 4 && s.caravans.some((c) => !c.returning); i++) {
        s.turn++;
        e.beginTurn();
      }
      if (s.events.some((x) => x.signal === "ship-lost")) continue;
      Assert.equal(!blockaded, s.events.some((x) => x.signal === "besieged-fed"));
      if (blockaded) Assert.equal(0, s.markets.get("ugarit").stock);
    }
  });

  test("A false envoy is received in a full audience, and keeps what the host sends with it for its king", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    const c = s.characters.find((x) => x.status === "Free")!;
    c.at = "Egypt";
    c.employer = null;
    e.declare(c, "Egypt", null, "Hatti");
    const a = single(s.audiences);
    Assert.true(a.dispatch.pretended);
    Assert.equal(["Hatti", "Egypt"], [a.from, a.host]);
    // Hatti never sent it: no record of Hatti's own envoys shows it.
    Assert.true(single(s.trails, (t) => t.id === a.dispatch.trailId).pretended);
    s.treasuries.get("Egypt").gold = 1000;
    const purse = c.purse;
    e.applyAudience(newAudienceRecord({ audienceId: a.id, delivered: "My lord greets you.", rounds: [newAudienceRound({ host: newHostReply({ speech: "Take this to your king.", goldBack: 50 }), envoy: newEnvoyReaction({ speech: "I will." }) })] }));
    Assert.equal(purse + 50, c.purse);
    Assert.equal("Egypt", c.at);
    Assert.equal("None", c.duty);
    Assert.empty(s.journeys.filter((j) => j.characterId === c.id));
  });

  test("A pitch says what the person chose to claim; with no claim, what it believes", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    const c = s.characters.find((x) => x.status === "Free")!;
    const req = newMindRequest({ id: "r900", task: "Pitch", characterId: c.id, court: "Egypt" });
    e.fulfil(req, newMindReply({ text: "I can do anything.", number: 20, claims: { gather: 90, stealth: 20, forge: 47 } }));
    Assert.equal([90, 20, 47], [c.claimed!.gather, c.claimed!.stealth, c.claimed!.forge]);
    e.fulfil(req, newMindReply({ text: "I serve well.", number: 20 }));
    Assert.equal(claimOf(c), c.claimed);
  });

  test("A court knows a far market and the tolls on its goods only as its traders bring word home", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    // At the start a court knows the markets near it as last reported before the game; not the far ones.
    e.seeMarkets();
    Assert.false(s.marketsSeen.get("Egypt").has("hattusa"));
    // Hatti sets a toll on Egypt's goods; Egypt does not know of it until word comes.
    s.tolls.push({ holder: "Mitanni", province: null, partner: null, percent: 20 });
    Assert.false((s.tollsKnown.tryGet("Hatti") ?? []).some((t) => t.holder === "Mitanni"));
    s.stores.set("hattusa", 200);
    s.treasuries.get("Hatti").gold = 1000;
    e.resolve(orders("Hatti", trade("hattusa", "carchemish", 100, 0)));
    const c = single(s.caravans);
    const seen = s.marketsSeen.get("Hatti").tryGet("carchemish")?.turn ?? -1;
    for (let i = 0; i < 10 && s.caravans.length > 0; i++) {
      s.turn++;
      e.beginTurn();
    }
    if (s.events.some((x) => x.signal === "caravan-taken" || x.signal === "caravan-robbed")) return;
    // Home again: the market as the caravan found it, newer than what the court knew.
    Assert.true(c.word.markets.has("carchemish"));
    Assert.true((s.marketsSeen.get("Hatti").tryGet("carchemish")?.turn ?? -1) >= seen);
  });
});
