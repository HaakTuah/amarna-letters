import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type Power,
  TurnEngine,
  type TurnSubmission,
  command,
  disband,
  enlist,
  govern,
  hold,
  inboxOf,
  mandateOrder,
  move,
  moveCourt,
  relieve,
  newBand,
  newCharacter,
  newGame,
  newGameConfig,
  newId,
  newMandate,
  newStandingRequest,
  newTraits,
  newUnit,
  support,
  unitAt,
  Views,
} from "@amarna/engine";
import { Assert, armiesBefore13, commanded, removeAll, subs, keepWalls } from "./support.ts";

// Build order item 13, "Command at a distance": armies at the sources' sizes, battles with losses and falling back,
// marching by distance, commanders and their mandates, standing orders through commanders, the court wherever the king is
// and orders by courier, governors, the fall province by province, and bands enlisted as soldiers.
describe("CommandAtADistanceTests", () => {
  function season(s: GameState, orders: Dict<Power, TurnSubmission> = new Dict()): TurnEngine {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
    return e;
  }
  const notices = (s: GameState, p: Power, title: string): string[] => inboxOf(s, p).filter((i) => i.title === title).map((i) => i.body);

  test("The armies start at the sizes the armies dossier gives each power", () => {
    const s = newGame(1);
    const men = (p: Power, kind: "Army" | "Fleet"): number => s.units.filter((u) => u.power === p && u.kind === kind).reduce((a, u) => a + u.men, 0);
    // Egypt 15,000 and its garrisons at Gaza and Sumur; Hatti 15,000; Assyria 4,000; Alashiya's 1,500 and 30 ships.
    Assert.equal(15200, men("Egypt", "Army"));
    Assert.equal(15000, men("Hatti", "Army"));
    Assert.equal(4000, men("Assyria", "Army"));
    Assert.equal(1500, men("Alashiya", "Army"));
    Assert.equal(30 * 25, men("Alashiya", "Fleet"));
    // Ugarit's 80 ships in its waters, the largest fleet of the coast; Byblos only pleads, and keeps the low end of its range.
    Assert.equal(2000, Assert.single(s.units, (u) => u.power === "Ugarit" && u.kind === "Fleet").men);
    Assert.equal(200, Assert.single(s.units, (u) => u.power === "Byblos" && u.kind === "Army").men);
  });

  // Seed 1 as before item 13 (full levies, every order reaching at once), no people's resistance, no catastrophes.
  function board(): GameState {
    return armiesBefore13(newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 })));
  }

  test("A battle costs both sides men, and the loser falls back to land of its own", () => {
    const s = board();
    removeAll(s.units, (u) => u.province === "suhu");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "suhu", men: 5000 }));
    s.owner.set("suhu", "Assyria");
    season(
      s,
      subs({
        Assyria: { orders: [move("ekallate", "durkurigalzu"), support("suhu", "ekallate", "durkurigalzu")] },
        Babylonia: { orders: [move("sippar", "nippur")] },
      }),
    );
    // Two against one: a margin of a half, so the loser loses 10 + 4 × 5 = 30 in a hundred (1,500 men) and falls back to
    // land of its own left empty; the winner loses half of that times one over two (375).
    const fell = unitAt(s, "sippar")!;
    Assert.equal(["Babylonia", 3500], [fell.power, fell.men]);
    const won = unitAt(s, "durkurigalzu")!;
    Assert.equal(["Assyria", 4625], [won.power, won.men]);
    Assert.contains("fell back to Sippar, 3500 men strong", notices(s, "Babylonia", "Fell back")[0]);
  });

  test("A unit with nowhere to fall back, or beaten by far, is destroyed", () => {
    const s = board();
    removeAll(s.units, (u) => u.province === "suhu");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "suhu", men: 5000 }));
    s.owner.set("suhu", "Assyria");
    // Dur-Kurigalzu's army is boxed in: Sippar and Nippur hold Babylonia's own armies, Arrapha's and Susa's their own,
    // Suhu and Ekallate the attackers.
    s.units.push(newUnit({ id: newId(s, "u"), power: "Babylonia", kind: "Army", province: "nippur", men: 5000 }));
    season(s, subs({ Assyria: { orders: [move("ekallate", "durkurigalzu"), support("suhu", "ekallate", "durkurigalzu")] } }));
    Assert.equal("Assyria", unitAt(s, "durkurigalzu")?.power);
    Assert.equal(3, s.units.filter((u) => u.power === "Babylonia" && u.kind === "Army").length);
  });

  test("A great army takes two seasons over a long road, a forced march one, and men drop out on it", () => {
    for (const forced of [false, true]) {
      const s = newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }));
      removeAll(s.units, (u) => u.province === "mira" || u.province === "tuwanuwa");
      s.owner.set("mira", "Hatti");
      s.walls.delete("mira");
      s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "tuwanuwa", home: "tuwanuwa", men: 10000 }));
      season(s, subs({ Hatti: { orders: [move("tuwanuwa", "mira", forced)] } }));
      if (forced) {
        Assert.equal(9500, unitAt(s, "mira")?.men);
        continue;
      }
      // 32 days of road for a lone traveller, twice as long for 10,000 men: it is on the road, and holds where it stands.
      const u = unitAt(s, "tuwanuwa")!;
      Assert.equal("mira", u.march);
      Assert.contains("is on the road to Mira", notices(s, "Hatti", "On the march")[0]);
      season(s, subs({ Hatti: { orders: [move("tuwanuwa", "mira")] } }));
      Assert.equal(["Hatti", 10000], [unitAt(s, "mira")?.power, unitAt(s, "mira")?.men]);
    }
  });

  test("A skilled commander's army beats an equal one his men alone could only bounce off", () => {
    for (const competence of [50, 100]) {
      const s = board();
      commanded(s, "Assyria");
      for (const c of s.characters.filter((c) => c.grantedBy === "Assyria")) c.traits.competence = competence;
      season(s, subs({ Assyria: { orders: [move("ekallate", "durkurigalzu")] } }));
      Assert.equal(competence === 100 ? "Assyria" : "Babylonia", unitAt(s, "durkurigalzu")?.power, undefined);
    }
  });

  test("A standing order fires for a unit only where its commander or its king stands with it", () => {
    for (const withCommander of [false, true]) {
      const s = board();
      if (withCommander) commanded(s, "Babylonia");
      // Sippar's army is to support Dur-Kurigalzu's when it is attacked; Babylon's king is in Babylon, not with either.
      season(s, subs({ Babylonia: { standing: [newStandingRequest({ when: "UnitAttacked", province: "durkurigalzu", orders: [support("sippar", "durkurigalzu")] })] } }));
      removeAll(s.units, (u) => u.province === "suhu");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Assyria", kind: "Army", province: "suhu", men: 5000 }));
      s.owner.set("suhu", "Assyria");
      season(s, subs({ Assyria: { orders: [move("ekallate", "durkurigalzu"), support("suhu", "ekallate", "durkurigalzu")] } }));
      Assert.equal(withCommander ? "Babylonia" : "Assyria", unitAt(s, "durkurigalzu")?.power);
    }
  });

  test("A commander granted at court reaches his army a season later, and a mandate leads it when no order comes", () => {
    const s = board();
    const c = s.characters.find((x) => x.employer === "Babylonia" && x.at === "Babylonia")!;
    season(s, subs({ Babylonia: { orders: [command("sippar", c.id), mandateOrder("sippar", newMandate({ task: "hold" }))] } }));
    const u = unitAt(s, "sippar")!;
    Assert.equal([c.id, 2], [u.commander, u.commandFrom]);
    Assert.equal("Commanding", c.duty);
    Assert.equal("Babylonia", c.grantedBy);
    // The king sees who commands it, and its mandate.
    const v = Views.for(s, "Babylonia").units.find((x) => x.province === "sippar")!;
    Assert.equal([c.id, "hold"], [v.commander, v.mandate?.task]);
  });

  test("A grant is never revoked at a distance at once, and a mandate needs a commander to carry it", () => {
    const s = board();
    const [c, d] = s.characters.filter((x) => x.employer === "Babylonia" && x.at === "Babylonia");
    // No commander, no mandate: the order is refused.
    season(s, subs({ Babylonia: { orders: [mandateOrder("sippar", newMandate({ task: "hold" }))] } }));
    Assert.null(unitAt(s, "sippar")!.mandate);
    season(s, subs({ Babylonia: { orders: [command("sippar", c.id)] } }));
    season(s, subs({ Babylonia: { orders: [relieve("sippar")] } }));
    const u = unitAt(s, "sippar")!;
    // Word of the recall is three seasons on the road (as to an army far off): until it reaches him nobody else may be
    // granted the army, and he keeps it.
    u.relieveAt = s.turn + 3;
    season(s, subs({ Babylonia: { orders: [command("sippar", d.id)] } }));
    Assert.equal(c.id, u.commander);
    Assert.notEqual("Commanding", d.duty);
  });

  test("An order for a place beyond a season's courier goes out now and is carried out when it arrives", () => {
    const s = newGame(1, newGameConfig({ peopleDefence: 0, catastropheChance: 0 }));
    // An Egyptian army in Ekallate, beyond what a courier from Akhetaten makes in a season.
    removeAll(s.units, (u) => u.province === "ekallate");
    s.owner.set("ekallate", "Egypt");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: "ekallate", home: "ekallate", men: 1000 }));
    season(s, subs({ Egypt: { orders: [disband("ekallate")] } }));
    Assert.equal("Egypt", unitAt(s, "ekallate")?.power);
    Assert.single(s.couriers);
    Assert.contains("ekallate", notices(s, "Egypt", "Orders on the road")[0]);
    Assert.doesNotContain(Views.for(s, "Egypt").visible, (x) => x === "ekallate");
    season(s);
    Assert.null(unitAt(s, "ekallate"));
    Assert.empty(s.couriers);
  });

  test("The king moves his court, is taken where he stands, and the kingdom comes apart", () => {
    const s = board();
    commanded(s, "Babylonia");
    s.walls.delete("durkurigalzu");
    keepWalls(s);
    removeAll(s.units, (u) => u.province === "durkurigalzu");
    season(s, subs({ Babylonia: { orders: [moveCourt("durkurigalzu")] } }));
    // He sets out this season and is there the next.
    Assert.single(s.kingRoads);
    season(s);
    Assert.equal("durkurigalzu", s.court.get("Babylonia"));
    Assert.empty(s.kingRoads);
    Assert.equal("durkurigalzu", Views.for(s, "Babylonia").courtAt);
    // Assyria takes Dur-Kurigalzu, where the king is: Babylonia falls, though Babylon is still its own.
    season(s, subs({ Assyria: { orders: [move("ekallate", "durkurigalzu")] } }));
    // Item 17++: the city, its people indifferent to their king for the test, answers to Assyria as the next season begins.
    s.ledger.set("durkurigalzu", new Dict());
    season(s);
    Assert.contains("Babylonia", s.eliminated);
    Assert.equal("Assyria", s.owner.get("durkurigalzu"));
    // The rest falls lawless, and the commanded armies are their commanders' bands, once word of the fall reaches them.
    Assert.equal("Babylonia", s.owner.get("babylon"));
    season(s);
    Assert.null(s.owner.get("babylon"));
    Assert.doesNotContain(s.units, (u) => u.power === "Babylonia");
    Assert.true(s.bands.some((b) => b.province === "babylon"));
  });

  test("A governor raises a levy on his own when foreign troops stand beside his province", () => {
    const s = board();
    removeAll(s.units, (u) => u.province === "nippur");
    // Nippur without Enlil-kidinni, who governs it from the start (item 17++).
    removeAll(s.governors, (g) => g.province === "nippur");
    s.units.push(newUnit({ id: newId(s, "u"), power: "Elam", kind: "Army", province: "susa", men: 2000 }));
    const c = s.characters.find((x) => x.employer === "Babylonia" && x.at === "Babylonia")!;
    season(s, subs({ Babylonia: { orders: [govern("nippur", c.id, 1)] } }));
    Assert.equal("Governing", c.duty);
    Assert.null(unitAt(s, "nippur"));
    season(s);
    Assert.equal("Babylonia", unitAt(s, "nippur")?.power);
    Assert.contains("raised a levy there on his own", notices(s, "Babylonia", "A governor's levy")[0]);
  });

  test("A band enlisted where an army stands with it joins that army for its term", () => {
    const s = board();
    commanded(s, "Babylonia");
    const chief = newCharacter({ id: newId(s, "c"), name: "Chief", traits: newTraits({ greed: 0 }), status: "Free", duty: "Leading", watchProvince: "sippar" });
    s.characters.push(chief);
    // The band stands with the army as the king gives his orders (after the bands' own season).
    const e = new TurnEngine(s);
    e.beginTurn();
    s.bands.push(newBand({ id: newId(s, "b"), leaderId: chief.id, province: "sippar", men: 200 }));
    e.resolve(subs({ Babylonia: { orders: [hold("sippar"), enlist("sippar", 100, 2)] } }));
    Assert.empty(notices(s, "Babylonia", "Orders that could not be carried out"));
    Assert.empty(notices(s, "Babylonia", "Offer refused"));
    const u = unitAt(s, "sippar")!;
    Assert.equal([5200, 200, chief.id], [u.men, u.hiredMen, u.hiredChief]);
    Assert.empty(s.bands);
    // Its term over, the band leaves the army again.
    season(s);
    season(s);
    season(s);
    Assert.equal(5000, unitAt(s, "sippar")?.men);
    Assert.contains(s.bands, (b) => b.leaderId === chief.id && b.men === 200);
  });
});
