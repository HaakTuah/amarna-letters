// Where a project's tests run and who pays for them (tasks/tests.md, "The slow suites run once per batch, wherever
// they run"; #733, point 6), read and never asked (the core's AGENTS.md, "What can be read is never asked or
// declared"). From the project's workflows (.github/workflows/, a folder that is no link, each a file of bytes of at
// most LONGEST bytes that leads nowhere outside the checkout; what is not is said not read) it reads the jobs on a pull
// request or a push that start a suite through the shape check (`shape.mjs ... --suite`), as every suite is started, and the runner each takes
// (`self-hosted` or a runner group: the owner's own; only the host's own labels: the host's; else not read). From the host it reads whether the
// repository is private, so its minutes are billed. A row of the manifest only overrides each: *test runners*
// (`hosted`, `self-hosted` or `local`) and *billed minutes* (merge-line.mjs, beside this file). It prints what it
// read and how often the slow and platform suites run at the default branch's newest commit:
// - once an hour on the host's free runners;
// - once a night where minutes are billed or the runner is a machine of the owner's;
// - only before a release where the tests run on a computer alone;
// - and in full before each release in every case;
// and where every merge goes live (the manifest's *users get*, `merges` where no row says), on each pull request.
// Where a public repository runs a job on a pull request or a push on a runner of its own, or on one it cannot read, it
// prints the advice (where the folder could not be listed, that a job on such a runner may stand there, and how to have it
// read): keep forks off that job at once, and file one issue for the owner, labelled needs-owner, since a
// stranger's pull request would run its code on that machine (floor rule 18). It fails nothing ("Nothing locks a project").
// gh, Node's own modules and the core's yaml package.
//
//   node core/scripts/runners.mjs --repo <owner>/<name>
import fs from "node:fs";
import path from "node:path";
import { CORE } from "./core-address.mjs";
import { aRepository, leadsOut, oneLine } from "./guards.mjs";
import { ghApi } from "./labels.mjs";
import { coreOwn, override } from "./merge-line.mjs";
import { loadSync } from "./packages.mjs";
import { started } from "./started.mjs";
import { LONGEST } from "./yaml-keys.mjs";

const WHERE = ["hosted", "self-hosted", "local"];
const ON = ["pull_request", "pull_request_target", "push", "merge_group"];

// A workflow's triggers, as GitHub reads `on`: a name, a list of names, or a mapping keyed by them.
const triggers = on => typeof on === "string" ? [on] : Array.isArray(on) ? on.filter(x => typeof x === "string") : on && typeof on === "object" ? Object.keys(on) : [];

// The labels a job's runner is named by: its runs-on (a name, a list, or a group's), and where runs-on is
// `${{ matrix.<key> }}`, the values that key takes: its list, and that key in each `include` entry, a list written as
// `${{ fromJSON('...') }}` read from the lists its literals hold. Read to a depth and a count, and each object once, so a
// file whose anchors refer to themselves reads as far as it goes and no further.
function labelsOf(job) {
  const out = [], seen = new Set();
  const walk = (v, depth) => {
    if (out.length > 500 || depth > 8 || v === null || v === undefined) return;
    if (typeof v === "string") { out.push(v); return; }
    if (typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x, depth + 1);
  };
  const on = job?.["runs-on"];
  const key = typeof on === "string" ? /^\$\{\{\s*matrix\.([\w-]+)\s*\}\}$/u.exec(on.trim())?.[1] : undefined;
  if (key === undefined) walk(on, 0);
  else {
    const matrix = job?.strategy?.matrix;
    walk(matrix?.[key], 0);
    const entries = entriesOf(matrix?.include);
    for (const entry of entries ?? []) walk(entry?.[key], 0);
    // (no value read for the key, or an include not read: the expression stands, and is not read)
    if (!out.length || entries === null) out.push(on);
  }
  return { labels: out, group: !!on && typeof on === "object" && !Array.isArray(on) && "group" in on };
}

