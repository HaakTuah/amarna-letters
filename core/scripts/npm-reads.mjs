// Which of npm's settings that keep an install to the registry, and to a release a week old, the npm at hand reads
// (#704): each from its first version, as npm's own docs/content/using-npm/config.md of each version lists it; an older
// npm, npm 10 that Node 22 brings among them, ignores each without a word. checks.mjs's signature check installs only
// under an npm that reads those it gives, and install.mjs notes one that does not. Node's own modules only.
//
//   import { npmIgnores, npmReadsAll, npmVersion } from "./npm-reads.mjs";
import { spawnSync } from "node:child_process";

// The npm settings that keep an install to the registry, and to a release a week old, each with the first npm that reads
// it, as npm's own docs/content/using-npm/config.md of each version lists it: an older npm, npm 10 that Node 22 brings
// among them, ignores each without a word (#704). --allow-remote is counted from 11.15.0: npm 11.14 lists it, but under
// --allow-remote=none it refuses the registry's own packages too, so an install from a lock file fails there (#1262).
export const NPM_READS = { "allow-git": "11.9.0", "allow-remote": "11.15.0", "allow-file": "11.14.0", "allow-directory": "11.14.0", "min-release-age": "11.10.0" };
// Whether npm's version `a` ("10.9.9") comes before `b`: by its three numbers, then a pre-release ("11.14.0-pre.0")
// before its release, as npm orders them; one that names no version comes before every other.
const parts = v => /^(\d+)\.(\d+)\.(\d+)(-)?/u.exec(v ?? "")?.slice(1).map((p, i) => (i < 3 ? Number(p) : p ? 0 : 1)) ?? null;
function before(a, b) {
  const [x, y] = [parts(a), parts(b)];
  if (!x || !y) return !x && !!y;
  for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return false;
}
// The first npm that reads every one of the settings named.
export const npmReadsAll = (settings = Object.keys(NPM_READS)) => settings.map(s => NPM_READS[s]).reduce((a, b) => (before(a, b) ? b : a));
// Of the settings named, those the npm at `version` does not read: every one where no version is given.
export const npmIgnores = (version, settings = Object.keys(NPM_READS)) => settings.filter(s => before(version, NPM_READS[s]));
// What checks.mjs's signature check says where the npm at `version` ignores the settings named (`ignored`), which npm
// reads from `least` on, and so installs nothing (#704); and, of a step's output, the npm such a refusal asks, or null
// where it holds none, another line that says a failure or an error beside it, or an npm whose version was not read
// (which may be the change's), so check.mjs writes the job unrun on that machine, never failed (#1262). One wording, both read.
export const npmRefusal = (version, ignored, least) => `npm ${version || "here, whose version could not be read,"} reads none of ${ignored.map(s => `--${s}`).join(", ")}, which npm reads from ${least} on, so its install would fetch any git, web or file source the lock file names, and nothing was installed.`;
export function npmRefused(out) {
  // (any line that says a failure or an error, save checks.mjs's own count of one check failed)
  const failing = String(out ?? "").split("\n").filter(l => /fail|error/iu.test(l) && !/^1 of \d+ checks failed, each saying its mend above: [^\r]*$/u.test(l));
  return failing.length === 1 ? /^FAIL npm \d\S* reads none of --[\w-]+(?:, --[\w-]+)*, which npm reads from (\d+\.\d+\.\d+) on, so its install would fetch any git, web or file source the lock file names, and nothing was installed\.(?: |$)/u.exec(failing[0])?.[1] ?? null : null;
}
// The version of the npm the PATH finds, run in `cwd` (on Windows through its shell, by the path the system names, where
// npm is a .cmd file, and looked for on the PATH alone, never in `cwd`), or "" where it cannot be read.
export function npmVersion(cwd) {
  const opts = { cwd, encoding: "utf8", env: { ...process.env, NoDefaultCurrentDirectoryInExePath: "1" } };
  const r = process.platform === "win32" ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm --version"], opts)
    : spawnSync("npm", ["--version"], opts);
  return /^\d+\.\d+\.\d+(?:-[\w.-]+)?/u.exec((r.stdout ?? "").trim())?.[0] ?? "";
}
