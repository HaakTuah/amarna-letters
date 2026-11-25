// Is this sync PR pure (floor rule 8)? Its merger runs it from a checkout of the core's `main`, never from the PR's own
// copy (under core/, or the path the manifest names: core-path.mjs), which the PR could change, in the project's clone
// with the sync branch's head checked out. For a project that follows the core's releases, that checkout is the
// release the sync moves to, itself a commit of `main`, so that nothing newer than a release runs in its sessions (README.md, "How a project takes the core", point 1); a
// sync to a commit that is no release is no pure sync there, and any check of it is run from the core's `main`:
//
//   node <the core's main, or that release>/scripts/pure-sync.mjs
//
// It reads the branch's head commit, not the working tree, and passes only when, against the project's main, the diff
// touches only the copy, core-manifest.md, .github/workflows/*.yml and the files the core's one process writes, the copy's path the same on both sides; outside it,
// each file the process writes (converge.mjs, #1083) is, byte for byte, what this checkout's process writes from the
// kit at the new pin for the project as its main holds it, so nothing outside the core's files and parts changed, and
// each other changed line differs from the one it replaces only in the manifest's pin or a call's to a core workflow,
// each moved to the new pin; a file is created only so, and deleted only as `provedGone` below proves it (a call whose
// check the one job of the core.yml the process ends with runs, the pin's tree holding the process); the new pin is
// a commit of the core's main at or past the old one, and, where the manifest follows the core's releases, a release
// of the core (any other sync is reviewed like any PR, and merges after it); the copy is a folder, and the core's tree at
// that pin, compared as copy-tree.mjs compares (and says why), without the folder the core keeps to itself; and every
// call to a core workflow is pinned to a commit of the core's main.
// It prints the head it checked, for the merge call's `sha` (`tasks/github-calls.md`), so nothing pushed after the
// check can merge. Git and Node's own modules only, and gh where no workflow's event says whose account holds the
// repository (releases.mjs, hostAccount); it changes nothing.
import "./whole-output.mjs";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { copyTree, coreIsFolder, entries, executable } from "./copy-tree.mjs";
import { CORE as ADDRESS, CORE_SOURCE as A } from "./core-address.mjs";
import { readCore } from "./core-path.mjs";
import { followsOf, hostSaid, inBare, pinsBefore, releasesIn, untar } from "./releases.mjs";
import { asEarlier, plan, unformed } from "./converge.mjs";
import { BLOCKS, CORE_YML, whole } from "./core-owned.mjs";
import { WORKFLOW } from "./power.mjs";
import { fresh, kind } from "./fresh.mjs";
import { privateOf } from "./host-private.mjs";
import { project } from "./steps.mjs";

const CORE = `https://github.com/${ADDRESS}.git`;
const raw = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
const git = (args, cwd) => raw(args, cwd).trim();
// the only SHAs a sync may move: the manifest's pin, and a call's to a core workflow (any case, as GitHub reads it)
const PIN_REF = new RegExp(`^(Core: ${A} at )([0-9a-f]{40})(?=, copied whole under )`, "gu");
const CALL = new RegExp(`(?<![\\w./-])(${A}\\/\\.github\\/workflows\\/[\\w.-]+@)([0-9a-f]{40})(?![\\w./-])`, "giu");
const fail = [];

const head = git(["rev-parse", "HEAD"]);
git(["fetch", "-q", "--no-tags", "origin", "refs/heads/main"]);
const base = git(["merge-base", "FETCH_HEAD", head]);
const show = (rev, file) => { try { return git(["show", `${rev}:${file}`]); } catch { return ""; } };
// (the copy's path as main's manifest names it: a sync moves the pin, never the path; a core a library carries is
// synced in the library's repository, so a change here is no sync of it)
const was = readCore(show(base, "core-manifest.md")), now = readCore(show(head, "core-manifest.md"));
const oldPin = was.pin, pin = now.pin, at = was.path ?? "core/";
if (!oldPin || !pin) fail.push(`core-manifest.md has no one "Core: ${ADDRESS} at <full SHA>, copied whole under <path>/" line on both sides${was.form === "carried" || now.form === "carried" ? ": a core a library carries is synced in the library's own repository" : ""}`);
else if (now.path !== at) fail.push(`the copy's path moves from ${at} to ${now.path}: a sync moves the pin alone`);

// what the merge would bring: only the copy, the manifest's pin and the workflows' call pins, each moved to the new pin
// every file as text (a NUL byte can't hide a change as "binary"), with no diff driver of the project's own
const diff = (opt, ...paths) => // only the last newline dropped, so a line's trailing whitespace still counts
  raw(["diff", "--no-renames", "--no-ext-diff", "--no-textconv", "--text", "--no-color", opt, base, head, "--", ...paths]).replace(/\n$/u, "");
