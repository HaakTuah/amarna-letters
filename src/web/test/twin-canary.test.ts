/**
 * The twin canary (#520, beside the token canary in canary.test.ts): one seat's seasons played twice from the same small
 * world, once with a hidden fact true and once false. Until word of the fact could reach the seat, everything it receives
 * (its view, which holds its notices and is a script king's whole input and what a model's requests are built from, and
 * the reasons it would be woken by) must be the same in both, whatever orders it gives. A difference is a leak, found
 * without listing its words beforehand.
 */
import { describe, test } from "vitest";
import {
  Dict,
  type GameState,
  type Order,
  type Power,
  SeatViewSchema,
  TurnEngine,
  Views,
  WorldMap,
  newGame,
  newGameConfig,
  newGrant,
  newTablet,
  repudiate,
  clause,
  ownedBy,
  newScheduledOrders,
  newSleepState,
  type ScheduledOrders,
  endSieges,
  newOwnerChange,
  newSiege,
  newUnit,
  newTurnSubmission,
  serialize,
  build,
  caravan,
  census,
  demand,
  feed,
  grant,
  hunt,
  hold,
  loseUnit,
  mandateOrder,
  move,
  newMandate,
  supply,
  support,
  relieve,
  revoke,
  roads,
  raise,
  sell,
  send,
  purchase,
  toll,
  welcome,
  hire,
  newCharacter,
  newTraits,
  wordHomeAt,
} from "@amarna/engine";
import { Assert, smallWorld } from "../../engine/test/support.ts";

/** A hidden fact, its world made with it true or false, and when word of it could have reached the seat. */
interface Twin {
  name: string;
  /** The far place the fact is at, for a twin played at each of them ({@link Places}); none for one bound to no place. */
  at?: Far;
  seat: Power;
  /** The small world, the fact true (it happened out of the seat's sight) or false. */
  make(fact: boolean): GameState;
  /** A fact that comes about later, after the seat's first orders set out: done in the true world during season `at`. */
  later?: { at: number; happen(s: GameState): void };
  /** The orders the seat gives each season, or in season `turn`: the same in both worlds, since it sees the same. */
  orders: Order[] | ((turn: number) => Order[]);
  /** Another king's orders in season `at` (the first, if none), in the world where the fact is true: his doing is the fact. */
  others?: { power: Power; orders: Order[]; at?: number };
  /** The orders the seat schedules in its first season, for later seasons. */
  scheduled?: ScheduledOrders[];
  /** Whether the seat could know the fact by now, in the world where it is true: the twins may differ from then. */
  heard(s: GameState): boolean;
  seasons: number;
}

const map = WorldMap.default;

