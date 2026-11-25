// The sync (README, "How a project takes the core", point 1): run from a project's root, it brings the project's copy
// of the core to a newer commit of the core, as a sync PR carries it. It writes the copy whole at that commit, at the path the
// manifest's "Core:" line names (`core/` as a rule; core-path.mjs), with the executable bits the core marks staged in git's index (#1093), moves that line to it, and moves each call to a core workflow whose workflow changed (as `core.yml` checks),
// listing those calls, and prints what the sync asks of the project beyond the copy (the core's setup/sync-notes.md, the
// entries it gained between the two commits), then, from the copy it has just written, every step a release asks that
// is not done, what the steps' writers wrote of them where a script does it exactly, set aside in a stash to be
// committed after the merge (steps.mjs --write --aside; #1091), every difference from a fresh start, where the owner's inbox is and what its labels and openers lack, and
// what the project holds twice or against the core (steps.mjs, fresh.mjs, inbox.mjs, labels.mjs and twice.mjs, beside this file), the settings only the owner gives where the sync
// brings one the old copy's list did not hold, and at the first copy all of them (owner-settings.mjs; #1085), and at its end the one line that says whether the
// project then holds the core whole and wired (attached.mjs, beside this file; #1081), for the sync PR's description, having written what the core owns, from the new copy's kit, by the one process that writes it for a new project too (converge.mjs, beside this file; #1083): they report and fail nothing (AGENTS.md of the core, "Nothing locks a project"). It commits and pushes nothing: the session that runs it reviews the diff and opens the PR,
// which, a pure sync, its merger checks with `scripts/pure-sync.mjs` (floor rule 8). Git, tar, gh where it asks whose
// account holds the repository (releases.mjs, hostAccount) and Node's own modules only; the core's address:
// core-address.mjs, beside this file. Where the line says a library carries the core, it syncs nothing: the library's
// own repository does (tasks/repositories.md).
//
//   node core/scripts/sync.mjs              to the newest of what the project follows: the core's main at its newest
//                                           commit whose checks all passed (greenMain), or its newest
//                                           release where it follows the releases (releases.mjs, beside this file),
//                                           unless that release changes nothing the project takes (staysAt there)
//   node core/scripts/sync.mjs <full SHA>   to that commit of the core's main, whatever the project follows; at the
//                                           pin the copy stands at, it moves nothing and does all else a sync does,
//                                           what it asks since the pin before and every report (samePin; #1246)
//
// The first copy: a project with its manifest written and no copy yet runs this file from a clone of the core's main
// (`node <the clone>/scripts/sync.mjs`, a full SHA after it for another commit), and the copy is written at the commit its
// manifest's "Core:" line names, that line moved if a SHA was given. A project that follows the core's releases runs
// it from a clone at a release, so that nothing newer than one runs in its sessions (README.md, point 1).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { CORE } from "./core-address.mjs";
import { recordModes } from "./copy-tree.mjs";
import { readCore } from "./core-path.mjs";
import { READ_MOST, ownFiles } from "./own-files.mjs";
import { everyInstall } from "./packages.mjs";
import { started } from "./started.mjs";
import { NOTES, asksLeft, fetchCore, followsOf, greenMain, hostSaid, inBare, jumped, newestRelease, past, pinsBefore, plainEnv, releasesIn, staysAt, untar } from "./releases.mjs";
import { FOLDER } from "./sync-notes.mjs";

// (the core's main and its releases, fetched into a bare repository of its own, which every call names outright, with
// git's own variables that point elsewhere left out: releases.mjs)
const git = (args, tmp) => inBare(tmp, args).trim();
class Failure extends Error {}
const fail = msg => { throw new Failure(msg); };