const files = diff("--name-only").split("\n").filter(Boolean);
// (every file outside the copy and the manifest is proved below against what the core's one process writes for the
// project at the new pin, #1083, and a workflow it leaves as the project's is held to its pins alone; a regular file
// created is let through to that proof, and so is one deleted, which the proof holds to what the process takes out)
const later = [], gone = [];
for (const line of diff("--summary").split("\n").filter(Boolean)) {
  const named = line.trim().replace(/^.*\b\d{6} /u, "");
  if (named.startsWith(at)) continue;
  if (/^create mode 100644 /u.test(line.trim())) continue;
  if (/^delete mode 100644 /u.test(line.trim())) { gone.push(named); continue; }
  fail.push(`a file created, deleted or given a new mode: ${line.trim()}`);
}
for (const f of files) {
  if (f.startsWith(at) || gone.includes(f)) continue;
  if (f === "core-manifest.md") pinsOnly(f);
  else later.push(f);
}

// Each hunk's removed lines, then its added ones: the nth added line must be the nth removed with only its pins moved.
function pinsOnly(f) {
  const hunks = [];
  for (const l of diff("-U0", f).split("\n")) {
    if (l.startsWith("@@")) hunks.push({ "-": [], "+": [] });
    else if (hunks.length && (l[0] === "-" || l[0] === "+")) hunks.at(-1)[l[0]].push(l.slice(1));
  }
  if (!hunks.length) fail.push(`${f}: changed, but with no line to check`);
  for (const h of hunks) {
    if (h["-"].length !== h["+"].length) { fail.push(`${f}: lines added or removed, not only a pin moved: ${(h["+"][0] ?? h["-"][0]).slice(0, 80)}`); continue; }
    h["+"].forEach((line, i) => {
      const ref = f === "core-manifest.md" ? PIN_REF : CALL;
      const shas = [...line.matchAll(ref)].map((m) => m[2]);
      if (!shas.length || shas.some((s) => s !== pin)) fail.push(`${f}: a changed line with no pin, or one not the new pin: ${line.slice(0, 80)}`);
      else if (line.replace(ref, "$1<sha>") !== h["-"][i].replace(ref, "$1<sha>")) fail.push(`${f}: a change beyond a pin: ${line.slice(0, 80)}`);
    });
  }
}

// The tree of the project's commit `sha` written out at `to`, the copy left out: each file's bytes as git holds them,
// read blob by blob, never through `git archive`, which applies the tree's own attributes (an `export-ignore` would hide
// a file of the project's from the proof, which would then read it as not there); a link as a link, a submodule left.
function tracked(sha, to) {
  for (const entry of raw(["ls-tree", "-r", "-z", "--full-tree", sha]).split("\0").filter(Boolean)) {
    const [, mode, type, id, f] = /^(\d{6}) (\w+) ([0-9a-f]+)\t(.*)$/su.exec(entry);
    if (type !== "blob" || f.startsWith(at)) continue;
    const file = join(to, f);
    mkdirSync(dirname(file), { recursive: true });
    const bytes = execFileSync("git", ["cat-file", "blob", id], { maxBuffer: 1 << 28 });
    if (mode === "120000") symlinkSync(bytes.toString("utf8"), file);
    else writeFileSync(file, bytes);
  }
}

