// What the steps read of when the checks run: the tests at the pace of a release, a pull request's draft and ready,
// the checks as one job, and the calls to the core's workflows (steps.mjs, beside this file, holds the steps, and
// step-checks.mjs the words they share). Each piece takes the project as steps.mjs's `project` reads it and returns
// the mend, or null where the step is done; a step names the ones it needs, none runs by itself. It reads only. Node's
// own modules and git only.
import { CORE } from "./core-address.mjs";
import { installed } from "./packages.mjs";
import { calls, folded, readable } from "./workflow-calls.mjs";
import { runFiles } from "./own-runs.mjs";
import { pathsLetThrough } from "./workflow-run.mjs";
import { draftHoles, foreignBreaks, reads11 } from "./workflows.mjs";
import { onPullRequests, shown } from "./step-checks.mjs";

// Each job of the project's own that starts a suite through the shape check on a pull request, as every suite is
// started, starts once the pull request is marked ready and skips a draft (tasks/tests.md, "No test run on a draft";
// #733, point 7): its trigger's types hold opened, synchronize, reopened and ready_for_review, and its job's `if:` skips
// a draft: a condition of parts joined by && alone, one of them `!github.event.pull_request.draft` or
// `github.event.pull_request.draft == false`, the others any, a status function such as `!cancelled()` among them,
// its quoted strings read as one word each; any other shape (an ||, a negation of more, an index, text outside its
// `${{ }}`, which GitHub reads as a string and so as true) is read as not done.
const SUITE_RUN = /shape\.mjs\b[^\n]*--suite\b/u;

const READY_TYPES = ["opened", "synchronize", "reopened", "ready_for_review"];

const DRAFT_PART = /^(?:!\s*github\.event\.pull_request\.draft|github\.event\.pull_request\.draft\s*==\s*false)$/u;

const skipsDraft = cond => {
  const inner = String(cond ?? "").trim().replace(/^\$\{\{([\s\S]*)\}\}$/u, "$1").replace(/'(?:[^']|'')*'/gu, "text").replace(/!?\s*\b(?:always|success|cancelled|failure)\(\)/gu, "status");
  return !/\|\||[()[\]'$]|\$\{\{|\}\}/u.test(inner) && inner.split("&&").some(part => DRAFT_PART.test(part.trim()));
};

// A workflow of the project's own that publishes what its users get otherwise than from a green default branch (floor
// rule 12, "What users get is published only from a green default branch"; #733, points 7 and 8): one with a step that
// uses GitHub's own action that publishes a site (actions/deploy-pages), read exactly. It waits on a green branch where
// each of its triggers is a person's dispatch, a release, a push of tags alone, or `workflow_run` of completed runs on
// one named branch, each of its jobs asking by an `if:` of parts joined by && alone that the run's conclusion be success
// and its head repository this one (floor topic workflows, rule 2), read as skipsDraft reads a condition, or, with no
// `if:` of its own, needing a job that asks it, so that no job runs a fork's code. A workflow that publishes otherwise (a package registry, a store, a script of its own)
// is read by the session that syncs, since no file says it publishes.
const PUBLISH_USES = /^actions\/deploy-pages@/u;

const RUN_PARTS = [/^github\.event\.workflow_run\.conclusion\s*==\s*'success'$/u, /^(?:github\.event\.workflow_run\.head_repository\.full_name\s*==\s*github\.repository|github\.repository\s*==\s*github\.event\.workflow_run\.head_repository\.full_name)$/u];

const greenOnly = cond => {
  const inner = String(cond ?? "").trim().replace(/^\$\{\{([\s\S]*)\}\}$/u, "$1").replace(/'(?:[^']|'')*'/gu, q => (q === "'success'" ? "'success'" : "text"));
  if (/\|\||[()[\]$]|\$\{\{|\}\}/u.test(inner)) return false;
  const parts = inner.split("&&").map(x => x.trim());
  return RUN_PARTS.every(re => parts.some(x => re.test(x)));
};

const triggers = on => (typeof on === "string" ? { [on]: null } : Array.isArray(on) ? Object.fromEntries(on.map(t => [t, null])) : on && typeof on === "object" ? on : {});

const tagsAlone = push => !!push && typeof push === "object" && Array.isArray(push.tags) && push.tags.length > 0 && !("branches" in push) && !("branches-ignore" in push);

const oneBranch = run => !!run && typeof run === "object" && Array.isArray(run.branches) && run.branches.length === 1 && typeof run.branches[0] === "string" && !/[*?[\]!+]/u.test(run.branches[0]) && Array.isArray(run.types) && run.types.length === 1 && run.types[0] === "completed";

