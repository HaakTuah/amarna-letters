// Tests of the check that reads each package's licence and version back from the package itself
// (licence-installed.mjs): on a made-up lock file and the folders an install from it would fill. Run by the core's
// tests workflow (.github/workflows/tests.yml). Node's own modules only.
//
//   node scripts/licence-installed-test.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check, leftOut, lockForm, plainVersion } from "./licence-installed.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "licence-installed-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
let n = 0;
// A project: `locked` is the lock file's packages by path; `installed`, each package's own package.json by path (a
// path left out is a package no install brought; a string is written as it stands).
const project = (locked, installed, lockName = "package-lock.json", workspaces) => {
  const dir = path.join(tmp, `p${++n}`);
  fs.mkdirSync(dir);
  if (workspaces) fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "bark", workspaces }));
  fs.writeFileSync(path.join(dir, lockName), JSON.stringify({ name: "bark", lockfileVersion: 3, packages: { "": { name: "bark" }, ...locked } }));
  for (const [at, own] of Object.entries(installed)) { fs.mkdirSync(path.join(dir, at), { recursive: true }); fs.writeFileSync(path.join(dir, at, "package.json"), typeof own === "string" ? own : JSON.stringify(own)); }
  return dir;
};
const LINUX = { os: "linux", cpu: "x64", libc: "glibc" }; // (the system every test here installs on, whatever runs it)
const said = (dir) => { try { const r = check(dir, LINUX); return [...r.failures, r.summary].join("\n"); } catch (e) { return `threw: ${e.message}`; } };
const A = "node_modules/mossgrip-lib", B = "node_modules/@moss/grip", C = "node_modules/bark-x/node_modules/mossgrip-lib";
const one = (lock, own) => said(project({ [A]: { version: "1.0.0", ...lock } }, own === undefined ? {} : { [A]: own }));

ok(lockForm("MIT") === "MIT" && lockForm({ type: "MIT", url: "x" }) === "MIT" && lockForm(undefined) === null && lockForm("") === null && lockForm({}) === null && lockForm([]) === null
  && JSON.stringify(lockForm(["MIT", "ISC"])) === '["MIT","ISC"]' && JSON.stringify(lockForm({ url: "x" })) === '{"url":"x"}', "a licence is read as npm writes one into a lock file: the type of one written as an object, nothing for an empty one, else as it stands");
const good = said(project(
  { [A]: { version: "1.0.0", license: "MIT" }, [B]: { version: "2.1.0", license: "Apache-2.0" }, [C]: { version: "0.9.0" }, "node_modules/bark-x": { version: "3.0.0", license: "ISC" },
    "packages/own": { name: "own", version: "0.0.1", license: "LicenseRef-Owner" }, "node_modules/own": { resolved: "packages/own", link: true },
    "node_modules/@moss/grip-win32": { version: "2.1.0", license: "Apache-2.0", optional: true, os: ["win32"] } },
  { [A]: { name: "mossgrip-lib", version: "1.0.0", license: "MIT" }, [B]: { version: "2.1.0", license: { type: "Apache-2.0", url: "x" } }, [C]: { version: "0.9.0" }, "node_modules/bark-x": { version: "3.0.0", license: "ISC" } },
  "package-lock.json", ["packages/own"]));
ok(/^4 packages of package-lock\.json read back from the packages themselves, their licence and their version; 1 of another system, not installed here, not read; 0 failing/.test(good),
  "a lock file whose every entry says what its package says passes: a scope, a package inside another's folder, one with no licence on either side, the old object form; the project's own packages and a link to one are not its to read, and an optional package of another system is counted as not read", good);
