#!/usr/bin/env node
// The stand-in for GitHub in a staged case's scratch project (scratch-setup.mjs, beside this file, copies it to the case's
// bin/gh): `gh api` for the REST routes a session of the core calls (core/tasks/github-calls.md), answered from the
// file github.json beside its folder, which it rewrites with every call that writes; each call is added to that file's
// "calls". GraphQL, which a cloud session cannot reach, is refused as there. It reaches no network. Node's own modules
// and, for --jq, the jq command where one is installed.
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const HERE = path.resolve(__dirname, "..");
const FILE = path.join(HERE, "github.json");
const ORIGIN = path.join(HERE, "origin.git");
const state = JSON.parse(fs.readFileSync(FILE, "utf8"));
const args = process.argv.slice(2);
const save = () => fs.writeFileSync(FILE, `${JSON.stringify(state, null, 2)}\n`);
const fail = (status, message) => {
  save();
  process.stdout.write(`${JSON.stringify({ message, status: String(status) })}\n`);
  process.stderr.write(`gh: ${message} (HTTP ${status})\n`);
  process.exit(1);
};
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

if (args[0] === "auth") { process.stdout.write(`github.com\n  ✓ Logged in to github.com account ${state.owner}\n`); process.exit(0); }
if (args[0] !== "api") {
  process.stderr.write(`gh ${args[0] ?? ""}: GitHub's GraphQL API cannot be reached from here, so \`gh pr\`, \`gh issue\` and the like fail; use \`gh api\` with GitHub's REST routes (core/tasks/github-calls.md).\n`);
  process.exit(1);
}

