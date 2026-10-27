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
