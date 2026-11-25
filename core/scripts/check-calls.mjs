// Which of a project's calls of the core's workflows check.mjs runs on a change (tasks/hosts.md, "One layer knows no
// host"): those whose triggers start on it, as GitHub reads them, and, of a sync, its own. The calls are the base's, so
// a change cannot leave a check out by taking its call out; but a change that moves the manifest's pin forward along the
// core's main, a sync, runs its own calls as GitHub runs its merge, at the new pin, since the old pin's core.yml reads
// a copy the new one leaves otherwise as differing (#1245, point 1); and each of the base's calls, moved to the sync's
// pin, where the sync leaves it out or calls it otherwise, so a sync leaves no check out, never as the copy's gate
// behind the sync's own core.yml passed (#1258). Also the reading of the project's own workflows, which job stops the rest,
// and the keys and reasons its verdicts are written under. Node's own modules, the core's address, its YAML reader, the
// reader of the signature check's refusal of an npm (npm-reads.mjs) and the runner's path filter.
import { CORE } from "./core-address.mjs";
import { MEND } from "./mend.mjs";
import { parseYaml } from "./parse-yaml.mjs";
import { npmRefused } from "./npm-reads.mjs";
import { needsOf } from "./workflow-needs.mjs";
import { pathsLetThrough } from "./workflow-run.mjs";

// Whether the change moves the core's pin forward along its main: from `from`, the base's pin, to `to`, the head's,
// each a commit, `to` on the core's main and past `from`. `past(older, newer)` asks the core's history.
export function movesForward(from, to, past) {
  const sha = /^[0-9a-f]{40}$/u;
  return sha.test(from ?? "") && sha.test(to ?? "") && from !== to && past(to, "refs/heads/main") && past(from, to);
}

// A sync's calls: its own (`head`, each { file, wf }), and, of the base's, each job that calls a workflow of the core's
// (`calls(job)`), moved to the sync's pin where `moved(uses)` gives it there (#1258, point 1: GitHub runs no call at the
// old pin, whose core.yml would read the sync's copy as differing, whatever pin the base held it at): one the head's
// file of that name does not call, so a sync that takes a call out drops no check; and one the head calls otherwise, or
// from a file whose triggers or other settings outside its jobs differ, as the base calls it, beside the head's own, so
// a sync that weakens a call's inputs or triggers, points it at another commit, or calls another workflow in its place,
// drops no check. Each of the base's is marked `base`, which check.mjs reads.
export function syncCalls(base, head, calls, moved = uses => uses) {
  const out = [...head];
  for (const { file, wf } of base) {
    const theirs = head.find(h => h.file === file)?.wf, mine = theirs?.jobs ?? {};
    const alike = theirs && canonical({ ...wf, jobs: null }) === canonical({ ...theirs, jobs: null });
    const jobs = Object.entries(wf.jobs ?? {}).filter(([, job]) => calls(job)).flatMap(([id, job]) => {
      const there = { ...job, uses: moved(job.uses) };
      if (!calls(mine[id])) return [[id, there]];
      return alike && canonical(there) === canonical(mine[id]) ? [] : [[`${id} (as the base calls it)`, there]];
    });
    if (jobs.length) out.push({ file, wf: { ...wf, jobs: Object.fromEntries(jobs) }, base: true });
  }
  return out;
}
// A value as text, its keys in order, so two jobs written alike in another order read the same.
const canonical = v => JSON.stringify(v, (_, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b))) : x));

// Whether a workflow's triggers start it on this pull request or push, as GitHub reads them.
export function triggered(on, { event, base, changed }) {
  const trigger = triggerOf(on, event);
  if (trigger === null || !onMain(trigger, event)) return false;
  if (!base) return true;
  if (trigger.types && !trigger.types.includes("synchronize") && !trigger.types.includes("opened")) return false;
  if (trigger.paths && !pathsLetThrough(trigger.paths, changed)) return false;
  return !(trigger["paths-ignore"] && changed.every(f => pathsLetThrough(trigger["paths-ignore"], [f])));
}

// Whether a trigger's branches let main through, as GitHub reads a filter, a list of patterns: main must pass the
// patterns and none of the ignored; and a push that names tags and no branch starts on a tag alone (#1245, point 8).
function onMain(trigger, event) {
  const { branches, "branches-ignore": ignored } = trigger;
  if (event === "push" && (trigger.tags || trigger["tags-ignore"]) && !branches && !ignored) return false;
  return !(branches && !pathsLetThrough(branches, ["main"])) && !(ignored && pathsLetThrough(ignored, ["main"]));
}

// The trigger a workflow's "on" gives an event: its settings, {} where it names the event bare, null where none.
function triggerOf(on, event) {
  if (typeof on === "string") return on === event ? {} : null;
  if (Array.isArray(on)) return on.includes(event) ? {} : null;
  return on?.[event] === undefined ? null : on[event] ?? {};
}

// A workflow of the project's, read: one in a form parse-yaml.mjs does not read is passed over and said so, since it
// is the project's own; one of those that calls the core's fails, since a check would go unrun. Moved from check.mjs, whose
// `say` and `fail` it is given.
export function readable(file, text, { say, fail }) {
  try { return { file, wf: parseYaml(text) }; } catch (e) {
    if (text.toLowerCase().includes(`${CORE.toLowerCase()}/.github/workflows/`)) fail(`.github/workflows/${file} calls the core's workflows and is written in a form this check cannot read (${e.message}).`, "write that file's calls to the core as the starter kit writes them, in plain YAML, or run the core's checks on the host meanwhile and report the form to the core (core/README.md, \"Reporting to the core\").");
    say(`note .github/workflows/${file} is written in a form this check does not read (${e.message}); it calls none of the core's workflows, so nothing is left unrun`);
    return null;
  }
}

