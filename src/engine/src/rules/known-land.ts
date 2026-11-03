/**
 * What a court knows of the land (split from views.ts): where it sees as things are, and elsewhere the walls and the
 * holders as word of them last reached it. Read by the seat's view (Views) and by the order checks, so the two agree.
 */
import { Dict, HSet } from "../core/collections.ts";
import { StartWalls, type WorldMap } from "../model/map.ts";
import type { Power } from "../model/power.ts";
import { newKnown, newSiege, ownedBy, type GameState, type Known, type Siege } from "../model/state.ts";
import { wordSeasons } from "../model/travel.ts";
import { courierSeasons, courtOf } from "./court.ts";
import { knownLevel, ownWorks } from "./province-reports.ts";

/**
 * Provinces a power can see units in: its own lands, where its units stand, and next to any of those. A spy watching a
 * province adds nothing live: its reports travel home by road like any other (item 9, answering item 7b's review), and
 * bring the troops it saw and who held the land when it wrote.
 */
export function sight(s: GameState, map: WorldMap, p: Power): HSet<string> {
  // Item 13 ("Distance inside your own realm"): what a king sees as current is what a courier could bring him within the
  // season; his land and troops farther off he knows by their last report ({@link knownHolders}, the units' own reports).
  const court = courtOf(s, map, p);
  const near = (x: string): boolean => courierSeasons(s, map, court, x) === 0;
  const core = new HSet<string>(ownedBy(s, p).filter(near));
  for (const u of s.units) if (u.power === p && near(u.province)) core.add(u.province);
  const all = new HSet<string>(core);
  for (const id of core) for (const n of map.neighbors(id)) all.add(n);
  return all;
}

/**
 * The walls as a court knows them, by province (a province with none left out): those standing now where it can see
 * troops ({@link sight}), and of the cities it knows it holds, its own works as its view shows them (bug #540: farther
 * off, as last reported, `ownWorks`); elsewhere as it last saw them (GameState.wallsSeen; at the start, as the map gives
 * them).
 */
export function wallsKnown(s: GameState, map: WorldMap, p: Power, seen: HSet<string> | null = null): Dict<string, number> {
  const sightNow = seen ?? sight(s, map, p);
  const last = s.wallsSeen.tryGet(p);
  const known = last !== undefined ? last.clone() : new Dict<string, number>([...StartWalls.entries()].filter(([, v]) => v > 0));
  const holders = knownHolders(s, map, p, sightNow);
  const own = ownWorks(s, map, p, sightNow, holders);
  for (const x of map.landProvinces) {
    const level = own.has(x.id) ? knownLevel(own, "Walls", x.id) : sightNow.has(x.id) ? s.walls.getOrDefault(x.id, 0) : null;
    if (level === null) continue;
    if (level > 0) known.set(x.id, level);
    else known.delete(x.id);
  }
  return known;
}

/** Who held a province after a turn's moves, by the log of changes (GameState.ownerLog); at the start, its homeland's king. */
export function ownerAt(s: GameState, map: WorldMap, province: string, turn: number): Power | null {
  let o = map.get(province).home;
  for (const c of s.ownerLog) if (c.province === province && c.turn <= turn) o = c.owner;
  return o;
}

/** What a court knows was so of a province it did not see itself: word of it, from its land, reaches the court that late. */
export const WordSource = "word from abroad";
export const SeenSource = "seen";

/**
 * Who a court knows holds each land province, with the season it was so and where the knowledge came from (build order
 * item 7b, "Hidden by default"): what it sees now ({@link sight}), as it is; elsewhere the newest of what word has brought
 * (the holder as of the newest season whose word from there, setting out then, has reached the court by now) and what its own people
 * saw or brought home (GameState.known).
 */
export function knownHolders(s: GameState, map: WorldMap, p: Power, seen: HSet<string> | null = null): Dict<string, Known> {
  const sightNow = seen ?? sight(s, map, p);
  const stored = s.known.tryGet(p);
  const court = courtOf(s, map, p);
  const out = new Dict<string, Known>();
  for (const x of map.landProvinces) {
    if (sightNow.has(x.id)) {
      out.set(x.id, newKnown({ owner: s.owner.getOrDefault(x.id, null), turn: s.turn, source: SeenSource }));
      continue;
    }
    // The newest season whose word, setting out then, has arrived by now (as word of a fall is timed: TurnEngine.word).
    let asOf = 0;
    for (let d = s.turn - 1; d >= Math.max(1, s.turn - 6); d--)
      if (d + wordSeasons(s.config.travelDays, map, x.id, court, d) <= s.turn) {
        asOf = d;
        break;
      }
    let best = newKnown({ owner: ownerAt(s, map, x.id, asOf), turn: asOf, source: WordSource });
    const own = stored?.tryGet(x.id);
    if (own !== undefined && own.turn > best.turn) best = own;
    out.set(x.id, best);
  }
  return out;
}

/**
 * The sieges a court knows of (bug #517): where it sees, as they are; one of its own cities, or of its own armies, farther
 * off from when word of its beginning, setting out the season it began, reaches the court until word of its end does
 * (GameState.siegesEnded keeps those ended lately), its progress as of the newest season whose word has come
 * (Siege.history). One it cannot see otherwise it does not know of.
 */
export function siegesKnown(s: GameState, map: WorldMap, p: Power, seen: HSet<string> | null = null): Siege[] {
  const sightNow = seen ?? sight(s, map, p);
  const court = courtOf(s, map, p);
  const heard = (province: string, turn: number): boolean => turn + wordSeasons(s.config.travelDays, map, province, court, turn) <= s.turn;
  // The progress word last brought: as of the newest season since it began whose word has come.
  const reported = (x: { province: string; since: number; progress: number; history: number[] }, until: number): number => {
    for (let d = until; d >= x.since; d--) if (heard(x.province, d)) return x.history[d - x.since] ?? x.progress;
    return 0;
  };
  const mine = (power: Power, holder: Power | null): boolean => power === p || holder === p;
  const standing = s.sieges
    .filter((x) => sightNow.has(x.province) || (mine(x.power, s.owner.getOrDefault(x.province, null)) && heard(x.province, x.since)))
    .map((x) => (sightNow.has(x.province) ? x : { ...x, progress: reported(x, s.turn - 1) }));
  const ended = s.siegesEnded
    .filter((e) => !sightNow.has(e.province) && mine(e.power, e.holder) && heard(e.province, e.since) && !heard(e.province, e.ended))
    .filter((e) => !standing.some((x) => x.province === e.province))
    .map((e) => newSiege({ province: e.province, power: e.power, progress: reported(e, e.ended), since: e.since }));
  return [...standing, ...ended];
}
