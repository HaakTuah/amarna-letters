/**
 * The music follows the state (item 19+++b): a heat, raised by what the seat knows and cooling with time, picks the mood,
 * as Civilization V's and Empire Earth's music follows the state of the game rather than each season's events (a season
 * watched at speed passes in under two seconds; the sounds and stings carry the events). The heat rises fast and cools
 * slow, in seasons and in seconds, whichever is slower, so the music feels the same watched at speed and played a season
 * at a time; each mood is harder to enter than to leave, a rise is heard at once, a fall waits out about 90 s and comes
 * one step at a time (item 19+++c: the hold holds back falls only). A siege heats less after its first few seasons. The
 * shade is read here too. Pure, the clock passed in, so it is tested and measured without a browser. Presentation only.
 */
import { UnrestData, isGreatKing, type Power } from "@amarna/engine";
import type { FrameMove, SeasonFrame } from "../session/frames.ts";
import { capitals, cuesAt, hostile, involves, owners, seen, sightOf, type Mood } from "./situation.ts";

/** How hot a season makes the music, at least (first guesses, for the owner's ear). */
export const Heat = {
  /** A real battle of the seat's own, its own land besieged; god view: a great battle between Great Kings, a Great King's capital besieged. */
  battle: 8,
  /** A siege the seat lays; god view: several Great Kings at war. */
  war: 5,
  /** Foreign troops in its land, troubled omens, unrest, rumours; god view: two Great Kings at war, a Great King's city besieged. */
  unease: 3,
  /** God view: a war of the city-states (they count little). */
  little: 1.5,
} as const;

/** God view: how many Great Kings fighting one another, over the last three seasons, make war, and how many unease. */
export const KingsAtWar = { war: 3, unease: 2 } as const;

/** What a skirmish with a city-state adds to the heat, a season, up to the war it may bring at most. */
export const Skirmish = { add: 1.5, most: Heat.war } as const;

/** The steps, low to high, and the heat to enter and to leave each: a step is harder to enter than to leave. */
export const Steps = [
  { name: "calm", enter: 0, leave: 0 },
  { name: "tension", enter: 2, leave: 1 },
  { name: "war", enter: 4, leave: 2.5 },
  { name: "battle", enter: 7, leave: 5 },
] as const;

/** The heat halves every so many seasons or seconds, whichever is slower. */
export const HalfLife = { seasons: 2, seconds: 30 } as const;

/** Seconds of play a mood holds before it falls; a rise is never held back. */
export const Hold = 90;

/** A siege older than this many seasons heats a step less (battle to war, war to unease, unease to little): it drags on. */
export const Drag = 3;

/** Seconds a clear event stays clear: long enough for the rise it brings to cross (crossing.ts, `Wait.rise`). */
const ClearFor = 12;

/** A battle is sizeable with this many units attacking, or this many in it on both sides, as far as the viewer saw. */
const Sizeable = { attacking: 2, all: 4 } as const;

/** How many seasons a fresh start (a jump, a change of eyes) reads back. */
const Lookback = 8;

/** What one season tells the music, from what the viewer knows of it. */
export interface Signal {
  /** The heat it raises the music to, at least. */
  heat: number;
  /** Heat it adds besides (skirmishes with city-states), up to `Skirmish.most`. */
  add: number;
  /** The top step's music, where the season reaches it: a battle, or a siege of the seat's own land. */
  top: "battle" | "siege" | null;
  /** Something clear in front of the viewer: a real battle of its own, its own capital attacked (a character: a fight or a siege where he is). A spectator's music rises at once only for this. */
  clear: boolean;
  /** The diviners read the omens of the end as grave: the last seasons, below war. */
  grave: boolean;
  ended: boolean;
}

/** Heat a step lower, for a siege that drags on. */
const eased = (h: number): number => (h >= Heat.battle ? Heat.war : h >= Heat.war ? Heat.unease : Heat.little);

/** How the heat of a siege is read: its full heat in its first few seasons, a step less after. */
export const siegeHeat = (h: number, f: SeasonFrame, s: { since: number }): number => (f.turn - s.since >= Drag ? eased(h) : h);

