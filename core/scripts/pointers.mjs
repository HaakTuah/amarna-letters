// The pointer check ("One fact, one place" in modules/how-to-work.md), for every project that takes the core: every
// pointer in the project's rule files (rule-files.mjs, beside this file) to a file, a section or a numbered point must
// lead to one that exists, or it fails, saying which. A pointer is read from the forms below; a form it cannot read is
// listed, never guessed. Node's own modules only. It checks the project it lies in (core/scripts/ there), whatever the
// directory it is started from; the copies workflow (.github/workflows/copies.yml) runs it on every PR.
//
//   `path`                     a tracked file or folder (a bare name, such as `net.js`, if exactly one file has it)
//   [text](path)               a tracked file or folder, relative to the file it is in (a web address is not checked)
//   `path`, "Section"          a heading, or a bold lead-in, in that file ("Section" in `path` and `path` ("Section") too)
//   `path`, rule 3             a numbered point in that file (point, points 4 and 9, rules 1 to 4)
//   "Section", point 6         a numbered point in that section (point 6 of "Section" too)
//   ("Section"), point 6       with no file: the file the pointer is in; a lone point: its own section's list
// A run of these joined only by a comma, "and", "in", "of" or an opening bracket is one pointer: one file, its sections
// and its points.
//
//   node core/scripts/pointers.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { ruleFiles } from "./rule-files.mjs";

const git = args => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
process.chdir(fileURLToPath(new URL(".", import.meta.url)));
process.chdir(git(["rev-parse", "--show-toplevel"]).trim());
const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
const RULES = ruleFiles();
for (const rf of RULES.filter(f => !tracked.includes(f))) { console.error(`FAIL: the rule file ${rf} is no tracked file`); process.exitCode = 1; }
if (process.exitCode) process.exit(1);
const files = new Set(tracked), dirs = new Set(tracked.flatMap(f => f.split('/').slice(0, -1).map((_, i, p) => p.slice(0, i + 1).join('/') + '/')));
const plain = s => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

