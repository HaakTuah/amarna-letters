/**
 * What the map draws for one season through one pair of eyes: the god view's truth, or exactly what a court can see,
 * believe and remember. Built from the frames only (the court's own earlier sights, its own people as it believes them, the
 * news that reached it), never from anything it could not know.
 */
import { WorldMap, newGameConfig, parsePower, travelTurns, type InboxKind, type Power, type UnitKind } from "@amarna/engine";
import { coverOf, isMove, ownerFor, ownerOf, type FrameMove, type FrameSiege, type FrameUnit, type SeasonFrame } from "../session/frames.ts";
import { powerName, provinceName, shekels } from "../ui/format.ts";
import { along, city, route, type Pt } from "./art.ts";

export type MoveStyle = "Move" | "Attack" | "Bounce" | "Support" | "SupportCut" | "Convoy";
export type TravellerKind = "Envoy" | "Spy" | "Gold";
export type PersonKind = "Envoy" | "Spy" | "Captive" | "Missing";

/** A unit on the board. A ghost is one the court saw there `age` seasons ago and cannot see now. */
export interface SceneUnit {
  key: string;
  power: Power;
  kind: UnitKind;
  province: string;
  count: number;
  /** Item 11a+: the men of the units stacked here, all together. */
  men: number;
  ghost: boolean;
  age: number;
  seenAt: number;
}

/** One order of the season just resolved, as it is drawn. */
export interface SceneMove {
  power: Power;
  kind: UnitKind;
  from: string;
  to: string;
  style: MoveStyle;
  text: string;
}

/** Someone, or gold, on the road between two places, at a season's guessed position along the way. */
export interface SceneTraveller {
  key: string;
  kind: TravellerKind;
  owner: Power;
  fromProvince: string;
  toProvince: string;
  progress: number;
  depart: number;
  arrive: number;
  characterId: string | null;
  title: string;
  gold: number;
  believed: boolean;
  destination: Power;
}

/** Someone standing somewhere: an envoy at a foreign court, a spy at its post, a captive, or one whose court lost track of it. */
export interface ScenePerson {
  id: string;
  kind: PersonKind;
  owner: Power | null;
  province: string;
  title: string;
  believed: boolean;
  double: boolean;
}

/** A rumour or a spy's report a court has received, placed where it came from. */
export interface SceneNews {
  province: string;
  kind: InboxKind;
  age: number;
  title: string;
  body: string;
  observed: number;
}

/** How a province changed hands, as far as the viewer can tell. */
export type CaptureHow = "Taken" | "Passed" | "Unseen";

/** A province that changed hands in the season just resolved. Who holds it is public; how it changed hands is not. */
export interface SceneCapture {
  province: string;
  from: Power | null;
  to: Power | null;
  how: CaptureHow;
}

/** "taken by Hatti from Arzawa", "passed to Hatti from Arzawa", or "now held by Hatti, no longer by Arzawa". */
export function captureLine(c: SceneCapture): string {
  const holder = c.to !== null ? powerName(c.to) : "nobody";
  const f = c.from;
  if (c.how === "Taken") return `taken by ${holder}${f !== null ? ` from ${powerName(f)}` : ""}`;
  if (c.how === "Passed") return `passed to ${holder}${f !== null ? ` from ${powerName(f)}` : ""}`;
  return `now held by ${holder}${f !== null ? `, no longer by ${powerName(f)}` : ""}`;
}

export interface MapScene {
  index: number;
  viewer: Power | null;
  frame: SeasonFrame;
  /**
   * Seat view: how old the court's knowledge of each province is, in seasons (0 = in sight now): at sea since it was last
   * in sight, on land the age of its news of the holder too (item 7b), whichever is newer; absent = never seen nor heard of.
   */
  fogAge: Map<string, number>;
  /** Who holds each land province, as the viewer knows it (god view: as it is). */
  owner: Map<string, Power | null>;
  units: SceneUnit[];
  moves: SceneMove[];
  destroyed: SceneUnit[];
  captures: SceneCapture[];
  travellers: SceneTraveller[];
  people: ScenePerson[];
  news: SceneNews[];
  /** The sieges the viewer knows of. */
  sieges: FrameSiege[];
  /** The walls the viewer knows. */
  walls: Map<string, number>;
  /**
   * Item 19: the droughts and floods on the land, as the viewer last saw it: in god view as they are, in a seat view where
   * its own eyes last saw each province, as it was then (word of a holder is not a sight of the fields).
   */
  land: Map<string, LandState>;
}