const grave = (f: SeasonFrame): boolean => f.omen === "Grave" || f.omen === "Borrowed" || f.omen === "Darkest";

/** A sizeable clash at a place held by `holder`, among the moves the viewer saw: most of the script kings' are one on one. */
export const sizeable = (moves: readonly FrameMove[], at: string, holder: Power | null): boolean =>
  moves.filter((m) => m.target === at && m.power !== holder).length >= Sizeable.attacking ||
  moves.filter((m) => m.target === at || m.from === at).length >= Sizeable.all;

/** Great Kings who fought another Great King this season (god view). */
function kingsAtWar(f: SeasonFrame): Set<Power> {
  const out = new Set<Power>();
  for (const m of f.moves) {
    if (!hostile(m) || !isGreatKing(m.power) || !isGreatKing(m.targetOwner!)) continue;
    out.add(m.power);
    out.add(m.targetOwner!);
  }
  return out;
}

/** A season that tells the music nothing yet: only the age's end and the diviners' omens. */
export function quietSignal(f: SeasonFrame | undefined): Signal {
  return { heat: 0, add: 0, top: null, clear: false, grave: f !== undefined && grave(f), ended: f !== undefined && f.ended };
}

/** Raises a signal's heat to at least `h`; a battle outranks a siege as the top step's music. */
export function raiseSignal(out: Signal, h: number, top: "battle" | "siege" | null = null): void {
  out.heat = Math.max(out.heat, h);
  if (top !== null && out.top !== "battle") out.top = top;
}

/** What a season tells the music, as the viewer knows it; god view (null) by the world's temperature. */
export function signalAt(frames: readonly SeasonFrame[], index: number, viewer: Power | null): Signal {
  const f = frames[index];
  const out = quietSignal(f);
  if (f === undefined) return out;
  const raise = (h: number, top: "battle" | "siege" | null = null): void => raiseSignal(out, h, top);
  if (f.omen === "Troubled") raise(Heat.unease);
  const moves = index > 0 ? seen(f, viewer) : [];
  if (viewer === null) {
    for (const m of moves) {
      if (!hostile(m)) continue;
      const kings = isGreatKing(m.power) && isGreatKing(m.targetOwner!);
      if (kings && sizeable(moves, m.target!, m.targetOwner)) raise(Heat.battle, "battle");
      else if (!kings) raise(Heat.little);
    }
    for (const s of f.sieges) {
      const holder = f.owner.get(s.province) ?? null;
      if (holder === null || !isGreatKing(holder) || holder === s.besieger) continue;
      const capital = capitals.some((c) => c.id === s.province && c.home === holder);
      raise(siegeHeat(capital ? Heat.battle : Heat.unease, f, s), capital ? "siege" : null);
    }
    // What changed the world (item 19+++c): a Great King's capital newly taken, a Great King fallen.
    const prev = frames[index - 1];
    if (prev !== undefined) {
      const was = owners(prev, null);
      const now = owners(f, null);
      if (capitals.some((c) => isGreatKing(c.home!) && (was.get(c.id) ?? null) !== (now.get(c.id) ?? null))) raise(Heat.battle, "siege");
      if ([...f.eliminated].some((p) => isGreatKing(p) && !prev.eliminated.has(p))) raise(Heat.battle, "siege");
    }
    // Several Great Kings at war: those who fought one another in the last three seasons.
    const kings = new Set<Power>();
    for (let k = index; k > Math.max(0, index - 3); k--) for (const p of kingsAtWar(frames[k])) kings.add(p);
    if (kings.size >= KingsAtWar.war) raise(Heat.war);
    else if (kings.size >= KingsAtWar.unease) raise(Heat.unease);
    return out;
  }
  const own = owners(f, viewer);
  const sight = sightOf(f, viewer)!;
  // Whose land a fight was in, and the capital it defends, as the seat knew them when the season began: a province it
  // took this season was not its own land, and one it lost this season was.
  const held = index > 0 ? owners(frames[index - 1], viewer) : own;
  const home = capitals.find((c) => c.home === viewer && held.get(c.id) === viewer)?.id ?? null;
  // Its own fights: a real battle (sizeable, against a Great King, or in its own land) is battle; a skirmish adds a little.
  for (const m of moves) {
    if (!(hostile(m) || m.destroyed) || !involves(m, viewer)) continue;
    const at = m.target ?? m.from;
    const foe: Power | null = m.power === viewer ? m.targetOwner : m.power;
    if (at === home && m.power !== viewer) out.clear = true;
    const real = (foe !== null && foe !== viewer && isGreatKing(foe)) || held.get(at) === viewer || sizeable(moves, at, m.targetOwner);
    if (real) {
      raise(Heat.battle, "battle");
      out.clear = true;
    } else out.add = Skirmish.add;
  }
  for (const s of f.sieges) {
    if (s.besieger === viewer) raise(siegeHeat(Heat.war, f, s));
    else if (own.get(s.province) === viewer && sight.has(s.province)) {
      raise(siegeHeat(Heat.battle, f, s), "siege");
      if (s.province === home && f.turn - s.since < Drag) out.clear = true;
    }
  }
  // Foreign troops standing in its land, as far as it can see.
  if (f.units.some((u) => u.power !== viewer && own.get(u.province) === viewer && sight.has(u.province))) raise(Heat.unease);
  // Its own people's mood it knows (in words); restless well short of rising is unease enough.
  for (const [p, u] of f.unrest) if (u >= UnrestData.threshold * 0.6 && own.get(p) === viewer && sight.has(p)) raise(Heat.unease);
  if (f.news.some((n) => n.court === viewer && n.kind === "Rumor" && n.turn >= f.turn - 2)) raise(Heat.unease);
  return out;
}

