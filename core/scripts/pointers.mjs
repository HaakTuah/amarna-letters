// The pointer check ("One fact, one place" in roles/shared/how-to-work.md), for every project that takes the core: every
// pointer in the project's rule files (rule-files.mjs, beside this file) to a file, a section or a numbered point must
// lead to one that exists, or it fails, saying which. A pointer is read from the forms below; a form it cannot read is
// listed, never guessed. It reads Markdown with the package marked, which the core installs from its lock file
// (markdown.mjs, install.mjs), and Node's own modules besides. It checks the project it lies in (core/scripts/ there),
// whatever the directory it is started from; the copies workflow (.github/workflows/copies.yml) runs it on every PR.
//
//   `path`                     a tracked file or folder (a bare name, such as `net.js`, if exactly one file has it)
//   [text](path)               a tracked file or folder, relative to the file it is in (a web address is not checked), and
//                              the heading after "#": read by lychee, a maintained tool, where the job fetched it, and its
//                              other forms of a link too (links.mjs; #582), else by the core's own reading of this form
//   @path.md                   a line that is an import and nothing else: a tracked file, relative to the file it is in
//   `path`, "Section"          a heading, or a bold lead-in, in that file ("Section" in `path` and `path` ("Section") too);
//                              through a file of the core's that only points (at a path its rules left), in what it names
//   `path`, rule 3             a numbered point in that file (point, points 4 and 9, rules 1 to 4)
//   "Section", point 6         a numbered point in that section (point 6 of "Section" too)
//   ("Section"), point 6       with no file: the file the pointer is in; a lone point: its own section's list
//   floor rule 3               a rule of the floor, by its bold number in any of the floor's files (floor rules 3 and 10
//                              too); in the floor's own files, a lone rule is the floor's
//   core archive 134           an item of the core's archive, by its key in its item files (134 and 138, 118 to 120; an
//                              item keyed by its issue, #744 or #733.1, since #744)
// A run of these joined only by a comma, "and", "in", "of" or an opening bracket is one pointer: one file, its sections
// and its points; a floor rule and an archive item stand alone. One of those two that leads nowhere fails the core's
// own run, and is listed in a project's, so that a sync never fails a project's check over a citation of its own
// (AGENTS.md of the core, "Nothing locks a project").
// The files an agent tool takes its instructions from are rule files too, read since #405 (rule-files.mjs, `toolFiles`).
// Nothing locks a project: with POINTERS_BASE set to the pull request's base (as the copies workflow sets it), a broken
// pointer in one of those files that the base held, in the same file and the same words, is noted and fails nothing,
// and one it did not hold fails; with no base, as on a push to main, each is noted. So is a link lychee finds broken in
// any rule file, read again from the base's tree (links.mjs), and in the core's own run each fails. The sync's step lists the old ones
// until they are gone (core/setup/sync-notes.md, 16 November 2026).
//
//   node core/scripts/pointers.mjs
//
// In the core's own repository, `node scripts/pointers.mjs --core` checks its floor, its roles' files, its modules and
// the files that point from the paths they left the same way (its tests workflow runs it): there a path under `core/` is the core's own, read without that folder, and what only a
// project has (`.claude/`, the cloud proxy's `ccr/` routes, its manifest `core-manifest.md`) is not looked for. Its agent tools' files are read too.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { corePath, projectAt } from "./core-path.mjs";
import { logged } from "./guards.mjs";
import { checkRules } from "./links.mjs";
import { markdownReader } from "./markdown.mjs";
import { didNotRun, installed } from "./packages.mjs";
import { readAt, ruleFiles, toolFiles } from "./rule-files.mjs";

