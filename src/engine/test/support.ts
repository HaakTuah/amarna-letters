/**
 * What the ported tests share: assertions with xUnit's meaning (the C# suite's Assert, so each ported test reads as its
 * C# original did: expected first, then actual), and the few LINQ helpers the engine's own seq.ts lacks.
 */
import { expect } from "vitest";
import { AllPowers, Dict, newCharacter, newTraits, carriedOf, forMen, menOf, type Character, type GameState, HSet, type JobTerms, newId, newSkills, newTurnSubmission, newUnit, type Power, type TurnSubmission, TurnEngine, type UnitKind, WorldMap } from "@amarna/engine";

type Coll<T> = Iterable<T> | ArrayLike<T>;

const items = <T>(c: Coll<T> | null | undefined): T[] => {
  if (c === null || c === undefined) throw new Error("the collection is null");
  if (c instanceof Dict) return [...c.keys()] as T[];
  return Array.from(c as Iterable<T>);
};

/** Plain data for deep equality: Dicts and HSets as arrays of their entries, in their order. */
function plain(x: unknown): unknown {
  if (x instanceof Dict) return { dict: [...x].map(([k, v]) => [plain(k), plain(v)]) };
  if (x instanceof HSet) return { set: [...x].map(plain) };
  if (x instanceof Map) return { map: [...x].map(([k, v]) => [plain(k), plain(v)]) };
  if (x instanceof Set) return { set: [...x].map(plain) };
  if (Array.isArray(x)) return x.map(plain);
  if (x !== null && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)]));
  return x === undefined ? null : x;
}

export class Assert {
  /** Equal values (deeply), or numbers equal to the given number of decimal places. */
  static equal<T>(expected: T, actual: T, precision?: number): void {
    if (typeof precision === "number" && typeof expected === "number") {
      const f = 10 ** precision;
      expect(Math.round((actual as number) * f) / f).toBe(Math.round(expected * f) / f);
    } else expect(plain(actual)).toEqual(plain(expected));
  }

  static notEqual<T>(expected: T, actual: T): void {
    expect(plain(actual)).not.toEqual(plain(expected));
  }

  static same(expected: unknown, actual: unknown): void {
    expect(actual).toBe(expected);
  }

  static notSame(expected: unknown, actual: unknown): void {
    expect(actual).not.toBe(expected);
  }

  static true(condition: boolean | null | undefined, message?: string): void {
    expect(condition, message).toBe(true);
  }

  static false(condition: boolean | null | undefined, message?: string): void {
    expect(condition, message).toBe(false);
  }

  static null(x: unknown): void {
    expect(x ?? null).toBeNull();
  }

  static notNull<T>(x: T | null | undefined): asserts x is T {
    expect(x ?? null).not.toBeNull();
  }

  /** A substring in a string; an item in a collection (a key in a Dict); or a collection with an item that matches. */
  static contains(sub: string, s: string | null | undefined): void;
  static contains<T>(c: Coll<T>, match: (x: T) => boolean): void;
  static contains<T>(item: T, c: Coll<T>): void;
  static contains(a: unknown, b: unknown): void {
    if (typeof b === "string" || b === null || b === undefined) {
      expect(b ?? "").toContain(a as string);
      return;
    }
    if (typeof b === "function") {
      expect(items(a as Coll<unknown>).some(b as (x: unknown) => boolean), "no item matches").toBe(true);
      return;
    }
    expect(items(b as Coll<unknown>).map(plain)).toContainEqual(plain(a));
  }

  static doesNotContain(sub: string, s: string | null | undefined): void;
  static doesNotContain<T>(c: Coll<T>, match: (x: T) => boolean): void;
  static doesNotContain<T>(item: T, c: Coll<T>): void;
  static doesNotContain(a: unknown, b: unknown): void {
    if (typeof b === "string" || b === null || b === undefined) {
      expect(b ?? "").not.toContain(a as string);
      return;
    }
    if (typeof b === "function") {
      expect(items(a as Coll<unknown>).some(b as (x: unknown) => boolean), "an item matches").toBe(false);
      return;
    }
    expect(items(b as Coll<unknown>).map(plain)).not.toContainEqual(plain(a));
  }

  static empty(c: Coll<unknown> | string): void {
    if (typeof c === "string") expect(c).toBe("");
    else expect(items(c)).toEqual([]);
  }

