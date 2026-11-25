// The core's checks from plain git (tasks/hosts.md, "One layer knows no host"; core archive 236; #250). Run from a
// project's root, on a person's machine or in any host's pipeline, it runs each workflow of the core's that the project
// calls, as GitHub would run it for a pull request into main (`--base`, the commit it merges into) or for a push to main
// (none given), on the commit checked out (for a pull request, merged into its base, as GitHub merges it, the base its first
// parent): each step's own shell, through workflow-run.mjs, so that no check is written
// twice. The calls are the base's (on a push, main's own), so a change cannot leave a check out by taking its call out,
// save a sync's, which runs its own (check-calls.mjs): the project's .github/workflows, or, where it has none, as on another host, the starter kit's in the base's copy,
// each with the inputs the kit gives them (a template the kit fills in with more than the core's address and pin is
// left out, and said so). core.yml runs first, and where the copy of the core is not the core at its pin no other check
// runs, since each runs the copy's scripts (the steps core.yml runs after its own, given its inputs, among them: a step of
// its own that fails stops the rest here, as a run cancelled there; #376), each stopped so said; with no call to core.yml, or none run, it fails. Each called workflow is
// read from the core at the call's pin, fetched from the core's address by git, as GitHub reads it, never from the
// copy under core/, which the change may have edited; and a pipeline runs this script itself from a clone of the core,
// not from that copy (tasks/hosts.md). It runs in a scratch clone of the commit, removed at its end, so it changes
// nothing in the project. What its steps run with, as they run the change's own code: KEPT, below. What only the
// host can do (a review app's status, the dependency review, code scanning, a job started by a schedule) is not run
// here and is named: that is the host's part, and where a host has none, what stands in is in its
// part (tasks/hosts.md). The personal-terms list is read from the environment (PERSONAL_TERMS), never from a file, as
// the host keeps it among its secrets, and each of its terms is printed as *** wherever a step prints it, in any case. It prints
// each job, each step the host alone runs, and each failing step with what it printed; it exits 1 where one failed or could not run here.
// With --own it runs the project's own jobs too (#1084), each job of its own workflows that calls no workflow and names
// no environment, as the change itself holds them, given no secret, after the core's and only where the copy is the core; with
// --verdicts it writes each job's verdict, "passed", "failed", "unrun", "stopped" behind a failure, or "unread" where this cannot read it (#1263; the jobs it can read run
// on, each with its own; a whole file "unread" only where none could run), by its place (a stopped one by the key it runs under), to a file, and
// RUN_FROM where this script lies outside the project, so that a run before an update and one after can be set side by side (release-trial.mjs, compared).
// Git, bash and Node's own modules, the core's packages (packages.mjs), and gh where the manifest has no owner's row and no workflow's event says whose
// account holds the repository (releases.mjs, hostAccount).
//
//   node core/scripts/check.mjs [--base <commit>] [--title <the pull request's title>] [--description <a file>]
//                               [--branch <the branch's name, where none is checked out>] [--own] [--verdicts <a file>]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { calledKeys, closing, gates, movesForward, ownFailed, ownJobs, proves, readable, syncCalls, triggered, unrunWhy } from "./check-calls.mjs";
import { standIns } from "./check-actions.mjs";
import { CORE, CORE_SOURCE } from "./core-address.mjs";
import { carriedAt, readCore } from "./core-path.mjs";
import { MEND } from "./mend.mjs";
import { hostSaid, plainEnv } from "./releases.mjs";
import { started } from "./started.mjs";
import { leadsOut } from "./guards.mjs";
import { installed, notInstalled } from "./packages.mjs";
import { parseYaml } from "./parse-yaml.mjs";
import { evaluate, runWorkflow, withAbsolutePath } from "./workflow-run.mjs";

// The core's workflows a project calls that only the host can run, each with why: check-test.mjs holds that every
// workflow the starter kit calls is run here or named here.
export const HOST_OWN = {
  "security-review.yml": "the security review's status reads the host's reviews and comments",
  "codeql.yml": "code scanning is the host's own",
  "delete-merged-branches.yml": "it deletes branches on the host after a merge",
  "look.yml": "the daily look is started by the host's schedule",
  "core-moved.yml": "it is started by the host's schedule",
  "versions.yml": "it is started by the host's schedule",
  "preview.yml": "it is started by the host once a game's build has run, and publishes a preview, checking nothing",
};

