/**
 * What the map draws, one frame per season: who holds what, the units, last season's orders, who could see where, who is on
 * the road and where everyone is. Built in the engine's worker from the live state, and sent to the page, which keeps no
 * copy of the game of its own: frames are plain data (maps and sets clone across the worker boundary).
 */
import {
  AllPowers,
  RiverFloods,
  Rivers,
  Views,
  WorldMap,
  inboxOf,
  isAlive,
  wallsOf,
  type CharacterStatus,
  type Duty,
  type GameEvent,
  type GameState,
  type InboxKind,
  type JourneyKind,
  type Power,
  type UnitKind,
  ageBand,
  omenTier,
  type AgeBand,
  type OmenTier,
} from "@amarna/engine";
import type { GameRunner } from "@amarna/game";

/** A unit as it stood at the end of a season. */
export interface FrameUnit {
  id: string;
  power: Power;
  kind: UnitKind;
  province: string;
  /** Item 11a+: its men, as anyone who sees it can count them (0 in frames saved before). */
  men?: number;
}

/** A siege at the end of a season: the city, the besieger, and how far it has worn the city down against its walls. */
export interface FrameSiege {
  province: string;
  besieger: Power;
  progress: number;
  walls: number;
  since: number;
}

/** One unit's order of the season just resolved, and how it went (copied from the engine's outcomes). */
export interface FrameMove {
  power: Power;
  kind: UnitKind;
  from: string;
  order: string;
  target: string | null;
  to: string | null;
  helped: Power | null;
  succeeded: boolean;
  destroyed: boolean;
  targetOwner: Power | null;
}
export const isMove = (m: FrameMove): boolean => m.order === "move" && m.target !== null;

/** Something on the road at the end of a season: a person, or gold, or word. */
export interface FrameJourney {
  id: string;
  kind: JourneyKind;
  depart: number;
  arrive: number;
  from: Power;
  to: Power;
  characterId: string | null;
  gold: number;
  trailId: string | null;
  reportCourt: Power | null;
  reportProvince: string | null;
  observedTurn: number;
  text: string | null;
}

/** What one court still believes of a servant whose fate it has not heard (the engine's cover). */
export interface FrameCover {
  for: Power;
  believed: Duty;
  heldAt: Power | null;
  whereText: string;
  timingText: string;
  since: number;
}

/** A character as it stood at the end of a season. `confessed`: for a captive, whom it confessed to serving, or null. */
export interface FramePerson {
  id: string;
  name: string;
  origin: string;
  calling: string;
  employer: Power | null;
  status: CharacterStatus;
  duty: Duty;
  at: Power | null;
  watch: string | null;
  mission: Power | null;
  heldBy: Power | null;
  secretMaster: Power | null;
  currentTrail: string | null;
  formerEmployer: Power | null;
  covers: FrameCover[];
  confessed: Power | null;
}
export const coverOf = (c: FramePerson, p: Power): FrameCover | null => c.covers.find((x) => x.for === p) ?? null;

/** A sleeping seat at the end of a season (god view only). */
export interface FrameSleep {
  asleep: boolean;
  lastCalled: number;
  wakeAt: number;
  wokenBecause: string[];
  lastWokeAt: number;
  lastReasons: string[];
  spells: number;
}

/** A band on the land, or a pirate crew on its coast (item 19: drawn where a court could see it). */
export interface FrameBand {
  province: string;
  men: number;
  ship: boolean;
  chief: string;
}

/**
 * A drought or a river's bad year under way in the season about to be played (item 19: the land drawn as it is): which
 * river, if a river's, whether its flood was ruinous, and how many seasons since it struck.
 */
export interface FrameClimate {
  kind: "Drought" | "Flood";
  name: string;
  provinces: string[];
  river: string | null;
  ruinous: boolean;
  since: number;
}

/** News that reached a court in a season, which the map can place: a rumour from a court, or a spy's report from its post. */
export interface FrameNews {
  court: Power;
  kind: InboxKind;
  turn: number;
  title: string;
  body: string;
  fromCourt: Power | null;
  province: string | null;
  observed: number;
}

