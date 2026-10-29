/**
 * The royal council (build order item 16, "The royal council" under Interface and the council). Each ruler played by a
 * model or a human hears four advisors, built from the script kings' own tactics with different weightings: the General
 * (high aggression), the Steward (high caution, the treasury first), the Tjaty (cheap gains) and the Diviner (the race to
 * win, phrased as signs but computed from the same estimates and the shared score function). Each keeps its own memory of
 * what the seat has seen and plans from the seat's own view, so it can be confidently wrong, and the king is told so.
 *
 * - Tactics only: troop orders and levies, each with a one-line reason and the numbers behind it, from the same pictured
 *   seasons a script king plays its plan out against (Search.pictured). No letters, tablets, gifts or alliances.
 * - Compact: what all four propose alike once, then each advisor only where they differ.
 * - Advisors are not characters: they have no loyalties, no price and nothing a rival can buy. Nothing here changes the
 *   game, and nothing reads more than the seat's view; the seeds are the council's own.
 */
import {
  Dict,
  cmpNum,
  cmpPower,
  cmpStr,
  desc,
  orderEquals,
  sortBy,
  type CouncilAdvice,
  type CouncilLine,
  type CouncilView,
  type Order,
  type Power,
  type SeatView,
} from "@amarna/engine";
import { Board } from "./board.ts";
import { Brain } from "./brain.ts";
import { personalityFor, type Personality } from "./personality.ts";
import { seatSeed } from "./script-leader.ts";
import { Search, type Pictured } from "./search.ts";
import { Statecraft } from "./statecraft.ts";
import { Tactics } from "./tactics.ts";
import { vassalSeason } from "./vassals.ts";

export const AdvisorValues = ["General", "Steward", "Tjaty", "Diviner"] as const;
export type Advisor = (typeof AdvisorValues)[number];

/** Each advisor's known tilt, as the king is told it. */
export const Tilts: Record<Advisor, string> = {
  General: "high aggression: looks for where a strike wins now and for enemy armies left exposed; urging attack is expected of him",
  Steward: "high caution, the treasury first: protects the capital, avoids overreach, keeps a reserve; when he agrees to attack, it is a strong sign",
  Tjaty: "cunning and cheap gains: land left unguarded, a neighbour busy elsewhere, a province weakly held",
  Diviner: "the race to win: who is growing fastest, and where pressure keeps a rival from pulling ahead; speaks in signs, computed from the same estimates",
};

/**
 * Period titles per court, only where the sources grade the title A or B; elsewhere the plain archetype name
 * (docs/history/14-courts-and-free-cities.md, "Period titles for the council (item 16), checked"). Presentation only.
 */
const Titles: Record<string, Partial<Record<Advisor, string>>> = {
  Egypt: { General: "the overseer of the army", Steward: "the overseer of the treasury", Tjaty: "the vizier (tjaty)", Diviner: "the chief lector priest" },
  Hatti: { General: "the chief of the bodyguard (GAL MEŠEDI)", Diviner: "the augur" },
  Babylonia: { Steward: "the governor of Nippur (šandabakku)", Tjaty: "the sukkallu", Diviner: "the bārû" },
  Alashiya: { Diviner: "the eagle diviner" },
};

export function titleOf(p: Power, a: Advisor): string {
  return Titles[p]?.[a] ?? `the ${a}`;
}

/** The weightings: the court's own temperament, tilted (first guesses, item 16). */
function tilt(base: Personality, a: Advisor): Personality {
  const up = (x: number, d: number): number => Math.max(0, Math.min(1, x + d));
  switch (a) {
    case "General":
      return { ...base, aggression: up(base.aggression, 0.4), caution: up(base.caution, -0.35), vengeance: up(base.vengeance, 0.2) };
    case "Steward":
      return { ...base, aggression: up(base.aggression, -0.35), caution: up(base.caution, 0.4), greed: up(base.greed, 0.3) };
    case "Tjaty":
      return { ...base, cunning: up(base.cunning, 0.4), commerce: up(base.commerce, 0.4), aggression: up(base.aggression, 0.1), vengeance: up(base.vengeance, -0.3) };
    case "Diviner":
      return { ...base, vengeance: up(base.vengeance, -0.3) };
  }
}

/** The troop orders and levies the council speaks to. */
const TroopTypes = new Set<Order["type"]>(["move", "support", "hold", "convoy", "besiege", "sally", "raise", "disband"]);

/**
 * For measuring the council (item 16's use against ignore, `--council-play-half`): the script kings in `only` take their troop
 * orders and levies from their council instead of their own plan ({@link follow}). Off in every real game.
 */
export const CouncilPlay: { only: ReadonlySet<string> | null } = { only: null };