// What --verdicts adds where this script lies outside the project (#1244): no job's place, which names a file.
export const RUN_FROM = "(run from)";

// (the caller's environment, its PATH held to absolute folders: an empty or relative entry is the folder a program
// starts in, which the change under check fills, on any system; #513)
const env = withAbsolutePath(plainEnv());
// What the steps run with, since they run the change's own code (its scripts, its packages' restore): only what a
// program needs to start and reach the network, by name (on Windows ProgramFiles too, for NuGet; #1239), a scratch home
// folder holding the user's folders and the machine's NuGet reads configs from, no system git settings, and of git's
// settings only the rewrites of an address (url.*.insteadOf), so no token in this environment or in git's settings
// reaches them. They still run as the caller's user, so a pipeline runs this where no sign-in is held (tasks/hosts.md).
const KEPT = /^(PATH|LANG|LC_[A-Z]+|TZ|TMPDIR|TEMP|TMP|SYSTEMROOT|WINDIR|COMSPEC|PATHEXT|PROGRAMFILES|HTTPS?_PROXY|NO_PROXY|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE|SSL_CERT_DIR|GIT_ALLOW_PROTOCOL)$/i;
export function stepEnv(home) {
  const kept = Object.fromEntries(Object.entries(env).filter(([name]) => KEPT.test(name)));
  const rewrites = [];
  for (let i = 0; i < Number(env.GIT_CONFIG_COUNT ?? 0); i++) {
    const key = env[`GIT_CONFIG_KEY_${i}`] ?? "";
    // (a rewrite that carries a sign-in, "url.https://user:token@host/.insteadOf", is left out)
    if (/^url\..+\.insteadof$/i.test(key) && !/:\/\/[^/]*@/.test(key)) rewrites.push([key, env[`GIT_CONFIG_VALUE_${i}`] ?? ""]);
  }
  const git = Object.fromEntries(rewrites.flatMap(([key, value], i) => [[`GIT_CONFIG_KEY_${i}`, key], [`GIT_CONFIG_VALUE_${i}`, value]]));
  const own = { APPDATA: "Roaming", LOCALAPPDATA: "Local", ProgramData: "Data", "ProgramFiles(x86)": "x86", NUGET_COMMON_APPLICATION_DATA: "Common" };
  for (const d in own) fs.mkdirSync(own[d] = path.join(home, own[d]), { recursive: true });
  return { ...kept, ...git, GIT_CONFIG_COUNT: String(rewrites.length), GIT_CONFIG_NOSYSTEM: "1", HOME: home, USERPROFILE: home, ...own };
}
let coreClone = null; // (the clone of the core's address, made at the first call: coreFile)
const verdicts = {}; // (each job's verdict that ran, by its place, for --verdicts)
const git = (cwd, ...a) => execFileSync("git", a, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }).trim();
// Every line printed, each term of the personal-terms list (PERSONAL_TERMS, the host's secret) printed as ***, in any
// letters' case, as the check matches it: a workflow's, a job's or a step's name too, not only what a step printed.
const TERMS = (process.env.PERSONAL_TERMS ?? "").split(/\r?\n/).map(t => t.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
const mask = text => TERMS.reduce((t, term) => t.replace(new RegExp(term.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&"), "gi"), "***"), String(text));
const say = text => console.log(mask(text));
const warn = text => console.error(mask(text));
const fail = (what, mend) => { warn(`FAIL ${what} ${MEND}${mend}`); process.exit(1); };
const call = new RegExp(`^${CORE_SOURCE}/\\.github/workflows/([\\w.-]+)@([0-9a-f]{40})$`, "i");

// It runs only as a command; tests import its HOST_OWN and stepEnv.
if (started(import.meta.url)) main();

function main() {
  // (on Windows, no program is looked for in the folder a check runs in, which the change under check fills: neither git
  // here nor bash and what it starts in a step, as checks.mjs holds too; every other system looks only on the PATH; #513)
  // (and what this process starts, git and gh, looks only in the PATH's absolute folders)
  if (process.platform === "win32") process.env.NoDefaultCurrentDirectoryInExePath = "1";
  for (const [key, value] of Object.entries(withAbsolutePath({ ...process.env }))) if (/^path$/iu.test(key)) process.env[key] = value;
  const o = options();
  // (a clone of the core installs none itself, as a copy does: #1245, point 6)
  if (!installed("yaml")) { const [what, mend] = notInstalled("yaml").split(". Mend: "); fail(`no workflow can be read here: ${what}.`, mend); }
  const p = { ...project(o), own: o.own, verdicts: o.verdicts === null ? null : path.resolve(o.verdicts) };
  if (p.verdicts !== null) outside(p, o.verdicts);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "core-check-"));
  process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } });
  const counts = runAll(p, runner(p, tmp), calledJobs(p, tmp), tmp);
  if (p.verdicts !== null) writeVerdicts(p, o.verdicts);
  if (!counts.failed && !counts.ran && !counts.unrun) fail("no check of the core ran on this change.", "call the core's workflows in the base the change merges into, as the starter kit writes them.");
  process.exitCode = closing(counts, say, warn);
}

