// What the steps write themselves (#1091): where a step's work is exact, a check's own config or baseline, a pointer's
// path, or the manifest's module lines placed from what is read (#1094), its `write` does it, as `node
// core/scripts/steps.mjs --write` runs it (steps.mjs, beside this file). Each writer takes the project as steps.mjs's
// `project` reads it and returns the files it wrote; where it cannot run (a package missing, a file it cannot read, a
// check that did not run to its end), it throws `Unwritten` before it writes anything. It never writes a word of a
// project's rule text but a pointer's path and the manifest's module lines, nor a file with changes not yet committed
// (`held`), nor through a link. The writers that run a check's own writer run the project's copy of it, as the steps
// read them. Git and Node's own modules only.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { leadsOut } from "./guards.mjs";
import { OWN as OWN_HOLDERS } from "./holders-own.mjs";
import { READ_MOST } from "./own-files.mjs";
import { parseConfig, where as shapeAt } from "./shape.mjs";
import { copiesConfig, marksConfig } from "./check-configs.mjs";
import { atCopy } from "./core-path.mjs";
import { MOVED_GLOB, MOVED_GLOBS, moved, namers, partCut, readsOldAlone, sure } from "./step-checks-moved.mjs";
import { rewritten } from "./step-checks-modules.mjs";
import { MANIFEST, pinsOnly } from "./sync-pins.mjs";
import { HERE, plain, shown } from "./step-checks.mjs";
import { Unread, copyAt } from "./workflow-calls.mjs";
import { installed } from "./packages.mjs";
import { asLF, asMended, reads as workflowsRead } from "./workflows.mjs";

/** A writer that could not run: it wrote nothing, and its message says why; a check that reads with a writer's pieces
 * throws it as workflow-calls.mjs's `Unread`, which it is. */
export class Unwritten extends Unread {}
/** A writer kept from a file with changes not yet committed (`held`): at a sync, its own (#1259, point 2). */
export class Busy extends Unwritten { constructor(message, file) { super(message); this.file = file; } }

// The files of the project at `root` with changes not yet committed, new ones among them, as git lists them: none is
// written, so that what a writer writes stays apart from a session's own changes and from a sync's (#1091). Left out:
// a file the sync changed in its pins alone, in the index and the tree, the manifest's `Core:` line (#1094) or a call
// to one of the core's workflows (#1248, point 4), which the writers write around and setAside puts back (sync-pins.mjs).
export function held(root) {
  const out = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
  const busy = new Set(out.split("\0").filter(Boolean).map(l => l.slice(3)));
  for (const f of busy) if (pinsOnly(root, f)) busy.delete(f);
  return busy;
}
export { MANIFEST };

// Whether `f` may be written: a plain path of the project's own outside the copy, no link and under none, no file with
// changes not yet committed and none git ignores, which no stash could set aside; else Unwritten, naming it.
export function writable(p, f, busy) {
  const at = path.join(p.root, f);
  if (path.posix.normalize(f) !== f || f.startsWith(copyAt(p)) || leadsOut(p.root, at)) throw new Unwritten(`\`${shown(f)}\` is no file of the project's own outside the copy`);
  const st = fs.lstatSync(at, { throwIfNoEntry: false });
  if (st && !st.isFile()) throw new Unwritten(`\`${shown(f)}\` is no regular file`);
  // (the manifest's, beyond its `Core:` line, which a sync's move alone `held` lets through: #1248, point 2)
  if (busy.has(f)) throw new Busy(`\`${shown(f)}\` has changes not yet committed${f === MANIFEST ? " beyond its `Core:` line, whose move by the sync alone is let through" : ""}: commit them or set them aside, then run it again`, f);
  if (spawnSync("git", ["check-ignore", "-q", "--", f], { cwd: p.root }).status === 0) throw new Unwritten(`git ignores \`${shown(f)}\`: take it out of the ignore list and commit it, then run it again`);
}

// A file written, its folders made, once `writable` passed.
function put(p, f, text) {
  fs.mkdirSync(path.dirname(path.join(p.root, f)), { recursive: true });
  fs.writeFileSync(path.join(p.root, f), text);
}

