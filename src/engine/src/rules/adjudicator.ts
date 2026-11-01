/**
 * Diplomacy-style resolution with no dice: strength is one plus supports and ties bounce, each unit counting by its men
 * (item 11a+: a unit at full strength counts one, a levy of a few hundred a fraction; strengths, walls, the ground and the
 * people's resistance are reckoned in thousandths of a full unit, {@link FullUnit}, in every result). Implements Lucas Kruijswijk's
 * guess-and-check algorithm (from "The Math of Adjudication"), with circular movement resolved as success and convoy
 * paradoxes by the Szykman rule. Walls add nothing to the battle (Build order item 5): a move that wins its way into a
 * walled province its mover does not hold storms the walls only if its strength also beats their level plus the hold
 * strength it beat and the city's own men, the walls multiplying both (Assault, item 11e); the engine decides what that
 * means for the province. The ground does count (item 5,
 * terrain): a unit that stands its ground on rough ground, or across a pass or a great river from the attack, holds with
 * as much again as its own strength against that attack, at most GameConfig.terrainDefence of a full unit (defenceGround;
 * item 17++); never a unit that moves, nor one
 * met head on, nor empty land. At sea the blockade decides (item 7a): an army lands only from the waters of the coast it
 * lands on, through fleets that convoy it there, so no army lands where an enemy fleet holds those waters.
 */
import { Dict, HSet } from "../core/collections.ts";
import { defenceGround, type Ground } from "../model/geography.ts";
import type { UnitKind, WorldMap } from "../model/map.ts";
import type { Order, SallyOrder } from "../model/orders.ts";
import { newOrderOutcome, type Assault, type GroundFight, type MoveFailure, type MoveResult, type MoveStop, type OrderOutcome, type ReportLine } from "../model/outcomes.ts";
import type { Power } from "../model/power.ts";
import type { Unit } from "../model/state.ts";
import { menOf } from "../model/land.ts";

export class AdjudicationResult {
  /** Unit id -> province it ends in (for units that survive). */
  readonly newPositions = new Dict<string, string>();
  readonly dislodgedUnitIds: string[] = [];
  /** Every move that got into a walled province its mover does not hold, stormed or not. */
  readonly assaults: Assault[] = [];
  readonly moves: MoveResult[] = [];
  readonly cutSupports: string[] = [];
  /** Supports that held: (supporter, supported power, province acted on). */
  readonly givenSupports: [Power, Power | null, string][] = [];
  /** The provinces whose unit was given at least one support to hold that was not cut (a besieger's speeds its siege). */
  readonly holdSupported = new HSet<string>();
  /** Moves on units that stood their ground with the ground's help (only when the battles are explained). */
  readonly groundFights: GroundFight[] = [];
  /** Order description per unit province, with its outcome, for reports. */
  readonly lines: ReportLine[] = [];
  readonly outcomes: OrderOutcome[] = [];
  /** The battles fought: each move on another power's unit that stood or met it head on (item 13, "Battles: one season, losses, no dice"). */
  readonly fights: Fight[] = [];
}

/**
 * A battle (item 13): a move on another power's unit that stood its ground there, or that it met head on. `attack` and
 * `defence` are the strengths compared, in thousandths of a full unit (the defence with its supports, its ground and the
 * land's men beside it); `won` whether the attack got in. Each side's losses follow from the margin ({@link TurnEngine}).
 */
export interface Fight {
  attacker: string;
  defender: string;
  from: string;
  at: string;
  attack: number;
  defence: number;
  won: boolean;
}

type Kind = "Hold" | "Move" | "Support" | "Convoy";

/** A full unit's strength, in the thousandths every strength in a result is reckoned in (item 11a+). */
export const FullUnit = 1000;

/**
 * What a unit counts in battle, in thousandths: its men against a full levy of its kind (none known counts as full); a
 * levy of more men than a full unit (Haakon's answers to item 11a+, "the king chooses how many men a levy takes, up to
 * all") counts for more.
 */
