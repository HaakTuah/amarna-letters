// The core's releases (README.md, "How a project takes the core", point 1): a release is a tag `release-N` on a commit
// of the core's main, cut on the owner's word (AGENTS.md, "A release is cut on the owner's word"; release.mjs, beside
// this file). A project follows either the core's main or its releases: what its manifest's *follows* row says, and
// with no such row, main where its *owner's account* is the account the core is under, the releases where its owner is
// another, who then takes only what the core's owner chose to hand on. The sync and the core-moved check (sync.mjs,
// core-moved.mjs) ask here what a project follows, which release is the newest, and whether it asks a sync of the
// project at all (staysAt). Every function reads; none writes but fetchCore, into the empty folder it is given. Git,
// Node's own modules, and gh where no workflow's event says whose account holds the repository (hostAccount).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { CORE, OWNER } from "./core-address.mjs";
import { readCore } from "./core-path.mjs";
import { aRepository, logged } from "./guards.mjs";
import { repoOf } from "./inbox.mjs";
import { modulesOf } from "./manifest-reads.mjs";
import { MODULES } from "./reading.mjs";
import { entries, notesAt, quietAt } from "./sync-notes.mjs";

const SHA = /^[0-9a-f]{40}$/;
// a release's name: the word and a whole number above zero, written without leading zeros
export const RELEASE = /^release-([1-9][0-9]{0,8})$/;
// the core's sync notes: what a sync asks of a project beyond the copy (sync-notes.mjs, beside this file)
export { NOTES } from "./sync-notes.mjs";
// Git's own variables that point a command at another repository than the folder it is run in (a hook, or a shell
// that set them, hands them on): left out of every call here and in release.mjs, so each lands in the folder it names
// and nowhere else.
export const elsewhere = /^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|COMMON_DIR|NAMESPACE)$/i;
export const plainEnv = () => Object.fromEntries(Object.entries(process.env).filter(([name]) => !elsewhere.test(name)));
// Git in the bare repository at `dir`, which every call names outright (--git-dir), never finding it from the folder it
// runs in: git refuses that where its safe.bareRepository is `explicit`, as Git 3.0 makes it by default. Each script
// that makes such a repository (fetchCore, sync.mjs, pure-sync.mjs, release.mjs) reaches it through this alone.
export const inBare = (dir, args, options = {}) =>
  execFileSync("git", [`--git-dir=${dir}`, ...args], { cwd: dir, env: plainEnv(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
// An archive git wrote (`input`), unpacked into the folder `dir`, which the caller has just made and which holds nothing yet, never a project's checkout. Tar is run in that folder and
// never given its path: GNU tar, as Git for Windows carries it, unquotes a backslash's escape in the path -C names
// (`kits\now`, a line's end), and Windows' own tar, which the PATH may find first, knows no --force-local (#1212).
// ("-f -": Windows' own reads a tape drive unless told to read its input.) Every script that unpacks an archive of the
// core's does it through this alone.
export const untar = (dir, input) => execFileSync("tar", ["-x", "-f", "-"], { cwd: dir, input });
const git = (args, dir) => inBare(dir, args).trim();
const holds = (args, dir) => { try { git(args, dir); return true; } catch { return false; } };

// A GitHub login: letters, digits and hyphens, as the row's form has it.
const LOGIN = /^[A-Za-z0-9-]+$/;

// The repository's own account as the host gives it, { login, type } (type "User" where a person holds it, as GitHub
// says), or null where it cannot be read: from the event GitHub's runner hands a workflow (GITHUB_EVENT_PATH), else
// asked of gh for `repo` (owner/name: GITHUB_REPOSITORY, else origin's address on github.com). It reads, and never
// guesses (AGENTS.md, "What can be read is never asked or declared"; #481).
export function hostAccount(env = process.env, ask = args => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 30000 })) {
  const said = o => (typeof o?.login === "string" && LOGIN.test(o.login) && typeof o?.type === "string" ? { login: o.login, type: o.type } : null);
  // (the event's own account, where the event is of the repository asked about: GITHUB_REPOSITORY, where it is set)
  try {
    const r = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"))?.repository, o = said(r?.owner);
    if (o && (!env.GITHUB_REPOSITORY || String(r?.full_name ?? "").toLowerCase() === env.GITHUB_REPOSITORY.toLowerCase())) return o;
  } catch { /* (no event to read) */ }
  let repo = env.GITHUB_REPOSITORY;
  if (!repo) try { repo = repoOf(execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); } catch { /* (no origin) */ }
  if (!aRepository(repo)) return null;
  try { return said(JSON.parse(ask(["api", `repos/${repo}`, "--jq", ".owner | {login, type}"]))); } catch { return null; }
}

// The manifest's *owner's account* (core.yml checks the row's form), or, with no such row at all, the repository's own
// account where the host says a person holds it (`host`: as hostAccount gives it, or a function that gives it, asked
// only where no row stands). Null where a row is there twice or in another form, or none is and an organisation, or
// nothing read, holds the repository: whose word counts is never guessed.
export function ownerOf(manifest, host = null) {
  // (the one row of its form decides, as before #481; with none, any row whose first cell names the owner's account,
  // however spelt, is still a row, which no host's answer is read past)
  const lines = String(manifest).split(/\r?\n/);
  const found = lines.map(l => /^\| \*owner's account\* \| `([A-Za-z0-9-]+)` \|$/.exec(l)?.[1]).filter(Boolean);
  if (found.length) return found.length === 1 ? found[0] : null;
  if (lines.some(l => /^\|[^|\n]*owner['’`]?s[ \t]+account[^|\n]*\|/i.test(l))) return null;
  const read = typeof host === "function" ? host() : host;
  return read?.type === "User" && LOGIN.test(read.login ?? "") ? read.login : null;
}

// hostAccount asked once, and only when called (as ownerOf calls it, where no row stands), saying through `say` what it
// read, so that a wrong reading is seen and a row written over it (#481).
export function hostSaid(say = console.log, read = hostAccount) {
  let held;
  return () => {
    if (held !== undefined) return held;
    held = read();
    say(held ? `read from the host: ${held.login}, ${held.type === "User" ? "a person's account" : `an account of the type ${logged(held.type)}`}, holds the repository; a row of core-manifest.md's slots says otherwise where it is wrong` : "read from the host: nothing, so whose account holds the repository is not known");
    return held;
  };
}

// What the project follows, "main" or "releases": its manifest's *follows* row (| *follows* | `releases` |), and with
// no such row, by whose project it is (its owner's account, read as ownerOf reads it with `host`). Null where the row
// is there twice or says anything else, or where there is no row and no one owner's account to go by: a script that
// gets null stops, and never guesses.
export function followsOf(manifest, host = null) {
  const rows = [...manifest.matchAll(/^\|[ \t]*\*follows\*[ \t]*\|(.*)\|[ \t]*$/gm)];
  if (rows.length > 1) return null;
  if (rows.length === 1) return /^`(main|releases)`$/.exec(rows[0][1].trim())?.[1] ?? null;
  const owner = ownerOf(manifest, host);
  if (owner === null) return null;
  return owner.toLowerCase() === OWNER.toLowerCase() ? "main" : "releases";
}

// The core's main and its release tags, with their history, fetched into the empty folder `dir`, so that which commit
// is past which can be told there. (`url` is the tests' own: every other caller takes the core's address.)
export function fetchCore(dir, url = `https://github.com/${CORE}`) {
  git(["init", "-q", "--bare", dir], dir); // (the folder named outright: never a repository git was pointed at)
  git(["fetch", "-q", "--no-tags", url, "+refs/heads/main:refs/heads/main", "+refs/tags/release-*:refs/tags/release-*"], dir);
}

// Whether the commit `older` is `newer` or one it came from; false too where either is no commit there.
export const past = (older, newer, dir) => SHA.test(older) && holds(["merge-base", "--is-ancestor", older, newer], dir);

// The pins the manifest named before `pin`, read from the project's history at `rev` (the sync's HEAD, the proof's
// base), newest first, `rev` itself first: each other commit of the core's main, fetched to `dir`, that a "Core:" line
// of it named, the first the pin before. Their kits are how the one process, and the proof that renders it, know a file
// an earlier kit wrote and no sync since wrote again, as one before the process came (#1246, point 5).
export function pinsBefore(manifest, pin, dir, rev = "HEAD") {
  const run = args => { try { return execFileSync("git", args, { encoding: "utf8", env: plainEnv(), stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }); } catch { return null; } };
  const commits = (run(["log", "--format=%H", "-n", "200", rev, "--", manifest]) ?? "").split("\n").filter(Boolean), pins = [];
  for (const c of [rev, ...commits]) {
    const text = run(["show", `${c}:${manifest}`]);
    let was = null;
    try { was = text === null ? null : readCore(text).pin; } catch { /* (a line out of its form names no pin) */ }
    if (was && was !== pin && !pins.includes(was) && past(was, "refs/heads/main", dir)) pins.push(was);
  }
  return pins;
}

// Every tag there with a release's name, by its number, lowest first, with the commit it stands on: followed through
// to a commit however the tag was made (a tag of a tag too), so a release is never anything but a commit; null where
// it leads to none.
export function namedReleases(dir) {
  return git(["for-each-ref", "--format=%(refname:strip=2)", "refs/tags/"], dir).split("\n")
    .map(name => ({ name, n: Number(RELEASE.exec(name)?.[1]) })).filter(r => Number.isSafeInteger(r.n))
    .map(r => { let sha = null; try { sha = git(["rev-parse", "--verify", "--quiet", `refs/tags/${r.name}^{commit}`], dir); } catch { /* (no commit) */ } return { ...r, sha: SHA.test(sha ?? "") ? sha : null }; })
    .sort((a, b) => a.n - b.n);
}

// The releases in a repository that holds the core's main and its tags, the newest (the highest number) first. A tag
// counts only where its name is a release's, its commit is one of main, and it is at or past the release numbered
// before it: a tag on anything else, or one numbered high on an older commit by mistake, is no release, so the newest
// by number is always the newest in main's history too.
export function releasesIn(dir) {
  const kept = [];
  for (const r of namedReleases(dir)) {
    if (r.sha && past(r.sha, "refs/heads/main", dir) && (!kept.length || past(kept.at(-1).sha, r.sha, dir))) kept.push(r);
  }
  return kept.reverse();
}

// The newest release there, with whether it is past the pin (`moved`: the project's copy is behind it), or null where
// the core has cut none. A pin at or past the newest release has nothing to take: a project never goes back.
export function newestRelease(pin, dir) {
  const [newest] = releasesIn(dir);
  return newest ? { ...newest, moved: newest.sha !== pin && past(pin, newest.sha, dir) } : null;
}

// Whether a copy at `old` is older than the core's last two releases: a commit of main from before the second newest
// release, so that a sync from it jumps past two at least (tasks/cleaning.md, "A project is read against the core
// once, then for what each release changes"; #464). False where the core has cut fewer than two, or `old` is no
// commit of main there.
export function jumped(old, dir) {
  const [, second] = releasesIn(dir);
  return !!second && past(old, "refs/heads/main", dir) && !past(second.sha, old, dir);
}

// The newest commit of the core's main whose checks all passed, which a project that follows main takes (floor rule
// 12: the core's users get a release, and main may be red until its fix merges; #733): of the last `depth` commits of
// main's first line, newest first, the first that `held` lets stand, as the host lists the runs its push to main
// started (`ask`, the route's answer as text). { sha, said }, `sha` null where none of them passed, or where the host
// cannot be asked: nothing is taken that was not read to pass, and a full SHA still takes any commit (sync.mjs).
export function greenMain(dir, ask = route => execFileSync("gh", ["api", route], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 30000 }), depth = 30) {
  const shas = git(["rev-list", "--first-parent", "-n", String(depth), "refs/heads/main"], dir).split("\n").filter(x => SHA.test(x));
  for (const [i, sha] of shas.entries()) {
    let list;
    try { list = JSON.parse(ask(`repos/${CORE}/actions/runs?head_sha=${sha}&branch=main&event=push&per_page=100`)); }
    catch { return { sha: null, said: `the host could not be asked for the checks of the core's main (gh signed in answers it), so no commit of it is taken` }; }
    if (!held(list).length) return { sha, said: i === 0 ? `the core's main is at ${sha.slice(0, 7)}, its checks all passed` : `the core's main is at ${shas[0].slice(0, 7)}, whose checks have not all passed; the newest whose have is ${sha.slice(0, 7)}, ${i} commits back` };
  }
  return { sha: null, said: `none of the last ${shas.length} commits of the core's main has passed all its checks yet` };
}

// This repository's own release workflow: its runs on a commit are no check of that commit.
export const OWN = ".github/workflows/release.yml";

// Why a release may not stand on a commit yet, each reason a line, from GitHub's list of the workflow runs that the
// push of that commit to main started (repos/<core>/actions/runs?head_sha=<sha>&branch=main&event=push); none where
// it may. It may where every such run has finished and passed, and at least one did more than skip: a run still going,
// one that failed or was cancelled, a list read only in part, and a commit no check has run on yet each hold it, so a
// release never stands on a commit whose checks the core's own main has not passed. Nothing is guessed: a list in any
// other form holds it too.
export function held(list, own = OWN) {
  const runs = list?.workflow_runs;
  if (!Array.isArray(runs) || !Number.isSafeInteger(list.total_count)) return ["the list of the checks on it could not be read"];
  if (list.total_count !== runs.length) return [`${list.total_count} runs stand on it and ${runs.length} were read`];
  const checks = runs.filter(r => r?.path !== own);
  const passed = r => r?.status === "completed" && ["success", "skipped", "neutral"].includes(r.conclusion);
  const reasons = checks.filter(r => !passed(r)).map(r => `${r?.name ?? "a check"}: ${r?.status === "completed" ? r.conclusion : r?.status ?? "unreadable"}`);
  if (!reasons.length && !checks.some(r => r.conclusion === "success")) reasons.push("no check has passed on it yet");
  return reasons;
}


// What taking the core from `old` to `pin` asks of a project beyond the copy: the entries the sync notes hold at `pin`
// and did not at `old`, each read whole, in a file or in the folder (a commit from before the notes gives every entry),
// or null where either commit cannot be read: never an all-clear.
export function asksBetween(old, pin, dir) {
  try {
    for (const rev of [old, pin]) git(["rev-parse", "--verify", "--quiet", `${rev}^{commit}`], dir);
    const at = rev => entries(notesAt(rev, args => inBare(dir, args)));
    const before = new Set(at(old));
    return at(pin).filter(l => !before.has(l));
  } catch { return null; }
}
// What the report a sync prints asks of a project (#1094): the entries asksBetween gives, but those whose step says it
// asks nothing of what stands, which stay in the notes and are counted: { asks, quiet }, or null where asksBetween is.
export function asksLeft(old, pin, dir) {
  const all = asksBetween(old, pin, dir);
  if (all === null) return null;
  const quiet = quietAt(pin, args => inBare(dir, args));
  return { asks: all.filter(l => !quiet.has(l)), quiet: all.filter(l => quiet.has(l)).length };
}

// The core's own files that no project reads (#342): its queue, and each of its workflows that no project can call,
// named one by one, never by a pattern (each has no workflow_call trigger and no starter-kit file names it:
// releases-test.mjs).
export const OWN_FILES = ["QUEUE.md", ".github/workflows/own-description.yml", ".github/workflows/own-look.yml",
  ".github/workflows/own-security-review.yml", ".github/workflows/release.yml", ".github/workflows/size.yml",
  ".github/workflows/tests.yml"];

// What never matters to a project (#242; README.md, point 1): a list exact and short, never a guess. A module its
// manifest's "Modules:" line does not name and its "Not taken:" line does (any other module matters: one the list
// forgot, or every one where the line says "all" or cannot be read), a test of the core's own scripts (which nothing a
// project runs names: releases-test.mjs), under tests/, which the copy leaves out, or under scripts/, where releases
// before #527 held them, the core's own issue forms, and OWN_FILES. Every other file of the core is something the
// project takes.
export function matters(file, manifest) {
  if (/^scripts\/[^/]+-test\.mjs$/.test(file) || file.startsWith("tests/") || file.startsWith(".github/ISSUE_TEMPLATE/") || OWN_FILES.includes(file)) return false;
  const module = MODULES.includes(file.slice(0, Math.max(0, file.lastIndexOf("/")))) && file.endsWith(".md") ? file.slice(file.lastIndexOf("/") + 1) : undefined;
  const { taken, notTaken } = modulesOf(manifest);
  return !(module && taken instanceof Set && !taken.has(module) && notTaken.has(module));
}

// What of what the project takes changed from `old` to `pin` (each file, a removed or renamed one by both its names),
// or null where the change cannot be read: never an all-clear.
export function takenBetween(old, pin, manifest, dir) {
  let files;
  try { files = inBare(dir, ["diff", "--name-only", "--no-renames", "-z", old, pin]).split("\0").filter(Boolean); } catch { return null; }
  return files.filter(f => matters(f, manifest));
}

// Whether a project that follows the releases stays at its pin, the newest release asking no sync of it (#242): its pin
// is the release just before the newest, and nothing it takes changed between the two. One release at most is passed
// over: the upgrade test proves a sync from each of the last two (upgrade-test.mjs), so a project that stayed syncs at
// the next release, whatever that one changes. In doubt it syncs.
export function staysAt(pin, manifest, dir) {
  const [newest, before] = releasesIn(dir);
  if (!newest || before?.sha !== pin || newest.sha === pin) return false;
  return takenBetween(pin, newest.sha, manifest, dir)?.length === 0;
}
