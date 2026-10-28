/**
 * People across borders and in kings' hands (build order item 10+b, "Where people go", "People are worth having, not free
 * to keep", "Bandits rob the purse"): those who leave the land, from famine, crushing taxes or war, cross to whichever
 * neighbouring land is better to live in, as loose men, its holder's or nobody's; a king may settle the loose men of a
 * province of his with room, deport the settled of land he has taken to land of his own, send runaways back to the king
 * whose land they fled, and put out of a besieged city the mouths that cannot fight; and the loose men nobody polices rob
 * their province's purse and stores, carrying the gold as they drift. Every number is a first guess in `LandData`.
 */
import { Dict } from "../core/collections.ts";
import { clamp, idiv } from "../core/num.ts";
import { sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { grainWorth, needOf } from "../model/economy.ts";
import { countryNeed, LandData, reckonedOf } from "../model/land.ts";
import { seasonOfTurn } from "../model/map.ts";
import type { DeportOrder, ExpelOrder, ReturnRunawaysOrder, WelcomeOrder } from "../model/orders.ts";
import { land, type Power } from "../model/power.ts";
import { isAlive, logEvent, notify, ownedBy, siegeOf } from "../model/state.ts";
import { cheapestRoute, fastestPoints, legPoints, PointsPerDay } from "../model/travel.ts";
import { TurnEngine } from "./core.ts";
import { people, share, shift } from "./people.ts";

/** The notice title for what happens to people across borders and in a king's hands. */
export const PeopleTitle = "People";

declare module "./core.ts" {
  interface TurnEngine {
    livingScore(province: string): number;
    bestRefuge(from: string, fed?: Dict<string, number>): { to: string; score: number; here: number } | null;
    refuge(from: string, n: number, why: string): void;
    moveLoose(from: string, to: string, n: number): void;
    looseLeave(province: string, n: number): void;
    robbing(): Dict<Power, string[]>;
    welcome(p: Power, o: WelcomeOrder): void;
    deport(p: Power, o: DeportOrder): void;
    returnRunaways(p: Power, o: ReturnRunawaysOrder): void;
    expel(p: Power, o: ExpelOrder): void;
    sendPeople(by: Power, from: string, to: string, n: number, gold: number, freeable?: boolean): [number, number, number];
    deporteesOnRoad(): Dict<Power, string[]>;
  }
}

const P = TurnEngine.prototype;

/**
 * How good a land is to live in, as those leaving weigh it: how well its countryside ate last season (thousandths) and
 * what the tax leaves the farmers; a besieged one is worth nothing.
 */
P.livingScore = function (province) {
  if (siegeOf(this.s, province) !== null) return 0;
  return idiv(this.s.fed.getOrDefault(province, 1000) * (100 - this.taxRate(province)), 100);
};

/**
 * The neighbouring land best to live in for those leaving a province (`fed`: how each countryside ate, as word of it
 * reached them; the current season's by default), if it beats home by `refugeMargin`, with its score and home's; else null.
 */
P.bestRefuge = function (from, fed) {
  const S = this.s;
  const Map = this.map;
  const was = S.fed;
  if (fed !== undefined) S.fed = fed;
  const here = this.livingScore(from);
  const scored = Map.movesFrom("Army", from)
    .filter((x) => !Map.get(x).isSea)
    .map((x) => [x, this.livingScore(x)] as const);
  S.fed = was;
  const best = sortBy(scored, [([, v]) => -v, (a: number, b: number) => a - b], [([x]) => x, cmpStr])[0];
  if (best === undefined || best[1] <= 0 || best[1] * 100 <= here * (100 + LandData.refugeMargin)) return null;
  return { to: best[0], score: best[1], here };
};

/**
 * `n` loose men leave a province's land (fled from hunger, a heavy tax or war): they cross to the neighbouring land that
 * is best to live in, if it beats home by `refugeMargin`, whoever holds it; else they stay loose at home. Those who
 * cross a border are its holder's runaways from the king whose land they fled (`S.runaways`), until they settle.
 */
P.refuge = function (from, n, why) {
  const S = this.s;
  if (n <= 0) return;
  const Map = this.map;
  const found = this.bestRefuge(from);
  if (found === null) return;
  const best = found.to;
  this.moveLoose(from, best, n);
  const a = S.owner.getOrDefault(from, null);
  const b = S.owner.getOrDefault(best, null);
  if (a === b) return;
  const nameA = Map.get(from).name;
  const nameB = Map.get(best).name;
  if (a !== null && isAlive(S, a)) notify(S, a, "Notice", PeopleTitle, `${people(n)} of the people of ${nameA} fled ${why} into ${nameB}${b !== null ? `, ${b}'s land` : ""}, as loose men.`);
  if (b !== null && isAlive(S, b))
    notify(S, b, "Notice", PeopleTitle, `${people(n)} people fled ${why} from ${nameA}${a !== null ? `, ${a}'s land,` : ""} into your land of ${nameB}, as loose men. You may settle them where there is room (order welcome)${a !== null ? ` or send them back to ${a} (order return runaways)` : ""}.`);
  logEvent(S, "refugees", `${people(n)} people fled ${why} from ${nameA} into ${nameB}.`, [a, b].filter((x): x is Power => x !== null), "refugees");
};

/** Loose men move between provinces, with their share of the gold the loose carry there and of its runaways. */
P.moveLoose = function (from, to, n) {
  const S = this.s;
  const a = this.peopleOf(from);
  const take = Math.min(n, a.loose);
  if (take <= 0) return;
  const loot = S.loot.getOrDefault(from, 0);
  const gold = a.loose <= 0 ? 0 : idiv(loot * take, a.loose);
  if (gold > 0) {
    S.loot.set(from, loot - gold);
    S.loot.set(to, S.loot.getOrDefault(to, 0) + gold);
  }
  // Runaways stay runaways from their king while they keep moving; those who came from the land they now reach are home.
  const ran = S.runaways.tryGet(from);
  const into = S.runaways.tryGet(to) ?? new Dict<Power, number>();
  if (ran !== undefined)
    for (const [k, r] of [...ran.entries()]) {
      const m = idiv(r * take, a.loose);
      if (m <= 0) continue;
      ran.set(k, r - m);
      if (S.owner.getOrDefault(to, null) !== k) into.set(k, into.getOrDefault(k, 0) + m);
    }
  const fled = S.owner.getOrDefault(from, null);
  const holder = S.owner.getOrDefault(to, null);
  // Those leaving a king's land for another's are his runaways now, those already counted for another king apart.
  if (fled !== null && holder !== fled) {
    const counted = ran === undefined ? 0 : [...ran.values()].reduce((x, y) => x + y, 0);
    const own = Math.max(0, take - idiv(counted * take, Math.max(1, a.loose)));
    if (own > 0) into.set(fled, into.getOrDefault(fled, 0) + own);
  }
  if (into.size > 0) S.runaways.set(to, into);
  a.loose -= take;
  this.peopleOf(to).loose += take;
  this.looseLeave(from, 0);
};

/**
 * `n` loose men of a province leave the roads (settled, killed or gone elsewhere): its runaways shrink in proportion, and
 * the gold they carried goes with them into its market. With `n` 0 it only tidies what is left.
 */
P.looseLeave = function (province, n) {
  const S = this.s;
  const x = this.peopleOf(province);
  const before = x.loose + n;
  const ran = S.runaways.tryGet(province);
  if (ran !== undefined) {
    for (const [k, r] of [...ran.entries()]) {
      const left = before <= 0 ? 0 : Math.min(x.loose, r - idiv(r * n, before));
      if (left <= 0) ran.delete(k);
      else ran.set(k, left);
    }
    if (ran.size === 0) S.runaways.delete(province);
  }
  const loot = S.loot.getOrDefault(province, 0);
  if (loot > 0 && n > 0) {
    const gold = before <= 0 ? loot : idiv(loot * n, before);
    this.spendAt(province, gold);
    S.loot.set(province, loot - gold);
  }
  if (x.loose <= 0 && S.loot.getOrDefault(province, 0) > 0) {
    this.spendAt(province, S.loot.get(province));
    S.loot.delete(province);
  }
};

/**
 * The loose men nobody polices rob their province's purse and its holder's stores each season ("Bandits rob the purse"),
 * or, outside a besieged city, only its countryside's granaries (item 11a+):
 * what the roads pay them, the same share of the province's wealth that draws men to the roads, so each man's take falls
 * as they multiply and a robbed land has less to take; where its holder's troops stand they take half. The grain they
 * eat; the gold they carry, spending some where they are and the rest where they drift. Returns each holder's lines.
 */
P.robbing = function () {
  const S = this.s;
  const lines = new Dict<Power, string[]>();
  for (const prov of this.map.landProvinces) {
    const x = this.peopleOf(prov.id);
    if (x.loose <= 0) continue;
    const m = this.market(prov.id);
    const holder = S.owner.getOrDefault(prov.id, null);
    const policed = holder !== null && S.units.some((u) => u.province === prov.id && u.power === holder);
    const rate = (permille: number, of: number): number => {
      const t = idiv(idiv(of * permille, 1000) * x.loose, x.loose + 1000);
      return policed ? idiv(t * LandData.policedPercent, 100) : t;
    };
    // Outside a besieged city's walls they rob only its countryside, the farmers' granaries: its purse and its stores are
    // inside the walls (item 11a+, "Everything is somewhere").
    const besieged = siegeOf(S, prov.id) !== null;
    const gold = besieged ? 0 : rate(LandData.robPermille, m.purse);
    const grain = besieged ? 0 : rate(LandData.robPermille, this.stores(prov.id));
    const country = besieged ? rate(LandData.robPermille, S.granary.getOrDefault(prov.id, 0)) : 0;
    if (gold > 0) {
      m.purse -= gold;
      S.loot.set(prov.id, S.loot.getOrDefault(prov.id, 0) + gold);
    }
    if (grain > 0) this.takeFromStores(prov.id, grain);
    if (country > 0) S.granary.set(prov.id, S.granary.get(prov.id) - country);
    // What they carry, they spend in part where they are.
    const loot = S.loot.getOrDefault(prov.id, 0);
    const spent = idiv(loot * LandData.lootSpentPercent, 100);
    if (spent > 0) {
      S.loot.set(prov.id, loot - spent);
      this.spendAt(prov.id, spent);
    }
    if (holder !== null && isAlive(S, holder) && gold + grainWorth(grain + country) >= 5)
      lines.set(
        holder,
        [...lines.getOrDefault(holder, []), country > 0 ? `${prov.name} (${country} measures from the farmers' granaries outside the besieged walls)` : `${prov.name} (${gold} shekels from its people's purse${grain > 0 ? `, ${grain} measures from your stores` : ""})`],
      );
  }
  for (const [p, l] of lines.entries()) logEvent(S, "robbed", `Loose men robbed ${p}'s land: ${l.join("; ")}.`, [p], "robbed");
  return lines;
};

/** A king settles the loose men of a province of his, as far as it has room: they become its settled people. */
P.welcome = function (p, o) {
  const S = this.s;
  const name = this.map.get(o.province).name;
  const x = this.peopleOf(o.province);
  const room = Math.max(0, reckonedOf(this.map, o.province).room - x.settled);
  const n = Math.min(x.loose, room);
  if (S.owner.getOrDefault(o.province, null) !== p || n <= 0) {
    notify(S, p, "Rejected", "Order failed", `No loose men were settled in ${name}: ${S.owner.getOrDefault(o.province, null) !== p ? "you no longer hold it" : x.loose <= 0 ? "it has none" : "it has no room"}.`);
    return;
  }
  const fled = [...(S.runaways.tryGet(o.province)?.entries() ?? [])].filter(([, r]) => r > 0).map(([k]) => k);
  x.loose -= n;
  shift(x, n, idiv(n * LandData.menPercent, 100));
  this.looseLeave(o.province, n);
  notify(S, p, "Resolution", PeopleTitle, `You settled ${people(n)} loose men in ${name}: they are its settled people now, and bring their gold into its purse.`);
  logEvent(S, "welcome", `${p} settled ${people(n)} loose men in ${name}${fled.length > 0 ? `, among them runaways from ${fled.join(" and ")}` : ""}.`, [p], "welcomed");
};

/**
 * People sent on the road by a king (deported, or runaways returned): `n` walk from one province to another, a few die on
 * the way and on a long road some slip away and stay loose where they set out, as discharged men do; the rest arrive
 * as the settled people of `to`, with the gold they carry. Returns those who set out, died and slipped away.
 */
P.sendPeople = function (by, from, to, n, gold, freeable = false) {
  const S = this.s;
  const days = idiv(fastestPoints(this.map, from, to, seasonOfTurn(S.turn)), PointsPerDay);
  const stray = !Number.isFinite(days) ? LandData.strayMost : clamp(idiv(days - LandData.strayAfter, LandData.strayPerDays), 0, LandData.strayMost);
  const fled = idiv(n * stray, 100);
  const dead = idiv((n - fled) * LandData.deportDead, 100);
  this.peopleOf(from).loose += fled;
  const seasons = Math.max(1, Math.ceil((Number.isFinite(days) ? days : S.config.travelDays) / Math.max(1, S.config.travelDays)));
  // Deportees walk a road of their own, where they can be freed (item 11a+).
  const route = freeable ? (cheapestRoute(this.map, from, to, (a, b) => legPoints(this.map, a, b, seasonOfTurn(S.turn)))?.route ?? []) : [];
  S.walking.push({ home: to, men: n - fled - dead, arrives: S.turn + seasons, savings: gold, deported: true, by, route, departs: S.turn, from });
  return [n - fled - dead, dead, fled];
};

/**
 * Deportees on the road (item 11a+, Haakon's answer to item 10+b's review: "Deportees walk the route like any company, so
 * they can die, flee or be freed on the way"): each season they cover their share of the road, and where the stretch
 * they cover holds troops of a king who would free them, the deporter's guards give them up. He frees them who held the
 * land they were taken from as its homeland, or who closed his roads to the deporter's people. The freed are loose men
 * where they were freed, with the gold they carried, free to go home or to be settled by whoever holds the land. Returns
 * the lines each king reads.
 */
P.deporteesOnRoad = function () {
  const S = this.s;
  const Map = this.map;
  const lines = new Dict<Power, string[]>();
  const say = (p: Power, line: string): void => {
    if (isAlive(S, p)) lines.set(p, [...lines.getOrDefault(p, []), line]);
  };
  for (const w of [...S.walking]) {
    if (!w.deported || w.route.length < 2 || w.men <= 0) continue;
    const span = Math.max(1, w.arrives - w.departs);
    const at = (turn: number): number => Math.min(w.route.length - 1, Math.floor(((w.route.length - 1) * clamp(turn - w.departs, 0, span)) / span));
    const stretch = w.route.slice(at(S.turn - 1), at(S.turn) + 1);
    const by = w.by as Power;
    const homeland = Map.get(w.from).home;
    const frees = (k: Power): boolean => k !== by && ((homeland !== null && k === homeland) || (S.roadsClosed.tryGet(k) ?? []).includes(by));
    // Freed only on land, where they can stand (a fleet in the waters they are shipped across cannot take them off).
    const where = stretch.find((x) => !Map.get(x).isSea && S.units.some((u) => u.province === x && frees(u.power)));
    if (where === undefined) continue;
    const freer = sortBy(
      S.units.filter((u) => u.province === where && frees(u.power)),
      [(u) => u.id, cmpStr],
    )[0].power;
    S.walking.splice(S.walking.indexOf(w), 1);
    this.peopleOf(where).loose += w.men;
    if (w.savings > 0) S.loot.set(where, S.loot.getOrDefault(where, 0) + w.savings);
    const name = Map.get(where).name;
    say(by, `${freer}'s troops in ${name} freed ${people(w.men)} people you were deporting from ${Map.get(w.from).name}: they are loose men there now.`);
    say(freer, `Your troops in ${name} freed ${people(w.men)} people ${by} was deporting from ${Map.get(w.from).name}: they are loose men there now${S.owner.getOrDefault(where, null) === freer ? ", and you may settle them (order welcome)" : ""}.`);
    logEvent(S, "deport", `${freer}'s troops freed ${people(w.men)} people ${by} was deporting, in ${name}.`, [by, freer], "deportees-freed");
  }
  return lines;
};

/**
 * A conqueror deports settled people from a province he has taken (not his homeland) to one of his own ("Deportation"):
 * it strips the land he took of yield and levies and fills his own; they carry their share of the purse only if he lets
 * them. They walk the route like any company.
 */
P.deport = function (p, o) {
  const S = this.s;
  const Map = this.map;
  const from = Map.get(o.province);
  const why =
    S.owner.getOrDefault(o.province, null) !== p
      ? "you no longer hold it"
      : from.home === p
        ? "it is your own homeland, not land you have taken"
        : S.owner.getOrDefault(o.to, null) !== p || Map.get(o.to).isSea
          ? `you do not hold ${Map.find(o.to)?.name ?? o.to}`
          : siegeOf(S, o.province) !== null || siegeOf(S, o.to) !== null
            ? "a siege stands in the way"
            : null;
  const x = this.peopleOf(o.province);
  const [n, men] = share(x, Math.max(0, o.number));
  if (why !== null || n <= 0) {
    notify(S, p, "Rejected", "Order failed", `Nobody was deported from ${from.name}: ${why ?? "it has no settled people left"}.`);
    return;
  }
  const m = this.market(o.province);
  const gold = o.purse ? idiv(m.purse * n, Math.max(1, x.settled + x.loose)) : 0;
  m.purse -= gold;
  shift(x, -n, -men);
  const [arrive, dead, fled] = this.sendPeople(p, o.province, o.to, n, gold, true);
  notify(
    S,
    p,
    "Resolution",
    PeopleTitle,
    `You deported ${people(n)} people from ${from.name} to ${Map.get(o.to).name}${gold > 0 ? `, with their share of the purse (${gold} shekels)` : ""}: ${people(arrive)} are on the road` +
      (dead > 0 ? `, ${people(dead)} will die on the way` : "") +
      (fled > 0 ? `, and ${people(fled)} slipped away and stay loose in ${from.name}` : "") +
      ".",
  );
  logEvent(S, "deport", `${p} deported ${people(n)} people from ${from.name} to ${Map.get(o.to).name}.`, [p], "deported");
};

/**
 * A king sends back to another the runaways from his land standing loose in a province of his ("Fugitive clauses":
 * deportation in reverse): they walk to the nearest land of that king, and settle there.
 */
P.returnRunaways = function (p, o) {
  const S = this.s;
  const Map = this.map;
  const name = Map.get(o.province).name;
  const ran = S.runaways.tryGet(o.province);
  const n = Math.min(ran?.getOrDefault(o.to, 0) ?? 0, this.peopleOf(o.province).loose);
  const home = sortBy(
    ownedBy(S, o.to).filter((x) => !Map.get(x).isSea && siegeOf(S, x) === null),
    [(x: string) => Map.hops(o.province, x), (a: number, b: number) => a - b],
    [(x: string) => x, cmpStr],
  )[0];
  if (S.owner.getOrDefault(o.province, null) !== p || n <= 0 || home === undefined || !isAlive(S, o.to)) {
    notify(S, p, "Rejected", "Order failed", `No runaways were sent back from ${name}: ${S.owner.getOrDefault(o.province, null) !== p ? "you no longer hold it" : n <= 0 ? `there are none from ${o.to}'s land there` : `${o.to} has no land to take them`}.`);
    return;
  }
  const x = this.peopleOf(o.province);
  const loot = S.loot.getOrDefault(o.province, 0);
  const gold = idiv(loot * n, Math.max(1, x.loose));
  S.loot.set(o.province, loot - gold);
  x.loose -= n;
  ran!.set(o.to, ran!.get(o.to) - n);
  this.looseLeave(o.province, 0);
  const [arrive] = this.sendPeople(p, o.province, home, n, gold);
  notify(S, p, "Resolution", PeopleTitle, `You sent ${people(n)} runaways from ${o.to}'s land in ${name} back to ${o.to}: ${people(arrive)} are on the road to ${Map.get(home).name}.`);
  logEvent(S, "runaways", `${p} sent ${people(n)} runaways from ${name} back to ${o.to}.`, [p, o.to], "runaways-returned");
};

/**
 * A besieged king puts out of his city the mouths that cannot fight, so its food lasts longer ("People are worth having,
 * not free to keep"): he chooses how many (item 11a+), a share of the mouths still inside, up to `expelMost` of the town
 * in all; for the rest of the siege its town eats that much less, and the people put out are refugees outside the walls.
 */
P.expel = function (p, o) {
  const S = this.s;
  const prov = this.map.get(o.province);
  const before = S.expelled.getOrDefault(o.province, 0);
  const after = Math.min(LandData.expelMost, before + idiv((100 - before) * clamp(o.percent, 0, 100), 100));
  if (S.owner.getOrDefault(o.province, null) !== p || siegeOf(S, o.province) === null || after <= before) {
    notify(S, p, "Rejected", "Order failed", `Nobody was put out of ${prov.name}: ${S.owner.getOrDefault(o.province, null) !== p ? "you no longer hold it" : siegeOf(S, o.province) === null ? "it is not besieged" : before > 0 && after <= before ? "only the fighting men and those who feed them are left" : "you named nobody to put out"}.`);
    return;
  }
  S.expelled.set(o.province, after);
  // The town's people, reckoned by what the town eats against what the countryside's people eat.
  const r = reckonedOf(this.map, o.province);
  const perMeasure = countryNeed(prov, r.settled, r.settled);
  const x = this.peopleOf(o.province);
  const need = needOf(prov);
  const townsfolk = perMeasure <= 0 ? 0 : idiv(idiv(need * (after - before), 100) * r.settled, perMeasure);
  const [n] = share(x, townsfolk);
  shift(x, -n, 0);
  x.loose += n;
  notify(S, p, "Resolution", PeopleTitle, `You put out of ${prov.name} ${people(n)} people, mouths that cannot fight: the city eats ${after}% less than in peace while the siege lasts, and they are refugees outside the walls.`);
  logEvent(S, "expel", `${p} put ${people(n)} people out of besieged ${prov.name}.`, [p], "mouths-expelled");
  this.refuge(o.province, n, "the siege");
};