// A script of the project's copy run from its root: { status, out, err }; Unwritten where there is no such script.
function run(p, script, args, env = {}) {
  const at = path.join(p.root, copyAt(p), "scripts", script);
  if (!fs.existsSync(at)) throw new Unwritten(`no copy of ${script} to run`);
  const r = spawnSync(process.execPath, [at, ...args], { cwd: p.root, encoding: "utf8", maxBuffer: 1 << 28, timeout: 600000, env: { ...process.env, ...env } });
  if (r.error) throw new Unwritten(`${script} could not run (${plain(r.error.message, p.root)})`);
  return { status: r.status, out: `${r.stdout}`, err: `${r.stderr}` };
}
// (a run's own first failure, its mend with it, where it refused before it wrote)
const refusal = r => plain(r.err.split(/\r?\n/u).find(l => l.startsWith("FAIL")) ?? `it ended with status ${r.status}`);

// The size marks as the reading-size check reads them, run once with no base: { marks (its path), json, out, lines },
// the lines of its errors. Unwritten where it did not run to its end (reading-size.mjs's own refusals before it reads).
export function marksRun(p) {
  const marks = marksConfig(p), text = p.read(marks);
  if (text === null) throw new Unwritten(`no ${marks}, a regular file of the project's own of at most ${READ_MOST} bytes, to read`);
  let json;
  try { json = JSON.parse(text); } catch { json = null; } // (the check's own run says what of the marks it cannot read)
  const named = json?.read && typeof json.read === "object" ? Object.keys(json.read) : [];
  const unsafe = named.filter(f => !p.safe(f));
  if (unsafe.length) throw new Unwritten(`${marks} names ${unsafe.map(f => `\`${shown(f)}\``).join(", ")}, which is no regular file of the project's own of at most ${READ_MOST} bytes`);
  const r = run(p, "reading-size.mjs", [marks], { SIZES_BASE: "" }), lines = r.err.split(/\r?\n/u).filter(Boolean);
  const early = /^FAIL: (no config was named|.* could not be read as JSON|.* is not in the form the check reads|\S+ is not a commit here)/u;
  const ended = r.status === 0 ? /^ok {3}read by every session/mu.test(r.out) : r.status === 1 && lines.length > 0 && lines.every(l => l.startsWith("FAIL: ") && !early.test(l));
  if (!ended) throw new Unwritten(`the reading-size check did not run to its end on ${marks}`);
  return { marks, json, out: r.out, lines };
}

// The total the reading-size check's note gives, or null where it gives none (sync note of 14 November 2026).
export const totalNoted = run => {
  const to = /set it to (\d+) \(core\/setup\/sync-notes\.md, 14 November 2026\)/u.exec(run.out)?.[1];
  return to ? Number(to) : null;
};

// The marks file written again with `change` made to its JSON, its own line ends kept.
export function marksWritten(p, run, change, busy) {
  writable(p, run.marks, busy);
  if (!run.json || typeof run.json !== "object" || Array.isArray(run.json)) throw new Unwritten(`${run.marks} is no JSON object to write a mark in`);
  const json = structuredClone(run.json);
  change(json);
  const eol = /\r\n/u.test(p.read(run.marks) ?? "") ? "\r\n" : "\n";
  put(p, run.marks, `${JSON.stringify(json, null, 2)}\n`.replace(/\n/gu, eol));
  return [run.marks];
}

// 13 November 2026: each mark of a file that shrank lowered to what the check gives.
export function writeShrunk(p, busy) {
  // (a step no check of the core's reads: where the marks cannot be read, the project's own check says so, and this
  // writes nothing and says nothing, so a sync of a project with no marks prints no line for it)
  let r;
  try { r = marksRun(p); } catch (e) { if (e instanceof Unwritten) return []; throw e; }
  const lower = {};
  for (const l of r.lines) {
    const m = /^FAIL: (.+) has shrunk to \d+ bytes\. Mend: lower its mark in .+ from (\d+) to (\d+)$/u.exec(l);
    if (m && r.json.read[m[1]] === Number(m[2])) lower[m[1]] = Number(m[3]);
  }
  return Object.keys(lower).length ? marksWritten(p, r, json => Object.assign(json.read, lower), busy) : [];
}

