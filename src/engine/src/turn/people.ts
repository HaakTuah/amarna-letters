/**
 * People at home (build order item 10+a, "People of the land"): the harvest follows the hands on the land, a levy takes
 * men from it, and hunger, births, the settled moving within their kingdom, men moving between the land and the roads,
 * and the loose drifting change them each season; the land's people resist an army that enters it ("The people defend
 * their land"); droughts strike rain-fed land by region and each great river floods once a year along its course ("Land
 * and climate", "Rivers"). Seeded and deterministic: every flow is reckoned from the season's figures before any applies.
 */
import { Dict } from "../core/collections.ts";
import { clamp, idiv } from "../core/num.ts";
import { sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { EconomyData, grainWorth } from "../model/economy.ts";
import { climateOf, DroughtRegions, RiverFloods, Rivers } from "../model/geography.ts";
import { climatePercentIn, countryNeed, harvestIn, LandData, menAvailable, menOf, reckonedOf, resistanceOf, type People } from "../model/land.ts";
import { seasonOfTurn, type UnitKind } from "../model/map.ts";
import type { TaxOrder } from "../model/orders.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { alive, isAlive, logEvent, newId, notify, siegeOf, type ClimateEvent, type Unit } from "../model/state.ts";
import { fastestPoints, PointsPerDay } from "../model/travel.ts";
import { Views } from "../rules/views.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    peopleOf(province: string): People;
    taxRate(province: string): number;
    harvestNow(province: string, weather?: boolean): number;
    climatePercent(province: string): number;
    peopleSeason(food: Dict<string, number>): Dict<Power, string[]>;
    levyMen(province: string, n: number): boolean;
    menHome(u: Unit, settle: boolean): string;
    unitDestroyed(u: Unit): void;
    killSettled(province: string, permille: number, loosePermille?: number): number;
    resistance(province: string, mover: Power): number;
    climateSeason(): void;
    setTax(p: Power, o: TaxOrder): void;
  }
}

const P = TurnEngine.prototype;

P.peopleOf = function (province) {
  let x = this.s.people.tryGet(province);
  if (x === undefined) this.s.people.set(province, (x = { settled: 0, men: 0, loose: 0 }));
  return x;
};

P.taxRate = function (province) {
  return this.s.taxes.getOrDefault(province, EconomyData.taxPercent);
};

P.harvestNow = function (province, weather = true) {
  return harvestIn(this.map, this.s, province, weather);
};

P.climatePercent = function (province) {
  return climatePercentIn(this.s, province);
};

/** Moves men between a province's settled (and its men of fighting age) and elsewhere: positive adds, negative takes. */
export function shift(x: People, settled: number, men: number): void {
  x.settled = Math.max(0, x.settled + settled);
  x.men = clamp(x.men + men, 0, x.settled);
}

/** A share of a province's settled, with the men of fighting age among them in proportion. */
export function share(x: People, n: number): [number, number] {
  const take = clamp(n, 0, x.settled);
  return [take, x.settled <= 0 ? 0 : idiv(x.men * take, x.settled)];
}

/**
 * The season of the people, after the harvest and the towns' meals (`food`: what each province's countryside kept of
 * its harvest). Discharged men arrive home; the countryside eats, buying from its market what it lacks, and a hungry
 * province loses people that same season, most of them turned loose; births and boys coming of age; the settled move
 * between neighbouring provinces of a kingdom towards more room, with their share of the purse; men move between the
 * land and the roads by what each pays; the loose drift towards richer land. Returns the lines each king reads.
 */
