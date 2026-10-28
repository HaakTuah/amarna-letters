/**
 * Travellers on the road (build order item 7b): every envoy and spy goes along a route of provinces it chooses from what
 * its court knows ("Choosing a route"), making GameConfig.travelDays days' worth of points a season ({@link legPoints});
 * once a season the road check falls on one province of the stretch it crossed, picked by the share of the season it
 * spent in each ("Interception on the road", "A road belongs to the land it crosses"), where a hostile king's troops, the
 * host's people (if it sneaks through land closed to its master), the lawlessness of the place or nature may stop it.
 * A king may close his roads to a court's travellers ("Passage and access"): his men turn back those who pass openly at
 * his border, and a traveller who knows goes round or sneaks through. Reports, rumours, ransoms and word of the world
 * travel by themselves until item 11b ({@link wordSeasons}), and so does news of who holds distant land (Views.knownHolders);
 * travellers bring home the news of the land they crossed.
 */
import { Dict, HSet } from "../core/collections.ts";
import { clamp } from "../core/num.ts";
import { cmpNum, sortBy } from "../core/seq.ts";
import { terrainOf } from "../model/geography.ts";
import { seasonOfTurn, WinterSeason } from "../model/map.ts";
import type { RoadsOrder } from "../model/orders.ts";
import { remember, type Character } from "../model/people.ts";
import { land, type Power } from "../model/power.ts";
import { newHomeCargo, newLossAbroad, newJourney, type Journey, type NewsKind } from "../model/records.ts";
import { char, isAlive, logEvent, newId, newKnown, notify, type Known } from "../model/state.ts";
import { cheapestRoute, legPoints, PointsPerDay, snowbound } from "../model/travel.ts";
import { formatMoney } from "../rules/calendar.ts";
import { Views } from "../rules/views.ts";
import { idNumber, TurnEngine } from "./core.ts";

/**
 * The odds of the road check, in percent for one season (first guesses, tuned in item 18). A king's troops (army or
 * fleet) stop a traveller of a court he has closed his roads to; his people find one sneaking through his land, more
 * readily if it carries gold or tablets and if he pays watchmen that season (a third of what he spends); outlaws are
 * worst in land without a king and rare in a king's; at sea storms, worst in winter; on a pass in winter the snow (item 9,
 * "Winter is dangerous, never closed"); in the desert supplies run out. A
 * traveller's skill (0-100) takes off up to half the odds; escort, policing and roads stay neutral until their items.
 */
export const RoadOdds = { troops: 40, found: 20, foundGold: 10, foundTablets: 5, kingless: 8, free: 3, royal: 1, storm: 2, winterStorm: 8, snow: 6, desert: 4, skillShare: 50, most: 90 } as const;

/** What stopped a traveller: a hostile king's troops, his people finding it off the road, outlaws, or nature. */
export type Stop = "troops" | "found" | "outlaws" | "nature";

/** The notice to a king whose men caught a traveller on the road. */
export const CaughtOnRoadTitle = "A traveller is caught";

/** The notice to a court that hears a king closed or opened his roads to its people. */
export const RoadsTitle = "Roads";

/** The traveller kinds: those who walk the road themselves (word travels by itself). */
const Walkers = new Set(["EnvoyOutbound", "EnvoyHomebound", "SpyOutbound", "SpyHomebound"]);

export const isWalker = (j: Journey): boolean => Walkers.has(j.kind);

const outbound = (j: Journey): boolean => j.kind === "EnvoyOutbound" || j.kind === "SpyOutbound";

/** The court a traveller serves: the sender on the way out, home on the way back. */
const masterOf = (j: Journey): Power => (outbound(j) ? j.from : j.to);

/** The court it goes to or comes from, whose own men let it pass to and from their king. */
const counterpart = (j: Journey): Power => (outbound(j) ? j.to : j.from);

