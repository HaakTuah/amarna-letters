// What a project holds twice, or against the core (tasks/cleaning.md, "The reading asks what a project holds twice";
// #1087): the scripts' part of the reading of a project against the core, run at every sync (sync.mjs, beside this
// file, prints it for the sync's pull request) and by the session that takes the reading's task. It lists what it reads
// without guessing, and with --fix corrects only what is exact; what reads close it lists for the auditor
// (roles/auditor.md), who reads it by meaning, and corrects nothing of. What it reads, from the project's root:
//   - text: each paragraph or list item of the project's own Markdown, outside the copy, the core's part of a rule file
//     (core-owned.mjs, BEGIN to END) and the core's whole files, that is a copy of one of the copy's own Markdown files
//     or of another of the project's, or reads close to one (twice-text.mjs, beside this file); listed;
//   - a file outside the copy equal byte for byte to one of the core's, at the copy or, with the core fetched, at an
//     earlier copy (the old pin and each release); it goes, and no pointer is moved for it, where no other file of the
//     repository holds its name in any form (twice-files.mjs), it is Markdown a tool does not look for where it stands,
//     and it is neither the floor's text nor a file the project's AGENTS.md calls a safety rule; else it is listed,
//     with each file that names it;
//   - a job that calls one of the core's workflows that another job calls too: the second of two in one workflow, the
//     same in all but its name and named in no `needs:`, goes from a workflow of the project's own; any other is listed;
//   - a pointer, in the project's own text, to a path of the copy that is not there: with the core fetched, one the
//     core moved unchanged (a rename git finds whole, between an earlier copy and the copy) moves to where it stands;
//     any other is listed.
// The dated records (reports/, archive/) are not compared, nor changed; they are read only for a file's name. It fails nothing (AGENTS.md of the core, "Nothing
// locks a project"); in the core's own repository, which holds no copy, it reads nothing. Node's own modules, git and
// the YAML reader (parse-yaml.mjs); the files and pointers are read in twice-files.mjs, the text in twice-text.mjs.
//
//   node core/scripts/twice.mjs                         from a project's root: each finding, exact or for the auditor
//   node core/scripts/twice.mjs --fix                   and correct what is exact, for a pull request of its own
//   node core/scripts/twice.mjs --all                   every finding for the auditor, past the first MOST too
//   ... --since <sha> [--fetched <dir>]                 with the copy's pin before the sync, the core fetched (into the
//                                                       bare repository <dir> where the sync gives it), for the earlier copies
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CORE } from "./core-address.mjs";
import { whole } from "./core-owned.mjs";
import { MANIFEST, readCore } from "./core-path.mjs";
import { ownFiles } from "./own-files.mjs";
import { parseYaml } from "./parse-yaml.mjs";
import { fetchCore, inBare, releasesIn } from "./releases.mjs";
import { started } from "./started.mjs";
import { SKIP, filesFound, linked, listTree, safetyOf, textFiles } from "./twice-files.mjs";
import { textFound } from "./twice-text.mjs";

export { blobId, filesFound } from "./twice-files.mjs"; // (the tests' way in)


// The pointers to paths of the copy that are not there: { file, line, path, to } where `to` is where the core moved it
// unchanged (null where it did not, or it cannot be read).
export function pointersFound(p) {
  const found = [];
  for (const { file, text } of textFiles(p)) {
    for (const m of text.matchAll(copyPaths(p))) {
      const at = m[1].replace(/\/$/u, "");
      if (p.copySet.has(at) || p.copyFolders.has(at)) continue;
      found.push({ file, line: text.slice(0, m.index).split("\n").length, path: `${p.copy}${at}`, to: p.moved.get(at) ? `${p.copy}${p.moved.get(at)}` : null });
    }
  }
  return found;
}
// Each path of the copy a text names, as the copy's folder and the path after it.
const copyPaths = p => new RegExp(`(?<![A-Za-z0-9._/-])${p.copy.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")}([A-Za-z0-9_][A-Za-z0-9._/-]*[A-Za-z0-9_/])`, "gu");