P.peopleSeason = function (food) {
  const S = this.s;
  const Map = this.map;
  const lines = new Dict<Power, string[]>();
  const say = (p: Power | null, line: string): void => {
    if (p !== null && isAlive(S, p)) lines.set(p, [...lines.getOrDefault(p, []), line]);
  };
  const owner = (id: string): Power | null => S.owner.getOrDefault(id, null);

  // Deportees on the road may be freed by a king whose troops stand on their way (item 11a+).
  for (const [p, l] of this.deporteesOnRoad().entries()) for (const line of l) say(p, line);
  // Discharged men arrive home; people a king sent on the road (item 10+b) become the settled where they arrive.
  for (const w of S.walking.filter((w) => w.arrives <= S.turn)) {
    shift(this.peopleOf(w.home), w.men, w.deported ? idiv(w.men * LandData.menPercent, 100) : w.men);
    this.spendAt(w.home, w.savings);
    const holder = owner(w.home);
    if (w.deported && holder !== null && holder !== w.by)
      say(holder, `${people(w.men)} people sent on the road by ${w.by}, deported or sent back as runaways, reached ${Map.get(w.home).name} and settled there.`);
  }
  S.walking = S.walking.filter((w) => w.arrives > S.turn);
  S.corvee.clear();

  // The countryside eats: what it kept of the harvest, then its market's grain; what it lacks is hunger. Those it drives
  // off the land, and the runaways from a tax that left the farmers short (item 10+b), cross to better land if there is any.
  const fedBefore = S.fed.clone();
  S.fed.clear();
  const hungry = new Dict<Power, string[]>();
  const fleeing: [string, number, string][] = [];
  for (const prov of Map.landProvinces) {
    const x = this.peopleOf(prov.id);
    const r = reckonedOf(Map, prov.id);
    const need = countryNeed(prov, x.settled, r.settled);
    if (need <= 0) {
      S.granary.set(prov.id, food.getOrDefault(prov.id, 0));
      continue;
    }
    // Runaways (item 11a+, "Incentives, not quotas"): the farmers weigh what they keep at home against what they would keep
    // in the best land next door, as word of it reached them last season; where it beats home by `refugeMargin`, of the
    // share they would gain, `runPercent` run, hungry or not.
    const best = this.bestRefuge(prov.id, fedBefore);
    if (best !== null) {
      const [ran, ranMen] = share(x, idiv(idiv(x.settled * (best.score - best.here), best.score) * LandData.runPercent, 100));
      if (ran > 0) {
        shift(x, -ran, -ranMen);
        x.loose += ran;
        fleeing.push([prov.id, ran, this.taxRate(prov.id) > this.taxRate(best.to) ? "a heavy tax" : "a poor harvest"]);
      }
    }
    // They eat from their granary (item 11a+), and keep the rest until the next harvest: a whole harvest and a season's
    // reserve at most, the rest eaten better, fed to animals or lost.
    const has = food.getOrDefault(prov.id, 0);
    const eaten = Math.min(need, has);
    S.granary.set(prov.id, Math.min(has - eaten, S.reaped.getOrDefault(prov.id, 0) + need * LandData.reserveSeasons));
    let short = need - eaten;
    if (short <= 0) continue;
    const m = this.market(prov.id);
    const bought = Math.min(m.stock, short);
    m.stock -= bought;
    short -= bought;
    if (short <= 0) continue;
    const fed = idiv((need - short) * 1000, need);
    S.fed.set(prov.id, fed);
    const [leave] = share(x, idiv(idiv(x.settled * (1000 - fed), 1000) * LandData.hungerLeave, 100));
    const dead = idiv(leave * LandData.hungerDead, 100);
    const [, men] = share(x, leave);
    shift(x, -leave, -men);
    x.loose += leave - dead;
    fleeing.push([prov.id, leave - dead, "hunger"]);
    const o = owner(prov.id);
    if (o !== null && leave > 0) hungry.set(o, [...hungry.getOrDefault(o, []), `${prov.name} (${people(leave)} left the land, ${people(dead)} of them dead)`]);
  }
  for (const [p, l] of hungry.entries()) {
    say(p, `Hunger: ${l.join("; ")}. Grain on sale at a province's market feeds its countryside; a lighter tax leaves the farmers more.`);
    logEvent(S, "famine", `Hunger in ${p}'s land: ${l.join("; ")}.`, [p], "famine");
  }
  // They weigh the land they would cross to by how it fed its people last season, as word of it reached them.
  const fedNow = S.fed.clone();
  S.fed = fedBefore;
  for (const [from, n, why] of fleeing) this.refuge(from, n, why);
  S.fed = fedNow;

  // Births let the settled grow back towards what the land carries; boys coming of age restore the men more slowly.
  for (const prov of Map.landProvinces) {
    const x = this.peopleOf(prov.id);
    const room = reckonedOf(Map, prov.id).room;
    if (x.settled < room && room > 0) x.settled += idiv(idiv(x.settled * LandData.birthPercent, 100) * (room - x.settled), room);
    const target = idiv(x.settled * LandData.menPercent, 100);
    if (x.men < target) x.men += Math.max(1, idiv(target - x.men, LandData.comingOfAge));
    x.men = Math.min(x.men, x.settled);
  }

  // The settled move between neighbouring provinces of a kingdom towards more room, measured in food: the land's
  // capacity plus the grain in its stores ("Feeding a province draws its people"), taking their share of the purse.
  const roomOf = (id: string): number => {
    const x = this.peopleOf(id);
    const r = reckonedOf(Map, id);
    const need = countryNeed(Map.get(id), x.settled, r.settled);
    return need <= 0 ? 0 : idiv((countryNeed(Map.get(id), r.room, r.settled) + this.stores(id)) * 1000, need);
  };
  const flows: [string, string, number][] = [];
  for (const prov of Map.landProvinces) {
    const o = owner(prov.id);
    if (o === null || prov.kingless || siegeOf(S, prov.id) !== null) continue;
    const here = roomOf(prov.id);
    const x = this.peopleOf(prov.id);
    let budget = idiv(x.settled * LandData.movePercent, 100);
    for (const to of sortBy(
      Map.movesFrom("Army", prov.id).filter((n) => !Map.get(n).isSea && owner(n) === o && siegeOf(S, n) === null),
      [(n: string) => n, cmpStr],
    )) {
      const there = roomOf(to);
      if (there <= here || budget <= 0) continue;
      const n = Math.min(budget, idiv(idiv(x.settled * LandData.movePercent, 100) * (there - here), there));
      if (n <= 0) continue;
      flows.push([prov.id, to, n]);
      budget -= n;
    }
  }
  for (const [from, to, n] of flows) {
    const a = this.peopleOf(from);
    const [moved, men] = share(a, n);
    if (moved <= 0) continue;
    const purse = this.market(from).purse;
    const gold = idiv(purse * moved, Math.max(1, a.settled + a.loose));
    this.market(from).purse -= gold;
    this.market(to).purse += gold;
    shift(a, -moved, -men);
    shift(this.peopleOf(to), moved, men);
  }

  // Men move between the land and the roads by what each pays them: the land what the farmers keep against what they
  // eat, the roads the loose men's take of the province's wealth, shared among them ("Bandits rob the purse").
  const wealth = (id: string): number => this.market(id).purse + grainWorth(this.stores(id) + this.market(id).stock);
  for (const prov of Map.landProvinces) {
    const x = this.peopleOf(prov.id);
    const r = reckonedOf(Map, prov.id);
    const need = countryNeed(prov, x.settled, r.settled);
    if (need <= 0) continue;
    // What the farmers keep a season (item 11a+): a third of the last harvest less the tax, as far as their granary holds.
    const keep = Math.min(food.getOrDefault(prov.id, 0), idiv(idiv(S.reaped.getOrDefault(prov.id, 0), 3) * (100 - this.taxRate(prov.id)), 100));
    const land = idiv(keep * 1000, need);
    const roads = idiv(idiv(wealth(prov.id) * LandData.robPermille, 1000) * x.settled * 1000, Math.max(1, (x.loose + 1000) * need));
    if (roads > land) {
      const [n, men] = share(x, idiv(idiv(x.settled * LandData.switchPercent, 100) * (roads - land), roads));
      shift(x, -n, -men);
      x.loose += n;
    } else if (land > roads && x.loose > 0 && x.settled < r.room) {
      const n = Math.min(r.room - x.settled, idiv(idiv(x.loose * LandData.switchPercent, 100) * (land - roads), Math.max(1, land)));
      x.loose -= n;
      shift(x, n, idiv(n * LandData.menPercent, 100));
      this.looseLeave(prov.id, n);
    }
  }

  // The loose men rob the purse and the stores (item 10+b).
  for (const [p, l] of this.robbing().entries()) say(p, `Loose men robbed ${l.join("; ")}. Your troops standing in a province halve what they take.`);
  // Item 11b: the bands, gathered from them by chiefs; an army of yours standing where one works falls on it.
  for (const [p, l] of this.bandsSeason().entries()) say(p, `${l.join(" ")} An army of yours falls on a band where it stands only on your order: hunt (this season) or huntBands (standing).`);

  // The loose drift freely towards richer land, across borders too.
  const drift: [string, string, number][] = [];
  const pull = (id: string): number => idiv(wealth(id) * 1000, this.peopleOf(id).loose + 1000);
  for (const prov of Map.landProvinces) {
    const x = this.peopleOf(prov.id);
    if (x.loose <= 0) continue;
    const here = pull(prov.id);
    const best = sortBy(
      Map.movesFrom("Army", prov.id).filter((n) => !Map.get(n).isSea),
      [(n: string) => -pull(n), (a: number, b: number) => a - b],
      [(n: string) => n, cmpStr],
    )[0];
    if (best === undefined) continue;
    const there = pull(best);
    if (there * 10 <= here * 11) continue;
    drift.push([prov.id, best, idiv(idiv(x.loose * LandData.driftPercent, 100) * (there - here), there)]);
  }
  for (const [from, to, n] of drift) this.moveLoose(from, to, n);
  return lines;
};

