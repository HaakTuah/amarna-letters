import { cmpEnum } from "../core/seq.ts";

/** The seven Great Kings of the Amarna correspondence, in their fixed order (C#'s enum order: sorting goes by it). */
export const PowerValues = ["Egypt", "Hatti", "Babylonia", "Mitanni", "Assyria", "Arzawa", "Alashiya"] as const;
export type Power = (typeof PowerValues)[number];

export const TierValues = ["Strong", "Middle", "Weak"] as const;
export type Tier = (typeof TierValues)[number];

/** Every power in the fixed order. */
export const AllPowers: readonly Power[] = PowerValues;

/** Powers in their fixed order (C#'s OrderBy on the enum). */
export const cmpPower = cmpEnum(PowerValues);

const powerIndex = new Map<string, number>(PowerValues.map((p, i) => [p, i]));
/** A power's place in the fixed order (its enum value in C#). */
export function powerOrdinal(p: Power): number {
  return powerIndex.get(p)!;
}

export function tier(p: Power): Tier {
  switch (p) {
    case "Egypt":
    case "Hatti":
    case "Babylonia":
      return "Strong";
    case "Mitanni":
    case "Assyria":
      return "Middle";
    default:
      return "Weak";
  }
}

/** The land's name as it appears in letters. */
export function land(p: Power): string {
  switch (p) {
    case "Hatti":
      return "Hatti";
    case "Babylonia":
      return "Karduniash";
    case "Mitanni":
      return "Mitanni";
    default:
      return p;
  }
}

/** The reigning king, by the names the letters use. */
export function king(p: Power): string {
  switch (p) {
    case "Egypt":
      return "Napkhururiya";
    case "Hatti":
      return "Suppiluliuma";
    case "Babylonia":
      return "Burna-Buriash";
    case "Mitanni":
      return "Tushratta";
    case "Assyria":
      return "Ashur-uballit";
    case "Arzawa":
      return "Tarhundaradu";
    case "Alashiya":
      return "the King of Alashiya";
  }
}

export function adjective(p: Power): string {
  switch (p) {
    case "Egypt":
      return "Egyptian";
    case "Hatti":
      return "Hittite";
    case "Babylonia":
      return "Babylonian";
    case "Mitanni":
      return "Mitannian";
    case "Assyria":
      return "Assyrian";
    case "Arzawa":
      return "Arzawan";
    case "Alashiya":
      return "Alashiyan";
  }
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
