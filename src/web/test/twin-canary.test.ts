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
  revoke,
  roads,
  move,
  raise,
  sell,
  toll,
  welcome,
} from "@amarna/engine";
import { Assert, smallWorld } from "../../engine/test/support.ts";

/** A hidden fact, its world made with it true or false, and when word of it could have reached the seat. */
interface Twin {
  name: string;
  seat: Power;
  /** The small world, the fact true (it happened out of the seat's sight) or false. */
  make(fact: boolean): GameState;
  /** A fact that comes about later, after the seat's first orders set out: done in the true world during season `at`. */
  later?: { at: number; happen(s: GameState): void };
  /** The orders the seat gives each season: the same in both worlds, since it sees the same. */
  orders: Order[];
  /** Another king's orders in the first season, in the world where the fact is true: his doing is the fact. */
  others?: { power: Power; orders: Order[] };
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
  // The treasury's balance in its notice is `view.gold`'s, compared there: a known gold leak (#587) excuses only that.
  const notice = (i: { title: string; body: string }) => `${i.title}: ${i.body.replace(/The treasury now holds [^;]*;/, "The treasury now holds (as view.gold);")}`;
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
      const subs = new Dict([[t.seat, newTurnSubmission({ orders: structuredClone(t.orders), scheduled: s.turn === 1 ? structuredClone(t.scheduled ?? []) : [] })]]);
      if (s === worlds[0] && t.others !== undefined && s.turn === 1) subs.set(t.others.power, newTurnSubmission({ orders: structuredClone(t.others.orders) }));
      new TurnEngine(s).resolve(subs);
    }
  }
  return found;
}

/** A small world of seed 1, no catastrophes, with only these powers. */
const world = (...powers: Power[]): GameState => smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), ...powers);

/**
 * Nippur held by `p` from `turn`, its people favouring him, so that it stays his (a province answers to whom its people
 * favour, item 17++), as the log of holders has it.
 */
function holds(s: GameState, p: Power, turn: number): void {
  s.owner.set("nippur", p);
  s.ownerLog.push(newOwnerChange({ province: "nippur", turn, owner: p }));
  s.ledger.set("nippur", new Dict([[p, 5000]]));
}

/** Egypt holds Nippur, far from its court; in the twin where the fact is true, Babylonia takes it in the first season. */
const farLoss: Twin = {
  name: "a far province lost out of sight",
  seat: "Egypt",
  seasons: 6,
  make() {
    const s = world("Egypt", "Babylonia");
    holds(s, "Egypt", 0);
    return s;
  },
  later: { at: 1, happen: (s) => holds(s, "Babylonia", 1) },
  orders: [
    build("nippur", "Walls", 1, true),
    sell("nippur", 10),
    feed("nippur", 10),
    caravan("nippur", "babylon", 10),
    census("nippur"),
    demand("share", 10, "nippur"),
    toll(10, null, "nippur"),
    hunt("nippur"),
    welcome("nippur"),
    grant("Babylonia", "passage", "nippur"),
  ],
  heard: (s) => Views.knownHolders(s, map, "Egypt").get("nippur").owner !== "Egypt",
};

/** Egypt holds Nippur, far from its court; in the twin where the fact is true, a Babylonian army besieges it. */
const farSiege: Twin = {
  name: "a far province of the seat's besieged out of sight",
  seat: "Egypt",
  // Word from Nippur takes at least a season: the first two seasons' receipts must match.
  seasons: 2,
  make(fact) {
    const s = world("Egypt", "Babylonia");
    holds(s, "Egypt", 0);
    s.units = s.units.filter((u) => u.province !== "nippur");
    if (fact) {
      s.units.push(newUnit({ id: "u990", power: "Babylonia", kind: "Army", province: "nippur", home: "babylon", men: 3000 }));
      s.sieges.push(newSiege({ province: "nippur", power: "Babylonia", unitId: "u990", progress: 0, since: 1 }));
    }
    return s;
  },
  orders: [sell("nippur", 10), feed("nippur", 10), caravan("nippur", "babylon", 10), build("nippur", "Walls", 1, true)],
  heard: () => false,
};

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

