// Checks the licence check's lists and readers (licences.mjs, beside this file), alone, on invented names: how a licence
// expression is read, which list allows what, a package known by its registry address, npm's settings. The check on a
// whole project, and its scan, are checked by licence-scan-test.mjs. Run by the core's tests workflow
// (.github/workflows/tests.yml).
//
//   node scripts/licences-test.mjs
import { licenceOk, policy, registryName, registryOverrides, scriptsOff } from "./licences.mjs";

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
ok(all(["GPL-3.0-only", "LGPL-2.1-or-later", "MPL-2.0", "EUPL-1.2", "OSL-3.0", "CECILL-2.1", "MS-RL", "BSL-1.0", "Artistic-1.0-Perl", "PSF-2.0"], tool, true)
  && all(["GPL-3.0-only", "LGPL-2.1-or-later", "MPL-2.0", "EUPL-1.2", "OSL-3.0", "CECILL-2.1", "MS-RL"], code, false), "tools may use every licence the Open Source Initiative approves, what ships none of its copyleft ones");
ok(all(["BUSL-1.1", "SSPL-1.0", "Elastic-2.0", "CC-BY-NC-4.0", "CC-BY-ND-4.0", undefined], tool, false), "nor any terms floor rule 10 never allows");
ok(registryName("https://registry.npmjs.org/mossgrip-data/-/mossgrip-data-1.0.0.tgz") === "mossgrip-data" && registryName("https://registry.npmjs.org/@moss/grip/-/grip-1.0.0.tgz") === "@moss/grip"
  && [undefined, "file:vendor/mossgrip-data.tgz", "vendor/mossgrip-data", "git+https://mossgrip.example/data.git", "https://mossgrip.example/mossgrip-data/-/mossgrip-data-1.0.0.tgz"].every((r) => registryName(r) === undefined),
  "names a package by its registry address, never by a name the lockfile could be given");
const npmrc = ["registry=https://mossgrip.example/", "replace-registry-host=always", "@x:registry = https://mossgrip.example/", '"registry"=https://mossgrip.example/', '"replace-registry-host"=always', "${KEY}=https://mossgrip.example/"];
ok(JSON.stringify(registryOverrides(npmrc.join("\n"))) === JSON.stringify(npmrc) && registryOverrides("fund=false\naudit=false\n# registry=x\n; registry=x\n").length === 0
  && JSON.stringify(registryOverrides("ignore-scripts=true\nregistry=https://mossgrip.example/\n")) === JSON.stringify(["registry=https://mossgrip.example/"])
  && JSON.stringify(registryOverrides("ignore-scripts=false\nIGNORE-SCRIPTS=true\nignore-scripts=\n")) === JSON.stringify(["ignore-scripts=false", "IGNORE-SCRIPTS=true", "ignore-scripts="]),
  "refuses every npm setting but a few harmless ones, however its key is spelt");
ok(scriptsOff("# no install scripts\nignore-scripts=true\n") && !scriptsOff("ignore-scripts=false\n"), "knows when install scripts are off");

process.exit(failed ? 1 : 0);
