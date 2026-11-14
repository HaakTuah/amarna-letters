// Nothing the core changes locks a project that changes nothing of its own (AGENTS.md, "Nothing locks another owner's
// project"; core archive 201): a project written by the starter kit of each of the last two releases (one that missed a
// release jumps two), then synced to the commit under test as a release of its own, passes every check of the core
// unchanged, and no pull request of its own starts a job there that it did not start before the sync, since each job is
// a billed minute in a private repository. From each, two projects of another owner: one whose packages come from npm,
// public; one whose packages come from NuGet (.NET), private, held as Windows holds it (every file 100644, line endings
// converted), every commit of it made under a name its term list holds, as git writes the name a machine sets, which
// the personal-terms check fails, saying how the session mends it in the pull request itself, and the sync's pull
// request is mended so (core archive 202). Each is synced the way a project of another owner syncs (`node
// core/scripts/sync.mjs`, the release's own copy, which takes the newest release), and then runs, as GitHub would for
// it (workflow-run.mjs, beside this file), every workflow of the core its own workflows call: the sync's pull request,
// the push of its merge to main, a pull request of its own that touches only its docs, one that touches its package
// files, and the daily core-moved run; then its hooks, from main's copy as Claude Code runs them. GitHub's own services
// (CodeQL, the dependency review) are not run here, and GitHub's API is a stand-in that gives the security-review check
// one completed review. The sync's pull request is pure, as pure-sync.mjs reads it from the release it moves to, in
// both projects. It needs the core's history and release tags (a checkout with fetch-depth 0); on GitHub's runners the
// .NET SDK too, which takes nothing from the network for a project with no package, while npm takes one small package
// from the registry. On Linux and on Windows. Git, tar, bash, npm, the .NET SDK where there is one, and Node's own
// modules.
//
//   node scripts/upgrade-test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "./core-address.mjs";
import { evaluate, parseYaml, runWorkflow } from "./workflow-run.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${String(detail).slice(0, 1500).replace(/\n/g, "\n     ")}`}`); } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- the reader the runner stands on ----
const yaml = parseYaml("name: x # a comment\non:\n  workflow_call:\n    inputs:\n      a:\n        type: boolean\n        default: true\njobs:\n  j:\n    if: >-\n      ${{ a\n      && b }}\n    steps:\n      - uses: x@1 # v1\n        with:\n          k: 'it''s'\n      - name: run\n        run: |\n          one\n            two # kept\n\n          three\n      - run: echo \"#\" plain\n    types: [opened, edited]\n");
ok(yaml.name === "x" && yaml.on.workflow_call.inputs.a.default === true && yaml.jobs.j.if === "${{ a && b }}" && yaml.jobs.j.steps[0].uses === "x@1" && yaml.jobs.j.steps[0].with.k === "it's"
  && yaml.jobs.j.steps[1].run === "one\n  two # kept\n\nthree\n" && yaml.jobs.j.steps[2].run === 'echo "#" plain' && yaml.jobs.j.types.join() === "opened,edited", "the runner reads the YAML the core's workflows are written in", JSON.stringify(yaml));
const c = { github: { event_name: "pull_request", event: { pull_request: { draft: false, user: { login: "Dependabot[bot]" } }, issue: null } }, inputs: { private: false, advisory: true } };
ok(evaluate("github.event_name == 'PULL_REQUEST' && !github.event.pull_request.draft", c) === true && evaluate("github.event.issue.pull_request || 'x'", c) === "x" && evaluate("github.event.pull_request.user.login != 'dependabot[bot]'", c) === false
  && evaluate("contains(fromJSON('[\"OWNER\",\"MEMBER\"]'), 'member') && startsWith('abc', 'A')", c) === true && evaluate("!inputs.private || !inputs.advisory", c) === true, "and evaluates GitHub's expressions as GitHub does: case-blind strings, || giving a value, a missing property null");
