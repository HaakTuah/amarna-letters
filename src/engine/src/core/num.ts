/**
 * Integer, rounding and number-formatting helpers that reproduce the C# build exactly (build order item 5+). JavaScript
 * numbers are all doubles, so the C# integer and rounding rules go through here: integer division truncates toward zero,
 * Math.Round rounds half to even, and every number written into text uses the C# formats. The parity check proves them.
 */

/** C# integer division: truncates toward zero. */
export function idiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** C#'s (int) cast of a double: truncates toward zero. */
export function toInt(x: number): number {
  return Math.trunc(x) + 0; // + 0 turns -0 into 0
}

/** Math.Round(x): to the nearest whole number, halves to the even one. */
export function roundEven(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  let r: number;
  if (d < 0.5) r = f;
  else if (d > 0.5) r = f + 1;
  else r = f % 2 === 0 ? f : f + 1;
  // C# keeps the sign of a negative value that rounds to zero (-0.0).
  return r === 0 && (x < 0 || Object.is(x, -0)) ? -0 : r;
}

const POW10 = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15];

/** Math.Round(x, digits): as .NET does it, x scaled by 10^digits, rounded half to even, and scaled back. */
export function roundTo(x: number, digits: number): number {
  if (Math.abs(x) >= 1e16) return x;
  const p = POW10[digits];
  return roundEven(x * p) / p;
}

/** Math.Round(x, MidpointRounding.AwayFromZero). */
export function roundAway(x: number): number {
  const r = Math.sign(x) * Math.floor(Math.abs(x) + 0.5);
  return r + 0;
}

/** Math.Clamp. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// ---------------------------------------------------------------- formatting

/** The shortest digits that round-trip, and the decimal exponent of the first: 1234.5 -> ["12345", 3]. */
function shortest(x: number): [string, number] {
  const e = x.toExponential(); // shortest round-trip digits, "1.2345e+3"
  const [m, ex] = e.split("e");
  return [m.replace(".", "").replace("-", ""), Number(ex)];
}

/** Digits and exponent laid out as C# writes them: plain decimal, or "1.5E+20", "1E-05". */
function layout(neg: boolean, digits: string, exp: number, scientific: boolean): string {
  const sign = neg ? "-" : "";
  if (scientific) {
    const mant = digits.length > 1 ? digits[0] + "." + digits.slice(1) : digits;
    const es = Math.abs(exp).toString().padStart(2, "0");
    return `${sign}${mant}E${exp < 0 ? "-" : "+"}${es}`;
  }
  if (exp < 0) return `${sign}0.${"0".repeat(-exp - 1)}${digits}`;
  if (digits.length <= exp + 1) return sign + digits + "0".repeat(exp + 1 - digits.length);
  return `${sign}${digits.slice(0, exp + 1)}.${digits.slice(exp + 1)}`;
}

/**
 * A double as C# writes it with ToString() and in JSON: the shortest digits that round-trip, plain from 0.0001 up to
 * below 1E+17, otherwise in scientific notation ("1E-05", "1.5E+20"). Negative zero is "-0".
 */
export function dbl(x: number): string {
  if (Number.isNaN(x)) return "NaN";
  if (!Number.isFinite(x)) return x > 0 ? "∞" : "-∞";
  if (x === 0) return Object.is(x, -0) ? "-0" : "0";
  const [digits, exp] = shortest(x);
  return layout(x < 0, digits, exp, exp < -4 || exp >= 17);
}

/** A number as C# interpolates it: an int as is, a double by {@link dbl}. Use for doubles; ints may use String(). */
export function num(x: number): string {
  return Number.isInteger(x) && !Object.is(x, -0) ? String(x) : dbl(x);
}

/**
 * The 15 significant digits C# rounds a double to before a custom format ("0.00") rounds it again: digits and the
 * exponent of the first.
 */
function digits15(x: number): [string, number] {
  const e = Math.abs(x).toExponential(14); // 15 significant digits, rounded on the exact value
  const [m, ex] = e.split("e");
  let d = m.replace(".", "");
  d = d.replace(/0+$/, "");
  if (d === "") d = "0";
  return [d, Number(ex)];
}

/** Adds one to a string of decimal digits. */
function incDigits(s: string): string {
  const arr = s.split("");
  let i = arr.length - 1;
  while (i >= 0) {
    if (arr[i] === "9") {
      arr[i] = "0";
      i--;
    } else {
      arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1);
      return arr.join("");
    }
  }
  return "1" + arr.join("");
}

/**
 * A custom numeric format of C#'s with zeros and hashes after the point: "0", "0.0", "0.00", "0.#". As .NET does it: the
 * double is first taken to 15 significant digits, then rounded half away from zero to the places the format shows; a
 * hash place shows only a digit that is not a trailing zero. A negative number that rounds to zero keeps its sign ("-0").
 */
export function fmt(x: number, format: "0" | "0.0" | "0.00" | "0.#" | "0.##"): string {
  const dot = format.indexOf(".");
  const places = dot < 0 ? 0 : format.length - dot - 1;
  const required = dot < 0 ? 0 : format.slice(dot + 1).replace(/#/g, "").length;
  const neg = x < 0 || Object.is(x, -0);
  // The value times 10^places, rounded half away from zero, as a digit string.
  let scaled = "0";
  if (x !== 0) {
    const [d, e] = digits15(x);
    const keep = e + 1 + places;
    if (keep >= 0) {
      const head = keep === 0 ? "0" : d.slice(0, keep).padEnd(keep, "0");
      const next = keep < d.length ? d.charCodeAt(keep) - 48 : 0;
      scaled = next >= 5 ? incDigits(head) : head;
    }
  }
  scaled = scaled.replace(/^0+(?=\d)/, "").padStart(places + 1, "0");
  const intPart = scaled.slice(0, scaled.length - places);
  let f = scaled.slice(scaled.length - places);
  while (f.length > required && f.endsWith("0")) f = f.slice(0, -1);
  return (neg ? "-" : "") + intPart + (f.length ? "." + f : "");
}

/**
 * The standard format "N" (default two places) or "N0": the exact value rounded half to even, with thousands separated
 * by commas (invariant culture).
 */
export function fmtN(x: number, decimals = 2): string {
  const neg = x < 0 || Object.is(x, -0);
  const [whole, frac] = exactRound(Math.abs(x), decimals);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + grouped + (decimals > 0 ? "." + frac : "");
}

/** |x| rounded half to even on its exact binary value to `decimals` places: whole and fraction digits. */
function exactRound(x: number, decimals: number): [string, string] {
  // x = m * 2^e exactly.
  if (x === 0) return ["0", "0".repeat(decimals)];
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const hi = buf.getUint32(0);
  const lo = buf.getUint32(4);
  const expBits = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e: number;
  if (expBits === 0) e = -1074;
  else {
    mant |= 1n << 52n;
    e = expBits - 1075;
  }
  const scale = 10n ** BigInt(decimals);
  let num: bigint;
  let den: bigint;
  if (e >= 0) {
    num = mant * (1n << BigInt(e)) * scale;
    den = 1n;
  } else {
    num = mant * scale;
    den = 1n << BigInt(-e);
  }
  let q = num / den;
  const r = num - q * den;
  if (r * 2n > den || (r * 2n === den && q % 2n === 1n)) q += 1n;
  const s = q.toString().padStart(decimals + 1, "0");
  return [s.slice(0, s.length - decimals), s.slice(s.length - decimals)];
}

/** C#'s "x16" format of a 64-bit hash given as hex: lower-case, 16 digits. */
export function hex16(h: string): string {
  return h.padStart(16, "0");
}
