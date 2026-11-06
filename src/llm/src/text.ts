/** Text helpers for the request text: a StringBuilder as C#'s (lines end with "\n"), and string.Join. */
export class Sb {
  private s = "";
  appendLine(line = ""): this {
    this.s += line + "\n";
    return this;
  }
  append(text: string): this {
    this.s += text;
    return this;
  }
  get length(): number {
    return this.s.length;
  }
  toString(): string {
    return this.s;
  }
}

/** string.Join: the items' text with a separator between them. */
export function joinS(separator: string, items: Iterable<unknown>): string {
  return [...items].map((x) => (x === null || x === undefined ? "" : String(x))).join(separator);
}

/** Items as a reader lists them: "a", "a and b", "a, b and c". */
export function andList(items: readonly string[]): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * How a share is said in a king's or a character's own words (archive item 232): as the age said it, never "%"; the data
 * a model is given keeps "%". One line, put into every voice guidance that asks for spoken or written words.
 */
export const PeriodShares = 'In your own words, say a share as the age said it, "a fifth", "a tenth", "the half", never as a percentage.';
