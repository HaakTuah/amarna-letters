// The step of setup/sync-notes/730-a-project-s-own-rules-and-what-holds-them.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { OWN as OWN_HOLDERS } from "../holders-own.mjs";
import { COST } from "../step-checks.mjs";
import { writeHolders } from "../step-writers.mjs";

export default { lead: "19 November 2026, a project's own rules and what holds them", cost: COST.config,
  // (the list of what holds each of the project's own rules, holders.mjs's OWN, written and readable; what it names
  // for each is the project's to work down, which nothing fails)
  check: p => {
    const text = p.read(OWN_HOLDERS);
    const mend = `run \`node core/scripts/holders.mjs --own --write\`, which writes \`${OWN_HOLDERS}\` with each of the project's own rules named as held by "none", and commit it in a pull request of its own; where a check, test, simulation or script of the project's already fails where a rule is broken, name it there as "check: <its path>"`;
    if (text === null) return `The project holds no list of what holds its own rules: ${mend}.`;
    let holds;
    try { holds = JSON.parse(text)?.holders; } catch { holds = null; }
    return holds && typeof holds === "object" && !Array.isArray(holds) ? null : `\`${OWN_HOLDERS}\` cannot be read as JSON with an object "holders": write it so, or take it out and ${mend}.`;
  },
  write: writeHolders };
