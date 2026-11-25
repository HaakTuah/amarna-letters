// The copies check's part for a value written out in two files (copies.mjs, beside this file, runs it; "One fact, one
// place" in the core's roles/shared/how-to-work.md; #1139): the copies too short for its runs of lines or words to read.
// A value is one of two fixed forms, compared as exact strings, never guessed at:
//   - a pin: 40 or 64 hexadecimal characters standing alone (a commit hash, a SHA-256), in lower case, in any tracked
//     file; save one after `uses: <action>@`, which the host asks of each workflow on its own and Dependabot moves, and a
//     run of digits alone, which is a number;
//   - a pattern: a regular expression literal of JavaScript or TypeScript, as the measures' lexer reads it
//     (code-shape-lexer.mjs), of at least 30 characters, in a file the config's "code" lists; save one that matches one
//     text alone (no ., [, *, +, ?, {, | or class escape such as \d), since that is a script's printed wording read, which
//     the reviews judge.
// A value counts where it stands in two files or more. Not read: lock files, the dated records (archive/, reports/,
// words/, at the root and in the core's copy), what the config's ":!" specs leave out, and the files its "tests" lists,
// whose copies of the code are another check's (#460, point 3); a value the config's "twice" names, with why both files
// must hold it, is taken as said.
// Nothing locks a project (AGENTS.md of the core): what the pull request's base held is the baseline. A value fails only
// where a file of the project's own (outside the core's copy, and no file of the core's that carries its mark: core-owned.mjs) holds
// it now and the base held it in fewer such files; so a sync, which changes the core's files alone, never fails here,
// and a value moved from one file to another passes. Every other value written twice is noted, at every run, a debt to
// work down; with no base (a push to main) every one is noted and none fails. Node's own modules and git.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { tokens, jsxIn } from "./code-shape-lexer.mjs";
import { marked } from "./core-owned.mjs";
import { logged } from "./guards.mjs";

export const PATTERN_LEAST = 30;
const PIN = /(?<![0-9A-Za-z_])(?:[0-9a-fA-F]{64}|[0-9a-fA-F]{40})(?![0-9A-Za-z_])/gu;
const USES = /uses:[ \t]*["']?[^\s"'@]+@(?:sha256:)?$/u;
const LOCKS = ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock", "packages.lock.json", "Cargo.lock", "poetry.lock", "Pipfile.lock", "uv.lock", "Gemfile.lock", "composer.lock", "go.sum"];
const RECORDS = ["archive/", "reports/", "words/"];
const SCRIPT = /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/u;
const READ_MOST = 1 << 20;

// The pins a text holds, each once, in lower case.
export function pinsIn(text) {
  const found = new Map();
  String(text).split("\n").forEach((line, i) => {
    for (const m of line.matchAll(PIN)) {
      if (/^\d+$/u.test(m[0]) || USES.test(line.slice(0, m.index))) continue;
      const v = m[0].toLowerCase();
      if (!found.has(v)) found.set(v, i + 1);
    }
  });
  return found;
}

// Whether a regular expression literal matches more than one text: a ., [, *, +, ?, {, | or a class escape (\d, \w,
// \s, \p and their capitals) outside an escape. (an anchor or a group alone widens nothing)
export function widens(literal) {
  const body = literal.slice(1, literal.lastIndexOf("/"));
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "\\") { if (/[dDwWsSpP]/u.test(body[i + 1] ?? "")) return true; i++; continue; }
    if (".[*+?{|".includes(body[i])) return true;
  }
  return false;
}

// The patterns a script's text holds, each once, with the line it first stands on.
export function patternsIn(text, file) {
  let toks = tokens(text, jsxIn(file));
  if (toks.lost) toks = tokens(text, false);
  const found = new Map();
  for (const t of toks) if (t.t === "regex" && t.v.length >= PATTERN_LEAST && widens(t.v) && !found.has(t.v)) found.set(t.v, t.line);
  return found;
}

