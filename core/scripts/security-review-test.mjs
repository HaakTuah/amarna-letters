// Checks the security-review check (security-review.mjs, beside this file): what counts as proof that a pull
// request's security review has run, and the status it gives. Run by the core's tests workflow
// (.github/workflows/tests.yml).
//
//   node scripts/security-review-test.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTEXT, judge, status } from "./security-review.mjs";

let failed = 0;
const ok = (cond, what) => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) failed++; };
const HEAD = "a".repeat(40);
const SEEN = "b".repeat(40);
const pull = { state: "open", draft: false, head: { sha: HEAD } };
const brace = (text) => text.replaceAll("{", "&#123;").replaceAll("}", "&#125;");
// the summary as Codex's app writes it: a first line, then its state in a comment, its braces as entities
const summary = (security, at = "2026-11-12T10:00:00Z", who = { login: "chatgpt-codex-connector[bot]", type: "Bot" }) => ({
  user: who, author_association: "NONE", updated_at: at,
  body: `<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 ${brace(JSON.stringify({ code_review: { commit_sha: null, status: null }, security_review: security }))} -->\n<details>the table</details>`,
});
const done = { commit_sha: SEEN, has_any_findings: null, has_unresolved_findings: null, status: "completed" };
const running = { ...done, status: "running" };
const said = (body, assoc = "OWNER", at = "2026-11-12T11:00:00Z") => ({ user: { login: "someone", type: "User" }, author_association: assoc, created_at: at, updated_at: at, body });
// a finding of Codex's security review, as its app posts one on a line of the change
const finding = (at, who = { login: "chatgpt-codex-connector[bot]", type: "Bot" }) => ({ user: who, author_association: "NONE", created_at: at, path: "a.js", line: 3, body: "<!-- codex-security-review-finding:v1 -->\n\n### Codex Security Review\n\nA finding." });
const open = { ...done, has_any_findings: true, has_unresolved_findings: true };
const is = (verdict, isDone, words) => verdict?.sha === HEAD && verdict.done === isDone && verdict.why.includes(words);

// Nothing to mark.
ok(judge({ ...pull, state: "closed" }, [summary(done)]) === undefined && judge({ ...pull, draft: true }, [summary(done)]) === undefined, "a closed pull request and a draft get no status");
ok(judge({ ...pull, head: { sha: "main" } }, []) === undefined && judge({ ...pull, head: null }, []) === undefined && judge(null, []) === undefined && judge({ state: "open", head: { sha: HEAD } }, []) === undefined, "nor one with no commit to name, or not said to be no draft");

// Codex's own summary.
ok(is(judge(pull, []), false, "no security review") && is(judge(pull, null), false, "no security review") && is(judge(pull, [null, 3, {}, { user: null, body: 5 }]), false, "no security review"), "no comments, or none that can be read: it waits");
ok(is(judge(pull, [summary(running)]), false, "no security review") && is(judge(pull, [summary({ ...done, status: null })]), false, "no security review") && is(judge(pull, [summary(null)]), false, "no security review"), "a review still running, or not begun, is no review");
ok(is(judge(pull, [summary(done)]), true, `has run (on ${SEEN.slice(0, 7)})`), "Codex's summary that says completed passes, and names the commit it saw");
ok(is(judge(pull, [summary({ ...done, commit_sha: "x\u001b[31m" })]), true, "has run") && judge(pull, [summary({ ...done, commit_sha: "x\u001b[31m" })]).why === "Codex's security review has run", "a commit that is no commit is not repeated");
ok(is(judge(pull, [summary({ ...done, has_any_findings: true, has_unresolved_findings: false })]), true, "has run"), "its findings all closed: it passes");
ok(is(judge(pull, [[said("thanks")], [said("more")], [summary(done)]]), true, "has run"), "pages of comments are read as one list");
ok(is(judge(pull, [summary(running), summary(done, "2026-11-12T12:00:00Z")]), false, "no security review") && is(judge(pull, [{ ...summary(done), body: "<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 &#123;not json -->\n" }, summary(done)]), false, "no security review"), "the app keeps one summary: only its first is read, never a later one that says more");

