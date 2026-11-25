// The lexer of the measures (code-shape.mjs, which re-exports it): a file's text as tokens, comments and strings,
// template literals, regular expressions and the elements of JSX known, so that a bracket in one is not counted.
// Whoever reads or changes how a file is tokenised reads this file alone; the readers of what the tokens say
// (code-shape-readers.mjs) and the measures, history and command (code-shape.mjs) are beside it.
import path from "node:path";

const REGEX_AFTER = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);


// The tokens of a file's text: { t: "id" | "num" | "str" | "regex" | "punct", v, line, at }, `at` where it starts in the
// text (for a template's runs, where the run ends). Comments and white space are dropped, each comment's lines kept in
// the list's `comments` ({ line, text }; shape.mjs reads them for a change's mark); a template literal is a
// "str" token for each run of its text, with the code of each ${ } between them. With
// `jsx` (jsxIn, below), an element of JSX is a "jsx" token at its <, with the code of each { } in it between ( and );
// where one never closes, the list's `lost` is true, and the file is read again without JSX.
export function tokens(src, jsx = false) {
  const lex = new Lexer(src, jsx);
  lex.code(false);
  lex.out.lost = lex.lost;
  lex.out.comments = lex.comments;
  return lex.out;
}

// Each line of a comment, from `a` (where its text starts) to `b`, as { line, text }, from the line `line` on, added to
// `to` one at a time, so that a comment of any length overflows nothing; of each line its first COMMENT_READ characters
// alone, all a mark is read in.
export const COMMENT_READ = 400;
export function commentLines(to, src, a, b, line) {
  const text = src.slice(a, b);
  let k = 0;
  for (let at = 0; at <= text.length; k++) {
    const end = text.indexOf("\n", at), stop = end < 0 ? text.length : end;
    to.push({ line: line + k, text: text.slice(at, Math.min(stop, at + COMMENT_READ)) });
    at = stop + 1;
  }
}

// Whether a file's tokens are read with JSX: a file of .jsx or .tsx, and one of JavaScript, where no expression may
// start with a < (in TypeScript one may: a cast, <T>x, which a file of .tsx cannot hold).
export const jsxIn = file => [".jsx", ".tsx", ".js", ".mjs", ".cjs"].includes(path.posix.extname(file));
// How deep a template's code, an element or its code may nest before the reader stops: past it the file is lost, so
// that no file overflows the reader's stack.
export const NEST = 200;
const TAG = /^<\s*(?:>|[A-Za-z_$])/u; // (a fragment, or a tag's name)
const TYPE_PARAMETER = /^<\s*(?:const\s+)?[A-Za-z_$][\w$]*\s*(?:,|=|extends\b)/u; // (<T,> or <T extends U> in .tsx)

class Lexer {
  constructor(src, jsx) {
    Object.assign(this, { src, jsx, n: src.length, out: [], parens: [], prev: null, line: 1, lost: false, nest: 0, comments: [] });
    // (parens: for each open (, whether it opens an if, for, while or with's condition)
    this.i = src.startsWith("#!") ? src.indexOf("\n") : 0;
    if (this.i < 0) this.i = this.n;
  }

  push(t, v, l = this.line) { this.prev = { t, v, line: l, at: this.i }; this.out.push(this.prev); }
  lines(a, b) { for (let k = a; k < b; k++) if (this.src[k] === "\n") this.line++; }

  // What `read` reads, one level deeper; past NEST, nothing more of the file, which is lost.
  nested(read) {
    if (this.nest >= NEST) { this.lost = true; this.i = this.n; return false; }
    this.nest++;
    try { return read(); } finally { this.nest--; }
  }

  // The code up to the end, or, `inner`, up to the } that closes the { before it (not a token): whether it reached it.
  code(inner) {
    return inner ? this.nested(() => this.run(true)) : this.run(false);
  }

  run(inner) {
    let depth = 0;
    while (this.i < this.n) {
      const c = this.src[this.i];
      if (this.blank(c) || this.literal(c)) continue;
      if (c === "{") depth++;
      else if (c === "}" && inner && depth-- === 0) { this.i++; return true; }
      this.punct(c);
    }
    return false;
  }