/**
 * A king who plays by his council: where all four agree he takes it, otherwise each troop's order most of them propose,
 * a tie going to his own order if it is among them, else to the first advisor's; a levy at least two of them propose.
 * Every other order stays his own.
 */
export function follow(own: Order[], ps: Proposal[]): Order[] {
  const kept = own.filter((o) => !TroopTypes.has(o.type));
  const ownTroops = own.filter((o) => TroopTypes.has(o.type));
  const keys = [...new Set(ps.flatMap((p) => p.orders.map(keyOf)))].sort(cmpStr);
  const chosen: Order[] = [];
  for (const k of keys) {
    const options: [Order, number][] = [];
    for (const p of ps)
      for (const o of p.orders.filter((x) => keyOf(x) === k)) {
        const seen = options.find(([x]) => orderEquals(x, o));
        if (seen !== undefined) seen[1]++;
        else options.push([o, 1]);
      }
    const most = Math.max(...options.map(([, n]) => n));
    const isLevy = k.startsWith("raise:") || k.startsWith("sally:");
    if (isLevy) {
      if (most >= 2) chosen.push(options.find(([, n]) => n === most)![0]);
      continue;
    }
    const top = options.filter(([, n]) => n === most).map(([o]) => o);
    chosen.push(top.find((o) => ownTroops.some((x) => orderEquals(x, o))) ?? top[0]);
  }
  // Troops no advisor spoke to keep their own orders.
  const spoken = new Set(chosen.map(keyOf));
  return [...chosen, ...ownTroops.filter((o) => !spoken.has(keyOf(o)) && o.type !== "raise" && o.type !== "sally"), ...kept];
}

/** What one advisor proposes this season, with the numbers behind it. */
export interface Proposal {
  advisor: Advisor;
  orders: Order[];
  /** Each order's line, in words with its reason and numbers, by the order's key. */
  lines: Dict<string, string>;
  pictured: Pictured;
  reading: string;
  /** The king it would make war on, if any. */
  war: Power | null;
}

export class Council {
  private readonly brains = new Dict<string, Brain>();
  /** A seed for each tag, one-way from the game's seed (see seatSeed): the council never holds the game's seed itself. */
  private readonly seedFor: (tag: string) => number;

  /** `gameSeed`: the game's seed, from which each advisor's seed is derived; it is not kept. */
  constructor(gameSeed: number) {
    this.seedFor = (tag) => seatSeed(gameSeed, tag);
  }

  private brain(p: Power, a: Advisor): Brain {
    const key = `${p}/${a}`;
    let b = this.brains.tryGet(key);
    if (b === undefined) {
      const seed = this.seedFor(`council:${a}:${p}`);
      this.brains.set(key, (b = new Brain(p, seed, tilt(personalityFor(p, this.seedFor(p)), a))));
    }
    return b;
  }

  /** Reads a season's view, deciding nothing, so the advisors remember what the seat has seen while it sleeps. */
  observe(view: SeatView): void {
    for (const a of AdvisorValues) this.brain(view.power, a).learn(view, new Board(view));
  }

  /** Each advisor's proposal for the season, from the seat's own view. */
  proposals(view: SeatView): Proposal[] {
    return AdvisorValues.map((a) => this.propose(view, a));
  }

  /** The council's counsel for the season, compact: what all four agree on, then each where they differ. */
  advise(view: SeatView): CouncilView {
    return counsel(view.power, this.proposals(view));
  }

  private propose(view: SeatView, a: Advisor): Proposal {
    const brain = this.brain(view.power, a);
    brain.learn(view, new Board(view));
    const b = new Board(view, brain.remembered(view), brain.treasury);
    const rng = brain.r(view.turn, "council");
    vassalSeason(b, brain);
    Statecraft.strategy(b, brain, rng);
    if (a === "Tjaty") brain.warTarget = cheapest(b, brain) ?? brain.warTarget;
    if (a === "Diviner") brain.warTarget = racer(b, brain) ?? brain.warTarget;
    const plan = Tactics.make(b, brain);
    Search.improve(b, brain, plan, brain.r(view.turn, "council-search"));
    Tactics.besiege(b, brain, plan);
    const sallies = Tactics.sallies(b, plan.orders.values(), brain);
    const rest: Order[] = [];
    Statecraft.economy(b, brain, plan, rest, rng);
    const orders = [...plan.orders.values(), ...sallies, ...rest].filter((o) => TroopTypes.has(o.type));
    const pictured = Search.pictured(b, brain, orders, brain.r(view.turn, "council-picture"));
    const lines = new Dict<string, string>();
    for (const o of orders) lines.set(keyOf(o), `${orderWords(b, o)}: ${reason(b, o, plan.role.tryGet(unitOf(o) ?? "") ?? "", plan.danger, pictured)}`);
    return { advisor: a, orders, lines, pictured, reading: reading(b, brain, a, brain.warTarget, plan.danger, pictured, orders), war: brain.warTarget };
  }
}