ok(/^"node_modules\/mossgrip-lib": package-lock\.json says its licence is "MIT", and its own package\.json says "GPL-3\.0-only"/.test(one({ license: "MIT" }, { version: "1.0.0", license: "GPL-3.0-only" })), "a licence written into the lock file that the package does not say fails, by name, with both");
ok(/says its licence is "MIT", and its own package\.json says none/.test(one({ license: "MIT" }, { version: "1.0.0" })) && /says its licence is none, and its own package\.json says "BUSL-1\.1"/.test(one({}, { version: "1.0.0", license: "BUSL-1.1" }))
  && /says its licence is "MIT", and its own package\.json says \{"type":"SSPL-1\.0"\}/.test(one({ license: "MIT" }, { version: "1.0.0", license: { type: "SSPL-1.0" } })), "so does one the lock file adds, one it leaves out, and one the package writes the old way");
ok(/says its version is "1\.0\.0", and its own package\.json says "2\.0\.0"/.test(one({ license: "MIT" }, { version: "2.0.0", license: "MIT" })), "a version the lock file claims and the package does not say fails");
const lacks = /not installed, and no optional package of another system or of one alone/, unread = (n) => new RegExp(`; ${n} of another system, not installed here, not read; 0 failing`);
ok(lacks.test(one({ license: "MIT" })) && lacks.test(one({ license: "MIT", os: ["win32"] })) && lacks.test(one({ license: "MIT", optional: true })) && lacks.test(one({ license: "MIT", optional: true, os: ["linux"], cpu: ["x64"], libc: ["glibc"] }))
  && lacks.test(one({ license: "MIT", optional: true, engines: { node: "<1" } })), "a package that is not installed fails: to name another system is not enough, nor to be marked optional, nor to be optional for this very system, nor to name a Node version the machine does not run");
ok([{ os: ["win32"] }, { os: ["darwin", "win32"] }, { os: ["!linux"] }, { cpu: ["arm64"] }, { libc: ["musl"] }, { os: "win32" }, { os: ["linux"], cpu: ["!x64"] }].every(more => unread(1).test(one({ license: "MIT", optional: true, ...more })))
  && unread(1).test(one({ license: "MIT", devOptional: true, cpu: ["arm64"], engines: { node: ">=18" } })) && leftOut({ [A]: { optional: true, libc: ["glibc"] } }, { os: "darwin", cpu: "arm64", libc: null }).has(A),
  "an optional package that names systems which leave this one out is one an install leaves out, and is counted as not read: by its system, its processor or its C library, in any form npm reads");
const sub = "node_modules/moss-win32", child = "node_modules/moss-win32/node_modules/moss-part", shared = "node_modules/moss-util";
const tree = (root, more = {}) => said(project({ "": { name: "bark", ...root }, [sub]: { version: "1.0.0", optional: true, os: ["win32"], dependencies: { "moss-part": "1.0.0", "moss-util": "1.0.0" } },
  [child]: { version: "1.0.0", license: "MIT", optional: true }, [shared]: { version: "1.0.0", license: "MIT", optional: true, ...more } }, {}));
