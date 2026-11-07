/**
 * The two name settings ("History, search and names" under Interface, build order item 17+++b): places by their period
 * names or by the names a modern reader knows, and realms, every one of them, by the names people know or by their own
 * letters' names (the owner, 7 November 2026, #768): period places and known realms by default, so Gubla's realm reads
 * Byblos while the city reads Gubla. Only what this player sees changes: the engine's text, every seat view and every
 * request to a model keep the names as they are, and the text is rewritten here, on the page. Kept in this browser
 * (`amarna-names`).
 */
import { AllPowers, FamiliarPlaceNames, GreatKings, PeriodRealmNames, WorldMap, powerName, type FixedPower, type Power } from "@amarna/engine";
import { useSyncExternalStore } from "react";

export interface NameSettings {
  places: "period" | "modern";
  realms: "known" | "period";
}

const Stored = "amarna-names";
const Default: NameSettings = { places: "period", realms: "known" };
let settings: NameSettings = read();
const listeners = new Set<() => void>();

function read(): NameSettings {
  try {
    const v = JSON.parse(localStorage.getItem(Stored) ?? "{}") as Partial<NameSettings>;
    return { places: v.places === "modern" ? "modern" : "period", realms: v.realms === "period" ? "period" : "known" };
  } catch {
    return { ...Default };
  }
}

/** The names shown now. */
export const nameSettings = (): NameSettings => settings;

/** Changes a setting, keeps it in this browser, and redraws every page that shows names. */
export function setNames(change: Partial<NameSettings>): void {
  settings = { ...settings, ...change };
  swaps = null;
  try {
    localStorage.setItem(Stored, JSON.stringify(settings));
  } catch {
    // private window or blocked storage: the setting lasts this page only
  }
  for (const l of listeners) l();
}

/** Re-renders a component whenever a name setting changes; returns the settings. */
export function useNames(): NameSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
    // The same on a server render (the canary renders the panels to static markup).
    () => settings,
  );
}

/**
 * A realm's name as the realms' setting shows it, from the name the engine gives it. A Great King's realm: the name people
 * know, or its letters' own (`PeriodRealmNames`). Any other realm is named by its city or land, a place: the name a
 * reader knows that place by (Byblos for Gubla), or its name of 1346; a realm named for no place keeps its name.
 */
function realmShown(name: string): string {
  const great = GreatKings.find((p) => powerName(p) === name);
  if (great !== undefined) return settings.realms === "period" ? (PeriodRealmNames.get(great as FixedPower)?.name ?? name) : name;
  return settings.realms === "known" ? (familiar().get(name) ?? name) : name;
}

/** Each province's name of 1346 and the name a reader knows it by, where they differ. */
let familiarByName: Map<string, string> | null = null;
function familiar(): Map<string, string> {
  familiarByName ??= new Map<string, string>([...FamiliarPlaceNames].filter(([id]) => WorldMap.default.exists(id)).map(([id, name]) => [WorldMap.default.get(id).name, name]));
  return familiarByName;
}

/** The words before a name that make it a realm's, not a place's: "the court of Gubla", "the king of Gubla". */
const RealmBefore = "(?:court|courts|king|kings|queen|envoy|envoys|ruler|chief|lord|realm|throne|house|army|armies|fleet|people) of ";

/**
 * Each name the settings change and what it becomes, longest first so "the Ways of Horus" goes before a shorter name in
 * it. A name both a realm's and a place's (Gubla) is a realm's only after words that say so; elsewhere it is the place's.
 */
let swaps: { find: RegExp; place: Map<string, string>; realm: Map<string, string> } | null = null;

function table(): { find: RegExp; place: Map<string, string>; realm: Map<string, string> } {
  if (swaps !== null) return swaps;
  const place = new Map<string, string>();
  if (settings.places === "modern") for (const [name, known] of familiar()) place.set(name, known);
  // Every realm's name as the realms' setting shows it, where it differs from the engine's.
  const realm = new Map<string, string>();
  for (const p of AllPowers) {
    const n = powerName(p);
    if (realmShown(n) !== n) realm.set(n, realmShown(n));
  }
  // A name only a realm bears is that realm's wherever it stands; one a place bears too, only after realm words.
  for (const [n, to] of realm) if (!familiar().has(n) && !WorldMap.default.provinces.some((x) => x.name === n)) place.set(n, to);
  // A realm word's name keeps its realm's name even where the place would be renamed.
  for (const p of AllPowers) if (!realm.has(powerName(p)) && place.has(powerName(p))) realm.set(powerName(p), powerName(p));
  const alt = (names: Iterable<string>): string =>
    [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") || "$^";
  // A name as a whole word: no letter before it, and no letter or hyphen after it (Ashur is not Ashur-uballit).
  const word = (names: string): string => `(?<![\\p{L}])(${names})(?![\\p{L}-])`;
  swaps = { find: new RegExp(`(?<![\\p{L}])(${RealmBefore})${word(alt(realm.keys()))}|${word(alt(place.keys()))}`, "gu"), place, realm };
  return swaps;
}

/** Text as this player has chosen to read names: every place and realm name in it swapped where the settings say. */
export function shown(text: string): string {
  const t = table();
  if (t.place.size === 0 && t.realm.size === 0) return text;
  return text.replace(t.find, (m: string, before?: string, realm?: string, place?: string) =>
    before !== undefined && realm !== undefined ? before + (t.realm.get(realm) ?? realm) : place !== undefined ? (t.place.get(place) ?? place) : m,
  );
}

/** A province's name as shown. */
export const placeName = (id: string): string => shown(WorldMap.default.exists(id) ? WorldMap.default.get(id).name : id);

/** A realm's name as shown. */
export const realmName = (p: Power): string => realmShown(powerName(p));

/** The name the other settings would show for a realm, for a card's second line; null where both show the same. */
export function otherRealmName(p: Power): string | null {
  const now = realmName(p);
  const other = settingsFlipped(() => realmName(p));
  return other !== now ? other : null;
}

/** The name the other setting would show for an engine name, for a card's second line; null where both show the same. */
export function otherName(name: string): string | null {
  const now = shown(name);
  const other = settingsFlipped(() => shown(name));
  return other !== now ? other : null;
}

function settingsFlipped<T>(fn: () => T): T {
  const was = settings;
  settings = { places: was.places === "period" ? "modern" : "period", realms: was.realms === "known" ? "period" : "known" };
  swaps = null;
  try {
    return fn();
  } finally {
    settings = was;
    swaps = null;
  }
}
