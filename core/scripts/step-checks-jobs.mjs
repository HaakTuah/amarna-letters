// The jobs of a workflow as the steps read them: each step of a job with the local actions it calls inlined, and what
// it is given (steps.mjs, beside this file, holds the steps, and step-checks.mjs the words they share). Each piece
// takes the project as steps.mjs's `project` reads it and returns the mend, or null where the step is done; a step
// names the ones it needs, none runs by itself. It reads only. Node's own modules and git only.
import path from "node:path";
import { commands, uncommented } from "./step-commands.mjs";
import { parseYaml } from "./parse-yaml.mjs";
import { everyPush } from "./step-checks.mjs";

// A job's steps with each local composite action (`uses: ./…`) read in its place, its own steps in order, so a check or
// a lookup run from one is seen where it runs: an inner step takes its caller's `if:`, continue-on-error and env where
// it gives none of its own, and runs from the folder it names, never its caller's default; each `${{ inputs.x }}` in its
// run, folder, `with:` and env is the caller's `with:` (or the input's default) where it gives one, and is left, never to
// match, where not. An action no deeper than 10, never within itself, and no more than INLINED_MOST steps read in a
// workflow, however the actions call each other; one whose file cannot be read as YAML, is past ACTION_MOST bytes, or
// lies past that bound is named in `unread`, and its step kept as it stands.
export const INLINED_MOST = 5000, ACTION_MOST = 1 << 20;

function inlined(list, read, unread, budget, chain = []) {
  return list.flatMap(st => {
    const uses = typeof st?.uses === "string" && st.uses.startsWith("./") ? path.posix.normalize(st.uses.slice(2)).replace(/\/+$/u, "") : null;
    const steps = uses && !uses.startsWith("..") && !chain.includes(uses) && chain.length < 10 ? compositeSteps(uses, read, unread) : null;
    if (!steps) return [st];
    if ((budget.left -= steps.length) < 0) { unread.push(uses); return [st]; }
    const given = inputsOf(st, steps.inputs);
    const inner = steps.map(x => (x && typeof x === "object" ? (y => ({ ...y, composite: true, if: x.if ?? st.if, "continue-on-error": x["continue-on-error"] || st["continue-on-error"], env: { ...(st.env ?? {}), ...(y.env ?? {}) } }))(given(x)) : x));
    return inlined(inner, read, unread, budget, [...chain, uses]);
  });
}

// A step of an action with each `${{ inputs.x }}` of its run, folder, `with:` and env put as its caller gives it.
const inputsOf = (caller, declared) => x => {
  const value = name => {
    const v = caller?.with?.[name] ?? declared?.[name]?.default;
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : null;
  };
  const put = t => (typeof t === "string" ? t.replace(/\$\{\{\s*inputs\.([\w-]+)\s*\}\}/gu, (whole, name) => value(name) ?? whole) : t);
  const out = { ...x, run: put(x.run), "working-directory": put(x["working-directory"]) };
  for (const key of ["with", "env"]) if (x[key] && typeof x[key] === "object") out[key] = Object.fromEntries(Object.entries(x[key]).map(([k, v]) => [k, put(v)]));
  return out;
};

// The steps of the composite action at `at`, with its declared inputs as `inputs`, or null: none there, or not
// composite, or (named in `unread`) no YAML or past ACTION_MOST bytes. Each action is read and parsed once for a project.
const ACTIONS = new WeakMap();

function compositeSteps(at, read, unread) {
  if (!ACTIONS.has(read)) ACTIONS.set(read, new Map());
  const seen = ACTIONS.get(read);
  if (!seen.has(at)) seen.set(at, actionAt(at, read));
  const found = seen.get(at);
  if (found?.unread) unread.push(found.unread);
  return found?.steps ?? null;
}

