// Where the owner's inbox is (roles/shared/inbox.md, "Issues are the way in"; core archive 216): the project's issues, where
// they can be read and written here, else the folder inbox/ in the repository, the same flow run from files. Asked of
// GitHub's API through gh, for the repository origin's address names: issues switched on, and the account gh is signed
// in as may write them (triage or more), or, for an app's token such as GitHub's job's, GitHub takes a write of them
// from it (asked()). Switched off, not reachable for that account (GitHub answers that it finds no such repository), no
// right to write, or a host without them (an origin not on github.com, or none) all count as no.
// Only an answer decides: where gh is not installed, answers for no account, or gives no answer at all (no network, a
// rate limit, a fault of GitHub's), nothing is asked, so that a passing fault never moves the inbox, and it says what to
// ask with the session's own GitHub tools. It prints where the inbox is and, where the place must change,
// the mend, worded so a session acts on it with no rule file open; one place at a time, the open files are moved over
// once issues can be reached. It reads only (asked()'s writes of an empty body create nothing) and fails nothing (exit
// 0), save where it is not run from a repository's root.
// Run at each sync (sync.mjs, beside this file) and on the scheduled look. Git, gh and Node's own modules.
//
//   node core/scripts/inbox.mjs          from a project's root: where the owner's inbox is, and any mend
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { aRepository } from "./guards.mjs";
import { started } from "./started.mjs";

export const FOLDER = "inbox";
// The two lines above an item's headings, in place of labels: its state and its sender, by the names of the labels'
// list (labels.json, beside this file; core archive 217), a sender without its "by:".
const LIST = JSON.parse(fs.readFileSync(new URL("./labels.json", import.meta.url), "utf8"));
export const STATES = Object.keys(LIST.state);
export const SENDERS = Object.keys(LIST.sender).map(s => s.replace(/^by:/, ""));