ok(unread(3).test(tree({ optionalDependencies: { "moss-win32": "1.0.0" } })) && /moss-util": not installed/.test(tree({ optionalDependencies: { "moss-win32": "1.0.0" }, dependencies: { "moss-util": "1.0.0" } }))
  && /moss-util": not installed/.test(tree({ optionalDependencies: { "moss-win32": "1.0.0" } }, { optional: false })), "an optional package that only packages of another system ask for is left out with them; one the project itself also asks for, or one not marked optional, is not");
ok(unread(3).test(tree({ optionalDependencies: { "moss-win32": "1.0.0" }, peerDependencies: { "moss-util": "1.0.0" }, peerDependenciesMeta: { "moss-util": { optional: true } } }))
  && /moss-util": not installed/.test(tree({ optionalDependencies: { "moss-win32": "1.0.0" }, peerDependencies: { "moss-util": "1.0.0" } }))
  && /moss-util": not installed/.test(tree({ optionalDependencies: { "moss-win32": "1.0.0" }, peerDependencies: { "moss-util": "1.0.0" }, peerDependenciesMeta: { "moss-util": { optional: "yes" } } })),
  "a peer the project marks optional asks for nothing, since npm never installs one for it; a peer it does not mark so, or marks so in no form npm reads, asks for its package");
ok(plainVersion("v1.0.0") === "1.0.0" && plainVersion(" =1.0.0 ") === "1.0.0" && plainVersion("1.0.0-v2") === "1.0.0-v2" && plainVersion(undefined) === undefined
  && / 0 failing/.test(one({ license: "MIT" }, { version: "v1.0.0", license: "MIT" })) && / 0 failing/.test(one({ license: "MIT" }, "\ufeff" + JSON.stringify({ version: "1.0.0", license: "MIT" }))),
  "a version spelt with a v or an equals sign in the package is the version npm wrote, and a package.json that starts with a byte-order mark is read as npm reads it");
ok(/its package\.json cannot be read as JSON/.test(one({ license: "MIT" }, "{ not json")) && /its package\.json cannot be read as JSON/.test(one({ license: "MIT" }, "[]")), "a package whose own package.json cannot be read fails");
const oddly = (key, entry = { version: "1.0.0", license: "MIT" }) => said(project({ [key]: entry }, { [A]: { version: "1.0.0", license: "GPL-3.0-only" } }));
ok(["node_modules//mossgrip-lib", "node_modules///mossgrip-lib", "node_modules/./mossgrip-lib", "node_modules/x/../mossgrip-lib", "node_modules/../../elsewhere", "/abs/node_modules/x", "node_modules/mossgrip-lib/", "node_modules\\mossgrip-lib", "packages//own"]
  .every(key => /an entry at ".*" that is not written as npm writes one/.test(oddly(key)) && !/ 0 failing/.test(oddly(key))) && /an entry at "node_modules\/mossgrip-lib" that is not written as npm writes one/.test(oddly(A, "MIT")) && /not written as npm writes one/.test(oddly(A, [])),
  "an entry whose path is not written as npm writes one fails before anything is left out, whatever folder an install would read it as; so does one that is no entry");
const shrink = project({ [A]: { version: "1.0.0", license: "MIT" } }, { [A]: { version: "1.0.0", license: "ISC" } }, "npm-shrinkwrap.json");
ok(/npm-shrinkwrap\.json says its licence is "MIT"/.test(said(shrink)), "a shrinkwrap file alone is the lock file read");
fs.writeFileSync(path.join(shrink, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { [A]: { version: "1.0.0", license: "ISC" } } }));
ok(/threw: both npm-shrinkwrap\.json and package-lock\.json stand in the folder: keep one/.test(said(shrink)), "where both lock files stand, an install reads one and the licence check may read the other: it stops");
const none = path.join(tmp, "none"); fs.mkdirSync(none);
const old = project({}, {}); fs.writeFileSync(path.join(old, "package-lock.json"), JSON.stringify({ lockfileVersion: 1, dependencies: {} }));
const broken = project({}, {}); fs.writeFileSync(path.join(broken, "package-lock.json"), "{");
ok(/threw: no npm-shrinkwrap\.json or package-lock\.json/.test(said(none)) && /threw: package-lock\.json has no "packages"/.test(said(old)) && /threw: cannot read package-lock\.json as JSON/.test(said(broken)), "no lock file, one of the old form, or one that is no JSON stops the check");
const long = one({ license: "MIT" }, { version: "1.0.0", license: `MIT\n::error::${"x".repeat(500)}` });
const key = said(project({ "node_modules/x\n::error title=Licences::all read\n": { version: "1.0.0" } }, {}));
ok(long.split("\n").length === 2 && long.split("\n")[0].length < 500 && key.split("\n").length === 2 && !/^::error/m.test(key), "what a lock file or a package says is shown on one line, and no longer than a line: a path too, which could else start a line of its own in a log", `${long.slice(0, 300)}\n${key}`);

