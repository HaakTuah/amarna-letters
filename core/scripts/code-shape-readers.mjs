// The readers of the measures (code-shape.mjs, which re-exports them): what a file's tokens say of its imports and of
// the names its top level declares, where an import leads in the repository and the cycles of a graph of files or
// folders. Whoever changes how an import or a global name is read reads this file and the lexer's
// (code-shape-lexer.mjs) tokens, not the measures, the history or the command (code-shape.mjs).
import path from "node:path";
import { isId, isP } from "./code-shape-lexer.mjs";

export const CODE = [".js", ".mjs", ".cjs", ".jsx", ".ts", ".mts", ".cts", ".tsx"];

const notMember = (toks, k) => !isP(toks[k - 1], ".") && !isP(toks[k - 1], "?");

// What a file imports: [{ spec, kind: "import" | "export" | "dynamic" | "require", names }], names being what it takes
// by name ("default" and "*" for a default and a whole namespace; empty where it takes nothing by name or the call
// says nothing of it).
export function imports(toks) {
  const found = [];
  for (let k = 0; k < toks.length; k++) {
    const tok = toks[k];
    if (tok.t !== "id" || !notMember(toks, k)) continue;
    const hit = importAt(toks, k);
    if (hit) found.push(hit);
  }
  return found;
}

// What the word at k imports, by its kind: null where it is none of them.
function importAt(toks, k) {
  const v = toks[k].v;
  if (v === "require") return requireCall(toks, k);
  if (v === "import") return importStatement(toks, k);
  if (v === "export") return exportClause(toks, k);
  return null;
}

function requireCall(toks, k) {
  const named = isP(toks[k + 1], "(") && toks[k + 2]?.t === "str" && isP(toks[k + 3], ")");
  return named ? { spec: toks[k + 2].v, kind: "require", names: [] } : null;
}

// An import( call, an import of a module for its effects alone, or an import with a clause.
function importStatement(toks, k) {
  const next = toks[k + 1];
  if (isP(next, "(")) return toks[k + 2]?.t === "str" ? { spec: toks[k + 2].v, kind: "dynamic", names: [] } : null;
  if (next?.t === "str") return { spec: next.v, kind: "import", names: [] };
  if (isP(next, ".")) return null;
  return clauseEntry(toks, k, "import");
}

function exportClause(toks, k) {
  const next = toks[k + 1];
  return isP(next, "{") || isP(next, "*") || isId(next, "type") ? clauseEntry(toks, k, "export") : null;
}

// The import or export whose clause starts after the word at k; null where its clause names no module.
function clauseEntry(toks, k, kind) {
  const f = fromClause(toks, k + 1);
  return f ? { ...f, kind, types: typesOnly(toks, k + 1) } : null;
}

// Whether an import or export clause takes types alone, which TypeScript erases before the code runs: `import type`,
// or braces whose every name is marked `type`.
function typesOnly(toks, k) {
  if (isId(toks[k], "type") && !isId(toks[k + 1], "from") && !isP(toks[k + 1], ",")) return true;
  if (!isP(toks[k], "{")) return false;
  let names = 0;
  for (let j = k + 1; j < toks.length && !isP(toks[j], "}"); j++) {
    if (isP(toks[j], ",") || isId(toks[j], "as") || isId(toks[j - 1], "as")) continue;
    // (`type as x` takes a value named type; `type x` a type)
    if (!isId(toks[j], "type") || isP(toks[j + 1], ",") || isP(toks[j + 1], "}") || (isId(toks[j + 1], "as") && !isId(toks[j + 2], "as"))) return false;
    names++; j++;
  }
  return names > 0;
}

// The names an import or export clause takes, and the module after its `from`; null where none follows it: where the
// clause ends (its braces close, or an = shows a declaration) with no `from` after it, so a statement with no semicolon
// never lends its `from` to the one before it.
function fromClause(toks, k) {
  const clause = { names: [], braces: false };
  for (let j = k; j < toks.length && j < k + 400; j++) {
    const tok = toks[j];
    if (clauseEnds(toks, j)) return null;
    if (isId(tok, "from") && !clause.braces && toks[j + 1]?.t === "str") return { spec: toks[j + 1].v, names: clause.names };
    takeInClause(toks, j, k, clause);
  }
  return null;
}

// Whether the clause ends at j with no `from` after it: a ; or =, or braces that close with none next.
function clauseEnds(toks, j) {
  const tok = toks[j];
  return isP(tok, ";") || isP(tok, "=") || (isP(tok, "}") && !isId(toks[j + 1], "from"));
}

// The token at j of a clause started at k: where its braces open or close, or a name it takes.
function takeInClause(toks, j, k, clause) {
  const tok = toks[j];
  if (isP(tok, "{")) clause.braces = true;
  else if (isP(tok, "}")) clause.braces = false;
  else if (isP(tok, "*")) clause.names.push("*");
  else if (tok.t === "id") {
    const name = clause.braces ? nameInBraces(toks, j) : nameBeforeBraces(toks, j, k);
    if (name) clause.names.push(name);
  }
}

// The name an id inside the braces gives (`type` itself where it stands as a name), null for a keyword.
function nameInBraces(toks, j) {
  const tok = toks[j];
  if (tok.v === "type") return isP(toks[j + 1], ",") || isP(toks[j + 1], "}") ? tok.v : null;
  return !isId(toks[j - 1], "as") && tok.v !== "as" ? tok.v : null;
}