export interface SeasonFrame {
  /** The snapshot index: 0 at the start, k after turn k. */
  index: number;
  /** The season about to be played (the state's turn). */
  turn: number;
  ended: boolean;
  endReason: string | null;
  winners: string[];
  owner: Map<string, Power | null>;
  /** The walls standing at the end of the season, as god view sees them. */
  walls: Map<string, number>;
  /** The walls as each court knows them: standing now in its sight, elsewhere as it last saw them. */
  knownWalls: Map<Power, Map<string, number>>;
  /** Who each court knows holds each land province, and the season that news dates from (item 7b). */
  knownOwner: Map<Power, Map<string, { owner: Power | null; turn: number }>>;
  sieges: FrameSiege[];
  units: FrameUnit[];
  /** Every order of the season just resolved (the union of what each court saw). */
  moves: FrameMove[];
  /** What each court saw resolve: indexes into moves. */
  seenBy: Map<Power, number[]>;
  /** Each court's sight for the coming season. */
  sight: Map<Power, Set<string>>;
  journeys: FrameJourney[];
  people: Map<string, FramePerson>;
  sleep: Map<Power, FrameSleep>;
  eliminated: Set<Power>;
  /** The events of the season just resolved and of the arrivals that opened it. */
  events: GameEvent[];
  /** Rumours and spy reports that reached each court since the frame before, placed where they can be. */
  news: FrameNews[];
  /** Each court's inbox length, to find what arrived after this frame. */
  inboxCount: Map<Power, number>;
  /** Whether the age has no end, and, once the table played on past the age's end, when it ended and who won it. */
  openAge: boolean;
  /** What every seat is told of the table's median, in words ("Short", "Usual", "Long"). */
  ageBand: AgeBand;
  ageEnded: { turn: number; winners: string[] } | null;
  /** Item 19: the droughts and floods on the land in the season about to be played. */
  climate: FrameClimate[];
  /** Item 19: the bands and pirate crews, as they are (each court sees those its view shows it). */
  bands: FrameBand[];
  /** Item 19: the levels of everything built but walls (`kind:province`, as `GameState.built`), and the grain in each store. */
  built: Map<string, number>;
  stores: Map<string, number>;
  /** Item 19, life on the map: the people settled in each province, how well its countryside ate (thousandths, where short), and its unrest. */
  settled: Map<string, number>;
  fed: Map<string, number>;
  unrest: Map<string, number>;
  /** Item 19: the caravans, and the people carried off (deportees), on the road, each between the provinces it is between. */
  caravans: FrameRoad[];
  walking: FrameRoad[];
  /** Item 19: the diviners' tier of the omens of the end this season, the same for every court; null in an open age. */
  omen: OmenTier | null;
}

/** Item 19: a company on the road between two provinces, and how far along that stretch it is (0 to 1). */
export interface FrameRoad {
  power: Power | null;
  from: string;
  to: string;
  progress: number;
  what: string;
}

export const ownerOf = (f: SeasonFrame, province: string): Power | null => f.owner.get(province) ?? null;

/** Who holds a province as a viewer knows it (item 7b): as it is in god view, else as the news that reached the court. */
export const ownerFor = (f: SeasonFrame, province: string, viewer: Power | null): Power | null =>
  viewer === null ? ownerOf(f, province) : (f.knownOwner.get(viewer)?.get(province)?.owner ?? ownerOf(f, province));

