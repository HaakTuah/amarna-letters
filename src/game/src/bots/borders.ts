/**
 * The script kings' people across borders and in their hands (build order item 10+b): they settle the loose men of a
 * province of theirs where the land has room and feeds its people, send back the runaways of a king they promised it on a
 * sealed tablet (the clause fugitives, which they write into their peace and alliance tablets with neighbours), deport
 * people from land they took that is at risk (a foreign army next to it, none of theirs to hold it) to their homeland
 * where it has room (the land may be lost, the people moved are kept), and put the mouths that cannot fight out of a besieged city of theirs once its stores run low. `--no-border-play`
 * and `--border-play-half` leave all of it alone, only to measure what playing it is worth. Every number below is a first
 * guess of the script's own.
 */
import { LandData, WorldMap, cheapestRoute, clause, legPoints, seasonOfTurn, cmpStr, deport, expel, returnRunaways, sortBy, welcome, type Clause, type Order, type Power, type SeatView } from "@amarna/engine";
import type { Board } from "./board.ts";
import { SeasonPlay } from "./land.ts";

/** Script kings that leave item 10+b's choices alone (`--no-border-play`, `--border-play-half`). None by default. */
export const BorderPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The fewest people worth an order: settling, sending back or deporting fewer is not worth the scribes. */
const Worth = 500;

/** Seasons of its town's need a besieged city's stores must still hold before its king puts the mouths out. */
const ExpelBelow = 2;

/** The kings we promised, on a sealed tablet, to send back their runaways (the clause fugitives, written by either). */
export function fugitivePartners(v: SeatView): Set<Power> {
  const out = new Set<Power>();
  for (const t of v.tablets) {
    if (t.sealedTurn === null || !t.seals.includes(v.power) || t.seals.length < 2 || t.authResult?.includes("forgery") === true) continue;
    const other = t.seals.find((x) => x !== v.power);
    if (other !== undefined && t.clauses.some((c) => c.kind === "fugitives")) out.add(other);
  }
  return out;
}

/** The clause fugitives, written into a peace or an alliance with a king whose land borders ours. */
export function fugitiveRights(b: Board, to: Power): Clause[] {
  if (!BorderPlay.on(b.me)) return [];
  const W = WorldMap.default;
  const borders = b.v.provinces.some((x) => W.movesFrom("Army", x.province).some((n) => b.ownerOf(n) === to));
  return borders ? [clause("fugitives")] : [];
}

/** The season's orders for people: settle, send back, deport, put out. */
export function peopleAcrossBorders(b: Board, orders: Order[]): void {
  const v = b.v;
  if (!BorderPlay.on(b.me)) return;
  const W = WorldMap.default;
  const promised = fugitivePartners(v);
  const besieged = new Set(v.sieges.filter((s) => s.holder === b.me).map((s) => s.province));
  for (const x of sortBy([...v.provinces], [(y) => y.province, cmpStr])) {
    // Runaways of a king we promised to return them to go back first; the rest of the loose are settled where there is room
    // and the land fed its people last season.
    let loose = x.loose;
    for (const [k, n] of sortBy([...x.runaways.entries()], [([q]) => q, cmpStr]))
      if (promised.has(k as Power) && n >= Worth) {
        orders.push(returnRunaways(x.province, k as Power));
        loose -= n;
      }
    if (!besieged.has(x.province) && x.fed >= 1000 && loose >= Worth && x.room - x.settled >= Worth) orders.push(welcome(x.province));
    // A besieged city of ours whose stores will not last: as many of the mouths that cannot fight go out as make them last
    // `ExpelBelow` seasons (item 11a+: the king chooses how many), a tenth at least; none once the most are out.
    if (besieged.has(x.province) && x.expelled < LandData.expelMost && x.need > 0 && x.stores < ExpelBelow * x.need)
      orders.push(SeasonPlay.on(b.me) ? expel(x.province, Math.min(90, Math.max(10, 100 - Math.floor((x.stores * 100) / (ExpelBelow * x.need))))) : expel(x.province));
  }
  // Deportation: from land we took (not our homeland) that a foreign army stands next to, and so may be lost, to the
  // homeland province with the most room near it: the people moved are kept whatever becomes of the land.
  const home = v.provinces.filter((x) => W.get(x.province).home === b.me && !besieged.has(x.province) && x.room - x.settled >= 2 * Worth);
  // At risk: a foreign army next to it, and none of ours in it or next to it to hold it.
  const near = (id: string, mine: boolean): boolean => [id, ...W.movesFrom("Army", id)].some((n) => v.units.some((u) => u.province === n && (u.power === b.me) === mine && u.kind === "Army"));
  const threatened = (id: string): boolean => near(id, false) && !near(id, true);
  const taken = sortBy(
    v.provinces.filter((x) => W.get(x.province).home !== b.me && !besieged.has(x.province) && x.settled >= 4 * Worth && threatened(x.province)),
    [(y) => -y.settled, (a: number, c: number) => a - c],
    [(y) => y.province, cmpStr],
  );
  const filled = new Map<string, number>();
  for (const x of taken) {
    // Not by a road where troops that would free them stand (item 11a+): the land's own king's, or a king's who closed his
    // roads to us, as far as we see them.
    const homeland = W.get(x.province).home;
    const freer = (k: Power): boolean => k !== b.me && (k === homeland || v.roadsClosedToUs.includes(k));
    const safe = (y: { province: string }): boolean =>
      !SeasonPlay.on(b.me) ||
      (cheapestRoute(W, x.province, y.province, (a, c) => legPoints(W, a, c, seasonOfTurn(v.turn)))?.route ?? []).every((p) => !v.units.some((u) => u.province === p && freer(u.power)));
    const to = sortBy(
      home.filter((y) => W.hops(x.province, y.province) <= 4 && safe(y)),
      [(y) => -(y.room - y.settled - (filled.get(y.province) ?? 0)), (a: number, c: number) => a - c],
      [(y) => y.province, cmpStr],
    )[0];
    if (to === undefined) continue;
    const room = to.room - to.settled - (filled.get(to.province) ?? 0);
    // A quarter of its people a season at most, and only as many as the homeland province can take.
    const n = Math.min(room, Math.floor(x.settled / 4));
    if (n < Worth) continue;
    orders.push(deport(x.province, to.province, n, true));
    filled.set(to.province, (filled.get(to.province) ?? 0) + n);
  }
}
