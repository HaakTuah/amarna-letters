// The core has moved (README.md, "How a project takes the core", point 5), for a project whose orchestrator does not
// wake every day: it compares the commit the project's core-manifest.md pins with the newest of what the project
// follows (releases.mjs, beside this file: the newest commit of the core's main whose checks all passed, or the core's newest release, which
// has moved only where it is past the pin and changes something the project takes) and keeps one issue open for the owner while the project is behind, saying
// what changed and how a session takes it; once the project holds it again, it closes that issue. It opens no pull
// request and changes no file: a session makes the sync (sync.mjs, beside this file), since a pull request a workflow
// opens gets no checks without a stored token. Run once a day by the core-moved workflow
// (.github/workflows/core-moved.yml), with a token that may write issues and nothing else. Git, gh and Node's own
// modules; run from the project's root.
//
//   node core/scripts/core-moved.mjs          the check, as the workflow runs it (GITHUB_REPOSITORY and GH_TOKEN set)
//   node core/scripts/core-moved.mjs --dry    says what it would do, and does nothing
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { aRepository } from "./guards.mjs";
import { CORE } from "./core-address.mjs";
import { readCore } from "./core-path.mjs";
import { fetchCore, followsOf, greenMain, hostSaid, newestRelease, ownerOf, past, staysAt } from "./releases.mjs";
import { started } from "./started.mjs";

// The one issue it keeps: found again by this title among the issues the workflow itself opened.
export const TITLE = "The core has moved past this project's copy";
const BOT = "github-actions[bot]";

// The commit the manifest pins (the line sync.mjs moves), at whatever path it names (core-path.mjs), or null where the
// manifest has no one such line, a carried core's among them, which pins nothing here.
export function pinOf(manifest) {
  return readCore(manifest).pin ?? null;
}

// What to do: nothing, close the open issue, bring it up to date, or open one. `moved`: whether what the project
// follows is past its pin; `open`: the open issue's number, if any.
export function plan(moved, open) {
  if (!moved) return open ? "close" : "nothing";
  return open ? "update" : "open";
}

// The issue's text: both commits are 40 hex characters by the time they reach it, and a release's name is the word
// and a number (releases.mjs); nothing else is put in. `release`: the name, where the project follows the releases.
export function body(pin, newest, release = "") {
  return [
    `${release ? `The core's newest release, \`${release}\`,` : "The core's `main`"} is at \`${newest}\`; this project holds \`${pin}\`.`,
    "",
    `What changed: https://github.com/${CORE}/compare/${pin}...${newest}`,
    "",
    "To take it, a session runs `node core/scripts/sync.mjs` on a branch of its own and opens the sync pull request " +
      '(the core\'s README, "How a project takes the core", point 1), then does what the sync asks of the project ' +
      "itself, in a pull request of its own (`core/setup/sync-notes.md`). This issue closes by itself once the " +
      `project holds ${release ? "that release, or a later commit of the core's main" : "the newest commit"}.`,
    "",
  ].join("\n");
}

// What gh prints for each open issue: its number, author and title as one JSON array on a line of its own, so that
// nothing a title holds (a tab, a line break) can pass for another issue's line.
export const ISSUES = ".[] | select(.pull_request | not) | [.number, .user.login, .title] | @json";

// The number of the open issue this workflow opened under TITLE, from those lines; a line that is no such array
// counts for nothing.
export function openIssue(lines) {
  for (const line of lines.split("\n")) {
    let issue;
    try { issue = JSON.parse(line); } catch { continue; }
    if (!Array.isArray(issue) || issue.length !== 3) continue;
    const [number, author, title] = issue;
    if (Number.isSafeInteger(number) && number > 0 && author === BOT && title === TITLE) return String(number);
  }
  return null;
}

// The pin of the project's own copy; null, said, where a library carries the core, which moves with the library, whose
// own repository keeps this issue (tasks/repositories.md).
function pinHere(manifest, fail) {
  const line = readCore(manifest);
  if (line.wrong) fail(line.wrong);
  if (line.form === "copied") return line.pin;
  console.log(`the core here is the one the library at ${line.library} carries: the library's own repository says when the core has moved, and a sync there reaches this one with the library. Nothing to do.`);
  return null;
}

// Whose account holds the repository, asked of the host once, and only where the manifest has no row that says it.
const host = hostSaid();

