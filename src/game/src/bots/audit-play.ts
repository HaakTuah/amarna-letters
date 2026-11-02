/**
 * The improvement audit's script-king finds (31 October 2026, `docs/rounds/2026-10-31-improvement-audit.md`), built in
 * item 17++, part C: a rich king with idle men raises troops (find 3); a king threatens only what he can make good, an
 * army of his in or beside the threatened land and strength enough to match it (find 3b); and a king takes back the
 * governorship of a man whose province brings in far less than the king's own count of it says it should (find 4's
 * script side). `--no-audit-play` and `--audit-play-half` play as before, only to measure what they are worth.
 */
import { cmpNum, cmpStr, sortBy, unseat, type GovernorView, type HSet, type Order, type Power } from "@amarna/engine";
import { Board } from "./board.ts";

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

/** Seasons within which a governor's last two letters must both call his land restless before his king recalls him. */
const RecallWithin = 6;

/**
 * The audit's find 4, the script side: a king takes back the governorship of a man whose last two letters both call his
 * land restless or near revolt, while no foreign army stands in or beside it to explain it, and who raised no levies there
 * to turn with. What a seat can see of a governor is his letters and its own counts (the gold of a province arrives summed
 * with the rest of the realm's), so his own words are the evidence.
 */
export function unseatOrders(b: Board, orders: Order[], busy: HSet<string>): void {
  const v = b.v;
  if (!AuditPlay.on(b.me)) return;
  const said = new Map<string, { turn: number; bad: boolean }[]>();
  for (const m of v.inbox) {
    if (m.title !== "Your governor writes" || m.turn < v.turn - RecallWithin) continue;
    const x = /governor of (.+?), writes that its people are (quiet|uneasy|restless|near revolt)/.exec(m.body);
    const p = x !== null ? Board.Map.provinces.find((q) => q.name === x[1]) : undefined;
    if (p === undefined) continue;
    said.set(p.id, [...(said.get(p.id) ?? []), { turn: m.turn, bad: x![2] === "restless" || x![2] === "near revolt" }]);
  }
  const foes = new Set(b.others.filter((u) => u.kind === "Army").map((u) => u.province));
  for (const g of sortBy([...v.governors], [(x: GovernorView) => x.province, cmpStr])) {
    if (g.relieving || g.raised > 0 || busy.has(g.character) || v.owner.getOrDefault(g.province, null) !== b.me) continue;
    const last = sortBy(said.get(g.province) ?? [], [(x: { turn: number }) => -x.turn, cmpNum]).slice(0, 2);
    if (last.length < 2 || !last.every((x) => x.bad)) continue;
    if (foes.has(g.province) || Board.Map.neighbors(g.province).some((n) => foes.has(n))) continue;
    orders.push(unseat(g.province));
    busy.add(g.character);
    return;
  }
}