// Only Codex's own app, only its own two lines.
ok(is(judge(pull, [summary(done, undefined, { login: "chatgpt-codex-connector", type: "User" })]), false, "no security review") && is(judge(pull, [summary(done, undefined, { login: "chatgpt-codex-connector[bot]", type: "User" })]), false, "no security review") && is(judge(pull, [{ ...summary(done), user: { login: "someone", type: "User" }, author_association: "OWNER" }]), false, "no security review"), "the same text from any other account, the owner's too, is no proof");
ok(is(judge(pull, [{ ...summary(done), body: `Quoted from the change:\n${summary(done).body}` }]), false, "no security review") && is(judge(pull, [{ ...summary(done), body: summary(done).body.replace("-->\n<!--", "-->\nx\n<!--") }]), false, "no security review"), "the state anywhere but on the summary's second line is not read");
ok(is(judge(pull, [{ ...summary(done), body: "<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 &#123;not json -->\n" }]), false, "no security review") && is(judge(pull, [{ ...summary(done), body: `<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 ${"x".repeat(5000)} -->\n` }]), false, "no security review"), "a state that is no JSON, or too long to be one, is no proof");
ok(is(judge(pull, [{ ...summary(done), body: `<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 ${brace('{"security_review":"completed"}')} -->\n` }]), false, "no security review") && is(judge(pull, [{ ...summary(done), body: `<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 ${brace('{"__proto__":{"status":"completed"}}')} -->\n` }]), false, "no security review"), "a state of another shape is no proof");

// A review posted in a comment.
ok(is(judge(pull, [said("Security review: the fallback reviewer's, of the whole diff. Blocking findings: 0.")]), true, "is posted") && is(judge(pull, [said("**Security review:** none found", "COLLABORATOR")]), true, "is posted") && is(judge(pull, [said("Security review: ok", "MEMBER")]), true, "is posted"), "a comment that opens \"Security review:\", plain or bold, from the owner, a member or a collaborator passes");
ok(["NONE", "CONTRIBUTOR", "FIRST_TIME_CONTRIBUTOR", "FIRST_TIMER", "MANNEQUIN", null, 7, ["OWNER"]].every((assoc) => is(judge(pull, [said("Security review: fine", assoc)]), false, "no security review")), "the same comment from anyone else is no proof");
ok(["security review: fine", " Security review: fine", "\nSecurity review: fine", "> Security review: fine", "Security review fine", "The Security review: fine", "@codex security review", "*Security review:* fine", "## Security review: fine"].every((body) => is(judge(pull, [said(body)]), false, "no security review")), "nor a comment that only holds the words, or opens another way");
ok(is(judge(pull, [summary(running), said("Security review: the fallback reviewer's")]), true, "is posted"), "Codex still running and another's review posted: it passes");