const matrixed = runWorkflow("on:\n  workflow_call:\n    inputs:\n      languages:\n        type: string\n        default: '[\"a\", \"b\"]'\njobs:\n  analyze:\n    strategy:\n      matrix:\n        language: ${{ fromJSON(inputs.languages) }}\n        os: [x, y]\n    steps: []\n", { github: {}, dry: true });
ok(matrixed.map(r => r.job).join() === "analyze (a, x),analyze (a, y),analyze (b, x),analyze (b, y)", "a job's matrix is a job for each combination, named by its values, so a matrix that grows starts more jobs", matrixed.map(r => r.job).join());
let threw = 0;
for (const bad of ["vars.X == 1", "hashFiles('x')", "a ~ b"]) { try { evaluate(bad, c); } catch { threw++; } }
ok(threw === 3, "a context, function or sign it does not know stops the test, to be taught, rather than read other than GitHub would");

// ---- the core: its history, with the commit under test as main, cut as a release ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "upgrade-test-"));
process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } });
const slash = p => p.replace(/\\/g, "/");
const theCore = path.join(tmp, "the-core");
const url = `https://github.com/${CORE}`;
// (what each program it starts reads of the user's own is the scratch folder's: no home, npm or NuGet setting, cache or
// token of the user's reaches a check)
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(GIT_|GITHUB_|RUNNER_|ACTIONS_|CI$|CLAUDE_|GH_|NPM_|NUGET_|DOTNET_CLI_HOME$)|^npm_|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(name)));
const home = path.join(tmp, "home");
fs.mkdirSync(path.join(home, "AppData", "Local"), { recursive: true });
fs.mkdirSync(path.join(home, "AppData", "Roaming"), { recursive: true });
Object.assign(env, { HOME: home, USERPROFILE: home, APPDATA: path.join(home, "AppData", "Roaming"), LOCALAPPDATA: path.join(home, "AppData", "Local"), XDG_CONFIG_HOME: path.join(home, ".config"),
  npm_config_cache: path.join(home, ".npm") }); // (npm's own config is the home's, which holds none)
Object.assign(env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1",
  // (the core's address leads to the scratch core, and no git call reaches the network: a call that the rewrite misses fails)
  GIT_CONFIG_COUNT: "2", GIT_CONFIG_KEY_0: `url.${slash(theCore)}.insteadOf`, GIT_CONFIG_VALUE_0: url, GIT_CONFIG_KEY_1: `url.${slash(theCore)}.insteadOf`, GIT_CONFIG_VALUE_1: `${url}.git`, GIT_ALLOW_PROTOCOL: "file" });
const named = new Map(); // (a project's folder, and the name git writes into each commit made in it)
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env: { ...env, ...named.get(dir) }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }).trim();
const node = (dir, ...args) => { const r = spawnSync(process.execPath, args, { cwd: dir, env, encoding: "utf8" }); return { status: r.status, out: `${r.stdout}${r.stderr}` }; };