/** The rival whose land beside our troops lies most open (no troop, walls or troop near enough to hold it), by its worth. */
function cheapest(b: Board, brain: Brain): Power | null {
  const open = new Dict<Power, number>();
  for (const t of openLand(b, brain)) open.set(b.ownerOf(t)!, open.getOrDefault(b.ownerOf(t)!, 0) + b.value(t));
  return sortBy([...open], [(e: [Power, number]) => e[1], desc(cmpNum)], [(e: [Power, number]) => e[0], cmpPower])[0]?.[0] ?? null;
}

function openLand(b: Board, brain: Brain): string[] {
  const out = new Set<string>();
  for (const u of b.mine)
    for (const t of Board.Sail.movesFrom(u.kind, u.province)) {
      const x = b.ownerOf(t);
      if (x === null || x === b.me || brain.isFriend(x) || b.unitAt.has(t) || b.walls(t) || b.muster(x, t) > 0) continue;
      out.add(t);
    }
  return [...out].sort(cmpStr);
}

/** Within reach of our troops: the kings whose land or troops stand next to them, friends left out. */
function inReach(b: Board, brain: Brain): Set<Power> {
  const reach = new Set<Power>();
  for (const u of b.mine)
    for (const t of Board.Sail.movesFrom(u.kind, u.province)) {
      const x = b.ownerOf(t);
      if (x !== null && x !== b.me && !brain.isFriend(x)) reach.add(x);
    }
  return reach;
}

/** The king running away with the race by this court's estimates (the shared score function, Board.leader), if in reach. */
function racer(b: Board, brain: Brain): Power | null {
  const top = b.leader();
  return top !== null && top !== b.me && inReach(b, brain).has(top) ? top : null;
}

const named = (id: string): string => Board.Map.get(id).name;

function unitOf(o: Order): string | null {
  switch (o.type) {
    case "move":
    case "support":
    case "hold":
    case "convoy":
    case "besiege":
    case "disband":
      return o.unit;
    default:
      return null;
  }
}

/** The order's key, for comparing advisors: the unit it moves, or the levy's province. */
function keyOf(o: Order): string {
  if (o.type === "raise") return `raise:${o.province}`;
  if (o.type === "sally") return `sally:${o.city}`;
  return unitOf(o) ?? JSON.stringify(o);
}

/** The order in words a king can weigh, with no internal ids. */
export function orderWords(b: Board, o: Order): string {
  const troop = (p: string): string => `the ${b.unitAt.tryGet(p)?.kind === "Fleet" ? "fleet" : "army"} in ${named(p)}`;
  switch (o.type) {
    case "move":
      return `${troop(o.unit)} to ${named(o.to)}`;
    case "support":
      return o.to === null || o.to === undefined ? `${troop(o.unit)} supports ${named(o.supported)} holding` : `${troop(o.unit)} supports the move from ${named(o.supported)} to ${named(o.to)}`;
    case "hold":
      return `${troop(o.unit)} holds`;
    case "convoy":
      return `${troop(o.unit)} carries the army from ${named(o.army)} to ${named(o.to)}`;
    case "besiege":
      return `${troop(o.unit)} keeps up the siege`;
    case "sally":
      return `the walls of ${named(o.city)} sally against the troops within`;
    case "raise":
      return `raise ${o.kind === "Fleet" ? "a fleet" : "an army"} in ${named(o.province)}`;
    case "disband":
      return `disband ${troop(o.unit)}`;
    default:
      return o.type;
  }
}

const Idle = "nothing worth the march this season";

function reason(b: Board, o: Order, role: string, danger: Dict<string, [number, number]>, pic: Pictured): string {
  const of8 = (n: number): string => `${n} of ${pic.seasons} pictured seasons`;
  const threat = (p: string): string => {
    const d = danger.tryGet(p);
    return d === undefined ? "" : `up to ${d[0]} foreign troop${d[0] === 1 ? "" : "s"} could strike it`;
  };
  switch (o.type) {
    case "move": {
      const n = pic.arrives.getOrDefault(o.unit, 0);
      const owner = b.ownerOf(o.to);
      const hostile = (owner !== null && owner !== b.me) || (b.unitAt.has(o.to) && b.unitAt.get(o.to).power !== b.me);
      if (hostile) return `${owner !== null && owner !== b.me ? `takes ${named(o.to)} from ${owner}` : `strikes at ${named(o.to)}`}: gets there in ${of8(n)}`;
      if (owner === null) return `takes ${named(o.to)}, held by no king: gets there in ${of8(n)}`;
      return danger.has(o.to) ? `guards ${named(o.to)}, where ${threat(o.to)}` : `marches on: gets there in ${of8(n)}`;
    }
    case "support": {
      if (o.to === null || o.to === undefined) return "holds the line beside a friend";
      const owner = b.ownerOf(o.to);
      return role !== "defend" && ((owner !== null && owner !== b.me) || (b.unitAt.has(o.to) && b.unitAt.get(o.to).power !== b.me)) ? "backs the strike" : "backs the march";
    }
    case "hold":
      return danger.has(o.unit) ? `stands where ${threat(o.unit)}` : Idle;
    case "besiege":
      return "wears the city down";
    case "raise":
      return "the plan is a troop short here, and the treasury can keep it";
    case "disband":
      return "the treasury cannot keep it";
    case "sally":
      return "the walls help the relief";
    default:
      return "";
  }
}