export function unitWeight(u: { kind: UnitKind; men: number }, full: number): number {
  if (u.men <= 0 || full <= 0) return FullUnit;
  return Math.max(1, Math.floor((u.men * FullUnit) / full));
}
const enum_ = { Unresolved: 0, Guessing: 1, Resolved: 2 } as const;
type RState = number;

interface O {
  index: number;
  at: string;
  power: Power | null;
  unitKind: UnitKind;
  unitId: string | null;
  kind: Kind;
  /** move: destination; support/convoy: the supported unit's province */
  target: string | null;
  /** support-move / convoy: destination of the supported move */
  to: string | null;
  viaConvoy: boolean;
  paradoxFailed: boolean;
  text: string;
  /** a support or convoy that matched nothing (now a hold): the order as given */
  voided: string | null;
  /** and why it was void */
  voidWhy: string | null;
  /** a besiege order: a hold that wears the city down */
  besieging: boolean;
  /** what the unit counts in battle, in thousandths of a full unit (item 11a+) */
  weight: number;
}

function line(province: string, power: Power | null, text: string, ok: boolean, more: Partial<ReportLine> = {}): ReportLine {
  return { province, power, text, ok, target: null, failure: null, void: null, cut: null, assault: null, ...more };
}

function failure(stop: MoveStop, province: string, power: Power | null, kind: UnitKind, movingTo: string | null, strength: number, against: number, ground: Ground | null = null, groundBonus = 0, people = 0): MoveFailure {
  return { stop, province, power, kind, movingTo, strength, against, ground, groundBonus, people };
}

export class Adjudicator {
  private readonly map: WorldMap;
  /** A province by its own name in the report (item 17+, "Requests are rules too": no ids in what a king reads). */
  private nm(id: string): string {
    return this.map.exists(id) ? this.map.get(id).name : id;
  }
  private readonly explain: boolean;
  private readonly terrain: number;
  private readonly orders: O[] = [];
  private readonly at = new Map<string, number>();
  private state: RState[] = [];
  private result: boolean[] = [];
  private readonly deps: number[] = [];
  private owners: Dict<string, Power | null> = new Dict();
  private walls: Dict<string, number> = new Dict();
  /** Moves that go in as guests by passage or basing (item 9): they storm no walls. */
  private guests: ((province: string, power: Power) => boolean) | null = null;
  /**
   * The people's resistance to a move into a province not its mover's own (item 10+a), in thousandths of a full unit: what
   * a move into empty land must beat, and in a walled province what the city's men add to its defenders in a storm.
   */
  private resist: ((province: string, mover: Power) => number) | null = null;
  private sallies: readonly SallyOrder[] = [];
  private sallyBy = new Map<string, Power | null>();

  /**
   * `explain`: also work out why each failed move failed and where each cut came from, for battle reports. `terrain`:
   * what the ground gives a unit that stands its ground (GameConfig.terrainDefence); 0 turns terrain off.
   */
  constructor(map: WorldMap, explain = false, terrain = 1) {
    this.map = map;
    this.explain = explain;
    this.terrain = Math.max(0, terrain) * FullUnit;
  }

