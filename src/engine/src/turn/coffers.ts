/**
 * Gold travels both ways ("One treasury, many stores" under Land, people and economy, decided 3 November 2026, #587).
 * What is done in a province beyond the season's reach of its king's court is paid only from gold that is there, never
 * from the treasury at a distance: the king's coffer in that province, which its own mined gold and market sales fill and
 * gold sent with his couriers adds to; or, for works, levies and troops' pay it cannot cover, on credit, with a bill
 * carried home that the treasury pays when it arrives. A bill it cannot pay leaves a debt there, and nothing more is done
 * there on credit until the coffer has paid it. Each season a far coffer keeps what the province's works and the troops
 * standing there will need until word could come back, and sends the rest home as a load. A coffer falls with its
 * province. So the treasury moves only when gold leaves it or a carrier brings a payment or a bill home.
 */
import { Dict } from "../core/collections.ts";
import { cmpNum, sortBy, sum } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { type Bill, billTotal, type Coffer, newBill, newCoffer, newRemittance } from "../model/coffers.ts";
import { forMen } from "../model/land.ts";
import type { SendOrder } from "../model/orders.ts";
import type { Power } from "../model/power.ts";
import { isAlive, logEvent, notify, siegeOf, unitLabel, type Unit } from "../model/state.ts";
import { UnrestData } from "../model/unrest.ts";
import { buildGold, levelOf, upkeepGold, WorksData } from "../model/works.ts";
import { formatMoney } from "../rules/calendar.ts";
import { TurnEngine } from "./core.ts";
import { lootOf } from "./trade.ts";

declare module "./core.ts" {
  interface TurnEngine {
    /** Whether a province lies beyond the season's reach of the king's court, where only gold that is there pays. */
    isFar(p: Power, province: string): boolean;
    /** The king's coffer in a province of his (made if `make`), null where he does not hold it. */
    cofferOf(p: Power, province: string, make?: boolean): Coffer | null;
    /** Gold reaching a king at a province: into its coffer if it is a far province of his, else into the treasury. */
    receiveAt(p: Power, province: string, gold: number, income?: boolean): void;
    /** The gold a king has to spend at a province with no credit: the treasury's near, the coffer's far. */
    goldAt(p: Power, province: string): number;
    /** Takes gold that is there (`goldAt`), all or none. */
    takeAt(p: Power, province: string, amount: number): boolean;
    /**
     * Pays for work done far off (works, a levy, a unit's pay): from the coffer, what it lacks on a bill carried home;
     * null if neither will do (a debt unpaid there, or no road for a bill). Who is paid the coffer's part is the caller's.
     */
    payFar(p: Power, province: string, amount: number, unit?: Unit | null): { coffer: number; credit: number } | null;
    /** Why nothing far off is done on credit there (`payFar` gave null): a debt unpaid, or no road for a bill. */
    noCredit(p: Power, province: string): string;
    /** Gold sent with the couriers to a far province's coffer (order send): it leaves the treasury now. */
    sendGold(p: Power, o: SendOrder): void;
    /** Gold sent that arrives this season, and bills carried home, paid from the treasury: the lines each king reads. */
    goldArrives(): Dict<Power, string[]>;
    /** As the season ends: coffers pay their debts, fall with their provinces, and send home what they need not keep. */
    coffersSettle(): void;
  }
}

const P = TurnEngine.prototype;

/** Gold reaching a coffer pays what it owes first, to the people it is owed to, before anything can spend it. */
function intoCoffer(e: TurnEngine, c: Coffer, gold: number): void {
  const debt = Math.min(gold, c.owed);
  c.owed -= debt;
  e.spendAt(c.province, debt);
  c.gold += gold - debt;
}

/** Whether a load can go from the province to the king's court by road (`lootHome` sends it by courier otherwise, #740). */
export const homeRoad = (e: TurnEngine, p: Power, province: string): boolean => {
  const cap = e.courtAt(p);
  return province !== cap && e.s.owner.getOrDefault(cap, null) === p && e.tradeRoute(p, province, cap, false) !== null;
};

/** Seasons a bill or gold takes from a province with no road for word: never; credit is not given there (null). */
const reach = (e: TurnEngine, p: Power, province: string): number | null => {
  const d = e.wordTo(p, province);
  return Number.isFinite(d) ? d : null;
};

