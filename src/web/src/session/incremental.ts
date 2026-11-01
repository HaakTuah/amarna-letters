/**
 * The page's state, read from the stream of pieces (item 17a). The worker cuts each season's state into pieces at the items
 * of its lists and dictionaries (`SnapshotStore`, src/game/src/snapshots.ts), each piece kept once under a number, and sends
 * the page only the new ones; the page reads back only what changed: an item made of the same pieces as last season keeps
 * last season's object, so a season costs its changes, not the whole world. An item's identity is the numbers of its pieces,
 * so an unchanged item costs a short key, not its text. An object is read member by member and a list or dictionary item by
 * item, down to the depth of the cut (`CutDepth`, deeper under the characters), so a character whose gold changed keeps its
 * unchanged memories. The state read is exactly the state written (`history.test.ts`).
 */
import { Dict, GameStateSchema, HSet, read, type GameState, type Schema } from "@amarna/engine";

/** A piece of a snapshot that is an item by itself: its index in the season's list of numbers. */
type Leaf = number;

/** The pieces of a snapshot as a tree of the containers the cut opened: a container's text is its head, its items and its tail. */
interface Container {
  /** The piece up to and including the opening bracket, with the member's name where it is one (`"inbox":{`): its index. */
  head: number;
  items: (Leaf | Container)[];
  /** The closing bracket, and the comma after it where there is one: the text of the piece's start. */
  tail: string;
  /** Where its pieces lie in the season's list of numbers: from the head to the piece after the tail's (exclusive). */
  from: number;
  to: number;
  /** The hash of its pieces' numbers, once asked for. */
  key?: string;
  /** The joined text, once asked for (only for a container read anew). */
  text?: string;
}
type Node = Leaf | Container;

/** A season being read: its pieces, the state's members, how far the read has come, and the state being filled. */
interface Job {
  refs: Uint32Array;
  texts: readonly string[];
  items: Node[];
  at: number;
  o: Record<string, unknown>;
  started: number;
}
const Fields = new Map(GameStateSchema.fields);

/** What a cache holds under a hash: the pieces' numbers the object was read from (to tell a true hit), and the object. */
interface Entry {
  ids: Uint32Array;
  value: unknown;
}

export class IncrementalReader {
  private caches = new Map<string, Cache>();
  private next = new Map<string, Cache>();
  /**
   * The lists read last season, by their place in the state (`events`, `inbox/Egypt`): a list that grew at its end keeps
   * its earlier items without a look at each (the record's lists only grow, and there are tens of thousands of events).
   */
  private lists = new Map<string, ListEntry>();
  private nextLists = new Map<string, ListEntry>();
  private texts: readonly string[] = [];
  private refs: Uint32Array = new Uint32Array(0);

  /**
   * The state of a snapshot, given the numbers of its pieces in order and the pieces by number, sharing with the states read
   * before whatever is made of the same pieces.
   */
  apply(refs: Uint32Array, texts: readonly string[]): GameState {
    const job = this.begin(refs, texts);
    while (!this.step(job, Infinity)) {
      /* every field, in one go */
    }
    return this.finish(job);
  }

  /**
   * The same, spread over tasks (item 17a: no frame over about 50 ms): each task reads fields for about `budgetMs`, then
   * yields; the state is given once every field is read. A read begun while one is under way replaces it.
   */
  read(refs: Uint32Array, texts: readonly string[], budgetMs = 10): Promise<GameState> {
    this.cancel();
    const job = this.begin(refs, texts);
    this.job = job;
    return new Promise((resolve, reject) => {
      const go = (): void => {
        if (this.job !== job) {
          reject(new Error("The read was replaced by a newer season."));
          return;
        }
        try {
          if (this.step(job, budgetMs)) {
            this.job = null;
            resolve(this.finish(job));
          } else setTimeout(go, 0);
        } catch (e) {
          this.job = null;
          reject(e as Error);
        }
      };
      go();
    });
  }

