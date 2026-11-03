/**
 * What a king can count (build order item 17++, part B; "Counts as the scribes knew them", "A census", "The king says how
 * much he wants"): the grain each province gives by its king's demand, a share or an amount; the scribes sent to count a
 * province, and their count travelling home. Model: `model/counts.ts`.
 */
import { idiv } from "../core/num.ts";
import { countOf, CountData, hiddenPercent, keepCount, takeCount } from "../model/counts.ts";
import { EconomyData } from "../model/economy.ts";
import { countryNeed, reckonedOf } from "../model/land.ts";
import type { CensusOrder, DemandOrder } from "../model/orders.ts";
import { type Power } from "../model/power.ts";
import { isAlive, logEvent, notify } from "../model/state.ts";
import { UnrestData } from "../model/unrest.ts";
import { courierSeasons } from "../rules/court.ts";
import { formatMoney, measures } from "../rules/calendar.ts";
import { pick } from "../rules/wording.ts";
import { TurnEngine } from "./core.ts";
import { people } from "./people.ts";

declare module "./core.ts" {
  interface TurnEngine {
    shareOf(province: string): number;
    amountOf(province: string): number | null;
    hiddenIn(province: string): number;
    grainAsked(province: string): number;
    /** What a share leaves the farmers before it takes anything: a season's food, none for an amount (which falls on them). */
    shareReserve(province: string): number;
    burden(province: string): number;
    setDemand(p: Power, o: DemandOrder): void;
    sendCensus(p: Power, o: CensusOrder): void;
    censusSeason(): void;
  }
}

const P = TurnEngine.prototype;

/** The share of its harvest a king asks of a province, in percent (the usual one where he set none). */
P.shareOf = function (province) {
  return this.s.shares.getOrDefault(province, EconomyData.taxPercent);
};

/** The amount of grain a season a king asks of a province, or null where he asks a share. */
P.amountOf = function (province) {
  return this.s.amounts.tryGet(province) ?? null;
};

/**
 * Of a share asked, the part the province hides, in percent: more the older its holder's count of it and the farther it
 * lies from his court.
 */
P.hiddenIn = function (province) {
  const S = this.s;
  const holder = S.owner.getOrDefault(province, null);
  if (holder === null || !isAlive(S, holder)) return 0;
  const c = countOf(S, holder, province);
  return hiddenPercent(c === null ? null : S.turn - c.turn, courierSeasons(S, this.map, province, this.courtAt(holder)));
};

/**
 * The grain a province owes a season by its holder's demand, before how fully it obeys and its granaries' bounds: an
 * amount as asked, or a share of a season's third of its last harvest, less what it hides. A share never squeezes the
 * province: its farmers hold back what they eat before the share is reckoned from the rest.
 */
P.grainAsked = function (province) {
  const amount = this.amountOf(province);
  if (amount !== null) return amount;
  const season = idiv(this.s.reaped.getOrDefault(province, 0), 3);
  const asked = idiv(idiv(season * this.shareOf(province), 100) * (100 - this.hiddenIn(province)), 100);
  return Math.min(asked, Math.max(0, season - this.shareReserve(province)));
};

P.shareReserve = function (province) {
  const x = this.s.people.tryGet(province);
  if (this.amountOf(province) !== null || x === undefined || this.map.get(province).isSea) return 0;
  return countryNeed(this.map.get(province), x.settled, reckonedOf(this.map, province).settled);
};

/** What the demand takes of a season's third of the harvest, in percent, from 0 up (an amount can take more than all of it). */
P.burden = function (province) {
  const season = idiv(this.s.reaped.getOrDefault(province, 0), 3);
  const asked = this.grainAsked(province);
  return season > 0 ? idiv(asked * 100, season) : asked > 0 ? 100 : 0;
};

/**
 * A king says what a province of his gives, or all his land: it stands until he changes it, or the province changes
 * hands. A demand for all his land replaces those set province by province.
 */