declare module "./core.ts" {
  interface TurnEngine {
    setOut(j: Journey, from: string, to: string): void;
    planRoute(j: Journey, from: string, to: string, turn?: number): boolean;
    closedTo(host: Power | null, j: Journey, province?: string | null): boolean;
    roadKnowledge(master: Power, closed: Iterable<Power>): RoadKnowledge;
    roadOdds(j: Journey, c: Character, province: string, sneaking: boolean, known: RoadKnowledge | null): Dict<Stop, number>;
    travel(): void;
    travelOne(j: Journey): void;
    stopped(j: Journey, c: Character, province: string, stop: Stop): void;
    turnBack(j: Journey, c: Character, at: string, why: string, gold: number): void;
    caughtOnRoad(j: Journey, c: Character, captor: Power, province: string): void;
    bringNews(j: Journey, court: Power, c: Character): void;
    word(from: Power, to: Power, news: NewsKind, text: string): void;
    wordArrives(j: Journey): void;
    roads(p: Power, o: RoadsOrder): void;
    seeLand(): void;
  }
}

/** What a court knows of the roads, to choose a route by: who holds each province, the troops it sees, and closed roads it heard of. */
export interface RoadKnowledge {
  readonly holders: Dict<string, Known>;
  readonly seen: HSet<string>;
  readonly heard: HSet<Power>;
}

/**
 * Points of road a traveller gives to avoid one percent of risk for a whole season (first guesses of the travellers'
 * formula, not game numbers): 25 at courage 0 (2.5 days), 5 at courage 100 ("Bold or careful, one goal").
 */
export const RiskWeight = { careful: 25, bold: 5 } as const;

const P = TurnEngine.prototype;

/** A traveller sets out: its route chosen, and when it is due. */
P.setOut = function (j, from, to) {
  const S = this.s;
  j.seen = [from];
  j.reached = [S.turn];
  if (!this.planRoute(j, from, to)) throw new Error(`No road from ${from} to ${to} in any season.`);
  // Due by this season's roads (winter closes none: item 9).
  const perSeason = S.config.travelDays * PointsPerDay;
  let cost = 0;
  for (let i = 0; i < j.route.length - 1; i++) cost += legPoints(this.map, j.route[i], j.route[i + 1], seasonOfTurn(S.turn));
  j.arriveTurn = S.turn + Math.max(1, Math.ceil(cost / perSeason));
};

/**
 * The traveller's route from where it is, from what its court knows ("Choosing a route"): the time each connection takes
 * this season, off the road through land it believes closed to its master, and the risk of each province it enters
 * weighed by its courage, a bold traveller taking the short, dangerous road and a careful one the long, safe one. Its
 * court's knowledge: who holds each province (Views.knownHolders), the kings it has heard closed their roads to it and
 * any it met on the way, and the troops it can see. False when there is no route at all.
 */
P.planRoute = function (j, from, to, turn) {
  const S = this.s;
  const when = turn ?? S.turn;
  const Map = this.map;
  const master = masterOf(j);
  const c = char(S, j.characterId!);
  // The kings it believes closed to its court: those its court heard of, and those it met on the way.
  const closed = new HSet<Power>([...(S.roadsHeard.tryGet(master) ?? []), ...(j.sneak as Power[])]);
  closed.delete(master);
  closed.delete(counterpart(j));
  const know = this.roadKnowledge(master, closed);
  const known = know.holders;
  const believedClosed = (prov: string): boolean => {
    const holder = Map.get(prov).isSea ? null : (known.tryGet(prov)?.owner ?? null);
    return holder !== null && closed.has(holder);
  };
  // The risk of a connection is that of the provinces at its ends, by the share of a season spent on it: the check falls
  // once a season, so a long stay in bad land counts more than a short one.
  const perSeason = S.config.travelDays * PointsPerDay;
  const weight = RiskWeight.careful - ((RiskWeight.careful - RiskWeight.bold) * clamp(c.traits.courage, 0, 100)) / 100;
  const risks = new Dict<string, number>();
  const risk = (p: string): number => {
    let x = risks.tryGet(p);
    if (x === undefined) {
      x = 0;
      for (const v of this.roadOdds(j, c, p, believedClosed(p), know).values()) x += v;
      risks.set(p, x);
    }
    return x;
  };
  // By this season's roads.
  const season = seasonOfTurn(when);
  const r = cheapestRoute(Map, from, to, (a, b) => {
    const pts = legPoints(Map, a, b, season, { sneaking: believedClosed(a) || believedClosed(b) });
    return pts === Infinity ? pts : pts + (weight * ((risk(a) + risk(b)) / 2) * pts) / perSeason;
  });
  j.sneak = [...closed];
  if (r === null) return false;
  j.route = r.route;
  j.leg = 0;
  j.along = 0;
  return true;
};

