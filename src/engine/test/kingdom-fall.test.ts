import { describe, test } from "vitest";
import { orders } from "../../llm/src/parse.ts";
import {
  Dict,
  type GameState,
  KingdomFallsTitle,
  OrderValidator,
  type Power,
  TurnEngine,
  Views,
  type TurnSubmission,
  WorldMap,
  EconomyData,
  cede,
  first,
  inboxOf,
  land,
  move,
  newGame,
  newGameConfig,
  newId,
  newSiege,
  newTurnSubmission,
  newUnit,
  raise,
  single,
  support,
  unitAt,
  wallsOf,
} from "@amarna/engine";
import { removeAll, Assert, subs, oldWorld } from "./support.ts";

// A kingdom falls with its capital (the design document's rule, built with the siege package, Build order item 5): its orders
// lapse for the rest of the season. Since item 13 its realm comes apart: the capital and the land where the taker's troops
// stand are his, the rest falls lawless, and its troops are their commanders' or disband.
describe("KingdomFallTests", () => {
  function season(s: GameState, orders: Dict<Power, TurnSubmission>): void {
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
  }

  test("A capital stormed brings down its kingdom and the rest of its land falls lawless", () => {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 })));
    // Apasa's walls thrown down to level 1, its troops gone; Hatti's armies in Lukka and Mira.
    s.walls.set("apasa", 1);
    removeAll(s.units, (u) => u.power === "Arzawa");
    s.owner.set("mira", "Hatti");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "lukka" }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "mira" }));
    season(
      s,
      subs({
        Hatti: { orders: [move("lukka", "apasa"), support("mira", "lukka", "apasa")] },
        // The levy comes after the fall: it is not raised, and nothing is paid.
        Arzawa: { orders: [raise("seha", "Army")] },
      }),
    );

    Assert.contains("Arzawa", s.eliminated);
    Assert.equal("Hatti", s.owner.get("apasa"));
    // Item 13: no troop of Hatti's stands in Seha, nor a governor of Arzawa's: it falls lawless.
    Assert.null(s.owner.get("seha"));
    Assert.doesNotContain(s.units, (u) => u.power === "Arzawa");
    Assert.null(unitAt(s, "seha"));
    Assert.doesNotContain(inboxOf(s, "Arzawa"), (i) => i.title === "Levy raised" || i.title === "Not enough gold");
    let fall = Assert.single(s.falls);
    Assert.equal(["Arzawa", "Hatti", "apasa", 1], [fall.power, fall.conqueror!, fall.capital, fall.turn]);
    Assert.equal([], fall.land);
    Assert.equal(
      "With Apasa you took the kingdom of Arzawa: its king has fallen, his armies are their own commanders' or have disbanded, and none of his other land is yours; the rest, Seha River Land, has fallen lawless, held by nobody.",
      single(inboxOf(s, "Hatti"), (i) => i.title === KingdomFallsTitle).body,
    );
    // Word of the fall travels (item 7b): Egypt, far away, hears it when the word arrives, and sees Arzawa fallen then.
    Assert.doesNotContain(inboxOf(s, "Egypt"), (i) => i.title === "A kingdom falls");
    Assert.doesNotContain(Views.for(s, "Egypt").fallen, (p) => p === "Arzawa");
    let word = single(s.journeys, (j) => j.kind === "Word" && j.to === "Egypt");
    while (s.turn < word.arriveTurn) season(s, subs({}));
    new TurnEngine(s).beginTurn();
    Assert.contains("Hatti took its capital, Apasa", single(inboxOf(s, "Egypt"), (i) => i.title === "A kingdom falls").body);
    Assert.contains(Views.for(s, "Egypt").fallen, (p) => p === "Arzawa");
    Assert.contains(
      s.events,
      (e) => e.kind === "fall" && e.text === "The kingdom of Arzawa has fallen: Hatti took its capital, Apasa, and Hatti holds it; the rest has fallen lawless.",
    );
  });

  test("A capital that surrenders to a siege brings down its kingdom", () => {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 })));
    removeAll(s.units, (u) => u.province === "ashur");
    let besieger = newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "ashur" });
    s.units.push(besieger);
    s.sieges.push(newSiege({ province: "ashur", power: "Babylonia", unitId: besieger.id, progress: 3 * EconomyData.breachPerLevel - 1, since: 1 }));
    season(s, new Dict());
    Assert.contains("Assyria", s.eliminated);
    // Item 13: the capital is Babylonia's; the rest of Assyria, with no Babylonian troops, falls lawless.
    Assert.equal("Babylonia", s.owner.get("ashur"));
    Assert.all(WorldMap.default.homeOf("Assyria").filter((p) => p.id !== "ashur"), (p) => Assert.null(s.owner.get(p.id)));
    Assert.equal(2, wallsOf(s, "ashur"));
    Assert.empty(s.sieges);
    Assert.equal("Babylonia", Assert.single(s.falls).conqueror);
  });

  // <summary>Seed 1, no catastrophes: each pair's army stands in the other's capital, one season from its surrender.</summary>
  function sieges(...sieges: [Power, Power][]): GameState {
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 })));
    for (const [by, of] of sieges) {
      let capital = WorldMap.default.capital(of).id;
      removeAll(s.units, (u) => u.province === capital);
      let army = newUnit({ id: newId(s, "u"), power: by, kind: "Army", province: capital });
      s.units.push(army);
      s.sieges.push(newSiege({ province: capital, power: by, unitId: army.id, progress: wallsOf(s, capital) * EconomyData.breachPerLevel - 1, since: 1 }));
    }
    return s;
  }

  // Babylonia takes Ashur while Assyria takes Washukanni: Mitanni is reckoned before Assyria.
  // Babylonia takes Washukanni while Mitanni takes Ashur: Mitanni is reckoned before Assyria.
  test.each([
    ["Babylonia", "Assyria", "Mitanni"],
    ["Babylonia", "Mitanni", "Assyria"],
  ] as const)("A kingdom whose taker falls in the same season passes on with his land in any order %s", (first: Power, second: Power, third: Power) => {
    let s = sieges([first, second], [second, third]);
    season(s, new Dict());
    Assert.contains(second, s.eliminated);
    Assert.contains(third, s.eliminated);
    Assert.doesNotContain(first, s.eliminated);
    // Item 13: both capitals pass down the chain to the first, the rest of both kingdoms falls lawless.
    for (const p of [second, third]) Assert.equal(first, s.owner.get(WorldMap.default.capital(p).id));
    Assert.all(
      WorldMap.default.homeOf(second).concat(WorldMap.default.homeOf(third)).filter((p) => !p.capital),
      (p) => Assert.null(s.owner.get(p.id)),
    );
    Assert.equal(first, single(s.falls, (f) => f.power === third).conqueror);
    Assert.contains(
      s.events,
      (e) =>
        e.kind === "fall" &&
        e.text ===
          `The kingdom of ${land(third)} has fallen: ${second} took its capital, ${WorldMap.default.capital(third).name}, and ${first} holds it; the rest has fallen lawless.`,
    );
    Assert.contains(
      inboxOf(s, first),
      (i) =>
        i.title === KingdomFallsTitle &&
        i.body.startsWith(
          `${second} took ${WorldMap.default.capital(third).name}, the capital of ${land(third)}, but fell himself in the same season, and the kingdom of ${land(third)} passes to you with his`,
        ),
    );
  });

  test("Kings who take each other s capitals in one season leave their land free", () => {
    let s = sieges(["Assyria", "Mitanni"], ["Mitanni", "Assyria"]);
    season(s, new Dict());
    Assert.contains("Assyria", s.eliminated);
    Assert.contains("Mitanni", s.eliminated);
    Assert.all(WorldMap.default.homeOf("Mitanni").concat(WorldMap.default.homeOf("Assyria")), (p) => Assert.null(s.owner.get(p.id)));
    Assert.all(s.falls, (f) => Assert.null(f.conqueror));
  });

  test("A king cannot cede his own capital without a sealed tablet that gives it", () => {
    // Item 11d: by agreement on a sealed tablet only (answers-11plus.test.ts).
    let s = oldWorld(newGame(1, newGameConfig({ peopleDefence: 0 })));
    let v = new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: [cede("akhetaten", "Hatti"), cede("thebes", "Hatti")] }));
    Assert.contains("only as a sealed tablet", Assert.single(v.rejected).reason);
    Assert.single(v.accepted);
  });
});
