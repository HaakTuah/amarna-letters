// One holder of a rule, and the counts of the holders (split from holders.mjs, #888): what holders.mjs, which reads the
// core's own list, and holders-own.mjs, which reads a project's, both read a holder and its counts by.
import fs from "node:fs";
import path from "node:path";
import { inProject } from "./guards.mjs";

export const FILE = "scripts/holders";
const FORM = /^(?:(check): (.+?)|(audit)|(describes))(, in part)?$/u;
// The hooks a check may name: what a tool runs by itself in a session, which a session of another tool never runs.
export const HOOKS = new Set(["scripts/work-saved.sh", "scripts/helper-call.mjs", "setup/template/claude-settings.json.tmpl"]);
export const hook = x => x.kind === "check" && HOOKS.has(x.by);

// One holder as an entry names it for the rule `key`: { kind, by, part }, the line of what is wrong, with its mend,
// or null for one that is no string or an empty one, which the schema says (a project's list, which no schema reads,
// names it wrong where it meets one). `file` and `paths`: the list it stands in, and the names of a check that are
// paths to read as there or not. `show`: how a key or value is written into a line, which a project's list writes as a
// code span on one line.
export function holderOf(key, value, root, file = FILE, paths = /^(?:scripts|tests|\.github|setup|floor|roles|tasks|tools)\//u, show = t => `"${t}"`) {
  if (typeof value !== "string" || !value) return null;
  const m = FORM.exec(value);
  if (!m) return `${file}: ${show(key)} has the holder ${show(value)}, in no form it reads. Mend: write "check: <its script, test, workflow or GitHub's setting>", "audit" or "describes", each with ", in part" where it holds only some of the rule${file === FILE ? "; a staged case names its rules in its own file" : ', or "none" where nothing holds it'}`;
  const kind = m[1] ?? m[3] ?? m[4], what = m[2] ?? "";
  if (kind === "check" && paths.test(what) && (!inProject(what) || !fs.existsSync(path.join(root, what)))) return `${file}: ${show(key)} is held by ${show(what)}, which is not there. Mend: name the check as it now stands, or take the holder out`;
  return { kind, by: what, part: Boolean(m[5]) };
}

// The counts: rules held whole, in part, described only, and with no holder; and the rules with none.
export function counts({ rules: all, by }) {
  const out = { all: all.length, check: 0, case: 0, audit: 0, part: 0, describes: 0, none: [], hooked: [] };
  for (const r of all) {
    const h = by.get(r.key) ?? [];
    if (h.some(hook) && h.every(x => hook(x) || x.kind === "describes")) { out.none.push(r.key); out.hooked.push(r.key); continue; }
    if (!h.length) { out.none.push(r.key); continue; }
    if (h.every(x => x.kind === "describes")) { out.describes++; continue; }
    const whole = h.filter(x => x.kind !== "describes" && !x.part && !hook(x)); // (a hook beside a check counts for none)
    if (!whole.length) { out.part++; continue; }
    out[whole.some(x => x.kind === "check") ? "check" : whole.some(x => x.kind === "case") ? "case" : "audit"]++;
  }
  return out;
}
