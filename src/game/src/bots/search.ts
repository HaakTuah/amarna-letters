/**
 * Checks a season's troop plan the way a careful player would: by playing it out. It pictures what every rival is likely to
 * order (the plan that rival would draw from its side of the board, and a harder one aimed at us), resolves each pairing
 * with the game's own adjudicator, and keeps the plan, or the change to one or two units' orders, that does best on
 * average, weighed towards the worst case by the king's caution. It sees only what the king sees.
 */
import {
  Adjudicator,
  Dict,
  HSet,
  Rng,
  clamp,
  cmpNum,
  cmpPower,
  cmpStr,
  count,
  desc,
  distinct,
  hold,
  max,
  move,
  newSeatView,
  newUnit,
  orderEquals,
  sally,
  sortBy,
  stormed as isStormed,
  sum,
  support,
  type AdjudicationResult,
  type Order,
  type Power,
  type SallyOrder,
  type Unit,
} from "@amarna/engine";
import { Board } from "./board.ts";
import { Brain } from "./brain.ts";
import { archetype, type Personality } from "./personality.ts";
import { Statecraft } from "./statecraft.ts";
import { joints as tacticsJoints, makePlan, relief, willing as tacticsWilling, type Joint, type MilitaryPlan } from "./tactics.ts";

const Samples = 8;
/** Adjudications per season and king: enough to try every unit's alternatives once. */
const Budget = 720;
const UnitWorth = 90;
/**
 * The share of our capital's worth a foreign army within its walls puts at stake, however early the siege (see stake): a
 * quarter, below the 43% that fell within four seasons in script games, since a capital whose garrison is outside may still
 * be relieved; at two fifths the current king lost more growth against the frozen baseline (2.73 against 2.79, one current
 * king against six baselines) than at a quarter (2.76).
 */
export const CapitalAtStake = 0.25;

type Plan = Dict<string, Order>;

interface Ctx {
  b: Board;
  brain: Brain;
  p: Personality;
  hostility: Dict<Power, number>;
  units: Unit[];
  foes: Plan[];
  adj: Adjudicator;
  prey: (o: Power | null) => boolean;
  willing: (p: Power) => boolean;
  leader: Power | null;
  sworn: HSet<Power>;
  joints: Joint[];
  coalitions: [Power, Power][];
  runs: number;
}