let history = true;
try { git(root, "rev-parse", "--verify", "-q", "HEAD^{commit}"); history = git(root, "rev-parse", "--is-shallow-repository") === "false"; } catch { history = false; }
fs.mkdirSync(theCore);
git(theCore, "init", "-q", "-b", "main");
if (history) git(theCore, "fetch", "-q", "--no-tags", root, "+refs/tags/release-*:refs/tags/release-*");
const tip = history ? git(root, "rev-parse", "HEAD") : "";
if (history) git(theCore, "fetch", "-q", "--no-tags", root, tip);
const releases = history ? git(theCore, "tag", "--list", "release-*").split("\n").filter(t => /^release-\d+$/.test(t)) : [];
if (!history || !releases.length) {
  ok(!process.env.GITHUB_ACTIONS, "on GitHub's runners the core's history and its release tags are here (fetch-depth 0)");
  console.log(failed ? `${failed} of ${count} failed` : "skip the rest: this clone holds no history or no release of the core's, so no previous release to start from");
  process.exit(failed ? 1 : 0);
}
git(theCore, "checkout", "-q", "-B", "main", tip);
// (the commit under test is the clone's own, with what its working folder holds that is not committed yet)
for (const e of fs.readdirSync(theCore)) if (e !== ".git") fs.rmSync(path.join(theCore, e), { recursive: true, force: true });
fs.cpSync(root, theCore, { recursive: true, filter: src => !["/.git", "/node_modules"].some(x => slash(src).endsWith(x)) });
git(theCore, "add", "-A");
if (git(theCore, "status", "--porcelain")) git(theCore, "commit", "-q", "-m", "the core as it stands");
const head = git(theCore, "rev-parse", "HEAD");
const number = t => Number(t.slice("release-".length));
const isAncestor = (a, b) => { try { git(theCore, "merge-base", "--is-ancestor", a, b); return true; } catch { return false; } };
const cut = releases.filter(t => isAncestor(`${t}^{commit}`, head)).sort((a, b) => number(a) - number(b));
const starts = cut.filter(t => git(theCore, "rev-parse", `${t}^{commit}`) !== head).slice(-2); // (the last two releases before it)
if (!starts.length) {
  ok(!process.env.GITHUB_ACTIONS, "on GitHub's runners a release of the core's comes before the commit under test");
  console.log(failed ? `${failed} of ${count} failed` : "skip the rest: no release of the core's comes before the commit under test, so none to start from");
  process.exit(failed ? 1 : 0);
}
const carrying = cut.find(t => git(theCore, "rev-parse", `${t}^{commit}`) === head) ?? `release-${number(cut.at(-1)) + 1}`;
if (!cut.includes(carrying)) git(theCore, "tag", carrying, head);
console.log(`the releases started from: ${starts.map(t => `${t} (${git(theCore, "rev-parse", "--short=7", `${t}^{commit}`)})`).join(", ")}; the commit under test, cut as ${carrying}: ${head.slice(0, 7)}`);

// ---- GitHub, as far as the checks need it ----
const stubs = path.join(tmp, "bin");
fs.mkdirSync(stubs);
const ghLog = path.join(tmp, "gh-log"), ghData = path.join(tmp, "gh-data.json");
// (GitHub's API, for the security-review check and the core-moved run: one pull request whose security review Codex's
// app says is completed, no issues; what is posted is written to a log)
fs.writeFileSync(path.join(stubs, "gh"), `#!/usr/bin/env node
const fs = require("fs");
const a = process.argv.slice(2), data = JSON.parse(fs.readFileSync(process.env.GH_DATA, "utf8"));
const log = line => fs.appendFileSync(process.env.GH_LOG, line + "\\n");
if (a[0] !== "api") { log(a.join(" ")); process.exit(0); }
const takes = new Set(["-X", "--method", "--input", "--jq", "-q", "-f", "-F", "-H"]);
let route = null; for (let i = 1; i < a.length; i++) { if (takes.has(a[i])) { i++; continue; } if (!a[i].startsWith("-")) { route = a[i]; break; } }
const method = a.includes("-X") ? a[a.indexOf("-X") + 1] : "GET";
if (method !== "GET") { log(method + " " + route + " " + fs.readFileSync(0, "utf8").replace(/\\s+/g, " ")); console.log("{}"); process.exit(0); }
if (a.includes("--jq") || a.includes("-q")) process.exit(0);
const found = Object.entries(data).find(([pattern]) => new RegExp(pattern).test(route));
if (!found) { console.error("gh stand-in: no route for " + route); process.exit(1); }
console.log(JSON.stringify(a.includes("--slurp") ? [found[1]] : found[1]));
`, { mode: 0o755 });
const PATHKEY = Object.keys(env).find(k => k.toUpperCase() === "PATH") ?? "PATH";
const base = { ...env, [PATHKEY]: `${stubs}${path.delimiter}${env[PATHKEY]}`, GH_LOG: ghLog, GH_DATA: ghData };
const summary = sha => ({ user: { login: "chatgpt-codex-connector[bot]", type: "Bot" }, author_association: "NONE", created_at: "2026-11-13T10:00:00Z", updated_at: "2026-11-13T10:00:00Z",
  body: `<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 ${JSON.stringify({ code_review: { commit_sha: sha, status: "completed" }, security_review: { commit_sha: sha, has_any_findings: null, has_unresolved_findings: null, status: "completed" } }).replaceAll("{", "&#123;").replaceAll("}", "&#125;")} -->\n<details>the table</details>` });

