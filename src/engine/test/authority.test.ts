import { describe, test } from "vitest";
import {
  type Character,
  Dict,
  type GameState,
  OrderValidator,
  type PendingAudience,
  type RepudiateOrder,
  type RevokeOrder,
  newTablet,
  repudiationKnown,
  vassalBonds,
  type Power,
  TurnEngine,
  type TurnSubmission,
  Views,
  WorldMap,
  clause,
  dispatch,
  grant,
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
  ownedBy,
  repudiate,
  revoke,
  single,
  withinAuthority,
  type Authority,
  type HostReply,
} from "@amarna/engine";
import { cessionAgreed } from "../src/model/cession.ts";
import { Assert, smallWorld } from "./support.ts";

const Map = WorldMap.default;

// Build order item 9: envoy authority (the seal, its limits, credentials, repudiation) and passage and basing on sealed tablets.
describe("AuthorityTests", () => {
  /** Egypt's envoy, sent with this authority, stands before Alashiya's king. */
  function atAudience(authority: Authority | null): [GameState, TurnEngine, Character, PendingAudience] {
    const s = smallWorld(newGame(5), "Egypt", "Alashiya");
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

  test("The envoy's king repudiates the tablet: what it granted ends, and the host hears of it by word (bug #609)", () => {
    const [s, e, , a] = atAudience(newAuthority({ seal: true, show: false }));
    e.applyAudience(answer(a, newHostReply({ counter: newTabletProposal({ clauses: [clause("askPassage", { province: "delta" })] }), end: true }), true));
    const t = s.tablets.find((x) => x.byHandOf === "Egypt")!;
    Assert.false(t.within!);
    // Egypt holds no copy until its envoy comes home: give it one, as the envoy would.
    s.copies.push({ id: "k-test", tabletId: t.id, holder: "Egypt", acquiredTurn: s.turn, source: "brought home", authResult: null, unread: null });
    const v = new OrderValidator(s, Map).validate("Egypt", newTurnSubmission({ orders: [repudiate("k-test")] }));
    Assert.equal(1, v.accepted.length);
    // Repudiated in the season's resolution: read at once, before the season turns.
    new TurnEngine(s).repudiate("Egypt", repudiate("k-test") as RepudiateOrder);
    Assert.equal(s.turn, t.repudiatedTurn);
    Assert.notNull(single(s.grants).endedTurn);
    // Egypt knows at once; Alashiya keeps the tablet and its grant as they were, with no notice and no event, until the word comes.
    const host = () => Views.for(s, "Alashiya");
    const told = () => host().inbox.some((i) => i.title === "A tablet repudiated");
    Assert.equal(t.repudiatedTurn, Views.for(s, "Egypt").tablets.find((x) => x.tabletId === t.id)!.repudiatedTurn);
    Assert.empty(Views.for(s, "Egypt").grants);
    const heard = t.repudiatedHeard!;
    Assert.true(heard > s.turn);
    for (; s.turn < heard; new TurnEngine(s).beginTurn()) {
      Assert.false(told());
      Assert.null(host().tablets.find((x) => x.tabletId === t.id)!.repudiatedTurn);
      Assert.equal(1, host().grants.length);
      Assert.false(s.events.some((x) => x.kind === "tablet" && x.visibleTo.includes("Alashiya") && x.signal === "repudiated"));
      new TurnEngine(s).resolve(new Dict());
    }
    Assert.true(told());
    Assert.equal(t.repudiatedTurn, host().tablets.find((x) => x.tabletId === t.id)!.repudiatedTurn);
    Assert.empty(host().grants);
    // Once repudiated, never again.
    Assert.equal(0, new OrderValidator(s, Map).validate("Egypt", newTurnSubmission({ orders: [repudiate("k-test")] })).accepted.length);
  });

  test("A grant its grantee repudiated stands for its grantor until the word comes, and he may still revoke it (bug #609)", () => {
    const s = smallWorld(newGame(9), "Egypt", "Hatti");
    const t = newTablet({ id: "t990", text: "Passage for Egypt.", clauses: [clause("passage", { province: "nesa" })], proposedBy: "Hatti", partner: "Egypt", seals: ["Hatti", "Egypt"], sealedTurn: 0, byHandOf: "Egypt", byHand: "Ipy", within: false });
    s.tablets.push(t);
    for (const holder of ["Egypt", "Hatti"] as const) s.copies.push({ id: `k990${holder[0]}`, tabletId: "t990", holder, acquiredTurn: 0, source: "sealed by envoy", authResult: null, unread: null });
    s.grants.push(newGrant({ id: "p990", grantor: "Hatti", grantee: "Egypt", province: "nesa", sinceTurn: 0, tabletId: "t990" }));
    new TurnEngine(s).repudiate("Egypt", repudiate("k990E") as RepudiateOrder);
    const g = single(s.grants);
    Assert.equal("Egypt", g.endedBy);
    Assert.equal(t.repudiatedHeard, g.endHeard);
    Assert.true(g.endHeard > s.turn);
    Assert.empty(Views.for(s, "Egypt").grants);
    Assert.equal(1, Views.for(s, "Hatti").grants.length);
    // Hatti, not yet told, revokes it: the order stands, and from then Hatti knows it ended; it stays as Egypt ended it.
    Assert.equal(1, new OrderValidator(s, Map).validate("Hatti", newTurnSubmission({ orders: [revoke("Egypt")] })).accepted.length);
    const ended = g.endedTurn;
    new TurnEngine(s).revokeGrants("Hatti", revoke("Egypt") as RevokeOrder);
    Assert.equal(ended, g.endedTurn);
    Assert.equal("Egypt", g.endedBy);
    Assert.empty(Views.for(s, "Hatti").grants);
    Assert.true(s.events.some((e) => e.signal === "grant-revoked" && e.visibleTo.includes("Hatti")));
  });

  test("A cession and a vassal bond stand as the court knows the tablet: repudiated once word comes (bug #609)", () => {
    const t = newTablet({ id: "t991", proposedBy: "Hatti", partner: "Egypt", seals: ["Hatti", "Egypt"], sealedTurn: 0, byHandOf: "Egypt", clauses: [clause("askCede", { province: "memphis" })], repudiatedTurn: 3, repudiatedHeard: 5 });
    // Egypt, the repudiating king, knows at once; Hatti from season 5; a third court never.
    Assert.true(repudiationKnown(t, "Egypt", 3));
    Assert.false(repudiationKnown(t, "Hatti", 4));
    Assert.true(repudiationKnown(t, "Hatti", 5));
    Assert.false(repudiationKnown(t, "Babylonia", 9));
    Assert.false(cessionAgreed([t], "Egypt", "Hatti", "memphis", 3));
    const v = newTablet({ id: "t992", proposedBy: "Hatti", partner: "Egypt", seals: ["Hatti", "Egypt"], sealedTurn: 0, byHandOf: "Egypt", vassal: "Hatti", clauses: [clause("serve")], repudiatedTurn: 3, repudiatedHeard: 5 });
    Assert.empty(vassalBonds([v]));
    Assert.equal(1, vassalBonds([v], { p: "Hatti", turn: 4 }).length);
    Assert.empty(vassalBonds([v], { p: "Hatti", turn: 5 }));
    // A cession by Hatti on a tablet Egypt repudiated stands for Hatti until the word.
    const c = newTablet({ ...t, id: "t993", clauses: [clause("cede", { province: "nesa" })] });
    Assert.true(cessionAgreed([c], "Hatti", "Egypt", "nesa", 4));
    Assert.false(cessionAgreed([c], "Hatti", "Egypt", "nesa", 5));
  });

  test("A guest passing through takes no land; one that stays a season under passage alone takes it; basing lets it stay", () => {
    const s = smallWorld(newGame(7), "Egypt", "Hatti");
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
    // Item 17++: no guest now, its men weigh as any troops do; its people, indifferent to Hatti for the test, answer to
    // Egypt as the next season's reckoning finds it.
    Assert.equal("Hatti", s.owner.get("tuwanuwa"));
    s.ledger.set("tuwanuwa", new Dict());
    new TurnEngine(s).obeySeason();
    Assert.equal("Egypt", s.owner.get("tuwanuwa"));

    const b = smallWorld(newGame(7), "Egypt", "Hatti");
    b.units = b.units.filter((u) => !["tuwanuwa", "kizzuwatna", "tuwanuwa", "hattusa"].includes(u.province));
    b.units.push(newUnit({ id: "u-guest", power: "Egypt", kind: "Army", province: "tuwanuwa" }));
    b.grants.push(newGrant({ id: "p1", kind: "basing", grantor: "Hatti", grantee: "Egypt", province: "tuwanuwa", sinceTurn: 0, tabletId: "t-x" }));
    b.turn = 3;
    // Hatti holds the tablet's copy: it knows what it granted.
    b.copies.push({ id: "k-x", tabletId: "t-x", holder: "Hatti", acquiredTurn: 0, source: "sealed", authResult: null, unread: null });
    for (let i = 0; i < 2; i++) new TurnEngine(b).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [hold("tuwanuwa")] })]]));
    Assert.equal("Hatti", b.owner.get("tuwanuwa"));
    // Revoked: from next season the guest takes the land if it stays.
    new TurnEngine(b).resolve(new Dict([["Hatti", newTurnSubmission({ orders: [revoke("Egypt")] })]]));
    Assert.equal("Hatti", b.owner.get("tuwanuwa"));
    // Word of it travels to Egypt's court (the owner's answers to item 11a), never known there at once.
    Assert.false(inboxOf(b, "Egypt").some((i) => i.title === "Passage and basing"));
    Assert.true(b.journeys.some((j) => j.kind === "Word" && j.news === "Grant" && j.to === "Egypt"));
    new TurnEngine(b).resolve(new Dict([["Egypt", newTurnSubmission({ orders: [hold("tuwanuwa")] })]]));
    b.ledger.set("tuwanuwa", new Dict());
    new TurnEngine(b).obeySeason();
    Assert.equal("Egypt", b.owner.get("tuwanuwa"));
    // Nothing left to revoke.
    Assert.equal(0, new OrderValidator(b, Map).validate("Hatti", newTurnSubmission({ orders: [revoke("Egypt")] })).accepted.length);
  });

  test("Passage lets the grantee's travellers through land closed to them; closing the roads ends the grant", () => {
    const s = smallWorld(newGame(9), "Egypt", "Hatti", "Mitanni");
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

  test("A grant by order and its revocation reach the grantee's court by word, its notice and its view together (bug #565)", () => {
    const s = smallWorld(newGame(9), "Egypt", "Hatti");
    const grantee = () => Views.for(s, "Egypt");
    const told = () => grantee().inbox.some((i) => i.title === "Passage and basing");
    new TurnEngine(s).resolve(new Dict([["Hatti", newTurnSubmission({ orders: [grant("Egypt", "passage")] })]]));
    const heard = single(s.grants).heardTurn;
    Assert.true(heard > s.turn);
    // Nothing of it at Egypt's court until the word comes: no notice, no grant, no event.
    for (new TurnEngine(s).beginTurn(); s.turn < heard; new TurnEngine(s).beginTurn()) {
      Assert.false(told());
      Assert.empty(grantee().grants);
      new TurnEngine(s).resolve(new Dict());
    }
    Assert.true(told());
    Assert.equal(1, grantee().grants.length);
    Assert.false(s.events.some((e) => e.kind === "passage" && e.visibleTo.includes("Egypt")));
    // Revoked: the grant stands in Egypt's view until the word of its end comes, with its notice.
    new TurnEngine(s).resolve(new Dict([["Hatti", newTurnSubmission({ orders: [revoke("Egypt")] })]]));
    const ended = single(s.grants).endHeard;
    Assert.true(ended > s.turn);
    for (new TurnEngine(s).beginTurn(); s.turn < ended; new TurnEngine(s).beginTurn()) {
      Assert.equal(1, grantee().grants.length);
      new TurnEngine(s).resolve(new Dict());
    }
    Assert.empty(grantee().grants);
    Assert.true(grantee().inbox.some((i) => i.title === "Passage and basing" && i.body.includes("revoked")));
  });

  test("A passage narrowed by a revocation reads its land: the grantor's at once, the grantee's with the word (bug #611)", () => {
    const s = smallWorld(newGame(9), "Egypt", "Hatti");
    const lands = ownedBy(s, "Hatti").filter((x) => !Map.get(x).isSea);
    s.grants.push(newGrant({ id: "p990", grantor: "Hatti", grantee: "Egypt", lands, sinceTurn: 0 }));
    const read = (p: Power) => single(Views.for(s, p).grants).lands;
    Assert.equal(lands, read("Egypt"));
    new TurnEngine(s).resolve(new Dict([["Hatti", newTurnSubmission({ orders: [revoke("Egypt", "nesa")] })]]));
    const rest = lands.filter((x) => x !== "nesa");
    Assert.equal(rest, read("Hatti"));
    // The engine: Nesa is shut at once, the rest still open.
    Assert.null(new TurnEngine(s).grantCovers("Hatti", "Egypt", "nesa"));
    Assert.notNull(new TurnEngine(s).grantCovers("Hatti", "Egypt", rest[0]));
    const heard = s.grants.find((g) => g.id === "p990")!.endHeard;
    Assert.true(heard > s.turn);
    for (; s.turn < heard; new TurnEngine(s).beginTurn()) {
      Assert.equal(lands, read("Egypt"));
      new TurnEngine(s).resolve(new Dict());
    }
    Assert.equal(rest, read("Egypt"));
    Assert.equal(rest, read("Hatti"));
  });
});