/**
 * A king sets his tax on a province of his, or on all his land (item 10+a, "How a king lives"): it stands until he
 * changes it, or the province changes hands. A rate for all his land replaces the rates set province by province.
 */
P.setTax = function (p, o) {
  const S = this.s;
  const land = o.province === null ? [...S.owner.entries()].filter(([, v]) => v === p).map(([k]) => k) : [o.province];
  for (const id of land) {
    if (S.owner.getOrDefault(id, null) !== p) continue;
    if (o.percent === EconomyData.taxPercent) S.taxes.delete(id);
    else S.taxes.set(id, o.percent);
  }
  const where = o.province === null ? "all your land" : this.map.get(o.province).name;
  notify(S, p, "Resolution", "Taxes", `The tax in ${where} is now ${o.percent} in a hundred of the harvest, from the next harvest on.`);
  logEvent(S, "tax-set", `${p} set the tax in ${where === "all your land" ? "all its land" : where} to ${o.percent}%.`, [p], "tax-set");
};

/** A count of people as a king reads it. */
export function people(n: number): string {
  return n >= 10_000 ? `${Math.round(n / 1000)} thousand` : n >= 1000 ? `${(n / 1000).toFixed(1)} thousand` : `${n}`;
}

/** A levy takes its `n` men from the men of fighting age of the province: false, taking none, if it has too few. */
P.levyMen = function (province, n) {
  const x = this.peopleOf(province);
  if (menAvailable(this.s, province) < n) return false;
  shift(x, -n, -n);
  return true;
};

