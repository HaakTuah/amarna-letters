/**
 * One king's reading of the board this season, built only from its SeatView: where troops stand (those in sight, and those
 * it last saw where it cannot see now), what each province is worth, who could strike where.
 */
import {
  AllPowers,
  Dict,
  HSet,
  StartGold,
  WorldMap,
  cmpNum,
  cmpPower,
  cmpStr,
  defenceGround,
  desc,
  sortBy,
  strengthOf,
  sum,
  terrainOf,
  idiv,
  type Power,
  type Province,
  type SeatView,
  type SiegeView,
  type UnitView,
} from "@amarna/engine";
import { seasonsLeft } from "./ending-belief.ts";

export class Board {
  static readonly Map: WorldMap = WorldMap.default;

  readonly v: SeatView;
  readonly me: Power;
  /** Troops in sight, plus remembered ones out of sight. */
  readonly units: UnitView[];
  readonly unitAt: Dict<string, UnitView>;
  readonly mine: UnitView[];
  readonly others: UnitView[];
  readonly horizon: number;
  readonly alive: HSet<Power>;
  private readonly treasuries: Dict<Power, number> | null;
  private readonly growthCache = new Dict<Power, number>();
  private leaderCache: Power | null = null;
  private ranked = false;

  /** `treasuries`: what this court reckons each rival holds in gold (see Brain.treasury). */
  constructor(v: SeatView, remembered: Iterable<UnitView> | null = null, treasuries: Dict<Power, number> | null = null) {
    this.v = v;
    this.me = v.power;
    this.treasuries = treasuries;
    this.units = [...v.units, ...[...(remembered ?? [])].filter((g) => v.units.every((u) => u.province !== g.province))];
    this.unitAt = new Dict();
    for (const u of this.units) this.unitAt.tryAdd(u.province, u);
    this.mine = sortBy(
      this.units.filter((u) => u.power === this.me),
      [(u: UnitView) => u.province, cmpStr],
    );
    this.others = this.units.filter((u) => u.power !== this.me);
    this.alive = new HSet(AllPowers.filter((p) => !v.fallen.includes(p)));
    // Seasons the game can still be expected to run, as this king reads the rule.
    this.horizon = seasonsLeft(v.turn, v.openAge, v.ageBand);
  }

  get Map(): WorldMap {
    return Board.Map;
  }

  ownerOf(p: string): Power | null {
    return this.v.owner.getOrDefault(p, null);
  }

  isMine(p: string): boolean {
    return this.ownerOf(p) === this.me;
  }

  /** Whether a province has walls (they add nothing to a battle, but a city within them falls only to a storm or a siege). */
  walls(p: string): boolean {
    return this.wallLevel(p) > 0;
  }

  wallLevel(p: string): number {
    return this.v.walls.getOrDefault(p, 0);
  }

  /** The siege of a province this court knows of, if any. */
  siegeAt(p: string): SiegeView | null {
    return this.v.sieges.find((x) => x.province === p) ?? null;
  }

  /** The strength a move into a walled province needs to storm it: more than its walls and the defenders' hold together. */
  stormNeeds(p: string, defenders: number): number {
    return this.walls(p) ? this.wallLevel(p) + defenders + 1 : 0;
  }

  P(id: string): Province {
    return Board.Map.get(id);
  }

  /** What the ground gives a unit that stands its ground, as the rules of the game set it. */
  get groundBonus(): number {
    return this.v.prices.getOrDefault("terrainDefence", 1);
  }

  /**
   * The ground's help to a unit standing in `to` against a move from `from`: rough ground, a pass or a river on the link,
   * or a landing from the sea (a move from a province not next to it comes by convoy).
   */
  ground(from: string, to: string): number {
    return this.groundBonus > 0 && defenceGround(from, to, !Board.Map.areAdjacent(from, to)) !== null ? this.groundBonus : 0;
  }

  /**
   * The ground's help to a unit standing in `place` against a blow from these provinces: rough ground helps against any; a
   * crossing or a landing only if every one of them comes over one, since the attacker leads with the unit that does not.
   */
  groundFrom(from: Iterable<string>, place: string): number {
    if (this.groundBonus <= 0) return 0;
    if (terrainOf(place) === "Rough") return this.groundBonus;
    const froms = [...from];
    return froms.length > 0 && froms.every((f) => this.ground(f, place) > 0) ? this.groundBonus : 0;
  }

  /** The ground's help to a unit in `place` against what a power could move into it this season. */
  groundAgainst(place: string, attacker: Power): number {
    return this.groundFrom(
      this.canReach(place, (u) => u.power === attacker).map((u) => u.province),
      place,
    );
  }

  /** What an army of ours pays for supplies for a season it ends in `place`: the desert's cost if it is desert land we do not hold. */
  desertCost(place: string): number {
    return terrainOf(place) === "Desert" && !this.isMine(place) ? this.v.prices.getOrDefault("desertUpkeep", 30) : 0;
  }

  /**
   * What holding a province is worth over the rest of the game: its score plus the income it brings. A kingdom falls with
   * its capital: a living king's capital is worth, to us, half of the rest of his land too, since it passes with the
   * capital; our own is worth all the rest of ours, which we lose with it.
   */
  value(id: string): number {
    let v = this.baseValue(id);
    const p = Board.Map.get(id);
    const k = p.home;
    if (p.capital && k !== null && this.alive.has(k) && this.ownerOf(id) === k) {
      let rest = 0;
      for (const [key, owner] of this.v.owner.entries()) if (owner === k && key !== id) rest += this.baseValue(key);
      v += (k === this.me ? 1.0 : 0.5) * rest;
    }
    return v;
  }

