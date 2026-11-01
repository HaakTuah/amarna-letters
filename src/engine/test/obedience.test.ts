import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type Power,
  TurnEngine,
  type TurnSubmission,
  UnrestData,
  Views,
  WorldMap,
  move,
  newKnown,
  newGame,
  newGameConfig,
  newId,
  newUnit,
  taxOf,
  feed,
  idiv,
  newMindReply,
  newRisingChoice,
  wallsOf,
} from "@amarna/engine";
import { Assert, oldWorld, removeAll, subs } from "./support.ts";

// Build order item 17++, "Whom a province obeys" and "Loyalty is a ledger" (War): no province is owned by a flag; it obeys
// whoever it fears or loves most, by a clear margin, with degrees; the ledger starts as 1346 stood.
describe("ObedienceTests", () => {
  const quiet = (): GameState => newGame(1, newGameConfig({ catastropheChance: 0, peopleDefence: 0 }));
  function season(s: GameState, orders: Dict<Power, TurnSubmission> = new Dict()): TurnEngine {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
    return e;
  }
  const love = (s: GameState, prov: string, actor: string): number => s.ledger.tryGet(prov)?.getOrDefault(actor, 0) ?? 0;
  const named = (s: GameState, name: string) => s.characters.find((c) => c.name === name)!;

  test("The ledger starts as 1346 stood: a house in its own land, an outsider's holdings, claimants and leanings", () => {
    const s = quiet();
    Assert.equal(UnrestData.home, love(s, "hattusa", "Hatti"));
    // Luwian land under a Hittite court, Canaanite land under Pharaoh: held, not grown from.
    Assert.equal(UnrestData.held, love(s, "kizzuwatna", "Hatti"));
    Assert.equal(UnrestData.held, love(s, "gaza", "Egypt"));
    // Gubla's villages lean to Aziru's house; Tagi's town is his own following; Artatama's claim among the Hurrians.
    Assert.equal(UnrestData.stake, love(s, "byblos", "Amurru"));
    Assert.equal(UnrestData.stake, love(s, "megiddo", named(s, "Tagi").id));
    Assert.equal(UnrestData.stake, love(s, "washukanni", named(s, "Artatama").id));
  });

  test("The governors of 1346 hold their posts from the first season, as grants; the commissioners are open residents", () => {
    const s = quiet();
    for (const [name, prov, p] of [
      ["Thutmose", "nubia", "Egypt"],
      ["Addaya", "gaza", "Egypt"],
      ["Enlil-kidinni", "nippur", "Babylonia"],
    ] as const) {
      const c = named(s, name);
      const g = s.governors.find((x) => x.character === c.id)!;
      Assert.equal(prov, g.province);
      Assert.equal(p, g.power);
      Assert.equal("Governing", c.duty);
      // A privilege, not a job: no fee.
      Assert.equal(null, c.contract);
      Assert.equal(c, new TurnEngine(s).governorOf(prov)![1]);
    }
    // Hatti's border lords, names lost: invented in Hatti's style; the heartland ruled directly.
    Assert.true(s.governors.some((g) => g.province === "samuha" && g.power === "Hatti"));
    Assert.false(s.governors.some((g) => g.province === "hattusa" || g.province === "babylon" || g.province === "memphis"));
    const t = named(s, "Tahmashshi");
    Assert.equal("SpyPosted", t.duty);
    Assert.equal("megiddo", t.watchProvince);
    Assert.equal("Megiddo", t.at);
    Assert.equal("Egypt", t.employer);
    Assert.true(t.openly);
    Assert.true(t.facts.some((f) => f.tag === "resident" && f.secrecy === "Public"));
  });

  test("Force: an army as large as its men weighs heavily, twice the men in hill land; next door and before walls a little, for everyone", () => {
    const s = quiet();
    const near = new Set(["kaska", ...WorldMap.default.neighbors("kaska")]);
    removeAll(s.units, (u) => near.has(u.province));
    const e = new TurnEngine(s);
    const u = newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "kaska", home: "hattusa", men: 7 });
    s.units.push(u);
    Assert.true(e.forceIn("kaska", "Hatti") <= 1);
    // The Kaska hills: their men count twice, so as many men again weigh half.
    u.men = s.people.get("kaska").men;
    Assert.equal(UnrestData.force / 2, e.forceIn("kaska", "Hatti"));
    u.men *= 4;
    Assert.equal(UnrestData.forceMost, e.forceIn("kaska", "Hatti"));
    // Next door it counts a quarter, and only a little in all, for its holder and a rival alike.
    u.province = "hattusa";
    Assert.equal(UnrestData.nearMost, e.forceIn("kaska", "Hatti"));
    // Before walls it has not stormed, an army stands at the gates: next door's weight; within them, in full.
    const city = "carchemish";
    removeAll(s.units, (x) => x.province === city || WorldMap.default.neighbors(city).includes(x.province));
    Assert.true(wallsOf(s, city) > 0);
    const host = newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: city, home: "hattusa", men: s.people.get(city).men * 4 });
    s.units.push(host);
    Assert.equal(UnrestData.nearMost, e.forceIn(city, "Hatti"));
    s.breached.set(city, "Hatti");
    Assert.equal(UnrestData.forceMost, e.forceIn(city, "Hatti"));
  });

  test("Conquest is the season's rule alone: moving in takes nothing, and the province answers to the taker as the season's reckoning finds it", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    // An empty province without walls that its holder loves little: an army standing in it.
    const id = "tuwanuwa";
    removeAll(s.units, (u) => u.province === id || WorldMap.default.neighbors(id).includes(u.province));
    Assert.equal(0, wallsOf(s, id));
    s.units.push(newUnit({ id: newId(s, "u"), power: "Arzawa", kind: "Army", province: id, home: "apasa", men: s.people.get(id).men }));
    e.updateOwnership();
    Assert.equal("Hatti", s.owner.get(id));
    e.obeySeason();
    Assert.equal("Arzawa", s.owner.get(id));
    Assert.true(s.inbox.get("Hatti").some((i) => i.body.includes("now answers to Arzawa")));
  });

  test("A man whose people would follow him is asked; a script answers by his traits, and the rising breaks out the next season", () => {
    const s = quiet();
    const id = "gaza";
    removeAll(s.units, (u) => u.province === id || WorldMap.default.neighbors(id).includes(u.province));
    const g = named(s, "Addaya");
    g.traits.ambition = 90;
    g.traits.loyalty = 10;
    s.ledger.get(id).set("Egypt", 0);
    s.ledger.get(id).set(g.id, 150);
    const e = new TurnEngine(s);
    e.obeySeason();
    // Asked, nothing yet.
    Assert.equal("Egypt", s.owner.get(id));
    const req = e.mindRequests.find((r) => r.task === "Rising" && r.characterId === g.id)!;
    Assert.equal(id, req.rising!.province);
    Assert.true(req.rising!.governs);
    Assert.true(g.risePlan!.rise);
    s.turn++;
    new TurnEngine(s).obeySeason();
    Assert.notEqual("Egypt", s.owner.get(id));
    Assert.true(s.events.some((x) => x.signal === "revolt-led"));
  });

  test("A model who chooses not to lead them is not made to: the province stays its master's", () => {
    const s = quiet();
    const id = "gaza";
    removeAll(s.units, (u) => u.province === id || WorldMap.default.neighbors(id).includes(u.province));
    const g = named(s, "Addaya");
    g.traits.ambition = 90;
    g.traits.loyalty = 10;
    s.ledger.get(id).set("Egypt", 0);
    s.ledger.get(id).set(g.id, 150);
    const e = new TurnEngine(s);
    e.obeySeason();
    const req = e.mindRequests.find((r) => r.task === "Rising" && r.characterId === g.id)!;
    e.fulfil(req, newMindReply({ rising: newRisingChoice({ turn: req.rising!.turn, province: id, rise: false }) }));
    s.turn++;
    new TurnEngine(s).obeySeason();
    Assert.equal("Egypt", s.owner.get(id));
  });

  test("A rising against the master's troops is fought as a battle: a few among people who lean away are beaten and stay where they stand", () => {
    const s = quiet();
    const id = "gaza";
    removeAll(s.units, (u) => u.province === id || WorldMap.default.neighbors(id).includes(u.province));
    const g = named(s, "Addaya");
    g.traits.ambition = 90;
    g.traits.loyalty = 10;
    s.ledger.get(id).set("Egypt", 0);
    s.ledger.get(id).set(g.id, 150);
    const few = newUnit({ id: newId(s, "u"), power: "Egypt", kind: "Army", province: id, home: "memphis", men: 300 });
    s.units.push(few);
    new TurnEngine(s).obeySeason();
    s.turn++;
    new TurnEngine(s).obeySeason();
    Assert.notEqual("Egypt", s.owner.get(id));
    Assert.true(s.inbox.get("Egypt").some((i) => i.title === "A garrison beaten"));
    Assert.true(!s.units.includes(few) || few.men < 300);
  });

  test("The people resist an invader as hostile as their ledger: more beside a master they love, less to one who gave them much", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const e = new TurnEngine(s);
    const id = "tuwanuwa";
    s.ledger.get(id).set("Hatti", 0);
    const plain = e.resistance(id, "Arzawa");
    s.ledger.get(id).set("Hatti", 100);
    Assert.true(e.resistance(id, "Arzawa") > plain);
    s.ledger.get(id).set("Arzawa", 200);
    Assert.true(e.resistance(id, "Arzawa") < plain);
  });

  test("Grain handed out in a famine is remembered of the hand they see, the governor, unless it comes in the king's own name", () => {
    const s = quiet();
    const id = "gaza";
    const g = named(s, "Addaya");
    s.fed.set(id, 500);
    s.ledger.get(id).set("Egypt", 0);
    s.ledger.get(id).delete(g.id);
    s.stores.set(id, 1000);
    const e = new TurnEngine(s);
    e.settleMarkets([["Egypt", feed(id, 50)]]);
    Assert.true((s.ledger.get(id).tryGet(g.id) ?? 0) > 0);
    Assert.equal(0, s.ledger.get(id).getOrDefault("Egypt", 0));
    e.settleMarkets([["Egypt", feed(id, 50, true)]]);
    Assert.true(s.ledger.get(id).getOrDefault("Egypt", 0) > 0);
  });

  test("An army's men remember their pay and their victories of the hand they see, and follow a commander only as far as that", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    const u = s.units.find((x) => x.power === "Hatti" && x.kind === "Army")!;
    // The armies of 1346 have served their king.
    Assert.equal(UnrestData.held, s.armies.get(u.id).get("Hatti"));
    Assert.equal(50 - UnrestData.held, e.follows(u, "nobody"));
    e.armyEntry(u, "c1", 60);
    Assert.equal(70, e.follows(u, "c1"));
    e.armyLedgerSeason();
    Assert.equal(UnrestData.held - idiv(UnrestData.held * UnrestData.fade, 100), s.armies.get(u.id).get("Hatti"));
  });

  test("A handful holds nothing by itself: a far weaker unit that the land's own men shelter is destroyed all the same", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const next = WorldMap.default.neighbors("hattusa").find((x) => !WorldMap.default.get(x).isSea && s.owner.getOrDefault(x, null) === "Hatti")!;
    removeAll(s.units, (u) => u.province === "hattusa" || u.province === next);
    const few = newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "hattusa", home: "hattusa", men: 7 });
    const host = newUnit({ id: newId(s, "u"), power: "Mitanni", kind: "Army", province: next, home: "washukanni", men: 5000 });
    s.units.push(few, host);
    season(s, subs({ Mitanni: { orders: [move(next, "hattusa")] } }));
    // The city's own men held the Mitanni out, but its seven men are gone.
    Assert.equal(next, host.province);
    Assert.false(s.units.includes(few));
    Assert.true(s.inbox.get("Hatti").some((i) => i.body.includes("though the land itself held it out")));
  });

  test("Obedience has degrees: a province held narrowly pays a third, one held by a wide margin pays in full", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    e.obeySeason();
    Assert.false(s.obeyed.has("hattusa"));
    const tax = taxOf(e.harvestNow("hattusa"));
    Assert.equal(e.effectiveYield("hattusa") > 0, true);
    // Hated in his own land, no troops there: it barely holds.
    s.ledger.get("hattusa").set("Hatti", UnrestData.floor + 1);
    const near = new Set(["hattusa", ...WorldMap.default.neighbors("hattusa")]);
    removeAll(s.units, (u) => near.has(u.province));
    e.obeySeason();
    Assert.true(s.obeyed.get("hattusa") < 500, `obeyed ${s.obeyed.get("hattusa")}`);
    Assert.true(e.effectiveYield("hattusa") * 2 < tax);
  });

  test("A province whose holder takes more than he gives falls lawless with nobody at its head, unless his troops stand in it", () => {
    const s = quiet();
    const near = new Set(["tuwanuwa", ...WorldMap.default.neighbors("tuwanuwa")]);
    removeAll(s.units, (u) => near.has(u.province));
    const gov = s.governors.find((g) => g.province === "tuwanuwa")!;
    removeAll(s.governors, (g) => g === gov);
    s.ledger.get("tuwanuwa").delete(gov.character);
    named(s, s.characters.find((c) => c.id === gov.character)!.name).watchProvince = null;
    s.ledger.get("tuwanuwa").set("Hatti", UnrestData.floor - 30);
    new TurnEngine(s).obeySeason();
    Assert.equal(null, s.owner.getOrDefault("tuwanuwa", "x"));
    Assert.equal(1, s.events.filter((x) => x.signal === "revolt-lawless").length);
  });

  test("Love for a neighbour whose men stand at its gates takes a province over to him", () => {
    const s = quiet();
    removeAll(s.units, (u) => u.province === "byblos" || u.province === "amurru");
    s.ledger.get("byblos").set("Byblos", 0);
    s.ledger.get("byblos").set("Amurru", 80);
    s.units.push(
      newUnit({
        id: newId(s, "u"),
        power: "Amurru",
        kind: "Army",
        province: "amurru",
        home: "amurru",
        men: 1000,
      }),
    );
    new TurnEngine(s).obeySeason();
    // Gubla is Byblos's court: a neighbour's men next door do not take a king's own city; only troops standing in it do.
    Assert.equal("Byblos", s.owner.get("byblos"));
    // Standing before its walls, they are at its gates; once they stormed them, within.
    s.units.find((u) => u.power === "Amurru")!.province = "byblos";
    new TurnEngine(s).obeySeason();
    Assert.equal("Byblos", s.owner.get("byblos"));
    s.breached.set("byblos", "Amurru");
    new TurnEngine(s).obeySeason();
    Assert.equal("Amurru", s.owner.get("byblos"));
    Assert.true(s.inbox.get("Byblos").some((i) => i.body.includes("now answers to Amurru")));
  });

  test("A court lists the land it knows it holds: one gained out of its sight once it hears, one lost as it last knew it", () => {
    const s = quiet();
    const e = new TurnEngine(s);
    // Susa is far beyond Pharaoh's couriers: Egypt given it does not list it until word comes.
    e.setOwner("susa", "Egypt");
    Assert.false(Views.for(s, "Egypt").provinces.some((x) => x.province === "susa"));
    // Once it knows it holds it, and then loses it out of its sight, it keeps its last report until word of the loss.
    s.known.set("Egypt", new Dict([["susa", newKnown({ owner: "Egypt", turn: s.turn, source: "seen" })]]));
    Assert.true(Views.for(s, "Egypt").provinces.some((x) => x.province === "susa"));
    const before = Views.for(s, "Egypt").provinces.find((x) => x.province === "susa")!;
    e.setOwner("susa", "Elam");
    s.people.get("susa").settled = 0;
    const after = Views.for(s, "Egypt").provinces.find((x) => x.province === "susa");
    Assert.equal(before.settled, after?.settled);
    Assert.equal("Egypt", Views.for(s, "Egypt").owner.get("susa"));
  });
});