// The core's own files and parts the sync changed, each proved equal, byte for byte, to what the one process writes
// (converge.mjs, as this checkout of the core's main holds it) from the kit at the new pin, with the project as main
// holds it and the new pin, every byte outside the core's part kept. Only the core's own: a whole file of the core's
// (core-owned.mjs, `whole`) and the core's part of a rule file that main holds; never a file that is the project's from
// its first commit (the manifest, SECURITY.md, the threat model, a config), nor a rule file created whole, though the
// process writes those where they are not there (floor rule 8 covers the core's files and parts alone; #1083). A file
// it would leave as the project's, or where nothing can be rendered (no kit at the pin, the kind or the project's values
// unread), is held to the pins alone where it is a workflow, as before the process, and refused otherwise. `dir`: the
// core's main and releases, fetched.
function provedOwned(dir) {
  if (!later.length && !gone.length) return;
  const unproved = (why) => { for (const f of later) { if (WORKFLOW.test(f)) pinsOnly(f); else fail.push(`${f}: ${why}`); } for (const f of gone) fail.push(`${f}: deleted, ${why}`); };
  const tmp = mkdtempSync(join(tmpdir(), "core-render-")), kits = join(tmp, "kits"), base_ = join(tmp, "project");
  try {
    const tree = (sha, to) => { mkdirSync(to, { recursive: true }); untar(to, inBare(dir, ["archive", sha, "setup/template"], { encoding: "buffer", maxBuffer: 1 << 28 })); };
    // (a pin whose core holds no kit, or one git cannot read, proves no file outside the copy: never a crash)
    try { tree(pin, join(kits, "now")); } catch { unproved(`the core at ${pin} holds no starter kit to render, so it is not proved what the core's process writes`); return; }
    const older = [...new Set([oldPin, ...pinsBefore("core-manifest.md", pin, dir, base), ...releasesIn(dir).map((r) => r.sha)])].flatMap((sha) => { try { tree(sha, join(kits, sha)); return [join(kits, sha)]; } catch { return []; } });
    // (the project as its main holds it, the copy left out, its manifest the head's, whose one change is the pin, read above)
    mkdirSync(base_);
    execFileSync("git", ["init", "-q"], { cwd: base_ });
    tracked(base, base_);
    writeFileSync(join(base_, "core-manifest.md"), raw(["show", `${head}:core-manifest.md`]));
    // (whether it is private, as the host says it of the checkout's repository, from GitHub's event, gh or a read with
    // no sign-in alone: host-private.mjs; never from a test's stand-in or an answer given as CORE_PRIVATE, which this
    // gate, that waives the reviews, does not honour)
    const p = project(base_), k = kind(p, privateOf(process.cwd(), { env: { ...process.env, CORE_HOST_ANSWERS: "", CORE_PRIVATE: "" } })), bad = unformed(p, k);
    if (bad.length) { unproved(`the project's kind or values cannot be read in their forms, so it is not proved what the core's process writes: ${bad.join("; ")}`); return; }
    const kit = fresh(p, join(kits, "now", "setup", "template"), { kitOnly: true, k });
    if (!kit.length) { unproved(`the kit at ${pin} gives no file this checkout of the core can render`); return; }
    // (whether an import's path is there, as the sync reads it with the copy at the new pin: a path in the copy, from the
    // core at the pin, since the project here is written without it; any other, from the project; each path asked once)
    const seen = new Map(), there = (f) => { if (!f.startsWith(at)) return existsSync(join(base_, f)); try { inBare(dir, ["cat-file", "-e", `${pin}:${f.slice(at.length)}`]); return true; } catch { return false; } };
    const exists = (f) => { if (!seen.has(f)) seen.set(f, there(f)); return seen.get(f); };
    // (a moved stub's text, read as the sync reads it, from the core at the pin; a path outside the copy is no stub, nor
    // one the pin's tree, listed once, does not hold, so a project's many imports start no process each)
    let pinned;
    const stubText = (g) => {
      pinned ??= new Set(inBare(dir, ["ls-tree", "-r", "-z", "--name-only", pin], { maxBuffer: 1 << 26 }).toString().split("\0"));
      if (!g.startsWith(at) || !pinned.has(g.slice(at.length))) return null;
      try { return inBare(dir, ["show", `${pin}:${g.slice(at.length)}`], { maxBuffer: 1 << 26 }).toString(); } catch { return null; }
    };
    const { write, remove } = plan(p, kit, older.flatMap((at) => asEarlier(p, join(at, "setup", "template"), k, { kitOnly: true })), { exists, stubText });
    provedGone(dir, write, remove);
    const onMain = (f) => { try { raw(["cat-file", "-e", `${base}:${f}`]); return true; } catch { return false; } };
    for (const f of later) {
      const want = write.find((w) => w.to === f);
      const owned = whole(f) || (BLOCKS.includes(f) && onMain(f));
      // (a workflow not written so, by a sync from a copy before the process among them, is held to its pins alone)
      if (want && owned && execFileSync("git", ["show", `${head}:${f}`], { maxBuffer: 1 << 26 }).equals(Buffer.from(want.text))) continue;
      if (WORKFLOW.test(f)) pinsOnly(f);
      else fail.push(`${f}: not the core's copy, its pin, a workflow's pins or what the core's process writes of the core's own files and parts for the project at ${pin} (converge.mjs)`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// Each file the sync deleted, proved one the process takes out (converge.mjs, `remove`, from main's tree): a workflow of
// the core's whose check the one job of core.yml runs, and only where the head's core.yml is that one job as the
// process writes it, or, where it writes none, as main holds it: never one left otherwise; and only where the pin's own
// tree holds the process, so no deletion is proved that the kit at the pin would never make (its renderer: #1101).
function provedGone(dir, write, remove) {
  if (!gone.length) return;
  try { inBare(dir, ["cat-file", "-e", `${pin}:scripts/converge.mjs`]); } catch { for (const f of gone) fail.push(`${f}: deleted, and the core at ${pin} holds no process that takes a file out (scripts/converge.mjs)`); return; }
  const at_ = (sha) => { try { return execFileSync("git", ["show", `${sha}:${CORE_YML}`], { maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
  const folds = write.find((w) => w.to === CORE_YML), headCore = at_(head), baseCore = at_(base);
  const runs = headCore !== null && (folds ? headCore.equals(Buffer.from(folds.text)) : baseCore !== null && headCore.equals(baseCore));
  for (const f of gone) if (!remove.some((r) => r.to === f) || !runs) fail.push(`${f}: deleted, and not a workflow of the core's whose check the one job of the core.yml the core's process at ${pin} ends with runs, which alone it takes out (converge.mjs)`);
}

// every pin the branch ends with: the manifest's and each call's
const pins = new Set(pin ? [pin] : []);
for (const f of git(["ls-tree", "--name-only", head, "--", ".github/workflows/"]).split("\n").filter((n) => WORKFLOW.test(n))) {
  for (const m of show(head, f).matchAll(CALL)) pins.add(m[2]);
}
// (the core's main, fetched into a bare repository of its own, which every call names outright: releases.mjs)
const dir = mkdtempSync(join(tmpdir(), "core-main-"));
const inCore = (args) => { try { inBare(dir, args); return true; } catch { return false; } };
try {
  inBare(dir, ["init", "-q", "--bare", dir]);
  inBare(dir, ["fetch", "-q", "--no-tags", CORE, "+refs/heads/main:refs/heads/main", "+refs/tags/release-*:refs/tags/release-*"]);
  for (const sha of pins) if (!inCore(["merge-base", "--is-ancestor", sha, "refs/heads/main"])) fail.push(`${sha} is not a commit of the core's main`);
  if (oldPin && pin && !inCore(["merge-base", "--is-ancestor", oldPin, pin])) fail.push(`the pin goes back: ${pin} is not past ${oldPin}`);
  // (a project that follows the core's releases takes, unreviewed, only what the core's owner chose to hand on: a sync
  // to any other commit of main is reviewed like any PR, and merges after its review; core archive 201)
  const follows = followsOf(show(head, "core-manifest.md"), hostSaid(console.error));
  if (pin && follows !== "main" && !releasesIn(dir).some((r) => r.sha === pin)) {
    // (and how to take a release instead: a copy older than release-1 lands here, its own sync script taking main; #365)
    const [newest] = releasesIn(dir);
    fail.push(`the project ${follows === "releases" ? "follows the core's releases" : "does not say what it follows"}, and ${pin} is no release of the core: the sync is reviewed like any PR${newest ? `, or made again from the project's main to a release with its full SHA, \`node ${at}scripts/sync.mjs ${newest.sha}\` (${newest.name}, the newest), as a copy older than release-1, whose sync script takes the core's main, must` : ""}${newest && inCore(["merge-base", "--is-ancestor", newest.sha, pin]) ? `; in a release's trial on a copy of a project (the core's AGENTS.md, "Each release is tried on a real project first"), ${pin} is a commit of main past the newest release, not yet a release, and nothing is to be done (#1245, point 12)` : ""}`);
  }
  if (pin && oldPin && inCore(["merge-base", "--is-ancestor", pin, "refs/heads/main"])) provedOwned(dir);
  else if (later.length || gone.length) fail.push(`${[...later, ...gone].join(", ")}: no file outside the copy is proved where the pin is not a commit of the core's main`);
  const own = git(["rev-parse", "--absolute-git-dir"]); // (the project's clone, named outright as copy-tree.mjs asks)
  if (pin && inCore(["cat-file", "-e", `${pin}^{commit}`])) {
    const theirs = copyTree(pin, dir), ours = `${head}:${at.slice(0, -1)}`;
    if (!coreIsFolder(head, own, at.slice(0, -1)) || entries(theirs, dir) !== entries(ours, own)) fail.push(`${at} is not a folder holding the core's tree at ${pin} (copy-tree.mjs)`);
    // (a bit the core marks, or none, as a copy made on Windows by an older sync holds; never one it does not: #1093)
    else { const marks = executable(theirs, dir); for (const f of executable(ours, own).filter((f) => !marks.includes(f))) fail.push(`${at}${f} is marked executable, which the core at ${pin} does not mark it (copy-tree.mjs)`); }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fail.length) {
  for (const f of fail) console.log(`  NOT PURE ${f.replace(/[\u0000-\u001f\u007f]/gu, "?")}`);
  console.log("not a pure sync: it gets its reviews as any PR (floor rule 8)");
  process.exit(1);
}
console.log(`a pure sync: core ${oldPin.slice(0, 7)} -> ${pin.slice(0, 7)}, ${files.length} files, ${pins.size} pins on the core's main`);
console.log(`merge it with sha=${head}`);