// A file's anchors: its headings and bold lead-ins, each with the lines it spans (to the next heading of its level or
// above), and its numbered points by line (a list item, or a paragraph led by its bold number, as the core's floor
// writes its rules).
const parsed = new Map();
function parse(file) {
  if (parsed.has(file)) return parsed.get(file);
  const lines = fs.readFileSync(file, 'utf8').split('\n'), anchors = [], heads = [];
  lines.forEach((l, i) => {
    const h = /^(#+)\s+(.*)$/.exec(l);
    if (h) { heads.push({ level: h[1].length, i }); anchors.push({ title: plain(h[2]), level: h[1].length, from: i }); }
    for (const b of l.matchAll(/\*\*([^*]+?)[.:,]?\*\*/g)) anchors.push({ title: plain(b[1]), level: 9, from: i });
  });
  for (const a of anchors) a.to = (heads.find(h => h.i > a.from && h.level <= a.level) || { i: lines.length }).i;
  const p = { lines, anchors, heads };
  parsed.set(file, p);
  return p;
}
// "Reviews" leads to "Reviews: only a 10 passes", "Status" to "Status (3 November 2026): ...".
const section = (file, title) => parse(file).anchors.find(a => a.title === title || /^[:,( ]/.test(a.title.slice(title.length)) && a.title.startsWith(title));
const hasPoint = (file, from, to, n) => parse(file).lines.slice(from, to).some(l => new RegExp(`^\\s*(\\*\\*)?${n}\\.\\s`).test(l));

// The atoms of a block (a paragraph or a list item, its lines joined): files, quoted titles and numbered points.
function atoms(text) {
  const out = [];
  const re = /`([^`\s]+)`|"([A-Z][^"]{1,60})"|“([A-Z][^”]{1,60})”|\b(rules?|points?) (\d+(?:(?:, | and | to | or )\d+)*)\b/g;
  for (const m of text.matchAll(re)) {
    const at = { start: m.index, end: m.index + m[0].length };
    if (m[1] !== undefined) {
      // a package's name, such as `@types/node`, is no path
      if (!/^[\w.@-]*[\w-]\/|^[\w./-]+\.(md|js|json|sh|css|html|yml|txt)$|\/$/.test(m[1]) || /[<>*]/.test(m[1]) || m[1].startsWith('@')) continue;
      out.push({ ...at, file: m[1] });
    } else if (m[2] || m[3]) out.push({ ...at, title: plain(m[2] || m[3]) });
    else {
      const ns = m[5].split(/, | and | or /).flatMap(s => s.includes(' to ') ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => a + k))(s.split(' to ').map(Number)) : [Number(s)]);
      out.push({ ...at, points: ns, word: m[4] });
    }
  }
  return out;
}
const GLUE = /^(\s*,\s*|,?\s+and\s+|,?\s+in\s+|\s+of\s+|\s*\(\s*|\s*,\s*in\s+)$/;

const broken = [], unread = [], quotes = [];
// the Markdown files the rule files name, where a quote with no file named is looked for
const named = new Set(RULES.flatMap(rf => [...fs.readFileSync(rf, 'utf8').matchAll(/`([\w./-]+\.md)`/g)]
  .map(m => files.has(m[1]) ? m[1] : tracked.filter(t => t.endsWith('/' + m[1]))).flat()).concat(RULES));
let count = 0;
for (const rf of RULES) {
  const { lines } = parse(rf);
  // blocks: list items and paragraphs, outside code fences
  const blocks = [];
  let fence = false, cur = null;
  lines.forEach((l, i) => {
    if (/^\s*```/.test(l)) { fence = !fence; cur = null; return; }
    if (fence || !l.trim() || /^#/.test(l) || /^\|/.test(l)) { cur = null; if (/^[#|]/.test(l)) blocks.push({ i, text: l }); return; }
    if (!cur || /^\s*([-*]|\d+\.)\s/.test(l)) { cur = { i, text: '' }; blocks.push(cur); }
    cur.text += ' ' + l.trim();
  });
  for (const b of blocks) {
    const own = parse(rf).heads.filter(h => h.i <= b.i).pop();
    // a link's destination, when it is in this repository, must be a tracked file or folder too
    for (const m of b.text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^([a-z]+:|#)/i.test(m[1])) continue;
      count++;
      const p = posix.normalize(posix.join(posix.dirname(rf), m[1].split('#')[0])).replace(/\/$/, '');
      if (!files.has(p) && !dirs.has(p + '/')) broken.push(`${rf}:${b.i + 1}: the link to ${m[1]} leads to no tracked file or folder`);
    }
    const list = atoms(b.text);
    // join atoms into pointers
    const groups = [];
    list.forEach((a, k) => {
      const prev = list[k - 1], next = list[k + 1];
      // "A" in `x` and "B" in `y`: a title followed by its own file starts a pointer of its own once the one before
      // has a file ("A", point 4, and "B" in `x` names both in `x`)
      const ownFile = a.title && next && next.file && /^,?\s+in\s+$/.test(b.text.slice(a.end, next.start))
        && groups.length && groups[groups.length - 1].some(x => x.file);
      if (prev && !ownFile && GLUE.test(b.text.slice(prev.end, a.start)) && !(a.file && groups[groups.length - 1].some(x => x.file))) groups[groups.length - 1].push(a);
      else groups.push([a]);
    });
    for (const g of groups) {
      const where = `${rf}:${b.i + 1}`, f = g.find(a => a.file);
      const titles = g.filter(a => a.title), nums = g.filter(a => a.points);
      let file = rf;
      if (f) {
        count++;
        let p = f.file.replace(/\/$/, '');
        if (!files.has(p) && !dirs.has(p + '/')) {
          const same = !p.includes('/') ? tracked.filter(t => t.endsWith('/' + p)) : [];
          if (same.length === 1) p = same[0];
          else if (same.length > 1) { unread.push(`${where}: \`${f.file}\` (${same.length} files have that name)`); continue; }
          else { broken.push(`${where}: \`${f.file}\` is no tracked file or folder`); continue; }
        }
        if (!titles.length && !nums.length) continue;
        if (!files.has(p) || !p.endsWith('.md')) { unread.push(`${where}: \`${f.file}\` with a section or point, but it is no Markdown file`); continue; }
        file = p;
      }
      // each point belongs to the title next to it (before it, or after it by "of"), else to the file
      for (const t of titles) {
        if (section(file, t.title)) { count++; continue; }
        if (f) { count++; broken.push(`${where}: "${t.title}" is no heading or bold lead-in in ${file}`); continue; }
        // no file named, and not a section here: a pointer whose file is not named if another file has it, else a quote
        const there = [...named].filter(m => section(m, t.title));
        if (there.length) unread.push(`${where}: "${t.title}" names no file (${there.join(', ')} has it)`);
        else quotes.push(t.title);
      }
      for (const n of nums) {
        const k = g.indexOf(n), before = g[k - 1], after = g[k + 1];
        const t = before && before.title ? before : after && after.title && /^\s+of\s+$/.test(b.text.slice(n.end, after.start)) ? after : null;
        let from, to, what;
        if (t) { const s = section(file, t.title); if (!s) continue; ({ from, to } = s); what = `"${t.title}" in ${file}`; }
        else if (f) { from = 0; to = Infinity; what = file; }
        else if (own) { from = own.i; to = (parse(rf).heads.find(h => h.i > own.i && h.level <= own.level) || { i: Infinity }).i; what = `its own section of ${rf}`; }
        else { unread.push(`${where}: ${n.word} ${n.points.join(', ')} (no file or section named)`); continue; }
        const missing = n.points.filter(x => !hasPoint(file, from, to, x));
        count += n.points.length - (t || f ? 0 : missing.length);
        if (missing.length) (t || f ? broken : unread).push(`${where}: ${n.word} ${missing.join(', ')}: no such numbered point in ${what}`);
      }
    }
  }
}
for (const u of new Set(unread)) console.log(`note ${u}`);
if (quotes.length) console.log(`note ${new Set(quotes).size} quotes are no section of any file the rule files name, so read as quotes: ${[...new Set(quotes)].map(q => `"${q}"`).join(', ')}`);
for (const x of new Set(broken)) console.error(`FAIL: a broken pointer: ${x}`);
if (broken.length) process.exit(1);
console.log(`ok   ${count} pointers in the rule files lead somewhere (${unread.length} in forms it cannot read, listed above)`);