/**
 * The mood the music is asked for, kept across seasons and seconds: one per game screen and pair of eyes. `season` is told
 * each season shown; `at` is asked as time passes. A season that does not follow the one before (a jump back or ahead, a
 * change of eyes) starts afresh from the seasons before it, as if long past, at the step their heat reaches.
 */
export class MoodDirector {
  private h0 = 0;
  private s0 = 0;
  private t0 = 0;
  private step = 0;
  private mood: Mood = "calm";
  private since = -Infinity;
  private top: "battle" | "siege" = "battle";
  private last: Signal | null = null;
  private shown: { key: string; index: number } | null = null;
  private clearUntil = -Infinity;

  /**
   * The heat at a season and a second: cooled by seasons or by seconds since it was last raised, whichever is slower; by
   * seasons alone where `now` is null (seasons read back, as if long past).
   */
  heat(index: number, now: number | null): number {
    const bySeasons = 0.5 ** ((index - this.s0) / HalfLife.seasons);
    return this.h0 * (now === null ? bySeasons : Math.max(bySeasons, 0.5 ** ((now - this.t0) / HalfLife.seconds)));
  }

  /**
   * A season shown, at `now` seconds of play. `read` is what a season tells the music, for whatever the viewer watches
   * (item 19+++c: a realm, a character, the world); by default the viewer's own.
   */
  season(frames: readonly SeasonFrame[], index: number, viewer: Power | null, key: string, now: number, read: (k: number) => Signal = (k) => signalAt(frames, k, viewer)): void {
    const was = this.shown;
    if (was !== null && was.key === key && was.index === index) return;
    this.shown = { key, index };
    if (was === null || was.key !== key || index !== was.index + 1) {
      // Afresh: the seasons before, cooled by seasons alone, then the step the heat reaches, held from now.
      this.h0 = 0;
      this.s0 = 0;
      for (let k = Math.max(0, index - Lookback); k <= index; k++) this.feed(read(k), k, null);
      this.h0 = this.heat(index, null);
      this.s0 = index;
      this.t0 = now;
      // The step the heat reaches, at once; the next change waits for nothing but the heat.
      this.step = this.reach(this.h0);
      this.mood = this.name(this.step, this.last!);
      this.since = -Infinity;
      this.clearUntil = -Infinity;
      return;
    }
    const s = read(index);
    this.feed(s, index, now);
    if (s.clear) this.clearUntil = now + ClearFor;
    this.at(now);
  }

