// The staged project the licence check's tests run on (licence-scan-test.mjs and licence-fetch-test.mjs, beside this
// file): a small project, written into a fresh temporary git repository for each case, with the changes a case makes to
// it, and the check's failures on it (every name invented).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { check, loadConfig } from "./licences.mjs";

let failed = 0;
export const ok = (cond, what, more = "") => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) { failed++; if (more) console.log(more); } };
export const done = () => process.exit(failed ? 1 : 0);

export const PROJECT = {
  "licences.json": JSON.stringify({ ships: [], audit: "audit.json", scan: { served: ["site/"], tools: ["site/tools/"], skip: ["docs/"] } }),
  "audit.json": JSON.stringify({ entries: [
    { name: "actions/checkout", kind: "action", licence: "MIT" },
    { name: "mossgrip-cli", version: "1.2.3", licence: "MIT" },
    { name: "Mossface", kind: "font", licence: "OFL-1.1", ships: true, files: ["site/fonts/mossface.woff2"], notice: "Mossface, OFL 1.1." },
    { name: "Bark sounds", kind: "asset", licence: "CC0-1.0", ships: true, files: ["site/audio/"], notice: "Bark sounds, CC0 1.0." },
    { name: "The icons", kind: "own", licence: "LicenseRef-Owner", ships: true, files: ["site/icon.png"] },
    { name: "site/tools/lichen.js", licence: "GPL-3.0-only" },
  ] }),
  ".github/workflows/ci.yml": [
    "jobs:", "  a:", "    steps:", "      - uses: actions/checkout@v7", "      # - uses: mossgrip/setup-moss@v1, a comment",
    "  b:", "    uses: HaakTuah/agent-core/.github/workflows/copies.yml@0123456789abcdef0123456789abcdef01234567",
    "  c:", "    uses: ./.github/workflows/local.yml", "",
  ].join("\n"),
  "scripts/setup.sh": "npm install -g mossgrip-cli@1.2.3\nnpx --no-install vitest run\n# npm install mossgrip-widgets, a comment, fetches nothing\nnpm ci\n",
  "site/index.html": "<!doctype html><title>Bark</title>\n",
  "site/fonts/mossface.woff2": "",
  "site/audio/bark-1.m4a": "",
  "site/icon.png": "",
  "site/tools/lichen.js": "/*! lichen v1 | GPL-3.0 */\nexport const l = 1;\n",
  "docs/picture.png": "",
};

/** A fresh copy of the project, changed by `change(dir)`, and the check's failures on it (or the error it throws). */
export function run(change = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "licences-test-"));
  try {
    for (const [f, text] of Object.entries(PROJECT)) { fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); }
    change(dir);
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["add", "-A"], { cwd: dir });
    const { failures } = check(loadConfig(path.join(dir, "licences.json")), dir);
    return failures;
  } catch (e) {
    return [`threw: ${e.message}`];
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
export const write = (f, text) => (dir) => { fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); };
export const append = (f, text) => (dir) => fs.appendFileSync(path.join(dir, f), text);
export const json = (f, edit) => (dir) => { const p = path.join(dir, f), j = JSON.parse(fs.readFileSync(p, "utf8")); edit(j); fs.writeFileSync(p, JSON.stringify(j)); };
export const entry = (e) => json("audit.json", (j) => j.entries.push(e));
export const LOCK = (license) => (dir) => {
  write("package.json", JSON.stringify({ name: "bark", dependencies: { "mossgrip-lib": "1.0.0" } }))(dir);
  write("package-lock.json", JSON.stringify({ name: "bark", lockfileVersion: 3, packages: {
    "": { name: "bark", dependencies: { "mossgrip-lib": "1.0.0" } },
    "node_modules/mossgrip-lib": { version: "1.0.0", resolved: "https://registry.npmjs.org/mossgrip-lib/-/mossgrip-lib-1.0.0.tgz", license },
  } }))(dir);
  json("licences.json", (j) => { j.lockfiles = ["package-lock.json"]; })(dir);
};
export const handAudited = (f) => entry({ name: "Moss tools", licence: "MIT", files: [f] });
