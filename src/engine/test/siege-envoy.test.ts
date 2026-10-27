import { describe, test } from "vitest";
import { orders } from "../../llm/src/parse.ts";
import {
  type Character,
  Dict,
  EnvoyCaughtTitle,
  type GameConfig,
  type GameState,
  OrderValidator,
  type Power,
  type TabletProposal,
  TurnEngine,
  type TurnSubmission,
  Views,
  dispatch,
  first,
  hold,
  inboxOf,
  newGame,
  newGameConfig,
  newHomeCargo,
  newId,
  newJourney,
  newSiege,
  newTabletProposal,
  newUnit,
  single,
  support,
} from "@amarna/engine";
import { removeAll, Assert, subs } from "./support.ts";

// Envoys and a besieged capital (Build order item 5; question 5, plan steps 12 and 13): the besieged king's envoys leaving,
// or coming home, may be caught; one whose courage the siege outweighs will not go; a caught envoy is the besieger's
// captive, its letter read, its gold and tablets taken, and its king hears only that it has not returned.
describe("SiegeEnvoyTests", () => {
  // <summary>Seed 1: Babylonia's army besieges Ashur (just begun, walls 3), with its army in Ekallatum next to it (tightness 2).</summary>
  function besieged(config: GameConfig): [GameState, Character] {
    let s = newGame(1, { ...config, catastropheChance: 0 });
    removeAll(s.units, (u) => ["ashur", "ekallatum"].includes(u.province));
    let army = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "ashur" });
    s.units.push(army);
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "ekallatum" }));
    s.owner.set("ekallatum", "Babylonia");
    s.sieges.push(newSiege({ province: "ashur", power: "Babylonia", unitId: army.id, progress: 0, since: 1 }));
    let envoy = first(s.characters, (c) => c.employer === "Assyria" && c.secretMaster === null);
    envoy.traits.courage = 100;
    return [s, envoy];
  }

  function season(s: GameState, orders: Dict<Power, TurnSubmission>): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
    return e;
  }

  function letter(envoy: Character, gold: number = 0, tablet: TabletProposal | null = null): Dict<Power, TurnSubmission> {
    return subs({
      Assyria: {
        orders: [dispatch(envoy.id, "Egypt", "Send your armies, brother: Ashur is besieged.", { mandate: "Promise anything.", gold: gold, proposal: tablet })],
      },
      // The besieger holds and presses the siege.
      Babylonia: { orders: [hold("ashur"), support("ekallatum", "ashur")] },
    });
  }

  test("An envoy caught leaving is the besieger s captive with its letter gold and tablet", () => {
    let [s, envoy] = besieged(newGameConfig({ siegeCatchMin: 100, siegeCatchMax: 100 }));
    Assert.equal(2, new TurnEngine(s).tightness(s.sieges[0]));
    let babylonGold = s.treasuries.get("Babylonia").gold;
    season(s, letter(envoy, 60, newTabletProposal({ text: "Egypt and Assyria stand together." })));

    Assert.equal(["Captured", "Babylonia", true], [envoy.status, envoy.heldBy, envoy.intercepted]);
    Assert.doesNotContain(s.journeys, (j) => j.characterId === envoy.id && j.kind === "EnvoyOutbound");
    let caught = single(inboxOf(s, "Babylonia"), (i) => i.title === EnvoyCaughtTitle).body;
    Assert.contains(
      `Your troops besieging Ashur caught ${envoy.name}, envoy of Assyria, leaving the city for the court of Egypt. The letter he was to speak: "Send your armies, brother: Ashur is besieged." His mandate: "Promise anything."`,
      caught,
    );
    Assert.contains("He carried 1 mina of gold, which your troops took.", caught);
    Assert.contains("He is your captive: you may execute, ransom or release him.", caught);
    Assert.contains(s.copies, (k) => k.holder === "Babylonia" && single(s.tablets, (t) => t.id === k.tabletId).text === "Egypt and Assyria stand together.");
    Assert.contains(s.treasuries.get("Babylonia").lots, (l) => l.from === "Assyria" && l.face === 60);
    // Its king still sees it on its way, and will hear that it has not returned.
    let seen = single(Views.for(s, "Assyria").court, (c) => c.id === envoy.id);
    Assert.equal("travelling as envoy to Egypt", seen.duty);
    Assert.contains(s.journeys, (j) => j.kind === "Rumor" && j.to === "Assyria" && j.characterId === envoy.id && j.news === "Overdue");
    Assert.contains(s.events, (e) => e.signal === "envoy-caught");
    // The besieger may ransom him, but not turn him.
    Assert.equal(
      `${envoy.name} is an envoy your besiegers caught, not a spy at a post, and cannot be turned. ${envoy.name} remains your captive`,
      OrderValidator.captiveRefusal(s, envoy, "Turn"),
    );
    Assert.null(OrderValidator.captiveRefusal(s, envoy, "Ransom"));
    Assert.true(single(Views.for(s, "Babylonia").known, (c) => c.id === envoy.id).intercepted);
  });

  test("An envoy whose courage the siege outweighs will not leave and nothing is paid", () => {
    let [s, envoy] = besieged(newGameConfig());
    envoy.traits.courage = 39; // below 20 x tightness 2
    let e = new TurnEngine(s);
    e.beginTurn();
    let gold = s.treasuries.get("Assyria").gold;
    e.resolve(letter(envoy, 60));
    Assert.equal(["Employed", "None", "Assyria"], [envoy.status, envoy.duty, envoy.at]);
    Assert.equal(gold, s.treasuries.get("Assyria").gold);
    Assert.equal(
      `${envoy.name} would not leave Ashur while Babylonia's army besieges it: the siege is too tight for ${envoy.name}'s courage this season. No gold was paid.`,
      single(inboxOf(s, "Assyria"), (i) => i.title === "An envoy would not leave").body,
    );
  });

  test("An envoy that slips out goes on and other kings envoys come and go freely", () => {
    let [s, envoy] = besieged(newGameConfig({ siegeCatchMin: 0, siegeCatchMax: 0 }));
    season(s, letter(envoy));
    Assert.equal("EnvoyOutbound", envoy.duty);
    Assert.contains(s.events, (e) => e.signal === "envoy-out");

    // Egypt's envoy to Assyria arrives at besieged Ashur and is received: only the besieged king's own envoys are caught.
    [s] = besieged(newGameConfig({ siegeCatchMin: 100, siegeCatchMax: 100 }));
    s.sieges[0].progress = 0;
    let egyptian = first(s.characters, (c) => c.employer === "Egypt" && c.secretMaster === null);
    season(s, subs({ Egypt: { orders: [dispatch(egyptian.id, "Assyria", "Greetings.")] } }));
    for (let i = 0; i < 4; i++) {
      let e = new TurnEngine(s);
      e.beginTurn();
      if (egyptian.duty !== "EnvoyOutbound") break;
      e.resolve(new Dict<Power, TurnSubmission>());
    }
    Assert.equal(["Employed", "EnvoyAtCourt"], [egyptian.status, egyptian.duty]);
  });

  test("An envoy coming home to a besieged capital may be caught with what it brings", () => {
    let [s, envoy] = besieged(newGameConfig({ siegeCatchMin: 100, siegeCatchMax: 100 }));
    [envoy.duty, envoy.at] = ["EnvoyHomebound", null];
    s.journeys.push(
      newJourney({
        id: newId(s, "j"),
        kind: "EnvoyHomebound",
        departTurn: 0,
        arriveTurn: 1,
        from: "Egypt",
        to: "Assyria",
        characterId: envoy.id,
        cargo: newHomeCargo({ gold: 40, goldStated: 40 }),
      }),
    );
    new TurnEngine(s).beginTurn();
    Assert.equal(["Captured", "Babylonia"], [envoy.status, envoy.heldBy]);
    Assert.contains("coming home to the city", single(inboxOf(s, "Babylonia"), (i) => i.title === EnvoyCaughtTitle).body);
    Assert.contains(s.treasuries.get("Babylonia").lots, (l) => l.face === 40);
  });
});
