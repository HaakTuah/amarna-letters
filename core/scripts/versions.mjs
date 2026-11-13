// The versions check ("The newest stable version, unless there is a reason" in modules/updates.md), for every project
// that takes the core and for the core itself: each version in the config is read from its file and compared with its
// registry's newest stable release old enough to take (floor rule 7). The config, a JSON file its versions workflow
// names, holds "entries", each with "name" (the package whose releases count), "registry" ("npm", the default, or
// "pypi"), "file" and "pattern" (a regular expression whose first group is the version, found exactly once), "days"
// (the wait: 7, or 14 for a script browsers load), "sameMajor" (true to stay within the major the project chose) and
// "how" (what a builder does to take it). Run monthly by the versions workflow (.github/workflows/versions.yml), which
// opens an enhancement issue for each one behind. Node's own modules, npm, and PyPI's JSON API for a "pypi" entry. It
// reads files of the project it is run in (its git root), the config's path from the directory it starts in.
//
//   node <core>/scripts/versions.mjs <config>            one line each: up to date, or behind
//   node <core>/scripts/versions.mjs <config> --issues   JSON: an issue's key, title and body for each one behind
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { started } from "./started.mjs";

const DAY = 864e5;
// A stable release: two or three plain numbers (PyPI's "2.0" too), each short enough to compare exactly.
const STABLE = /^(\d{1,9})\.(\d{1,9})(?:\.(\d{1,9}))?$/;
// A package's name as its registry spells it, and where a release of it is shown; the first, npm, is the default.
const REGISTRIES = {
  npm: { name: /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/, page: (n, v) => `https://www.npmjs.com/package/${n}/v/${v}` },
  pypi: { name: /^[A-Za-z0-9]([\w.-]*[A-Za-z0-9])?$/, page: (n, v) => `https://pypi.org/project/${n}/${v}/` },
};
// The one place an entry's registry is decided.
const registryOf = e => {
  const key = e.registry ?? Object.keys(REGISTRIES)[0];
  if (typeof key !== "string" || !Object.hasOwn(REGISTRIES, key)) throw new Error(`${e.name}: no registry ${key}`);
  return key;
};
const registry = e => REGISTRIES[registryOf(e)];

// Each entry with the version its file holds now: exactly one, or it throws (a pattern that no longer finds it, an
// entry without its wait or its "how", or a file outside the project).
export function current(entries, root) {
  return entries.map(e => {
    if (!registry(e).name.test(e.name ?? "")) throw new Error(`${e.name}: not a name its registry takes`);
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
const parts = v => v.match(STABLE).slice(1).map(x => Number(x ?? 0));
export const later = (a, b) => { const x = parts(a), y = parts(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };
export function newest(times, { days, sameMajor, version }, now) {
  const ok = Object.keys(times).filter(v => STABLE.test(v) && now - Date.parse(times[v]) >= days * DAY
    && (!sameMajor || parts(v)[0] === parts(version)[0]));
  return ok.sort(later).pop() || null;
}

// PyPI's release times from its JSON API, as npm gives them ({ version: ISO date }): each release's first upload, a
// release with no files, or only withdrawn ("yanked") ones, left out. An answer that lists or dates no release fails,
// so a change to PyPI's answer is never read as "up to date".
export function pypiTimes(json) {
  const releases = json?.releases;
  if (!releases || typeof releases !== "object" || !Object.keys(releases).length) throw new Error("PyPI's answer lists no releases");
  const out = {};
  for (const [v, files] of Object.entries(releases)) {
    const up = (Array.isArray(files) ? files : []).filter(f => !f?.yanked).map(f => f?.upload_time_iso_8601)
      .filter(u => typeof u === "string").sort();
    if (up.length) out[v] = up[0];
  }
  if (!Object.keys(out).length) throw new Error("PyPI's answer dates no release");
  return out;
}
async function times(e) {
  if (registryOf(e) === "pypi") {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(e.name)}/json`);
    if (!res.ok) throw new Error(`${e.name}: PyPI answered ${res.status}`);
    return pypiTimes(await res.json());
  }
  return JSON.parse(execFileSync("npm", ["view", e.name, "time", "--json"], { encoding: "utf8" }));
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
    "", "**Additional context**", `Newest stable release: ${registry(e).page(e.name, to)}`,
    "", "---", "_Opened by the monthly version check (the core's `.github/workflows/versions.yml`)._",
  ].join("\n"),
});

if (started(import.meta.url)) {
  const config = process.argv[2];
  if (!config) { console.error("FAIL: name the config: node <core>/scripts/versions.mjs <config> [--issues]"); process.exit(1); }
  const { entries } = JSON.parse(fs.readFileSync(config, "utf8"));
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const now = Date.now(), behind = [];
  for (const e of current(entries, root)) {
    const to = newest(await times(e), e, now);
    if (to && later(to, e.version) > 0) behind.push(issue(e, to, config));
    if (!process.argv.includes("--issues")) console.log(`${e.name}: ${e.version} in ${e.file}; newest at least ${e.days} days old: ${to}${to && later(to, e.version) > 0 ? " (behind)" : ""}`);
  }
  if (process.argv.includes("--issues")) console.log(JSON.stringify(behind));
}