// A matrix's `include`: a list, or `${{ fromJSON('...') }}` whose literal lists are read where they parse; [] otherwise.
// Where `include` is an expression, it is read only where, its quoted literals aside, it holds nothing but fromJSON,
// the event's name, comparisons, parentheses and && and ||: then its entries are those its literal lists hold. Any
// other expression (a variable's value, an input, the event's text) is not read: null.
const PLAIN = /^\$\{\{(?:\s|fromJSON|github\.event_name|==|!=|&&|\|\||[()]|'')*\}\}$/u;
function entriesOf(include) {
  if (Array.isArray(include)) return include;
  if (include === undefined || include === null) return [];
  if (typeof include !== "string" || !PLAIN.test(include.slice(0, 200000).replace(/'[^']*'/gu, "''").trim())) return null;
  return [...include.slice(0, 200000).matchAll(/'(\[[^']*\])'/gu)].flatMap(m => { try { const v = JSON.parse(m[1]); return Array.isArray(v) ? v : []; } catch { return []; } });
}

// What a job's runner is: "own" (the label self-hosted, or a runner group), "hosted" (only the host's own labels:
// ubuntu-, windows- and macos-, and a matrix's values among them), or null where it cannot be read (another label, or
// an expression that is no matrix value).
const HOSTED = /^(ubuntu|windows|macos)(-[\w.-]+)?$/u;
function runnerOf(job) {
  const { labels, group } = labelsOf(job);
  if (group || labels.some(l => /(^|[\s,'"[])self-hosted($|[\s,'"\]])/u.test(l))) return "own";
  const plain = labels.filter(l => !/\$\{\{/u.test(l));
  if (plain.length && plain.length === labels.length && plain.every(l => HOSTED.test(l))) return "hosted";
  return null;
}

// Whether a job starts a suite through the shape check, as every suite is started (tasks/tests.md, "A time mark measures
// and never fails"): a step whose run names shape.mjs and --suite.
const startsSuite = job => (Array.isArray(job?.steps) ? job.steps : []).some(st => typeof st?.run === "string" && /shape\.mjs\b/u.test(st.run) && /--suite\b/u.test(st.run));

// What the workflows in `dir` say: { onHost (a job that starts a suite runs on a pull request or a push), where (that
// job's runner, "own", "hosted" or null where it cannot be read), selfHosted (any job on a pull request or a push takes
// a runner of the owner's own), unknown (one whose runner cannot be read), unread (the files that could not be read, or
// the folder itself, with unlisted true, where it cannot be listed) }.
export function workflowsIn(dir, parse = loadSync("yaml").parse) {
  const out = { onHost: false, testRunners: [], testLabels: [], selfHosted: false, unknown: false, unread: [] };
  const names = listing(dir);
  if (names === false) return { ...out, unread: [dir], unlisted: true };
  const files = names.filter(f => /\.ya?ml$/u.test(f));
  const read = {}, root = path.resolve(dir, "..", "..");
  // (a file is read only where it is a file of bytes of the checkout's own of at most LONGEST bytes (floor/topics/input.md,
  // point 5): one whose real place, its links followed, lies outside the checkout, a device, a pipe, a folder and one past
  // the size are not read, and are named in `unread`)
  for (const f of files) {
    const at = path.join(dir, f);
    try {
      const st = leadsOut(root, at) ? null : fs.statSync(at);
      if (!st?.isFile() || st.size > LONGEST) throw new Error("not read");
      read[f] = parse(fs.readFileSync(at, "utf8"));
    } catch { out.unread.push(f); }
  }
  const seen = reached(read);
  try {
    for (const f of seen) {
      // (a job that calls a workflow takes no runner of its own: the called workflow's jobs do, followed above where it
      // stands here)
      // (a call to this folder that leads to no workflow read here is a runner not read: its jobs cannot be seen)
      // (a call whose jobs cannot be seen is a runner not read: to this folder, a workflow not read here or past the depth
      // followed; to another repository, any but the core's own, whose jobs run on the host's runners)
      if (jobsOf(read[f]).some(j => unseen(j, read, seen))) out.unknown = true;
      for (const job of jobsOf(read[f]).filter(j => typeof j?.uses !== "string")) {
        const runner = runnerOf(job);
        out.selfHosted ||= runner === "own";
        out.unknown ||= runner === null;
        if (startsSuite(job)) { out.onHost = true; out.testRunners.push(runner); out.testLabels.push(...labelsOf(job).labels); }
      }
    }
  } catch { out.unread.push(...[...seen].filter(f => !out.unread.includes(f))); }
  return out;
}

// The names in the workflows folder `dir`, [] where it is not there and so holds none, or false where it is not read: a
// path that is there and is no folder that can be listed (a file, a link of any kind, since GitHub reads no workflow
// through one, a folder whose real place, its links followed, lies outside the checkout, two folders above it, a folder
// whose rights stop its listing), and one not there where it cannot be told that none stands: only where its parent is a real folder or not
// there either, in a checkout's root, which holds .git, does a missing folder hold none. Listed once, here.
function listing(dir) {
  const at = p => { try { return fs.lstatSync(p); } catch (e) { return e?.code === "ENOENT" ? null : false; } };
  const here = at(dir);
  if (here === false) return false;
  if (here) { try { return here.isDirectory() && !leadsOut(path.resolve(dir, "..", ".."), dir) ? fs.readdirSync(dir) : false; } catch { return false; } }
  const up = at(path.dirname(dir));
  return up === false || (up && !up.isDirectory()) || !fs.existsSync(path.join(dir, "..", "..", ".git")) ? false : [];
}

// The workflows a pull request or a push starts, and those of this folder they call, `uses: ./.github/workflows/<f>`,
// followed to a depth, each once: their jobs run on the pull request or the push too.
const LOCAL = /^\.\/\.github\/workflows\/([^/]+\.ya?ml)$/u;
function reached(read) {
  const started = Object.keys(read).filter(f => triggers(read[f]?.on ?? read[f]?.true).some(t => ON.includes(t)));
  const seen = new Set(started), queue = started.map(f => [f, 0]);
  for (let k = 0; k < queue.length; k++) {
    const [f, depth] = queue[k];
    const calls = depth < 4 ? jobsOf(read[f]).map(j => LOCAL.exec(typeof j?.uses === "string" ? j.uses.trim() : "")?.[1]) : []; // (past it, not followed: unseen)
    for (const c of calls.filter(c => c && c in read && !seen.has(c))) { seen.add(c); queue.push([c, depth + 1]); }
  }
  return seen;
}

// Whether a job calls a workflow whose jobs are not read: one of this folder not read or not reached, or another
// repository's, save the core's own.
function unseen(job, read, seen) {
  const uses = typeof job?.uses === "string" ? job.uses.trim() : null;
  if (uses === null) return false;
  const local = LOCAL.exec(uses)?.[1];
  if (uses.startsWith("./")) return !(local && local in read && seen.has(local));
  return !uses.startsWith(`${CORE}/.github/workflows/`);
}

// A workflow's jobs, as a list; none where it holds no mapping of them.
const jobsOf = wf => (wf?.jobs && typeof wf.jobs === "object" ? Object.values(wf.jobs) : []);

// The manifest's row *test runners*, or undefined where none holds a value it takes.
export function runnersRow(manifest) {
  const m = /^\|[ \t]*\*test runners\*[ \t]*\|[ \t]*`([a-z-]+)`/mu.exec(String(manifest ?? ""));
  return m && WHERE.includes(m[1]) ? m[1] : undefined;
}

// Whether the repository is private, as the host says: true, false, or null where it did not answer.
function privateOf(repo, gh) {
  let v = null;
  try { v = JSON.parse(gh(`repos/${repo}`) || "null")?.private; } catch { /* (not read) */ }
  return typeof v === "boolean" ? v : null;
}

// Where the tests run and who pays, read and overridden: { where, whereRead, whereRow, billed, billedRow }.
function settled(w, priv, manifest) {
  // (where the tests run: the runners of the jobs that start a suite; one that cannot be read is taken as the owner's
  // own, the stricter reading, and said so)
  // (a folder that could not be listed, or a workflow not read, is a runner not read as well: nothing of it is known)
  const unreadFiles = !w.unlisted && w.unread.length > 0;
  const testsUnknown = w.testRunners.includes(null) || !!w.unlisted || unreadFiles;
  const whereRead = w.testRunners.includes("own") || testsUnknown ? "self-hosted" : w.onHost ? "hosted" : "local";
  const whereRow = runnersRow(manifest), billedRow = override(manifest, "billed minutes", ["yes", "no"]);
  // (where whether it is private was not read: taken as billed, the cheaper way)
  const billed = billedRow ? billedRow === "yes" : priv !== false;
  return { where: whereRow ?? whereRead, whereRead, whereRow, billed, billedRow, unknown: testsUnknown && !w.testRunners.includes("own"), unlisted: !!w.unlisted, labelUnread: w.testRunners.includes(null), unreadFiles };
}

const PLACES = { hosted: "the host's runners", "self-hosted": "a runner of the owner's own", local: "a session's or the owner's computer alone, no job on a pull request or a push starting a suite through the shape check" };
const WHEN = { merge: "on each pull request, before its merge, every merge going live (the manifest's *users get*, `merges` where no row says)", hourly: "once an hour, where it moved", nightly: "once a night, where it moved", release: "before each release, on that computer" };

// The lines that say what was read, and from where.
function saidOf(s, priv, unread) {
  const whereBy = s.whereRow ? `, as the manifest's row *test runners* says (read: ${s.whereRead})` : "";
  const paidBy = s.billedRow ? ", as the manifest's row *billed minutes* says"
    : priv === null ? " (whether the repository is private was not read, so taken as billed)" : `, the repository being ${priv ? "private" : "public"}`;
  const why = s.unlisted ? "the workflows folder could not be listed"
    : [s.labelUnread && "a job's runner, named by a label of its own or an expression, could not be read", s.unreadFiles && "a workflow named below could not be read"].filter(Boolean).join(", and ");
  const mend = s.unlisted ? "; mend: run this script from the project's root, and there make .github/workflows a folder of the checkout's own that can be listed, not a link"
    : s.unreadFiles ? `; mend: make each workflow named below a file of the checkout's own, not a link that leads out of it, of at most ${LONGEST} bytes, whose YAML parses` : "";
  return [`where the tests run: ${PLACES[s.where]}${whereBy}${s.unknown && !s.whereRow ? ` (${why}, so taken as the owner's own${mend})` : ""}`, `who pays: ${s.billed ? "minutes billed" : "the host's free minutes"}${paidBy}`,
    ...unread.length ? [`workflows not read: ${unread.map(f => oneLine(f).slice(0, 60)).join(", ")}`] : []];
}

// The floor rule 18 advice for a public repository whose jobs may run on a runner of the owner's own, or null.
function adviceOf(w, priv) {
  // (a workflow not read, beside no runner of the owner's own or not read, may hold one: advised as a folder not listed is)
  const notListed = w.unlisted, notRead = !notListed && !w.selfHosted && !w.unknown && w.unread.length > 0;
  const job = notListed || notRead ? "any such job" : "that job";
  return (w.selfHosted || w.unknown || w.unlisted || notRead) && priv === false
    ? `A public repository ${notListed ? "whose workflows folder could not be listed may run a job on a runner of the owner's own (run this script from the project's root first, and there make .github/workflows a folder of the checkout's own that can be listed, not a link, so that it is read)" : notRead ? "whose workflows named above could not be read may run a job on a runner of the owner's own (make each a file of the checkout's own that can be read, so that it is read)" : `runs a job on ${w.selfHosted ? "a runner of the owner's own" : "a runner that could not be read, perhaps the owner's own"}`}, where a stranger's pull request would run its code (floor rule 18): keep pull requests from forks off ${job} at once (an \`if:\` that its head repository is this one), and, where no open issue names it, file one for the owner, labelled needs-owner, to move ${job} to the host's runners or have every outside contributor's run approved first; nothing else waits on it.`
    : null;
}

// Where the tests run, who pays and how often the slow suites run: { where, billed, cadence, said, when, advice }.
export function read({ repo, dir = ".github/workflows", manifest = null, gh = ghApi, parse }) {
  const w = workflowsIn(dir, parse), priv = privateOf(repo, gh), s = settled(w, priv, manifest);
  // (where every merge goes live, each merge is a release: the slow suites run before it, on its pull request)
  const users = override(manifest, "users get", ["merges", "releases"]) ?? "merges";
  const cadence = users === "merges" ? "merge" : s.where === "local" ? "release" : s.where === "self-hosted" || s.billed ? "nightly" : "hourly";
  const advice = adviceOf(w, priv);
  const usersSaid = `its users get: ${users === "releases" ? "a release" : "each merge"}${override(manifest, "users get", ["merges", "releases"]) ? ", as the manifest's row *users get* says" : ", as no row *users get* says otherwise (it cannot be read)"}`;
  return { where: s.where, billed: s.billed, cadence, said: [...saidOf(s, priv, w.unread), usersSaid], when: WHEN[cadence], advice };
}

export function main(argv, { gh = ghApi, say = console.log } = {}) {
  const i = argv.indexOf("--repo"), repo = i >= 0 ? argv[i + 1] : undefined;
  if (!aRepository(repo)) { console.error("FAIL: no repository was named. Mend: run node core/scripts/runners.mjs --repo <owner>/<name> from the project's root"); return 1; }
  // (the core's own repository holds no manifest: its slots stand in its AGENTS.md, read as merge-line.mjs reads them)
  const manifest = fs.existsSync("core-manifest.md") ? fs.readFileSync("core-manifest.md", "utf8") : coreOwn();
  const r = read({ repo, manifest, gh });
  say([`Where ${repo}'s tests run and who pays:`, ...r.said.map(s => `- ${s}`),
    r.cadence === "merge" ? `The slow and platform suites run ${r.when}, and in full before each release (the core's tasks/tests.md).`
      : `A pull request runs the fast suites its change reaches; the slow and platform suites run at the default branch's newest commit ${r.when}, and in full before each release (the core's tasks/tests.md).`,
    ...r.advice ? [r.advice] : []].join("\n"));
  return 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
