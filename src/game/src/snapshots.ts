/**
 * The seasons' snapshots, sharing what did not change (item 17a). A snapshot is the whole state as JSON, and a long game's
 * state runs to many megabytes (the courts' records, the characters, the events), so a string a season ran to a gigabyte by
 * the age's end and crashed the page on a phone. Here each snapshot is cut into pieces at its items (the elements and members
 * of the state's lists and dictionaries, five levels down: a character's memories and their parts among them), every piece is
 * kept once under a number, and a season's snapshot is a list of those numbers, most of them the same as the season before.
 * The text read back is the text pushed, exactly.
 *
 * The same cut is the stream to the page: each push yields a delta, the pieces new since the last push and the snapshot's
 * list of numbers, so the page keeps a history of pieces of its own and rebuilds a season from them when it looks back
 * (`src/web/src/session/incremental.ts`). Pieces the page must not see (the drawn last season) are redacted in the deltas.
 */
export interface SnapshotDelta {
  /** The snapshot's index: 0 at the start, k after turn k. */
  index: number;
  /** Whether this replaces the snapshot at `index` (the state amended after its season, as when a table plays on). */
  replace: boolean;
  /** The pieces first seen in this snapshot, by number. */
  added: [number, string][];
  /** The snapshot, as the numbers of its pieces in order. */
  refs: Uint32Array;
}

/**
 * How deep the cut goes: a piece for every item down to this depth (the state's object is depth 1), and deeper under the
 * members named in `DeepMembers`, where an item is large and changes in part (a character and its memories: a piece for each
 * memory keeps a character whose gold changed from being read whole). Elsewhere the deeper cut would only shatter small
 * items (an event's list of courts) into many pieces for nothing.
 */
export const CutDepth = 3;
export const DeepCutDepth = 5;
export const DeepMembers: ReadonlySet<string> = new Set(["characters"]);

export class SnapshotStore {
  private readonly ids = new Map<string, number>();
  private readonly texts: string[] = [];
  /** Pieces the page must not see, by number, with the text the deltas carry in their place (their closer and comma kept). */
  private readonly redacted = new Map<number, string>();
  private readonly snapshots: Uint32Array[] = [];
  /** The deltas not yet taken (takeDeltas): the stream to whoever follows the snapshots. */
  private pending: SnapshotDelta[] = [];
  /** The bytes (UTF-16 units) of the distinct pieces kept. */
  uniqueLength = 0;
  /** The bytes of every snapshot pushed, as they would be kept whole. */
  totalLength = 0;

  /**
   * For a piece at the top level (a member of the state), the text the deltas carry instead of it, or null to carry it as it
   * is; the store itself keeps every piece whole. Set before the first push.
   */
  redact: ((piece: string) => string | null) | null = null;
  /** The members of the state cut deeper (`DeepCutDepth`); null for none. */
  deep: ReadonlySet<string> | null = DeepMembers;

  get length(): number {
    return this.snapshots.length;
  }

  /** Keeps one snapshot. */
  push(json: string): void {
    this.add(json, false);
  }

  /** Replaces the last snapshot with the state as amended after its season. */
  replaceLast(json: string): void {
    if (this.snapshots.length === 0) this.add(json, false);
    else {
      this.snapshots.pop();
      this.add(json, true);
    }
  }

