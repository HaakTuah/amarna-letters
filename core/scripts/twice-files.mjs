// The files and the pointers of what a project holds twice (twice.mjs, beside this file, which reads the rest, gives
// the project `p` it reads and makes the corrections; tasks/cleaning.md, "The reading asks what a project holds
// twice"; #1087): the files outside the copy equal byte for byte to one of the core's, and which of them may go, and the
// pointers in the project's own text. It reads and writes nothing itself but what git's object ids ask, and git's hash of
// each file it compares. Node's own
// modules and git.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { whole } from "./core-owned.mjs";
import { READ_MOST } from "./own-files.mjs";
import { inBare } from "./releases.mjs";
import { ownText } from "./twice-text.mjs";

export const SKIP = /^(?:reports|archive|words)\//u;
const NOT_COMPARED = /(?:^|\/)(?:LICEN[CS]E|NOTICE|COPYING)[^/]*$|(?:^|\/)\.git(?:ignore|attributes|keep)$/iu;
const SMALLEST = 100; // (a file of fewer bytes, an empty one above all, matches by chance)

// A blob's id as git names it, so that a file is matched to one of an earlier copy's by its id alone.
export const blobId = buf => crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");

// The blob's id of each of `files` (paths of the project's) as git would store it from the project, its line-end filters
// applied (`git hash-object`), so that a file is equal to the core's whatever line ends git writes to the disk: where it
// writes CRLF (core.autocrlf, as on Windows), the copy unpacked from the core's archive holds CRLF, and the earlier
// copies, read from git's objects, LF (#1221). The project's own filters run, as at its own `git add`, bounded in time.
// A name a line cannot carry as it stands (a line's end, or a leading quote, which git reads as a quoted name), or a
// project git cannot hash, is read from the disk as it stands, and the latter said.
function storedIds(p, files) {
  const lined = files.filter(f => !/[\n\r]/u.test(f) && !f.startsWith('"'));
  let ids = [];
  try { ids = lined.length ? execFileSync("git", ["hash-object", "--stdin-paths"], { cwd: p.root, input: `${lined.join("\n")}\n`, encoding: "utf8", maxBuffer: 1 << 28, timeout: 60000, stdio: ["pipe", "pipe", "ignore"] }).trim().split("\n") : []; } catch { ids = []; }
  if (ids.length !== lined.length) console.error(`The twice reading hashed ${lined.length} files from the disk's bytes: git hash-object failed in the project, so a file that differs from the core's in line ends alone is not found equal.`);
  const byFile = new Map(ids.length === lined.length ? lined.map((f, i) => [f, ids[i]]) : []);
  for (const f of files) if (!byFile.has(f)) { try { byFile.set(f, blobId(fs.readFileSync(path.join(p.root, f)))); } catch { /* (unread: no id) */ } }
  return byFile;
}

// Each file of the copy and of the earlier copies by its blob's id: the paths of the core's that hold it.
function coreBlobs(p) {
  const byId = new Map();
  const add = (id, file, at) => { if (!byId.has(id)) byId.set(id, []); byId.get(id).push({ file, at }); };
  const copy = path.relative(p.root, p.copyDir).split(path.sep).join("/"), files = p.copyFiles.filter(f => !f.startsWith("setup/template/"));
  const ids = storedIds(p, files.map(f => `${copy}/${f}`));
  for (const f of files) if (ids.has(`${copy}/${f}`)) add(ids.get(`${copy}/${f}`), f, "the copy");
  // The earlier copies' ids are git's own, not passed through the project's filters: line ends are the same either way.
  for (const sha of p.earlier) {
    for (const e of listTree(p.bare, sha)) if (!e.file.startsWith("setup/template/")) add(e.id, e.file, sha.slice(0, 7));
  }
  return byId;
}
export const listTree = (bare, sha) => inBare(bare, ["ls-tree", "-r", "-z", sha], { maxBuffer: 1 << 28 }).split("\0").flatMap(l => { const m = /^\d+ blob ([0-9a-f]{40})\t(.+)$/su.exec(l); return m ? [{ id: m[1], file: m[2] }] : []; });

