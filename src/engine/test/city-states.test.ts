import { describe, test } from "vitest";
import {
  AllPowers,
  Dict,
  GreatKings,
  StartVassals,
  StateOfRealmTitle,
  TurnEngine,
  Views,
  WorldMap,
  dispatch,
  isGreatKing,
  newGame,
  newTabletProposal,
  newTurnSubmission,
  parOf,
  standingOf,
  clause,
  vassalBonds,
  vassalTerms,
} from "@amarna/engine";
import { Assert } from "./support.ts";

const Map = WorldMap.default;

describe("City-states as powers (item 11+)", () => {
  test("Every city-state is a power holding its city as its capital, under the same rules", () => {
    const s = newGame(1);
    Assert.equal(30, AllPowers.length);
    Assert.equal(7, GreatKings.length);
    for (const p of AllPowers.filter((x) => !isGreatKing(x))) {
      const cap = Map.capital(p);
      Assert.equal(p, s.owner.get(cap.id));
      Assert.true(s.units.some((u) => u.power === p && u.province === cap.id));
      Assert.true(s.treasuries.get(p).gold > 0);
      Assert.true(s.startStrength.get(p) > 0);
      // A city's walls are a capital's; the lands without a town have none.
      Assert.equal(cap.kingless ? 0 : 3, s.walls.getOrDefault(cap.id, 0));
    }
    // Egypt's garrison towns are its own land; no land province starts without a holder.
    Assert.equal("Egypt", s.owner.get("gaza"));
    Assert.equal("Egypt", s.owner.get("sumur"));
    Assert.true(Map.landProvinces.every((x) => s.owner.get(x.id) !== null));
  });

  test("A Great King starts with more servants than a city-state", () => {
    const s = newGame(2);
    for (const p of AllPowers) Assert.equal(isGreatKing(p) ? 2 : 1, s.characters.filter((c) => c.employer === p).length);
    Assert.equal(100, s.characters.length);
  });

  test("Cities start in the relation they had: sealed vassal tablets with their overlords, in the template's clauses", () => {
    const s = newGame(1);
    const bonds = vassalBonds(s.tablets);
    Assert.equal(StartVassals.length, bonds.length);
    const byblos = bonds.find((b) => b.vassal === "Byblos")!;
    Assert.equal("Egypt", byblos.overlord);
    Assert.equal(15, byblos.tribute);
    Assert.true(byblos.protects && byblos.serves);
    const t = s.tablets.find((x) => x.id === byblos.tabletId)!;
    // A copy in each archive: both courts read it.
    for (const holder of ["Byblos", "Egypt"] as const) Assert.true(s.copies.some((k) => k.tabletId === t.id && k.holder === holder));
    Assert.true(Views.for(s, "Byblos").tablets.some((x) => x.tabletId === t.id && x.vassal === "Byblos"));
    // Arwad and the chiefs serve nobody.
    for (const free of ["Arwad", "Isuwa", "Elam", "Kaska", "Lukka", "Suteans"] as const) Assert.false(bonds.some((b) => b.vassal === free));
  });

  test("A vassal tablet is read from the side of whoever proposed it", () => {
    // Written by the overlord: what he asks is the vassal's to give.
    const terms = vassalTerms({
      id: "t1",
      vassal: "Tyre",
      proposedBy: "Egypt",
      partner: "Tyre",
      clauses: [clause("askTribute", { amount: 20 }), clause("protect"), clause("askServe")],
      sealedTurn: 4,
    })!;
    Assert.equal("Egypt", terms.overlord);
    Assert.equal(20, terms.tribute);
    Assert.true(terms.protects && terms.serves);
    // Not marked: no bond, whatever its clauses say.
    Assert.null(vassalTerms({ id: "t2", vassal: null, proposedBy: "Egypt", partner: "Tyre", clauses: [clause("askTribute", { amount: 20 })], sealedTurn: 4 }));
  });

  test("The vassal mark names one of the two kings or nothing", () => {
    const s = newGame(3);
    const e = new TurnEngine(s);
    const envoy = s.characters.find((c) => c.employer === "Tyre")!;
    e.resolve(
      new Dict([
        [
          "Tyre",
          newTurnSubmission({
            orders: [dispatch(envoy.id, "Egypt", "Greetings.", { proposal: newTabletProposal({ text: "", vassal: "Hatti", clauses: [clause("serve")] }) })],
          }),
        ],
      ]),
    );
    const t = s.tablets.find((x) => x.proposedBy === "Tyre" && x.createdTurn === 1);
    Assert.notNull(t);
    Assert.null(t!.vassal);
  });

  test("Each court gets the state of its realm at the start: plain facts, no goal", () => {
    const s = newGame(1);
    for (const p of AllPowers) {
      const note = s.inbox.get(p).find((i) => i.title === StateOfRealmTitle);
      Assert.notNull(note);
      Assert.contains(`Of the ${AllPowers.length} powers`, note!.body);
    }
    const byblos = s.inbox.get("Byblos").find((i) => i.title === StateOfRealmTitle)!.body;
    Assert.contains("Egypt's vassal by a sealed tablet", byblos);
    Assert.contains("Its roads lead into the land of", byblos);
  });

  test("The winner is judged by growth against par for its starting position", () => {
    // A position with no measure has par 1; standing is growth over par.
    for (const p of AllPowers) Assert.true(parOf(p) >= 0.1);
    Assert.equal(1.5 / parOf("Byblos"), standingOf("Byblos", 1.5));
  });
});