  // White space or a comment, passed over: whether there was one.
  blank(c) {
    const { src, i, n } = this;
    if (c === "\n") { this.line++; this.i++; return true; }
    if (c === " " || c === "\t" || c === "\r" || c === "\f" || c === "\v" || c === "\ufeff") { this.i++; return true; }
    if (c === "/" && src[i + 1] === "/") { while (this.i < n && src[this.i] !== "\n") this.i++; commentLines(this.comments, src, i + 2, this.i, this.line); return true; }
    if (c !== "/" || src[i + 1] !== "*") return false;
    const e = src.indexOf("*/", i + 2), end = e < 0 ? n : e + 2;
    commentLines(this.comments, src, i + 2, e < 0 ? n : e, this.line);
    this.lines(i, end);
    this.i = end;
    return true;
  }

  // A string, template, regular expression, word, number or element of JSX, read as its token(s): whether there was one.
  literal(c) {
    if (c === "'" || c === '"') return this.quoted(c);
    if (c === "`") { this.i++; this.template(); return true; }
    if (c === "/" && this.regexHere() && this.regex()) return true;
    if (/[A-Za-z_$#\u0080-\uffff]/.test(c)) return this.word(/[A-Za-z0-9_$\u0080-\uffff]/, "id");
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(this.src[this.i + 1] ?? ""))) return this.word(/[0-9A-Za-z_.]/, "num");
    return c === "<" && this.jsx && this.jsxHere() && this.element();
  }

