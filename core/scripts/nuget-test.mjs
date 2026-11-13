// Tests of the NuGet check (nuget.mjs): the config's "nuget", what a lock file installs and asks for, the licence a
// package's manifest names, and the check whole on a scratch project with lock files, a restore's folder and an
// audit, all written here. No network and no .NET SDK: the real ones are tried by init-dotnet-test.mjs. Node's own
// modules only.
//
//   node scripts/nuget-test.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REGISTRY, check, lockPackages, manifestLicence, nugetConfig, projectFiles, sourcesOf } from "./nuget.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };
const throws = fn => { try { fn(); return false; } catch { return true; } };

// the config's "nuget"
const L = "src/App/packages.lock.json", T = "tests/App.Tests/packages.lock.json";
ok(nugetConfig({ nuget: { ships: [L], tools: [T] } }).ships.join() === L && nugetConfig({ nuget: {} }).tools.length === 0 && nugetConfig({ nuget: { ships: ["packages.lock.json"] } }).ships.length === 1, "lock files are named as those of what ships and those of tools, either list left out where it is empty");
ok(throws(() => nugetConfig({})) && throws(() => nugetConfig({ nuget: [] })) && throws(() => nugetConfig({ nuget: { ships: [L], other: 1 } })), "a config without it, or with a key it does not know, stops the check");
ok([["src/App/App.csproj"], ["./src/App/packages.lock.json"], ["/abs/packages.lock.json"], ["../packages.lock.json"], ["src//packages.lock.json"], [5], "x"].every(v => throws(() => nugetConfig({ nuget: { ships: v } }))), "a lock file is named as git lists it, inside the project, and is a lock file");
ok(throws(() => nugetConfig({ nuget: { ships: [L], tools: [L] } })) && throws(() => nugetConfig({ nuget: { ships: [L, L] } })), "one named twice stops the check");
const yes = { package: "Odd.Pkg@1.0.0", licence: "LGPL-3.0-only", ships: false, yes: "the owner, 13 November 2026: take it" };
ok(nugetConfig({ nuget: { accepted: [yes, { ...yes, package: "Other.Pkg@2.0.0", ships: true, notice: "its notice" }] } }).accepted.length === 2 && [[{ ...yes, yes: "" }], [{ ...yes, package: "Odd.Pkg" }], [{ ...yes, more: 1 }], [{ ...yes, notice: 5 }], [{ ...yes, ships: "no" }], [{ package: "A@1", licence: "x", ships: true }], ["A@1"], {}].every(a => throws(() => nugetConfig({ nuget: { accepted: a } }))),
  "an accepted package names its exact version, what it is under, whether it ships and the owner's words, with its notice or without, and nothing else");

// where packages come from
ok(sourcesOf({ nuget: {} }, "/project").join() === REGISTRY && sourcesOf({ nuget: { sources: ["https://pkgs.example.com/feed/v3/index.json", "vendor/packages/"] } }, path.resolve("/project")).join() === `${REGISTRY},https://pkgs.example.com/feed/v3/index.json,${path.resolve("/project", "vendor/packages")}`,
  "a restore takes packages from NuGet's own registry, and from what the config names beside it: an address, a folder of the project's by its whole path");
ok(["http://pkgs.example.com/", "https://user:word@pkgs.example.com/", "https://pkgs.example.com/v3?key=1", "https://pkgs.example.com/a b", "https://-pkgs.example.com/", "https://169.254.169.254/", "https://localhost/", "https://pkgs..example.com/", "https://pkgs.example.com/a/../b", "../out/", "/abs/", "vendor", "./", "./vendor/", "vendor//x/", "vendor/../x/", ".git/", ".../", "core/", "Core/scripts/", "-x/", "--source/", REGISTRY, REGISTRY.toUpperCase(), 5, "vendor/\n--source\nhttps://pkgs.example.com/"]
  .every(s => throws(() => nugetConfig({ nuget: { sources: [s] } }))) && throws(() => nugetConfig({ nuget: { sources: "vendor/" } })) && throws(() => nugetConfig({ nuget: { sources: ["vendor/", "vendor/"] } })),
  "a source is an https address of a named host, with no sign-in or question in it, or a folder inside the project that is not the core's copy or git's own; never the registry again, never one twice, never a word a restore could read as an option");

