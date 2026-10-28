/**
 * Plans a season of troop orders. It reads threats to every province it holds, values every reachable target by what it
 * adds to the score over the rest of the game, sizes each attack to beat the likely defence (supports included), and
 * commits units to the best operations first: defending, blocking, cutting supports, attacking, convoying, then moving up.
 */
import {
  Dict,
  HSet,
  besiege,
  cmpNum,
  cmpPower,
  cmpStr,
  convoy,
  count,
  desc,
  distinct,
  hold,
  max,
  move,
  roundEven,
  sally,
  sortBy,
  support,
  toInt,
  idiv,
  type Order,
  type Power,
  type SallyOrder,
  type UnitKind,
  type UnitView,
  WinterData,
  shareOfFull,
  unitFood,
} from "@amarna/engine";
import { Board } from "./board.ts";
import { grantedTo } from "./authority.ts";
import type { Brain } from "./brain.ts";
import type { Personality } from "./personality.ts";
import { LandingPatience, LandingRest, SeaPlay, chooseLanding, landingsFrom, nearestHarbour, seaChains, stepToward } from "./seas.ts";

/** The season's troop orders, and what the plan still lacks (for levies). */
export class MilitaryPlan {
  readonly orders = new Dict<string, Order>();
  readonly role = new Dict<string, string>();
  readonly destinations = new HSet<string>();
  /** Places where one more unit would have paid off, with what it was worth, and the kind wanted if it matters. */
  readonly shortfalls: [string, number, UnitKind?][] = [];
  readonly threatened = new HSet<string>();
  /** For each threatened province, the strength of the likeliest attack on it and how likely it is to come. */
  readonly danger = new Dict<string, [number, number]>();
  /**
   * Land of ours that only fleets threaten: a foreign fleet could move into it this season, and every foreign troop that
   * could move into it now, or move next to it first, is a fleet; with how much the most feared such king is feared.
   */
  readonly byFleets = new Dict<string, number>();
}

/** `other`: the partner's troop an assist supports. `chain`: the fleets that carry a convoy, one in each sea zone. */
interface Op {
  kind: string;
  net: number;
  target: string;
  lead: string;
  helpers: string[];
  other: string | null;
  chain: string[];
}

const op = (kind: string, net: number, target: string, lead: string, helpers: string[], other: string | null = null, chain: string[] = []): Op => ({
  kind,
  net,
  target,
  lead,
  helpers,
  other,
  chain,
});

/** A blow struck together at the land of a king sworn against: one troop goes in, the others support it. */
export interface Joint {
  target: string;
  against: Power;
  lead: UnitView;
  support: UnitView[];
}

/**
 * Attacks on the land of a king we have sworn with partners to stand against, made by a rule each of them can work out
 * from its own side of the board, so that no letter has to settle who does what: next to each of his provinces (the
 * richest first, each troop once), the troops of the partner with the least land go in (an army before a fleet, then by
 * province) and every other sworn troop there supports them. Only troops in sight count, and only blows that could land.
 */
export function joints(b: Board, brain: Brain): Joint[] {
  const list: Joint[] = [];
  const coalitions = brain.coalitions(b);
  if (coalitions.length === 0) return list;
  const used = new HSet<string>();
  const landOf = (x: Power): number => {
    let s = 0;
    for (const [k, o] of b.v.owner.entries()) if (o === x) s += b.yieldOf(k);
    return s;
  };
  for (const foe of sortBy(distinct(coalitions.map(([, a]) => a)), [(x: Power) => x, cmpPower])) {
    const side = new HSet([...coalitions.filter(([, a]) => a === foe).map(([p]) => p), b.me]);
    const targets = sortBy(
      [...b.v.owner.entries()].filter(([k, o]) => o === foe && b.v.visible.includes(k)).map(([k]) => k),
      [(t: string) => b.yieldOf(t), desc(cmpNum)],
      [(t: string) => t, cmpStr],
    );
    for (const t of targets) {
      const near = b.v.units.filter((u) => side.has(u.power) && !used.has(u.province) && Board.Sail.canMove(u.kind, u.province, t));
      if (!near.some((u) => u.power === b.me) || near.every((u) => u.power === b.me)) continue;
      const lead = sortBy(
        near,
        [(u: UnitView) => landOf(u.power), cmpNum],
        [(u: UnitView) => u.power, cmpPower],
        [(u: UnitView) => (u.kind === "Army" ? 0 : 1), cmpNum],
        [(u: UnitView) => u.province, cmpStr],
      )[0];
      const supp = near.filter((u) => u !== lead);
      // Walls add nothing to the battle: a blow lands if it beats the troop there (behind walls it begins a siege), with the
      // ground's help to it against the troop that goes in.
      const held = b.unitAt.tryGet(t)?.power === foe ? 1 + b.ground(lead.province, t) : 0;
      const backers = b.units.filter((u) => u.power === foe && u.province !== t && Board.Sail.canMove(u.kind, u.province, t)).length;
      if (1 + supp.length <= held + idiv(backers + 1, 2)) continue;
      used.add(lead.province);
      for (const s of supp) used.add(s.province);
      list.push({ target: t, against: foe, lead, support: supp });
    }
  }
  return list;
}

/** Script kings' winter strokes over the snowbound passes; off to measure them against kings who never try (`--no-winter-play`). */
// eslint-disable-next-line
export const WinterStrokes: { on: boolean; only: ReadonlySet<string> | null } = { on: true, only: null };

