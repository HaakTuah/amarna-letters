/**
 * Occupation (item 17++a, "something happens every season"): since item 17++ a province changes hands only by whom it
 * obeys (`turn/unrest.ts`): the force of the troops standing in it, against its own men, plus the love its people bear
 * them, must clear its holder's by the margin, and the holder's love fades a tenth a season. Moving in takes nothing by
 * itself. A script king reckons from his own view whether a province would obey an army of his standing there, and how
 * many seasons that would take: its men from the resistance its people put up against him (`SeatView.resistance`, which
 * counts them by the ground as obedience does), their love for their holder as the rules start it (high in his own
 * homeland, lower in land he took), lowered by what governors, spies and travellers last said of their mood, and fading
 * while we stand there; the holder's troops next door weigh against us. He values an attack by it, pictures only land
 * that would obey as won, and keeps an army standing in land it entered until the land obeys. `--no-occupy-play` and
 * `--occupy-play-half` turn this off, only to measure what it is worth.
 */
import { LandData, UnrestData, terrainOf, type Power } from "@amarna/engine";
import { Board } from "./board.ts";

/** Script kings that do not reckon whether land would obey them (`--no-occupy-play`, `--occupy-play-half`). None by default. */
export const OccupyPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The most seasons an army stands in land waiting for it to obey (a first guess). */
export const OccupyMost = 6;

/** Seasons a read of a province's mood is believed (a first guess). */
const MoodHeeded = 6;

/** The holder's love a mood read suggests, with nobody else's troops there: "uneasy" a little, "restless" or worse none. */
function loveFromMood(b: Board, id: string): number | null {
  let best: number | null = null;
  for (const r of b.v.moods) {
    if (r.province !== id || b.v.turn - r.seen > MoodHeeded) continue;
    const love = r.mood === "uneasy" ? 25 : r.mood === "restless" || r.mood === "near revolt" ? 0 : null;
    if (love !== null && (best === null || love < best)) best = love;
  }
  return best;
}

/** The ground's weight on a land's men, as obedience and resistance both count it. */
const groundTimes = (id: string): number => {
  const t = terrainOf(id);
  return t === "Rough" ? 2 : t === "Open" ? 0.5 : 1;
};

/**
 * The seasons an army of `men` standing in `id` (marching in from `from`) would wait before the province obeys us (0: at the season's reckoning
 * after it arrives), or Infinity if not within {@link OccupyMost}. Only from the seat's view.
 */
export function obeyIn(b: Board, id: string, men: number, from: string = id): number {
  let seen = reckoned.get(b);
  if (seen === undefined) reckoned.set(b, (seen = new Map()));
  const key = `${id}:${men}:${from}`;
  let t = seen.get(key);
  if (t === undefined) seen.set(key, (t = reckon(b, id, men, from)));
  return t;
}

/** Each board's reckonings, since the look-ahead asks the same ones many times. */
const reckoned = new WeakMap<Board, Map<string, number>>();

function reckon(b: Board, id: string, men: number, from: string): number {
  const p = Board.Map.get(id);
  if (p.isSea) return Infinity;
  const holder = b.ownerOf(id);
  if (holder === b.me) return 0;
  // Land without a ruler obeys any troops that stand within it.
  if (holder === null) return 0;
  // Love as the rules start it, the homeland's fading from the first season toward what land merely held keeps.
  let love: number = p.home === holder ? Math.max(UnrestData.held, UnrestData.home * Math.pow(1 - UnrestData.fade / 100, b.v.turn - 1)) : UnrestData.held;
  const mood = loveFromMood(b, id);
  if (mood !== null) love = Math.min(love, mood);
  // Its men, from the resistance its people put up against us at that love (counted by the ground, as obedience counts them).
  const hostility = Math.min(200, Math.max(1, 100 + love / 2));
  const res = b.v.resistance.tryGet(id) ?? 0;
  const walled = (b.v.walls.tryGet(id) ?? 0) > 0;
  const own = Math.max(1, (res * LandData.armyMen) / (10 * hostility)) * (walled ? groundTimes(id) : 1);
  // Troops next door weigh a quarter, at most `nearMost`: the holder's against us, ours (but the army that goes in) with us.
  const next = new Set(Board.Map.neighbors(id));
  const nearOf = (x: Power): number => {
    const near = b.units.filter((u) => u.power === x && u.kind === "Army" && u.province !== from && next.has(u.province)).reduce((s, u) => s + u.men, 0);
    return Math.min(UnrestData.nearMost, (UnrestData.force * near) / (4 * own));
  };
  const force = Math.min(UnrestData.forceMost, (UnrestData.force * men) / own + nearOf(b.me));
  const against = nearOf(holder);
  for (let t = 0; t <= OccupyMost; t++) {
    love -= Math.max(1, love / 10);
    if (force > against + Math.max(0, love) + UnrestData.margin) return t;
  }
  return Infinity;
}

/** What a province we would take is worth to us by whether it would obey: all of it at once, less the longer we wait, nothing if never. */
export function obeyShare(b: Board, id: string, men: number, from: string): number {
  if (!OccupyPlay.on(b.me)) return 1;
  const t = obeyIn(b, id, men, from);
  return Number.isFinite(t) ? Math.pow(0.9, t) : 0;
}

/** Whether `p`'s army standing in `id` would hold it in the look-ahead's picture: our own only where the land would obey. */
export function picturedHeld(b: Board, id: string, p: Power, men: number): boolean {
  return p !== b.me || !OccupyPlay.on(b.me) || Number.isFinite(obeyIn(b, id, men));
}
