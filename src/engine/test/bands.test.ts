import { describe, test } from "vitest";
import {
  BandData,
  selfWait,
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
  newPendingTask,
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

  test("The holder's army falls on a band where it stands only on his order, and drives it off", () => {
    const s = newGame(3);
    const prov = quiet(s, "Egypt");
    const e = new TurnEngine(s);
    const b = e.headRises(prov, 80, "crowd", e.r("test"));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: prov, home: prov, men: 5000, food: 20 }));
    s.turn++;
    // No order: the army leaves it alone (Haakon's answers to item 11b).
    new TurnEngine(s).bandsSeason();
    Assert.false(s.events.some((x) => x.signal === "band-hunted"));
    b.province = prov;
    // Ordered to hunt there this season: it falls on it as the next season begins.
    s.huntNow.push(`Egypt|${prov}`);
    s.turn++;
    new TurnEngine(s).bandsSeason();
    Assert.empty(s.huntNow);
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
    // It decides how long to wait: two seasons, a season more if brave, another if loyal (selfWait).
    for (let i = 0; i < selfWait(spy); i++) {
      s.turn++;
      new TurnEngine(s).carryLetters();
    }
    Assert.equal(spy.id, letter.carrier);
    Assert.contains(s.journeys, (j) => j.kind === "SpyHomebound" && j.characterId === spy.id);
    // Its master goes on believing it at its post until it is home.
    Assert.notNull(spy.covers.find((k) => k.for === "Babylonia") ?? null);
  });

  test("One carrier takes every report waiting for the same court, for one fee", () => {
    // Seed 4: since item 11d (three more city-states) seed 5's world has no free person to carry the reports.
    const s = newGame(4);
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
    // Without its court's standing order to pay carriers, the spy paid it all now: nothing is owed on delivery.
    Assert.equal(0, letters.filter((l) => l.fee > 0).length);
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

  test("A ruthless chief kills a king's servant only where no army of the land stands near; a careful one never", () => {
    const s = newGame(8);
    const prov = quiet(s, "Egypt");
    const e = new TurnEngine(s);
    const b = e.headRises(prov, 60, "crowd", e.r("test"));
    const chief = first(s.characters, (c) => c.id === b.leaderId);
    const servant = first(s.characters, (c) => c.employer !== null && c.id !== chief.id);
    const free = first(s.characters, (c) => c.status === "Free" && c.id !== chief.id);
    chief.traits.loyalty = 20;
    const near = new Set([prov, ...Map.neighbors(prov)]);
    s.units = s.units.filter((u) => !(u.power === "Egypt" && near.has(u.province)));
    Assert.true(e.chiefKills(b, servant, prov));
    // A free traveller's word reaches nobody who would hunt him.
    Assert.false(e.chiefKills(b, free, prov));
    // The land's army next door: he lets the witness go.
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: Map.neighbors(prov)[0], home: prov, men: 2000, food: 20 }));
    Assert.false(e.chiefKills(b, servant, prov));
    s.units.pop();
    chief.traits.loyalty = 80;
    chief.traits.greed = 30;
    Assert.false(e.chiefKills(b, servant, prov));
  });

  test("A ransom demand never carries a spy's reports, and one no longer standing is dropped unsent", () => {
    const s = newGame(9);
    const at = Map.capital("Hatti").id;
    const e = new TurnEngine(s);
    const demand = newPendingTask({ id: newId(s, "q"), kind: "RansomDemand", requester: "Babylonia", other: "Hatti", spend: 100, dueTurn: s.turn + 8 });
    s.tasks.push(demand);
    e.rumor("Babylonia", "Hatti", "Hatti demands a ransom.", null, "Ransom", demand.id);
    const word = s.journeys[s.journeys.length - 1];
    [word.arriveTurn, word.waitAt] = [Waiting, at];
    const spy = first(s.characters, (c) => c.employer === "Babylonia" && c.at === "Babylonia");
    [spy.duty, spy.at, spy.missionTarget, spy.purse] = ["SpyPosted", "Hatti", "Hatti", 0];
    spy.traits.loyalty = 10;
    e.watchAndReport();
    const report = first(s.journeys, (j) => j.kind === "SpyReport" && j.characterId === spy.id);
    s.turn++;
    new TurnEngine(s).carryLetters();
    // Whoever took the demand (a traveller, or a carrier the captor hired) did not take the spy's report with it.
    if (word.carrier !== null) Assert.true(report.carrier === null || report.carrier !== word.carrier);
    // A demand replaced or lapsed: its word is dropped, and nobody is paid to carry it.
    const again = newPendingTask({ id: newId(s, "q"), kind: "RansomDemand", requester: "Babylonia", other: "Hatti", spend: 100, dueTurn: s.turn + 8 });
    e.rumor("Babylonia", "Hatti", "Hatti demands a ransom.", null, "Ransom", again.id);
    const gone = s.journeys[s.journeys.length - 1];
    [gone.arriveTurn, gone.waitAt] = [Waiting, at];
    const gold = s.treasuries.get("Hatti").gold;
    new TurnEngine(s).carryLetters();
    Assert.false(s.journeys.includes(gone));
    Assert.equal(gold, s.treasuries.get("Hatti").gold, 0);
  });

  test("A servant caught selling its master's secrets: word of it reaches its master by the roads", () => {
    let caught = false;
    for (let seed = 1; seed <= 40 && !caught; seed++) {
      const s = newGame(seed);
      const c = first(s.characters, (x) => x.employer === "Hatti" && x.status === "Employed");
      c.at = "Mitanni";
      c.duty = "EnvoyAtCourt";
      [c.traits.greed, c.traits.loyalty] = [90, 10];
      c.news = [newNewsHeld({ court: "Hatti", turn: s.turn, lines: ["Hatti had an army in Nesa."] })];
      if (newsOffered(s, c, "Mitanni").length === 0) return;
      new TurnEngine(s).resolve(subs({ Mitanni: { orders: [buyNews(c.id, "Hatti")] } }));
      const f = c.facts.find((x) => x.tag === "sold-secrets") ?? null;
      if (f === null) continue;
      caught = true;
      // Not known at once: the word is on the road from Mitanni.
      Assert.empty(f.knownBy);
      const word = first(s.journeys, (j) => j.kind === "Rumor" && j.news === "Name" && j.taskId === f.id);
      Assert.equal("Hatti", word.to);
      Assert.true(word.arriveTurn > word.departTurn);
      new TurnEngine(s).nameHeard(word);
      Assert.true(f.knownBy.includes("Hatti"));
      Assert.contains(inboxOf(s, "Hatti"), (i) => i.title === "Secrets sold");
    }
    Assert.true(caught);
  });

  test("A person asks more of a court it heard loses its people abroad", () => {
    const s = newGame(7);
    const c = first(s.characters, (x) => x.status === "Free");
    c.traits.courage = 20;
    const before = basePrice(c, "Assyria");
    const beforeHatti = basePrice(c, "Hatti");
    for (let i = 0; i < 4; i++) {
      c.heard.push(lossKey(newLossAbroad({ turn: 1, kind: "PutToDeath", characterId: `c99${i}`, court: "Hatti", master: "Assyria" })));
      c.heard.push(lossKey(newLossAbroad({ turn: 1, kind: "Captured", characterId: `c98${i}`, court: "Egypt", master: "Assyria" })));
    }
    Assert.true(basePrice(c, "Assyria") > before);
    // The court that put a man to death is feared too.
    Assert.true(basePrice(c, "Hatti") > beforeHatti);
  });

  test("Personas speak of experience, never of age", () => {
    const s = newGame(8);
    for (const c of s.characters) Assert.false(/\b(old|young|aged|elderly|years)\b/i.test(personaTemplate(c)));
  });
});