export function improve(b: Board, brain: Brain, plan: MilitaryPlan, rng: Rng): void {
  if (b.mine.length === 0) return;
  const me = b.me;
  const p = brain.p;
  const ctx = picture(b, brain, rng);

  // Candidate plans: the king's own, a bolder one, a safer one, and standing fast.
  const mine = b.mine.map((u) => u.province);
  const candidates: Plan[] = [troops(plan, mine)];
  const bold: Personality = { ...p, aggression: Math.min(1, p.aggression + 0.35), caution: Math.max(0, p.caution - 0.35) };
  const safe: Personality = { ...p, aggression: Math.max(0, p.aggression - 0.3), caution: Math.min(1, p.caution + 0.35) };
  candidates.push(troops(makePlan(b, brain, bold), mine));
  candidates.push(troops(makePlan(b, brain, safe), mine));
  candidates.push(new Dict<string, Order>(mine.map((u) => [u, hold(u)] as const)));

  let best = candidates[0];
  let bestScore = evaluate(ctx, best);
  for (const c of candidates.slice(1)) {
    if (same(c, best)) continue;
    const sc = evaluate(ctx, c);
    if (sc > bestScore + 1) {
      best = c;
      bestScore = sc;
    }
  }

  // Then each unit in turn: would another order (or a move with a supporter) do better?
  for (let pass = 0; pass < 2; pass++) {
    let improved = false;
    for (const u of mine) {
      // A troop readying a landing (see Landing in seas.ts) keeps to it: a single season cannot see what waiting at sea or
      // on the coast is worth, only the seasons that follow can.
      if (plan.role.tryGet(u) === "landing") continue;
      // So does a winter stroke (Tactics, item 9): the pictured seasons, on the safe winter map, cannot picture it.
      if (plan.role.tryGet(u) === "winter-stroke") continue;
      for (const change of alternatives(b, best, u, ctx.willing, ctx.joints)) {
        if (ctx.runs + Samples > Budget) break;
        const trial = best.clone();
        for (const o of change) trial.set(unitOfTroop(o), o);
        if (same(trial, best)) continue;
        const sc = evaluate(ctx, trial);
        if (sc > bestScore + 2) {
          best = trial;
          bestScore = sc;
          improved = true;
        }
      }
    }
    if (!improved || ctx.runs + Samples > Budget) break;
  }

  // Write the chosen orders back into the plan. A winter stroke (Tactics, item 9) stands, which the pictured seasons cannot
  // picture, unless another troop of ours now moves where it was going.
  for (const [u, o] of best) {
    const old = plan.orders.tryGet(u);
    if (plan.role.tryGet(u) === "winter-stroke" && old !== undefined && old.type === "move") {
      const target = old.to;
      if (![...best].some(([w, x]) => w !== u && x.type === "move" && x.to === target)) continue;
    }
    if (old !== undefined && orderEquals(old, o)) continue;
    plan.orders.set(u, o);
    let role: string;
    switch (o.type) {
      case "move": {
        const owner = b.ownerOf(o.to);
        role = (owner !== null && owner !== me) || b.unitAt.has(o.to) || b.walls(o.to) ? "attack" : "move";
        break;
      }
      case "support":
        role = "support";
        break;
      case "convoy":
        role = "convoy";
        break;
      default:
        role = "hold";
    }
    plan.role.set(u, role);
  }
  plan.destinations.clear();
  for (const m of plan.orders.values()) if (m.type === "move") plan.destinations.add(m.to);
}

/**
 * The seasons a king pictures before he orders (see improve): what each rival is likely to order, eight times over, with the
 * game's own adjudicator to play them out. The same seasons score the royal council's proposals (item 16, council.ts).
 */
