// What a mutation tool's report holds (scripts/strength.mjs, the strength check; tasks/code-shape.md, "How strong the
// tests are"; #253, #920): the faults of a report in the open form of the mutation-testing-elements schema, each with its
// id in the baseline, and the counts of a run. The verdict on them is strength-verdict.mjs; where the tool is run is
// strength.mjs. Node's own modules and the core's.
import path from "node:path";
import { parseBounded } from "./guards.mjs";

const CAUGHT = ["Killed", "Timeout"];
export const SURVIVED = ["Survived", "NoCoverage"];

export class Refused extends Error {}
export const refuse = (what, mend) => { throw new Refused(`${what}. Mend: ${mend}`); };

export const collapse = (s, most) => { const t = String(s).replace(/\s+/gu, " ").trim(); return t.length > most ? `${t.slice(0, most - 1)}…` : t; };

// The text a fault replaced.
const originalOf = (lines, { start, end }) => (start.line === end.line ? lines[start.line - 1]?.slice(start.column - 1, end.column - 1) : lines[start.line - 1]?.slice(start.column - 1)) ?? "";

// A fault's id in the baseline: its file, the text of its line, and what became what; stable where lines move.
export function idOf(file, source, m) {
  const lines = source.split(/\r?\n/u);
  return `survivor: ${file}: ${collapse(lines[m.location.start.line - 1] ?? "", 100)} [${collapse(originalOf(lines, m.location), 40)} -> ${collapse(m.replacement ?? "", 40)}]`;
}
const aPlace = p => p && Number.isInteger(p.line) && p.line > 0 && Number.isInteger(p.column) && p.column > 0;
const aMutant = m => m && typeof m.status === "string" && typeof m.mutatorName === "string" && aPlace(m.location?.start) && aPlace(m.location?.end);

// The faults of a report, on the lines wanted (a Map of file to a Set; null for all): each { file, line, column, end,
// id, status, mutatorName, replacement }. It throws a Refused where the report is not in the form.
export function faultsOf(text, wanted, root = ".") {
  let r;
  try { r = parseBounded(text); } catch { refuse("the mutation tool's report could not be read as JSON", "have the tool write its report in the mutation-testing-elements schema (Stryker's \"json\" reporter writes it) to the path {report} stands for"); }
  if (!r || typeof r.files !== "object" || r.files === null) refuse("the mutation tool's report has no \"files\"", "have the tool write the mutation-testing-elements schema, whose \"files\" holds each file's \"source\" and \"mutants\"");
  const out = [];
  for (const [name, f] of Object.entries(r.files)) {
    const file = (path.isAbsolute(name) ? path.relative(root, name) : name).replace(/\\/gu, "/");
    if (typeof f?.source !== "string" || !Array.isArray(f.mutants) || !f.mutants.every(aMutant)) refuse(`the mutation tool's report holds ${file} in a form the check does not read`, "have the tool write the mutation-testing-elements schema: each file a \"source\" and \"mutants\", each with \"mutatorName\", \"location\" and \"status\"");
    for (const m of f.mutants) {
      if (wanted && !wanted.get(file)?.has(m.location.start.line)) continue;
      out.push({ file, line: m.location.start.line, column: m.location.start.column, end: `${m.location.end.line}:${m.location.end.column}`, id: idOf(file, f.source, m), status: m.status, mutatorName: m.mutatorName, original: originalOf(f.source.split(/\r?\n/u), m.location), replacement: m.replacement ?? "" });
    }
  }
  return out;
}

// The counts of a run, and its line: caught, survived, not run.
export function counted(faults) {
  const n = statuses => faults.filter(f => statuses.includes(f.status)).length;
  const caught = n(CAUGHT), survived = n(SURVIVED), pending = n(["Pending"]), judged = caught + survived;
  const share = judged ? `${Math.round((1000 * caught) / judged) / 10}%` : "none judged";
  return { caught, survived, pending, line: `${caught} of ${judged} faults put in on purpose were caught (${share})${survived ? `, ${survived} survived` : ""}${pending ? `, ${pending} not run (the tool's budget)` : ""}` };
}