// 14 November 2026: the total set to the number the check's note gives.
export function writeTotal(p, busy) {
  const r = marksRun(p), to = totalNoted(r);
  return to === null ? [] : marksWritten(p, r, json => { json.total = to; }, busy);
}

// Each of `files`, which a script of the core's writes and only a script reads (a lock file a package manager writes,
// a check's baseline), named under "skip" in the size marks where neither "skip" nor "past" names it, so that no pull
// request that changes one fails the split mark, which no split of it answers (#1247, point 2): the marks' path where
// it wrote them, else none. Where the marks cannot be read as a JSON object or written, it writes nothing, and the size
// check's own failure says the mend.
export function skipWritten(p, files, busy) {
  let marks, json;
  try { marks = marksConfig(p); json = JSON.parse(p.read(marks) ?? "null"); } catch { return []; }
  const skip = Array.isArray(json?.skip) ? json.skip : [], past = json?.past && typeof json.past === "object" ? json.past : {};
  const add = files.filter(f => !skip.some(s => typeof s === "string" && s && f.startsWith(s)) && !Object.hasOwn(past, f));
  if (!add.length) return [];
  try { return marksWritten(p, { marks, json }, j => { j.skip = [...skip, ...add]; }, busy); } catch (e) { if (e instanceof Unwritten) return []; throw e; }
}

// 16, 18 and 19 November 2026: the shape check's config, where none stands, as the starter kit writes it, which the
// check holds the project to until then; its first baseline where none stands; else the baseline written again, which
// names every reader; and the baseline under the size marks' "skip" (skipWritten). The parser's packages not installed,
// the check refuses to write, and so does this.
export function writeShape(p, busy) {
  const at = shapeAt(p.manifest), wrote = [];
  let text = p.read(at);
  if (text === null) {
    writable(p, at, busy);
    text = fs.readFileSync(path.join(HERE, "setup/template/shape.json.tmpl"), "utf8");
  }
  let config;
  try { config = parseConfig(text, at); } catch (e) { throw new Unwritten(`the shape check cannot read \`${shown(at)}\` (${plain(String(e.message).split(". Mend: ")[0], p.root)})`); }
  writable(p, config.baseline, busy);
  if (p.read(at) === null) { put(p, at, text); wrote.push(at); }
  try {
    const r = run(p, "shape.mjs", [at, p.read(config.baseline) === null ? "--first" : "--write"], { SHAPE_BASE: "" });
    if (r.status !== 0) throw new Unwritten(`the shape check wrote no baseline: ${refusal(r)}`);
  } catch (e) {
    for (const f of wrote) fs.rmSync(path.join(p.root, f)); // (the config it wrote for the run taken out again: it wrote nothing)
    throw e;
  }
  return [...wrote, config.baseline, ...skipWritten(p, [config.baseline], busy)];
}