/** Item 19: what this game has done to a province's land, beyond the calendar's look. */
export type LandState = "Drought" | "Flood";

const landOf = (f: SeasonFrame): Map<string, LandState> => new Map(f.climate.flatMap((c) => c.provinces.map((p) => [p, c.kind] as const)));

/** The walls a viewer knows in a frame. */
export function wallsIn(f: SeasonFrame, viewer: Power | null): Map<string, number> {
  if (viewer === null) return f.walls;
  return f.knownWalls.get(viewer) ?? f.walls;
}

const Map_ = WorldMap.default;

export const unitKindName = (k: UnitKind): string => (k === "Army" ? "army" : "fleet");

const capOf = (p: Power): string => Map_.capital(p).id;

/** The frame at an index, clamped to the frames there are. */
export const frameAt = (frames: readonly SeasonFrame[], index: number): SeasonFrame => frames[Math.min(Math.max(index, 0), frames.length - 1)];

export function buildScene(frames: readonly SeasonFrame[], index: number, viewer: Power | null): MapScene {
  const f = frameAt(frames, index);
  index = f.index;
  const prev = index > 0 ? frameAt(frames, index - 1) : null;
  const units: SceneUnit[] = [];
  const fog = new Map<string, number>();
  let land = landOf(f);

  if (viewer === null) units.push(...stack(f.units, false, 0, index));
  else {
    const p = viewer;
    // Each court's memory of the board: where it last saw each province, and what stood there then.
    const lastSeen = new Map<string, number>();
    const seenUnits = new Map<string, FrameUnit[]>();
    for (let j = 0; j <= index; j++) {
      const fj = frameAt(frames, j);
      const sight = fj.sight.get(p);
      if (sight === undefined) continue;
      for (const prov of sight) {
        lastSeen.set(prov, j);
        seenUnits.set(
          prov,
          fj.units.filter((u) => u.province === prov),
        );
      }
    }
    for (const [prov, j] of lastSeen) fog.set(prov, index - j);
    const lands = new Map<number, Map<string, LandState>>();
    land = new Map();
    for (const [prov, j] of lastSeen) {
      if (!lands.has(j)) lands.set(j, landOf(frameAt(frames, j)));
      const state = lands.get(j)!.get(prov);
      if (state !== undefined) land.set(prov, state);
    }
    // News of the holder travels (item 7b): a province never seen, or seen long ago, is as old as the news of it.
    for (const [prov, k] of f.knownOwner.get(p) ?? []) {
      const age = Math.max(0, f.turn - k.turn);
      const had = fog.get(prov);
      if (had === undefined || age < had) fog.set(prov, age);
    }
    const now = f.sight.get(p) ?? new Set<string>();
    units.push(
      ...stack(
        f.units.filter((u) => u.power === p || now.has(u.province)),
        false,
        0,
        index,
      ),
    );
    for (const [prov, list] of seenUnits) {
      if (now.has(prov) || list.length === 0) continue;
      const age = index - lastSeen.get(prov)!;
      units.push(
        ...stack(
          list.filter((u) => u.power !== p),
          true,
          age,
          lastSeen.get(prov)!,
        ),
      );
    }
  }

  // The orders the viewer saw resolve: every one in god view, a court's own and those it could see in a seat view.
  const seen: FrameMove[] = viewer !== null ? (f.seenBy.get(viewer) ?? []).map((i) => f.moves[i]) : f.moves;
  const [moves, destroyed] = movesOf(
    f,
    prev,
    seen,
    viewer !== null ? (prev?.sight.get(viewer) ?? new Set<string>()) : null,
    prev === null ? null : wallsIn(prev, viewer),
  );
  const captures: SceneCapture[] = [];
  if (prev !== null)
    for (const prov of Map_.landProvinces) {
      const was = ownerFor(prev, prov.id, viewer);
      const now = ownerFor(f, prov.id, viewer);
      if (was === now) continue;
      // Taken by arms only if the viewer saw the new owner march in.
      const taken = now !== null && seen.some((m) => isMove(m) && m.succeeded && m.target === prov.id && m.power === now);
      const how: CaptureHow = taken ? "Taken" : viewer === null || viewer === was || viewer === now ? "Passed" : "Unseen";
      captures.push({ province: prov.id, from: was, to: now, how });
    }

  const [travellers, people] = viewer === null ? godPeople(f) : seatPeople(f, viewer);
  const news = viewer !== null ? newsOf(frames, index, viewer) : [];
  const sieges = viewer !== null ? f.sieges.filter((x) => x.besieger === viewer || ownerOf(f, x.province) === viewer || (f.sight.get(viewer)?.has(x.province) ?? false)) : [...f.sieges];

  const owner = new Map(Map_.landProvinces.map((x) => [x.id, ownerFor(f, x.id, viewer)] as const));
  return { index, viewer, frame: f, fogAge: fog, owner, units, moves, destroyed, captures, travellers, people, news, sieges, walls: wallsIn(f, viewer), land };
}