P.isFar = function (p, province) {
  // By the court's one clock for its land (word home within the season, #616), the line its view and its order checks
  // draw, so whether the treasury pays at once or a coffer and a bill pay never tells of roads unheard of (Codex, #635).
  return this.wordFrom(p, province) >= 1;
};

P.cofferOf = function (p, province, make = false) {
  const S = this.s;
  if (S.owner.getOrDefault(province, null) !== p) return null;
  let c = S.coffers.find((x) => x.province === province && x.power === p) ?? null;
  if (c === null && make) S.coffers.push((c = newCoffer({ province, power: p })));
  return c;
};

P.receiveAt = function (p, province, gold, income = true) {
  if (gold <= 0) return;
  if (this.isFar(p, province)) {
    if (this.s.owner.getOrDefault(province, null) === p) intoCoffer(this, this.cofferOf(p, province, true)!, gold);
    // Far off in another's land, it goes home as a load; with no road home for it, it stays among the people there.
    else if (homeRoad(this, p, province)) this.lootHome(p, province, gold, [], "");
    else this.spendAt(province, gold);
    return;
  }
  const t = this.s.treasuries.get(p);
  t.gold += gold;
  if (income) t.income += gold;
};

P.goldAt = function (p, province) {
  if (!this.isFar(p, province)) return Math.max(0, this.s.treasuries.get(p).gold);
  return this.cofferOf(p, province)?.gold ?? 0;
};

P.takeAt = function (p, province, amount) {
  if (amount <= 0) return true;
  if (this.goldAt(p, province) < amount) return false;
  if (this.isFar(p, province)) this.cofferOf(p, province)!.gold -= amount;
  else this.s.treasuries.get(p).gold -= amount;
  return true;
};

P.payFar = function (p, province, amount, unit = null) {
  const S = this.s;
  const c = this.cofferOf(p, province);
  const have = c?.gold ?? 0;
  if (have >= amount) {
    c!.gold -= amount;
    return { coffer: amount, credit: 0 };
  }
  const d = reach(this, p, province);
  if ((c?.owed ?? 0) > 0 || d === null) return null;
  if (c !== null) c.gold = 0;
  const rest = amount - have;
  let b = S.bills.find((x) => x.power === p && x.province === province && x.turn === S.turn) ?? null;
  // Due when word of this season's doings there could reach the court (`heardAt`).
  if (b === null) S.bills.push((b = newBill({ power: p, province, turn: S.turn, due: this.heardAt(p, province) })));
  if (unit !== null) b.units.push({ unit: unit.id, gold: rest, label: unitLabel(unit), missed: unit.unpaid });
  else b.works += rest;
  return { coffer: have, credit: rest };
};

P.noCredit = function (p, province) {
  return (this.cofferOf(p, province)?.owed ?? 0) > 0 ? "too little gold in its coffer, and no credit there while a debt is unpaid" : "too little gold in its coffer, and no road for a bill to come home by";
};

P.sendGold = function (p, o) {
  const S = this.s;
  const name = this.map.get(o.province).name;
  // The order checks judged it far, as the court knows its roads; it goes whatever the roads truly are, so neither the
  // treasury nor a notice says more (Codex, #635). With no road at all it arrives as word does, and comes back.
  if (!this.pay(p, o.gold, `the gold for ${name}`, o, "none was sent")) return;
  const d = reach(this, p, o.province) ?? 1;
  S.sent.push(newRemittance({ power: p, province: o.province, gold: o.gold, due: S.turn + Math.max(1, d) }));
  notify(S, p, "Resolution", "Gold sent", `${formatMoney(o.gold)} left your treasury with your couriers for the coffer of ${name}; word will come when it reaches there, if the province is still yours and open by then.`);
  logEvent(S, "gold-sent", `${p} sent gold to ${name}.`, [p], "gold-sent");
};

