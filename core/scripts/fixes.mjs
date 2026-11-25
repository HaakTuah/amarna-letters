// The bugs fixed since a day, for the sign of the core's record "the core's scripts stay in JavaScript with no type
// checker" (CHOICES.md; #515, point 2), read at each pass over the records: each closed issue labelled `bug`, closed on
// or after the day, with each commit on the default branch's first-parent line whose message says it fixes it ("Fixes
// #12", or closes or resolves) and that changed a script that is no test (scripts/*.mjs, not *-test.mjs); printed with
// that commit, the tree before it (its first parent) and the lines of each such script the fix changed, as they stood
// in that tree. The pass runs the type checker on each tree as the record says and counts the fixes where a finding
// points at a line printed here. It reads only. git, gh and Node's own modules.
//
//   node scripts/fixes.mjs --since YYYY-MM-DD
import { execFileSync } from "node:child_process";
import { DAY, defaultRef, repoOf } from "./core-cost.mjs";
import { started } from "./started.mjs";

// A script the checker is run on: one of scripts/, and no test.
export const SCRIPT = /^scripts\/[^/]+\.mjs$/u;
export const scriptOf = file => SCRIPT.test(file) && !/-test\.mjs$/u.test(file);

// The issues a commit's message says it fixes: "Fixes #12", "closes #3, fixes #4" (GitHub's own words for it).
export const fixedBy = message => [...String(message ?? "").matchAll(/\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\s*:?\s+#(\d+)\b/giu)].map(m => Number(m[1]));

// The lines of each file a diff with no context (git diff -U0) changed, as they stood before it: { file: [line, ...] }.
// A hunk that only adds lines changed none of the old, and is placed at the line it follows, so a finding there counts.
export function changedLines(diff) {
  const out = {};
  let file = null;
  for (const line of String(diff ?? "").split("\n")) {
    const named = /^--- (?:a\/(.+)|\/dev\/null)$/u.exec(line);
    if (named) { file = named[1] ?? null; continue; }
    const hunk = /^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@/u.exec(line);
    if (!hunk || !file) continue;
    const start = Number(hunk[1]), count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const lines = count ? Array.from({ length: count }, (_, i) => start + i) : [Math.max(start, 1)];
    (out[file] ??= []).push(...lines);
  }
  return out;
}

// A whole object id of git's, as it prints one: 40 hex digits, or 64 in a repository of SHA-256.
export const OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

// The commits of `git log --format="%H %P"`, each { sha, parent, second }: a line whose ids are not all whole object
// ids is left out, and a commit with no parent (the first, or one a shallow clone cut) has a null one.
export const parentsOf = text => String(text ?? "").split("\n").map(l => l.trim().split(" ")).filter(ids => ids[0] && ids.every(id => OID.test(id)))
  .map(([sha, parent = null, second = null]) => ({ sha, parent, second }));

// The fixes of the issues `bugs` (their numbers) among the commits `log` ([{ sha, parent, message, brought }], newest
// first; `brought`, of a merge, the commits it brought in), each { issue, sha, parent }: every commit with a parent
// that says it fixes one, so a bug fixed twice shows both, save a merge's own word for an issue a commit it brought
// already fixes, which is that one fix said again.
export const fixesOf = (bugs, log) => log.filter(c => c.parent).flatMap(c => {
  const own = fixedBy(c.message).filter(n => bugs.includes(n) && !(c.brought ?? []).some(b => fixedBy(b.message).includes(n)))
    .map(issue => ({ issue, sha: c.sha, parent: c.parent }));
  return [...own, ...fixesOf(bugs, c.brought ?? [])];
});

// The day the command was given, or null where it was given none or one that is no day.
export const sinceOf = argv => {
  const since = argv[argv.indexOf("--since") + 1];
  return argv.includes("--since") && DAY.test(since ?? "") ? since : null;
};
export const NO_DAY = "--since takes a day, YYYY-MM-DD: the day on the line \"Read whole:\" of CHOICES.md";

function main(argv) {
  const fail = msg => { console.error(`FAIL: ${msg}`); process.exit(1); };
  const since = sinceOf(argv);
  if (!since) fail(NO_DAY);
  const git = args => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
  const repo = repoOf();
  if (!repo) fail("the repository is not known (GITHUB_REPOSITORY, or origin's address)");
  const ref = defaultRef(name => { try { git(["rev-parse", "--verify", "--quiet", `${name}^{commit}`]); return true; } catch { return false; } });
  if (!ref) fail("the clone knows no default branch: neither origin's, nor a main of origin's or of its own");
  const bugs = execFileSync("gh", ["api", "--paginate", `repos/${repo}/issues?state=closed&labels=bug&since=${since}T00:00:00Z&per_page=100`,
    "--jq", `.[] | select(.pull_request == null and .closed_at >= "${since}") | .number`], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })
    .split("\n").filter(Boolean).map(Number);
  // (the default branch's own commits since the day, and, of each merge of a pull request among them, the commits it
  // brought, through which it fixes; a merge whose second parent this clone lacks, a shallow one's, brings none)
  // (hashes and parents read apart from any message, each kept only as a whole object id, and each message read by its
  // commit's id alone, so nothing a message holds reaches a git command as an argument)
  const commits = range => parentsOf(git(["log", "--format=%H %P", ...range]))
    .map(c => ({ ...c, message: git(["log", "-1", "--format=%B", c.sha]) }));
  const log = commits(["--first-parent", `--since=${since}T00:00:00Z`, ref]);
  for (const c of log) if (c.second && c.parent) try { c.brought = commits([`${c.parent}..${c.second}`]); } catch { c.brought = []; }
  const fixes = fixesOf(bugs, log);
  let read = 0, unread = 0;
  for (const f of fixes) {
    let diff;
    try { diff = git(["diff", "-U0", "--no-renames", f.parent, f.sha]); } catch { unread++; console.log(`#${f.issue} fixed in ${f.sha}: the tree before it is not in this clone (fetch its history: git fetch --unshallow)`); continue; }
    const lines = Object.entries(changedLines(diff)).filter(([file]) => scriptOf(file));
    if (!lines.length) continue;
    read++;
    console.log(`#${f.issue} fixed in ${f.sha}, the tree before it ${f.parent}:`);
    for (const [file, at] of lines) console.log(`  ${file}: ${at.join(",")}`);
  }
  console.log(`${read} fixes of ${bugs.length} bugs closed since ${since} changed a script that is no test${unread ? `; ${unread} could not be read in this clone` : ""}.`);
}

if (started(import.meta.url)) main(process.argv.slice(2));