  private feed(s: Signal, index: number, now: number | null): void {
    this.last = s;
    if (s.top !== null) this.top = s.top;
    const h = this.heat(index, now);
    const raised = Math.max(h, s.heat, s.add > 0 ? Math.min(Skirmish.most, h + s.add) : 0);
    // Only a raise starts the cooling anew, so quiet seasons cool by the slower of the two clocks from the last raise.
    if (raised <= h) return;
    this.h0 = raised;
    this.s0 = index;
    this.t0 = now ?? 0;
  }

  /**
   * Whether something clear is in front of the viewer, as of `now`: a season that showed a real battle of its own or its
   * capital attacked, for the few seconds a rise takes to cross; never at a fresh start, a change of eyes is not an event.
   */
  clear(now: number): boolean {
    return now < this.clearUntil;
  }

  /** The highest step a heat enters. */
  private reach(h: number): number {
    let s = 0;
    Steps.forEach((x, i) => {
      if (h >= x.enter) s = i;
    });
    return s;
  }

  /** A step's mood: the top step's siege or battle; below war, the last seasons on grave omens. */
  private name(step: number, s: Signal): Mood {
    if (step === 3) return this.top;
    if (step === 2) return "war";
    if (s.grave) return "last";
    return step === 1 ? "tension" : "calm";
  }

  /**
   * The mood at `now`: a rise at once, never held back; a fall one step down, and a change within a step (siege and
   * battle, tension and the last seasons), each past the hold.
   */
  at(now: number): Mood {
    const s = this.last;
    if (this.shown === null || s === null) return "calm";
    if (s.ended) return "last";
    const h = this.heat(this.shown.index, now);
    const held = now - this.since < Hold;
    const want = this.reach(h);
    let step = this.step;
    if (want > step) step = want;
    else if (step > 0 && h < Steps[step].leave && !held) step--;
    const mood = this.name(step, s);
    if (step !== this.step || (mood !== this.mood && !held)) {
      this.step = step;
      this.mood = mood;
      this.since = now;
    }
    return this.mood;
  }
}

/**
 * How the mood is heard within a piece (item 19+++): darker as the situation worsens, brighter as it improves, as the
 * viewer knows it. -2 in a battle or a siege of its own land this season, or a king or capital of its own fallen in the
 * last three seasons (mourning); -1 with war in the last three seasons (a siege it lays, a skirmish, several Great Kings
 * at war in god view), on grave omens, or with hunger in its land; +1 at a feast, read as a season that brought it land,
 * or a harvest it saw with no hunger in it and no war; 0 otherwise. It chooses the next piece's variation and never cuts
 * the one playing. `read` is what a season tells the music, for whatever the viewer watches (item 19+++c).
 */
export function shadeAt(frames: readonly SeasonFrame[], index: number, viewer: Power | null, read: (k: number) => Signal = (k) => signalAt(frames, k, viewer)): -2 | -1 | 0 | 1 {
  const f = frames[index];
  if (f === undefined) return 0;
  if (read(index).heat >= Heat.battle) return -2;
  let war = false;
  for (let k = index; k > Math.max(0, index - 3); k--) {
    const c = cuesAt(frames, k, viewer);
    if (c.moment === "fall" || c.moment === "solemn") return -2;
    const s = read(k);
    if (s.heat >= Heat.war || s.add > 0) war = true;
  }
  const seenHere = (kind: string): boolean => f.events.some((e) => e.kind === kind && (viewer === null || e.visibleTo.includes(viewer)));
  if (war || grave(f) || seenHere("hunger") || seenHere("famine")) return -1;
  const c = cuesAt(frames, index, viewer);
  if (c.moment === "triumph" || seenHere("harvest")) return 1;
  return 0;
}