  static notEmpty(c: Coll<unknown> | string): void {
    if (typeof c === "string") expect(c.length).toBeGreaterThan(0);
    else expect(items(c).length).toBeGreaterThan(0);
  }

  /** The one item of a collection (that matches the predicate, if given), which it returns. */
  static single<T>(c: Coll<T>, f?: (x: T) => boolean): T {
    const all = items(c).filter(f ?? (() => true));
    expect(all.length, "expected exactly one item").toBe(1);
    return all[0];
  }

  static all<T>(c: Coll<T>, check: (x: T) => void): void {
    for (const x of items(c)) check(x);
  }

  static startsWith(prefix: string, s: string | null | undefined): void {
    expect((s ?? "").startsWith(prefix), `expected to start with ${JSON.stringify(prefix)}: ${JSON.stringify(s)}`).toBe(true);
  }

  static endsWith(suffix: string, s: string | null | undefined): void {
    expect((s ?? "").endsWith(suffix), `expected to end with ${JSON.stringify(suffix)}: ${JSON.stringify(s)}`).toBe(true);
  }

  static inRange(x: number, low: number, high: number): void {
    expect(x).toBeGreaterThanOrEqual(low);
    expect(x).toBeLessThanOrEqual(high);
  }

  /** A regular expression (given as a string, as xUnit takes it) that matches. */
  static matches(pattern: string | RegExp, s: string): void {
    expect(s).toMatch(typeof pattern === "string" ? new RegExp(pattern, "u") : pattern);
  }

  static doesNotMatch(pattern: string | RegExp, s: string): void {
    expect(s).not.toMatch(typeof pattern === "string" ? new RegExp(pattern, "u") : pattern);
  }

  static throws(f: () => unknown): Error {
    let caught: unknown = null;
    try {
      f();
    } catch (e) {
      caught = e;
    }
    expect(caught, "expected an exception").not.toBeNull();
    return caught as Error;
  }

  static async throwsAsync(f: () => Promise<unknown>): Promise<Error> {
    let caught: unknown = null;
    try {
      await f();
    } catch (e) {
      caught = e;
    }
    expect(caught, "expected an exception").not.toBeNull();
    return caught as Error;
  }

  /** xUnit's Assert.IsNotType<SomeOrder>: no order, or an order of another type. */
  static notOrder(type: string, o: { type: string } | null | undefined): void {
    expect(o?.type ?? null).not.toBe(type);
  }

  static fail(message: string): never {
    throw new Error(message);
  }
}

/** LINQ's FirstOrDefault: the first item (that matches), or null. */
export function firstOrNull<T>(c: Iterable<T>, f: (x: T) => boolean = () => true): T | null {
  for (const x of c) if (f(x)) return x;
  return null;
}

/** LINQ's SingleOrDefault: the one item that matches, null for none; more than one throws. */
export function singleOrNull<T>(c: Iterable<T>, f: (x: T) => boolean = () => true): T | null {
  const all = [...c].filter(f);
  if (all.length > 1) throw new Error("more than one item matches");
  return all[0] ?? null;
}

/** LINQ's Last: the last item (that matches); none throws. */
export function last<T>(c: Iterable<T>, f: (x: T) => boolean = () => true): T {
  const all = [...c].filter(f);
  if (all.length === 0) throw new Error("no item matches");
  return all[all.length - 1];
}

/** LINQ's LastOrDefault. */
export function lastOrNull<T>(c: Iterable<T>, f: (x: T) => boolean = () => true): T | null {
  const all = [...c].filter(f);
  return all.length === 0 ? null : all[all.length - 1];
}

const cmp = (a: unknown, b: unknown): number => (a === b ? 0 : (a as never) < (b as never) ? -1 : 1);

/** LINQ's OrderBy (stable, ordinal for strings). */
export function orderBy<T>(c: Iterable<T>, key: (x: T) => unknown): T[] {
  return [...c].sort((a, b) => cmp(key(a), key(b)));
}

export function orderByDesc<T>(c: Iterable<T>, key: (x: T) => unknown): T[] {
  return [...c].sort((a, b) => cmp(key(b), key(a)));
}

/** LINQ's ToDictionary. */
export function toDict<T, K, V>(c: Iterable<T>, key: (x: T) => K, value: (x: T) => V): Dict<K, V> {
  const d = new Dict<K, V>();
  for (const x of c) d.add(key(x), value(x));
  return d;
}

