// The reporter that stryker.mjs, beside this file, hands Stryker (a plug-in Stryker loads by its path): it writes the
// open mutation report (the mutation-testing-elements schema, which strength.mjs reads) as the run goes, so that a run
// stopped at its budget still leaves one. Once Stryker has planned its faults, each is written as not run ("Pending"),
// or as Stryker already judged it; each is then written again as it is tested; and once the run ends, the report is
// Stryker's own. It also writes which file each fault is in, for the tests each runs against (stryker.mjs, its
// dispatcher). What a test printed (Stryker's "statusReason") is left out, so the report stays small, and so are
// the tests that caught a fault ("killedBy"), which Stryker's command runner cannot name (it names its command "0").
// The paths come from the run's own options, under "coreRun": { report, plan, sources }, `sources` a JSON file of
// each file's text as it stood before Stryker wrote its own into it, in place, which its faults' places count in.
// Node's own modules only.
import fs from "node:fs";
import path from "node:path";

// A place in a file as the report writes it: Stryker plans from 0, the report counts lines and columns from 1.
const fromOne = p => ({ line: p.line + 1, column: p.column + 1 });
// A file's name in the report: from the folder Stryker runs in, with / between its parts.
export const named = (file, cwd = process.cwd()) => path.relative(cwd, file).split(path.sep).join("/");
// A fault as the report holds it, with nothing a test printed and no test named.
const kept = m => ({ id: String(m.id), mutatorName: m.mutatorName, replacement: m.replacement, location: m.location, status: m.status });

// The report's state as the run goes: `plan(mutantPlans)`, `tested(result)` and `ended(report)` each give the report
// to write, and `plan` the file of each fault's id as well. `read` gives a file's text.
export function progress({ cwd = process.cwd(), read = f => fs.readFileSync(f, "utf8") } = {}) {
  const files = {}, byId = new Map();
  const report = () => ({ schemaVersion: "1", thresholds: { high: 80, low: 60 }, files });
  return {
    plan(mutantPlans) {
      const of = {};
      for (const p of mutantPlans) {
        const m = p.mutant, file = named(m.fileName, cwd);
        files[file] ??= { language: "javascript", source: read(m.fileName), mutants: [] };
        const entry = kept({ ...m, location: { start: fromOne(m.location.start), end: fromOne(m.location.end) }, status: p.plan === "EarlyResult" ? m.status : "Pending" });
        files[file].mutants.push(entry);
        byId.set(entry.id, entry);
        of[entry.id] = file;
      }
      return { report: report(), of };
    },
    tested(result) {
      const entry = byId.get(String(result.id));
      if (entry) Object.assign(entry, kept(result));
      return report();
    },
    ended(final) {
      for (const [file, f] of Object.entries(final?.files ?? {})) files[file] = { language: f.language, source: f.source, mutants: f.mutants.map(kept) };
      return report();
    },
  };
}

// The plug-in: a reporter Stryker builds with its options.
export function coreReporter(options) {
  const { report, plan, sources } = options.coreRun ?? {};
  if (!report || !plan || !sources) throw new Error("stryker-plugin.mjs is run by stryker.mjs, which names its report, plan and sources under \"coreRun\"");
  const before = JSON.parse(fs.readFileSync(sources, "utf8"));
  // (each file written whole beside its place and then moved there, so a run stopped mid-write leaves the last whole one)
  const whole = (at, value) => { const part = `${at}.part`; fs.writeFileSync(part, `${JSON.stringify(value)}\n`); fs.renameSync(part, at); };
  const state = progress({ read: f => before[named(f)] ?? fs.readFileSync(f, "utf8") }), write = r => whole(report, r);
  return {
    onMutationTestingPlanReady({ mutantPlans }) { const p = state.plan(mutantPlans); whole(plan, p.of); write(p.report); },
    onMutantTested(result) { write(state.tested(result)); },
    onMutationTestReportReady(final) { write(state.ended(final)); },
  };
}
coreReporter.inject = ["options"];

export const strykerPlugins = [{ kind: "Reporter", name: "core-report", factory: coreReporter }];