/**
 * A unit's men are discharged where it stands: settled there as colonists (`settle`, in its king's own land), or walking
 * home, where they bring in nothing until they arrive; far from home some never arrive, and turn loose where they
 * stood. Returns a line saying what became of them.
 */
P.menHome = function (u, settle) {
  const S = this.s;
  const men = u.men;
  const savings = u.savings;
  u.men = 0;
  u.savings = 0;
  if (u.home === "") return "";
  const where = this.map.get(u.province);
  if (where.isSea) {
    S.walking.push({ home: u.home, men, arrives: S.turn + 1, savings, deported: false, by: "", route: [], departs: S.turn, from: "" });
    return "its crews sail home with their savings";
  }
  if (settle) {
    shift(this.peopleOf(u.province), men, men);
    this.spendAt(u.province, savings);
    logEvent(S, "colonists", `${u.power} settled the men of its ${u.kind === "Army" ? "army" : "fleet"} in ${where.name} as colonists.`, [u.power], "colonists");
    return `its ${people(men)} men were settled in ${where.name} as colonists, their savings into its purse`;
  }
  if (u.province === u.home) {
    shift(this.peopleOf(u.home), men, men);
    this.spendAt(u.home, savings);
    return "its men are back in their fields";
  }
  const days = idiv(fastestPoints(this.map, u.province, u.home, seasonOfTurn(S.turn)), PointsPerDay);
  const stray = !Number.isFinite(days) ? LandData.strayMost : clamp(idiv(days - LandData.strayAfter, LandData.strayPerDays), 0, LandData.strayMost);
  const lost = idiv(men * stray, 100);
  // Those who never set out keep their share: loose men's gold counts for no realm ("The wealth of a realm").
  const kept = men <= 0 ? savings : savings - idiv(savings * lost, men);
  this.peopleOf(u.province).loose += lost;
  const seasons = Math.max(1, Math.ceil((Number.isFinite(days) ? days : S.config.travelDays) / Math.max(1, S.config.travelDays)));
  S.walking.push({ home: u.home, men: men - lost, arrives: S.turn + seasons, savings: kept, deported: false, by: "", route: [], departs: S.turn, from: "" });
  return `its men walk home to ${this.map.get(u.home).name} with their savings, ${seasons === 1 ? "next season" : `in ${seasons} seasons`}` + (lost > 0 ? `; ${people(lost)} of them never set out and stay as loose men in ${where.name}` : "");
};