function picture(b: Board, brain: Brain, rng: Rng): Ctx {
  const me = b.me;
  const p = brain.p;
  const leader = b.leader();
  const hostility = new Dict<Power, number>(
    [...b.alive].filter((x) => x !== me).map((x) => [x, brain.hostility(x, b) * (brain.isFriend(x) && brain.betraying !== x ? 0.25 : 1)] as const),
  );

  // What each rival is likely to order: its own plan, and a plan aimed at us.
  const calm = new Dict<Power, Plan>();
  const hard = new Dict<Power, Plan>();
  for (const x of sortBy(
    [...b.alive].filter((x) => x !== me && b.others.some((u) => u.power === x)),
    [(x: Power) => x, cmpPower],
  )) {
    const [c, h] = foresee(b, brain, x);
    calm.set(x, c);
    hard.set(x, h);
  }
  // All-in strikes: every unit a rival has in reach of one of our provinces, one marching in and the rest supporting.
  const ownedNow: string[] = [];
  for (const [k, o] of b.v.owner) if (o === me) ownedNow.push(k);
  const ours = sortBy(
    distinct([...ownedNow, ...b.mine.map((u) => u.province)].filter((x) => !Board.Map.get(x).isSea)),
    [(x: string) => x, cmpStr],
  );
  const strikes = new Dict<Power, Plan[]>();
  for (const x of calm.keys()) {
    const list: [number, Plan][] = [];
    for (const t of ours) {
      const near = sortBy(
        b.others.filter((u) => u.power === x && Board.Sail.canMove(u.kind, u.province, t)),
        [(u) => (u.kind === "Army" ? 0 : 1), cmpNum],
        [(u) => u.province, cmpStr],
      );
      if (near.length === 0) continue;
      const strike = calm.get(x).clone();
      strike.set(near[0].province, move(near[0].province, t));
      for (const h of near.slice(1)) strike.set(h.province, support(h.province, near[0].province, t));
      list.push([b.value(t) * near.length, strike]);
    }
    strikes.set(
      x,
      sortBy(list, [(l: [number, Plan]) => l[0], desc(cmpNum)])
        .slice(0, 3)
        .map((l) => l[1]),
    );
  }
  const nastiest =
    sortBy(
      [...hostility].filter(([k]) => calm.has(k)),
      [(x: [Power, number]) => x[1], desc(cmpNum)],
      [(x: [Power, number]) => x[0], cmpPower],
    ).map((x) => x[0])[0] ?? null;

  const foes: Plan[] = [];
  for (let s = 0; s < Samples; s++) {
    const orders = new Dict<string, Order>();
    for (const x of calm.keys()) {
      // Sample 0: everyone keeps to his own plan. Samples 1 and 2: the most hostile king strikes with everything he has, or
      // comes for us with a plan of his own. Then a mix, by each king's hostility.
      let theirs: Plan;
      const st = strikes.get(x);
      if (s === 1 && x === nastiest) theirs = st.length > 0 ? st[0] : hard.get(x);
      else if (s === 2 && x === nastiest) theirs = hard.get(x);
      else if (s >= 3 && rng.chance(clamp((hostility.get(x) - 0.2) * 1.2, 0.03, 0.85))) theirs = st.length > 0 && rng.chance(0.5) ? st[rng.next(st.length)] : hard.get(x);
      else theirs = calm.get(x);
      for (const [prov, order] of theirs) orders.set(prov, s >= 3 && rng.chance(0.15) ? wander(b, prov, rng) : order);
    }
    foes.push(orders);
  }

  // Sworn partners keep to the rule for joint blows (see joints) in every season but the two where the most hostile king
  // comes for us: their troops go in or support as the rule says.
  const joints = tacticsJoints(b, brain);
  for (let s = 0; s < Samples; s++) {
    if (s === 1 || s === 2) continue;
    for (const j of joints) {
      if (j.lead.power !== me) foes[s].set(j.lead.province, move(j.lead.province, j.target));
      for (const h of j.support.filter((u) => u.power !== me)) foes[s].set(h.province, support(h.province, j.lead.province, j.target));
    }
  }

  // A rival's troop that stood its ground against our attack last season, and stands there still, is pictured standing again
  // in every season: it showed it will.
  for (const t of stoodAgainstUs(b))
    for (const f of foes) if (f.tryGet(t)?.type === "move") f.set(t, hold(t));

  const sworn = brain.swornFoes(b);
  const ctx: Ctx = {
    b,
    brain,
    p,
    hostility,
    leader,
    foes,
    sworn,
    joints,
    coalitions: [...brain.coalitions(b)],
    // The game's own adjudicator, the ground included, so the pictured seasons count it.
    adj: new Adjudicator(Board.Sail, false, b.v.prices.getOrDefault("terrainDefence", 1)),
    units: b.units.map((u) => newUnit({ id: u.province, power: u.power, kind: u.kind, province: u.province, men: u.men })),
    willing: (x) => tacticsWilling(b, brain, x, leader),
    prey: (owner) =>
      owner === null || owner === brain.warTarget || owner === brain.betraying || owner === leader || (owner !== me && (brain.rel.get(owner).hostile || sworn.has(owner))),
    runs: 0,
  };
  return ctx;
}

// ------------------------------------------------------------------ rivals

/**
 * The share of a walled city's worth that a siege of it puts at stake, at the end of a pictured season: 0.45 of how far it is
 * worn down, progress and this season's steps, a half step more, against its walls and one. For our own capital, a kingdom
 * at stake, at least CapitalAtStake however early the siege.
 */