// "default" for the id that starts a clause started at k (not `type`), or follows a , that no braces or `type` precede.
function nameBeforeBraces(toks, j, k) {
  const first = j === k && toks[j].v !== "type";
  return first || (isP(toks[j - 1], ",") && !isP(toks[j - 2], "}") && !isId(toks[j - 2], "type")) ? "default" : null;
}

// Whether a file is a module: it imports, exports or requires (module.exports too); one that does none of these, a
// dynamic import aside, shares its top level with every other such file a page loads.
export function isModule(toks) {
  return toks.some((tok, k) => tok.t === "id" && notMember(toks, k)
    && (tok.v === "export" || (tok.v === "import" && !isP(toks[k + 1], "(")) || (tok.v === "require" && isP(toks[k + 1], "("))
      || (tok.v === "module" && isP(toks[k + 1], ".") && isId(toks[k + 2], "exports"))));
}

// The names a file's top level declares: function, class, var, let and const, the first of each list.
export function globals(toks) {
  const names = new Set();
  let depth = 0;
  for (let k = 0; k < toks.length; k++) {
    const tok = toks[k];
    if (tok.t === "punct" && "([{".includes(tok.v)) depth++;
    else if (tok.t === "punct" && ")]}".includes(tok.v)) depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      const name = declaredAt(toks, k);
      if (name) names.add(name);
    }
  }
  return [...names];
}

// The name the declaration at k gives, null where none starts there (a function or class as an expression has none).
function declaredAt(toks, k) {
  const tok = toks[k];
  if (tok.t !== "id" || !["function", "class", "var", "let", "const"].includes(tok.v) || !notMember(toks, k)) return null;
  const next = isP(toks[k + 1], "*") ? toks[k + 2] : toks[k + 1];
  return next?.t === "id" && !isExpression(toks, k) ? next.v : null;
}

function isExpression(toks, k) {
  const tok = toks[k], before = toks[k - 1];
  if (tok.v !== "function" && tok.v !== "class") return false;
  return before && !isP(before, ";") && !isP(before, "}") && !isId(before, "export") && !isId(before, "async");
}

// A tree of dotted names, each by its parts; `lyingUnder` gives the names of it that a dotted name is or lies under,
// shortest first, and `holdsUnder` whether any name of it lies under a dotted name, each in one walk of the name.
export function nameTree(names) {
  const root = new Map();
  for (const name of names) {
    let node = root;
    for (const part of name.split(".")) { if (!node.has(part)) node.set(part, new Map()); node = node.get(part); }
    node.name = name;
  }
  return root;
}
export function lyingUnder(tree, name) {
  const out = [];
  let node = tree;
  for (const part of name.split(".")) { node = node.get(part); if (!node) break; if (node.name !== undefined) out.push(node.name); }
  return out;
}
export function holdsUnder(tree, name) {
  let node = tree;
  for (const part of name.split(".")) { node = node.get(part); if (!node) return false; }
  return node.size > 0;
}

// Adds a value to the list a map holds under a key, the list made where there is none yet.
export const append = (map, key, value) => { const list = map.get(key); if (list) list.push(value); else map.set(key, [value]); };

// Where an import leads in the repository: the file it names, with its extension or index added as Node and the
// bundlers add them, or the file of a package the repository holds itself; null for a package from outside.
export function resolve(from, spec, files, packages) {
  const tryFile = p => {
    p = path.posix.normalize(p);
    const tries = [p, ...CODE.map(e => p + e), ...CODE.map(e => `${p}/index${e}`)];
    if (/\.(m|c)?js$/.test(p)) tries.push(...[".ts", ".tsx", ".mts", ".cts"].map(e => p.replace(/\.(m|c)?js$/, e)));
    return tries.find(t => files.has(t)) ?? null;
  };
  if (spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === "..") return tryFile(path.posix.join(path.posix.dirname(from), spec));
  const name = packageName(spec);
  const pkg = packages.get(name);
  if (!pkg) return null;
  const rest = spec.slice(name.length);
  return rest ? tryFile(path.posix.join(pkg.dir, rest)) : tryFile(path.posix.join(pkg.dir, pkg.main ?? "index"));
}

// The cycles of a graph (a Map of node to a Set of nodes): its strongly connected parts of more than one node, and each
// node that leads to itself, each part's nodes sorted.
export function cycles(graph) {
  let index = 0;
  const idx = new Map(), low = new Map(), on = new Set(), stack = [], parts = [];
  const visit = start => { // Tarjan's, kept iterative so a long chain of imports does not overflow the stack
    const work = [[start, [...(graph.get(start) ?? [])], 0]];
    idx.set(start, index); low.set(start, index); index++; stack.push(start); on.add(start);
    while (work.length) {
      const frame = work[work.length - 1], [v, next] = frame;
      if (frame[2] < next.length) {
        const w = next[frame[2]++];
        if (!idx.has(w)) { idx.set(w, index); low.set(w, index); index++; stack.push(w); on.add(w); work.push([w, [...(graph.get(w) ?? [])], 0]); }
        else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
        continue;
      }
      work.pop();
      if (work.length) { const u = work[work.length - 1][0]; low.set(u, Math.min(low.get(u), low.get(v))); }
      if (low.get(v) === idx.get(v)) {
        const part = [];
        let w;
        do { w = stack.pop(); on.delete(w); part.push(w); } while (w !== v);
        if (part.length > 1 || graph.get(v)?.has(v)) parts.push(part.sort());
      }
    }
  };
  for (const v of [...graph.keys()].sort()) if (!idx.has(v)) visit(v);
  return parts.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

// A package's name in an import's spec: its first part, or its first two where it is scoped.
export const packageName = spec => spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
