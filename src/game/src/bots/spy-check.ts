/**
 * A governor's word checked against the king's own spy (#459, queued into item 17++ part C; the owner, 2 November 2026:
 * "Yes, expertly to both!"). A governor who wants his province for himself may write that its people are quiet while they
 * are not; a spy watching it reports their mood as he hears it. Where the spy finds them restless or near revolt and the
 * governor's latest letter says otherwise (or he has written nothing of it), the script king treats the province as
 * restless and stops trusting that governor: he takes the governorship back, unless foreign troops in or beside it would
 * explain a quiet letter's lag. `--no-spy-check-play` and `--spy-check-play-half` read the governor alone, only to measure
 * what checking is worth.
 */
import { cmpStr, sortBy, unseat, type GovernorView, type HSet, type InboxItem, type Order } from "@amarna/engine";
import { Board } from "./board.ts";

/** Script kings that read their governor's word alone (`--no-spy-check-play`, `--spy-check-play-half`). None by default. */
export const SpyCheckPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** Seasons within which a spy's report counts against a governor's word. */
const CheckWithin = 4;

/** What a governor's letter says before the mood it reports. */
const Writes = ", writes that its people are ";

const bad = (mood: string): boolean => mood.startsWith("restless") || mood.startsWith("near revolt");

/** The mood a governor's letter gives for the land he names, read by position; null if the item is not one. */
function governorSaid(m: InboxItem): { name: string; bad: boolean } | null {
  if (m.title !== "Your governor writes") return null;
  const at = m.body.indexOf(Writes);
  const from = at < 0 ? -1 : m.body.lastIndexOf("governor of ", at);
  return from < 0 ? null : { name: m.body.slice(from + "governor of ".length, at), bad: bad(m.body.slice(at + Writes.length)) };
}

/** Whether a spy's report says the people of `name` are restless or near revolt under `me`. */
function spyFinds(m: InboxItem, name: string, me: string): boolean {
  const lead = `The people of ${name} are `;
  const at = m.body.indexOf(lead);
  if (at < 0) return false;
  const rest = m.body.slice(at + lead.length);
  return bad(rest) && rest.slice(0, rest.indexOf(".") < 0 ? rest.length : rest.indexOf(".")).endsWith(` under ${me}`);
}

/**
 * The provinces of ours under a governor whose spy, within the last seasons, found the people restless or near revolt
 * while the governor's latest letter on them says otherwise: what he hides.
 */
export function hidden(b: Board): string[] {
  const v = b.v;
  if (!SpyCheckPlay.on(b.me)) return [];
  const out: string[] = [];
  for (const g of sortBy([...v.governors], [(x: GovernorView) => x.province, cmpStr])) {
    const name = Board.Map.get(g.province).name;
    const spied = v.inbox.filter((m) => m.kind === "SpyReport" && m.turn >= v.turn - CheckWithin && spyFinds(m, name, b.me));
    if (spied.length === 0) continue;
    const letters = v.inbox.map((m) => [m, governorSaid(m)] as const).filter(([, x]) => x !== null && x.name === name);
    const latest = letters.length === 0 ? null : letters.reduce((a, x) => (x[0].turn >= a[0].turn ? x : a));
    if (latest === null || !latest[1]!.bad) out.push(g.province);
  }
  return out;
}

/** A governor caught hiding his people's unrest from his spy-checked king is recalled, unless foes stand in or beside it. */
export function spyCheckOrders(b: Board, orders: Order[], busy: HSet<string>): void {
  const v = b.v;
  const foes = new Set(b.others.filter((u) => u.kind === "Army").map((u) => u.province));
  for (const id of hidden(b)) {
    const g = v.governors.find((x) => x.province === id);
    if (g === undefined || g.relieving || busy.has(g.character) || v.owner.getOrDefault(id, null) !== b.me) continue;
    if (orders.some((o) => o.type === "unseat" && o.province === id)) continue;
    if (foes.has(id) || Board.Map.neighbors(id).some((n) => foes.has(n))) continue;
    orders.push(unseat(id));
    busy.add(g.character);
    return;
  }
}