P.goldArrives = function () {
  const S = this.s;
  const lines = new Dict<Power, string[]>();
  const say = (p: Power, l: string): void => {
    lines.set(p, [...lines.getOrDefault(p, []), l]);
  };
  // Gold sent out reaches its coffer, or comes back from a province lost or shut by a siege, as word does.
  const due = S.sent.filter((x) => x.due <= S.turn);
  S.sent = S.sent.filter((x) => x.due > S.turn);
  for (const x of due) {
    const name = this.map.get(x.province).name;
    // Word of its arrival has come: it leaves the court's list.
    if (x.landed) continue;
    if (!isAlive(S, x.power)) {
      this.spendAt(x.province, x.gold);
      continue;
    }
    if (x.home) {
      this.receiveAt(x.power, this.courtAt(x.power), x.gold, false);
      say(x.power, x.food ? `The ${formatMoney(x.gold)} you sent for your troops' food in ${name} came back with your couriers, into the treasury: they found none of yours there.` : `The ${formatMoney(x.gold)} you sent to ${name} came back with your couriers, into the treasury.`);
      continue;
    }
    const held = S.owner.getOrDefault(x.province, null) === x.power;
    if (held && siegeOf(S, x.province) === null) {
      intoCoffer(this, this.cofferOf(x.power, x.province, true)!, x.gold);
      this.tell(x.power, x.province, "Notice", "Gold sent", `The ${formatMoney(x.gold)} you sent reached the coffer of ${name}.`);
      // Kept until word of it comes; told at once (word within the season), it leaves the list with the notice.
      if (this.heardAt(x.power, x.province) > S.turn + S.deliveryOffset) S.sent.push(newRemittance({ power: x.power, province: x.province, gold: x.gold, due: this.heardAt(x.power, x.province), landed: true }));
      continue;
    }
    // Home again as word from there comes.
    S.sent.push(newRemittance({ power: x.power, province: x.province, gold: x.gold, due: this.heardAt(x.power, x.province), home: true }));
  }
  // Bills carried home: the treasury pays them as far as it can.
  const bills = sortBy(
    S.bills.filter((b) => b.due <= S.turn),
    [(b: Bill) => b.turn, cmpNum],
    [(b: Bill) => b.province, cmpStr],
  );
  S.bills = S.bills.filter((b) => b.due > S.turn);
  for (const b of bills) {
    if (!isAlive(S, b.power)) continue;
    const t = S.treasuries.get(b.power);
    const name = this.map.get(b.province).name;
    const total = billTotal(b);
    if (t.gold < total) this.exposeDebasement(b.power, `the bill from ${name}`);
    // The troops' pay first: unpaid men mutiny, unpaid workmen only stop.
    const short: string[] = [];
    let paid = 0;
    for (const { unit: id, gold, label, missed } of b.units) {
      // A fleet in cargo service is with its ship, not among the units.
      const u = S.units.find((x) => x.id === id && x.power === b.power) ?? S.caravans.find((v) => v.ship?.id === id && v.power === b.power)?.ship ?? null;
      if (t.gold >= gold) {
        t.gold -= gold;
        paid += gold;
        // Carried out to the men with the next courier, kept in their packs; their unit gone, its men's people at home take it.
        if (u !== null) {
          u.savings += gold;
          // Paid at last: its missing pay is cleared only if it missed none since the bill was made.
          if (u.unpaid === missed) u.unpaid = 0;
        } else this.spendAt(b.province, gold);
      } else {
        // Named as the bill names it, whether or not the unit is still there: the bill says only what it says (Codex, #635).
        short.push(label);
        if (u !== null) {
          u.unpaid++;
          this.armyEntry(u, u.power, -UnrestData.unpaid);
        }
      }
    }
    const works = Math.min(Math.max(0, t.gold), b.works);
    t.gold -= works;
    paid += works;
    this.spendAt(b.province, works);
    const owed = b.works - works;
    if (owed > 0) {
      const c = this.cofferOf(b.power, b.province, true);
      // What the coffer already holds pays it first; the rest is owed.
      if (c !== null) {
        const now = Math.min(c.gold, owed);
        c.gold -= now;
        this.spendAt(b.province, now);
        c.owed += owed - now;
      }
    }
    const of = [b.works > 0 ? "its works and levies" : "", b.units.length > 0 ? "the pay of your troops there" : ""].filter((x) => x !== "").join(" and ");
    let l = `A bill came home from ${name} for ${of}, done on credit in turn ${b.turn}: ${formatMoney(total)}`;
    if (paid >= total) l += ", paid.";
    else {
      l += `, of which the treasury could pay ${formatMoney(paid)}.`;
      if (short.length > 0) l += ` Unpaid: ${short.join(", ")}, who count it a season of missing pay.`;
      if (owed > 0) l += ` ${formatMoney(owed)} is owed to the people of ${name}: nothing more is done there on credit until its coffer has paid it.`;
      logEvent(S, "bill-unpaid", `${b.power} could not pay a bill from ${name}.`, [b.power], "bill-unpaid");
    }
    say(b.power, l);
  }
  return lines;
};