// a lock file
const entry = (type, resolved, requested) => ({ type, ...(requested ? { requested } : {}), resolved, contentHash: "h==" });
const lock = deps => JSON.stringify({ version: 1, dependencies: { "net10.0": deps } });
const read = (deps, v) => lockPackages(v ?? lock(deps), "p.lock");
const plain = read({ "Newtonsoft.Json": entry("Direct", "13.0.3", "[13.0.3, )"), "Lib.Dep": entry("Transitive", "2.0.0"), lib: { type: "Project", dependencies: {} }, Central: entry("CentralTransitive", "1.2.3", "[1.2.3, )") });
ok(plain.failures.length === 0 && plain.packages.map(p => `${p.id}@${p.version}`).join() === "Newtonsoft.Json@13.0.3,Lib.Dep@2.0.0,Central@1.2.3", "a lock file gives each package it installs, the ones pulled in too, and none for the project's own projects");
ok(["[1.0.0]", "[1.0.0, 1.0.0]", "[1.0.0, )"].every(r => read({ A: entry("Direct", "1.0.0", r) }).failures.length === 0), "what a project asks for is exact as NuGet writes one version: alone, twice, or as the least version with a lock");
ok(["[1.0.0, )", "[1.*, )", "(, )", "[1.0.0, 2.0.0)", "1.0.1", undefined].every(r => /one exact version/.test(read({ A: entry("Direct", "1.0.1", r) }).failures.join())), "a range, a floating version, or a version asked for that is not the one installed fails (floor rule 7)");
ok(/one exact version/.test(read({ A: entry("CentralTransitive", "2.0.0", "[1.0.0, )") }).failures.join()) && read({ A: entry("Transitive", "2.0.0") }).failures.length === 0, "so does a centrally pinned one; a package another pulls in is asked for by no one here");
ok(/no content hash/.test(read({ A: { type: "Direct", requested: "[1.0.0, )", resolved: "1.0.0" } }).failures.join()), "a package with no content hash fails: a restore could not hold it to what it was");
ok(/does not know/.test(read({ A: { type: "Odd", resolved: "1.0.0" } }).failures.join()) && /cannot? read|can read/.test(read({ "bad id!": entry("Direct", "1.0.0", "[1.0.0, )") }).failures.join()) && /can read/.test(read({ A: entry("Direct", "../1", "[../1, )") }).failures.join()), "an entry of a kind it does not know, or an id or version it cannot read, fails");
ok(/not JSON/.test(read(null, "{").failures.join()) && [`{"version":3,"dependencies":{}}`, `{"version":1}`, `[]`, `{"version":1,"dependencies":[]}`].every(v => /no lock file this check knows/.test(read(null, v).failures.join())), "what is no lock file of NuGet's version 1 or 2 fails");
const two = lockPackages(JSON.stringify({ version: 2, dependencies: { "net10.0": { A: entry("Direct", "1.0.0", "[1.0.0, )") }, "net10.0/win-x64": { A: entry("Direct", "1.0.0", "[1.0.0, )"), "runtime.win.B": entry("Transitive", "3.0.0") } } }), "p.lock");
ok(two.failures.length === 0 && two.packages.length === 2, "a package named under several frameworks is one package, and each framework's own are read");

// a manifest's licence
const nuspec = (inner, more = "") => `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd">\n  <metadata>\n    <id>A</id>\n    <version>1.0.0</version>\n    ${inner}\n    <description>x &gt; y</description>\n    <dependencies><group targetFramework="net8.0"><dependency id="B" version="1.0.0" exclude="Build,Analyzers" /></group></dependencies>\n  </metadata>\n  ${more}\n</package>`;
const expression = text => manifestLicence(text).expression, other = text => manifestLicence(text).other;
ok(expression(nuspec(`<license type="expression">MIT</license>`)) === "MIT" && expression(nuspec(`<license type='expression' version="1.0.0"> Apache-2.0 OR MIT </license><licenseUrl>https://licenses.nuget.org/MIT</licenseUrl>`)) === "Apache-2.0 OR MIT" && expression(nuspec(`<license type="expression">MIT</license>`).replace(/\n/g, "\r\n")) === "MIT",
  "a manifest that names its licence as an expression gives it, whatever its quotes, its line endings, or the address beside it");
ok(other(nuspec(`<license type="file">LICENSE.txt</license>`)) === "a licence file" && other(nuspec(`<licenseUrl>https://example.invalid/licence</licenseUrl>`)) === "an address" && other(nuspec("")) === "nothing", "one that names a licence file, an address or nothing has no licence a machine can read, and says which");
ok(other(nuspec(`<!-- <license type="expression">MIT</license> --><licenseUrl>u</licenseUrl>`)) === "an address" && other(nuspec(`<title><![CDATA[<license type="expression">MIT</license>]]></title>`)) === "nothing" && other(nuspec(`<?pi <license type="expression">MIT</license> ?>`)) === "nothing",
  "a licence written in a comment, in CDATA or in a processing instruction is no licence");
ok(other(nuspec(`<repository type="git"><license type="expression">MIT</license></repository>`)) === "nothing" && other(nuspec("", `<license type="expression">MIT</license>`)) === "nothing",
  "nor is one that stands anywhere but directly under the manifest's metadata");
ok(other(nuspec(`<license type="expression">MIT</license><license type="expression">GPL-3.0-only</license>`)) === "a manifest with two licences" && other(`<!DOCTYPE package [<!ENTITY l "MIT">]>${nuspec(`<license type="expression">&l;</license>`)}`) === "a manifest it will not read",
  "two licences, or a document type, give none it will trust");
ok([`<license type="expression">MIT<![CDATA[ AND GPL-3.0-only]]></license>`, `<license type="expression"><![CDATA[MIT]]></license>`, `<license type="expression">MIT<!-- AND GPL-3.0-only --></license>`, `<license type="expression">MIT<?x?> OR Apache-2.0</license>`, `<license type="expression">MIT\u0000</license>`].every(l => other(nuspec(l)) !== undefined && expression(nuspec(l)) === undefined),
  "an expression with CDATA, a comment or a processing instruction inside it is not read: a reader of XML would see more of it, or other, than this one");
ok([`<license type="expression">MIT\u00a0OR\u00a0Foo-1</license>`, `<license type="expression">MIT\u2003AND GPL-3.0-only</license>`, `<license type="expression">M\u0406T</license>`, `<license type="expression">MIT\u0085</license>`].every(l => other(nuspec(l)) === "a licence it cannot read") && expression(nuspec(`<license type="expression">\n\t(MIT OR\r\n Apache-2.0)\n</license>`)) === "(MIT OR\r\n Apache-2.0)",
  "an expression with a blank that is not XML's, or any character outside plain ASCII, is not read: it would part words here that it parts for no other reader");
ok([nuspec(`<license type="expression">MIT &amp; more</license>`), nuspec(`<license type="expression"></license>`), nuspec(`<license>MIT</license>`), nuspec(`<license type="other">MIT</license>`), nuspec(`<license version="1" type="expression">MIT</license>`), nuspec(`<license type="expression"/>`)].every(t => other(t) === "a licence it cannot read"),
  "an expression with an entity in it, an empty one, or a licence element written any other way cannot be read");
