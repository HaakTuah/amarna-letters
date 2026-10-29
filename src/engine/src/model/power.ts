import { cmpEnum } from "../core/seq.ts";

/**
 * The powers, in their fixed order (C#'s enum order: sorting goes by it): the seven Great Kings of the Amarna
 * correspondence, then, since build order item 11+ ("City-states as powers"), the city-states and the lands under one
 * leader, each a power like the kings ("One scoreboard for every power"), north to south and west to east. Who they are
 * comes from the politics dossier (`docs/history/01-politics.md`).
 */
export const PowerValues = [
  "Egypt",
  "Hatti",
  "Babylonia",
  "Mitanni",
  "Assyria",
  "Arzawa",
  "Alashiya",
  "Kaska",
  "Lukka",
  "Seha",
  "Mira",
  "Isuwa",
  "Carchemish",
  "Alalakh",
  "Aleppo",
  "Ugarit",
  "Nuhashshe",
  "Qadesh",
  "Qatna",
  "Arwad",
  "Amurru",
  "Byblos",
  "Sidon",
  "Damascus",
  "Tyre",
  "Megiddo",
  "Shechem",
  "Jerusalem",
  "Terqa",
  "Suhu",
  "Suteans",
  "Arrapha",
  "Elam",
] as const;
export type Power = (typeof PowerValues)[number];

/** How a power is reckoned at the start: data, never a rule ("Different data, same rules"). */
export const TierValues = ["Strong", "Middle", "Weak", "City"] as const;
export type Tier = (typeof TierValues)[number];

/** Every power in the fixed order. */
export const AllPowers: readonly Power[] = PowerValues;

/** The seven Great Kings, who call each other brother: presentation and the claims to the rank (item 8), never a rule. */
export const GreatKings: readonly Power[] = PowerValues.slice(0, 7);

/** Powers in their fixed order (C#'s OrderBy on the enum). */
export const cmpPower = cmpEnum(PowerValues);

const powerIndex = new Map<string, number>(PowerValues.map((p, i) => [p, i]));
/** A power's place in the fixed order (its enum value in C#). */
export function powerOrdinal(p: Power): number {
  return powerIndex.get(p)!;
}

/** Whether a power is one of the seven Great Kings (presentation: greetings, titles, the start's words). */
export function isGreatKing(p: Power): boolean {
  return powerIndex.get(p)! < 7;
}

interface PowerData {
  /** The land's name as letters use it. */
  readonly land: string;
  /** The reigning ruler in 1346, by the name the letters use; "the king of ..." where the sources name none. */
  readonly king: string;
  readonly adjective: string;
  readonly tier: Tier;
}

const d = (land: string, king: string, adjective: string, tier: Tier = "City"): PowerData => ({ land, king, adjective, tier });

/**
 * Each power's names. The Great Kings' as before; the city-states' rulers from the politics dossier ("The Levant and
 * northern Syria, city by city"): Shechem under Mut-Baal, a son of Labaya, as item 7 read it; the lands without a king
 * (Kaska, Lukka, the Suteans) under a chief ("Land without a ruler").
 */