  /**
   * `command`: each unit's strength in percent by who commands it (item 13); null counts every unit by its men alone.
   * `owners`: who holds each province before the moves: a move into one's own walled province storms nothing. `walls`:
   * the level of each province's walls (none if left out). `sallies`: walls that sally: each supports the move from its
   * `from` into its city, for its city's holder in `owners`, as a support that cannot be cut.
   */
  run(
    units: readonly Unit[],
    ordersByProvince: Dict<string, Order>,
    owners: Dict<string, Power | null> | null = null,
    walls: Dict<string, number> | null = null,
    sallies: readonly SallyOrder[] | null = null,
    guests: ((province: string, power: Power) => boolean) | null = null,
    resist: ((province: string, mover: Power) => number) | null = null,
    command: ((u: Unit) => number) | null = null,
  ): AdjudicationResult {
    this.guests = guests;
    this.resist = resist;
    this.orders.length = 0;
    this.at.clear();
    this.owners = owners ?? new Dict();
    this.walls = walls ?? new Dict();
    this.sallies = sallies ?? [];
    this.sallyBy = new Map();
    for (const x of this.sallies) if (!this.sallyBy.has(x.city)) this.sallyBy.set(x.city, this.owners.getOrDefault(x.city, null));
    for (const u of units) {
      const o: O = {
        index: 0,
        at: u.province,
        power: u.power,
        unitKind: u.kind,
        unitId: u.id,
        kind: "Hold",
        target: null,
        to: null,
        viaConvoy: false,
        paradoxFailed: false,
        text: "",
        voided: null,
        voidWhy: null,
        besieging: false,
        // Item 13: its men, shaped by its commander's skill (`command`, in percent; men alone fight at the average).
        weight: command === null ? unitWeight(u, menOf(u.kind)) : Math.max(1, Math.floor((unitWeight(u, menOf(u.kind)) * command(u)) / 100)),
      };
      const order = ordersByProvince.tryGet(u.province);
      switch (order?.type) {
        case "move":
          o.kind = "Move";
          o.target = order.to;
          o.viaConvoy = u.kind === "Army" && !this.map.canMove("Army", u.province, order.to);
          break;
        case "support":
          o.kind = "Support";
          o.target = order.supported;
          o.to = order.to ?? null;
          break;
        case "convoy":
          o.kind = "Convoy";
          o.target = order.army;
          o.to = order.to;
          break;
        case "besiege":
          o.besieging = true;
          break;
      }
      this.add(o);
    }

    this.voidMismatched();

    this.state = new Array<RState>(this.orders.length).fill(enum_.Unresolved);
    this.result = new Array<boolean>(this.orders.length).fill(false);
    this.deps.length = 0;
    for (let i = 0; i < this.orders.length; i++) this.resolve(i);

    return this.collect();
  }

  private add(o: O): void {
    o.index = this.orders.length;
    this.orders.push(o);
    this.at.set(o.at, o.index);
  }

  /**
   * Supports and convoys that do not match an actual order count as holds. The report still shows the order as given,
   * void, and tells its own king why: a support of a move, or a convoy, names only the move that did not happen, so it
   * reveals nothing about a province out of sight.
   */
  private voidMismatched(): void {
    for (const o of this.orders) {
      if (o.kind === "Support") {
        let why: string | null;
        const t = this.at.get(o.target!);
        if (t === undefined) why = o.to === null ? `no unit stood in ${this.nm(o.target!)}` : `no unit moved from ${this.nm(o.target!)} to ${this.nm(o.to)}`;
        else {
          const sup = this.orders[t];
          if (o.to === null) why = sup.kind !== "Move" ? null : `the unit in ${this.nm(o.target!)} was ordered to move, not to hold`;
          else why = sup.kind === "Move" && sup.target === o.to ? null : `no unit moved from ${this.nm(o.target!)} to ${this.nm(o.to)}`;
        }
        if (why !== null) {
          o.voided = `supports ${this.nm(o.target!)}${o.to === null ? " holding" : " -> " + this.nm(o.to)}`;
          o.voidWhy = why;
          o.kind = "Hold";
        }
      } else if (o.kind === "Convoy") {
        const t = this.at.get(o.target!);
        const ok =
          this.map.get(o.at).isSea &&
          t !== undefined &&
          this.orders[t].kind === "Move" &&
          this.orders[t].viaConvoy &&
          this.orders[t].target === o.to &&
          this.orders[t].unitKind === "Army";
        if (!ok) {
          o.voided = `convoys ${this.nm(o.target!)} -> ${this.nm(o.to!)}`;
          o.voidWhy = this.map.get(o.at).isSea ? `no army moved from ${this.nm(o.target!)} to ${this.nm(o.to!)} by sea` : "a fleet convoys only at sea";
          o.kind = "Hold";
        }
      }
    }
  }

