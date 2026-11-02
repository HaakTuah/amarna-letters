/**
 * What a court knows of the land (split from views.ts): where it sees as things are, and elsewhere the walls and the
 * holders as word of them last reached it. Read by the seat's view (Views) and by the order checks, so the two agree.
 */
import { Dict, HSet } from "../core/collections.ts";
import { StartWalls, type WorldMap } from "../model/map.ts";
import type { Power } from "../model/power.ts";
import { newKnown, ownedBy, type GameState, type Known } from "../model/state.ts";
import { wordSeasons } from "../model/travel.ts";
import { courierSeasons, courtOf } from "./court.ts";

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
 * troops ({@link sight}), and elsewhere as it last saw them (GameState.wallsSeen; at the start, as the map gives them).
 */
export function wallsKnown(s: GameState, map: WorldMap, p: Power, seen: HSet<string> | null = null): Dict<string, number> {
  const sightNow = seen ?? sight(s, map, p);
  const last = s.wallsSeen.tryGet(p);
  const known = last !== undefined ? last.clone() : new Dict<string, number>([...StartWalls.entries()].filter(([, v]) => v > 0));
  for (const id of sightNow) {
    const level = s.walls.tryGet(id);
    if (level !== undefined) known.set(id, level);
    else known.delete(id);
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
