// The step of setup/sync-notes/360-an-agent-s-own-tools-listed.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { coreOf, kitHooks, check as toolsCheck } from "../agent-tools.mjs";
import { listed, markOf, show } from "../agent-tools-entries.mjs";
import { NOT_KIT_WHY } from "../agent-tools-read.mjs";
import { readProject } from "../agent-tools-project.mjs";
import { installed } from "../packages.mjs";
import { calls, copyAt } from "../workflow-calls.mjs";
import { licenceConfig } from "../check-configs.mjs";
import { runFiles } from "../own-runs.mjs";
import { COST } from "../step-checks.mjs";

export default { lead: "16 November 2026, an agent's own tools listed", cost: COST.line,
  // (the agent-tools check's own reading, with a missing list read as an empty one: what it would fail once written.
  // The core's licences.yml runs the check itself; a project that runs the licence script from a workflow of its own
  // runs it beside it, as of exact versions, and the config is the one that workflow passes: check-configs.mjs)
  check: p => {
    const own = calls(p, "licences.yml").length ? [] : runFiles(p, "licences.mjs");
    const beside = own.some(f => runFiles(p, "agent-tools.mjs").includes(f));
    const file = licenceConfig(p);
    let config = null;
    try { config = JSON.parse(p.read(file) ?? "null"); } catch { /* (read as no list, below) */ }
    // (with the core's packages not installed, a Codex config cannot be read: the step says so, with the install, and
    // every other step is still told, as of a key given twice)
    if (p.read(".codex/config.toml") !== null && !installed("smol-toml")) return `The core's packages are not installed, so \`.codex/config.toml\` could not be read for the tools it configures: run \`if [ -f ${copyAt(p)}scripts/install.mjs ]; then node ${copyAt(p)}scripts/install.mjs; fi\`, then \`node ${copyAt(p)}scripts/steps.mjs\` again.`;
    const head = readProject(p.root), list = listed(config, file) ?? { keys: new Set(), problems: [] };
    const { problems, missing, pins, sources } = toolsCheck(head, list, kitHooks(undefined, coreOf(p.manifest)), file);
    // (a hook whose command is not the kit's form is weighed, below; any other source, a setting of a kind no kit writes or a
    // file fetched that is no plain file, keeps the check's own mend, which only narrows what runs with power)
    const toWeigh = sources.filter(([k]) => head.sources.get(k)?.why === NOT_KIT_WHY);
    // (a hook to be weighed is listed by the sentence on it below, never told to be taken out as an unlisted tool is)
    const weighed = new Set(missing.filter(([k]) => toWeigh.some(([s]) => s === k)).map(([, problem]) => problem));
    const wrong = [...head.problems, ...problems.filter(problem => !weighed.has(problem)), ...[...pins, ...sources.filter(s => !toWeigh.includes(s))].map(([, problem]) => problem)];
    if (own.length && !beside) wrong.push(`the workflow that runs the licence check, ${own.join(", ")}, runs \`node ${copyAt(p)}scripts/agent-tools.mjs ${file}\` beside it, as the core's \`licences.yml\` does`);
    // (a hook whose command is not the kit's form may still run its copy on main, which no check reads exactly: whether it
    // does, and what becomes of it, is a security judgement, never a mend; it is marked, which fails nothing, and given to
    // a task; #1248, point 6; its mark read from its command, #1273, point 2)
    const judged = toWeigh.length ? `Each hook below runs a command not in the starter kit's form, so nothing the check reads shows that it runs its copy on main (floor rule 3); whether it does is a security judgement, not a mend: list it under "agentTools" in \`${file}\` with the "from" named after it, "main" where its command has git show its file from main (\`git show refs/remotes/origin/main:<the file>\`), which marks what the command names and never shows that main's copy is what runs, else "the working tree", which marks it as standing before and fails nothing, and file one task, an issue, for a session at the strongest tier to weigh each, with the security reviews of a change to what runs with power, before it is rewritten in the starter kit's form or taken out, never taking one out before then: ${toWeigh.map(([k, problem]) => `${problem.replace(/\. Mend: [^]*$/u, "")} ("from": ${show(markOf(head.sources.get(k)))})`).join("; ")}.` : "";
    return wrong.length || judged ? [wrong.length ? `List under "agentTools" in \`${file}\` every plug-in, tool server, skill and hook the project configures for its agents beyond the starter kit's hooks, each as { "kind", "name", "publisher", "version" }, a plug-in or tool server at one exact version, the one its configuration pins where it can pin one, or take out what nobody meant to configure; and see that its check runs: ${wrong.join("; ")}` : "", judged].filter(Boolean).join(" ") : null;
  } };
