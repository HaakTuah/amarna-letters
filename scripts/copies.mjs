// The copies check ("One fact, one place" in AGENTS.md): fails when the same run of code (8 lines that are more than
// brackets, 240 characters at least) or of the rule files' prose (12 words) stands in two places, unless the baseline
// (scripts/copies-baseline.json) lists it as one of the old copies, which are removed over time and never added to. An
// entry listed but no longer copied fails too, so the baseline only shrinks. Node's own modules only, so the check
// needs no install (.github/workflows/copies.yml; scripts/test.sh runs it too).
//
//   node scripts/copies.mjs            the check
//   node scripts/copies.mjs --write    rewrite the baseline from what stands (to drop removed copies)
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const BASELINE = "scripts/copies-baseline.json";
const CODE = () => ls(["src/**/*.ts", "src/**/*.tsx", "src/**/*.mjs", "scripts/*.mjs"]);
const PROSE = ["AGENTS.md", "CLAUDE.md", "SECURITY.md", "docs/builder-rules.md", "docs/claude-and-codex.md",
  "docs/orchestrating.md", "docs/review-guidelines.md", "docs/threat-model.md", "docs/developing.md", "docs/calibration.md"];
const LINES = 8, MIN_CHARS = 240, WORDS = 12;
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

// Code: each line trimmed, its spaces collapsed; blank lines and lines of brackets, punctuation or a bare comment mark skipped.
function codeUnits(text) {
  const out = [];
  text.split('\n').forEach((raw, i) => {
    const t = raw.trim().replace(/\s+/g, ' ');
    if (!t || /^[\s{}()[\];,.:]*$/.test(t) || /^(\/\/|\*|\/\*|\*\/)\s*$/.test(t)) return;
    out.push({ t, line: i + 1 });
  });
  return out;
}
// Prose: the words, in lower case, without punctuation.
function proseUnits(text) {
  const out = [];
  text.split('\n').forEach((raw, i) => {
    for (const w of raw.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ')) if (w) out.push({ t: w, line: i + 1 });
  });
  return out;
}
// Every run of `size` units found in two places that do not overlap; overlapping finds of one copy merge into one,
// keyed by a hash of its first run, so its key stays the same while the copy stands.
function find(files, units, size, joiner, minChars) {
  const perFile = new Map(), seen = new Map();
  const at = (u, i) => u.slice(i, i + size).map(x => x.t).join(joiner);
  for (const f of files) {
    const u = units(fs.readFileSync(f, 'utf8'));
    perFile.set(f, u);
    for (let i = 0; i + size <= u.length; i++) {
      const s = at(u, i);
      if (s.length < minChars) continue;
      const h = hash(s);
      if (!seen.has(h)) seen.set(h, []);
      seen.get(h).push({ file: f, at: i });
    }
  }
  const dup = new Map();
  for (const [h, list] of seen) {
    const apart = list.filter((p, k) => list.some((q, m) => m !== k && (q.file !== p.file || Math.abs(q.at - p.at) >= size)));
    if (apart.length >= 2) dup.set(h, apart);
  }
  const copies = [], used = new Set();
  for (const [f, u] of perFile) {
    for (let i = 0; i + size <= u.length; i++) {
      if (used.has(f + ':' + i)) continue;
      const s = at(u, i);
      if (s.length < minChars) continue;
      const h = hash(s), places = dup.get(h);
      if (!places || places[0].file !== f || places[0].at !== i) continue;
      let len = size;
      for (;;) {
        const next = places.map(p => at(perFile.get(p.file), p.at + len - size + 1));
        if (next.some(n => n !== next[0]) || !dup.has(hash(next[0]))) break;
        len++;
      }
      for (const p of places) for (let k = 0; k <= len - size; k++) used.add(p.file + ':' + (p.at + k));
      copies.push({
        key: h,
        places: places.map(p => { const pu = perFile.get(p.file); return `${p.file}:${pu[p.at].line}-${pu[Math.min(p.at + len - 1, pu.length - 1)].line}`; }),
        starts: at(u, i).replace(/\n/g, ' / ').slice(0, 80),
      });
    }
  }
  return copies;
}

const ls = globs => execFileSync('git', ['ls-files', ...globs], { encoding: 'utf8' }).split('\n').filter(Boolean);
const found = [...find(CODE(), codeUnits, LINES, '\n', MIN_CHARS), ...find(PROSE.filter(f => fs.existsSync(f)), proseUnits, WORDS, ' ', 0)];
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
if (process.argv.includes('--write')) {
  base.copies = Object.fromEntries(found.map(c => [c.key, c.places.join(' ')]));
  fs.writeFileSync(BASELINE, JSON.stringify(base, null, 2) + '\n');
  console.log(`wrote ${found.length} copies to ${BASELINE}`);
} else {
  const fresh = found.filter(c => !(c.key in base.copies));
  const gone = Object.keys(base.copies).filter(k => !found.some(c => c.key === k));
  for (const c of fresh) console.error(`FAIL: a new copy: ${c.places.join(' and ')} (it starts "${c.starts}"); point to one place instead`);
  for (const k of gone) console.error(`FAIL: ${BASELINE} lists ${k} (${base.copies[k]}), which is no longer copied: remove the entry`);
  if (fresh.length || gone.length) process.exit(1);
  console.log(`ok   no new copies (${found.length} old ones in ${BASELINE}, to be removed)`);
}