function reading(b: Board, brain: Brain, a: Advisor, war: Power | null, danger: Dict<string, [number, number]>, pic: Pictured, orders: Order[]): string {
  const capital = Board.Map.capital(b.me).id;
  const strikes = orders.filter((o) => o.type === "move" && b.ownerOf(o.to) !== b.me && (b.ownerOf(o.to) !== null || b.unitAt.has(o.to)));
  const best = sortBy(
    strikes.filter((o): o is Extract<Order, { type: "move" }> => o.type === "move"),
    [(o) => pic.arrives.getOrDefault(o.unit, 0), desc(cmpNum)],
    [(o) => o.to, cmpStr],
  )[0];
  const exposed = pic.capitalLost > 0 ? `; the capital falls to a foreign troop in ${pic.capitalLost} of ${pic.seasons} pictured seasons` : "";
  switch (a) {
    case "General":
      return best !== undefined
        ? `Strike now: ${named(best.to)} falls to us in ${pic.arrives.getOrDefault(best.unit, 0)} of ${pic.seasons} pictured seasons${war !== null && b.ownerOf(best.to) === war ? `, in the war on ${war}` : ""}${exposed}.`
        : `No strike pays this season${war !== null ? `; the war on ${war} waits for more troops` : ""}${exposed}.`;
    case "Steward": {
      const d = danger.tryGet(capital);
      const near = d !== undefined ? `up to ${d[0]} foreign troop${d[0] === 1 ? "" : "s"} could strike the capital` : "no foreign troop is near enough to strike the capital";
      return `Hold what we have: ${near}${exposed}; we hold ${b.v.gold} shekels, and troops cost ${b.v.upkeep} a season.`;
    }
    case "Tjaty": {
      const open = openLand(b, brain);
      return open.length > 0
        ? `Cheap gains: ${open.map((t) => `${named(t)} (${b.ownerOf(t)})`).join(", ")} beside our troops stand${open.length === 1 ? "s" : ""} unguarded, with no troop near enough to hold ${open.length === 1 ? "it" : "them"}${exposed}.`
        : `No land beside our troops lies open this season; wait for a neighbour to look away${exposed}.`;
    }
    case "Diviner": {
      const top = b.leader();
      if (top === null) return "The signs are still unclear: no star rises above the others yet. Watch who grows.";
      if (top === b.me) return "The signs say your own star rises highest: others will look to pull you down, so guard what you have gained.";
      return war === top
        ? `The signs say ${top}'s star is rising fastest; its fall would be your rise.`
        : `The signs say ${top}'s star is rising fastest, but it lies beyond your reach this season; press whoever stands nearest to the race.`;
    }
  }
}

/** The compact counsel: orders all four propose alike once (holds left out unless the place is threatened), then each where they differ. */
export function counsel(me: Power, ps: Proposal[]): CouncilView {
  const agreedKeys = new Set<string>();
  const first = ps[0];
  for (const o of first.orders) {
    const k = keyOf(o);
    if (ps.every((p) => p.orders.some((x) => keyOf(x) === k && orderEquals(x, o)))) agreedKeys.add(k);
  }
  const line = (p: Proposal, o: Order): CouncilLine => ({ order: o, text: p.lines.tryGet(keyOf(o)) ?? "" });
  const agreed: CouncilLine[] = [];
  for (const o of first.orders) {
    if (!agreedKeys.has(keyOf(o))) continue;
    if (o.type === "hold" && (first.lines.tryGet(keyOf(o)) ?? "").endsWith(Idle)) continue;
    agreed.push(line(first, o));
  }
  const advisors: CouncilAdvice[] = ps.map((p) => ({
    advisor: p.advisor,
    title: titleOf(me, p.advisor),
    tilt: Tilts[p.advisor],
    reading: p.reading,
    lines: p.orders.filter((o) => !agreedKeys.has(keyOf(o))).map((o) => line(p, o)),
  }));
  return { agreed, advisors };
}
