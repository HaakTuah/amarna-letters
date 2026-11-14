// Checks the licence check's lists and readers (licences.mjs, beside this file), alone, on invented names: how a licence
// expression is read, which list allows what, a package known by its registry address, npm's settings. The check on a
// whole project, and its scan, are checked by licence-scan-test.mjs. Run by the core's tests workflow
// (.github/workflows/tests.yml).
//
//   node scripts/licences-test.mjs
import { readable } from "./licence-yes.mjs";
import { actionLists, check, licenceOk, movedOff, policy, registryName, registryOverrides, registryVersion, scriptsOff } from "./licences.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let failed = 0;
const ok = (cond, what, more = "") => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) { failed++; if (more) console.log(more); } };

const lists = policy({ data: ["mossgrip-data"], fonts: ["mossgrip-face"] });
const code = lists.allowedFor("mossgrip-lib"), data = lists.allowedFor("mossgrip-data"), font = lists.allowedFor("mossgrip-face");
const tool = lists.allowedFor("mossgrip-cli", false);
const all = (exprs, allow, want) => exprs.every((x) => licenceOk(x, allow) === want);
ok(all(["MIT AND (BSD-2-Clause OR Apache-2.0)", "(MIT OR CC0-1.0)", "MIT OR GPL-3.0-only"], code, true)
  && all(["(MIT OR GPL-3.0-only) AND (GPL-3.0-only)", "GPL-3.0-only"], code, false), "reads AND and OR with their brackets");
ok(all([undefined, "", "MIT AND", "(MIT", "MIT OR (", "Apache-2.0 WITH LLVM-exception", "MIT AND GPL-3.0-only OR MIT"], code, false), "refuses no licence, an exception, a broken expression, and AND and OR mixed without brackets");
ok(all(["CC-BY-4.0", "OFL-1.1"], code, false) && all(["CC-BY-4.0", "PDDL-1.0"], data, true) && !licenceOk("OFL-1.1", data)
  && licenceOk("OFL-1.1", font) && !licenceOk("CC-BY-4.0", font) && licenceOk("Public Domain", code), "CC-BY only for named data, OFL only for named fonts, the public domain for any");
ok(all(["MIT\n", "\tMIT", " MIT OR ISC\r\n"], code, true) && all(["MIT\tOR ISC", "MIT\u00a0OR ISC", "MIT WITH", "\t"], code, false), "blanks at an expression's ends are read past, as they always were; one within it but a space is refused");
ok(all(["GPL-3.0-only", "LGPL-2.1-or-later", "MPL-2.0", "EUPL-1.2", "OSL-3.0", "CECILL-2.1", "MS-RL", "BSL-1.0", "Artistic-1.0-Perl", "PSF-2.0"], tool, true)
  && all(["GPL-3.0-only", "LGPL-2.1-or-later", "MPL-2.0", "EUPL-1.2", "OSL-3.0", "CECILL-2.1", "MS-RL"], code, false), "tools may use every licence the Open Source Initiative approves, what ships none of its copyleft ones");
ok(all(["BUSL-1.1", "SSPL-1.0", "Elastic-2.0", "CC-BY-NC-4.0", "CC-BY-ND-4.0", undefined], tool, false), "nor any terms floor rule 10 never allows");
ok(registryName("https://registry.npmjs.org/mossgrip-data/-/mossgrip-data-1.0.0.tgz") === "mossgrip-data" && registryName("https://registry.npmjs.org/@moss/grip/-/grip-1.0.0.tgz") === "@moss/grip"
  && [undefined, "file:vendor/mossgrip-data.tgz", "vendor/mossgrip-data", "git+https://mossgrip.example/data.git", "https://mossgrip.example/mossgrip-data/-/mossgrip-data-1.0.0.tgz"].every((r) => registryName(r) === undefined),
  "names a package by its registry address, never by a name the lockfile could be given");
ok(registryVersion("https://registry.npmjs.org/mossgrip-data/-/mossgrip-data-1.0.0.tgz") === "1.0.0" && registryVersion("https://registry.npmjs.org/@moss/grip/-/grip-2.0.0-beta.1.tgz") === "2.0.0-beta.1"
  && registryVersion("https://registry.npmjs.org/mossgrip-data/-/lichen-1.0.0.tgz") === undefined && registryVersion("file:vendor/mossgrip-data-1.0.0.tgz") === undefined && registryVersion(undefined) === undefined,
  "and its version by the same address");
