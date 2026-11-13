// The sync (README, "How a project takes the core", point 1): run from a project's root, it brings the project's copy
// of the core to a newer commit of the core, as a sync PR carries it. It writes `core/` whole at that commit, moves the
// manifest's "Core:" line to it, and moves each call to a core workflow whose workflow changed (as `core.yml` checks),
// listing those calls, and prints what the sync asks of the project beyond the copy (the core's setup/sync-notes.md, the
// entries it gained between the two commits). It commits and pushes nothing: the session that runs it reviews the diff and opens the PR,
// which, a pure sync, its merger checks with `scripts/pure-sync.mjs` (floor rule 8). Git, tar and Node's own modules
// only; the core's address: core-address.mjs, beside this file.
//
//   node core/scripts/sync.mjs              to the core's newest main
//   node core/scripts/sync.mjs <full SHA>   to that commit of the core
//
// The first copy: a project with its manifest written and no core/ yet runs this file from a clone of the core's main
// (`node <the clone>/scripts/sync.mjs`, a full SHA after it for another commit), and core/ is written at the commit its
// manifest's "Core:" line names, that line moved if a SHA was given.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { CORE } from "./core-address.mjs";

const NOTES = "setup/sync-notes.md";
const URL = `https://github.com/${CORE}`;
const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
class Failure extends Error {}
const fail = msg => { throw new Failure(msg); };

function sync(tmp) {
  const manifest = "core-manifest.md";
  if (!fs.existsSync(manifest)) fail(`run it from a project's root, beside ${manifest}`);
  const first = !fs.existsSync("core"); // (the first copy: the manifest is written, core/ not yet)
  const lineRe = new RegExp(`^Core: ${CORE} at ([0-9a-f]{40}), copied whole under core/`, "m");
  const text = fs.readFileSync(manifest, "utf8");
  const old = text.match(lineRe)?.[1] ?? fail(`${manifest} has no "Core: ${CORE} at <full commit SHA>, copied whole under core/" line`);

  git(["clone", "--quiet", "--bare", URL, tmp]);
  const arg = process.argv[2];
  if (arg && !/^[0-9a-f]{40}$/.test(arg)) fail("give the core's commit as a full SHA");
  const pin = arg ?? (first ? old : git(["rev-parse", "refs/heads/main"], tmp));
  try { git(["cat-file", "-e", `${pin}^{commit}`], tmp); } catch { fail(`${pin} is not a commit of the core`); }
  if (pin === old && !first) { console.log(`core/ is already at ${pin}: nothing to sync`); return; }

  fs.rmSync("core", { recursive: true, force: true });
  fs.mkdirSync("core");
  // ("-f -": Windows' own tar reads a tape drive unless told to read its input)
  execFileSync("tar", ["-x", "-f", "-", "-C", "core"], { input: execFileSync("git", ["archive", pin], { cwd: tmp, maxBuffer: 1 << 28 }) });
  fs.writeFileSync(manifest, text.replace(lineRe, line => line.replace(old, pin)));

  const moved = [];
  const wf = ".github/workflows";
  for (const file of fs.existsSync(wf) ? fs.readdirSync(wf).filter(f => /\.ya?ml$/.test(f)) : []) {
    const p = path.join(wf, file);
    const src = fs.readFileSync(p, "utf8");
    const out = src.replace(new RegExp(`${CORE}/\\.github/workflows/([A-Za-z0-9._-]+\\.ya?ml)@([0-9a-f]{40})`, "g"),
      (call, name, sha) => {
        let same = false;
        try { git(["diff", "--quiet", sha, pin, "--", `.github/workflows/${name}`], tmp); same = true; } catch {}
        if (same) return call;
        moved.push(`${file}: ${name} ${sha.slice(0, 7)} -> ${pin.slice(0, 7)}`);
        return `${CORE}/.github/workflows/${name}@${pin}`;
      });
    if (out !== src) fs.writeFileSync(p, out);
  }

  if (first) { console.log(`core/ written at ${pin.slice(0, 7)}, the first copy; ${manifest} names it.`); return; }
  const changed = git(["diff", "--stat", "--format=", old, pin], tmp).split("\n").pop() || "no files";
  console.log(`core/ ${old.slice(0, 7)} -> ${pin.slice(0, 7)} (${changed.trim()}); ${manifest} moved.`);
  console.log(moved.length
    ? `Workflow calls moved:\n  ${moved.join("\n  ")}`
    : "No workflow call moved: the PR changes no workflow.");
  // What this sync asks of the project beyond the copy: the entries the core's sync notes gained between the two pins.
  // (A pin from before the notes gives every entry. Where the entries cannot be read, it says so: never an all-clear.)
  let asks = null;
  try {
    asks = git(["diff", "--unified=0", "--no-color", "--no-ext-diff", "--no-textconv", old, pin, "--", NOTES], tmp)
      .split("\n").filter(l => l.startsWith("+- ")).map(l => l.slice(1));
  } catch { /* said below */ }
  console.log(asks === null
    ? `What this sync asks of the project beyond the copy could not be read: read core/${NOTES} for the entries newer than the old pin.`
    : asks.length
      ? `This sync asks more of the project than the copy (core/${NOTES}). Not in this PR, a pure sync: do each in a PR of its own once this one is merged, or queue it in the progress file where it is large.\n${asks.join("\n")}`
      : `This sync asks nothing of the project beyond the copy (core/${NOTES}).`);
}

// The clone lives in a temporary folder, removed however the sync ends.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "core-sync-"));
try {
  sync(tmp);
} catch (e) {
  console.error(`FAIL: ${e instanceof Failure ? e.message : e.stack}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