const version = spawnSync("dotnet", ["--version"], { env, encoding: "utf8" });
const sdk = version.status === 0;
const tfm = `net${sdk ? version.stdout.trim().split(".")[0] : "9"}.0`; // (the SDK's own, so the restore takes no targeting pack from the network)
ok(sdk || !process.env.GITHUB_ACTIONS, "on GitHub's runners there is a .NET SDK, so the NuGet check's restore runs here as in a project");
const sdkEnv = { DOTNET_CLI_TELEMETRY_OPTOUT: "1", DOTNET_NOLOGO: "1", DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1", MSBUILDDISABLENODEREUSE: "1", DOTNET_CLI_USE_MSBUILD_SERVER: "0", UseSharedCompilation: "false", DOTNET_CLI_HOME: path.join(tmp, "sdk-home"), NUGET_HTTP_CACHE_PATH: path.join(tmp, "sdk-http") };
// (two invented terms, built from pieces as the test runs, so that no file holds them and the check finds none)
const terms = [["qz", "vk", "wy"], ["xj", "qq", "zf"]].map(t => t.join("")).join("\n");
const ownersName = { GIT_AUTHOR_NAME: `An owner ${terms.split("\n")[0]}`, GIT_COMMITTER_NAME: `An owner ${terms.split("\n")[0]}` };
const BODY = "A change.\n\n## What the owner can try\n\nNothing.\n\n## Readings taken\n\nNone.\n";

// ---- a project of another owner's, written by the starter kit of the release `from` ----
function project(name, from, { owner, kit, isPrivate, windows, files, as }) {
  const dir = path.join(tmp, name), origin = path.join(tmp, `${name}.git`);
  git(tmp, "init", "-q", "--bare", "-b", "main", origin);
  fs.mkdirSync(dir);
  if (as) named.set(dir, as);
  git(dir, "init", "-q", "-b", "main");
  if (windows) { git(dir, "config", "core.fileMode", "false"); git(dir, "config", "core.autocrlf", "true"); }
  git(dir, "remote", "add", "origin", origin);
  files(dir);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "the project");
  const k = node(dir, path.join(from.dir, "scripts", "init.mjs"), "--owner", owner, "--name", name, "--at", from.sha, ...kit);
  ok(k.status === 0, `${name}: the starter kit of ${from.tag} writes it`, k.out);
  return { name, dir, owner, isPrivate, named: !!as, repo: `${owner}/${name}` };
}
const write = (dir, to, text) => { fs.mkdirSync(path.dirname(path.join(dir, to)), { recursive: true }); fs.writeFileSync(path.join(dir, to), text); };