// a link to a folder that is no workspace (a dependency written "file:"): the install puts the folder in place as it
// stands, and its own package.json is what the lock file's entry for it is held to
const linked = (licence, more = {}) => said(project({ "node_modules/vend": { resolved: "vendor/vend", link: true }, "vendor/vend": { version: "1.0.0", license: "MIT" }, ...more }, { "vendor/vend": { version: "1.0.0", license: licence } }));
ok(/"node_modules\/vend": package-lock\.json says its licence is "MIT", and its own package\.json says "GPL-3\.0-only"/.test(linked("GPL-3.0-only")) && /^1 packages of package-lock\.json read back.*; 0 failing/.test(linked("MIT"))
  && /"node_modules\/vend": a link to a folder package-lock\.json holds no entry for/.test(said(project({ "node_modules/vend": { resolved: "vendor/gone", link: true } }, {})))
  && /a link to a folder package-lock\.json holds no entry for/.test(said(project({ "node_modules/vend": { resolved: "../outside", link: true } }, {}))),
  "a link to a folder that is no workspace is read back from that folder's own package.json; one to a folder the lock file does not hold fails");
// what the install put in place and the lock file does not name: a package bundled in another's, its entries taken out
const bundled = (more) => { const dir = project({ [A]: { version: "1.0.0", license: "MIT" }, "packages/own": { version: "0.0.1" } }, { [A]: { version: "1.0.0", license: "MIT" }, ...more }, "package-lock.json", ["packages/own"]); return said(dir); };
ok(/"node_modules\/mossgrip-lib\/node_modules\/abbrev": installed, and package-lock\.json holds no entry for it/.test(bundled({ [`${A}/node_modules/abbrev`]: { version: "1.0.0", license: "GPL-3.0-only" } }))
  && /"node_modules\/@moss\/hidden": installed, and package-lock\.json holds no entry for it/.test(bundled({ "node_modules/@moss/hidden": { version: "1.0.0" } }))
  && /"packages\/own\/node_modules\/x": installed, and package-lock\.json holds no entry for it/.test(bundled({ "packages/own/node_modules/x": { version: "1.0.0" } }))
  && / 0 failing/.test(bundled({ "node_modules/.bin/tool": {}, "node_modules/.cache/x": {} })),
  "a package the install put in place that the lock file does not name fails, however deep, scoped or in a workspace's own folder; the install's own hidden folders are no packages");
// (a long chain of optional entries, each asking for the next two, under one of another system: decided in time)
const chain = { "": { name: "bark", optionalDependencies: { "moss-win32": "1.0.0" } }, "node_modules/moss-win32": { version: "1.0.0", optional: true, os: ["win32"], dependencies: { c0: "1.0.0", c1: "1.0.0" } } };
for (let i = 0; i < 400; i++) chain[`node_modules/c${i}`] = { version: "1.0.0", optional: true, dependencies: { [`c${i + 1}`]: "1.0.0", [`c${i + 2}`]: "1.0.0" } };
const leafFirst = Object.fromEntries(Object.entries(chain).reverse()), start = Date.now(), chained = leftOut(leafFirst, LINUX);
ok(chained.size === 401 && Date.now() - start < 2000, "a long chain of optional entries under one of another system is all left out, decided in time", `${chained.size} in ${Date.now() - start} ms`);
chain[""].dependencies = { c200: "1.0.0" };
ok(leftOut(chain, LINUX).has("node_modules/c199") && !leftOut(chain, LINUX).has("node_modules/c200") && !leftOut(chain, LINUX).has("node_modules/c201"), "and what the project itself asks for is not, nor what that asks for in turn");

const script = fileURLToPath(new URL("./licence-installed.mjs", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8", cwd: tmp });
const fine = project({ [A]: { version: "1.0.0", license: "MIT" } }, { [A]: { version: "1.0.0", license: "MIT" } }), forged = project({ [A]: { version: "1.0.0", license: "MIT" } }, { [A]: { version: "1.0.0", license: "GPL-3.0-only" } });
ok(run(fine).status === 0 && /^1 packages of package-lock\.json read back/.test(run(fine).stdout) && run(forged).status === 1 && /^FAIL: "node_modules\/mossgrip-lib": /.test(run(forged).stderr) && run(none).status === 1 && run().status === 1,
  "as a program: it passes and says what it read, fails with each failure on a line, and fails where there is no lock file, the folder named or the current one");

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the licences read back from the packages`);
process.exitCode = failed ? 1 : 0;
