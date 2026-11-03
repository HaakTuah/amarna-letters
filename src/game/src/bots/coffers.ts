/**
 * Gold sent ahead ("One treasury, many stores", #587): a far province pays what is done there from its coffer, and runs on
 * credit only while the treasury pays the bills that come home. A script king sends gold with his couriers to a far
 * province of his whose coffer, as last reported, owes a debt (no credit there until it is paid) or holds less than two
 * seasons of what its works in gold and his troops there cost, so its works and levies are not stopped by a bill he
 * could not pay when it came. Every figure is the engine's own; what it knows is its view.
 */
import { buildGold, cmpNum, cmpStr, desc, EconomyData, forMen, send, sortBy, upkeepGold, WorksData, type Order, type ProvinceEconomyView } from "@amarna/engine";
import type { Board } from "./board.ts";

/** Whether a script king sends gold ahead (off for half of them in the measure of using it against ignoring it, `--coffer-play-half`). */
export const CofferPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** At most this many far coffers are funded in a season, and never below this much left to spare. */
const MostSends = 2;
const KeepSpare = 150;

/** The season's gold sent ahead, and what it costs. `spare`: the gold the king may spend after his reserve. */
export function cofferOrders(b: Board, spare: number): { orders: Order[]; spent: number } {
  const v = b.v;
  const orders: Order[] = [];
  let spent = 0;
  if (!CofferPlay.on(b.me)) return { orders, spent };
  const need = (id: string): number => {
    let gold = 0;
    for (const w of v.works.filter((x) => x.province === id && !x.labour)) {
      gold += upkeepGold(w.kind, Math.min(w.level, w.keep));
      if (w.keep > w.level && w.level < WorksData[w.kind].most) gold += buildGold(w.kind, id, w.kind === "Policing" ? w.keep - w.level : w.level + 1);
    }
    for (const u of b.mine.filter((x) => x.province === id)) gold += forMen(v.prices.getOrDefault(u.kind === "Army" ? "armyUpkeep" : "fleetUpkeep", 0), u.kind, u.men);
    return gold;
  };
  const wants = v.provinces
    .filter((x) => x.reported !== null && !v.goldSent.some((g) => g.province === x.province))
    .map((x) => ({ id: x.province, gold: x.owed + Math.max(0, 2 * need(x.province) - x.coffer), owed: x.owed }))
    .filter((x) => x.gold > 0 && (x.owed > 0 || need(x.id) > 0));
  for (const w of sortBy(wants, [(x: { owed: number }) => x.owed, desc(cmpNum)], [(x: { id: string }) => x.id, cmpStr])) {
    if (orders.length >= MostSends || spare - spent - w.gold < KeepSpare) break;
    orders.push(send(w.id, w.gold));
    spent += w.gold;
  }
  return { orders, spent };
}

/**
 * Whether a caravan of `grain` (and `gold`) can set out from a province of ours for `seasons` of road, there and back if
 * `both`: near, the treasury's checks decide; far, its coffer as last reported must hold its porters' pay and the gold
 * (the audit of #587: departures from far provinces with an empty coffer kept failing).
 */
export function fundedThere(x: ProvinceEconomyView, grain: number, gold: number, seasons: number, both: boolean): boolean {
  if (x.reported === null) return true;
  const pay = Math.max(1, Math.ceil((grain + Math.floor(gold / 10)) / EconomyData.caravanPayPer)) * Math.max(1, seasons) * (both ? 2 : 1);
  return x.coffer >= pay + gold;
}
