/**
 * The script kings' grants of kingship (build order item 17++, part C; "Governors": "Whether a grant pays is the king's own
 * sum"). A script king makes a governor of his king over the provinces he governs only where the tribute he would ask
 * nets more than keeping the land: what the land yields him a year, less what a share hides of it at his count's age and
 * the land's distance, and halved where his governor writes it restless or its countryside went hungry (the risk of
 * losing it). He asks three quarters of what the land yields a year, since a local king, credited by his people, draws
 * more from it than a far overlord. Never where his own army stands (its weight would take the land back), never his
 * court's city. `--no-grant-play` and `--grant-play-half` never grant, only to measure what granting is worth.
 */
import { cmpStr, crown, hiddenPercent, sortBy, type HSet, type Order } from "@amarna/engine";
import { Board } from "./board.ts";
import { restless } from "./freedom.ts";
import { courierSeasonsFrom, knownWays } from "./works.ts";

/** Script kings that never grant a kingship (`--no-grant-play`, `--grant-play-half`). None by default. */
export const GrantPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The tribute a script king asks of a land he grants, in quarters of what it yields a year (first guess). */
const TributeQuarters = 3;
/** Seasons a governor has held his land before his king would crown him. */
const CrownAfter = 4;

/** At most one grant a season: the most valuable to give away first. */
export function crownOrders(b: Board, orders: Order[], busy: HSet<string>): void {
  const v = b.v;
  if (!GrantPlay.on(b.me)) return;
  const unquiet = new Set(restless(b));
  const far = courierSeasonsFrom(v, knownWays(v));
  const byMan = new Map<string, string[]>();
  for (const g of v.governors) {
    if (g.relieving || g.from > v.turn - CrownAfter || busy.has(g.character) || v.crowning.includes(g.character)) continue;
    if (v.owner.getOrDefault(g.province, null) !== b.me || g.province === v.courtAt) continue;
    byMan.set(g.character, [...(byMan.get(g.character) ?? []), g.province]);
  }
  let best: { character: string; provinces: string[]; tribute: number; gain: number } | null = null;
  for (const [character, provinces] of sortBy([...byMan], [([c]: [string, string[]]) => c, cmpStr])) {
    if (provinces.some((x) => b.mine.some((u) => u.province === x))) continue;
    let keep = 0;
    let yields = 0;
    for (const x of provinces) {
      const e = v.provinces.find((y) => y.province === x);
      if (e === undefined) continue;
      const year = 4 * e.tax;
      const hidden = hiddenPercent(e.counted === null ? null : v.turn - e.counted, (far.get(x)?.seasons ?? 0) + 1);
      const risky = unquiet.has(x) || e.fed < 1000;
      keep += Math.floor((Math.floor((year * (100 - hidden)) / 100) * (risky ? 1 : 2)) / 2);
      yields += year;
    }
    const tribute = Math.round((yields * TributeQuarters) / 4 / 5) * 5;
    if (tribute <= keep || tribute <= 0) continue;
    if (best === null || tribute - keep > best.gain) best = { character, provinces, tribute, gain: tribute - keep };
  }
  if (best === null) return;
  orders.push(crown(best.character, best.provinces, best.tribute));
  busy.add(best.character);
}