// 16 November 2026: each copy an agent tool's files held before the copies check read them, listed in its baseline by
// the check's own --tools, where the check notes one; the broken pointers there are the step's to name.
export function writeToolCopies(p, busy) {
  const config = copiesConfig(p);
  if (!p.safe(config)) throw new Unwritten(`the copies check's config \`${shown(config)}\` is no regular file of the project's own of at most ${READ_MOST} bytes`);
  let baseline;
  try { baseline = JSON.parse(p.read(config))?.baseline; } catch { /* (said below) */ }
  if (typeof baseline !== "string") throw new Unwritten(`the copies check's config \`${shown(config)}\` names no baseline`);
  const seen = run(p, "copies.mjs", [config], { COPIES_BASE: "" });
  if (!/^note an old copy in an agent tool's file, not yet in the baseline: /mu.test(seen.out)) return [];
  writable(p, baseline, busy);
  const r = run(p, "copies.mjs", [config, "--tools"], { COPIES_BASE: "" });
  if (r.status !== 0) throw new Unwritten(`the copies check listed nothing: ${refusal(r)}`);
  return [baseline];
}

// 19 November 2026: the list of what holds the project's own rules, by holders.mjs's own --own --write.
export function writeHolders(p, busy) {
  writable(p, OWN_HOLDERS, busy);
  const r = run(p, "holders.mjs", ["--own", "--write"]);
  if (r.status !== 0) throw new Unwritten(`holders.mjs wrote no list: ${refusal(r)}`);
  return [OWN_HOLDERS];
}

// 20 November 2026: each U+0085, U+2028 or U+2029 of a workflow or an action of the project's written as the step's mend
// asks, by the workflow check's own reading of it (workflows.mjs, asMended): inside a double-quoted string its own
// escape, elsewhere a line feed; a file whose lines end in CRLF keeps them. Where the YAML package is not installed,
// which cuts the strings, it writes nothing.
export function writeBreaks(p, busy) {
  const found = workflowsRead(p.files, copyAt(p)).filter(f => /[\u0085\u2028\u2029]/u.test(p.read(f) ?? ""));
  if (!found.length) return [];
  if (!installed("yaml")) throw new Unwritten(`the YAML package, which tells a break inside a double-quoted string, is not installed beside the copy: run node ${copyAt(p)}scripts/install.mjs all, then this again`);
  const writes = found.map(f => {
    const text = p.read(f), mended = asMended(text).text;
    if (/[\u0085\u2028\u2029]/u.test(mended) || mended === asLF(text).text && /"[^"\n]*[\u0085\u2028\u2029]/u.test(text)) throw new Unwritten(`the workflow check could not cut \`${shown(f)}\` into its strings`);
    return [f, /\r\n/u.test(text) && !/(^|[^\r])\n/u.test(text) ? mended.replace(/\n/gu, "\r\n") : mended];
  });
  writes.forEach(([f]) => writable(p, f, busy));
  for (const [f, text] of writes) put(p, f, text);
  return found;
}

// 16 November 2026: each path of a file the rules left (core/modules/, floor/topics.md) in the project's own files the
// step reads, as the step's check finds it there, written as the file it now is; a copies config that reads the old
// folder alone given the new folders' patterns beside it; the size marks' "read" (marksMoved); and the manifest's
// "Paths:" line, where it is word for word the one the starter kit of releases 1 to 5 wrote, written as the kit writes
// it now. Each path is written on its own (#1248, point 5): one whose move is no exact one (it leads to a folder, or a
// rule of its file stands elsewhere since and the line does not name that rule by its lead) is left as it stands for
// the step's mend, and so is a "Paths:" line of the project's own words. Never written: the core's part, the one
// process's, or a file whose part cannot be told apart; nor a file the writer cannot tell is the project's own (sure).
export const OLD_PATHS = "Paths: in the core's files, one into floor/, modules/, scripts/, setup/ or archive/ is under core/; any other is ours.";
const quoted = f => f.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
// The old paths of `map` as a pattern: `core/<old>` alone, never inside a longer name (`hardcore/`, `<old>.bak`).
export const oldPathsIn = map => Object.keys(map).length ? new RegExp(`(?<![\\w-])core/(${Object.keys(map).map(quoted).join("|")})(?![\\w/-]|\\.\\w)`, "gu") : null;
export function writeMoved(p, busy) {
  const map = moved(), copy = copyAt(p), writes = [];
  const oldPath = oldPathsIn(map);
  let marks = null;
  try { marks = marksConfig(p); } catch { /* (marks whose path cannot be read are read as any other file) */ }
  for (const f of sure(p, namers(p))) {
    const text = p.read(f) ?? "", c = partCut(f, text), own = t => movedIn(f === marks ? marksMoved(t, map) : t, map, oldPath, c?.[1]?.split("\n").map(l => l.replace(/\r$/u, "")));
    if (!c) continue;
    let next = c.length === 3 ? `${own(c[0])}${c[1]}${own(c[2])}` : own(text);
    if (oldPath && readsOldAlone(p, f, copy)) next = next.split(atCopy(MOVED_GLOB, copy)).join(atCopy(`${MOVED_GLOB}, ${MOVED_GLOBS}`, copy));
    if (next !== text) writes.push([f, next]);
  }
  pathsLine(p, writes);
  writes.forEach(([f]) => writable(p, f, busy));
  for (const [f, text] of writes) put(p, f, text);
  return writes.map(([f]) => f);
}

