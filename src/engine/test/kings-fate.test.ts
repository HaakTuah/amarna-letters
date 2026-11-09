import { describe, test } from "vitest";
import { Dict, type GameState, OrderValidator, type Power, TurnEngine, captive, crownedIn, dismiss, king, kingFor, newGame, newGameConfig, newTurnSubmission, ownedBy, payRansom, realmOfKing, setCrowned } from "@amarna/engine";
import { Lines } from "../src/model/heirs.ts";
import { KingData } from "../src/turn/kings-fate.ts";
import { Assert, smallWorld, subs, courtGoing } from "./support.ts";

// Item 17b, part B: every king a person, his fate his captor's when he is taken, and his heir from the record when he dies.
describe("KingsFateTests", () => {
  const kingOf = (s: GameState, p: Power) => s.characters.find((c) => c.id === s.reigns.get(p).character)!;

  /** Egypt's king taken by Hatti and held at its court (as his convoy would bring him). */
  function held(): { s: GameState; e: TurnEngine } {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti", "Mitanni");
    const e = new TurnEngine(s);
    s.owner.set("akhetaten", "Hatti");
    e.kingTaken("Egypt", "Hatti", false);
    e.courtFlees("Egypt", "Hatti", false);
    const c = kingOf(s, "Egypt");
    s.journeys = s.journeys.filter((j) => j.characterId !== c.id);
    c.duty = "None";
    c.at = "Hatti";
    return { s, e };
  }

  function season(s: GameState, orders = new Dict<Power, ReturnType<typeof newTurnSubmission>>()): void {
    const e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(orders);
  }

  test("Every king is a person who reigns, and no servant of his own court", () => {
    const s = newGame(1);
    for (const [p, r] of s.reigns) {
      const c = s.characters.find((x) => x.id === r.character)!;
      Assert.equal(["Ruling", p, "Employed", p], [c.duty, c.employer, c.status, c.at]);
      Assert.equal(p, realmOfKing(s, c.id));
    }
    Assert.equal("Suppiluliuma", kingOf(s, "Hatti").name);
    const v = new OrderValidator(s).validate("Hatti", newTurnSubmission({ orders: [dismiss(kingOf(s, "Hatti").id)] }));
    Assert.contains("is your king", Assert.single(v.rejected).reason);
  });

  test("A king taken is his captor's captive, who may not turn him; his court flees", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");
    s.owner.set("akhetaten", "Hatti");
    const e = new TurnEngine(s);
    e.kingTaken("Egypt", "Hatti", false);
    e.courtFlees("Egypt", "Hatti", false);
    const c = kingOf(s, "Egypt");
    Assert.equal(["Captured", "Hatti", "UnderGuard", true], [c.status, c.heldBy, c.duty, c.intercepted]);
    Assert.notEqual("akhetaten", courtGoing(s, "Egypt"));
    Assert.equal("Egypt", s.owner.get(courtGoing(s, "Egypt")));
    Assert.empty(s.eliminated.filter((p) => p === "Egypt"));
  });

  test("A king put to death: his heir is the next name on the record, inheriting a third of his standing", () => {
    const { s } = held();
    const dead = kingOf(s, "Egypt");
    season(s, subs({ Hatti: { orders: [captive(dead.id, "Execute")] } }));
    Assert.equal("Dead", dead.status);
    const ended = Assert.single(s.reignsEnded);
    Assert.equal(["Egypt", dead.id, "put to death by Hatti"], [ended.power, ended.character, ended.how]);
    // He died at Hatti's court: his own hears of it, and his heir reigns, only when the word arrives.
    Assert.equal(dead.id, s.reigns.get("Egypt").character);
    const word = Assert.single(s.journeys, (j) => j.kind === "Word" && j.news === "KingDead" && j.to === "Egypt");
    Assert.true(word.arriveTurn > ended.until);
    // The word arrives.
    s.ledger.get("thebes").set("Egypt", 90);
    s.ledger.get("memphis").set("Egypt", -30);
    s.journeys = s.journeys.filter((j) => j !== word);
    new TurnEngine(s).heirReigns("Egypt", word.text ?? "");
    // A third of what his people held of his father, love and hate alike.
    Assert.equal([30, -10], [s.ledger.get("thebes").get("Egypt"), s.ledger.get("memphis").get("Egypt")]);
    const heir = kingOf(s, "Egypt");
    Assert.equal([Lines.Egypt!.heirs[0].name!, "Ruling", 0], [heir.name, heir.duty, s.reigns.get("Egypt").line]);
    Assert.equal(heir.name, king("Egypt"));
    // Hatti knows Egypt's king by the old name until word of the heir reaches it.
    const succession = Assert.single(s.journeys, (j) => j.kind === "Word" && j.news === "Succession" && j.to === "Hatti");
    Assert.equal("Naphurureya", kingFor("Hatti", "Egypt"));
    Assert.equal("Smenkhkare", kingFor("Egypt", "Egypt"));
    while (s.turn <= succession.arriveTurn) season(s);
    Assert.equal("Smenkhkare", kingFor("Hatti", "Egypt"));
    Assert.contains("You are Smenkhkare now", s.inbox.get("Egypt").find((i) => i.title === "The king is dead")!.body);
    // The name registry follows the saved reigns.
    setCrowned([]);
    Assert.equal("Naphurureya", king("Egypt"));
    setCrowned(crownedIn(s));
    Assert.equal("Smenkhkare", king("Egypt"));
  });

  test("A man of the record already on the map takes the throne himself; past the record a son or brother is drawn", () => {
    const { s, e } = held();
    // Ay, the God's Father at Pharaoh's court, is third on Egypt's line: the two before him are passed by.
    s.reigns.get("Egypt").line = 1;
    const ay = s.characters.find((c) => c.name === "Ay")!;
    const die = (): void => {
      const c = kingOf(s, "Egypt");
      c.status = "Dead";
      e.kingDied(c, "for the test", e.courtAt("Egypt"));
    };
    die();
    Assert.equal(ay.id, s.reigns.get("Egypt").character);
    Assert.equal(["Ruling", "Egypt", "Egypt"], [ay.duty, ay.employer, ay.at]);
    // Past the record: Egypt's line spent.
    s.reigns.get("Egypt").line = Lines.Egypt!.heirs.length - 1;
    die();
    const drawn = kingOf(s, "Egypt");
    Assert.equal("Ruling", drawn.duty);
    Assert.true(s.reigns.get("Egypt").about.startsWith("Son of Ay") || s.reigns.get("Egypt").about.startsWith("Brother of Ay"));
  });

  test("A king ransomed walks home and reigns again at his court", () => {
    const { s } = held();
    const c = kingOf(s, "Egypt");
    season(s, subs({ Hatti: { orders: [captive(c.id, "Ransom", 50)] } }));
    // #806: he agrees to it in a letter home, which his court carries out when it arrives; his captor asks again while
    // no demand stands.
    for (let i = 0; i < 24 && c.status === "Captured"; i++) {
      const demand = s.tasks.find((t) => t.kind === "RansomDemand" && t.characterId === c.id);
      const asked = demand === undefined ? { Hatti: { orders: [captive(c.id, "Ransom", 50)] } } : {};
      const agree = demand?.announced === true && !s.wordHome.some((w) => w.power === "Egypt") ? { Egypt: { orders: [payRansom(c.id)] } } : {};
      season(s, subs({ ...asked, ...agree }));
    }
    Assert.equal("Employed", c.status);
    for (let i = 0; i < 12 && c.duty !== "Ruling"; i++) season(s);
    Assert.equal(["Ruling", "Egypt"], [c.duty, c.at]);
  });

  test("A namesake who reigns elsewhere is never taken for the record's heir", () => {
    const s = newGame(1, newGameConfig({ catastropheChance: 0 }));
    const e = new TurnEngine(s);
    const ugarit = kingOf(s, "Ugarit");
    const aitakama = kingOf(s, "Qadesh");
    aitakama.status = "Dead";
    e.kingDied(aitakama, "for the test", e.courtAt("Qadesh"));
    const heir = kingOf(s, "Qadesh");
    Assert.notEqual(ugarit.id, heir.id);
    Assert.equal(["Ruling", "Ugarit"], [ugarit.duty, ugarit.employer]);
    Assert.equal("Ugarit", realmOfKing(s, ugarit.id));
  });

  test("A realm left holding nothing falls though its court stood abroad", () => {
    const s = smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti", "Mitanni");
    s.court.set("Egypt", "hattusa");
    for (const id of ownedBy(s, "Egypt")) s.owner.set(id, "Mitanni");
    new TurnEngine(s).capitalsTaken();
    Assert.contains("Egypt", s.eliminated);
  });

  test("A king walking home is not taken with his court's city", () => {
    const { s, e } = held();
    const c = kingOf(s, "Egypt");
    // Set free and on his way home.
    s.characters.find((x) => x.id === c.id)!.status = "Employed";
    c.heldBy = null;
    e.kingGoesHome(c, "Egypt", e.courtAt("Hatti"));
    const seat = courtGoing(s, "Egypt");
    s.owner.set(seat, "Hatti");
    e.kingTaken("Egypt", "Hatti", true);
    e.courtFlees("Egypt", "Hatti", false);
    Assert.equal(["Employed", "Travelling"], [c.status, c.duty]);
    Assert.notEqual(seat, courtGoing(s, "Egypt"));
  });

  test("A king held may get away by his skill at going unseen, and walks home", () => {
    const { s, e } = held();
    const c = kingOf(s, "Egypt");
    c.skills.stealth = 99;
    // About a tenth of seasons at the best skill (KingData.escape, a thousandth a point).
    let seasons = 0;
    for (; seasons < 200 && c.status === "Captured"; seasons++) {
      s.turn++;
      e.kingsHeld();
    }
    Assert.inRange(seasons, 1, 199);
    Assert.equal(["Employed", "Travelling", null], [c.status, c.duty, c.heldBy]);
    Assert.contains(s.journeys, (j) => j.kind === "Travel" && j.characterId === c.id && j.to === "Egypt");
    Assert.equal(1, KingData.escape);
  });
});