// The files outside the copy equal byte for byte to one of the core's: { file, core, at, goes, why }, `goes` where it
// may go (below), else `why` it stays for the auditor.
export function filesFound(p) {
  const byId = coreBlobs(p), found = [], ids = storedIds(p, p.outside.filter(f => compared(p, f)));
  for (const f of p.outside) {
    const hit = ids.has(f) && equalTo(p, byId, f, ids.get(f));
    if (hit) found.push(hit);
  }
  return unnamed(p, found);
}
const compared = (p, f) => !whole(f) && !NOT_COMPARED.test(f) && !SKIP.test(f) && !linked(p, f) && p.own.read(f, true) !== null;
// A link, at the path's end or on a folder of its way, is never read as the project's own file nor written through:
// what it leads to may be the copy's.
export const linked = (p, f) => { try { return fs.realpathSync(path.join(p.root, f)) !== path.join(fs.realpathSync(p.root), f); } catch { return true; } };
// Only Markdown goes: what else a project holds (code, a manifest, a config) may be run, or found by a tool where it
// stands, in ways no file names; and of Markdown, not a name a tool looks for in its folder, nor one in a dot folder.
const MARKDOWN = /\.md$/iu;
const BY_PLACE = /(?:^|\/)(?:README|index|AGENTS|CLAUDE|GEMINI|REVIEW|SECURITY|CONTRIBUTING|CODE_OF_CONDUCT|CHANGELOG|SUPPORT)\.md$|(?:^|\/)\./iu;
// The file `f`, whose blob's id is `id`, as a finding where it is equal to one of the core's, else null.
function equalTo(p, byId, f, id) {
  let size;
  try { size = fs.statSync(path.join(p.root, f)).size; } catch { return null; }
  const hits = size < SMALLEST ? null : byId.get(id);
  if (!hits) return null;
  const found = { file: f, core: hits[0].file, at: hits[0].at, goes: true };
  if (hits.some(h => FLOOR.test(h.file)) || p.safety.has(f)) Object.assign(found, { goes: false, why: "it is the floor's text or a safety rule, which goes only on its owner's word" });
  else if (!MARKDOWN.test(f)) Object.assign(found, { goes: false, why: "it is no Markdown, which may be run or found where it stands in ways no file names" });
  else if (BY_PLACE.test(f)) Object.assign(found, { goes: false, why: "a tool may look for it where it stands" });
  return found;
}
// The floor's text (security.md, its topics, the threat model) and the files the project's own AGENTS.md calls safety
// rules, in backticks on a line that says so: never taken out by a script (tasks/cleaning.md).
const FLOOR = /^(?:floor\/|SECURITY\.md$)/u;
export const safetyOf = own => new Set((ownText(own, "AGENTS.md") ?? "").split("\n").filter(l => /safety/iu.test(l)).flatMap(l => [...l.matchAll(/`([^`\s]+)`/gu)].map(m => m[1].replace(/^\.\//u, ""))));

// A file goes only where no other file of the repository, the copy and the dated records among them, holds its name in
// any form: its file name without the extension, in any case, after percent-encoding and character references are
// decoded (#1087, point 2). No pointer is moved for it; where one names it, it stays, listed with each file that does.
// A file that cannot be read whole, or a link, is read as naming it.
function unnamed(p, found) {
  const going = found.filter(x => x.goes);
  if (!going.length) return found;
  const texts = p.own.listed.map(f => ({ file: f, forms: formsOf(p, f) }));
  for (const x of going) {
    const name = nameOf(x.file), by = texts.filter(t => t.file !== x.file && (t.forms === null || t.forms.some(s => name.test(s)))).map(t => t.file);
    if (by.length) Object.assign(x, { goes: false, why: `${by.join(", ")} ${by.length > 1 ? "name" : "names"} it` });
  }
  return found;
}
// A character reference not decoded here (a named one but the five of XML) stands for any one character.
const ANY = "\uFFFF";
// The name of the file `f` as a pattern: its file name without the extension, each character matched in any case or by
// a reference not decoded.
const nameOf = f => new RegExp([...path.posix.parse(f).name.toLowerCase()].map(c => `(?:${c.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")}|${ANY})`).join(""), "u");
// The text of the file `f` in each encoding it may hold the name in, decoded and in lower case; null where it cannot be
// read whole. A link's text is where it leads.
function formsOf(p, f) {
  const at = path.join(p.root, f);
  try {
    if (fs.lstatSync(at).isSymbolicLink()) return [decoded(fs.readlinkSync(at))];
    const buf = fs.statSync(at).size > READ_MOST ? null : fs.readFileSync(at);
    if (!buf) return null;
    return [buf.toString("utf8"), buf.toString("latin1"), ...buf.includes(0) ? [buf.toString("utf16le"), buf.subarray(1).toString("utf16le")] : []].map(decoded);
  } catch { return null; }
}
// A text with its percent-encoding and character references decoded, again until nothing changes (an encoding of an
// encoding), in lower case. Each pass decodes every form in one replace, so that no form's output is read by another's
// in the same pass; the next pass reads what the last one made.
const XML = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const ENCODED = /&#(?:[xX]([0-9a-fA-F]+)|(\d+));?|&([A-Za-z][A-Za-z0-9]*);?|(?:%[0-9A-Fa-f]{2})+/gu;
const percent = s => { try { return decodeURIComponent(s); } catch { return s.replace(/%([0-7][0-9A-Fa-f])/gu, (_, h) => String.fromCharCode(parseInt(h, 16))); } };
const one = (s, h, d, name) => {
  if (name) return XML[name.toLowerCase()] ?? ANY;
  if (h === undefined && d === undefined) return percent(s);
  const n = h ? parseInt(h, 16) : Number(d);
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : s;
};
function decoded(text) {
  let t = text, was = null;
  for (let i = 0; i < 8 && t !== was; i++) { was = t; t = t.replace(ENCODED, one); }
  return t.toLowerCase();
}

// The project's own text files that may hold a pointer: outside the copy, the core's whole files and the dated records;
// a workflow is the core's only where it carries the core's mark.
const WORKFLOW = /^\.github\/workflows\//u;
export const coreMarked = (p, f) => whole(f) && (!WORKFLOW.test(f) || /^# The core's file:/u.test(p.own.read(f, true) ?? ""));
export const textFiles = p => p.outside.filter(f => !coreMarked(p, f) && !SKIP.test(f) && !linked(p, f)).flatMap(f => { const t = p.own.read(f, true); return t === null || t.includes("\0") || !lossless(p, f, t) ? [] : [{ file: f, text: t }]; });
// Whether the text read is the file's bytes whole, so that writing it back loses nothing (no other encoding).
const lossless = (p, f, t) => { try { return Buffer.from(t, "utf8").equals(fs.readFileSync(path.join(p.root, f))); } catch { return false; } };
