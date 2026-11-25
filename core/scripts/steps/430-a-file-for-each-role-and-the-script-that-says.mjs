// The step of setup/sync-notes/430-a-file-for-each-role-and-the-script-that-says.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { copyAt } from "../workflow-calls.mjs";
import { COST, inCopy } from "../step-checks.mjs";

export default { lead: "16 November 2026, a file for each role, and the script that says what to read", cost: COST.line,
  check: p => {
    const wrong = [], copy = copyAt(p);
    if (!/^Paths:.*\broles\//mu.test(p.manifest)) wrong.push('add `roles/` to the folders the "Paths:" line of `core-manifest.md` names, so that it reads as `core/README.md`, "The manifest\'s format", gives it');
    if (!new RegExp(`^@${inCopy(copy)}roles/builder\\.md[ \\t]*$`, "mu").test(p.read("AGENTS.md") ?? "")) wrong.push("add the line `@core/roles/builder.md` to the `@` lines of `AGENTS.md`, after the floor's, and to each entry file the project holds the line `core/scripts/entry-files.mjs` then names");
    return wrong.length ? `In one pull request, ${wrong.join("; and ")}.` : null;
  },
  partly: "whether the project's own folders have their kind of task in `checks/reading.json` is a reading of its folders; the sentence of `AGENTS.md` that names the script, step 2 of its \"Starting a task\" and the issue forms' \"What to read\" are differences `core/scripts/fresh.mjs` lists; the line `Read for it:` is held by the description check" };
