/** The non-military half of a script king, first part: strategy and treasury. */
import {
  HSet,
  StartWalls,
  buy,
  cede,
  clamp,
  cmpBool,
  cmpNum,
  cmpPower,
  cmpStr,
  count,
  desc,
  disband,
  fortify,
  giftUnit,
  max,
  raise,
  sortBy,
  sum,
  type CedeProvinceOrder,
  type Order,
  type Power,
  type Province,
  type Rng,
} from "@amarna/engine";
import { Board } from "./board.ts";
import { endMayBeNear } from "./ending-belief.ts";
import type { Brain } from "./brain.ts";
import type { MilitaryPlan } from "./tactics.ts";

// ================================================================= strategy

/** Chooses (or keeps) the king to make war on, and whether to break an oath this season. */
export function strategy(b: Board, brain: Brain, rng: Rng): void {
  const p = brain.p;
  const me = b.me;
  const leader = b.leader();
  const reach = reachableLand(b);
  // Troops a king can field, from what we see and what we have seen of him lately.
  const force = (x: Power): number => Math.max(count(b.others, (u) => u.power === x), brain.armySeen.tryGet(x)?.[0] ?? 0);

  // What a war on a king could win this year: each province of his within reach, by the chance our troops there beat what he
  // can hold it with (a unit and its supports, walls, or troops that can block).
  const prize = (x: Power): number =>
    sum(
      [...reach].filter((t) => b.ownerOf(t) === x),
      (t) => {
        const strikers = b.mine.filter((u) => Board.Map.canMove(u.kind, u.province, t)).map((u) => u.province);
        const strike = strikers.length;
        // Troops we cannot see may stand in his provinces next to it.
        const unseen = Math.max(0, force(x) - count(b.others, (u) => u.power === x));
        const hidden = count(Board.Map.neighbors(t), (n) => b.ownerOf(n) === x && !b.v.visible.includes(n));
        const backers = b.muster(x, t) + Math.min(unseen, hidden);
        // His troop there has the ground's help against our blow.
        const defence = b.unitAt.tryGet(t)?.power === x ? 1 + b.groundFrom(strikers, t) + 0.6 * backers : b.walls(t) ? 1 + 0.6 * backers : 0.5 * backers;
        const chance = strike > defence + 0.5 ? 0.8 : strike > defence ? 0.5 : strike > defence - 0.5 ? 0.25 : 0.05;
        // Taken land must still be kept: count a little over half of what holding it to the end is worth.
        return b.value(t) * chance * 0.6;
      },
    );
  const ours = b.mine.length;
  const neighbours = [...b.neighbours()];
  const sworn = brain.swornFoes(b);
  // How far the leader stands above the rest of us: the further, the more urgent it is to hold him back.
  let lead = 0;
  if (leader !== null && leader !== me) {
    const rest = [...b.alive].filter((x) => x !== leader).map((x) => b.growth(x));
    lead = b.growth(leader) - (rest.length === 0 ? 1 : max(rest, (x) => x));
  }

  // War target: keep it while it still makes sense, otherwise pick the best.
  const current = brain.warTarget;
  if (
    current !== null &&
    (!b.alive.has(current) ||
      brain.isFriend(current) ||
      prize(current) <= 0 ||
      b.v.turn - brain.warSince > 8 ||
      // Too strong to fight alone, unless we do not fight him alone.
      (force(current) > ours + 1 && brain.rel.get(current).lastAttackedUs < b.v.turn - 2 && !sworn.has(current)) ||
      // A war of choice on one of the rest, while the leader runs away: think again.
      (current !== leader && lead >= 0.2 && !sworn.has(current) && brain.rel.get(current).lastAttackedUs < b.v.turn - 2))
  )
    brain.warTarget = null;
  if (brain.warTarget === null) {
    const scored = [...b.alive]
      .filter((x) => x !== me)
      .map((x): [Power, number] => {
        const r = brain.rel.get(x);
        // A war is worth what it can win: the odds of our troops against his,
        const odds = clamp((ours + 0.5) / (force(x) + 0.5), 0.25, 1.6);
        // what we can take from him (see prize),
        if (![...reach].some((t) => b.ownerOf(t) === x)) return [x, -Number.MAX_VALUE];
        // and the kings who could fall on us while we are busy with him.
        const flank =
          sum(
            neighbours.filter((y) => y !== x && !brain.isFriend(y)),
            (y) => Math.max(0, force(y) - ours + 1) * 40.0,
          ) *
          (0.5 + p.caution);
        // A runaway leader, and above all one we have sworn with others to stand against, is everyone's war. While he runs
        // away, a war among the rest of us only helps him.
        const balance =
          (x === leader ? 160 + 400 * Math.min(0.5, lead) : leader !== null && leader !== me ? -300 * Math.min(0.5, lead) * (0.5 + p.diplomacy) : 0) +
          (sworn.has(x) ? 120 + 160 * p.honesty : 0);
        // A tablet we sent him binds us until his answer is back: no king offers peace one season and marches the next,
        // unless he was attacked in between.
        const since = b.v.turn - r.proposedTurn;
        const pending = !r.treaty && since <= 3 && r.lastAttackedUs < r.proposedTurn;
        if (pending && since <= 2) return [x, -Number.MAX_VALUE];
        const score =
          prize(x) * odds * (0.4 + p.aggression) +
          r.grudge * p.vengeance * 40 +
          balance -
          flank -
          (r.treaty || pending ? 400 * p.honesty : 0) -
          (r.allied ? 800 : 0) -
          // A king who courts us (gifts, oaths, supports) is worth more as a friend than as prey.
          Math.max(0, r.trust) * 350 -
          Math.min(3, r.supportsGiven) * 60;
        return [x, score];
      });
    const best = sortBy(scored, [(t: [Power, number]) => t[1], desc(cmpNum)], [(t: [Power, number]) => t[0], cmpPower])[0];
    // In the first year, letters are still on the road: only the warlike or the wronged start a war.
    const patience = b.v.turn <= 3 ? 80 * (1 - p.aggression) : 0;
    if (best[1] > 140 * (1 - p.aggression) + 40 + patience) {
      brain.warTarget = best[0];
      brain.warSince = b.v.turn;
    }
  }

  // Betrayal: only for the faithless, only when an ally's land lies open, never against a sworn partner near the end.
  brain.betraying = null;
  if (p.honesty < 0.55) {
    for (const ally of sortBy(
      [...b.alive].filter((x) => x !== me && brain.isFriend(x)),
      [(x: Power) => x, cmpPower],
    )) {
      if (brain.rel.get(ally).allied && endMayBeNear(b.v.turn, b.v.openAge, b.v.ageBand)) continue;
      // A broken oath costs a name for honesty with every court that hears of it: worth it only for a real prize.
      if (b.v.turn <= 3 || brain.rel.get(ally).supportsGiven > 0) continue;
      const open = sum(
        [...reach].filter((t) => b.ownerOf(t) === ally && !b.unitAt.has(t) && !b.walls(t)),
        (t) => b.value(t),
      );
      if (open > 400 * (0.5 + p.honesty) && rng.chance((1 - p.honesty) * 0.35)) {
        brain.betraying = ally;
        break;
      }
    }
  }
}

