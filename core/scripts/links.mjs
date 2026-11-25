// The maintained link checker of the pointer check (pointers.mjs, beside this file; #582): lychee, run offline, reads
// Markdown's own links in the rule files (a link, a reference, an image, an HTML link; none in code) as GitHub resolves
// them, from the file's folder or, for one that starts with "/", from the project's root, and the heading each names
// after "#". It is fetched at set-up as its own program (lychee.sh beside this file), never here. The tool finds, and the
// core decides and words the failure: which file a link leads to is lychee's reading (its list, --dump), and whether
// that file is one git tracks in the project is the core's, since lychee reads the disk, where a file git does not track,
// or one outside the project, stands too; whether the heading is there is lychee's. A file that is no UTF-8 lychee reads
// nothing of, so it is left to the core's own reading (pointers.mjs). Node's own modules only.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inProject } from "./guards.mjs";
import { readAt } from "./rule-files.mjs";

export const TIMEOUT = 120000; // (ms lychee may take on the rule files: the core's take well under one second)

// Whether lychee reads a file: one that is UTF-8 (it reads nothing of any other, and says so nowhere).
export const readable = buffer => { try { new TextDecoder("utf-8", { fatal: true }).decode(buffer); return true; } catch { return false; } };
// A file lychee reads as Markdown, by its name: any other it reads as HTML or plain text, where a link [text](path) is
// none; and a name that holds no control character or a mark lychee could read as a pattern (* ? [ ] { }), so that each
// input is one file (#582's review). Every other rule file is left to the core's own reading.
export const MARKDOWN = /\.(md|markdown|mdx|mkd|mkdn|mdown|mdwn|mkdown)$/iu;
export const lycheeReads = f => MARKDOWN.test(f) && !/[\u0000-\u001f\u007f*?[\]{}]/u.test(f);
// The part after "#", as a heading's anchor is written, or as it stands where it is no escape a browser decodes.
const decoded = hash => { try { return decodeURIComponent(hash); } catch { return hash; } };