  private resolve(nr: number): boolean {
    if (this.state[nr] === enum_.Resolved) return this.result[nr];
    if (this.state[nr] === enum_.Guessing) {
      if (!this.deps.includes(nr)) this.deps.push(nr);
      return this.result[nr];
    }

    const oldCount = this.deps.length;
    this.result[nr] = false;
    this.state[nr] = enum_.Guessing;
    const first = this.adjudicate(nr);

    if (this.deps.length === oldCount) {
      if (this.state[nr] !== enum_.Resolved) {
        this.result[nr] = first;
        this.state[nr] = enum_.Resolved;
      }
      return first;
    }

    if (this.deps[oldCount] !== nr) {
      // Part of a cycle that started elsewhere; leave it guessing.
      this.deps.push(nr);
      this.result[nr] = first;
      return first;
    }

    // nr starts a cycle: try the other guess.
    this.resetDeps(oldCount);
    this.result[nr] = true;
    this.state[nr] = enum_.Guessing;
    const second = this.adjudicate(nr);

    if (first === second) {
      this.resetDeps(oldCount);
      this.result[nr] = first;
      this.state[nr] = enum_.Resolved;
      return first;
    }

    this.backupRule(oldCount);
    return this.resolve(nr);
  }

  private resetDeps(oldCount: number): void {
    for (let i = oldCount; i < this.deps.length; i++) this.state[this.deps[i]] = enum_.Unresolved;
    this.deps.length = oldCount;
  }

  private backupRule(oldCount: number): void {
    const cycle = this.deps.slice(oldCount);
    this.deps.length = oldCount;

    const convoys = cycle.filter((i) => this.orders[i].kind === "Convoy" || (this.orders[i].kind === "Move" && this.orders[i].viaConvoy));
    if (convoys.length > 0) {
      // Szykman: the convoyed armies in the paradox stay where they are.
      for (const i of convoys) {
        const o = this.orders[i];
        const army = o.kind === "Move" ? i : (this.at.get(o.target!) ?? -1);
        if (army >= 0 && this.orders[army].kind === "Move" && this.orders[army].viaConvoy) {
          this.orders[army].paradoxFailed = true;
          this.result[army] = false;
          this.state[army] = enum_.Resolved;
        }
      }
      for (const i of cycle) if (this.state[i] !== enum_.Resolved) this.state[i] = enum_.Unresolved;
      return;
    }

    // Circular movement: everybody moves.
    for (const i of cycle) {
      if (this.orders[i].kind === "Move") {
        this.result[i] = true;
        this.state[i] = enum_.Resolved;
      } else this.state[i] = enum_.Unresolved;
    }
  }

  private adjudicate(nr: number): boolean {
    const o = this.orders[nr];
    switch (o.kind) {
      case "Move": {
        const attack = this.attackStrength(o);
        const opp = this.headToHeadOpponent(o);
        if (opp !== null) {
          if (attack <= this.defendStrength(opp)) return false;
        } else if (attack <= this.holdStrength(o)) return false;

        for (const other of this.movesTo(o.target!)) if (other !== o && attack <= this.preventStrength(other)) return false;
        return true;
      }
      case "Support": {
        for (const m of this.movesTo(o.at)) {
          if (m.power === o.power) continue;
          if (o.to !== null && m.at === o.to) continue; // attacked from where it supports into: not cut unless dislodged
          if (!this.pathOk(m)) continue;
          return false;
        }
        for (const m of this.movesTo(o.at)) if (this.resolve(m.index)) return false; // dislodged
        return true;
      }
      case "Convoy":
        for (const m of this.movesTo(o.at)) if (this.resolve(m.index)) return false;
        return true;
      default:
        return true;
    }
  }

  private movesTo(province: string): O[] {
    return this.orders.filter((x) => x.kind === "Move" && x.target === province);
  }

  private headToHeadOpponent(move: O): O | null {
    if (move.viaConvoy) return null;
    const i = this.at.get(move.target!);
    if (i === undefined) return null;
    const opp = this.orders[i];
    return opp.kind === "Move" && opp.target === move.at && !opp.viaConvoy ? opp : null;
  }