const Data: Record<Power, PowerData> = {
  Egypt: d("Egypt", "Napkhururiya", "Egyptian", "Strong"),
  Hatti: d("Hatti", "Suppiluliuma", "Hittite", "Strong"),
  Babylonia: d("Karduniash", "Burna-Buriash", "Babylonian", "Strong"),
  Mitanni: d("Mitanni", "Tushratta", "Mitannian", "Middle"),
  Assyria: d("Assyria", "Ashur-uballit", "Assyrian", "Middle"),
  Arzawa: d("Arzawa", "Tarhundaradu", "Arzawan", "Weak"),
  Alashiya: d("Alashiya", "the King of Alashiya", "Alashiyan", "Weak"),
  Kaska: d("Kaska", "the chief of the Kaska", "Kaskan"),
  Lukka: d("Lukka", "the chief of the Lukka men", "Lukkan"),
  // Item 11d: Arzawa's lands with their own rulers, and Hana under Mitanni (the politics dossier names no ruler of 1346)
  Seha: d("the Seha River Land", "the king of the Seha River Land", "Sehan"),
  Mira: d("Mira", "the king of Mira", "Miran"),
  Terqa: d("Hana", "the king of Hana", "Hanean"),
  Isuwa: d("Isuwa", "the king of Isuwa", "Isuwan"),
  Carchemish: d("Carchemish", "the king of Carchemish", "Carchemishite"),
  Alalakh: d("Mukish", "Itur-Addu", "Mukishite"),
  Aleppo: d("Halab", "the king of Halab", "Halabite"),
  Ugarit: d("Ugarit", "Niqmaddu", "Ugaritic"),
  Nuhashshe: d("Nuhashshe", "Addu-nirari", "Nuhashshean"),
  Qadesh: d("Qadesh", "Aitakama", "Qadeshite"),
  Qatna: d("Qatna", "Akizzi", "Qatnean"),
  Arwad: d("Arwad", "the king of Arwad", "Arwadite"),
  Amurru: d("Amurru", "Aziru", "Amorite"),
  Byblos: d("Byblos", "Rib-Hadda", "Byblian"),
  Sidon: d("Sidon", "Zimrida", "Sidonian"),
  Damascus: d("Upe", "Biryawaza", "Damascene"),
  Tyre: d("Tyre", "Abi-Milku", "Tyrian"),
  Megiddo: d("Megiddo", "Biridiya", "Megiddite"),
  Shechem: d("Shechem", "Mut-Baal", "Shechemite"),
  Jerusalem: d("Jerusalem", "Abdi-Heba", "Jerusalemite"),
  Suhu: d("Suhu", "the king of Suhu", "Suhean"),
  Suteans: d("the Sutean steppe", "the chief of the Suteans", "Sutean"),
  Arrapha: d("Arrapha", "the king of Arrapha", "Arraphan"),
  Elam: d("Elam", "the king of Elam", "Elamite"),
};

/** A power's tier at the start (data for script players' styles and the start screen; no rule reads it). */
export function tier(p: Power): Tier {
  return Data[p].tier;
}

/** The land's name as it appears in letters. */
export function land(p: Power): string {
  return Data[p].land;
}

/** The reigning king (or chief), by the names the letters use. */
export function king(p: Power): string {
  return Data[p].king;
}

/** Whether the sources name the ruler: an unnamed one is "the king of ...", and is written so. */
export function rulerNamed(p: Power): boolean {
  return !Data[p].king.toLowerCase().startsWith("the ");
}

export function adjective(p: Power): string {
  return Data[p].adjective;
}

/**
 * A power named by its name or its land's (any case), as Powers.TryParse reads it; null if none. Like C#'s
 * Enum.TryParse it also takes a power's number ("0" is Egypt).
 */
export function parsePower(s: string | null | undefined): Power | null {
  if (s === null || s === undefined) return null;
  const t = s.trim();
  if (t === "") return null;
  const lower = t.toLowerCase();
  for (const p of PowerValues) if (p.toLowerCase() === lower) return p;
  if (/^[+-]?\d+$/.test(t)) {
    const n = Number(t);
    return n >= 0 && n < PowerValues.length ? PowerValues[n] : null;
  }
  for (const p of PowerValues) if (land(p).toLowerCase() === lower) return p;
  return null;
}

/** An enum value parsed as C#'s Enum.TryParse(ignoreCase: true) does: by name, or by number. */
export function parseEnum<T extends string>(values: readonly T[], s: string | null | undefined): T | null {
  if (s === null || s === undefined) return null;
  const t = s.trim();
  const lower = t.toLowerCase();
  for (const v of values) if (v.toLowerCase() === lower) return v;
  if (/^[+-]?\d+$/.test(t)) {
    const n = Number(t);
    return n >= 0 && n < values.length ? values[n] : null;
  }
  return null;
}