/**
 * Whether a king is worth a coalition of these two: more than either of them could hold back alone, judged by strength, not
 * growth.
 */
export function outweighs(b: Board, top: Power, a: Power, c: Power): boolean {
  return b.strength(top) >= 0.85 * Math.max(b.strength(a), b.strength(c)) && b.growth(top) > Math.max(b.growth(a), b.growth(c));
}

/** Two great kings of a size, both among the three strongest: rivals for the crown. */
export function rivals(b: Board, a: Power, c: Power): boolean {
  const top = new HSet(sortBy([...b.alive], [(x: Power) => b.strength(x), desc(cmpNum)], [(x: Power) => x, cmpPower]).slice(0, 3));
  const sa = b.strength(a);
  const sc = b.strength(c);
  return top.has(a) && top.has(c) && Math.min(sa, sc) >= 0.7 * Math.max(sa, sc);
}

/** Whether one king's land borders another's, by land or across a sea. */
export function touches(b: Board, x: Power, y: Power): boolean {
  const theirs = new HSet<string>();
  for (const [k, o] of b.v.owner) if (o === y) theirs.add(k);
  for (const [k, o] of b.v.owner)
    if (o === x && (Board.Map.neighbors(k).some((n) => theirs.has(n)) || [...theirs].some((t) => Board.Map.sharesSea(k, t)))) return true;
  return false;
}

export function reachableLand(b: Board): HSet<string> {
  return new HSet(b.mine.flatMap((u) => Board.Map.movesFrom(u.kind, u.province)).filter((t) => !Board.Map.get(t).isSea));
}

// ================================================================= treasury