function stack(units: readonly FrameUnit[], ghost: boolean, age: number, seenAt: number): SceneUnit[] {
  const groups = new Map<string, FrameUnit[]>();
  for (const u of units) {
    const k = `${u.province}|${u.power}|${u.kind}`;
    let g = groups.get(k);
    if (g === undefined) groups.set(k, (g = []));
    g.push(u);
  }
  return [...groups.values()].map((g) => ({
    key: ghost ? `g:${g[0].province}:${g[0].power}:${g[0].kind}` : `u:${g[0].id}`,
    power: g[0].power,
    kind: g[0].kind,
    province: g[0].province,
    count: g.length,
    men: g.reduce((a, u) => a + (u.men ?? 0), 0),
    ghost,
    age,
    seenAt,
  }));
}

/**
 * `sight`: a court's sight as the season began (null in god view): it can tell a march was an attack on troops only if it
 * saw them standing there. `wallsBefore`: the walls the viewer knew as the season began.
 */
function movesOf(f: SeasonFrame, prev: SeasonFrame | null, seen: readonly FrameMove[], sight: Set<string> | null, wallsBefore: Map<string, number> | null): [SceneMove[], SceneUnit[]] {
  const moves: SceneMove[] = [];
  const destroyed: SceneUnit[] = [];
  if (prev === null) return [moves, destroyed];
  for (const m of seen) {
    if (m.destroyed) destroyed.push({ key: `x:${m.power}:${m.from}`, power: m.power, kind: m.kind, province: m.from, count: 1, men: 0, ghost: false, age: 0, seenAt: f.index });
    if (m.order === "move" && m.target !== null) {
      const t = m.target;
      // Foreign troops in the way: standing there as the season began (in the court's sight) and not marched out of it.
      const foreignUnit =
        (sight === null || sight.has(t)) &&
        prev.units.some((u) => u.province === t && u.power !== m.power && !seen.some((x) => isMove(x) && x.succeeded && x.from === t && x.power === u.power && x.kind === u.kind));
      const foreignLand = m.targetOwner !== null && m.targetOwner !== m.power;
      // Walls not its own: getting in is an attack, but takes the city only if it stormed them (it then holds it).
      const walls = m.targetOwner !== m.power && (wallsBefore ?? prev.walls).has(t);
      const attack = foreignUnit || foreignLand || walls;
      const style: MoveStyle = !m.succeeded ? "Bounce" : attack ? "Attack" : "Move";
      const took = (f.owner.get(t) ?? null) === m.power;
      const verb = m.succeeded ? (attack ? (walls && !took ? "got within the walls of" : "attacked and took") : "moved to") : "was stopped short of";
      moves.push({
        power: m.power,
        kind: m.kind,
        from: m.from,
        to: t,
        style,
        text: `${powerName(m.power)}'s ${unitKindName(m.kind)} in ${provinceName(m.from)} ${verb} ${provinceName(t)}${attack && !m.succeeded ? " (an attack)" : ""}`,
      });
    } else if (m.order === "support" && m.target !== null) {
      const t = m.target;
      moves.push({
        power: m.power,
        kind: m.kind,
        from: m.from,
        to: m.to ?? t,
        style: m.succeeded ? "Support" : "SupportCut",
        text:
          `${powerName(m.power)}'s ${unitKindName(m.kind)} in ${provinceName(m.from)} ${m.succeeded ? "supported" : "tried to support"} ` +
          `${m.helped !== null && m.helped !== m.power ? powerName(m.helped) + "'s" : "its own"} unit in ${provinceName(t)}${m.to !== null ? ` into ${provinceName(m.to)}` : " holding"}${m.succeeded ? "" : " (cut or void)"}`,
      });
    } else if (m.order === "convoy" && m.to !== null)
      moves.push({
        power: m.power,
        kind: m.kind,
        from: m.from,
        to: m.to,
        style: "Convoy",
        text: `${powerName(m.power)}'s fleet in ${provinceName(m.from)} convoyed the army in ${provinceName(m.target ?? m.to)} to ${provinceName(m.to)}`,
      });
  }
  return [moves, destroyed];
}