// (a listing of the project's tracked paths grows with it, so git's output is read into a buffer of 256 MB, the bound the
// core's other checks of a project's listing keep, and not Node's default 1 MB, which a project of about 20,000 files
// passes: #1204)
const git = args => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
process.chdir(fileURLToPath(new URL(".", import.meta.url)));
process.chdir(projectAt(process.cwd()).root || git(["rev-parse", "--show-toplevel"]).trim()); // (a carried core's project too: core-path.mjs)
// (in a project, the package is installed first where it is not (packages.mjs; #1093, point 1); where it cannot be, the
// check did not run, said as a warning that fails nothing (AGENTS.md of the core, "Nothing locks a project"; #654, point
// 4); in the core's own run a package not installed fails, saying the mend: packages.mjs)
if (!process.argv.includes("--core") && !installed("marked")) {
  console.log(didNotRun("The pointer check did not run", "marked"));
  process.exit(0);
}
const readMarkdown = await markdownReader();
// (`--tools-at <commit>`, which this script gives itself alone: it reads that commit's tree, as git holds it, and prints
// the broken pointers in its agent tools' files, each by its file and its words, as one JSON list; #405)
const AT = process.argv.includes("--tools-at") ? process.argv[process.argv.indexOf("--tools-at") + 1] : null;
if (AT !== null && !/^[0-9a-f]{40}$/u.test(AT ?? "")) { console.error("FAIL: --tools-at takes a commit's full SHA, which this script gives itself. Mend: run it without --tools-at"); process.exit(1); }
// (at a commit, a link inside its tree followed as the work tree follows it: rule-files.mjs, `readAt`)
const atCommit = AT ? readAt(AT) : null;
const text = f => (AT ? atCommit(f) ?? "" : fs.readFileSync(f, 'utf8'));
// (a submodule's files too, at their paths from here: a library that carries the core brings its copy so; core-path.mjs)
let tracked;
try { tracked = (AT ? git(['ls-tree', '-r', '-z', '--name-only', AT]) : git(['ls-files', '-z', '--recurse-submodules'])).split('\0').filter(Boolean); }
catch (e) { console.error(`FAIL: ${logged(`git could not list the tracked paths${AT ? ` at ${AT}` : ""} (${e.code ?? e.message.split("\n")[0]})`)}. Mend: run \`git ls-files\` here and mend what it reports (an unreadable index, a submodule not set up, more paths than the 256 MB the check reads), then run this again`); process.exit(1); }
const CORE = process.argv.includes("--core");
const show = AT ? f => (tracked.includes(f) ? atCommit(f) : null) : undefined, under = AT ? dir => tracked.filter(f => f.startsWith(`${dir}/`)) : undefined;
let RULES, TOOLS;
try {
  // (an agent tool's files that no other way names a rule file, tracked, as git lists them)
  // (at a commit, the agent tools' files alone, where a broken pointer is all it gives; one with no list of rule files
  // there read as naming none)
  const listed = () => { try { return ruleFiles(show, under); } catch (e) { if (AT) return []; throw e; } };
  const old = CORE ? tracked.filter(f => /^(floor|floor\/topics|modules|roles|roles\/shared|tasks|tools)\/[^/]+\.md$/.test(f)) : listed();
  TOOLS = new Set(toolFiles(show, under).filter(f => tracked.includes(f) && !old.includes(f)));
  RULES = AT ? [...TOOLS] : [...old, ...TOOLS];
} catch (e) { console.error(`FAIL: ${logged(e.message)}`); process.exit(1); }
for (const rf of RULES.filter(f => !tracked.includes(f))) { console.error(`FAIL: ${logged(`the rule file ${rf} is no tracked file`)}. Mend: add it to git, or take out the pointer that names it as a rule file`); process.exitCode = 1; }
if (process.exitCode) process.exit(1);
const files = new Set(tracked), dirs = new Set(tracked.flatMap(f => f.split('/').slice(0, -1).map((_, i, p) => p.slice(0, i + 1).join('/') + '/')));
const plain = s => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
// the floor's files and the archive's item files, the core's own here or a project's copy of them, at the path its
// manifest names (core-path.mjs)
const HOME = CORE ? "" : corePath(".") || "core/";
const FLOOR = tracked.filter(f => f.startsWith(`${HOME}floor/`) && f.endsWith(".md"));
const ITEMS = tracked.filter(f => new RegExp(`^${HOME}archive/instructions/(?:items-\\d+|issue-\\d+(?:\\.\\d+)?)\\.md$`).test(f));

