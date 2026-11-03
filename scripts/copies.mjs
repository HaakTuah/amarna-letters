// The copies check ("One fact, one place" in AGENTS.md): fails when the same run of code (8 lines that are more than
// brackets, 240 characters at least) or of the rule files' prose (12 words) stands in two places, unless the baseline
// (scripts/copies-baseline.json) lists every window of it (a run of lines or words) in as many places, as one of the
// old copies, which are removed over time and never added to. A listed window gone or in fewer places fails too, so the
// baseline only shrinks. A copy may move (cut from one place, pasted in another), since its places do not grow: moving
// is how a fact reaches its better home. Node's own modules only, so the check needs no install
// (.github/workflows/copies.yml; scripts/test.sh runs it too).
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
        windows,
        places: places.map(p => { const pu = perFile.get(p.file); return `${p.file}:${pu[p.at].line}-${pu[Math.min(p.at + len - 1, pu.length - 1)].line}`; }),
        starts: at(u, i).replace(/\n/g, ' / ').slice(0, 80),
      });
    }
  }
  return { copies, dup };
}

const ls = globs => execFileSync('git', ['ls-files', '-z', ...globs], { encoding: "utf8" }).split('\0').filter(Boolean);
const runs = [find(CODE(), codeUnits, LINES, '\n', MIN_CHARS), find(ls(PROSE), proseUnits, WORDS, ' ', 0)];
const found = runs.flatMap(r => r.copies);
const places = new Map(runs.flatMap(r => [...r.dup].map(([h, list]) => [h, list.length])));
const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
// The baseline holds the old copies window by window: each run of lines or words that is copied, by its hash, and how
// many places it stands in. Every copied window must be listed with at least as many places, so a copy that is new,
// spreads to another place, grows, or is copied in part fails. A listed window that is gone or in fewer places fails
// too, until --write lowers it; --write only ever lowers, never lists a window that is not listed already.
// The baseline only shrinks against the branch a PR merges into (COPIES_BASE, set by the workflow): a window it adds or a
// count it raises there fails, whoever wrote it.
const from = process.env.COPIES_BASE;
if (from) {
  let old = null;
  try { old = JSON.parse(execFileSync("git", ["show", `${from}:${BASELINE}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })).windows; } catch { /* no baseline there yet */ }
  const raised = old ? Object.entries(base.windows).filter(([h, n]) => !(h in old) || n > old[h]) : [];
  if (raised.length) { console.error(`FAIL: ${BASELINE} adds or raises ${raised.length} windows against ${from}: the baseline only shrinks`); process.exit(1); }
}
const over = h => !(h in base.windows) || places.get(h) > base.windows[h];
const fresh = found.filter(c => c.windows.some(over));
const shrunk = Object.keys(base.windows).filter(h => !places.has(h) || places.get(h) < base.windows[h]);
for (const c of fresh) console.error(`FAIL: a new copy: ${c.places.join(' and ')} (it starts "${c.starts}"); point to one place instead`);
if (process.argv.includes('--write')) {
  base.windows = Object.fromEntries(Object.entries(base.windows).filter(([h]) => places.has(h)).map(([h, n]) => [h, Math.min(n, places.get(h))]));
  fs.writeFileSync(BASELINE, JSON.stringify(base, null, 2) + '\n');
  console.log(`${BASELINE}: ${Object.keys(base.windows).length} windows kept, ${shrunk.length} lowered or dropped`);
  if (fresh.length) process.exit(1);
} else {
  if (shrunk.length) console.error(`FAIL: ${BASELINE} lists ${shrunk.length} windows that are gone or in fewer places now: run --write to lower it`);
  if (fresh.length || shrunk.length) process.exit(1);
  console.log(`ok   no new copies (${found.length} old ones, listed in ${BASELINE}, to be removed)`);
}
