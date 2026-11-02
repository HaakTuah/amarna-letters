/**
 * The improvement audit's script-king finds (31 October 2026, `docs/rounds/2026-10-31-improvement-audit.md`), built in
 * item 17++, part C: a rich king with idle men raises troops (find 3); a king threatens only what he can make good, an
 * army of his in or beside the threatened land and strength enough to match it (find 3b); and a king takes back the
 * governorship of a man whose province brings in far less than the king's own count of it says it should (find 4's
 * script side). `--no-audit-play` and `--audit-play-half` play as before, only to measure what they are worth.
 */
import { cmpStr, sortBy, unseat, type GovernorView, type HSet, type Order, type Power } from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";

/** Script kings that play as before the audit's finds (`--no-audit-play`, `--audit-play-half`). None by default. */
export const AuditPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** Whether `b`'s king could march on `to` now: an army of his in or beside its land, and strength enough to match it. */
export function canMarchOn(b: Board, to: Power): boolean {
  if (b.strength(b.me) < 0.9 * b.strength(to)) return false;
  const theirs = new Set([...b.v.owner].filter(([, o]) => o === to).map(([x]) => x));
  return b.mine.some((u) => u.kind === "Army" && (theirs.has(u.province) || Board.Map.neighbors(u.province).some((n) => theirs.has(n))));
}

/** Seasons running a governor's own report must call his land restless before his king recalls him (a first guess). */
const RecallAfter = 2;

/**
 * The audit's find 4, the script side: a king takes back the governorship of a man whose own reports have called his land
 * restless or near revolt two seasons running, while no foreign army stands in or beside it to explain it, and who raised
 * no levies there to turn with. What a seat can see of a governor is his word and its own counts (the gold of a province
 * arrives summed with the rest of the realm's), so his own words are the evidence.
 */
export function unseatOrders(b: Board, brain: Brain, orders: Order[], busy: HSet<string>): void {
  const v = b.v;
  if (!AuditPlay.on(b.me)) return;
  const foes = new Set(b.others.filter((u) => u.kind === "Army").map((u) => u.province));
  for (const g of sortBy([...v.governors], [(x: GovernorView) => x.province, cmpStr])) {
    if (g.relieving || g.raised > 0 || busy.has(g.character) || v.owner.getOrDefault(g.province, null) !== b.me) continue;
    if (brain.alarmed.getOrDefault(g.province, 0) < RecallAfter) continue;
    if (foes.has(g.province) || Board.Map.neighbors(g.province).some((n) => foes.has(n))) continue;
    orders.push(unseat(g.province));
    busy.add(g.character);
    return;
  }
}