const needsOf = (jobs, name, seen = new Set()) => {
  if (seen.has(name)) return seen;
  seen.add(name);
  const n = jobs[name]?.needs;
  for (const d of typeof n === "string" ? [n] : Array.isArray(n) ? n : []) needsOf(jobs, d, seen);
  return seen;
};

const publishesUngated = p => Object.entries(p.workflows).filter(([, { yaml }]) => {
  const jobs = yaml?.jobs && typeof yaml.jobs === "object" ? yaml.jobs : {};
  const publishing = Object.keys(jobs).filter(name => (Array.isArray(jobs[name]?.steps) ? jobs[name].steps : []).some(st => typeof st?.uses === "string" && PUBLISH_USES.test(st.uses)));
  if (!publishing.length) return false;
  const on = triggers(yaml?.on);
  return Object.entries(on).some(([t, v]) => {
    if (t === "workflow_dispatch" || t === "release") return false;
    if (t === "push") return !tagsAlone(v);
    if (t === "workflow_run") return !oneBranch(v) || !Object.keys(jobs).every(name => greenOnly(jobs[name]?.if) || (!("if" in (jobs[name] ?? {})) && [...needsOf(jobs, name)].some(j => greenOnly(jobs[j]?.if))));
    return true;
  });
}).map(([file]) => `\`.github/workflows/${shown(file)}\``);

export function testsWhenReady(p) {
  return [suitesWhenReady(p), publishedWhenGreen(p)].filter(Boolean).join(" ") || null;
}

function publishedWhenGreen(p) {
  readable(p, text => /deploy-pages/u.test(text));
  const on = publishesUngated(p);
  return on.length ? `The project publishes what its users get otherwise than from a green default branch (${on.join("; ")}): in one small pull request, with floor rule 3's two security reviews, make it wait on one: trigger it on \`workflow_run\` of the one workflow that holds every check run on the default branch (where they stand in several, gather them in one that calls the rest by \`workflow_call\`), types [completed] and branches [its default branch], each of its jobs, or a first job every other \`needs\`, asking \`if: \${{ github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.head_repository.full_name == github.repository }}\` (floor topic workflows, rule 2), and check out \`github.event.workflow_run.head_sha\`; or publish from a release cut from a green commit (a push of tags alone, or the event release); a person's dispatch may stay, started only on a green commit. Then set the manifest's row *users get* to \`releases\`, so a pull request merges on its own green checks (\`node core/scripts/merge-line.mjs --repo <owner>/<name>\` reads it). Until then a pull request is brought up to date first, as now, and nothing fails.` : null;
}

function suitesWhenReady(p) {
  readable(p, text => SUITE_RUN.test(text));
  const loose = Object.entries(p.workflows).filter(([, { yaml }]) => onPullRequests(yaml?.on)).flatMap(([file, { yaml }]) => {
    const types = yaml.on?.pull_request?.types, ready = Array.isArray(types) && READY_TYPES.every(t => types.includes(t));
    return Object.entries(yaml.jobs ?? {})
      .filter(([, job]) => (Array.isArray(job?.steps) ? job.steps : []).some(st => typeof st?.run === "string" && SUITE_RUN.test(st.run)) && !(ready && skipsDraft(job?.if)))
      .map(([name]) => `\`.github/workflows/${shown(file)}\`, its job \`${shown(name)}\``);
  });
  return loose.length ? `In one small pull request, with floor rule 3's two security reviews, bring the project's own test workflow to \`core/tasks/tests.md\` as its kind reads it (${loose.join("; ")}): give its \`pull_request\` trigger the types opened, synchronize, reopened and ready_for_review, and have each job that starts a suite skip a draft (\`if: \${{ !github.event.pull_request.draft }}\`, or that beside other parts joined by && alone), the check the ruleset requires failing on a draft rather than skipped, since a required check whose job is skipped passes (the core's own \`tests.yml\` shows it); then run the platform suites on the schedule \`node core/scripts/runners.mjs --repo <owner>/<name>\` prints from where the tests run, who pays and what users get (where every merge goes live, on each pull request, as now; where users get a release, at the default branch's newest commit), and give the runs on the default branch one concurrency group that does not cancel the run in progress, so a started run finishes and only a waiting one gives way to a newer merge's. Where \`node core/scripts/merge-line.mjs --repo <owner>/<name>\` says the project's users get a release and the host still asks an up-to-date branch, file the issue it names for the owner, labelled needs-owner; nothing waits on it.` : null;
}

// The files that hold only calls to the core's workflows, each job of each a call: a sync moves their pins, which
// `core.yml` checks on every pull request.
const coreCall = job => typeof job?.uses === "string" && job.uses.toLowerCase().startsWith(`${CORE}/.github/workflows/`.toLowerCase());