  /** Drops a read under way (a newer season arrived, or the game changed). */
  cancel(): void {
    this.job = null;
  }

  private job: Job | null = null;

  private begin(refs: Uint32Array, texts: readonly string[]): Job {
    this.texts = texts;
    this.refs = refs;
    const t = performance.now();
    const root = this.treeOf(refs);
    performance.measure("reader:tree", { start: t });
    const state = root.items[0];
    if (root.items.length !== 1 || typeof state === "number") throw new Error("The state's pieces do not form one object.");
    this.parsed = 0;
    this.next = new Map();
    return { refs, texts, items: state.items, at: 0, o: GameStateSchema.make() as unknown as Record<string, unknown>, started: t };
  }

  /** Reads fields until the budget is spent; true once all are read. */
  private step(job: Job, budgetMs: number): boolean {
    const t = performance.now();
    // Another read may have borrowed the reader meanwhile (apply in a test): the job's own season is set back each step.
    this.texts = job.texts;
    this.refs = job.refs;
    while (job.at < job.items.length) {
      const item = job.items[job.at++];
      const name = nameOf(this.headText(item));
      const fs = Fields.get(name);
      if (fs === undefined || fs.k === "computed") continue;
      const before = this.parsed;
      job.o[name] = this.member(name, fs, item);
      if (this.parsed > before) performance.measure(`reader:field:${name}`, { start: t, duration: (this.parsed - before) / 1024 });
      if (performance.now() - t > budgetMs) break;
    }
    performance.measure("reader:fields", { start: t });
    return job.at >= job.items.length;
  }

  private finish(job: Job): GameState {
    this.caches = this.next;
    this.lists = this.nextLists;
    this.nextLists = new Map();
    this.texts = [];
    this.refs = new Uint32Array(0);
    performance.measure(`reader:parsedKB:${Math.round(this.parsed / 1024)}`, { start: job.started, duration: 0 });
    return job.o as unknown as GameState;
  }

  /** The characters of JSON parsed this season (new items). */
  private parsed = 0;

  /** The tree of a snapshot's pieces. The root's one item is the state's object. */
  private treeOf(refs: Uint32Array): Container {
    const texts = this.texts;
    const root: Container = { head: -1, items: [], tail: "", from: 0, to: refs.length };
    // Items are the index of their piece; a container's head is the index of its opening piece.
    const stack: Container[] = [root];
    for (let i = 0; i < refs.length; i++) {
      const id = refs[i];
      const p = texts[id];
      if (p.length === 0) continue;
      const top = stack[stack.length - 1];
      if (closes(p)) {
        // The closer ends the container on top; what follows it in the piece (a comma, and a member's name with its own
        // opener, or a whole scalar member) belongs to the container below.
        stack.pop();
        top.tail = p;
        top.to = i + 1;
        const rest = p.slice(p.startsWith("],") || p.startsWith("},") ? 2 : 1);
        if (rest.length === 0) continue;
        const below = stack[stack.length - 1];
        if (opens(p)) {
          const c: Container = { head: i, items: [], tail: "", from: i, to: i + 1 };
          below.items.push(c);
          stack.push(c);
        } else below.items.push(i);
        continue;
      }
      if (opens(p)) {
        const c: Container = { head: i, items: [], tail: "", from: i, to: i + 1 };
        top.items.push(c);
        stack.push(c);
      } else top.items.push(i);
    }
    return root;
  }

  /** A node's whole text (a leaf's piece, or a container's head, items and tail). */
  private textOf(x: Node): string {
    if (typeof x === "number") return headOnly(this.texts[this.refs[x]]);
    if (x.text !== undefined) return x.text;
    let out = headOnly(this.texts[this.refs[x.head]]);
    for (const item of x.items) out += this.textOf(item);
    return (x.text = out + x.tail.slice(0, x.tail.startsWith("],") || x.tail.startsWith("},") ? 2 : 1));
  }