const isDict = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** What differs between two seats' receipts: each view field that differs, each notice and event only one of them got. */
function differences(a: GameState, b: GameState, p: Power): string[] {
  const [va, vb] = [a, b].map((s) => JSON.parse(serialize(SeatViewSchema, Views.for(s, p))) as Record<string, unknown>);
  const out: string[] = [];
  const notice = (i: { title: string; body: string }) => `${i.title}: ${i.body}`;
  const [ia, ib] = [va, vb].map((v) => (v.inbox as { title: string; body: string }[]).map(notice));
  for (const x of ia.filter((x) => !ib.includes(x))) out.push(`only where true: ${x}`);
  for (const x of ib.filter((x) => !ia.includes(x))) out.push(`only where false: ${x}`);
  // A list of places is compared place by place, so a known difference at one place hides nothing at another.
  const place = (x: unknown): string => {
    const o = x as Record<string, unknown>;
    return String(o.province ?? o.from ?? JSON.stringify(x));
  };
  for (const k of Object.keys(va)) {
    if (k === "inbox" || JSON.stringify(va[k]) === JSON.stringify(vb[k])) continue;
    // Strength counts the treasury's gold: a difference that is not the gold's alone is told apart, so a known gold leak
    // (#587) excuses nothing else in it.
    if (k === "strength" && (va.strength as number) - (va.gold as number) !== (vb.strength as number) - (vb.gold as number)) {
      out.push(`view.strength beyond its gold: ${(va.strength as number) - (va.gold as number)} against ${(vb.strength as number) - (vb.gold as number)}`);
      continue;
    }
    const [la, lb] = [va[k], vb[k]];
    if (Array.isArray(la) && Array.isArray(lb) && [...la, ...lb].every((x) => typeof x === "object" && x !== null && ("province" in x || "from" in x))) {
      for (const at of new Set([...la, ...lb].map(place))) {
        const [xa, xb] = [la.filter((x) => place(x) === at), lb.filter((x) => place(x) === at)].map((l) => JSON.stringify(l));
        if (xa !== xb) out.push(`view.${k}[${at}]: ${xa.slice(0, 300)} against ${xb.slice(0, 300)}`);
      }
    } else if (isDict(la) && isDict(lb)) {
      // So is a dictionary by place, key by key.
      for (const at of new Set([...Object.keys(la), ...Object.keys(lb)])) {
        const [xa, xb] = [JSON.stringify(la[at] ?? null), JSON.stringify(lb[at] ?? null)];
        if (xa !== xb) out.push(`view.${k}[${at}]: ${xa.slice(0, 300)} against ${xb.slice(0, 300)}`);
      }
    } else out.push(`view.${k}: ${JSON.stringify(la).slice(0, 300)} against ${JSON.stringify(lb).slice(0, 300)}`);
  }
  // The events it may see, which the page lists in its season panel.
  const [ea, eb] = [a, b].map((s) => s.events.filter((e) => e.visibleTo.includes(p)).map((e) => `event: ${e.text}`));
  for (const x of ea.filter((x) => !eb.includes(x))) out.push(`only where true: ${x}`);
  for (const x of eb.filter((x) => !ea.includes(x))) out.push(`only where false: ${x}`);
  const [wa, wb] = [a, b].map((s) => JSON.stringify(s.sleep.tryGet(p)?.pendingWake ?? []));
  if (wa !== wb) out.push(`wake: ${wa} against ${wb}`);
  return out;
}

/** Plays both worlds season by season while the seat could not know the fact; returns every difference found. */
function play(t: Twin): { line: string; difference: string }[] {
  const worlds = [t.make(true), t.make(false)];
  const found: { line: string; difference: string }[] = [];
  for (let season = 0; season < t.seasons; season++) {
    for (const s of worlds) new TurnEngine(s).beginTurn();
    if (t.heard(worlds[0])) break;
    // A later fact comes about during the season, as a capture in its movement would, before its orders are carried out.
    if (t.later !== undefined && worlds[0].turn === t.later.at) t.later.happen(worlds[0]);
    for (const d of differences(worlds[0], worlds[1], t.seat)) found.push({ line: `season ${worlds[0].turn}, ${d}`, difference: d });
    for (const s of worlds) {
      const orders = typeof t.orders === "function" ? t.orders(s.turn) : t.orders;
      const subs = new Dict([[t.seat, newTurnSubmission({ orders: structuredClone(orders), scheduled: s.turn === 1 ? structuredClone(t.scheduled ?? []) : [] })]]);
      if (s === worlds[0] && t.others !== undefined && s.turn === (t.others.at ?? 1)) subs.set(t.others.power, newTurnSubmission({ orders: structuredClone(t.others.orders) }));
      new TurnEngine(s).resolve(subs);
    }
  }
  return found;
}

/**
 * A far province of the seat's where a hidden fact comes about, a parameter of every twin bound to a place (#566), so a
 * leak tied to one distance or road shows: `besieger` is the power that takes or besieges it, its army's home `home`,
 * and `market` a market a caravan from it goes to.
 */
interface Far {
  province: string;
  besieger: Power;
  home: string;
  market: string;
}

/**
 * The places each such twin is played at, as seen from Egypt's court at Akhetaten: Nippur, a season of couriers by
 * the roads; and Dilmun, Babylonia's island in the Gulf, two seasons off and reached only by sea.
 */
const Places: Far[] = [
  { province: "nippur", besieger: "Babylonia", home: "babylon", market: "babylon" },
  { province: "dilmun", besieger: "Babylonia", home: "ur", market: "ur" },
];

/** The season of the newest report `p` has of `province`: the twins may differ once it is of the fact's season. */
const reportOf = (s: GameState, p: Power, province: string): number => Views.knownHolders(s, map, p).get(province).turn;

/** A small world of seed 1, no catastrophes, with only these powers. */
const world = (...powers: Power[]): GameState => smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), ...powers);

