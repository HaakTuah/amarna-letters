// Tests of the fetch before the NuGet check's restore (nuget-fetch.mjs) and of the check that reads what it fetched
// (nuget.mjs --fetched): a package file's manifest read out of it, a tool held to one exact version, a package held to
// its lock file's content hash, and each licence held to its list before any build runs, a licence the floor moved off
// the list for what ships reported where the base held the package. Package files are made here, in a folder the
// config names as a source; where nuget.org can be reached, one real package is fetched from it too. On Linux and on
// Windows. Git and Node's own modules.
//
//   node scripts/nuget-fetch-test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { crc32, deflateRawSync } from "node:zlib";
import { cut, fetchAll, fileAddress, named, nuspecOf, toolsOf } from "./nuget-fetch.mjs";
import { REGISTRY, check } from "./nuget.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${String(detail).slice(0, 800).replace(/\n/g, "\n     ")}`}`); } };
const throws = fn => { try { fn(); return false; } catch { return true; } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nuget-fetch-test-"));
process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } });

// a zip, as a package file is one: each [name, text, deflated]
function zip(files) {
  const locals = [], centrals = [];
  let at = 0;
  for (const [name, text, deflate = true] of files) {
    const raw = Buffer.from(text), data = deflate ? deflateRawSync(raw) : raw, n = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(deflate ? 8 : 0, 8);
    head.writeUInt32LE(crc32(raw), 14); head.writeUInt32LE(data.length, 18); head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(crc32(raw), 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(n.length, 28); central.writeUInt32LE(at, 42);
    locals.push(head, n, data); centrals.push(central, n);
    at += 30 + n.length + data.length;
  }
  const dir = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(at, 16);
  return Buffer.concat([...locals, dir, end]);
}
const nuspec = (id, version, licence) => `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd">\n  <metadata>\n    <id>${id}</id>\n    <version>${version}</version>\n    <license type="expression">${licence}</license>\n  </metadata>\n</package>\n`;
const pkg = (id, version, licence) => zip([[`${id}.nuspec`, nuspec(id, version, licence)], ["lib/net9.0/x.dll", "not a real assembly", false]]);
const hash = bytes => createHash("sha512").update(bytes).digest("base64");

// the manifest, out of a package file
ok(nuspecOf(pkg("A", "1.0.0", "MIT")).includes("<license type=\"expression\">MIT</license>") && nuspecOf(zip([["A.nuspec", nuspec("A", "1.0.0", "MIT"), false]])).includes("MIT"), "a package file's manifest is read out of it, deflated or stored");
ok(throws(() => nuspecOf(zip([["a.nuspec", "x"], ["b.nuspec", "y"]]))) && throws(() => nuspecOf(zip([["lib/a.nuspec", "x"]]))) && throws(() => nuspecOf(Buffer.from("not a zip"))), "two manifests at its root, one in a folder alone, or no zip at all: none is read");
// a package's address on a v3 feed, its version as NuGet writes one: no build metadata, three numbers at least
ok(fileAddress("https://feed.example/flat/", "Foo.Bar", "1.0+build.1") === "https://feed.example/flat/foo.bar/1.0.0/foo.bar.1.0.0.nupkg" && fileAddress("https://feed.example/flat/", "Foo", "2.1.0.0-Beta") === "https://feed.example/flat/foo/2.1.0-beta/foo.2.1.0-beta.nupkg", "a package's address names its version as NuGet writes one", fileAddress("https://feed.example/flat/", "Foo.Bar", "1.0+build.1"));
// a part cut leaves a space, so that no two halves it leaves join into another; one never closed gives nothing
ok(!cut("<!<!---->--", "<!--", "-->").includes("<!--") && cut("a<!-- b -->c", "<!--", "-->") === "a c" && cut("a<!-- b", "<!--", "-->") === null && named(nuspec("A", "1.0.0", "MIT").replace("<id>", "<!-- <id>")) === null,
  "a comment is cut so that no new one forms, and a manifest with one never closed names nothing");
// the name a manifest gives, its comments cut: a decoy in one is no name
const decoy = nuspec("Foo", "1.1.0", "MIT").replace("<id>Foo</id>", "<!--<id>foo.1</id><version>1.0.0</version>--><id>Foo</id>").replace("<version>1.1.0</version>", "<version >1.1.0</version>");
ok(JSON.stringify(named(nuspec("Foo", "1.1.0", "MIT"))) === '{"id":"Foo","version":"1.1.0"}' && named(decoy)?.id !== "foo.1" && named(nuspec("A", "1.0.0", "MIT").replace("</metadata>", "</metadata><metadata><id>B</id></metadata>")) === null,
  "a manifest's id and version are read from its one metadata part, past a decoy in a comment", JSON.stringify(named(decoy)));
// a tool, at one exact version
const t = toolsOf(JSON.stringify({ version: 1, isRoot: true, tools: { "dotnet-ef": { version: "9.0.1", commands: ["dotnet-ef"] }, "range-tool": { version: "[1.0,2.0)" }, "star-tool": { version: "1.*" }, "no-version": {} } }), "x/.config/dotnet-tools.json");
ok(t.tools.length === 1 && t.tools[0].id === "dotnet-ef" && t.failures.length === 3 && t.failures.every(f => f.includes("one exact version")), "a tool is held to one exact version: a range, a wildcard or none fails", JSON.stringify(t));

// a project: its lock file, a tools manifest, and a folder of package files the config names as a source
const root = path.join(tmp, "project"), source = path.join(root, "local-packages");
fs.mkdirSync(path.join(root, "src/App"), { recursive: true });
fs.mkdirSync(path.join(root, ".config"), { recursive: true });
fs.mkdirSync(source);
const files = { "Good.Pkg": ["1.0.0", "MIT"], "Plpkg": ["2.0.0", "MS-PL"], "Bad.Hash": ["1.0.0", "MIT"], "Tool.A": ["3.0.0", "Apache-2.0"], "Tool.B": ["1.0.0", "LicenseRef-Other"] };
const bytes = {};
for (const [id, [version, licence]] of Object.entries(files)) { bytes[id] = pkg(id, version, licence); fs.writeFileSync(path.join(source, `${id.toLowerCase()}.${version}.nupkg`), bytes[id]); }
const entry = (id, h = hash(bytes[id])) => ({ type: "Direct", requested: `[${files[id][0]}, )`, resolved: files[id][0], contentHash: h });
const lock = deps => `${JSON.stringify({ version: 1, dependencies: { "net9.0": deps } }, null, 2)}\n`;
const config = { ships: [], audit: "audit.json", nuget: { ships: ["src/App/packages.lock.json"], tools: [], sources: ["local-packages/"] } };
fs.writeFileSync(path.join(root, "audit.json"), '{ "entries": [] }\n');
const env = { ...process.env, GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid" };
const git = (...args) => execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
git("init", "-q", "-b", "main");
const commit = (deps, tools) => {
  fs.writeFileSync(path.join(root, "src/App/packages.lock.json"), lock(deps));
  fs.writeFileSync(path.join(root, ".config/dotnet-tools.json"), JSON.stringify({ version: 1, isRoot: true, tools }));
  git("add", "-A"); git("commit", "-q", "-m", "x");
  return git("ls-files").split("\n");
};
let into = 0;
const run = async (tracked, base = null, sources = null, baseConfig = config) => {
  const dir = path.join(tmp, `fetched-${++into}`);
  const fetched = await fetchAll(config, root, tracked, dir, sources ?? [path.resolve(source)], { base, baseConfig });
  const checked = check(config, root, dir, tracked, process.env, { base, baseConfig: config, fetched: true });
  return { fetched, checked, dir };
};

// what a base held: Plpkg under MS-PL, before the floor moved it off the list for what ships
commit({ "Plpkg": entry("Plpkg") }, {});
let tracked = commit({ "Good.Pkg": entry("Good.Pkg"), "Plpkg": entry("Plpkg") }, { "tool.a": { version: "3.0.0" } });
let r = await run(tracked, "HEAD^1");
ok(r.fetched.failures.length === 0 && fs.existsSync(path.join(r.dir, "good.pkg", "1.0.0", "good.pkg.nuspec")) && JSON.parse(fs.readFileSync(path.join(r.dir, "good.pkg", "1.0.0", ".nupkg.metadata"), "utf8")).source === path.resolve(source),
  "each locked package and tool is fetched from a source the config names, held to its content hash, and its manifest laid out as a restore lays out its own", JSON.stringify(r.fetched));
ok(r.checked.failures.length === 0 && r.checked.reports.length === 1 && r.checked.reports[0].includes("Plpkg@2.0.0") && r.checked.summary.includes("read before the restore"), "the check reads them before the restore: a package under MIT and a tool under Apache-2.0 pass, and one the base already held under MS-PL is reported and passes", JSON.stringify(r.checked));
const asTools = check(config, root, r.dir, tracked, process.env, { base: "HEAD^1", baseConfig: { ...config, nuget: { ...config.nuget, ships: [], tools: ["src/App/packages.lock.json"] } }, fetched: true });
const noConfig = check(config, root, r.dir, tracked, process.env, { base: "HEAD^1", baseConfig: null, fetched: true });
ok(noConfig.reports.length === 0 && noConfig.failures.length === 1 && noConfig.failures[0].includes("Plpkg@2.0.0"), "where the base held no config at this one's path, as when a pull request moves it, nothing counts as shipped there", JSON.stringify(noConfig));
ok(asTools.reports.length === 0 && asTools.failures.length === 1 && asTools.failures[0].includes("Plpkg@2.0.0"), "one the base held in a lock file its own config named as tools', which the pull request's config ships, fails: it was not shipped there", JSON.stringify(asTools));
tracked = commit({ "Good.Pkg": entry("Good.Pkg"), "Plpkg": entry("Plpkg") }, {});
fs.writeFileSync(path.join(root, "src/App/packages.lock.json"), lock({ "Plpkg": entry("Plpkg") })); git("commit", "-q", "-am", "only plpkg");
fs.writeFileSync(path.join(root, "src/App/packages.lock.json"), lock({})); git("commit", "-q", "-am", "none");
tracked = commit({ "Plpkg": entry("Plpkg") }, {});
r = await run(tracked, "HEAD^1");
ok(r.checked.failures.length === 1 && r.checked.failures[0].includes("Plpkg@2.0.0") && r.checked.failures[0].includes("MS-PL is off the list for what ships"), "one a pull request adds under MS-PL fails, it alone: the owner's yes is asked", JSON.stringify(r.checked));
tracked = commit({ "Bad.Hash": entry("Bad.Hash", hash(Buffer.from("another file"))) }, {});
r = await run(tracked);
ok(r.fetched.failures.length === 1 && r.fetched.failures[0].includes("content hash"), "a package file that is not the one its lock file names by its content hash fails", JSON.stringify(r.fetched));
tracked = commit({ "Not.There": { type: "Direct", requested: "[1.0.0, )", resolved: "1.0.0", contentHash: "x" } }, {});
r = await run(tracked);
ok(r.fetched.failures.length === 1 && r.fetched.failures[0].includes("in neither NuGet's registry nor a source"), "a package no source holds fails", JSON.stringify(r.fetched));
tracked = commit({}, { "tool.b": { version: "1.0.0" } });
r = await run(tracked, "HEAD^1");
ok(r.fetched.failures.length === 0 && r.checked.failures.length === 1 && r.checked.failures[0].toLowerCase().includes("tool.b@1.0.0") && r.checked.failures[0].includes("tools' list"), "a tool is held to the tools' list: one a pull request adds under a licence off it fails", JSON.stringify(r.checked));
tracked = commit({ "Good.Pkg": entry("Good.Pkg") }, { "tool.b": { version: "1.0.0" } });
r = await run(tracked, "HEAD^1");
ok(r.checked.failures.length === 0 && r.checked.reports.some(x => x.toLowerCase().includes("tool.b@1.0.0") && x.includes("held before this check read tools")), "one the base already held, never checked before, is reported and passes: no sync fails a project over it", JSON.stringify(r.checked));
const newSource = check(config, root, r.dir, tracked, process.env, { base: "HEAD^1", baseConfig: { ...config, nuget: { ...config.nuget, sources: [] } }, fetched: true });
const recased = check(config, root, r.dir, tracked, process.env, { base: "HEAD^1", baseConfig: { ...config, nuget: { ...config.nuget, sources: ["LOCAL-packages/"] } }, fetched: true });
ok(newSource.reports.length === 0 && newSource.failures.some(x => x.toLowerCase().includes("tool.b@1.0.0")) && recased.failures.some(x => x.toLowerCase().includes("tool.b@1.0.0")), "but where the pull request changed the sources it may come from, in any letter, it is judged as new", JSON.stringify([newSource, recased]));
tracked = commit({}, { "tool.c": { version: "1.*" } });
r = await run(tracked, "HEAD^1");
ok(r.fetched.failures.some(f => f.includes("one exact version")), "a tool at no one exact version fails", JSON.stringify(r.fetched));
r = await run(tracked);
ok(r.fetched.failures.length === 0 && r.fetched.reports.some(f => f.includes("one exact version")), "with no base to read it against, it is reported and passes", JSON.stringify(r.fetched));
tracked = commit({}, { "tool.gone": { version: "1.0.0" } });
r = await run(tracked, "HEAD^1");
ok(r.fetched.failures.length === 1 && r.fetched.failures[0].includes("in neither"), "a tool a pull request adds that no source holds fails", JSON.stringify(r.fetched));
fs.writeFileSync(path.join(root, "README.md"), "x\n"); tracked = commit({}, { "tool.gone": { version: "1.0.0" } });
r = await run(tracked, "HEAD^1");
ok(r.fetched.failures.length === 0 && r.fetched.reports.some(f => f.includes("in neither") && f.includes("held before")), "one the base already held that no source holds is reported and passes: no sync fails a project over a tool it never had read", JSON.stringify(r.fetched));
r = await run(tracked, "HEAD^1", null, { ...config, nuget: { ...config.nuget, sources: [] } });
const moved = await run(tracked, "HEAD^1", null, null);
ok(r.fetched.failures.length === 1 && moved.fetched.failures.length === 1, "but where the pull request changed the sources the config names, or the base held no config at its path, it is judged as new", JSON.stringify([r.fetched, moved.fetched]));
// a tools manifest outside .config/, which dotnet reads too, saved with a byte-order mark, which dotnet reads past
fs.writeFileSync(path.join(root, "dotnet-tools.json"), `\uFEFF${JSON.stringify({ version: 1, isRoot: true, tools: { "tool.d": { version: "2.*" } } })}`);
tracked = commit({}, {});
r = await run(tracked, "HEAD^1");
ok(r.fetched.failures.some(f => f.startsWith("dotnet-tools.json: tool.d")) && r.checked.failures.every(f => !f.includes("is not JSON")), "a tools manifest at a folder's top is read as one in .config/ is, past a byte-order mark", JSON.stringify(r));
fs.rmSync(path.join(root, "dotnet-tools.json"));
// a folder source as NuGet reads one: names in any case, a version as NuGet compares it, or a folder for each
const other = path.join(tmp, "other-source"), nested = path.join(source, "Nested.Pkg", "1.0.0");
fs.mkdirSync(other); fs.mkdirSync(nested, { recursive: true });
files["Mixed.Case"] = ["1.0.0", "MIT"]; bytes["Mixed.Case"] = pkg("Mixed.Case", "1.0.0", "MIT");
fs.writeFileSync(path.join(source, "Mixed.Case.1.0.nupkg"), bytes["Mixed.Case"]);
files["Nested.Pkg"] = ["1.0.0", "MIT"]; bytes["Nested.Pkg"] = pkg("Nested.Pkg", "1.0.0", "MIT");
fs.writeFileSync(path.join(nested, "Nested.Pkg.1.0.0.nupkg"), bytes["Nested.Pkg"]);
fs.writeFileSync(path.join(other, "good.pkg.1.0.0.nupkg"), pkg("Good.Pkg", "1.0.0", "Apache-2.0"));
tracked = commit({ "Mixed.Case": entry("Mixed.Case"), "Nested.Pkg": entry("Nested.Pkg"), "Good.Pkg": entry("Good.Pkg") }, {});
r = await run(tracked, "HEAD^1", [other, path.resolve(source)]);
ok(r.fetched.failures.length === 0 && r.fetched.summary.startsWith("3 of 3") && JSON.parse(fs.readFileSync(path.join(r.dir, "good.pkg", "1.0.0", ".nupkg.metadata"), "utf8")).source === path.resolve(source),
  "a folder's package is found by any case of its name, by its version as NuGet compares it, or in a folder of its own; and where one source gives another file, the next is tried", JSON.stringify(r.fetched));
// a source whose index cannot be read fails, as it fails a restore: it is not left to the check after the restore
r = await run(tracked, "HEAD^1", ["https://127.0.0.1:9/v3/index.json", path.resolve(source)]);
ok(r.fetched.failures.length === 3 && r.fetched.failures.every(f => f.includes("could not be read")) && r.fetched.notes.length === 0, "a source whose index cannot be read fails each package, and leaves none to after the restore", JSON.stringify(r.fetched));
// a tool's file is the one its manifest names: a folder's foo.1.1.0.nupkg is no tool foo.1 at 1.0.0
fs.writeFileSync(path.join(other, "foo.1.1.0.nupkg"), pkg("Foo", "1.1.0", "MIT"));
tracked = commit({}, { "foo.1": { version: "1.0.0" } });
r = await run(tracked, "HEAD^1", [other]);
ok(r.fetched.failures.length === 1 && r.fetched.failures[0].includes("names Foo@1.1.0 in its manifest"), "a tool's file whose manifest names another id or version fails", JSON.stringify(r.fetched));
// a tool whose manifest names a licence file, read by hand into the audit, and one under a licence off the tools' list
// that the owner accepted: both stand in the check before the restore and in the one after it, which no restore brings
fs.writeFileSync(path.join(source, "tool.f.1.0.0.nupkg"), zip([["Tool.F.nuspec", nuspec("Tool.F", "1.0.0", "MIT").replace('<license type="expression">MIT</license>', '<license type="file">LICENSE.txt</license>')]]));
fs.writeFileSync(path.join(root, "audit.json"), JSON.stringify({ entries: [{ name: "Tool.F@1.0.0", kind: "nuget", licence: "MIT", how: "read by hand" }] }));
config.nuget.accepted = [{ package: "Tool.B@1.0.0", licence: "LicenseRef-Other", ships: false, yes: "the owner, 13 November 2026: take it" }];
tracked = commit({}, { "tool.f": { version: "1.0.0" }, "tool.b": { version: "1.0.0" } });
r = await run(tracked);
const restored = path.join(tmp, "restored-none");
fs.mkdirSync(restored);
const after = check(config, root, restored, tracked, process.env, { base: null });
ok(r.fetched.failures.length === 0 && r.checked.failures.length === 0 && after.failures.length === 0, "a tool's audit entry and its yes stand both before the restore and after it", JSON.stringify([r.checked.failures, after.failures]));
delete config.nuget.accepted;
fs.writeFileSync(path.join(root, "audit.json"), '{ "entries": [] }\n');

// a real package from nuget.org, where it can be reached (through the proxy the machine names, if any)
const reach = spawnSync(process.execPath, ["-e", "fetch(process.argv[1], { method: 'HEAD', signal: AbortSignal.timeout(15000) }).then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))", REGISTRY], { env: { ...process.env, NODE_USE_ENV_PROXY: "1" } }).status === 0;
ok(reach || !process.env.GITHUB_ACTIONS, "on GitHub's runners nuget.org can be reached");
if (!reach) console.log("skip the real package: nuget.org cannot be reached from here");
else {
  const real = path.join(tmp, "real");
  fs.mkdirSync(path.join(real, "src/App"), { recursive: true });
  fs.writeFileSync(path.join(real, "src/App/packages.lock.json"), lock({ "Newtonsoft.Json": { type: "Direct", requested: "[13.0.3, )", resolved: "13.0.3", contentHash: "HrC5BXdl00IP9zeV+0Z848QWPAoCr9P3bDEZguI+gkLcBKAOxix/tLEAAHC+UvDNPv4a2d18lOReHMOagPa+zQ==" } }));
  const out = spawnSync(process.execPath, ["-e", `import(${JSON.stringify(new URL("./nuget-fetch.mjs", import.meta.url).href)}).then(m => m.fetchAll(${JSON.stringify({ nuget: { ships: ["src/App/packages.lock.json"], tools: [] } })}, ${JSON.stringify(real)}, ["src/App/packages.lock.json"], ${JSON.stringify(path.join(real, "fetched"))}, [${JSON.stringify(REGISTRY)}])).then(r => console.log(JSON.stringify(r)))`], { env: { ...process.env, NODE_USE_ENV_PROXY: "1" }, encoding: "utf8" });
  const got = JSON.parse(out.stdout || "{}");
  const manifest = path.join(real, "fetched", "newtonsoft.json", "13.0.3", "newtonsoft.json.nuspec");
  ok(got.failures?.length === 0 && fs.existsSync(manifest) && fs.readFileSync(manifest, "utf8").includes("MIT"), "a real package is fetched from nuget.org and held to the content hash a real lock file names", `${out.stdout}${out.stderr}`);
}

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the fetch before the NuGet check's restore`);
process.exitCode = failed ? 1 : 0;
