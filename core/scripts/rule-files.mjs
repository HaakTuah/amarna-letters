// The project's rule files, read from its SECURITY.md, rule 3 (its "the rule files:" line, ended by ";"), so the list
// stands in one place: the copies check (copies.mjs) reads them, and so may a project's own checks. Run from the
// project's root. Node's own modules only.
import fs from "node:fs";
export function ruleFiles() {
  const rule = /\*\*the rule files:\*\*([^;]*);/.exec(fs.readFileSync("SECURITY.md", "utf8"));
  const list = rule ? [...rule[1].matchAll(/`([^`]+)`/g)].map(m => m[1]) : [];
  if (!list.length) throw new Error('SECURITY.md, rule 3, names no rule files ("the rule files:" line): the checks read their list there');
  return list.concat(rule[1].includes("this file") ? ["SECURITY.md"] : []);
}
