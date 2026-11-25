// A reader of TOML for what the core's checks read in a project's own files, Codex's `.codex/config.toml` first
// (agent-tools-codex.mjs): the `smol-toml` package, installed from the core's lock file (#654), reads it (#530), and this module gives what it read
// as JSON would hold it: true and false as booleans, a whole number JavaScript holds exactly as a number, and any other
// number or a date as text, which no check here reads. Text the package cannot read as TOML, a key given twice
// included, is refused, as the tool that reads the file refuses it, and so is a value nested deeper than guards.mjs's
// DEEPEST, so that what reads it after never runs out of stack.
//
//   import { parseToml } from "./toml.mjs";   parseToml(text) -> an object, or throws a SyntaxError naming the line, or,
//                                             where the whole nests too deep, saying so of the file; or a
//                                             TomlUnreached where the package could not be installed
//                                             (packages.mjs, unreached())
import { DEEPEST, tooDeep } from "./guards.mjs";
import { loadSync, notInstalled, unreached } from "./packages.mjs";

// (loaded where parseToml first runs, so a script that imports this module for nothing it reads runs with nothing
// installed; plain and scalar run only under parseToml)
let toml;

// (a key set as a plain property, never through a setter: "__proto__" is a key like any other)
const put = (table, key, value) => Object.defineProperty(table, key, { value, enumerable: true, writable: true, configurable: true });

// (where the package could not be installed, the registry not answering or a copy's install failing, what the caller
// reads did not run: thrown as its own kind, which the caller tells from a file that is no TOML; #654, point 4)
export class TomlUnreached extends Error {}

export function parseToml(text) {
  if (unreached("smol-toml")) throw new TomlUnreached(notInstalled("smol-toml"));
  // (a CRLF line end is read as LF, inside a string of several lines too, as the reader before the package read it;
  // where a CR stands alone anywhere, the text is left as it is, for the package to refuse: "\r\r\n" never becomes CRLF)
  const raw = String(text), s = /\r(?!\n)/u.test(raw) ? raw : raw.replace(/\r\n/gu, "\n"), lost = quotesLost(s);
  if (lost >= 0) throw new SyntaxError(`line ${s.slice(0, lost).split("\n").length}: a string's line-ending backslash runs into its closing quotes, which the TOML package reads wrong`);
  let read;
  toml ??= loadSync("smol-toml");
  try { read = toml.parse(s, { integersAsBigInt: true, maxDepth: DEEPEST }); } catch (e) {
    if (!(e instanceof toml.TomlError)) throw new SyntaxError(`the file cannot be read as TOML (${String(e?.message ?? e).split("\n")[0]})`);
    const what = e.message.split("\n")[0].replace(/^Invalid TOML document: /u, "");
    throw new SyntaxError(`line ${e.line}: ${/excessively nested/u.test(what) ? `a value nests deeper than ${DEEPEST}` : what}`);
  }
  const root = plain(read);
  // (the package counts its depth its own way: the whole is counted once more, as guards.mjs counts JSON)
  if (tooDeep(root)) throw new SyntaxError(`the file nests deeper than ${DEEPEST} tables and arrays`);
  return root;
}

// Where a multi-line basic string's line-ending backslash runs into a closing """ that holds one or two quotes of the
// string's own ("""x\ then """""), which the package reads without those quotes (smol-toml 1.9.1; #634's search for
// differences): the backslash's place, so the text is refused and no command is listed other than the one Codex runs;
// else -1. Only that kind of string: a literal string, a comment or a one-line string reads a backslash as itself or
// ends at its line, and the package reads them right. Each string and comment is passed in one walk.
function quotesLost(s) {
  for (let i = 0; i < s.length;) {
    if (s[i] === "#") { i = endOf(s, i, "\n", true, false); continue; }
    if (s[i] !== '"' && s[i] !== "'") { i++; continue; }
    const q = s[i], many = s.startsWith(q.repeat(3), i), from = i + (many ? 3 : 1);
    const at = endOf(s, from, many ? q.repeat(3) : q, !many, q === '"');
    let close = at + (many ? 3 : 1);
    while (many && s[close] === q && close - at < 5) close++;
    const lost = many && q === '"' && close - at > 3 ? backslashBefore(s, from, at) : -1;
    if (lost >= 0) return lost;
    i = close;
  }
  return -1;
}

// Where a string or comment from `from` ends: at `close`, or at its line's end where it is one line, or at the text's.
function endOf(s, from, close, oneLine, escapes) {
  let j = from;
  while (j < s.length && !(oneLine && s[j] === "\n")) {
    if (escapes && s[j] === "\\") j += 2;
    else if (s.startsWith(close, j)) return j;
    else j++;
  }
  return j;
}

// Back from `at` over the blanks, a line break among them, to a backslash whose run is odd: its place, or -1.
function backslashBefore(s, from, at) {
  let k = at, broke = false;
  while (k > from && /[ \t\n]/u.test(s[k - 1])) broke = s[--k] === "\n" || broke;
  let run = 0;
  while (k - run > from && s[k - run - 1] === "\\") run++;
  return broke && run % 2 === 1 ? k - 1 : -1;
}

// A value the package read, as JSON would hold it (above), walked with a stack of its own, never by recursion.
function plain(value) {
  const top = { out: undefined };
  const stack = [[value, top, "out"]];
  while (stack.length) {
    const [v, into, key] = stack.pop();
    if (Array.isArray(v)) {
      const out = new Array(v.length);
      put(into, key, out);
      for (let k = v.length - 1; k >= 0; k--) stack.push([v[k], out, k]);
    } else if (v !== null && typeof v === "object" && !(v instanceof toml.TomlDate)) {
      const out = {};
      put(into, key, out);
      // (each table's keys put in the order they were written, as the stack gives them back)
      for (const k of Object.keys(v).reverse()) stack.push([v[k], out, k]);
    } else put(into, key, scalar(v));
  }
  return top.out;
}

// A whole number JavaScript holds exactly as a number; any other number, or a date, as TOML writes it.
function scalar(v) {
  if (typeof v === "bigint") return Number.isSafeInteger(Number(v)) ? Number(v) : String(v);
  if (typeof v === "number") return Number.isNaN(v) ? "nan" : v === Infinity ? "inf" : v === -Infinity ? "-inf" : Number.isInteger(v) ? v.toFixed(1) : String(v);
  if (v instanceof toml.TomlDate) return v.toISOString();
  return v;
}