ok(["BUSL-1.1", "SSPL-1.0", "Elastic-2.0", "CC-BY-NC-4.0", "CC-BY-ND-4.0", "PolyForm-Noncommercial-1.0.0", "PolyForm-Small-Business-1.0.0", "FSL-1.1-MIT", "MIT + Commons Clause", "LicenseRef-NonCommercial",
  "LicenseRef-Business-Source", "LicenseRef-NoDerivatives", "LicenseRef-Source-Available", "Server Side Public License", '{"type":"BUSL-1.1"}', "non_commercial use only", "BSL-1.1", "BSL 1.1", "BSL", "MIT AND BSL-1.1"].every((l) => lists.never.test(l))
  && ["MIT", "NCSA", "LicenseRef-Vendor-EULA", "LGPL-3.0-only", "UNLICENSED", "CNRI-Python", "Unicode-DFS-2016", "BSL-1.0", "BSL 1.0", "PostgreSQL", "MS-PL", "Apache-2.0 WITH LLVM-exception"].every((l) => !lists.never.test(l)),
  "knows the terms no list and no yes takes in by their ids and by the words they go by, and no allowed licence among them");
const ids = new Set(lists.tools);
ok(["MIT", "(MIT OR GPL-2.0-only)", "GPL-2.0-only WITH Classpath-exception-2.0", "LicenseRef-A AND (MIT OR LGPL-3.0-only)", "LicenseRef-Vendor-EULA"].every((l) => readable(l, ids))
  && ["", "AND", "()", "MIT AND", "(MIT", "MIT)", "MIT OR OR MIT", "MIT WITH", "MIT WITH AND", "WITH x", "MIT MIT", "Some-Words", "LicenseRef-", "LicenseRef-.", "LicenseRef--", "MIT WITH -x", `${"(".repeat(60)}MIT${")".repeat(60)}`, `${"(".repeat(200000)}MIT`, undefined, 7].every((l) => !readable(l, ids)),
  "reads a yes's licence as one whole expression of ids it knows and names the owner gave, and nothing else");
const lines = actionLists({ ships: [], data: ["mossgrip-data"], accepted: [{ package: "mossgrip-lib@1.0.0", licence: "LGPL-3.0-only", ships: true, yes: "y", notice: "n" }, { package: "@moss/bought@2.1.0", licence: "LicenseRef-Vendor-EULA", ships: false, yes: "y" }, { entry: "Bark pack", licence: "LicenseRef-Vendor-EULA", ships: true, yes: "y" }] });
ok(lines.length === 2 && lines[0].startsWith("allow-licenses=0BSD,") && lines[1] === "allow-dependencies-licenses=pkg:npm/mossgrip-data,pkg:npm/@moss/bought",
  "the dependency review is told to let through, of what the owner accepted, only a package under a licence it would refuse", lines[1]);
const npmrc = ["registry=https://mossgrip.example/", "replace-registry-host=always", "@x:registry = https://mossgrip.example/", '"registry"=https://mossgrip.example/', '"replace-registry-host"=always', "${KEY}=https://mossgrip.example/"];
ok(JSON.stringify(registryOverrides(npmrc.join("\n"))) === JSON.stringify(npmrc) && registryOverrides("fund=false\naudit=false\n# registry=x\n; registry=x\n").length === 0
  && JSON.stringify(registryOverrides("ignore-scripts=true\nregistry=https://mossgrip.example/\n")) === JSON.stringify(["registry=https://mossgrip.example/"])
  && JSON.stringify(registryOverrides("ignore-scripts=false\nIGNORE-SCRIPTS=true\nignore-scripts=\n")) === JSON.stringify(["ignore-scripts=false", "IGNORE-SCRIPTS=true", "ignore-scripts="]),
  "refuses every npm setting but a few harmless ones, however its key is spelt");
ok(scriptsOff("# no install scripts\nignore-scripts=true\n") && !scriptsOff("ignore-scripts=false\n"), "knows when install scripts are off");