  private pathOk(move: O): boolean {
    if (!move.viaConvoy) return true;
    if (move.paradoxFailed) return false;
    // Search through sea zones holding fleets that convoy this exact move and are not dislodged.
    const seen = new Set<string>();
    const frontier: string[] = [];
    for (const n of this.map.neighbors(move.at))
      if (this.isConvoying(n, move) && !seen.has(n)) {
        seen.add(n);
        frontier.push(n);
      }
    while (frontier.length > 0) {
      const sea = frontier.shift()!;
      if (!this.resolve(this.at.get(sea)!)) continue;
      for (const n of this.map.neighbors(sea)) {
        if (n === move.target) return true;
        if (this.isConvoying(n, move) && !seen.has(n)) {
          seen.add(n);
          frontier.push(n);
        }
      }
    }
    return false;
  }

  private isConvoying(sea: string, move: O): boolean {
    if (!this.map.get(sea).isSea) return false;
    const i = this.at.get(sea);
    return i !== undefined && this.orders[i].kind === "Convoy" && this.orders[i].target === move.at && this.orders[i].to === move.target;
  }

  private supports(move: O, excludePower: Power | null): number {
    let count = 0;
    for (const s of this.orders)
      if (s.kind === "Support" && s.target === move.at && s.to === move.target && this.resolve(s.index))
        if (excludePower === null || s.power !== excludePower) count += s.weight;
    // Walls that sally support the move from where they name into their city, and cannot be cut.
    for (const w of this.sallies)
      if (w.city === move.target && w.from === move.at && (excludePower === null || (this.sallyBy.get(w.city) ?? null) !== excludePower)) count += FullUnit;
    return count;
  }

  /** Whether a sally found the move it supports (a move from where it names into its city, whoever made it). */
  sallyMatched(w: SallyOrder): boolean {
    return this.orders.some((o) => o.kind === "Move" && o.at === w.from && o.target === w.city);
  }

  private attackStrength(move: O): number {
    if (!this.pathOk(move)) return 0;
    const i = this.at.get(move.target!);
    if (i === undefined) return move.weight + this.supports(move, null);
    const occ = this.orders[i];
    const opp = this.headToHeadOpponent(move);
    if (occ.kind === "Move" && opp === null && this.resolve(occ.index)) return move.weight + this.supports(move, null);
    if (occ.power !== null && occ.power === move.power) return 0;
    return move.weight + this.supports(move, occ.power);
  }

  /**
   * The hold strength a move into a province must beat: none if the province is empty or its unit got away; else 1 for
   * the unit that stays (holding, besieging, supporting, convoying, or whose own move failed), its supports to hold if it
   * did not try to move, what the ground gives it against this move ({@link groundAgainst}), and the land's own men
   * beside it outside walls (item 11e, {@link peopleAgainst}).
   */
  private holdStrength(move: O): number {
    const province = move.target!;
    const i = this.at.get(province);
    if (i === undefined) return this.peopleAgainst(move);
    const occ = this.orders[i];
    let count = occ.weight;
    if (occ.kind === "Move") {
      if (this.resolve(occ.index)) return this.peopleAgainst(move);
    } else for (const s of this.orders) if (s.kind === "Support" && s.target === province && s.to === null && this.resolve(s.index)) count += s.weight;
    return count + this.groundBonus(move, count) + this.peopleAgainst(move);
  }

  /**
   * What the ground adds to those standing their ground against a move (item 17++, "A handful holds nothing by itself"): as
   * much again as their own strength, at most GameConfig.terrainDefence of a full unit, so the ground multiplies the men
   * who hold it and a handful on a hill holds no more than a handful (until 17++ it added a full unit to any holder).
   */
  private groundBonus(move: O, standing: number): number {
    return this.groundAgainst(move) === null ? 0 : Math.min(this.terrain, standing);
  }

  /** The strength standing its ground in the move's target: the unit that stays and its supports to hold. */
  private standing(move: O): number {
    const i = this.at.get(move.target!);
    if (i === undefined) return 0;
    const occ = this.orders[i];
    if (occ.kind === "Move") return occ.weight;
    let count = occ.weight;
    for (const s of this.orders) if (s.kind === "Support" && s.target === move.target && s.to === null && this.resolve(s.index)) count += s.weight;
    return count;
  }