const mit = `<license type="expression">MIT</license>`;
ok(other(`<package><metadata><licenseUrl>https://example.invalid/terms</licenseUrl></metadata><metadata>${mit}</metadata></package>`) === "a manifest with two metadata parts" && other(`<package><metadata></metadata><metadata/></package>`) === "a manifest with two metadata parts",
  "a second metadata part gives none: NuGet reads the first, and a licence in the second is one it never sees");
ok([`<package><metadata\u00e9>${mit}</metadata\u00e9><metadata><licenseUrl>u</licenseUrl></metadata></package>`, nuspec(`<license\ufeff type="expression">MIT</license\ufeff>`), nuspec(`<license\u00a0type="expression">MIT</license>`), nuspec(`<licens\u0435 type="expression">MIT</licens\u0435>`)].every(t => other(t) === "a manifest it will not read"),
  "an element whose name is not plain ASCII, or ends at a blank that is not XML's, is not read: a reader of XML may see another name there");
ok(other(nuspec(`<license\u00a0 type="expression">MIT</license>`)) === "a manifest it will not read" && other(nuspec(`<license type\u00a0="expression">MIT</license>`)) === "a licence it cannot read" && expression(nuspec(`<license\n\ttype = "expression" >MIT</license >`)) === "MIT", "XML's own blanks, and only they, stand between a name and what follows it");
ok([`${nuspec(mit)}<package><metadata>${mit}</metadata></package>`, `${nuspec(mit)} text`, `text ${nuspec(mit)}`, `<other/>${nuspec(mit)}`].every(t => other(t) === "a manifest that is not well formed") && expression(`\ufeff${nuspec(mit)}\n<!-- after -->\n`) === "MIT",
  "a second root, or text outside the root, is not well formed; a byte-order mark before it and a comment after it are");
const prefixed = (first, second = `<metadata>${mit}</metadata>`) => `<package xmlns="http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd" xmlns:x="urn:a">${first}${second}</package>`;
ok([prefixed(`<x:metadata><licenseUrl>u</licenseUrl></x:metadata>`), prefixed("", `<metadata><x:license type="expression">MIT</x:license></metadata>`), prefixed(`<metadata xmlns="urn:b"><licenseUrl>u</licenseUrl></metadata>`, ""), prefixed("", `<metadata><license xmlns="urn:b" type="expression">MIT</license></metadata>`), prefixed("", `<metadata xmlns:y="urn:c">${mit}</metadata>`), prefixed("", `<metadata><license type="expression"\txmlns = 'urn:b'>MIT</license></metadata>`)].every(t => other(t) === "a manifest it will not read")
  && expression(prefixed("", `<metadata><title data="xmlns='x'">t</title>${mit}</metadata>`)) === "MIT",
  "a name with a prefix, or a namespace declared anywhere but on the root, is not read: NuGet goes by an element's local name and namespace, and would find another element; the word inside an attribute's value is only a word");
ok([nuspec(`<license type="expression">MIT</license>`).replace("</metadata>", ""), nuspec(`<license type="expression">MIT`), nuspec(`<license type="expression">MIT</license>`) + "<", nuspec(`<!-- never closed <license type="expression">MIT</license>`), "<package><metadata></package></metadata>"].every(t => other(t) === "a manifest that is not well formed") && other(undefined) === "a manifest it will not read",
  "a manifest that is not well formed gives none");

// the check whole, on a scratch project
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nuget-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
const put = (to, text) => { fs.mkdirSync(path.dirname(path.join(tmp, to)), { recursive: true }); fs.writeFileSync(path.join(tmp, to), text); return to; };
// (what each made-up package's manifest names; a restore's folder holds those a project's lock files install)
const MANIFESTS = {
  "Newtonsoft.Json@13.0.3": `<license type="expression">MIT</license>`, "Serial.Lib@3.0.5": `<license type="expression">MS-PL</license>`,
  "Lib.Dep@2.0.0": `<license type="expression">Apache-2.0</license>`, "By.File@1.0.0": `<license type="file">LICENSE.md</license>`,
  "Copy.Left@4.0.0": `<license type="expression">GPL-3.0-only</license>`, "Weak.Copy@2.1.0": `<license type="expression">LGPL-3.0-only</license>`,
  "Non.Commercial@5.0.0": `<license type="expression">CC-BY-NC-4.0</license>`, "Test.Tool@9.0.0": `<license type="expression">EPL-2.0</license>`,
  "Some.Pack@8.0.0": `<license type="expression">MIT</license>`,
};
let folders = 0;
// (each package as a restore leaves it: its manifest, and beside it NuGet's record of the source it took it from; a
// name is "<Id>@<version>", or [that, the source] for one taken from elsewhere than the registry)
const restore = (...names) => {
  const dir = `restored-${++folders}`;
  fs.mkdirSync(path.join(tmp, dir));
  for (const [name, source = REGISTRY] of names.map(n => (Array.isArray(n) ? n : [n])).filter(([n]) => MANIFESTS[n])) {
    const [id, version] = name.toLowerCase().split("@");
    put(`${dir}/${id}/${version}/${id}.nuspec`, nuspec(MANIFESTS[name]));
    put(`${dir}/${id}/${version}/.nupkg.metadata`, JSON.stringify({ version: 2, contentHash: "h==", source }));
  }
  return path.join(tmp, dir);
};
const direct = (...pairs) => Object.fromEntries(pairs.map(([id, v]) => [id, entry("Direct", v, `[${v}, )`)]));
const installed = deps => Object.entries(deps).filter(([, e]) => e.type !== "Project").map(([id, e]) => `${id}@${e.resolved}`);
const TRACKED = ["src/App/App.csproj", L, "tests/App.Tests/App.Tests.csproj", T, "core/scripts/x.mjs"];
const project = (shipsDeps, toolsDeps, { nuget = {}, entries = [], extra = [], config = {} } = {}) => {
  put(L, lock(shipsDeps)); put(T, lock(toolsDeps));
  put("checks/audit.json", JSON.stringify({ entries }));
  return check({ ships: [], audit: "checks/audit.json", ...config, nuget: { ships: [L], tools: [T], ...nuget } }, tmp, restore(...installed(shipsDeps), ...installed(toolsDeps), ...extra), TRACKED);
};
const said = result => result.failures.join("\n");
const good = project({ ...direct(["Newtonsoft.Json", "13.0.3"], ["Serial.Lib", "3.0.5"]), "Lib.Dep": entry("Transitive", "2.0.0") }, direct(["Test.Tool", "9.0.0"], ["Newtonsoft.Json", "13.0.3"]));
ok(good.failures.length === 0 && /^4 NuGet packages in 2 lock files checked \(3 in what ships, 1 tools that only run\), 0 accepted/.test(good.summary), "a project whose every package is exact and on its list passes: what ships to the floor's list, a test's tool to the tools'", said(good) + good.summary);
const bad = project(direct(["Copy.Left", "4.0.0"], ["Test.Tool", "9.0.0"], ["By.File", "1.0.0"]), {});
ok(bad.failures.length === 3 && /Copy\.Left@4\.0\.0 .*GPL-3\.0-only is off the list for what ships.*nuget\.accepted/.test(said(bad)) && /Test\.Tool@9\.0\.0 .*EPL-2\.0 is off the list for what ships/.test(said(bad)) && /By\.File@1\.0\.0 .*it ships, and its manifest names a licence file.*waits for the owner's yes \(floor rule 10\), in the config's "nuget\.accepted"/.test(said(bad)),
  "copyleft in what ships fails, a licence good enough for a tool is not good enough for what ships, and what ships under a licence in a file waits for the owner's yes", said(bad));