/** `temper`: plays the season with these weights instead of the king's own (to draw alternative plans). */
export function makePlan(b: Board, brain: Brain, temper: Personality | null = null): MilitaryPlan {
  const plan = new MilitaryPlan();
  const p = temper ?? brain.p;
  const me = b.me;
  const free = new HSet(b.mine.map((u) => u.province));
  // Units that must not move this season. They may still support, which holds just as well.
  const stay = new HSet<string>();
  const leader = b.leader();
  const hostility = new Dict<Power, number>(
    [...b.alive].filter((x) => x !== me).map((x) => [x, brain.hostility(x, b) * (brain.isFriend(x) && brain.betraying !== x ? 0.25 : 1)] as const),
  );

  const isWilling = (owner: Power): boolean => willing(b, brain, owner, leader);
  const sworn = brain.swornFoes(b);

  const multiplier = (owner: Power | null): number => {
    if (owner === null) return 1 - 0.45 * p.commerce;
    if (owner === me) return 1;
    if (owner === brain.betraying) return 1.1;
    if (owner === brain.warTarget || sworn.has(owner)) return 1.3;
    if (owner === leader) return 1.2;
    if (brain.rel.get(owner).hostile) return 1.0 + 0.3 * p.vengeance;
    return 0.55 + 0.45 * p.aggression;
  };

  const capital = Board.Map.capital(me).id;
  // Gifts and fair words may lull a court, but it trusts its capital only to a sworn ally.
  // A king we have heard has fallen, whose troops we still remember, is feared not at all.
  const fear = (x: Power, province: string): number =>
    !hostility.has(x) ? 0 : province === capital && !brain.rel.get(x).allied ? Math.max(hostility.get(x), 0.3) : hostility.get(x);

  // ---- Threats: the strongest attack any one king could bring, weighted by how likely he is to bring it.
  const danger = (province: string): [number, number] => {
    let best: [number, number] = [0, 0.0];
    for (const x of [...b.alive].filter((x) => x !== me)) {
      const m = b.muster(x, province);
      if (m === 0) continue;
      const chance = fear(x, province);
      if (chance < 0.25) continue;
      if (m > best[0] || (m === best[0] && chance > best[1])) best = [m, chance];
    }
    return best;
  };

  const threat = new Dict<string, [number, number]>();
  const ownedNow: string[] = [];
  for (const [k, o] of b.v.owner.entries()) if (o === me) ownedNow.push(k);
  for (const prov of distinct([...ownedNow, ...free])) {
    const d = danger(prov);
    if (d[0] > 0) {
      threat.set(prov, d);
      plan.threatened.add(prov);
      plan.danger.set(prov, d);
    }
  }
  // Land of ours that only fleets threaten, a fleet next to it now (see MilitaryPlan.byFleets). A friend's fleet counts too, at
  // the least fear that counts at all.
  for (const prov of sortBy(
    ownedNow.filter((k) => !Board.Map.get(k).isSea),
    [(x: string) => x, cmpStr],
  )) {
    const near = b.others.filter(
      (u) =>
        u.province !== prov &&
        (Board.Sail.canMove(u.kind, u.province, prov) || Board.Sail.movesFrom(u.kind, u.province).some((n) => n !== prov && Board.Sail.canMove(u.kind, n, prov))),
    );
    if (near.length > 0 && near.every((u) => u.kind === "Fleet") && near.some((u) => Board.Sail.canMove(u.kind, u.province, prov)))
      plan.byFleets.set(
        prov,
        max(near, (u) => Math.max(0.25, fear(u.power, prov))),
      );
  }

  // The chance that some hostile king walks into a province within two moves, for the homeland and capital.
  const nearby = (province: string): number => {
    let best = 0.0;
    for (const u of b.others) {
      const f = fear(u.power, province);
      if (f < 0.25) continue;
      const close = Board.Sail.canMove(u.kind, u.province, province) || Board.Sail.movesFrom(u.kind, u.province).some((n) => Board.Sail.canMove(u.kind, n, province));
      if (close) best = Math.max(best, f * 0.6);
    }
    return best;
  };

  // What we risk by marching a unit out of a province we hold.
  const exposure = (origin: string): number => {
    if (!b.isMine(origin)) return 0;
    const t = threat.tryGet(origin);
    let chance = t !== undefined ? t[1] : 0;
    const prov = Board.Map.get(origin);
    if (prov.capital || prov.home === me) chance = Math.max(chance, nearby(origin));
    return chance * b.value(origin) * (0.6 + 0.5 * p.caution);
  };

  // The capital keeps its garrison while enemies are near.
  if (free.has(capital) && nearby(capital) >= (b.mine.length <= 2 ? 0.15 : 0.2) && (b.mine.length <= 2 || p.caution > 0.5)) stay.add(capital);

  const helpersFor = (target: string, exclude: string): string[] =>
    sortBy(
      [...free].filter((u) => u !== exclude && Board.Sail.canMove(b.unitAt.get(u).kind, u, target)),
      [
        (u: string) => {
          const t = threat.tryGet(u);
          return t !== undefined ? t[1] * b.value(u) : 0;
        },
        cmpNum,
      ],
      [(u: string) => u, cmpStr],
    );

  const ops: Op[] = [];

  // ---- Defend: hold threatened units and walls with enough supports.
  for (const [prov, t] of threat) {
    const hasUnit = free.has(prov);
    if (!hasUnit) {
      // Empty land, walled or not (walls do not hold in a battle): march in to bounce whoever comes.
      const blocker = helpersFor(prov, "").find((u) => !stay.has(u) && (!threat.has(u) || b.value(u) < b.value(prov))) ?? null;
      if (blocker !== null && !b.unitAt.has(prov)) ops.push(op("block", t[1] * b.value(prov) * 0.6 - exposure(blocker), prov, blocker, []));
      continue;
    }
    // The likeliest attacker; the ground's help against his blow counts with our troop.
    const attacker =
      sortBy(
        [...b.alive].filter((x) => x !== me && b.muster(x, prov) === t[0]),
        [(x: Power) => hostility.get(x), desc(cmpNum)],
      )[0] ?? "Egypt";
    const needed = t[0] - 1 - b.groundAgainst(prov, attacker);
    if (needed <= 0) continue;
    const helpers = helpersFor(prov, prov).slice(0, needed);
    const worth = (b.isMine(prov) ? b.value(prov) : 0) + (hasUnit ? 120 : 0);
    const share = helpers.length >= needed ? 1.0 : (0.5 * helpers.length) / needed;
    if (helpers.length > 0 || hasUnit) ops.push(op("defend", t[1] * worth * share * (0.7 + 0.6 * p.caution), prov, hasUnit ? prov : "", helpers));
    if (helpers.length < needed) plan.shortfalls.push([prov, t[1] * worth]);

    // Cut the supports of the attack, from anywhere but the province under threat.
    for (const supporter of b.canReach(prov, (u) => u.power === attacker).map((u) => u.province)) {
      const cutter = helpersFor(supporter, prov).find((u) => u !== prov) ?? null;
      if (cutter !== null) ops.push(op("cut", t[1] * worth * 0.35 - exposure(cutter), supporter, cutter, []));
    }
  }

  // A relief of a friend's besieged city: one of our armies moves in on the besiegers with enough supports to beat their
  // likely hold, never so many that it could storm the walls (the city would be ours, not our friend's). Worth a share of
  // the city to its holder, as a support for a friend's blow is, and the besiegers' troop.
  const reliefOp = (besieger: UnitView): Op | null => {
    const target = besieger.province;
    const backers = b.canReach(target, (u) => u.power === besieger.power && u.province !== target).length;
    const able = helpersFor(target, "");
    const lead =
      sortBy(
        able.filter((u) => !stay.has(u) && b.unitAt.get(u).kind === "Army"),
        [(u: string) => b.ground(u, target), cmpNum],
        [(u: string) => exposure(u), cmpNum],
        [(u: string) => u, cmpStr],
      )[0] ?? null;
    if (lead === null) return null;
    const defence = 1 + toInt(roundEven(backers * (0.5 + 0.3 * p.caution))) + b.ground(lead, target);
    const sallyBonus = b.wallLevel(target) >= b.v.prices.getOrDefault("sallyMinWalls", 2) ? 1 : 0;
    if (defence > b.wallLevel(target) - sallyBonus) return null;
    const helpers = able.filter((u) => u !== lead).slice(0, defence);
    if (helpers.length < defence) return null;
    const gain = (0.25 + 0.25 * p.honesty) * b.value(target) + 120 * (multiplier(besieger.power) >= 1 ? 1 : 0.5);
    return op("attack", 0.85 * gain - exposure(lead) - 6 * helpers.length - (b.unitAt.get(lead).kind === "Army" ? b.desertCost(target) : 0), target, lead, helpers);
  };

  // ---- Attack: every reachable province we would gain from.
  const targets = distinct([...free].flatMap((u) => Board.Sail.movesFrom(b.unitAt.get(u).kind, u))).filter((t) => !Board.Map.get(t).isSea);
  for (const target of targets) {
    const owner = b.ownerOf(target);
    const occupant = b.unitAt.tryGet(target) ?? null;
    if (occupant?.power === me) continue;
    if (owner === me && occupant === null) continue;
    // A friend's city besieged by a king we would fight: drive the besiegers out (see relief).
    const besieger = relief(b, brain, target, isWilling);
    if (besieger !== null) {
      const r = reliefOp(besieger);
      if (r !== null) ops.push(r);
      continue;
    }
    if (owner !== null && owner !== me && !isWilling(owner)) continue;
    if (occupant !== null && occupant.power !== me && !isWilling(occupant.power) && owner !== me) continue;
    // A friend's troop standing within our walls as a guest is left alone; one that besieges them is driven out.
    const besieged = owner === me && b.siegeAt(target) !== null;
    if (owner === me && occupant !== null && occupant.power !== me && !isWilling(occupant.power) && !besieged) continue;

    // Walls add nothing to the battle (the siege package): the defence is the troop there and its likely supports.
    let defence: number;
    if (occupant !== null) {
      const backers = b.canReach(target, (u) => u.power === occupant.power && u.province !== target).length;
      defence = 1 + toInt(roundEven(backers * (0.5 + 0.3 * p.caution)));
    } else defence = b.resistance(target); // Empty land not ours: its people resist (item 10+a).

    const musters = [...b.alive].filter((x) => x !== me && x !== occupant?.power).map((x) => b.muster(x, target));
    const rivals = musters.length === 0 ? 0 : max(musters, (x) => x);
    const contest = rivals === 0 ? 0 : p.caution > 0.5 ? rivals : Math.max(0, rivals - 1);

    let gain = (owner === me ? 0 : b.value(target)) * multiplier(owner) + (occupant !== null ? 120 : 0);
    if (owner !== null && owner !== me && Board.Map.get(target).capital) gain += 60;
    // Our own city besieged: driving the besieger out saves it.
    if (besieged) gain += 0.9 * b.value(target);

    const able = helpersFor(target, "");
    if (able.length === 0) continue;
    // Within foreign walls only an army can do anything: storm them, or stand and besiege the city.
    const walled = b.walls(target) && owner !== me;
    const movers = able.filter((u) => !stay.has(u) && (!walled || b.unitAt.get(u).kind === "Army"));
    if (movers.length === 0) continue;
    // Against a troop standing its ground, lead from where the ground helps it least: a move over open ground needs one
    // support fewer than one over a pass or a river.
    const lead = sortBy(
      movers,
      [(u: string) => (occupant === null ? 0 : b.ground(u, target)), cmpNum],
      [(u: string) => exposure(u), cmpNum],
      [(u: string) => (b.unitAt.get(u).kind === "Army" ? 0 : 1), cmpNum],
      [(u: string) => u, cmpStr],
    )[0];
    if (occupant !== null) defence += b.ground(lead, target);
    const required = Math.max(defence, contest) + 1;
    // Strong enough to storm the walls, the attack takes the city at once; only strong enough to get in, the army stands
    // inside and besieges it, which takes seasons and may be broken: worth less, the higher the walls.
    const storm = walled ? Math.max(required, b.stormNeeds(target, defence)) : required;
    const stormHelpers = able.filter((u) => u !== lead).slice(0, Math.max(0, storm - 1));
    const helpers = 1 + stormHelpers.length >= storm ? stormHelpers : able.filter((u) => u !== lead).slice(0, Math.max(0, required - 1));
    const stormed = !walled || 1 + helpers.length >= storm;
    if (1 + helpers.length >= required) {
      const chance = 0.85 - (defence > 1 ? 0.1 : 0);
      const worth = stormed ? gain : gain * siegeWorth(b.wallLevel(target)) + (occupant !== null ? 60 : 0);
      // An army that ends the season in desert land not ours pays for supplies.
      const desert = b.unitAt.get(lead).kind === "Army" ? b.desertCost(target) : 0;
      ops.push(op("attack", chance * worth - exposure(lead) - 6 * helpers.length - desert, target, lead, helpers));
    } else if (gain > 150) plan.shortfalls.push([target, gain * 0.5]);
  }

  // An army on a coast with nothing it could take by land this season: every land or coast link leads to our own land, to
  // walls, or to a king we will not fight. Carried over the sea it can work again.
  const stranded = (army: string): boolean =>
    !Board.Sail.movesFrom("Army", army).some((n) => {
      if (b.isMine(n)) return false;
      const o = b.ownerOf(n);
      return o === null || isWilling(o);
    });

  // ---- Convoy: an army on the coast, our fleets at sea in a chain from its waters to the waters of a coast beyond (build
  // order item 7a: an army lands only from the waters of the coast it lands on). For a stranded army the convoy is worth
  // more than the fleets taking that coast themselves: the army goes in, and the fleets stay at sea to carry or strike again.
  const freeFleetAt = (z: string): boolean => free.has(z) && b.unitAt.get(z).kind === "Fleet" && !stay.has(z);
  for (const army of [...free].filter((u) => b.unitAt.get(u).kind === "Army" && Board.Map.get(u).isCoastal))
    for (const [zone, chain] of seaChains(army, freeFleetAt))
      for (const target of landingsFrom(zone).filter((t) => t !== army && !Board.Sail.canMove("Army", army, t))) {
        const owner = b.ownerOf(target);
        if (b.unitAt.has(target) || owner === me || (owner !== null && !isWilling(owner))) continue;
        const musters = [...b.alive].filter((x) => x !== me).map((x) => b.muster(x, target));
        const required = 1 + Math.max(b.resistance(target), Math.min(1, musters.length === 0 ? 0 : max(musters, (x) => x)));
        const helpers = helpersFor(target, army)
          .filter((u) => !chain.includes(u))
          .slice(0, Math.max(0, required - 1));
        if (1 + helpers.length < required) continue;
        // A landing that does not storm the walls only begins a siege.
        const landed = b.walls(target) && 1 + helpers.length < b.stormNeeds(target, b.resistance(target)) ? siegeWorth(b.wallLevel(target)) : 1;
        const carried = landed * (stranded(army) ? 0.85 * (b.value(target) * multiplier(owner)) + 60 : 0.75 * b.value(target) * multiplier(owner));
        ops.push(op("convoy", carried - exposure(army) - 10 * (chain.length - 1), target, army, helpers, null, chain));
      }

  // ---- Sieges: an army of ours within foreign walls we mean to take stays and besieges the city (each season it holds
  // there wears the city down a step), with a support from a neighbouring troop when that saves a season.
  for (const at of sortBy(
    [...free].filter((u) => b.unitAt.get(u).kind === "Army" && b.walls(u) && !b.isMine(u)),
    [(u: string) => u, cmpStr],
  )) {
    const holder = b.ownerOf(at);
    if (holder !== null && !isWilling(holder)) continue;
    const x = b.siegeAt(at);
    const left = b.wallLevel(at) - (x !== null && x.besieger === me ? x.progress : 0);
    const helper = left >= 2 ? (helpersFor(at, at).find((u) => !stay.has(u) && !threat.has(u)) ?? null) : null;
    const worth = (0.9 * b.value(at) * multiplier(holder)) / Math.max(1, left) + 40;
    // A coastal city is supplied by sea, and worn down a step less, unless a fleet of ours holds its waters (item 7a).
    const waters = Board.Map.get(at).waters;
    const ours = (z: string): boolean => b.unitAt.tryGet(z)?.power === me && b.unitAt.get(z).kind === "Fleet";
    const blockader =
      waters === null || b.v.prices.getOrDefault("seaSupply", 1) <= 0 || !SeaPlay.on
        ? null
        : ours(waters)
          ? waters
          : b.unitAt.has(waters)
            ? null
            : (sortBy(
                [...free].filter((f) => b.unitAt.get(f).kind === "Fleet" && !stay.has(f) && !threat.has(f) && Board.Sail.canMove("Fleet", f, waters)),
                [(f: string) => f, cmpStr],
              )[0] ?? null);
    const supplied = waters !== null && blockader === null && b.v.prices.getOrDefault("seaSupply", 1) > 0 && SeaPlay.on;
    ops.push(op("siege", supplied && helper === null ? worth / 4 : supplied ? worth / 2 : worth, at, at, helper === null ? [] : [helper]));
    if (waters !== null && blockader !== null && free.has(blockader)) ops.push(op("blockade", worth / 2 + 20, waters, blockader, []));
    else if (supplied && !b.unitAt.has(waters!)) {
      // No fleet of ours can reach the city's waters this season: the nearest free one sails towards them, or, with none, a
      // fleet is wanted in the home harbour nearest them (a levy, if the treasury can carry it).
      const open = (z: string): boolean => !b.unitAt.has(z) || ours(z);
      const far = sortBy(
        [...free].filter((f) => b.unitAt.get(f).kind === "Fleet" && !stay.has(f) && !threat.has(f)),
        [(f: string) => f, cmpStr],
      )
        .map((f) => [f, stepToward(f, waters!, open)] as const)
        .find(([, step]) => step !== null);
      if (far !== undefined) ops.push(op("blockade", worth / 3 + 10, far[1]!, far[0], []));
      else {
        const harbour = nearestHarbour(me, waters!, (x) => b.isMine(x) && !b.unitAt.has(x), open);
        if (harbour !== null) plan.shortfalls.push([Board.Map.get(harbour).waters!, 0.6 * b.value(at) * multiplier(holder)]);
      }
    }
  }

  // ---- Guard the waters of our capital and walled coasts against a landing: an army lands only from the waters of the
  // coast it lands on, so a fleet of ours standing there stops it, when a foreign fleet not of a friend is near.
  for (const p of sortBy(
    Board.Map.landProvinces.filter((x) => SeaPlay.on && x.waters !== null && b.isMine(x.id) && (x.capital || b.wallLevel(x.id) >= 2)),
    [(x: { id: string }) => x.id, cmpStr],
  )) {
    const w = p.waters!;
    // Foreign waters are not ours to guard; ours already held by a fleet given other orders need no second one.
    if (b.unitAt.has(w) && (b.unitAt.get(w).power !== me || !free.has(w))) continue;
    const near = seaChains(p.id, () => true, 3);
    const menaced = b.others.some(
      (u) => u.kind === "Fleet" && !brain.isFriend(u.power) && (near.has(u.province) || (Board.Map.get(u.province).waters !== null && near.has(Board.Map.get(u.province).waters!))),
    );
    if (!menaced) continue;
    const guard = free.has(w)
      ? w
      : (sortBy(
          [...free].filter((f) => b.unitAt.get(f).kind === "Fleet" && !stay.has(f) && !threat.has(f) && Board.Sail.canMove("Fleet", f, w)),
          [(f: string) => (f === p.id ? 0 : 1), cmpNum],
          [(f: string) => f, cmpStr],
        )[0] ?? null);
    if (guard !== null) ops.push(op("guard", 0.3 * b.value(p.id) + 30, w, guard, []));
  }

  // ---- Joint blows with sworn partners (see joints): go in when it is our turn, support when it is theirs.
  for (const j of joints(b, brain)) {
    const taken = b.value(j.target) * (b.unitAt.has(j.target) ? 1 : 0.85);
    if (j.lead.power === me) {
      // At peace with him, we leave the blow to a partner rather than break the oath.
      if (!isWilling(j.against)) continue;
      const helpers = j.support.filter((u) => u.power === me).map((u) => u.province);
      const gain = b.value(j.target) * multiplier(j.against) + (b.unitAt.has(j.target) ? 120 : 0);
      ops.push(op("attack", 0.85 * gain + 40 - exposure(j.lead.province) - 6 * helpers.length, j.target, j.lead.province, helpers));
    } else {
      // A support sends no troops into his land, so even a king at peace with him may give it.
      for (const s of j.support.filter((u) => u.power === me)) ops.push(op("assist", (0.25 + 0.25 * p.honesty) * taken + 40, j.target, s.province, [], j.lead.province));
    }
  }

  // ---- Supports promised in letters (item 8): we keep our word where a troop of ours can still give it, and make the move
  // a partner promised to support, counting his troop with ours.
  if (temper === null) {
    for (const pr of brain.promised.filter((x) => x.turn === b.v.turn)) {
      if (b.unitAt.tryGet(pr.from)?.power !== pr.of) continue;
      const giver = sortBy(
        [...free].filter((f) => f !== pr.to && Board.Sail.canMove(b.unitAt.get(f).kind, f, pr.to)),
        [(f: string) => f, cmpStr],
      )[0];
      if (giver !== undefined) ops.push(op("assist", (0.3 + 0.4 * p.honesty) * b.value(pr.to) + 60, pr.to, giver, [], pr.from));
    }
    for (const pr of brain.offered.filter((x) => x.turn === b.v.turn)) {
      const owner = b.ownerOf(pr.to);
      if (b.unitAt.tryGet(pr.from)?.power !== me || !free.has(pr.from) || owner === me || (owner !== null && !isWilling(owner))) continue;
      if (!Board.Sail.canMove(b.unitAt.get(pr.from).kind, pr.from, pr.to)) continue;
      ops.push(op("attack", 0.85 * b.value(pr.to) * (owner === null ? 1 : multiplier(owner)) + 60 - exposure(pr.from), pr.to, pr.from, []));
    }
  }

  // ---- A landing in mind (see Landing in seas.ts): kept from season to season, so that our fleets put to sea in the zones
  // of its chain and hold there, the army comes to its coast and waits, and a fleet more is raised if we lack one; when the
  // chain is whole the army is carried over. Given up once landed, when the target is no longer worth it, or after
  // LandingPatience seasons. Only the king's own plan keeps it (a trial plan with another temper reads it as it stands).
  if (SeaPlay.on) {
    const landingWorth = (t: string): number => {
      const o = b.ownerOf(t);
      if (o === me || (o !== null && !isWilling(o))) return 0;
      return b.value(t) * multiplier(o) * (b.walls(t) ? siegeWorth(b.wallLevel(t)) : 1);
    };
    const seaOpen = (z: string): boolean => !b.unitAt.has(z) || b.unitAt.get(z).power === me;
    if (temper === null) {
      const L = brain.landing;
      if (L !== null) {
        const army = b.unitAt.tryGet(L.from);
        const lost = !b.isMine(L.from) && !(army?.power === me && army.kind === "Army");
        if (lost || landingWorth(L.target) <= 0 || L.chain.some((z) => !seaOpen(z))) brain.landing = null;
        else if (b.v.turn - L.since >= LandingPatience) {
          brain.landing = null;
          brain.landingRest = b.v.turn + LandingRest;
        }
      }
      if (brain.landing === null && b.v.turn >= brain.landingRest)
        brain.landing = chooseLanding(
          b,
          b.v.turn,
          landingWorth,
          seaOpen,
          (from) =>
            !threat.has(from) &&
            (Board.Map.get(from).home === me || [...free].some((u) => b.unitAt.get(u).kind === "Army" && Board.Sail.canMove("Army", u, from))),
          exposure,
          150,
        );
    }
    const L = brain.landing;
    if (L !== null) {
      const w = landingWorth(L.target);
      const fleetsOwned = count(b.mine, (u) => u.kind === "Fleet");
      const armyThere = free.has(L.from) && b.unitAt.get(L.from).kind === "Army" && !stay.has(L.from) && !threat.has(L.from);
      const whole = L.chain.every((z, i) => freeFleetAt(z) && (i === 0 || Board.Sail.neighbors(L.chain[i - 1]).includes(z)));
      const launch = whole && armyThere && !b.unitAt.has(L.target);
      if (launch) {
        // Carried over, and nothing waits any longer: a king who could put a troop into the target this season may bounce
        // us, which costs only the season.
        const rivals = [...b.alive].some((x) => x !== me && b.muster(x, L.target) > 0);
        ops.push(op("convoy", (rivals ? 0.6 : 0.85) * w + 60 - exposure(L.from), L.target, L.from, [], null, [...L.chain]));
        // A fleet that convoys still stands in its waters, and no army lands from them: guarding them gives it no reason to
        // stay out of the chain.
        for (let i = ops.length - 1; i >= 0; i--) if (ops[i].kind === "guard" && ops[i].lead === ops[i].target && L.chain.includes(ops[i].lead)) ops.splice(i, 1);
      }
      // The fleets: each zone of the chain held by one of ours, the nearest spare fleet sailing to it (or a step towards it).
      // A fleet under threat at sea or off land not ours guards nothing by staying, so it may go too.
      const spare = sortBy(
        [...free].filter((f) => b.unitAt.get(f).kind === "Fleet" && !stay.has(f) && (!threat.has(f) || !b.isMine(f)) && !L.chain.includes(f)),
        [(f: string) => f, cmpStr],
      );
      for (const z of L.chain) {
        if (freeFleetAt(z)) {
          if (!launch) ops.push(op("landing", 0.4 * w, z, z, []));
          continue;
        }
        if (b.unitAt.has(z)) continue;
        const near = spare.find((f) => Board.Sail.canMove("Fleet", f, z));
        const way = near !== undefined ? ([near, z] as const) : spare.map((f) => [f, stepToward(f, z, (x) => !b.unitAt.has(x))] as const).find(([, s]) => s !== null);
        if (way === undefined || way[1] === null) continue;
        spare.splice(spare.indexOf(way[0]), 1);
        ops.push(op("landing", 0.35 * w, way[1], way[0], []));
      }
      if (fleetsOwned < L.chain.length) {
        // A fleet more, raised in the home harbour nearest the chain (a levy, if the treasury can carry it).
        const harbour = nearestHarbour(me, L.chain[0], (x) => b.isMine(x) && !b.unitAt.has(x), seaOpen);
        if (harbour !== null) plan.shortfalls.push([Board.Map.get(harbour).waters!, w, "Fleet"]);
      } else if (count(L.chain, (z) => freeFleetAt(z)) < L.chain.length - 1) {
        // The army keeps to its work until the chain is all but whole: a season or two of waiting, not the whole voyage.
      } else if (armyThere) {
        if (!launch) ops.push(op("landing", 0.5 * w, L.from, L.from, []));
      } else if (!b.unitAt.has(L.from)) {
        // The army comes to the coast: one of ours next to it marches in, or one is raised there.
        const comer = sortBy(
          [...free].filter((u) => b.unitAt.get(u).kind === "Army" && !stay.has(u) && !threat.has(u) && Board.Sail.canMove("Army", u, L.from)),
          [(u: string) => b.value(u), cmpNum],
          [(u: string) => u, cmpStr],
        )[0];
        if (comer !== undefined) ops.push(op("landing", 0.4 * w, L.from, comer, []));
        else if (Board.Map.get(L.from).home === me && b.isMine(L.from)) plan.shortfalls.push([L.from, w, "Army"]);
      }
    }
  }

  // ---- Commit: best value first, each unit once.
  for (const o of sortBy(ops, [(o: Op) => o.net, desc(cmpNum)], [(o: Op) => o.target, cmpStr])) {
    if (o.net <= 0) break;
    if (o.lead.length > 0 && !free.has(o.lead)) continue;
    if (!(o.kind === "defend" || o.kind === "assist" || o.kind === "siege") && stay.has(o.lead)) continue;
    if ((o.kind === "attack" || o.kind === "block" || o.kind === "convoy" || o.kind === "assist" || o.kind === "blockade" || o.kind === "guard" || o.kind === "landing") && plan.destinations.has(o.target) && o.lead !== o.target) continue;
    if (o.kind === "convoy" && o.chain.some((f) => !free.has(f))) continue;
    const helpers = o.helpers.filter((h) => free.has(h));
    if (o.kind === "attack") {
      const stillNeeded = o.helpers.length;
      if (helpers.length < stillNeeded) continue;
    }

    switch (o.kind) {
      case "defend":
        if (o.lead.length > 0) stay.add(o.lead);
        for (const h of helpers) assign(plan, free, h, support(h, o.target), "support");
        break;
      case "block":
      case "cut":
        assign(plan, free, o.lead, move(o.lead, o.target), o.kind);
        if (o.kind === "block") plan.destinations.add(o.target);
        break;
      case "attack":
        assign(plan, free, o.lead, move(o.lead, o.target), "attack");
        for (const h of helpers) assign(plan, free, h, support(h, o.lead, o.target), "support");
        plan.destinations.add(o.target);
        break;
      case "convoy":
        assign(plan, free, o.lead, move(o.lead, o.target), "attack");
        for (const f of o.chain) assign(plan, free, f, convoy(f, o.lead, o.target), "convoy");
        for (const h of helpers) assign(plan, free, h, support(h, o.lead, o.target), "support");
        plan.destinations.add(o.target);
        break;
      case "assist":
        // A unit that supports stays where it is, so one kept home (or defended) may still do it.
        assign(plan, free, o.lead, support(o.lead, o.other!, o.target), "assist");
        plan.destinations.add(o.target);
        break;
      case "blockade":
      case "guard":
      case "landing":
        assign(plan, free, o.lead, o.lead === o.target ? hold(o.lead) : move(o.lead, o.target), o.kind);
        plan.destinations.add(o.target);
        break;
      case "siege":
        assign(plan, free, o.lead, besiege(o.lead), "siege");
        for (const h of helpers) assign(plan, free, h, support(h, o.lead), "support");
        break;
    }
  }

  // ---- Help allies hold against a common enemy: first against a king we are sworn against, then the leader.
  const menace = (x: Power): number => (sworn.has(x) ? 2 : x === leader ? 1.5 : hostility.getOrDefault(x, 0) > 0.4 ? 1 : 0);
  for (const u of [...free]) {
    // Only troops in sight: support for a remembered unit that has moved on would be refused.
    const candidates = b.v.units
      .filter((o) => o.power !== me && brain.isFriend(o.power) && Board.Sail.canMove(b.unitAt.get(u).kind, u, o.province))
      .map((o) => {
        const ms = [...b.alive].filter((x) => x !== me && x !== o.power && !brain.isFriend(x) && b.muster(x, o.province) > 0).map(menace);
        return { unit: o, menace: ms.length === 0 ? 0 : max(ms, (m) => m) };
      })
      .filter((x) => x.menace > 0);
    const ally = sortBy(candidates, [(x: { unit: UnitView; menace: number }) => x.menace, desc(cmpNum)], [(x: { unit: UnitView; menace: number }) => x.unit.province, cmpStr])[0]?.unit ?? null;
    if (ally === null || threat.has(u)) continue;
    assign(plan, free, u, support(u, ally.province), "ally-support");
  }

  // ---- Winter strokes (item 9, "Winter is dangerous, never closed"): an army may cross a snowbound pass into land we would
  // take where no troop stands (within walls, to besiege them), since nobody expects troops in winter. Taken only where what it wins, if the army gets
  // through (never where a foe could step in too), outweighs the army lost if it does not (its price and a year of
  // upkeep); else it waits for spring.
  if (Board.Sail !== Board.Map && WinterStrokes.on && (WinterStrokes.only === null || WinterStrokes.only.has(me))) {
    const worth = b.v.prices.getOrDefault("army", 100) + 3 * b.v.prices.getOrDefault("armyUpkeep", 30);
    for (const u of sortBy([...free], [(x: string) => x, cmpStr])) {
      if (threat.has(u) || stay.has(u) || b.unitAt.get(u).kind !== "Army") continue;
      // The share of its men the snow takes (item 11a+): by its size, halved if it carries a season's food.
      const loss = winterLoss(b, b.unitAt.get(u));
      let best: [string, number] | null = null;
      for (const t of sortBy(Board.Map.movesFrom("Army", u), [(x: string) => x, cmpStr])) {
        if (Board.Sail.canMove("Army", u, t) || Board.Map.get(t).isSea || plan.destinations.has(t) || b.unitAt.has(t)) continue;
        // A lone army does not beat a land's people that resist (item 10+a).
        if (b.resistance(t) > 0) continue;
        const owner = b.ownerOf(t);
        if (owner === me || (owner !== null && !isWilling(owner))) continue;
        // Nobody of a king we would fight could step in to meet it there, by the moves he could give in winter: a stroke
        // that may be met is not worth the snow.
        if ([...b.alive].some((x) => x !== me && !brain.isFriend(x) && b.muster(x, t) > 0)) continue;
        // Within walls it takes nothing at once: it stands and besieges them (siegeWorth).
        // What it wins, if enough of it gets through to hold the land, against the men it loses (their part of its worth).
        const gain = (1 - loss) * b.value(t) * multiplier(owner) * (b.walls(t) ? siegeWorth(b.wallLevel(t)) : 1) - loss * worth;
        if (gain > 0 && (best === null || gain > best[1])) best = [t, gain];
      }
      if (best === null) continue;
      assign(plan, free, u, move(u, best[0]), "winter-stroke");
      plan.destinations.add(best[0]);
    }
  }

  // ---- Everyone else: hold if threatened, otherwise move towards where the value is.
  for (const u of sortBy([...free], [(x: string) => x, cmpStr])) {
    if (threat.has(u) || stay.has(u)) {
      assign(plan, free, u, hold(u), "hold");
      continue;
    }
    const step = approach(b, brain, u, plan.destinations, isWilling, threat);
    if (step !== null) {
      assign(plan, free, u, move(u, step), "move");
      plan.destinations.add(step);
    } else assign(plan, free, u, hold(u), "hold");
  }
  return plan;
}