/**
 * `province` held by `p` from `turn`, its people favouring him, so that it stays his (a province answers to whom its
 * people favour, item 17++), as the log of holders has it.
 */
function holds(s: GameState, province: string, p: Power, turn: number): void {
  s.owner.set(province, p);
  s.ownerLog.push(newOwnerChange({ province, turn, owner: p }));
  s.ledger.set(province, new Dict([[p, 5000]]));
}

/** Egypt holds the far place; in the twin where the fact is true, its besieger takes it in the first season. */
const farLoss = (f: Far): Twin => ({
  name: "a far province lost out of sight",
  at: f,
  seat: "Egypt",
  seasons: 6,
  make() {
    const s = world("Egypt", f.besieger);
    holds(s, f.province, "Egypt", 0);
    return s;
  },
  later: { at: 1, happen: (s) => holds(s, f.province, f.besieger, 1) },
  orders: [
    build(f.province, "Walls", 1, true),
    sell(f.province, 10),
    feed(f.province, 10),
    caravan(f.province, f.market, 10),
    census(f.province),
    demand("share", 10, f.province),
    toll(10, null, f.province),
    hunt(f.province),
    welcome(f.province),
    grant(f.besieger, "passage", f.province),
  ],
  heard: (s) => Views.knownHolders(s, map, "Egypt").get(f.province).owner !== "Egypt",
});

/** A siege of the far place by its besieger's army, begun in season `since`. */
function besiege(s: GameState, f: Far, since: number): void {
  s.units.push(newUnit({ id: "u990", power: f.besieger, kind: "Army", province: f.province, home: f.home, men: 3000 }));
  s.sieges.push(newSiege({ province: f.province, power: f.besieger, unitId: "u990", progress: 0, since }));
}

/** Egypt holds the far place; in the twin where the fact is true, its besieger's army besieges it. */
const farSiege = (f: Far): Twin => ({
  name: "a far province of the seat's besieged out of sight",
  at: f,
  seat: "Egypt",
  seasons: 6,
  make(fact) {
    const s = world("Egypt", f.besieger);
    holds(s, f.province, "Egypt", 0);
    s.units = s.units.filter((u) => u.province !== f.province);
    if (fact) besiege(s, f, 1);
    return s;
  },
  orders: [sell(f.province, 10), feed(f.province, 10), caravan(f.province, f.market, 10), build(f.province, "Walls", 1, true)],
  // Once a report of the siege's first season has come.
  heard: (s) => reportOf(s, "Egypt", f.province) >= 1,
});

/**
 * One of Egypt's spies is posted at Babylon's court; in the twin where the fact is true, he dies there in the second
 * season, the engine freezing what Egypt believes of him first, as it does for every servant something befalls abroad.
 */
const deathAbroad: Twin = {
  name: "a death abroad",
  seat: "Egypt",
  seasons: 3,
  make() {
    const s = world("Egypt", "Babylonia");
    const c = s.characters.find((x) => x.employer === "Egypt" && x.status === "Employed" && x.at === "Egypt")!;
    c.at = "Babylonia";
    c.duty = "SpyPosted";
    return s;
  },
  later: {
    at: 2,
    happen(s) {
      const c = s.characters.find((x) => x.employer === "Egypt" && x.duty === "SpyPosted")!;
      new TurnEngine(s).coverFor(c, "Egypt", "SpyPosted");
      c.status = "Dead";
    },
  },
  orders: [],
  heard: () => false,
};

/** In the twin where the fact is true, an army of the far place's besieger stands there, out of Egypt's sight. */
const armyOutOfSight = (f: Far): Twin => ({
  name: "an army out of sight",
  at: f,
  seat: "Egypt",
  seasons: 3,
  make(fact) {
    const s = world("Egypt", f.besieger);
    s.units = s.units.filter((u) => u.province !== f.province);
    if (fact) s.units.push(newUnit({ id: "u991", power: f.besieger, kind: "Army", province: f.province, home: f.home, men: 4321 }));
    return s;
  },
  orders: [],
  heard: () => false,
});

/** As `farLoss`, but the place is lost in the second season, after the seat's first orders for it have set out. */
const lossAfterOrders = (f: Far): Twin => ({
  ...farLoss(f),
  name: "a far province lost after orders for it set out",
  seasons: 8,
  later: { at: 2, happen: (s) => holds(s, f.province, f.besieger, 2) },
});

