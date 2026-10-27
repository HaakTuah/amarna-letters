/**
 * A script king's standing orders: every seat may keep them. A standing order answers a move in the season it is made and
 * replaces the season's orders for its units, so it is a defence that costs nothing unless the blow comes. Each season the
 * king first looks over the standing orders it keeps and cancels those that no longer make sense against this season's plan;
 * then it gives new ones for the seasons ahead. It rolls no dice: the same view and plan give the same orders.
 */
import {
  Dict,
  HSet,
  MaxStanding,
  cmpBool,
  cmpNum,
  cmpStr,
  count,
  describe,
  desc,
  distinct,
  max,
  move,
  newStandingRequest,
  sortBy,
  support,
  terrainOf,
  type Order,
  type Power,
  type StandingOrderView,
  type StandingRequest,
  type StandingWhen,
  type UnitKind,
  type UnitView,
} from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import type { MilitaryPlan } from "./tactics.ts";

/** What a troop of ours standing in a province adds to its worth, as in the first plan's defence. */
const TroopWorth = 120;
/** A standing order is kept only if what it guards is worth this many times what its troops would give up when it fires. */
const KeepRatio = 1 / 0.6;
/** The least fear of a king that counts his troops as a threat, as in the first plan. */
const MinFear = 0.25;

/** What a standing order guards: a troop of ours, an empty walled city of ours, an empty province of our homeland, or a fleet that slips away. */
export type Guard = "Troop" | "Walls" | "Empty" | "Retreat";

/** A standing order the king gives, with what it guards, for the notes and the tests. */
export interface Given {
  kind: Guard;
  place: string;
  request: StandingRequest;
}

/** The province of the troop an order is for, or null for an order to no troop. */
function unitOfOrder(o: Order): string | null {
  switch (o.type) {
    case "hold":
    case "move":
    case "support":
    case "convoy":
      return o.unit;
    default:
      return null;
  }
}

/** The troops a standing order commands. */
function unitsOf(st: StandingOrderView): string[] {
  return st.orders.map(unitOfOrder).filter((u): u is string => u !== null);
}

/**
 * `orders`: the season's orders so far. Returns the standing orders to cancel, by id with why (for the notes), and the new
 * standing orders.
 */