/**
 * After the look-ahead: an army of ours left holding within foreign walls we mean to take besieges the city instead (a
 * besiege order is a hold that wears the city down; the look-ahead weighs holds and moves, and a siege, once begun, goes on
 * while the army holds there, but it must be ordered to begin).
 */
/**
 * The share of a troop's men a winter crossing is expected to take (item 11a+, as the rulebook gives it): of a full unit
 * the rate the prices name, in proportion to its men, the less if it carries a season's food.
 */
export function winterLoss(b: Board, u: UnitView): number {
  const base = b.v.prices.getOrDefault(u.kind === "Army" ? "winterArmyLoss" : "winterFleetLoss", 30) / 100;
  const fed = u.food >= unitFood(u) ? WinterData.suppliedPercent / 100 : 1;
  return (base * shareOfFull(u.kind, u.men) * fed) / 1000;
}

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
 * besieges it for as many seasons as the walls are high (fewer with support), and may be driven out meanwhile.
 */
export function siegeWorth(walls: number): number {
  return 0.6 / (1 + 0.25 * walls);
}

function assign(plan: MilitaryPlan, free: HSet<string>, unit: string, order: Order, role: string): void {
  if (!free.delete(unit)) return;
  plan.orders.set(unit, order);
  plan.role.set(unit, role);
}