// What a sync prints for its pull request's description, each a script of the new copy with its arguments (`kits`:
// the folder of the earlier starter kits, beside the bare repository of the core; `old`, the copy's pin before): the
// steps not done, the differences from a fresh start, where the inbox is, what the labels lack, the steps read on the host (host.mjs; #1092), the
// packages gone stale (held.mjs; #1095), the owner's settings
// where one is new since `old`, what the project holds twice or against the core (#1087), the line that lists what the sync's own paths outside the copy call for, the
// pins of the project's workflows above all (reading.mjs, by which the description check reads that line), then what the
// steps' writers wrote, set aside in a stash for a pull request of its own after the sync's, which stays pure (steps.mjs
// --write --aside; #1091), and last the line attached.mjs prints.
// (`old` null, where the pin before cannot be read: every setting only the owner gives, as at the first copy)
const REPORTS = (kits, old) => [["steps.mjs"], ["fresh.mjs", "--older", kits], ["inbox.mjs"], ["labels.mjs"], ["host.mjs"], ["held.mjs"], ["owner-settings.mjs", ...(old ? ["--since", old, "--fetched", path.dirname(kits)] : []), "--report"], ["twice.mjs", "--fetched", path.dirname(kits), ...(old ? ["--since", old] : [])], ["reading.mjs", "builder", "--changed", "HEAD", "--line"], ["steps.mjs", "--write", "--aside"], ["attached.mjs", "--line", "--fetched", path.dirname(kits)]];

// Where the copy stands, as the manifest's "Core:" line names it (tasks/repositories.md; core-path.mjs); null, said,
// where a library carries the core, which is synced in the library's own repository.
function ownCopy(text) {
  const line = readCore(text);
  if (line.wrong) fail(line.wrong);
  // (the copy is written where the path leads, so no folder on the way is a link, which could lead out of the project)
  const parts = line.path?.split("/").filter(Boolean) ?? [];
  for (let i = 1; i <= parts.length; i++) {
    let st = null;
    try { st = fs.lstatSync(parts.slice(0, i).join("/")); } catch { break; } // (not there yet: nothing further is either)
    if (st.isSymbolicLink()) fail(`${parts.slice(0, i).join("/")}, on the way to the copy's path ${line.path}, is a link, which could lead out of the project. Mend: make it a folder of the project's own, or name another path in the "Core:" line`);
  }
  if (line.form === "copied") return line;
  console.log(`the core here is the one the library at ${line.library} carries, at that library's pin: it is synced in the library's own repository, and reaches this one when this repository takes the library at a newer version (tasks/repositories.md). Nothing to sync here.`);
  return null;
}

// The commit the copy moves to and the release it is, if one (" (release-N)", or ""): the SHA given, the pin the
// manifest names for the first copy, or the newest of what the project follows; null, said, where there is nothing to
// sync.
function targetOf({ manifest, text, old, first, at }, tmp) {
  const arg = process.argv[2];
  if (arg && !/^[0-9a-f]{40}$/.test(arg)) fail("give the core's commit as a full SHA");
  const pin = arg ?? (first ? old : null);
  if (pin) return { pin, release: "" };
  const follows = followsOf(text, hostSaid()) ?? fail(`${manifest} does not say what the project follows: its *follows* row is \`main\` or \`releases\`, once, or left out where the owner's account is read: its one row, or the repository's own account where the host says a person holds it`);
  if (follows === "main") return greenToTake({ old, at }, tmp);
  return releaseToTake({ text, old, at }, tmp);
}

// The newest commit of the core's main whose checks all passed, where the project follows main (releases.mjs,
// greenMain; floor rule 12, #733); null, said, where none has passed or the copy is past it already.
function greenToTake({ old, at }, tmp) {
  const green = greenMain(tmp);
  console.log(green.said);
  if (!green.sha) { console.log("nothing to sync until one has (a full SHA takes a commit of its main)"); return null; }
  if (old && green.sha !== old && past(green.sha, old, tmp)) { console.log(`${at} at ${old.slice(0, 7)} is past it already: nothing to sync`); return null; }
  return { pin: green.sha, release: "" };
}

// The core's newest release, where the project follows the releases; null, said, where it brings nothing to sync.
function releaseToTake({ text, old, at }, tmp) {
  const newest = newestRelease(old, tmp);
  if (!newest) { console.log("the core has cut no release yet: nothing to sync (a full SHA takes a commit of its main)"); return null; }
  if (!newest.moved) { console.log(`${at} is at or past the core's newest release, ${newest.name} (${newest.sha.slice(0, 7)}): nothing to sync`); return null; }
  if (staysAt(old, text, tmp)) { console.log(`the core's newest release, ${newest.name} (${newest.sha.slice(0, 7)}), changes nothing this project takes since ${old.slice(0, 7)}, the release before it: ${at} stays there, nothing to sync until the next release (README.md, point 1; a full SHA takes it all the same)`); return null; }
  return { pin: newest.sha, release: ` (${newest.name})` };
}