P.setDemand = function (p, o) {
  const S = this.s;
  const land = o.province === null ? [...S.owner.entries()].filter(([, v]) => v === p).map(([k]) => k) : [o.province];
  for (const id of land) {
    if (S.owner.getOrDefault(id, null) !== p) continue;
    S.amounts.delete(id);
    S.shares.delete(id);
    if (o.how === "amount") S.amounts.set(id, o.n);
    else if (o.n !== EconomyData.taxPercent) S.shares.set(id, o.n);
  }
  const where = o.province === null ? null : this.map.get(o.province).name;
  const what = o.how === "amount" ? `${measures(o.n)} of grain a season` : `${o.n} in a hundred of its harvest`;
  notify(S, p, "Resolution", "Taxes", `From the next collection, ${where ?? "every province of yours"} gives ${what}.`);
  logEvent(S, "demand-set", `${p} asked ${what} of ${where ?? "all its land"}.`, [p], o.how === "amount" ? "demand-amount" : "demand-share");
};

/** A king sends scribes to count a province of his: they are paid now and count it in the seasons they take. */
P.sendCensus = function (p, o) {
  const S = this.s;
  const t = S.treasuries.get(p);
  t.gold -= CountData.gold;
  this.spendAt(o.province, CountData.gold);
  S.censuses.push({ power: p, province: o.province, counted: S.turn + CountData.seasons, home: 0, count: null, mood: "" });
  const name = this.map.get(o.province).name;
  const forms = [`Scribes set out to count ${name}, paid ${formatMoney(CountData.gold)}.`, `You paid ${formatMoney(CountData.gold)} and sent scribes to count ${name}.`];
  notify(S, p, "Resolution", "A census", pick(forms, `${S.turn}|${p}|${o.province}|census`));
  logEvent(S, "census", `${p} sent scribes to count ${this.map.get(o.province).name}.`, [p], "census");
};

/**
 * The scribes at work, at the season's end: those whose seasons are up count the province as it stands, stirring some
 * unrest, and send the count home; a count that reaches its court replaces the older one. Scribes in land their king no
 * longer holds come home with nothing, their word travelling as a count would.
 */
P.censusSeason = function () {
  const S = this.s;
  for (const c of S.censuses) {
    // Scribes who found the land gone: their word reaches home as any word does.
    if (c.count === null && c.home > 0) {
      if (S.turn >= c.home && isAlive(S, c.power))
        notify(S, c.power, "Notice", "A census", `The scribes sent to count ${this.map.get(c.province).name} came home with nothing: the land had left your rule before they could count it.`);
      continue;
    }
    if (c.count !== null || S.turn < c.counted) continue;
    const away = courierSeasons(S, this.map, c.province, this.courtAt(c.power));
    c.home = S.turn + (Number.isFinite(away) ? away : 4);
    if (S.owner.getOrDefault(c.province, null) !== c.power) {
      c.home = Math.max(S.turn + 1, c.home);
      continue;
    }
    c.count = takeCount(S, this.map, c.province);
    // Item 17++, part C: the scribes note its people's mood as they found it, which comes home with the count.
    c.mood = this.moodOf(c.province);
    this.take(c.province, this.handOf(c.province, c.power), UnrestData.census);
  }
  for (const c of S.censuses) {
    if (c.count === null || S.turn < c.home || !isAlive(S, c.power)) continue;
    keepCount(S, c.power, c.count);
    const k = c.count;
    this.readMood({ power: c.power, province: c.province, mood: c.mood, seen: k.turn, source: "census" });
    notify(
      S,
      c.power,
      "Notice",
      "A census",
      `The count of ${this.map.get(c.province).name} has come home, taken in the season of turn ${k.turn}.` +
        ` About ${people(k.town)} live in the town and ${people(k.settled)} on its land, ${people(k.men)} of them men of fighting age${k.loose > 0 ? `, besides ${people(k.loose)} loose men` : ""}.` +
        ` Its last harvest was ${measures(k.harvest)}; its farmers' granaries hold ${measures(k.granary)}, and ${k.crop > 0 ? `its fields carry ${measures(k.crop)} more` : "nothing stands in its fields"}. Its people were ${c.mood}.`,
    );
    logEvent(S, "census-home", `${c.power}'s count of ${this.map.get(c.province).name} came home.`, [c.power], "census-home");
  }
  S.censuses = S.censuses.filter((c) => (c.count === null ? !(c.home > 0 && S.turn >= c.home) : S.turn < c.home) && isAlive(S, c.power));
};

