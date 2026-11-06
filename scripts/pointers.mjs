// The pointer check (archive item 217): every pointer in the rule files to a file, a section or a numbered point must
// lead to one that exists, or the check fails, saying which. The forms it reads: a path in backticks or a Markdown link
// (`docs/developing.md`, a folder ending in /, a :line after it); a section by its quoted title, "Title" in `file`, in
// the builder rules, in this file, above or below, as a heading or a bold lead; a numbered point of a file or a section
// ("point 4" of `SECURITY.md`, "Reviews", point 2); and archive items (the numbered entries of
// docs/archive/instructions/). A form it cannot read, such as a path with a <placeholder> in it or a bare file name, is
// listed, never guessed. Node's own modules only, so the check needs no install (.github/workflows/pointers.yml;
// scripts/test.sh runs it too).
//
//   node scripts/pointers.mjs             the check
//   node scripts/pointers.mjs --unread    also list each pointer it could not read
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));

// The rule files (SECURITY.md, point 3) and the developer guide that holds their update and GitHub rules.
const RULES = ["AGENTS.md", "CLAUDE.md", "SECURITY.md", "docs/builder-rules.md", "docs/claude-and-codex.md",
  "docs/orchestrating.md", "docs/review-guidelines.md", "docs/threat-model.md", "docs/developing.md"];
const ALIASES = { "the builder rules": "docs/builder-rules.md", "the progress file": "docs/BUILD-PROGRESS.md" };
const ARCHIVE = "docs/archive/instructions";
const ROOTS = /^(\.claude|\.github|docs|scripts|src|sim|tests|core)\//u;
const ROOT_FILE = /^[\w.-]+\.(md|json|yml|yaml|sh|mjs|ts)$/u;

const read = (f) => fs.readFileSync(f, "utf8");
const norm = (s) => s.toLowerCase().replace(/[`*_]/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** A file's sections: its headings and bold leads, each with the text up to the next section of the same kind. */
const sectionsOf = new Map();
function sections(file) {
  if (sectionsOf.has(file)) return sectionsOf.get(file);
  const lines = read(file).split("\n");
  const found = [];
  lines.forEach((line, i) => {
    const h = /^(#{1,6})\s+(.*)$/u.exec(line);
    if (h) found.push({ title: norm(h[2]), line: i, level: h[1].length });
    // A bold lead: plain, then a bullet's, then a numbered point's, each nested in the one before at the same indent.
    const b = /^(\s*)([-*]|\d+\.)?\s*\*\*([^*]+)\*\*/u.exec(line);
    if (b) found.push({ title: norm(b[3]), line: i, level: 7 + 3 * b[1].length + (b[2] ? (/\d/u.test(b[2]) ? 2 : 1) : 0) });
  });
  for (const [k, s] of found.entries()) {
    const next = found.slice(k + 1).find((t) => t.level <= s.level);
    s.body = lines.slice(s.line, next ? next.line : lines.length);
  }
  sectionsOf.set(file, found);
  return found;
}
/** The section an exact title names, else the one section it begins; undefined if none, null if several (not read). */
function findSection(file, title) {
  const t = norm(title), all = sections(file);
  const exact = all.filter((s) => s.title === t);
  const begun = exact.length ? exact : all.filter((s) => s.title.startsWith(t));
  if (!begun.length) return undefined;
  return new Set(begun.map((s) => s.title)).size === 1 ? begun[0] : null;
}
const hasPoint = (lines, n) => lines.some((l) => new RegExp(`^\\s*${n}\\.\\s`, "u").test(l));
const archiveItems = new Set(fs.readdirSync(ARCHIVE).flatMap((f) =>
  [...read(path.join(ARCHIVE, f)).matchAll(/^(\d+)\.\s/gmu)].map((m) => Number(m[1]))));

/** The file a path pointer names, or null when it is not a path this check reads. */
function asPath(token) {
  const t = token.replace(/:\d+(-\d+)?$/u, "").split(/[\s#]/u)[0];
  if (/[<>*{}]|\.\.\./u.test(t)) return { unread: true };
  if (ROOTS.test(t) || ROOT_FILE.test(t)) return t.includes("/") || fs.existsSync(t) ? { file: t } : { unread: true };
  return null;
}

/** The file a section pointer names, from the words after the quoted title. */
function target(rest, here) {
  const m = /^\s*(?:,\s*points?\s+\d+,?\s*)?(?:in|of)\s+(?:`([^`]+)`|(the builder rules|the progress file|this file))/u.exec(rest);
  if (m) return m[1] ?? (m[2] === "this file" ? here : ALIASES[m[2]]);
  if (/^\s*(?:,\s*points?\s+\d+,?\s*)?(below|above)\b/u.test(rest)) return here;
  return null;
}

const broken = [];
const unread = [];
let checked = 0;
for (const file of RULES) {
  read(file).split("\n").forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    const fail = (what) => broken.push(`${where}: ${what}`);
    for (const m of line.matchAll(/`([^`\n]+)`|\]\(([^)\s]+)\)/gu)) {
      const p = asPath(m[1] ?? m[2]);
      if (!p) continue;
      if (p.unread) { unread.push(`${where}: ${m[0]}`); continue; }
      checked++;
      if (!fs.existsSync(p.file)) fail(`${m[0]} names no file or folder`);
    }
    for (const m of line.matchAll(/"([^"\n]{2,80})"(?=([^"\n]*))/gu)) {
      const into = target(m[2], file);
      if (!into || !fs.existsSync(into) || !fs.statSync(into).isFile()) {
        // a section pointer in a form not read here ("in the same doc", "in the PR") is listed, never guessed
        if (/^\s*(?:,\s*points?\s+\d+,?\s*)?(?:in|of)\s+\S/u.test(m[2])) unread.push(`${where}: "${m[1]}"${m[2].slice(0, 30)}`);
        continue;
      }
      checked++;
      const s = findSection(into, m[1]);
      if (s === null) { unread.push(`${where}: "${m[1]}" begins more than one section of ${into}`); continue; }
      if (!s) { fail(`"${m[1]}" is no section of ${into}`); continue; }
      const n = /^\s*,\s*points?\s+(\d+)/u.exec(m[2]);
      if (n) { checked++; if (!hasPoint(s.body, n[1])) fail(`"${m[1]}" in ${into} has no point ${n[1]}`); }
    }
    for (const m of line.matchAll(/`([\w./-]+\.md)`,?\s+(?:point|rule)s?\s+(\d+)/gu)) {
      if (!fs.existsSync(m[1])) continue;
      checked++;
      if (!hasPoint(read(m[1]).split("\n"), m[2])) fail(`${m[1]} has no point ${m[2]}`);
    }
    for (const m of line.matchAll(/archive items? ((?:\d+(?:,\s*|\s+and\s+|\s*-\s*)?)+)/gu)) {
      for (const n of m[1].match(/\d+/gu)) {
        checked++;
        if (!archiveItems.has(Number(n))) fail(`archive item ${n} is not in ${ARCHIVE}/`);
      }
    }
  });
}

console.log(`${checked} pointers checked in ${RULES.length} rule files, ${broken.length} broken, ${unread.length} not read`);
if (process.argv.includes("--unread")) for (const u of unread) console.log(`  not read: ${u}`);
for (const b of broken) console.log(`  BROKEN ${b}`);
process.exit(broken.length ? 1 : 0);