// read by hand: a tool's entry in the audit, and the owner's yes for what ships
const hand = { name: "by.file@1.0.0", kind: "nuget", licence: "MIT" };
const tool = (entries, nuget = {}) => project({}, direct(["By.File", "1.0.0"]), { entries, nuget });
ok(/By\.File@1\.0\.0 .*names a licence file.*record it in checks\/audit\.json as "By\.File@1\.0\.0", of "kind": "nuget"/.test(said(tool([]))) && tool([hand]).failures.length === 0,
  "a tool that only runs, its licence in a file, waits to be read by hand, and passes once the audit records it under its id and version, however cased", said(tool([hand])));
ok(/LicenseRef-Odd, as checks\/audit\.json records it, is off the tools' list/.test(said(tool([{ ...hand, licence: "LicenseRef-Odd" }]))) && /names no licence/.test(said(tool([{ ...hand, licence: 5 }])))
  && /names a licence file/.test(said(tool([{ ...hand, name: "By.File@0.9.0" }]))), "an entry that records a licence off the tools' list, none, or another version does not pass it");
ok(/names a licence file/.test(said(tool([{ ...hand, kind: undefined }]))) && /names a licence file/.test(said(tool([{ ...hand, kind: "data" }]))), "an entry of the same name that is not a NuGet package's covers none: the audit holds other things under such names");
ok(/the entry By\.File@0\.9\.0, of "kind": "nuget", is for no package whose licence had to be read by hand: remove it/.test(said(tool([hand, { ...hand, name: "By.File@0.9.0" }])))
  && /holds an entry for it, and its manifest names its licence itself \(MIT\): remove the entry/.test(said(project(direct(["Newtonsoft.Json", "13.0.3"]), {}, { entries: [{ ...hand, name: "Newtonsoft.Json@13.0.3" }] }))), "an entry for a version installed no more, or for a package whose manifest speaks for itself, fails: the audit's NuGet entries shrink by themselves");
ok(/GPL-3\.0-only is off/.test(said(project(direct(["Copy.Left", "4.0.0"]), {}, { entries: [{ ...hand, name: "Copy.Left@4.0.0" }] }))), "what a manifest names itself, no entry written by hand overrules");
const shippedByHand = project(direct(["By.File", "1.0.0"]), {}, { entries: [{ ...hand, ships: true, notice: "n" }] });
ok(shippedByHand.failures.length === 2 && /it ships, and its manifest names a licence file.*waits for the owner's yes/.test(said(shippedByHand)) && /it ships, so checks\/audit\.json holds no entry for it/.test(said(shippedByHand)),
  "what ships is never passed by an audit entry, whatever a session read: read as MIT and recorded as shipping, it still waits for the owner's yes", said(shippedByHand));
ok(/it ships, and its manifest names a licence file/.test(said(project(direct(["By.File", "1.0.0"]), direct(["By.File", "1.0.0"]), { entries: [hand] }))), "nor where the same version is a tool's too: it is held as what ships");