/** As `farSiege`, but the siege begins in the second season, after the seat's first orders set out. */
const siegeAfterOrders = (f: Far): Twin => ({
  ...farSiege(f),
  name: "a far siege begun after orders set out",
  make: () => farSiege(f).make(false),
  later: { at: 2, happen: (s) => besiege(s, f, 2) },
  heard: (s) => reportOf(s, "Egypt", f.province) >= 2,
});

/**
 * Leaks still open, each with its issue and the twins it may show in: a difference matching one there is not counted
 * here, and each must still be found, so the list shrinks as they are fixed.
 */
const Known: { issue: number; what: string; twins: string[]; is: (difference: string) => boolean }[] = [
];

/** Every difference a twin's seasons show, each with the known leak it is, if any. */
function found(t: Twin): { line: string; known: (typeof Known)[number] | undefined }[] {
  return play(t).map((x) => ({ line: x.line, known: Known.find((k) => k.twins.includes(t.name) && k.is(x.difference)) }));
}

/** A far city of Egypt's under a siege it has long known of; in the twin where the fact is true, the siege is lifted. */
const siegeLifted = (f: Far): Twin => ({
  ...farSiege(f),
  name: "a far siege the seat knows of, lifted out of sight",
  make() {
    const s = farSiege(f).make(true);
    s.sieges[0].since = -8;
    return s;
  },
  later: {
    at: 2,
    happen(s) {
      endSieges(s, WorldMap.default, (x) => x.province === f.province);
      s.units = s.units.filter((u) => u.id !== "u990");
    },
  },
  heard: (s) => reportOf(s, "Egypt", f.province) >= 2,
});

/** As `siegeLifted`, but in the twin where the fact is true the city falls to its besieger, its walls a level lower. */
const siegeFallen = (f: Far): Twin => ({
  ...siegeLifted(f),
  name: "a far city of the seat's, under a siege it knows of, falling out of sight",
  later: {
    at: 2,
    happen(s) {
      holds(s, f.province, f.besieger, 2);
      endSieges(s, WorldMap.default, (x) => x.province === f.province);
      s.walls.set(f.province, Math.max(0, (s.walls.tryGet(f.province) ?? 1) - 1));
    },
  },
  heard: farLoss(f).heard,
});

/** Far works paid in gold, not by corvée: the same twins, the treasury paying for what it builds far off. */
const goldWorks = (f: Far): Order[] => [build(f.province, "Walls", 2, false), build(f.province, "Roads", 1, false)];
const goldAfterLoss = (f: Far): Twin => ({ ...lossAfterOrders(f), name: "far works paid in gold, the province lost after orders set out", orders: goldWorks(f) });
const goldAfterSiege = (f: Far): Twin => ({ ...siegeAfterOrders(f), name: "far works paid in gold, a siege begun after orders set out", orders: goldWorks(f) });
/** #587: gold sent ahead to the far place's coffer, and grain sold and bought at its market from it, each season. */
const coffer = (f: Far): Order[] => [send(f.province, 30), sell(f.province, 10), purchase(f.province, 10)];
const cofferAfterLoss = (f: Far): Twin => ({ ...lossAfterOrders(f), name: "gold sent ahead and a far market's trades, the province lost after orders set out", orders: coffer(f) });
const cofferAfterSiege = (f: Far): Twin => ({ ...siegeAfterOrders(f), name: "gold sent ahead and a far market's trades, a siege begun after orders set out", orders: coffer(f) });

/**
 * Egypt's king holds court at the far place, far from his homeland (all of it beyond his sight); he schedules a levy in
 * Nubia and a march for the army it is to raise. In the twin where the fact is true, Nubia's men are gone (fled, or dead
 * of plague) in the levy's season, so it raises nothing.
 */
const levyUnraised = (f: Far): Twin => ({
  name: "a far levy that raised nothing",
  at: f,
  seat: "Egypt",
  seasons: 8,
  make() {
    const s = world("Egypt", f.besieger);
    holds(s, f.province, "Egypt", 0);
    s.court.set("Egypt", f.province);
    s.units = s.units.filter((u) => u.province !== "nubia");
    s.sleep.tryAdd("Egypt", newSleepState());
    return s;
  },
  later: {
    at: 3,
    happen(s) {
      s.people.get("nubia").men = 0;
    },
  },
  orders: [],
  scheduled: [newScheduledOrders({ turn: 3, orders: [raise("nubia", "Army")] }), newScheduledOrders({ turn: 5, orders: [move("nubia", "thebes")] })],
  // Once word of the levy's season in Nubia has come: its report and the levy's own notice, which come together (#616).
  heard: (s) => reportOf(s, "Egypt", "nubia") >= 3,
});

