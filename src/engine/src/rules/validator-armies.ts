/**
 * Orders for armies and fleets, walls and land: moves, supports and sieges, raising and disbanding, ceding and hunting bands. Split from the order validator (validator.ts), which owns the season's checking state.
 */
import { isBlank } from "../core/text.ts";
import { cessionAgreed } from "../model/cession.ts";
import type { Order } from "../model/orders.ts";
import { forMen, LandData, menAvailable, menOf } from "../model/land.ts";
import { isAlive, siegeOf, unitAt, wallsOf } from "../model/state.ts";
import { buildGold, landRefusal, levelOf, WorkKindValues, WorksData, workLevelText, workName } from "../model/works.ts";
import type { Checking } from "./validator-context.ts";
import { courtOf } from "./court.ts";

/** Why the order is refused, null if it stands, or undefined if it is not one of these. */
export function checkArmyOrder(v: Checking, order: Order): string | null | undefined {
  const { S, Map, power, ceded, fortified, sallied, raisedIn, Sight, spend, ownUnit } = v;
  switch (order.type) {
    // An order the reply named but left incomplete: refused with the reason, rather than dropped unseen.
    case "unreadable":
      return order.reason;

    case "hold":
      return ownUnit(order.unit)[0];

    case "move": {
      const [e, u] = ownUnit(order.unit);
      if (e !== null) return e;
      if (isBlank(order.to)) return "name the province the unit should move to";
      if (!Map.exists(order.to)) return `there is no province called '${order.to}'`;
      if (order.to === order.unit) return "a unit cannot move to where it stands";
      if (u!.kind === "Fleet") return Map.canMove("Fleet", order.unit, order.to) ? null : `a fleet in ${order.unit} cannot reach ${order.to}`;
      if (Map.canMove("Army", order.unit, order.to)) return null;
      if (Map.seaRouteExists(order.unit, order.to)) return null;
      return `an army in ${order.unit} cannot reach ${order.to}`;
    }

    case "support": {
      const [e, u] = ownUnit(order.unit);
      if (e !== null) return e;
      if (isBlank(order.supported)) return "name the unit to support, by the province it stands in";
      if (!Map.exists(order.supported)) return `there is no province called '${order.supported}'`;
      // Out of sight, a province's troops are unknown: the support is given, and is void if no unit there acts as it names.
      if (unitAt(S, order.supported) === null && Sight().has(order.supported)) return `there is no unit in ${order.supported} to support`;
      if (order.supported === order.unit) return "a unit cannot support itself";
      const into = order.to ?? order.supported;
      if (!Map.exists(into)) return `there is no province called '${into}'`;
      if (into === order.unit) return "a unit cannot support a move into its own province";
      return Map.canMove(u!.kind, order.unit, into) ? null : `the unit in ${order.unit} cannot reach ${into} to support there`;
    }

    case "convoy": {
      const [e, u] = ownUnit(order.unit);
      if (e !== null) return e;
      if (u!.kind !== "Fleet" || !Map.get(order.unit).isSea) return "only a fleet at sea can convoy";
      if (isBlank(order.army)) return "name the army to convoy, by the province it stands in";
      if (isBlank(order.to)) return "name the coast where the army should land";
      if (!Map.exists(order.army)) return `there is no province called '${order.army}'`;
      const army = unitAt(S, order.army);
      // As for a support: out of sight, the convoy is given, and is void if no army there sails as it names.
      if ((army === null || army.kind !== "Army") && Sight().has(order.army)) return `there is no army in ${order.army}`;
      if (!Map.exists(order.to) || !Map.get(order.to).isCoastal) return `${order.to} is not a coast an army can land on`;
      return null;
    }

    case "build": {
      const f = order;
      if (isBlank(f.province)) return "name the province where to build";
      if (!Map.exists(f.province) || Map.get(f.province).isSea) return `there is no province called '${f.province}'`;
      if (!(WorkKindValues as readonly string[]).includes(f.kind)) return `there is no kind of building called '${f.kind}': ${WorkKindValues.join(", ")}`;
      const prov = Map.get(f.province);
      if (S.owner.getOrDefault(f.province, null) !== power) return `you do not hold ${prov.name}`;
      const data = WorksData[f.kind];
      if (!Number.isInteger(f.level) || f.level < 0 || f.level > data.most) return `the ${workName(f.kind)} go from 0 to ${workLevelText(f.kind, data.most)}`;
      const level = levelOf(S, f.kind, f.province);
      const land = landRefusal(f.kind, prov);
      if (land !== null && f.level > level) return land;
      const key = `${f.kind}:${f.province}`;
      if (fortified.has(key)) return `you had already given an order for the ${workName(f.kind)} of ${prov.name} this season`;
      // The first season of a project paid in gold is reserved now.
      return f.level > level && !f.labour ? spend(buildGold(f.kind, f.province, f.kind === "Policing" ? f.level - level : level + 1)) : null;
    }

    case "raze": {
      const [e, u] = ownUnit(order.unit);
      if (e !== null) return e;
      if (u!.kind !== "Army") return "only an army razes what is built";
      if (!(["Roads", "Stations", "Harbour", "Water"] as string[]).includes(order.kind)) return "an army razes roads, relay stations, a harbour or water works";
      const holder = S.owner.getOrDefault(u!.province, null);
      if (holder === power || holder === null) return `${Map.get(u!.province).name} is not another's land`;
      if (levelOf(S, order.kind, u!.province) <= 0) return `there are no ${workName(order.kind)} in ${Map.get(u!.province).name} to raze`;
      return null;
    }

    case "sally": {
      const so = order;
      if (S.config.sallyMinWalls <= 0) return "walls do not sally in this game";
      if (isBlank(so.city)) return "name the city whose walls sally";
      if (!Map.exists(so.city) || Map.get(so.city).isSea) return `there is no city called '${so.city}'`;
      const name = Map.get(so.city).name;
      if (S.owner.getOrDefault(so.city, null) !== power) return `you do not hold ${name}`;
      if (wallsOf(S, so.city) === 0) return `${name} has no walls to sally from`;
      if (wallsOf(S, so.city) < S.config.sallyMinWalls)
        return `the walls of ${name} stand at ${wallsOf(S, so.city)}: only walls of ${S.config.sallyMinWalls} or more can sally`;
      const inside = unitAt(S, so.city);
      if (inside === null || inside.power === power) return `no foreign troops stand within the walls of ${name}`;
      if (isBlank(so.from)) return "name the province the attack the walls support comes from";
      if (!Map.exists(so.from)) return `there is no province called '${so.from}'`;
      if (!Map.areAdjacent(so.from, so.city)) return `${so.from} is not next to ${name}`;
      if (sallied.has(so.city)) return `the walls of ${name} were already to sally by an earlier order`;
      return null;
    }

    case "besiege": {
      const [e, u] = ownUnit(order.unit);
      if (e !== null) return e;
      if (u!.kind !== "Army") return "only an army can besiege a city; a fleet cannot";
      if (wallsOf(S, order.unit) <= 0) return `${Map.get(order.unit).name} has no walls to besiege`;
      if (S.owner.getOrDefault(order.unit, null) === power) return `${Map.get(order.unit).name} is yours`;
      return null;
    }

    case "raise": {
      const r = order;
      if (r.men != null && (!Number.isInteger(r.men) || r.men <= 0)) return "say how many men the levy takes, or leave it out for a unit's full size";
      if (!Map.exists(r.province)) return `there is no province called '${r.province}'`;
      const p = Map.get(r.province);
      if (!Map.isHome(power, p.id)) return `${p.name} is not part of your homeland`;
      if (S.owner.getOrDefault(p.id, null) !== power) return `you do not hold ${p.name}`;
      if (r.kind === "Fleet" && !p.isCoastal) return `${p.name} has no harbour for a fleet`;
      if (raisedIn.has(p.id)) return `you already raise a unit in ${p.name}`;
      const men = menAvailable(S, p.id);
      if (men < LandData.levyLeast) return `${p.name} has too few men of fighting age left for ${r.kind === "Army" ? "an army" : "a fleet"} (${LandData.levyLeast} at least, ${men} at home and not carrying or building)`;
      if (r.men != null && r.men < LandData.levyLeast) return `a levy takes ${LandData.levyLeast} men at least`;
      return spend(forMen(r.kind === "Army" ? S.config.armyCost : S.config.fleetCost, r.kind, Math.min(men, r.men ?? menOf(r.kind))));
    }

    case "disband": {
      const [why, unit] = ownUnit(order.unit);
      if (why !== null || order.settle !== true || unit === null) return why;
      if (Map.get(unit.province).isSea || S.owner.getOrDefault(unit.province, null) !== power) return "its men can be settled as colonists only in a province of your own";
      return null;
    }

    case "cede": {
      const cp = order;
      if (!Map.exists(cp.province)) return `there is no province called '${cp.province}'`;
      if (S.owner.getOrDefault(cp.province, null) !== power) return "you can only cede what you hold";
      if (cp.to === power || !isAlive(S, cp.to)) return `you cannot cede land to ${cp.to}`;
      // Item 11d: a capital only by agreement on a sealed tablet, and the realm goes with it.
      if (cp.province === courtOf(S, Map, power) && !cessionAgreed(S.tablets, power, cp.to, cp.province))
        return `you can cede your capital only as a sealed tablet between you and ${cp.to} says ("I give you the land of ${Map.get(cp.province).name}"): your whole realm passes with it, and you live on as a man without a throne`;
      if (ceded.has(cp.province)) return `${Map.get(cp.province).name} was already ceded by an earlier order`;
      return null;
    }

    case "giftUnit": {
      const ge = ownUnit(order.unit)[0];
      if (ge !== null) return ge;
      if (order.to === power || !isAlive(S, order.to)) return `you cannot give a unit to ${order.to}`;
      return null;
    }

    case "huntBands":
      for (const x of order.provinces ?? []) if (!Map.exists(x) || Map.get(x).isSea) return `there is no province called '${x}'`;
      return null;

    case "hunt":
      if (!Map.exists(order.province) || Map.get(order.province).isSea) return `there is no province called '${order.province}'`;
      return S.owner.getOrDefault(order.province, null) === power ? null : `you do not hold ${Map.get(order.province).name}`;
  }
  return undefined;
}