// A workflow kept to its jobs that call no workflow and name no environment (a job that names one deploys, or holds
// what the host guards: the host's own, never run here, and said so); none where none is left. A kept job's need of a
// job left out is dropped, said so, as before the needs were read (#1245, point 3): what that job gives is not known here.
export function ownJobs({ file, wf }, say) {
  const jobs = Object.entries(wf.jobs ?? {}).filter(([, job]) => job && typeof job === "object" && job.uses === undefined);
  for (const [id] of jobs.filter(([, job]) => job.environment !== undefined)) say(`host ${file}/${id}: it names an environment, so it is the host's own, not run here`);
  const ids = new Set(jobs.filter(([, job]) => job.environment === undefined).map(([id]) => id));
  const kept = [...ids].map(id => {
    const job = wf.jobs[id], needs = needsOf(job), left = needs.filter(n => !ids.has(n));
    if (!left.length) return [id, job];
    say(`note ${file}/${id} needs ${left.join(", ")}, not run here, so it runs without ${left.length === 1 ? "it" : "them"}`);
    return [id, { ...job, needs: needs.filter(n => ids.has(n)) }];
  });
  return kept.length ? [{ file, wf: { ...wf, jobs: Object.fromEntries(kept) } }] : [];
}

// Whether a job's outcome stops the rest: core.yml's, where a step of its own failed (`r.copy`, or any failure where
// that is not said) or it did not run here, save where every step of its own passed first (`r.held`: an npm refused
// after them; #1262); but a sync's call of the base's (`j.base`, from syncCalls) never once the sync's own core.yml
// proved the copy (`proved`; #1258, point 1).
export const gates = (j, r, proved) => j.name === "core.yml" && !(j.base && proved) && Boolean((r.copy ?? r.failed > 0) || (r.unrun && !r.held));

// Of a job's results: whether a step of core.yml's own failed, before those it runs of the copy's scripts, which begin
// where it reads where the copy stands (any step, where none reads that); and `held`, where one does and none failed,
// so the copy is proved even where a later step left the job unrun (#1262).
export function ownFailed(r) {
  const parts = r.steps.findIndex(s => String(s.name ?? "").startsWith("Where the core's copy stands"));
  const failed = r.steps.some((s, i) => !s.passed && (parts < 0 || i < parts));
  return { failed, held: parts > 0 && !failed };
}

// Whether a job proves the copy the core, so that a base's call of core.yml stops nothing after it: the sync's own call
// of core.yml, at the manifest's pin (`pin`), never one the change points elsewhere, its own steps passed, run whole or
// left unrun after them (`held`) (#1258, point 1; #1262).
export const proves = (j, r, pin) => j.name === "core.yml" && !j.base && String(j.job?.uses ?? "").endsWith(`@${pin}`) && !r.failed && (r.unrun ? Boolean(r.held) : r.ran > 0);

// The keys a job that calls a workflow of the core's is written under, as check.mjs writes a verdict: one for each job
// of the workflow it calls, whose text `read(uses)` gives; its own place where that cannot be read (#1258, point 2).
export function calledKeys({ file, id, job }, read) {
  let ids = [];
  try { ids = Object.keys(parseYaml(read(String(job?.uses ?? "")) ?? "")?.jobs ?? {}); } catch { /* (not read: its own place) */ }
  return ids.length ? ids.map(called => `${file}/${id}/${called}`) : [`${file}/${id}`];
}

// Why a job was not run here, or null: on another system, or each failed step wanting a program this machine lacks
// (#1245, points 8 and 9), or an npm, where core.yml's signature check refused the machine's as too old to read its settings,
// its own words read exactly (npm-reads.mjs; #1262): a verdict of the machine's, not the change's.
export function unrunWhy(r) {
  const refused = s => String(s.name ?? "").startsWith("The signature check") && npmRefused(s.out);
  const wants = r.passed ? [] : r.steps.filter(s => !s.passed).map(s => s.missing ?? (refused(s) && `npm ${refused(s)} or later, which the core's own Node (its .node-version) brings`));
  const lacks = wants.length > 0 && wants.every(Boolean) && [...new Set(wants)].join(", ");
  return lacks ? `it needs ${lacks}, which this machine lacks` : r.unrun ?? null;
}

// The run's last lines, through `say` and `warn`, and its exit code. A job not run here proved nothing, so it fails the
// run as a failed one does: where check.mjs is the gate, a broken command or a job of another system would pass
// otherwise (#1245, points 8 and 9); its verdict still says unrun. The counts hold, with --own, the project's own jobs
// too, so the line names both, never the core's checks alone (#1275, point 2).
export function closing({ failed, ran, unrun }, say, warn) {
  if (unrun) warn(`FAIL ${unrun} job(s) skipped above could not run here, so proved nothing. ${MEND}run them where each skip line says, or mend the command it names.`);
  const which = "the core's checks that run from plain git and, with --own, the project's own jobs";
  say(failed || unrun ? `${failed} of the jobs run here failed, ${unrun} not run (${which})` : `ok   every job run here passed (${ran}: ${which})`);
  return failed || unrun ? 1 : 0;
}
