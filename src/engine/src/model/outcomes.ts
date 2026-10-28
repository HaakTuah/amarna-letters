import { B, I, type ObjSchema, S, computed, obj, opt, raw } from "../core/json.ts";
import type { Ground } from "./geography.ts";
import type { UnitKind } from "./map.ts";
import type { Power } from "./power.ts";

export interface MoveResult {
  from: string;
  to: string;
  succeeded: boolean;
}

export function newMoveResult(init: Partial<MoveResult> = {}): MoveResult {
  return {
    from: "",
    to: "",
    succeeded: false,
    ...init,
  };
}

export const MoveResultSchema: ObjSchema<MoveResult> = obj("MoveResult", newMoveResult, {
  from: S,
  to: S,
  succeeded: B,
});

/** What stopped a move, in the order the adjudicator checks. */
export const MoveStopValues = ["NoConvoy", "OwnUnit", "HeadToHead", "Held", "Stayed", "Bounced", "Resisted"] as const;
export type MoveStop =
  /** The army went by sea and no convoy carried it. */
  | "NoConvoy"
  /** The province held the mover's own unit, which stayed: no unit dislodges its own side. */
  | "OwnUnit"
  /** The unit in the target was moving into the mover's province and held it off. */
  | "HeadToHead"
  /** The unit in the target held (or supported, or convoyed) and kept its place. */
  | "Held"
  /** The unit in the target tried to leave, failed, and so kept its place. */
  | "Stayed"
  /** Another move into the same province was at least as strong. */
  | "Bounced"
  /** No unit stood there, but the land's people rose against it and held it off (item 10+a). */
  | "Resisted";

/**
 * Why a move failed, as the adjudicator resolved it: what stopped it, where the unit (or walls) that
 * stopped it stood, its power and kind, where that unit was itself moving, and the strengths compared
 * (the move's own, and what it had to beat).
 */
export interface MoveFailure {
  stop: MoveStop;
  province: string;
  power: Power | null;
  kind: UnitKind;
  movingTo: string | null;
  strength: number;
  against: number;
  /**
   * For a move the unit in the target held off: the ground that counted in its hold strength, if any ({@link Geography.DefenceGround}).
   */
  ground: Ground | null;
  /** What that ground counted for ({@link GameConfig.TerrainDefence}). */
  groundBonus: number;
}

export function newMoveFailure(init: Partial<MoveFailure> = {}): MoveFailure {
  return {
    stop: "NoConvoy",
    province: "",
    power: null,
    kind: "Army",
    movingTo: null,
    strength: 0,
    against: 0,
    ground: null,
    groundBonus: 0,
    ...init,
  };
}

export const MoveFailureSchema: ObjSchema<MoveFailure> = obj("MoveFailure", newMoveFailure, {
  stop: S,
  province: S,
  power: opt(S),
  kind: S,
  movingTo: S,
  strength: I,
  against: I,
  ground: raw,
  groundBonus: I,
});

/**
 * One line of a battle report: the unit's province, its power, the order as resolved, for a move its target
 * and why it failed, and for a support or convoy that matched nothing why it was void.
 */
export interface ReportLine {
  province: string;
  power: Power | null;
  text: string;
  ok: boolean;
  target: string | null;
  failure: MoveFailure | null;
  /**
   * Why a support or convoy was void because the unit it named did not do what it helped (told to its own king only).
   */
  void: string | null;
  /** For a support that was cut (its unit still standing): why, in plain words. */
  cut: string | null;
  /**
   * For a move that got into a walled province its mover does not hold: whether it stormed the walls, and the strengths.
   */
  assault: Assault | null;
}

export function newReportLine(init: Partial<ReportLine> = {}): ReportLine {
  return {
    province: "",
    power: null,
    text: "",
    ok: false,
    target: null,
    failure: null,
    void: null,
    cut: null,
    assault: null,
    ...init,
  };
}

export const ReportLineSchema: ObjSchema<ReportLine> = obj("ReportLine", newReportLine, {
  province: S,
  power: opt(S),
  text: S,
  ok: B,
  target: S,
  failure: () => MoveFailureSchema,
  void: S,
  cut: S,
  assault: () => AssaultSchema,
});

/**
 * A move that got into a walled province its mover does not hold (Build order item 5): its strength, the level of the walls,
 * and the hold strength of the defenders it beat. An army storms the walls, and takes the province at once, only if its
 * strength beats the walls and the defenders together; otherwise it stands inside and takes nothing (a siege may follow).
 * A fleet never storms walls.
 */