/** In the twin where the fact is true, a Babylonian army stands in Nippur, out of Egypt's sight. */
const armyOutOfSight: Twin = {
  name: "an army out of sight",
  seat: "Egypt",
  seasons: 3,
  make(fact) {
    const s = world("Egypt", "Babylonia");
    s.units = s.units.filter((u) => u.province !== "nippur");
    if (fact) s.units.push(newUnit({ id: "u991", power: "Babylonia", kind: "Army", province: "nippur", home: "babylon", men: 4321 }));
    return s;
  },
  orders: [],
  heard: () => false,
};

/** As `farLoss`, but Nippur is lost in the second season, after the seat's first orders for it have set out. */
const lossAfterOrders: Twin = {
  ...farLoss,
  name: "a far province lost after orders for it set out",
  seasons: 8,
  later: { at: 2, happen: (s) => holds(s, "Babylonia", 2) },
};

/** As `farSiege`, but the siege begins in the second season, after the seat's first orders set out. */
const siegeAfterOrders: Twin = {
  ...farSiege,
  name: "a far siege begun after orders set out",
  seasons: 3,
  make(fact) {
    void fact;
    return farSiege.make(false);
  },
  later: {
    at: 2,
    happen(s) {
      s.units.push(newUnit({ id: "u990", power: "Babylonia", kind: "Army", province: "nippur", home: "babylon", men: 3000 }));
      s.sieges.push(newSiege({ province: "nippur", power: "Babylonia", unitId: "u990", progress: 0, since: 2 }));
    },
  },
};

/**
 * Leaks still open, each with its issue and the twins it may show in: a difference matching one there is not counted
 * here, and each must still be found, so the list shrinks as they are fixed. Question #587: what the treasury pays for far
 * off (a far caravan's porters, a far province's works paid in gold) leaves it before word of the order's outcome could
 * come, so its gold and the strength reckoned from it differ (the treasury notice's balance is compared as `view.gold`);
 * only in the twins whose orders spend far off, so no other leak of gold hides behind it.
 */