const fail = msg => { console.error(`FAIL: ${msg}`); process.exit(1); };
const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

// The core's newest commit the project follows, as { newest, moved, release, stays }: its main, or its newest release.
function newestOf(follows, pin, manifest) {
  let newest, moved, release = "", stays = false;
  if (follows === "main") {
    // (main's newest commit whose checks all passed, which needs its history: fetched as the releases' is; #733)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "core-main-"));
    let green = null;
    try { fetchCore(dir); green = greenMain(dir); moved = !!green.sha && green.sha !== pin && past(pin, green.sha, dir); }
    catch { /* (said below, once the folder is gone) */ } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    if (!green) fail("the core's main could not be fetched");
    console.log(green.said);
    newest = green.sha ?? pin;
    if (!green.sha) return { newest, moved: false, release, stays, unread: true };
  } else {
    // (which commit is past which takes the core's history: fetched into a folder of its own, removed again)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "core-releases-"));
    let found, fetched = true;
    try { fetchCore(dir); found = newestRelease(pin, dir); stays = !!found?.moved && staysAt(pin, manifest, dir); } catch { fetched = false; } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    if (!fetched) fail("the core's main and releases could not be fetched");
    ({ sha: newest, moved, name: release } = found ?? { sha: pin, moved: false, name: "" });
    if (stays) moved = false; // (a release that changes nothing the project takes asks no sync: #242)
  }
  return { newest, moved, release, stays };
}

// What the project and the core stand at, in a line.
const standing = (follows, pin, { newest, release, stays, unread }, what) => follows === "main"
  ? unread ? `the project holds ${pin.slice(0, 7)}, and no commit of the core's main was read to pass: ${what}` : `the project holds ${pin.slice(0, 7)}, the core's main is at ${newest.slice(0, 7)}: ${what}`
  : release
    ? `the project holds ${pin.slice(0, 7)}, the core's newest release, ${release}, is at ${newest.slice(0, 7)}${stays ? " and changes nothing the project takes" : ""}: ${what}`
    : `the project holds ${pin.slice(0, 7)}, and the core has cut no release yet: ${what}`;

// What the plan says to do to the open issue: close it, update it or open it.
function settle(what, { pin, manifest, repo, open, found }) {
  if (what === "close") {
    run("gh", ["issue", "close", open, "--repo", repo, "--comment", found.stays
      ? "The core's newest release changes nothing this project takes: it stays at its pin until the next release."
      : "The project holds the core's newest commit again."]);
    return;
  }
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "core-moved-")), "body.md");
  fs.writeFileSync(file, body(pin, found.newest, found.release));
  if (what === "update") { run("gh", ["issue", "edit", open, "--repo", repo, "--body-file", file]); return; }
  const owner = ownerOf(manifest, host) ?? fail("core-manifest.md has no one *owner's account* row, and the host says no person holds the repository");
  run("gh", ["issue", "create", "--repo", repo, "--title", TITLE, "--body-file", file, "--label", "enhancement", "--assignee", owner]);
}

function main(dry) {
  let manifest;
  try { manifest = fs.readFileSync("core-manifest.md", "utf8"); } catch { fail("run it from a project's root, beside core-manifest.md"); }
  const pin = pinHere(manifest, fail);
  if (!pin) return;
  const follows = followsOf(manifest, host);
  if (!follows) fail("core-manifest.md does not say what the project follows: its *follows* row is `main` or `releases`, once, or left out where the owner's account is read: its one row, or the repository's own account where the host says a person holds it");
  const found = newestOf(follows, pin, manifest);
  const repo = process.env.GITHUB_REPOSITORY;
  if (!dry && !aRepository(repo)) fail("GITHUB_REPOSITORY names no repository as <owner>/<name>. Mend: run the check in the workflow, where GitHub sets it, or with --dry");
  const open = dry ? null : openIssue(run("gh", ["api", "--paginate",
    `repos/${repo}/issues?state=open&labels=enhancement&per_page=100`,
    "--jq", ISSUES]));
  // (where no commit of main was read to pass, an open issue is left as it stands: nothing says the project holds it)
  const what = found.unread ? "nothing" : plan(found.moved, open);
  console.log(standing(follows, pin, found, what));
  if (dry || what === "nothing") return;
  settle(what, { pin, manifest, repo, open, found });
}

if (started(import.meta.url)) main(process.argv.includes("--dry"));
