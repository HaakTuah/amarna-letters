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
  /** A fact that comes about later, after the seat's first orders set out: done in the true world as season `at` begins. */
  later?: { at: number; happen(s: GameState): void };
  /** The orders the seat gives each season: the same in both worlds, since it sees the same. */
  orders: Order[];
  /** Whether the seat could know the fact by now, in the world where it is true: the twins may differ from then. */
  heard(s: GameState): boolean;
  seasons: number;
}

const map = WorldMap.default;

/** What differs between two seats' receipts: each view field that differs, and each notice only one of them got. */
function differences(a: GameState, b: GameState, p: Power): string[] {
  const [va, vb] = [a, b].map((s) => JSON.parse(serialize(SeatViewSchema, Views.for(s, p))) as Record<string, unknown>);
  const out: string[] = [];
  const notice = (i: { title: string; body: string }) => `${i.title}: ${i.body}`;
  const [ia, ib] = [va, vb].map((v) => (v.inbox as { title: string; body: string }[]).map(notice));
  for (const x of ia.filter((x) => !ib.includes(x))) out.push(`only where true: ${x}`);
  for (const x of ib.filter((x) => !ia.includes(x))) out.push(`only where false: ${x}`);
  for (const k of Object.keys(va)) if (k !== "inbox" && JSON.stringify(va[k]) !== JSON.stringify(vb[k])) out.push(`view.${k}: ${JSON.stringify(va[k]).slice(0, 300)} against ${JSON.stringify(vb[k]).slice(0, 300)}`);
  const [wa, wb] = [a, b].map((s) => JSON.stringify(s.sleep.tryGet(p)?.pendingWake ?? []));
  if (wa !== wb) out.push(`wake: ${wa} against ${wb}`);
  return out;
}

/** Plays both worlds season by season while the seat could not know the fact; returns every difference found. */
function play(t: Twin): { line: string; difference: string }[] {
  const worlds = [t.make(true), t.make(false)];
  const found: { line: string; difference: string }[] = [];
  for (let season = 0; season < t.seasons; season++) {
    if (t.later !== undefined && worlds[0].turn === t.later.at) t.later.happen(worlds[0]);
    for (const s of worlds) new TurnEngine(s).beginTurn();
    if (t.heard(worlds[0])) break;
    for (const d of differences(worlds[0], worlds[1], t.seat)) found.push({ line: `season ${worlds[0].turn}, ${d}`, difference: d });
    for (const s of worlds) new TurnEngine(s).resolve(new Dict([[t.seat, newTurnSubmission({ orders: structuredClone(t.orders) })]]));
  }
  return found;
}

/** A small world of seed 1, no catastrophes, with only these powers. */
const world = (...powers: Power[]): GameState => smallWorld(newGame(1, newGameConfig({ catastropheChance: 0 })), ...powers);

/** Egypt holds Nippur, far from its court; in the twin where the fact is true, Babylonia took it in the first season. */
const farLoss: Twin = {
  name: "a far province lost out of sight",
  seat: "Egypt",
  seasons: 6,
  make(fact) {
    const s = world("Egypt", "Babylonia");
    s.owner.set("nippur", "Egypt");
    s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
    if (fact) {
      s.owner.set("nippur", "Babylonia");
      s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 1, owner: "Babylonia" }));
    }
    return s;
  },
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
    s.owner.set("nippur", "Egypt");
    s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 0, owner: "Egypt" }));
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
  make(fact) {
    void fact;
    return farLoss.make(false);
  },
  later: {
    at: 2,
    happen(s) {
      s.owner.set("nippur", "Babylonia");
      s.ownerLog.push(newOwnerChange({ province: "nippur", turn: 2, owner: "Babylonia" }));
    },
  },
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
 * Leaks still open, each with its issue: a difference matching one is not counted here, and each must still be found, so
 * the list shrinks as they are fixed. Bug #540: a far province's economy, works, people and caravans, and the realm's
 * totals, are shown as they are, not as last reported.
 */
const Known: { issue: number; what: string; is: (difference: string) => boolean }[] = [
  ...["provinces", "works", "caravans", "strength", "gold"].map((k) => ({ issue: 540, what: `view.${k}`, is: (d: string) => d.startsWith(`view.${k}: `) })),
  { issue: 540, what: "the treasury notice", is: (d) => /^only where (true|false): The treasury: /.test(d) },
  { issue: 540, what: "the works notice", is: (d) => /^only where (true|false): Works: What you keep and build cost /.test(d) },
  { issue: 540, what: "people moving", is: (d) => /^only where (true|false): People: .* fled /.test(d) },
  { issue: 540, what: "a caravan's arrival", is: (d) => /^only where (true|false): Markets and caravans: Your caravan reached /.test(d) },
];

/** Every difference a twin's seasons show, each with the known leak it is, if any. */
function found(t: Twin): { line: string; known: (typeof Known)[number] | undefined }[] {
  return play(t).map((x) => ({ line: x.line, known: Known.find((k) => k.is(x.difference)) }));
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
      endSieges(s, (x) => x.province === "nippur");
      s.units = s.units.filter((u) => u.id !== "u990");
    },
  },
};

const Twins = [farLoss, farSiege, deathAbroad, armyOutOfSight, lossAfterOrders, siegeAfterOrders, siegeLifted];

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
