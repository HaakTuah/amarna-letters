// The step of setup/sync-notes/070-a-slimmer-copy.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import fs from "node:fs";
import path from "node:path";
import { HERE, COST } from "../step-checks.mjs";

export default { lead: "12 November 2026, a slimmer copy", cost: COST.line,
  check: p => {
    const want = /^Paths: .*$/m.exec(fs.readFileSync(path.join(HERE, "setup", "template", "core-manifest.md.tmpl"), "utf8"))?.[0];
    // (the folders the line gained or lost later are their own entries' to ask: 16 November 2026)
    return want && /^Paths:.*\breports\//mu.test(p.manifest) ? `The manifest's "Paths:" line reads, whole: ${want}` : null;
  } };
