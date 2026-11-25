// A file of C# as the shape check reads it (shape-csharp.mjs, beside this file), read on the parser the core installs
// (parser.mjs; #529, the first of #530's ports, and its item 6): the grammar, not a lexer written here, tells what is
// code. One read gives the file's functions, its using directives, the namespaces and types it declares, and its
// tokens, from which the runs of the clock and of a test's reach are read. It keeps the definitions the lexer's reader
// had.
//
// A function, word for word:
//   - a function is a method, a constructor, a finaliser, an operator, an accessor (get, set, init, add, remove), a
//     local function, a lambda and an anonymous method with a parameter list, each with a body in braces; a member
//     written with => alone is no block, and not one;
//   - its name is its own (a constructor's, its type's; an operator's "operator", or a conversion's, the last word of
//     its type), an accessor's keyword, and a lambda's, the name it is assigned to (`f = x => { }`), else
//     "(anonymous)";
//   - its lines run from the line of its body's { to that of its };
//   - its depth is the deepest its control blocks nest: the block of an if, else, for, foreach, while, do, switch, try,
//     catch, finally, using, lock, fixed, unsafe, checked and unchecked, each inside the control block it lies in;
//   - it branches at each if, loop (for, foreach, while), case, catch and arm of a switch expression, and each and
//     (&&), or (||, ??, ??=) and choice (? :).
// A function inside another is measured on its own.
//
// A using directive: `using N;`, `using static N.T;` and an alias `using A = N.T;` (a type's arguments left out),
// global or not, wherever it stands; a using statement is none. A namespace: each one declared, a nested one by its
// full name, and a file-scoped one over the declarations after it. A type: each class, struct, interface, enum and
// record, by the name of the namespace around it and its own (a type inside another as one inside its namespace).
//
// A token: each word ("id", a keyword among them, an @ before it left out), number ("num"), string and character
// ("str", one for each, an interpolated string's code in its { } read after it, its alignment and format passed over;
// a raw string's code not read) and sign ("punct", one for each character but =>), as the lexer gave them; comments and
// the preprocessor's lines are none, and each line of a comment is read apart, with its line, for a change's marks.
//
// A line of the preprocessor is one whose first word, outside a string or a comment, opens with #. Those lines are
// blank to the parser where it reads the rest, so that it reads both sides of an #if as code, as the lexer did. It
// never guesses: a file the grammar cannot read whole (C# newer than the grammar the core installs, or no C#) has no
// functions told, and the shape check counts it and says so, and fails one a pull request brings (shape.mjs, "lost");
// its usings and declarations are those the grammar read whole, and the selection runs a test that reaches the file as
// one that reaches every file, since the part lost may hold a using (shape.mjs, "unsure"). A file past LARGEST, or one
// it cannot read in time, has none told. Proven old against new by tests/shape-readers-test.mjs, and against counts taken by hand.
import { commentLines } from "./code-shape.mjs";
import { inParser } from "./parser.mjs";
import { LARGEST, budgetOf, parseWithin, walkFunctions } from "./tree-walk.mjs";

/** The file `src` read: { functions: [{ name, line, lines, depth, branches }] in the order their bodies open, null
 *  where they cannot be told; usings: [{ target, static, alias }]; namespaces; types; toks: [{ t, v, line }] }; null
 *  where the parser could not read it in time, or it is past LARGEST. Read in the parser's thread (read, below). */