/** Does this king stop the traveller's people passing through his land (never its own king's, nor the one it goes to)? */
P.closedTo = function (host, j, province = null) {
  if (host === null) return false;
  const master = masterOf(j);
  if (host === master || host === counterpart(j)) return false;
  // Passage granted on a sealed tablet lets its travellers through (item 9).
  if (province !== null && this.passageFor(host, master, province)) return false;
  return (this.s.roadsClosed.tryGet(host) ?? []).includes(master);
};

P.roadKnowledge = function (master, closed) {
  const S = this.s;
  const seen = Views.sight(S, this.map, master);
  return { holders: Views.knownHolders(S, this.map, master, seen), seen, heard: new HSet<Power>(closed) };
};

/**
 * The odds, by cause, of the road check in one province. `known`: as the traveller's court knows the roads (for choosing a
 * route), or null for as they are (for the check itself).
 */
P.roadOdds = function (j, c, province, sneaking, known) {
  const S = this.s;
  const Map = this.map;
  const master = masterOf(j);
  const prov = Map.get(province);
  const season = seasonOfTurn(known !== null ? S.turn : S.turn - 1);
  const out = new Dict<Stop, number>();
  const holder = prov.isSea ? null : known !== null ? (known.holders.tryGet(province)?.owner ?? null) : S.owner.getOrDefault(province, null);
  const hostile = (k: Power): boolean => k !== master && k !== counterpart(j) && (known !== null ? known.heard.has(k) : this.closedTo(k, j, province));
  // Troops: as the court sees them now when choosing, as they stand when the check falls.
  if (S.units.some((u) => u.province === province && hostile(u.power) && (known === null || known.seen.has(province)))) out.set("troops", RoadOdds.troops);
  if (sneaking && holder !== null && hostile(holder)) {
    let found = RoadOdds.found + Math.trunc((known !== null ? 0 : S.counterIntel.getOrDefault(holder, 0)) / 3);
    const d = j.dispatch;
    if ((d?.gold ?? 0) > 0 || (j.cargo?.gold ?? 0) > 0) found += RoadOdds.foundGold;
    if ((d?.proposalTabletId ?? null) !== null || (d?.copyIds.length ?? 0) > 0 || (j.cargo?.copyIds.length ?? 0) > 0) found += RoadOdds.foundTablets;
    out.set("found", found);
  }
  if (!prov.isSea) out.set("outlaws", prov.kingless ? RoadOdds.kingless : holder === null ? RoadOdds.free : RoadOdds.royal);
  if (prov.isSea) out.set("nature", season === WinterSeason ? RoadOdds.winterStorm : RoadOdds.storm);
  else if (terrainOf(province) === "Desert") out.set("nature", RoadOdds.desert);
  // A snowbound pass on its way, at either end of it.
  if (!prov.isSea && j.route.some((x, i) => i > 0 && (x === province || j.route[i - 1] === province) && snowbound(Map, j.route[i - 1], x, season)))
    out.set("nature", out.getOrDefault("nature", 0) + RoadOdds.snow);
  // Its skill takes off up to half; at most RoadOdds.most in all.
  const total = [...out.values()].reduce((a, b) => a + b, 0);
  const scale = (total > RoadOdds.most ? RoadOdds.most / total : 1) * (1 - (clamp(c.skills.stealth, 0, 100) * RoadOdds.skillShare) / 10000);
  for (const [k, v] of [...out.entries()]) out.set(k, v * scale);
  return out;
};

/** Each season, before arrivals: every traveller on the road advances, and meets the road check. */
P.travel = function () {
  const S = this.s;
  for (const j of sortBy(
    S.journeys.filter((x) => isWalker(x) && x.route.length > 0 && x.departTurn < S.turn),
    [(x: Journey) => idNumber(x.id), cmpNum],
  ))
    if (S.journeys.includes(j)) this.travelOne(j);
};