function actionAt(at, read) {
  for (const f of [`${at}/action.yml`, `${at}/action.yaml`]) {
    const text = read(f);
    if (text === null) continue;
    if (text.length > ACTION_MOST) return { unread: f };
    let yaml = null;
    try { yaml = parseYaml(text); } catch { /* (named below) */ }
    if (!yaml || typeof yaml !== "object") return { unread: f };
    return Array.isArray(yaml.runs?.steps) ? { steps: Object.assign([...yaml.runs.steps], { inputs: yaml.inputs }) } : null;
  }
  return null;
}

// Whether a step's shell stops on a failure: bash or sh, the default off Windows.
function stopsOn(st, job, w) {
  const shell = st?.shell ?? job?.defaults?.run?.shell ?? w.yaml?.defaults?.run?.shell;
  return shell === undefined ? notWindows(job) : /^(?:bash|sh)$/u.test(String(shell).trim());
}

// Whether a job's runner is one of GitHub's own Linux or macOS runners, named outright, whose default shell is bash (a
// runner a matrix, an expression, an organisation or a self-hosted machine names may be Windows, whose default is pwsh;
// a label is the owner's, so one that names a Linux runner is taken at its word).
const notWindows = job => { const r = [job?.["runs-on"] ?? ""].flat(); return r.length > 0 && r.every(x => typeof x === "string" && /^(?:ubuntu|macos)-[\w.-]+$/u.test(x)); };

// The folder a step runs in, where it names one: its own, else (but in a composite action) its job's or workflow's default.
function folderOf(st, job, w) {
  const dir = st?.["working-directory"] ?? (st?.composite ? undefined : job?.defaults?.run?.["working-directory"] ?? w.yaml?.defaults?.run?.["working-directory"]);
  return typeof dir === "string" ? dir : undefined;
}

// Whether a step may run more than its words show: a command run inside another's words, a redirection, or an expansion
// bash may evaluate (anything but a plain ${NAME}); a shell other than bash or sh (an unset one only where the runner is
// no Windows one); or a variable in its env, its job's or its workflow's, but those its config word names (an
// allow-list), and never one a runner, a shell, Node, OpenSSL or the loader reads, even named so.
const READ_BY_RUNNERS = /^(?:LD_|BASH|ENV$|PATH$|NODE_|OPENSSL_|SSL_|SHELLOPTS$|PS4$|IFS$|CDPATH$|GLOBIGNORE$|TMPDIR$|INPUT_|ACTIONS_|RUNNER_|GITHUB_)/iu;

const visible = (env, job, w) => [env, job?.env, w.yaml?.env].flatMap(e => (e && typeof e === "object" ? Object.keys(e) : []));

const plainKey = k => /^[A-Za-z_]\w*$/u.test(k) && !READ_BY_RUNNERS.test(k);