// --verdicts names a file outside the project's repository, and no link: leadsOut reads a link to nothing as leading
// out, and a write follows a link to where it points.
function outside(p, given) {
  if (!leadsOut(p.root, p.verdicts)) fail(`--verdicts ${given} lies in the project's own repository, which this check writes nothing in.`, "give a file in a scratch folder outside every repository.");
  const at = fs.lstatSync(p.verdicts, { throwIfNoEntry: false });
  if (at && !at.isFile()) fail(`--verdicts ${given} is ${at.isSymbolicLink() ? "a link" : "no file"}, which this check writes nothing through.`, "give a file in a scratch folder outside every repository, one that is no link and does not stand yet or is a file.");
}

// Writes the verdicts afresh, once more held outside the project, the file that stood taken out first and the new one
// made only where nothing stands, so what the jobs left there in the meantime is never followed.
function writeVerdicts(p, given) {
  outside(p, given);
  try {
    fs.rmSync(p.verdicts, { force: true });
    const from = leadsOut(p.root, fileURLToPath(import.meta.url)) ? { [RUN_FROM]: "a clone of the core" } : {};
    fs.writeFileSync(p.verdicts, `${JSON.stringify({ ...verdicts, ...from }, null, 2)}\n`, { flag: "wx" });
  } catch (e) { fail(`--verdicts ${given} could not be written (${e.code ?? e.message}).`, "give a file in a scratch folder outside every repository that nothing else writes to, and run the check again."); }
}

// The jobs that call a workflow of the core's and start on this change, core.yml's first; it fails where none is core.yml.
function calledJobs(p, tmp) {
  const jobs = callers(p, tmp).filter(({ wf }) => triggered(wf.on, p))
    .flatMap(({ file, wf, base }) => Object.entries(wf.jobs ?? {}).map(([id, job]) => ({ file, id, job, base: Boolean(base), name: call.exec(String(job?.uses ?? ""))?.[1] })))
    .filter(j => j.name).sort((a, b) => (b.name === "core.yml") - (a.name === "core.yml"));
  if (!jobs.some(j => j.name === "core.yml")) fail("no call to the core's core.yml starts on this change, so nothing proves the copy of the core is the core.", "call it on every pull request and push to main, as the starter kit's .github/workflows/core.yml does, in the base the change merges into.");
  return jobs;
}

// Runs those jobs, then, with --own, the project's own, where the copy is the core: how many ran, and how many failed.
// Where it is not, each job left that would run is written stopped (#1245, point 2).
function runAll(p, run, jobs, tmp) {
  const n = { failed: 0, ran: 0, unrun: 0 };
  let proved = false;
  for (const [i, j] of jobs.entries()) {
    const r = run(j.file, j.id, j.job);
    n.failed += r.failed; n.ran += r.ran; n.unrun += r.unrun | 0;
    proved ||= proves(j, r, p.pin);
    if (!gates(j, r, proved)) continue;
    // (core.yml unrun here proves nothing of the copy, so it stops the rest as its failure does)
    if (!r.failed) n.failed++;
    stopBehind(p, r, jobs.slice(i + 1), tmp);
    return n;
  }
  if (p.own) for (const o of ownWorkflows(p)) { const r = run.own(o); n.failed += r.failed; n.ran += r.ran; n.unrun += r.unrun | 0; }
  return n;
}