// Each call to a core workflow whose workflow changed between its pin and `pin`, moved to `pin`: { moved, unread }, the
// calls moved and the workflows not read. A workflow is read as the steps read it (`own`: own-files.mjs): one that is no
// regular file of the project's own, a link that leads out among them, is left as it is, named, and never written through.
export function moveCalls(pin, tmp, own) {
  const moved = [], unread = [];
  for (const p of own.listed.filter(f => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f))) {
    const file = p.slice(".github/workflows/".length), src = own.read(p, true);
    if (src === null) { unread.push(p); continue; }
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
  return { moved, unread };
}

// What the sync moved (the copy, the manifest's line and the workflow calls).
function sayMoved({ at, old, pin, release, manifest, moved, unread }, tmp) {
  const changed = git(["diff", "--stat", "--format=", old, pin], tmp).split("\n").pop() || "no files";
  console.log(`${at} ${old.slice(0, 7)} -> ${pin.slice(0, 7)}${release} (${changed.trim()}); ${manifest} moved.`);
  console.log(moved.length
    ? `Workflow calls moved:\n  ${moved.join("\n  ")}`
    : "No workflow call moved: the PR changes no workflow.");
  if (unread.length) console.log(`Workflows not read, so no call in them moved, each no regular file of the project's own of at most ${READ_MOST} bytes: ${unread.join(", ")}. Make each a file of the project's own, then move its calls by hand to ${pin}.`);
}

// What a sync from `old` to `pin` asks of the project beyond the copy, and whether it jumps past two releases. An entry
// whose step the new copy reads done here (`done`, doneHere) is given by its lead alone, the rest in full (#1264, point 2).
function sayAsks({ at, old, pin }, tmp, done = null) {
  // What this sync asks of the project beyond the copy: the entries the core's sync notes gained between the two pins.
  // (A pin from before the notes gives every entry. Where the entries cannot be read, it says so: never an all-clear.)
  // (an entry whose step says it asks nothing of what stands stays in the notes and is left out here, counted: #1094)
  const read = asksLeft(old, pin, tmp), asks = read?.asks ?? null, left = read?.quiet ?? 0;
  const lead = l => /^- \*\*([^*]+?)\.\*\*/u.exec(l)?.[1], given = (asks ?? []).map(l => done?.has(lead(l)) ? `- ${lead(l)}: done here, as its step reads.` : l);
  const brief = given.filter((l, i) => l !== asks[i]).length, briefly = brief ? ` Each of the ${brief} whose step reads done here (\`${at}scripts/steps.mjs\`) is given by its lead alone.` : "";
  const besides = left ? ` (${left} ${left === 1 ? "entry that asks" : "entries that ask"} nothing of what stands ${left === 1 ? "is" : "are"} left out here; ${left === 1 ? "it stands" : "they stand"} in ${at}${FOLDER}/.)` : "";
  console.log(asks === null
    ? `What this sync asks of the project beyond the copy could not be read: read the entries of ${at}${FOLDER}/ newer than the old pin.`
    : asks.length
      ? `This sync asks more of the project than the copy (${at}${NOTES}). Not in this PR, a pure sync: do each in a PR of its own once this one is merged, or file it for the queue where it is large.${briefly}${besides}\n${given.join("\n")}`
      : `This sync asks nothing of the project beyond the copy (${at}${NOTES}).${besides}`);
  // (a jump past two releases makes the next reading of the project against the core whole: #464)
  if (jumped(old, tmp)) console.log(`This sync jumps from a copy older than the core's last two releases, so the project is read against the core whole again (${at}tasks/cleaning.md, "A project is read against the core once, then for what each release changes"): once this pull request is merged, take checks/core-reading.json out in a pull request of its own, and the step that reads it asks the whole reading.`);
}

