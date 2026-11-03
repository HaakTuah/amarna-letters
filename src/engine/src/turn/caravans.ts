/**
 * Caravans on the road (build order item 9+a, "Caravans carry a kingdom's goods"; split from economy.ts): each season
 * they pay their porters, eat, travel, meet the borders and the road's dangers, and hand over or trade their goods where
 * they arrive.
 */
import { waysOf } from "../model/works.ts";
import { Dict } from "../core/collections.ts";
import { idiv } from "../core/num.ts";
import { cmpNum, sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { caravanAt, caravanGone, type Caravan } from "../model/caravans.ts";
import { EconomyData, grainWorth } from "../model/economy.ts";
import { unitCarried } from "../model/land.ts";
import { seasonOfTurn, WinterSeason } from "../model/map.ts";
import { type Power } from "../model/power.ts";
import { isAlive, logEvent, notify, siegeOf, unitLabel, type Unit } from "../model/state.ts";
import { legPoints, PointsPerDay, boatDays, type Company } from "../model/travel.ts";
import { formatMoney } from "../rules/calendar.ts";
import { RoadOdds } from "./travel.ts";
import { TurnEngine } from "./core.ts";
import { openToSea, type Sneak, type TollBook } from "./trade.ts";
import { MarketsTitle } from "./economy.ts";

declare module "./core.ts" {
  interface TurnEngine {
    caravansTravel(): void;
    caravanCompany(c: Caravan): Company;
    caravanRoute(p: Power, from: string, to: string): string[] | null;
    caravanArrives(c: Caravan, traded?: string[] | null): void;
    /** A season's pay for its porters (a ship's crew). */
    caravanPay(c: Caravan): number;
    /** The pay it carries for its road (#587): a season's for each season of the road there, and back for a trader or a ship. */
    payLoad(c: Caravan): number;
  }
}

const P = TurnEngine.prototype;

/** How a caravan goes through foreign land: a trader as ordered (openly or smuggling), a kingdom's caravan sneaking where closed (item 11f). */
const sneakOf = (c: Caravan): Sneak => (c.trade ? c.sneak : "closed");

/**
 * A caravan's company for its pace ("What sets a company's pace"): its size is its load in measures, a donkey string for
 * every twenty, so a big caravan is slow and a small one quick; it carries no more than its donkeys can.
 */
P.caravanCompany = function (c) {
  return { sneaking: false, size: c.grain, load: c.grain, capacity: Math.max(20, Math.ceil(c.grain / 20) * 20), animals: "Donkeys" };
};

/**
 * A caravan's route: through land open to it (its king's own, and from item 9+b land whose holder has not closed his
 * roads to it), and since item 11f, where no such road reaches, through land closed to it too, sneaking there at risk
 * ("Caravans carry a kingdom's goods": where they have no passage they may still go), ending at the destination (which may be land where his troops
 * stand), by road or by boat on a river; by sea only as a ship ("Ships carry goods"). Null if there is none.
 */
P.caravanRoute = function (p, from, to) {
  return this.tradeRoute(p, from, to, false) ?? this.tradeRoute(p, from, to, "closed");
};

/**
 * The caravans on the road go on: each pays its porters, or a ship its crew, out of the pay it carries and then its load
 * (spent where it stands, if that is its king's land), or they desert with the cargo; eats from its grain for the time on the road (little by boat or ship); advances a
 * season's travel at its pace, meeting each border it crosses (item 9+b: turned back where the roads are closed to it,
 * paying the toll, or smuggling past it); meets the road's check once (the troops or fleets of a king who closed his roads
 * to its king, standing where it passed, take it with the road check's odds; outlaws on land, more readily for a big
 * caravan; storms at sea), and hands over or trades its goods where it arrives.
 */
P.caravanPay = function (c) {
  return c.ship !== null ? this.s.config.fleetUpkeep : Math.max(1, Math.ceil((c.grain + idiv(c.gold, 10)) / EconomyData.caravanPayPer));
};

P.payLoad = function (c) {
  const perSeason = this.s.config.travelDays * PointsPerDay;
  const company: Company = c.ship !== null ? { sneaking: false } : this.caravanCompany(c);
  const season = seasonOfTurn(this.s.turn);
  let points = 0;
  // Reckoned on the roads as the map has them, without what was built on them: the court may not know of far works, and
  // what roads save comes home with the caravan (Codex, #635).
  for (let i = 0; i + 1 < c.route.length; i++) points += legPoints(this.map, c.route[i], c.route[i + 1], season, company);
  const seasons = Math.max(1, Math.ceil(points / perSeason));
  return this.caravanPay(c) * seasons * (c.trade || c.ship !== null ? 2 : 1);
};

P.caravansTravel = function () {
  const S = this.s;
  const perSeason = S.config.travelDays * PointsPerDay;
  const season = seasonOfTurn(S.turn);
  const book: TollBook = new Dict();
  // The gold it carries, its porters' pay with it (#587).
  const what = (c: Caravan): string => [c.grain > 0 || c.gold + c.pay <= 0 ? `${c.grain} measures of grain` : "", c.gold + c.pay > 0 ? formatMoney(c.gold + c.pay) : ""].filter((x) => x !== "").join(" and ");
  const noun = (c: Caravan): string => (c.ship !== null ? "ship" : "caravan");
  const arrivals: Caravan[] = [];
  for (const c of sortBy([...S.caravans], [(c: Caravan) => c.id, cmpStr])) {
    if (!isAlive(S, c.power)) {
      caravanGone(S, c);
      continue;
    }
    const pay = this.caravanPay(c);
    const here = caravanAt(c);
    if (c.bill === null && c.pay + c.gold < pay) {
      caravanGone(S, c);
      if (c.ship !== null && c.ship.home !== "") this.spendAt(c.ship.home, c.ship.savings);
      this.caravanTell(c, here, "Notice", MarketsTitle, `Your ${noun(c)} from ${this.map.get(c.from).name} to ${this.map.get(c.to).name} went unpaid: its ${c.ship !== null ? "crew" : "porters"} deserted at ${this.map.get(here).name} with its ${what(c)}${c.ship !== null ? ", and the fleet is lost to you" : ""}.`);
      logEvent(S, "caravan-lost", `${c.power}'s unpaid ${noun(c)} deserted with its goods.`, [...this.caravanNear(c, here)], "caravan-lost");
      continue;
    }
    // #587: out of the pay it carries, then out of its load; a load going home owes it, paid when it arrives.
    if (c.bill !== null) c.bill += pay;
    else {
      const fromPay = Math.min(c.pay, pay);
      c.pay -= fromPay;
      c.gold -= pay - fromPay;
    }
    // The porters spend their pay where they stand openly (at home or in land open to them); smugglers off the road and
    // a crew at sea keep it, the smugglers' going to their homes at once and the crew's into its savings.
    if (c.bill === null) {
      if (this.map.get(here).isSea) {
        if (c.ship !== null) c.ship.savings += pay;
      } else if (this.caravanOffRoad(c.power, here, sneakOf(c))) this.spendAt(c.from, pay);
      else this.spendAt(here, pay);
    }
    // Advance along the route at its pace, counting how much of the season went by boat, meeting each border it crosses.
    const start = perSeason + c.points;
    let budget = start;
    let boat = 0;
    const crossed: string[] = [];
    const company: Company = c.ship !== null ? { sneaking: false } : this.caravanCompany(c);
    let stopped: "turned" | "seized" | null = null;
    while (c.at < c.route.length - 1) {
      const a = c.route[c.at];
      const b = c.route[c.at + 1];
      const offRoad = (x: string): boolean => c.ship === null && this.caravanOffRoad(c.power, x, sneakOf(c));
      const cost = legPoints(this.map, a, b, season, { ...company, sneaking: offRoad(a) || offRoad(b), ways: waysOf(this.s) });
      if (cost > budget) break;
      const border = this.atBorder(c, a, b, book);
      if (border !== "pass") {
        stopped = border;
        break;
      }
      budget -= cost;
      if (c.ship !== null || boatDays(this.map, a, b) !== null) boat += cost;
      c.at++;
      crossed.push(b);
    }
    if (stopped === "seized") {
      caravanGone(S, c);
      if (c.ship !== null) this.rejoinFleet(c);
      continue;
    }
    if (stopped === "turned") {
      const at = caravanAt(c);
      // A kingdom's caravan goes on to where it was sent, sneaking through the land it now knows is closed to it (item 11f).
      const onward = c.ship === null && !c.trade && !c.returning ? this.caravanRoute(c.power, at, c.to) : null;
      if (onward !== null) {
        c.route = onward;
        c.at = 0;
        c.points = 0;
        continue;
      }
      // A new way home, round the land it now knows is closed to it.
      const back = c.ship !== null ? this.shipRoute(at, c.from) : this.tradeRoute(c.power, at, c.from, sneakOf(c));
      if (back === null && at !== c.from) {
        caravanGone(S, c);
        if (c.ship !== null) this.rejoinFleet(c);
        this.caravanTell(c, at, "Notice", MarketsTitle, `Your ${noun(c)} found no way home from ${this.map.get(at).name}: its ${what(c)} were lost.`);
        continue;
      }
      if (back !== null) {
        c.route = back;
        c.at = 0;
        c.returning = true;
      }
      c.points = 0;
      if (c.at >= c.route.length - 1) this.caravanHome(c);
      continue;
    }
    const arrived = c.at >= c.route.length - 1;
    c.points = arrived ? 0 : budget;
    // The porters and donkeys eat from the load for the share of a season they spent on the road, little on the river or at sea.
    const used = arrived ? Math.min(perSeason, start - budget) : perSeason;
    const onBoat = Math.min(boat, used);
    const eat = Math.ceil((c.grain * (EconomyData.caravanEatPercent * (used - onBoat) + EconomyData.boatEatPercent * onBoat)) / (100 * perSeason));
    c.grain = Math.max(0, c.grain - eat);
    // The road check, once, as for any traveller (item 7b's odds): the troops (at sea, the fleets) of a king who has
    // closed his roads to its king, where he has no passage, in a province it reached; or outlaws; or a storm at sea.
    const seen = crossed.length > 0 ? crossed : [caravanAt(c)];
    const hostile = (k: Power, at: string): boolean => (S.roadsClosed.tryGet(k) ?? []).includes(c.power) && !this.passageFor(k, c.power, at);
    // Troops shut inside walls by a siege seize nothing beyond them: the countryside is the besieger's (item 11f).
    const shut = (u: Unit): boolean => S.sieges.some((x) => x.province === u.province && x.power !== u.power);
    const taker = seen.map((x) => S.units.find((u) => u.province === x && u.power !== c.power && hostile(u.power, x) && !shut(u)) ?? null).find((u) => u !== null) ?? null;
    const roll = this.r("caravan", c.id).nextDouble() * 100;
    if (taker !== null && c.grain + c.gold + c.archive.length > 0 && roll < RoadOdds.troops) {
      caravanGone(S, c);
      const kept = Math.min(c.grain, unitCarried(taker) - taker.food);
      taker.food += Math.max(0, kept);
      this.credit(taker.power, c.gold + c.pay, taker.province, false);
      const where = this.map.get(taker.province).name;
      // A captured archive on the road (item 10+b) is the taker's now.
      if (c.archive.length > 0) this.archiveArrives(taker.power, c.archive, c.archiveOf, where);
      this.caravanTell(c, taker.province, "Notice", MarketsTitle, `Your ${noun(c)} to ${this.map.get(c.to).name} was taken at ${where} by ${taker.power}'s ${c.ship !== null ? "fleet" : "troops"}, with its ${what(c)}${c.ship !== null ? "; a loaded ship fights badly, and the fleet is lost" : ""}.`);
      notify(S, taker.power, "Notice", MarketsTitle, `Your ${taker.kind === "Fleet" ? "fleet" : "troops"} at ${where} took ${c.power}'s ${noun(c)} and its ${what(c)}${kept > 0 ? `; they kept ${kept} measures for their own baggage` : ""}${c.gold + c.pay > 0 ? (this.isFar(taker.power, taker.province) ? ", the gold to go home to your treasury" : ", the gold for your treasury") : ""}.`);
      logEvent(S, "caravan-taken", `${taker.power}'s ${taker.kind === "Fleet" ? "fleet" : "troops"} took ${c.power}'s ${noun(c)} at ${where}.`, [...this.caravanNear(c, taker.province), taker.power], "caravan-taken");
      continue;
    }
    // Item 11b: a band working where it passed (at sea, pirates off those coasts) falls on it, and keeps what it takes.
    const raider = sortBy(seen, [(x: string) => -this.bandOdds(x), cmpNum], [(x: string) => x, cmpStr])[0];
    if (c.grain + c.gold > 0 && c.archive.length === 0 && this.bandOdds(raider) > 0 && this.r("caravan-band", c.id).nextDouble() * 100 < this.bandOdds(raider)) {
      caravanGone(S, c);
      const coast = this.map.get(raider).isSea ? (this.map.coastsOf(raider).find((p) => S.bands.some((b) => b.ship && b.province === p.id))?.id ?? raider) : raider;
      // The grain is sold where they stand; the gold and what the grain fetched are the chief's.
      const m = this.map.get(coast).isSea ? null : this.market(coast);
      const fetched = m === null ? 0 : Math.min(m.purse, grainWorth(c.grain));
      if (m !== null) {
        m.stock += c.grain;
        m.purse -= fetched;
      }
      const band = this.robbedBy(raider, c.gold + c.pay + fetched);
      // A ship taken is lost with its fleet; its crew put ashore among the loose men of the pirates' coast.
      if (c.ship !== null && !this.map.get(coast).isSea) this.peopleOf(coast).loose += c.ship.men;
      this.caravanTell(c, raider, "Notice", MarketsTitle, `${band !== null && c.ship !== null ? "Pirates" : "A band of outlaws"} fell on your ${noun(c)} to ${this.map.get(c.to).name} near ${this.map.get(raider).name} and carried off its ${what(c)}${c.ship !== null ? "; the ship is theirs, and the fleet is lost" : ""}.`);
      logEvent(S, "caravan-robbed", `A band robbed ${c.power}'s ${noun(c)} near ${this.map.get(raider).name}.`, [...this.caravanNear(c, raider)], c.ship !== null ? "ship-pirated" : "caravan-banded");
      continue;
    }
    if (c.ship !== null) {
      const storm = seen.some((x) => this.map.get(x).isSea) ? (season === WinterSeason ? RoadOdds.winterStorm : RoadOdds.storm) : 0;
      if (storm > 0 && this.r("ship-storm", c.id).nextDouble() * 100 < storm) {
        caravanGone(S, c);
        this.caravanTell(c, caravanAt(c), "Notice", MarketsTitle, `A storm sank your ship near ${this.map.get(caravanAt(c)).name}, with its ${what(c)}: the fleet is lost.`);
        logEvent(S, "ship-lost", `A storm sank ${c.power}'s ship.`, [...this.caravanNear(c, caravanAt(c))], "ship-lost");
        continue;
      }
    } else {
      const odds = (EconomyData.caravanOutlawPercent * (100 + c.grain + idiv(c.gold, 10))) / 100;
      if (c.grain + c.gold + c.archive.length > 0 && this.r("caravan-outlaws", c.id).nextDouble() * 100 < odds) {
        caravanGone(S, c);
        // Item 11b: nothing vanishes ("Nothing appears or vanishes without a cause"): the loose men there carry the gold
        // and sell the grain at its market.
        const at = caravanAt(c);
        if (!this.map.get(at).isSea) {
          this.market(at).stock += c.grain;
          S.loot.set(at, S.loot.getOrDefault(at, 0) + c.gold + c.pay);
        }
        this.caravanTell(c, caravanAt(c), "Notice", MarketsTitle, `Outlaws fell on your caravan to ${this.map.get(c.to).name} near ${this.map.get(caravanAt(c)).name} and carried off its ${what(c)}.`);
        logEvent(S, "caravan-robbed", `Outlaws robbed ${c.power}'s caravan.`, [...this.caravanNear(c, caravanAt(c))], "caravan-robbed");
        continue;
      }
    }
    if (arrived) arrivals.push(c);
  }
  // Those that reached a market to trade trade there together, whoever came first (item 10+b); then each goes on.
  const traded = new Map<string, string[]>();
  const traders = arrivals.filter((c) => !c.returning && c.trade);
  for (const at of [...new Set(traders.map((c) => caravanAt(c)))].sort(cmpStr)) this.tradeTogether(traders.filter((c) => caravanAt(c) === at), traded);
  for (const c of arrivals) this.caravanArrives(c, traded.get(c.id) ?? []);
  this.tellTolls(book);
};

/**
 * A caravan or ship arrives. One that trades sells and buys at the market there (item 9+b); one that delivers fills the
 * baggage of its king's troops standing there, emptiest first, and puts the rest into the stores if the province is its
 * king's and open to it (a besieged city takes in nothing by land, and by sea only while its waters are open). Whatever
 * it still carries, and a ship always, goes home again; one coming home unloads there.
 */
P.caravanArrives = function (c, traded = null) {
  const S = this.s;
  if (c.returning) {
    this.caravanHome(c);
    return;
  }
  const at = caravanAt(c);
  const name = this.map.get(at).name;
  const parts: string[] = traded !== null ? [...traded] : [];
  if (c.trade) {
    if (traded === null) this.tradeAtMarket(c, parts);
  } else {
    const besieged = siegeOf(S, at) !== null;
    const open = !besieged || (c.ship !== null && openToSea(this, at));
    if (open)
      for (const u of sortBy(
        S.units.filter((u) => u.power === c.power && u.province === at),
        [(u: Unit) => u.food, cmpNum],
        [(u: Unit) => u.id, cmpStr],
      )) {
        const give = Math.min(c.grain, unitCarried(u) - u.food);
        if (give <= 0) continue;
        u.food += give;
        c.grain -= give;
        parts.push(`handed ${give} to ${unitLabel(u)}`);
      }
    if (c.grain > 0 && S.owner.getOrDefault(at, null) === c.power && open) {
      const before = c.grain;
      c.grain = this.putInStores(at, c.grain);
      if (before > c.grain) parts.push(`put ${before - c.grain} into the stores${besieged ? " of the besieged city" : ""}`);
    }
    if (!open) parts.push(c.ship !== null ? "found the harbour blockaded" : "found the city besieged and could not get in");
  }
  if (c.grain > 0 || c.gold > 0 || c.ship !== null) {
    const back = c.ship !== null ? this.shipRoute(at, c.from) : this.tradeRoute(c.power, at, c.from, sneakOf(c));
    if (back !== null) {
      c.route = back;
      c.at = 0;
      c.points = 0;
      c.returning = true;
      this.caravanTell(c, at, "Notice", MarketsTitle, `Your ${c.ship !== null ? "ship" : "caravan"} reached ${name}${parts.length > 0 ? ` and ${parts.join(", ")}` : ""}; it goes home to ${this.map.get(c.from).name}${c.grain + c.gold > 0 ? ` with ${[c.grain > 0 ? `${c.grain} measures of grain` : "", c.gold > 0 ? formatMoney(c.gold) : ""].filter((x) => x !== "").join(" and ")}` : ""}.`);
      logEvent(S, c.trade ? "traded" : "caravan", `${c.power}'s ${c.ship !== null ? "ship" : "caravan"} reached ${name}.`, [...this.caravanNear(c, at)], c.trade ? "traded" : "caravan");
      return;
    }
  }
  caravanGone(S, c);
  if (c.ship !== null) this.rejoinFleet(c);
  // The pay it did not need stays where its road ended: in the coffer or treasury there if it is its king's, else with
  // its porters, who spend it there.
  if (c.pay > 0 && !this.map.get(at).isSea && S.owner.getOrDefault(at, null) === c.power) this.receiveAt(c.power, at, c.pay, false);
  else if (c.pay > 0) this.spendAt(this.map.get(at).isSea ? c.from : at, c.pay);
  c.pay = 0;
  const lostLine = c.grain + c.gold > 0 ? ` The other ${c.grain} measures${c.gold > 0 ? ` and ${formatMoney(c.gold)}` : ""} had no way home and were lost.` : "";
  this.caravanTell(c, at, "Notice", MarketsTitle, `Your caravan reached ${name}${parts.length > 0 ? ` and ${parts.join(", ")}` : ""}.${lostLine}`);
  logEvent(S, "caravan", `${c.power}'s caravan reached ${name}.`, [...this.caravanNear(c, at)], "caravan");
};
