// The copies check ("One fact, one place" in AGENTS.md): fails when the same run of code (8 lines that are more than
// brackets, 240 characters at least) or of the rule files' prose (12 words) stands in two places, unless the baseline
// (scripts/copies-baseline.json) lists it, window by window, as one of the old copies, which are removed over time and
// never added to or grown. An entry listed but gone or smaller fails too, so the baseline only shrinks. Node's own modules only, so the check
// needs no install (.github/workflows/copies.yml; scripts/test.sh runs it too).
//
//   node scripts/copies.mjs            the check
//   node scripts/copies.mjs --write    lower the baseline to what still stands (it never adds a copy)
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
    const u = units(fs.readFileSync(f, "utf8"));
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
      // a copy grows while its next window stands in exactly the same places, one further on; where the places change
      // (a part copied once more, or once less), a new copy starts, so no part of a block hides another copy of it
      for (;;) {
        const step = len - size + 1;
        const next = places.map(p => at(perFile.get(p.file), p.at + step));
        const there = next[0] && dup.get(hash(next[0]));
        if (next.some(t => t !== next[0]) || !there || there.length !== places.length
          || !places.every(p => there.some(q => q.file === p.file && q.at === p.at + step))) break;
        len++;
      }
      for (const p of places) for (let k = 0; k <= len - size; k++) used.add(p.file + ':' + (p.at + k));
      const windows = [];
      for (let k = 0; k <= len - size; k++) windows.push(hash(at(u, i + k)));
      copies.push({
        key: h,
        windows,
        places: places.map(p => { const pu = perFile.get(p.file); return `${p.file}:${pu[p.at].line}-${pu[Math.min(p.at + len - 1, pu.length - 1)].line}`; }),
        starts: at(u, i).replace(/\n/g, ' / ').slice(0, 80),
      });
    }
  }
  return copies;
}

const ls = globs => execFileSync('git', ['ls-files', ...globs], { encoding: "utf8" }).split('\n').filter(Boolean);
const found = [...find(CODE(), codeUnits, LINES, '\n', MIN_CHARS), ...find(PROSE.filter(f => fs.existsSync(f)), proseUnits, WORDS, ' ', 0)];
const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
// The baseline lists each old copy by the hashes of its windows and the number of places it stands in. A copy passes
// only if a listed copy holds every one of its windows in at least as many places, so a copy that spreads to another
// place or grows by a line fails like a new one. A listed copy that is gone, smaller or in fewer places fails too, until
// --write lowers it; --write only ever lowers, never lists a new copy or a new window.
const entries = Object.entries(base.copies).map(([k, b]) => ({ k, b, has: new Set(b.windows) }));
const match = c => entries.find(e => c.windows.every(w => e.has.has(w)) && c.places.length <= e.b.count);
const fresh = [], kept = new Map();
for (const c of found) { const e = match(c); if (!e) fresh.push(c); else kept.set(e.k, c); }
const shrunk = entries.filter(e => !kept.has(e.k) || kept.get(e.k).windows.length < e.b.windows.length || kept.get(e.k).places.length < e.b.count);
for (const c of fresh) console.error(`FAIL: a new copy: ${c.places.join(' and ')} (it starts "${c.starts}"); point to one place instead`);
if (process.argv.includes('--write')) {
  base.copies = Object.fromEntries(entries.filter(e => kept.has(e.k)).map(e => {
    const c = kept.get(e.k);
    return [c.key, { count: c.places.length, places: c.places.join(' '), windows: c.windows }];
  }));
  fs.writeFileSync(BASELINE, JSON.stringify(base, null, 2) + '\n');
  console.log(`${BASELINE}: ${Object.keys(base.copies).length} old copies kept, ${shrunk.length} lowered or dropped`);
  if (fresh.length) process.exit(1);
} else {
  for (const e of shrunk) console.error(`FAIL: ${BASELINE} lists ${e.k} (${e.b.places}), which is gone or smaller now: run --write to lower it`);
  if (fresh.length || shrunk.length) process.exit(1);
  console.log(`ok   no new copies (${found.length} old ones in ${BASELINE}, to be removed)`);
}
