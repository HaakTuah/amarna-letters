/**
 * The script kings' sieges and their relief (split from tactics.ts, which plans the season's troop orders): which of our
 * armies standing in foreign walls besiege them, the sallies that go with a plan, whether a friend's besieged city is worth
 * relieving, whether the king will fight a given king at all, and what a siege is worth against a storm.
 */
import { besiege, cmpNum, cmpStr, sally, sortBy, type Order, type Power, type SallyOrder, type UnitView } from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import type { MilitaryPlan } from "./tactics.ts";

export function besiegeAll(b: Board, brain: Brain, plan: MilitaryPlan): void {
  const leader = b.leader();
  for (const u of b.mine.filter((u) => u.kind === "Army" && b.walls(u.province) && !b.isMine(u.province)).map((u) => u.province)) {
    const o = plan.orders.tryGet(u);
    if (!(o === undefined || o.type === "hold")) continue;
    const holder = b.ownerOf(u);
    if (holder !== null && !willing(b, brain, holder, leader)) continue;
    plan.orders.set(u, besiege(u));
    plan.role.set(u, "siege");
  }
}

/**
 * The sallies that go with a plan (the siege package): each of our moves into a city of ours whose walls can sally, with
 * foreign troops within them, is supported by the walls (+1, a support that cannot be cut).
 */
export function sallies(b: Board, orders: Iterable<Order>, brain: Brain | null = null): SallyOrder[] {
  const min = b.v.prices.getOrDefault("sallyMinWalls", 2);
  if (min <= 0) return [];
  const moves = [...orders].filter((m): m is Extract<Order, { type: "move" }> => m.type === "move");
  const eligible = moves.filter((m) => b.isMine(m.to) && b.wallLevel(m.to) >= min && b.v.units.some((u) => u.province === m.to && u.power !== b.me));
  const byCity = new Map<string, Extract<Order, { type: "move" }>[]>();
  for (const m of eligible) {
    let g = byCity.get(m.to);
    if (!g) byCity.set(m.to, (g = []));
    g.push(m);
  }
  const list: SallyOrder[] = [...byCity.values()].map((g) => {
    const m = sortBy(g, [(x: Extract<Order, { type: "move" }>) => x.unit, cmpStr])[0];
    return sally(m.to, m.unit);
  });
  if (brain === null) return list;
  // A city of ours besieged by a king who is no friend, with no move of ours into it: its walls sally for a friend's troop
  // next to it, should it come to drive the besiegers out.
  for (const x of sortBy(
    b.v.sieges.filter((x) => x.holder === b.me && b.wallLevel(x.province) >= min && !brain.isFriend(x.besieger)),
    [(x) => x.province, cmpStr],
  )) {
    if (list.some((y) => y.city === x.province)) continue;
    const friend =
      sortBy(
        b.v.units.filter((u) => u.power !== b.me && u.power !== x.besieger && brain.isFriend(u.power) && Board.Sail.canMove(u.kind, u.province, x.province)),
        [(u: UnitView) => (u.kind === "Army" ? 0 : 1), cmpNum],
        [(u: UnitView) => u.province, cmpStr],
      )[0] ?? null;
    if (friend !== null) list.push(sally(x.province, friend.province));
  }
  return list;
}

/**
 * The besiegers of a friend's city, if this court would drive them out: a city of a friend we are not betraying, under
 * siege by the troop standing within it, whose king we are willing to fight, or who is no friend of ours while the city's
 * holder is our full ally.
 */
export function relief(b: Board, brain: Brain, city: string, isWilling: (p: Power) => boolean): UnitView | null {
  const holder = b.ownerOf(city);
  if (holder === null || holder === b.me || !brain.isFriend(holder) || brain.betraying === holder) return null;
  const within = b.unitAt.tryGet(city) ?? null;
  if (within === null || within.power === holder || within.power === b.me) return null;
  const siege = b.siegeAt(city);
  if (siege === null || siege.besieger !== within.power) return null;
  return isWilling(within.power) || (brain.rel.get(holder).allied && !brain.isFriend(within.power)) ? within : null;
}

/**
 * Whether our troops should march to a friend's city to relieve it: we see it besieged by a king we would drive out (see
 * relief), or its holder pleaded with us in the last four seasons, it is still his, he is still our friend, we would fight
 * its besieger, and we do not see the siege over.
 */
export function relieving(b: Board, brain: Brain, city: string, isWilling: (p: Power) => boolean): boolean {
  if (relief(b, brain, city, isWilling) !== null) return true;
  const plea = brain.pleas.tryGet(city);
  if (plea === undefined || b.v.turn - plea[2] > 4 || b.ownerOf(city) !== plea[0]) return false;
  if (!brain.isFriend(plea[0]) || brain.betraying === plea[0] || !b.alive.has(plea[1])) return false;
  if (b.v.visible.includes(city) && b.siegeAt(city) === null) return false;
  return isWilling(plea[1]) || (brain.rel.get(plea[0]).allied && !brain.isFriend(plea[1]));
}

/** Whether the king will send troops against another king this season. Decided by his own temper, never by a trial plan. */
export function willing(b: Board, brain: Brain, owner: Power, leader: Power | null): boolean {
  if (owner === b.me) return false;
  if (owner === brain.betraying) return true;
  if (brain.isFriend(owner)) return false;
  if (owner === brain.warTarget || brain.rel.get(owner).hostile || brain.swornFoes(b).has(owner)) return true;
  if (owner === leader) return brain.p.aggression > 0.25;
  // While another king runs away with the game, only the most warlike still pick fights among the rest.
  return brain.p.aggression > (leader !== null && leader !== b.me ? 0.8 : 0.55);
}

/**
 * What getting within walls without storming them is worth against taking the city at once: the army then stands and
 * besieges it for as many seasons as the walls are high (fewer with support), and may be driven out meanwhile. Since item
 * 11e a city of many men is seldom stormed and most fall to a siege, so a siege is worth more than when storms were the
 * way in (0.6 / (1 + 0.25 x walls) before).
 */
export function siegeWorth(walls: number): number {
  return 0.85 / (1 + 0.2 * walls);
}
