import { describe, test } from "vitest";
import {
  AllPowers,
  AtOnce,
  Dict,
  Styles,
  TurnEngine,
  UnheardTitle,
  Views,
  WorldMap,
  courtReads,
  courtSpeaks,
  crossChance,
  dispatch,
  first,
  homeProvince,
  inboxOf,
  newDispatch,
  newGame,
  newPendingAudience,
  newTablet,
  newTabletCopy,
  spokenIn,
  type Character,
  type GameState,
  type Power,
} from "@amarna/engine";
import { Assert } from "./support.ts";

const Map = WorldMap.default;

const taken = new WeakMap<GameState, Set<string>>();

/** A person of the pool standing at `p`'s court, speaking only the languages given. */
function person(s: GameState, p: Power, tongues: [string, number][], employer: Power | null = null): Character {
  const used = taken.get(s) ?? new Set<string>();
  taken.set(s, used);
  const c = first(s.characters, (x) => x.status === "Free" && x.heldBy === null && x.at !== p && !used.has(x.id));
  used.add(c.id);
  c.at = p;
  c.duty = "None";
  c.errand = null;
  c.tongues = new Dict(tongues);
  if (employer !== null) {
    c.status = "Employed";
    c.employer = employer;
  }
  return c;
}

/** Hatti's own servants at court speak Hittite only, so a test decides who else shares a language there. */
function hittiteOnly(s: GameState): void {
  for (const x of s.characters) if (x.employer === "Hatti") x.tongues = new Dict([["Hittite", 100]]);
  s.kingTongues.set("Hatti", new Dict([["Hittite", 100]]));
}

/** An envoy of Egypt arriving at Hatti's court this season, with gifts. */
function envoyAtHatti(s: GameState, tongues: [string, number][], gold = 0): Character {
  const c = person(s, "Hatti", tongues, "Egypt");
  c.duty = "EnvoyAtCourt";
  c.purse = 0;
  s.audiences.push(newPendingAudience({ id: "a-test", envoyId: c.id, from: "Egypt", host: "Hatti", dispatch: newDispatch({ gold, purityPercent: 100 }) }));
  return c;
}