export function stake(ourCapital: boolean, progress: number, pressed: number, walls: number): number {
  const share = 0.45 * Math.min(1.0, (progress + pressed + 0.5) / (walls + 1.0));
  return ourCapital ? Math.max(share, CapitalAtStake) : share;
}

/** A rival's likely orders, drawn from its side of the board: as it stands, and if it chose war on us. */
function foresee(b: Board, brain: Brain, x: Power): [Plan, Plan] {
  const v = b.v;
  const view = newSeatView({
    turn: v.turn,
    season: v.season,
    power: x,
    openAge: v.openAge,
    owner: v.owner,
    walls: v.walls,
    sieges: v.sieges,
    units: b.units,
    visible: v.visible,
    fallen: v.fallen,
    prices: v.prices,
  });
  const their = new Board(view, null, brain.treasury);
  // A pictured rival plays the archetype, and every roll in picturing him comes from our own seat's stream.
  let model = brain.models.tryGet(x);
  if (model === undefined) brain.models.set(x, (model = new Brain(x, brain.seed, archetype(x))));

  // What we know of how they see us: the mirror of our own dealings with them.
  const ours = brain.rel.get(x);
  const theirs = model.rel.get(b.me);
  theirs.lastAttackedUs = ours.lastWeAttacked;
  theirs.lastWeAttacked = ours.lastAttackedUs;
  theirs.treaty = ours.treaty;
  theirs.allied = ours.allied;
  theirs.grudge = ours.lastWeAttacked >= v.turn - 3 ? 3 : 0;
  theirs.trust = clamp(ours.trust * 0.5, -1, 1);
  model.turn = v.turn;
  for (const [k, w] of brain.belligerence) model.belligerence.set(k, w);

  const rng = Rng.for(brain.seed, v.turn, "bot:model", `${b.me}:${x}`);
  Statecraft.strategy(their, model, rng);
  const calm = troops(makePlan(their, model), their.mine.map((u) => u.province));

  // The harder plan: war on us, and on nobody else (what lies beyond our sight would only distract it).
  const war = model.warTarget;
  const kept = [...model.rel].map(([k, r]) => [k, r.treaty, r.trust] as const);
  for (const [k, r] of model.rel)
    if (k !== b.me) {
      r.treaty = true;
      r.trust = Math.max(0, r.trust);
    }
  model.warTarget = b.me;
  model.betraying = brain.isFriend(x) ? b.me : null;
  const hard = troops(
    makePlan(their, model, { ...model.p, aggression: Math.max(0.7, model.p.aggression), caution: Math.min(0.4, model.p.caution) }),
    their.mine.map((u) => u.province),
  );
  model.warTarget = war;
  model.betraying = null;
  for (const [k, treaty, trust] of kept) {
    model.rel.get(k).treaty = treaty;
    model.rel.get(k).trust = trust;
  }
  return [calm, hard];
}

/**
 * The provinces where a rival's troop stood its ground against a move of ours last season (it stayed there, whatever its
 * order, and our move failed) and stands there still, as far as we can see.
 */
export function stoodAgainstUs(b: Board): HSet<string> {
  const last = b.v.lastSeason;
  const out = new HSet<string>();
  for (const o of last) {
    if (!(o.power === b.me && o.order === "move" && !o.succeeded && o.target !== null)) continue;
    const t = o.target;
    const there = b.v.units.find((u) => u.province === t);
    if (there === undefined || there.power === b.me) continue;
    if (last.some((x) => x.province === t && x.power === there.power && !x.destroyed && !(x.order === "move" && x.succeeded))) out.add(t);
  }
  return out;
}

/** A unit that does something nobody planned: holds, or moves somewhere at random. */
function wander(b: Board, at: string, rng: Rng): Order {
  const u = b.unitAt.get(at);
  const moves = sortBy(Board.Sail.movesFrom(u.kind, at), [(x: string) => x, cmpStr]);
  const pick = rng.next(moves.length + 1);
  return pick === moves.length ? hold(at) : move(at, moves[pick]);
}

