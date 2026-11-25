// What the steps of the tests read: the strength check's run, the selection of the tests a change can reach and the
// run of a tree that passed (steps.mjs, beside this file, holds the steps, and step-checks.mjs the words they share).
// Each piece takes the project as steps.mjs's `project` reads it and returns the mend, or null where the step is done;
// a step names the ones it needs, none runs by itself. It reads only. Node's own modules and git only.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { inCopy } from "./core-path.mjs";
import { parseConfig } from "./shape.mjs";
import { folderOf } from "./mutation-tools.mjs";
import { toolOf } from "./strength.mjs";
import { installIn } from "./stryker.mjs";
import { copyAt, readable } from "./workflow-calls.mjs";
import { HERE, onPullRequests } from "./step-checks.mjs";
import { where as shapeAt } from "./shape.mjs";

// Whether a test of the project's own lies under its shape check's config's "tests", wherever they stand beside its code:
// a file of the copy of the core (core/) is none.
function testsStand(p) {
  let config;
  try { config = parseConfig(p.read(shapeAt(p.manifest)) ?? "", shapeAt(p.manifest)); } catch { return false; }
  if (!config.tests.length) return false;
  return execFileSync("git", ["ls-files", "-z", "--", ...config.tests], { cwd: p.root, encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").some(f => f && !f.startsWith(copyAt(p)));
}

// Whether a workflow that runs on pull requests has a step that runs the strength check, with STRENGTH_BASE set on the
// step, its job or the workflow: a mention in a comment, or a step with no base, which measures nothing, is none.
// (at the copy's own path, which the manifest names: #628)
const strengthRunOf = copy => new RegExp(`(^|[\\s;&|])node\\s+${inCopy(copy)}scripts/strength\\.mjs(?=\\s*($|[;&|]))`, "mu");

const based = (...envs) => envs.some(e => typeof e?.STRENGTH_BASE === "string" && e.STRENGTH_BASE.trim() !== "");

function strengthRuns(p) {
  readable(p, text => text.includes("strength.mjs"));
  const STRENGTH_RUN = strengthRunOf(copyAt(p));
  return Object.values(p.workflows).some(({ yaml }) => onPullRequests(yaml?.on) && Object.values(yaml.jobs ?? {})
    .some(job => (job?.steps ?? []).some(step => typeof step?.run === "string" && STRENGTH_RUN.test(step.run) && based(step.env, job.env, yaml.env))));
}

// Whether the project names its mutation tool, or none with its reason, and where it names one, a workflow runs the
// strength check (core/tasks/code-shape.md, "How strong the tests are is measured on the lines a pull request
// changes").
export function strengthNamed(p) {
  const tool = toolOf(p.manifest), copy = copyAt(p);
  const row = `run \`node ${copy}scripts/mutation-tools.mjs --write\`, which writes the row the core's list gives the project (\`${copy}scripts/mutation-tools.json\`): its tool's command, or \`none\` with the reason where the list has no tool for its code or it has no tests yet; then do what it prints as left to do`;
  if (!tool) return `The manifest has no row *mutation tool*: ${row}. Until then the measure does not run, and nothing fails for it.`;
  if (tool.none !== undefined && !tool.none) return `The manifest's row *mutation tool* says \`none\` with no reason: ${row}; where the owner turns the measure off, the owner gives the reason after \`none\` instead.`;
  if (tool.none !== undefined) return tool.none.startsWith("no tests yet") && testsStand(p) ? `The manifest's row *mutation tool* says \`none\`: no tests yet, and the project has tests now: ${row}.` : null;
  if (strengthRuns(p)) return null;
  const folder = folderOf(tool.command), install = folder ? `the install of the tool, \`${installIn(folder)}\`, then ` : "";
  return `The manifest names a mutation tool and no workflow runs it: in the job that runs the tests on a pull request, after them, add ${install}a step \`node ${copy}scripts/strength.mjs\` with \`STRENGTH_BASE\` set to the pull request's base (\`origin/<its base branch>\`, fetched first). A change to a workflow, it passes two security reviews (floor rule 3).`;
}

// The project's tracked test files, as the shape check's config names them, else as the starter kit's does, so that a
// config taken out leaves the tests counted; the copy of the core aside.
function testsTracked(p) {
  let specs;
  try { specs = parseConfig(p.read(shapeAt(p.manifest)) ?? "", shapeAt(p.manifest)).tests; } catch { specs = JSON.parse(fs.readFileSync(path.join(HERE, "setup/template/shape.json.tmpl"), "utf8")).tests; }
  return specs.length > 0 && execFileSync("git", ["ls-files", "-z", "--", ...specs], { cwd: p.root, encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").some(f => f && !f.startsWith(copyAt(p)));
}

// Whether a workflow that runs on pull requests has a step that runs the selection, with SELECT_BASE set on the step,
// its job or the workflow (core/tasks/tests.md, "A pull request runs the tests its change can reach"); null where it
// does or the project has no tests yet; else the mend.
const selectRunOf = copy => new RegExp(`(^|[\\s;&|])node\\s+${inCopy(copy)}scripts/select\\.mjs(?=\\s|$)`, "mu");

export function selectionRuns(p) {
  if (!testsTracked(p)) return null;
  readable(p, text => text.includes("select.mjs"));
  const SELECT_RUN = selectRunOf(copyAt(p));
  const selects = Object.values(p.workflows).some(({ yaml }) => onPullRequests(yaml?.on) && Object.values(yaml.jobs ?? {})
    .some(job => (job?.steps ?? []).some(step => typeof step?.run === "string" && SELECT_RUN.test(step.run) && [step.env, job.env, yaml.env].some(e => typeof e?.SELECT_BASE === "string" && e.SELECT_BASE.trim() !== ""))));
  return selects ? null : "No workflow on pull requests runs the selection of the tests a change can reach: in the job that runs the project's tests, add a step before them `node core/scripts/select.mjs --env RUN`, with `SELECT_BASE` set to the pull request's base (`origin/<its base branch>`, fetched first, or `HEAD^1` with `fetch-depth: 2`), and have the job run only the test files `RUN` names, each between spaces, or its whole suite where it says `all` (`if [ \"$RUN\" = all ]; then <the whole suite>; else <the runner> $RUN; fi`); name the project's proof, never selected out, under \"select\" and \"proof\" in the shape check's config. Where the record's numbers (`node core/scripts/test-record.mjs`) show the suite needed whole, name every test under \"select\" and \"whole\" instead, citing them in that pull request.";
}

// Whether each job that runs the selection on a push, in a workflow a pull request runs too, gives it --passed, the name
// of the check that gates the tests (core/tasks/tests.md, "A tree that passed is not run again"); null where it does,
// or where no such job selects (the step of the tests a change can reach asks that first); else the mend.
// (the step that selects gives --passed; and every step that reads RUN after it runs nothing on "none", so that no
// runner is handed that word or an empty list, which it would read as every test. Only shapes that can be read to be
// false on "none" count, any other is reported: an `if:` whose parts joined by && at its top hold RUN in one part
// alone, that part nothing but `env.RUN == 'all'` and `contains(env.RUN, ' <file> ')` joined by ||, each false for
// "none"; or a run that is the line the mend gives, `if [ "$RUN" = all ]; then …; elif [ "$RUN" != none ]; then … $RUN; fi`)
const passes = (job, SELECT_RUN) => (job?.steps ?? []).some(step => typeof step?.run === "string" && SELECT_RUN.test(step.run) && /(?<![\w-])--passed(?![\w-])/u.test(step.run));

const RUN_IN_RUN = /\$\{?RUN\}?(?![\w])/u, RUN_IN_IF = /\benv\.RUN\b/u;

const SAFE_TERM = /^(env\.RUN\s*==\s*'all'|contains\(\s*env\.RUN\s*,\s*' [^' ]+ '\s*\))$/u;

const RUN_LINE = /^if \[ "\$RUN" = all \]; then [^;\n]+; elif \[ "\$RUN" != none \]; then [^;\n]+ \$RUN; fi$/u;

// (an expression split at its top level by `op`, its parentheses kept whole; null where they do not pair)
export function topLevel(text, op) {
  const parts = [];
  let depth = 0, from = 0, quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") quoted = !quoted;
    else if (!quoted && c === "(") depth++;
    else if (!quoted && c === ")" && --depth < 0) return null;
    else if (!quoted && depth === 0 && text.startsWith(op, i)) { parts.push(text.slice(from, i).trim()); from = i + op.length; i += op.length - 1; }
  }
  return depth === 0 && !quoted ? [...parts, text.slice(from).trim()] : null;
}

export const unwrapped = t => { let x = t.trim(); while (x.startsWith("(") && x.endsWith(")") && topLevel(x.slice(1, -1), "&&")) x = x.slice(1, -1).trim(); return x; };

function ifKeepsNone(expression) {
  const body = expression.trim().replace(/^\$\{\{([\s\S]*)\}\}$/u, "$1");
  const ands = topLevel(unwrapped(body), "&&");
  const reading = ands?.filter(part => RUN_IN_IF.test(part)) ?? [];
  if (reading.length !== 1) return false;
  const ors = topLevel(unwrapped(reading[0]), "||");
  return !!ors && ors.every(term => SAFE_TERM.test(unwrapped(term)));
}

const keepsNone = step => {
  if (typeof step?.if === "string" && RUN_IN_IF.test(step.if)) return ifKeepsNone(step.if);
  return typeof step?.run !== "string" || !RUN_IN_RUN.test(step.run) || RUN_LINE.test(step.run.trim());
};

const honoursNone = (job, SELECT_RUN) => {
  const after = (job?.steps ?? []).filter(step => !(typeof step?.run === "string" && SELECT_RUN.test(step.run)));
  const reads = after.filter(step => (typeof step?.if === "string" && RUN_IN_IF.test(step.if)) || (typeof step?.run === "string" && RUN_IN_RUN.test(step.run)));
  return reads.length > 0 && reads.every(keepsNone);
};

const onPush = on => (typeof on === "string" ? on === "push" : Array.isArray(on) ? on.includes("push") : !!on && "push" in on);

export function passedRuns(p) {
  readable(p, text => text.includes("select.mjs"));
  const SELECT_RUN = selectRunOf(copyAt(p));
  // (only a workflow a pull request runs too: a job that runs on a push alone ran nowhere else, and is never skipped)
  const missing = Object.entries(p.workflows).filter(([, { yaml }]) => onPush(yaml?.on) && onPullRequests(yaml?.on)).flatMap(([file, { yaml }]) => Object.entries(yaml.jobs ?? {})
    .filter(([, job]) => (job?.steps ?? []).some(step => typeof step?.run === "string" && SELECT_RUN.test(step.run)) && !(passes(job, SELECT_RUN) && honoursNone(job, SELECT_RUN)))
    .map(([name]) => `\`.github/workflows/${file}\`, its job \`${name}\``));
  return missing.length ? `The selection runs on a push with nothing to say whether the merged tree passed already (${missing.join("; ")}): give its step \`--passed <the check that gates the tests>\` on a push's first run alone (the job's own check, such as \`tests\`, as a ruleset requires it; in bash, \`\${SELECT_PASSED:+--passed "$SELECT_PASSED"}\` with \`SELECT_PASSED\` set so on a push and empty otherwise), \`GH_TOKEN: \${{ github.token }}\` on that step on a push alone, and \`checks: read\` beside \`contents: read\` in the job's permissions; and have every step that reads \`RUN\` run nothing where it says \`none\` (\`if [ \"$RUN\" = all ]; then <the whole suite>; elif [ \"$RUN\" != none ]; then <the runner> $RUN; fi\`, or an \`if:\` whose parts joined by \`&&\` hold \`RUN\` in one part alone, nothing but \`env.RUN == 'all'\` and \`contains(env.RUN, ' <file> ')\` joined by \`||\`), since a runner given no file runs every test, and one given \`none\` fails; then a push that merges a pull request's head whose tree it holds, whose run selected the whole suite and passed that check, runs no test again. Leave it off any job, or entry of a job's matrix, that a pull request does not run, whose suite ran nowhere else, and any whose tests read what no tree holds (a release's tag, the day). Nothing fails meanwhile: the whole suite runs on a push as before.` : null;
}
