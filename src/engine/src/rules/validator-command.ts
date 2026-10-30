/**
 * The checks of command at a distance (build order item 13): granting and taking back command of an army and the
 * governorship of a province, giving an army a mandate, and the king setting out with his court. Split from validator.ts.
 */
import { EngageValues, MandateTaskValues, MostGovernorLevies, WithdrawValues, type Mandate } from "../model/command.ts";
import type { Order } from "../model/orders.ts";
import { coverOf, type Character } from "../model/people.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { findCharacter, unitAt } from "../model/state.ts";
import type { Checking } from "./validator-context.ts";
import { courtMoveRefusal, courtOf } from "./court.ts";

/** Why a person cannot be granted command or a governorship by this court now, or null. */
function grantee(v: Checking, id: string, what: string): string | null {
  const c: Character | null = findCharacter(v.S, id);
  if (c === null) return v.nobody(id);
  if (v.busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
  // One of yours away, as far as you know, is not at your court.
  if (coverOf(c, v.power) !== null) return `${c.name} is not at your court`;
  if (c.status === "Captured" || c.status === "Dead") return `${c.name} is not at your court`;
  if (c.status === "Employed" && c.employer !== v.power) return `${c.name} serves another court`;
  if (c.at !== v.power || c.duty !== "None") return `${c.name} is not at your court: ${what} is granted to a person who stands there`;
  return null;
}

/** Why a mandate cannot be read, or null. */
function mandateRefusal(v: Checking, m: Mandate): string | null {
  if (!MandateTaskValues.includes(m.task)) return `a mandate's task is one of ${MandateTaskValues.join(", ")}, not '${m.task}'`;
  if (!EngageValues.includes(m.engage)) return `a mandate engages by one of ${EngageValues.join(", ")}, not '${m.engage}'`;
  if (!WithdrawValues.includes(m.withdraw)) return `a mandate withdraws by one of ${WithdrawValues.join(", ")}, not '${m.withdraw}'`;
  const needsPlace = m.task === "invade" || m.task === "besiege" || m.task === "raid";
  if (needsPlace && (m.target === null || !v.Map.exists(m.target))) return `the task ${m.task} names a province: '${m.target ?? ""}' is not one`;
  if (m.target !== null && !v.Map.exists(m.target)) return `there is no province called '${m.target}'`;
  const needsPower = m.task === "support" || m.task === "shadow";
  const isPower = (x: Power | null): boolean => x !== null && AllPowers.includes(x);
  if (needsPower && !isPower(m.power)) return `the task ${m.task} names a power: '${m.power ?? ""}' is not one`;
  if (m.avoidPower !== null && !isPower(m.avoidPower)) return `there is no power called '${m.avoidPower}'`;
  if (m.until !== null && m.until < v.S.turn) return `a mandate cannot end before this season (turn ${v.S.turn})`;
  return null;
}

/** The checks for item 13's orders; undefined for any other order. */
export function checkCommandOrder(v: Checking, order: Order): string | null | undefined {
  const S = v.S;
  const own = (province: string): string | null => {
    if (!v.Map.exists(province)) return `there is no province called '${province}'`;
    const u = unitAt(S, province);
    return u === null || u.power !== v.power ? `you have no unit in ${province}` : null;
  };
  switch (order.type) {
    case "command": {
      const why = own(order.unit);
      if (why !== null) return why;
      const u = unitAt(S, order.unit)!;
      // A grant is never revoked at a distance at once: a new commander is named only once the old one has stepped down.
      if (u.commander !== null && u.relieveAt !== null) return `the unit in ${order.unit} has a commander until word taking back his command reaches him (turn ${u.relieveAt})`;
      if (u.commander !== null) return `the unit in ${order.unit} already has a commander: take the command back first (relieve)`;
      if (v.orders.some((o) => o !== order && o.type === "command" && o.unit === order.unit && v.orders.indexOf(o) < v.orders.indexOf(order))) return `the unit in ${order.unit} was already given a commander by an earlier order`;
      return grantee(v, order.character, "command");
    }
    case "relieve": {
      const why = own(order.unit);
      if (why !== null) return why;
      const u = unitAt(S, order.unit)!;
      if (u.commander === null) return `nobody commands the unit in ${order.unit}`;
      if (u.relieveAt !== null) return `word taking back its command is already on its way`;
      return null;
    }
    case "mandate": {
      const why = own(order.unit);
      if (why !== null) return why;
      // "No commander, no mandate": a mandate is given to the man who leads the unit.
      const granted = v.orders.some((o) => o.type === "command" && o.unit === order.unit);
      if (order.mandate !== null && unitAt(S, order.unit)!.commander === null && !granted) return `nobody commands the unit in ${order.unit}: grant its command first, then give it a mandate`;
      return order.mandate === null ? null : mandateRefusal(v, order.mandate);
    }
    case "supply": {
      const why = own(order.unit);
      if (why !== null) return why;
      if (unitAt(S, order.unit)!.kind !== "Army") return "only an army buys or takes its food from the land";
      if (v.orders.some((o) => o !== order && o.type === "supply" && o.unit === order.unit && v.orders.indexOf(o) < v.orders.indexOf(order))) return `the army in ${order.unit} was already sent word on its food by an earlier order`;
      if (order.gold < 0) return "the gold sent cannot be negative";
      return order.gold > 0 ? v.spend(order.gold) : null;
    }
    case "govern": {
      if (!v.Map.exists(order.province) || v.Map.get(order.province).isSea) return `there is no land province called '${order.province}'`;
      if (S.owner.getOrDefault(order.province, null) !== v.power) return `${order.province} is not yours`;
      if (S.governors.some((g) => g.province === order.province && g.power === v.power && g.relieved === null)) return `${order.province} already has a governor: take the governorship back first (unseat)`;
      if (v.orders.some((o) => o.type === "govern" && o.province === order.province && v.orders.indexOf(o) < v.orders.indexOf(order))) return `${order.province} was already given a governor by an earlier order`;
      if (order.levies < 0 || order.levies > MostGovernorLevies) return `a governor may be allowed from 0 to ${MostGovernorLevies} levies`;
      return grantee(v, order.character, "a governorship");
    }
    case "unseat": {
      const g = S.governors.find((x) => x.province === order.province && x.power === v.power) ?? null;
      if (g === null) return `you have no governor in ${order.province}`;
      if (g.relieved !== null) return `word taking back the governorship is already on its way`;
      return null;
    }
    case "court":
      return courtMoveRefusal(v, order);
    case "enlist": {
      if (!v.Map.exists(order.province) || v.Map.get(order.province).isSea) return `there is no land province called '${order.province}'`;
      const u = S.units.find((x) => x.province === order.province && x.power === v.power && x.kind === "Army") ?? null;
      if (u === null) return `no army of yours stands in ${order.province} to carry the offer`;
      const carried = courtOf(S, v.Map, v.power) === order.province || (u.commander !== null && S.turn >= u.commandFrom);
      if (!carried) return `nobody carries the offer: your army in ${order.province} has no commander with it, and you are not there`;
      if (!S.bands.some((b) => b.province === order.province)) return `no band works in ${order.province} that you can see`;
      if (order.term < 1 || order.term > 12) return "a term of 1 to 12 seasons";
      if (order.fee <= 0) return "the fee must be positive";
      return v.spend(order.fee);
    }
    default:
      return undefined;
  }
}