export function economy(b: Board, brain: Brain, plan: MilitaryPlan, orders: Order[], rng: Rng): void {
  const p = brain.p;
  const v = b.v;
  const me = b.me;
  // Back pay owed is gold already spent: the people it is owed to will claim it when they are back at court.
  let gold = v.gold - v.backPay;
  let flow = v.income - v.upkeep - v.wallUpkeep - v.wages;
  // While income covers upkeep, a small cushion is enough; a treasury that bleeds needs a season or two in hand.
  const costs = v.upkeep + v.wallUpkeep + v.wages;
  const reserve = (flow >= 0 ? costs * 0.3 * (0.5 + p.caution) : costs * (1 + p.caution)) + p.greed * 40 + 20;

  // Disband before the troops desert: the least needed unit goes first. A unit that must go is given instead to a friend
  // whose land or troops it stands next to, and who can feed it (see troopsFor). When nothing idle is left and the treasury
  // cannot pay next season's upkeep, troops will desert whatever they are doing: one a friend can take is given to it.
  const upkeepOf = (u: string): number => (b.unitAt.get(u).kind === "Army" ? v.prices.get("armyUpkeep") : v.prices.get("fleetUpkeep"));
  while (flow < 0 && gold + 2 * flow < 0) {
    const idle =
      sortBy(
        [...plan.role].filter(([k, r]) => (r === "hold" || r === "move") && !plan.threatened.has(k)).map(([k]) => k),
        [(x: string) => b.value(x), cmpNum],
        [(x: string) => x, cmpStr],
      )[0] ?? null;
    if (idle === null) {
      if (gold + flow >= 0) break;
      const deserter =
        sortBy(
          [...plan.orders].filter(([, o]) => !(o.type === "disband" || o.type === "giftUnit")).map(([k]) => k).filter((u) => troopsFor(b, brain, u, upkeepOf(u)) !== null),
          [(x: string) => b.value(x), cmpNum],
          [(x: string) => x, cmpStr],
        )[0] ?? null;
      if (deserter === null) break;
      plan.orders.set(deserter, giftUnit(deserter, troopsFor(b, brain, deserter, upkeepOf(deserter))!));
      plan.role.set(deserter, "gift");
      flow += upkeepOf(deserter);
      continue;
    }
    const upkeep = upkeepOf(idle);
    const friend = troopsFor(b, brain, idle, upkeep);
    if (friend !== null) {
      plan.orders.set(idle, giftUnit(idle, friend));
      plan.role.set(idle, "gift");
    } else {
      plan.orders.set(idle, disband(idle));
      plan.role.set(idle, "disband");
    }
    flow += upkeep;
  }

  // Levies, where a plan fell short and the treasury can feed the unit for the rest of the game. A levy stands only if the
  // province is still ours after movement, so the provinces a rival is least likely to walk into this season come first:
  // those under no threat, then the least likely to be attacked, then the capital and the richest.
  const spots: Province[] = sortBy(
    Board.Map.homeOf(me).filter((x) => b.ownerOf(x.id) === me && !b.unitAt.has(x.id) && !plan.destinations.has(x.id)),
    [(x: Province) => plan.danger.tryGet(x.id)?.[1] ?? 0, cmpNum],
    [(x: Province) => x.capital, desc(cmpBool)],
    [(x: Province) => x.yield, desc(cmpNum)],
  );
  const maritime = me === "Alashiya" || me === "Arzawa";
  let raised = 0;
  for (const [near, value] of sortBy(plan.shortfalls, [(s: [string, number]) => s[1], desc(cmpNum)])) {
    if (raised >= 2) break;
    const spot = spots.find((s) => s.id === near || Board.Map.canMove("Army", s.id, near) || (s.isCoastal && Board.Map.canMove("Fleet", s.id, near))) ?? null;
    if (spot === null) continue;
    const fleet = (spot.isCoastal && !Board.Map.canMove("Army", spot.id, near)) || (spot.isCoastal && maritime && count(b.mine, (u) => u.kind === "Fleet") < 2);
    const cost = fleet ? v.prices.get("fleet") : v.prices.get("army");
    const upkeep = fleet ? v.prices.get("fleetUpkeep") : v.prices.get("armyUpkeep");
    const lifetime = cost + upkeep * Math.min(b.horizon, 10);
    if (value < lifetime * (0.7 + 0.5 * p.caution) * (1.3 - 0.6 * p.aggression)) continue;
    if (gold - cost < reserve) continue;
    if (flow - upkeep < -(gold - cost - reserve) / Math.max(3, b.horizon)) continue;
    orders.push(raise(spot.id, fleet ? "Fleet" : "Army"));
    spots.splice(spots.indexOf(spot), 1);
    gold -= cost;
    flow -= upkeep;
    raised++;
  }
  if (b.mine.length === 0 && spots.length > 0 && gold - v.prices.get("army") >= reserve) {
    orders.push(raise(spots[0].id, "Army"));
    gold -= v.prices.get("army");
  }

  // Walls, at most a level a season, where they pay (see fortification).
  let fortified = false;
  const walls = fortification(b, plan, gold - reserve);
  if (walls !== null) {
    orders.push(fortify(walls[0]));
    gold -= walls[1];
    fortified = true;
  }

  // Cities: buying turns gold into the same score in land, plus its income, behind walls that now stand for the buyer.
  const units = b.mine.map((u) => u.province);
  const neutral: string[] = [];
  for (const [k, o] of v.owner) if (o === null) neutral.push(k);
  const offers = sortBy(
    neutral
      .filter((g) => {
        const there = b.unitAt.tryGet(g);
        return b.ownerOf(g) === null && (there === undefined || there.power === me) && !plan.destinations.has(g) && Board.Map.withinReach(g, me, v.owner, units);
      })
      .map((g) => {
        const y = Board.Map.get(g).yield;
        const danger = [...b.alive].some((x) => x !== me && b.muster(x, g) >= 2 && brain.hostility(x, b) > 0.4) ? 0.35 : 0.08;
        // A city a rival can also reach may bounce our bid; prefer the ones only we can buy.
        const rivalCount = count(
          b.alive,
          (x) =>
            x !== me &&
            Board.Map.withinReach(
              g,
              x,
              v.owner,
              b.others.filter((u) => u.power === x).map((u) => u.province),
            ),
        );
        // A city whose elders lately would not choose between us and another buyer may draw the same rival again.
        const when = brain.outbid.tryGet(g);
        const contested = when !== undefined && v.turn - when <= 3 ? 0.6 : 1;
        return { id: g, price: y * v.prices.get("cityPricePerYield"), score: (y * b.horizon - danger * 10 * y) * (rivalCount === 0 ? 1.15 : 1 - 0.1 * Math.min(3, rivalCount)) * contested };
      })
      .filter((o) => o.score > 0),
    [(o: { id: string; price: number; score: number }) => o.score / o.price, desc(cmpNum)],
    [(o: { id: string; price: number; score: number }) => o.id, cmpStr],
  );
  let buys = 0;
  const margin = reserve * (1.2 - 0.7 * p.commerce);
  for (const o of offers) {
    if (buys >= (p.commerce > 0.45 ? 2 : 1)) break;
    if (gold - o.price < margin) continue;
    // Two kings who both bid every season never get the city: after a refusal, bid again only half the time.
    const refused = brain.outbid.tryGet(o.id);
    if (refused !== undefined && v.turn - refused <= 3 && !rng.chance(0.5)) continue;
    orders.push(buy(o.id));
    gold -= o.price;
    buys++;
  }
  // Walls against fleets alone (see fortification), with what the cities left.
  if (!fortified) {
    const fleetWalls = fortification(b, plan, gold - reserve, true);
    if (fleetWalls !== null) {
      orders.push(fortify(fleetWalls[0]));
      gold -= fleetWalls[1];
    }
  }
  brain.spareGold = gold - reserve;

  // Land we cannot keep goes to a friend rather than to a rival ahead of us (see cession).
  const c = cession(b, brain, plan);
  if (c !== null) orders.push(c);
}