/** Copies what the map needs from a state at the end of a season. Nothing here holds on to the live state. */
export function frameFrom(s: GameState, index: number, previous: SeasonFrame | null, map: WorldMap = WorldMap.default): SeasonFrame {
  const moves: FrameMove[] = [];
  const keyed = new Map<string, number>();
  const seenBy = new Map<Power, number[]>();
  for (const p of AllPowers) {
    const mine: number[] = [];
    // A fallen court's last sights stay in the state unchanged: read them only in the season it fell.
    const fallen = previous !== null && previous.eliminated.has(p);
    for (const o of fallen ? [] : (s.lastSeen.tryGet(p) ?? [])) {
      const key = `${o.power}|${o.province}|${o.order}|${o.target ?? ""}|${o.to ?? ""}`;
      let i = keyed.get(key);
      if (i === undefined) {
        i = moves.length;
        keyed.set(key, i);
        moves.push({
          power: o.power,
          kind: o.unitKind,
          from: o.province,
          order: o.order,
          target: o.target,
          to: o.to,
          helped: o.helped,
          succeeded: o.succeeded,
          destroyed: o.destroyed,
          targetOwner: o.targetOwner,
        });
      }
      mine.push(i);
    }
    seenBy.set(p, mine);
  }

  const news: FrameNews[] = [];
  const counts = new Map<Power, number>();
  for (const p of AllPowers) {
    const inbox = inboxOf(s, p);
    counts.set(p, inbox.length);
    const from = previous?.inboxCount.get(p) ?? 0;
    for (let i = Math.min(from, inbox.length); i < inbox.length; i++) {
      const item = inbox[i];
      if (item.kind === "Rumor") {
        // Placed at the court the word came from, when a rumour on the road carried exactly this text.
        const j = previous?.journeys.find((x) => x.kind === "Rumor" && x.to === p && x.text === item.body);
        news.push({ court: p, kind: item.kind, turn: item.turn, title: item.title, body: item.body, fromCourt: j?.from ?? null, province: null, observed: item.turn });
      } else if (item.kind === "SpyReport") {
        const j = previous?.journeys.find((x) => x.kind === "SpyReport" && x.to === p && x.characterId === item.subject);
        news.push({
          court: p,
          kind: item.kind,
          turn: item.turn,
          title: item.title,
          body: item.body,
          fromCourt: j?.reportCourt ?? null,
          province: j?.reportProvince ?? null,
          observed: j?.observedTurn ?? item.turn,
        });
      }
    }
  }

  const people = new Map<string, FramePerson>();
  for (const c of s.characters)
    people.set(c.id, {
      id: c.id,
      name: c.name,
      origin: c.origin,
      calling: c.calling,
      employer: c.employer,
      status: c.status,
      duty: c.duty,
      at: c.at,
      watch: c.watchProvince,
      mission: c.missionTarget,
      heldBy: c.heldBy,
      secretMaster: c.secretMaster,
      currentTrail: c.currentTrail,
      formerEmployer: c.formerEmployer,
      covers: c.covers.map((k) => ({ for: k.for, believed: k.believed, heldAt: k.heldAt, whereText: k.whereText, timingText: k.timingText, since: k.since })),
      confessed: c.status === "Captured" && c.heldBy !== null ? Views.confessedMaster(s, c.id, c.heldBy) : null,
    });

  const sight = new Map<Power, Set<string>>(AllPowers.map((p) => [p, isAlive(s, p) ? new Set(Views.sight(s, map, p)) : new Set<string>()] as const));
  const knownWalls = new Map<Power, Map<string, number>>(
    AllPowers.map((p) => [p, new Map(Views.wallsKnown(s, map, p, null).entries())] as const),
  );
  const knownOwner = new Map<Power, Map<string, { owner: Power | null; turn: number }>>(
    AllPowers.map((p) => [p, new Map([...Views.knownHolders(s, map, p).entries()].map(([k, x]) => [k, { owner: x.owner, turn: x.turn }] as const))] as const),
  );
  const sleep = new Map<Power, FrameSleep>();
  for (const [p, x] of s.sleep) {
    const woke = x.history.filter((h) => h.wokeAt > 0);
    const last = woke.length > 0 ? woke[woke.length - 1] : null;
    sleep.set(p, {
      asleep: x.asleep,
      lastCalled: x.lastCalled,
      wakeAt: x.wakeAt,
      wokenBecause: [...x.wokenBecause],
      lastWokeAt: last?.wokeAt ?? 0,
      lastReasons: last === null ? [] : [...last.reasons],
      spells: x.history.length,
    });
  }
  return {
    index,
    turn: s.turn,
    ended: s.ended,
    endReason: s.endReason,
    winners: [...s.winners],
    owner: new Map(s.owner.entries()),
    walls: new Map(s.walls.entries()),
    sieges: s.sieges.map((x) => ({ province: x.province, besieger: x.power, progress: x.progress, walls: wallsOf(s, x.province), since: x.since })),
    units: s.units.map((u) => ({ id: u.id, power: u.power, kind: u.kind, province: u.province, men: u.men })),
    moves,
    seenBy,
    sight,
    knownWalls,
    knownOwner,
    journeys: s.journeys.map((j) => ({
      id: j.id,
      kind: j.kind,
      depart: j.departTurn,
      arrive: j.arriveTurn,
      from: j.from,
      to: j.to,
      characterId: j.characterId,
      gold: j.kind === "EnvoyOutbound" ? (j.dispatch?.gold ?? 0) : j.kind === "EnvoyHomebound" ? (j.cargo?.gold ?? 0) : j.gold,
      trailId: j.dispatch?.trailId ?? j.cargo?.trailId ?? null,
      reportCourt: j.report?.court ?? null,
      reportProvince: j.report?.province ?? null,
      observedTurn: j.report?.observedTurn ?? 0,
      text: j.text,
    })),
    people,
    sleep,
    eliminated: new Set(s.eliminated),
    events: s.events.filter((e) => e.turn === index),
    news,
    inboxCount: counts,
    // The ending is shown in words only: the drawn last season (s.finalSeason) is never copied into a frame.
    openAge: s.config.openAge,
    ageBand: ageBand(s.config.endMedian),
    ageEnded: s.ageEndedTurn === null ? null : { turn: s.ageEndedTurn, winners: [...s.ageWinners] },
    climate: s.climate
      .filter((c) => c.startTurn <= s.turn && c.endTurn >= s.turn)
      .map((c) => {
        const river = c.kind === "Flood" ? (Rivers.find((r) => `the ${r.name}` === c.name)?.id ?? null) : null;
        const ruinous = river !== null && c.percent <= (RiverFloods.get(river)?.ruinPercent ?? 0);
        return { kind: c.kind, name: c.name, provinces: [...c.provinces], river, ruinous, since: s.turn - c.startTurn };
      }),
    built: new Map(s.built.entries()),
    settled: new Map([...s.people.entries()].map(([k, x]) => [k, x.settled] as const)),
    fed: new Map(s.fed.entries()),
    unrest: new Map(s.unrest.entries()),
    caravans: s.caravans.filter((c) => c.route.length > 0).map((c) => {
      const i = Math.min(c.at, c.route.length - 1);
      const next = Math.min(i + 1, c.route.length - 1);
      return { power: c.power, from: c.route[i], to: c.route[next], progress: Math.min(0.9, c.points / 100), what: `${c.grain} measures of grain${c.returning ? ", coming home" : ""}` };
    }),
    // Only deportees walk a known road (the engine's `Walk.route`); men discharged home are not placed on one.
    walking: s.walking.filter((w) => w.deported && w.route.length > 1).map((w) => {
      const span = Math.max(1, w.arrives - w.departs);
      const t = Math.min(0.95, Math.max(0, (s.turn - w.departs) / span));
      const k = Math.min(w.route.length - 2, Math.floor(t * (w.route.length - 1)));
      return { power: null, from: w.route[Math.max(0, k)], to: w.route[Math.max(0, k) + 1], progress: (t * (w.route.length - 1)) % 1, what: `${w.men} people carried off by ${w.by}` };
    }),
    omen: omenTier(s.seed, s.config, s.turn),
    stores: new Map(s.stores.entries()),
    bands: s.bands.map((b) => ({ province: b.province, men: b.men, ship: b.ship, chief: s.characters.find((c) => c.id === b.leaderId)?.name ?? "" })),
  };
}