const git = (args, ok = [0]) => {
  try { return execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { if (ok.includes(e.status)) return e.stdout ?? ""; throw e; }
};
const list = v => (Array.isArray(v) ? v.filter(x => typeof x === "string" && x) : []);

// A file's text at a commit or ("") in the work tree, or null where it is not a file or past READ_MOST.
function readAt(commit, f) {
  if (commit) { try { return Number(git(["cat-file", "-s", `${commit}:${f}`])) > READ_MOST ? null : git(["show", `${commit}:${f}`]); } catch { return null; } }
  const st = fs.lstatSync(f, { throwIfNoEntry: false });
  return st?.isFile() && st.size <= READ_MOST ? fs.readFileSync(f, "utf8") : null;
}

// What is read: `specs`, every tracked file less what is left out, the config among it; `codeSpecs`, the config's "code" less the same.
// (git's pathspec magic kept: an exclusion is ":!", ":^" or a long form naming exclude; any other, a glob among them,
// includes, and a test's spec, so included, is turned into its exclusion with its magic kept)
const excludes = s => /^:(?:[!^]|\([^)]*\bexclude\b)/u.test(s);
const excluded = s => {
  const long = /^:\(([^)]*)\)(.*)$/su.exec(s);
  if (long) return `:(${long[1] ? `${long[1]},` : ""}exclude)${long[2]}`;
  const short = /^:([/]*):?(.*)$/su.exec(s);
  return short && s.startsWith(":") ? `:(${short[1] ? "top," : ""}exclude)${short[2]}` : `:(exclude)${s}`;
};
function scope(config, core, configAt) {
  const out = list(config.code).concat(list(config.prose)).filter(excludes);
  const leftOut = [...out, ...list(config.tests).filter(s => !excludes(s)).map(excluded),
    ...(configAt ? [`:(exclude,literal)${configAt}`] : []), ...LOCKS.map(f => `:(exclude,glob)**/${f}`), ...RECORDS.flatMap(r => [`:(exclude)${r}`, ...(core ? [`:(exclude)${core}${r}`] : [])])];
  const code = list(config.code).filter(s => !excludes(s));
  return { specs: [".", ...leftOut], code, codeSpecs: [...code, ...leftOut] };
}

// Each value, as a Map of value -> Map of file -> line, at a commit or ("") in the work tree; at a commit, the patterns of
// `want` alone, read only in the scripts that hold one of them as text, found by one git grep of fixed strings.
function valuesAt({ specs, code, codeSpecs }, ls, commit, want = []) {
  const at = new Map(), add = (v, f, line) => { const m = at.get(v) ?? at.set(v, new Map()).get(v); if (!m.has(f)) m.set(f, line); };
  const prefix = commit ? `${commit}:` : "";
  const raw = git(["grep", "-I", "-z", "-n", "-E", "-i", "-e", "[0-9a-f]{40}", ...(commit ? [commit] : []), "--", ...specs], [0, 1]);
  for (let i = 0; i < raw.length;) {
    const a = raw.indexOf("\0", i), b = raw.indexOf("\0", a + 1), e = raw.indexOf("\n", b + 1);
    if (a < 0 || b < 0) break;
    const file = raw.slice(i, a).slice(prefix.length), line = Number(raw.slice(a + 1, b)), text = raw.slice(b + 1, e < 0 ? raw.length : e);
    for (const v of pinsIn(text).keys()) add(v, file, line);
    i = e < 0 ? raw.length : e + 1;
  }
  const scripts = !code.length ? [] : !commit ? ls(codeSpecs) : !want.length ? []
    : git(["grep", "-l", "-z", "-F", ...want.flatMap(t => ["-e", t]), commit, "--", ...codeSpecs], [0, 1]).split("\0").filter(Boolean).map(f => f.slice(prefix.length));
  for (const f of scripts.filter(x => SCRIPT.test(x))) {
    const text = readAt(commit, f);
    if (text !== null) for (const [v, line] of patternsIn(text, f)) add(v, f, line);
  }
  return at;
}