// The folder of the earlier starter kits, each in a folder named for its commit.
// (fresh.mjs is given the starter kit of each pin the manifest named and of every release, to find the wording the core has left)
function kitsOf(pins, tmp) {
  const kits = path.join(tmp, "kits");
  for (const sha of new Set([...pins, ...releasesIn(tmp).map(r => r.sha)])) {
    const to = path.join(kits, sha);
    fs.mkdirSync(to, { recursive: true });
    try { untar(to, inBare(tmp, ["archive", sha, "setup/template"], { encoding: "buffer", maxBuffer: 1 << 28 })); }
    catch { fs.rmSync(to, { recursive: true, force: true }); } // (a commit from before the starter kit: no kit to compare)
  }
  return kits;
}

// Every step not done, a standing one too, every difference from a fresh start, where the owner's inbox is and what its
// labels and openers lack, as the new copy reads them, and then whether the core is attached (#1081); for the sync PR's description. (A copy from before these scripts has neither: nothing is said of them.)
function report(at, dir, kits, old) {
  console.log("For the sync PR's description (each a task, none in this PR; nothing waits on them):");
  for (const [script, ...args] of REPORTS(kits, old)) reportOf(at, dir, script, args);
}

// What one script of the new copy prints for the sync PR's description; nothing where the copy has no such script.
function reportOf(at, dir, script, args) {
  if (!fs.existsSync(path.join(dir, "scripts", script))) return;
  // (each given ten minutes, so that none can hold the sync. Of what it writes to stderr only its own "FAIL:" lines are
  // printed, which name no path of the machine: a crash's trace would, and this goes into a PR's description)
  const r = spawnSync(process.execPath, [path.join(dir, "scripts", script), ...args], { encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 });
  const said = String(r.stderr ?? "").split("\n").filter(l => l.startsWith("FAIL:")).join("\n");
  const text = `${r.stdout ?? ""}${said}`.trim() || (r.status === 0 ? `${at}scripts/${script} said nothing` : "");
  if (text) console.log(text);
  if (r.error?.code === "ETIMEDOUT") console.log(`${at}scripts/${script} was stopped after ten minutes: run it again by itself`);
  else if (r.status !== 0 && !said) console.log(`${at}scripts/${script} failed: run it again by itself to see why`);
}

function sync(tmp) {
  const manifest = "core-manifest.md";
  // (read as the steps read it: own-files.mjs; one that is no regular file of the project's own is none)
  let own;
  try { own = ownFiles("."); } catch { fail(`run it from a project's root, a git repository, beside ${manifest}`); }
  const text = own.read(manifest, true);
  if (text === null) fail(`run it from a project's root, beside ${manifest}, a regular file of the project's own of at most ${READ_MOST} bytes`);
  const line = ownCopy(text);
  if (!line) return;
  const at = line.path, dir = at.slice(0, -1), old = line.pin, lineRe = new RegExp(`^Core: ${CORE} at ([0-9a-f]{40}), copied whole under `, "m");
  const first = !fs.existsSync(dir); // (the first copy: the manifest is written, the copy not yet)

  fetchCore(tmp);
  const target = targetOf({ manifest, text, old, first, at }, tmp);
  if (!target) return;
  const { pin, release } = target;
  if (!past(pin, "refs/heads/main", tmp)) fail(`${pin} is not a commit of the core's main`);
  if (pin === old && !first) { samePin({ at, dir, pin, manifest }, tmp); return; }

  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  untar(dir, inBare(tmp, ["archive", pin], { encoding: "buffer", maxBuffer: 1 << 28 }));
  fs.writeFileSync(manifest, text.replace(lineRe, line => line.replace(old, pin)));
  recordModes(dir, pin, tmp);
  install(dir);

  const { moved, unread } = moveCalls(pin, tmp, own);
  if (first) { console.log(`${at} written at ${pin.slice(0, 7)}, the first copy; ${manifest} names it.`); converge(dir, null, true); reportOf(at, dir, "owner-settings.mjs", ["--report"]); return; }
  sayMoved({ at, old, pin, release, manifest, moved, unread }, tmp);
  const kits = kitsOf([old, ...pinsBefore(manifest, pin, tmp)], tmp);
  converge(dir, kits);
  sayAsks({ at, old, pin }, tmp, doneHere(dir));
  report(at, dir, kits, old);
}

