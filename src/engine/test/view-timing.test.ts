import { describe, test } from "vitest";
import {
  type CharacterView,
  Dict,
  type GameState,
  GameStateSchema,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  clone,
  dispatch,
  first,
  newAudienceRecord,
  newAudienceRound,
  newEnvoyReaction,
  WorldMap,
  newGame,
  newGameConfig,
  wordHomeAt,
  newHostReply,
  newMindReply,
  newTurnSubmission,
  newUnit,
  placeSpy,
  single,
} from "@amarna/engine";
import { Assert, smallWorld } from "./support.ts";

// <summary>Each servant away shows when it set out and when it is due back, as its master can reckon it; a cover keeps the same words.</summary>
describe("ViewTimingTests", () => {
  function begin(s: GameState): TurnEngine {
    let e = new TurnEngine(s);
    e.beginTurn();
    for (const r of e.mindRequests) e.fulfil(r, newMindReply({ text: `[${r.task}]`, number: 15 }));
    return e;
  }

  function lineOf(s: GameState, p: Power, id: string): CharacterView {
    return single(Views.for(s, p).court, (c) => c.id === id);
  }

  test("An envoy shows when it set out is received and is due back", () => {
    let s = smallWorld(newGame(5, newGameConfig({ catastropheChance: 0 })), "Egypt", "Hatti");
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let e = begin(s);
    Assert.equal("", lineOf(s, "Egypt", envoy.id).timing); // at court, ready
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Hatti", "Greetings.")] })]]));

    // Due there when its route says, and back by the road home as reckoned now (item 7b).
    let heard = first(s.journeys, (j) => j.characterId === envoy.id).arriveTurn;
    let back = heard + new TurnEngine(s).travelTurns("Hatti", "Egypt");
    let line = lineOf(s, "Egypt", envoy.id);
    // On its way, a reckoning: "due there"; only once it stands at that court, "received there".
    Assert.equal(
      ["travelling as envoy to Hatti", `set out in turn 1 for Hatti; due there about turn ${heard}; due back about turn ${back}`],
      [line.duty, line.timing],
    );

    while (s.audiences.length === 0) {
      e = begin(s);
      if (s.audiences.length === 0) e.resolve(new Dict<Power, TurnSubmission>());
    }
    Assert.equal(heard, s.turn);
    back = s.turn + e.travelTurns("Hatti", "Egypt");
    Assert.equal(`set out in turn 1 for Hatti; received there in turn ${heard}; due back about turn ${back}`, lineOf(s, "Egypt", envoy.id).timing);
    e.applyAudience(
      newAudienceRecord({
        audienceId: single(s.audiences).id,
        delivered: "Greetings.",
        rounds: [newAudienceRound({ host: newHostReply({ end: true }), envoy: newEnvoyReaction() })],
      }),
    );
    line = lineOf(s, "Egypt", envoy.id);
    back = first(s.journeys, (j) => j.characterId === envoy.id).arriveTurn;
    Assert.equal(["on the road home", `set out in turn 1 for Hatti; due back about turn ${back}`], [line.duty, line.timing]);

    while (s.turn < back) {
      e.resolve(new Dict<Power, TurnSubmission>());
      e = begin(s);
    }
    // Home from its errand, its job is done (the owner's answers to item 11a): it stands free at court, with no timing.
    line = single(Views.for(s, "Egypt").known, (c) => c.id === envoy.id);
    Assert.equal("at your court", line.where);
    Assert.equal("", line.timing);
  });

  test("A detained envoy is due back in its lord s eyes as one sent home would be", () => {
    let s = smallWorld(newGame(5, newGameConfig({ catastropheChance: 0 })), "Egypt", "Alashiya");
    let envoy = first(s.characters, (c) => c.employer === "Egypt");
    envoy.secretMaster = null;
    let e = begin(s);
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Alashiya", "Hello.")] })]]));
    while (s.audiences.length === 0) {
      e = begin(s);
      if (s.audiences.length === 0) e.resolve(new Dict<Power, TurnSubmission>());
    }
    let at = s.turn;
    let back = at + e.travelTurns("Alashiya", "Egypt");

    let held = clone(GameStateSchema, s);
    new TurnEngine(held).applyAudience(
      newAudienceRecord({
        audienceId: single(held.audiences).id,
        delivered: "Hello.",
        rounds: [newAudienceRound({ host: newHostReply({ detain: true }), envoy: newEnvoyReaction() })],
      }),
    );
    let line = lineOf(held, "Egypt", envoy.id);
    Assert.equal(["on the road home", "travelling", `set out in turn 1 for Alashiya; due back about turn ${back}`], [line.duty, line.where, line.timing]);
  });

  test("A spy on its way shows when it is due at its post", () => {
    let s = smallWorld(newGame(8, newGameConfig({ catastropheChance: 0 })), "Babylonia", "Egypt");
    let spy = first(s.characters, (c) => c.employer === "Babylonia");
    let e = begin(s);
    let travel = e.travelTurns("Babylonia", "Egypt");
    e.resolve(new Dict([["Babylonia", newTurnSubmission({ orders: [placeSpy(spy.id, "Egypt")] })]]));
    Assert.equal(`set out in turn 1; due there about turn ${1 + travel}`, lineOf(s, "Babylonia", spy.id).timing);
  });

  test("Two troops reported into one province are each shown by an older report of their own, never twice by one", () => {
    const s = smallWorld(newGame(1), "Hatti", "Babylonia");
    const e = new TurnEngine(s);
    s.turn = 6;
    // Word home from Babylon and Nippur takes a season beyond the first in this season (the road home, bug #616).
    Assert.equal(1, e.wordFrom("Hatti", "babylon"));
    Assert.equal(1, e.wordFrom("Hatti", "nippur"));
    // Both last reported at Babylon; before that, one at Sippar and the other at Ur. The first placed takes its own older place.
    s.units.push(newUnit({ id: "u-a", power: "Hatti", kind: "Army", province: "babylon", home: "hattusa", men: 900, trail: ["sippar|900|0|0|0|0|0", "babylon|900|0|0|0|0|0", "babylon|900|0|0|0|0|0"] }));
    s.units.push(newUnit({ id: "u-b", power: "Hatti", kind: "Army", province: "nippur", home: "hattusa", men: 800, trail: ["ur|800|0|0|0|0|0", "babylon|800|0|0|0|0|0", "nippur|800|0|0|0|0|0"] }));
    const shown = Views.for(s, "Hatti").units.filter((u) => u.power === "Hatti" && ["babylon", "nippur", "sippar", "ur"].includes(u.province));
    Assert.equal(2, shown.length);
    Assert.equal(["babylon", "sippar"], shown.map((u) => u.province).sort());
    Assert.equal([800, 900], shown.map((u) => u.men).sort());
  });

  test("Every land province has a road home to every court in every season, so a notice and the holder it tells of come by one clock (bug #648)", () => {
    // Where no road led home, a notice would be told at once (TurnEngine.heardAt takes no road for near) while the holder
    // in the view waited for word that never came (knownHolders). The map keeps the case from arising; this guards it.
    const s = newGame(1);
    const map = WorldMap.default;
    const cut: string[] = [];
    for (const court of map.landProvinces)
      for (const x of map.landProvinces) for (const t of [1, 2, 3]) if (!Number.isFinite(wordHomeAt(s, map, court.id, x.id, t))) cut.push(`${x.id} to ${court.id} in season ${t}`);
    Assert.equal("", cut.slice(0, 5).join(", "));
  });
});