// Each job that calls a workflow of the core's that another job calls too: { file, job, other, exact }, `exact` where it
// is the second of two in one workflow of the project's own, the same in all but its name, needed by no job and named
// in no expression.
export function callsFound(p) {
  const calls = [], needed = new Set();
  for (const f of p.outside.filter(f => /^\.github\/workflows\/[^/]+\.ya?ml$/u.test(f) && !linked(p, f))) {
    let doc;
    try { doc = parseYaml(p.own.read(f) ?? ""); } catch { continue; }
    // (a job an expression names, as a reusable workflow's outputs do, is needed as much as one in needs:)
    for (const m of (p.own.read(f) ?? "").matchAll(/\bjobs\s*(?:\.\s*([\w-]+)|\[\s*['"]([^'"]+)['"]\s*\])/gu)) needed.add(`${f}#${m[1] ?? m[2]}`);
    for (const [job, body] of Object.entries(doc?.jobs ?? {})) {
      const m = new RegExp(`^${CORE}/\\.github/workflows/([^@]+)@`, "u").exec(String(body?.uses ?? ""));
      for (const n of [body?.needs ?? []].flat()) needed.add(`${f}#${n}`);
      if (m) calls.push({ file: f, job, name: m[1], body: JSON.stringify(body), core: whole(f) && /^# The core's file:/u.test(p.own.read(f) ?? "") });
    }
  }
  const found = [];
  calls.forEach((c, i) => {
    const first = calls.slice(0, i).find(o => o.name === c.name);
    if (!first) return;
    const exact = first.file === c.file && first.body === c.body && !c.core && !needed.has(`${c.file}#${c.job}`);
    found.push({ file: c.file, job: c.job, other: `${first.file}#${first.job}`, name: c.name, exact });
  });
  return found;
}

// The workflow's text with the job `job` taken out: its key's line and every line under it, where what is left reads
// as the workflow did without that job; null where it does not, so nothing is guessed.
export function withoutJob(text, job) {
  const lines = text.split("\n"), at = lines.findIndex(l => new RegExp(`^(\\s+)${job.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")}:\\s*$`, "u").test(l));
  if (at < 0) return null;
  const indent = /^\s*/u.exec(lines[at])[0].length;
  let end = at + 1;
  while (end < lines.length && (!lines[end].trim() || /^\s*/u.exec(lines[end])[0].length > indent)) end++;
  while (end > at + 1 && !lines[end - 1].trim()) end--;
  const out = [...lines.slice(0, at), ...lines.slice(end)].join("\n");
  try {
    const was = parseYaml(text), now = parseYaml(out);
    delete was.jobs[job];
    return JSON.stringify(was) === JSON.stringify(now) ? out : null;
  } catch { return null; }
}

// The project as the script reads it, from `root`; null in the core's own repository or where no copy stands.
export function projectOf(root, { fetched = null, since = null } = {}) {
  const own = ownFiles(root), manifest = own.read(MANIFEST);
  if (manifest === null) return null;
  const line = readCore(manifest);
  if (!line.path || !fs.existsSync(path.join(root, line.path))) return null;
  const copy = line.path, copyDir = path.join(root, copy);
  const copyFiles = listCopy(copyDir), copySet = new Set(copyFiles);
  const copyFolders = new Set(copyFiles.flatMap(f => f.split("/").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("/"))));
  // (the library that carries the core is another repository's, whose files this never reads as the project's own)
  const library = line.library ? `${line.library.replace(/\/+$/u, "")}/` : null;
  const outside = own.listed.filter(f => !f.startsWith(copy) && !(library && f.startsWith(library)));
  const markdown = outside.filter(f => /\.md$/iu.test(f) && !whole(f) && !SKIP.test(f) && !linked({ root }, f));
  const coreMarkdown = copyFiles.filter(f => /\.md$/iu.test(f) && !/^(?:setup\/template|archive|reports|words|inventory|choices)\//u.test(f));
  const readCopy = f => { try { return fs.readFileSync(path.join(copyDir, f), "utf8"); } catch { return null; } };
  const p = { root, own, copy, copyDir, copyFiles, copySet, copyFolders, outside, markdown, coreMarkdown, readCopy, bare: fetched, earlier: [], moved: new Map(), safety: safetyOf(own) };
  if (fetched && line.pin) history(p, line.pin, since);
  return p;
}
const listCopy = dir => fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter(e => e.isFile() && !/(?:^|[\\/])(?:\.packages|node_modules)(?:[\\/]|$)/u.test(e.parentPath ?? e.path)).map(e => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)).split(path.sep).join("/"));

// The earlier copies (the old pin and each release before the pin) and the files the core moved unchanged since them: a
// path the old pin held moves only as it moved from there; any other only where every earlier copy moved it alike, else
// to null (moved, but where cannot be told).
function history(p, pin, since) {
  let earlier = [];
  try { earlier = [...new Set([since, ...releasesIn(p.bare).map(r => r.sha)])].filter(s => s && s !== pin && /^[0-9a-f]{40}$/u.test(s)); } catch { return; }
  const atSince = new Set();
  for (const sha of earlier) {
    let out;
    try { out = inBare(p.bare, ["diff", "--name-status", "-z", "--find-renames=100%", sha, pin], { maxBuffer: 1 << 28 }); } catch { continue; }
    p.earlier.push(sha);
    if (sha === since) listTree(p.bare, sha).forEach(e => atSince.add(e.file));
    const parts = out.split("\0");
    for (let i = 0; i < parts.length; i++) {
      const [from, to] = [parts[i + 1], parts[i + 2]];
      if (/^R100$/u.test(parts[i]) && p.copySet.has(to) && (sha === since || !atSince.has(from))) p.moved.set(from, p.moved.has(from) && p.moved.get(from) !== to ? null : to);
      if (/^[RC]\d*$/u.test(parts[i])) i += 2; else if (/^[ADMT]$/u.test(parts[i])) i += 1;
    }
  }
}