// A file's anchors: its headings and bold lead-ins, as Markdown reads them (markdown.mjs), each with the lines it spans
// (to the next heading of its level or above), its blocks, and its lines, where its numbered points are read (a list
// item, or a paragraph led by its bold number, as the core's floor writes its rules).
const parsed = new Map();
function parse(file) {
  if (parsed.has(file)) return parsed.get(file);
  const lines = text(file).split(/\r\n?|\n/u); // (lines end as the lexer ends them, a Windows checkout's too)
  let md;
  // (a file nested deeper than the lexer can follow, thousands of quotes or lists, fails, saying so, never in silence)
  try { md = readMarkdown(text(file)); } catch (e) { console.error(`FAIL: ${logged(`${file} could not be read as Markdown (${e.message})`)}. Mend: nest its quotes and lists less deep`); process.exit(1); }
  const heads = md.heads.map(h => ({ level: h.level, i: h.i }));
  const anchors = [...md.heads.map(h => ({ title: plain(h.text), level: h.level, from: h.i })), ...md.bolds.map(b => ({ title: plain(b.text.replace(/[.:,]$/u, "")), level: 9, from: b.i }))]
    .sort((a, b) => a.from - b.from || a.level - b.level);
  for (const a of anchors) a.to = (heads.find(h => h.i > a.from && h.level <= a.level) || { i: lines.length }).i;
  const p = { lines, anchors, heads, blocks: md.blocks };
  parsed.set(file, p);
  return p;
}
// "Reviews" leads to "Reviews: only a 10 passes", "Status" to "Status (3 November 2026): ...".
const sectionIn = (file, title) => parse(file).anchors.find(a => a.title === title || /^[:,( ]/.test(a.title.slice(title.length)) && a.title.startsWith(title));
// A file that only points: each file of the core's at a path its rules left (under modules/, and floor/topics.md) says
// in a line which file or folder "holds these rules now", as a link whose text is the path from the core's root, and in
// a line "Now in [`<path>`](..): **<lead>**." which rule stands elsewhere than the rest. A pointer through it leads to
// what stands there: for a rule it names so, the file that rule went to; for any other rule, the file named or, for a
// folder, the folder's own files; and with no rule named, each of them. No other file is followed, whatever it says, and a file that names nothing is read as itself.
function standsIn(file, title) {
  if (!file.startsWith(`${HOME}modules/`) && file !== `${HOME}floor/topics.md`) return [file];
  const text = parse(file).lines.join("\n");
  const elsewhere = [...text.matchAll(/^Now in \[`([^`\s]+)`\]\([^)\s]+\): \*\*([^*]+?)\*\*\.$/gmu)], apart = elsewhere.filter(m => plain(m[2]) === title).map(m => m[1]);
  const held = [/^\[`([^`\s]+)`\]\([^)\s]+\) holds these rules now\b/mu.exec(text)?.[1]].filter(Boolean);
  // (with no rule named, as for a numbered point cited by the file alone: every file this one names)
  const to = apart.length ? apart : title === undefined ? [...held, ...elsewhere.map(m => m[1])] : held;
  const there = to.flatMap(t => (t.endsWith("/") ? tracked.filter(f => f.startsWith(HOME + t) && f.endsWith(".md") && !f.slice((HOME + t).length).includes("/")) : tracked.filter(f => f === HOME + t)));
  return there.length ? there : [file];
}
const section = (file, title) => { for (const at of standsIn(file, title)) { const a = sectionIn(at, title); if (a) return { ...a, file: at }; } return undefined; };
// (a floor rule is found by its bold number at a line's start, "**3.", in any of the floor's files; a list item is none)
const hasRule = n => FLOOR.some(f => parse(f).lines.some(l => l.startsWith(`**${n}. `)));
const hasPoint = (file, from, to, n) => parse(file).lines.slice(from, to).some(l => new RegExp(`^\\s*(\\*\\*)?${n}\\.\\s`).test(l));

// The atoms of a block (a paragraph or a list item, its lines joined): files, quoted titles and numbered points.
// (a range written backwards is kept as written, so it leads nowhere and is named)
// (an archive item keyed by its issue, "#744" or "#733.1", and a range with one in it, are kept as written, as is a range
// wider than WIDEST, so each leads nowhere and is named, never read as nothing or built whole)
const WIDEST = 1000;
const numbers = text => text.split(/, | and | or /).flatMap(s => s.includes('#') ? [s] : s.includes(' to ') ? (([a, b]) => b < a || b - a >= WIDEST ? [s] : Array.from({ length: b - a + 1 }, (_, k) => a + k))(s.split(' to ').map(Number)) : [Number(s)]);
function atoms(text) {
  const out = [];
  const re = /\b[Ff]loor (rules?) (\d+(?:(?:, | and | to | or )\d+)*)\b|\b[Cc]ore archive ((?:#\d+(?:\.\d+)?|\d+)(?:(?:, | and | to | or )(?:#\d+(?:\.\d+)?|\d+))*)\b|`([^`\s]+)`|"([A-Z][^"]{1,60})"|“([A-Z][^”]{1,60})”|\b(rules?|points?) (\d+(?:(?:, | and | to | or )\d+)*)\b/g;
  for (const m0 of text.matchAll(re)) {
    const at = { start: m0.index, end: m0.index + m0[0].length };
    if (m0[2] !== undefined) { out.push({ ...at, floor: numbers(m0[2]), word: `floor ${m0[1]}` }); continue; }
    if (m0[3] !== undefined) { out.push({ ...at, archive: numbers(m0[3]) }); continue; }
    const m = [m0[0], m0[4], m0[5], m0[6], m0[7], m0[8]];
    if (m[1] !== undefined) {
      // a package's name, such as `@types/node`, is no path
      if (!/^[\w.@-]*[\w-]\/|^[\w./-]+\.(md|js|json|sh|css|html|yml|txt)$|\/$/.test(m[1]) || /[<>*]/.test(m[1]) || m[1].startsWith('@')) continue;
      out.push({ ...at, file: m[1] });
    } else if (m[2] || m[3]) out.push({ ...at, title: plain(m[2] || m[3]) });
    else {
      out.push({ ...at, points: numbers(m[5]), word: m[4] });
    }
  }
  return out;
}
const GLUE = /^(\s*,\s*|,?\s+and\s+|,?\s+in\s+|\s+of\s+|\s*\(\s*|\s*,\s*in\s+)$/;

const broken = [], unread = [], notFound = [], quotes = [];
// the Markdown files the rule files name, where a quote with no file named is looked for
const named = new Set(RULES.flatMap(rf => [...text(rf).matchAll(/`([\w./-]+\.md)`/g)]
  .map(m => files.has(m[1]) ? m[1] : tracked.filter(t => t.endsWith('/' + m[1]))).flat()).concat(RULES));
let count = 0;
// (Markdown's own links: lychee's, run offline on the rule files it can read, where the job's set-up fetched it
// (lychee.sh), never at a commit; where it was not fetched, or could not run, the core's own reading below stands in, and
// the check says so; #582)
const LYCHEE = AT ? "" : process.env.LYCHEE || "", byTool = new Set();
let tool = null;
if (LYCHEE) {
  let base = CORE ? "" : null;
  // (the pull request's base, whose tree links.mjs reads only where lychee finds a broken link)
  if (!CORE && process.env.POINTERS_BASE) { try { base = git(["rev-parse", "--verify", "--quiet", "--end-of-options", `${process.env.POINTERS_BASE}^{commit}`]).trim(); } catch { console.error(`FAIL: ${logged(`POINTERS_BASE ${process.env.POINTERS_BASE} is not a commit here`)}. Mend: fetch it (git fetch origin <the base branch>) before the check runs`); process.exit(1); } }
  tool = checkRules({ program: LYCHEE, rules: RULES, tracked: files, folders: dirs, text, base });
  if (tool.unread) console.log(`::warning::${logged(`The pointer check could not run lychee on the rule files (${tool.unread}), so their links were read by the core's own reading alone. Mend: run this job again; if it fails again, file it as a fault`)}`);
  else { for (const f of tool.read) byTool.add(f); count += tool.count; }
} else if (!AT) console.log("::warning::The pointer check did not run lychee: it was not fetched here, which only the job's set-up step does (core/scripts/lychee.sh), so the rule files' links were read by the core's own reading alone, which reads no heading after \"#\". Mend: none in a session; the pull request's checks run it");
for (const rf of RULES) {
  const { lines } = parse(rf);
  // (a line that is an import and nothing else, "@<a path to a Markdown file>", leads to that file from the folder it
  // is in, as a tool that follows such a line reads it; in a project one that leads nowhere is listed, never failed)
  lines.forEach((l, i) => {
    const to = l.length < 400 ? /^@([\w./-]+\.md)\s*$/u.exec(l)?.[1] : undefined;
    if (!to) return;
    count++;
    if (!files.has(posix.normalize(posix.join(posix.dirname(rf), to)))) (CORE ? broken : unread).push(`${rf}:${i + 1}: the import line @${to} leads to no tracked file`);
  });
  // blocks: list items, paragraphs, headings and table rows, outside code and HTML (markdown.mjs)
  for (const b of parse(rf).blocks) {
    const own = parse(rf).heads.filter(h => h.i <= b.i).pop();
    // a link's destination, when it is in this repository, must be a tracked file or folder too
    for (const m of byTool.has(rf) ? [] : b.text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^([a-z]+:|#)/i.test(m[1])) continue;
      count++;
      const p = posix.normalize(posix.join(posix.dirname(rf), m[1].split('#')[0])).replace(/\/$/, '');
      if (!files.has(p) && !dirs.has(p + '/')) broken.push(`${rf}:${b.i + 1}: the link to ${m[1]} leads to no tracked file or folder`);
    }
    const all = atoms(b.text);
    // a floor rule and an archive item stand alone: each is looked for in its own files
    for (const a of all.filter(x => x.floor || x.archive)) {
      const where = `${rf}:${b.i + 1}`;
      if (a.floor) {
        const missing = a.floor.filter(n => !hasRule(n));
        count += a.floor.length - missing.length;
        if (!FLOOR.length) unread.push(`${where}: ${a.word} ${a.floor.join(', ')} (no floor here to read it in)`);
        else if (missing.length) (CORE ? broken : notFound).push(`${where}: ${a.word} ${missing.join(', ')}: no such rule in the floor`);
      } else {
        const missing = a.archive.filter(n => !ITEMS.some(f => parse(f).lines.some(l => l.startsWith(`${n}. `))));
        count += a.archive.length - missing.length;
        if (!ITEMS.length) unread.push(`${where}: core archive ${a.archive.join(', ')} (no archive here to read it in)`);
        else if (missing.length) (CORE ? broken : notFound).push(`${where}: core archive ${missing.join(', ')}: no such item in the archive`);
      }
    }
    const list = all.filter(x => !x.floor && !x.archive);
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
        if (CORE) {
          if (/^(\.claude(\/|$)|ccr$|core-manifest\.md$)/.test(p)) continue;
          p = p.replace(/^core(\/|$)/, '');
          if (!p) continue;
          // (no project's copy holds the core's reports: .gitattributes)
          if (/^reports(\/|$)/.test(p)) { broken.push(`${where}: \`${f.file}\` is in no project's copy of the core. Mend: point to what a project's copy holds, or say it without the path`); continue; }
        }
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
        let from, to, what, at = [file];
        if (t) { const s = section(file, t.title); if (!s) continue; ({ from, to } = s); at = [s.file]; what = `"${t.title}" in ${file}`; }
        else if (f) { from = 0; to = Infinity; at = standsIn(file); what = file; }
        else if (FLOOR.includes(rf) && /^rules?$/.test(n.word)) {
          const missing = n.points.filter(x => !hasRule(x));
          count += n.points.length;
          if (missing.length) broken.push(`${where}: ${n.word} ${missing.join(', ')}: no such rule in the floor`);
          continue;
        }
        else if (own) { from = own.i; to = (parse(rf).heads.find(h => h.i > own.i && h.level <= own.level) || { i: Infinity }).i; what = `its own section of ${rf}`; }
        else { unread.push(`${where}: ${n.word} ${n.points.join(', ')} (no file or section named)`); continue; }
        const missing = n.points.filter(x => !at.some(a => hasPoint(a, from, to, x)));
        count += n.points.length - (t || f ? 0 : missing.length);
        if (missing.length) (t || f ? broken : unread).push(`${where}: ${n.word} ${missing.join(', ')}: no such numbered point in ${what}`);
      }
    }
  }
}
// A broken pointer in an agent tool's file, as { file, words }: the file it stands in and what is wrong, its line aside,
// so that one the base held is known though lines moved; null for any other.
const inTool = x => { for (const f of TOOLS) { const m = x.startsWith(`${f}:`) && /^:\d+: ([\s\S]*)$/u.exec(x.slice(f.length)); if (m) return { file: f, words: m[1] }; } return null; };
const key = t => `${t.file}\t${t.words}`;
if (AT) { console.log(JSON.stringify([...new Set(broken)].map(inTool).filter(Boolean).map(key))); process.exit(0); }
// (in a project, one the pull request's base held is noted, and every one where there is no base to read against)
const old = [];
if (!CORE && broken.some(inTool)) {
  const from = process.env.POINTERS_BASE ?? "";
  let held = null;
  if (from) {
    let sha;
    try { sha = git(["rev-parse", "--verify", "--quiet", "--end-of-options", `${from}^{commit}`]).trim(); } catch { console.error(`FAIL: ${logged(`POINTERS_BASE ${from} is not a commit here`)}. Mend: fetch it (git fetch origin <the base branch>) before the check runs`); process.exit(1); }
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--tools-at", sha], { encoding: "utf8", maxBuffer: 1 << 28 });
    try { held = new Set(JSON.parse(r.stdout)); } catch { console.error(`FAIL: the pointers in the agent tools' files at ${logged(from)} could not be read. Mend: run node ${HOME}scripts/pointers.mjs where git can read every file of that commit`); process.exit(1); }
  }
  for (let k = broken.length - 1; k >= 0; k--) { const t = inTool(broken[k]); if (t && (!held || held.has(key(t)))) old.push(...broken.splice(k, 1)); }
}
// (lychee's findings, as links.mjs decided them against the base: #582)
for (const n of tool?.notes ?? []) console.log(`note ${logged(n)}`);
broken.push(...(tool?.fails ?? []));
for (const u of new Set(unread)) console.log(`note ${logged(u)}`);
// (in a project, a floor rule or an archive item that is not there is listed apart, read but found nowhere)
for (const u of new Set(notFound)) console.log(`note ${logged(u)} (read, and not found: listed, not failed, in a project)`);
for (const x of new Set(old.reverse())) console.log(`note ${logged(`a broken pointer in an agent tool's file: ${x}`)} (${process.env.POINTERS_BASE ? "the pull request's base held it" : "with no base to read against"}, so it fails nothing: point it at what holds what it means, or take it out)`);
if (quotes.length) console.log(logged(`note ${new Set(quotes).size} quotes are no section of any file the rule files name, so read as quotes: ${[...new Set(quotes)].map(q => `"${q}"`).join(', ')}`));
for (const x of new Set(broken)) console.error(`FAIL: ${logged(`a broken pointer: ${x}`)}${x.includes(". Mend: ") ? "" : ". Mend: point it at the file, heading or numbered point that holds what it means, or take it out where that is gone"}`);
if (broken.length) process.exit(1);
console.log(`ok   ${count} pointers in the rule files lead somewhere (${unread.length} in forms it cannot read${notFound.length ? `, ${notFound.length} read and not found` : ""}${old.length ? `, ${new Set(old).size} old in an agent tool's file` : ""}, listed above)`);