// Says why the rest stop, and writes each job left that would run stopped, by the key it is written under where it runs
// (#1258, point 2): a call's, one for each job of the workflow it calls, as report() writes them.
function stopBehind(p, r, rest, tmp) {
  warn(`FAIL the copy of the core is ${r.failed ? "not the core at its pin" : "not proved the core, core.yml not run here"}, so no other check runs: each would run the copy's scripts. ${MEND}${r.failed ? "mend what core.yml says above, commit," : "run core.yml as its skip line above says,"} and run this check again.`);
  const left = [...rest.filter(l => !HOST_OWN[l.name] && (l.name !== "pr-description.yml" || p.described)).flatMap(l => calledKeys(l, uses => { const [, name, pin] = call.exec(uses) ?? []; return name ? coreFile(tmp, pin, `.github/workflows/${name}`) : null; })),
    ...(p.own ? ownWorkflows(p).flatMap(o => (o.wf === null ? [o.file] : Object.keys(o.wf.jobs).map(id => `${o.file}/${id}`))) : [])];
  for (const at of left) { verdicts[at] = "stopped"; say(`stop ${at}: not run, behind the failure above`); }
}

// The options given, each checked.
function options() {
  const args = process.argv.slice(2);
  for (const a of args) if (a.startsWith("--") && !["--base", "--title", "--description", "--branch", "--own", "--verdicts"].includes(a)) fail(`${a} is no option of this check.`, "use --base, --title, --description, --branch, --own or --verdicts, as the usage line at the top of scripts/check.mjs shows.");
  const opt = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1] ?? fail(`${name} is given no value.`, "give it one, as the usage line at the top of scripts/check.mjs shows."); };
  return { base: opt("--base"), title: opt("--title"), description: opt("--description"), branch: opt("--branch"), own: args.includes("--own"), verdicts: opt("--verdicts") };
}

// The pin of the core the manifest's text names (core-path.mjs): its own, or, where a library carries the core, the
// library's, read from the commit `rev` of the repository at `root` (`show` gives a file's text there); where the
// library is a submodule, from the library's commit `rev` pins, in the submodule's own repository. { pin } or { wrong }.
function pinAt(manifest, root, rev, show) {
  const line = readCore(manifest);
  if (line.wrong || line.form === "copied") return line;
  const lib = line.library.slice(0, -1);
  const inSubmodule = f => { try { return git(path.join(root, lib), "show", `${git(root, "rev-parse", `${rev}:${lib}`)}:${f.slice(line.library.length)}`); } catch { return null; } };
  return carriedAt(line, f => show(rev, f) ?? inSubmodule(f));
}

// The project at the commit checked out: its root, head, base, manifest's pin and owner, and the pull request's text.
function project({ base: baseArg, title, description, branch }) {
  let root;
  try { root = git(process.cwd(), "rev-parse", "--show-toplevel"); } catch { fail("this folder is in no git repository.", "run it from the project's root, in its clone."); }
  const show = (rev, file) => { try { return git(root, "show", `${rev}:${file}`); } catch { return null; } };
  const head = git(root, "rev-parse", "HEAD");
  const manifest = show(head, "core-manifest.md");
  if (manifest === null) fail("core-manifest.md is not in the commit checked out.", "run it from the root of a project that takes the core, at a commit that holds its manifest.");
  const pin = pinAt(manifest, root, head, show);
  if (pin.wrong) { const [what, mend] = pin.wrong.split(" Mend: "); fail(what, mend ?? "write the manifest's \"Core:\" line as the sync writes it."); }
  let base = "";
  if (baseArg !== null) {
    try { base = git(root, "rev-parse", "--verify", `${baseArg}^{commit}`); } catch { fail(`--base ${baseArg} is no commit of this repository.`, "give the commit the change merges into, such as origin/main after a fetch."); }
  }
  let body = "";
  if (description !== null) {
    try { body = fs.readFileSync(description, "utf8"); } catch { fail(`--description ${description} cannot be read.`, "give the path of a file that holds the pull request's description."); }
  }
  const owner = /^\| \*owner's account\* \| `([A-Za-z0-9-]+)` \|$/m.exec(manifest)?.[1] ?? "";
  // (the branch's own name, which the personal-terms check reads too: given, or the one checked out)
  let named = branch;
  if (named === null) { try { named = git(root, "symbolic-ref", "--short", "-q", "HEAD"); } catch { named = ""; } }
  return { root, show, head, pin: pin.pin, base, owner, body, described: description !== null, branch: named || "change", title: title ?? git(root, "log", "-1", "--format=%s", head),
    event: base ? "pull_request" : "push", changed: base ? git(root, "diff", "-z", "--name-only", `${base}...${head}`).split("\0").filter(Boolean) : [] };
  // (-z: each path as it is, never quoted as git quotes a name beyond ASCII, so a workflow's path filter reads it)
}