export function plan(b: Board, brain: Brain, mplan: MilitaryPlan, orders: readonly Order[]): [[string, string][], Given[]] {
  const me = b.me;
  const cancel: [string, string][] = [];
  const give: Given[] = [];
  const mine = new Dict<string, UnitView>(b.v.units.filter((u) => u.power === me).map((u) => [u.province, u] as const));
  // Troops that leave our hands this season, by the treasury's orders: they answer nothing next season.
  const going = new HSet(orders.map((o) => (o.type === "disband" ? o.unit : o.type === "giftUnit" ? o.unit : null)).filter((x): x is string => x !== null));
  const fresh = (unit: string): Order | null => mplan.orders.tryGet(unit) ?? null;
  const stays = (unit: string): boolean => {
    if (!mine.has(unit) || going.has(unit)) return false;
    const f = fresh(unit);
    return f === null || f.type === "hold" || f.type === "support" || f.type === "convoy" || f.type === "besiege";
  };
  // An army of ours besieging a city stays where it is, but presses the siege only if it holds there: it guards nothing else.
  const besieging = (unit: string): boolean => fresh(unit)?.type === "besiege";
  // The walls of a city we besiege may sally for an attack on our army there: one more to beat.
  const sallyMin = b.v.prices.getOrDefault("sallyMinWalls", 2);
  const sallyOf = (place: string): number => (besieging(place) && sallyMin > 0 && b.wallLevel(place) >= sallyMin ? 1 : 0);
  const worth = (place: string): number => (b.isMine(place) ? b.value(place) : 0) + (mine.has(place) ? TroopWorth : 0);

  // Fear of each king, as the first plan reckons it: a friend counts a quarter, and next to the capital anyone but a full
  // ally counts at least 0.3.
  const capital = Board.Map.capital(me).id;
  const hostility = new Dict<Power, number>(
    [...b.alive].filter((x) => x !== me).map((x) => [x, brain.hostility(x, b) * (brain.isFriend(x) && brain.betraying !== x ? 0.25 : 1)] as const),
  );
  const fear = (x: Power, place: string): number => (place === capital && !brain.rel.get(x).allied ? Math.max(hostility.get(x), 0.3) : hostility.get(x));
  // The most troops one feared king, seen or remembered, could bring against a place next season, and how much he is feared.
  const threats = new Map<string, [number, number]>();
  const threat = (place: string): [number, number] => {
    const known = threats.get(place);
    if (known !== undefined) return known;
    let best: [number, number] = [0, 0.0];
    for (const x of hostility.keys()) {
      const chance = fear(x, place);
      if (chance < MinFear) continue;
      const n = count(
        b.others,
        (u) =>
          u.power === x &&
          u.province !== place &&
          (Board.Map.canMove(u.kind, u.province, place) || Board.Map.movesFrom(u.kind, u.province).some((m) => m !== place && Board.Map.canMove(u.kind, m, place))),
      );
      if (n > best[0] || (n === best[0] && n > 0 && chance > best[1])) best = [n, chance];
    }
    threats.set(place, best);
    return best;
  };
  // The most troops one feared king, seen or remembered, could move into a place this season.
  const muster = (place: string): number => {
    const ms = [...hostility.keys()].filter((x) => fear(x, place) >= MinFear).map((x) => b.muster(x, place));
    return ms.length === 0 ? 0 : max(ms, (x) => x);
  };
  // The ground's help to a troop of ours standing there against any blow: rough ground only.
  const rough = (place: string): number => (terrainOf(place) === "Rough" ? b.groundBonus : 0);
  const used = new HSet<string>();

  const planMoves = (): Extract<Order, { type: "move" }>[] => [...mplan.orders.values()].filter((m): m is Extract<Order, { type: "move" }> => m.type === "move");

  // What a troop's order for this season is worth, which a standing order that fires takes from it.
  const into = (target: string): number => {
    const x = b.unitAt.tryGet(target);
    if (x !== undefined && x.power !== me) return 0.85 * b.value(target) + TroopWorth;
    if (b.isMine(target)) return mplan.threatened.has(target) && !mine.has(target) ? 0.6 * b.value(target) : 0;
    return 0.85 * b.value(target);
  };
  const cost = (f: Order, guarded: string): number => {
    switch (f.type) {
      case "hold":
        return 0;
      // A besieger that does something else this season does not press its siege: a step lost.
      case "besiege":
        return (0.45 * b.value(f.unit)) / (b.wallLevel(f.unit) + 1.0);
      case "convoy":
        return Number.MAX_VALUE;
      case "move":
        return into(f.to);
      case "support":
        if (f.to !== null && f.to !== undefined) return into(f.to);
        return f.supported === guarded ? 0 : worth(f.supported);
      default:
        return 0;
    }
  };

  // Why a standing order kept so far should not fire this season, or null if it should stand.
  const unsound = (st: StandingOrderView): string | null => {
    const place = st.province;
    if (threat(place)[0] === 0) return "no threat";
    if (st.when === "UnitAttacked") {
      // The troop it guards marches out this season, or leaves our hands: there is nothing left to hold.
      if (!mine.has(place) || fresh(place)?.type === "move") return "the troop marches";
      if (going.has(place)) return "the troop goes";
    } else if (!b.isMine(place)) return "lost";
    // An empty province one of our troops moves into, or stands in now: two of ours would bounce there.
    else if (mine.has(place) || planMoves().some((m) => m.to === place)) return "ours to enter";
    // This season's plan already gives every one of its orders: firing would change nothing, so it waits no longer.
    if (
      st.orders.every((o) => {
        const u = unitOfOrder(o);
        if (u === null) return false;
        const f = fresh(u);
        return f !== null && describe(f) === describe(o);
      })
    )
      return "the plan does it";
    // The plan guards the troop its own way: one of ours moves into its province with support.
    if (st.when === "UnitAttacked" && planMoves().some((m) => m.to === place)) return "the plan guards it";
    // A troop or walls that hold this season without its supports against all that a feared king could move in now.
    const lone = st.orders.length === 1 ? st.orders[0] : null;
    const slipping = lone !== null && lone.type === "move" && lone.unit === place && !Board.Map.get(place).isSea;
    if (st.orders.every((o) => o.type === "support" && (o.to ?? null) === null) || slipping)
      if (
        1 +
          rough(place) +
          count(mine.keys(), (u) => {
            if (st.orders.some((o) => unitOfOrder(o) === u)) return false;
            const s = fresh(u);
            return s !== null && s.type === "support" && (s.to ?? null) === null && s.supported === place;
          }) >=
        muster(place) + sallyOf(place)
      )
        return "held without it";
    // An army that slips away from a siege when attacked: not once the city is ours, or the siege given up.
    if (slipping && !besieging(place)) return "no siege";
    for (const o of st.orders) {
      const u = unitOfOrder(o);
      if (u === null) continue;
      const troop = mine.tryGet(u);
      if (troop === undefined || going.has(u)) return "a troop gone";
      const reach = o.type === "support" ? (o.to ?? o.supported) : o.type === "move" ? o.to : null;
      if (reach !== null && !Board.Map.canMove(troop.kind, u, reach)) return "out of reach";
      // A troop that slips away must still have somewhere safe to go.
      if (o.type === "move" && u === place && (b.unitAt.has(o.to) || muster(o.to) > 0)) return "no refuge";
      // A troop that marches out to block is stopped with the attacker and stays where it was, holding alone: not one the
      // plan has others support holding.
      if (o.type === "move" && u !== place && [...mplan.orders.values()].some((x) => x.type === "support" && (x.to ?? null) === null && x.supported === u)) return "needed at home";
      // What the troop would give up if it fires: its own order for this season.
      const f = fresh(u);
      if (f !== null && describe(f) !== describe(o) && !(o.type === "move" && u === place) && cost(f, place) * KeepRatio > worth(place)) return "needed elsewhere";
    }
    return null;
  };

  // ---- The standing orders kept so far: any may fire this season, in place of this season's orders for its troops.
  const kept: StandingOrderView[] = [];
  for (const st of b.v.standing) {
    const why = unsound(st);
    if (why !== null) cancel.push([st.id, why]);
    else {
      kept.push(st);
      for (const u of unitsOf(st)) used.add(u);
    }
  }

  // ---- New standing orders, for the seasons ahead: the places a feared king could strike next season, most worth first.
  const room = MaxStanding - kept.length;
  const key = (when: StandingWhen, place: string): string => when + "\n" + place;
  const covered = new HSet(kept.map((st) => key(st.when, st.province)));
  const add = (kind: Guard, place: string, when: StandingWhen, given: Order[], units: Iterable<string>): void => {
    give.push({ kind, place, request: newStandingRequest({ when, province: place, orders: given }) });
    covered.add(key(when, place));
    for (const u of units) used.add(u);
  };
  // Where a troop could slip away to: next to it, empty, ours, free or at sea, and where no feared king's troop could move in.
  const refuge = (from: string, kind: UnitKind): string | null =>
    sortBy(
      Board.Map.movesFrom(kind, from).filter((q) => {
        if (b.unitAt.has(q) || (b.walls(q) && !b.isMine(q)) || muster(q) !== 0) return false;
        const o = b.ownerOf(q);
        return o === null || o === me || Board.Map.get(q).isSea;
      }),
      [(q: string) => b.isMine(q), desc(cmpBool)],
      [(q: string) => q, cmpStr],
    )[0] ?? null;

  const owned: string[] = [];
  for (const [k, o] of b.v.owner) if (o === me) owned.push(k);
  const places = sortBy(
    distinct([...owned, ...mine.keys()])
      .map((x) => ({ place: x, threat: threat(x) }))
      .filter((x) => x.threat[0] > 0),
    [(x: { place: string; threat: [number, number] }) => x.threat[1] * worth(x.place), desc(cmpNum)],
    [(x: { place: string; threat: [number, number] }) => x.place, cmpStr],
  );
  for (const { place, threat: [strength] } of places) {
    if (give.length >= room) break;
    // Our troops next to it that stay where they are this season, the least threatened first.
    const helpers = sortBy(
      [...mine.keys()].filter((u) => u !== place && !used.has(u) && stays(u) && !besieging(u) && Board.Map.canMove(mine.get(u).kind, u, place)),
      [(u: string) => threat(u)[1] * worth(u), cmpNum],
      [(u: string) => u, cmpStr],
    );
    const troop = mine.tryGet(place);
    if (troop !== undefined) {
      // A troop of ours that stays: against more than one, it needs supports to hold (one fewer on rough ground; one more for
      // a besieger, whose city's walls may sally).
      const ground = rough(place);
      const sally = sallyOf(place);
      if (!stays(place) || strength + sally - ground < 2 || muster(place) + sally - ground < 2 || covered.has(key("UnitAttacked", place))) continue;
      const supp = helpers.slice(0, Math.max(0, strength + sally - 1 - ground));
      if (supp.length > 0)
        add(
          "Troop",
          place,
          "UnitAttacked",
          supp.map((h) => support(h, place)),
          supp,
        );
      else if ((Board.Map.get(place).isSea || besieging(place)) && !used.has(place)) {
        // A fleet at sea, or an army besieging a city, with nothing to help it and nothing to lose there but the troop: it
        // slips away as the blow falls.
        const r = refuge(place, troop.kind);
        if (r !== null) add("Retreat", place, "UnitAttacked", [move(place, r)], [place]);
      }
    } else if (b.isMine(place) && (Board.Map.get(place).home === me || b.walls(place)) && !covered.has(key("UnitEnters", place))) {
      // Empty land of our homeland, or an empty walled city of ours: a troop next to it marches in as the enemy does, and an
      // attacker without support bounces; the troop stays where it was (the least threatened goes).
      const blocker = helpers[0] ?? null;
      if (blocker !== null) add(b.walls(place) ? "Walls" : "Empty", place, "UnitEnters", [move(blocker, place)], [blocker]);
    }
  }
  return [cancel, give];
}

export const Contingencies = { plan };