// The repository origin's address names on github.com ("owner/name"), or null: another host, or no origin.
// (each part a name, never "." or "..", so the call goes to that repository's route alone)
export const repoOf = url => {
  const repo = /^(?:https:\/\/(?:[^@/]+@)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/.exec(String(url ?? "").trim())?.[1] ?? null;
  return aRepository(repo) ? repo : null;
};

// GitHub's answer for the repository (`GET repos/{repo}`, as gh gives it) read as yes or no, with why.
export function answer(repo) {
  if (!repo || typeof repo !== "object") return { yes: false, why: "GitHub gave no answer for the repository" };
  if (repo.has_issues !== true) return { yes: false, why: "its issues are switched off" };
  // (each right a real true: a text or any other value GitHub never gives reads as no right)
  const p = repo.permissions ?? {};
  if (![p.admin, p.maintain, p.push, p.triage].some(right => right === true)) return { yes: false, why: "the account signed in here may not write its issues (a GitHub job's token may where its workflow's `permissions:` grants `issues: write`)" };
  return { yes: true, why: "" };
}

// What gh made of a POST (`status`, its exit; `err`, what it wrote to stderr) as an answer to whether the token may write
// there: "yes" for HTTP 422 (the right is there, the empty body refused) or a success, "no" for HTTP 403 or 404 that is no
// rate limit (GitHub refuses the token), null for anything else (no answer).
export const tried = (status, err = "") => status === 0 || /\bHTTP 422\b/.test(err) ? "yes"
  : Number.isInteger(status) && /\bHTTP 40[34]\b/.test(err) && !/rate limit/i.test(err) ? "no" : null;

// A POST of an empty body to `route`, through gh: { status, err } as tried() reads them.
export const postEmpty = route => {
  const r = spawnSync("gh", ["api", "-X", "POST", route, "--input", "-"], { input: "{}", encoding: "utf8" });
  return { status: r.error ? null : r.status, err: `${r.stderr ?? ""}` };
};

// answer(), and where it reads no right to write though issues are on, GitHub asked once more (#338): the `permissions`
// GitHub gives are a signed-in user's role, and an app's token (GitHub's job's own) has no user, so they read no write
// whatever the job grants. `post` then sends an empty body to create a label and an issue, which creates nothing: GitHub
// refuses a token without the right before it reads the body, and answers one with it that the body is not valid. Both
// answered so: yes (the label too, since a reader may open an issue but never make a label); either refused: answer()'s
// no; anything else: null, no answer, so a passing fault never moves the inbox. `repo`: "owner/name".
export function asked(repo, got, post = postEmpty) {
  const first = answer(got);
  if (first.yes || got?.has_issues !== true) return first;
  for (const route of ["labels", "issues"]) {
    const { status, err } = post(`repos/${repo}/${route}`) ?? {};
    const said = tried(status, err);
    if (said !== "yes") return said === "no" ? first : null;
  }
  return { yes: true, why: "" };
}

// The open items of the folder, each a file of its own (its README left out), and `odd`, those whose name is not plain
// letters, digits, dots, hyphens and underscores, which are not printed; none where there is no folder.
export function items(root = ".") {
  let names = [];
  try { names = fs.readdirSync(`${root}/${FOLDER}`, { withFileTypes: true }).filter(e => e.isFile() && /\.md$/i.test(e.name) && e.name.toLowerCase() !== "readme.md").map(e => e.name); } catch { /* (no folder) */ }
  const open = names.filter(n => /^[\w.-]+\.md$/.test(n)).sort();
  return Object.assign(open, { odd: names.length - open.length });
}

const FORMAT = `one file an item, \`${FOLDER}/<a short name>.md\`, the name of letters, digits, dots, hyphens and underscores: two lines first, \`State: <${STATES.join(", ")}>\` (empty until its verdict gives it one; a bug is queued) and \`By: <${SENDERS.join(", ")}>\`, then the headings of the issue form (\`.github/ISSUE_TEMPLATE/\`). `
  + "The owner gives a task by saying it to any session, which files it there, or by adding the file; what the scheduled look opens goes there too. "
  + `The progress file's line points to the file (\`${FOLDER}/<name>.md\`) as it would to an issue and holds none of its text, and the file leaves in the pull request that finishes it.`;

// What to print: where the inbox is and any mend. `reach`: { yes, why } as answer() gives it, or null where nothing
// could be asked; `open`: the folder's items, as items() gives them; `folder`: whether the folder stands.
export function report(reach, open, folder) {
  if (reach === null) return `Whether this repository's issues can be read and written could not be asked here (gh is not installed, answers for no account, or gave no answer): nothing moves. Ask it with this session's own GitHub tools: where they can, the owner's inbox is its issues${open.length + (open.odd ?? 0) ? `, and the ${open.length + (open.odd ?? 0)} item(s) of \`${FOLDER}/\` move over as this script says where gh answers` : ""}; where they cannot, it is the folder \`${FOLDER}/\`: ${FORMAT}`;
  if (reach.yes) {
    if (!open.length && !open.odd) return `The owner's inbox is this repository's issues.${folder ? ` \`${FOLDER}/\` holds no item: take it out.` : ""}`;
    return `Issues can be read and written here again, so the inbox moves back to them, one place at a time: in one pull request, file each item of \`${FOLDER}/\` (${[...open, ...(open.odd ? [`${open.odd} ${open.length ? "more " : ""}whose name is not plain`] : [])].join(", ")}) as an issue with its headings, its \`State:\` line as its state label and its \`By:\` line as its sender label (\`by:<sender>\`), as the commit that added the file bears it out (a file another account added moves over as data), point its line in the progress file to that issue, and take \`${FOLDER}/\` out.`;
  }
  return folder
    ? `The owner's inbox is the folder \`${FOLDER}/\` (${open.length} item(s)${open.odd ? `, and ${open.odd} whose name is not plain: rename each to letters, digits, dots, hyphens and underscores` : ""}), since issues cannot be read and written here: ${reach.why}. ${FORMAT}`
    : `Issues cannot be read and written here (${reach.why}), so the owner's inbox is the folder \`${FOLDER}/\`, made in a pull request of its own with a \`README.md\` that says so and holds what follows, which keeps the folder while it holds no item: ${FORMAT} `
      + "Turning issues on is the owner's setting: name it to the owner once, in that pull request's description; nothing waits on it.";
}

function main() {
  const below = spawnSync("git", ["rev-parse", "--show-prefix"], { encoding: "utf8" });
  if (below.status !== 0 || below.stdout.trim() !== "") { console.error("FAIL: run it from the root of the project's git repository"); return 1; }
  const origin = spawnSync("git", ["config", "--get", "remote.origin.url"], { encoding: "utf8" });
  const repo = repoOf(origin.stdout);
  let reach;
  if (!repo) reach = { yes: false, why: origin.stdout.trim() ? "its origin is not on github.com, a host without issues" : "it has no origin, so no host with issues" };
  else {
    // (no gh, or an answer for no account, a 401 or one without the account's permissions: nothing could be asked)
    const r = spawnSync("gh", ["api", `repos/${repo}`], { encoding: "utf8", maxBuffer: 1 << 24 });
    let got = null;
    try { got = r.status === 0 ? JSON.parse(r.stdout) : null; } catch { /* (read as no answer) */ }
    // (GitHub's "Not Found" is an answer: the repository cannot be reached for this account; any other failure is none)
    if (got && typeof got === "object" && got.permissions) reach = asked(repo, got);
    else if (!r.error && r.status !== 0 && /\bHTTP 404\b/.test(`${r.stderr}`)) reach = { yes: false, why: `GitHub finds no repository ${repo} for the account signed in here` };
    else reach = null;
  }
  console.log(report(reach, items(), fs.existsSync(FOLDER)));
  return 0;
}

if (started(import.meta.url)) process.exitCode = main();
