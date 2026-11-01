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

  test("Force: an army as large as a tenth of its men weighs heavily; a handful weighs nothing", () => {
    const s = quiet();
    const near = new Set(["kaska", ...WorldMap.default.neighbors("kaska")]);
    removeAll(s.units, (u) => near.has(u.province));
    const e = new TurnEngine(s);
    const u = newUnit({ id: newId(s, "u"), power: "Hatti", kind: "Army", province: "kaska", home: "hattusa", men: 7 });
    s.units.push(u);
    Assert.true(e.forceIn("kaska", "Hatti") <= 5);
    u.men = Math.ceil(s.people.get("kaska").men / 10);
    Assert.true(e.forceIn("kaska", "Hatti") >= UnrestData.force);
    u.men = s.people.get("kaska").men;
    Assert.equal(UnrestData.forceMost, e.forceIn("kaska", "Hatti"));
    // Next door it counts only for the land's holder: a rival's men count once they stand in it.
    u.province = "hattusa";
    Assert.equal(0, e.forceIn("kaska", "Hatti"));
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
    s.units.find((u) => u.power === "Amurru")!.province = "byblos";
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
