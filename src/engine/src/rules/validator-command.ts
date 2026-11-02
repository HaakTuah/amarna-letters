/**
 * The checks of command at a distance (build order item 13): granting and taking back command of an army and the
 * governorship of a province, giving an army a mandate, and the king setting out with his court. Split from validator.ts.
 */
import { EngageValues, MandateTaskValues, governorsKnown, MostGovernorLevies, seatKnown, WithdrawValues, type Mandate } from "../model/command.ts";
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
      if (v.knownOwner(order.province) !== v.power) return `${order.province} is not yours`;
      // The governorships as this court knows them (hidden information): one ended out of its sight still stands in its view.
      const known = governorsKnown(S, S.turn).filter((g) => g.power === v.power);
      // A governorship taken back by an order of this season is not one to grant beside: the recall goes first.
      const recalled = (g: { province: string }): boolean => v.orders.some((o) => o.type === "unseat" && o.province === g.province);
      if (known.some((g) => g.province === order.province && g.relieved === null)) return `${order.province} already has a governor: take the governorship back first (unseat)`;
      if (v.orders.some((o) => o.type === "govern" && o.province === order.province && v.orders.indexOf(o) < v.orders.indexOf(order))) return `${order.province} was already given a governor by an earlier order`;
      if (order.levies < 0 || order.levies > MostGovernorLevies) return `a governor may be allowed from 0 to ${MostGovernorLevies} levies`;
      // Item 17++: a governor of ours may be given a province beside those he holds, governed from his seat.
      const held = known.filter((g) => g.character === order.character && g.relieved === null && !recalled(g));
      if (held.length > 0) {
        const c = findCharacter(S, order.character);
        if (c === null) return v.nobody(order.character);
        if (v.busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
        if (!held.some((g) => v.Map.neighbors(g.province).includes(order.province))) return `${c.name} governs no province beside ${order.province}: one governor holds only neighbouring provinces`;
        return null;
      }
      return grantee(v, order.character, "a governorship");
    }
    case "crown": {
      const ps = order.provinces;
      if (ps.length === 0) return "a grant of kingship names the provinces it covers";
      if (new Set(ps).size !== ps.length) return "a province is named twice in the grant";
      for (const x of ps) {
        if (!v.Map.exists(x) || v.Map.get(x).isSea) return `there is no land province called '${x}'`;
        // As the court knows it (hidden information): land lost out of its sight fails when the word arrives, and says so by the road.
        if (v.knownOwner(x) !== v.power) return `${x} is not yours`;
        if (courtOf(S, v.Map, v.power) === x) return `your court is in ${x}: a king does not grant away the city he holds court in`;
        if (S.crowns.some((k) => k.power === v.power && (k.heard === null || k.heard > S.turn) && k.provinces.includes(x))) return `${x} is already in a grant on its way`;
      }
      // The provinces hang together: each beside another named, so one man rules them from one seat.
      const reached = new Set([ps[0]]);
      for (let grew = true; grew; ) {
        grew = false;
        for (const x of ps) {
          if (reached.has(x) || !v.Map.neighbors(x).some((n) => reached.has(n))) continue;
          reached.add(x);
          grew = true;
        }
      }
      if (reached.size !== ps.length) return "the provinces of a grant must lie beside one another";
      if (!Number.isInteger(order.tribute) || order.tribute < 0) return "the tribute is a number of shekels a year, 0 or more";
      if (!Number.isInteger(order.price) || order.price < 0) return "the price is a number of shekels, 0 or more";
      if (S.crowns.some((k) => k.character === order.character && (k.heard === null || k.heard > S.turn))) return `a grant to ${order.character} is already on its way`;
      if (v.orders.some((o) => o.type === "crown" && v.orders.indexOf(o) < v.orders.indexOf(order) && o.provinces.some((x) => ps.includes(x)))) return "an earlier order already grants one of those provinces";
      // A governor of ours is granted the provinces he governs, his seat among them, as the court knows them (his
      // governorships ended and his seat moved only as word of it has come); anyone else stands at our court.
      // A governorship taken back by an order of this season is not his to be granted: the recall goes first.
      const held = governorsKnown(S, S.turn).filter((g) => g.character === order.character && g.power === v.power && g.relieved === null && !v.orders.some((o) => o.type === "unseat" && o.province === g.province));
      if (held.length > 0) {
        const c = findCharacter(S, order.character);
        if (c === null) return v.nobody(order.character);
        if (v.busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
        if (!ps.every((x) => held.some((g) => g.province === x))) return `${c.name} is granted only provinces he governs`;
        if (!held.some((g) => ps.includes(seatKnown(g, S.turn)))) return `the grant must include ${c.name}'s seat`;
        return null;
      }
      return grantee(v, order.character, "a kingship");
    }
    case "unseat": {
      const g = governorsKnown(S, S.turn).find((x) => x.province === order.province && x.power === v.power) ?? null;
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
