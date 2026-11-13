// The sync (README, "How a project takes the core", point 1): run from a project's root, it brings the project's copy
// of the core to a newer commit of the core, as a sync PR carries it. It writes `core/` whole at that commit, moves the
// manifest's "Core:" line to it, and moves each call to a core workflow whose workflow changed (as `core.yml` checks),
// listing those calls, and prints what the sync asks of the project beyond the copy (the core's setup/sync-notes.md, the
// entries it gained between the two commits). It commits and pushes nothing: the session that runs it reviews the diff and opens the PR,
// which, a pure sync, its merger checks with `scripts/pure-sync.mjs` (floor rule 8). Git, tar and Node's own modules
// only; the core's address: core-address.mjs, beside this file.
//
//   node core/scripts/sync.mjs              to the newest of what the project follows: the core's main, or its newest
//                                           release where it follows the releases (releases.mjs, beside this file)
//   node core/scripts/sync.mjs <full SHA>   to that commit of the core's main, whatever the project follows
//
// The first copy: a project with its manifest written and no core/ yet runs this file from a clone of the core's main
// (`node <the clone>/scripts/sync.mjs`, a full SHA after it for another commit), and core/ is written at the commit its
// manifest's "Core:" line names, that line moved if a SHA was given. A project that follows the core's releases runs
// it from a clone at a release, so that nothing newer than one runs in its sessions (README.md, point 1).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { CORE } from "./core-address.mjs";
import { NOTES, asksBetween, followsOf, newestRelease, past, plainEnv } from "./releases.mjs";

const URL = `https://github.com/${CORE}`;
// (git's own variables that point elsewhere are left out, so every call lands in the folder it names: releases.mjs)
const git = (args, cwd) => execFileSync("git", args, { cwd, env: plainEnv(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
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
  let pin = arg ?? (first ? old : null), release = "";
  if (!pin) {
    const follows = followsOf(text) ?? fail(`${manifest} does not say what the project follows: its *follows* row is \`main\` or \`releases\`, once, or left out beside one *owner's account* row`);
    if (follows === "main") pin = git(["rev-parse", "refs/heads/main"], tmp);
    else {
      const newest = newestRelease(old, tmp);
      if (!newest) { console.log("the core has cut no release yet: nothing to sync (a full SHA takes a commit of its main)"); return; }
      if (!newest.moved) { console.log(`core/ is at or past the core's newest release, ${newest.name} (${newest.sha.slice(0, 7)}): nothing to sync`); return; }
      pin = newest.sha; release = ` (${newest.name})`;
    }
  }
  if (!past(pin, "refs/heads/main", tmp)) fail(`${pin} is not a commit of the core's main`);
  if (pin === old && !first) { console.log(`core/ is already at ${pin}: nothing to sync`); return; }

  fs.rmSync("core", { recursive: true, force: true });
  fs.mkdirSync("core");
  // ("-f -": Windows' own tar reads a tape drive unless told to read its input)
  execFileSync("tar", ["-x", "-f", "-", "-C", "core"], { input: execFileSync("git", ["archive", pin], { cwd: tmp, env: plainEnv(), maxBuffer: 1 << 28 }) });
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
  console.log(`core/ ${old.slice(0, 7)} -> ${pin.slice(0, 7)}${release} (${changed.trim()}); ${manifest} moved.`);
  console.log(moved.length
    ? `Workflow calls moved:\n  ${moved.join("\n  ")}`
    : "No workflow call moved: the PR changes no workflow.");
  // What this sync asks of the project beyond the copy: the entries the core's sync notes gained between the two pins.
  // (A pin from before the notes gives every entry. Where the entries cannot be read, it says so: never an all-clear.)
  const asks = asksBetween(old, pin, tmp);
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