P.travelOne = function (j) {
  const S = this.s;
  const Map = this.map;
  const c = char(S, j.characterId!);
  const season = seasonOfTurn(S.turn - 1);
  const was = { leg: j.leg, along: j.along, route: [...j.route], seen: j.seen.length };
  const sneakers = new HSet<string>(j.sneak);
  const offRoad = (prov: string): boolean => !Map.get(prov).isSea && sneakers.has(S.owner.getOrDefault(prov, null) ?? "");
  // Points spent in each province this season.
  const spent = new Dict<string, number>();
  const spend = (prov: string, pts: number): void => {
    if (pts > 0) spent.set(prov, spent.getOrDefault(prov, 0) + pts);
  };
  let budget = S.config.travelDays * PointsPerDay;
  let turnedAt: string | null = null;
  while (budget > 0 && j.leg < j.route.length - 1) {
    const a = j.route[j.leg];
    const b = j.route[j.leg + 1];
    const cost = legPoints(Map, a, b, season, { sneaking: offRoad(a) || offRoad(b) });
    if (cost === Infinity) break;
    // The border on the connection: halfway, or at the desert's edge, where the desert lies on one side.
    const half = terrainOf(b) === "Desert" && terrainOf(a) !== "Desert" ? 0 : terrainOf(a) === "Desert" && terrainOf(b) !== "Desert" ? cost : Math.floor(cost / 2);
    // A connection grown cheaper since (a flood over, a holder changed) is done at once: no road is made for nothing.
    const use = Math.max(0, Math.min(budget, cost - j.along));
    const end = j.along + use;
    // Openly into land closed to its master, from outside it: its king's men turn it back at the border.
    const host = Map.get(b).isSea ? null : S.owner.getOrDefault(b, null);
    const crosses = j.along <= half && (end > half || (half === cost && end >= half));
    if (crosses && !offRoad(b) && host !== S.owner.getOrDefault(a, null) && this.closedTo(host, j, b)) {
      spend(a, half - j.along);
      turnedAt = b;
      break;
    }
    spend(a, Math.max(0, Math.min(end, half) - j.along));
    spend(b, Math.max(0, end - Math.max(j.along, half)));
    budget -= use;
    j.along = end;
    if (j.along >= cost) {
      j.leg++;
      j.along = 0;
      j.seen.push(b);
      j.reached.push(S.turn - 1);
    }
  }
  if (spent.size === 0) spend(j.route[j.leg], 1);

  if (turnedAt !== null) {
    // It learns the land is closed to its master's people: it goes round or sneaks through from where it stands.
    const host = S.owner.getOrDefault(turnedAt, null)!;
    j.sneak = [...new HSet([...j.sneak, host])];
    logEvent(S, "travel", `${c.name}, of ${masterOf(j)}, was turned back at the border of ${host}'s land (${Map.get(turnedAt).name}).`, [host], "turned-at-border");
    remember(c, S.turn, `${land(host)}'s men turned me back at the border of ${Map.get(turnedAt).name}: their king has closed his roads to my lord's people.`);
    const here = j.route[j.leg];
    if (!this.planRoute(j, here, j.route[j.route.length - 1], S.turn - 1)) throw new Error(`No road from ${here} in any season.`);
  }

  // The road check: one province of the stretch, by the share of the season spent in each.
  if (c.status === "Employed") {
    const rng = this.r("road", j.id);
    const total = [...spent.values()].reduce((x, y) => x + y, 0);
    let pick = rng.next(total);
    let where = [...spent.keys()][0];
    for (const [k, v] of spent.entries()) {
      if (pick < v) {
        where = k;
        break;
      }
      pick -= v;
    }
    const odds = this.roadOdds(j, c, where, offRoad(where), null);
    const all = [...odds.values()].reduce((x, y) => x + y, 0);
    let roll = rng.nextDouble() * 100;
    if (roll < all) {
      let stop: Stop = "nature";
      for (const [k, v] of odds.entries()) {
        if (roll < v) {
          stop = k;
          break;
        }
        roll -= v;
      }
      // Held up by nature on the way home: the season's road is lost, not the journey.
      if (stop === "nature" && !outbound(j)) {
        j.route = was.route;
        j.leg = Math.min(was.leg, j.route.length - 1);
        j.along = was.along;
        j.seen.length = was.seen;
        j.reached.length = was.seen;
        remember(c, S.turn, `${terrainOf(where) === "Desert" ? "The desert" : Map.get(where).isSea ? "Storms" : "The weather"} held me up a season in ${Map.get(where).name}.`);
        logEvent(S, "travel", `${c.name}, of ${masterOf(j)}, was held up by ${Map.get(where).isSea ? "storms" : "the desert"} in ${Map.get(where).name}.`, [], "road-nature");
      } else {
        this.stopped(j, c, where, stop);
        return;
      }
    }
  }

  if (j.leg >= j.route.length - 1) j.arriveTurn = S.turn;
  else {
    let left = Math.max(0, legPoints(Map, j.route[j.leg], j.route[j.leg + 1], seasonOfTurn(S.turn)) - j.along);
    for (let i = j.leg + 1; i < j.route.length - 1; i++) left += legPoints(Map, j.route[i], j.route[i + 1], seasonOfTurn(S.turn));
    const seasons = left === Infinity ? 2 : Math.max(1, Math.ceil(left / (S.config.travelDays * PointsPerDay)));
    j.arriveTurn = Math.max(j.arriveTurn, S.turn + seasons);
  }
};