// The project's calls to the core's workflows, as the base the change merges into holds them (on a push, main's own),
// so a change cannot leave a check out by taking its call out, or, of a sync, its own (check-calls.mjs): from its
// .github/workflows; where it has none, the starter kit's, from the core itself at the pin the manifest holds (never
// from a copy a change could edit).
function callers({ root, show, head, base }, tmp) {
  const pinOf = rev => pinAt(show(rev, "core-manifest.md") ?? "", root, rev, show).pin ?? "";
  const sync = base && movesForward(pinOf(base), pinOf(head), (a, b) => { try { coreGit(tmp, "merge-base", "--is-ancestor", a, b); return true; } catch { return false; } });
  if (sync) say(`note the change moves the core's pin forward along its main (${pinOf(base).slice(0, 7)} to ${pinOf(head).slice(0, 7)}), a sync: its own calls run, as GitHub runs them`);
  const at = sync ? head : base || head, pin = pinOf(at);
  const calls = job => call.test(String(job?.uses ?? ""));
  const listed = rev => { try { return git(root, "ls-tree", "-z", "--name-only", `${rev}:.github/workflows`).split("\0").filter(f => /\.ya?ml$/.test(f)); } catch { return []; } };
  const read = rev => listed(rev).map(f => readable(f, show(rev, `.github/workflows/${f}`), { say, fail })).filter(Boolean);
  // (a base's call moved to the head's pin, from whatever pin it held, where the workflow it calls stands there: #1258)
  const moved = uses => { const m = call.exec(String(uses)); return m && coreFile(tmp, pin, `.github/workflows/${m[1]}`) !== null ? String(uses).replace(/@[0-9a-f]{40}$/u, `@${pin}`) : uses; };
  const own = sync ? syncCalls(read(base), read(head), calls, moved) : read(at);
  if (own.some(c => Object.values(c.wf.jobs ?? {}).some(calls))) return own;
  const kit = [];
  const templates = coreFile(tmp, pin, "setup/template/workflows", true);
  if (templates === null) fail(`the manifest pins the core at ${pin || "no commit"}, where the starter kit's calls cannot be read.`, "write the manifest's \"Core:\" line as the sync writes it.");
  for (const f of templates.split("\n").filter(f => f.endsWith(".yml.tmpl"))) {
    const text = coreFile(tmp, pin, `setup/template/workflows/${f}`).replaceAll("{{core}}", CORE).replaceAll("{{pin}}", pin);
    const left = text.match(/\{\{[a-z]+\}\}/);
    if (left) say(`note the starter kit's ${f} is filled in with ${left[0]} by the kit, so it is not run: a project that needs it keeps the call it was written`);
    else kit.push({ file: f.replace(/\.tmpl$/, ""), wf: parseYaml(text) });
  }
  say("note the project calls none of the core's workflows from .github/workflows, so the starter kit's calls are run");
  return kit;
}

