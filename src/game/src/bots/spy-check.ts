/**
 * A governor's word checked against the king's own spy (#459, queued into item 17++ part C; the owner, 2 November 2026:
 * "Yes, expertly to both!"). A governor who wants his province for himself may write that its people are quiet while they
 * are not; a spy watching it reports their mood as he hears it. Where the spy finds them restless or near revolt and the
 * governor's own report, the newest word the court has of them, calls them quiet, the script king treats the province as
 * restless and stops trusting that governor: he takes the governorship back, unless foreign troops in or beside it would
 * explain a quiet report's lag. `--no-spy-check-play` and `--spy-check-play-half` read the governor alone, only to measure
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

const bad = (mood: string): boolean => mood.startsWith("restless") || mood.startsWith("near revolt");

/** Whether a spy's report says the people of `name` are restless or near revolt under `me`. */
function spyFinds(m: InboxItem, name: string, me: string): boolean {
  const lead = `The people of ${name} are `;
  const at = m.body.indexOf(lead);
  if (at < 0) return false;
  const rest = m.body.slice(at + lead.length);
  return bad(rest) && rest.slice(0, rest.indexOf(".") < 0 ? rest.length : rest.indexOf(".")).endsWith(` under ${me}`);
}

/**
 * The provinces of ours under a governor whose word hides what our spy finds: a spy's report this season finds the people
 * restless or near revolt, while the newest word the court has of them is the governor's own report (sent every season,
 * `SeatView.moods`), and it says they are quiet. Being the newest, his report was seen no earlier than the spy's, so an
 * honest governor of land that calmed by one step between them is not caught; an old letter, or one from a governor
 * before him, never counts.
 */
export function hidden(b: Board): string[] {
  const v = b.v;
  if (!SpyCheckPlay.on(b.me)) return [];
  const out: string[] = [];
  for (const g of sortBy([...v.governors], [(x: GovernorView) => x.province, cmpStr])) {
    if (g.from > v.turn) continue;
    const name = Board.Map.get(g.province).name;
    if (!v.inbox.some((m) => m.kind === "SpyReport" && spyFinds(m, name, b.me))) continue;
    const word = v.moods.find((x) => x.province === g.province);
    if (word !== undefined && word.source === "governor" && word.mood === "quiet") out.push(g.province);
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
