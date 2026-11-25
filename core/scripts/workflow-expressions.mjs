// GitHub's expressions (`${{ }}`), as the workflow runner (workflow-run.mjs) and check.mjs read them: contexts,
// literals, ! == != && || < > <= >=, the object filter `*` and the functions the core's workflows and the projects' use
// (#1263). A context, function or sign it does not know throws, so a form GitHub reads and this does not is named rather than read other than GitHub would. Node alone.

const truthy = v => !(v === false || v === null || v === undefined || v === 0 || v === "" || Number.isNaN(v));
export const str = v => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
const num = v => (v === null || v === undefined ? 0 : v === true ? 1 : v === false ? 0 : v === "" ? 0 : Number(v));
const equal = (a, b) => {
  a ??= null; b ??= null;
  if (typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
  if (typeof a === typeof b) return a === b;
  if (a === null || b === null) return false;
  return num(a) === num(b);
};

/** The value of an expression (without its `${{ }}`), in the contexts given and the job's state so far. */
export function evaluate(expr, contexts, state = { failed: false }) {
  const ps = { expr, contexts, tokens: tokenize(expr), p: 0, fns: expressionFunctions(state) };
  const out = orExpr(ps);
  if (ps.p !== ps.tokens.length) throw new Error(`an expression this reader does not know: ${expr}`);
  return out;
}

function tokenize(expr) {
  const tokens = [];
  for (let k = 0; k < expr.length;) {
    const rest = expr.slice(k);
    let m;
    if ((m = /^\s+/.exec(rest))) { k += m[0].length; continue; }
    if ((m = /^'(?:[^']|'')*'/.exec(rest))) tokens.push({ s: m[0].slice(1, -1).replace(/''/g, "'") });
    else if ((m = /^(==|!=|&&|\|\||<=|>=|[!()[\],.<>*])/.exec(rest))) tokens.push({ op: m[0] });
    else if ((m = /^-?\d+(\.\d+)?/.exec(rest))) tokens.push({ n: Number(m[0]) });
    else if ((m = /^[A-Za-z_][\w-]*/.exec(rest))) tokens.push({ id: m[0] });
    else throw new Error(`an expression this reader does not know: ${expr}`);
    k += m[0].length;
  }
  return tokens;
}

// The functions an expression may call, by their lower-case names.
function expressionFunctions(state) {
  return {
    startswith: (a, b) => str(a).toLowerCase().startsWith(str(b).toLowerCase()),
    endswith: (a, b) => str(a).toLowerCase().endsWith(str(b).toLowerCase()),
    contains: (a, b) => (Array.isArray(a) ? a.some(x => equal(x, b)) : str(a).toLowerCase().includes(str(b).toLowerCase())),
    fromjson: a => JSON.parse(str(a)), tojson: a => JSON.stringify(a ?? null),
    join: (a, sep) => joined(a, sep),
    format: (f, ...args) => str(f).replace(/\{\{|\}\}|\{(\d+)\}/g, (m, k) => (m === "{{" ? "{" : m === "}}" ? "}" : str(args[Number(k)]))),
    always: () => true, cancelled: () => !!state.cancelled, success: () => !state.failed, failure: () => state.failed,
  };
}

// join as GitHub's page on expressions defines it: a list's values, or a text, cast to text and joined by the separator,
// `,` where none is given. A value the page does not say it casts (a list or an object inside the list, a value that is
// neither) stops the test, to be taught.
function joined(a, sep) {
  const list = typeof a === "string" ? [a] : Array.isArray(a) ? a : null;
  if (!list || list.some(x => x !== null && typeof x === "object")) throw new Error(`a join this reader does not know: of ${JSON.stringify(a)}`);
  return list.map(str).join(sep === undefined ? "," : str(sep));
}

// What an object filter `*` gives (#1263): a list of each item of a collection, an object's values or a list's items, and
// after it a property of each item, as GitHub's page on expressions defines it. What the page leaves undefined (a filter
// over what is no collection, an item without the property, an index after a filter) stops the test, to be taught.
class Filtered extends Array {}
const itemsOf = (v, expr) => {
  if (Array.isArray(v)) return v;
  if (v !== null && typeof v === "object") return Object.values(v);
  throw new Error(`an object filter over what is no collection: ${JSON.stringify(v)} (in ${expr})`);
};
function filtered(v, key, expr) {
  if (key === "*") return Filtered.from(v instanceof Filtered ? v.flatMap(x => itemsOf(x, expr)) : itemsOf(v, expr));
  if (!(v instanceof Filtered)) return v?.[key] ?? null;
  return Filtered.from(v.map(x => {
    if (x === null || typeof x !== "object" || Array.isArray(x) || !Object.hasOwn(x, key)) throw new Error(`an object filter over an item without ${key}: ${JSON.stringify(x)} (in ${expr})`);
    return x[key];
  }));
}

// The parser `ps` holds the expression, its tokens, the place it stands at, its contexts and its functions.
const peek = (ps, op) => ps.tokens[ps.p]?.op === op;
const take = (ps, op) => { if (!peek(ps, op)) throw new Error(`"${op}" expected in: ${ps.expr}`); ps.p++; };

function callExpr(ps, name) {
  const fn = ps.fns[name.toLowerCase()];
  if (!fn) throw new Error(`a function this reader does not know: ${name}`);
  take(ps, "(");
  const args = [];
  while (!peek(ps, ")")) { args.push(orExpr(ps)); if (!peek(ps, ")")) take(ps, ","); }
  take(ps, ")");
  return fn(...args);
}

function primaryExpr(ps) {
  const t = ps.tokens[ps.p++];
  if (!t) throw new Error(`an expression ends too soon: ${ps.expr}`);
  if (t.op === "(") { const v = orExpr(ps); take(ps, ")"); return v; }
  if ("s" in t) return t.s;
  if ("n" in t) return t.n;
  if (t.id === "true" || t.id === "false") return t.id === "true";
  if (t.id === "null") return null;
  if (t.id && peek(ps, "(")) return callExpr(ps, t.id);
  if (t.id) { if (!(t.id in ps.contexts)) throw new Error(`a context this test does not give: ${t.id} (in ${ps.expr})`); return ps.contexts[t.id]; }
  throw new Error(`an expression this reader does not know: ${ps.expr}`);
}

function postfixExpr(ps) {
  let v = primaryExpr(ps);
  for (;;) {
    if (peek(ps, ".")) { ps.p++; const t = ps.tokens[ps.p++]; if (!t?.id && t?.op !== "*") throw new Error(`a property name expected in: ${ps.expr}`); v = filtered(v, t.id ?? "*", ps.expr); }
    else if (peek(ps, "[") && v instanceof Filtered) throw new Error(`an index after an object filter, which this reader does not know: ${ps.expr}`);
    else if (peek(ps, "[")) { ps.p++; const k = orExpr(ps); take(ps, "]"); v = v?.[k] ?? null; }
    else return v;
  }
}

const unaryExpr = ps => (peek(ps, "!") ? (ps.p++, !truthy(unaryExpr(ps))) : postfixExpr(ps));

const ordered = { "<": (a, b) => a < b, ">": (a, b) => a > b, "<=": (a, b) => a <= b, ">=": (a, b) => a >= b };
function compareExpr(ps) {
  let v = unaryExpr(ps);
  while (["<", ">", "<=", ">="].includes(ps.tokens[ps.p]?.op)) { const op = ps.tokens[ps.p++].op, w = unaryExpr(ps); v = ordered[op](num(v), num(w)); }
  return v;
}

function eqExpr(ps) {
  let v = compareExpr(ps);
  while (peek(ps, "==") || peek(ps, "!=")) { const op = ps.tokens[ps.p++].op, w = compareExpr(ps); v = op === "==" ? equal(v, w) : !equal(v, w); }
  return v;
}

function andExpr(ps) {
  let v = eqExpr(ps);
  while (peek(ps, "&&")) { ps.p++; const w = eqExpr(ps); v = truthy(v) ? w : v; }
  return v;
}

function orExpr(ps) {
  let v = andExpr(ps);
  while (peek(ps, "||")) { ps.p++; const w = andExpr(ps); v = truthy(v) ? v : w; }
  return v;
}

/** A text with each `${{ }}` in it filled in. */
export const fill = (text, contexts, state) => (typeof text === "string" ? text.replace(/\$\{\{([\s\S]*?)\}\}/g, (_, e) => str(evaluate(e, contexts, state))) : text);
/** Whether an `if` holds: a whole `${{ }}`, or an expression written bare. Left out: success(). */
export function holds(cond, contexts, state) {
  if (cond === undefined || cond === null) return !state.failed;
  if (typeof cond === "boolean") return cond && !state.failed;
  const t = String(cond).trim();
  // (as GitHub reads it: a condition that asks no status of its own is read as success() && it)
  if (!/\b(?:success|failure|always|cancelled)\s*\(/u.test(t) && state.failed) return false;
  const whole = /^\$\{\{([\s\S]*)\}\}$/.exec(t);
  return truthy(whole ? evaluate(whole[1], contexts, state) : t.includes("${{") ? fill(t, contexts, state) : evaluate(t, contexts, state));
}
