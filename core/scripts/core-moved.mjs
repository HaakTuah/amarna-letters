// The core has moved (README.md, "How a project takes the core", point 5), for a project whose orchestrator does not
// wake every day: it compares the commit the project's core-manifest.md pins with the newest commit of the core's main
// and keeps one issue open for the owner while they differ, saying what changed and how a session takes it; once the
// project holds the newest commit again, it closes that issue. It opens no pull request and changes no file: a session
// makes the sync (sync.mjs, beside this file), since a pull request a workflow opens gets no checks without a stored
// token. Run once a day by the core-moved workflow (.github/workflows/core-moved.yml), with a token that may write
// issues and nothing else. Git, gh and Node's own modules; run from the project's root.
//
//   node core/scripts/core-moved.mjs          the check, as the workflow runs it (GITHUB_REPOSITORY and GH_TOKEN set)
//   node core/scripts/core-moved.mjs --dry    says what it would do, and does nothing
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { started } from "./started.mjs";

const CORE = "HaakTuah/agent-core";
const SHA = /^[0-9a-f]{40}$/;
// The one issue it keeps: found again by this title among the issues the workflow itself opened.
export const TITLE = "The core has moved past this project's copy";
const BOT = "github-actions[bot]";

// The commit the manifest pins (the line sync.mjs moves), or null where the manifest has no one such line.
export function pinOf(manifest) {
  const found = [...manifest.matchAll(new RegExp(`^Core: ${CORE} at ([0-9a-f]{40}), copied whole under core/`, "gm"))];
  return found.length === 1 ? found[0][1] : null;
}

// The manifest's *owner's account*, whose issue this is (core.yml checks the row's form), or null.
export function ownerOf(manifest) {
  const found = [...manifest.matchAll(/^\| \*owner's account\* \| `([A-Za-z0-9-]+)` \|$/gm)];
  return found.length === 1 ? found[0][1] : null;
}

// What to do: nothing, close the open issue, bring it up to date, or open one. `open`: the open issue's number, if any.
export function plan(pin, newest, open) {
  if (pin === newest) return open ? "close" : "nothing";
  return open ? "update" : "open";
}

// The issue's text: both commits are 40 hex characters by the time they reach it, and nothing else is put in.
export function body(pin, newest) {
  return [
    `The core's \`main\` is at \`${newest}\`; this project holds \`${pin}\`.`,
    "",
    `What changed: https://github.com/${CORE}/compare/${pin}...${newest}`,
    "",
    "To take it, a session runs `node core/scripts/sync.mjs` on a branch of its own and opens the sync pull request " +
      '(the core\'s README, "How a project takes the core", point 1), then does what the sync asks of the project ' +
      "itself, in a pull request of its own (`core/setup/sync-notes.md`). This issue closes by itself once the " +
      "project holds the newest commit.",
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

function main(dry) {
  const fail = msg => { console.error(`FAIL: ${msg}`); process.exit(1); };
  const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  let manifest;
  try { manifest = fs.readFileSync("core-manifest.md", "utf8"); } catch { fail("run it from a project's root, beside core-manifest.md"); }
  const pin = pinOf(manifest);
  if (!pin) fail(`core-manifest.md has no one "Core: ${CORE} at <full commit SHA>, copied whole under core/" line`);
  const newest = run("git", ["ls-remote", `https://github.com/${CORE}`, "refs/heads/main"]).split(/\s/)[0];
  if (!SHA.test(newest)) fail("the core's main gave no commit");
  const repo = process.env.GITHUB_REPOSITORY;
  if (!dry && !/^[\w.-]+\/[\w.-]+$/.test(repo ?? "")) fail("GITHUB_REPOSITORY names no repository");
  const open = dry ? null : openIssue(run("gh", ["api", "--paginate",
    `repos/${repo}/issues?state=open&labels=enhancement&per_page=100`,
    "--jq", ISSUES]));
  const what = plan(pin, newest, open);
  console.log(`the project holds ${pin.slice(0, 7)}, the core's main is at ${newest.slice(0, 7)}: ${what}`);
  if (dry || what === "nothing") return;
  if (what === "close") {
    run("gh", ["issue", "close", open, "--repo", repo, "--comment", "The project holds the core's newest commit again."]);
    return;
  }
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "core-moved-")), "body.md");
  fs.writeFileSync(file, body(pin, newest));
  if (what === "update") { run("gh", ["issue", "edit", open, "--repo", repo, "--body-file", file]); return; }
  const owner = ownerOf(manifest) ?? fail("core-manifest.md has no one *owner's account* row");
  run("gh", ["issue", "create", "--repo", repo, "--title", TITLE, "--body-file", file, "--label", "enhancement", "--assignee", owner]);
}

if (started(import.meta.url)) main(process.argv.includes("--dry"));
