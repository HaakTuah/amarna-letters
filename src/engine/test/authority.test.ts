import { describe, test } from "vitest";
import {
  type Character,
  Dict,
  type GameState,
  OrderValidator,
  type PendingAudience,
  type Power,
  TurnEngine,
  type TurnSubmission,
  WorldMap,
  clause,
  dispatch,
  inboxOf,
  move,
  hold,
  newAudienceRecord,
  newAudienceRound,
  newAuthority,
  newEnvoyReaction,
  newGame,
  newGrant,
  newHostReply,
  newTabletProposal,
  newTurnSubmission,
  newUnit,
  repudiate,
  revoke,
  single,
  withinAuthority,
  type Authority,
  type HostReply,
} from "@amarna/engine";
import { Assert } from "./support.ts";

const Map = WorldMap.default;

// Build order item 9: envoy authority (the seal, its limits, credentials, repudiation) and passage and basing on sealed tablets.
describe("AuthorityTests", () => {
  /** Egypt's envoy, sent with this authority, stands before Alashiya's king. */
  function atAudience(authority: Authority | null): [GameState, TurnEngine, Character, PendingAudience] {
    const s = newGame(5);
    const envoy = s.characters.find((c) => c.employer === "Egypt")!;
    envoy.secretMaster = null;
    let e = new TurnEngine(s);
    e.beginTurn();
    e.resolve(new Dict([["Egypt", newTurnSubmission({ orders: [dispatch(envoy.id, "Alashiya", "Greetings, brother.", { authority })] })]]));
    while (s.audiences.length === 0) {
      e = new TurnEngine(s);
      e.beginTurn();
      if (s.audiences.length === 0) e.resolve(new Dict<Power, TurnSubmission>());
    }
    return [s, e, envoy, single(s.audiences)];
  }

  const answer = (a: PendingAudience, h: HostReply, seal: boolean) =>
    newAudienceRecord({ audienceId: a.id, delivered: "Greetings.", rounds: [newAudienceRound({ host: h, envoy: newEnvoyReaction({ speech: "So be it.", sealCounter: seal }) })] });

  test("An envoy with the seal seals the host's tablet in its king's name, within its authority, and passage is granted", () => {
    const [s, e, envoy, a] = atAudience(newAuthority({ seal: true, show: true, open: ["delta"] }));
    const view = e.buildAudienceView(a, "Greetings.", 0, [], 1);
    Assert.true(view.sealCarried);
    Assert.equal(["delta"], view.credentials!.open);
    const counter = newTabletProposal({ clauses: [clause("peace"), clause("askPassage", { province: "delta" })] });
    e.applyAudience(answer(a, newHostReply({ speech: "Seal this.", counter, end: true }), true));
    const t = s.tablets.find((x) => x.byHandOf === "Egypt")!;
    Assert.equal(envoy.name, t.byHand);
    Assert.true(t.within!);
    Assert.equal(["Alashiya", "Egypt"], t.seals);
    // The host holds a copy now; the envoy carries its king's home.
    Assert.true(s.copies.some((k) => k.holder === "Alashiya" && k.tabletId === t.id));
    Assert.true(single(s.journeys, (j) => j.kind === "EnvoyHomebound").cargo!.copyIds.includes(t.id));
    const g = single(s.grants);
    Assert.equal("Egypt", g.grantor);
    Assert.equal("Alashiya", g.grantee);
    Assert.equal("delta", g.province);
  });

  test("A tablet asking more gold or land than the limits is sealed beyond authority; without the seal none is sealed", () => {
    const [s, e, , a] = atAudience(newAuthority({ seal: true, maxGold: 50 }));
    e.applyAudience(answer(a, newHostReply({ counter: newTabletProposal({ clauses: [clause("askGold", { amount: 100 })] }), end: true }), true));
    Assert.false(s.tablets.find((x) => x.byHandOf === "Egypt")!.within!);
    Assert.true(withinAuthority([clause("askGold", { amount: 50 })], newAuthority({ seal: true, maxGold: 50 }), []));
    Assert.false(withinAuthority([clause("askCede", { province: "sinai" })], newAuthority({ seal: true, maxGold: 50 }), ["sinai"]));
    Assert.false(withinAuthority([clause("askPassage")], newAuthority({ seal: true, open: ["sinai"] }), ["sinai", "delta"]));

    const [s2, e2, , a2] = atAudience(null);
    e2.applyAudience(answer(a2, newHostReply({ counter: newTabletProposal({ clauses: [clause("peace")] }), end: true }), true));
    Assert.false(s2.tablets.some((x) => x.byHandOf !== null));
    Assert.true(s2.trails[s2.trails.length - 1].outcomes.some((o) => o.includes("could not seal")));
  });

  test("The envoy's king repudiates the tablet: what it granted ends, and the host is told", () => {
    const [s, e, , a] = atAudience(newAuthority({ seal: true, show: false }));
    e.applyAudience(answer(a, newHostReply({ counter: newTabletProposal({ clauses: [clause("askPassage", { province: "delta" })] }), end: true }), true));
    const t = s.tablets.find((x) => x.byHandOf === "Egypt")!;
    Assert.false(t.within!);
    // Egypt holds no copy until its envoy comes home: give it one, as the envoy would.
    s.copies.push({ id: "k-test", tabletId: t.id, holder: "Egypt", acquiredTurn: s.turn, source: "brought home", authResult: null });
    const v = new OrderValidator(s, Map).validate("Egypt", newTurnSubmission({ orders: [repudiate("k-test")] }));
    Assert.equal(1, v.accepted.length);
    new TurnEngine(s).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [repudiate("k-test")] })]]));
    Assert.equal(s.turn - 1, t.repudiatedTurn);
    Assert.notNull(single(s.grants).endedTurn);
    Assert.true(inboxOf(s, "Alashiya").some((i) => i.title === "A tablet repudiated"));
    // Once repudiated, never again.
    Assert.equal(0, new OrderValidator(s, Map).validate("Egypt", newTurnSubmission({ orders: [repudiate("k-test")] })).accepted.length);
  });

  test("A guest passing through takes no land; one that stays a season under passage alone takes it; basing lets it stay", () => {
    const s = newGame(7);
    s.units = s.units.filter((u) => !["nesa", "kizzuwatna", "tuwanuwa", "hattusa"].includes(u.province));
    s.units.push(newUnit({ id: "u-guest", power: "Egypt", kind: "Army", province: "kizzuwatna" }));
    s.owner.set("kizzuwatna", "Egypt");
    s.grants.push(newGrant({ id: "p1", kind: "passage", grantor: "Hatti", grantee: "Egypt", province: null, lands: ["tuwanuwa", "nesa", "hattusa", "sapinuwa"], sinceTurn: 0, tabletId: "t-x" }));
    s.turn = 3; // not winter: the pass costs nothing
    new TurnEngine(s).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [move("kizzuwatna", "tuwanuwa")] })]]));
    Assert.equal("tuwanuwa", s.units.find((u) => u.id === "u-guest")!.province);
    Assert.equal("Hatti", s.owner.get("tuwanuwa"));
    // Its entry is no invasion.
    Assert.false(s.invaded.tryGet("Hatti")?.has("Egypt") ?? false);
    // A season standing there under passage alone: it has overstayed, and takes the land.
    new TurnEngine(s).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [hold("tuwanuwa")] })]]));
    Assert.equal("Egypt", s.owner.get("tuwanuwa"));

    const b = newGame(7);
    b.units = b.units.filter((u) => !["tuwanuwa", "kizzuwatna", "tuwanuwa", "hattusa"].includes(u.province));
    b.units.push(newUnit({ id: "u-guest", power: "Egypt", kind: "Army", province: "tuwanuwa" }));
    b.grants.push(newGrant({ id: "p1", kind: "basing", grantor: "Hatti", grantee: "Egypt", province: "tuwanuwa", sinceTurn: 0, tabletId: "t-x" }));
    b.turn = 3;
    // Hatti holds the tablet's copy: it knows what it granted.
    b.copies.push({ id: "k-x", tabletId: "t-x", holder: "Hatti", acquiredTurn: 0, source: "sealed", authResult: null });
    for (let i = 0; i < 2; i++) new TurnEngine(b).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [hold("tuwanuwa")] })]]));
    Assert.equal("Hatti", b.owner.get("tuwanuwa"));
    // Revoked: from next season the guest takes the land if it stays.
    new TurnEngine(b).resolve(new Dict([["Hatti", newTurnSubmission({ orders: [revoke("Egypt")] })]]));
    Assert.equal("Hatti", b.owner.get("tuwanuwa"));
    Assert.true(inboxOf(b, "Egypt").some((i) => i.title === "Passage and basing"));
    new TurnEngine(b).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [hold("tuwanuwa")] })]]));
    Assert.equal("Egypt", b.owner.get("tuwanuwa"));
    // Nothing left to revoke.
    Assert.equal(0, new OrderValidator(b, Map).validate("Hatti", newTurnSubmission({ orders: [revoke("Egypt")] })).accepted.length);
  });

  test("Passage lets the grantee's travellers through land closed to them; closing the roads ends the grant", () => {
    const s = newGame(9);
    s.roadsClosed.set("Hatti", ["Egypt"]);
    s.grants.push(newGrant({ id: "p1", kind: "passage", grantor: "Hatti", grantee: "Egypt", province: null, lands: ["tuwanuwa", "nesa", "hattusa", "sapinuwa"], sinceTurn: 0, tabletId: "t-x" }));
    const e = new TurnEngine(s);
    const j = { kind: "EnvoyOutbound", from: "Egypt", to: "Mitanni" } as unknown as Parameters<TurnEngine["closedTo"]>[1];
    Assert.false(e.closedTo("Hatti", j, "nesa"));
    // Only in the land granted.
    Assert.true(e.closedTo("Hatti", j, "kizzuwatna"));
    s.roadsClosed.set("Hatti", []);
    e.roads("Hatti", { type: "roads", court: "Egypt", close: true });
    Assert.notNull(single(s.grants).endedTurn);
    Assert.true(e.closedTo("Hatti", j, "nesa"));
  });
});