/** What a far province of the king's needs a season: its works paid in gold, and the pay of his troops standing there. */
function seasonNeed(e: TurnEngine, p: Power, province: string): number {
  const S = e.s;
  let need = 0;
  for (const w of S.works.filter((x) => x.province === province && !x.labour)) {
    const level = levelOf(S, w.kind, province);
    need += upkeepGold(w.kind, Math.min(level, w.keep));
    if (w.keep > level && level < WorksData[w.kind].most) need += buildGold(w.kind, province, w.kind === "Policing" ? w.keep - level : level + 1);
  }
  for (const u of S.units.filter((x) => x.power === p && x.province === province)) need += forMen(u.kind === "Army" ? S.config.armyUpkeep : S.config.fleetUpkeep, u.kind, u.men);
  return need;
}

P.coffersSettle = function () {
  const S = this.s;
  for (const c of sortBy([...S.coffers], [(x: Coffer) => x.province, cmpStr])) {
    const holder = S.owner.getOrDefault(c.province, null);
    const name = this.map.get(c.province).name;
    // A coffer falls with its province: its new holder takes the gold, and the debt dies with the old holder's rule.
    if (holder !== c.power || !isAlive(S, c.power)) {
      S.coffers.splice(S.coffers.indexOf(c), 1);
      if (holder !== null && isAlive(S, holder) && c.gold > 0) {
        this.receiveAt(holder, c.province, c.gold, false);
        this.tell(holder, c.province, "Notice", "A coffer taken", `The coffer ${c.power} kept in ${name} fell to you with the province: ${formatMoney(c.gold)}, ${this.isFar(holder, c.province) ? "kept there in your own coffer" : "into your treasury"}.`);
        logEvent(S, "coffer-taken", `${holder} took the coffer of ${name}.`, this.nearOf(c.province, holder), "coffer-taken");
      } else this.spendAt(c.province, c.gold);
      continue;
    }
    if (!this.isFar(c.power, c.province)) {
      // Within the season's reach: nothing is paid from it any more, and what it holds goes home with a carrier, so the
      // treasury moves only when the gold arrives (Codex, #635); its debt waits for gold to reach it.
      // At the court itself it is the treasury's at once; elsewhere a carrier brings it.
      if (c.gold > 0 && c.province === this.courtAt(c.power)) {
        const t = S.treasuries.get(c.power);
        t.gold += c.gold;
        c.gold = 0;
      } else if (c.gold > 0 && homeRoad(this, c.power, c.province)) {
        this.lootHome(c.power, c.province, c.gold, [], "");
        c.gold = 0;
      }
    } else if (siegeOf(S, c.province) === null && reach(this, c.power, c.province) !== null && homeRoad(this, c.power, c.province)) {
      // With no road home, or no word, it keeps all it has.
      const keep = seasonNeed(this, c.power, c.province) * (reach(this, c.power, c.province)! + 1);
      const home = c.gold - keep;
      if (home > 0) {
        c.gold -= home;
        this.lootHome(c.power, c.province, home, [], "");
      }
    }
    if (c.gold <= 0 && c.owed <= 0) S.coffers.splice(S.coffers.indexOf(c), 1);
  }
};

/** A realm's gold on the road with its couriers: out to a far coffer or back, or loot coming home (`TurnEngine.holdings`). */
export function goldSent(e: TurnEngine, p: Power): number {
  return (
    sum(
      e.s.sent.filter((x) => x.power === p && !x.landed),
      (x) => x.gold,
    ) + sum(
      e.s.journeys.filter((j) => j.kind === "Word" && j.news === "Loot" && j.to === p),
      (j) => lootOf(j).gold,
    )
  );
}