// the call: its method, route, fields and the jq filter
let method = null, route = null, jq = null, input = null;
const fields = {};
const value = v => (v === "true" ? true : v === "false" ? false : v === "null" ? null : /^-?\d+$/.test(v) ? Number(v) : v);
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === "-X" || a === "--method") method = String(args[++i]).toUpperCase();
  else if (a === "--jq" || a === "-q") jq = args[++i];
  else if (a === "--input") input = args[++i];
  else if (a === "-H" || a === "--header" || a === "-t" || a === "--template" || a === "--hostname" || a === "--cache") i++;
  else if (a === "-f" || a === "--raw-field" || a === "-F" || a === "--field") {
    const raw = String(args[++i]), at = raw.indexOf("=");
    let key = raw.slice(0, at), v = raw.slice(at + 1);
    if (a === "-F" || a === "--field") v = v.startsWith("@") ? fs.readFileSync(v.slice(1), "utf8") : value(v);
    if (key.endsWith("[]")) { key = key.slice(0, -2); (fields[key] ??= []).push(v); } else fields[key] = v;
  } else if (a.startsWith("-")) continue;
  else if (route === null) route = a;
}
if (!route) fail(400, "no route given");
let body = { ...fields };
if (input !== null) {
  const text = input === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(input, "utf8");
  try { body = { ...JSON.parse(text), ...fields }; } catch { fail(400, "Problems parsing JSON"); }
}
if (route === "graphql") fail(403, "GraphQL is not reachable from here: use the REST routes (core/tasks/github-calls.md)");
method ??= Object.keys(body).length ? "POST" : "GET";
const [pathPart, query = ""] = route.replace(/^\//, "").split("?");
const params = Object.fromEntries(new URLSearchParams(query));
if (method === "GET") Object.assign(params, fields);
state.calls.push({ at: now(), method, route: pathPart, body: method === "GET" ? undefined : body });

const git = (...a) => spawnSync("git", [`--git-dir=${ORIGIN}`, ...a], { encoding: "utf8" });
// (a branch is named only as refs/heads/<name>, and a commit only after --end-of-options: no name given here becomes an
// option of git's)
const sha = ref => { const r = git("rev-parse", "--verify", "-q", "--end-of-options", `refs/heads/${ref}`); return r.status === 0 ? r.stdout.trim() : null; };
const commitOf = rev => { const r = git("rev-parse", "--verify", "-q", "--end-of-options", `${rev}^{commit}`); return r.status === 0 ? r.stdout.trim() : null; };
const repo = `${state.owner}/${state.repo}`;
const user = { login: state.owner, type: "User" };
const labelsOf = names => (names ?? []).map(n => (typeof n === "string" ? n : n.name)).map(name => state.labels.find(l => l.name === name) ?? { name, color: "ededed", description: "" });
const asIssue = i => ({ ...i, labels: labelsOf(i.labels), comments: state.comments.filter(c => c.issue === i.number).length, html_url: `https://github.com/${repo}/issues/${i.number}`, ...(i.pull ? { pull_request: { url: `https://api.github.com/repos/${repo}/pulls/${i.number}` } } : {}) });
const asPull = p => ({ ...p, head: { ref: p.head, sha: sha(p.head) ?? p.headSha, repo: { full_name: repo } }, base: { ref: p.base, sha: sha(p.base), repo: { full_name: repo } }, labels: labelsOf(p.labels), mergeable_state: p.draft ? "draft" : "blocked", auto_merge: p.autoMerge ? { merge_method: "merge" } : null, merged: p.merged === true, merged_at: p.merged_at ?? null, html_url: `https://github.com/${repo}/pull/${p.number}` });
const page = list => { const per = Number(params.per_page ?? 30), n = Number(params.page ?? 1); return list.slice((n - 1) * per, n * per); };
const out = data => {
  const text = JSON.stringify(data);
  if (jq) {
    const r = spawnSync("jq", ["-r", jq], { input: text, encoding: "utf8" });
    if (r.error) { process.stderr.write("gh: jq is not installed here: the answer is printed whole\n"); process.stdout.write(`${JSON.stringify(data, null, 2)}\n`); }
    else { process.stdout.write(r.stdout); if (r.status !== 0) { process.stderr.write(r.stderr); process.exit(1); } }
  } else process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  save();
  process.exit(0);
};
const issueByNumber = n => state.issues.find(i => i.number === n) ?? fail(404, "Not Found");
const pullByNumber = n => state.pulls.find(p => p.number === n) ?? fail(404, "Not Found");
const next = () => ++state.last;

let m;
if (pathPart === "user") out(user);
if (!pathPart.startsWith(`repos/${repo}`)) fail(404, "Not Found");
const rest = pathPart.slice(`repos/${repo}`.length).replace(/^\//, "");

const asRepo = () => ({ full_name: repo, name: state.repo, owner: { login: state.owner }, private: state.private, visibility: state.private ? "private" : "public", has_issues: state.hasIssues, default_branch: "main", permissions: { admin: true, maintain: true, push: true, triage: true, pull: true }, ...(state.securityAndAnalysis ? { security_and_analysis: state.securityAndAnalysis } : {}) });
// (fields as gh sends them, "a[b][c]=v", read as the object they name; a name that would reach an object's prototype is
// left out)
const nested = fields => { const o = {}; for (const [k, v] of Object.entries(fields)) { const parts = k.match(/[^[\]]+/g) ?? [k]; if (parts.some(p => ["__proto__", "constructor", "prototype"].includes(p))) continue; let at = o; for (const p of parts.slice(0, -1)) at = at[p] = at[p] && typeof at[p] === "object" ? at[p] : {}; at[parts[parts.length - 1]] = v; } return o; };
if (rest === "" && method === "GET") out(asRepo());
if (rest === "" && method === "PATCH") {
  const asked = nested(body).security_and_analysis ?? {};
  for (const k of ["secret_scanning", "secret_scanning_push_protection"]) if (asked[k]?.status) (state.securityAndAnalysis ??= {})[k] = { status: String(asked[k].status) };
  out(asRepo());
}
if (rest === "rulesets" || rest === "rules/branches/main") out(state.rulesets ?? []);
// labels
if (rest === "labels" && method === "GET") out(page(state.labels));
if (rest === "labels" && method === "POST") { if (state.labels.some(l => l.name === body.name)) fail(422, "Validation Failed: already_exists"); const l = { name: body.name, color: body.color ?? "ededed", description: body.description ?? "" }; state.labels.push(l); out(l); }
if ((m = /^labels\/(.+)$/.exec(rest))) {
  const name = decodeURIComponent(m[1]), l = state.labels.find(x => x.name === name) ?? fail(404, "Not Found");
  if (method === "GET") out(l);
  if (method === "PATCH") { Object.assign(l, { name: body.new_name ?? l.name, color: body.color ?? l.color, description: body.description ?? l.description }); out(l); }
  if (method === "DELETE") { state.labels = state.labels.filter(x => x !== l); out({}); }
}
// issues, pull requests among them as GitHub lists them
if (rest === "issues" && method === "GET") {
  const want = params.state ?? "open", labels = params.labels ? String(params.labels).split(",") : [];
  out(page([...state.issues].reverse().filter(i => want === "all" || i.state === want).filter(i => labels.every(l => (i.labels ?? []).includes(l))).map(asIssue)));
}
if (rest === "issues" && method === "POST") {
  if (!state.hasIssues) fail(410, "Issues are disabled for this repo");
  const i = { number: next(), title: String(body.title ?? ""), body: String(body.body ?? ""), state: "open", user, labels: [...(body.labels ?? [])], assignees: (body.assignees ?? []).map(login => ({ login })), created_at: now(), updated_at: now() };
  state.issues.push(i); out(asIssue(i));
}
if (rest === "issues/comments" && method === "GET") out(page(state.comments.filter(c => !params.since || c.created_at >= params.since).map(c => ({ ...c, issue_url: `https://api.github.com/repos/${repo}/issues/${c.issue}` }))));
if ((m = /^issues\/comments\/(\d+)$/.exec(rest))) {
  const c = state.comments.find(x => x.id === Number(m[1])) ?? fail(404, "Not Found");
  if (method === "GET") out(c);
  if (method === "PATCH") { c.body = String(body.body ?? c.body); c.updated_at = now(); out(c); }
}
if ((m = /^issues\/(\d+)$/.exec(rest))) {
  const i = issueByNumber(Number(m[1]));
  if (method === "GET") out(asIssue(i));
  if (method === "PATCH") {
    for (const k of ["title", "body", "state", "state_reason"]) if (k in body) i[k] = body[k];
    if ("labels" in body) i.labels = [...body.labels];
    if ("assignees" in body) i.assignees = body.assignees.map(login => ({ login }));
    i.updated_at = now();
    const p = state.pulls.find(x => x.number === i.number);
    if (p) for (const k of ["title", "body", "state", "labels"]) if (k in i) p[k] = i[k];
    out(asIssue(i));
  }
}
if ((m = /^issues\/(\d+)\/comments$/.exec(rest))) {
  const i = issueByNumber(Number(m[1]));
  if (method === "GET") out(page(state.comments.filter(c => c.issue === i.number)));
  if (method === "POST") { const c = { id: next() * 1000, issue: i.number, user, body: String(body.body ?? ""), created_at: now(), updated_at: now() }; state.comments.push(c); out(c); }
}
if ((m = /^issues\/(\d+)\/labels(?:\/(.+))?$/.exec(rest))) {
  const i = issueByNumber(Number(m[1]));
  const sync = () => { const p = state.pulls.find(x => x.number === i.number); if (p) p.labels = i.labels; };
  if (method === "GET") out(labelsOf(i.labels));
  if (method === "POST" || method === "PUT") { const add = (body.labels ?? []).map(String); i.labels = [...new Set([...(method === "PUT" ? [] : i.labels), ...add])]; sync(); out(labelsOf(i.labels)); }
  if (method === "DELETE") { i.labels = m[2] ? i.labels.filter(l => l !== decodeURIComponent(m[2])) : []; sync(); out(labelsOf(i.labels)); }
}
if ((m = /^issues\/(\d+)\/events$/.exec(rest))) out([]);
// pull requests
if (rest === "pulls" && method === "GET") { const want = params.state ?? "open"; out(page([...state.pulls].reverse().filter(p => want === "all" || p.state === want).map(asPull))); }
if (rest === "pulls" && method === "POST") {
  const head = String(body.head ?? "").replace(/^[^:]+:/, "");
  if (!sha(head)) fail(422, `Validation Failed: head ${head} is not a branch of ${repo}; push it first`);
  if (!sha(String(body.base ?? "main"))) fail(422, `Validation Failed: base ${body.base} is not a branch of ${repo}`);
  if (state.pulls.some(p => p.head === head && p.state === "open")) fail(422, `Validation Failed: A pull request already exists for ${state.owner}:${head}.`);
  const p = { number: next(), title: String(body.title ?? ""), body: String(body.body ?? ""), state: "open", draft: body.draft === true, head, headSha: sha(head), base: String(body.base ?? "main"), user, labels: [], created_at: now(), updated_at: now(), pull: true };
  state.pulls.push(p);
  state.issues.push({ number: p.number, title: p.title, body: p.body, state: "open", user, labels: p.labels, assignees: [], created_at: p.created_at, updated_at: p.updated_at, pull: true });
  out(asPull(p));
}
if ((m = /^pulls\/(\d+)(?:\/(.+))?$/.exec(rest))) {
  const p = pullByNumber(Number(m[1])), more = m[2] ?? "", i = state.issues.find(x => x.number === p.number);
  if (more === "" && method === "GET") out(asPull(p));
  if (more === "" && method === "PATCH" && "base" in body && !sha(String(body.base))) fail(422, `Validation Failed: base ${body.base} is not a branch of ${repo}`);
  if (more === "" && method === "PATCH") { for (const k of ["title", "body", "state", "base"]) if (k in body) { p[k] = body[k]; if (i) i[k] = body[k]; } p.updated_at = now(); out(asPull(p)); }
  if (more === "ccr/ready_for_review" || more === "ready_for_review") { p.draft = false; p.readyAt = now(); out(asPull(p)); }
  if (more === "ccr/auto_merge") { p.autoMerge = method !== "DELETE"; out({ enabled: p.autoMerge }); }
  if (more === "update-branch") out({ message: "Updating pull request branch." });
  if (more === "merge") fail(405, "Repository rule violations found: the required status checks have not passed, and a review is waited for");
  if (more === "files") {
    const r = git("diff", "--name-status", "--end-of-options", `${sha(p.base)}...${sha(p.head) ?? p.headSha}`);
    out(page(String(r.stdout).split("\n").filter(Boolean).map(l => { const [s, filename] = l.split("\t"); return { filename, status: s === "A" ? "added" : s === "D" ? "removed" : "modified" }; })));
  }
  if (more === "commits") out(page(String(git("log", "--format=%H", "--end-of-options", `${sha(p.base)}..${sha(p.head) ?? p.headSha}`).stdout).split("\n").filter(Boolean).map(s => ({ sha: s }))));
  if (more === "comments" || more === "reviews" || more === "requested_reviewers") out(method === "GET" ? [] : {});
}
// a weakness reported by GitHub's private reporting, which only the owner sees (core/floor/topics/weaknesses.md)
if (rest === "security-advisories/reports" && method === "POST") { const r = { ghsa_id: `GHSA-${next()}`, summary: String(body.summary ?? ""), description: String(body.description ?? ""), state: "triage", created_at: now() }; (state.reports ??= []).push(r); out(r); }
if ((m = /^commits\/([^/]+)\/check-runs$/.exec(rest))) out({ total_count: (state.checks ?? []).length, check_runs: state.checks ?? [] });
// the workflow runs a case sets (red-main.mjs): listed, read with their jobs and logs, and run again, a run again taking
// the conclusion the case gave it (`again`, else success) for the run and each of its jobs and check runs
const runById = n => (state.runs ?? []).find(r => r.id === n) ?? fail(404, "Not Found");
const jobById = n => (state.runs ?? []).flatMap(r => r.jobs ?? []).find(j => j.id === n) ?? fail(404, "Not Found");
const runAgain = r => {
  r.run_attempt = (r.run_attempt ?? 1) + 1; r.conclusion = r.again ?? "success"; r.status = "completed";
  for (const j of r.jobs ?? []) { j.conclusion = r.conclusion; j.run_attempt = r.run_attempt; }
  for (const c of state.checks ?? []) if (c.run_id === r.id) { c.conclusion = r.conclusion; c.output = { title: r.conclusion, summary: r.againSays ?? "" }; }
  out({});
};
const asRun = r => { const { jobs, again, againSays, ...rest } = r; return rest; };
if (rest === "actions/runs" && method === "GET") { const runs = (state.runs ?? []).filter(r => (!params.branch || r.head_branch === params.branch) && (!params.head_sha || r.head_sha === params.head_sha) && (!params.status || r.status === params.status || r.conclusion === params.status)); out({ total_count: runs.length, workflow_runs: page(runs.map(asRun)) }); }
if ((m = /^actions\/runs\/(\d+)$/.exec(rest)) && method === "GET") out(asRun(runById(Number(m[1]))));
if ((m = /^actions\/runs\/(\d+)\/(?:attempts\/\d+\/)?jobs$/.exec(rest))) { const jobs = runById(Number(m[1])).jobs ?? []; out({ total_count: jobs.length, jobs: page(jobs.map(({ log, ...j }) => j)) }); }
if ((m = /^actions\/jobs\/(\d+)$/.exec(rest)) && method === "GET") { const { log, ...j } = jobById(Number(m[1])); out(j); }
if ((m = /^actions\/jobs\/(\d+)\/logs$/.exec(rest))) { process.stdout.write(`${jobById(Number(m[1])).log ?? ""}\n`); save(); process.exit(0); }
if ((m = /^actions\/runs\/(\d+)\/(?:rerun|rerun-failed-jobs)$/.exec(rest)) && method === "POST") runAgain(runById(Number(m[1])));
if ((m = /^actions\/jobs\/(\d+)\/rerun$/.exec(rest)) && method === "POST") { const j = jobById(Number(m[1])); runAgain((state.runs ?? []).find(r => (r.jobs ?? []).includes(j))); }
if ((m = /^commits\/([^/]+)\/status$/.exec(rest))) out({ state: "pending", total_count: 0, statuses: [] });
if ((m = /^compare\/(.+)\.\.\.(.+)$/.exec(rest))) {
  const [from, to] = [commitOf(decodeURIComponent(m[1])), commitOf(decodeURIComponent(m[2]))];
  if (!from || !to) fail(404, "Not Found");
  m = [m[0], from, to];
  const ahead = Number(String(git("rev-list", "--count", `${m[1]}..${m[2]}`).stdout).trim() || 0);
  out({ ahead_by: ahead, behind_by: Number(String(git("rev-list", "--count", `${m[2]}..${m[1]}`).stdout).trim() || 0), files: [] });
}
fail(404, "Not Found");
