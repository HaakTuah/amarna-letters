/**
 * The threads to watch (item 17+++, part F; "Timeline and replay" under Spectator mode): the few live stories with the most
 * at stake this season, the narrator's pick from the record, each a click away (follow the person, open the message trail,
 * take the map there). The engine finds and ranks them here from what it has released; the narrator only words them
 * (`INarrator.threads`), and the words are kept in the record the first time (the runner's `t<n>/threads`), so watching
 * again reads them back. Choosing what is shown never changes what happens.
 *
 * **Who sees what** (hidden information): god view's threads are found in the whole state; a seat's only in its own view
 * (`Views.for`), so a seat is never pointed at more than it knows. Each thread names the eyes it was found for (`court`).
 *
 * **The stake** is the one the engine measures for a king's model calls ("Minds follow what is at stake", `ordersStakes`
 * and `courtStakes` in the model layer), read for one story and in the viewer's own terms: a city besieged or a province
 * that would rise moves one province of its holder's land (the besieger's, for his side of it), with more when it is
 * a season from falling (what wakes a sleeping king); an envoy's errand moves the gold he carries against the treasury, a
 * half for a tablet to be sealed and a little for tablets shown; foreign troops in a king's own capital are always worth
 * most (`capital`).
 */
import {
  B,
  D,
  EconomyData,
  I,
  S,
  Views,
  WorldMap,
  alive,
  findCharacter,
  list,
  obj,
  ownedBy,
  type GameState,
  type ObjSchema,
  type Power,
  type SeatView,
} from "@amarna/engine";

/** The kinds of story: a city besieged, an envoy on his road, a people who would rise behind a man. */
export type ThreadKind = "siege" | "envoy" | "rising";

/** One thread to watch, as found and then as the narrator worded it. */
export interface Thread {
  /** Whose eyes it was found for: a power (watched through its seat), or "" for god view. */
  court: string;
  kind: string;
  /** Where the map goes: the city besieged, the envoy's place on his road (his destination, for his own court), the province that would rise. */
  province: string;
  /** Whom to follow, by id, or "". */
  person: string;
  /** The envoy's message trail, by id, or "". */
  trail: string;
  /** The besieger, the envoy's king, or the one who would rise against `to`. */
  from: string;
  /** The city's holder, or the court the envoy goes to. */
  to: string;
  /** The power an envoy serves in secret ("a bribed envoy on his road"), in god view only, or "". */
  power: string;
  gold: number;
  tablet: boolean;
  /** A city that may fall, or a rising that may break out, next season. */
  soon: boolean;
  /** The stake, in the viewer's own terms (a share of its land or gold, as the model layer's `Stakes.moved`). */
  moved: number;
  /** Foreign troops in the viewer's own capital (in god view, the holder's): always first. */
  capital: boolean;
  /** The narrator's words for it. */
  text: string;
}

export function newThread(init: Partial<Thread> = {}): Thread {
  return { court: "", kind: "", province: "", person: "", trail: "", from: "", to: "", power: "", gold: 0, tablet: false, soon: false, moved: 0, capital: false, text: "", ...init };
}

export const ThreadSchema: ObjSchema<Thread> = obj("Thread", newThread, {
  court: S,
  kind: S,
  province: S,
  person: S,
  trail: S,
  from: S,
  to: S,
  power: S,
  gold: I,
  tablet: B,
  soon: B,
  moved: D,
  capital: B,
  text: S,
});

/** A season's threads, as the record keeps them. */
export const ThreadsSchema = list(() => ThreadSchema);

/** How many threads each pair of eyes is given a season: "the few live stories". A first guess. */
export const ThreadsMost = 4;

/** The record's key for a season's threads as first told, and as told anew the n-th time (from 1). */
export const threadsKey = (turn: number, anew = 0): string => (anew === 0 ? `t${turn}/threads` : `t${turn}/threads/anew${anew}`);

