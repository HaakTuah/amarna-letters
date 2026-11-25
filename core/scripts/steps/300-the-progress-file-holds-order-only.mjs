// The step of setup/sync-notes/300-the-progress-file-holds-order-only.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { progressOf } from "../done-when.mjs";
import { Unread } from "../workflow-calls.mjs";
import { marksConfig } from "../check-configs.mjs";
import { COST } from "../step-checks.mjs";

export default { lead: "15 November 2026, the progress file holds order only", cost: COST.read,
  // (a mark of its own is one below the general mark, "each"; a file under a quarter of that has had no time to fill,
  // and its first trim, which sets the mark, comes once it passes it: the general mark holds there till then)
  check: p => {
    const file = progressOf(p.manifest), marksAt = marksConfig(p);
    const text = p.read(file);
    let marks = null;
    try { marks = JSON.parse(p.read(marksAt) ?? "null"); } catch { /* (read as missing, below) */ }
    if (text === null || !(Number.isInteger(marks?.each) && marks.each > 0 && marks.read && typeof marks.read === "object"))
      throw new Unread(`no ${file}, or no ${marksAt} with its "each" and "read", to read`);
    const mark = marks.read?.[file], bytes = Buffer.byteLength(text);
    if ((Number.isInteger(mark) && mark < marks.each) || bytes < marks.each / 4) return null;
    return `Trim \`${file}\` once, in a pull request of its own: each finished entry leaves it (its pull request and issue keep it), each entry says only what is next and points to its pull requests for what was done, and each line of a queued issue holds its issue, who builds it and what it waits on, nothing more (\`core/roles/shared/inbox.md\`, "The *progress file* holds order only"). Then give it a mark of its own under "read" in \`${marksAt}\`: a number of bytes the project chooses, below "each" (${marks.each}) and at least its size after the trim.`;
  } };
