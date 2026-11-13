// Is this sync PR pure (floor rule 8)? Its merger runs it from a checkout of the core's `main`, never from the PR's own
// copy under core/, which the PR could change, in the project's clone with the sync branch's head checked out. For a
// project that follows the core's releases, that checkout is the release the sync moves to, itself a commit of `main`,
// so that nothing newer than a release runs in its sessions (README.md, "How a project takes the core", point 1):
//
//   node <the core's main, or that release>/scripts/pure-sync.mjs
//
// It reads the branch's head commit, not the working tree, and passes only when, against the project's main, the diff
// touches only core/, core-manifest.md and .github/workflows/*.yml; outside core/, each changed line differs from the
// one it replaces only in the manifest's pin or a call's to a core workflow, each moved to the new pin; the new pin is
// a commit of the core's main at or past the old one; core/ is the core's tree at that pin exactly, without the folder
// the core keeps to itself (copy-tree.mjs); and every call to a core workflow is pinned to a commit of the core's main.
// It prints the head it checked, for the merge call's `sha` (`modules/github-calls.md`), so nothing pushed after the
// check can merge. Git and Node's own modules only; it changes nothing.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyTree } from "./copy-tree.mjs";
import { CORE as ADDRESS, CORE_SOURCE as A } from "./core-address.mjs";

const CORE = `https://github.com/${ADDRESS}.git`;
const raw = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
const git = (args, cwd) => raw(args, cwd).trim();
const ok = (args, cwd) => { try { git(args, cwd); return true; } catch { return false; } };
const PIN = new RegExp(`^Core: ${A} at ([0-9a-f]{40}), copied whole under core\\/`, "mu");
// the only SHAs a sync may move: the manifest's pin, and a call's to a core workflow (any case, as GitHub reads it)
const PIN_REF = new RegExp(`^(Core: ${A} at )([0-9a-f]{40})(?=, copied whole under core\\/)`, "gu");
const CALL = new RegExp(`(?<![\\w./-])(${A}\\/\\.github\\/workflows\\/[\\w.-]+@)([0-9a-f]{40})(?![\\w./-])`, "giu");
const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/u;
const fail = [];

const head = git(["rev-parse", "HEAD"]);
git(["fetch", "-q", "--no-tags", "origin", "refs/heads/main"]);
const base = git(["merge-base", "FETCH_HEAD", head]);
const show = (rev, file) => { try { return git(["show", `${rev}:${file}`]); } catch { return ""; } };
const oldPin = show(base, "core-manifest.md").match(PIN)?.[1];
const pin = show(head, "core-manifest.md").match(PIN)?.[1];
if (!oldPin || !pin) fail.push(`core-manifest.md has no "Core: ${ADDRESS} at <full SHA>, copied whole under core/" line on both sides`);

// what the merge would bring: only the copy, the manifest's pin and the workflows' call pins, each moved to the new pin
// every file as text (a NUL byte can't hide a change as "binary"), with no diff driver of the project's own
const diff = (opt, ...paths) => // only the last newline dropped, so a line's trailing whitespace still counts
  raw(["diff", "--no-renames", "--no-ext-diff", "--no-textconv", "--text", "--no-color", opt, base, head, "--", ...paths]).replace(/\n$/u, "");
const files = diff("--name-only").split("\n").filter(Boolean);
for (const line of diff("--summary").split("\n").filter(Boolean)) {
  if (!line.trim().replace(/^.*\b\d{6} /u, "").startsWith("core/")) fail.push(`a file created, deleted or given a new mode: ${line.trim()}`);
}
for (const f of files) {
  if (f.startsWith("core/")) continue;
  if (f !== "core-manifest.md" && !WORKFLOW.test(f)) { fail.push(`${f}: not the core's copy, its pin or a workflow`); continue; }
  // each hunk's removed lines, then its added ones: the nth added line must be the nth removed with only its pins moved
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

// every pin the branch ends with: the manifest's and each call's
const pins = new Set(pin ? [pin] : []);
for (const f of git(["ls-tree", "--name-only", head, "--", ".github/workflows/"]).split("\n").filter((n) => WORKFLOW.test(n))) {
  for (const m of show(head, f).matchAll(CALL)) pins.add(m[2]);
}
const dir = mkdtempSync(join(tmpdir(), "core-main-"));
try {
  git(["init", "-q", "--bare"], dir);
  git(["fetch", "-q", "--no-tags", CORE, "refs/heads/main"], dir);
  for (const sha of pins) if (!ok(["merge-base", "--is-ancestor", sha, "FETCH_HEAD"], dir)) fail.push(`${sha} is not a commit of the core's main`);
  if (oldPin && pin && !ok(["merge-base", "--is-ancestor", oldPin, pin], dir)) fail.push(`the pin goes back: ${pin} is not past ${oldPin}`);
  if (pin && ok(["cat-file", "-e", `${pin}^{commit}`], dir) && copyTree(pin, dir) !== git(["rev-parse", `${head}:core`])) {
    fail.push(`core/ is not the core's tree at ${pin}`);
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