/** Most at stake first: troops in one's own capital, then the stake, then a fixed order so a replay ranks the same. */
export function byStake(a: Thread, b: Thread): number {
  if (a.capital !== b.capital) return a.capital ? -1 : 1;
  if (a.moved !== b.moved) return b.moved - a.moved;
  const ka = `${a.kind} ${a.province} ${a.person}`;
  const kb = `${b.kind} ${b.province} ${b.person}`;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/** The threads one pair of eyes may see, most at stake first: a seat's own, or god view's (`viewer` null). */
export function threadsFor(threads: readonly Thread[], viewer: Power | null): Thread[] {
  return threads.filter((t) => t.court === (viewer ?? "")).sort(byStake);
}

const map = WorldMap.default;
const capitalOf = (p: string): string | null => {
  try {
    return map.capital(p).id;
  } catch {
    return null;
  }
};
const round = (x: number): number => Math.round(x * 1000) / 1000;
/** One province of a realm of `land` provinces: its share of the land, as `ordersStakes` counts it. */
const share = (land: number): number => 1 / Math.max(1, land);
/** What a season from falling adds: a reason that wakes a king, as each does in `ordersStakes`. */
const Woken = 0.1;
/** An envoy's errand, as `courtStakes` weighs an audience: a little always, the gold against the treasury, a tablet, tablets shown. */
const errand = (gold: number, treasury: number, tablet: boolean, shown: boolean): number => 0.05 + gold / Math.max(1, treasury) + (tablet ? 0.5 : 0) + (shown ? 0.3 : 0);

/** Wears enough to fall next season: one more season's wear breaches the walls, or the city is starving. */
const nearFall = (progress: number, walls: number, starving: boolean): boolean => starving || progress + 1 >= walls * EconomyData.breachPerLevel;

/** God view's threads, from the whole state, after season `turn` resolved. */
export function worldThreads(s: GameState, turn: number): Thread[] {
  const out: Thread[] = [];
  const land = (p: string | null): number => (p === null ? 1 : ownedBy(s, p).length);
  for (const x of s.sieges) {
    const holder = s.owner.getOrDefault(x.province, null);
    const soon = nearFall(x.progress, s.walls.getOrDefault(x.province, 0), s.starving.includes(x.province));
    out.push(
      newThread({
        kind: "siege",
        province: x.province,
        from: x.power,
        to: holder ?? "",
        soon,
        moved: round(share(land(holder)) + (soon ? Woken : 0)),
        capital: holder !== null && capitalOf(holder) === x.province,
      }),
    );
  }
  for (const j of s.journeys) {
    const d = j.dispatch;
    if (j.kind !== "EnvoyOutbound" || d === null || d.pretended || j.characterId === null) continue;
    const c = findCharacter(s, j.characterId);
    const master = c?.secretMaster ?? null;
    out.push(
      newThread({
        kind: "envoy",
        province: j.route[Math.min(j.leg, j.route.length - 1)] ?? capitalOf(j.to) ?? "",
        person: j.characterId,
        trail: d.trailId,
        from: j.from,
        to: j.to,
        power: master !== null && master !== j.from ? master : "",
        gold: d.gold,
        tablet: d.proposal !== null,
        moved: round(errand(d.gold, s.treasuries.tryGet(j.to)?.gold ?? 0, d.proposal !== null, d.copyIds.length > 0)),
      }),
    );
  }
  for (const c of s.characters) {
    const plan = c.risePlan;
    if (plan === null || !plan.rise || plan.turn !== turn) continue;
    const holder = s.owner.getOrDefault(plan.province, null);
    out.push(
      newThread({
        kind: "rising",
        province: plan.province,
        person: c.id,
        to: holder ?? "",
        soon: true,
        moved: round(share(land(holder)) + Woken),
        capital: holder !== null && capitalOf(holder) === plan.province,
      }),
    );
  }
  return out.sort(byStake).slice(0, ThreadsMost);
}

/**
 * A seat's threads, from its own view alone: the sieges it knows of, as it knows them, and its own envoys still away (its
 * letters not yet reported on), where it sent them. A rising is asked in secret and a bribe is the briber's, so neither is
 * a seat's thread; nor is anything it has only been told of beyond its view.
 */
export function seatThreads(v: SeatView, s: GameState): Thread[] {
  const p = v.power;
  const mine = Math.max(1, [...v.owner].filter(([, o]) => o === p).length);
  const out: Thread[] = [];
  for (const x of v.sieges) {
    const ours = x.holder === p || x.besieger === p;
    const soon = nearFall(x.progress, x.walls, false);
    out.push(
      newThread({
        court: p,
        kind: "siege",
        province: x.province,
        from: x.besieger,
        to: x.holder ?? "",
        soon,
        // Another's siege moves none of the seat's own land: it ranks below its own.
        moved: ours ? round(share(mine) + (soon ? Woken : 0)) : 0,
        capital: x.holder === p && capitalOf(p) === x.province,
      }),
    );
  }
  for (const l of v.letters) {
    if (l.reportedTurn !== null) continue;
    const trail = s.trails.find((t) => t.from === p && t.envoyId === l.envoyId && t.turn === l.turn && t.to === l.to);
    out.push(
      newThread({
        court: p,
        kind: "envoy",
        province: capitalOf(l.to) ?? "",
        person: l.envoyId,
        trail: trail?.id ?? "",
        from: p,
        to: l.to,
        gold: l.gold,
        tablet: l.tablet !== null,
        moved: round(errand(l.gold, v.gold, l.tablet !== null, false)),
      }),
    );
  }
  return out.sort(byStake).slice(0, ThreadsMost);
}

/** Every pair of eyes' threads after season `turn`: god view's and each living seat's, each the few most at stake, unworded. */
export function findThreads(s: GameState, turn: number): Thread[] {
  return [...worldThreads(s, turn), ...alive(s).flatMap((p) => seatThreads(Views.for(s, p), s))];
}

/** The longest a thread's words may be in a saved record: a few sentences, with room to spare. */
const WordsMost = 2000;
const Kinds: readonly string[] = ["siege", "envoy", "rising"];
const Fields: readonly string[] = ThreadSchema.fields.map(([n]) => n);

/** Whether a decision's key holds a season's threads (as first told, or anew). */
export const isThreadsKey = (key: string): boolean => /^t\d+\/threads(\/anew[1-9]\d*)?$/.test(key);

/**
 * A season's threads read from a saved or shared log, checked field by field as written, before anything is converted
 * (SECURITY.md, point 5: anyone can craft a save): a short list of objects, each with a known kind, names and ids of
 * bounded length without control characters, whole numbers of gold, flags, a finite stake and words of bounded length.
 * Anything else fails the load cleanly.
 */
export function readThreads(json: string): Thread[] {
  const id = (x: unknown): x is string => typeof x === "string" && x.length <= 80 && !/\p{Cc}/u.test(x);
  const ok = (n: Record<string, unknown>): boolean =>
    Object.keys(n).length === Fields.length &&
    Object.keys(n).every((k) => Fields.includes(k)) &&
    typeof n.kind === "string" &&
    Kinds.includes(n.kind) &&
    [n.court, n.province, n.person, n.trail, n.from, n.to, n.power].every(id) &&
    typeof n.gold === "number" &&
    Number.isInteger(n.gold) &&
    n.gold >= 0 &&
    [n.tablet, n.soon, n.capital].every((b) => typeof b === "boolean") &&
    typeof n.moved === "number" &&
    Number.isFinite(n.moved) &&
    n.moved >= 0 &&
    typeof n.text === "string" &&
    n.text.length <= WordsMost;
  let v: unknown;
  try {
    v = JSON.parse(json);
  } catch {
    v = null;
  }
  if (!Array.isArray(v) || v.length > 100 || !v.every((n) => n !== null && typeof n === "object" && !Array.isArray(n) && ok(n as Record<string, unknown>)))
    throw new Error("the threads to watch in it are not readable");
  return (v as Record<string, unknown>[]).map((n) => newThread(n as Partial<Thread>));
}