// A link lychee wrote (a file:// address), as the path from `root` it leads to, with "/" between its parts, or null where
// it leads out of `root`; any other address (the web, mail) is undefined, and not the core's to read offline.
export function target(url, root) {
  if (!/^file:/iu.test(url)) return undefined;
  let p;
  try { p = fileURLToPath(new URL(url.replace(/[?#].*$/su, ""))); } catch { return null; }
  const rel = path.relative(root, p);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

// Where a link out of `root` leads, from `root` (as "../x.md"), or as lychee wrote it where it names no path.
const away = (url, root) => { try { return path.relative(root, fileURLToPath(new URL(url.replace(/[?#].*$/su, "")))).split(path.sep).join("/"); } catch { return url; } };

// A link's line in its file: the first that holds the last part of where it leads, else the first.
const lineIn = (text, to) => { const name = to.split("/").pop(); return (text ?? "").split(/\r\n?|\n/u).findIndex(l => name && l.includes(name)) + 1 || 1; };

// The core's findings from lychee's list of a file's links (its --dump output), as { found, count }: a link that leads to
// no file or folder of `tracked` (each folder in `folders` as "a/b/"), or out of `root`; `count` the links to a file.
export function listed(file, dump, { root, tracked, folders, text }) {
  const found = [];
  let count = 0;
  for (const url of String(dump ?? "").split(/\r?\n/u).map(l => l.trim()).filter(Boolean)) {
    const to = target(url, root);
    if (to === undefined) continue;
    count++;
    const where = to ?? away(url, root);
    if (to === null) found.push({ file, line: lineIn(text(file), where), kind: "outside", to: where, said: "leads out of the project" });
    else if (to !== "" && !tracked.has(to) && !folders.has(`${to}/`)) found.push({ file, line: lineIn(text(file), to), kind: "file", to, said: "leads to no tracked file or folder" });
  }
  return { found, count };
}

// lychee's findings in its JSON report (--include-fragments) on files of `root`: each heading a link names that is not
// there; a file not found is read by listed(), against what git tracks. Null where the report is no JSON lychee writes.
const HEADING = "names a heading that is not there, as GitHub makes a heading's anchor (its words in small letters, each blank a \"-\", other marks left out, a second alike \"-1\")";
export function reported(checked, { root, text }) {
  let report;
  try { report = JSON.parse(checked); } catch { return null; }
  if (!report || typeof report !== "object") return null;
  return Object.entries(report.error_map ?? {}).flatMap(([input, errors]) => {
    const from = /^file:/iu.test(input) ? target(input, root) : path.relative(root, input).split(path.sep).join("/");
    if (!from || from.startsWith("..") || !Array.isArray(errors)) return [];
    return errors.filter(e => /fragment/iu.test(String(e?.status?.text ?? e?.status ?? ""))).map(e => heading(e, from, root, text));
  });
}
// One error of lychee's on a heading, as a finding of the file `from`.
function heading(e, from, root, text) {
  const url = String(e?.url ?? ""), to = target(url, root), hash = /#(.*)$/su.exec(url)?.[1] ?? "";
  return { file: from, line: Number(e?.span?.line) || lineIn(text(from), hash), kind: "heading", to: `${to ?? url}#${decoded(hash)}`, path: to ?? "", said: HEADING };
}

// lychee on the rule files `files` of `root`, as { found, count } or, where it could not run or read them, { unread: why }.
// Run from an empty folder of its own, so that no lychee.toml or .lycheeignore of the project's is read.
export function run({ program, root, files, ...at }) {
  const away = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), "links-"));
  try {
    const go = args => spawnSync(program, ["--offline", "--no-progress", "--root-dir", root, ...args], { cwd: away, encoding: "utf8", maxBuffer: 1 << 28, timeout: TIMEOUT, windowsHide: true });
    const why = r => (r.error?.code === "ETIMEDOUT" ? `it ran past ${TIMEOUT / 1000} s` : r.error ? r.error.code : r.signal ? `it stopped on ${r.signal}` : `it ended with status ${r.status}: ${(r.stderr || "").trim().split("\n").pop()?.slice(0, 200) ?? ""}`);
    const found = [];
    let count = 0;
    for (const f of files) {
      const r = go(["--dump", "--", path.join(root, f)]);
      if (r.status !== 0) return { unread: why(r) };
      const got = listed(f, r.stdout, { root, ...at });
      found.push(...got.found); count += got.count;
    }
    const r = go(["--include-fragments", "--format", "json", "--", ...files.map(f => path.join(root, f))]);
    if (r.status !== 0 && r.status !== 2) return { unread: why(r) };
    const headings = reported(r.stdout, { root, ...at });
    return headings ? { found: [...found, ...headings], count } : { unread: "its report was no JSON it writes" };
  } finally { fs.rmSync(away, { recursive: true, force: true }); }
}

// The base's files (`sha`) that run() reads in a folder of this run's own, written from git's own blobs, so that no
// attribute of the base's (export-ignore, export-subst) changes them: each Markdown or HTML file, in which a link's
// heading may be looked for, and each path of `paths` (the rule files, and where the head's findings lead) still
// missing, through a link to a file or a folder inside the project as readAt() reads it, one leading out of it not
// written; a path that could lead out of the folder (a part empty, "." or "..", a backslash) is never written. Returns { dir, tracked, folders }, or null where git could not give them or one could not
// be written.
const PAGE = /\.html?$/iu, safe = f => inProject(f) && !f.includes("\\") && f.split("/").every(p => p && p !== "." && p !== "..");
export function baseTree(sha, under, paths) {
  const git = (args, input) => spawnSync("git", args, { input, maxBuffer: 1 << 30 });
  const ls = git(["ls-tree", "-r", "-z", sha]);
  if (ls.status !== 0) return null;
  const entries = String(ls.stdout).split("\0").map(e => /^(\d+) \S+ (\S+)\t([\s\S]+)$/u.exec(e)).filter(Boolean);
  const tracked = new Set(entries.map(m => m[3])), wanted = m => safe(m[3]) && (MARKDOWN.test(m[3]) || PAGE.test(m[3]));
  const plain = entries.filter(m => /^100/u.test(m[1]) && wanted(m)), linked = entries.filter(m => m[1] === "120000" && wanted(m));
  const blobs = git(["cat-file", "--batch"], plain.map(m => m[2]).join("\n") + "\n");
  if (blobs.status !== 0) return null;
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(under, "links-base-"))), put = (f, data) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), data); };
  try {
    let at = 0;
    for (const m of plain) {
      const head = /^\S+ blob (\d+)\n/u.exec(blobs.stdout.subarray(at, at + 200).toString("latin1"));
      if (!head) throw new Error("git's answer was not the blobs asked for");
      const from = at + head[0].length, size = Number(head[1]);
      put(m[3], blobs.stdout.subarray(from, from + size));
      at = from + size + 1;
    }
    const read = readAt(sha);
    for (const f of [...linked.map(m => m[3]), ...paths.filter(safe)]) { if (fs.existsSync(path.join(dir, f))) continue; const t = read(f); if (t !== null) put(f, t); }
  } catch { fs.rmSync(dir, { recursive: true, force: true }); return null; }
  return { dir, tracked, folders: new Set([...tracked].flatMap(f => f.split("/").slice(0, -1).map((_, i, p) => `${p.slice(0, i + 1).join("/")}/`))) };
}

// lychee on the rule files `rules` of the project in the working folder, as pointers.mjs runs it: { unread } where it
// could not run, else { read, count, fails, notes }, `read` the files it read (the rest, no Markdown or no UTF-8, are
// left to the core's own reading). In the core's run (`base` ""), each finding fails; in a project's, those the base (a
// commit's SHA) held are noted, read the same way from its files in a folder of this run's own; with no base (null),
// or one whose links could not be read, each is noted.
export function checkRules({ program, rules, tracked, folders, text, base }) {
  const read = rules.filter(f => lycheeReads(f) && readable(fs.readFileSync(f)));
  const head = run({ program, root: fs.realpathSync("."), files: read, tracked, folders, text });
  if (head.unread || !head.found.length || !base) return { read, ...head, ...(head.unread ? {} : compared(head.found, base === "" ? [] : null)) };
  let was = null;
  try {
    was = baseTree(base, process.env.RUNNER_TEMP || os.tmpdir(), [...read, ...head.found.filter(f => f.kind !== "outside").map(f => f.path ?? f.to)]);
    const file = f => fs.lstatSync(path.join(was.dir, f), { throwIfNoEntry: false });
    const there = was ? read.filter(f => file(f)?.isFile() && readable(fs.readFileSync(path.join(was.dir, f)))) : [];
    const r = was && run({ program, root: was.dir, files: there, tracked: was.tracked, folders: was.folders, text: f => fs.readFileSync(path.join(was.dir, f), "utf8") });
    if (r && !r.unread) return { read, count: head.count, ...compared(head.found, r.found) };
    // (a base whose links could not be read decides nothing: each finding is noted, so that nothing locks a project)
    const notes = compared(head.found, null).notes.map(n => n.replace("with no base to read against", "the base unread"));
    return { read, count: head.count, fails: [], notes: [`the rule files' links at the pull request's base could not be read${r?.unread ? ` by lychee (${r.unread})` : ""}, so each broken link below is only noted. Mend: run this job again; if it says so again, file it as a fault`, ...notes] };
  } finally { if (was) fs.rmSync(was.dir, { recursive: true, force: true }); }
}

// A finding's words, the file, the line and the link, then the mend.
export const words = f => `${f.file}:${f.line}: the link to ${f.to} ${f.said}${f.kind === "heading" ? ". Mend: point it at a heading that is there (its anchor as GitHub makes it), or take the \"#\" part out" : f.kind === "outside" ? ". Mend: point it at a file of the project's, or write the address on the web it means" : ". Mend: point it at the file or folder that holds what it means, or take it out where that is gone"}`;

// The head's findings against the base's, as { fails, notes }: of each kind (the file, what it leads to and why, its
// line aside, so that a link moved is no new finding; for a link out of the project, the file alone, since the base's
// tree stands in another folder), as many as the base held are noted and the rest fail; with no base (`base` null),
// each is noted.
export function compared(head, base) {
  const key = f => `${f.file}\0${f.kind}\0${f.kind === "outside" ? "" : f.to}`, held = new Map();
  for (const f of base ?? []) held.set(key(f), (held.get(key(f)) ?? 0) + 1);
  const fails = [], notes = [];
  for (const f of head) {
    const n = held.get(key(f)) ?? 0;
    if (base && n <= 0) fails.push(words(f));
    else { notes.push(`${words(f).replace(/\. Mend: /u, base ? ", as on the base, so it fails nothing. Mend: " : ", with no base to read against, so it fails nothing. Mend: ")}`); held.set(key(f), n - 1); }
  }
  return { fails, notes };
}