  /**
   * A node's key: a leaf's number; a container's a hash of its pieces' numbers (two 32-bit FNV-1a hashes), so it costs the
   * container's length, not a string of all its numbers. A hit is confirmed against the numbers themselves (`same`).
   */
  private keyOf(x: Node): number | string {
    if (typeof x === "number") return this.refs[x];
    if (x.key !== undefined) return x.key;
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    const refs = this.refs;
    for (let i = x.from; i < x.to; i++) {
      const id = refs[i];
      h1 = Math.imul(h1 ^ id, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (id + 0x9e3779b9), 0x0100019b) >>> 0;
    }
    // Where the container ends inside a shared piece (a closer carrying the next member), the kind of closer tells them apart.
    return (x.key = h1.toString(36) + ":" + h2.toString(36) + ":" + closerKey(x.tail));
  }

  /** The numbers of a container's pieces, a view on the season's list. */
  private idsOf(x: Container): Uint32Array {
    return this.refs.subarray(x.from, x.to);
  }

  /** A cache's object for a node, if it was read from the same pieces. */
  private lookup(cache: Cache, key: number | string, x: Node): Entry | undefined {
    const entries = cache.get(key);
    if (entries === undefined) return undefined;
    if (typeof x === "number") return entries[0];
    const ids = this.idsOf(x);
    return entries.find((e) => same(e.ids, ids));
  }

  private keep(cache: Cache, key: number | string, x: Node, value: unknown): void {
    const entry: Entry = { ids: typeof x === "number" ? Empty : this.idsOf(x), value };
    const entries = cache.get(key);
    if (entries === undefined) cache.set(key, [entry]);
    else if (!entries.some((e) => same(e.ids, entry.ids))) entries.push(entry);
  }

  /** The text of a node's start: a leaf's piece, or a container's head piece (its member name is in it). */
  private headText(x: Node): string {
    return headOnly(this.texts[this.refs[typeof x === "number" ? x : x.head]]);
  }

  /** A field's value: an object read from its pieces, reused from the last state when the pieces are the same. */
  private member(field: string, schema: Schema, item: Node): unknown {
    const cache: Cache = this.caches.get(field) ?? new Map();
    const kept: Cache = this.next.get(field) ?? new Map();
    this.next.set(field, kept);
    return this.value(schema, item, true, cache, kept, field);
  }