/** A unit destroyed in battle: some of its men die, lost to their homes for good, and the rest run and turn loose there. */
P.unitDestroyed = function (u) {
  const men = u.men;
  u.men = 0;
  const where = this.map.get(u.province);
  if (men <= 0 || where.isSea) return;
  this.peopleOf(u.province).loose += men - idiv(men * LandData.battleDead, 100);
};

/** Kills that share (in thousandths) of a province's settled, and turns `loosePermille` more loose; returns the dead. */
P.killSettled = function (province, permille, loosePermille = 0) {
  const x = this.peopleOf(province);
  const [dead, men] = share(x, idiv(x.settled * permille, 1000));
  shift(x, -dead, -men);
  const [run, rmen] = share(x, idiv(x.settled * loosePermille, 1000));
  shift(x, -run, -rmen);
  x.loose += run;
  // Those who ran from the fighting cross to better land if there is any (item 10+b).
  this.refuge(province, run, "the war");
  return dead;
};

/**
 * The people's resistance to an army of `mover` entering their province: none in his own land; otherwise its men of
 * fighting age, as hostile as they are to him (less so to a king whose homeland it is), by the ground.
 */
P.resistance = function (province, mover) {
  const S = this.s;
  const p = this.map.get(province);
  if (S.config.peopleDefence <= 0 || p.isSea || S.owner.getOrDefault(province, null) === mover) return 0;
  const hostility = p.home === mover ? LandData.hostileHome : 100;
  return resistanceOf(province, this.peopleOf(province).men, hostility);
};

