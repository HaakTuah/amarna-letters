/**
 * A script king and his commanders (build order item 13, "Generals lead armies", "Standing orders belong to commanders",
 * "Army mandates"): he grants command of his armies away from his court to the people he has at court, keeping one for
 * his letters, the largest army farthest from him first; he gives each army he commands at a distance a mandate to fall
 * back on when his orders cannot reach it in time (to guard where it stands, or to press the siege it lays); and he takes
 * the command back from one whose record shows him losing. He cannot see a man's competence, only what he has done.
 */
import {
  HSet,
  cmpNum,
  cmpStr,
  bandCost,
  command,
  enlist,
  govern,
  moveCourt,
  mandateOrder,
  newMandate,
  relieve,
  sortBy,
  type CharacterView,
  type Order,
  type UnitView,
} from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";

/** Script kings grant commands and give mandates (`--no-command-play`), or half of them leave it (`--command-play-half`). */
export const CommandPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** A commander whose battles lost run this far ahead of those won is relieved (a first guess of the bots). */
const LosingRecord = 2;

/** The orders of command for the season: grants, mandates and recalls. `busy` holds the people already given a task. */
export function commandOrders(b: Board, _brain: Brain, orders: Order[], busy: HSet<string>): void {
  if (!CommandPlay.on(b.me)) return;
  const v = b.v;
  const court = v.courtAt !== "" ? v.courtAt : Board.Map.capital(b.me).id;
  const mine = sortBy([...b.mine], [(u: UnitView) => u.province, cmpStr]);
  const byId = new Map<string, CharacterView>(v.court.map((c) => [c.id, c] as const));
  // Recall one whose record shows him losing.
  for (const u of mine) {
    if (u.commander === null || u.relieving) continue;
    const c = byId.get(u.commander);
    if (c !== undefined && c.lost - c.won >= LosingRecord) orders.push(relieve(u.province));
  }
  // Grant command of the largest army away from the court that has nobody, to a person at court with no errand, keeping
  // at least one there for the king's letters.
  const ready = sortBy(
    v.court.filter((c) => c.ours && c.ready && !busy.has(c.id) && (c.errandWhat === null || c.errandDone || c.errandWhat === "stay")),
    [(c: CharacterView) => c.lost - c.won, cmpNum],
    [(c: CharacterView) => c.id, cmpStr],
  );
  const leaderless = sortBy(
    mine.filter((u) => u.commander === null && u.province !== court && u.men >= 500),
    [(u: UnitView) => -u.men, cmpNum],
    [(u: UnitView) => u.province, cmpStr],
  );
  if (ready.length >= 2 && leaderless.length > 0) {
    const c = ready[0];
    orders.push(command(leaderless[0].province, c.id));
    busy.add(c.id);
  }
  // A mandate for each commanded army that has none, or whose task no longer fits: press the siege it lays, else guard where
  // it stands, engaging only with the advantage and falling back if outnumbered.
  for (const u of mine) {
    if (u.commander === null) continue;
    const besieging = v.sieges.some((x) => x.province === u.province && x.besieger === b.me);
    const want = besieging
      ? newMandate({ task: "besiege", target: u.province, engage: "advantage", withdraw: "outnumbered" })
      : newMandate({ task: "guard", target: null, engage: "advantage", withdraw: "outnumbered" });
    const has = u.mandate;
    if (has !== null && has.task === want.task && has.target === want.target) continue;
    orders.push(mandateOrder(u.province, want));
  }
}

/**
 * A script king's court (item 13, "The capital is wherever the king is"): when the city he sits in has been besieged two
 * seasons or more, he moves his court to a walled city of his own that no foreign troops stand in or next to, the
 * farthest from the besiegers, so that the city's fall is not his own. Otherwise he stays where he is.
 */
