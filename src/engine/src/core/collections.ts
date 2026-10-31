/**
 * Dictionaries and sets that keep the C# build's enumeration order exactly. A .NET Dictionary or HashSet enumerates its
 * entry slots in order: insertion order, except that a removed entry's slot is reused by the next one added (the last
 * freed first). A JavaScript Map always appends, so after a removal the two would disagree; the state's JSON and every
 * loop over a dictionary would then differ between the builds. These classes reproduce the slot rule.
 */
/**
 * Walks the live slots of a Dict or an HSet in order (item 17a: a hand-written iterator; the generators it replaces were a
 * tenth of a season's time and most of its garbage). The slot arrays are read as they stand, so an item added while
 * iterating is seen, as the generators saw it.
 */
class SlotIterator<T> implements IterableIterator<T> {
  private i = 0;
  private readonly slots: readonly unknown[];
  private readonly slotNext: readonly number[];
  private readonly at: (i: number) => T;
  constructor(slots: readonly unknown[], slotNext: readonly number[], at: (i: number) => T) {
    this.slots = slots;
    this.slotNext = slotNext;
    this.at = at;
  }
  next(): IteratorResult<T> {
    while (this.i < this.slots.length) {
      const i = this.i++;
      if (this.slotNext[i] === -2) return { value: this.at(i), done: false };
    }
    return { value: undefined as T, done: true };
  }
  [Symbol.iterator](): IterableIterator<T> {
    return this;
  }
}

export class Dict<K, V> implements Iterable<[K, V]> {
  private slotKeys: K[] = [];
  private slotValues: V[] = [];
  /** For a free slot, the next free slot (or -1); for a used one, -2. */
  private slotNext: number[] = [];
  private index = new Map<K, number>();
  private freeList = -1;
  private freeCount = 0;

  constructor(entries?: Iterable<readonly [K, V]>) {
    if (entries) for (const [k, v] of entries) this.add(k, v);
  }

  get size(): number {
    return this.index.size;
  }

  has(key: K): boolean {
    return this.index.has(key);
  }

  /** The value for a key; throws when it is missing, as the C# indexer does. */
  get(key: K): V {
    const i = this.index.get(key);
    if (i === undefined) throw new Error(`The given key '${String(key)}' was not present in the dictionary.`);
    return this.slotValues[i];
  }

  /** The value for a key, or undefined. */
  tryGet(key: K): V | undefined {
    const i = this.index.get(key);
    return i === undefined ? undefined : this.slotValues[i];
  }

  getOrDefault(key: K, fallback: V): V {
    const i = this.index.get(key);
    return i === undefined ? fallback : this.slotValues[i];
  }

  /** Sets a key's value: in place if present, else as a new entry (the C# indexer). */
  set(key: K, value: V): this {
    const i = this.index.get(key);
    if (i !== undefined) this.slotValues[i] = value;
    else this.insert(key, value);
    return this;
  }

  /** Adds a new key; throws when it is present, as Dictionary.Add does. */
  add(key: K, value: V): void {
    if (this.index.has(key)) throw new Error(`An item with the same key has already been added. Key: ${String(key)}`);
    this.insert(key, value);
  }

  tryAdd(key: K, value: V): boolean {
    if (this.index.has(key)) return false;
    this.insert(key, value);
    return true;
  }

  delete(key: K): boolean {
    const i = this.index.get(key);
    if (i === undefined) return false;
    this.index.delete(key);
    this.slotKeys[i] = undefined as K;
    this.slotValues[i] = undefined as V;
    this.slotNext[i] = this.freeList;
    this.freeList = i;
    this.freeCount++;
    return true;
  }

  clear(): void {
    this.slotKeys = [];
    this.slotValues = [];
    this.slotNext = [];
    this.index.clear();
    this.freeList = -1;
    this.freeCount = 0;
  }

  private insert(key: K, value: V): void {
    let i: number;
    if (this.freeCount > 0) {
      i = this.freeList;
      this.freeList = this.slotNext[i];
      this.freeCount--;
    } else {
      i = this.slotKeys.length;
    }
    this.slotKeys[i] = key;
    this.slotValues[i] = value;
    this.slotNext[i] = -2;
    this.index.set(key, i);
  }

  entries(): IterableIterator<[K, V]> {
    return new SlotIterator(this.slotKeys, this.slotNext, (i) => [this.slotKeys[i], this.slotValues[i]]);
  }

  keys(): IterableIterator<K> {
    return new SlotIterator(this.slotKeys, this.slotNext, (i) => this.slotKeys[i]);
  }

  values(): IterableIterator<V> {
    return new SlotIterator(this.slotKeys, this.slotNext, (i) => this.slotValues[i]);
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  /** A copy, in this one's enumeration order. */
  clone(): Dict<K, V> {
    return new Dict<K, V>(this.entries());
  }
}

/** A HashSet with the C# build's enumeration order (see {@link Dict}). */
export class HSet<T> implements Iterable<T> {
  private slots: T[] = [];
  private slotNext: number[] = [];
  private index = new Map<T, number>();
  private freeList = -1;
  private freeCount = 0;

  constructor(items?: Iterable<T>) {
    if (items) for (const x of items) this.add(x);
  }

  get size(): number {
    return this.index.size;
  }

  has(item: T): boolean {
    return this.index.has(item);
  }

  /** Adds an item; false when it was there already. */
  add(item: T): boolean {
    if (this.index.has(item)) return false;
    let i: number;
    if (this.freeCount > 0) {
      i = this.freeList;
      this.freeList = this.slotNext[i];
      this.freeCount--;
    } else {
      i = this.slots.length;
    }
    this.slots[i] = item;
    this.slotNext[i] = -2;
    this.index.set(item, i);
    return true;
  }

  delete(item: T): boolean {
    const i = this.index.get(item);
    if (i === undefined) return false;
    this.index.delete(item);
    this.slots[i] = undefined as T;
    this.slotNext[i] = this.freeList;
    this.freeList = i;
    this.freeCount++;
    return true;
  }

  /** Removes every item that matches; returns how many. */
  removeWhere(match: (x: T) => boolean): number {
    let n = 0;
    for (let i = 0; i < this.slots.length; i++)
      if (this.slotNext[i] === -2 && match(this.slots[i])) {
        this.delete(this.slots[i]);
        n++;
      }
    return n;
  }

  clear(): void {
    this.slots = [];
    this.slotNext = [];
    this.index.clear();
    this.freeList = -1;
    this.freeCount = 0;
  }

  values(): IterableIterator<T> {
    return new SlotIterator(this.slots, this.slotNext, (i) => this.slots[i]);
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }

  unionWith(items: Iterable<T>): void {
    for (const x of items) this.add(x);
  }

  exceptWith(items: Iterable<T>): void {
    for (const x of items) this.delete(x);
  }
}
