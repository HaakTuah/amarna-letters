// What the steps of the held packages read: the week's wait, the lock files off the registry, the pins of another
// publisher's code and the fetches no audit names (steps.mjs, beside this file, holds the steps, and step-checks.mjs the words they share). Each
// piece takes the project as steps.mjs's `project` reads it and returns the mend, or null where the step is done; a
// step names the ones it needs, none runs by itself. It reads only. Node's own modules and git only.
import { copyAt } from "./workflow-calls.mjs";
import { licenceConfig } from "./check-configs.mjs";
import { releaseAge, WAIT } from "./licences.mjs";
import { codeOf, covers, pinFault, pinRead, unauditedIn } from "./licence-scan.mjs";
import { npmPackages, offRegistry } from "./lookup.mjs";
import { shown } from "./step-checks.mjs";

// What stood before the package checks read it, which they report and pass (#488, points 3 to 5), read as they read
// it: an .npmrc of "ignoreScriptsIn" without the week's wait (licences.mjs), a lock entry not from npm's registry with an
// integrity value (lookup.mjs), and a file that downloads what may be a program unpinned (licence-scan.mjs). A config,
// audit or lock file those checks cannot read is their own failure, so nothing is said of it here.
export function packagesHeld(p) {
  const config = jsonAt(p, licenceConfig(p));
  if (!config) return null;
  const all = [...waitAsks(p, config), ...offAsks(p, config), ...pinAsks(p, config)];
  return all.length ? `Each stood before the package checks read it, which report it and pass; mend each in a pull request of its own: ${all.slice(0, 20).join("; ")}${all.length > 20 ? `; and ${all.length - 20} more, which the licence check and the lookup print` : ""}.` : null;
}

// (a file of the project's read as a JSON object, or null; a list's texts)
const jsonAt = (p, f) => { try { const v = JSON.parse(p.read(f) ?? "null"); return v && typeof v === "object" && !Array.isArray(v) ? v : null; } catch { return null; } };

const strings = v => (Array.isArray(v) ? v.filter(x => typeof x === "string" && x) : []);

// An .npmrc of "ignoreScriptsIn" with no wait of WAIT days.
const waitAsks = (p, config) => strings(config.ignoreScriptsIn).filter(f => (releaseAge(p.read(f) ?? "") ?? 0) < WAIT)
  .map(f => `\`${shown(f)}\` sets no wait: add the line \`min-release-age=${WAIT}\` to it`);

// A lock entry of "lockfiles" not from npm's registry with an integrity value.
const offAsks = (p, config) => strings(config.lockfiles).flatMap(f => {
  let held = [];
  try { held = npmPackages(p.read(f) ?? "", f); } catch { /* (the lookup and the licence check fail on it themselves) */ }
  return held.filter(offRegistry).map(q => `\`${shown(f)}\`: ${shown(q.name)}@${shown(q.version)}: ${offRegistry(q)}: take it from npm's registry at one exact version, by npm's own install in the lock file's folder with --save-exact and --ignore-scripts, so that npm writes its address and integrity value`);
});

// The audit's entries and the files the scan reads, as the licence check's scan takes them (licence-scan.mjs), or null
// where the config names no scan or audit.
function scanOf(p, config) {
  if (!config.scan || typeof config.audit !== "string") return null;
  const listed = jsonAt(p, config.audit)?.entries, entries = Array.isArray(listed) ? listed.filter(e => e && typeof e === "object") : [];
  const copy = copyAt(p), skip = strings(config.scan.skip);
  return { entries, files: p.files.filter(f => !f.startsWith(copy) && !skip.some(s => s === f || (s.endsWith("/") && f.startsWith(s)))) };
}

// A file the scan reads that downloads what may be a program, unpinned by version or checksum.
function pinAsks(p, config) {
  const read = scanOf(p, config);
  if (!read) return [];
  const { entries } = read;
  return read.files.filter(f => entries.some(e => covers(e, f))).flatMap(f => {
    const text = p.read(f);
    const fault = text !== null && pinRead(f, text, config.audit) ? pinFault(entries, config.audit, f, codeOf(f, text)) : null;
    return fault ? [`\`${shown(f)}\` downloads what may be a program, and ${shown(fault.what)}: ${fault.mend}`] : [];
  });
}

// What stood before the licence check's scan passed, as standing, what a pull request's base held (#1074): a file that
// fetches by a fetcher the scan cannot read, which no entry of its audit names in its "files". The scan reports it and
// passes where a pull request leaves it as it stood, and fails it where there is no base, as on a push to main.
export function fetchesHeld(p) {
  const config = jsonAt(p, licenceConfig(p)), read = config && scanOf(p, config);
  if (!read) return null;
  const held = read.files.filter(f => { const text = p.read(f); return text !== null && !text.includes("\0") && unauditedIn(config.scan, read.entries, config.audit, f, text).length; });
  return held.length ? `Each fetches by a fetcher the licence check's scan cannot read (pip, git, dotnet and the like), which no entry of \`${shown(config.audit)}\` audits: name each in the "files" of the entry of what it fetches, adding the entry, with its licence, where there is none, in a pull request of its own: ${held.slice(0, 20).map(f => `\`${shown(f)}\``).join(", ")}${held.length > 20 ? `, and ${held.length - 20} more, which the licence check prints` : ""}.` : null;
}