  /**
   * The people of the move's target rising against it ("The people defend their land", item 10+a): its men of fighting
   * age, alone where no unit stands its ground there and beside the unit that does (item 11e: an army that enters meets
   * them, whoever stands there); none for a guest let in by the land's holder, nor in the mover's own land. Behind walls
   * they meet it on the walls instead, in the storm ({@link assaultBy}).
   */
  private peopleAgainst(move: O): number {
    return this.walls.getOrDefault(move.target!, 0) > 0 ? 0 : this.people(move);
  }

  private people(move: O): number {
    if (this.resist === null || move.power === null) return 0;
    if (this.guests !== null && this.guests(move.target!, move.power)) return 0;
    return this.resist(move.target!, move.power);
  }

  /** The ground that helps a unit standing its ground in the move's target against it, or null (also when terrain is off). */
  private groundAgainst(move: O): Ground | null {
    return this.terrain > 0 ? defenceGround(move.at, move.target!) : null;
  }

  private defendStrength(move: O): number {
    return move.weight + this.supports(move, null);
  }

  private preventStrength(move: O): number {
    if (!this.pathOk(move)) return 0;
    const opp = this.headToHeadOpponent(move);
    if (opp !== null && this.resolve(opp.index)) return 0;
    return move.weight + this.supports(move, null);
  }

  private collect(): AdjudicationResult {
    const r = new AdjudicationResult();
    const succeededInto = new Set<string>();
    for (const o of this.orders) if (o.kind === "Move" && this.result[o.index]) succeededInto.add(o.target!);

    for (const o of this.orders) {
      const moved = o.kind === "Move" && this.result[o.index];
      const dislodged = !moved && succeededInto.has(o.at);
      if (o.unitId === null) continue;
      if (dislodged) r.dislodgedUnitIds.push(o.unitId);
      else r.newPositions.set(o.unitId, moved ? o.target! : o.at);

      const name = (id: string): string => this.nm(id);
      const label = `${o.unitKind === "Army" ? "army" : "fleet"} in ${name(o.at)}`;
      const helpedAt = o.kind === "Support" ? this.at.get(o.target!) : undefined;
      r.outcomes.push(
        newOrderOutcome({
          power: o.power!,
          unitKind: o.unitKind,
          province: o.at,
          order: o.kind.toLowerCase(),
          target: o.target,
          to: o.to,
          helped: helpedAt !== undefined ? this.orders[helpedAt].power : null,
          succeeded: o.kind === "Move" ? moved : o.kind === "Hold" ? !dislodged : this.result[o.index],
          destroyed: dislodged,
        }),
      );
      switch (o.kind) {
        case "Move": {
          r.moves.push({ from: o.at, to: o.target!, succeeded: moved });
          const fight = this.explain ? this.groundFightOf(o, moved) : null;
          if (fight !== null) r.groundFights.push(fight);
          const assault = moved ? this.assaultBy(o) : null;
          if (assault !== null) r.assaults.push(assault);
          r.lines.push(
            line(o.at, o.power, `${label} -> ${name(o.target!)}${o.viaConvoy ? " (by sea)" : ""}: ${moved ? "succeeds" : "fails"}`, moved, {
              target: o.target,
              failure: this.explain && !moved ? this.whyFailed(o) : null,
              assault,
            }),
          );
          break;
        }
        case "Support": {
          const given = this.result[o.index];
          const sIdx = this.at.get(o.target!);
          if (!given) r.cutSupports.push(o.at);
          else if (o.power !== null && sIdx !== undefined) {
            r.givenSupports.push([o.power, this.orders[sIdx].power, o.to ?? o.target!]);
            if (o.to === null) r.holdSupported.add(o.target!);
          }
          // A unit that is destroyed gives no support: that is not a cut.
          const cutFrom = !given && !dislodged && this.explain ? (this.cutBy(o)?.at ?? null) : null;
          const failed = dislodged ? "void: the supporting unit was beaten from its place" : cutFrom !== null ? `cut (attacked from ${name(cutFrom)})` : "cut";
          r.lines.push(
            line(o.at, o.power, `${label} supports ${name(o.target!)}${o.to === null ? " holding" : " -> " + name(o.to)}: ${given ? "given" : failed}`, given, {
              cut: given || dislodged || !this.explain ? null : cutFrom !== null ? `the support was cut by an attack from ${name(cutFrom)}` : "the support was cut",
            }),
          );
          break;
        }
        case "Convoy":
          r.lines.push(line(o.at, o.power, `${label} convoys ${name(o.target!)} -> ${name(o.to!)}`, this.result[o.index]));
          break;
        default:
          r.lines.push(
            o.voided !== null
              ? line(o.at, o.power, `${label} ${o.voided}: void`, false, { void: this.explain ? o.voidWhy : null })
              : line(o.at, o.power, `${label} ${o.besieging ? "besieges the city" : "holds"}`, true),
          );
          break;
      }
      if (dislodged) r.lines.push(line(o.at, o.power, `${label} is dislodged`, false));
    }
    for (const o of this.orders) {
      const f = o.kind === "Move" ? this.fightOf(o) : null;
      if (f !== null) r.fights.push(f);
    }
    return r;
  }