// ------------------------------------------------------------------ our side

function troops(plan: MilitaryPlan, units: Iterable<string>): Plan {
  const d = new Dict<string, Order>();
  for (const u of units) {
    const o = plan.orders.tryGet(u);
    d.set(u, o !== undefined && (o.type === "hold" || o.type === "move" || o.type === "support" || o.type === "convoy" || o.type === "besiege") ? o : hold(u));
  }
  return d;
}

function unitOfTroop(o: Order): string {
  switch (o.type) {
    case "hold":
    case "move":
    case "support":
    case "convoy":
    case "besiege":
      return o.unit;
    default:
      throw new Error("not a troop order");
  }
}

function same(a: Plan, b: Plan): boolean {
  if (a.size !== b.size) return false;
  for (const [k, o] of a) {
    const x = b.tryGet(k);
    if (x === undefined || !orderEquals(o, x)) return false;
  }
  return true;
}

/** Other orders for one unit: hold, each legal move, each support it could give, or a move with a supporter. */
function* alternatives(b: Board, plan: Plan, u: string, willing: (p: Power) => boolean, joints: Joint[]): Generator<Order[]> {
  // Never into the land or troops of a king we are not willing to fight.
  const open = (to: string): boolean => {
    const o = b.ownerOf(to);
    const x = b.unitAt.tryGet(to);
    return (o === null || o === b.me || willing(o)) && (x === undefined || x.power === b.me || willing(x.power));
  };
  const kind = b.unitAt.get(u).kind;
  yield [hold(u)];

  const moves = sortBy(Board.Sail.movesFrom(kind, u), [(x: string) => x, cmpStr]);
  for (const to of moves) {
    if (!open(to)) continue;
    yield [move(u, to)];
    // The same move with the best placed of our other units in support.
    if (Board.Map.get(to).isSea) continue;
    const helpers = sortBy(
      [...plan.keys()].filter((h) => h !== u && h !== to && Board.Sail.canMove(b.unitAt.get(h).kind, h, to)),
      [(h: string) => (plan.get(h).type === "hold" ? 0 : plan.get(h).type === "support" ? 1 : 2), cmpNum],
      [(h: string) => h, cmpStr],
    ).slice(0, 2);
    if (helpers.length > 0) yield [move(u, to), support(helpers[0], u, to)];
    // Against a foreign troop the ground helps, one support is a support too few: try two.
    const there = b.unitAt.tryGet(to);
    if (helpers.length > 1 && there !== undefined && there.power !== b.me && b.ground(u, to) > 0)
      yield [move(u, to), support(helpers[0], u, to), support(helpers[1], u, to)];
  }
  for (const [other, o] of sortBy([...plan], [(x: [string, Order]) => x[0], cmpStr])) {
    if (other === u) continue;
    if (o.type === "move") {
      if (o.to !== u && open(o.to) && Board.Sail.canMove(kind, u, o.to)) yield [support(u, other, o.to)];
    } else if (Board.Sail.canMove(kind, u, other)) yield [support(u, other)];
  }
  // And a sworn partner's troop going in on a joint blow.
  for (const j of joints.filter((j) => j.lead.power !== b.me && j.support.some((s) => s.province === u))) yield [support(u, j.lead.province, j.target)];
}

// ------------------------------------------------------------------ judging

/** The plan's worth against every pictured season: the average, pulled towards the worst by caution. */
function evaluate(c: Ctx, mine: Plan): number {
  let total = 0.0;
  let worst = Number.MAX_VALUE;
  for (const foes of c.foes) {
    const orders = foes.clone();
    for (const [k, o] of mine) orders.set(k, o);
    // A king's move on troops within his own walls goes with the walls' sally, ours as the plan will give it, a rival's as
    // he may: a besieger who forgets the sally loses his army to a lone relief.
    // The people of empty land resist our moves as our view reckons them (item 10+a); a rival's we cannot reckon.
    const r = c.adj.run(c.units, orders, c.b.v.owner, c.b.v.walls, sallies(c, orders), null, (p, mover) => (mover === c.b.me ? c.b.v.resistance.tryGet(p) ?? 0 : 0));
    c.runs++;
    const sc = score(c, r, orders);
    total += sc;
    worst = Math.min(worst, sc);
  }
  const mean = total / c.foes.length;
  const rho = 0.1 + 0.3 * c.p.caution;
  return (1 - rho) * mean + rho * worst;
}

