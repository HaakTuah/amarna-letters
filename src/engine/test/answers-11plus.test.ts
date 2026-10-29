import { describe, test } from "vitest";
import {
  Dict,
  OrderValidator,
  type GameState,
  type Power,
  type TurnSubmission,
  TurnEngine,
  StartWalls,
  WorldMap,
  cede,
  clause,
  inboxOf,
  newGame,
  newGameConfig,
  newTablet,
  newTurnSubmission,
  vassalBonds,
} from "@amarna/engine";
import { Assert } from "./support.ts";

// Build order item 11d: Haakon's answers to item 11+'s review.
describe("The answers to item 11+", () => {
  const game = (): GameState => newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }));
  const season = (s: GameState, subs: Dict<Power, TurnSubmission>): void => {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(subs);
  };
  const orders = (p: Power, ...o: TurnSubmission["orders"]): Dict<Power, TurnSubmission> => new Dict([[p, newTurnSubmission({ orders: o })]]);
  const sealedCession = (s: GameState, giver: Power, receiver: Power, province: string): void => {
    s.tablets.push(
      newTablet({ id: "t990", text: "I give you my city.", proposedBy: giver, partner: receiver, seals: [giver, receiver], createdTurn: 1, sealedTurn: 1, clauses: [clause("cede", { province })] }),
    );
  };

  test("The chiefs' lands start without walls, and each city-state's walls are the walls dossier's", () => {
    for (const id of ["kaska", "lukka", "steppe"]) Assert.equal(0, StartWalls.get(id) ?? 0);
    Assert.equal(3, StartWalls.get("qatna"));
    Assert.equal(3, StartWalls.get("qadesh"));
    Assert.equal(2, StartWalls.get("byblos"));
    Assert.equal(1, StartWalls.get("megiddo"));
    // Since item 15 the Great Kings' capitals too: Akhetaten had no wall.
    Assert.equal(0, StartWalls.get("akhetaten") ?? 0);
  });

  test("Terqa, Mira and Seha start as vassal city-states of Mitanni and Arzawa, under rulers of their own", () => {
    const s = game();
    const bonds = vassalBonds(s.tablets);
    for (const [vassal, overlord, city] of [["Terqa", "Mitanni", "terqa"], ["Mira", "Arzawa", "mira"], ["Seha", "Arzawa", "seha"]] as const) {
      Assert.equal(vassal, s.owner.get(city));
      Assert.equal(city, WorldMap.default.capital(vassal).id);
      Assert.equal(overlord, bonds.find((b) => b.vassal === vassal)!.overlord);
    }
  });

  test("A capital is ceded only by agreement on a sealed tablet", () => {
    const s = game();
    const v = new OrderValidator(s).validate("Byblos", newTurnSubmission({ orders: [cede("byblos", "Egypt")] }));
    Assert.contains("sealed tablet", Assert.single(v.rejected).reason);
    sealedCession(s, "Byblos", "Egypt", "byblos");
    Assert.single(new OrderValidator(s).validate("Byblos", newTurnSubmission({ orders: [cede("byblos", "Egypt")] })).accepted);
    // A tablet giving another city, or sealed with someone else, is no agreement for this one.
    Assert.single(new OrderValidator(s).validate("Byblos", newTurnSubmission({ orders: [cede("byblos", "Hatti")] })).rejected);
    const other = game();
    sealedCession(other, "Byblos", "Egypt", "sidon");
    Assert.single(new OrderValidator(other).validate("Byblos", newTurnSubmission({ orders: [cede("byblos", "Egypt")] })).rejected);
  });

  test("A king who cedes his own capital in a season receives none that season, whatever the order of reckoning", () => {
    const s = game();
    sealedCession(s, "Byblos", "Sidon", "byblos");
    s.tablets.push(newTablet({ id: "t991", text: "I give you my city.", proposedBy: "Sidon", partner: "Egypt", seals: ["Sidon", "Egypt"], createdTurn: 1, sealedTurn: 1, clauses: [clause("cede", { province: "sidon" })] }));
    season(s, new Dict([["Byblos", newTurnSubmission({ orders: [cede("byblos", "Sidon")] })], ["Sidon", newTurnSubmission({ orders: [cede("sidon", "Egypt")] })]]));
    Assert.equal("Egypt", s.owner.get("sidon"));
    Assert.equal("Byblos", s.owner.get("byblos"));
    Assert.doesNotContain("Byblos", s.eliminated);
  });

  test("A ruler who cedes his capital loses his realm whole and lives on as a free character at his old city", () => {
    const s = game();
    sealedCession(s, "Byblos", "Egypt", "byblos");
    const before = s.characters.length;
    season(s, orders("Byblos", cede("byblos", "Egypt")));
    Assert.contains("Byblos", s.eliminated);
    Assert.equal("Egypt", s.owner.get("byblos"));
    // Land ceded by agreement is not land taken by force: nothing new to absorb.
    Assert.false(s.conquered.has("byblos"));
    Assert.equal("Egypt", s.falls.find((f) => f.power === "Byblos")!.conqueror);
    Assert.equal(before + 1, s.characters.length);
    const ruler = s.characters.find((c) => c.name.startsWith("Rib-Hadda"))!;
    Assert.equal("Free", ruler.status);
    Assert.null(ruler.employer);
    Assert.equal("Byblos", ruler.at);
    Assert.contains(inboxOf(s, "Egypt"), (i) => i.body.includes("has ceded Byblos to you"));
  });
});
