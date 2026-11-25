// A file of Python as the shape check reads it (shape-python.mjs, beside this file), read on the parser the core
// installs (parser.mjs; #530, item 6): the grammar, not the lexer written here before it, tells what is code. One parse
// gives the file's functions, what it imports and its tokens, the runs of the clock and of a test's reach being read
// from them. It keeps the definitions that lexer's reader had.
//
// A function:
//   - is one a def opens, async or not; a lambda is none;
//   - its name is the def's;
//   - its lines run from its def's line to its body's last line of code, a comment after it no part of it;
//   - its depth is the deepest its control blocks nest: the block of an if, elif, else, for, while, try, except,
//     finally, with and case, each inside the control block it lies in (a match is its case's one level, as a switch
//     is in JavaScript);
//   - it branches at each if, elif, for, while, except and case, and each and, or, a comprehension's for and if, and
//     choice (a if b else c) of its code, an f-string's too; what stands outside its body, a default of its parameters,
//     a decorator, counts where the function itself stands.
// A function inside another is measured on its own.
//
// An import: each module an import statement names (import a.b, c), and each from-import's module with the names it
// takes ("*" for all), its level the count of its leading dots; read with where it stands: in a def, it runs when the
// function is called (as a dynamic import does in JavaScript), and in the block of `if TYPE_CHECKING:` (or
// `typing.TYPE_CHECKING`) it takes types alone; neither makes a cycle.
//
// A token: each word ("id", a keyword among them), number ("num"), string ("str", one for each literal, an f-string's
// code in its { } read after it, its format and conversion passed over) and sign ("punct", one for each character but
// :=), as the lexer gave them; comments are none, and are read apart, each with its line, for a change's marks.
//
// Where the lexer misread, the grammar reads as the definition says (tests/shape-readers-test.mjs holds each such case),
// and where the grammar misreads, the reader mends it from the tree (signsInFormats, below). It never guesses: a file the
// grammar cannot read whole (Python newer than the grammar the core installs, or no Python) has no functions told, and
// the shape check counts it and says so (shape.mjs, "lost"); its imports are those the grammar read whole, outside what
// it could not, and the selection runs a test that reaches the file as one that reaches every file, since the part lost
// may import (shape.mjs, "unsure"). A file it cannot read within its time, or past LARGEST, has none of the three told.
import { inParser } from "./parser.mjs";
import { COMMENT_READ } from "./code-shape.mjs";
import { LARGEST, budgetOf, parseWithin, walkFunctions } from "./tree-walk.mjs";

/** The file `src` read: { functions: [{ name, line, lines, depth, branches }] in the order their bodies open, null where
 *  they cannot be told; imports: [{ level, module, names, line, dynamic, types }]; toks: [{ t, v, line }]; comments:
 *  [{ line, text }] }; null where the parser could not read it within its time or it is past LARGEST. Read in the
 *  parser's thread (read, below). */