/** Egypt and Babylonia, Babylonia the seat; in the twin where the fact is true, Egypt grants it passage by order. */
const grantGiven: Twin = {
  name: "a grant by order",
  seat: "Babylonia",
  seasons: 6,
  make: () => world("Egypt", "Babylonia"),
  others: { power: "Egypt", orders: [grant("Babylonia", "passage")] },
  orders: [],
  // Once word of it, or of its end, has reached Babylon: by its notice, or the closed roads'.
  heard: (s) => (s.inbox.tryGet("Babylonia") ?? []).some((i) => i.title === "Passage and basing" || i.title === "Roads"),
};

/** As `grantGiven`, but Babylonia has long known of Egypt's passage through all its land, and Egypt revokes it. */
const grantRevoked: Twin = {
  ...grantGiven,
  name: "a grant revoked",
  make() {
    const s = world("Egypt", "Babylonia");
    s.grants.push(newGrant({ id: "p990", grantor: "Egypt", grantee: "Babylonia", lands: ownedBy(s, "Egypt"), sinceTurn: 0 }));
    return s;
  },
  others: { power: "Egypt", orders: [revoke("Babylonia")] },
};

/** As `grantRevoked`, but Egypt revokes the passage in one province only. */
const grantNarrowed: Twin = { ...grantRevoked, name: "a grant narrowed by a revocation", others: { power: "Egypt", orders: [revoke("Babylonia", "memphis")] } };

/** As `grantRevoked`, but Egypt closes its roads to Babylonia's people, which ends what it granted. */
const grantRoadsClosed: Twin = { ...grantRevoked, name: "a grant ended by closed roads", others: { power: "Egypt", orders: [roads("Babylonia", true)] } };

/**
 * As `grantGiven`, but Babylonia has long held a tablet Egypt's envoy sealed in its name, granting Babylonia passage
 * through the delta, and Egypt repudiates it (bug #609).
 */
const tabletRepudiated: Twin = {
  ...grantGiven,
  name: "a tablet repudiated",
  make() {
    const s = world("Egypt", "Babylonia");
    s.tablets.push(
      newTablet({ id: "t990", text: "Passage through the delta.", clauses: [clause("askPassage", { province: "delta" })], proposedBy: "Babylonia", partner: "Egypt", seals: ["Babylonia", "Egypt"], sealedTurn: 0, byHandOf: "Egypt", byHand: "Ipy", within: false }),
    );
    for (const holder of ["Egypt", "Babylonia"] as const) s.copies.push({ id: `k990${holder[0]}`, tabletId: "t990", holder, acquiredTurn: 0, source: "sealed by envoy", authResult: null, authTurn: 0, unread: null });
    s.grants.push(newGrant({ id: "p990", grantor: "Egypt", grantee: "Babylonia", province: "delta", sinceTurn: 0, tabletId: "t990" }));
    return s;
  },
  others: { power: "Egypt", orders: [repudiate("k990E")] },
  heard: (s) => (s.inbox.tryGet("Babylonia") ?? []).some((i) => i.title === "A tablet repudiated"),
};

/**
 * A grant its grantee ended by repudiation, which its grantor, not yet told, revokes (bug #609, Codex's find): Libya
 * granted Elam passage on a tablet Elam's envoy sealed, Elam repudiates it, and Libya revokes the grant in its second
 * season. Elam and Libya lie three seasons apart, so the revocation's outcome comes before the word (a revocation
 * resolves before a repudiation in the same season).
 */