/** A traveller the road check stopped: caught by a hostile king's troops or people, robbed by outlaws, or turned back by nature. */
P.stopped = function (j, c, province, stop) {
  const S = this.s;
  const Map = this.map;
  const name = Map.get(province).name;
  if (stop === "troops" || stop === "found") {
    const captor =
      stop === "troops"
        ? sortBy(
            S.units.filter((u) => u.province === province && this.closedTo(u.power, j, province)),
            [(u) => idNumber(u.id), cmpNum],
          )[0].power
        : S.owner.getOrDefault(province, null)!;
    this.caughtOnRoad(j, c, captor, province);
    return;
  }
  const gold = j.dispatch?.gold ?? j.cargo?.gold ?? 0;
  if (stop === "outlaws") {
    remember(c, S.turn, `Outlaws robbed me in ${name}` + (gold > 0 ? ` of the ${formatMoney(gold)} of gold I carried.` : "."));
    logEvent(S, "travel", `Outlaws robbed ${c.name}, of ${masterOf(j)}, in ${name}${gold > 0 ? `, of ${formatMoney(gold)} of gold` : ""}.`, [], "road-outlaws");
    this.trail(j.dispatch?.trailId ?? j.cargo?.trailId ?? null)?.outcomes.push(`robbed by outlaws in ${name}` + (gold > 0 ? ` of ${formatMoney(gold)}` : ""));
    if (!outbound(j)) {
      // On the way home it goes on, lighter.
      if (j.cargo !== null) {
        j.cargo.gold = 0;
        j.cargo.goldStated = 0;
      }
      j.turnedBack = `robbed by outlaws in ${name}` + (gold > 0 ? ` of the ${formatMoney(gold)} of gold sent home with ${c.name}` : "");
      j.arriveTurn = Math.max(j.arriveTurn, S.turn + 1);
      return;
    }
    this.turnBack(j, c, j.route[j.leg], `outlaws robbed ${c.name} in ${name}` + (gold > 0 ? ` of the ${formatMoney(gold)} of gold carried` : "") + ", and the errand was given up", 0);
    return;
  }
  const what = Map.get(province).isSea ? "storms at sea" : terrainOf(province) === "Desert" ? "the desert, where supplies ran out" : "the weather";
  remember(c, S.turn, `I turned back in ${name}: ${what}.`);
  logEvent(S, "travel", `${c.name}, of ${masterOf(j)}, turned back in ${name}: ${what}.`, [], "road-nature");
  this.trail(j.dispatch?.trailId ?? null)?.outcomes.push(`turned back in ${name} by ${what}`);
  this.turnBack(j, c, j.route[j.leg], `${c.name} turned back in ${name}, stopped by ${what}`, gold);
};