// A finding of Codex's security review marked open: only a review posted after its newest finding settles it.
ok(is(judge(pull, [summary(open)], [finding("2026-11-12T10:30:00Z")]), false, "no review posted after it") && is(judge(pull, [summary(open)]), false, "no review posted after it"), "a finding marked open and no review posted: it waits");
ok(is(judge(pull, [summary(open), said("Security review: the second reviewer's", "OWNER", "2026-11-12T10:00:00Z")], [finding("2026-11-12T10:30:00Z")]), false, "no review posted after it"), "a review posted before the finding does not settle it");
ok(is(judge(pull, [summary(open), said("Security review: the fix checked, nothing left", "OWNER", "2026-11-12T11:00:00Z")], [[finding("2026-11-12T10:30:00Z")]]), true, "a review is posted after its newest finding"), "a review posted after the finding settles it");
ok(is(judge(pull, [summary(open), said("Security review: the first fix checked", "OWNER", "2026-11-12T11:00:00Z")], [finding("2026-11-12T10:30:00Z"), finding("2026-11-12T11:30:00Z")]), false, "no review posted after it") && is(judge(pull, [summary(open), said("Security review: the first fix checked", "OWNER", "2026-11-12T11:00:00Z"), finding("2026-11-12T11:30:00Z")], []), false, "no review posted after it"), "a newer finding, among the review comments or the plain ones, asks for a newer review");
ok(is(judge(pull, [summary(open), said("Security review: fine", "NONE", "2026-11-12T11:00:00Z")], [finding("2026-11-12T10:30:00Z")]), false, "no review posted after it") && is(judge(pull, [summary(open), { ...said("Security review: fine"), created_at: "soon" }], [finding("2026-11-12T10:30:00Z")]), false, "no review posted after it"), "nor does anyone else's comment settle it, or one with no time to it");
ok(is(judge(pull, [summary(open), said("Security review: the fix checked", "OWNER", "2026-11-12T11:00:00Z")], [finding("2026-11-12T12:00:00Z", { login: "someone", type: "User" }), { ...finding("2026-11-12T12:00:00Z"), body: "A P1.\n<!-- codex-code-review-finding:v1 -->" }, null, "x"]), true, "after its newest finding"), "a look-alike finding from another account, and a finding of the code review, ask for nothing");
ok(is(judge(pull, [summary(open), said("Security review: the fix checked")], [{ ...finding("x"), created_at: null }]), false, "no review posted after it"), "a finding with no time to it is taken as the newest");
ok(is(judge(pull, [summary(open), said("Security review: the fix checked")]), true, "after its newest finding"), "marked open with no finding to be found: a posted review settles it");

// Dependabot's own pull request.
const bump = { ...pull, user: { login: "dependabot[bot]", type: "Bot" }, head: { sha: HEAD, repo: { full_name: "o/r" } }, base: { repo: { full_name: "o/r" } } };
const by = (sha, author = { login: "dependabot[bot]", type: "Bot" }, committer = { login: "web-flow", type: "User" }, verified = true) => ({ sha, author, committer, commit: { verification: { verified } } });
const its = [[by("c".repeat(40))], [by(HEAD)]];
ok(is(judge(bump, [], [], its), true, "floor rule 17") && is(judge(bump, [said("thanks")], [], its), true, "floor rule 17") && is(judge(bump, [summary({ ...done, status: null })], [], its), true, "floor rule 17"), "Dependabot's own pull request, with no review begun on it, passes: the floor holds it another way");
ok(is(judge({ ...bump, user: { login: "dependabot[bot]", type: "User" } }, [], [], its), false, "no security review") && is(judge({ ...bump, user: { login: "dependabot", type: "Bot" } }, [], [], its), false, "no security review") && is(judge({ ...bump, head: { sha: HEAD, repo: { full_name: "x/r" } } }, [], [], its), false, "no security review") && is(judge({ ...bump, head: { sha: HEAD, repo: null } }, [], [], its), false, "no security review") && is(judge({ ...bump, base: null }, [], [], its), false, "no security review"), "a look-alike of it, or one from another repository, does not");
const someone = { login: "someone", type: "User" };
ok([[by(HEAD, someone)], [by("c".repeat(40)), by(HEAD, someone, someone)], [by(HEAD, undefined, someone)], [by(HEAD, undefined, undefined, false)], [by(HEAD, { login: "dependabot[bot]", type: "User" })], [by(HEAD, null)], [{ sha: HEAD }], [by("c".repeat(40))], [], null, undefined].every((commits) => is(judge(bump, [], [], commits), false, "no security review")), "nor one that holds a commit somebody else wrote or committed, or one GitHub did not sign, or whose commits are not known up to the head");
ok(is(judge(bump, [], [], [by("c".repeat(40)), { ...by(HEAD, someone), parents: [{}, {}] }]), false, "no security review"), "a merge that brings it up to date is somebody else's commit too");
ok(is(judge(bump, [summary(running)], [], its), false, "no security review") && is(judge(bump, [summary({ ...done, status: "queued" })], [], its), false, "no security review") && is(judge(bump, [summary(open)], [finding("2026-11-12T10:30:00Z")], its), false, "no review posted after it") && is(judge(bump, [summary(done)], [], its), true, "Codex's security review has run") && is(judge(bump, [said("Security review: read against the release notes")], [], [by(HEAD, someone)]), true, "is posted"), "a review of Codex's that began on it is waited for and read like any other, and a posted review counts on it as on any");

