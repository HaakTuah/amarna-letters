// Where a project's run of each of the core's checks finds its config (#366, #368, #386), read as the check is run, for
// the steps and the comparison with a fresh start (steps.mjs and fresh.mjs, beside this file): from the project's calls
// to the core's workflows (their `with:`), from the steps of its own workflows and of the local actions they use that
// run a script of its copy of the core with `node`, and, where neither runs the check, from the manifest's slot, else
// the starter kit's path. Every source is read, never only the first: where two give different files, or one names its
// file only when the workflow runs, or a script is run from a file the reader does not run (a shell script, a Makefile,
// a package's scripts), the config is not read (Unread), said with why, and compared nowhere, never read as a path no
// check is given. One check's config not read leaves every other's read. The calls, the commands of a step and the steps
// themselves are read in workflow-calls.mjs, step-commands.mjs, step-paths.mjs and own-runs.mjs, beside this file.
import { given, Unread, folded, copyAt } from "./workflow-calls.mjs";
import { inside } from "./step-paths.mjs";
import { fromRuns } from "./own-runs.mjs";

// The files the calls pass as `key`, an input the workflow requires: a call that passes none, or no text, is not read.
const passed = (p, name, key = "config") => given(p, name, key).map(({ where, value }) => {
  if (typeof value !== "string" || !value.trim()) throw new Unread(`${where} calls the core's ${name} with no ${key} that names a file`);
  return { where, value: inside(value, `${where}'s call to the core's ${name}`) };
});
const passedFolded = (p, key) => folded(p, key).map(({ where, value }) => {
  if (typeof value !== "string") throw new Unread(`${where} calls the core's core.yml with a ${key} that names no file`);
  return { where, value: inside(value, `${where}'s call to the core's core.yml`) };
});
// The files a project runs some other way, which name a script of its copy: a shell script, a Makefile, a package's
// scripts. The reader does not run them, so a check run from one alone is not read, never read at the slot's path.
const OTHER_RUNNERS = /(?:^|\/)(?:[^/]+\.(?:sh|bash|zsh|ps1|psm1|cmd|bat|mk)|Makefile|GNUmakefile|makefile|justfile|package\.json)$/u;
function namedElsewhere(p, names) {
  const at = copyAt(p);
  const own = (p.files ?? []).filter(f => OTHER_RUNNERS.test(f) && !f.startsWith(at) && !f.split("/").includes("node_modules"));
  const of = new RegExp(`(?:^|[^\\w.-])(?:\\./)?${at.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&").replace(/\//gu, "[\\\\/]")}scripts[\\\\/](?:${names.map(n => n.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")).join("|")})(?![\\w.-])`, "u");
  return own.filter(f => {
    const text = p.read(f) ?? "";
    if (!f.endsWith("package.json")) return of.test(text);
    try { return Object.values(JSON.parse(text)?.scripts ?? {}).some(s => typeof s === "string" && of.test(s)); } catch { return of.test(text); }
  });
}
const notElsewhere = (p, names) => {
  const named = namedElsewhere(p, names);
  if (named.length) throw new Unread(`${named.join(", ")} ${named.length > 1 ? "name" : "names"} ${names.map(n => `${copyAt(p)}scripts/${n}`).join(" or ")}, run from a file the core's reader does not run`);
};
// The one file the sources give, undefined where none gives one; where they give different files, not read.
function one(found, what) {
  const files = [...new Set(found.map(f => f.value))];
  if (files.length > 1) throw new Unread(`${what} is given as ${found.map(f => `${f.value} (${f.where})`).join(", ")}, files that differ`);
  return files[0];
}
// The path a manifest's slot names (its first backticked value), else `kit`.
const slot = (manifest, name, kit) => new RegExp(`^\\|\\s*\\*${name}\\*\\s*\\|\\s*\`([^\`]+)\``, "m").exec(manifest)?.[1] ?? kit;
export const KIT_CONFIGS = { licences: "checks/licences.json", audit: "checks/licences-audit.json", copies: "checks/copies.json", baseline: "checks/copies-baseline.json", sizes: "checks/sizes.json" };
// What a check's config names under `name`, as a path: null where the config is not there or names none; where the
// config is there and no JSON, not read. `rooted`: a "/" at its start read from the project's root, as the licence
// check joins it.
function key(p, file, name, rooted = false) {
  const text = p.read(file);
  if (text === null) return null;
  let value;
  try { value = JSON.parse(text)?.[name]; } catch { throw new Unread(`${file} is no JSON, so the ${name} it names cannot be read`); }
  return typeof value === "string" && value ? inside(rooted ? value.replace(/^\//u, "") : value, `the ${name} of ${file}`) : null;
}
// The licence check's config: what the calls to the core's licences.yml pass, and the project's own runs of the
// licence and agent-tools scripts, which run beside each other; where none runs it, the NuGet check's own, else the
// kit's.
export function licenceConfig(p) {
  const found = one([...passed(p, "licences.yml"), ...fromRuns(p, "licences.mjs"), ...fromRuns(p, "agent-tools.mjs")], "the licence check's config");
  if (found !== undefined) return found;
  notElsewhere(p, ["licences.mjs", "agent-tools.mjs"]);
  return nugetOwn(p) ?? KIT_CONFIGS.licences;
}
// The NuGet check's own config: what the calls to the core's nuget.yml (or core.yml's nuget) pass and the project's own runs of its script.
function nugetOwn(p) {
  const found = one([...passed(p, "nuget.yml"), ...passedFolded(p, "nuget"), ...fromRuns(p, "nuget.mjs")], "the NuGet check's config");
  if (found === undefined) notElsewhere(p, ["nuget.mjs"]);
  return found;
}
// The NuGet check's config: its own, read first, so that it stands where the licence check's cannot be read; else the
// licence check's (`licences`, read only then).
export const nugetConfig = (p, licences = () => licenceConfig(p)) => nugetOwn(p) ?? licences();
// The copies check's config: the calls' and the project's own runs', else the manifest's *copies check* slot (the
// backticked file in its own cell that is neither the script nor a command), else the kit's.
export function copiesConfig(p) {
  const found = one([...passed(p, "copies.yml"), ...passedFolded(p, "copies"), ...fromRuns(p, "copies.mjs")], "the copies check's config");
  if (found !== undefined) return found;
  notElsewhere(p, ["copies.mjs"]);
  const cell = /^\|\s*\*copies check\*\s*\|([^|\n]*)/m.exec(p.manifest)?.[1].match(/`[^`]+`/g) ?? [];
  const named = cell.map(v => v.slice(1, -1)).find(v => !/\s/.test(v) && !v.startsWith(copyAt(p)) && !v.startsWith(`./${copyAt(p)}`));
  return named === undefined ? KIT_CONFIGS.copies : inside(named, "the manifest's *copies check* slot");
}
// The size marks: what the calls to the core's copies.yml (or core.yml) pass as `sizes` and the project's own runs of the
// reading-size script, else the manifest's *size marks* slot, else the kit's.
export function marksConfig(p) {
  const found = one([...passed(p, "copies.yml", "sizes"), ...passedFolded(p, "sizes"), ...fromRuns(p, "reading-size.mjs")], "the size marks");
  if (found !== undefined) return found;
  notElsewhere(p, ["reading-size.mjs"]);
  return inside(slot(p.manifest, "size marks", KIT_CONFIGS.sizes), "the manifest's *size marks* slot");
}
// The folder the signature check reads package-lock.json in, from the root: what the calls to the core's
// signatures.yml pass as `directory` ("." where one passes none), or core.yml as `signatures`, undefined where none calls it.
export function packagesFolder(p) {
  const found = given(p, "signatures.yml", "directory").map(({ where, value }) => {
    if (value !== undefined && typeof value !== "string") throw new Unread(`${where} passes the core's signatures.yml a directory that is no text`);
    return { where, value: value === undefined ? "." : inside(value, `${where}'s call to the core's signatures.yml`) || "." };
  }).concat(passedFolded(p, "signatures").map(({ where, value }) => ({ where, value: value || "." })));
  return one(found, "the signature check's folder");
}
// All of them, each null where it cannot be read (Unread), and why under `unread`, each line naming whose it is, so
// the reader can say what it did not compare. Any other error is thrown, never hidden.
export function configs(p) {
  const unread = [];
  const or = (what, read) => { try { return read(); } catch (e) { if (!(e instanceof Unread)) throw e; unread.push(`${what}: ${e.message}`); return null; } };
  const licences = or("the licence check's config not compared", () => licenceConfig(p));
  const audit = licences === null ? null : or("the licence check's audit not compared", () => key(p, licences, "audit", true) ?? KIT_CONFIGS.audit);
  const nuget = or("the NuGet check's config not compared", () => nugetConfig(p, () => licences));
  const copies = or("the copies check's config not compared", () => copiesConfig(p));
  const baseline = copies === null ? null : or("the copies check's baseline not compared", () => key(p, copies, "baseline") ?? KIT_CONFIGS.baseline);
  const sizes = or("the size marks not compared", () => marksConfig(p));
  const packages = or("the signature check's folder not read, its lock file's taken", () => packagesFolder(p));
  return { licences, audit, nuget, copies, baseline, sizes, packages, unread: [...new Set(unread)] };
}