// GitHub's context for the run: a pull request numbered 0 from the branch "change" into main, or a push to main.
function context(p) {
  const { root, head, base, owner, title, body } = p;
  let defaultBranch = "main";
  try { defaultBranch = git(root, "symbolic-ref", "--short", "refs/remotes/origin/HEAD").replace(/^origin\//, ""); } catch { /* (none known: main) */ }
  let repo = "local/project";
  try { repo = /[:/]([^/:]+\/[^/]+?)(?:\.git)?$/.exec(git(root, "remote", "get-url", "origin"))?.[1] ?? repo; } catch { /* (no origin) */ }
  // (whose account holds the repository, as the host says it, asked only where the manifest has no owner's row: core.yml
  // reads it there, #481)
  const held = owner ? null : hostSaid(console.error)();
  const repository = { default_branch: defaultBranch, private: false, full_name: repo, ...(held ? { owner: held } : {}) };
  const pull = { number: 0, state: "open", draft: false, title, body, base: { sha: base, ref: "main" }, head: { sha: head, ref: p.branch, repo: { full_name: repo } }, user: { login: owner } };
  return { event_name: p.event, repository: repo, repository_owner: held?.login ?? repo.split("/")[0], actor: owner, server_url: "https://github.com", run_id: "0", token: "", sha: head,
    base_ref: base ? "main" : "", head_ref: base ? p.branch : "", ref: base ? "refs/pull/0/merge" : "refs/heads/main",
    event: base ? { action: "synchronize", pull_request: pull, repository } : { ref: "refs/heads/main", before: "", after: head, repository } };
}

// What runs a job that calls a workflow of the core's, in a scratch clone of the commit (its base "main"; for a pull
// request, at the merge of the two), and gives how many of its jobs ran and failed.
function runner(p, tmp) {
  const bare = path.join(tmp, "project.git");
  git(tmp, "clone", "-q", "--bare", "--no-hardlinks", p.root, bare);
  git(tmp, "--git-dir", bare, "update-ref", "refs/heads/main", p.base || p.head);
  git(tmp, "--git-dir", bare, "update-ref", "refs/heads/change", p.head);
  const at = p.base ? merged(p, tmp, bare) : p.head;
  // (and the pull request's own refs, which a checkout may name: #1245, point 4)
  if (p.base) for (const [ref, sha] of [["merge", at], ["head", p.head]]) git(tmp, "--git-dir", bare, "update-ref", `refs/pull/0/${ref}`, sha);
  let runs = 0;
  const workspace = () => {
    const ws = path.join(tmp, "ws", String(++runs));
    git(tmp, "clone", "-q", "--no-checkout", pathToFileURL(bare).href, ws);
    git(ws, "checkout", "-q", "--detach", at);
    return ws;
  };
  const uses = standIns({ git, say, tmp });
  const github = context(p);
  const terms = process.env.PERSONAL_TERMS ?? "";
  const home = path.join(tmp, "home");
  fs.mkdirSync(home);
  const byCall = (file, id, job) => {
    const name = call.exec(String(job?.uses ?? ""))?.[1];
    const none = { failed: 0, ran: 0 };
    if (!name) return none;
    if (HOST_OWN[name]) { say(`host ${file}/${id}: ${name} is not run here (${HOST_OWN[name]})`); return none; }
    if (name === "pr-description.yml" && !p.described) { say(`note ${file}/${id}: pr-description.yml is not run here: give --description <a file> that holds the pull request's description`); return none; }
    const called = coreFile(tmp, call.exec(job.uses)[2], `.github/workflows/${name}`);
    if (called === null) { verdicts[`${file}/${id}`] = "failed"; warn(`FAIL ${file}/${id}: ${name} is not at ${call.exec(job.uses)[2]} in the core's history. ${MEND}pin the call to a commit of the core's main that holds it, as the sync writes it, or take the call out.`); return { failed: 1, ran: 0 }; }
    // (a caller's `with:` reads no secret, as on GitHub; its `secrets:` reads the one list this script is given)
    const value = (v, secrets) => (typeof v === "string" && v.includes("${{") ? evaluate(v.replace(/^\s*\$\{\{|\}\}\s*$/g, ""), { github, inputs: {}, secrets, vars: {} }) : v);
    const inputs = Object.fromEntries(Object.entries(job.with ?? {}).map(([k, v]) => [k, value(v, {})]));
    undescribed(name, inputs, p.described, `${file}/${id}`);
    const secrets = job.secrets === "inherit" ? { PERSONAL_TERMS: terms } : Object.fromEntries(Object.entries(job.secrets ?? {}).map(([k, v]) => [k, value(v, { PERSONAL_TERMS: terms })]));
    try {
      return report(`${file}/${id}`, runWorkflow(called, { inputs, secrets, github: { ...github, workflow_ref: `${github.repository}/.github/workflows/${file}@${github.ref}` }, base: stepEnv(home), workspace, uses, temp: tmp, machine: process.platform, sayUnread: true, stop: name === "core.yml" ? ownSteps(called) : null }), p.event);
    } catch (e) {
      verdicts[`${file}/${id}`] = "unread";
      warn(`FAIL ${file}/${id}: ${name} cannot be run from plain git here (${e.message}). ${MEND}run that check on the host meanwhile, and report it to the core (core/README.md, "Reporting to the core").`);
      return { failed: 1, ran: 0 };
    }
  };
  // (a workflow of the project's own, its jobs that call no workflow alone, run as the calls' jobs are, its steps the
  // change's own code, given no secret, not even the personal-terms list the calls are given)
  byCall.own = ({ file, wf, error }) => {
    if (wf === null) {
      verdicts[file] = "unread";
      warn(`FAIL ${file}: this workflow of the project's own is written in a form this check cannot read (${error}), so none of its jobs ran. ${MEND}write it in plain YAML, or run it on the host meanwhile and report the form to the core (core/README.md, "Reporting to the core").`);
      return { failed: 1, ran: 0 };
    }
    try {
      return report(file, runWorkflow(JSON.stringify(wf), { secrets: {}, github: { ...github, workflow_ref: `${github.repository}/.github/workflows/${file}@${github.ref}` }, base: stepEnv(home), workspace, uses, temp: tmp, machine: process.platform, sayUnread: true }), p.event);
    } catch (e) {
      verdicts[file] = "unread";
      warn(`FAIL ${file}: this workflow of the project's own cannot be run from plain git here (${e.message}). ${MEND}run it on the host meanwhile, and where what it uses is GitHub's own, report it to the core (core/README.md, "Reporting to the core").`);
      return { failed: 1, ran: 0 };
    }
  };
  return byCall;
}

// The project's own workflows this pull request or push starts, as the change itself holds them (GitHub reads a
// workflow from the commit it runs on), each kept to its jobs that call no workflow (#1084); none where it has none.
function ownWorkflows(p) {
  let files;
  try { files = git(p.root, "ls-tree", "-z", "--name-only", `${p.head}:.github/workflows`).split("\0").filter(f => /\.ya?ml$/.test(f)); } catch { return []; }
  const read = file => { try { return { file, wf: parseYaml(p.show(p.head, `.github/workflows/${file}`)) }; } catch (e) { return { file, wf: null, error: e.message }; } };
  return files.map(read).filter(c => c.wf === null || triggered(c.wf.on, p)).flatMap(c => (c.wf === null ? [c] : ownJobs(c, say)));
}

// core.yml's own steps, before those it runs of the copy's scripts (which begin where it reads where the copy stands):
// one of them that fails stops the rest, since the copy is then not proved the core (#376). A predicate on a step's name.
function ownSteps(text) {
  const steps = Object.values(parseYaml(text).jobs ?? {})[0]?.steps ?? [];
  const parts = steps.findIndex(s => String(s.name ?? "").startsWith("Where the core's copy stands"));
  const own = new Set(steps.slice(0, parts < 0 ? steps.length : parts).map(s => s.name ?? s.uses ?? String(s.run ?? "").split("\n")[0]));
  return name => own.has(name);
}

// core.yml's description check, as a step of its one job (#376), left out where no description is given, and said so.
function undescribed(name, inputs, described, where) {
  if (name !== "core.yml" || inputs.description !== true || described) return;
  inputs.description = false;
  say(`note ${where}: core.yml's description check is not run here: give --description <a file> that holds the pull request's description`);
}

// A file of the core at a commit (with `list`, the names in a folder), from a clone of the core's address made once (never from the project's copy, which
// the change under check may have edited: GitHub too runs a called workflow as the core holds it at the call's pin).
function coreFile(tmp, sha, file, list = false) {
  if (!/^[0-9a-f]{40}$/.test(sha)) return null;
  try { return list ? coreGit(tmp, "ls-tree", "--name-only", `${sha}:${file}`) : coreGit(tmp, "show", `${sha}:${file}`); } catch { return null; }
}
// git in that clone, made at the first call.
function coreGit(tmp, ...args) {
  if (!coreClone) {
    coreClone = path.join(tmp, "core.git");
    try { git(tmp, "clone", "-q", "--bare", `https://github.com/${CORE}`, coreClone); } catch (e) { fail(`the core could not be fetched from https://github.com/${CORE} (${String(e.stderr ?? e.message).trim().split("\n").pop().replace(/:\/\/[^/\s]*@/g, "://")}).`, `let this machine reach github.com, or point git at a copy of the core it can reach (git config url.<the copy>.insteadOf https://github.com/${CORE}), and run this check again.`); }
  }
  return git(tmp, "--git-dir", coreClone, ...args);
}

// The commit a pull request's checks run on, as GitHub makes it: the head merged into its base, the base its first
// parent and the head its second, so a check that reads its base from HEAD^1 finds it. A head that is its base, or
// behind it (the release trial's run before the update; #1231), merges nothing, and git makes no commit: it is written
// as the merge of a change of nothing on the base, so HEAD^1 is the base and HEAD^2, by which some checks tell a pull
// request from a push, is there.
function merged(p, tmp, bare) {
  const ws = path.join(tmp, "merge");
  const who = ["-c", "user.name=core-check", "-c", "user.email=core-check@example.invalid"];
  git(tmp, "clone", "-q", "--no-checkout", pathToFileURL(bare).href, ws);
  git(ws, "checkout", "-q", "--detach", p.base);
  let behind = true;
  try { git(ws, "merge-base", "--is-ancestor", p.head, p.base); } catch { behind = false; }
  if (behind) say(`note the head ${p.head === p.base ? "is its base" : "is behind its base"}, so the change is read as none against the base`);
  else try { git(ws, ...who, "merge", "-q", "--no-ff", "--no-edit", p.head); } catch { fail("the change does not merge into its base without a conflict.", "bring the branch up to date with its base, resolve the conflict, commit, and run this check again."); }
  const nothing = () => git(ws, ...who, "commit-tree", `${p.base}^{tree}`, "-p", p.base, "-m", "A change of nothing");
  const sha = behind ? git(ws, ...who, "commit-tree", `${p.base}^{tree}`, "-p", p.base, "-p", nothing(), "-m", "A change of nothing merged into its base") : git(ws, "rev-parse", "HEAD");
  git(ws, "push", "-q", "origin", `${sha}:refs/heads/core-check-merge`); // (a branch, so each job's clone holds it)
  return sha;
}

// Prints each job's verdict, each step the host alone runs, and each failing step with what it printed, every term of
// the personal-terms list masked; gives how many of its jobs ran, failed (a job not read among them: it proved nothing)
// and were unrun, whether a step of core.yml's own failed or a job of it was not read, and whether those of each unrun
// passed (`held`; #1262).
function report(where, results, event) {
  let failed = 0, ran = 0, copy = false, unrun = 0, held = true;
  for (const r of results) {
    const at = `${where}/${r.job}`;
    if (r.unread) {
      verdicts[at] = "unread"; failed++; copy = true;
      warn(`FAIL ${at}: this runner cannot read it (${r.unread}), so it measured nothing; the jobs it can read ran. ${MEND}run it on the host meanwhile, and report the form to the core (core/README.md, "Reporting to the core").`);
      continue;
    }
    const why = unrunWhy(r);
    const own = ownFailed(r);
    if (why) { verdicts[at] = "unrun"; unrun++; held &&= own.held; }
    if (r.stopped) { verdicts[at] = "stopped"; say(`stop ${at}: not run, behind the failure of a job it needs`); continue; }
    if (!r.ran || why) { say(`skip ${at}: ${why ?? `its condition does not hold for this ${event === "push" ? "push" : "pull request"}`}`); continue; }
    ran++;
    verdicts[at] = r.passed ? "passed" : "failed";
    for (const s of r.steps.filter(s => s.ran === false && s.out)) say(`host ${at}: "${s.name}" is the host's own, not run here`);
    if (r.passed) { say(`ok   ${at}`); continue; }
    failed++;
    if (own.failed) copy = true;
    for (const s of r.steps.filter(s => !s.passed)) {
      warn(`FAIL ${at}: its step "${s.name}" failed, as it printed below. ${MEND}do what its own failure below says, commit, and run this check again.`);
      warn(s.out.trim().split("\n").map(l => `  ${l}`).join("\n"));
    }
  }
  return { failed, ran, copy, unrun, held };
}