const SpendFar = ["a far province lost after orders for it set out", "a far siege begun after orders set out", "far works paid in gold, the province lost after orders set out", "far works paid in gold, a siege begun after orders set out"];
const Known: { issue: number; what: string; twins: string[]; is: (difference: string) => boolean }[] = [
  ...["strength", "gold"].map((k) => ({ issue: 587, what: `view.${k}`, twins: [...SpendFar, "a far levy that raised nothing"], is: (d: string) => d.startsWith(`view.${k}: `) })),
  // The pay of a far levy's army leaves the treasury at once, as the levy's price does (#587).
  { issue: 587, what: "the treasury notice's troops' pay", twins: ["a far levy that raised nothing"], is: (d: string) => /^only where (true|false): The treasury: .*Paid: your troops/.test(d) },
  // A far levy's army is shown at once, its upkeep counted and the orders waiting for it bound to it, before word of its
  // raising could come (#600, the far unit known by its reports).
  ...["units", "upkeep"].map((k) => ({ issue: 600, what: `view.${k} (a far levy's army)`, twins: ["a far levy that raised nothing"], is: (d: string) => d.startsWith(`view.${k}`) })),
  // Only the order named by its levy or by its army: an order missing from one twin's list is a leak of its own (#569).
  { issue: 600, what: "view.scheduled (a far levy's army)", twins: ["a far levy that raised nothing"], is: (d: string) => /^view\.scheduled: \[\{"turn":5,.* against \[\{"turn":5,/.test(d) },
];

/** Every difference a twin's seasons show, each with the known leak it is, if any. */
function found(t: Twin): { line: string; known: (typeof Known)[number] | undefined }[] {
  return play(t).map((x) => ({ line: x.line, known: Known.find((k) => k.twins.includes(t.name) && k.is(x.difference)) }));
}

/** A far city of Egypt's under a siege it has long known of; in the twin where the fact is true, the siege is lifted. */
const siegeLifted: Twin = {
  ...farSiege,
  name: "a far siege the seat knows of, lifted out of sight",
  seasons: 3,
  make() {
    const s = farSiege.make(true);
    s.sieges[0].since = -8;
    return s;
  },
  later: {
    at: 2,
    happen(s) {
      endSieges(s, WorldMap.default, (x) => x.province === "nippur");
      s.units = s.units.filter((u) => u.id !== "u990");
    },
  },
};

/** As `siegeLifted`, but in the twin where the fact is true the city falls to its besieger, its walls a level lower. */
const siegeFallen: Twin = {
  ...siegeLifted,
  name: "a far city of the seat's, under a siege it knows of, falling out of sight",
  seasons: 4,
  later: {
    at: 2,
    happen(s) {
      holds(s, "Babylonia", 2);
      endSieges(s, WorldMap.default, (x) => x.province === "nippur");
      s.walls.set("nippur", Math.max(0, (s.walls.tryGet("nippur") ?? 1) - 1));
    },
  },
  heard: farLoss.heard,
};

/** Far works paid in gold, not by corvée: the same twins, the treasury paying for what it builds far off. */
const goldWorks: Order[] = [build("nippur", "Walls", 2, false), build("nippur", "Roads", 1, false)];
const goldAfterLoss: Twin = { ...lossAfterOrders, name: "far works paid in gold, the province lost after orders set out", orders: goldWorks };
const goldAfterSiege: Twin = { ...siegeAfterOrders, name: "far works paid in gold, a siege begun after orders set out", orders: goldWorks };

/**
 * Egypt's king holds court at Nippur, far from his homeland (all of it beyond his sight); he schedules a levy in Nubia
 * and a march for the army it is to raise. In the twin where the fact is true, Nubia's men are gone (fled, or dead of plague) in the
 * levy's season, so it raises nothing.
 */
const levyUnraised: Twin = {
  name: "a far levy that raised nothing",
  seat: "Egypt",
  seasons: 8,
  make() {
    const s = world("Egypt", "Babylonia");
    holds(s, "Egypt", 0);
    s.court.set("Egypt", "nippur");
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
  heard: (s) => Views.knownHolders(s, map, "Egypt").get("nubia").turn >= 3,
};

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
    for (const holder of ["Egypt", "Babylonia"] as const) s.copies.push({ id: `k990${holder[0]}`, tabletId: "t990", holder, acquiredTurn: 0, source: "sealed by envoy", authResult: null, unread: null });
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
    for (const holder of ["Elam", "Libya"] as const) s.copies.push({ id: `k990${holder[0]}`, tabletId: "t990", holder, acquiredTurn: 0, source: "sealed by envoy", authResult: null, unread: null });
    s.grants.push(newGrant({ id: "p990", grantor: "Libya", grantee: "Elam", province: at, sinceTurn: 0, tabletId: "t990" }));
    s.sleep.tryAdd("Libya", newSleepState());
    return s;
  },
  others: { power: "Elam", orders: [repudiate("k990E")] },
  orders: [],
  scheduled: [newScheduledOrders({ turn: 2, orders: [revoke("Elam")] })],
  heard: (s) => (s.inbox.tryGet("Libya") ?? []).some((i) => i.title === "A tablet repudiated"),
};

const Twins = [farLoss, farSiege, deathAbroad, armyOutOfSight, lossAfterOrders, siegeAfterOrders, siegeLifted, siegeFallen, goldAfterLoss, goldAfterSiege, levyUnraised, grantGiven, grantRevoked, grantNarrowed, grantRoadsClosed, tabletRepudiated, grantRepudiatedByGrantee];

describe("TwinCanaryTests", () => {
  test.each(Twins)("A seat receives the same whether or not a hidden fact is true, until word of it can come: $name", (t) => {
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