/** The fraction of the way a traveller has come by the season after this frame, kept off both ends. */
const progressOf = (now: number, depart: number, arrive: number): number => (arrive <= depart ? 0.5 : Math.min(Math.max((now - depart - 0.5) / (arrive - depart), 0.12), 0.88));

function godPeople(f: SeasonFrame): [SceneTraveller[], ScenePerson[]] {
  const travellers: SceneTraveller[] = [];
  const people: ScenePerson[] = [];
  const now = f.index + 1;
  for (const j of f.journeys) {
    const c = j.characterId !== null ? (f.people.get(j.characterId) ?? null) : null;
    const base = { key: j.id, progress: progressOf(now, j.depart, j.arrive), depart: j.depart, arrive: j.arrive, characterId: j.characterId, believed: false };
    switch (j.kind) {
      case "EnvoyOutbound":
        travellers.push({ ...base, kind: "Envoy", owner: j.from, fromProvince: capOf(j.from), toProvince: capOf(j.to), title: `${c?.name ?? "An envoy"}, envoy of ${powerName(j.from)} to ${powerName(j.to)}`, gold: j.gold, destination: j.to });
        break;
      case "EnvoyHomebound":
        travellers.push({
          ...base,
          kind: "Envoy",
          owner: j.to,
          fromProvince: capOf(j.from),
          toProvince: capOf(j.to),
          title: `${c?.name ?? "An envoy"}, on the road home to ${powerName(j.to)} from ${powerName(j.from)}`,
          gold: j.gold,
          destination: j.to,
        });
        break;
      case "SpyOutbound": {
        const post = c?.mission != null ? capOf(c.mission) : (c?.watch ?? capOf(j.to));
        travellers.push({
          ...base,
          kind: "Spy",
          owner: j.from,
          fromProvince: capOf(j.from),
          toProvince: post,
          title: `${c?.name ?? "A spy"}, a spy of ${powerName(j.from)} on the way to ${c?.mission != null ? powerName(c.mission) : provinceName(post)}`,
          gold: 0,
          destination: c?.mission ?? j.from,
        });
        break;
      }
      case "SpyHomebound": {
        const from = c?.watch != null && c.mission === null ? c.watch : capOf(j.from);
        travellers.push({ ...base, kind: "Spy", owner: j.to, fromProvince: from, toProvince: capOf(j.to), title: `${c?.name ?? "A spy"}, on the road home to ${powerName(j.to)}`, gold: 0, destination: j.to });
        break;
      }
      case "Ransom":
        travellers.push({
          ...base,
          kind: "Gold",
          owner: j.from,
          fromProvince: capOf(j.from),
          toProvince: capOf(j.to),
          title: `A ransom of ${shekels(j.gold)} from ${powerName(j.from)} to ${powerName(j.to)}${c === null ? "" : ` for ${c.name}`}`,
          gold: j.gold,
          destination: j.to,
        });
        break;
    }
  }
  for (const c of f.people.values()) {
    const dbl = c.secretMaster !== null;
    if (c.status === "Captured" && c.heldBy !== null)
      people.push({
        id: c.id,
        kind: "Captive",
        owner: c.employer,
        province: capOf(c.heldBy),
        title: `${c.name}, ${c.employer !== null ? powerName(c.employer) + "'s" : "a"} servant held captive by ${powerName(c.heldBy)}`,
        believed: false,
        double: dbl,
      });
    else if (c.status !== "Employed" || c.employer === null) continue;
    else if (c.duty === "Detained" && c.heldBy !== null)
      people.push({ id: c.id, kind: "Captive", owner: c.employer, province: capOf(c.heldBy), title: `${c.name}, envoy of ${powerName(c.employer)}, detained by ${powerName(c.heldBy)}`, believed: false, double: dbl });
    else if (c.duty === "EnvoyAtCourt" && c.at !== null)
      people.push({ id: c.id, kind: "Envoy", owner: c.employer, province: capOf(c.at), title: `${c.name}, envoy of ${powerName(c.employer)} at the court of ${powerName(c.at)}`, believed: false, double: dbl });
    else if (c.duty === "SpyPosted") {
      const place = c.at !== null ? capOf(c.at) : c.watch;
      if (place !== null)
        people.push({
          id: c.id,
          kind: "Spy",
          owner: c.employer,
          province: place,
          title: `${c.name}, a spy of ${powerName(c.employer)} watching ${c.at !== null ? powerName(c.at) : provinceName(place)}`,
          believed: false,
          double: dbl,
        });
    }
  }
  return [travellers, people];
}