// a licence the floor moved off the list for what ships (MS-PL, 13 November 2026): held at the base, reported and passing;
// added or updated, failing, that pull request alone
const ships = policy().allowedFor("x", true);
ok(!ships.has("MS-PL") && policy().allowedFor("x", false).has("MS-PL") && movedOff("MS-PL", ships) && !movedOff("MIT OR MS-PL", ships) && !movedOff("GPL-3.0-only", ships), "MS-PL is off the list for what ships and on the tools', and only it is a licence moved off");
{
  const dir = mkdtempSync(join(tmpdir(), "licences-test-moved-"));
  const gitEnv = { ...process.env, GIT_CONFIG_GLOBAL: join(dir, "none"), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid" };
  const git = (...args) => execFileSync("git", args, { cwd: dir, env: gitEnv, stdio: ["ignore", "pipe", "pipe"] });
  const lock = (deps) => JSON.stringify({ lockfileVersion: 3, packages: { "": { name: "p", dependencies: Object.fromEntries(deps.map(([n, v]) => [n, v])) }, ...Object.fromEntries(deps.map(([n, v, l]) => [`node_modules/${n}`, { version: v, license: l, resolved: `https://registry.npmjs.org/${n}/-/${n}-${v}.tgz` }])) } });
  const commit = (deps) => { writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "p", dependencies: Object.fromEntries(deps.map(([n, v]) => [n, v])) })); writeFileSync(join(dir, "package-lock.json"), lock(deps)); git("add", "-A"); git("commit", "-q", "-m", "x"); };
  try {
    git("init", "-q");
    commit([["held", "1.0.0", "MS-PL"], ["fine", "1.0.0", "MIT"]]);
    commit([["held", "1.0.0", "MS-PL"], ["fine", "1.0.0", "MIT"], ["added", "2.0.0", "MS-PL"]]);
    const config = { ships: ["package.json"], lockfiles: ["package-lock.json"] };
    const r = check(config, dir, "HEAD^1", config);
    ok(r.reports.length === 1 && r.reports[0].includes("held@1.0.0") && r.reports[0].includes("13 November 2026") && r.failures.length === 1 && r.failures[0].includes("added@2.0.0"), "held at the base, a package under MS-PL is reported and passes; one the pull request adds fails, it alone", JSON.stringify(r));
    commit([["held", "1.1.0", "MS-PL"], ["fine", "1.0.0", "MIT"]]);
    const u = check(config, dir, "HEAD^1", config);
    ok(u.reports.length === 0 && u.failures.length === 1 && u.failures[0].includes("held@1.1.0"), "one the pull request updates fails too: the yes is for that version", JSON.stringify(u));
    // (a package the base held only as a tool, which a pull request moves into what ships, was not shipped there)
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "p", dependencies: { fine: "1.0.0" }, devDependencies: { dev: "1.0.0" } }));
    writeFileSync(join(dir, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { "": { name: "p", dependencies: { fine: "1.0.0" }, devDependencies: { dev: "1.0.0" } }, "node_modules/fine": { version: "1.0.0", license: "MIT", resolved: "https://registry.npmjs.org/fine/-/fine-1.0.0.tgz" }, "node_modules/dev": { version: "1.0.0", license: "MS-PL", dev: true, resolved: "https://registry.npmjs.org/dev/-/dev-1.0.0.tgz" } } }));
    git("add", "-A"); git("commit", "-q", "-m", "a tool");
    const asTool = check(config, dir, "HEAD^1", config);
    commit([["dev", "1.0.0", "MS-PL"], ["fine", "1.0.0", "MIT"]]);
    const moved = check(config, dir, "HEAD^1", config);
    ok(asTool.failures.length === 0 && moved.reports.length === 0 && moved.failures.length === 1 && moved.failures[0].includes("dev@1.0.0"), "one the base held only as a tool, which the pull request moves into what ships, fails: it was not shipped there", JSON.stringify([asTool, moved]));
    // (and a lock file whose packages the base's own config did not ship, which the pull request's config now ships)
    const tools = check(config, dir, "HEAD^1", { ships: [], lockfiles: ["package-lock.json"] });
    ok(tools.reports.length === 0 && tools.failures.some((f) => f.includes("dev@1.0.0")), "one in a lock file the base's own config did not ship fails too, read by that config", JSON.stringify(tools));
    // (and where the base held no config at this one's path, as when a pull request moves it, nothing shipped there)
    const elsewhere = check(config, dir, "HEAD^1", null);
    ok(elsewhere.reports.length === 0 && elsewhere.failures.some((f) => f.includes("dev@1.0.0")), "where the base held no config at this one's path, nothing counts as shipped there", JSON.stringify(elsewhere));
    // (a package is known by what it is: an alias moved to another package of the same version is another)
    const alias = (to, note = "") => {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "p", description: note, dependencies: { compat: `npm:${to}@1.0.0` } }));
      writeFileSync(join(dir, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { "": { name: "p", dependencies: { compat: `npm:${to}@1.0.0` } }, "node_modules/compat": { version: "1.0.0", license: "MS-PL", resolved: `https://registry.npmjs.org/${to}/-/${to}-1.0.0.tgz` } } }));
      git("add", "-A"); git("commit", "-q", "-m", to);
      return check(config, dir, "HEAD^1", config);
    };
    alias("old-pkg");
    const kept = alias("old-pkg", "again"), swapped = alias("new-pkg");
    ok(kept.failures.length === 0 && kept.reports.length === 1 && swapped.reports.length === 0 && swapped.failures.some((f) => f.includes("compat@1.0.0")), "an alias the base shipped is reported; one moved to another package of the same version fails, known by what it is", JSON.stringify([kept, swapped]));
    const none = check(config, dir, null);
    ok(none.reports.length === 1 && none.reports[0].includes("no base to read") && none.failures.length === 0, "with no base to read (a checkout of one commit), it is reported and passes, as it passed before: no sync fails a project over it", JSON.stringify(none));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

process.exit(failed ? 1 : 0);