/**
 * The province of ours whose walls are best strengthened this season, and the price, if any pays. `againstFleets`: only
 * unwalled land that fleets alone threaten (MilitaryPlan.byFleets), after the first year; otherwise every province but those.
 */
export function fortification(b: Board, plan: MilitaryPlan, spare: number, againstFleets = false): [string, number] | null {
  const v = b.v;
  const price = v.prices.getOrDefault("fortifyPerLevel", 50);
  const upkeep = v.prices.getOrDefault("wallUpkeep", 5);
  let best: [string, number, number] | null = null;
  const owned: string[] = [];
  for (const [k, o] of v.owner) if (o === b.me) owned.push(k);
  for (const id of sortBy(owned, [(x: string) => x, cmpStr])) {
    const level = b.wallLevel(id);
    const within = b.unitAt.tryGet(id);
    if (level >= 3 || b.siegeAt(id) !== null || (within !== undefined && within.power !== b.me)) continue;
    let chance = plan.danger.tryGet(id)?.[1] ?? 0;
    let share = level === 0 ? 0.35 : 0.15;
    let floor = 0.4;
    // Unwalled land that only fleets threaten, empty or not: a first level keeps it from fleets for good, since fleets never
    // take walls; not in the first year (turns 1 to 3).
    const fleets = plan.byFleets.tryGet(id);
    const byFleets = level === 0 && fleets !== undefined;
    if (againstFleets !== byFleets) continue;
    // Against fleets alone a further level adds nothing: fleets never take walls of any height.
    if (level > 0 && plan.byFleets.has(id)) continue;
    if (byFleets) {
      if (v.turn <= 3) continue;
      chance = Math.max(chance, fleets!);
      share = 0.6;
      floor = 0.25;
    }
    // The walls rise at the end of the season, after the moves: an empty province without walls that a feared king can walk
    // into now would be his before they stand.
    else if (level === 0 && !b.mine.some((u) => u.province === id)) continue;
    if (chance < floor) continue;
    const cost = price * (level + 1);
    const above = level + 1 > (StartWalls.get(id) ?? 0);
    const net = chance * b.value(id) * share - cost - (above ? upkeep * Math.min(b.horizon, 10) : 0);
    if (net <= 0 || cost > spare - 60) continue;
    if (best === null || net > best[2]) best = [id, cost, net];
  }
  return best === null ? null : [best[0], best[1]];
}

