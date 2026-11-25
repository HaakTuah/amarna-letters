// The step of setup/sync-notes/190-the-nuget-check.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import path from "node:path";
import { call, folded } from "../workflow-calls.mjs";
import { nugetConfig } from "../check-configs.mjs";
import { COST, PROJECT_FILES } from "../step-checks.mjs";

export default { lead: "13 November 2026, the NuGet check", cost: COST.workflow,
  check: p => {
    const projects = p.files.filter(f => PROJECT_FILES.test(f));
    if (!projects.length) return null;
    const wrong = [];
    const locks = [...new Set(projects.map(f => path.posix.join(path.posix.dirname(f), "packages.lock.json")))];
    const missing = locks.filter(l => !p.files.includes(l));
    if (missing.length) wrong.push(`each project file's \`packages.lock.json\` is committed, lock files turned on (\`RestorePackagesWithLockFile\`): ${missing.join(", ")}`);
    if (!call(p, "nuget.yml") && !folded(p, "nuget").length) wrong.push("the project's call to the core's `core.yml` passes `nuget:` the licence check's config, as `core/scripts/init.mjs --nuget` writes it, or a `.github/workflows/nuget.yml` calls the core's `nuget.yml`, or its owner declines the check in the manifest's \"Differences\", as the entry \"16 November 2026, the NuGet check where it can matter\" says");
    let config = null;
    const file = nugetConfig(p);
    try { config = JSON.parse(p.read(file) ?? "null"); } catch { /* (read as missing, below) */ }
    const named = new Set([...(config?.nuget?.ships ?? []), ...(config?.nuget?.tools ?? [])]);
    const unnamed = locks.filter(l => p.files.includes(l) && !named.has(l));
    if (!config?.nuget) wrong.push(`\`${file}\` has a "nuget" part naming each lock file under "ships" or "tools"`);
    else if (unnamed.length) wrong.push(`\`${file}\` names under "nuget.ships" or "nuget.tools": ${unnamed.join(", ")}`);
    return wrong.length ? `${wrong.join("; ")}.` : null;
  } };