const grantRepudiatedByGrantee: Twin = {
  name: "a grant its grantee repudiated, revoked before word comes",
  seat: "Libya",
  seasons: 6,
  make() {
    const s = world("Elam", "Libya");
    const at = ownedBy(s, "Libya").find((x) => !map.get(x).isSea)!;
    s.tablets.push(
      newTablet({ id: "t990", text: "Passage for Elam.", clauses: [clause("passage", { province: at })], proposedBy: "Libya", partner: "Elam", seals: ["Libya", "Elam"], sealedTurn: 0, byHandOf: "Elam", byHand: "Kutir", within: false }),
    );
    for (const holder of ["Elam", "Libya"] as const) s.copies.push({ id: `k990${holder[0]}`, tabletId: "t990", holder, acquiredTurn: 0, source: "sealed by envoy", authResult: null, authTurn: 0, unread: null });
    s.grants.push(newGrant({ id: "p990", grantor: "Libya", grantee: "Elam", province: at, sinceTurn: 0, tabletId: "t990" }));
    s.sleep.tryAdd("Libya", newSleepState());
    return s;
  },
  others: { power: "Elam", orders: [repudiate("k990E")] },
  orders: [],
  scheduled: [newScheduledOrders({ turn: 2, orders: [revoke("Elam")] })],
  heard: (s) => (s.inbox.tryGet("Libya") ?? []).some((i) => i.title === "A tablet repudiated"),
};

/**
 * Egypt hires a rider at its court to bring the far place's report home in the first season (#601); in the twin where
 * the fact is true, its besieger takes it in the second, after he rode. His report is of the first season: it tells
 * nothing of the second.
 */
const rideBeforeLoss = (f: Far): Twin => ({
  ...farLoss(f),
  name: "a far province lost after a rider brought its report",
  make() {
    const s = farLoss(f).make(true);
    for (const x of s.characters) if (x.status === "Free" && x.at === "Egypt") x.at = "Babylonia";
    s.characters.push(newCharacter({ id: "c990", name: "Ahmose", status: "Free", at: "Egypt", traits: newTraits({ loyalty: 60, greed: 40, ambition: 30, courage: 50, competence: 50 }), tongues: new Dict([["Egyptian", 100]]) }));
    return s;
  },
  later: { at: 2, happen: (s) => holds(s, f.province, f.besieger, 2) },
  orders: [hire("c990", 500, 1, 500, { what: "ride", where: f.province })],
});

/**
 * Babylonia, sworn to Egypt in alliance, sees Ashur beside its land; in the twin where the fact is true, Ashur passes to
 * Elam in the first season. Babylonia's word of it sets out at the season's end and comes by the road (#618): Egypt may
 * learn of it then, or by word from Ashur itself, never before.
 */
const allyWord: Twin = {
  name: "land changing hands that an ally saw",
  seat: "Egypt",
  seasons: 6,
  make() {
    const s = world("Egypt", "Babylonia", "Elam");
    s.tablets.push(newTablet({ id: "t990", text: "Let us be allies.", clauses: [clause("alliance")], proposedBy: "Babylonia", partner: "Egypt", seals: ["Babylonia", "Egypt"], sealedTurn: 0, allianceOath: true }));
    for (const holder of ["Egypt", "Babylonia"] as const) s.copies.push({ id: `k990${holder[0]}`, tabletId: "t990", holder, acquiredTurn: 0, source: "sealed", authResult: null, authTurn: 0, unread: null });
    return s;
  },
  later: {
    at: 1,
    happen(s) {
      s.owner.set("ashur", "Elam");
      s.ownerLog.push(newOwnerChange({ province: "ashur", turn: 1, owner: "Elam" }));
      s.ledger.set("ashur", new Dict([["Elam", 5000]]));
    },
  },
  orders: [],
  // Babylonia's word (`heardAt` from its court), or word from Ashur of the first season (`knownHolders`).
  heard: (s) => s.turn >= 1 + 1 + new TurnEngine(s).wordFrom("Egypt", "babylon") || wordHomeAt(s, map, new TurnEngine(s).courtAt("Egypt"), "ashur", 1) <= s.turn,
};

/**
 * Egypt holds Nippur, far from its court, with an army there; Babylonian armies stand beside it in both twins. In the twin
 * where the fact is true, they attack it in the second season, once its reports have begun, and beat it: it is destroyed,
 * or falls back, out of Egypt's sight.
 */