/**
 * The year's droughts and floods: at the end of each year (Shemu) a drought is drawn for each region of rain-fed land,
 * striking its provinces for the next year; the season before each great river's flood one flood is drawn for it, shared along its
 * course, a bad one or, rarely, a ruinous one that also drowns people. Each holder hears of his own land's at once, and
 * courts that see the land hear of it the next season. None while catastrophes are off (`catastropheChance` 0).
 */
P.climateSeason = function () {
  const S = this.s;
  // With catastrophes off, the weather is kind too: droughts and floods were catastrophes before item 10+a.
  if (S.config.catastropheChance <= 0) {
    S.climate = S.climate.filter((c) => c.endTurn >= S.turn);
    return;
  }
  const Map = this.map;
  const season = seasonOfTurn(S.turn);
  const struck: ClimateEvent[] = [];
  if (season === 2)
    for (const d of DroughtRegions) {
      if (!this.r("drought", d.id).chance(1 / d.oneIn)) continue;
      const provinces = Map.landProvinces.filter((p) => climateOf(p.id).drought === d.id && climateOf(p.id).water === "Rain").map((p) => p.id);
      struck.push({ id: newId(S, "x"), kind: "Drought", name: d.name, provinces, startTurn: S.turn + 1, endTurn: S.turn + 3, percent: 50 });
    }
  for (const river of Rivers) {
    const f = RiverFloods.get(river.id);
    // Drawn the season before its flood, so it strikes the flood season and the two after it.
    if (f === undefined || (river.flood + 2) % 3 !== season) continue;
    const rng = this.r("flood", river.id);
    const roll = rng.next(10_000);
    const ruin = roll < idiv(10_000, f.ruinOneIn);
    const bad = !ruin && roll < idiv(10_000, f.ruinOneIn) + idiv(10_000, f.badOneIn);
    if (!ruin && !bad) continue;
    const provinces = river.course.filter((x) => Map.exists(x));
    struck.push({ id: newId(S, "x"), kind: "Flood", name: `the ${river.name}`, provinces, startTurn: S.turn + 1, endTurn: S.turn + 3, percent: ruin ? f.ruinPercent : f.badPercent });
    if (ruin) for (const x of provinces) this.killSettled(x, f.ruinDeadPermille);
  }
  const sight = new Dict(alive(S).map((p) => [p, Views.sight(S, Map, p)] as const));
  for (const c of struck) {
    S.climate.push(c);
    const what =
      c.kind === "Drought"
        ? `The rains have failed over ${c.name}`
        : c.percent <= 30
          ? `${c.name[0].toUpperCase()}${c.name.slice(1)} has risen in a ruinous flood, breaking dykes and drowning villages`
          : river(c.name);
    for (const p of AllPowers.filter((p) => isAlive(S, p))) {
      const mine = c.provinces.filter((x) => S.owner.getOrDefault(x, null) === p);
      if (mine.length > 0) {
        notify(S, p, "Catastrophe", `Catastrophe: ${c.kind === "Drought" ? "drought" : "flood"}`, `${what}: for three seasons ${mine.map((x) => Map.get(x).name).join(", ")} will reap only ${c.percent} in a hundred of their harvest.`);
        continue;
      }
      if (c.provinces.some((x) => sight.get(p).has(x))) notify(S, p, "Notice", "News from nearby", `Travellers say ${c.kind === "Drought" ? `the rains have failed over ${c.name}` : `${c.name} has flooded badly`}.`);
    }
    logEvent(S, "catastrophe", `${what}.`, c.provinces.map((x) => S.owner.getOrDefault(x, null)).filter((x): x is Power => x !== null), c.kind === "Drought" ? "drought" : "flood");
  }
  S.climate = S.climate.filter((c) => c.endTurn >= S.turn);
};

function river(name: string): string {
  return name === "the Nile" ? "The Nile has failed to rise in full: a low flood" : `${name[0].toUpperCase()}${name.slice(1)} has flooded at the harvest, breaking the levees`;
}