export function pythonTree(src) {
  if (src.length > LARGEST.python) return null;
  try { const r = inParser(import.meta.url, "read", src); return r && { ...r, toks: unpacked(r.toks) }; } catch (e) {
    if (e?.kind === "read") return null;
    // (the load's own mend where it gives one, packages.mjs's, which in a job names the install step: #719)
    const mended = / Mend: /u.test(e?.message ?? "");
    if (e?.kind === "load") throw new Error(`The parser or Python's grammar could not be loaded: ${mended ? e.message : `${e.message}. Mend: run \`if [ -f core/scripts/install.mjs ]; then node core/scripts/install.mjs parser; fi\` (in the core, node scripts/install.mjs parser), which installs the parser's packages from its lock file, then run this again`}`);
    throw e;
  }
}

/** `src` read with the parser's `parse` (in its thread: pythonTree, above). */
export function read(parse, src) {
  const tree = parseWithin(parse, "python", src, budgetOf(src));
  if (!tree) return null;
  try {
    const root = tree.rootNode, whole = !root.hasError || signsInFormats(root);
    const comments = [], toks = packed(tokensOf(root, comments));
    return { functions: whole ? walkFunctions(root, { functionBody, nameOf, branches, isControl, rowsOf, outside: node => HOLDS.has(node.type) }) : null, imports: importsOf(root), toks, comments };
  } finally { tree.delete(); }
}

// Whether every error the grammar met under `root` lies in an f-string's { } and is signs alone, nothing it had to take
// as missing: the grammar installed reads a format's fill of = as the := of an assignment (`f"{title:=^80}"`), and
// stops at the sign after it. What stands in { } is one expression, which can open no def and no block, and a sign is
// no word, so no branch (if, for, and, or); the functions around it are told as the definition says. Any other error
// loses the file.
const WORD = /[A-Za-z_]/u;
function signsInFormats(root) {
  const stack = [[root, false]];
  while (stack.length) {
    const [node, inFormat] = stack.pop();
    if (node.isMissing) return false;
    if (node.isError) { if (!inFormat || WORD.test(node.text)) return false; continue; }
    for (const c of node.children) if (c.hasError || c.isMissing) stack.push([c, inFormat || node.type === "interpolation"]);
  }
  return true;
}

// The statements and clauses whose block is a control block: each holds one block, its body.
const CONTROL = new Set(["if_statement", "elif_clause", "else_clause", "for_statement", "while_statement", "try_statement", "except_clause", "finally_clause", "with_statement", "case_clause"]);
const BRANCHING = new Set(["if_statement", "elif_clause", "for_statement", "while_statement", "except_clause", "case_clause", "boolean_operator", "for_in_clause", "if_clause", "conditional_expression"]);

const functionBody = node => (node.type === "function_definition" ? node.childForFieldName("body") : null);
const isControl = (node, parent) => node.type === "block" && !!parent && CONTROL.has(parent.type);
const branches = node => (BRANCHING.has(node.type) ? 1 : 0);
const nameOf = node => node.childForFieldName("name")?.text ?? "(anonymous)";
// (from the def's line, async's where it has one, to the last row of code its body holds)
const rowsOf = (node, body) => [node.startPosition.row, lastCode(body)];

// The last row of `node` that holds code: a comment at a block's end, which the grammar keeps in the block, is none.
function lastCode(node) {
  let at = node;
  for (;;) {
    const children = at.children.filter(c => c.type !== "comment");
    if (!children.length) return at.endPosition.row;
    at = children.at(-1);
  }
}

// ---- imports ----

const IMPORTS = new Set(["import_statement", "import_from_statement", "future_import_statement"]);
// (a node the grammar could not read, or one that holds such a node: an import read from it would be a guess)
const broken = node => node.isError || node.isMissing || node.hasError;

// What the file imports, in the order it stands: each import statement the grammar read whole, with whether a def holds
// it (dynamic) and whether the block of `if TYPE_CHECKING:` does (types). The walk keeps a stack of its own, as the
// functions' does, so that no nesting runs out of the call stack.
// (only what can hold a statement is walked into: an expression holds none, and a file of one long expression is
// read in the time its statements take)
const HOLDS = new Set(["module", "block", "ERROR", "if_statement", "elif_clause", "else_clause", "for_statement", "while_statement", "try_statement", "except_clause", "finally_clause", "with_statement", "match_statement", "case_clause", "function_definition", "class_definition", "decorated_definition"]);
function importsOf(root) {
  const found = [], stack = [{ node: root, dynamic: false, types: false }];
  while (stack.length) {
    const { node, dynamic, types } = stack.pop();
    if (IMPORTS.has(node.type)) { if (!broken(node)) found.push(...statementImports(node).map(i => ({ ...i, dynamic, types }))); continue; }
    if (!HOLDS.has(node.type)) continue;
    const inDef = dynamic || node.type === "function_definition";
    const checking = node.type === "if_statement" && isTypeChecking(node.childForFieldName("condition"));
    // (the children by the tree's cursor, a node made only of each that can hold or be an import: an ERROR may hold
    // millions of leaves)
    const kept = [], c = node.walk();
    try {
      for (let more = c.gotoFirstChild(); more; more = c.gotoNextSibling()) {
        if (HOLDS.has(c.nodeType) || IMPORTS.has(c.nodeType)) kept.push({ node: c.currentNode, dynamic: inDef, types: types || (checking && c.currentFieldName === "consequence") });
      }
    } finally { c.delete(); }
    for (let k = kept.length - 1; k >= 0; k--) stack.push(kept[k]);
  }
  return found;
}
const isTypeChecking = cond => !!cond && /^(typing\.)?TYPE_CHECKING$/u.test(cond.text.replace(/\s+/gu, ""));
// (a dotted name as Python reads it, the spaces and line breaks a bracket allows between its parts left out)
const dottedText = node => node.namedChildren.filter(c => c.type === "identifier").map(c => c.text).join(".");

// The imports one statement makes: [{ level, module, names, line }].
function statementImports(node) {
  const line = node.startPosition.row + 1;
  if (node.type === "import_statement") {
    return node.childrenForFieldName("name").map(n => ({ level: 0, module: dottedText(n.type === "aliased_import" ? n.childForFieldName("name") : n), names: [], line }));
  }
  const from = node.childForFieldName("module_name");
  const prefix = from?.type === "relative_import" ? from.namedChildren.find(c => c.type === "import_prefix") : null;
  const named = from?.type === "relative_import" ? from.namedChildren.find(c => c.type === "dotted_name") : from;
  const module = node.type === "future_import_statement" ? "__future__" : named ? dottedText(named) : "";
  const names = node.namedChildren.some(c => c.type === "wildcard_import") ? ["*"]
    : node.childrenForFieldName("name").map(n => dottedText(n.type === "aliased_import" ? n.childForFieldName("name") : n).split(".")[0]);
  return [{ level: prefix ? prefix.text.replace(/\s+/gu, "").length : 0, module, names, line }];
}

// ---- tokens ----

// (the tokens sent from the parser's thread as three lists, which cost far less to copy than an object for each)
const packed = toks => ({ t: toks.map(x => x.t[0]).join(""), v: toks.map(x => x.v), line: Int32Array.from(toks, x => x.line) });
const KINDS = { i: "id", n: "num", s: "str", p: "punct" };
const unpacked = ({ t, v, line }) => v.map((value, k) => ({ t: KINDS[t[k]], v: value, line: line[k] }));

// The file's tokens, in the order they stand. A string is one token, and an f-string's code in its { } follows it; the
// leaves of the tree are the rest, a comment none of them: each comment goes to `comments` instead, its text after the
// #, as much of it as a change's mark is read in (shape.mjs, "changes").
const WORDLIKE = /^[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*$/u;
const NUMBERS = new Set(["integer", "float"]);
// (what an f-string's { } holds that is no code: its braces, its conversion (!r) and its format after a :)
const NOT_CODE = new Set(["{", "}", "type_conversion", "format_specifier"]);
// The walk goes by the tree's cursor, which makes no node of each leaf it passes, and takes each string's nodes apart.
function tokensOf(root, comments) {
  const toks = [], c = root.walk();
  try {
    for (;;) {
      const type = c.nodeType;
      if (type === "string") nodeTokens(c.currentNode, toks, comments);
      else if (type === "comment") comments.push({ line: c.startPosition.row + 1, text: c.nodeText.slice(1, 1 + COMMENT_READ) });
      else if (type !== "line_continuation") {
        if (c.gotoFirstChild()) continue;
        leaf(toks, type, c.nodeText, c.startPosition.row + 1);
      }
      while (!c.gotoNextSibling()) if (!c.gotoParent()) return toks;
    }
  } finally { c.delete(); }
}
// The tokens of a string and of the code in its { }, as tokensOf gives them.
function nodeTokens(start, toks, comments) {
  const stack = [start];
  while (stack.length) {
    const node = stack.pop(), line = node.startPosition.row + 1;
    if (node.type === "comment") { comments.push({ line, text: node.text.slice(1, 1 + COMMENT_READ) }); continue; }
    if (node.type === "line_continuation") continue;
    if (node.type === "string") {
      toks.push({ t: "str", v: "", line });
      const holes = node.namedChildren.filter(c => c.type === "interpolation");
      for (let k = holes.length - 1; k >= 0; k--) for (const c of codeOf(holes[k]).reverse()) stack.push(c);
      continue;
    }
    if (node.childCount === 0) { leaf(toks, node.type, node.text, line); continue; }
    const children = node.children;
    for (let k = children.length - 1; k >= 0; k--) stack.push(children[k]);
  }
}
// The code of an f-string's { }: its children but its braces, conversion and format; in one the grammar misread, a
// format's fill of = taken for := (signsInFormats, above), the leaves before that :, as the format starts there.
function codeOf(hole) {
  if (!hole.hasError) return hole.children.filter(c => !NOT_CODE.has(c.type));
  const leaves = [], stack = [...hole.children].reverse();
  while (stack.length) {
    const n = stack.pop();
    if (n.childCount) { for (let k = n.children.length - 1; k >= 0; k--) stack.push(n.children[k]); continue; }
    if (n.text.startsWith(":")) break;
    if (!NOT_CODE.has(n.type)) leaves.push(n);
  }
  return leaves;
}
// (a leaf of two words, as "not in" may be, gives two; a token the grammar took as missing holds no text, and gives none)
function leaf(toks, type, text, line) {
  if (NUMBERS.has(type)) { toks.push({ t: "num", v: text, line }); return; }
  for (const v of text.split(/\s+/u).filter(Boolean)) {
    if (WORDLIKE.test(v)) toks.push({ t: "id", v, line });
    else if (v === ":=") toks.push({ t: "punct", v, line });
    else for (const c of v) toks.push({ t: "punct", v: c, line });
  }
}