const hides = (st, env, job, w) => {
  const text = typeof st?.run === "string" ? st.run : "";
  const shell = st?.shell ?? job?.defaults?.run?.shell ?? w.yaml?.defaults?.run?.shell;
  const word = commands(text)[0]?.[2]?.text ?? "";
  const given = new Set([...word.matchAll(/\$\{?([A-Za-z_]\w*)|%([A-Za-z_]\w*)%/gu)].map(m => m[1] ?? m[2]));
  // (a redirection, which may write a file, the lookup itself among them, before the program opens it, is refused too)
  return /\$\(|`|[<>]|\$\{(?![A-Za-z_]\w*\})/u.test(text.split(/\r?\n/u).map(uncommented).join("\n"))
    || (shell === undefined ? !notWindows(job) : !/^(?:bash|sh)$/u.test(String(shell).trim()))
    || visible(env, job, w).some(k => !plainKey(k) || !given.has(k));
};

// Whether an action's step may stand before a lookup as it is given: no env of its own and none a runner reads from its
// job or workflow; for the checkout, no other repository, folder or commit than the pull request's; and for a setup
// action, only the version, distribution and architecture to set up, and its cache only turned off, by
// package-manager-cache: false, or by cache: false in setup-dotnet alone (elsewhere a "cache" names a package
// manager, not a switch), since a cache or an
// install could run the pull request's own files (a cache an action takes by default runs the package manager in the
// project's folder, under its config: the step's advisory reading, which a project's own workflow, a protected file, holds).
const plainAction = (st, job, w) => Object.keys(st.env).length === 0 && visible({}, job, w).every(plainKey)
  && Object.entries(st.with ?? {}).every(([k, v]) => (/^actions\/checkout@/u.test(st.uses) ? ["fetch-depth", "persist-credentials"].includes(k)
    : /^(?:[\w-]*version(?:-file)?|distribution|architecture)$/u.test(k) || (String(v) === "false" && (k === "package-manager-cache" || (k === "cache" && /^actions\/setup-dotnet@/u.test(st.uses))))));

// Whether a job runs in a container of its own, or beside service containers, which may mount its folder: it runs as
// they are given, their env and options too, so nothing counts there.
const boxedJob = job => job?.container !== undefined || job?.services !== undefined;

// Whether a step runs whenever its job reaches it: no `if:` and no continue-on-error of its own.
const unconditioned = st => st?.if === undefined && !st?.["continue-on-error"];

// A step of a job as the step reads it: its commands, whether its one lookup counts, its action and its env.
function stepOf(st, job, w, started) {
  const cmds = typeof st?.run === "string" ? commands(st.run) : [];
  const stops = stopsOn(st, job, w);
  // (a lone "|" or "&" in the step's text, a pipe or the background, hides the command's failure from the step)
  const alone = typeof st?.run === "string" && !/(?:^|[^&|>])[&|](?![&|])/mu.test(st.run.split(/\r?\n/u).map(uncommented).join("\n"));
  const counts = started && cmds.length === 1 && alone && stops && st.if === undefined && job?.if === undefined && !st["continue-on-error"] && !job?.["continue-on-error"];
  const env = st?.env && typeof st.env === "object" ? st.env : {};
  const boxed = boxedJob(job);
  return { cmds, counts, unconditioned: unconditioned(st), hidden: boxed || hides(st, env, job, w), plain: !boxed && typeof st?.uses === "string" && plainAction({ ...st, env }, job, w), dir: folderOf(st, job, w), uses: typeof st?.uses === "string" ? st.uses : null, env };
}

// Each job of a workflow: the commands its steps run (shell comments left out, as step-commands.mjs's reader reads
// them), all of them and step by step in order; for each step, whether a lookup there counts; and whether its checkout
// holds the base beside the head (a fetch-depth of 0, or 2 or more, and no ref of another commit). A lookup counts only
// as the one command of its step, in a workflow a pull request starts, where neither the step nor its job carries an
// `if:` or continue-on-error (conditions the reader cannot tell), under bash or sh, which stop on a failure (pwsh, the
// default on Windows, and a shell given its own options do not). A workflow whose YAML cannot be read is read as one
// job, its whole text its one command list, and none of it counts as a lookup.
export function jobsOf(w, read = () => null) {
  const deep = (v) => /^(?:0|[2-9]|\d{2,})$/u.test(String(v ?? "").trim());
  const jobs = w.yaml?.jobs && typeof w.yaml.jobs === "object" ? Object.values(w.yaml.jobs) : null;
  if (!jobs) return [{ runs: commands(w.text ?? ""), steps: [], deep: false, unread: [] }];
  const started = everyPush(w.yaml?.on), budget = { left: INLINED_MOST };
  return jobs.map(job => {
    const unread = [];
    const steps = inlined(Array.isArray(job?.steps) ? job.steps : [], read, unread, budget).map(st => stepOf(st, job, w, started));
    return { runs: steps.flatMap(st => st.cmds), steps, unread,
      deep: (job?.steps ?? []).some(st => typeof st?.uses === "string" && /^actions\/checkout@/u.test(st.uses) && deep(st.with?.["fetch-depth"]) && st.with?.ref === undefined) };
  });
}
