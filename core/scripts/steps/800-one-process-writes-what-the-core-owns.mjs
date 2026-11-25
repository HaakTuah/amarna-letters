// The step of setup/sync-notes/800-one-process-writes-what-the-core-owns.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { BEGIN, BLOCKS } from "../core-owned.mjs";
import { COST } from "../step-checks.mjs";

export default { lead: "22 November 2026, one process writes what the core owns", cost: COST.check,
  // (the process has run once: it writes the core's part into each of the two rule files that stands, every run, and
  // nothing else of a project's marks it so exactly; a file of the core's that a change made otherwise afterwards is
  // the copies part's check's, and one left as the project's a difference fresh.mjs reports)
  check: p => {
    // (a rule file the manifest's "Differences" names is the project's, which the process never writes: done)
    const lacking = BLOCKS.filter(f => { const t = p.read(f); return t !== null && !t.includes(BEGIN) && !p.differences.some(l => l.includes(`"${f}"`)); });
    return lacking.length ? `The one process that writes what the core owns has not run here: ${lacking.join(" and ")} ${lacking.length > 1 ? "hold" : "holds"} no part of the core's between its marks. Mend: run \`node core/scripts/sync.mjs <the manifest's pin>\`, which at the same pin moves nothing and runs the process with the earlier kits (or \`node core/scripts/converge.mjs --write\`), and commit what it writes in the sync's pull request, which stays a pure sync; where the process says it cannot tell the core's part apart (more than one run of import lines), join them into one run and run it again, or, to keep the file as the project's own, name it in core-manifest.md's "Differences" on the owner's word.` : null;
  } };
