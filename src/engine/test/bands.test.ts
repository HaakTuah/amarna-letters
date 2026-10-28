import { describe, test } from "vitest";
import {
  BandData,
  LetterData,
  TurnEngine,
  Waiting,
  WorldMap,
  basePrice,
  first,
  buyNews,
  inboxOf,
  lossKey,
  newGame,
  newLossAbroad,
  newNewsHeld,
  newUnit,
  newId,
  newsOffered,
  personaTemplate,
  type GameState,
} from "@amarna/engine";
import { Assert, subs } from "./support.ts";

const Map = WorldMap.default;

/** A land province with no troops in it, held by `holder` (or anyone, if null). */
function quiet(s: GameState, holder: string | null = null): string {
  return first(Map.landProvinces, (p) => !Map.get(p.id).kingless && !s.units.some((u) => u.province === p.id) && (holder === null || s.owner.getOrDefault(p.id, null) === holder)).id;
}

describe("BandTests", () => {
  test("A large crowd of loose men nobody polices raises a chief who leads them as a band", () => {
    const s = newGame(1);
    const prov = quiet(s);
    s.people.get(prov).loose = 40000;
    let found = false;
    for (let i = 0; i < 60 && !found; i++) {
      s.turn++;
      new TurnEngine(s).bandsSeason();
      found = s.bands.some((b) => b.province === prov && b.rose === "crowd");
    }
    Assert.true(found);
    const b = first(s.bands, (x) => x.province === prov);
    const chief = first(s.characters, (c) => c.id === b.leaderId);
    Assert.equal("Leading", chief.duty);
    Assert.null(chief.at);
    Assert.equal(prov, chief.watchProvince);
    // How he rose is a public fact; that he rode with the Habiru, a hidden one any background check may find.
    Assert.contains(chief.facts, (f) => f.tag === "rose" && f.secrecy === "Public");
    Assert.contains(chief.facts, (f) => f.tag === "outlaw" && f.secrecy === "Hidden");
    Assert.true(b.men >= BandData.least && b.men <= BandData.startMost);
  });

  test("A crowd where its holder's troops stand raises nobody", () => {
    const s = newGame(1);
    const holder = s.owner.getOrDefault(Map.capital("Hatti").id, null)!;
    const prov = Map.capital("Hatti").id;
    Assert.true(s.units.some((u) => u.province === prov && u.power === holder));
    s.people.get(prov).loose = 40000;
    for (let i = 0; i < 30; i++) {
      s.turn++;
      new TurnEngine(s).bandsSeason();
    }
    Assert.empty(s.bands.filter((b) => b.province === prov && b.rose === "crowd"));
  });

  test("A band robs its province, its chief keeps the share, and nothing vanishes", () => {
    const s = newGame(2);
    const prov = quiet(s, "Egypt");
    const e = new TurnEngine(s);
    const b = e.headRises(prov, 60, "crowd", e.r("test"));
    const chief = first(s.characters, (c) => c.id === b.leaderId);
    e.market(prov).purse = 3000;
    const purse = e.market(prov).purse;
    s.turn++;
    new TurnEngine(s).bandsSeason();
    Assert.true(e.market(prov).purse < purse + chief.earned.spent);
    Assert.true(chief.earned.loot > 0);
    Assert.equal(chief.purse, chief.earned.loot - chief.earned.spent);
  });

  test("The holder's army standing where a band works falls on it and drives it off", () => {
    const s = newGame(3);
    const prov = quiet(s, "Egypt");
    const e = new TurnEngine(s);
    const b = e.headRises(prov, 80, "crowd", e.r("test"));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: prov, home: prov, men: 5000, food: 20 }));
    s.turn++;
    new TurnEngine(s).bandsSeason();
    Assert.true(s.events.some((x) => x.signal === "band-hunted"));
    // It lost men and fled, or lost its chief; either way it no longer works there unmolested.
    const still = s.bands.find((x) => x.id === b.id) ?? null;
    Assert.true(still === null || still.men < 80);
    Assert.true(still === null || still.province !== prov);
  });

  test("A band that cannot pay its men shrinks, and a chief whose band dwindles gives up the road", () => {
    const s = newGame(4);
    const prov = quiet(s, "Egypt");
    const e = new TurnEngine(s);
    const b = e.headRises(prov, 150, "crowd", e.r("test"));
    const chief = first(s.characters, (c) => c.id === b.leaderId);
    chief.traits.courage = 90;
    for (let i = 0; i < 12 && s.bands.some((x) => x.leaderId === chief.id); i++) {
      // Nothing left to rob.
      for (const x of [prov, ...Map.neighbors(prov)]) if (!Map.get(x).isSea) e.market(x).purse = 0;
      s.stores.set(prov, 0);
      s.turn++;
      new TurnEngine(s).bandsSeason();
    }
    Assert.false(s.bands.some((x) => x.leaderId === chief.id && x.men >= 150));
  });

  test("A spy's report from a foreign court waits for a carrier, and its spy carries it home in the end", () => {
    const s = newGame(5);
    const e = new TurnEngine(s);
    const spy = first(s.characters, (c) => c.employer === "Babylonia" && c.at === "Babylonia");
    spy.duty = "SpyPosted";
    spy.at = "Hatti";
    spy.missionTarget = "Hatti";
    spy.purse = 0;
    // Nobody free at Hatti to hire, and no traveller going to Babylon.
    for (const c of s.characters) if (c.status === "Free" && c.at === "Hatti") c.at = "Egypt";
    s.payRecords.set("Babylonia", { kept: 0, broken: 3 });
    e.watchAndReport();
    const letter = first(s.journeys, (j) => j.kind === "SpyReport" && j.characterId === spy.id);
    Assert.equal(Waiting, letter.arriveTurn);
    Assert.equal(Map.capital("Hatti").id, letter.waitAt);
    for (let i = 0; i < LetterData.selfAfter; i++) {
      s.turn++;
      new TurnEngine(s).carryLetters();
    }
    Assert.equal(spy.id, letter.carrier);
    Assert.contains(s.journeys, (j) => j.kind === "SpyHomebound" && j.characterId === spy.id);
    // Its master goes on believing it at its post until it is home.
    Assert.notNull(spy.covers.find((k) => k.for === "Babylonia") ?? null);
  });

  test("One carrier takes every report waiting for the same court, for one fee", () => {
    const s = newGame(5);
    const spy = first(s.characters, (c) => c.employer === "Babylonia" && c.at === "Babylonia");
    spy.duty = "SpyPosted";
    spy.at = "Hatti";
    spy.missionTarget = "Hatti";
    spy.purse = 500;
    const e = new TurnEngine(s);
    e.watchAndReport();
    s.turn++;
    new TurnEngine(s).watchAndReport();
    const letters = s.journeys.filter((j) => j.kind === "SpyReport" && j.characterId === spy.id);
    Assert.equal(2, letters.length);
    // Somebody free at Hatti to hire, nobody going to Babylon.
    const free = first(s.characters, (c) => c.status === "Free" && c.at !== null && c.errand === null);
    free.at = "Hatti";
    free.duty = "None";
    const travelling = s.journeys.filter((j) => j.kind === "Travel").length;
    s.turn++;
    new TurnEngine(s).carryLetters();
    Assert.true(letters.every((l) => l.carrier !== null && l.carrier === letters[0].carrier));
    Assert.equal(travelling + 1, s.journeys.filter((j) => j.kind === "Travel").length);
    Assert.equal(1, letters.filter((l) => l.fee > 0).length);
  });

  test("A free person sells the news it saw at one court at another", () => {
    const s = newGame(6);
    const c = first(s.characters, (x) => x.status === "Free" && x.at !== null);
    c.at = "Mitanni";
    c.news = [newNewsHeld({ court: "Hatti", turn: s.turn, lines: ["Hatti had an army in Nesa."] })];
    const offer = newsOffered(s, c, "Mitanni");
    Assert.equal(1, offer.length);
    const gold = s.treasuries.get("Mitanni").gold;
    const purse = c.purse;
    new TurnEngine(s).resolve(subs({ Mitanni: { orders: [buyNews(c.id, "Hatti")] } }));
    Assert.equal(gold - offer[0].price, s.treasuries.get("Mitanni").gold, 0);
    Assert.equal(purse + offer[0].price, c.purse);
    Assert.contains(inboxOf(s, "Mitanni"), (i) => i.title === `News of Hatti from ${c.name}` && i.body.includes("Hatti had an army in Nesa."));
    // It is never offered at the court it is about.
    c.at = "Hatti";
    Assert.empty(newsOffered(s, c, "Hatti"));
  });

  test("A person asks more of a court it heard loses its people abroad", () => {
    const s = newGame(7);
    const c = first(s.characters, (x) => x.status === "Free");
    c.traits.courage = 20;
    const before = basePrice(c, "Assyria", 100);
    const beforeHatti = basePrice(c, "Hatti", 100);
    for (let i = 0; i < 4; i++) {
      c.heard.push(lossKey(newLossAbroad({ turn: 1, kind: "PutToDeath", characterId: `c99${i}`, court: "Hatti", master: "Assyria" })));
      c.heard.push(lossKey(newLossAbroad({ turn: 1, kind: "Captured", characterId: `c98${i}`, court: "Egypt", master: "Assyria" })));
    }
    Assert.true(basePrice(c, "Assyria", 100) > before);
    // The court that put a man to death is feared too.
    Assert.true(basePrice(c, "Hatti", 100) > beforeHatti);
  });

  test("Personas speak of experience, never of age", () => {
    const s = newGame(8);
    for (const c of s.characters) Assert.false(/\b(old|young|aged|elderly|years)\b/i.test(personaTemplate(c)));
  });
});
