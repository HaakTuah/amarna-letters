/**
 * The two name settings ("History, search and names" under Interface, build order item 17+++b): places by their period
 * names or by the names a modern reader knows, and the Great Kings' realms by the names people know or by their own
 * letters' names; period places and known realms by default. Every other realm is named by its land or city, so its name
 * follows the places' setting. Only what this player sees changes: the engine's text, every seat view and every request to
 * a model keep the names as they are, and the text is rewritten here, on the page. Kept in this browser (`amarna-names`).
 */
import { FamiliarPlaceNames, PeriodRealmNames, WorldMap, powerName, type Power } from "@amarna/engine";
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
  );
}

/** Each name the settings change and what it becomes, longest first so "the Ways of Horus" goes before a shorter name in it. */
let swaps: { find: RegExp; to: Map<string, string> } | null = null;

function table(): { find: RegExp; to: Map<string, string> } {
  if (swaps !== null) return swaps;
  const to = new Map<string, string>();
  if (settings.places === "modern") for (const [id, name] of FamiliarPlaceNames) if (WorldMap.default.exists(id)) to.set(WorldMap.default.get(id).name, name);
  if (settings.realms === "period") for (const [p, { name }] of PeriodRealmNames) to.set(powerName(p), name);
  const names = [...to.keys()].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // A name as a whole word: no letter before it, and no letter or hyphen after it (Ashur is not Ashur-uballit).
  swaps = { find: names.length === 0 ? /$^/u : new RegExp(`(?<![\\p{L}])(${names.join("|")})(?![\\p{L}-])`, "gu"), to };
  return swaps;
}

/** Text as this player has chosen to read names: every place and realm name in it swapped where the settings say. */
export function shown(text: string): string {
  const t = table();
  return t.to.size === 0 ? text : text.replace(t.find, (m) => t.to.get(m) ?? m);
}

/** A province's name as shown. */
export const placeName = (id: string): string => shown(WorldMap.default.exists(id) ? WorldMap.default.get(id).name : id);

/** A realm's name as shown. */
export const realmName = (p: Power): string => shown(powerName(p));

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