// A file's text with each old path it names written as the file it now is, where its move is an exact one; a rule that
// left its file named with its lead, `core/<old>`, "<lead>", as the step words it, named where it stands now; and a
// pull-in (an import, Kiro's `#[[file:`) this writes into one that a line above, or the core's part (`part`, its lines),
// already makes left out.
function movedIn(text, map, oldPath, part = []) {
  if (!oldPath) return text;
  const apart = moved.apart(), exact = old => !map[old].endsWith("/") && !(apart[old]?.length);
  const led = Object.entries(apart).reduce((t, [old, parts]) => parts.reduce((u, a) => u.split(`\`core/${old}\`, "${a.lead}"`).join(`\`core/${a.to}\`, "${a.lead}"`), t), text);
  const next = led.replace(oldPath, (all, old) => exact(old) ? `core/${map[old]}` : all);
  if (next === text) return text;
  const was = text.split("\n"), now = next.split("\n");
  const twice = (l, i) => (now.indexOf(l) < i && !(was[i] === l && was.indexOf(l) < i)) || (was[i] !== l && part.includes(l.replace(/\r$/u, "")));
  return now.filter((l, i) => !(/^\s*(?:@|#\[\[file:)/u.test(l) && twice(l, i))).join("\n");
}

// The size marks' text with each file under "read" at an old path that leads to one file named as that file, two that
// now lead to one merged at the larger mark, since a key named twice is no JSON a reader reads one way (#1247, point
// 4); its own line ends kept, the rest laid out as `marksWritten` lays it out, two spaces deep, so a file kept in another
// layout is written whole where a key moves. Marks that are no JSON object with "read" stand as they are.
function marksMoved(text, map) {
  let json;
  try { json = JSON.parse(text); } catch { return text; }
  if (!json?.read || typeof json.read !== "object" || Array.isArray(json.read)) return text;
  const apart = moved.apart(), read = {};
  for (const [f, mark] of Object.entries(json.read)) {
    const old = /^core\/(.+)$/u.exec(f)?.[1], to = old && map[old] && !map[old].endsWith("/") && !(apart[old]?.length) ? `core/${map[old]}` : f;
    read[to] = Object.hasOwn(read, to) && Number.isInteger(read[to]) && Number.isInteger(mark) ? Math.max(read[to], mark) : mark;
  }
  if (JSON.stringify(read) === JSON.stringify(json.read)) return text;
  return `${JSON.stringify({ ...json, read }, null, 2)}\n`.replace(/\n/gu, /\r\n/u.test(text) ? "\r\n" : "\n");
}

// The manifest's "Paths:" line of releases 1 to 5, word for word, written as the kit writes it now, into `writes`.
function pathsLine(p, writes) {
  const before = writes.find(([f]) => f === "core-manifest.md"), manifest = before?.[1] ?? p.read("core-manifest.md");
  const now = /^Paths: .*$/mu.exec(fs.readFileSync(path.join(HERE, "setup/template/core-manifest.md.tmpl"), "utf8"))?.[0];
  if (!now || manifest === null || !new RegExp(`^${quoted(OLD_PATHS)}\\r?$`, "mu").test(manifest)) return;
  if (before) before[1] = manifest.replace(OLD_PATHS, now);
  else writes.push(["core-manifest.md", manifest.replace(OLD_PATHS, now)]);
}

// The manifest with each module its list neither takes nor leaves out placed from what is read exactly (#1094;
// step-checks-modules.mjs, `rewritten`, which `opts` narrows), and, by the step that places every module, each name the
// core moved brought to where its text went (#1259, point 1), where there is one to place or bring.
export const writePlaced = opts => (p, busy) => {
  const text = rewritten(p, opts);
  if (text === p.manifest) return [];
  writable(p, "core-manifest.md", busy);
  // (its own line ends kept: the manifest is read as LF, and a file the tree holds with Windows ones, as git writes it
  // with core.autocrlf, would otherwise be written whole in LF, every line of it changed; #1227)
  const raw = p.read("core-manifest.md", true) ?? "", crlf = /\r\n/u.test(raw) && !/(^|[^\r])\n/u.test(raw);
  put(p, "core-manifest.md", crlf ? text.replace(/\n/gu, "\r\n") : text);
  return ["core-manifest.md"];
};
