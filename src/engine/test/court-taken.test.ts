import { describe, test } from "vitest";
import { type GameState, type Power, TurnEngine, Views, inboxOf, newGame, newGameConfig, newGoldLot } from "@amarna/engine";
import { fallenRealmOf } from "../src/rules/court.ts";
import { Assert, courtGoing, smallWorld } from "./support.ts";

// Item 17b, part C2: the court as a place that can be taken, its treasury lost with it, its flight a real journey, and
// the heir of a fallen realm an exile with a claim.
describe("CourtTakenTests", () => {
  const kingOf = (s: GameState, p: Power) => s.characters.find((c) => c.id === s.reigns.get(p).character)!;
  const world = (): GameState => smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti", "Mitanni");

  test("A court taken loses its treasury to the taker and flees by road to a city its realm holds", () => {
    const s = world();
    const e = new TurnEngine(s);
    s.treasuries.get("Egypt").gold = 400;
    const before = s.treasuries.get("Hatti").gold;
    s.owner.set("akhetaten", "Hatti");
    e.courtFlees("Egypt", "Hatti", false);
    Assert.equal(0, s.treasuries.get("Egypt").gold);
    // Far from Hatti's court: kept in a coffer of Hatti's there, or its treasury.
    const coffer = s.coffers.find((c) => c.power === "Hatti" && c.province === "akhetaten")?.gold ?? 0;
    Assert.equal(400, s.treasuries.get("Hatti").gold - before + coffer);
    const road = Assert.single(s.kingRoads.filter((r) => r.power === "Egypt"));
    Assert.false(road.alone);
    Assert.equal("Egypt", s.owner.get(courtGoing(s, "Egypt")));
    Assert.contains(s.events, (x) => x.signal === "court-treasury" && x.visibleTo.length === 1 && x.visibleTo[0] === "Hatti");
  });

  test("A court taken on the road loses its archive with it", () => {
    const s = world();
    const e = new TurnEngine(s);
    const had = s.copies.filter((k) => k.holder === "Egypt").length;
    e.courtFlees("Egypt", "Hatti", true);
    Assert.empty(s.copies.filter((k) => k.holder === "Egypt"));
    Assert.true(had === 0 || s.events.some((x) => x.kind === "archive-taken"));
    Assert.contains(s.events, (x) => x.signal === "court-taken-road");
  });

  test("A court taken loses its unweighed shipments with its gold", () => {
    const s = world();
    const e = new TurnEngine(s);
    const t = s.treasuries.get("Egypt");
    t.gold = 100;
    t.lots.push(newGoldLot({ id: "g1", from: "Hatti", stated: 50, face: 50, true: 0, arrivedTurn: 0 }));
    e.courtFlees("Egypt", "Hatti", false);
    Assert.equal([0, 0], [t.gold, t.lots.length]);
  });

  test("A court taken on the road loses its own archive, not another court's in the same place", () => {
    const s = world();
    const e = new TurnEngine(s);
    const where = e.courtAt("Egypt");
    s.court.set("Mitanni", where);
    const mitanni = s.copies.filter((k) => k.holder === "Mitanni").length;
    e.courtFlees("Egypt", "Hatti", true);
    Assert.equal(mitanni, s.copies.filter((k) => k.holder === "Mitanni").length);
    Assert.empty(s.copies.filter((k) => k.holder === "Egypt"));
  });

  test("Word of a king's death is sent on to a court that has moved since", () => {
    const s = world();
    const e = new TurnEngine(s);
    const c = kingOf(s, "Egypt");
    c.status = "Dead";
    e.kingDeadWord("Egypt", "gaza", "akhetaten", "The king is dead.");
    const j = s.journeys[s.journeys.length - 1];
    s.court.set("Egypt", "thebes");
    e.kingDeadHeard(j);
    // Not yet: the word goes on from Akhetaten to Thebes.
    Assert.equal(c.id, s.reigns.get("Egypt").character);
    const on = s.journeys[s.journeys.length - 1];
    Assert.equal(["KingDead", "thebes"], [on.news, on.toProvince]);
    e.kingDeadHeard(on);
    Assert.notEqual(c.id, s.reigns.get("Egypt").character);
  });

  test("The last king of a fallen realm dies: his heir lives on in exile, with a claim", () => {
    const s = world();
    const e = new TurnEngine(s);
    const c = kingOf(s, "Mitanni");
    e.fall("Mitanni", "Hatti");
    c.status = "Dead";
    e.kingDied(c, "put to death by Hatti", e.courtAt("Hatti"));
    // Not yet: word of his death goes to where his realm fell, and the heir is raised when it comes.
    Assert.equal(c.id, kingOf(s, "Mitanni").id);
    const word = s.journeys[s.journeys.length - 1];
    Assert.equal(["KingDead", e.fallOf("Mitanni")!.capital], [word.news, word.toProvince]);
    e.kingDeadHeard(word);
    const heir = kingOf(s, "Mitanni");
    Assert.notEqual(c.id, heir.id);
    Assert.equal(["Free", null], [heir.status, heir.employer]);
    // He walks from there to the court nearest it.
    Assert.contains(s.journeys, (j) => j.kind === "Travel" && j.characterId === heir.id);
    Assert.contains(heir.facts, (f) => f.text.includes("claims its throne"));
    Assert.contains(s.events, (x) => x.kind === "king-exile");
  });

  test("A king who gave his realm away by sealed tablet claims nothing", () => {
    const s = world();
    const e = new TurnEngine(s);
    const c = kingOf(s, "Mitanni");
    e.fall("Mitanni", "Hatti", true);
    Assert.false(c.facts.some((f) => f.text.includes("claims its throne")));
    Assert.equal(null, fallenRealmOf(s, c.id));
  });

  test("A fallen realm's last king who dies a captive sends word for the heir after him", () => {
    const s = world();
    const e = new TurnEngine(s);
    const c = kingOf(s, "Mitanni");
    e.fall("Mitanni", "Hatti");
    e.dies(c, e.courtAt("Hatti"), "on the road");
    Assert.contains(s.journeys, (j) => j.news === "KingDead" && j.to === "Mitanni");
  });

  test("A realm given away while word of its king's death was on the road raises no heir in exile", () => {
    const s = world();
    const e = new TurnEngine(s);
    const c = kingOf(s, "Mitanni");
    e.dies(c, "gaza", "on the road");
    const word = s.journeys.find((j) => j.news === "KingDead" && j.to === "Mitanni")!;
    e.fall("Mitanni", "Hatti", true);
    e.kingDeadHeard(word);
    Assert.equal(c.id, kingOf(s, "Mitanni").id);
    Assert.false(s.events.some((x) => x.kind === "king-exile"));
  });

  test("A court stopped on the road in its own city says so, and shelters there", () => {
    const s = world();
    const e = new TurnEngine(s);
    const where = e.courtAt("Egypt");
    e.courtFlees("Egypt", "Hatti", true);
    const n = Assert.single(inboxOf(s, "Egypt").filter((i) => i.title === "The court taken on the road"));
    Assert.contains("stopped and taken on the road", n.body);
    Assert.contains(`shelters in ${e.map.get(where).name}`, n.body);
  });

  test("A man of the record already elsewhere learns he is the heir as word from where his realm fell reaches him", () => {
    const s = world();
    const e = new TurnEngine(s);
    const king = kingOf(s, "Egypt");
    // Egypt's record names its next king, Smenkhkare: here a free man of the sources standing at Hatti's court.
    const man = s.characters.find((c) => c.at === "Hatti" && c.status === "Free" && c.heldBy === null && c.errand === null)!;
    Object.assign(man, { name: "Smenkhkare", attested: true, duty: "None" });
    const before = new Set(s.characters.map((c) => c.id));
    e.fall("Egypt", "Hatti");
    e.dies(king, e.courtAt("Hatti"), "on the road");
    e.kingDeadHeard(s.journeys.find((j) => j.news === "KingDead" && j.to === "Egypt")!);
    const heir = kingOf(s, "Egypt");
    Assert.equal(man.id, heir.id);
    Assert.true(before.has(heir.id));
    Assert.false(heir.facts.some((f) => f.tag === "claim"));
    Assert.equal(null, Views.for(s, "Hatti").known.concat(Views.for(s, "Hatti").court).find((c) => c.id === heir.id)?.heirOf ?? null);
    const word = s.journeys.find((j) => j.news === "HeirClaim" && j.characterId === heir.id)!;
    e.heirClaimHeard(word);
    Assert.true(heir.facts.some((f) => f.tag === "claim"));
  });
});
