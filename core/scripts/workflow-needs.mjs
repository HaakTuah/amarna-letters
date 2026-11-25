// The order of a workflow's jobs by their `needs:`, as GitHub runs them (#1245, point 3), for workflow-run.mjs, which
// stood at its size mark. Node alone.
// The jobs a job's `needs:` names, one or a list.
export const needsOf = job => [job?.needs ?? []].flat().map(n => String(n ?? ""));

// The jobs in the order GitHub may run them: each after every job it needs, and otherwise as written. A need that names
// no job of the workflow, or a loop of needs, throws, as GitHub refuses the workflow.
export function inNeedsOrder(jobs) {
  const left = Object.entries(jobs), order = [], placed = new Set();
  for (const [id, job] of left) for (const n of needsOf(job)) if (!Object.hasOwn(jobs, n)) throw new Error(`the job ${id} needs ${n}, which is no job of the workflow`);
  while (left.length) {
    const at = left.findIndex(([, job]) => needsOf(job).every(n => placed.has(n)));
    if (at < 0) throw new Error(`the jobs ${left.map(([id]) => id).join(", ")} need each other in a loop`);
    const [entry] = left.splice(at, 1);
    order.push(entry); placed.add(entry[0]);
  }
  return order;
}