// A sync at the pin the copy stands at already: it moves nothing, and does all else a sync does, for the sync's pull
// request (#1246, point 1). A copy an older sync script moved got from it the copy and the pins alone, so this run,
// which the sync notes ask for once, gives what that script did not: the packages, the core's files and parts, what
// the sync asks since the pin before, read from the project's own history of its manifest, and every report.
function samePin({ at, dir, pin, manifest }, tmp) {
  console.log(`${at} is already at ${pin}: nothing to move`);
  recordModes(dir, pin, tmp);
  install(dir);
  const pins = pinsBefore(manifest, pin, tmp), before = pins[0] ?? null;
  const kits = kitsOf([pin, ...pins], tmp);
  converge(dir, kits);
  if (before) sayAsks({ at, old: before, pin }, tmp, doneHere(dir));
  else console.log(`The pin before ${pin.slice(0, 7)} could not be read from the history of ${manifest} (no commit of it names another pin of the core's main), so what the last sync asks beyond the copy is not listed: read the entries of ${at}${FOLDER}/ dated on or after the day of the project's sync before it, and every setting only the owner gives is listed below.`);
  report(at, dir, kits, before);
}

// What the core owns, written from the new copy's own kit by the one process (#1083; converge.mjs, beside this file),
// with the earlier kits by which it knows a file of the core's that carries no mark yet; a copy from before it has none.
// What it leaves as the project's it says, for the sync PR's description; where it refuses, it says why and the mend.
// At the first copy (`first`) it writes the project's own files the kit writes too, where they are not there. Where
// the process refused, the sync says so in a line of its own and exits 1: the copy moved, the core's files did not.
function converge(dir, kits, first = false) {
  const script = path.join(dir, "scripts", "converge.mjs");
  if (!fs.existsSync(script)) return;
  const r = spawnSync(process.execPath, [script, "--write", ...(kits ? ["--older", kits] : []), ...(first ? ["--first"] : [])], { encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 });
  const said = `${r.stdout ?? ""}${String(r.stderr ?? "").split("\n").filter(l => l.startsWith("FAIL")).join("\n")}`.trim();
  console.log(said || `${dir}/scripts/converge.mjs failed: run it again by itself to see why`);
  if (r.status !== 0) {
    console.log(`FAIL the core's files and parts were not written: the one process refused, as it says above, though ${dir}/ moved. Mend: make the mend it names, then run \`node ${dir}/scripts/sync.mjs <the manifest's pin>\` again, which at the same pin moves nothing and writes them, and commit what it writes in this pull request.`);
    process.exitCode = 1;
  }
}

// The leads of the steps the new copy reads done in the project, after the one process wrote what the core owns
// (steps.mjs --done; #1264, point 2), or null where it cannot say: a copy from before it, or the steps not read.
function doneHere(dir) {
  const script = path.join(dir, "scripts", "steps.mjs");
  if (!fs.existsSync(script)) return null;
  const r = spawnSync(process.execPath, [script, "--done"], { encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 });
  try { const leads = JSON.parse(r.stdout); return r.status === 0 && Array.isArray(leads) ? new Set(leads.map(String)) : null; } catch { return null; }
}

// The new copy's packages, installed from its lock file by its own install script, into its .packages/node_modules/,
// which git does not track (#654); a copy from before it has none. One that fails twice leaves the copy written and says so, with the
// command to run again: the sync's pull request holds the copy alone, and no registry's silence fails it.
export function install(dir) {
  const script = path.join(dir, "scripts", "install.mjs");
  if (!fs.existsSync(script)) return;
  // (every install of the copy's, the parser's too, for the session that works in the project: #719)
  const r = spawnSync(process.execPath, [script, ...everyInstall(dir)], { encoding: "utf8" });
  process.stdout.write(r.stdout ?? "");
  if (r.status !== 0) console.log(`note the copy is written, but its packages are not installed (the installer's own words are left out of this note: a line of them can name a path on this machine; to read them, run the command below). Mend: none is needed for the checks, which install them themselves before they read (#1093); to install them now, run \`if [ -f ${path.relative(process.cwd(), script)} ]; then node ${path.relative(process.cwd(), script)}; fi\``);
}

// The core is fetched into a temporary folder, removed however the sync ends.
if (started(import.meta.url)) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "core-sync-"));
  try {
    sync(tmp);
  } catch (e) {
    console.error(`FAIL: ${e instanceof Failure ? e.message : e.stack}`);
    process.exitCode = 1;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