export function csharpTree(src) {
  if (src.length > LARGEST.csharp) return null;
  try { return inParser(import.meta.url, "read", src); } catch (e) {
    if (e?.kind === "read") return null;
    // (the load's own mend where it gives one, packages.mjs's, which in a job names the install step: #719)
    if (e?.kind === "load") throw new Error(`The parser or C#'s grammar could not be loaded: ${/ Mend: /u.test(e.message) ? e.message : `${e.message}. Mend: run \`if [ -f core/scripts/install.mjs ]; then node core/scripts/install.mjs parser; fi\` (in the core, node scripts/install.mjs parser), which installs the parser's packages from its lock file, then run the check again`}`);
    throw e;
  }
}

// The statements whose block is a control block, and the field it stands in (null: a block among its children).
const CONTROL = {
  if_statement: ["consequence", "alternative"], while_statement: ["body"], do_statement: ["body"], for_statement: ["body"],
  foreach_statement: ["body"], try_statement: ["body"], catch_clause: ["body"], finally_clause: null, using_statement: ["body"],
  lock_statement: null, fixed_statement: null, unsafe_statement: null, checked_statement: null,
};
const OPERATORS = new Set(["&&", "||", "??"]);
const WORD = /^@?[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*$/u;

/** `src` read with the parser's `parse` (in its thread: csharpTree, above). */
export function read(parse, src) {
  // (one budget for the file, which its parses share: the plain one, and again with the directives blanked and with the
  // headers of extension blocks read as types')
  const until = performance.now() + budgetOf(src), parsed = text => parseWithin(parse, "csharp", text, Math.max(until - performance.now(), 0));
  let tree = parsed(src), text = src;
  if (!tree) return null;
  try {
    const directives = preprocessor(src, tree.rootNode);
    if (directives.size) {
      const lines = src.split("\n");
      text = lines.map((l, k) => (directives.has(k) ? l.replace(/[^\r]/gu, " ") : l)).join("\n");
      tree.delete(); tree = parsed(text);
      if (!tree) return null;
    }
    const headers = /\bextension\s*[<(]/u.test(text) ? extensionHeaders(text, tree.rootNode) : [];
    if (headers.length) { text = asTypes(text, headers); tree.delete(); tree = parsed(text); if (!tree) return null; }
    const root = tree.rootNode, before = root.hasError ? null : leafBefore(root), comments = [], toks = tokensOf(root, text, comments);
    const functions = before ? walkFunctions(root, { functionBody, nameOf: node => nameOf(node, before), branches, isControl }) : null;
    return { functions, ...declarations(root, new Set(headers.map(([start]) => start))), toks, comments };
  } finally { tree?.delete(); }
}

// C# 14's extension blocks (`extension<T>(T x) where T : U { members }`), which the grammar installed predates and reads
// as a constructor, or as no code: where a member of a type opens with the word `extension` and its parameters, and its
// header reaches a { with no ; or } before it, that header is read as a type's (`class _`), the same length and its
// line breaks kept, so that the members inside are read as a type's are, and the block itself is no function, as the
// language makes it none. Each header's [start, end) in the text.
function extensionHeaders(text, root) {
  const found = [], all = leaves(root), own = outermost(typesNamedExtension(text, root));
  let at = 0;
  for (let k = 0; k < all.length; k++) {
    const node = all[k];
    if (node.type !== "identifier" || node.text !== "extension" || !["{", "}", ";", "]"].includes(all[k - 1]?.type)) continue;
    // (in a type named extension, `extension(...) { }` is its constructor, never a block of C# 14's; the leaves come
    // in the text's order, so the bodies are passed by once each)
    while (at < own.length && own[at][1] <= node.startIndex) at++;
    if (at < own.length && node.startIndex > own[at][0] && node.startIndex < own[at][1]) continue;
    const end = headerEnd(text, node.endIndex);
    if (end !== null) found.push([node.startIndex, end]);
  }
  // (where code that does not build gives two headers that overlap, the later goes)
  let reached = 0;
  return found.sort((a, b) => a[0] - b[0]).filter(([start, end]) => start >= reached && (reached = end) >= 0);
}

// Spans [start, end) as a word strictly inside one of them reads them, in the text's order and none inside another: a
// body inside another adds nothing, and two that touch are kept apart, since where one ends and the next begins is in
// neither.
function outermost(spans) {
  const out = [];
  for (const [start, end] of spans.sort((a, b) => a[0] - b[0])) {
    const last = out.at(-1);
    if (last && start < last[1]) last[1] = Math.max(last[1], end); else out.push([start, end]);
  }
  return out;
}

// The bodies of the types the file names `extension` ([start, end) in the text), found only where its text declares
// one: a type of that name may hold a constructor that looks like an extension block's header.
const TYPES = new Set(["class_declaration", "struct_declaration", "record_declaration", "record_struct_declaration"]);
function typesNamedExtension(text, root) {
  if (!/\b(?:class|struct|record)\s+@?extension\b/u.test(text)) return [];
  const out = [], stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (TYPES.has(node.type) && node.childForFieldName("name")?.text.replace(/^@/u, "") === "extension") {
      const body = node.childForFieldName("body");
      if (body) out.push([body.startIndex, body.endIndex]);
    }
    for (const c of node.children) stack.push(c);
  }
  return out;
}

// Where an extension block's header, from just after its word, ends at the { of its body: its type parameters and
// parameters, balanced, then its constraints; null where a ; } = or the text's end comes first, or no ( does, or none
// ends within HEADER characters (so that a text of many headers that never end is read in time linear in its length).
const HEADER = 2000;
function headerEnd(text, from) {
  let depth = 0, params = false;
  for (let k = from; k < Math.min(text.length, from + HEADER); k++) {
    const c = text[k];
    if (c === "(" || c === "<") { depth++; if (c === "(") params = true; } else if (c === ")" || c === ">") depth--;
    else if (depth === 0 && c === "{") return params ? k : null;
    else if (depth === 0 && (c === ";" || c === "}" || c === "=")) return null;
    if (depth < 0) return null;
  }
  return null;
}

// The text with each header read as a type's: `class _`, then spaces, its line breaks kept.
function asTypes(text, headers) {
  let out = "", at = 0;
  for (const [start, end] of headers) {
    const part = text.slice(start, end), head = "class _";
    out += text.slice(at, start) + head + part.slice(head.length).replace(/[^\r\n]/gu, " ");
    at = end;
  }
  return out + text.slice(at);
}


// The body in braces of a node that is a function, else null.
function functionBody(node) {
  const t = node.type;
  if (t === "anonymous_method_expression") return node.childForFieldName("parameters") ? node.children.find(c => c.type === "block") ?? null : null;
  if (!["method_declaration", "constructor_declaration", "destructor_declaration", "operator_declaration", "conversion_operator_declaration", "accessor_declaration", "local_function_statement", "lambda_expression"].includes(t)) return null;
  const body = node.childForFieldName("body");
  return body?.type === "block" ? body : null;
}

// Whether a node is a control block: a block in a control statement's place for one, or a switch statement's braces.
function isControl(node, parent) {
  if (node.type === "switch_body") return true;
  if (node.type !== "block") return false;
  const fields = parent && CONTROL[parent.type];
  if (fields === undefined || !parent) return false;
  return fields === null || fields.some(f => parent.childForFieldName(f)?.id === node.id);
}

// How many branches a node is.
function branches(node) {
  switch (node.type) {
    case "if_statement": case "while_statement": case "do_statement": case "for_statement": case "foreach_statement":
    case "catch_clause": case "switch_expression_arm": case "conditional_expression": return 1;
    case "switch_section": return node.children.filter(c => c.type === "case").length;
    case "binary_expression": return OPERATORS.has(node.childForFieldName("operator")?.type) ? 1 : 0;
    case "assignment_expression": return node.childForFieldName("operator")?.type === "??=" ? 1 : 0;
    default: return 0;
  }
}

// A function's name.
function nameOf(node, before) {
  const t = node.type, plain = n => n.text.replace(/^@/u, "");
  if (t === "accessor_declaration") return plain(node.childForFieldName("name"));
  if (t === "anonymous_method_expression") return "(anonymous)";
  if (t === "lambda_expression") return lambdaName(node, before);
  if (t === "operator_declaration") { const op = node.childForFieldName("operator")?.type; return op === "true" || op === "false" ? op : "operator"; }
  if (t === "conversion_operator_declaration") return typeWord(node.childForFieldName("type")) ?? "operator";
  return plain(node.childForFieldName("name"));
}

// The word a conversion is named by: its type's last name, type arguments passed over (`List<T>` is List); null for a
// type that ends in another sign (`int?`, `int[]`, a tuple).
function typeWord(type) {
  let at = type;
  if (at?.type === "qualified_name") at = at.childForFieldName("name");
  if (at?.type === "generic_name") at = at.namedChildren.find(c => c.type === "identifier");
  return at && WORD.test(at.text) ? at.text.replace(/^@/u, "") : null;
}

// A lambda's name: the word that `=` assigns it to, before its parameters (async passed over), else "(anonymous)".
function lambdaName(node, before) {
  let at = before(node.childForFieldName("parameters"));
  if (at?.text === "async") at = before(at);
  if (at?.type !== "=") return "(anonymous)";
  const word = before(at);
  return word && WORD.test(word.text) ? word.text.replace(/^@/u, "") : "(anonymous)";
}

// The leaves of the tree under `root` in the order the text holds them, comments passed over: walked once with a
// stack of its own, so that no chain of nodes, however long or deep, is climbed again for each leaf.
function leaves(root) {
  const out = [], stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node.type === "comment") continue;
    const children = node.children;
    if (!children.length) { out.push(node); continue; }
    for (let k = children.length - 1; k >= 0; k--) stack.push(children[k]);
  }
  return out;
}

// The leaf just before a node, comments passed over, by the leaves of the tree under `root`, listed the first time a
// function's name asks for it (null at the file's start).
function leafBefore(root) {
  let index = null;
  return node => {
    if (!index) { const all = leaves(root); index = new Map(all.map((leaf, k) => [leaf.id, all[k - 1] ?? null])); }
    let first = node;
    while (first.childCount) first = first.child(0);
    return index.get(first.id) ?? null;
  };
}

// ---- the preprocessor's lines ----

// What a # on a line of its own may lie inside and be no directive: a string's text, a character, or a comment.
const TEXTS = new Set(["string_literal", "verbatim_string_literal", "raw_string_literal", "interpolated_string_expression", "character_literal", "comment"]);
// The lines (from 0) of the preprocessor: those whose first sign, after white space alone, is a # that lies in no
// string or comment of the tree read as it stands. The strings and comments are found in one walk, and each # is looked
// up among them, so the work grows with the file, never with its lines times its depth.
function preprocessor(src, root) {
  const found = new Set(), texts = textSpans(root);
  let line = 0;
  for (let at = 0; at <= src.length; line++) {
    const end = src.indexOf("\n", at), stop = end < 0 ? src.length : end;
    let k = at;
    while (k < stop && (src[k] === " " || src[k] === "\t" || src[k] === "\r" || src[k] === "\f" || src[k] === "\v" || src[k] === "\uFEFF")) k++;
    if (src[k] === "#" && !within(texts, k)) found.add(line);
    if (end < 0) break;
    at = end + 1;
  }
  return found;
}
// The outermost strings and comments of the tree, by where each starts and ends, in order: none holds another. The
// walk goes by the tree's cursor, which makes no node of each it passes.
function textSpans(root) {
  const spans = [], c = root.walk();
  try {
    for (;;) {
      if (TEXTS.has(c.nodeType)) spans.push([c.startIndex, c.endIndex]);
      else if (c.gotoFirstChild()) continue;
      while (!c.gotoNextSibling()) if (!c.gotoParent()) return spans;
    }
  } finally { c.delete(); }
}
// Whether `at` lies inside one of `spans`, found by halving.
function within(spans, at) {
  let lo = 0, hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, [start, end] = spans[mid];
    if (at < start) hi = mid - 1;
    else if (at >= end) lo = mid + 1;
    else return true;
  }
  return false;
}

// ---- what a file declares and takes ----

const DECLARES = new Set(["class_declaration", "struct_declaration", "interface_declaration", "enum_declaration", "record_declaration", "record_struct_declaration"]);
const NAMESPACES = new Set(["namespace_declaration", "file_scoped_namespace_declaration"]);
// (a dotted name as written, the spaces and comments between its parts left out, a type's arguments too: `N.T<int>` is N.T)
function dotted(node) {
  if (!node) return "";
  if (node.type === "identifier") return node.text.replace(/^@/u, "");
  if (node.type === "generic_name") return dotted(node.namedChildren.find(c => c.type === "identifier"));
  if (node.type === "qualified_name") return node.namedChildren.map(dotted).filter(Boolean).join(".");
  return "";
}

// The using directives, namespaces and types under `root`: { usings, namespaces, types }, each one the grammar read
// whole, inside a part it could not read too, where its recovery kept it (a using directive with no error in it, a
// declaration whose name it read); a type a header of C# 14's extension blocks was read as (`injected`, by where each
// starts) is none.
function declarations(root, injected) {
  const usings = [], namespaces = new Set(), types = new Set();
  const stack = [{ node: root, within: "" }];
  while (stack.length) {
    const { node, within } = stack.pop();
    if (node.isMissing) continue;
    if (node.type === "using_directive") { const u = usingOf(node); if (u) usings.push(u); continue; }
    let scope = within; // (what the node's children lie in)
    if (NAMESPACES.has(node.type)) {
      const name = join(within, dotted(node.childForFieldName("name")));
      namespaces.add(name);
      if (node.type === "namespace_declaration") scope = name;
    } else if (DECLARES.has(node.type) && !injected.has(node.startIndex)) {
      const name = node.childForFieldName("name");
      if (name && !name.hasError) types.add(join(within, name.text.replace(/^@/u, "")));
    }
    // (a file-scoped namespace holds the declarations after it, which the grammar gives as its siblings)
    const after = [];
    for (const c of node.children) {
      after.push({ node: c, within: scope });
      if (c.type === "file_scoped_namespace_declaration" && !c.hasError) scope = join(scope, dotted(c.childForFieldName("name")));
    }
    for (let k = after.length - 1; k >= 0; k--) stack.push(after[k]);
  }
  return { usings, namespaces: [...namespaces], types: [...types] };
}
const join = (a, b) => (a && b ? `${a}.${b}` : a || b);

// A using directive's target: { target, static, alias }; null where it names no dotted name: `using global::N;`, as the
// lexer read it. A `global::` inside the target's type arguments (`using A = N.Box<global::S>;`) is no qualifier of the
// target, which the lexer kept.
const GLOBAL = node => { const stack = [node]; while (stack.length) { const n = stack.pop(); if (n.type === "alias_qualified_name") return true; stack.push(...n.namedChildren.filter(c => c.type !== "type_argument_list")); } return false; };
function usingOf(node) {
  if (node.hasError || GLOBAL(node)) return null;
  const isStatic = node.children.some(c => c.type === "static"), alias = node.children.some(c => c.type === "=");
  const named = node.namedChildren.filter(c => ["identifier", "qualified_name", "generic_name"].includes(c.type)).at(-1);
  const target = dotted(named);
  return target ? { target, static: isStatic, alias } : null;
}

// ---- tokens ----

const WORDLIKE = /^@?[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*$/u;
const NUMBERS = new Set(["integer_literal", "real_literal"]);
const STRINGS = new Set(["string_literal", "verbatim_string_literal", "raw_string_literal", "character_literal"]);
// The file's tokens in the order they stand, from its tree with the preprocessor's lines blank (and the header of each
// of C# 14's extension blocks read as a type's, `class _`, its own words no tokens): a comment is none; a
// string or character is one, an interpolated string's code in its { } after it. Each line of a comment goes to
// `comments` instead, its text after the // or /* (shape.mjs reads them for a change's marks), and one on a line of the
// preprocessor, blank, nowhere, as the lexer read it.
function tokensOf(root, text, comments) {
  const toks = [], stack = [root];
  while (stack.length) {
    const node = stack.pop(), line = node.startPosition.row + 1;
    if (node.type === "comment") { for (const c of commentOf(node, text, line)) comments.push(c); continue; } // (one at a time: a comment of many lines would pass the limit of a call's arguments)
    if (STRINGS.has(node.type)) { toks.push({ t: "str", v: node.type === "character_literal" ? node.text.slice(1, -1) : "", line }); continue; }
    if (node.type === "interpolated_string_expression") {
      toks.push({ t: "str", v: "", line });
      RAW.lastIndex = node.startIndex;
      const raw = RAW.test(text); // (the grammar's interpolation_start holds the $ signs alone, as many as they are)
      const holes = raw ? [] : node.namedChildren.filter(c => c.type === "interpolation");
      for (let k = holes.length - 1; k >= 0; k--) for (const c of [...holes[k].children].reverse()) if (!["interpolation_brace", "interpolation_alignment_clause", "interpolation_format_clause"].includes(c.type)) stack.push(c);
      if (!raw) for (const tok of misreadHoles(node, holes, text)) toks.push(tok);
      continue;
    }
    if (node.childCount === 0) { leaf(toks, node, line); continue; }
    const children = node.children;
    for (let k = children.length - 1; k >= 0; k--) stack.push(children[k]);
  }
  return toks;
}
// The grammar reads a hole right after an escaped brace (`$"{{{x}}}"`) as the string's text, where C# reads `{{` then a
// hole: a run of an odd count of `{` in the text outside the holes the grammar read. Its code, to the `}` that closes it
// (before an alignment's `,` or a format's `:` at its own depth), is given as tokens after the string's, split as words,
// numbers, strings and signs, as the lexer gave them, so a run of the clock in it is still read. A quote left unclosed
// runs to the line's end, so the code is split in time linear in it.
const SPLIT = /\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|@?[A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*|\d[\w.]*|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|=>|\S/gu;
// Whether an interpolated string is raw: its $ signs, then three quotes, at the place it is tried from.
const RAW = /\$+"""/uy;
function misreadHoles(node, holes, text) {
  const out = [];
  let at = node.startIndex, row = node.startPosition.row + 1, seen = at; // (lines counted once each, as the holes are passed in order)
  for (const span of [...holes.map(h => [h.startIndex, h.endIndex]), [node.endIndex, node.endIndex]]) {
    const runs = /\{+/gu, piece = text.slice(at, span[0]);
    for (let m; (m = runs.exec(piece));) {
      if (m[0].length % 2 === 0) continue;
      const start = at + m.index + m[0].length, end = holeEnd(text, start, span[0]);
      for (; seen < start; seen++) if (text[seen] === "\n") row++;
      const line = row;
      for (const v of text.slice(start, end).match(SPLIT) ?? []) if (!v.startsWith("//") && !v.startsWith("/*")) out.push(tokenOf(v, line)); // (a comment is no token)
      runs.lastIndex = Math.max(runs.lastIndex, end - at);
    }
    at = span[1];
  }
  return out;
}
// Where a hole's code ends: at the `}` that closes it, or an alignment's `,` or a format's `:` at its own depth.
function holeEnd(text, start, limit) {
  let depth = 0, end = start;
  for (; end < limit; end++) {
    const c = text[end];
    if ("([{".includes(c)) depth++;
    else if (")]".includes(c) || (c === "}" && depth > 0)) depth--;
    else if (c === "}" || (depth === 0 && (c === "," || c === ":"))) break;
  }
  return end;
}
const tokenOf = (v, line) => (/^["']/u.test(v) ? { t: "str", v: "", line } : /^\d/u.test(v) ? { t: "num", v, line } : WORDLIKE.test(v) ? { t: "id", v: v.replace(/^@/u, ""), line } : { t: "punct", v, line });

// The lines of a comment, as the lexer read them: of a // comment its text to the line's end (a \r before it kept), and
// of a /* */ one each line from after its /* to before its */.
function commentOf(node, text, line) {
  const out = [], start = node.startIndex, block = text.startsWith("/*", start);
  const end = block ? (text.startsWith("*/", node.endIndex - 2) && node.endIndex - start >= 4 ? node.endIndex - 2 : node.endIndex) : (text.indexOf("\n", start) + 1 || text.length + 1) - 1;
  commentLines(out, text, start + 2, end, line);
  return out;
}
function leaf(toks, node, line) {
  if (NUMBERS.has(node.type)) { toks.push({ t: "num", v: node.text, line }); return; }
  for (const v of node.text.split(/\s+/u).filter(Boolean)) {
    if (WORDLIKE.test(v)) toks.push({ t: "id", v: v.replace(/^@/u, ""), line });
    else if (v === "=>") toks.push({ t: "punct", v, line });
    else for (const c of v) toks.push({ t: "punct", v: c, line });
  }
}