// Build order item 12, "Languages": each rule on the few people and courts it needs.
describe("LanguagesTests", () => {
  test("Every province and court has its languages, and every origin of the cast grows up somewhere", () => {
    for (const p of Map.landProvinces) Assert.true(spokenIn(p.id, null).size > 0, p.id);
    for (const p of AllPowers) {
      const capital = Map.capital(p).id;
      Assert.true(spokenIn(capital, p).getOrDefault(courtSpeaks(p, capital), 0) > 0, p);
    }
    for (const st of Styles) for (const o of st.origins) Assert.notNull(homeProvince(o));
    // Babylonia and Assyria speak Akkadian natively; Arzawa's court reads Hittite and Luwian, not Akkadian.
    Assert.equal("Akkadian", courtSpeaks("Babylonia", Map.capital("Babylonia").id));
    Assert.false(courtReads("Arzawa", Map.capital("Arzawa").id).includes("Akkadian"));
  });

  test("Skill buys time: fluent crosses at once, a halting speaker slowly, no shared language never", () => {
    Assert.equal(100, crossChance(AtOnce));
    Assert.equal(50, crossChance(50));
    Assert.equal(0, crossChance(0));
  });

  test("Everyone starts with the tongues of home, kings with their court's, servants with the court they serve", () => {
    const s = newGame(1);
    for (const c of s.characters)
      Assert.true(
        [...c.tongues.values()].some((x) => x === 100),
        c.name,
      );
    for (const p of AllPowers) Assert.equal(100, s.kingTongues.get(p).getOrDefault(courtSpeaks(p, Map.capital(p).id), 0));
    for (const c of s.characters.filter((x) => x.status === "Employed" && x.employer !== null))
      Assert.true(c.tongues.getOrDefault(courtSpeaks(c.employer!, Map.capital(c.employer!).id), 0) >= 60, c.name);
  });

  test("Living somewhere teaches its languages, and only those", () => {
    const s = newGame(1);
    const c = person(s, "Hatti", [["Egyptian", 100]]);
    c.aptitude = 50;
    const e = new TurnEngine(s);
    for (let i = 0; i < 8; i++) {
      e.learnTongues();
      s.turn++;
    }
    Assert.true(c.tongues.getOrDefault("Hittite", 0) >= 30);
    Assert.true(c.tongues.getOrDefault("Luwian", 0) >= 30);
    Assert.equal(0, c.tongues.getOrDefault("Hurrian", 0));
    // A traveller passing through for a tenth of a season learns almost nothing.
    const t = person(s, "Hatti", [["Egyptian", 100]]);
    t.aptitude = 50;
    e.noteRoad(t, new Dict([[Map.capital("Hatti").id, 10]]));
    e.learnTongues();
    Assert.true(t.tongues.getOrDefault("Hittite", 0) <= 2);
  });

  test("An envoy nobody understands is no audience: his host is told plainly and his gifts are presented", () => {
    const s = newGame(1);
    hittiteOnly(s);
    const c = envoyAtHatti(s, [["Egyptian", 100]], 40);
    const gold = s.treasuries.get("Hatti").gold;
    new TurnEngine(s).settleSpeech();
    Assert.empty(s.audiences);
    Assert.single(s.unheard);
    Assert.equal(gold + 40, s.treasuries.get("Hatti").gold);
    Assert.contains(inboxOf(s, "Hatti"), (n) => n.title === UnheardTitle && n.body.includes("gifts weighing 40 shekels") && n.subject === c.id);
  });

  test("A servant who speaks with both carries the envoy's words to his king", () => {
    const s = newGame(1);
    hittiteOnly(s);
    const bridge = person(
      s,
      "Hatti",
      [
        ["Hittite", 100],
        ["Akkadian", 100],
      ],
      "Hatti",
    );
    envoyAtHatti(s, [
      ["Egyptian", 100],
      ["Akkadian", 100],
    ]);
    new TurnEngine(s).settleSpeech();
    Assert.single(s.audiences);
    Assert.equal(bridge.id, s.audiences[0].through);
  });

  test("A go-between at court carries the words of an envoy nobody understands, for his price, from the envoy's purse", () => {
    const s = newGame(1);
    hittiteOnly(s);
    const g = person(s, "Hatti", [
      ["Hittite", 100],
      ["Egyptian", 100],
    ]);
    const c = envoyAtHatti(s, [["Egyptian", 100]]);
    c.purse = 100;
    const before = g.purse;
    new TurnEngine(s).settleSpeech();
    Assert.single(s.audiences);
    Assert.equal(g.id, s.audiences[0].through);
    Assert.true(g.bridgePrice !== null && g.purse === before + g.bridgePrice && c.purse === 100 - g.bridgePrice);
  });

  test("An unheard envoy waits by his loyalty, then goes home, or says his message was delivered", () => {
    const s = newGame(1);
    hittiteOnly(s);
    const c = envoyAtHatti(s, [["Egyptian", 100]]);
    c.traits.loyalty = 10;
    c.traits.greed = 90;
    const e = new TurnEngine(s);
    e.settleSpeech();
    Assert.single(s.unheard);
    s.turn += 1;
    e.settleSpeech();
    Assert.empty(s.unheard);
    const j = first(s.journeys, (x) => x.characterId === c.id);
    Assert.equal("lie", j.cargo!.unheard);
  });

  test("An envoy who shares no language with his king or any servant at court cannot be sent; a halting one leaves later", () => {
    const s = newGame(1);
    for (const x of s.characters) if (x.employer === "Hatti") x.tongues = new Dict([["Hittite", 100]]);
    s.kingTongues.set("Hatti", new Dict([["Hittite", 100]]));
    const mute = person(s, "Hatti", [["Egyptian", 100]], "Hatti");
    const e = new TurnEngine(s);
    Assert.null(e.composing(mute, "Hatti", "Egypt"));
    e.dispatch("Hatti", dispatch(mute.id, "Egypt", "Greetings."));
    Assert.contains(inboxOf(s, "Hatti"), (n) => n.body.includes("could make") && n.body.includes(mute.name));
    const halting = person(
      s,
      "Hatti",
      [
        ["Egyptian", 100],
        ["Hittite", 5],
      ],
      "Hatti",
    );
    Assert.true(e.composing(halting, "Hatti", "Egypt")!.seasons > 0);
  });

  test("A tablet in a language its holder's scribes do not read waits for a reader", () => {
    const s = newGame(1);
    // Arzawa reads Hittite and Luwian; an Akkadian tablet waits until someone at its court reads Akkadian and Luwian.
    for (const x of s.characters) if (x.employer === "Arzawa") x.tongues = new Dict([["Luwian", 100]]);
    s.tablets.push(
      newTablet({ id: "t-test", text: "Peace between us.", proposedBy: "Babylonia", partner: "Arzawa", seals: ["Babylonia"], tongue: "Akkadian" }),
    );
    s.copies.push(newTabletCopy({ id: "k-test", tabletId: "t-test", holder: "Arzawa", acquiredTurn: s.turn, source: "brought" }));
    const e = new TurnEngine(s);
    e.readersSeason();
    const k = first(s.copies, (x) => x.id === "k-test");
    Assert.true(k.unread === true);
    Assert.false(
      Views.tablet(
        first(s.tablets, (t) => t.id === "t-test"),
        k,
      ).text.includes("Peace"),
    );
    person(
      s,
      "Arzawa",
      [
        ["Luwian", 100],
        ["Akkadian", 100],
      ],
      "Arzawa",
    );
    e.readersSeason();
    Assert.true(k.unread === false);
  });

  test("Only a bridger in someone else's pay may bend the words he carries", () => {
    const s = newGame(1);
    hittiteOnly(s);
    const bridge = person(
      s,
      "Hatti",
      [
        ["Hittite", 100],
        ["Akkadian", 100],
      ],
      "Hatti",
    );
    envoyAtHatti(s, [
      ["Egyptian", 100],
      ["Akkadian", 100],
    ]);
    const e = new TurnEngine(s);
    e.settleSpeech();
    const a = s.audiences[0];
    Assert.null(e.benderOf(a));
    bridge.handed.push({ by: "Mitanni", turn: s.turn });
    Assert.same(bridge, e.benderOf(a));
    Assert.contains(e.bridgeView(a, bridge, "Give way, or my troops come.", []).paidBy, (x) => x === "Mitanni");
  });
});
