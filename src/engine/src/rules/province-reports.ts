/**
 * A court's own land as its officials report it (bug #540, "Distance inside your own realm", item 13): what a king sees
 * as current is what a courier could bring him within the season; his land farther off he knows by its last report, as of
 * the newest season whose word has come, as he knows who holds it (`knownHolders`). Read by the seat's view, its strength
 * and the order checks, so the three agree.
 */
import { Dict, type HSet } from "../core/collections.ts";
import { idiv, roundEven, toInt } from "../core/num.ts";
import { seasonOfTurn, type WorldMap } from "../model/map.ts";
import { reapSeasonOf } from "../model/geography.ts";
import type { Power } from "../model/power.ts";
import { capacityOf, economyOf, grainWorth, needOf, priceAt } from "../model/economy.ts";
import { reckonedOf } from "../model/land.ts";
import { countOf } from "../model/counts.ts";
import { worksOfPower, type WorkKind } from "../model/works.ts";
import { newProvinceReport, type ProvinceReport, ReportsKept } from "../model/province-reports.ts";
import { newProvinceEconomyView, type ProvinceEconomyView, type WorkView } from "../model/views.ts";
import { siegeOf, type GameState, type Known } from "../model/state.ts";
import { obeyedIn, type TurnEngine } from "../turn/core.ts";
import { knownHolders, sight } from "./known-land.ts";

/** A province's economy as its holder's officials report it this season (item 9+a; its people, item 10+a). */
function provinceEconomy(s: GameState, engine: TurnEngine, m: WorldMap, id: string): ProvinceEconomyView {
  const prov = m.get(id);
  const mk = engine.market(id);
  const holder = s.owner.getOrDefault(id, null);
  const c = holder === null ? null : countOf(s, holder, id);
  return newProvinceEconomyView({
    province: id,
    stores: engine.stores(id),
    capacity: capacityOf(prov),
    tax: engine.effectiveYield(id),
    need: engine.townNeed(id),
    stock: mk.stock,
    purse: mk.purse,
    price: priceAt(mk.stock, needOf(prov)),
    // Its people and fields (item 10+a), as its holder's scribes last counted them (item 17++).
    counted: c?.turn ?? null,
    settled: c?.settled ?? 0,
    men: c?.men ?? 0,
    loose: c?.loose ?? 0,
    town: c?.town ?? 0,
    room: reckonedOf(m, id).room,
    share: engine.shareOf(id),
    amount: engine.amountOf(id),
    // A season's share of the last harvest, what the demand is reckoned from (item 11a+).
    harvest: idiv(c?.harvest ?? 0, 3),
    fed: s.fed.getOrDefault(id, 1000),
    // Item 10+b.
    runaways: new Dict([...(s.runaways.tryGet(id)?.entries() ?? [])].filter(([, n]) => n > 0)),
    expelled: s.expelled.getOrDefault(id, 0),
    granary: c?.granary ?? 0,
    crop: c?.crop ?? 0,
    reapsIn: (reapSeasonOf(id) - seasonOfTurn(s.turn) + 3) % 3,
  });
}

/** A province's worth a season at reference prices, as far as it obeys its holder (`TurnEngine.landWorth`). */
export function provinceWorth(engine: TurnEngine, id: string): number {
  return toInt(roundEven((grainWorth(engine.harvestNow(id, false)) + economyOf(engine.map.get(id)).mine) * obeyedIn(engine.s, id)));
}

/** A province's purse, stores and market at reference prices (`TurnEngine.holdings`). */
export function provinceHolding(engine: TurnEngine, id: string): number {
  const m = engine.market(id);
  return m.purse + grainWorth(engine.stores(id) + m.stock);
}

/**
 * The province as it is now, as its officials report it as of season `turn`: a siege begun after that is not yet in it
 * (as `siegesKnown` dates a siege by its beginning).
 */
function reportNow(engine: TurnEngine, id: string, turn: number): ProvinceReport {
  const s = engine.s;
  const economy = provinceEconomy(s, engine, engine.map, id);
  const siege = siegeOf(s, id);
  if (siege !== null && siege.since > turn) economy.tax = toInt(roundEven(engine.grainAsked(id) * obeyedIn(s, id)));
  return newProvinceReport({
    turn,
    holder: s.owner.getOrDefault(id, null),
    economy,
    works: worksOfPower(s, [id]),
    worth: provinceWorth(engine, id),
    holding: provinceHolding(engine, id),
    reaped: s.reaped.tryGet(id) ?? null,
  });
}

