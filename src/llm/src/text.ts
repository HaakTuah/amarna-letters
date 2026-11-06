import { ShekelsPerMina } from "@amarna/engine";
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

/** A number as the view writes it: "1,482". */
export const num = (n: number): string => n.toLocaleString("en");

/** Gold as the engine words it ("2 minas 15 shekels", "1 mina") and a figure of four digits or more not yet grouped ("3000"). */
const Minas = /\b(\d+) minas?\b(?: (\d+) shekels?\b)?/g;
const Ungrouped = /(?<![\w,.])\d{4,}(?!\w|[,.]\d)/g;

/**
 * The engine's news as the view writes its own figures: gold in shekels, the unit of every order and of the treasury
 * ("1 mina 12 shekels" is "72 shekels"), and figures grouped by thousands ("3000 men" is "3,000 men"). Quoted words, a
 * king's or a person's own, stay as they were spoken.
 */
export function asViewFigures(text: string): string {
  return text
    .split(`"`)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(Minas, (_, m: string, s: string | undefined) => `${num(Number(m) * ShekelsPerMina + Number(s ?? 0))} shekels`).replace(Ungrouped, (d) => num(Number(d))),
    )
    .join(`"`);
}
