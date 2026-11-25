// The text a project holds twice (twice.mjs, beside this file; tasks/cleaning.md, "The reading asks what a project holds
// twice"; #1087): each paragraph or list item of the project's own Markdown that is a copy of one of the core's copy, or
// of another of the project's own, or reads close to one, its runs of three words shared past CLOSE. Listed for the
// auditor, never corrected. Node's own modules alone, and the marks of the core's part (core-owned.mjs).
import { BEGIN, END } from "./core-owned.mjs";

// (first guesses: a paragraph of fewer words than the copies check's window says too little to be a rule; one whose
// runs of three words are shared past CLOSE with another's, of the smaller's, reads close)
export const WORDS = 12, CLOSE = 0.6;

// The words of a text as compared: marks of Markdown and case set aside, its spacing made one.
const wordsOf = t => t.toLowerCase().replace(/[*_`>#|]/gu, " ").replace(/^\s*(?:[-+]|\d+\.)\s+/u, "").split(/\s+/u).filter(Boolean);

// A Markdown text's units: each paragraph, and each list item at its start, with the line it starts on. Code blocks
// and tables are skipped; a unit of fewer than WORDS words is left out.
export function unitsOf(text) {
  const units = [];
  let cur = null, fence = false;
  const close = () => { if (cur && cur.words.length >= WORDS) units.push(cur); cur = null; };
  text.split(/\r?\n/u).forEach((line, i) => {
    if (/^\s*(?:```|~~~)/u.test(line)) { fence = !fence; close(); return; }
    if (fence || /^\s*\|/u.test(line) || /^\s*#/u.test(line) || !line.trim()) { close(); return; }
    if (/^(?:[-*+]|\d+\.)\s/u.test(line)) close();
    cur ??= { line: i + 1, words: [] };
    cur.words.push(...wordsOf(line));
  });
  close();
  return units.map(u => ({ line: u.line, text: u.words.join(" "), runs: runsOf(u.words) }));
}
const runsOf = words => new Set(words.slice(0, -2).map((w, i) => `${w} ${words[i + 1]} ${words[i + 2]}`));

// The share of the smaller unit's runs of three words that the other holds.
export function closeness(a, b) {
  const [small, big] = a.runs.size <= b.runs.size ? [a.runs, b.runs] : [b.runs, a.runs];
  let shared = 0;
  for (const r of small) if (big.has(r)) shared++;
  return small.size ? shared / small.size : 0;
}

// The project's own Markdown, as the text is compared: the core's part of a rule file blanked, its lines kept.
export function ownText(own, f) {
  const t = own.read(f);
  if (t === null) return null;
  const b = t.indexOf(BEGIN), e = t.indexOf(END);
  return b >= 0 && e > b ? t.slice(0, b) + t.slice(b, e + END.length).replace(/[^\n]/gu, "") + t.slice(e + END.length) : t;
}

// Each unit of `mine` (file, unit) matched to the units of `theirs` it is a copy of or reads close to: the best one.
function matches(mine, theirs, same = false) {
  const index = new Map();
  theirs.forEach((u, k) => { for (const r of u.unit.runs) { if (!index.has(r)) index.set(r, []); index.get(r).push(k); } });
  const found = [];
  mine.forEach((u, j) => {
    const counts = new Map();
    for (const r of u.unit.runs) for (const k of index.get(r) ?? []) counts.set(k, (counts.get(k) ?? 0) + 1);
    let best = null;
    for (const [k, n] of counts) {
      if (same && (k <= j)) continue;
      const share = n / Math.min(u.unit.runs.size, theirs[k].unit.runs.size);
      if (share >= CLOSE && (!best || share > best.share)) best = { other: theirs[k], share, copy: theirs[k].unit.text === u.unit.text };
    }
    if (best) found.push({ at: u, ...best });
  });
  return found;
}

const units = (files, read) => files.flatMap(f => { const t = read(f); return t === null ? [] : unitsOf(t).map(unit => ({ file: f, unit })); });
const where = u => `${u.file}:${u.unit.line}`;
const said = m => m.copy ? `is a copy of ${where(m.other)}` : `reads close to ${where(m.other)} (${Math.round(m.share * 100)}% of its runs of words shared)`;

// The text found twice, against the core's copy and within the project's own: each a line for the auditor.
export function textFound(p, skip = new Set()) {
  const mine = units(p.markdown.filter(f => !skip.has(f)), f => ownText(p.own, f));
  const core = units(p.coreMarkdown, f => p.readCopy(f)).map(u => ({ ...u, file: `${p.copy}${u.file}` }));
  const lines = matches(mine, core).map(m => `${where(m.at)} ${said(m)}, the core's text`);
  return lines.concat(matches(mine, mine, true).map(m => `${where(m.at)} ${said(m)}, the project's own`));
}
