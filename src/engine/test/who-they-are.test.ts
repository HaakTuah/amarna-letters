/**
 * Build order item 10, "Characters, first package: who they are": the larger pool, skills and what a character believes of
 * them, names made of outcomes, declared names and false envoys, what servants know, captives handed over, and tablets taken.
 */
import { describe, test } from "vitest";
import {
  AllPowers,
  Dict,
  type GameState,
  type Order,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  basePrice,
  captive,
  check,
  first,
  giftTo,
  handOver,
  inboxOf,
  learn,
  newGame,
  newGameConfig,
  newSkills,
  newTablet,
  newTabletCopy,
  newTurnSubmission,
  question,
  single,
  steal,
  OrderValidator,
  dispatch,
  newCover,
  FirstPool,
  InclinationKept,
} from "@amarna/engine";
import { Assert, skilled } from "./support.ts";

describe("WhoTheyAreTests", () => {
  function begin(s: GameState): TurnEngine {
    const e = new TurnEngine(s);
    e.beginTurn();
    return e;
  }

  function orders(p: Power, ...os: Order[]): Dict<Power, TurnSubmission> {
    return new Dict([[p, newTurnSubmission({ orders: os })]]);
  }

  test("The pool holds about 60, every seed keeps its first eighteen, and each power still starts with two envoys", () => {
    for (const seed of [1, 7, 42]) {
      const small = newGame(seed, newGameConfig({ characterPoolSize: FirstPool }));
      const large = newGame(seed);
      Assert.equal(60, large.characters.length);
      Assert.equal(JSON.stringify(small.characters), JSON.stringify(large.characters.slice(0, FirstPool)));
      for (const p of AllPowers) Assert.equal(2, large.characters.filter((c) => c.employer === p).length);
      Assert.all(large.characters.slice(FirstPool), (c) => Assert.equal("Free", c.status));
      // Hekanefer, prince of Miam, and Nubian captains in Egypt's service, at Pharaoh's court.
      Assert.contains(large.characters, (c) => c.name === "Hekanefer" && c.attested && c.at === "Egypt");
      Assert.equal(3, large.characters.filter((c) => c.facts.some((f) => f.tag === "nubian")).length);
      Assert.equal(new Set(large.characters.map((c) => c.name)).size, large.characters.length);
    }
  });

  test("Mostly ordinary people and few excellent ones among the newcomers", () => {
    const extra = [1, 2, 3, 4, 5].flatMap((seed) => newGame(seed).characters.slice(FirstPool).filter((c) => !c.attested));
    const excellent = extra.filter((c) => c.traits.competence >= 75).length;
    const ordinary = extra.filter((c) => c.traits.competence < 55).length;
    Assert.true(excellent * 5 < extra.length);
    Assert.true(ordinary * 2 > extra.length);
  });

  test("A belief moves with outcomes and settles near the truth, keeping part of its inclination", () => {
    const s = newGame(3);
    const c = s.characters[0];
    c.skills = newSkills({ gather: 50, stealth: 50, forge: 50 });
    c.inclination = 30;
    c.belief = newSkills({ gather: 80, stealth: 80, forge: 80 });
    // Outcomes at the rate its true skill gives (half of them succeed): the belief falls towards 50 + 0.3 × 30.
    for (let i = 0; i < 400; i++) learn(c, "gather", i % 2 === 0, (b) => b / 100);
    Assert.inRange(c.belief.gather, 50 + InclinationKept * 30 - 8, 50 + InclinationKept * 30 + 8);
    // A run of luck misleads it.
    for (let i = 0; i < 10; i++) learn(c, "gather", true, (b) => b / 100);
    Assert.true(c.belief.gather > 60);
  });

  test("A person asks by what it believes it can do, never by its true skill", () => {
    const s = newGame(3);
    const c = first(s.characters, (x) => x.status === "Free");
    c.ties = [];
    c.traits.sympathy = null;
    c.skills = newSkills({ gather: 90, stealth: 90, forge: 90 });
    c.belief = newSkills({ gather: 20, stealth: 20, forge: 20 });
    const humble = basePrice(c, "Hatti");
    c.skills = newSkills({ gather: 10, stealth: 10, forge: 10 });
    Assert.equal(humble, basePrice(c, "Hatti"));
    c.belief = newSkills({ gather: 90, stealth: 90, forge: 90 });
    Assert.true(basePrice(c, "Hatti") > humble);
  });

  test("A capture is a fact the captor knows at once and the other courts hear as rumour, never its master", () => {
    const s = newGame(4, newGameConfig({ catastropheChance: 0 }));
    const spy = first(s.characters, (c) => c.employer === "Babylonia");
    const e = begin(s);
    e.outcome(spy, "Assyria", "Was caught spying at the court of Assyria (season 1).", false);
    const fact = spy.facts[spy.facts.length - 1];
    Assert.equal(["Assyria"], fact.knownBy);
    Assert.equal(-10, spy.reputation.getOrDefault("Assyria", 0));
    const rumours = s.journeys.filter((j) => j.kind === "Rumor" && j.news === "Name" && j.characterId === spy.id);
    Assert.equal(
      AllPowers.filter((p) => p !== "Assyria" && p !== "Babylonia"),
      rumours.map((j) => j.to),
    );
    for (let i = 0; i < 6; i++) begin(s).resolve(new Dict());
    Assert.all(
      AllPowers.filter((p) => p !== "Babylonia"),
      (p) => Assert.contains(Views.for(s, p).known.concat(Views.for(s, p).court), (v) => v.id === spy.id && v.knownFacts.includes(fact.text)),
    );
  });

  test("A false name: the court knows the person by it, is told by it, and sees through it by inquiries", () => {
    const s = newGame(6, newGameConfig({ catastropheChance: 0 }));
    const c = first(s.characters, (x) => x.status === "Free" && x.at !== "Hatti" && !x.met.includes("Hatti") && !x.reputation.has("Hatti"));
    const e = begin(s);
    e.declare(c, "Hatti", "Amenmose", null);
    // It pitched there under that name: Hatti lists it, by that name, knowing nothing of its life.
    c.pitches.set("Hatti", "I am Amenmose.");
    const seen = single(Views.for(s, "Hatti").known, (v) => v.id === c.id);
    Assert.equal("Amenmose", seen.name);
    Assert.empty(seen.knownFacts);
    // A name nobody offered it, or one already borrowed from a living person, is not taken: it goes by its own.
    const other = first(s.characters, (x) => x.status === "Free" && x.id !== c.id && !x.met.includes("Babylonia") && !x.reputation.has("Babylonia"));
    e.declare(other, "Babylonia", s.characters[0].name, null);
    Assert.empty(other.declared);
    s.treasuries.get("Hatti").gold = 10000;
    let found = false;
    for (let i = 0; i < 6 && !found; i++) {
      begin(s).resolve(orders("Hatti", check(c.id, 150)));
      found = c.declared[0].exposed !== null;
    }
    Assert.true(found);
    Assert.contains(inboxOf(s, "Hatti"), (i) => i.title === "An impostor exposed" && i.body.includes(c.name));
    Assert.contains(c.facts, (f) => f.tag === "impostor" && f.text === "Posed as Amenmose at the court of Hatti.");
  });

  test("A false envoy is given a host's gift, and an envoy sent to the king it named exposes it", () => {
    const s = newGame(8, newGameConfig({ catastropheChance: 0 }));
    const c = first(s.characters, (x) => x.status === "Free");
    c.at = "Egypt";
    c.met = [];
    const e = begin(s);
    e.declare(c, "Egypt", null, "Babylonia");
    Assert.equal("Babylonia", c.declared[0].employer);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "An envoy without a letter");
    const purse = c.purse;
    s.treasuries.get("Egypt").gold = 10000;
    e.resolve(orders("Egypt", giftTo(c.id, 30)));
    Assert.equal(purse + 30, c.purse);
    // The envoy asks at Babylon; home again, the answer exposes the claim.
    const envoy = first(s.characters, (x) => x.employer === "Egypt");
    const cargo = { trailId: "", copyIds: [], gold: 0, purityPercent: 100, goldStated: 0, observations: [], wasDetained: false, claimChecked: c.id, claimHeld: false };
    begin(s).claimAnswered("Egypt", "Babylonia", cargo);
    Assert.notNull(c.declared[0].exposed);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.title === "A claim checked" && i.body.includes("does not serve their king"));
    Assert.true(envoy.employer === "Egypt");
  });

  test("A captive questioned tells the tablets it saw, or lies with one that never was", () => {
    for (const loyal of [false, true]) {
      const s = newGame(9, newGameConfig({ catastropheChance: 0 }));
      const c = first(s.characters, (x) => x.employer === "Mitanni");
      s.tablets.push(newTablet({ id: "t900", text: "Peace.", proposedBy: "Mitanni", partner: "Egypt", seals: ["Mitanni", "Egypt"], createdTurn: 1, sealedTurn: 1 }));
      c.seen = ["t900"];
      c.status = "Captured";
      c.heldBy = "Hatti";
      c.at = "Hatti";
      c.ties = [];
      [c.traits.courage, c.traits.loyalty] = loyal ? [90, 90] : [5, 5];
      s.treasuries.get("Hatti").gold = 10000;
      begin(s).resolve(orders("Hatti", question(c.id, 400)));
      const told = s.copies.filter((k) => k.holder === "Hatti" && k.source === `told by ${c.name} under questioning`);
      Assert.single(told);
      const t = s.tablets.find((x) => x.id === told[0].tabletId)!;
      Assert.equal(loyal, t.forged);
      if (loyal) Assert.equal(c.id, t.forgerId);
      else Assert.equal("t900", t.id);
    }
  });

  test("A captive handed over is the other court's captive", () => {
    const s = newGame(9, newGameConfig({ catastropheChance: 0 }));
    const c = first(s.characters, (x) => x.employer === "Mitanni");
    c.status = "Captured";
    c.heldBy = "Hatti";
    c.at = "Hatti";
    begin(s).resolve(orders("Hatti", handOver(c.id, "Egypt")));
    Assert.equal(["Egypt", "Egypt"], [c.heldBy, c.at]);
    Assert.contains(Views.for(s, "Egypt").known.concat(Views.for(s, "Egypt").court), (v) => v.id === c.id && v.status === "your captive");
    // And it is Egypt's to decide now: Hatti's orders for it are refused.
    begin(s).resolve(orders("Hatti", captive(c.id, "Release")));
    Assert.equal("Egypt", c.heldBy);
  });

  test("A spy told to steal takes a tablet the court then no longer holds, and it comes home with the report", () => {
    let stolen = false;
    for (const seed of [11, 12, 13, 14, 15, 16]) {
      const s = newGame(seed, newGameConfig({ catastropheChance: 0 }));
      const spy = first(s.characters, (x) => x.employer === "Egypt");
      spy.secretMaster = null;
      skilled(spy, 100);
      s.tablets.push(newTablet({ id: "t900", text: "Peace.", proposedBy: "Hatti", partner: "Arzawa", seals: ["Hatti", "Arzawa"], createdTurn: 1, sealedTurn: 1 }));
      s.copies.push(newTabletCopy({ id: "k900", tabletId: "t900", holder: "Hatti", acquiredTurn: 1, source: "sealed" }));
      spy.status = "Employed";
      spy.duty = "SpyPosted";
      spy.missionTarget = "Hatti";
      spy.at = "Hatti";
      begin(s).resolve(orders("Egypt", steal(spy.id)));
      if ((spy.status as string) === "Captured") continue;
      Assert.doesNotContain(s.copies, (k) => k.holder === "Hatti" && k.tabletId === "t900");
      Assert.contains(inboxOf(s, "Hatti"), (i) => i.title === "A tablet is missing");
      for (let i = 0; i < 6 && !s.copies.some((k) => k.holder === "Egypt" && k.tabletId === "t900"); i++) begin(s).resolve(new Dict());
      Assert.contains(s.copies, (k) => k.holder === "Egypt" && k.tabletId === "t900" && k.source.startsWith("stolen from the archive of Hatti"));
      Assert.contains(spy.seen, (x) => x === "t900");
      stolen = true;
      break;
    }
    Assert.true(stolen);
  });

  test("No order of item 10 tells a court what it cannot know (the review's leaks)", () => {
    const s = newGame(10, newGameConfig({ catastropheChance: 0 }));
    s.treasuries.get("Egypt").gold = 10000;
    const v = new OrderValidator(s);
    // A claim can be checked only for a person at court who says it is an envoy of the king written to.
    const hatti = first(s.characters, (x) => x.employer === "Hatti");
    const envoy = first(s.characters, (x) => x.employer === "Egypt");
    const refused = v.validate("Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Hatti", "Greetings.", { checkClaim: hatti.id })] })).rejected;
    Assert.single(refused);
    // A hidden spy at the court is nobody there: a gift to it is refused as to a stranger.
    const spy = first(s.characters, (x) => x.employer === "Babylonia");
    [spy.duty, spy.at, spy.missionTarget, spy.status] = ["SpyPosted", "Egypt", "Egypt", "Employed"];
    const nobody = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [giftTo(spy.id, 1), giftTo("c999", 1)] })).rejected;
    Assert.equal(nobody[1].reason.replace("c999", spy.id), nobody[0].reason);
    // A spy caught abroad whose master has not heard of it may still be told to steal: the refusal would tell.
    const own = first(s.characters, (x) => x.employer === "Babylonia" && x.id !== spy.id);
    [own.duty, own.at, own.missionTarget, own.status, own.heldBy] = ["None", "Hatti", "Hatti", "Captured", "Hatti"];
    own.covers.push(newCover({ for: "Babylonia", since: 1, believed: "SpyPosted", dutyText: "watching Hatti", whereText: "at the court of Hatti" }));
    Assert.empty(new OrderValidator(s).validate("Babylonia", newTurnSubmission({ orders: [steal(own.id)] })).rejected);
  });
});
