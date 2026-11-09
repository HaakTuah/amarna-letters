import { describe, test } from "vitest";
import { type GameState, OrderValidator, inboxOf, type Power, TurnEngine, captive, heldKing, hold, move, newGame, newGameConfig, newTurnSubmission, ownedBy, payRansom, writeLetter } from "@amarna/engine";
import { inMandate } from "../src/turn/held-king.ts";
import { Assert, smallWorld } from "./support.ts";

// #806: a captive king plays the captive; a caretaker keeps his realm within a narrow mandate.
describe("HeldKingTests", () => {
  const kingOf = (s: GameState, p: Power) => s.characters.find((c) => c.id === s.reigns.get(p).character)!;

  /** Egypt's king taken by Hatti and held at its court, his court having heard. */
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

  test("A king held is his court's to keep by a caretaker; a free king is not held", () => {
    const { s } = held();
    Assert.equal("Hatti", heldKing(s, "Egypt")?.heldBy);
    Assert.equal(null, heldKing(s, "Hatti"));
  });

  test("The caretaker defends its own land and begins nothing; the captive's own orders are not carried out", () => {
    const { s, e } = held();
    const own = ownedBy(s, "Egypt")[0];
    const foreign = ownedBy(s, "Hatti")[0];
    const care = newTurnSubmission({ orders: [hold(own), move(own, own), move(own, foreign)], standing: [] });
    const out = e.heldSeason("Egypt", newTurnSubmission({ orders: [move(own, foreign)], caretaker: care }));
    Assert.equal(2, out.orders.length);
    Assert.equal(null, out.caretaker);
    Assert.true(out.orders.every((o) => o.type !== "move" || o.to === own));
    Assert.true(inboxOf(s, "Egypt").some((i) => i.title === "Held at a foreign court"));
  });

  test("The mandate keeps tribute and his own ransom only by his word", () => {
    const { s } = held();
    const k = kingOf(s, "Egypt");
    Assert.false(inMandate(s, "Egypt", k.id, payRansom(k.id)));
    Assert.true(inMandate(s, "Egypt", k.id, payRansom("someone-else")));
    const tribute = { type: "dispatch", envoy: "x", to: "Hatti", letter: "", mandate: "", gold: 10, purityPercent: 100, clauses: [{ kind: "tribute", power: null, province: null, to: null, turn: null, amount: 10 }] } as const;
    Assert.true(inMandate(s, "Egypt", k.id, tribute as never));
    Assert.false(inMandate(s, "Egypt", k.id, { ...tribute, clauses: [] } as never));
  });

  test("His letters leave through his captor's court, which reads them; kept, they go nowhere", () => {
    const { s, e } = held();
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
    const { s, e } = held();
    const k = kingOf(s, "Egypt");
    const spy = s.characters.find((c) => c.employer === "Egypt" && c.id !== k.id && c.status === "Employed")!;
    spy.duty = "SpyPosted";
    spy.at = "Hatti";
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

  test("A free king does not write so, and a captor keeps only a king's letters", () => {
    const { s } = held();
    const v = new OrderValidator(s).validate("Mitanni", newTurnSubmission({ orders: [writeLetter("Egypt", "Hello.")] }));
    Assert.contains("only a king held captive", Assert.single(v.rejected).reason);
    const stop = new OrderValidator(s).validate("Hatti", newTurnSubmission({ orders: [captive(kingOf(s, "Egypt").id, "StopLetters")] }));
    Assert.empty(stop.rejected);
  });
});
