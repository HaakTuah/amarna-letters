// The stand-in for npm's install, for the tests of the checks from plain git (check-test.mjs), so the same packages are
// written out once. A file of its own since the licence scan cannot read it and passes it over (.github/licences.json,
// "scan.skip"): it holds npm by name, to put a stand-in of that name first on the PATH, and runs the real npm with
// whatever arguments it is given, which its callers wrote and the scan reads where they stand (install.mjs); it fetches
// nothing of its own. Tests only: no project and no workflow of the core's uses it. Node's own modules only.
import fs from "node:fs";
import path from "node:path";

/** The stand-in for npm's install, for a test that runs the core's checks again and again on scratch projects
 *  (check-test.mjs), each job of each run in a fresh clone that installs the core's packages anew: an `npm` first on
 *  the PATH that runs the real npm's `ci`, with the arguments it was given, once for each package list, lock file and
 *  .npmrc, in a folder of its own under `tmp`, and gives each later folder that asks the same a link to that install as
 *  its node_modules/; a failure is the real npm's, and every other command is the real npm's own. The scripts' install
 *  (install.mjs) runs in full, its refusals before npm too; only the same packages are not written out again, which on
 *  Windows cost seconds a job. It gives the environment with the stand-in first on its PATH. `real` names the npm it
 *  runs, for check-test's probe of it; by default the first on the PATH. */
export function npmOnce(env, tmp, { real: given } = {}) {
  const windows = process.platform === "win32", name = windows ? "npm.cmd" : "npm";
  const PATHKEY = Object.keys(env).find(k => k.toUpperCase() === "PATH") ?? "PATH";
  const real = given ?? env[PATHKEY].split(path.delimiter).filter(d => path.isAbsolute(d)).map(d => path.join(d, name)).find(f => fs.existsSync(f));
  if (!real) throw new Error(`${name} is on no folder of the PATH`);
  const bin = path.join(tmp, "npm-once"), store = path.join(tmp, "npm-once-installs"), script = path.join(bin, "npm-once.cjs");
  fs.mkdirSync(bin);
  fs.writeFileSync(script, `const { spawnSync } = require("child_process"), crypto = require("crypto"), fs = require("fs"), path = require("path");
const args = process.argv.slice(2), real = cwd => spawnSync(${JSON.stringify(windows ? `"${real}"` : real)}, args, { cwd, stdio: "inherit", shell: ${windows} });
if (args[0] !== "ci") process.exit(real(process.cwd()).status ?? 1);
const files = ["package.json", "package-lock.json", ".npmrc"].filter(f => fs.existsSync(f));
const once = path.join(${JSON.stringify(store)}, crypto.createHash("sha256").update(JSON.stringify([args, ...files.map(f => [f, fs.readFileSync(f, "utf8")])])).digest("hex").slice(0, 16));
if (!fs.existsSync(path.join(once, "node_modules"))) {
  fs.mkdirSync(once, { recursive: true });
  for (const f of files) fs.copyFileSync(f, path.join(once, f));
  const r = real(once);
  if (r.status !== 0) { fs.rmSync(once, { recursive: true, force: true }); process.exit(r.status ?? 1); }
}
fs.rmSync("node_modules", { recursive: true, force: true });
fs.symlinkSync(path.join(once, "node_modules"), "node_modules", "junction");
`);
  if (windows) fs.writeFileSync(path.join(bin, "npm.cmd"), `@"${process.execPath}" "${script}" %*\r\n`);
  else fs.writeFileSync(path.join(bin, "npm"), `#!/bin/sh\nexec '${process.execPath}' '${script}' "$@"\n`, { mode: 0o755 });
  return { ...env, [PATHKEY]: `${bin}${path.delimiter}${env[PATHKEY]}` };
}