let runs = 0;
// Every workflow of the project's that one event starts, and in it each call to a workflow of the core's, as GitHub
// would run it on the commit `sha` (a pull request: the head, against `baseSha`). Each result: [file/job, result].
function checks(p, event, sha, { baseSha = "", title = "A change", body = BODY, dry = false } = {}) {
  const repository = { default_branch: "main", private: p.isPrivate, full_name: p.repo };
  const pull = { number: 1, state: "open", draft: false, title, body, base: { sha: baseSha, ref: "main" }, head: { sha, ref: "change", repo: { full_name: p.repo } }, user: { login: p.owner } };
  const github = { event_name: event, repository: p.repo, actor: p.owner, server_url: "https://github.com", run_id: "1", token: "", sha,
    base_ref: event === "pull_request" ? "main" : "", head_ref: event === "pull_request" ? "change" : "", ref: event === "pull_request" ? "refs/pull/1/merge" : "refs/heads/main",
    event: event === "pull_request" ? { action: "synchronize", pull_request: pull, repository } : event === "push" ? { ref: "refs/heads/main", before: baseSha, after: sha, repository } : { repository } };
  fs.writeFileSync(ghData, JSON.stringify({ "pulls/1$": pull, "issues/1/comments": [summary(sha)], "pulls/1/comments": [], "pulls/1/commits": [{ sha, commit: { author: { name: p.owner } }, author: { login: p.owner } }], "/issues\\?": [] }));
  const workspace = () => {
    const ws = path.join(tmp, "ws", String(++runs));
    git(tmp, "clone", "-q", "--no-checkout", p.dir, ws);
    git(ws, "checkout", "-q", "--detach", sha);
    return ws;
  };
  const uses = {
    "actions/checkout": (w, ws) => {
      if (w.repository) {
        if (w.repository !== CORE) throw new Error(`a checkout of another repository: ${w.repository}`);
        const to = path.join(ws, w.path || ".");
        git(tmp, "clone", "-q", "--no-checkout", theCore, to);
        git(to, "checkout", "-q", "--detach", w.ref || "main");
      } else if (w.ref) git(ws, "checkout", "-q", "--detach", git(ws, "rev-parse", `origin/${w.ref}`));
    },
    "actions/setup-node": () => {}, // (the Node this test runs on is the core's own, in CI)
    "actions/dependency-review-action": () => false,
    "github/codeql-action/init": () => false,
    "github/codeql-action/analyze": () => false,
  };
  const out = [];
  const wfDir = git(p.dir, "ls-tree", "--name-only", `${sha}:.github/workflows`).split("\n").filter(f => /\.ya?ml$/.test(f));
  for (const file of wfDir) {
    const wf = parseYaml(git(p.dir, "show", `${sha}:.github/workflows/${file}`));
    const on = wf.on;
    const trigger = typeof on === "string" ? (on === event ? {} : null) : Array.isArray(on) ? (on.includes(event) ? {} : null) : on?.[event] === undefined ? null : on[event] ?? {};
    if (trigger === null) continue;
    if (trigger.branches && !trigger.branches.includes("main")) continue;
    if (event === "pull_request" && trigger.types && !trigger.types.includes("synchronize") && !trigger.types.includes("opened")) continue;
    for (const [id, job] of Object.entries(wf.jobs ?? {})) {
      const call = new RegExp(`^${CORE.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&")}/\\.github/workflows/([\\w.-]+)@([0-9a-f]{40})$`, "i").exec(job.uses ?? "");
      if (!call) { out.push([`${file}/${id}`, { job: id, ran: true, passed: true, steps: [], own: true }]); continue; }
      if (call[1] === "nuget.yml" && !sdk) { out.push([`${file}/${id}`, { job: id, ran: true, passed: true, steps: [] }]); console.log(`note ${p.name}: no .NET SDK here, so the NuGet check is not run`); continue; }
      const text = git(theCore, "show", `${call[2]}:.github/workflows/${call[1]}`);
      const callerCtx = { github, inputs: {}, secrets: { PERSONAL_TERMS: terms }, vars: {} };
      const inputs = Object.fromEntries(Object.entries(job.with ?? {}).map(([k, v]) => [k, typeof v === "string" && v.includes("${{") ? evaluate(v.replace(/^\$\{\{|\}\}$/g, ""), callerCtx) : v]));
      const secrets = job.secrets === "inherit" ? { PERSONAL_TERMS: terms } : Object.fromEntries(Object.entries(job.secrets ?? {}).map(([k, v]) => [k, evaluate(String(v).replace(/^\$\{\{|\}\}$/g, ""), callerCtx)]));
      const caller = { ...github, workflow_ref: `${p.repo}/.github/workflows/${file}@${github.ref}` };
      for (const r of runWorkflow(text, { inputs, secrets, github: caller, base: { ...base, ...sdkEnv }, workspace, uses, dry, temp: tmp })) out.push([`${file}/${id}/${r.job}`, r]);
    }
  }
  return out;
}
const failures = results => results.filter(([, r]) => !r.passed).map(([where, r]) => `${where}: ${r.steps.filter(s => !s.passed).map(s => `${s.name}\n${s.out.trim().split("\n").slice(-8).join("\n")}`).join("\n")}`).join("\n");
const started = results => results.filter(([, r]) => r.ran).map(([where]) => where).sort();