/** A Dict from an object's entries, in their order: the C# dictionary initializers. */
export function dictOf<K extends string, V>(o: Partial<Record<K, V>>): Dict<K, V> {
  return new Dict(Object.entries(o) as [K, V][]);
}

/** One season's submissions by power: { Hatti: { orders: [...] } }. */
export function subs(o: Partial<Record<Power, Partial<TurnSubmission>>>): Dict<Power, TurnSubmission> {
  return new Dict((Object.entries(o) as [Power, Partial<TurnSubmission>][]).map(([p, x]) => [p, newTurnSubmission(x)] as const));
}

/** C#'s string.Join over any items. */
export const join = (sep: string, xs: Iterable<unknown>): string => Array.from(xs, (x) => String(x)).join(sep);

/** List<T>.RemoveAll: removes every item that matches, in place, and says how many. */
export function removeAll<T>(list: T[], f: (x: T) => boolean): number {
  let kept = 0;
  const before = list.length;
  for (const x of list) if (!f(x)) list[kept++] = x;
  list.length = kept;
  return before - kept;
}

/**
 * A field read again after the engine changed it: TypeScript keeps a narrowing made before a call that mutates the
 * object, so a comparison right after it looks impossible to the compiler.
 */
export const fresh = <T>(x: T): T | string => x;