/**
 * What the royal council tells its king of a plan (item 16, "Brief numbers behind each proposal"): in how many of the
 * pictured seasons each of our moves reaches its goal, and in how many a foreign troop ends in our capital. From the seat's
 * own view, so it is as wrong as the view is.
 */
export interface Pictured {
  seasons: number;
  /** For each of our troops ordered to move: in how many pictured seasons it gets there. */
  arrives: Dict<string, number>;
  /** In how many pictured seasons a foreign troop stands in our capital at the end. */
  capitalLost: number;
}

export function pictured(b: Board, brain: Brain, orders: Iterable<Order>, rng: Rng): Pictured {
  const out: Pictured = { seasons: 0, arrives: new Dict(), capitalLost: 0 };
  if (b.mine.length === 0) return out;
  const c = picture(b, brain, rng);
  const mine = new HSet(b.mine.map((u) => u.province));
  const plan: Plan = new Dict();
  for (const o of orders)
    if ((o.type === "hold" || o.type === "move" || o.type === "support" || o.type === "convoy" || o.type === "besiege") && mine.has(o.unit)) plan.set(o.unit, o);
  for (const u of mine) if (!plan.has(u)) plan.set(u, hold(u));
  const capital = Board.Map.capital(b.me).id;
  for (const foes of c.foes) {
    const all = foes.clone();
    for (const [k, o] of plan) all.set(k, o);
    const r = c.adj.run(c.units, all, b.v.owner, b.v.walls, sallies(c, all), null, (p, mover) => (mover === b.me ? b.v.resistance.tryGet(p) ?? 0 : 0));
    out.seasons++;
    const lost = new HSet(r.dislodgedUnitIds);
    for (const [u, o] of plan) if (o.type === "move" && !lost.has(u) && r.newPositions.getOrDefault(u, u) === o.to) out.arrives.set(u, out.arrives.getOrDefault(u, 0) + 1);
    if (c.units.some((u) => u.power !== b.me && !lost.has(u.id) && r.newPositions.getOrDefault(u.id, u.province) === capital)) out.capitalLost++;
  }
  return out;
}

/**
 * Every sally the pictured season's moves would bring: a king's move into his own city whose walls can sally, with another's
 * troops within; and, where he makes no such move, another king's move into it on the troops within, which the walls may
 * support as a friend's relief.
 */
function sallies(c: Ctx, orders: Plan): SallyOrder[] {
  const min = c.b.v.prices.getOrDefault("sallyMinWalls", 2);
  if (min <= 0) return [];
  const list: SallyOrder[] = [];
  const moves = sortBy(
    [...orders.values()].filter((m): m is Extract<Order, { type: "move" }> => m.type === "move"),
    [(m) => m.unit, cmpStr],
  );
  const moverOf = (m: Extract<Order, { type: "move" }>): Power | null => c.units.find((u) => u.province === m.unit)?.power ?? null;
  for (const m of moves) {
    const mover = moverOf(m);
    if (mover === null || c.b.ownerOf(m.to) !== mover || c.b.wallLevel(m.to) < min || list.some((x) => x.city === m.to)) continue;
    if (c.units.some((u) => u.province === m.to && u.power !== mover)) list.push(sally(m.to, m.unit));
  }
  for (const m of moves) {
    const holder = c.b.ownerOf(m.to);
    if (holder === null || c.b.wallLevel(m.to) < min || list.some((x) => x.city === m.to)) continue;
    const within = c.units.find((u) => u.province === m.to);
    const mover = moverOf(m);
    if (mover !== null && mover !== holder && within !== undefined && within.power !== holder && within.power !== mover) list.push(sally(m.to, m.unit));
  }
  return list;
}