// Whether a step of a workflow of the project's ran, in a set of results.
const ran = (results, file, step) => results.some(([where, r]) => where.startsWith(`${file}/`) && r.steps.some(x => x.name === step && x.ran));
const jobRan = (results, file) => results.some(([where, r]) => where.startsWith(`${file}/`) && r.ran);

function upgrade(p, ownChanges, expect) {
  git(p.dir, "commit", "-q", "-m", "the starter kit");
  git(p.dir, "push", "-q", "origin", "main");
  const main0 = git(p.dir, "rev-parse", "HEAD");
  // a pull request of the project's own, before the sync: which jobs it starts
  const own = (from, change) => { git(p.dir, "checkout", "-q", "-B", "change", from); change(p.dir); git(p.dir, "add", "-A"); git(p.dir, "commit", "-q", "-m", "a change of its own"); git(p.dir, "push", "-q", "-f", "origin", "change"); return git(p.dir, "rev-parse", "HEAD"); };
  const was = ownChanges.map(([what, change]) => [what, started(checks(p, "pull_request", own(main0, change), { baseSha: main0, dry: true }))]);

  // the sync, as the project's own copy of the release's sync.mjs makes it
  git(p.dir, "checkout", "-q", "-B", "sync", main0);
  const s = node(p.dir, "core/scripts/sync.mjs");
  ok(s.status === 0 && s.out.includes(carrying), `${p.name}: its own sync script takes the release that carries the change, ${carrying}`, s.out);
  git(p.dir, "add", "-A");
  git(p.dir, "commit", "-q", "-m", `Sync the core to ${carrying}`);
  git(p.dir, "push", "-q", "origin", "sync");
  let syncHead = git(p.dir, "rev-parse", "HEAD");
  let onSync = checks(p, "pull_request", syncHead, { baseSha: main0, title: `Sync the core to ${carrying}` });
  if (p.named) {
    // its machine writes a listed name into every commit: the personal-terms check alone fails, saying how to mend it,
    // and the session mends it in the pull request itself, as the failure says (core archive 202)
    const failed = onSync.filter(([, r]) => !r.passed);
    ok(failed.length === 1 && failed[0][0].startsWith("personal-terms.yml/") && failed[0][1].steps.some(x => /To mend it, on the machine that made them/.test(x.out)),
      `${p.name}: on the sync's pull request, its commit carrying a listed name, only the personal-terms check fails, and it says how to mend it`, failures(onSync));
    named.set(p.dir, { GIT_AUTHOR_NAME: p.owner, GIT_AUTHOR_EMAIL: `${p.owner}@users.noreply.github.com`, GIT_COMMITTER_NAME: p.owner, GIT_COMMITTER_EMAIL: `${p.owner}@users.noreply.github.com` });
    git(p.dir, "rebase", "-q", "--exec", "git commit --amend --no-edit --reset-author", "origin/main");
    git(p.dir, "push", "-q", "--force-with-lease", "origin", "sync");
    syncHead = git(p.dir, "rev-parse", "HEAD");
    onSync = checks(p, "pull_request", syncHead, { baseSha: main0, title: `Sync the core to ${carrying}` });
  }
  ok(!failures(onSync), `${p.name}: every check passes on the sync's pull request (${started(onSync).length} jobs${p.named ? ", once mended" : ""})`, failures(onSync));
  const pure = node(p.dir, path.join(theCore, "scripts", "pure-sync.mjs"));
  ok(pure.status === 0 && pure.out.includes(`sha=${syncHead}`), `${p.name}: the sync is pure, as pure-sync.mjs reads it from the release it moves to, whatever modes git here records`, pure.out);

  // merged, as its merger merges it, and pushed to main
  git(p.dir, "checkout", "-q", "main");
  git(p.dir, "merge", "-q", "--no-ff", "-m", "Merge the sync", "sync");
  git(p.dir, "push", "-q", "origin", "main");
  const main1 = git(p.dir, "rev-parse", "HEAD");
  const onPush = checks(p, "push", main1, { baseSha: main0 });
  ok(!failures(onPush), `${p.name}: every check passes on main after the merge (${started(onPush).length} jobs)`, failures(onPush));
  if (process.platform !== "win32") { // (the run is GitHub's, on Linux; its script starts gh as a program, which a stand-in on Windows cannot be)
    const daily = checks(p, "schedule", main1);
    ok(!failures(daily) && started(daily).some(w => w.startsWith("core-moved.yml")), `${p.name}: the daily core-moved run passes`, failures(daily));
  }

  // its own pull requests after the sync: they pass, and start no job they did not start before it
  for (const [what, change] of ownChanges) {
    const results = checks(p, "pull_request", own(main1, change), { baseSha: main1 });
    const before = was.find(([w]) => w === what)[1];
    ok(!failures(results), `${p.name}: a pull request of its own that ${what} passes every check after the sync`, failures(results));
    const more = started(results).filter(w => !before.includes(w));
    ok(!more.length, `${p.name}: and starts no job it did not start before the sync (${started(results).length} now, ${before.length} before)`, more.join("\n"));
    for (const [holds, said] of expect(results, what)) ok(holds, `${p.name}: on a pull request that ${what}, ${said}`);
  }

  // its hooks, as Claude Code runs them: from main's copy, through the commands of its settings
  git(p.dir, "checkout", "-q", "main");
  git(p.dir, "fetch", "-q", "origin");
  const settings = JSON.parse(fs.readFileSync(path.join(p.dir, ".claude/settings.json"), "utf8")).hooks;
  const hook = (event, input) => {
    const command = settings[event][0].hooks[0].command;
    const r = spawnSync("bash", ["-c", command], { cwd: p.dir, input: JSON.stringify(input), env: { ...base, CLAUDE_PROJECT_DIR: p.dir }, encoding: "utf8" });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const start = hook("SessionStart", { hook_event_name: "SessionStart", source: "startup", session_id: "s1" });
  const call = hook("PreToolUse", { hook_event_name: "PreToolUse", session_id: "s1", tool_name: "Agent", tool_input: { description: "x", prompt: "y", subagent_type: "general-purpose", model: "sonnet", effort: "medium" } });
  const stop = hook("Stop", { hook_event_name: "Stop", session_id: "s1", stop_hook_active: false });
  ok(start.status === 0 && call.status === 0 && stop.status === 0 && !/"decision"\s*:\s*"block"/.test(stop.out + start.out), `${p.name}: its hooks run from main's copy and stop nothing in a clean clone`, `${start.out}\n${call.out}\n${stop.out}`);
}

for (const tag of starts) {
  const from = { tag, sha: git(theCore, "rev-parse", `${tag}^{commit}`), dir: path.join(tmp, `core-at-${tag}`) };
  git(tmp, "clone", "-q", theCore, from.dir);
  git(from.dir, "checkout", "-q", from.sha);

  // the npm project, public
  const npmProject = project(`an-npm-project-from-${tag}`, from, { owner: "someone-else", kit: ["--npm", "."], isPrivate: false, files: dir => {
    write(dir, "package.json", '{\n  "name": "an-npm-project",\n  "version": "1.0.0",\n  "private": true,\n  "dependencies": {\n    "ms": "2.1.3"\n  }\n}\n');
    write(dir, "package-lock.json", `${JSON.stringify({ name: "an-npm-project", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "an-npm-project", version: "1.0.0", dependencies: { ms: "2.1.3" } },
      "node_modules/ms": { version: "2.1.3", resolved: "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz", integrity: "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==", license: "MIT" } } }, null, 2)}\n`);
    write(dir, "README.md", "# An npm project\n");
    write(dir, ".gitignore", "node_modules/\n");
  } });
  upgrade(npmProject, [["touches only its docs", dir => write(dir, "README.md", "# An npm project\n\nMore words.\n")],
    ["touches its package list", dir => write(dir, "package.json", fs.readFileSync(path.join(dir, "package.json"), "utf8").replace('"private": true,', '"private": true,\n  "description": "a project",'))]],
  (results, what) => [[jobRan(results, "security-review.yml"), "a public repository's security-review check runs as before"],
    [ran(results, "signatures.yml", "Install from the lock file, from the registry alone, running no package's install script") === what.includes("package"), "the signature check installs only where the package list changed"]]);

  // the .NET project, private, held as Windows holds it
  const dotnetProject = project(`a-dotnet-project-from-${tag}`, from, { owner: "someone-else", kit: ["--nuget", ".", "--private"], isPrivate: true, windows: true, as: ownersName, files: dir => {
    write(dir, "src/App/App.csproj", `<Project Sdk="Microsoft.NET.Sdk">\r\n  <PropertyGroup>\r\n    <OutputType>Exe</OutputType>\r\n    <TargetFramework>${tfm}</TargetFramework>\r\n    <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>\r\n  </PropertyGroup>\r\n</Project>\r\n`);
    write(dir, "src/App/Program.cs", 'System.Console.WriteLine("Hello");\r\n');
    write(dir, "src/App/packages.lock.json", `{\r\n  "version": 1,\r\n  "dependencies": {\r\n    "${tfm}": {}\r\n  }\r\n}\r\n`);
    write(dir, "README.md", "# A .NET project\r\n");
    write(dir, ".gitignore", "bin/\r\nobj/\r\n");
  } });
  const config = path.join(dotnetProject.dir, "checks/licences.json");
  fs.writeFileSync(config, `${JSON.stringify({ ...JSON.parse(fs.readFileSync(config, "utf8")), nuget: { ships: ["src/App/packages.lock.json"], tools: [] } }, null, 2)}\n`);
  git(dotnetProject.dir, "add", "-A");
  ok(git(dotnetProject.dir, "ls-files", "-s").split("\n").every(l => l.startsWith("100644 ")), `${dotnetProject.name}: every file it holds is 100644, as on Windows, the copy of the core's scripts too`);
  upgrade(dotnetProject, [["touches only its docs", dir => write(dir, "README.md", "# A .NET project\r\n\r\nMore words.\r\n")],
    ["touches a project file", dir => write(dir, "src/App/App.csproj", fs.readFileSync(path.join(dir, "src/App/App.csproj"), "utf8").replace("</Project>", "  <!-- a note -->\r\n</Project>"))]],
  (results, what) => [[!jobRan(results, "security-review.yml"), "a private repository's security-review check starts no job, so none is billed"],
    ...(sdk ? [[ran(results, "nuget.yml", "Restore each project file from its lock file alone") === what.includes("project file"), "the NuGet check restores only where something NuGet reads changed"]] : [])]);

}

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions: a project of each of the last two releases, synced to this commit, passes every check unchanged`);
process.exitCode = failed ? 1 : 0;
