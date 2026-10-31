/**
 * The page's state, read from the stream of pieces (item 17a). The worker cuts each season's state into pieces at the items
 * of its lists and dictionaries (`SnapshotStore`, src/game/src/snapshots.ts) and sends the page only the new ones; the page
 * reads back only what changed: an item whose text is the same as last season keeps last season's object, so a season
 * costs its changes, not the whole world. The state read is exactly the state written (guarded by `history.test.ts`).
 */
import { Dict, GameStateSchema, HSet, read, type GameState, type Schema } from "@amarna/engine";

/** The pieces of a snapshot, as a tree of the containers the cut opened: a container's text is its head, its items and its tail. */
interface Container {
  /** The text up to and including the opening bracket, with the member's name where it is one (`"inbox":{`). */
  head: string;
  items: (string | Container)[];
  /** The closing bracket, and the comma after it where there is one. */
  tail: string;
  /** The joined text, once asked for. */
  text?: string;
}

const opens = (p: string): boolean => p.endsWith("[") || p.endsWith("{");
const closes = (p: string): boolean => p.startsWith("]") || p.startsWith("}");

/** The tree of a snapshot's pieces. The root's one item is the state's object. */
function treeOf(pieces: readonly string[]): Container {
  const root: Container = { head: "", items: [], tail: "" };
  const stack: Container[] = [root];
  for (let p of pieces) {
    while (p.length > 0) {
      const top = stack[stack.length - 1];
      if (closes(p)) {
        top.tail = p[0];
        stack.pop();
        p = p.slice(1);
        if (p.startsWith(",")) {
          top.tail += ",";
          p = p.slice(1);
        }
        continue;
      }
      if (opens(p)) {
        const c: Container = { head: p, items: [], tail: "" };
        top.items.push(c);
        stack.push(c);
      } else top.items.push(p);
      p = "";
    }
  }
  return root;
}

const textOf = (x: string | Container): string => (typeof x === "string" ? x : (x.text ??= x.head + x.items.map(textOf).join("") + x.tail));
/** An item's JSON: its text without the comma that follows it. */
const itemJson = (text: string): string => (text.endsWith(",") ? text.slice(0, -1) : text);
/** A member's name and its value's JSON text, from `"name":value` (the value may be a container's head, with its bracket). */
function nameOf(text: string): string {
  const end = text.indexOf('":');
  return JSON.parse(text.slice(0, end + 1)) as string;
}
const valueText = (text: string): string => text.slice(text.indexOf('":') + 2);

/** A container's JSON: its text without the member's name (where its head has one) and without the comma after it. */
const containerJson = (c: Container): string => itemJson((c.head.includes('":') ? valueText(c.head) : c.head) + c.items.map(textOf).join("") + c.tail);

const resolve = (s: Schema): Schema => (s.k === "lazy" ? resolve(s.get()) : s.k === "opt" ? resolve(s.of) : s);

/** Objects by the text they were read from, per field of the state: what an unchanged text reuses. */
type Cache = Map<string, unknown>;

export class IncrementalReader {
  private caches = new Map<string, Cache>();
  private next = new Map<string, Cache>();

  /** The state of a snapshot's pieces, sharing with the states read before whatever reads the same. */
  apply(pieces: readonly string[]): GameState {
    const root = treeOf(pieces);
    const state = root.items[0];
    if (typeof state === "string" || root.items.length !== 1) throw new Error("The state's pieces do not form one object.");
    this.next = new Map();
    const o = GameStateSchema.make() as unknown as Record<string, unknown>;
    const fields = new Map(GameStateSchema.fields);
    for (const item of state.items) {
      const text = typeof item === "string" ? item : item.head;
      const name = nameOf(text);
      const fs = fields.get(name);
      if (fs === undefined || fs.k === "computed") continue;
      o[name] = this.member(name, fs, item);
    }
    this.caches = this.next;
    return o as unknown as GameState;
  }

  /** A field's value: an object read from its text, reused from the last state when the text is the same. */
  private member(field: string, schema: Schema, item: string | Container): unknown {
    const cache = this.caches.get(field) ?? new Map();
    const kept = this.next.get(field) ?? new Map<string, unknown>();
    this.next.set(field, kept);
    const text = textOf(item);
    return this.value(resolve(schema), typeof item === "string" ? valueText(text) : item, text, cache, kept);
  }

  /**
   * A value from its container or text. `key` is the text that identifies it in the caches (the whole member, name and all).
   * A list's or dictionary's items are reused one by one, so a season's new items are all that is read.
   */
  private value(schema: Schema, src: string | Container, key: string, cache: Cache, kept: Cache): unknown {
    const had = cache.get(key);
    if (had !== undefined) {
      kept.set(key, had);
      return had;
    }
    let v: unknown;
    if (typeof src === "string") v = read(schema, JSON.parse(itemJson(src)));
    else if (schema.k === "list" || schema.k === "set") {
      const items = src.items.map((x) => {
        const t = textOf(x);
        return this.value(resolve(schema.of), typeof x === "string" ? itemJson(x) : x, t, cache, kept);
      });
      v = schema.k === "list" ? items : new HSet(items);
    } else if (schema.k === "dict") {
      const d = new Dict<string, unknown>();
      for (const x of src.items) {
        const t = textOf(x);
        const name = nameOf(typeof x === "string" ? x : x.head);
        d.set(name, this.value(resolve(schema.of), typeof x === "string" ? itemJson(valueText(x)) : x, t, cache, kept));
      }
      v = d;
    } else v = read(schema, JSON.parse(containerJson(src)));
    kept.set(key, v);
    return v;
  }
}