export const callers = p => (readable(p, text => text.toLowerCase().includes(`${CORE}/.github/workflows/`.toLowerCase())), Object.entries(p.workflows))
  .filter(([, w]) => { const jobs = Object.values(w.yaml?.jobs ?? {}); return jobs.length > 0 && jobs.every(coreCall); }).map(([f]) => `.github/workflows/${f}`);

// Each workflow of the project's own whose pull-request path filter starts it on a change to such a file alone, as
// GitHub reads a filter (a path filter sees which files changed, never what changed in them); null where none does. A
// workflow that selects its suites through the copy's select.mjs is left out: the selection counts the copy's files
// as the step asks, and a workflow in which only a pin moved as no change (#1093, point 2). It is left out whole, since
// which of its jobs runs a suite no reader tells exactly: the step's `partly` leaves another job's to the review. A
// stand-in is left out too: a workflow whose `paths` hold each path of another's `paths-ignore`, and each of whose jobs
// reports a check that one reports, by a name read exactly, so that a check a ruleset asks for reports where the suite
// is skipped (#1248, point 3; #1260); it is meant to start where the suite does not. A name is read exactly where it is
// the job's `name` or key with no expression in it and the job has no matrix, which adds to the name GitHub reports. A
// workflow with `paths` that shares a check with a suite, or may (a name not read exactly whose start a suite's check
// has, or a suite whose names are not read exactly), and is no stand-in is still reported, with the mend that makes it
// one, never `!<its path>`, which could leave that check unreported: "Nothing locks a project".
export function suitesOnPins(p) {
  const pins = callers(p);
  readable(p, text => /paths(-ignore)?\s*:/.test(text));
  const selects = runFiles(p, "select.mjs");
  const filter = (w, key) => { const list = w.yaml?.on?.pull_request?.[key]; return Array.isArray(list) ? new Set(list.map(String)) : null; };
  // (each job's check name, or null where one is not read exactly)
  const names = w => { const jobs = w.yaml?.jobs; return jobs && typeof jobs === "object" ? Object.entries(jobs).map(([k, j]) => { const n = String(j?.name ?? k); return n.includes("${{") || j?.strategy?.matrix !== undefined ? null : n; }) : []; };
  // (the start of each name not read exactly as GitHub reports it: an expression's literal part before it, or a matrix
  // job's name and " (", which GitHub follows with the matrix's values)
  const starts = w => Object.entries(w.yaml?.jobs ?? {}).map(([k, j]) => String(j?.name ?? k)).filter((n, i) => names(w)[i] === null).map(n => n.includes("${{") ? n.slice(0, n.indexOf("${{")) : `${n} (`);
  const suites = Object.entries(p.workflows).map(([f, w]) => [f, filter(w, "paths-ignore"), new Set(names(w).filter(n => n !== null)), names(w).includes(null)]).filter(([, l]) => l !== null);
  const shares = (f, w) => suites.filter(([g, , c]) => g !== f && names(w).some(n => n !== null && c.has(n)));
  // (a suite one of whose checks a name not read exactly may be: one it reports starts so, or one it reports is not read)
  const mayShare = (f, w) => suites.some(([g, , c, unread]) => g !== f && starts(w).some(at => unread || [...c].some(n => n.startsWith(at))));
  const standsIn = (f, w) => { const own = filter(w, "paths"), n = names(w); return own !== null && n.length > 0 && shares(f, w).some(([, l, c]) => [...l].every(x => own.has(x)) && n.every(x => x !== null && c.has(x))); };
  const started = Object.entries(p.workflows).filter(([f, w]) => !pins.includes(`.github/workflows/${f}`) && !selects.includes(`.github/workflows/${f}`) && !standsIn(f, w)).flatMap(([f, w]) => {
    const on = w.yaml?.on?.pull_request, only = on?.paths, ignore = on?.["paths-ignore"];
    const by = Array.isArray(only) ? pins.filter(c => pathsLetThrough(only, [c])) : Array.isArray(ignore) ? pins.filter(c => !pathsLetThrough(ignore, [c])) : [];
    return by.length ? [[`\`.github/workflows/${shown(f)}\` (${by.map(shown).join(", ")})`, Array.isArray(only) && (shares(f, w).length > 0 || mayShare(f, w))]] : [];
  });
  if (!started.length) return null;
  const suite = started.filter(([, s]) => !s).map(([t]) => t), standing = started.filter(([, s]) => s).map(([t]) => t);
  return [`A sync that only moves the pin of a call to the core's workflows starts no suite of the project's own (\`core.yml\` checks those pins on every pull request).`,
    suite.length && `Each workflow named here lists in its \`paths-ignore\`, beside \`core/**\` and \`core-manifest.md\`, each file that holds only such calls by its exact path, or, where it filters with \`paths\`, takes each out with \`!<its path>\` after its patterns; a workflow that stands in for such a suite, so that a check a ruleset asks for reports where the suite is skipped, gains the same paths under its \`paths\`, never \`!<its path>\`. Started by such a file alone: ${suite.join("; ")}.`,
    standing.length && `Each workflow named here reports a check a suite with \`paths-ignore\` reports, so it may stand in for that suite: it gains the same paths under its \`paths\`, never \`!<its path>\`, which could leave that check unreported, until its \`paths\` hold each path of the suite's \`paths-ignore\` and each of its jobs is named by a plain \`name\` (no expression, no matrix) the suite's jobs report too; then it reads as a stand-in and is left out. Started by such a file alone: ${standing.join("; ")}.`]
    .filter(Boolean).join(" ");
}