/**
 * A friend to give a unit we can no longer pay for: one we would not betray, whose land or troops it stands in or next to,
 * and whose treasury, as we reckon it, feeds the unit for four seasons. The friend we trust most first. Never a unit
 * standing in our own land.
 */
function troopsFor(b: Board, brain: Brain, unit: string, upkeep: number): Power | null {
  if (b.isMine(unit)) return null;
  return (
    sortBy(
      [...b.alive].filter(
        (x) =>
          x !== b.me &&
          brain.isFriend(x) &&
          brain.betraying !== x &&
          brain.treasury.getOrDefault(x, 0) >= 4 * upkeep &&
          (b.ownerOf(unit) === x || Board.Map.neighbors(unit).some((n) => b.ownerOf(n) === x || b.unitAt.tryGet(n)?.power === x)),
      ),
      [(x: Power) => brain.rel.get(x).trust, desc(cmpNum)],
      [(x: Power) => x, cmpPower],
    )[0] ?? null
  );
}

/**
 * A province of ours we cannot keep, ceded to a friend who can, before a rival ahead of us takes it. At most one a season.
 */
function cession(b: Board, brain: Brain, plan: MilitaryPlan): CedeProvinceOrder | null {
  const me = b.me;
  const mine = b.growth(me);
  const leader = b.leader();
  const owned: string[] = [];
  for (const [k, o] of b.v.owner) if (o === me) owned.push(k);
  for (const x of sortBy(owned, [(x: string) => b.value(x), desc(cmpNum)], [(x: string) => x, cmpStr])) {
    const prov = Board.Map.get(x);
    // Land a friend ceded to us is kept: passed on, it would only go round the friends a rival is coming for.
    if (prov.home === me || b.walls(x) || b.unitAt.has(x) || plan.destinations.has(x) || brain.received.has(x)) continue;
    if (b.mine.some((u) => Board.Map.canMove(u.kind, u.province, x))) continue;
    // Next to it, or a move from it: ceded before he arrives, it is a friend's land he would have to march into.
    const coming = (r: Power): boolean =>
      b.muster(r, x) > 0 || b.others.some((u) => u.power === r && Board.Map.movesFrom(u.kind, u.province).some((n) => Board.Map.canMove(u.kind, n, x)));
    const rival =
      [...b.alive].find(
        (r) =>
          r !== me &&
          !brain.isFriend(r) &&
          coming(r) &&
          (r === leader || b.growth(r) >= mine) &&
          (brain.belligerence.getOrDefault(r, 0) >= 0.8 || brain.rel.get(r).hostile),
      ) ?? null;
    if (rival === null) continue;
    const gain = prov.yield * b.yieldWorth;
    const against = (b.strength(rival) + gain) / b.startStrength(rival);
    const friend =
      sortBy(
        [...b.alive].filter(
          (f) =>
            f !== me &&
            f !== leader &&
            brain.isFriend(f) &&
            brain.betraying !== f &&
            (b.muster(f, x) > 0 || Board.Map.neighbors(x).some((n) => b.ownerOf(n) === f)) &&
            (b.strength(f) + gain) / b.startStrength(f) < against,
        ),
        [(f: Power) => brain.rel.get(f).trust, desc(cmpNum)],
        [(f: Power) => f, cmpPower],
      )[0] ?? null;
    if (friend !== null) return cede(x, friend);
  }
  return null;
}