const AtCourt = /at the court of (\w+)/u;
const InProvince = /^in (\w+)$/u;
const SetOut = /set out in turn (\d+) for (\w+)/u;
const DueThere = /due there about turn (\d+)/u;
const DueBack = /due back about turn (\d+)/u;

function placeOf(where: string): string | null {
  const m = AtCourt.exec(where);
  const court = m !== null ? parsePower(m[1]) : null;
  if (court !== null) return capOf(court);
  const n = InProvince.exec(where);
  return n !== null && Map_.exists(n[1]) ? n[1] : null;
}

/**
 * A court's own people where it believes them, and foreign people only while they stand at its own court in its sight:
 * envoys received there and anyone it holds. Foreign spies it has not caught are never shown.
 */
function seatPeople(f: SeasonFrame, p: Power): [SceneTraveller[], ScenePerson[]] {
  const travellers: SceneTraveller[] = [];
  const people: ScenePerson[] = [];
  const now = f.index + 1;
  const home = capOf(p);
  for (const c of f.people.values()) {
    const cover = coverOf(c, p);
    if (cover !== null) {
      if (cover.heldAt !== null) {
        people.push({ id: c.id, kind: "Captive", owner: p, province: capOf(cover.heldAt), title: `${c.name}, your servant, held captive by ${powerName(cover.heldAt)} (as you last heard)`, believed: true, double: false });
        continue;
      }
      switch (cover.believed) {
        case "SpyPosted": {
          const post = placeOf(cover.whereText);
          if (post !== null) people.push({ id: c.id, kind: "Spy", owner: p, province: post, title: `${c.name}, your spy, at their post as far as you know`, believed: true, double: false });
          break;
        }
        case "EnvoyAtCourt": {
          const court = placeOf(cover.whereText);
          if (court !== null) people.push({ id: c.id, kind: "Envoy", owner: p, province: court, title: `${c.name}, your envoy, at that court as far as you know`, believed: true, double: false });
          break;
        }
        case "EnvoyHomebound": {
          const due = DueBack.exec(cover.timingText);
          if (due === null) break;
          const arrive = Number.parseInt(due[1], 10);
          const so = SetOut.exec(cover.timingText);
          const abroad = so !== null ? parsePower(so[2]) : null;
          const from = abroad !== null ? capOf(abroad) : c.mission !== null ? capOf(c.mission) : (c.watch ?? home);
          const depart = arrive - travelTurns(newGameConfig(), Map_, from, home, now);
          travellers.push({
            key: `b:${c.id}`,
            kind: c.calling.toLowerCase().includes("spy") || cover.whereText.startsWith("in ") ? "Spy" : "Envoy",
            owner: p,
            fromProvince: from,
            toProvince: home,
            progress: progressOf(now, depart, arrive),
            depart,
            arrive,
            characterId: c.id,
            title: `${c.name}, on the road home as far as you know`,
            gold: 0,
            believed: true,
            destination: p,
          });
          break;
        }
        case "EnvoyOutbound": {
          const so = SetOut.exec(cover.timingText);
          const dt = DueThere.exec(cover.timingText);
          const dest = so !== null ? parsePower(so[2]) : null;
          if (so === null || dt === null || dest === null) break;
          const depart = Number.parseInt(so[1], 10);
          const arrive = Number.parseInt(dt[1], 10);
          travellers.push({
            key: `b:${c.id}`,
            kind: "Envoy",
            owner: p,
            fromProvince: home,
            toProvince: capOf(dest),
            progress: progressOf(now, depart, arrive),
            depart,
            arrive,
            characterId: c.id,
            title: `${c.name}, your envoy to ${powerName(dest)}, as far as you know`,
            gold: 0,
            believed: true,
            destination: dest,
          });
          break;
        }
        case "Detained":
          if (c.mission !== null)
            people.push({ id: c.id, kind: "Missing", owner: p, province: capOf(c.mission), title: `${c.name}, your envoy, has not returned from ${powerName(c.mission)}`, believed: true, double: false });
          break;
      }
      continue;
    }

    if (c.employer === p && (c.status === "Employed" || c.status === "Captured")) {
      if (c.status === "Captured" && c.heldBy !== null) {
        people.push({ id: c.id, kind: "Captive", owner: p, province: capOf(c.heldBy), title: `${c.name}, your servant, held captive by ${powerName(c.heldBy)}`, believed: false, double: false });
        continue;
      }
      switch (c.duty) {
        case "EnvoyOutbound":
        case "EnvoyHomebound":
        case "SpyOutbound": {
          const j = f.journeys.find(
            (x) => x.characterId === c.id && (x.kind === "EnvoyOutbound" || x.kind === "EnvoyHomebound" || x.kind === "SpyOutbound" || x.kind === "SpyHomebound"),
          );
          if (j === undefined) break;
          const spy = j.kind === "SpyOutbound" || j.kind === "SpyHomebound";
          const outbound = j.kind === "EnvoyOutbound" || j.kind === "SpyOutbound";
          const from = outbound ? home : j.kind === "SpyHomebound" && c.mission === null && c.watch !== null ? c.watch : capOf(j.from);
          const to = !outbound ? home : spy ? (c.mission !== null ? capOf(c.mission) : (c.watch ?? capOf(j.to))) : capOf(j.to);
          const dest = outbound ? (spy ? (c.mission ?? p) : j.to) : p;
          travellers.push({
            key: j.id,
            kind: spy ? "Spy" : "Envoy",
            owner: p,
            fromProvince: from,
            toProvince: to,
            progress: progressOf(now, j.depart, j.arrive),
            depart: j.depart,
            arrive: j.arrive,
            characterId: c.id,
            title: `${c.name}, your ${spy ? "spy" : "envoy"}, ${outbound ? `on the way to ${spy && c.mission === null ? provinceName(to) : powerName(dest)}` : "on the road home"}`,
            gold: outbound && !spy ? j.gold : 0,
            believed: false,
            destination: dest,
          });
          break;
        }
        case "EnvoyAtCourt":
          if (c.at !== null) people.push({ id: c.id, kind: "Envoy", owner: p, province: capOf(c.at), title: `${c.name}, your envoy at the court of ${powerName(c.at)}`, believed: false, double: false });
          break;
        case "SpyPosted": {
          const place = c.at !== null ? capOf(c.at) : c.watch;
          if (place !== null)
            people.push({ id: c.id, kind: "Spy", owner: p, province: place, title: `${c.name}, your spy watching ${c.at !== null ? powerName(c.at) : provinceName(place)}`, believed: false, double: false });
          break;
        }
        case "Detained":
          if (c.mission !== null)
            people.push({ id: c.id, kind: "Missing", owner: p, province: capOf(c.mission), title: `${c.name}, your envoy, has not returned from ${powerName(c.mission)}`, believed: false, double: false });
          break;
      }
      continue;
    }

    // Foreign people the court can see: envoys before it, and anyone it holds.
    if (c.heldBy === p && (c.status === "Captured" || c.status === "Employed" || c.status === "Free"))
      people.push({ id: c.id, kind: "Captive", owner: c.status === "Captured" ? c.confessed : c.employer, province: home, title: `${c.name}, held at your court`, believed: false, double: false });
    else if (c.status === "Employed" && c.duty === "EnvoyAtCourt" && c.at === p && c.employer !== null && c.employer !== p)
      people.push({ id: c.id, kind: "Envoy", owner: c.employer, province: home, title: `${c.name}, envoy of ${powerName(c.employer)}, at your court`, believed: false, double: false });
  }

  // Gold it sent as a ransom, on its own road.
  for (const j of f.journeys.filter((j) => j.kind === "Ransom" && j.from === p))
    travellers.push({
      key: j.id,
      kind: "Gold",
      owner: p,
      fromProvince: home,
      toProvince: capOf(j.to),
      progress: progressOf(now, j.depart, j.arrive),
      depart: j.depart,
      arrive: j.arrive,
      characterId: j.characterId,
      title: `Your ransom of ${shekels(j.gold)} on its way to ${powerName(j.to)}`,
      gold: j.gold,
      believed: false,
      destination: j.to,
    });
  return [travellers, people];
}