// The values the change wrote into one more file of the project's own than the base held them in, each with the files
// of the project's own that held it there. (only a file the change touched can hold a value it did not hold at the base)
function freshOf(asked, { read, ls, base, core }) {
  if (!base) return [];
  // (the core writes it: a file of its copy, or one of a kind that carries the core's mark, carrying it; a whole file of
  // a kind with no mark is the project's own, since only its text tells it from a kit's, as converged() reads it)
  const coreWrites = (f, at) => !!core && (f.startsWith(core) || (marked(f) && /^# The core's file:/u.test(readAt(at, f) ?? "")));
  const changed = new Set(git(["diff", "--name-only", "-z", base, "--"]).split("\0").filter(Boolean));
  let before = null;
  const fresh = [];
  for (const [v, places] of asked) {
    const own = [...places.keys()].filter(f => !coreWrites(f, ""));
    if (!own.some(f => changed.has(f))) continue;
    before ??= valuesAt(read, ls, base, asked.map(([k]) => k).filter(k => k.startsWith("/")));
    const was = [...(before.get(v)?.keys() ?? [])].filter(f => !coreWrites(f, base));
    if (own.length > was.length) fresh.push([v, places, was]);
  }
  return fresh;
}

// The part, run by copies.mjs from the project's root: `core`, the copy's path from the root ("" in the core's own
// repository); `config`, the check's config, `configPath` its path as given and `configAt` from the root, the config
// itself never read for values, since its "twice" names them; `base`, the pull request's base or "";
// `ls(specs)`, the files pathspecs read, as copies.mjs lists them. It prints its notes and failures and returns whether
// anything failed.
export function valuesTwice({ core, config, configPath, configAt, base, ls }) {
  try { return values({ core, config, configPath, configAt, base, ls }); }
  catch (e) {
    if (!/^fatal:/mu.test(String(e.stderr ?? ""))) throw e;
    console.error(`FAIL: git could not read the values ${logged(configPath)} names: ${logged(String(e.stderr || e.message).trim().split("\n")[0])}. Mend: write each pathspec of its "code", "prose" and "tests" as git reads it (a path, or one of git's magic words), and run the check again`);
    return true;
  }
}

function values({ core, config, configPath, configAt, base, ls }) {
  // (a pin named in capitals is the pin, read in lower case as every pin is; a pattern is kept as written)
  const said = Object.fromEntries(Object.entries(config.twice && typeof config.twice === "object" && !Array.isArray(config.twice) ? config.twice : {})
    .map(([v, why]) => [pinsIn(v).has(v.toLowerCase()) ? v.toLowerCase() : v, why]));
  const read = scope(config, core, configAt);
  const twice = [...valuesAt(read, ls, "")].filter(([, places]) => places.size >= 2);
  const kept = twice.filter(([v]) => typeof said[v] === "string" && said[v].trim());
  const asked = twice.filter(([v]) => !kept.some(([k]) => k === v));
  const fresh = freshOf(asked, { read, ls, base, core });
  report({ asked, fresh, kept, stale: Object.keys(said).filter(v => !twice.some(([k]) => k === v)), base, configPath });
  return fresh.length > 0;
}

function report({ asked, fresh, kept, stale, base, configPath }) {
  // (a pin by its first 12 characters, so a secret written twice never stands whole in a log: its file and line find it)
  const shown = v => (pinsIn(v).has(v) ? `${v.slice(0, 12)}...` : v.length > 80 ? `${v.slice(0, 77)}...` : v);
  const where = places => [...places].map(([f, l]) => `${f}:${l}`).join(" and ");
  const old = asked.filter(([v]) => !fresh.some(([k]) => k === v));
  if (old.length) {
    console.log(`note ${old.length} ${old.length === 1 ? "value stands" : "values stand"} in two files or more${base ? ", as the pull request's base held them" : ", with no base to read against"}: each a debt to work down, failing nothing (read it from one file, or say in ${logged(configPath)}'s "twice" why both must hold it)`);
    for (const [v, places] of old.slice(0, 10)) console.log(`  ${logged(`${shown(v)}: ${where(places)}`)}`);
    if (old.length > 10) console.log(`  and ${old.length - 10} more`);
  }
  for (const v of stale) console.log(`note ${logged(configPath)}'s "twice" names ${logged(shown(v))}, which no longer stands in two files: take it out of "twice"`);
  for (const [v, places, was] of fresh) {
    const first = was[0] ?? [...places.keys()][0];
    console.error(`FAIL: ${logged(`a value written twice: ${shown(v)} stands in ${where(places)}`)}. Mend: read the value from ${logged(first)} (import it, or read the file), or say in ${logged(configPath)}'s "twice" why both must hold it`);
  }
  if (!fresh.length) console.log(`ok   no value newly written twice (a pin or a pattern${kept.length ? `; ${kept.length} said in ${logged(configPath)}'s "twice"` : ""})`);
}