/**
 * A frame as it travels to the page (item 17a): each court's known holders, known walls, sight and the people are a map of
 * the whole board a court, most the same as the frame before, and their structured clone cost a phone 50 ms a season; so
 * an entry equal to the frame before's is left out and named in `same`, and the page puts the frame before's back.
 */
export interface WireFrame extends SeasonFrame {
  same: { knownOwner: Power[]; knownWalls: Power[]; sight: Power[] };
}

const sameMap = <K, V>(a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>, same: (x: V, y: V) => boolean): boolean => {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (w === undefined || !same(v, w)) return false;
  }
  return true;
};
const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => a.size === b.size && [...a].every((x) => b.has(x));

/** The frame as sent: what equals the frame before is left out. The frame itself is untouched. */
export function toWire(f: SeasonFrame, previous: SeasonFrame | null): WireFrame {
  const same = { knownOwner: [] as Power[], knownWalls: [] as Power[], sight: [] as Power[] };
  if (previous === null) return { ...f, same };
  const knownOwner = new Map(f.knownOwner);
  const knownWalls = new Map(f.knownWalls);
  const sight = new Map(f.sight);
  for (const [p, m] of f.knownOwner) {
    const was = previous.knownOwner.get(p);
    if (was !== undefined && sameMap(m, was, (x, y) => x.owner === y.owner && x.turn === y.turn)) {
      knownOwner.delete(p);
      same.knownOwner.push(p);
    }
  }
  for (const [p, m] of f.knownWalls) {
    const was = previous.knownWalls.get(p);
    if (was !== undefined && sameMap(m, was, (x, y) => x === y)) {
      knownWalls.delete(p);
      same.knownWalls.push(p);
    }
  }
  for (const [p, set] of f.sight) {
    const was = previous.sight.get(p);
    if (was !== undefined && sameSet(set, was)) {
      sight.delete(p);
      same.sight.push(p);
    }
  }
  return { ...f, knownOwner, knownWalls, sight, same };
}

