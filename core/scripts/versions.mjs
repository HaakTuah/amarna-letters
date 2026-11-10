// The versions check ("The newest stable version, unless there is a reason" in modules/updates.md), for every project
// that takes the core and for the core itself: each version in the config is read from its file and compared with the
// npm registry's newest stable release old enough to take (floor rule 7). The config, a JSON file its versions workflow
// names, holds "entries", each with "name" (the npm package whose releases count), "file" and "pattern" (a regular
// expression whose first group is the version, found exactly once), "days" (the wait: 7, or 14 for a script browsers
// load), "sameMajor" (true to stay within the major the project chose) and "how" (what a builder does to take it). Run
// monthly by the versions workflow (.github/workflows/versions.yml), which opens an enhancement issue for each one
// behind. Node's own modules and npm. It reads files of the project it is run in (its git root), the config's path from
// the directory it starts in.
//
//   node <core>/scripts/versions.mjs <config>            one line each: up to date, or behind
//   node <core>/scripts/versions.mjs <config> --issues   JSON: an issue's key, title and body for each one behind
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DAY = 864e5;
const STABLE = /^(\d+)\.(\d+)\.(\d+)$/;

// Each entry with the version its file holds now: exactly one, or it throws (a pattern that no longer finds it, an
// entry without its wait or its "how", or a file outside the project).
export function current(entries, root) {
  return entries.map(e => {
    if (!/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/.test(e.name ?? "")) throw new Error(`${e.name}: no npm package name`);
    if (!Number.isInteger(e.days) || e.days < 7 || typeof e.how !== "string" || !e.how.trim()) throw new Error(`${e.name}: needs "days" (7 or more, floor rule 7) and "how"`);
    const file = fs.realpathSync(path.join(root, e.file)), rel = path.relative(fs.realpathSync(root), file);
    if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error(`${e.name}: ${e.file} is outside the project`);
    const found = new Set([...fs.readFileSync(file, "utf8").matchAll(new RegExp(e.pattern, "g"))].map(m => m[1]));
    if (found.size !== 1) throw new Error(`${e.name}: ${e.file} holds ${found.size ? [...found].join(", ") : "no version"} by ${e.pattern}, not one`);
    return { ...e, version: [...found][0] };
  });
}

// The newest stable release published at least `days` before `now` (and of the same major, if asked), from the
// registry's release times ({ version: ISO date }); null if none.
const parts = v => v.match(STABLE).slice(1).map(Number);
export const later = (a, b) => { const x = parts(a), y = parts(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };
export function newest(times, { days, sameMajor, version }, now) {
  const ok = Object.keys(times).filter(v => STABLE.test(v) && now - Date.parse(times[v]) >= days * DAY
    && (!sameMajor || parts(v)[0] === parts(version)[0]));
  return ok.sort(later).pop() || null;
}

// What an issue says for an entry behind: the Feature request template's headings (.github/ISSUE_TEMPLATE/).
export const issue = (e, to, config) => ({
  key: `Version check: ${e.name} `,
  title: `Version check: ${e.name} ${e.version} is behind ${to}`,
  body: [
    "**Is your feature request related to a problem? Please describe.**",
    `${e.name} is pinned at ${e.version} in \`${e.file}\`, and ${to} has been out for at least ${e.days} days. Dependabot cannot see it, so the monthly version check (\`${config}\`) opened this.`,
    "", "**Describe the solution you'd like**", e.how,
    "", "**Describe alternatives you've considered**", "Staying on the pinned version, if the release notes show nothing worth the change.",
    "", "**Why it matters, and a rough cost**", "Fixes and security updates arrive; a small PR, with floor rule 7's checks and the licence audited again (floor rule 10).",
    "", "**Additional context**", `Newest stable release: https://www.npmjs.com/package/${e.name}/v/${to}`,
    "", "---", "_Opened by the monthly version check (the core's `.github/workflows/versions.yml`)._",
  ].join("\n"),
});

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  const config = process.argv[2];
  if (!config) { console.error("FAIL: name the config: node <core>/scripts/versions.mjs <config> [--issues]"); process.exit(1); }
  const { entries } = JSON.parse(fs.readFileSync(config, "utf8"));
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const now = Date.now(), behind = [];
  for (const e of current(entries, root)) {
    const times = JSON.parse(execFileSync("npm", ["view", e.name, "time", "--json"], { encoding: "utf8" }));
    const to = newest(times, e, now);
    if (to && later(to, e.version) > 0) behind.push(issue(e, to, config));
    if (!process.argv.includes("--issues")) console.log(`${e.name}: ${e.version} in ${e.file}; newest at least ${e.days} days old: ${to}${to && later(to, e.version) > 0 ? " (behind)" : ""}`);
  }
  if (process.argv.includes("--issues")) console.log(JSON.stringify(behind));
}
