/**
 * The few LINQ shapes the port leans on, with C#'s semantics: OrderBy is stable (as Array.prototype.sort is), nulls sort
 * first, booleans false before true, enums by their declared order, strings by ordinal. Sum of nothing is 0; Max and Min
 * of nothing throw, as in C#.
 */
import { cmpStr } from "./text.ts";

export type Cmp<T> = (a: T, b: T) => number;

export const cmpNum: Cmp<number> = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const cmpBool: Cmp<boolean> = (a, b) => (a === b ? 0 : a ? 1 : -1);
export { cmpStr };

/** Nulls first, then by the comparison given (Comparer<T?>.Default). */
export function cmpOpt<T>(cmp: Cmp<T>): Cmp<T | null | undefined> {
  return (a, b) => {
    const an = a === null || a === undefined;
    const bn = b === null || b === undefined;
    if (an || bn) return an && bn ? 0 : an ? -1 : 1;
    return cmp(a, b);
  };
}

/** An enum's order: by its index among the declared values. */
export function cmpEnum<T extends string>(values: readonly T[]): Cmp<T> {
  const index = new Map<string, number>(values.map((v, i) => [v, i]));
  return (a, b) => index.get(a)! - index.get(b)!;
}

/** Sorts a copy by keys, each with its comparison, the first key first (OrderBy().ThenBy()...). Stable. */
export function sortBy<T>(items: Iterable<T>, ...keys: [(x: T) => unknown, Cmp<never>][]): T[] {
  const list = [...items];
  return list.sort((a, b) => {
    for (const [key, cmp] of keys) {
      const c = (cmp as Cmp<unknown>)(key(a), key(b));
      if (c !== 0) return c;
    }
    return 0;
  });
}

/** Descending comparison (OrderByDescending). */
export function desc<T>(cmp: Cmp<T>): Cmp<T> {
  return (a, b) => cmp(b, a);
}

export function sum<T>(items: Iterable<T>, f: (x: T) => number): number {
  let s = 0;
  for (const x of items) s += f(x);
  return s;
}

export function count<T>(items: Iterable<T>, f: (x: T) => boolean): number {
  let n = 0;
  for (const x of items) if (f(x)) n++;
  return n;
}

export function max<T>(items: Iterable<T>, f: (x: T) => number): number {
  let m = -Infinity;
  let any = false;
  for (const x of items) {
    const v = f(x);
    if (!any || v > m) m = v;
    any = true;
  }
  if (!any) throw new Error("Sequence contains no elements");
  return m;
}

export function min<T>(items: Iterable<T>, f: (x: T) => number): number {
  let m = Infinity;
  let any = false;
  for (const x of items) {
    const v = f(x);
    if (!any || v < m) m = v;
    any = true;
  }
  if (!any) throw new Error("Sequence contains no elements");
  return m;
}

/** The first item that is greatest by a key (MaxBy: the first of equals). */
export function maxBy<T>(items: Iterable<T>, f: (x: T) => number): T | undefined {
  let best: T | undefined;
  let m = -Infinity;
  let any = false;
  for (const x of items) {
    const v = f(x);
    if (!any || v > m) {
      m = v;
      best = x;
    }
    any = true;
  }
  return best;
}

/** The first item that is least by a key (MinBy). */
export function minBy<T>(items: Iterable<T>, f: (x: T) => number): T | undefined {
  let best: T | undefined;
  let m = Infinity;
  let any = false;
  for (const x of items) {
    const v = f(x);
    if (!any || v < m) {
      m = v;
      best = x;
    }
    any = true;
  }
  return best;
}

/** First item matching, or throws (First). */
export function first<T>(items: Iterable<T>, f: (x: T) => boolean = () => true): T {
  for (const x of items) if (f(x)) return x;
  throw new Error("Sequence contains no matching element");
}

/** The only item matching, or throws (Single). */
export function single<T>(items: Iterable<T>, f: (x: T) => boolean = () => true): T {
  let found: T | undefined;
  let n = 0;
  for (const x of items)
    if (f(x)) {
      found = x;
      n++;
    }
  if (n !== 1) throw new Error(n === 0 ? "Sequence contains no matching element" : "Sequence contains more than one matching element");
  return found as T;
}

/** Distinct, keeping the first of each (by identity, or by a key). */
export function distinct<T>(items: Iterable<T>, key: (x: T) => unknown = (x) => x): T[] {
  const seen = new Set<unknown>();
  const out: T[] = [];
  for (const x of items) {
    const k = key(x);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

/** GroupBy: groups in the order their keys first appear, items in order. */
export function groupBy<T, K>(items: Iterable<T>, key: (x: T) => K): [K, T[]][] {
  const map = new Map<K, T[]>();
  for (const x of items) {
    const k = key(x);
    let g = map.get(k);
    if (!g) map.set(k, (g = []));
    g.push(x);
  }
  return [...map.entries()];
}

/** Enumerable.Range. */
export function range(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => start + i);
}

/** SequenceEqual. */
export function seqEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