  /**
   * A value from its node. `named`: the node is a member (`"name":value`), whose name is not part of the value. A list's or
   * dictionary's items are reused one by one, so a season's new items are all that is read.
   */
  private value(schema: Schema, src: Node, named: boolean, cache: Cache, kept: Cache, path: string): unknown {
    // A piece that is an item by itself (a scalar member, a name, a small object) is read straight: parsing it costs less
    // than remembering it. Containers are what reuse pays for.
    if (typeof src === "number") {
      const text = headOnly(this.texts[this.refs[src]]);
      this.parsed += text.length;
      return readText(schema, itemJson(named ? valueText(text) : text));
    }
    const key = this.keyOf(src);
    const had = this.lookup(cache, key, src);
    if (had !== undefined) {
      this.keep(kept, key, src, had.value);
      return had.value;
    }
    let v: unknown;
    const shape = shapeOf(schema);
    if (shape.k === "list" || shape.k === "set") {
      // The items the list shares with last season's at its start (the same pieces, number for number) are taken as they
      // were; the rest are read one by one. The record's lists only grow, so this is most of them.
      const last = this.lists.get(path);
      const ids = this.idsOf(src);
      // Each item's end, as an offset from the list's first piece.
      const ends = src.items.map((x) => (typeof x === "number" ? x + 1 : x.to) - src.from);
      let shared = 0;
      if (last !== undefined) {
        let common = 0;
        const n = Math.min(ids.length, last.ids.length);
        while (common < n && ids[common] === last.ids[common]) common++;
        while (shared < ends.length && shared < last.ends.length && ends[shared] <= common && ends[shared] === last.ends[shared]) shared++;
      }
      const items = last === undefined ? [] : last.items.slice(0, shared);
      for (let i = shared; i < src.items.length; i++) items.push(this.value(shape.of, src.items[i], false, cache, kept, path + "/*"));
      this.nextLists.set(path, { ids, ends, items });
      v = shape.k === "list" ? items : new HSet(items);
    } else if (shape.k === "dict") {
      const d = new Dict<string, unknown>();
      for (const x of src.items) {
        const name = nameOf(this.headText(x));
        d.set(name, this.value(shape.of, x, true, cache, kept, path + "/" + name));
      }
      v = d;
    } else if (shape.k === "obj" && src.items.some((x) => typeof x !== "number" && x.to - x.from > 8)) {
      // An object with a large part inside (a character and its memories) member by member, as the engine's reader builds
      // it (missing members keep the factory's defaults; names as written, else without regard to case), so that a
      // character whose gold changed keeps its unchanged memory. A small object is parsed whole below: one parse, not one
      // a member.
      const o = shape.make() as Record<string, unknown>;
      let byLower: Map<string, [string, Schema]> | null = null;
      for (const x of src.items) {
        const name = nameOf(this.headText(x));
        let field = shape.fields.find((f) => f[0] === name);
        if (field === undefined) {
          byLower ??= new Map(shape.fields.map((f) => [f[0].toLowerCase(), f] as const));
          field = byLower.get(name.toLowerCase());
        }
        if (field === undefined || field[1].k === "computed") continue;
        o[field[0]] = this.value(field[1], x, true, cache, kept, path + "/" + field[0]);
      }
      v = o;
    } else {
      const text = this.textOf(src);
      this.parsed += text.length;
      v = readText(schema, itemJson(named ? valueText(text) : text));
    }
    this.keep(kept, key, src, v);
    return v;
  }
}

/** Two lists of numbers alike. */
function same(a: Uint32Array, b: Uint32Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
const Empty = new Uint32Array(0);

/** Objects by the hash of the pieces they were read from, per field of the state: what unchanged pieces reuse. */
type Cache = Map<number | string, Entry[]>;
/** A list as read last season: the numbers of its pieces, each item's end as an offset from its first piece, and the items. */
interface ListEntry {
  ids: Uint32Array;
  ends: number[];
  items: unknown[];
}

const opens = (p: string): boolean => p.endsWith("[") || p.endsWith("{");
const closes = (p: string): boolean => p.startsWith("]") || p.startsWith("}");
/** A closer piece's own part: the bracket, and its comma. */
const closerKey = (tail: string): string => (tail.startsWith("],") || tail.startsWith("},") ? tail.slice(0, 2) : tail.slice(0, 1));
/** A head piece's own part: a closer piece may carry the next member's head after its bracket and comma. */
function headOnly(p: string): string {
  if (!closes(p)) return p;
  return p.slice(p.startsWith("],") || p.startsWith("},") ? 2 : 1);
}
/** An item's JSON: its text without the comma that follows it. */
const itemJson = (text: string): string => (text.endsWith(",") ? text.slice(0, -1) : text);
/** A member's name, from `"name":value` (parsed only where it has an escape). */
function nameOf(text: string): string {
  const end = text.indexOf('":');
  const raw = text.slice(1, end);
  return raw.includes("\\") ? (JSON.parse(text.slice(0, end + 1)) as string) : raw;
}
/** A member's value text, from `"name":value`. */
const valueText = (text: string): string => text.slice(text.indexOf('":') + 2);
/** The schema's shape for the branch below (through `lazy` and `opt`); what is read still goes through the schema as given. */
const shapeOf = (s: Schema): Schema => (s.k === "lazy" ? shapeOf(s.get()) : s.k === "opt" ? shapeOf(s.of) : s);
/** A value from its JSON text by its schema; a null stays null, as the engine's reader keeps a list's or dictionary's null item. */
function readText(schema: Schema, json: string): unknown {
  const j: unknown = JSON.parse(json);
  return j === null ? null : read(schema, j);
}