  private add(json: string, replace: boolean): void {
    const refs: number[] = [];
    const added: [number, string][] = [];
    const take = (from: number, to: number, depth: number): void => {
      if (to <= from) return;
      const cut = json.slice(from, to);
      let id = this.ids.get(cut);
      if (id === undefined) {
        // A flat copy: V8 makes a slice of 13 characters or more a view that keeps the whole string alive, which is what
        // must not happen here; a shorter slice is a copy already.
        const kept = cut.length < 13 ? cut : flat(cut);
        id = this.texts.length;
        this.texts.push(kept);
        this.ids.set(kept, id);
        this.uniqueLength += kept.length;
        const shown = depth === 1 && this.redact !== null ? this.redact(kept) : null;
        if (shown !== null) this.redacted.set(id, shown);
        added.push([id, shown ?? kept]);
      }
      refs.push(id);
    };
    // Cuts fall after each comma, opening bracket or closing bracket met at depths 1 to CutDepth, outside strings: each item
    // of the state's lists and dictionaries, and of their items' lists, is a piece of its own (with its comma). `at` is the
    // depth a piece starts at.
    let depth = 0;
    let at = 0;
    let start = 0;
    let inString = false;
    // The cut's depth here: deeper under a deep member of the state, back to the usual once it closes.
    let limit = CutDepth;
    for (let i = 0; i < json.length; i++) {
      const ch = json.charCodeAt(i);
      if (inString) {
        if (ch === 92 /* \ */) i++;
        else if (ch === 34 /* " */) inString = false;
        continue;
      }
      if (ch === 34) inString = true;
      else if (ch === 123 /* { */ || ch === 91 /* [ */) {
        depth++;
        if (depth === 2 && limit === CutDepth && this.deep !== null && deepHead(json, start, i)) limit = DeepCutDepth;
        if (depth <= limit) {
          take(start, i + 1, at);
          start = i + 1;
          at = depth;
        }
      } else if (ch === 125 /* } */ || ch === 93 /* ] */) {
        if (depth <= limit) {
          take(start, i, at);
          start = i;
          at = depth - 1;
        }
        depth--;
        if (depth === 1) limit = CutDepth;
      } else if (ch === 44 /* , */ && depth <= limit) {
        take(start, i + 1, at);
        start = i + 1;
        at = depth;
      }
    }
    take(start, json.length, at);
    const packed = Uint32Array.from(refs);
    this.snapshots.push(packed);
    this.totalLength += json.length;
    this.pending.push({ index: this.snapshots.length - 1, replace, added, refs: packed });
  }

  /** The snapshot at an index, as pushed. */
  get(index: number): string | null {
    const refs = this.snapshots[index];
    if (refs === undefined) return null;
    let out = "";
    for (const id of refs) out += this.texts[id];
    return out;
  }

  /** The deltas since the last call, oldest first. */
  takeDeltas(): SnapshotDelta[] {
    const out = this.pending;
    this.pending = [];
    return out;
  }
}

/** Whether the member whose opener is at `open`, its head starting at `start`, is one of the deep members (`"characters":[`). */
function deepHead(json: string, start: number, open: number): boolean {
  const head = json.slice(start, open);
  const q = head.indexOf('"');
  const e = head.indexOf('":', q + 1);
  return q >= 0 && e > q && DeepMembers.has(head.slice(q + 1, e));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
/** A string of its own, not a view on a longer one. */
function flat(s: string): string {
  return decoder.decode(encoder.encode(s));
}

/**
 * The history of a game's states as the page keeps it, fed by the store's deltas: the pieces by number and each season's
 * list of them. Any season's JSON is rebuilt by joining, when looked back at.
 */
export class SnapshotHistory {
  /** The pieces by number. */
  readonly texts: string[] = [];
  private readonly snapshots: Uint32Array[] = [];

  get length(): number {
    return this.snapshots.length;
  }

  apply(d: SnapshotDelta): void {
    for (const [id, text] of d.added) this.texts[id] = text;
    if (d.replace && d.index === this.snapshots.length - 1) this.snapshots[d.index] = d.refs;
    else this.snapshots.push(d.refs);
  }

  /** The numbers of a snapshot's pieces in order, or null. */
  refs(index: number): Uint32Array | null {
    return this.snapshots[index] ?? null;
  }

  /** The pieces of a snapshot in order, or null. */
  pieces(index: number): string[] | null {
    const refs = this.snapshots[index];
    return refs === undefined ? null : Array.from(refs, (id) => this.texts[id]);
  }

  /** A snapshot's JSON, or null. */
  json(index: number): string | null {
    const p = this.pieces(index);
    return p === null ? null : p.join("");
  }

  clear(): void {
    this.texts.length = 0;
    this.snapshots.length = 0;
  }
}