  private baseValue(id: string): number {
    const p = Board.Map.get(id);
    if (p.isSea) return 0;
    let v = 10.0 * p.yield + p.yield * this.horizon;
    if (p.capital) v += 80;
    if (p.home !== null && p.home === this.me) v += 30;
    return v - this.absorptionLoss(id);
  }

  /**
   * The yield land taken by force will not bring us from next season on, while we absorb it: one season's yield for land
   * not ours that we would take, what is left of that for land of ours still being absorbed, nothing for our own homeland.
   */
  absorptionLoss(id: string): number {
    const p = Board.Map.get(id);
    if (p.isSea || p.home === this.me) return 0;
    let taken = this.v.turn;
    if (this.isMine(id)) {
      const t = this.v.conquered.tryGet(id);
      if (t === undefined) return 0;
      taken = t;
    }
    let loss = 0.0;
    for (let k = this.v.turn + 1; k <= taken + 2; k++) loss += k - taken <= 1 ? 2 / 3.0 : 1 / 3.0;
    return loss * p.yield;
  }

  /** Units (of a given power, or any but mine) that could move into a province this season. */
  canReach(target: string, who: (u: UnitView) => boolean): UnitView[] {
    return this.units.filter((u) => u.province !== target && who(u) && Board.Map.canMove(u.kind, u.province, target));
  }

  muster(p: Power, target: string): number {
    return this.canReach(target, (u) => u.power === p).length;
  }

  armyMoves(u: UnitView): string[] {
    return Board.Map.movesFrom(u.kind, u.province);
  }

  /** Land yield a power holds now, against what its homeland yields. */
  landGrowth(p: Power): number {
    let now = 0;
    for (const [k, o] of this.v.owner.entries()) if (o === p) now += Board.Map.get(k).yield;
    const start = sum(Board.Map.homeOf(p), (x) => x.yield);
    return start === 0 ? 0 : now / start;
  }

  provinces(p: Power): number {
    let n = 0;
    for (const o of this.v.owner.values()) if (o === p) n++;
    return n;
  }

  /** Gold a city costs per shekel of yield, which is also what a shekel of yield adds to a king's strength. */
  get yieldWorth(): number {
    return this.v.prices.getOrDefault("cityPricePerYield", 10);
  }

  /**
   * A king's strength as this court reckons it, by the game's own measure: land at the price of a city, plus gold, less
   * back pay owed. Our own is what our view shows; a rival's is estimated from what is public, with his gold as we reckon
   * it and no back pay, which nobody can see.
   */
  strength(p: Power): number {
    // A pictured board (see Search) has no treasury of its own: estimate it like any other.
    if (p === this.me && this.v.startStrength > 0) return this.v.strength;
    let landYield = 0;
    for (const [k, o] of this.v.owner.entries()) if (o === p) landYield += Board.Map.get(k).yield;
    const reckoned = this.treasuries?.tryGet(p);
    const gold = reckoned !== undefined ? reckoned : StartGold.get(p)!;
    return strengthOf(this.yieldWorth, landYield, Math.max(0, gold), 0);
  }

  startStrength(p: Power): number {
    return p === this.me && this.v.startStrength > 0
      ? this.v.startStrength
      : strengthOf(
          this.yieldWorth,
          sum(Board.Map.homeOf(p), (x) => x.yield),
          StartGold.get(p)!,
          0,
        );
  }

  /** Strength against what the king started with: the measure the game is won by. */
  growth(p: Power): number {
    let g = this.growthCache.tryGet(p);
    if (g === undefined) this.growthCache.set(p, (g = this.alive.has(p) ? this.strength(p) / this.startStrength(p) : 0));
    return g;
  }

  /**
   * Who seems to be running away with the game: the king whose growth, as this court reckons it, stands clearly above both
   * the start and the next king, once the first year is out, and who has the weight to be feared.
   */
  leader(): Power | null {
    if (this.ranked) return this.leaderCache;
    this.ranked = true;
    const ranked = sortBy(
      [...this.alive].map((p) => ({ p, g: this.growth(p) })),
      [(x: { p: Power; g: number }) => x.g, desc(cmpNum)],
      [(x: { p: Power; g: number }) => x.p, cmpPower],
    );
    if (ranked.length < 2 || this.v.turn <= 3) return null;
    const { p: top, g } = ranked[0];
    const strengths = sortBy(
      [...this.alive].map((p) => this.strength(p)),
      [(x: number) => x, cmpNum],
    );
    const median = strengths[idiv(strengths.length, 2)];
    this.leaderCache = g >= LeadFloor && g >= ranked[1].g + LeadMargin && this.strength(top) >= 0.8 * median ? top : null;
    return this.leaderCache;
  }

  /** Kings whose land borders ours or shares a sea with our coasts, or whose troops are within two moves of us. */
  neighbours(): Power[] {
    const mineSet = new HSet<string>();
    for (const [k, o] of this.v.owner.entries()) if (o === this.me) mineSet.add(k);
    for (const u of this.mine) mineSet.add(u.province);
    const mine = [...mineSet];
    const M = Board.Map;
    const close = (p: Power): boolean => {
      for (const [k, o] of this.v.owner.entries())
        if (o === p && (M.neighbors(k).some((n) => mineSet.has(n)) || mine.some((m) => M.sharesSea(m, k)))) return true;
      return this.others.some((u) => u.power === p && mine.some((m) => M.canMove(u.kind, u.province, m) || M.movesFrom(u.kind, u.province).some((n) => M.canMove(u.kind, n, m))));
    };
    return [...this.alive].filter((p) => p !== this.me && close(p));
  }
}

/** The growth a leader must reach, and the margin by which he must stand above the next king. */
export const LeadFloor = 1.15;
export const LeadMargin = 0.1;