  quoted(c) {
    const { src, i, n } = this;
    let j = i + 1;
    while (j < n && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
    const from = this.line;
    this.lines(i, Math.min(j, n));
    this.push("str", src.slice(i + 1, j), from);
    this.i = j + 1;
    return true;
  }

  word(rest, t) {
    let j = this.i + 1;
    while (j < this.n && rest.test(this.src[j])) j++;
    this.push(t, this.src.slice(this.i, j));
    this.i = j;
    return true;
  }

  // From just inside a template's text to its end, the code of each ${ } read between its runs.
  template() {
    const { src, n } = this;
    let from = this.line;
    while (this.i < n) {
      const c = src[this.i];
      if (c === "\\") { this.lines(this.i, this.i + 2); this.i += 2; continue; }
      if (c === "`") { this.i++; this.push("str", "`", from); return; }
      if (c === "$" && src[this.i + 1] === "{") {
        this.i += 2;
        this.push("str", "`", from);
        if (!this.code(true)) return;
        from = this.line;
        continue;
      }
      if (c === "\n") this.line++;
      this.i++;
    }
    this.push("str", "`", from);
  }

  // A / starts a regular expression where no value stands before it: at the start, after an operator, a keyword, or the
  // ) that closes a condition (`if (x) /a/.test(y)`).
  regexHere() {
    const prev = this.prev;
    return !prev || (prev.t === "punct" && (prev.v !== ")" || prev.condition) && prev.v !== "]") || (prev.t === "id" && REGEX_AFTER.has(prev.v));
  }

  // Where a scan from each place ends, out of a class and in one ([0] and [1]): at the / that closes it, or -1; made
  // once for the text, from its end back, so each / is read in one step.
  regexEnds() {
    const { src, n } = this, out = new Int32Array(n + 2).fill(-1), inside = new Int32Array(n + 2).fill(-1);
    for (let j = n - 1; j >= 0; j--) {
      const d = src[j];
      if (d === "\n") continue;
      if (d === "\\") { out[j] = out[j + 2]; inside[j] = inside[j + 2]; continue; }
      out[j] = d === "/" ? j : d === "[" ? inside[j + 1] : out[j + 1];
      inside[j] = d === "]" ? out[j + 1] : inside[j + 1];
    }
    return [out, inside];
  }

  regex() {
    const { src, i, n } = this;
    this.ends ??= this.regexEnds();
    let j = this.ends[0][i + 1];
    if (j < 0) return false;
    j++;
    while (j < n && /[A-Za-z]/.test(src[j])) j++;
    this.push("regex", src.slice(i, j));
    this.i = j;
    return true;
  }

  // A sign, its own token (=> one of two signs); a ( says whether it opens a condition, and the ) that closes it too.
  punct(c) {
    if (this.src.startsWith("=>", this.i)) { this.push("punct", "=>"); this.i += 2; return; }
    this.sign(c);
    this.i++;
  }

  sign(c) {
    const prev = this.prev;
    const condition = c === "(" ? prev?.t === "id" && ["if", "while", "for", "with"].includes(prev.v) || (isId(prev, "await") && isId(this.out.at(-2), "for")) : false;
    if (c === "(") this.parens.push(condition);
    this.push("punct", c);
    if (c === ")") this.prev.condition = this.parens.pop() === true;
  }

  // ---- JSX ----

  // An element may start where an expression may: at the start, after a sign but a value's end, a shift's first < or
  // a + or - (which may end x++), or after a keyword that a value follows.
  jsxHere() {
    const prev = this.prev;
    if (!prev) return true;
    if (prev.t === "id") return REGEX_AFTER.has(prev.v);
    return prev.t === "punct" && ![")", "]", "}", "<", "+", "-"].includes(prev.v);
  }

  // An element from its <: false, nothing read, where no tag follows (a comparison, a type's parameters).
  element() {
    const ahead = this.src.slice(this.i, this.i + 200);
    if (!TAG.test(ahead) || TYPE_PARAMETER.test(ahead)) return false;
    return this.nested(() => this.tag());
  }

  tag() {
    this.push("jsx", "<");
    this.i++;
    this.space();
    if (this.src[this.i] === ">") { this.i++; this.children(); return true; }
    this.name();
    this.attributes();
    return true;
  }

  // White space, and comments between attributes, passed over.
  space() {
    while (this.i < this.n) {
      const c = this.src[this.i];
      if (c === "/" && (this.src[this.i + 1] === "/" || this.src[this.i + 1] === "*")) this.blank(c);
      else if (/\s/u.test(c)) this.blank(c) || this.i++;
      else return;
    }
  }

  // A tag's name or an attribute's, with a tag's type arguments in TypeScript (<List<T> items={x}>).
  name() {
    while (this.i < this.n && /[\w$.:-]/u.test(this.src[this.i])) this.i++;
    if (this.src[this.i] !== "<") return;
    for (let depth = 0; this.i < this.n; this.i++) {
      if (this.src[this.i] === "<") depth++;
      else if (this.src[this.i] === ">" && --depth === 0) { this.i++; return; }
    }
  }

  // The attributes, up to the tag's end, then its children where it has them.
  attributes() {
    while (this.space(), this.i < this.n) {
      const c = this.src[this.i];
      if (c === "/" && this.src[this.i + 1] === ">") { this.i += 2; return; }
      if (c === ">") { this.i++; this.children(); return; }
      if (c === "{") this.inner();
      else if (c === '"' || c === "'") this.text(c);
      else if (c === "<") this.element() || this.i++;
      else if (/[\w$]/u.test(c)) this.name();
      else this.i++;
    }
    this.lost = true;
  }

  // An attribute's value in quotes, which no backslash escapes.
  text(c) {
    const end = this.src.indexOf(c, this.i + 1), to = end < 0 ? this.n : end + 1;
    this.lines(this.i, to);
    this.i = to;
  }

  // The children, up to the closing tag.
  children() {
    while (this.i < this.n) {
      const c = this.src[this.i];
      if (c === "{") { this.inner(); continue; }
      if (c === "<" && /^<\s*\//u.test(this.src.slice(this.i, this.i + 50))) { this.text(">"); return; }
      if (c === "<" && this.element()) continue;
      if (c === "\n") this.line++;
      this.i++;
    }
    this.lost = true;
  }

  // The code of a { } in an element, between ( and ).
  inner() {
    this.i++;
    this.sign("(");
    if (!this.code(true)) this.lost = true;
    this.sign(")");
  }
}

export const isId = (tok, v) => tok?.t === "id" && (v === undefined || tok.v === v);
export const isP = (tok, v) => tok?.t === "punct" && tok.v === v;