/** The frame as received: what was left out is the frame before's. The maps stand in the board's order of courts, as built. */
export function fromWire(w: WireFrame, previous: SeasonFrame | null): SeasonFrame {
  const { same, ...f } = w;
  if (previous === null) return f;
  const inOrder = <V>(sent: Map<Power, V>, before: Map<Power, V>, left: readonly Power[]): Map<Power, V> => {
    if (left.length === 0) return sent;
    const gone = new Set(left);
    return new Map(AllPowers.filter((p) => sent.has(p) || gone.has(p)).map((p) => [p, gone.has(p) ? before.get(p)! : sent.get(p)!] as const));
  };
  f.knownOwner = inOrder(f.knownOwner, previous.knownOwner, same.knownOwner);
  f.knownWalls = inOrder(f.knownWalls, previous.knownWalls, same.knownWalls);
  f.sight = inOrder(f.sight, previous.sight, same.sight);
  return f;
}

/** Takes a frame of every season the runner has played since the last call (the runner calls back right after each snapshot). */
export function catchUpFrames(frames: SeasonFrame[], r: GameRunner): void {
  for (const f of framesSince(frames.length, frames.length === 0 ? null : frames[frames.length - 1], r)) frames.push(f);
}

/**
 * The frames of the seasons from `taken` on (the frames taken so far, the last of them `previous`), so that whoever keeps
 * the frames may keep only the last (item 17a: the worker sends each frame to the page once and holds no history of its own).
 */
export function framesSince(taken: number, previous: SeasonFrame | null, r: GameRunner): SeasonFrame[] {
  const out: SeasonFrame[] = [];
  for (let index = taken; index < r.snapshots.length; index++) {
    // Called right after each snapshot, before the next season touches the state, the live state is that snapshot.
    const live = index === r.snapshots.length - 1 && (r.state.turn === index + 1 || (r.state.ended && r.state.turn === index));
    const state = live ? r.state : r.stateAt(index);
    if (state === null) break;
    const f = frameFrom(state, index, previous);
    out.push(f);
    previous = f;
  }
  return out;
}