// the owner's yes
const accepted = (id, v, licence, more = {}) => ({ package: `${id}@${v}`, licence, ships: true, yes: "the owner, 13 November 2026: take it", notice: "its notice", ...more });
const taken = project(direct(["Weak.Copy", "2.1.0"], ["By.File", "1.0.0"]), {}, { nuget: { accepted: [accepted("weak.copy", "2.1.0", "LGPL-3.0-only"), accepted("By.File", "1.0.0", "LicenseRef-Vendor-EULA")] } });
ok(taken.failures.length === 0 && /2 accepted on the owner's yes/.test(taken.summary), "a package off its list, or with no licence a machine can read, passes where the config names that version with the owner's words", said(taken));
ok(project(direct(["By.File", "1.0.0"]), {}, { nuget: { accepted: [accepted("By.File", "1.0.0", "MIT")] } }).failures.length === 0
  && /it ships, so its notice ships too/.test(said(project(direct(["By.File", "1.0.0"]), {}, { nuget: { accepted: [accepted("By.File", "1.0.0", "MIT", { notice: undefined })] } }))),
  "what ships under a licence read by hand as one on the list passes by the owner's yes for that reading, with its notice");
ok(/Weak\.Copy@2\.1\.0 .*off the list/.test(said(project(direct(["Weak.Copy", "2.1.0"]), {}, { nuget: { accepted: [accepted("Weak.Copy", "2.0.0", "LGPL-3.0-only")] } }))), "a yes for one version is no yes for the next");
ok(/accepted as a tool that only runs .*a yes for a tool is no yes for what ships/.test(said(project(direct(["By.File", "1.0.0"]), direct(["By.File", "1.0.0"]), { nuget: { accepted: [accepted("By.File", "1.0.0", "LicenseRef-Vendor-EULA", { ships: false })] } })))
  && project({}, direct(["By.File", "1.0.0"]), { nuget: { accepted: [accepted("By.File", "1.0.0", "LicenseRef-Vendor-EULA", { ships: false, notice: undefined })] } }).failures.length === 0, "a yes for a tool that only runs is no yes for the same version where it ships; for the tool it is enough, and needs no notice");
ok(/it ships, so its notice ships too/.test(said(project(direct(["Weak.Copy", "2.1.0"]), {}, { nuget: { accepted: [accepted("Weak.Copy", "2.1.0", "LGPL-3.0-only", { notice: " " })] } }))), "an accepted package that ships has its notice there");
ok([accepted("Non.Commercial", "5.0.0", "CC-BY-NC-4.0"), accepted("Non.Commercial", "5.0.0", "MIT"), accepted("Non.Commercial", "5.0.0", "LicenseRef-Free-For-Any-Use")].every(a => /terms floor rule 10 never allows/.test(said(project(direct(["Non.Commercial", "5.0.0"]), {}, { nuget: { accepted: [a] } }))))
  && /terms floor rule 10 never allows/.test(said(project(direct(["By.File", "1.0.0"]), {}, { nuget: { accepted: [accepted("By.File", "1.0.0", "LicenseRef-BUSL-1.1")] } }))), "no yes takes in terms the floor never allows, whatever the entry calls them: the manifest's own word counts, and the entry's");
ok(/named in "nuget\.accepted" and in checks\/audit\.json both: an accepted package stands/.test(said(project(direct(["By.File", "1.0.0"]), {}, { entries: [{ ...hand, licence: "GPL-3.0-only" }], nuget: { accepted: [accepted("By.File", "1.0.0", "GPL-3.0-only")] } })))
  && /named in "nuget\.accepted" and in checks\/audit\.json both: an accepted package stands/.test(said(project(direct(["By.File", "1.0.0"]), {}, { entries: [{ ...hand, ships: true, notice: "n" }], nuget: { accepted: [accepted("By.File", "1.0.0", "MIT")] } })))
  && /and the entry is on its list: remove the yes/.test(said(tool([hand], { accepted: [accepted("By.File", "1.0.0", "MIT", { ships: false })] }))), "an accepted package with an audit entry too fails: the licence check would hold that entry to the list, and a tool's entry on the list needs no yes");
ok(/names Newtonsoft\.Json@13\.0\.3, which is on its list and needs no yes: remove it/.test(said(project(direct(["Newtonsoft.Json", "13.0.3"]), {}, { nuget: { accepted: [accepted("Newtonsoft.Json", "13.0.3", "MIT")] } })))
  && /names Gone@1\.0\.0, which nothing installs: remove it/.test(said(project({}, {}, { nuget: { accepted: [accepted("Gone", "1.0.0", "x")] } }))), "an accepted version that needs no yes, or is installed no more, fails: the list shrinks by itself");
ok(["Business Source License 1.1", "none given", "the maker's own terms, bought", "MIT or Apache-2.0", "LicenseRef-", "LicenseRef-a b"].every(words => /which no machine can read: name it by an SPDX id/.test(said(project(direct(["By.File", "1.0.0"]), {}, { nuget: { accepted: [accepted("By.File", "1.0.0", words)] } }))))
  && ["LicenseRef-Vendor-EULA", "LGPL-3.0-only", "(MIT OR GPL-2.0-only)", "GPL-2.0-only WITH Classpath-exception-2.0", "CC-BY-4.0"].every(words => project(direct(["By.File", "1.0.0"]), {}, { nuget: { accepted: [accepted("By.File", "1.0.0", words)] } }).failures.length === 0),
  "what an accepted package is under is named so that a machine can read it: by ids this check knows, or as LicenseRef- and a name; words of one's own fail");
ok(throws(() => project({}, {}, { nuget: { accepted: [accepted("A", "1", "x"), accepted("a", "1", "y")] } })) && throws(() => project({}, {}, { nuget: { accepted: [{ ...accepted("A", "1", "x"), ships: undefined }] } })), "a package accepted twice, or without a word on whether it ships, stops the check");

// what the restore brought, and what it did not
ok(/Not\.Restored@1\.0\.0 .*not in the restore's folder/.test(said(project(direct(["Not.Restored", "1.0.0"]), {}))) && /not in the restore's folder/.test(said(check({ ships: [], nuget: { ships: [L] } }, tmp, undefined, ["src/App/App.csproj", L]))), "a package the restore did not bring, or no restore at all, fails: its licence cannot be read");
const pack = project(direct(["Newtonsoft.Json", "13.0.3"]), {}, { extra: ["Some.Pack@8.0.0"] });
ok(pack.failures.length === 0 && /^1 NuGet packages in 2 lock files checked \(1 in what ships, 0 tools that only run\), and 1 more that the restore brought and no lock file names/.test(pack.summary), "a package the restore brought that no lock file names, a targeting pack say, is read too, and passes on its list", said(pack) + pack.summary);
const smuggled = project(direct(["Newtonsoft.Json", "13.0.3"]), {}, { extra: ["Copy.Left@4.0.0", "By.File@1.0.0"] });
ok(/copy\.left@4\.0\.0 \(brought by the restore, and named in no lock file read here\): GPL-3\.0-only is off the list for what ships/.test(said(smuggled)) && /by\.file@1\.0\.0 \(brought by the restore.*names a licence file/.test(said(smuggled)), "one off the list fails as what ships would, however it came: a lock file under another name, a download a project file asks for", said(smuggled));
ok(/by\.file@1\.0\.0: it ships, so checks\/audit\.json holds no entry for it/.test(said(project(direct(["Newtonsoft.Json", "13.0.3"]), {}, { extra: ["By.File@1.0.0"], entries: [hand] })))
  && project(direct(["Newtonsoft.Json", "13.0.3"]), {}, { extra: ["By.File@1.0.0"], nuget: { accepted: [accepted("By.File", "1.0.0", "MIT")] } }).failures.length === 0, "and one read by hand passes as what ships does: by the owner's yes, never by an audit entry");
ok(/one exact version/.test(said(project({ A: entry("Direct", "13.0.3", "[13.0.*, )") }, {}))), "a lock file's own faults are the check's");
ok(project(direct(["Newtonsoft.Json", "13.0.3"]), {}, { config: { data: ["Newtonsoft.Json", "copy.left"], fonts: ["Copy.Left"] } }).failures.length === 0 && /GPL-3\.0-only is off/.test(said(project(direct(["Copy.Left", "4.0.0"]), {}, { config: { data: ["Copy.Left"], fonts: ["Copy.Left"] } }))), "a name the config gives as data or a font, for npm's packages, widens no list for a NuGet package of that name");
const loud = lockPackages(JSON.stringify({ version: 1, dependencies: { "net10.0\n::error::forged": { "A\n::warning::x": entry("Direct", "1.0.0", "[2.0.0\n::notice::y, )"), B: entry("Direct", "1.0.0", "[9\r\n::stop-commands::z, )") } } }), "p.lock").failures;
ok(loud.length === 2 && loud.every(line => !/[\r\n]/.test(line)), "what a lock file holds is shown on one line: nothing in it starts a line of its own in a log", JSON.stringify(loud));

// every project has its lock file, and every lock file is named
const names = (tracked, nuget) => check({ ships: [], nuget }, tmp, restore(), tracked).failures.join("\n");
put(L, lock({})); put(T, lock({}));
ok(/src\/Other\/Other\.fsproj has no packages\.lock\.json beside it/.test(names(["src/App/App.csproj", L, "src/Other/Other.fsproj"], { ships: [L] })) && /Old\.VBPROJ has no/.test(names(["Old.VBPROJ"], {})), "a project file with no lock file beside it that git knows fails, whatever its language or its case");
ok(/tests\/App\.Tests\/packages\.lock\.json is named in neither/.test(names(["src/App/App.csproj", L, "tests/App.Tests/App.Tests.csproj", T], { ships: [L] })), "a lock file the config does not name fails: it would go unread");
ok(/names src\/App\/packages\.lock\.json, which is no lock file git knows/.test(names([], { ships: [L] })), "one the config names that git does not know fails");
ok(/packages\.config has no lock file/.test(names(["legacy/packages.config"], {})), "the older packages.config fails");
ok(/src\/App\/packages\.App\.lock\.json: a lock file under another name/.test(names(["src/App/App.csproj", L, "src/App/packages.App.lock.json"], { ships: [L] })) && /Packages\.X\.Lock\.Json: a lock file under another name/.test(names(["Packages.X.Lock.Json"], {})), "a lock file under the other name NuGet takes first fails: this check would read the plain one and NuGet the other");
put("src/App/App.csproj", "<Project><PropertyGroup><NuGetLockFilePath>../locks/app.json</NuGetLockFilePath></PropertyGroup></Project>"); put("Directory.Build.props", "<Project><PropertyGroup><nugetlockfilepath>x</nugetlockfilepath></PropertyGroup></Project>"); put("build/Other.targets", "<Project />");
ok(/src\/App\/App\.csproj names NuGetLockFilePath/.test(names(["src/App/App.csproj", L], { ships: [L] })) && /Directory\.Build\.props names NuGetLockFilePath/.test(names(["Directory.Build.props", "build/Other.targets"], {})) && names(["build/Other.targets", "gone/Missing.props"], {}) === "", "so does a project or build file that names a lock file kept elsewhere");
put("src/App/App.csproj", "<Project><PropertyGroup><RestorePackagesPath>pkgs</RestorePackagesPath></PropertyGroup></Project>");
put("build/Fallback.props", "<Project><PropertyGroup><RestoreAdditionalProjectFallbackFolders>vendored</RestoreAdditionalProjectFallbackFolders></PropertyGroup></Project>"); put("build/Local.targets", `<Project TreatAsLocalProperty="RestorePackagesPath" />`);
ok(/build\/Fallback\.props names RestorePackagesPath or a fallback folder/.test(names(["build/Fallback.props"], {})) && /build\/Local\.targets names TreatAsLocalProperty/.test(names(["build/Local.targets"], {})), "so does a build file that names a fallback folder, or that lets a project set for itself what the restore sets for all");
ok(/src\/App\/App\.csproj names RestorePackagesPath/.test(names(["src/App/App.csproj", L], { ships: [L] })) && /Directory\.Build\.rsp: a response file/.test(names(["Directory.Build.rsp"], {})) && /src\/msbuild\.RSP: a response file/.test(names(["src/msbuild.RSP"], {})) && names(["notes/other.rsp"], {}) === "",
  "a project file that sends its packages to another folder than the restore's fails, and so does a response file that gives every build options of its own");
put("src/App/App.csproj", "<Project />");
ok(names(["core/x/y.csproj", "core/packages.lock.json", "core/packages.y.lock.json", "README.md"], {}) === "" && /^0 NuGet packages in 0 lock files/.test(check({ ships: [], nuget: {} }, tmp, restore(), ["README.md"]).summary), "the copy of the core is not the project's, and a project with no NuGet project passes with nothing to read");
ok(projectFiles(["src/App/App.csproj", "a b/C.FSPROJ", "core/x/y.csproj", "x.csproj.bak", "README.md", "t/T.vbproj"]).join() === "src/App/App.csproj,a b/C.FSPROJ,t/T.vbproj", "the project files it lists for the restore are the same it asks a lock file of");

// the script itself: started in a project, as the workflow starts it
const repo = path.join(tmp, "repo");
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|COMMON_DIR)$/i.test(name)));
Object.assign(env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1" });
const here = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(repo, "core"), { recursive: true });
fs.cpSync(here, path.join(repo, "core", "scripts"), { recursive: true });
fs.cpSync(path.join(here, "..", "floor"), path.join(repo, "core", "floor"), { recursive: true });
// where each package was taken from, as NuGet records it beside the package
const APP = "src/App/App.csproj", only = [APP, L];
const takenFrom = (source, nuget = {}, tracked = only, { meta, env } = {}) => {
  put(L, lock(direct(["Newtonsoft.Json", "13.0.3"])));
  const dir = restore(["Newtonsoft.Json@13.0.3", source]), record = path.join(dir, "newtonsoft.json", "13.0.3", ".nupkg.metadata");
  if (meta === null) fs.rmSync(record); else if (meta !== undefined) fs.writeFileSync(record, meta);
  return check({ ships: [], nuget: { ships: [L], ...nuget } }, tmp, dir, tracked, env).failures.join("\n");
};
const named = { sources: ["https://pkgs.example.com/v3/index.json", "vendor/packages/"] }, vendored = [...only, "vendor/packages/Bought.1.0.0.nupkg"];
ok(takenFrom(REGISTRY) === "" && takenFrom("https://pkgs.example.com/v3/index.json", named, vendored) === ""
  && takenFrom(path.join(tmp, "vendor", "packages") + path.sep, named, vendored) === "" && takenFrom(path.join(tmp, "vendor", "packages"), named, vendored) === "",
  "a package taken from the registry, or from a source the config names, an address or a folder however its path ends, passes");
