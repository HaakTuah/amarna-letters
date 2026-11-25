// The step of setup/sync-notes/750-a-pull-request-of-the-progress-file-alone-proved.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { readable } from "../workflow-calls.mjs";
import { CORE } from "../core-address.mjs";
import { COST, shown } from "../step-checks.mjs";
import { topLevel, unwrapped } from "../step-checks-tests.mjs";

// Where a workflow of the project's calls the core's security-review.yml without the proof that a pull request is
// queue-only before it (#750): each such workflow, with the review call's pin, and each job calling the core's
// queue-only.yml that hands its head to no review's call, with the mend; null where every review's call takes it. Done
// where the review's job `needs` a job of the same workflow that calls queue-only.yml at the review's own pin, with a
// token that may read issues (the job's permissions, else the workflow's), its `if:` keeps it running where that job is
// skipped (`!cancelled()` or `always()`, a term of its top-level `&&`), and its input `queue` is that job's output
// `head`, exactly; and no right to write stands at the workflow's level beside two jobs, which zizmor's
// excessive-permissions fails (#1273, point 1): the rights at job level, as the template has them.
const coreUses = (job, name) => typeof job?.uses === "string" && job.uses.toLowerCase().startsWith(`${CORE}/.github/workflows/${name}@`.toLowerCase());
const pinOf = job => job.uses.slice(job.uses.indexOf("@") + 1);
const readsIssues = perms => perms === "read-all" || perms === "write-all" || (!!perms && typeof perms === "object" && ["read", "write"].includes(perms.issues));
// (a right to write the workflow's own `permissions:` gives every job: write-all, or any right given "write")
const writesAll = perms => perms === "write-all" || (!!perms && typeof perms === "object" && Object.values(perms).includes("write"));
const runsOnSkip = cond => {
  if (typeof cond !== "string") return false;
  const terms = topLevel(unwrapped(cond.trim().replace(/^\$\{\{([\s\S]*)\}\}$/u, "$1")), "&&");
  return !!terms && terms.some(t => ["!cancelled()", "always()"].includes(unwrapped(t).replace(/\s+/gu, "")));
};
// (the job of workflow `w` whose head the review's call `job` takes as that step asks, by its name; null where none)
function queueTaken(job, w) {
  const from = /^\$\{\{\s*needs\.([\w-]+)\.outputs\.head\s*\}\}$/u.exec(String(job.with?.queue ?? ""))?.[1], queue = from && w.yaml.jobs[from];
  const proves = coreUses(queue, "queue-only.yml") && pinOf(queue) === pinOf(job) && readsIssues(queue.permissions ?? w.yaml.permissions);
  return proves && [job.needs ?? []].flat().includes(from) && runsOnSkip(job.if) ? from : null;
}
// (what one workflow `w`, at `f`, lacks: into `lacking` each review's call that takes no proof's head, into `idle` each
// proof's job no review's call takes, and into `hoisted` the workflow where its own `permissions:` gives a right to
// write beside two jobs, or one to which the job `queue` is to be added)
function readCaller(f, w, { lacking, idle, hoisted }) {
  const jobs = w.yaml?.jobs && typeof w.yaml.jobs === "object" ? Object.entries(w.yaml.jobs) : [];
  const taken = new Set(), reviews = jobs.filter(([, job]) => coreUses(job, "security-review.yml"));
  for (const [, job] of reviews) {
    const from = queueTaken(job, w);
    if (from) taken.add(from);
    else lacking.push(`\`.github/workflows/${shown(f)}\` (at \`${shown(pinOf(job))}\`)`);
  }
  if (reviews.length && writesAll(w.yaml.permissions) && (jobs.length > 1 || !taken.size)) hoisted.push(`\`.github/workflows/${shown(f)}\``);
  idle.push(...jobs.filter(([name, job]) => coreUses(job, "queue-only.yml") && !taken.has(name)).map(([name]) => `\`${shown(name)}\` in \`.github/workflows/${shown(f)}\``));
}
function queueFirst(p) {
  readable(p, text => /\/\.github\/workflows\/(?:security-review|queue-only)\.yml@/iu.test(text));
  const found = { lacking: [], idle: [], hoisted: [] };
  for (const [f, w] of Object.entries(p.workflows)) readCaller(f, w, found);
  const { lacking, idle, hoisted } = found;
  if (!lacking.length && !idle.length && !hoisted.length) return null;
  const add = lacking.length ? `In one small pull request, in ${lacking.join(", ")}, add beside the job that calls the core's \`security-review.yml\` a job \`queue\` that calls the core's \`queue-only.yml\` at that call's pin (\`uses: ${CORE}/.github/workflows/queue-only.yml@<the pin>\`), with \`permissions:\` \`contents: read\`, \`pull-requests: read\` and \`issues: read\`, and give the review's job \`needs: queue\`, \`if: \${{ !cancelled() }}\` and, under its \`with:\`, \`queue: \${{ needs.queue.outputs.head }}\`, as \`core/setup/template/workflows/security-review.yml.tmpl\` has it: a pull request that changes only the progress file is then proved by a script and needs no review of its own, where left as it is such a pull request is reviewed as any other. In a private repository the job runs only where its call is given \`with: private: true\`, the owner's choice, each run there a billed job.` : "";
  const hand = idle.length ? `The job ${idle.join(", ")} calls the core's \`queue-only.yml\` and hands its head to no call of the core's \`security-review.yml\` in its workflow: give that call \`needs:\` it, \`if: \${{ !cancelled() }}\` and, under its \`with:\`, \`queue: \${{ needs.<the job>.outputs.head }}\`, at the same pin, or take the job out.` : "";
  const move = hoisted.length ? `In ${hoisted.join(", ")}, the workflow's own \`permissions:\` gives a right to write to every job, the job \`queue\` among them, which zizmor's excessive-permissions fails in the workflow check beside two jobs: move the rights to job level as \`core/setup/template/workflows/security-review.yml.tmpl\` has them, the workflow's \`permissions:\` \`contents: read\` alone, the job \`queue\` its own \`contents: read\`, \`pull-requests: read\` and \`issues: read\`, and the review's job its own \`contents: read\`, \`pull-requests: read\` and \`statuses: write\`, in the same pull request.` : "";
  return [add, hand, move].filter(Boolean).join(" ");
}

export default { lead: "19 November 2026, a pull request of the progress file alone proved by a script", cost: COST.workflow, check: queueFirst };
