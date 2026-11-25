// The step of setup/sync-notes/540-a-new-package-looked-up.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { copyAt } from "../workflow-calls.mjs";
import { COST, shown } from "../step-checks.mjs";
import { INLINED_MOST, jobsOf } from "../step-checks-jobs.mjs";
import { placed, lookupOf, FIRST, running, configOf, looksUp } from "../step-checks-lookup.mjs";

export default { lead: "16 November 2026, a new package looked up", cost: COST.workflow,
  check: p => {
    // (a project that calls the core's licences.yml or nuget.yml takes the lookup with the call; one that runs the
    // checks from a workflow of its own, as a private repository does, or a NuGet project whose sources need a
    // sign-in, adds the step beside them: the npm lookup where it runs the exact-versions check, the NuGet lookup
    // where it runs the NuGet check; from #1093 the licence check looks up npm's itself, and counts as that lookup
    // where it stands as one would)
    const wrong = Object.entries(p.workflows).flatMap(([f, w]) => {
      const jobs = jobsOf(w, p.read), at = `\`.github/workflows/${shown(f)}\``, copy = copyAt(p);
      // (a workflow this reader cannot read as YAML, whose words name a package check, is said, never taken as done)
      if (!w.yaml?.jobs && /(?:exact-versions|nuget|nuget-fetch)\.mjs/u.test(w.text ?? "")) return [`${at} cannot be read as YAML here, so where it runs its package checks and their lookups cannot be told: write it as plain YAML (quoted keys and values, no anchors)`];
      // (each config a check is given is matched by a lookup given the same config, since the lookup reads only the
      // lock files of the config it is given)
      // (a config named only when the workflow runs, "$CONFIG", may name another file in each job: there the lookup is
      // looked for in the check's own job alone)
      const configs = (...names) => jobs.flatMap(j => j.steps.flatMap(step => step.cmds.flatMap(c => names.flatMap(n => (running(c, n, undefined, copy) ? [{ cfg: placed(configOf(c, n, copy), step.dir), job: j, step }] : [])))));
      const within = ({ cfg, job }) => (/[$%]/u.test(cfg ?? "") ? [job] : jobs);
      const looked = (flag, at) => within(at).some(j => j.steps.some(st => lookupOf(st, flag, copy, at, j)));
      return [
        configs("exact-versions.mjs").some(at => !looked(false, at)) ? `in ${at}, for each config \`${copy}scripts/exact-versions.mjs\` is given, add a step that runs \`node ${copy}scripts/lookup.mjs\` with the same config (or the licence check, \`node ${copy}scripts/licences.mjs\`, with it, which looks up npm's new packages itself), ${FIRST(copy)}` : null,
        configs("nuget.mjs", "nuget-fetch.mjs").some(at => !looked(true, at)) ? `in ${at}, for each config \`${copy}scripts/nuget.mjs\` is given, add a step that runs \`node ${copy}scripts/lookup.mjs\` with the same config and \`--nuget\`, ${FIRST(copy)}` : null,
        jobs.some(j => !j.deep && j.steps.some(st => st.counts && looksUp(st.cmds[0], undefined, copy))) ? `in ${at}, which runs the lookup, give its checkout \`fetch-depth: 2\` and no \`ref:\`` : null,
        ...[...new Set(jobs.flatMap(j => j.unread))].map(f => `in ${at}, the local action \`${shown(f)}\` cannot be read whole (no YAML, or past ${INLINED_MOST} steps in all its actions call), so whether it runs a package check cannot be told: write it as YAML, its actions calling fewer`),
      ].filter(Boolean);
    });
    return wrong.length ? `On every pull request, ${wrong.join("; ")}; each lookup as a step of its own that fails where it fails (its step's one command, under bash or sh, with no \`if:\` or \`continue-on-error\` on the step or its job), in a workflow a pull request starts, its checkout with \`fetch-depth: 2\` holding the pull request's base, which the lookup reads against.` : null;
  },
  partly: "a project that calls the core's `licences.yml` or `nuget.yml` takes the step with the call, and the check passing is held by that check" };