/**
 * Each held province's report of the season just ended, as the new season begins (the first, of the land as the game
 * began, labelled 0); those older than any word could take are let go.
 */
export function recordReports(engine: TurnEngine): void {
  const s = engine.s;
  for (const prov of engine.map.landProvinces) {
    let list = s.reports.tryGet(prov.id);
    if (s.owner.getOrDefault(prov.id, null) !== null) {
      if (list === undefined) s.reports.set(prov.id, (list = []));
      list.push(reportNow(engine, prov.id, s.turn - 1));
    }
    if (list === undefined) continue;
    const kept = list.filter((r) => r.turn > s.turn - 1 - ReportsKept);
    if (kept.length > 0) s.reports.set(prov.id, kept);
    else s.reports.delete(prov.id);
  }
}

/** A province of a court's as the court knows it: its economy, its works, its worth and its holdings. */
export interface OwnKnown {
  economy: ProvinceEconomyView;
  works: WorkView[];
  worth: number;
  holding: number;
  reaped: number | null;
}

/**
 * How a court knows a province it knows it holds (`knownHolders`): "now" where it sees it, as it is; farther off, its
 * officials' report of the season the word of its holder is from (none if he did not hold it then, as when word of a
 * gain has come before any report of it). Before the first season's reports, as it is: every court knows its land as it
 * was at the start.
 */
function reportKnown(s: GameState, p: Power, id: string, k: Known | undefined, seen: HSet<string>): ProvinceReport | "now" | null {
  if (k?.owner !== p) return null;
  const list = s.reports.tryGet(id);
  if (seen.has(id) || list === undefined) return s.owner.getOrDefault(id, null) === p ? "now" : null;
  // Never a report newer than the word: none kept that old, none known.
  let r: ProvinceReport | undefined;
  for (const x of list) if (x.turn <= k.turn) r = x;
  return r !== undefined && r.holder === p ? r : null;
}

/** The provinces a court knows it holds, each as it knows it ({@link reportKnown}). */
export function ownKnown(s: GameState, engine: TurnEngine, m: WorldMap, p: Power, seen: HSet<string> | null = null, known: Dict<string, Known> | null = null): Dict<string, OwnKnown> {
  const sightNow = seen ?? sight(s, m, p);
  const holders = known ?? knownHolders(s, m, p, sightNow);
  const out = new Dict<string, OwnKnown>();
  for (const x of m.landProvinces) {
    const r = reportKnown(s, p, x.id, holders.tryGet(x.id), sightNow);
    if (r === null) continue;
    if (r === "now") {
      const n = reportNow(engine, x.id, s.turn);
      out.set(x.id, { economy: n.economy, works: n.works, worth: n.worth, holding: n.holding, reaped: n.reaped });
    } else
      out.set(x.id, {
        economy: { ...r.economy, reapsIn: (reapSeasonOf(x.id) - seasonOfTurn(s.turn) + 3) % 3, reported: r.turn },
        works: r.works.map((w) => ({ ...w })),
        worth: r.worth,
        holding: r.holding,
        reaped: r.reaped,
      });
  }
  return out;
}

/** The works of the provinces a court knows it holds, as it knows them ({@link reportKnown}), by province. */
export function ownWorks(s: GameState, m: WorldMap, p: Power, seen: HSet<string>, known: Dict<string, Known>): Dict<string, WorkView[]> {
  const out = new Dict<string, WorkView[]>();
  for (const x of m.landProvinces) {
    const r = reportKnown(s, p, x.id, known.tryGet(x.id), seen);
    if (r !== null) out.set(x.id, r === "now" ? worksOfPower(s, [x.id]) : r.works);
  }
  return out;
}

/** The level of a kind in a province of a court's, as it knows it ({@link ownWorks}): 0 where it knows of none. */
export function knownLevel(works: Dict<string, readonly WorkView[]>, kind: WorkKind, province: string): number {
  return works.tryGet(province)?.find((w) => w.kind === kind)?.level ?? 0;
}
