/** A human seat's orders as they are being written, before submission. */
import {
  WorldMap,
  besiege,
  convoy,
  disband,
  entersText,
  hold,
  move,
  newTurnSubmission,
  support,
  type Order,
  type Power,
  type SeatView,
  type StandingRequest,
  type StandingAnswerRequest,
  type StandingWhen,
  type TurnSubmission,
  type UnitView,
} from "@amarna/engine";
import { provinceName } from "./format.ts";

export interface UnitDraft {
  kind: string;
  target: string | null;
  to: string | null;
}

const newUnitDraft = (): UnitDraft => ({ kind: "hold", target: null, to: null });

/** Names in the order a reader looks for them. */
export const byName = (a: string, b: string): number => provinceName(a).localeCompare(provinceName(b));

export class OrderDraft {
  private static readonly map = WorldMap.default;
  readonly view: SeatView;
  readonly units = new Map<string, UnitDraft>();
  readonly other: Order[] = [];
  /** New standing orders, which every seat may give (since the additions to the fix pass after item 4). */
  readonly standing: StandingRequest[] = [];
  /** The ids of standing orders kept so far that are to be cancelled with these orders. */
  readonly cancelStanding = new Set<string>();
  /** New standing answers for envoys at court, which a human seat may set too (item 8), and the ids of kept ones to cancel. */
  readonly answers: StandingAnswerRequest[] = [];
  readonly cancelAnswers = new Set<string>();
  selected: string | null = null;
  notes = "";

  constructor(view: SeatView) {
    this.view = view;
    for (const u of view.units.filter((u) => u.power === view.power)) this.units.set(u.province, newUnitDraft());
  }

  unitAt(province: string): UnitView | null {
    return this.view.units.find((u) => u.province === province) ?? null;
  }

  movesFor(province: string): string[] {
    // Winter closes nothing (item 9): a crossing it makes dangerous is offered, and may cost the troop.
    const map = OrderDraft.map;
    const u = this.unitAt(province);
    if (u === null) return [];
    let direct = map.movesFrom(u.kind, province);
    if (u.kind === "Army" && map.get(province).isCoastal)
      direct = direct.concat(map.landProvinces.filter((p) => p.isCoastal && p.id !== province && map.seaRouteExists(province, p.id)).map((p) => p.id));
    return [...new Set(direct)].sort(byName);
  }

  targets(): Set<string> {
    return this.selected === null ? new Set() : new Set(this.movesFor(this.selected));
  }

  click(province: string): void {
    if (this.selected === null) {
      if (this.units.has(province)) this.selected = province;
      return;
    }
    if (province === this.selected) {
      this.units.set(province, newUnitDraft());
      this.selected = null;
      return;
    }
    if (this.movesFor(this.selected).includes(province)) {
      this.units.set(this.selected, { kind: "move", target: province, to: null });
      this.selected = null;
      return;
    }
    this.selected = this.units.has(province) ? province : null;
  }

  arrows(): { from: string; to: string; support: boolean }[] {
    const list: { from: string; to: string; support: boolean }[] = [];
    for (const [at, d] of this.units) {
      if (d.kind === "move" && d.target !== null) list.push({ from: at, to: d.target, support: false });
      if (d.kind === "support" && d.target !== null) list.push({ from: at, to: d.to ?? d.target, support: true });
      if (d.kind === "convoy" && d.target !== null && d.to !== null) list.push({ from: d.target, to: d.to, support: true });
    }
    return list;
  }

  build(): TurnSubmission {
    const orders: Order[] = [];
    for (const [at, d] of this.units) {
      if (d.kind === "move" && d.target !== null) orders.push(move(at, d.target));
      else if (d.kind === "support" && d.target !== null) orders.push(support(at, d.target, d.to === null || d.to === "" ? null : d.to));
      else if (d.kind === "convoy" && d.target !== null && d.to !== null) orders.push(convoy(at, d.target, d.to));
      else if (d.kind === "disband") orders.push(disband(at));
      else if (d.kind === "besiege") orders.push(besiege(at));
      else orders.push(hold(at));
    }
    orders.push(...this.other);
    return newTurnSubmission({
      orders,
      notes: this.notes,
      standing: [...this.standing],
      cancelStanding: this.view.standing.map((s) => s.id).filter((id) => this.cancelStanding.has(id)),
      answers: [...this.answers],
      cancelAnswers: this.view.answers.map((a) => a.id).filter((id) => this.cancelAnswers.has(id)),
    });
  }

  /** A unit order as the form for standing orders builds it, or null while it lacks what it needs. */
  static unitOrder(unit: string, kind: string, target: string, to: string): Order | null {
    if (kind === "hold") return hold(unit);
    if (kind === "move" && target !== "") return move(unit, target);
    if (kind === "support" && target !== "") return support(unit, target, to === "" ? null : to);
    return null;
  }

  /** What a standing order waits for, in the words the seat's view uses ("when Hatti's troops enter mira"). */
  static when(when: StandingWhen, power: Power | null, province: string, viewer: Power): string {
    return when === "UnitAttacked" ? `when your troop in ${provinceName(province)} is attacked` : entersText(viewer, power, provinceName(province));
  }
}