const holdsThere = (o: Order | undefined): boolean => o === undefined || o.type === "hold" || o.type === "besiege";

/** What a resolved season leaves us: land and troops, minus what lies open next season, plus harm to our enemies. */
function score(c: Ctx, r: AdjudicationResult, orders: Plan): number {
  const b = c.b;
  const me = b.me;
  const lost = new HSet(r.dislodgedUnitIds);
  const at = new Dict<string, Unit>();
  for (const u of c.units) {
    if (lost.has(u.id)) continue;
    at.set(r.newPositions.getOrDefault(u.id, u.province), u);
  }
  const stormed = new HSet(r.assaults.filter((a) => isStormed(a)).map((a) => a.province));
  // A unit within walls it does not hold takes the province only by storming them, or when its siege wears the city down
  // this season: it held there and the siege, begun now or under way, reaches the level of the walls.
  const falls = (p: string, u: Unit): boolean => {
    if (u.province !== p || !holdsThere(orders.tryGet(p))) return false;
    const x = b.siegeAt(p);
    const progress = x !== null && x.besieger === u.power ? x.progress : 0;
    return progress + (r.holdSupported.has(p) ? 2 : 1) >= b.wallLevel(p);
  };
  const owner = (p: string): Power | null => {
    const u = at.tryGet(p);
    if (Board.Map.get(p).isSea || u === undefined) return b.ownerOf(p);
    return !b.walls(p) || u.power === b.ownerOf(p) || stormed.has(p) || falls(p, u) ? u.power : b.ownerOf(p);
  };

  let score = 0.0;
  const ownedNow: string[] = [];
  for (const [k, o] of b.v.owner) if (o === me) ownedNow.push(k);
  const atMine: string[] = [];
  for (const [k, u] of at) if (u.power === me) atMine.push(k);
  let held = distinct([...ownedNow, ...atMine].filter((x) => !Board.Map.get(x).isSea && owner(x) === me));
  // A kingdom falls with its capital: a season that loses ours loses everything.
  const fallen = owner(Board.Map.capital(me).id) !== me;
  if (fallen) held = [];
  for (const p of held) score += b.value(p);

  // Sieges: a city worn down is nearer to falling. Ours count for what they bring nearer; a siege of one of our cities counts
  // against us the same way. A troop within walls it does not hold, with no siege, counts as one about to begin; a friend's
  // within ours does not (a guest, or a relief).
  const ourCapital = Board.Map.capital(me).id;
  for (const [p, u] of at) {
    if (Board.Map.get(p).isSea || !b.walls(p) || u.power === b.ownerOf(p) || owner(p) === u.power || u.kind !== "Army") continue;
    const x = b.siegeAt(p);
    const progress = x !== null && x.besieger === u.power && u.province === p ? x.progress : 0;
    if (b.ownerOf(p) === me && progress === 0 && c.brain.isFriend(u.power) && c.brain.betraying !== u.power) continue;
    const pressed = u.province === p && holdsThere(orders.tryGet(p)) ? (r.holdSupported.has(p) ? 2 : 1) : 0;
    if (u.power === me && c.prey(b.ownerOf(p))) score += stake(false, progress, pressed, b.wallLevel(p)) * b.value(p);
    else if (b.ownerOf(p) === me) score -= stake(p === ourCapital, progress, pressed, b.wallLevel(p)) * b.value(p);
  }

  const mineAfter: [string, Unit][] = fallen ? [] : [...at].filter(([, u]) => u.power === me);
  score += UnitWorth * mineAfter.length;
  // An army of ours that ends the season in desert land we do not hold pays for supplies.
  score -= sum(
    mineAfter.filter(([, u]) => u.kind === "Army"),
    ([k]) => b.desertCost(k),
  );

  // Harm done to the kings we fight.
  for (const x of c.hostility.keys()) {
    // A king we have sworn with others to hold back counts most: what he loses to a partner is our gain too.
    const w = c.sworn.has(x) ? 0.45 : x === c.brain.warTarget || x === c.brain.betraying ? 0.35 : x === c.leader ? 0.3 : c.brain.rel.get(x).hostile ? 0.2 : 0;
    if (w === 0) continue;
    for (const [p, o] of b.v.owner) if (o === x && owner(p) !== x) score += w * b.value(p);
    score += w * 100 * count(c.units, (u) => u.power === x && lost.has(u.id));
  }
  // A friend's city relieved: the besiegers of a city of a friend's driven out, for a share of it.
  for (const x of b.v.sieges)
    if (lost.has(x.province) && c.units.some((u) => u.id === x.province && u.power === x.besieger) && relief(b, c.brain, x.province, c.willing) !== null)
      score += (0.25 + 0.25 * c.p.honesty) * b.value(x.province);

  // And what a sworn partner loses to him.
  for (const [partner, foe] of c.coalitions) {
    for (const [p, o] of b.v.owner) if (o === partner && owner(p) === foe) score -= 0.25 * b.value(p);
    score -= 25 * count(c.units, (u) => u.power === partner && lost.has(u.id));
  }

  // What lies open next season: land that a hostile neighbour could walk into.
  const kappa = 0.3 + 0.3 * c.p.caution;
  for (const p of held) {
    const occ = at.tryGet(p);
    const here = occ !== undefined && occ.power === me;
    // Walls add nothing to the defence, but an attacker gets them only by storming them (more than walls and defence).
    const walls = b.wallLevel(p);
    const helpers = count(mineAfter, ([k, u]) => k !== p && Board.Sail.canMove(u.kind, k, p));
    const defence = here ? 1 + helpers : Math.min(1, helpers);
    let risk = 0.0;
    const capital = Board.Map.get(p).capital && Board.Map.isHome(me, p);
    for (const [x, fear] of c.hostility) {
      // A capital is trusted only to a sworn ally.
      const h = capital && !c.brain.rel.get(x).allied ? Math.max(fear, 0.3) : fear;
      if (h < 0.15) continue;
      const from: string[] = [];
      for (const [k, u] of at) if (u.power === x && Board.Sail.canMove(u.kind, k, p)) from.push(k);
      const attackers = from.length;
      if (attackers === 0) continue;
      // Our troop standing its ground there has the ground's help against his blow.
      const stands = here ? defence + b.groundFrom(from, p) : defence;
      // Behind walls, getting in is not taking: only a storm takes it next season; a lone entry only begins a siege. But within
      // the walls of our capital it puts the kingdom at stake.
      const chance =
        walls > 0
          ? attackers > walls + (here ? stands : 0)
            ? h
            : attackers > stands
              ? h * (capital ? CapitalAtStake / 0.45 : 0.15)
              : 0
          : attackers > stands
            ? h
            : attackers === stands
              ? h * 0.3
              : 0;
      risk = 1 - (1 - risk) * (1 - chance);
    }
    if (risk > 0) score -= risk * kappa * (b.value(p) + (here ? UnitWorth : 0));
  }

  // Troops placed to strike next season.
  for (const [p, u] of mineAfter) {
    const reaches = Board.Sail.movesFrom(u.kind, p)
      .filter((n) => !Board.Map.get(n).isSea && owner(n) !== me && c.prey(owner(n)))
      .map((n) => b.value(n));
    score += 0.05 * (reaches.length === 0 ? 0 : max(reaches, (x) => x));
  }
  return score;
}

export const Search = { improve, pictured, stake, stoodAgainstUs, CapitalAtStake };
