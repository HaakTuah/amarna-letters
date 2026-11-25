// The step of setup/sync-notes/270-the-size-marks-total-counts-the-project-s-own.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { marksRun, totalNoted, writeTotal } from "../step-writers.mjs";

export default { lead: "14 November 2026, the size marks' total counts the project's own files", cost: COST.line,
  // (the reading-size check passes and says so in a note, which no run of it turns red: this step reads that note,
  // from the project's own copy of the check, and gives its number; a run that never reached its end read nothing, and
  // is reported as not read, never as done: step-writers.mjs, marksRun)
  check: p => {
    const run = marksRun(p), to = totalNoted(run);
    return to === null ? null : `The "total" in \`${run.marks}\` is set to ${to}, the number the reading-size check's note gives, so the project keeps the room it had and the core's copy is held by the core's own cap.`;
  },
  write: writeTotal };