  /**
   * The battle a move fought, or null: against the unit it met head on (one battle, reckoned once: from the move that
   * won it, or, where neither got through, from the first in the order), or against the unit that stood its ground where
   * it went, whether or not it got in. A move that found the province empty, or its unit gone, fought nobody; nor one
   * stopped by its own side's unit, a missing convoy or another move into the same land.
   */
  private fightOf(move: O): Fight | null {
    if (move.unitId === null || !this.pathOk(move)) return null;
    const won = this.result[move.index];
    const opp = this.headToHeadOpponent(move);
    if (opp !== null) {
      if (opp.power === move.power || opp.unitId === null) return null;
      if (!won && (this.result[opp.index] || opp.index < move.index)) return null;
      return { attacker: move.unitId, defender: opp.unitId, from: move.at, at: move.target!, attack: this.attackStrength(move), defence: this.defendStrength(opp), won };
    }
    const i = this.at.get(move.target!);
    if (i === undefined) return null;
    const occ = this.orders[i];
    if (occ.power === move.power || occ.unitId === null || (occ.kind === "Move" && this.result[occ.index])) return null;
    const attack = this.attackStrength(move);
    if (attack <= 0) return null;
    // Stopped by another move into the same land before it reached the unit there: no battle with it.
    if (!won && this.movesTo(move.target!).some((m) => m !== move && attack <= this.preventStrength(m)) && attack > this.holdStrength(move)) return null;
    return { attacker: move.unitId, defender: occ.unitId, from: move.at, at: move.target!, attack, defence: this.holdStrength(move), won };
  }

  /**
   * Why a resolved move failed, from the same checks {@link adjudicate} made: the convoy, the mover's own unit, the
   * head-to-head defence, another move that took the province, then in the adjudicator's order the hold and every other
   * move into the province.
   */
  private whyFailed(move: O): MoveFailure | null {
    if (!this.pathOk(move)) return failure("NoConvoy", move.target!, null, "Army", null, 0, 0);
    const attack = this.attackStrength(move);
    const i = this.at.get(move.target!);
    const occ = i !== undefined ? this.orders[i] : null;
    if (attack === 0 && occ !== null && occ.power !== null && occ.power === move.power)
      return failure("OwnUnit", occ.at, occ.power, occ.unitKind, occ.kind === "Move" ? occ.target : null, 0, 0);

    // A head-to-head battle lost is the reason, even when a third move then walked into the province the winner left.
    const opp = this.headToHeadOpponent(move);
    if (opp !== null) {
      const defend = this.defendStrength(opp);
      if (attack <= defend) return failure("HeadToHead", opp.at, opp.power, opp.unitKind, opp.target, attack, defend);
    }

    // Another move took the province: that is the news, even if the unit there also held this one off before it fell.
    const winner = this.movesTo(move.target!).find((m) => m !== move && this.result[m.index]);
    if (winner !== undefined) return failure("Bounced", winner.at, winner.power, winner.unitKind, winner.target, attack, this.preventStrength(winner));

    const vacated = occ !== null && occ.kind === "Move" && this.resolve(occ.index);
    if (opp === null && (occ === null || vacated)) {
      const people = this.peopleAgainst(move);
      if (people > 0 && attack <= people) return failure("Resisted", move.target!, null, move.unitKind, null, attack, people);
    }
    if (opp === null && occ !== null && !vacated) {
      const hold = this.holdStrength(move);
      if (attack <= hold) {
        const stop: MoveStop = occ.kind === "Move" ? "Stayed" : "Held";
        const ground = this.groundAgainst(move);
        return failure(stop, occ.at, occ.power, occ.unitKind, occ.kind === "Move" ? occ.target : null, attack, hold, ground, this.groundBonus(move, this.standing(move)), this.peopleAgainst(move));
      }
    }

    for (const other of this.movesTo(move.target!)) {
      if (other === move) continue;
      const prevent = this.preventStrength(other);
      if (attack <= prevent) return failure("Bounced", other.at, other.power, other.unitKind, other.target, attack, prevent);
    }
    return null;
  }

