/**
 * The script kings' remnants (build order item 17++, "A handful holds nothing by itself"): a unit worn down to a remnant
 * holds nothing by itself, costs its pay and is the master's weakness where it stands, so a competent king folds it into a
 * larger unit of his next door that stands its ground this season, or, in his own land with no foe beside it, disbands it,
 * its men going home. A remnant that guards his court's city, or stands among foes, is left to its orders.
 */
import { join, disband, menOf, unitOf, type Order, type UnitView } from "@amarna/engine";
import { Board } from "./board.ts";

/** A remnant: fewer men than this share of a full levy of its kind (a first guess of the bots', not a game number). */
export const RemnantShare = 0.2;

/** On for every script king, or (`only`) for these alone. */
export const RemnantPlay: { on: boolean } = { on: true };

const moving = (orders: readonly Order[], province: string): boolean => orders.some((o) => o.type === "move" && o.unit === province);

export function remnantOrders(b: Board, orders: Order[]): void {
  if (!RemnantPlay.on) return;
  const v = b.v;
  const small = (u: UnitView): boolean => u.men > 0 && u.men < RemnantShare * menOf(u.kind);
  for (const u of b.mine.filter(small)) {
    if (u.province === v.courtAt) continue;
    const foes = b.units.some((x) => x.power !== b.me && (x.province === u.province || Board.Map.neighbors(u.province).includes(x.province)));
    const into = b.mine
      .filter((x) => x !== u && x.kind === u.kind && !small(x) && Board.Map.neighbors(u.province).includes(x.province) && !moving(orders, x.province))
      .sort((a, c) => c.men - a.men || a.province.localeCompare(c.province))[0];
    const replace = (o: Order): void => {
      for (let i = orders.length - 1; i >= 0; i--) if (unitOf(orders[i]) === u.province) orders.splice(i, 1);
      orders.push(o);
    };
    if (into !== undefined) replace(join(u.province, into.province));
    else if (!foes && b.isMine(u.province)) replace(disband(u.province));
  }
}