export function courtMove(b: Board, _brain: Brain, orders: Order[]): void {
  if (!CommandPlay.on(b.me)) return;
  const v = b.v;
  if (v.courtTo !== null) return;
  const at = v.courtAt;
  const siege = v.sieges.find((x) => x.province === at && x.holder === b.me);
  if (siege === undefined || v.turn - siege.since < 2) return;
  const foes = b.others.map((u) => u.province);
  const safe = sortBy(
    [...v.owner]
      .filter(([x, o]) => o === b.me && x !== at && v.walls.getOrDefault(x, 0) > 0)
      .map(([x]) => x)
      .filter((x) => !foes.includes(x) && !Board.Map.neighbors(x).some((n) => foes.includes(n)) && !v.sieges.some((s) => s.province === x)),
    [(x: string) => -Board.Map.hops(at, x), cmpNum],
    [(x: string) => x, cmpStr],
  );
  if (safe.length > 0) orders.push(moveCourt(safe[0]));
}

/**
 * A script king's governors (item 13, "Governors"): a former ruler standing at his court is granted his old city back as
 * its governor (item 11d's "a governorship, a privilege"); and, while he keeps one person at court for his letters, he
 * grants the governorship of the province of his own most threatened by foreign armies beside it, away from his court and
 * with nobody governing it, allowing two levies there. He recalls a governor whose province yields less than it should
 * only by what he hears: the bots see no skimming, so they keep their governors.
 */
export function governorOrders(b: Board, _brain: Brain, orders: Order[], busy: HSet<string>): void {
  if (!CommandPlay.on(b.me)) return;
  const v = b.v;
  const governed = new Set(v.governors.map((g) => g.province));
  const mine = [...v.owner].filter(([, o]) => o === b.me).map(([x]) => x);
  // A former ruler at our court gets his city back.
  for (const c of v.known.filter((c) => c.status === "free" && c.where === "at your court" && !busy.has(c.id))) {
    const city = mine.find((x) => !governed.has(x) && c.knownFacts.some((f) => f.startsWith(`Ruled `) && f.includes(Board.Map.get(x).name)));
    if (city === undefined) continue;
    orders.push(govern(city, c.id, 1));
    busy.add(c.id);
    governed.add(city);
  }
  const ready = sortBy(
    v.court.filter((c) => c.ours && c.ready && !busy.has(c.id) && (c.errandWhat === null || c.errandDone || c.errandWhat === "stay")),
    [(c: CharacterView) => c.id, cmpStr],
  );
  if (ready.length < 2) return;
  const foes = b.others.filter((u) => u.kind === "Army").map((u) => u.province);
  const threatened = sortBy(
    mine.filter((x) => x !== v.courtAt && !governed.has(x) && !Board.Map.get(x).isSea && Board.Map.neighbors(x).some((n) => foes.includes(n))),
    [(x: string) => -Board.Map.neighbors(x).filter((n) => foes.includes(n)).length, cmpNum],
    [(x: string) => x, cmpStr],
  );
  if (threatened.length === 0) return;
  orders.push(govern(threatened[0], ready[0].id, 2));
  busy.add(ready[0].id);
}

/**
 * A script king hires bands as soldiers (item 13): at war, with gold to spare, he offers the chief of a band of a hundred
 * men or more, where an army of his stands with it under its commander or with him, twice what the men cost a season for
 * four seasons, and the chief's cut on top.
 */
export function enlistOrders(b: Board, brain: Brain, orders: Order[]): void {
  if (!CommandPlay.on(b.me) || brain.warTarget === null) return;
  const v = b.v;
  for (const x of sortBy(v.bands.filter((x) => x.men >= 100), [(x) => -x.men, cmpNum], [(x) => x.province, cmpStr])) {
    const u = b.mine.find((u) => u.province === x.province && u.kind === "Army");
    if (u === undefined) continue;
    const carried = v.courtAt === x.province || (u.commander !== null && u.commandFrom <= v.turn);
    if (!carried) continue;
    const term = 4;
    const fee = bandCost(x.men) * term * 3;
    if (v.gold < fee * 3) continue;
    orders.push(enlist(x.province, fee, term));
    return;
  }
}