// Every finding, each { line, fix } where `fix` is the exact correction, or null where it is for the auditor.
export function findings(p) {
  const out = [];
  const files = filesFound(p);
  for (const f of files) {
    const of = f.at === "the copy" ? `core's ${f.core}` : `core's ${f.core} at ${f.at}, an earlier copy`;
    out.push({ line: `${f.file} is the ${of}, byte for byte${f.goes ? ": no file names it, so it goes" : `; ${f.why}, so it stays for the auditor`}`, fix: f.goes ? { kind: "file", ...f } : null });
  }
  for (const c of callsFound(p)) out.push({ line: `${c.file}: the job ${c.job} calls the core's ${c.name}, as ${c.other} does${c.exact ? ", the same in every input: it goes, and its checks with it (where a ruleset asks one by name, the pull request waits on it until the ruleset drops it)" : ""}`, fix: c.exact ? { kind: "call", ...c } : null });
  for (const q of pointersFound(p)) out.push({ line: `${q.file}:${q.line} names ${q.path}, which the copy does not hold${q.to ? `: the core moved it unchanged to ${q.to}, where it moves` : ""}`, fix: q.to ? { kind: "pointer", ...q } : null });
  for (const t of textFound(p, new Set(files.map(f => f.file)))) out.push({ line: t, fix: null });
  return out;
}

// The exact corrections made: each file that goes; each call that goes; each pointer moved, in the form it was found.
export function fix(p, found) {
  const done = [], edits = new Map();
  const text = f => edits.has(f) ? edits.get(f) : p.own.read(f, true);
  const gone = new Set(found.filter(f => f.fix?.kind === "file").map(f => f.fix.file));
  for (const f of gone) { fs.rmSync(path.join(p.root, f)); done.push(`${f} taken out`); }
  for (const { fix: x } of found.filter(f => f.fix?.kind === "call")) {
    const out = withoutJob(text(x.file), x.job);
    if (out === null) continue;
    edits.set(x.file, out);
    done.push(`${x.file}: the job ${x.job} taken out`);
  }
  for (const { fix: x } of found.filter(f => f.fix?.kind === "pointer" && !gone.has(f.fix.file))) {
    const now = text(x.file), moved = now.replace(copyPaths(p), (s, at) => `${p.copy}${at}` === x.path ? x.to : s);
    if (moved !== now) { edits.set(x.file, moved); done.push(`${x.file}: ${x.path} moved to ${x.to}`); }
  }
  for (const [f, t] of edits) fs.writeFileSync(path.join(p.root, f), t);
  return [...new Set(done)];
}

// What the command prints; past MOST lines for the auditor, the count of the rest, unless `all`.
export const MOST = 40;
export function report(found, copy, fixed = null, all = false, since = null) {
  const head = `What the project holds twice, or against the core (${copy}tasks/cleaning.md, "The reading asks what a project holds twice"):`;
  if (!found.length) return `${head} nothing the scripts read.`;
  const exact = found.filter(f => f.fix), close = found.filter(f => !f.fix);
  const lines = [head];
  if (fixed) lines.push(fixed.length ? `Corrected, for a pull request of its own that the usual reviews read:\n  ${fixed.join("\n  ")}` : "Nothing was corrected.");
  else if (exact.length) lines.push(`Exact, which \`node ${copy}scripts/twice.mjs --fix${since ? ` --since ${since}` : ""}\` corrects${since ? " (the core fetched again, for its earlier copies)" : ""}, in a pull request of its own that the usual reviews read, the project's tests run before it is ready:\n  ${exact.map(f => f.line).join("\n  ")}`);
  const shown = all ? close : close.slice(0, MOST), more = close.length - shown.length;
  if (close.length) lines.push(`For the auditor, by meaning (the same, stricter or narrower, different, contradicting, or unsure), none corrected:\n  ${shown.map(f => f.line).join("\n  ")}${more ? `\n  and ${more} more: \`node ${copy}scripts/twice.mjs --all\` lists every one` : ""}`);
  return lines.join("\n");
}

// With --since and no --fetched, the core is fetched into a temporary folder, removed however the run ends; where it
// cannot be, what the earlier copies would find is not read, and the run says so.
if (started(import.meta.url)) {
  const arg = n => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
  const since = arg("--since"), tmp = since && !arg("--fetched") ? fs.mkdtempSync(path.join(os.tmpdir(), "core-twice-")) : null;
  try {
    let fetched = arg("--fetched") && path.resolve(arg("--fetched"));
    if (tmp) { try { fetchCore(tmp); fetched = tmp; } catch (e) { console.log(`The core could not be fetched (${String(e.stderr || e.message).trim().split("\n")[0]}): what an earlier copy would show is not read.`); } }
    const p = projectOf(process.cwd(), { fetched, since });
    if (!p) console.log("No copy of the core stands here (the core's own repository, or no manifest's \"Core:\" line names a copy that stands): nothing is read.");
    else {
      const found = findings(p);
      console.log(report(found, p.copy, process.argv.includes("--fix") ? fix(p, found) : null, process.argv.includes("--all"), p.earlier.length ? since : null));
    }
  } finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
}