// A call to one of the core's pull-request checks whose job is skipped on a draft, or which skips a draft by itself (the
// description check's), runs on a pull request once it is ready only where its trigger starts it when one is marked
// ready (#375, #502): without that, the check a draft skipped never runs on that head, and a ruleset counts the skip as
// passed. Each workflow where a call does so is named, as the workflow check reads it (workflows.mjs, draftHoles).
export function readyOnlyHolds(p) {
  // (a workflow with a line break the YAML package does not read is read from its text, as a YAML 1.1 reader reads it, never from the
  // YAML the package gave, which may be none, and as it stands too; where neither reads, it is said unread as any other: #876)
  const mentions = text => /\/\.github\/workflows\/(core|copies|personal-terms|signatures|nuget|pr-description)\.yml@/i.test(text);
  const odd = text => installed("yaml") && foreignBreaks(text ?? "") !== null;
  readable(p, text => !(odd(text) && reads11(text)) && mentions(text));
  const wrong = Object.entries(p.workflows).filter(([, w]) => draftHoles(odd(w.text) ? w.text : w.yaml).length);
  return wrong.length ? `A call to the core's checks whose job is skipped on a draft never runs once the pull request is marked ready, since its trigger leaves that out: add \`ready_for_review\` to the \`types:\` under \`pull_request:\` (where it lists none, \`types: [opened, reopened, synchronize, ready_for_review]\`) in ${wrong.map(([f]) => `\`.github/workflows/${shown(f)}\``).join(", ")}.` : null;
}

// A call to the core's core.yml that runs part of its one job (#376) runs every check the project ran before: the copies
// checks and the description check each folded into it, still called on their own or run by a workflow of the project's,
// the copies checks with their marks,
// and none both folded and called, which would bill its job twice. Null where no call folds any part.
const FOLDS = [["copies", "copies.yml"], ["description", "pr-description.yml"], ["signatures", "signatures.yml"], ["nuget", "nuget.yml"]];

export function oneJobHolds(p) {
  readable(p, text => /\/\.github\/workflows\/(core|copies|pr-description|signatures|nuget)\.ya?ml@/i.test(text));
  if (!FOLDS.some(([key]) => folded(p, key).length)) return null;
  // (a check a workflow of the project's own runs, by its script, is run as well)
  const script = { copies: "copies.mjs", description: "pr-description.mjs" };
  const left = FOLDS.slice(0, 2).filter(([key, own]) => !folded(p, key).length && !calls(p, own).length && !runFiles(p, script[key]).length).map(([key]) => key === "copies"
    ? "`copies: checks/copies.json` and `sizes: checks/sizes.json` (the copies check's config and marks, where the project keeps them elsewhere, their paths)" : "`description: true`");
  if (folded(p, "copies").length && !folded(p, "sizes").length) left.push("`sizes: checks/sizes.json` beside its `copies:`");
  const twice = FOLDS.filter(([key, own]) => folded(p, key).length && calls(p, own).length).map(([key, own]) => `the call of its own to the core's \`${own}\`, which its \`${key}:\` runs too`);
  const wrong = [left.length ? `pass it ${left.join(" and ")}, as \`core/setup/template/workflows/core.yml.tmpl\` has it, or call the core's \`copies.yml\` or \`pr-description.yml\` again for what it leaves out` : "", twice.length ? `take out ${twice.join(", and ")}, since it bills its job twice` : ""].filter(Boolean);
  return wrong.length ? `The project's call to the core's \`core.yml\` runs part of its one job and not every check the project ran: ${wrong.join("; ")}.` : null;
}