ok(/Newtonsoft\.Json@13\.0\.3 \(src\/App\/packages\.lock\.json\): the restore took it from https:\/\/pkgs\.example\.com\/v3\/index\.json, which is neither NuGet's own registry nor a source the config's "nuget\.sources" names/.test(takenFrom("https://pkgs.example.com/v3/index.json"))
  && /the restore took it from .*vendored/.test(takenFrom(path.join(tmp, "vendored"))) && /the restore took it from http:\/\/pkgs\.example\.com/.test(takenFrom("http://pkgs.example.com/v3/index.json", { sources: ["https://pkgs.example.com/v3/index.json"] }))
  && /the restore took it from https:\/\/API\.nuget\.org/.test(takenFrom("https://API.nuget.org/v3/index.json")), "one taken from anywhere else fails, whatever added the source: an address, a folder, the plain form of a named address, another spelling of the registry's");
ok([null, "", "not json", "{}", JSON.stringify({ version: 2, source: "" }), JSON.stringify({ source: 7 })].every(meta => /the restore left no record of where it took it from \(\.nupkg\.metadata\)/.test(takenFrom(REGISTRY, {}, only, { meta }))),
  "a package with no record of where it was taken from, or one that names no source, fails: its source cannot be read");
const elsewhere = check({ ships: [], nuget: { ships: [L] } }, tmp, restore("Newtonsoft.Json@13.0.3", ["Some.Pack@8.0.0", "https://pkgs.example.com/v3/index.json"]), only).failures.join("\n");
ok(/some\.pack@8\.0\.0 \(brought by the restore, and named in no lock file read here\): the restore took it from https:\/\/pkgs\.example\.com/.test(elsewhere), "a package the restore brought that no lock file names, for a project of another kind say, is held to the same sources", elsewhere);
// (the runner's own SDK stands outside the project, as on a runner)
const sdk = fs.mkdtempSync(path.join(os.tmpdir(), "nuget-test-sdk-")); process.on("exit", () => fs.rmSync(sdk, { recursive: true, force: true }));
for (const name of ["dotnet", "dotnet.exe"]) fs.writeFileSync(path.join(sdk, name), "");
const onPath = { env: { PATH: [path.join(tmp, "nowhere"), sdk].join(path.delimiter) } };
ok(takenFrom(path.join(sdk, "library-packs"), {}, only, onPath) === "" && /the restore took it from .*library-packs/.test(takenFrom(path.join(tmp, "elsewhere", "library-packs"), {}, only, onPath)) && /the restore took it from .*library-packs/.test(takenFrom(path.join(sdk, "library-packs"))),
  "the SDK's own folder of packages, beside the dotnet the PATH names, is a source every restore has; a folder of that name anywhere else is not, nor that one where no dotnet stands beside it on the PATH");
