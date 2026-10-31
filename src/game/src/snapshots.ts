/**
 * The seasons' snapshots, sharing what did not change (item 17a). A snapshot is the whole state as JSON, and a long game's
 * state runs to many megabytes (the courts' records, the characters, the events), so a string a season ran to a gigabyte by
 * the age's end and crashed the page on a phone. Here each snapshot is cut into pieces at its items (the elements and members
 * of the state's lists and dictionaries, two levels down), and every piece is kept once: a season's snapshot is a list of
 * references to pieces, most of them the same as the season before. The text read back is the text pushed, exactly.
 */
export class SnapshotStore {
  private readonly pieces = new Map<string, string>();
  private readonly snapshots: string[][] = [];
  /** The bytes (UTF-16 units) of the distinct pieces kept. */
  uniqueLength = 0;
  /** The bytes of every snapshot pushed, as they would be kept whole. */
  totalLength = 0;

  get length(): number {
    return this.snapshots.length;
  }

  /** Keeps one snapshot. */
  push(json: string): void {
    const refs: string[] = [];
    const take = (from: number, to: number): void => {
      if (to <= from) return;
      const cut = json.slice(from, to);
      let kept = this.pieces.get(cut);
      if (kept === undefined) {
        // A flat copy: a slice of a long string keeps the whole string alive in V8, which is what must not happen here.
        kept = flat(cut);
        this.pieces.set(kept, kept);
        this.uniqueLength += kept.length;
      }
      refs.push(kept);
    };
    // Cuts fall after each comma, opening bracket or closing bracket met at depths 1 to 3, outside strings: each item of
    // the state's lists and dictionaries, and of their items' lists, is a piece of its own (with its comma).
    let depth = 0;
    let start = 0;
    let inString = false;
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
        if (depth <= 3) {
          take(start, i + 1);
          start = i + 1;
        }
      } else if (ch === 125 /* } */ || ch === 93 /* ] */) {
        if (depth <= 3) {
          take(start, i);
          start = i;
        }
        depth--;
      } else if (ch === 44 /* , */ && depth <= 3) {
        take(start, i + 1);
        start = i + 1;
      }
    }
    take(start, json.length);
    this.snapshots.push(refs);
    this.totalLength += json.length;
  }

  /** The snapshot at an index, as pushed. */
  get(index: number): string | null {
    const refs = this.snapshots[index];
    return refs === undefined ? null : refs.join("");
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
/** A string of its own, not a view on a longer one. */
function flat(s: string): string {
  return s.length < 16 ? s : decoder.decode(encoder.encode(s));
}
