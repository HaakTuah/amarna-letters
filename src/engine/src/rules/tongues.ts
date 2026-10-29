/**
 * Who speaks what at the start (build order item 12, "Who speaks what", from `docs/history/07-languages.md`, "Who spoke
 * what"): a character speaks the tongues of the province it comes from, the widest fluently and the others as widely as
 * they are spoken there, and Akkadian by its background, highest for scribes, interpreters, merchants and envoys; its
 * aptitude for languages is hidden, and more common among scribes and merchants. A king speaks his court's language and
 * what is commonly spoken at his capital. First guesses for the numbers, listed in the item's report.
 */
import { Dict } from "../core/collections.ts";
import { clamp } from "../core/num.ts";
import { Rng } from "../core/rng.ts";
import { beyondTongue, courtSpeaks, doorTongue, originProvince, peopleSpeak, Spread } from "../model/languages.ts";
import { WorldMap } from "../model/map.ts";
import type { Character } from "../model/people.ts";
import type { Power } from "../model/power.ts";

/** Callings that live by words: Akkadian at a scribe's or an envoy's level, and a quicker ear. */
const Lettered = ["scribe", "interpreter", "envoy"];
const Trading = ["merchant", "trader", "caravan", "steward", "physician", "priest", "sailor"];

const callingIs = (c: Character, words: readonly string[]): boolean => words.some((w) => c.calling.toLowerCase().includes(w));

/** The province whose tongues a character grew up with, from its origin: a province's own name, or a town the table knows. */
export function homeProvince(origin: string, map: WorldMap = WorldMap.default): string | null {
  const named = originProvince(origin);
  if (named !== null) return named;
  const lower = origin.toLowerCase();
  const p = map.provinces.find((x) => !x.isSea && (x.name.toLowerCase() === lower || x.id === lower));
  return p?.id ?? null;
}

/**
 * Draws a character's languages and its aptitude from its origin and calling, from a stream of its own so that no other
 * draw changes. A stranger from beyond the map speaks his own people's tongue (set by {@link doorTongues}).
 */
export function drawTongues(seed: number, c: Character): void {
  const rng = Rng.for(seed, 0, "tongues", c.id);
  const lettered = callingIs(c, Lettered);
  const trading = callingIs(c, Trading);
  c.aptitude = clamp(rng.range(5, 85) + (lettered || trading ? 15 : 0), 0, 100);
  const t = new Dict<string, number>();
  const home = homeProvince(c.origin);
  const beyond = home === null ? beyondTongue(c.origin) : null;
  if (home !== null) {
    const spoken = peopleSpeak(home);
    const top = Math.max(0, ...spoken.map(([, w]) => w));
    for (const [l, w] of spoken) {
      if (w === top) t.set(l, 100);
      else if (w >= Spread.common && rng.chance(0.6)) t.set(l, rng.range(40, 90));
      else if (w >= Spread.some && rng.chance(0.3)) t.set(l, rng.range(15, 60));
    }
  } else t.set(beyond ?? "Akkadian", 100);
  // Akkadian by background ("highest for scribes, merchants and former envoys").
  const akk = lettered ? rng.range(60, 95) : trading ? rng.range(30, 75) : rng.chance(0.3) ? rng.range(10, 45) : 0;
  if (akk > t.getOrDefault("Akkadian", 0)) t.set("Akkadian", akk);
  // An interpreter has a court's language more, as Pharaoh's Hane did.
  if (c.calling.toLowerCase().includes("interpreter")) {
    const pool = ["Egyptian", "Hittite", "Hurrian", "Luwian", "Akkadian"].filter((l) => t.getOrDefault(l, 0) < 50);
    if (pool.length > 0) {
      const other = rng.pick(pool);
      t.set(other, Math.max(t.getOrDefault(other, 0), rng.range(50, 90)));
    }
  }
  // A Nubian in Egypt's service speaks a Nubian tongue as well as Egyptian.
  if (c.facts.some((f) => f.tag === "nubian")) {
    t.set("Nubian", 100);
    t.set("Egyptian", Math.max(t.getOrDefault("Egyptian", 0), 90));
  }
  c.tongues = t;
}

/**
 * A stranger through a door ("Who speaks what", decided 21 October 2026): his own people's tongue fluently; a trader or a
 * soldier for hire who has come this way before some of the map language spoken where his door opens; a wanderer, a
 * refugee or a man from the tin lands none. A local coming home keeps the tongues of his origin.
 */
export function doorTongues(seed: number, c: Character, beyondLand: string, trader: boolean, doorProvince: string): void {
  const rng = Rng.for(seed, 0, "door-tongues", c.id);
  const own = beyondTongue(beyondLand) ?? "the tongue of " + beyondLand;
  const t = new Dict<string, number>([[own, 100]]);
  const map = doorTongue(doorProvince);
  if (trader && map !== null && beyondLand !== "the tin lands") t.set(map, Math.max(t.getOrDefault(map, 0), rng.range(15, 45)));
  c.tongues = t;
}

/**
 * A servant at the start has lived at the court he serves for years: he speaks its language well at least ("Learning by
 * living there").
 */
export function servedThere(seed: number, c: Character, court: Power, capital: string): void {
  const l = courtSpeaks(court, capital);
  if (c.tongues.getOrDefault(l, 0) >= 60) return;
  c.tongues.set(l, Rng.for(seed, 0, "served-tongue", c.id).range(60, 95));
}

/** A king's languages at the start: his court's, fluently, and what is spoken widely or commonly at his capital. */
export function kingTongues(court: Power, capital: string): Dict<string, number> {
  const t = new Dict<string, number>();
  for (const [l, w] of peopleSpeak(capital)) if (w >= Spread.common) t.set(l, w >= Spread.wide ? 100 : 50);
  t.set(courtSpeaks(court, capital), 100);
  return t;
}
