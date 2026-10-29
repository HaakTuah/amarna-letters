import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type Power,
  TurnEngine,
  type TurnSubmission,
  WorldMap,
  ClimatePace,
  LandData,
  reapSeasonOf,
  OrderValidator,
  harvestOf,
  legPoints,
  menOf,
  disband,
  feed,
  move,
  newGame,
  newGameConfig,
  newId,
  newTurnSubmission,
  newUnit,
  raise,
  reckonedOf,
  resistanceOf,
  startPeople,
  support,
  tax,
  unitAt,
} from "@amarna/engine";
import { Assert, subs, oldWorld } from "./support.ts";

// People at home (build order item 10+a): the three groups, the harvest by the hands on the land, levies, the tax and
// the hunger that answers it, discharged men, droughts and floods, the people's resistance and the pace of the season.
describe("PeopleTests", () => {
  const Map = WorldMap.default;
  const quiet = (): GameState => oldWorld(newGame(1, newGameConfig({ catastropheChance: 0 })));

  function season(s: GameState, orders: Dict<Power, TurnSubmission> | null = null): TurnEngine {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders ?? new Dict());
    return e;
  }

  test("The people start as the people dossier counts them, and every province at its old yield", () => {
    const start = startPeople(Map);
    const egypt = ["delta", "memphis", "akhetaten", "thebes", "sinai"].reduce((a, id) => a + start.get(id)!.settled + start.get(id)!.loose, 0);
    Assert.inRange(egypt, 2_990_000, 3_000_000);
    // Arid land is a tenth as thickly peopled: the Sinai holds far fewer than the Delta.
    Assert.true(start.get("sinai")!.settled * 20 < start.get("delta")!.settled);
    // The Levant's Habiru: a tenth of Megiddo's people are loose; a fiftieth of the Delta's.
    Assert.equal(Math.floor((start.get("megiddo")!.settled + start.get("megiddo")!.loose) / 10), start.get("megiddo")!.loose, 1);
    const s = quiet();
    const e = new TurnEngine(s);
    for (const p of Map.landProvinces) Assert.equal(harvestOf(p), e.harvestNow(p.id), 0);
    // The starting armies' men came from their homes.
    Assert.equal(start.get("hattusa")!.men - LandData.armyMen, s.people.get("hattusa").men);
    Assert.equal(LandData.armyMen, s.units.find((u) => u.province === "hattusa")!.men);
  });

  test("A levy takes men from the fields, and costs the harvest more at sowing and harvest than in the slack season", () => {
    const loss = (turn: number): number => {
      const s = quiet();
      s.turn = turn;
      const e = new TurnEngine(s);
      const before = e.harvestNow("sapinuwa");
      Assert.true(e.levyMen("sapinuwa", LandData.armyMen));
      return before - e.harvestNow("sapinuwa");
    };
    // Turn 2 is Peret, sown everywhere but the Anatolian plateau, which reaps and sows in Akhet (turn 1).
    Assert.true(loss(1) > loss(2), `${loss(1)} against ${loss(2)}`);
    Assert.true(loss(2) > 0);
    // A province with too few men raises nothing (fewer than a levy's least, item 11a+): the order is refused, saying why.
    const s = quiet();
    s.people.get("nesa").men = LandData.levyLeast - 1;
    const v = new OrderValidator(s, Map).validate("Hatti", newTurnSubmission({ orders: [raise("sapinuwa", "Army"), raise("tuwanuwa", "Army")] }));
    Assert.equal(2, v.accepted.length);
    const r = new OrderValidator(s, Map).validate("Hatti", newTurnSubmission({ orders: [move("nesa", "kizzuwatna"), raise("nesa", "Army")] }));
    Assert.contains(r.rejected, (x) => x.reason.includes("too few men of fighting age"));
  });

  test("A heavy tax empties the farmers' granaries, and the hungry leave the land in the season it bites", () => {
    const s = quiet();
    season(s, subs({ Hatti: { orders: [tax(70, "nesa")] } }));
    Assert.equal(70, s.taxes.get("nesa"));
    // The granaries carry them for a while (item 11a+: the harvest comes once a year); before the year is out they run dry.
    let bit = false;
    for (let k = 0; k < 6 && !bit; k++) {
      const before = s.people.get("nesa").settled;
      const loose = s.people.get("nesa").loose;
      new TurnEngine(s).beginTurn();
      if ((s.fed.tryGet("nesa") ?? 1000) < 1000) {
        bit = true;
        Assert.true(s.people.get("nesa").settled < before);
        Assert.true(s.people.get("nesa").loose > loose);
      } else new TurnEngine(s).resolve(new Dict());
    }
    Assert.true(bit);
    // Its neighbours at the default tax ate their fill.
    Assert.false(s.fed.has("hattusa"));
    // A province changing hands keeps no tax of its old holder's.
    new TurnEngine(s).setOwner("nesa", "Mitanni");
    Assert.false(s.taxes.has("nesa"));
  });

  test("Grain handed to a town's market feeds its countryside in a famine", () => {
    const hungry = (fed: boolean): number => {
      const s = quiet();
      season(s, subs({ Hatti: { orders: [tax(70, "nesa"), ...(fed ? [feed("nesa", s.stores.getOrDefault("nesa", 0))] : [])] } }));
      // Their granaries empty (item 11a+): they eat what the market holds.
      s.granary.set("nesa", 0);
      new TurnEngine(s).beginTurn();
      return s.fed.getOrDefault("nesa", 1000);
    };
    Assert.true(hungry(true) > hungry(false));
  });

  test("The harvest comes in each land's own season into the farmers' granaries, and the tax is taken from them (item 11a+)", () => {
    const s = quiet();
    // The plateau reaps in Akhet, Egypt and the rain-fed south in Shemu.
    Assert.equal(0, reapSeasonOf("nesa"));
    Assert.equal(2, reapSeasonOf("memphis"));
    const crop = s.crop.get("memphis");
    const granary = s.granary.get("memphis");
    new TurnEngine(s).beginTurn(); // Akhet: Memphis grows, Nesa reaps.
    Assert.true(s.crop.get("memphis") > crop);
    Assert.equal(0, s.crop.get("nesa"));
    Assert.true(s.events.some((x) => x.signal === "harvest-reaped" && x.text.includes("Nesa")));
    Assert.true(s.granary.get("nesa") > s.reaped.get("nesa") / 2);
    Assert.false(s.events.some((x) => x.signal === "harvest-reaped" && x.text.includes("Memphis")));
    // The tax came out of Memphis's granary, and its farmers ate from it.
    Assert.true(s.granary.get("memphis") < granary);
  });

  test("Discharged men walk home, or settle where they stand as colonists", () => {
    // The same seasons with and without the army disbanded: Hatti's settled differ by its men once they are home.
    const hatti = (g: GameState): number => [...g.owner.entries()].filter(([, o]) => o === "Hatti").reduce((a, [k]) => a + g.people.get(k).settled, 0);
    const s = quiet();
    const control = quiet();
    for (const g of [s, control]) g.units.find((u) => u.province === "nesa")!.province = "tuwanuwa";
    season(s, subs({ Hatti: { orders: [disband("tuwanuwa")] } }));
    season(control);
    Assert.null(unitAt(s, "tuwanuwa"));
    Assert.single(s.walking, (w) => w.home === "nesa" && w.men === LandData.armyMen);
    // Walking, they are no one's settled yet.
    Assert.inRange(hatti(s), hatti(control) - 2000, hatti(control) + 2000);
    while (s.walking.length > 0) {
      season(s);
      season(control);
    }
    Assert.inRange(hatti(s), hatti(control) + LandData.armyMen - 2000, hatti(control) + LandData.armyMen + 2000);

    // Settled where it stands, in land of its own king's.
    const t = quiet();
    t.units.find((u) => u.province === "nesa")!.province = "tuwanuwa";
    const e = new TurnEngine(t);
    e.beginTurn();
    const settled = t.people.get("tuwanuwa").settled;
    e.resolve(subs({ Hatti: { orders: [disband("tuwanuwa", true)] } }));
    Assert.empty(t.walking);
    Assert.true(t.people.get("tuwanuwa").settled >= settled + LandData.armyMen);
    // Only in a province of one's own.
    t.units.push(newUnit({ id: newId(t, "u"), power: "Hatti", kind: "Army", province: "isuwa", men: LandData.armyMen }));
    const v = new OrderValidator(t, Map).validate("Hatti", newTurnSubmission({ orders: [disband("isuwa", true)] }));
    Assert.contains(v.rejected, (x) => x.reason.includes("only in a province of your own"));
  });

  test("Far from home some discharged men never arrive and stay loose where they stood", () => {
    const s = quiet();
    const army = s.units.find((u) => u.province === "nesa")!;
    army.province = "gaza";
    s.owner.set("gaza", "Hatti");
    const loose = s.people.get("gaza").loose;
    season(s, subs({ Hatti: { orders: [disband("gaza")] } }));
    Assert.true(s.people.get("gaza").loose > loose);
    Assert.true(s.walking[0].men < LandData.armyMen);
  });

  test("The people of a land resist an army that enters it where no troop stands", () => {
    // By their number, as a unit's men count (item 11e: a full army's men count one, in thousandths); rough ground counts
    // the men twice, open plain half.
    Assert.equal(1000, resistanceOf("isuwa", 2500, 100));
    Assert.equal(900, resistanceOf("suhu", 9000, 100));
    Assert.equal(1000, resistanceOf("suhu", 10000, 100));
    Assert.equal(6000, resistanceOf("delta", 60000, 100));
    Assert.equal(3000, resistanceOf("delta", 60000, 50));
    const s = quiet();
    // Samuha in the open, without its walls, where its men meet the army in the field.
    s.walls.delete("samuha");
    s.people.get("samuha").men = 15000;
    s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "isuwa", men: LandData.armyMen }));
    const e = new TurnEngine(s);
    Assert.equal(1500, e.resistance("samuha", "Mitanni"));
    Assert.equal(0, e.resistance("samuha", "Hatti"));
    season(s, subs({ Mitanni: { orders: [move("isuwa", "samuha")] } }));
    Assert.equal("Hatti", s.owner.get("samuha"));
    Assert.contains(s.events, (x) => x.signal === "resisted");
    // With support it gets in.
    s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "kaska", men: LandData.armyMen }));
    season(s, subs({ Mitanni: { orders: [move("isuwa", "samuha"), support("kaska", "isuwa", "samuha")] } }));
    Assert.equal("Mitanni", s.owner.get("samuha"));
    // Off at the table's choice.
    const off = oldWorld(newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 })));
    Assert.equal(0, new TurnEngine(off).resistance("samuha", "Mitanni"));
  });

  test("A destroyed unit's men die or run, loose where it fell", () => {
    const s = quiet();
    s.units.push(newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: "isuwa", men: LandData.armyMen }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "samuha", men: LandData.armyMen }));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "harran", men: LandData.armyMen }));
    const loose = s.people.get("isuwa").loose;
    // Two supports: Isuwa's rough ground helps the army standing there.
    season(
      s,
      subs({
        Hatti: { orders: [move("nesa", "isuwa"), support("samuha", "nesa", "isuwa"), support("harran", "nesa", "isuwa")] },
      }),
    );
    Assert.false(s.units.some((u) => u.power === "Mitanni" && u.province === "isuwa"));
    Assert.inRange(s.people.get("isuwa").loose, loose + LandData.armyMen - Math.floor((LandData.armyMen * LandData.battleDead) / 100) - 2000, loose + LandData.armyMen - Math.floor((LandData.armyMen * LandData.battleDead) / 100) + 2000);
  });

  test("A drought halves the harvest of its region's rain-fed land, and a river's flood strikes its whole course", () => {
    const s = quiet();
    s.climate.push({ id: "x900", kind: "Drought", name: "the Anatolian plateau", provinces: ["hattusa", "nesa"], startTurn: 1, endTurn: 3, percent: 50 });
    s.climate.push({ id: "x901", kind: "Flood", name: "the Nile", provinces: ["thebes", "delta"], startTurn: 1, endTurn: 3, percent: 60 });
    const e = new TurnEngine(s);
    Assert.equal(Math.floor(harvestOf(Map.get("hattusa")) / 2), e.harvestNow("hattusa"), 1);
    Assert.equal(Math.floor((harvestOf(Map.get("delta")) * 60) / 100), e.harvestNow("delta"), 1);
    // The land's worth counts the people, not the weather.
    Assert.equal(harvestOf(Map.get("hattusa")), e.harvestNow("hattusa", false), 1);
    Assert.equal(harvestOf(Map.get("sapinuwa")), e.harvestNow("sapinuwa"), 0);
  });

  test("Births grow a ravaged province back towards what its land carries, slowly", () => {
    const s = quiet();
    const room = reckonedOf(Map, "sapinuwa").room;
    s.people.get("sapinuwa").settled = Math.floor(room / 2);
    s.people.get("sapinuwa").men = Math.floor(room / 20);
    season(s);
    const after = s.people.get("sapinuwa").settled;
    // A tenth or so a season, with the settled moving in from Hatti's neighbouring land towards the room (Samuha since item 11f).
    Assert.true(after > room / 2 && after < (room * 2) / 3, `${after} of ${room}`);
  });

  test("Settled people move within their kingdom towards more room, with their share of the purse", () => {
    const s = quiet();
    // Nesa full to bursting, Sapinuwa emptied: people move from Nesa's crowding towards Hattusa and Sapinuwa's room.
    s.people.get("sapinuwa").settled = Math.floor(reckonedOf(Map, "sapinuwa").room / 3);
    const purse = s.markets.get("sapinuwa").purse;
    const before = s.people.get("sapinuwa").settled;
    new TurnEngine(s).beginTurn();
    Assert.true(s.people.get("sapinuwa").settled > before + 5000);
    Assert.true(s.markets.get("sapinuwa").purse > purse);
  });

  test("Winter slows the roads where it is hard, and arid land a large company", () => {
    const winter = 1;
    Assert.true(legPoints(Map, "nesa", "hattusa", winter) > legPoints(Map, "nesa", "hattusa", 0));
    Assert.equal(legPoints(Map, "delta", "memphis", winter), legPoints(Map, "delta", "memphis", 0));
    const small = { sneaking: false, size: ClimatePace.wells, load: 10, capacity: 100, animals: "Donkeys" as const };
    const large = { ...small, size: ClimatePace.wells + 20 };
    Assert.true(legPoints(Map, "delta", "sinai", 0, large) > legPoints(Map, "delta", "sinai", 0, small));
    // Fodder carried in the desert eats into the load: a lightly loaded caravan is slower there than its load alone says.
    const light = { ...small, size: 0 };
    Assert.true(legPoints(Map, "delta", "sinai", 0, light) * legPoints(Map, "delta", "memphis", 0, { ...light, load: 35 }) >= legPoints(Map, "delta", "sinai", 0, { ...light, load: 35 }) * legPoints(Map, "delta", "memphis", 0, light));
  });

  test("A tax is a percent from 0 to the most, on one's own land", () => {
    const s = quiet();
    const v = new OrderValidator(s, Map).validate("Hatti", newTurnSubmission({ orders: [tax(LandData.taxMost + 1), tax(20, "delta"), tax(0, "nesa")] }));
    Assert.equal(1, v.accepted.length);
    Assert.equal(2, v.rejected.length);
  });
});