const farUnitBeaten: Twin = {
  name: "a far army beaten out of sight",
  seat: "Egypt",
  seasons: 6,
  make() {
    const s = world("Egypt", "Babylonia");
    holds(s, "nippur", "Egypt", 0);
    s.units = s.units.filter((u) => !["nippur", "babylon", "durkurigalzu"].includes(u.province));
    // Commanded by one of Egypt's own, whom Egypt believes in command until word comes.
    const c = s.characters.find((x) => x.employer === "Egypt" && x.status === "Employed" && x.at === "Egypt")!;
    c.at = null;
    c.duty = "Commanding";
    c.watchProvince = "nippur";
    s.units.push(newUnit({ id: "u990", power: "Egypt", kind: "Army", province: "nippur", home: "thebes", men: 1000, commander: c.id }));
    for (const [id, at] of [["u991", "babylon"], ["u992", "durkurigalzu"]]) s.units.push(newUnit({ id, power: "Babylonia", kind: "Army", province: at, home: at, men: 6000 }));
    return s;
  },
  others: { power: "Babylonia", orders: [move("babylon", "nippur"), support("durkurigalzu", "babylon", "nippur")], at: 2 },
  // Its king orders the army every season: an order for it rides out, and finds it gone only where it arrives.
  orders: [hold("nippur"), supply("nippur", true)],
  // Once word of the battle, fought in the second season, could reach Egypt's court by the road home from Nippur.
  heard: (s) => wordHomeAt(s, map, new TurnEngine(s).courtAt("Egypt"), "nippur", 2) <= s.turn,
};

/**
 * Egypt's king holds court at Nippur, two seasons of couriers out to Nubia and one home, where his army stands under one of his own. In the
 * twin where the fact is true, it is lost out of his sight (to mutiny or plague) as the second season begins; that season
 * his only order takes back its command, as for one that stands (bug #600).
 */
const farUnitRelieved: Twin = {
  name: "a far army lost out of sight, its command taken back",
  seat: "Egypt",
  seasons: 6,
  make() {
    const s = world("Egypt", "Babylonia");
    holds(s, "nippur", "Egypt", 0);
    s.court.set("Egypt", "nippur");
    s.units = s.units.filter((u) => u.province !== "nubia");
    const c = s.characters.find((x) => x.employer === "Egypt" && x.status === "Employed" && x.at === "Egypt")!;
    c.at = null;
    c.duty = "Commanding";
    c.watchProvince = "nubia";
    s.units.push(newUnit({ id: "u990", power: "Egypt", kind: "Army", province: "nubia", home: "thebes", men: 1000, commander: c.id }));
    return s;
  },
  later: { at: 2, happen: (s) => loseUnit(s, s.units.find((u) => u.id === "u990")!) },
  orders: (turn) => (turn === 2 ? [relieve("nubia")] : []),
  // Once word of its end could come: a season, and the road home from Nubia (#616's `wordFrom`), after it.
  heard: (s) => s.turn >= 2 + 1 + new TurnEngine(s).wordFrom("Egypt", "nubia"),
};

/** As `farUnitRelieved`, but the king's only order gives the army a mandate. */
const farUnitMandated: Twin = { ...farUnitRelieved, name: "a far army lost out of sight, given a mandate", orders: (turn) => (turn === 2 ? [mandateOrder("nubia", newMandate({ task: "guard" }))] : []) };

/**
 * As `farUnitRelieved`, but the army stands, and none in Thebes: in the twin where the fact is true, it marches down to
 * Thebes, out of its king's sight, as the second season begins (on its commander's word), while that season its king takes
 * back its command, gives it a mandate and orders its food where his reports place it (bug #615).
 */
const farUnitMoved: Twin = {
  ...farUnitRelieved,
  name: "a far army moved out of sight",
  make() {
    const s = farUnitRelieved.make(true);
    s.units = s.units.filter((u) => u.province !== "thebes");
    return s;
  },
  later: { at: 2, happen: (s) => void (s.units.find((u) => u.id === "u990")!.province = "thebes") },
  orders: (turn) => (turn === 2 ? [relieve("nubia"), mandateOrder("nubia", newMandate({ task: "guard" })), supply("nubia", true)] : []),
};

/**
 * As `farUnitRelieved`, but the army stands, and a fleet of Egypt's lies in the Red Sea, far from its court: in the twin
 * where the fact is true, the fleet's food and gold spoil out of sight as the second season begins, and at sea, with
 * nothing to take and its king's stores kept from it, it goes hungry (bug #615).
 */
