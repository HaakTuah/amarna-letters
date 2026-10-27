/**
 * Text helpers with the C# build's rules: what counts as white space (char.IsWhiteSpace), trimming, and ordinal
 * comparison (UTF-16 code units, as JavaScript's < compares strings; the C# build runs with invariant globalization).
 */

/** char.IsWhiteSpace: the Unicode space separators, line and paragraph separators, and the C0/C1 spacing controls. */
export const WS = "\t\n\v\f\r \u0085                 　";

export function isWhiteSpace(c: string): boolean {
  return c.length > 0 && WS.includes(c[0]);
}

/** string.IsNullOrWhiteSpace. */
export function isBlank(s: string | null | undefined): s is null | undefined | "" {
  if (s === null || s === undefined) return true;
  for (let i = 0; i < s.length; i++) if (!WS.includes(s[i])) return false;
  return true;
}

/** string.IsNullOrEmpty. */
export function isEmpty(s: string | null | undefined): s is null | undefined | "" {
  return s === null || s === undefined || s.length === 0;
}

/** string.Trim() (or Trim(chars) when given). */
export function trim(s: string, chars: string = WS): string {
  return trimEnd(trimStart(s, chars), chars);
}

export function trimStart(s: string, chars: string = WS): string {
  let i = 0;
  while (i < s.length && chars.includes(s[i])) i++;
  return s.slice(i);
}

export function trimEnd(s: string, chars: string = WS): string {
  let i = s.length;
  while (i > 0 && chars.includes(s[i - 1])) i--;
  return s.slice(0, i);
}

/** Ordinal comparison, as string.CompareOrdinal and the C# build's default sort. */
export function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Ordinal comparison ignoring case (StringComparison.OrdinalIgnoreCase). */
export function eqIgnoreCase(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
  return a.length === b.length && a.toUpperCase() === b.toUpperCase();
}

/** string.Split with StringSplitOptions: RemoveEmptyEntries and/or TrimEntries. */
export function split(s: string, sep: string | RegExp, removeEmpty = false, trimEntries = false): string[] {
  let parts = s.split(sep);
  if (trimEntries) parts = parts.map((p) => trim(p));
  if (removeEmpty) parts = parts.filter((p) => p.length > 0);
  return parts;
}

/** The "{0,-10}" alignment of a composite format: padded on the right (negative width) or left. */
export function align(s: string, width: number): string {
  return width < 0 ? s.padEnd(-width) : s.padStart(width);
}

/** char.IsLetter. */
export function isLetter(c: string): boolean {
  return /\p{L}/u.test(c);
}

/** char.IsDigit (Unicode decimal digits). */
export function isDigit(c: string): boolean {
  return /\p{Nd}/u.test(c);
}

/** char.IsLetterOrDigit. */
export function isLetterOrDigit(c: string): boolean {
  return /[\p{L}\p{Nd}]/u.test(c);
}

/** char.IsUpper. */
export function isUpper(c: string): boolean {
  return /\p{Lu}/u.test(c);
}

/** char.IsPunctuation. */
export function isPunctuation(c: string): boolean {
  return /\p{P}/u.test(c);
}