put("tools/dotnet", "");
const relative = path.relative(process.cwd(), path.join(tmp, "tools")), local = (dir) => takenFrom(path.join(tmp, "tools", "library-packs"), {}, only, { env: { PATH: dir } });
ok(/the restore took it from .*library-packs/.test(local(relative)) && /the restore took it from .*library-packs/.test(local(path.join(tmp, "tools"))) && /the restore took it from .*library-packs/.test(takenFrom(path.join(tmp, "tools", "library-packs"), {}, only, { env: { DOTNET_ROOT: path.join(tmp, "tools") } })),
  "a dotnet the PATH or DOTNET_ROOT names by a path that is not whole, or one inside the project, brings no folder of packages: it would be one the pull request brought");
const outside = fs.mkdtempSync(path.join(os.tmpdir(), "nuget-test-path-")); process.on("exit", () => fs.rmSync(outside, { recursive: true, force: true }));
fs.symlinkSync(path.join(tmp, "tools", "dotnet"), path.join(outside, "dotnet"));
ok(/the restore took it from .*library-packs/.test(takenFrom(path.join(tmp, "tools", "library-packs"), {}, only, { env: { PATH: outside } })), "nor one whose link, outside the project, leads into it", takenFrom(path.join(tmp, "tools", "library-packs"), {}, only, { env: { PATH: outside } }));
put("vendor/packages/Bought.1.0.0.nupkg", "");
const shown = names(["vendor/packages/Bought.1.0.0.nupkg"], { sources: ["vendor/packages/", "https://pkgs.example.com/v3/index.json"] });
fs.symlinkSync(os.tmpdir(), path.join(tmp, "vendor/packages/elsewhere"));
ok(/"nuget\.sources" names vendor\/packages\/, a folder that holds no file git knows/.test(names(["vendor/readme.md"], { sources: ["vendor/packages/"] })) && shown === ""
  && /vendor\/packages\/elsewhere: a link, in a folder the config names as a source/.test(names(["vendor/packages/Bought.1.0.0.nupkg", "vendor/packages/elsewhere"], { sources: ["vendor/packages/"] })),
  "a folder named as a source holds files git knows, so what it gives stands in the pull request, and no link that leads out of it");