const farUnitHungry: Twin = {
  ...farUnitRelieved,
  name: "a far fleet gone hungry out of sight",
  make() {
    const s = farUnitRelieved.make(true);
    s.units = s.units.filter((u) => u.province !== "redsea");
    s.units.push(newUnit({ id: "u989", power: "Egypt", kind: "Fleet", province: "redsea", home: "thebes", men: 400, food: 40, savings: 40, chest: 20 }));
    // Its king's standing order keeps his stores from it: it eats what it carries.
    s.upkeep.set("Egypt", { pay: true, feed: true, payExcept: [], feedExcept: ["u989"] });
    return s;
  },
  later: {
    at: 2,
    happen: (s) => {
      const u = s.units.find((x) => x.id === "u989")!;
      [u.food, u.chest, u.savings] = [0, 0, 0];
    },
  },
  orders: [],
  heard: (s) => s.turn >= 2 + 1 + new TurnEngine(s).wordFrom("Egypt", "redsea"),
};

/**
 * As `farUnitRelieved`, but the army stands, under a march its king scheduled in the first season (to Thebes in the third):
 * in the twin where the fact is true, Babylonian troops stand in Thebes, out of his sight, as the march is due, and stop it
 * (bug #615).
 */
const farMarchStopped: Twin = {
  ...farUnitRelieved,
  name: "a far army's scheduled march stopped out of sight",
  make() {
    const s = farUnitRelieved.make(true);
    s.units = s.units.filter((u) => u.province !== "thebes");
    s.sleep.tryAdd("Egypt", newSleepState());
    return s;
  },
  later: { at: 3, happen: (s) => void s.units.push(newUnit({ id: "u995", power: "Babylonia", kind: "Army", province: "thebes", home: "babylon", men: 6000 })) },
  orders: [],
  scheduled: [newScheduledOrders({ turn: 3, orders: [move("nubia", "thebes")] }), newScheduledOrders({ turn: 5, orders: [hold("thebes")] })],
  heard: (s) => s.turn >= 3 + 1 + new TurnEngine(s).wordFrom("Egypt", "nubia"),
};

/**
 * As `farUnitMoved`, but its king scheduled in the first season a march from Kush to Thebes for the third: in the twin
 * where the fact is true, the army already stands in Thebes when the order comes due, and it is refused there (#759).
 */
const farOrderRefused: Twin = {
  ...farMarchStopped,
  name: "a far army's scheduled order refused where it truly stands",
  later: { at: 2, happen: (s) => void (s.units.find((u) => u.id === "u990")!.province = "thebes") },
  scheduled: [newScheduledOrders({ turn: 3, orders: [move("nubia", "thebes")] })],
  heard: (s) => s.turn >= 2 + 1 + new TurnEngine(s).wordFrom("Egypt", "nubia"),
};

/** The twins bound to a far place, each played at every one of {@link Places}. */
const AtPlaces = [farLoss, farSiege, armyOutOfSight, lossAfterOrders, siegeAfterOrders, siegeLifted, siegeFallen, goldAfterLoss, goldAfterSiege, cofferAfterLoss, cofferAfterSiege, levyUnraised, rideBeforeLoss];
const Twins = [...AtPlaces.flatMap((twin) => Places.map(twin)), deathAbroad, grantGiven, grantRevoked, grantNarrowed, grantRoadsClosed, tabletRepudiated, grantRepudiatedByGrantee, allyWord, farUnitBeaten, farUnitRelieved, farUnitMandated, farUnitMoved, farUnitHungry, farMarchStopped, farOrderRefused];

describe("TwinCanaryTests", () => {
  const named = Twins.map((t) => ({ ...t, where: t.at === undefined ? "" : `, at ${t.at.province}` }));
  test.each(named)("A seat receives the same whether or not a hidden fact is true, until word of it can come: $name$where", (t) => {
    // The setup holds: the fact is out of the seat's sight at the start.
    Assert.false(t.heard(t.make(true)));
    Assert.equal(
      "",
      found(t)
        .filter((x) => x.known === undefined)
        .map((x) => x.line)
        .join("\n"),
    );
  });

  test("Every leak still listed as known is still found: one fixed is taken off the list", () => {
    const seen = new Set(Twins.flatMap((t) => found(t).map((x) => x.known?.what)));
    Assert.equal("", Known.filter((k) => !seen.has(k.what)).map((k) => `#${k.issue} ${k.what}`).join(", "));
  });
});
