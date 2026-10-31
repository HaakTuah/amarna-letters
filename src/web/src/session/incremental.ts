/**
 * The page's state, read from the stream of pieces (item 17a). The worker cuts each season's state into pieces at the items
 * of its lists and dictionaries (`SnapshotStore`, src/game/src/snapshots.ts), each piece kept once under a number, and sends
 * the page only the new ones; the page reads back only what changed: an item made of the same pieces as last season keeps
 * last season's object, so a season costs its changes, not the whole world. An item's identity is the numbers of its pieces,
 * so an unchanged item costs a short key, not its text. The state read is exactly the state written (`history.test.ts`).
 */
import { Dict, GameStateSchema, HSet, read, type GameState, type Schema } from "@amarna/engine";

/** A piece of a snapshot, by its number. */
interface Leaf {
  id: number;
}

/** The pieces of a snapshot as a tree of the containers the cut opened: a container's text is its head, its items and its tail. */
interface Container {
  /** The piece up to and including the opening bracket, with the member's name where it is one (`"inbox":{`). */
  head: number;
  items: (Leaf | Container)[];
  /** The closing bracket, and the comma after it where there is one: the text of the piece's start. */
  tail: string;
  /** The key of its pieces' numbers, once asked for. */
  key?: string;
  /** The joined text, once asked for (only for a container read anew). */
  text?: string;
}
type Node = Leaf | Container;

export class IncrementalReader {
  private caches = new Map<string, Cache>();
  private next = new Map<string, Cache>();
  private texts: readonly string[] = [];

  /**
   * The state of a snapshot, given the numbers of its pieces in order and the pieces by number, sharing with the states read
   * before whatever is made of the same pieces.
   */
  apply(refs: readonly number[], texts: readonly string[]): GameState {
    this.texts = texts;
    const root = this.treeOf(refs);
    const state = root.items[0];
    if (root.items.length !== 1 || !("items" in state)) throw new Error("The state's pieces do not form one object.");
    this.next = new Map();
    const o = GameStateSchema.make() as unknown as Record<string, unknown>;
    const fields = new Map(GameStateSchema.fields);
    for (const item of state.items) {
      const name = nameOf(this.headText(item));
      const fs = fields.get(name);
      if (fs === undefined || fs.k === "computed") continue;
      o[name] = this.member(name, fs, item);
    }
    this.caches = this.next;
    this.texts = [];
    return o as unknown as GameState;
  }

  /** The tree of a snapshot's pieces. The root's one item is the state's object. */
  private treeOf(refs: readonly number[]): Container {
    const texts = this.texts;
    const root: Container = { head: -1, items: [], tail: "" };
    const stack: Container[] = [root];
    for (const id of refs) {
      const p = texts[id];
      if (p.length === 0) continue;
      const top = stack[stack.length - 1];
      if (closes(p)) {
        // The closer ends the container on top; what follows it in the piece (a comma, and a member's name with its own
        // opener, or a whole scalar member) belongs to the container below.
        stack.pop();
        top.tail = p;
        const rest = p.slice(p.startsWith("],") || p.startsWith("},") ? 2 : 1);
        if (rest.length === 0) continue;
        const below = stack[stack.length - 1];
        if (opens(p)) {
          const c: Container = { head: id, items: [], tail: "" };
          below.items.push(c);
          stack.push(c);
        } else below.items.push({ id });
        continue;
      }
      if (opens(p)) {
        const c: Container = { head: id, items: [], tail: "" };
        top.items.push(c);
        stack.push(c);
      } else top.items.push({ id });
    }
    return root;
  }

  /** A node's whole text (a leaf's piece, or a container's head, items and tail). */
  private textOf(x: Node): string {
    if (!("items" in x)) return headOnly(this.texts[x.id]);
    if (x.text !== undefined) return x.text;
    let out = headOnly(this.texts[x.head]);
    for (const item of x.items) out += this.textOf(item);
    return (x.text = out + x.tail.slice(0, x.tail.startsWith("],") || x.tail.startsWith("},") ? 2 : 1));
  }

  /** A node's key: a leaf's number, a container's numbers in order. Two nodes with the same key have the same text. */
  private keyOf(x: Node): string {
    if (!("items" in x)) return String(x.id);
    if (x.key !== undefined) return x.key;
    let out = String(x.head);
    for (const item of x.items) out += "," + this.keyOf(item);
    return (x.key = out + "," + closerKey(x.tail));
  }

  /** The text of a node's start: a leaf's piece, or a container's head piece (its member name is in it). */
  private headText(x: Node): string {
    return headOnly(this.texts["items" in x ? x.head : x.id]);
  }

  /** A field's value: an object read from its pieces, reused from the last state when the pieces are the same. */
  private member(field: string, schema: Schema, item: Node): unknown {
    const cache = this.caches.get(field) ?? new Map();
    const kept = this.next.get(field) ?? new Map<string, unknown>();
    this.next.set(field, kept);
    return this.value(schema, item, true, cache, kept);
  }

  /**
   * A value from its node. `named`: the node is a member (`"name":value`), whose name is not part of the value. A list's or
   * dictionary's items are reused one by one, so a season's new items are all that is read.
   */
  private value(schema: Schema, src: Node, named: boolean, cache: Cache, kept: Cache): unknown {
    const key = this.keyOf(src);
    const had = cache.get(key);
    if (had !== undefined) {
      kept.set(key, had);
      return had;
    }
    let v: unknown;
    const shape = shapeOf(schema);
    if (!("items" in src)) {
      const text = headOnly(this.texts[src.id]);
      v = readText(schema, itemJson(named ? valueText(text) : text));
    }
    else if (shape.k === "list" || shape.k === "set") {
      const items = src.items.map((x) => this.value(shape.of, x, false, cache, kept));
      v = shape.k === "list" ? items : new HSet(items);
    } else if (shape.k === "dict") {
      const d = new Dict<string, unknown>();
      for (const x of src.items) d.set(nameOf(this.headText(x)), this.value(shape.of, x, true, cache, kept));
      v = d;
    } else v = readText(schema, itemJson(named ? valueText(this.textOf(src)) : this.textOf(src)));
    kept.set(key, v);
    return v;
  }
}

/** Objects by the key of the pieces they were read from, per field of the state: what unchanged pieces reuse. */
type Cache = Map<string, unknown>;

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
/** A member's name, from `"name":value`. */
function nameOf(text: string): string {
  const end = text.indexOf('":');
  return JSON.parse(text.slice(0, end + 1)) as string;
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