export interface Assault {
  province: string;
  power: Power;
  kind: UnitKind;
  from: string;
  owner: Power | null;
  strength: number;
  walls: number;
  defenders: number;
  // computed in C#: Kind == UnitKind.Army && Strength > Walls + Defenders
  /**
   * The ground that counted in the defenders' hold strength, if any: a storm must beat it too (it beat it to get in).
   */
  ground: Ground | null;
  /** What that ground counted for. */
  groundBonus: number;
}

export function newAssault(init: Partial<Assault> = {}): Assault {
  return {
    province: "",
    power: "Egypt",
    kind: "Army",
    from: "",
    owner: null,
    strength: 0,
    walls: 0,
    defenders: 0,
    ground: null,
    groundBonus: 0,
    ...init,
  };
}

export const AssaultSchema: ObjSchema<Assault> = obj("Assault", newAssault, {
  province: S,
  power: S,
  kind: S,
  from: S,
  owner: opt(S),
  strength: I,
  walls: I,
  defenders: I,
  stormed: computed(B, (o: Assault) => stormed(o)),
  ground: raw,
  groundBonus: I,
});

/**
 * A move on a unit that stood its ground with the ground's help (Build order item 5, terrain): where from and to, who
 * attacked and who stood, the ground, the strengths compared, and whether the move got in (the defender destroyed). Recorded
 * only when the adjudicator explains its battles.
 */
export interface GroundFight {
  from: string;
  to: string;
  attacker: Power;
  defender: Power;
  defenderKind: UnitKind;
  ground: Ground;
  strength: number;
  against: number;
  won: boolean;
  /**
   * The move failed only because of the ground: the unit there held it off, and the move beat the hold without the ground.
   */
  decided: boolean;
}

export function newGroundFight(init: Partial<GroundFight> = {}): GroundFight {
  return {
    from: "",
    to: "",
    attacker: "Egypt",
    defender: "Egypt",
    defenderKind: "Army",
    ground: null!,
    strength: 0,
    against: 0,
    won: false,
    decided: false,
    ...init,
  };
}

export const GroundFightSchema: ObjSchema<GroundFight> = obj("GroundFight", newGroundFight, {
  from: S,
  to: S,
  attacker: S,
  defender: S,
  defenderKind: S,
  ground: raw,
  strength: I,
  against: I,
  won: B,
  decided: B,
});

/** One order as it resolved: who, where, what, and whether it worked. */
export interface OrderOutcome {
  power: Power;
  unitKind: UnitKind;
  province: string;
  /** hold, move, support or convoy. */
  order: string;
  /** Move: destination. Support or convoy: the province of the unit helped. */
  target: string | null;
  /** Support of a move, or convoy: where the helped unit was going. */
  to: string | null;
  /** Support: the power of the unit helped. */
  helped: Power | null;
  succeeded: boolean;
  destroyed: boolean;
  /** Move: who held the destination before the moves (set by the engine; ownership is public). */
  targetOwner: Power | null;
  /** Move: into land its holder opened to the mover by passage or basing on a sealed tablet (item 9): a guest, no attack. */
  guest: boolean;
}

export function newOrderOutcome(init: Partial<OrderOutcome> = {}): OrderOutcome {
  return {
    power: "Egypt",
    unitKind: "Army",
    province: "",
    order: "hold",
    target: null,
    to: null,
    helped: null,
    succeeded: false,
    destroyed: false,
    targetOwner: null,
    guest: false,
    ...init,
  };
}

export const OrderOutcomeSchema: ObjSchema<OrderOutcome> = obj("OrderOutcome", newOrderOutcome, {
  power: S,
  unitKind: S,
  province: S,
  order: S,
  target: S,
  to: S,
  helped: opt(S),
  succeeded: B,
  destroyed: B,
  targetOwner: opt(S),
  guest: B,
});


/** An army's assault on walls succeeds when its strength beats the walls and their defenders together. */
export function stormed(o: Assault): boolean {
  return o.kind === "Army" && o.strength > o.walls + o.defenders;
}

/**
 * A strength as a report gives it (item 11a+): results reckon strengths in thousandths of a full unit, and a report names
 * them in units, to a tenth where a unit short of men counts for less ("2", "1.4").
 */
export function strengthWords(thousandths: number): string {
  const tenths = Math.round(thousandths / 100);
  return tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
}
