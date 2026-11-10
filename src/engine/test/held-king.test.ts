import { describe, test } from "vitest";
import { type Character, Dict, type GameState, OrderValidator, Views, inboxOf, type Power, captive, cede, giftUnit, heldKing, hire, hold, move, newSleepState, newTurnSubmission, notify, ownedBy, payRansom, placeSpy, writeLetter } from "@amarna/engine";
import { inMandate } from "../src/turn/held-king.ts";
import { lettersKept, spyWith } from "../src/rules/court.ts";
import { newJobErrand } from "../src/model/people.ts";
import { newJourney } from "../src/model/records.ts";
import { newWordHome } from "../src/model/held-king.ts";
import { Assert, egyptHeld } from "./support.ts";

// #806: a captive king plays the captive; a caretaker keeps his realm within a narrow mandate.
describe("HeldKingTests", () => {
  const kingOf = (s: GameState, p: Power) => s.characters.find((c) => c.id === s.reigns.get(p).character)!;
  const servant = (s: GameState, p: Power) => s.characters.find((c) => c.employer === p && c.id !== kingOf(s, p).id && c.status === "Employed" && c.contract !== null)!;
  // A spy posted at the captor's court whose job is to free the king.
  const onErrand = (s: GameState, c: Character) => {
    Object.assign(c, { duty: "SpyPosted", at: "Hatti" });
    c.contract!.errand = newJobErrand({ what: "spy", where: "Hatti", frees: kingOf(s, "Egypt").id });
  };


  test("A king held is his court's to keep by a caretaker; a free king is not held", () => {
    const { s } = egyptHeld();
    Assert.equal("Hatti", heldKing(s, "Egypt")?.heldBy);
    Assert.equal(null, heldKing(s, "Hatti"));
  });

  test("The caretaker defends its own land and begins nothing; the captive's own orders are not carried out", () => {
    const { s, e } = egyptHeld();
    const own = ownedBy(s, "Egypt")[0];
    const foreign = ownedBy(s, "Hatti")[0];
    const care = newTurnSubmission({ orders: [hold(own), move(own, own), move(own, foreign)], standing: [] });
    const out = e.heldSeason("Egypt", newTurnSubmission({ orders: [move(own, foreign)], caretaker: care }));
    Assert.empty(out.orders);
    Assert.equal(2, out.caretaker!.orders.length);
    Assert.true(out.caretaker!.orders.every((o) => o.type !== "move" || o.to === own));
    Assert.true(inboxOf(s, "Egypt").some((i) => i.title === "Held at a foreign court"));
  });

  test("The mandate keeps tribute and his own ransom only by his word", () => {
    const { s } = egyptHeld();
    const k = kingOf(s, "Egypt");
    Assert.false(inMandate(s, "Egypt", k.id, payRansom(k.id)));
    Assert.true(inMandate(s, "Egypt", k.id, payRansom("someone-else")));
    const tribute = { type: "dispatch", envoy: "x", to: "Hatti", letter: "", mandate: "", gold: 10, purityPercent: 100, clauses: [{ kind: "tribute", power: null, province: null, to: null, turn: null, amount: 10 }] } as const;
    Assert.true(inMandate(s, "Egypt", k.id, tribute as never));
    Assert.false(inMandate(s, "Egypt", k.id, { ...tribute, clauses: [] } as never));
  });

  test("His letters leave through his captor's court, which reads them; kept, they go nowhere", () => {
    const { s, e } = egyptHeld();
    e.heldSeason("Egypt", newTurnSubmission({ orders: [writeLetter("Mitanni", "Brother, come for me.")], caretaker: newTurnSubmission() }));
    const j = Assert.single(s.journeys.filter((x) => x.kind === "CaptiveLetter"));
    Assert.equal(["Mitanni", e.courtAt("Hatti")], [j.to, j.waitAt]);
    Assert.true(inboxOf(s, "Hatti").some((i) => i.title === "A captive's letter read" && i.body.includes("come for me")));
    s.journeys = [];
    s.lettersStopped.push(`${kingOf(s, "Egypt").id}|Mitanni`);
    e.heldSeason("Egypt", newTurnSubmission({ orders: [writeLetter("Mitanni", "Again."), writeLetter("Egypt", "Pay them.")], caretaker: newTurnSubmission() }));
    Assert.equal(["Egypt"], s.journeys.filter((x) => x.kind === "CaptiveLetter").map((x) => x.to));
    Assert.true(inboxOf(s, "Hatti").some((i) => i.title === "A captive's letter kept"));
  });

  test("His ransom rides home in his letter and his court pays it when the letter comes; his own spy takes it out unread", () => {
    const { s, e } = egyptHeld();
    const k = kingOf(s, "Egypt");
    const spy = servant(s, "Egypt");
    spy.duty = "SpyPosted";
    spy.at = "Hatti";
    // Posted for anything else, he takes nothing out: only on the errand his king's word gave him.
    e.heldSeason("Egypt", newTurnSubmission({ orders: [writeLetter("Egypt", "Hold fast.")], caretaker: newTurnSubmission() }));
    Assert.equal(k.id, Assert.single(s.journeys.filter((x) => x.kind === "CaptiveLetter")).characterId);
    s.journeys = [];
    onErrand(s, spy);
    const before = inboxOf(s, "Hatti").length;
    e.heldSeason("Egypt", newTurnSubmission({ orders: [payRansom(k.id)], caretaker: newTurnSubmission() }));
    const j = Assert.single(s.journeys.filter((x) => x.kind === "CaptiveLetter"));
    Assert.equal(spy.id, j.characterId);
    Assert.equal(before, inboxOf(s, "Hatti").length);
    Assert.equal(j.id, Assert.single(s.wordHome).journey);
    s.journeys = [];
    e.captiveLetterArrives(j);
    const out = e.heldSeason("Egypt", newTurnSubmission({ caretaker: newTurnSubmission() }));
    Assert.equal(["payRansom"], out.orders.map((o) => o.type));
    Assert.empty(s.wordHome);
  });

  test("What his word home agreed to is given now: before his scheduled orders, and the caretaker's only fill what it leaves", () => {
    const { s, e } = egyptHeld();
    const u = s.units.find((x) => x.power === "Egypt" && e.wordTo("Egypt", x.province) === 0)!;
    const sl = newSleepState({ asleep: true, wakeAt: 50 });
    s.sleep.set("Egypt", sl);
    sl.scheduled.push(e.bind("Egypt", s.turn, hold(u.province), [])[0]!);
    s.wordHome.push(newWordHome({ power: "Egypt", order: giftUnit(u.province, "Hatti") }));
    const plan = e.planSeason("Egypt", e.sendOrders("Egypt", e.heldSeason("Egypt", newTurnSubmission({ caretaker: newTurnSubmission({ orders: [hold(u.province)] }) }))));
    Assert.equal(["giftUnit"], e.compose("Egypt", plan, []).orders.filter((o) => "unit" in o && o.unit === u.province).map((o) => o.type));
  });

  test("A spy his word home posts at his captor's court goes to free him only once he is sent", () => {
    const { s, e } = egyptHeld();
    const k = kingOf(s, "Egypt");
    const spy = servant(s, "Egypt");
    Object.assign(spy, { duty: "SpyPosted", at: "Hatti" });
    spy.contract!.errand = null;
    const frees = () => spy.contract!.errand?.frees ?? "";
    const post = placeSpy(spy.id, "Hatti");
    s.wordHome.push(newWordHome({ power: "Egypt", order: post }));
    // Posted there already, he is not sent: the order is refused, and he takes no letter out that season.
    const out = e.heldSeason("Egypt", newTurnSubmission({ orders: [writeLetter("Egypt", "Come for me.")], caretaker: newTurnSubmission() }));
    Assert.single(new OrderValidator(s).validate("Egypt", newTurnSubmission({ orders: out.orders })).rejected);
    Assert.equal("", frees());
    Assert.equal(k.id, Assert.single(s.journeys.filter((x) => x.kind === "CaptiveLetter")).characterId);
    // Sent from home by any other order, he is not on that errand; by his word, his job is to free him.
    Object.assign(spy, { duty: "None", at: "Egypt" });
    e.placeSpy("Egypt", placeSpy(spy.id, "Hatti"));
    Assert.equal("", frees());
    Object.assign(spy, { duty: "None", at: "Egypt" });
    spy.contract!.errand = null;
    e.placeSpy("Egypt", post);
    Assert.equal(k.id, frees());
    // Recalled, his job is done: a new job is a new errand, and he no longer helps.
    e.recall("Egypt", spy);
    Object.assign(spy, { duty: "SpyPosted", at: "Hatti" });
    Assert.equal(null, spyWith(s, "Egypt", "Hatti"));
  });

  test("A man his word home hires as a spy at his captor's court has the job to free him, and his court sends him", () => {
    const { s, e } = egyptHeld();
    const k = kingOf(s, "Egypt");
    const man = s.characters.find((c) => c.status === "Free" && c.heldBy === null && c.errand === null && c.contract === null)!;
    Object.assign(man, { at: "Egypt", duty: "None" });
    s.wordHome.push(newWordHome({ power: "Egypt", order: hire(man.id, 60, 6, 30, { what: "spy", where: "Hatti" }) }));
    const out = e.heldSeason("Egypt", newTurnSubmission({ caretaker: newTurnSubmission() }));
    Assert.equal(["hire", "spy"], out.orders.map((o) => o.type));
    const h = out.orders[0];
    Assert.equal(k.id, h.type === "hire" ? h.frees : null);
    // Nobody else's king, and only a spy's job at the court that holds him.
    man.at = "Mitanni";
    const v = new OrderValidator(s).validate("Mitanni", newTurnSubmission({ orders: [{ ...hire(man.id, 60, 6, 30, { what: "spy", where: "Hatti" }), frees: k.id }] }));
    Assert.contains("free your king", Assert.single(v.rejected).reason);
    // Played through a season: hired, he sets out for the captor's court with the job to free his king.
    man.at = "Egypt";
    s.treasuries.get("Egypt").gold = 1000;
    s.wordHome.push(newWordHome({ power: "Egypt", order: hire(man.id, 400, 6, 200, { what: "spy", where: "Hatti" }) }));
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ caretaker: newTurnSubmission() })]]));
    Assert.equal(["Employed", "SpyOutbound", "Hatti", k.id], [man.status, man.duty, man.missionTarget, man.contract?.errand?.frees]);
  });

  test("His word home may give in: land ceded goes home with his letter", () => {
    const { s, e } = egyptHeld();
    const own = ownedBy(s, "Egypt")[0];
    e.heldSeason("Egypt", newTurnSubmission({ orders: [cede(own, "Hatti")], caretaker: newTurnSubmission() }));
    Assert.equal(["cede"], s.wordHome.map((w) => w.order.type));
  });

  test("A captor who keeps all his letters may let those to one court go; a kept letter goes with no carrier", () => {
    const { s, e } = egyptHeld();
    const k = kingOf(s, "Egypt");
    const order = (fate: "StopLetters" | "PassLetters", to: Power | null) => ({ ...captive(k.id, fate), to });
    e.captive("Hatti", order("StopLetters", null));
    e.captive("Hatti", order("PassLetters", "Egypt"));
    Assert.equal([false, true], [lettersKept(s, k.id, "Egypt"), lettersKept(s, k.id, "Mitanni")]);
    // A letter kept is gone before any carrier takes letters from that court, with whatever waits beside it.
    s.journeys.push({ ...newJourney({ id: "j-k", kind: "CaptiveLetter", from: "Egypt", to: "Mitanni", characterId: k.id, text: "", waitAt: e.courtAt("Hatti") }), arriveTurn: 1_000_000 });
    e.carryLetters();
    Assert.empty(s.journeys.filter((x) => x.id === "j-k"));
  });

  test("A disloyal, fearful spy sent to free him sells him out to his captor", () => {
    const { s, e } = egyptHeld();
    const spy = servant(s, "Egypt");
    onErrand(s, spy);
    spy.traits.loyalty = 20;
    spy.traits.courage = 10;
    e.kingsHeld();
    Assert.equal(null, spyWith(s, "Egypt", "Hatti"));
    Assert.true(inboxOf(s, "Hatti").some((i) => i.title === "A plot to free your captive"));
  });

  test("His court taken by force, the kings it held go free", () => {
    const { s, e } = egyptHeld();
    const k = kingOf(s, "Egypt");
    s.owner.set(e.courtAt("Hatti"), "Mitanni");
    e.courtFlees("Hatti", "Mitanni", false);
    Assert.equal([false, null], [k.status === "Captured", k.heldBy]);
  });

  test("The caretaker reads his court's word as it comes; the captive, late", () => {
    const { s } = egyptHeld();
    s.courtLag.set("Egypt", 3);
    notify(s, "Egypt", "Notice", "Tribute", "Tribute came.");
    Assert.equal([true, false], [Views.court(s, "Egypt").inbox.some((i) => i.title === "Tribute"), Views.for(s, "Egypt").inbox.some((i) => i.title === "Tribute")]);
    // What befalls him at his captor's court is his at once, and never his court's.
    notify(s, "Egypt", "Rejected", "Held at a foreign court", "Not carried out.", kingOf(s, "Egypt").id);
    Assert.equal([false, true], [Views.court(s, "Egypt").inbox.some((i) => i.title === "Held at a foreign court"), Views.for(s, "Egypt").inbox.some((i) => i.title === "Held at a foreign court")]);
  });

  test("His captor's watchmen guard him: well guarded, the best of kings does not get away", () => {
    const { s, e } = egyptHeld();
    const k = kingOf(s, "Egypt");
    k.skills.stealth = 99;
    // KingData.guard: the chance is multiplied by 100 / (100 + the season's watch), here about a hundred-thousandth of
    // itself; the watch paid in a season still guards him as the next begins, when the escape is drawn.
    for (let i = 0; i < 200; i++) {
      s.counterIntel.set("Hatti", 10_000_000);
      s.turn++;
      e.beginTurn();
    }
    Assert.equal(["Captured", "Hatti"], [k.status, k.heldBy]);
  });

  test("A free king does not write so, and a captor keeps only a king's letters", () => {
    const { s } = egyptHeld();
    const v = new OrderValidator(s).validate("Mitanni", newTurnSubmission({ orders: [writeLetter("Egypt", "Hello.")] }));
    Assert.contains("only a king held captive", Assert.single(v.rejected).reason);
    const stop = new OrderValidator(s).validate("Hatti", newTurnSubmission({ orders: [captive(kingOf(s, "Egypt").id, "StopLetters")] }));
    Assert.empty(stop.rejected);
  });
});