/** An outbound traveller gives up its errand and comes home from where it is, with any gold it still carries. */
P.turnBack = function (j, c, at, why, gold) {
  const S = this.s;
  S.journeys.splice(S.journeys.indexOf(j), 1);
  const home = masterOf(j);
  const back = newJourney({
    id: newId(S, "j"),
    kind: j.kind === "EnvoyOutbound" ? "EnvoyHomebound" : "SpyHomebound",
    departTurn: S.turn - 1,
    from: j.to,
    to: home,
    characterId: c.id,
    cargo: j.kind === "EnvoyOutbound" ? newHomeCargo({ trailId: j.dispatch?.trailId ?? "", gold, goldStated: gold, purityPercent: j.dispatch?.purityPercent ?? 100 }) : null,
    turnedBack: why,
    gaveUp: true,
    sneak: [...j.sneak],
  });
  S.journeys.push(back);
  this.setOut(back, at, this.map.capital(home).id);
  back.departTurn = S.turn - 1;
  back.seen = [...j.seen];
  back.reached = [...j.reached];
  c.duty = "EnvoyHomebound";
  c.missionTarget = null;
  c.watchProvince = null;
};

/**
 * Caught on the road by a hostile king's troops, or found by his people sneaking through his land: the king's captive,
 * who may execute, ransom or release it (a spy, also turn it). An envoy's captor reads its letter and mandate and takes
 * its gold and tablets; its master hears only, a season after it was due home, that it has not returned.
 */
P.caughtOnRoad = function (j, c, captor, province) {
  const S = this.s;
  const name = this.map.get(province).name;
  const lord = masterOf(j);
  const out = outbound(j);
  const spy = j.kind === "SpyOutbound" || j.kind === "SpyHomebound";
  const place = spy && c.watchProvince !== null ? this.map.get(c.watchProvince).name : null;
  S.journeys.splice(S.journeys.indexOf(j), 1);
  // Its master goes on believing it on its way until word comes. A spy keeps its post, where it goes if its captor turns it.
  this.coverFor(c, lord, spy ? (out ? "SpyOutbound" : "EnvoyHomebound") : out ? "EnvoyOutbound" : "EnvoyHomebound");
  c.status = "Captured";
  c.heldBy = captor;
  c.at = captor;
  c.duty = "None";
  c.intercepted = true;
  if (!spy) {
    c.missionTarget = null;
    c.watchProvince = null;
  }
  const trail = this.trail(j.dispatch?.trailId ?? j.cargo?.trailId ?? null);
  trail?.outcomes.push(`caught on the road in ${name} by ${captor}'s men`);
  const lines = spy ? [] : this.seize(c, lord, captor, j.dispatch, j.cargo, `taken from ${c.name}, envoy of ${lord}, caught on the road in ${name}`);
  const said = spy
    ? `a spy of ${lord}, ${out ? `on the way to watch ${place ?? `the court of ${j.to}`}` : "on the way home"}.`
    : j.dispatch !== null
      ? `envoy of ${lord}, on his way to the court of ${j.to}. The letter he was to speak: "${j.dispatch.letter}"` + (j.dispatch.mandate.length > 0 ? ` His mandate: "${j.dispatch.mandate}"` : "")
      : `envoy of ${lord}, on his way home from the court of ${j.from}.`;
  notify(
    S,
    captor,
    "Notice",
    CaughtOnRoadTitle,
    `Your men in ${name} caught ${c.name}, ${said} ${lines.join(" ")} He is your captive: you may execute, ransom${spy ? ", turn" : ""} or release him.`.replaceAll("  ", " "),
    c.id,
  );
  remember(c, S.turn, `${land(captor)}'s men caught me on the road in ${name}.`);
  logEvent(S, "travel", `${captor}'s men caught ${c.name}, ${spy ? "spy" : "envoy"} of ${lord}, on the road in ${name}.`, [captor], "road-caught");
  S.losses.push(newLossAbroad({ turn: S.turn, kind: "Captured", characterId: c.id, court: captor, master: lord }));
  const due = out ? j.arriveTurn + this.travelTurns(counterpart(j), lord) : j.arriveTurn;
  this.overdue(lord, c, counterpart(j), due, place);
};

/**
 * A traveller reaching a court brings the news of the land it crossed: who held each province when it passed (if that is
 * newer than what the court knows), and, coming home, the kings it found had closed their roads to its master.
 */
