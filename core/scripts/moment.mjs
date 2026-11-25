// A time as GitHub and git write one (a date, a time of day and its zone, ISO 8601), read as milliseconds since 1970,
// or null where it is none (#444): a value that is no text, a bare number, or a date or time of day that cannot be,
// such as 2026-13-45 or 2026-02-30, never read as another or as NaN. Node's own modules only.
const FORM = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u;
export function timeOf(value) {
  const m = typeof value === "string" ? FORM.exec(value) : null;
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate() || h > 23 || mi > 59 || s > 59) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}