/** C#'s Regex.Escape, for building a pattern from a name. */
export const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A value inside parsed JSON, by its path of keys and indexes (C#'s JsonNode["a"]!["b"]!). */
export function at(json: unknown, ...path: (string | number)[]): unknown {
  let x = json;
  for (const k of path) x = x === null || x === undefined ? undefined : (x as Record<string | number, unknown>)[k];
  return x;
}

/** A string inside parsed JSON (C#'s JsonNode[...]!.GetValue<string>()). */
export const str = (json: unknown, ...path: (string | number)[]): string => at(json, ...path) as string;

/** LINQ's Average. */
export const average = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** C#'s list.Contains(record): whether a list holds an item equal by value (records compare by value in C#). */
export const holds = <T>(xs: readonly T[], x: T): boolean => xs.some((y) => JSON.stringify(plain(y)) === JSON.stringify(plain(x)));

/**
 * Walls for a city in a test, as if the map gave them at the start: standing, and known to every court. The siege tests
 * were written for Mari (walls 2), which the map review of item 7a renamed Suhu and left without walls.
 */
export function walled(s: GameState, province: string, level: number): GameState {
  s.walls.set(province, level);
  for (const p of AllPowers) s.wallsSeen.get(p).set(province, level);
  return s;
}

/**
 * A character of the given skill in everything (item 10): its competence, its true skills and what it believes of them, with
 * no inclination, as a test that once set `traits.competence` meant.
 */
export function skilled(c: Character, n: number): void {
  c.traits.competence = n;
  c.skills = newSkills({ gather: n, stealth: n, forge: n });
  c.belief = newSkills({ gather: n, stealth: n, forge: n });
  c.inclination = 0;
}

/** A job any hiring court can offer in a test: watching its own capital's province, an errand of a season (Haakon's answers to item 11a). */
export const homeJob = (p: Power): JobTerms => ({ what: "spy", where: WorldMap.default.capital(p).id });

/** The walls the free cities had until item 11+ made them powers (fortresses 2, walled towns 1, the chiefs' lands none). */
const OldWalls: Record<string, number> = {
  carchemish: 2, qadesh: 2, tyre: 2, megiddo: 2, gaza: 2, susa: 2, aleppo: 2, qatna: 2, arwad: 2,
  isuwa: 1, ugarit: 1, amurru: 1, byblos: 1, damascus: 1, alalakh: 1, sidon: 1, jerusalem: 1, shechem: 1, arrapha: 1, suhu: 1, nuhashshe: 1, sumur: 1,
};

/**
 * Land held by no one, as the free cities stood before item 11+ ("Land without a ruler": a kingdom fallen whose land nobody
 * took up): each province's holder gone (a city-state fallen with its city, its troops and tablets with it), with the walls
 * it had as a free city. For tests written for the free cities.
 */
export function unruled(s: GameState, ...provinces: string[]): GameState {
  for (const id of provinces) {
    const holder = s.owner.getOrDefault(id, null);
    if (holder !== null && WorldMap.default.get(id).capital) {
      if (!s.eliminated.includes(holder)) s.eliminated.push(holder);
      for (let i = s.units.length - 1; i >= 0; i--) if (s.units[i].power === holder) s.units.splice(i, 1);
      for (let i = s.tablets.length - 1; i >= 0; i--) if (s.tablets[i].proposedBy === holder || s.tablets[i].partner === holder) s.tablets.splice(i, 1);
      for (let i = s.copies.length - 1; i >= 0; i--) if (!s.tablets.some((t) => t.id === s.copies[i].tabletId)) s.copies.splice(i, 1);
    } else for (let i = s.units.length - 1; i >= 0; i--) if (s.units[i].province === id) s.units.splice(i, 1);
    s.owner.set(id, null);
    // Long known to every court, as the free cities were.
    s.ownerLog.push({ province: id, turn: 0, owner: null });
    const w = OldWalls[id] ?? 0;
    if (w > 0) s.walls.set(id, w);
    else s.walls.delete(id);
    for (const seen of s.wallsSeen.values()) {
      if (w > 0) seen.set(id, w);
      else seen.delete(id);
    }
  }
  return s;
}

/**
 * The provinces that were free cities and lands without a king until item 11+, Gaza and Sumur among them, the six
 * cities of Canaan item 11c carved from them, and item 11f's places.
 */
export const FormerFree = [
  "isuwa", "carchemish", "alalakh", "aleppo", "ugarit", "nuhashshe", "qatna", "qadesh", "amurru", "sumur", "arwad", "byblos", "sidon",
  "damascus", "tyre", "megiddo", "shechem", "jerusalem", "gaza", "suhu", "arrapha", "susa", "lukka", "kaska", "steppe",
  "akko", "hazor", "gezer", "ashkelon", "lachish", "hebron",
  // Item 11f's places
  "azzi", "niya", "tunip", "beirut", "pella", "ashtaroth", "libya", "shasu",
];

/**
 * The world as it stood before item 11+, for tests of the general rules written in it: every former free city held by no
 * one (its city-state fallen, see {@link unruled}), the fallen powers' servants free where they stand, and only the Great
 * Kings' starting notices.
 */
export function oldWorld(s: GameState): GameState {
  armiesBefore13(s);
  wallsBefore15(s);
  unruled(s, ...FormerFree);
  formerHomes(s);
  for (const c of s.characters)
    if (c.employer !== null && s.eliminated.includes(c.employer)) {
      c.employer = null;
      c.status = "Free";
      c.contract = null;
    }
  return s;
}

/**
 * The Great Kings' walls as they stood before item 15 set them city by city from the walls dossier: every capital 3, the
 * fortresses Memphis, Nesa and Nineveh 2, and their other cities none.
 */
export function wallsBefore15(s: GameState): GameState {
  for (const [id, level] of [["akhetaten", 3], ["apasa", 3], ["enkomi", 3], ["memphis", 2], ["nesa", 2], ["nineveh", 2]] as const) {
    s.walls.set(id, level);
    for (const seen of s.wallsSeen.values()) seen.set(id, level);
  }
  for (const id of ["nubia", "delta", "sapinuwa", "arbela", "durkurigalzu", "sippar", "nippur", "ur"]) {
    s.walls.delete(id);
    for (const seen of s.wallsSeen.values()) seen.delete(id);
  }
  return s;
}

/** The lands that were Great Kings' own until item 11d, with the troop each had there: Hana (Terqa), Mira and Seha. */
export const FormerHomes: readonly (readonly [string, Power, UnitKind])[] = [
  ["terqa", "Mitanni", "Army"],
  ["mira", "Arzawa", "Army"],
  ["seha", "Arzawa", "Fleet"],
];

/**
 * Hana, Mira and Seha back in their kings' hands, as they stood before item 11d, for tests written in that world: each
 * city-state fallen with its troops and tablets, its city its old king's without walls, and his troop standing in it.
 */
export function formerHomes(s: GameState): GameState {
  armiesBefore13(s);
  for (const [id, king, kind] of FormerHomes) {
    unruled(s, id);
    s.owner.set(id, king);
    s.ownerLog.push({ province: id, turn: 0, owner: king });
    s.units.push(newUnit({ id: newId(s, "u"), power: king, kind, province: id, home: id }));
  }
  // Each king started with that land: his growth is reckoned from it.
  const e = new TurnEngine(s);
  for (const king of new HSet(FormerHomes.map((x) => x[1]))) s.startStrength.set(king, e.strength(king));
  return s;
}

/**
 * One more province in a king's hands as `formerHomes` puts Hana back in Mitanni's (item 11f+, whose map no longer joins
 * Ashur and Ekallate to Terqa: tests that set Assyria against Mitanni there meet at Suhu instead): its city without walls,
 * and his troop standing in it.
 */
export function formerHome(s: GameState, id: string, king: Power, kind: UnitKind = "Army"): GameState {
  unruled(s, id);
  s.walls.delete(id);
  s.owner.set(id, king);
  s.ownerLog.push({ province: id, turn: 0, owner: king });
  s.units.push(newUnit({ id: newId(s, "u"), power: king, kind, province: id, home: id }));
  s.startStrength.set(king, new TurnEngine(s).strength(king));
  return s;
}

/**
 * The armies as they stood before item 13, for tests of the general rules written with them: every Great King's unit a
 * full levy (an army 5,000 men, a fleet's crews 2,000) where it stood then, a city-state's army 50 men for each shekel its
 * land yields (the lands without a town 250, Arwad a fleet of 20 a shekel), none of item 13's garrisons, fleets in the
 * waters or Alashiya's army; every unit marching at a lone traveller's pace (`armyPace` 0); and every order reaching its
 * place within the season, a king seeing his whole realm (`realmDistance` 0).
 */
export function armiesBefore13(s: GameState): GameState {
  s.config.armyPace = 0;
  s.config.realmDistance = 0;
  const map = WorldMap.default;
  const added = new Set(["gaza", "sumur", "apasawaters", "enkomiwaters", "ugaritwaters", "sidonwaters", "tyrewaters", "bybloswaters"]);
  s.units = s.units.filter((u) => !added.has(u.province) && !(u.power === "Alashiya" && u.kind === "Army"));
  for (const u of s.units) {
    const p = map.get(u.province);
    const city = p.capital && p.home === u.power && !GreatKingsBefore13.has(u.power);
    u.men = !city ? menOf(u.kind) : u.power === "Arwad" ? 20 * p.yield : (p.kingless ? 250 : 50) * p.yield;
    u.food = forMen(carriedOf(u.kind), u.kind, u.men);
  }
  if (!s.units.some((u) => u.power === "Alashiya")) s.units.push(newUnit({ id: newId(s, "u"), power: "Alashiya", kind: "Fleet", province: "enkomi", home: "enkomi", men: menOf("Fleet"), food: forMen(carriedOf("Fleet"), "Fleet", menOf("Fleet")) }));
  return s;
}

const GreatKingsBefore13 = new Set<string>(["Egypt", "Hatti", "Babylonia", "Mitanni", "Assyria", "Arzawa", "Alashiya"]);

/**
 * Item 13: every unit of these powers with a commander at its side from the start, an able and loyal officer (competence
 * 50, loyalty 100, no ambition), so its standing orders fire as they did before item 13 wherever it stands ("Standing
 * orders belong to commanders").
 */
export function commanded(s: GameState, ...powers: Power[]): GameState {
  for (const u of s.units.filter((u) => powers.includes(u.power))) {
    const c = newCharacter({
      id: newId(s, "c"),
      name: `Officer of ${u.province}`,
      origin: u.province,
      calling: "officer",
      traits: newTraits({ loyalty: 100, greed: 0, competence: 50, ambition: 0, courage: 50 }),
      status: "Free",
      duty: "Commanding",
      grantedBy: u.power,
      watchProvince: u.province,
    });
    s.characters.push(c);
    u.commander = c.id;
    u.commandFrom = 0;
  }
  return s;
}

/**
 * Item 12: a person who speaks every court's language fluently, for a test whose rule is not about languages (so that
 * nobody has to wait to be understood).
 */
export function speaksAll<T extends { tongues: Dict<string, number> }>(c: T): T {
  for (const l of ["Egyptian", "Akkadian", "Hittite", "Hurrian", "Luwian", "Canaanite", "Amorite", "Ugaritic", "Alashiyan", "Elamite", "Kaskean"]) c.tongues.set(l, 100);
  return c;
}