fs.rmSync(path.join(tmp, "vendor/packages/elsewhere")); put("vendor/packages/deep/Slipped.2.0.0.nupkg", "");
ok(/vendor\/packages\/deep\/Slipped\.2\.0\.0\.nupkg: a file git does not know, in a folder the config names as a source/.test(names(["vendor/packages/Bought.1.0.0.nupkg"], { sources: ["vendor/packages/"] }))
  && names(["vendor/packages/Bought.1.0.0.nupkg", "vendor/packages/deep/Slipped.2.0.0.nupkg"], { sources: ["vendor/packages/"] }) === "", "and nothing git does not know, however deep: a restore takes what the pull request shows and nothing beside it");
const inRepo = (to, text) => { fs.mkdirSync(path.dirname(path.join(repo, to)), { recursive: true }); fs.writeFileSync(path.join(repo, to), text); };
inRepo("src/App/App.csproj", "<Project />"); inRepo(L, lock(direct(["Copy.Left", "4.0.0"])));
inRepo("checks/audit.json", JSON.stringify({ entries: [] }));
inRepo("checks/licences.json", JSON.stringify({ ships: [], audit: "checks/audit.json", nuget: { ships: [L] } }));
const git = (...args) => spawnSync("git", args, { cwd: repo, env, encoding: "utf8" });
git("init", "-q", "-b", "main"); git("add", "-A"); git("commit", "-q", "-m", "a project");
const run = (...args) => { const r = spawnSync(process.execPath, [path.join(repo, "core/scripts/nuget.mjs"), ...args], { cwd: repo, env, encoding: "utf8" }); return { status: r.status, out: r.stdout + r.stderr, stdout: r.stdout }; };
const left = restore("Copy.Left@4.0.0"), json = restore("Newtonsoft.Json@13.0.3");
const strict = run("checks/licences.json", "--packages", left), advisory = run("checks/licences.json", "--packages", left, "--advisory");
ok(strict.status === 1 && /^FAIL: Copy\.Left@4\.0\.0/m.test(strict.out) && /1 failing/.test(strict.out), "run in a project, it fails where a package is off its list", strict.out);
ok(advisory.status === 0 && /^WOULD FAIL: Copy\.Left@4\.0\.0/m.test(advisory.out) && /Advisory: nothing fails for it yet/.test(advisory.out), "advisory, it says what it would fail, and passes", advisory.out);
ok(run("checks/licences.json").status === 1 && run("--packages", left).status === 1 && run().status === 1 && run("checks/missing.json", "--packages", left, "--advisory").status === 1, "without its config or the restore's folder it fails, advisory or not");
ok(run("--projects").status === 0 && run("--projects").stdout === "src/App/App.csproj\n", "asked for the project files, it lists what git knows, a line each, for the restore");
ok(run("checks/licences.json", "--sources").status === 0 && run("checks/licences.json", "--sources").stdout === `${REGISTRY}\n` && run("--sources").status === 1 && run("checks/missing.json", "--sources").status === 1,
  "asked for the sources, it lists the registry and what the config names, a line each, and fails without a config it can read");
inRepo(L, lock(direct(["Newtonsoft.Json", "13.0.3"])));
const fine = run("checks/licences.json", "--packages", path.relative(repo, json));
ok(fine.status === 0 && /^1 NuGet packages in 1 lock files checked/m.test(fine.out), "a lock file edited and not yet committed is read as it stands, and the folder may be named from where it is started", fine.out);
inRepo("checks/audit.json", JSON.stringify({ entries: [{ ...hand, name: "By.File@1.0.0" }] })); inRepo(L, lock(direct(["By.File", "1.0.0"])));
inRepo("checks/licences.json", JSON.stringify({ ships: [], audit: "checks/audit.json", nuget: { tools: [L] } }));
const licences = spawnSync(process.execPath, [path.join(repo, "core/scripts/licences.mjs"), "checks/licences.json"], { cwd: repo, env, encoding: "utf8" });
ok(licences.status === 0 && run("checks/licences.json", "--packages", restore("By.File@1.0.0")).status === 0, "the licence check takes the same config and the same audit, holds the NuGet entry to its list, and leaves the rest to this check", licences.stdout + licences.stderr);

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the NuGet check`);
process.exit(failed ? 1 : 0);