/** The rumours and spy reports a court has received up to this season, the latest from each place, for eight seasons. */
function newsOf(frames: readonly SeasonFrame[], index: number, p: Power): SceneNews[] {
  const latest = new Map<string, SceneNews>();
  for (let j = 1; j <= index; j++)
    for (const n of frameAt(frames, j).news.filter((n) => n.court === p)) {
      const place = n.province ?? (n.fromCourt !== null ? capOf(n.fromCourt) : null);
      if (place === null) continue;
      const age = index + 1 - n.turn;
      if (age > 8) continue;
      latest.set(place + n.kind, { province: place, kind: n.kind, age: Math.max(0, age), title: n.title, body: n.body, observed: n.observed });
    }
  return [...latest.values()];
}

export interface PathStep {
  index: number;
  at: Pt;
  where: string;
}

/**
 * A character's places season by season up to this frame, as the viewer knows them: the truth in god view; for a court, its
 * own servant where it believed them, and anyone else only while at its court.
 */
export function pathOf(frames: readonly SeasonFrame[], index: number, viewer: Power | null, id: string): PathStep[] {
  const path: PathStep[] = [];
  for (let j = 0; j <= Math.min(index, frames.length - 1); j++) {
    const f = frames[j];
    const c = f.people.get(id);
    if (c === undefined) continue;
    const [travellers, people] = viewer !== null ? seatPeople(f, viewer) : godPeople(f);
    const t = travellers.find((x) => x.characterId === id && x.kind !== "Gold");
    if (t !== undefined) {
      path.push({ index: j, at: along(route(t.fromProvince, t.toProvince), t.progress), where: "on the road" });
      continue;
    }
    const s = people.find((x) => x.id === id);
    if (s !== undefined) {
      path.push({ index: j, at: city(s.province), where: s.title });
      continue;
    }
    // At a court: god view knows everyone's place; a court knows its own people at home.
    const known = viewer === null || (c.employer === viewer && coverOf(c, viewer) === null && c.at === viewer);
    if (known && c.at !== null && c.status !== "Dead") path.push({ index: j, at: city(Map_.capital(c.at).id), where: `at the court of ${powerName(c.at)}` });
  }
  return path;
}
