/**
 * Orders of the treasury and the markets: selling and buying grain, caravans, trade and ships, tolls, taxes and people, fees and debts. Split from the order validator (validator.ts), which owns the season's checking state.
 */
import { isBlank } from "../core/text.ts";
import type { Order } from "../model/orders.ts";
import { hiddenAt } from "../model/people.ts";
import { AllPowers } from "../model/power.ts";
import { standsForBorrower } from "../model/money.ts";
import { buyAlongCurve, needOf } from "../model/economy.ts";
import { LandData } from "../model/land.ts";
import { harbourOf, shipFleet, TradeData } from "../model/trade.ts";
import { findCharacter, siegeOf } from "../model/state.ts";
import type { Checking } from "./validator-context.ts";

/** Why the order is refused, null if it stands, or undefined if it is not one of these. */
export function checkEconomyOrder(v: Checking, order: Order): string | null | undefined {
  const { S, Map, power, orders, orderedUnits, tollsSet, taxesSet, peopleSet, nobody, spend } = v;
  switch (order.type) {
    case "sell":
    case "purchase":
    case "feed": {
      const what = order.type === "sell" ? "sell" : order.type === "purchase" ? "buy" : "hand to its town";
      if (isBlank(order.province)) return `name the province whose grain to ${what}`;
      if (!Map.exists(order.province) || Map.get(order.province).isSea) return `there is no province called '${order.province}'`;
      const name = Map.get(order.province).name;
      if (S.owner.getOrDefault(order.province, null) !== power) return `you do not hold ${name}: at a foreign market you trade by a caravan (order trade) or a ship (order ship)`;
      if (siegeOf(S, order.province) !== null) return `${name} is besieged: nothing goes in or out of its market`;
      if (!(order.amount > 0)) return "name how many measures of grain";
      if (order.type !== "purchase") return null;
      const m = S.markets.tryGet(order.province);
      return spend(buyAlongCurve(m?.stock ?? 0, needOf(Map.get(order.province)), Number.MAX_SAFE_INTEGER, order.amount).paid);
    }

    case "caravan": {
      if (isBlank(order.from) || isBlank(order.to)) return "name the province the caravan sets out from and the one it goes to";
      for (const x of [order.from, order.to]) if (!Map.exists(x) || Map.get(x).isSea) return `there is no province called '${x}'`;
      if (order.from === order.to) return "a caravan must go somewhere else";
      if (S.owner.getOrDefault(order.from, null) !== power) return `you do not hold ${Map.get(order.from).name}`;
      if (siegeOf(S, order.from) !== null) return `${Map.get(order.from).name} is besieged: no caravan can leave it`;
      if (!(order.amount > 0)) return "name how many measures of grain";
      return null;
    }

    case "trade": {
      if (isBlank(order.from) || isBlank(order.to)) return "name the province the caravan sets out from and the market it goes to";
      for (const x of [order.from, order.to]) if (!Map.exists(x) || Map.get(x).isSea) return `there is no province called '${x}'`;
      if (S.owner.getOrDefault(order.from, null) !== power) return `you do not hold ${Map.get(order.from).name}`;
      if (siegeOf(S, order.from) !== null) return `${Map.get(order.from).name} is besieged: no caravan can leave it`;
      if (S.owner.getOrDefault(order.to, null) === power) return `${Map.get(order.to).name} is your own market: sell or buy there with the orders sell and purchase`;
      if (Map.get(order.to).kingless) return `${Map.get(order.to).name} has no town and no market to trade at`;
      if (!(order.grain >= 0) || !(order.gold >= 0) || order.grain + order.gold <= 0) return "name the grain it carries to sell, the gold it carries to buy with, or both";
      return spend(order.gold);
    }

    case "ship": {
      for (const x of [order.from, order.to]) if (isBlank(x) || !Map.exists(x) || Map.get(x).isSea) return `there is no province called '${x}'`;
      const fleet = shipFleet(S.units, Map.get(order.from), order.fleet, power);
      if (fleet === null || (fleet.province !== order.from && fleet.province !== Map.get(order.from).waters)) return `you have no fleet in ${Map.get(order.from).name} or its waters to load`;
      if (orderedUnits.has(fleet.province)) return `the fleet in ${fleet.province} already has an order`;
      const from = Map.get(order.from);
      const to = Map.get(order.to);
      if (harbourOf(from) <= 0) return `${from.name} has no harbour`;
      if (S.owner.getOrDefault(order.from, null) !== power) return `you do not hold ${from.name}`;
      if (siegeOf(S, order.from) !== null) return `${from.name} is besieged: nothing is loaded there`;
      if (harbourOf(to) <= 0) return `${to.name} has no harbour`;
      if (order.from === order.to) return "a ship must sail somewhere else";
      if (order.trade && S.owner.getOrDefault(order.to, null) === power) return `${to.name} is your own market: deliver there (trade false), and sell with the order sell`;
      if (order.trade && to.kingless) return `${to.name} has no town and no market to trade at`;
      if (!(order.grain >= 0) || !(order.gold >= 0) || order.grain + order.gold <= 0) return "name the grain it loads, the gold it carries, or both";
      if (order.grain > TradeData.shipCapacity) return `a fleet carries at most ${TradeData.shipCapacity} measures`;
      if (!order.trade && order.gold > 0) return "a ship that delivers carries grain only: gold goes with a ship that trades";
      const paid = spend(order.gold);
      if (paid === null) orderedUnits.add(fleet.province);
      return paid;
    }

    case "toll": {
      if (order.province !== null && (!Map.exists(order.province) || Map.get(order.province).isSea)) return `there is no province called '${order.province}'`;
      if (order.province !== null && S.owner.getOrDefault(order.province, null) !== power) return `you do not hold ${Map.get(order.province).name}`;
      if (order.partner !== null && (!AllPowers.includes(order.partner) || order.partner === power)) return `there is no other king called '${order.partner}'`;
      if (!(order.percent >= 0) || order.percent > TradeData.tollMost) return `a toll is a percent from 0 to ${TradeData.tollMost}`;
      const key = `${order.province ?? ""}|${order.partner ?? ""}`;
      if (tollsSet.has(key)) return "you had already set that toll this season";
      tollsSet.add(key);
      return null;
    }

    case "tax": {
      if (order.province !== null && (!Map.exists(order.province) || Map.get(order.province).isSea)) return `there is no province called '${order.province}'`;
      if (order.province !== null && S.owner.getOrDefault(order.province, null) !== power) return `you do not hold ${Map.get(order.province).name}`;
      if (!Number.isInteger(order.percent) || order.percent < 0 || order.percent > LandData.taxMost) return `a tax is a percent of the harvest from 0 to ${LandData.taxMost}`;
      const key = order.province ?? "";
      if (taxesSet.has(key)) return "you had already set that tax this season";
      taxesSet.add(key);
      return null;
    }

    // Item 10+b: people in a king's hands.
    case "welcome":
    case "expel":
    case "returnRunaways":
    case "deport": {
      if (!Map.exists(order.province) || Map.get(order.province).isSea) return `there is no province called '${order.province}'`;
      const name = Map.get(order.province).name;
      if (S.owner.getOrDefault(order.province, null) !== power) return `you do not hold ${name}`;
      const key = `${order.type}|${order.province}|${order.type === "returnRunaways" ? order.to : ""}`;
      if (peopleSet.has(key)) return `you had already given that order for ${name} this season`;
      if (order.type === "expel" && siegeOf(S, order.province) === null) return `${name} is not besieged`;
      if (order.type === "expel" && (!Number.isInteger(order.percent) || order.percent < 1 || order.percent > 100)) return "say how many in a hundred of the mouths still inside to put out, 1 to 100";
      if (order.type === "returnRunaways" && (!AllPowers.includes(order.to) || order.to === power)) return `you cannot send runaways to '${order.to}'`;
      if (order.type === "deport") {
        if (Map.isHome(power, order.province)) return `${name} is your own homeland: a king deports only from land he has taken`;
        if (!Map.exists(order.to) || Map.get(order.to).isSea || S.owner.getOrDefault(order.to, null) !== power) return `you do not hold '${order.to}' to send them to`;
        if (order.to === order.province) return "deportees go to another province of yours";
        if (!Number.isInteger(order.number) || order.number <= 0) return "say how many people to deport";
      }
      peopleSet.add(key);
      return null;
    }

    case "payFee": {
      // Item 11a: pay what fell due unpaid to a person at your court, or withhold the rest of a servant's job.
      const c = findCharacter(S, order.character);
      if (c === null) return nobody(order.character);
      if (!order.pay) return c.employer === power && c.contract !== null ? null : `${c.name} has no job of yours whose fee you could withhold`;
      const owed = c.owed.getOrDefault(power, 0);
      if (owed <= 0) return c.employer === power && c.contract !== null && c.contract.withheld ? null : `you owe ${c.name} nothing that fell due`;
      if (c.at !== power || hiddenAt(c, power)) return `${c.name} is not at your court to be paid`;
      return spend(owed);
    }

    case "borrow": {
      // Item 11a: from a person at your court who offers to lend.
      const c = findCharacter(S, order.character);
      if (c === null || c.status === "Dead" || c.at !== power || hiddenAt(c, power)) return `there is nobody at your court called '${order.character}'`;
      if (c.lendOffer === null || c.lendOffer.amount <= 0) return `${c.name} offers no loan`;
      if (order.amount <= 0 || order.repay < order.amount) return "name the gold to borrow, and a sum to repay no smaller";
      return null;
    }

    case "repay": {
      const d = S.debts.find((x) => x.id === order.debt) ?? null;
      // A debt whose tablet went missing stands, as far as you know, until word of its end reaches you.
      if (d === null || d.borrower !== power || !standsForBorrower(d, S.turn)) return `you have no debt '${order.debt}' standing`;
      if (order.amount <= 0) return "name the gold to repay";
      return spend(order.amount);
    }

    case "seize": {
      // Haakon's answers to item 11a: the hoard of a living person, kept in your capital.
      const c = findCharacter(S, order.character);
      if (c === null || c.status === "Dead") return nobody(order.character);
      if (c.hoard === null || c.hoard.at !== power) return `${c.name} keeps no hoard in your city that you know of`;
      return null;
    }

    case "sellDebt": {
      const d = S.debts.find((x) => x.id === order.debt) ?? null;
      if (d === null || d.ended !== null || d.holder !== power) return `you hold no tablet of a standing debt '${order.debt}' in your archive`;
      const c = findCharacter(S, order.character);
      if (c === null || c.status === "Dead" || c.at !== power || c.heldBy !== null || hiddenAt(c, power)) return `there is nobody at your court called '${order.character}'`;
      if (order.price <= 0) return "name the price";
      return null;
    }

    case "payCarriers":
      return null;

    case "upkeep": {
      if (order.province === undefined) return null;
      if (!Map.exists(order.province)) return `there is no province called '${order.province}'`;
      const prov = Map.get(order.province);
      if (!S.units.some((u) => u.power === power && u.province === prov.id)) return `no troops of yours stand in ${prov.name}`;
      return null;
    }
  }
  return undefined;
}
