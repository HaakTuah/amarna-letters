// What a pruning reads from the host (split from pruning.mjs, #888; AGENTS.md, "Rules are pruned by their numbers";
// #303): git, the workflows' steps, the entries of scripts/holders/, and through gh the findings, outcomes, failed steps
// and citations of the span since the last pruning. pruning.mjs, beside this file, says what each is for and exports the names it exported before the split.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { KINDS, NUMBER } from "./outcomes.mjs";
import { DIRECT } from "./pruning-record.mjs";
import { ROOT } from "./rules.mjs";

export const git = (args, cwd = ROOT) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28 });

// How many merged pull requests came under the rule `r` since it joined, read from git at `root`; null where the
// commit that first wrote its lead in bold cannot be found.
export function joinedIn(r, root = ROOT) {
  try {
    const first = git(["log", "--reverse", "--format=%cI", "-S", `**${r.lead}`, "HEAD"], root).split("\n").find(Boolean);
    if (!first) return null;
    return git(["log", "--first-parent", "--format=%s", `--since=${first}`, "HEAD"], root).split("\n").filter(s => /^Merge pull request #\d+|\(#\d+\)$/u.test(s)).length;
  } catch { return null; }
}

// The workflows' named steps at `root`: { path: [{ name, run }] }, read by the core's reader of YAML (parse-yaml.mjs);
// a workflow it cannot read has none.
export async function stepsAt(root = ROOT) {
  const { parseYaml } = await import("./parse-yaml.mjs"), dir = path.join(root, ".github", "workflows"), out = {};
  for (const f of fs.readdirSync(dir).filter(x => /\.ya?ml$/u.test(x))) {
    let yaml = {};
    try { yaml = parseYaml(fs.readFileSync(path.join(dir, f), "utf8")); } catch { /* (none read) */ }
    out[`.github/workflows/${f}`] = Object.values(yaml.jobs ?? {}).flatMap(j => (Array.isArray(j?.steps) ? j.steps : [])).filter(st => typeof st?.name === "string").map(st => ({ name: st.name, run: st.run ?? "" }));
  }
  return out;
}
export const holdersAt = async root => (await import("./holders.mjs")).named(root).json;

// Each rule's findings from `from` on: Map ruleOf-key -> the merged pull requests whose reviews name it on a line
// "Rule:" (review-record.mjs).
async function findingsOf({ repo, from, to, owner, gh }) {
  const { pagesOf } = await import("./labels.mjs"), { mergedIn } = await import("./cited.mjs"), { rulesNamed } = await import("./review-record.mjs");
  const numberOf = url => Number(/\/(\d+)$/u.exec(String(url ?? ""))?.[1]), route = r => `repos/${repo}/${r}?since=${from}&sort=created&direction=asc`;
  const issueComments = pagesOf(route("issues/comments"), gh), inline = pagesOf(route("pulls/comments"), gh), out = new Map();
  for (const m of mergedIn(repo, from, to, gh)) {
    const named = rulesNamed(issueComments.filter(c => numberOf(c.issue_url) === m.number), inline.filter(c => numberOf(c.pull_request_url) === m.number), owner);
    for (const rule of named) out.set(rule, (out.get(rule) ?? 0) + 1);
  }
  return out;
}

// The outcomes' direct measures and the corrections of each kind, from `from` to `to`, as outcomes-read.mjs reads
// them: { direct: { key: count }, corrections: { kind: count } }. Read whole, with no budget: the look's job has one
// for its five minutes, and a reading it cuts short would count what it left unread as none; a pruning runs once in
// two months, in a session.
async function outcomesOf({ repo, from, to, owner, gh }) {
  const { read } = await import("./outcomes-read.mjs"), w = { from: Date.parse(from), to: Date.parse(to) };
  const data = read(repo, w.from, w.to, owner, gh, { calls: Infinity, ms: Infinity });
  const corrections = Object.fromEntries(KINDS.map(k => [k, data.corrections.filter(c => c.kind === k && Date.parse(c.at) >= w.from && Date.parse(c.at) < w.to).length]));
  return { direct: Object.fromEntries(DIRECT.map(m => [m.key, m.of(data, w).n])), corrections };
}

// The steps that failed on a pull request from `from` to `to`, each "<workflow>#<step's name>": { step: count }, read
// from the jobs of every attempt (filter=all), page by page, of each run that did not succeed (a failure, or one cancelled after a step
// failed, as a newer push cancels one) or was run again, so that no failure a later attempt or push hid is lost; only those of `known` (the core's own steps), so that no name a fork's own workflow gives its
// steps reaches the record.
// Every page of a list GitHub gives under `key` (an object's list, as the Actions routes give them), through `gh`.
function pagedOf(route, key, gh) {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const got = JSON.parse(gh(`${route}&per_page=100&page=${page}`) || "{}")[key] ?? [];
    out.push(...got);
    if (got.length < 100) break;
  }
  return out;
}

export function firedOf({ repo, from, to, gh, known }) {
  const out = {}, read = x => x.path && Number.isInteger(x.id) && (!["success", "skipped"].includes(x.conclusion) || x.run_attempt > 1);
  for (const run of pagedOf(`repos/${repo}/actions/runs?event=pull_request&created=${from.slice(0, 10)}..${to.slice(0, 10)}`, "workflow_runs", gh).filter(read)) {
    const steps = pagedOf(`repos/${repo}/actions/runs/${run.id}/jobs?filter=all`, "jobs", gh).flatMap(j => j.steps ?? []);
    for (const id of steps.filter(x => x.conclusion === "failure").map(x => `${run.path}#${x.name}`).filter(x => known.has(x))) out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

// Each rule's citations from `from`'s month to `to`'s (cited.mjs): { key: count }.
async function citedOf({ repo, from, to, gh, all }) {
  const { texts, count, matchers, after } = await import("./cited.mjs");
  const out = {}, m = matchers(all);
  for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = after(month)) {
    for (const [, s] of count(texts(repo, month, gh).items, m)) for (const [k, x] of s.by) out[k] = (out[k] ?? 0) + x;
  }
  return out;
}

// The counts of `repo` from `from` to `to` (ISO times), through `gh` (labels.mjs's ghApi form): { numbers, direct,
// corrections, fired, cited }, each rule's number as `numbers` (an entry's) names it: its findings, its check's
// fires (of the steps `stepsOfRule(key)` gives), or the corrections of a kind; the failed steps only of `known`.
export async function counts({ repo, from, to, owner, gh, all, numbers, stepsOfRule, known }) {
  const span = { repo, from, to, owner, gh }, { ruleOf } = await import("./review-record.mjs");
  const findings = await findingsOf(span), { direct, corrections } = await outcomesOf(span), fired = firedOf({ ...span, known }), cited = await citedOf({ ...span, all });
  const of = {
    findings: key => findings.get(ruleOf(key)) ?? 0,
    "check fires": key => stepsOfRule(key).reduce((sum, x) => sum + (fired[x] ?? 0), 0),
  };
  const nums = Object.fromEntries(Object.entries(numbers).filter(([, n]) => NUMBER.test(n)).map(([key, n]) => {
    const what = NUMBER.exec(n)[1];
    return [key, of[what] ? of[what](key) : corrections?.[what.slice("correction: ".length)] ?? null];
  }));
  return { numbers: nums, direct, corrections, fired, cited };
}