  /**
   * A move that succeeded into a walled province its mover does not hold: its strength against the walls and the hold
   * strength it beat (a unit that stayed, or the defence of one it met head on; nothing if the province was empty or its
   * unit got away). Null for an unwalled province, or the mover's own.
   */
  private assaultBy(move: O): Assault | null {
    const target = move.target!;
    const walls = this.walls.getOrDefault(target, 0);
    if (walls <= 0 || move.power === null) return null;
    const mover = move.power;
    const owner = this.owners.getOrDefault(target, null);
    if (owner === mover) return null;
    // A guest the walls' holder let in goes in through the gates.
    if (this.guests !== null && this.guests(target, mover)) return null;
    const opp = this.headToHeadOpponent(move);
    const beaten = opp !== null ? this.defendStrength(opp) : this.holdStrength(move);
    // The ground counted in the hold strength the move beat to get in: the storm must beat it too.
    // (Not when only the land's people resisted: the ground is already in their resistance.)
    const stood = this.at.get(target) !== undefined && !(this.orders[this.at.get(target)!].kind === "Move" && this.resolve(this.orders[this.at.get(target)!].index));
    const ground = opp === null && beaten > 0 && stood ? this.groundAgainst(move) : null;
    return {
      province: target,
      power: mover,
      kind: move.unitKind,
      from: move.at,
      owner,
      strength: this.attackStrength(move),
      walls: walls * FullUnit,
      defenders: beaten,
      // The city's own men of fighting age stand on the walls beside any garrison (item 11e).
      people: this.people(move),
      ground,
      groundBonus: ground === null ? 0 : this.groundBonus(move, this.standing(move)),
    };
  }

  /**
   * A move on another power's unit that stood its ground with the ground's help, not met head on: whether it got in, and
   * whether the ground decided it (the unit held it off, and the move beat the hold without the ground). Null for any
   * other move.
   */
  private groundFightOf(move: O, moved: boolean): GroundFight | null {
    if (this.headToHeadOpponent(move) !== null) return null;
    const i = this.at.get(move.target!);
    if (i === undefined) return null;
    const occ = this.orders[i];
    if (occ.power === null || move.power === null || occ.power === move.power) return null;
    const ground = this.groundAgainst(move);
    if (ground === null) return null;
    const hold = this.holdStrength(move);
    if (hold === 0) return null;
    const attack = this.attackStrength(move);
    let decided = false;
    if (!moved && attack <= hold && attack > hold - this.groundBonus(move, this.standing(move))) {
      const why = this.whyFailed(move);
      decided = why !== null && (why.stop === "Held" || why.stop === "Stayed");
    }
    return { from: move.at, to: move.target!, attacker: move.power, defender: occ.power, defenderKind: occ.unitKind, ground, strength: attack, against: hold, won: moved, decided };
  }

  /** The move that cut a support, by the same test {@link adjudicate} used. */
  private cutBy(support: O): O | null {
    return this.movesTo(support.at).find((m) => m.power !== support.power && !(support.to !== null && m.at === support.to) && this.pathOk(m)) ?? null;
  }
}
