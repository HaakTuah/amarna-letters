// The step of setup/sync-notes/010-builders-named-by-role.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { copyAt } from "../workflow-calls.mjs";
import { COST, inCopy } from "../step-checks.mjs";

export default { lead: "12 November 2026, builders named by role", cost: COST.line,
  check: p => {
    const wrong = [], copy = copyAt(p);
    if (!new RegExp(`${inCopy(copy)}(?:modules|tools)/other-builders\\.md`).test(p.read("AGENTS.md") ?? "")) wrong.push("`AGENTS.md` tells a session of another tool to read `core/tools/other-builders.md` at the start of every task");
    if (/^\|\s*\*Codex's checks\*\s*\|/m.test(p.manifest)) wrong.push("the manifest's row *Codex's checks* is renamed *other builders' checks*");
    return wrong.length ? `${wrong.join("; ")}.` : null;
  },
  partly: "that no builder is given `core/tools/codex.md`, and the names in the size marks, are read by the review" };