/** One step along the shortest path to the most attractive place within five steps. */
function approach(b: Board, brain: Brain, from: string, taken: HSet<string>, isWilling: (p: Power) => boolean, threat: Dict<string, [number, number]>): string | null {
  const kind = b.unitAt.get(from).kind;
  const prev = new Map<string, string>([[from, ""]]);
  const depth = new Map<string, number>([[from, 0]]);
  const queue = [from];
  let best: string | null = null;
  let bestScore = 0.0;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (depth.get(cur)! >= 5) continue;
    for (const n of sortBy(Board.Sail.movesFrom(kind, cur), [(x: string) => x, cmpStr])) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      depth.set(n, depth.get(cur)! + 1);
      queue.push(n);
      const owner = b.ownerOf(n);
      let lure = 0;
      if (!Board.Map.get(n).isSea && owner !== b.me && (owner === null || isWilling(owner))) lure = b.value(n);
      // Desert land not ours costs an army supplies for each season it ends there.
      if (kind === "Army") lure = Math.max(0, lure - b.desertCost(n));
      if (b.isMine(n) && threat.has(n) && !b.unitAt.has(n)) lure = Math.max(lure, b.value(n) * 0.8);
      // A friend's city besieged, as we see it or as he pleaded with us: worth marching next to it, to drive the besiegers
      // out (see relief); its walls keep us from stepping in before the blow.
      if (relieving(b, brain, n, isWilling)) lure = Math.max(lure, (0.25 + 0.25 * brain.p.honesty) * b.value(n));
      const score = lure / (1 + depth.get(n)!);
      if (score > bestScore) {
        bestScore = score;
        best = n;
      }
    }
  }
  if (best === null) return null;
  let step = best;
  while (prev.get(step) !== from) step = prev.get(step)!;
  // Foreign walls are entered only to take the city, by the attacks above; our own we may march through.
  if (taken.has(step) || b.unitAt.has(step) || (b.walls(step) && !b.isMine(step))) return null;
  // A land whose people would hold off a lone army is entered only by the attacks above, with support (item 10+a).
  if (!b.isMine(step) && b.resistance(step) > 0 && !grantedTo(b, step)) return null;
  const stepOwner = b.ownerOf(step);
  // A friend's land we hold leave in (item 9) we may pass through as his guest.
  if (stepOwner !== null && stepOwner !== b.me && !isWilling(stepOwner) && !grantedTo(b, step)) return null;
  return step;
}

export const Tactics = { joints, make: makePlan, besiege: besiegeAll, sallies, relief, relieving, willing, siegeWorth };