P.bringNews = function (j, court, c) {
  const S = this.s;
  if (!isAlive(S, court)) return;
  let book = S.known.tryGet(court);
  if (book === undefined) S.known.set(court, (book = new Dict()));
  for (let i = 0; i < j.seen.length; i++) {
    const prov = j.seen[i];
    if (this.map.get(prov).isSea) continue;
    const turn = j.reached[i] ?? j.departTurn;
    const had = book.tryGet(prov);
    if (had !== undefined && had.turn >= turn) continue;
    book.set(prov, newKnown({ owner: Views.ownerAt(S, this.map, prov, turn), turn, source: c.name }));
  }
  if (court === masterOf(j) && j.sneak.length > 0) {
    const heard = new HSet<Power>(S.roadsHeard.tryGet(court) ?? []);
    for (const k of j.sneak as Power[]) if ((S.roadsClosed.tryGet(k) ?? []).includes(court)) heard.add(k);
    S.roadsHeard.set(court, [...heard]);
  }
};

/** Word sent from one court to another, which the engine carries until item 11b, by the fastest road open. */
P.word = function (from, to, news, text) {
  const S = this.s;
  S.journeys.push(
    newJourney({
      id: newId(S, "j"),
      kind: "Word",
      departTurn: S.turn,
      arriveTurn: S.turn + this.travelTurns(from, to),
      from,
      to,
      news,
      text,
    }),
  );
};

P.wordArrives = function (j) {
  const S = this.s;
  if (!isAlive(S, j.to)) return;
  switch (j.news) {
    case "RoadsClosed":
    case "RoadsOpened": {
      const heard = new HSet<Power>(S.roadsHeard.tryGet(j.to) ?? []);
      if (j.news === "RoadsClosed") heard.add(j.from);
      else heard.delete(j.from);
      S.roadsHeard.set(j.to, [...heard]);
      notify(S, j.to, "Rumor", RoadsTitle, j.text ?? "");
      break;
    }
    case "KingdomFalls": {
      const heard = new HSet<Power>(S.fallsHeard.tryGet(j.to) ?? []);
      heard.add(j.from);
      S.fallsHeard.set(j.to, [...heard]);
      notify(S, j.to, "Rumor", "A kingdom falls", j.text ?? "");
      break;
    }
    default:
      break;
  }
};

/** A king closes or opens his roads to a court's travellers; word of it goes to that court. */
P.roads = function (p, o) {
  const S = this.s;
  const list = new HSet<Power>(S.roadsClosed.tryGet(p) ?? []);
  if (o.close === list.has(o.court)) return;
  if (o.close) list.add(o.court);
  else list.delete(o.court);
  // Closing one's roads to a court ends the passage and basing one granted it (item 9).
  if (o.close) this.endGrants(p, o.court, "it closed its roads to them");
  S.roadsClosed.set(p, [...list]);
  logEvent(S, "travel", `${p} ${o.close ? "closes its roads to" : "opens its roads to"} the people of ${o.court}.`, [p], o.close ? "roads-closed" : "roads-opened");
  this.word(
    p,
    o.court,
    o.close ? "RoadsClosed" : "RoadsOpened",
    o.close
      ? `Word comes that the king of ${land(p)} has closed his roads to your people: his men turn back your envoys and servants at his border, unless they go to his own court; his troops anywhere may seize them.`
      : `Word comes that the king of ${land(p)} has opened his roads to your people again.`,
  );
};

/** Each court keeps what it saw this season of who holds the land in its sight (before the season's moves). */
P.seeLand = function () {
  const S = this.s;
  for (const p of S.eliminated.length === 0 ? [...S.treasuries.keys()] : [...S.treasuries.keys()].filter((x) => isAlive(S, x))) {
    let book = S.known.tryGet(p);
    if (book === undefined) S.known.set(p, (book = new Dict()));
    for (const id of Views.sight(S, this.map, p)) {
      if (this.map.get(id).isSea) continue;
      book.set(id, newKnown({ owner: S.owner.getOrDefault(id, null), turn: S.turn, source: "seen" }));
    }
  }
};