// The status.
const wait = judge(pull, []);
const pass = judge(pull, [summary(done)]);
ok(status(wait, false).state === "pending" && status(wait, false).description === "Waiting: no security review has run yet" && status(pass, false).state === "success" && status(pass, false).description.startsWith("Codex's security review has run"), "when it is not advisory, a pull request with no review waits and one with a review passes");
ok(status(wait, true).state === "success" && status(wait, true).description === "Advisory: would wait, no security review has run yet" && status(pass, true).state === "success" && status(pass, true).description.startsWith("Advisory: Codex's"), "while advisory it always passes, and says what it would have done");
ok([wait, pass, judge(pull, [said("Security review: x")]), judge(pull, [summary(open)]), judge(pull, [summary(open), said("Security review: x")])].every((v) => [true, false].every((a) => status(v, a).context === CONTEXT && status(v, a).description.length <= 140)), "every status has the one name and a description GitHub takes");
ok(status(pass, true, "https://github.com/o/r/actions/runs/1").target_url === "https://github.com/o/r/actions/runs/1" && !("target_url" in status(pass, true)) && !("target_url" in status(pass, true, "javascript:alert(1)")) && !("target_url" in status(pass, true, "https://x/?a=b c")), "it links to its run, and to nothing that is no plain https address");

// From the command line, as the workflow runs it.
const dir = mkdtempSync(join(tmpdir(), "security-review-"));
try {
  const script = join(dirname(fileURLToPath(import.meta.url)), "security-review.mjs");
  const run = (p, c, env = {}, r = undefined, k = undefined) => {
    writeFileSync(join(dir, "pull.json"), JSON.stringify(p));
    writeFileSync(join(dir, "comments.json"), JSON.stringify(c));
    if (r !== undefined) writeFileSync(join(dir, "review-comments.json"), JSON.stringify(r));
    if (k !== undefined) writeFileSync(join(dir, "commits.json"), JSON.stringify(k));
    const files = [join(dir, "pull.json"), join(dir, "comments.json"), ...(r === undefined ? [] : [join(dir, "review-comments.json")]), ...(k === undefined ? [] : [join(dir, "commits.json")])];
    return JSON.parse(execFileSync(process.execPath, [script, ...files], { encoding: "utf8", env: { ...process.env, ADVISORY: "", RUN_URL: "", ...env } }));
  };
  const advisory = run(pull, [[summary(running)]]);
  ok(advisory.sha === HEAD && advisory.status.state === "success" && advisory.status.description.startsWith("Advisory: would wait"), "run with no word on it, it is advisory");
  const strict = run(pull, [[summary(running)]], { ADVISORY: "false", RUN_URL: "https://github.com/o/r/actions/runs/7" });
  ok(strict.status.state === "pending" && strict.status.target_url.endsWith("/runs/7") && run(pull, [[summary(done)]], { ADVISORY: "false" }).status.state === "success", "told it is not advisory, it waits until the review has run");
  ok(run(pull, [[summary(open), said("Security review: checked", "OWNER", "2026-11-12T11:00:00Z")]], { ADVISORY: "false" }, [[finding("2026-11-12T12:00:00Z")]]).status.state === "pending" && run(pull, [[summary(open), said("Security review: checked", "OWNER", "2026-11-12T13:00:00Z")]], { ADVISORY: "false" }, [[finding("2026-11-12T12:00:00Z")]]).status.state === "success", "given the review comments too, it weighs a finding against a posted review");
  ok(run(bump, [], { ADVISORY: "false" }, [], its).status.state === "success" && run(bump, [], { ADVISORY: "false" }, []).status.state === "pending", "given the commits too, it passes Dependabot's own, and without them it does not");
  ok(JSON.stringify(run({ ...pull, draft: true }, [])) === "{}", "a draft prints nothing to mark");
  let usage = 0;
  try { execFileSync(process.execPath, [script], { stdio: "ignore" }); } catch (e) { usage = e.status; }
  ok(usage === 2, "with no files named, it says how it is run");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
