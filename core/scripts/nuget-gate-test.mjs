// Checks the NuGet check's own steps (.github/workflows/nuget.yml): first "Does the pull request change what NuGet
// reads?", then the whole job, each run as GitHub runs it (workflow-run.mjs, beside this file), on scratch pull
// requests of a .NET project that holds one real package in its lock file: it says to restore wherever a pull request
// changes a file it names, and, where none changed, wherever NuGet finds a lock file that no longer holds what its
// project asks for, however the project asks (in an import, two imports on a line, through a property, a link, a name
// outside plain ASCII), or a package downloaded beside it; and not to where only other files change. No package is
// downloaded: the step restores against an empty source. The whole job, on a project with no package: its restore and
// its check pass, and a lock file that no longer holds what its project asks for fails the restore. Where there is no
// .NET SDK (never on GitHub's runners) only the first look is tried. On Linux and on Windows. Git, bash, jq, the .NET
// SDK and Node's own modules.
//
//   node scripts/nuget-gate-test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "./workflow-run.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${String(detail).slice(0, 800).replace(/\n/g, "\n     ")}`}`); } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/nuget.yml"), "utf8");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nuget-gate-test-"));
process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } });
const home = path.join(tmp, "home");
fs.mkdirSync(path.join(home, "AppData", "Roaming"), { recursive: true });
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(GIT_|GITHUB_|RUNNER_|ACTIONS_|CI$|NUGET_|DOTNET_CLI_HOME$)|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(name)));
Object.assign(env, { GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid",
  HOME: home, USERPROFILE: home, APPDATA: path.join(home, "AppData", "Roaming"), LOCALAPPDATA: path.join(home, "AppData", "Local"), DOTNET_CLI_HOME: home, NUGET_HTTP_CACHE_PATH: path.join(tmp, "http-cache"),
  DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1", MSBUILDDISABLENODEREUSE: "1", DOTNET_CLI_USE_MSBUILD_SERVER: "0" });
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const version = spawnSync("dotnet", ["--version"], { env, encoding: "utf8" });
const sdk = version.status === 0;
ok(sdk || !process.env.GITHUB_ACTIONS, "on GitHub's runners there is a .NET SDK, so NuGet's own word is asked here as there");
const tfm = `net${sdk ? version.stdout.trim().split(".")[0] : "9"}.0`;

const project = (imports = '  <Import Project="..\\..\\build\\deps.xml" />\n') => `<Project Sdk="Microsoft.NET.Sdk">\n${imports}  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n    <TargetFramework>${tfm}</TargetFramework>\n    <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>\n  </PropertyGroup>\n  <ItemGroup>\n    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />\n  </ItemGroup>\n</Project>\n`;
const LOCK = `${JSON.stringify({ version: 1, dependencies: { [tfm]: { "Newtonsoft.Json": { type: "Direct", requested: "[13.0.3, )", resolved: "13.0.3", contentHash: "HrC5BXdl00IP9zeV+0Z848QWPAoCr9P3bDEZguI+gkLcBKAOxix/tLEAAHC+UvDNPv4a2d18lOReHMOagPa+zQ==" } } } }, null, 2)}\n`;
const EMPTY = "<Project>\n</Project>\n";
const ADDS = '<Project>\n  <ItemGroup>\n    <PackageReference Include="Serilog" Version="4.0.0" />\n  </ItemGroup>\n</Project>\n';
const START = {
  "README.md": "# A project\n",
  "src/App/App.csproj": project(),
  "src/App/Program.cs": "System.Console.WriteLine(1);\n",
  "src/App/packages.lock.json": LOCK,
  "build/deps.xml": EMPTY,
  "checks/licences.json": '{ "audit": "checks/audit.json", "nuget": { "ships": ["src/App/packages.lock.json"], "tools": [], "sources": ["https://example.invalid/v3/index.json", "local-packages/"] } }\n',
  "checks/audit.json": '{ "entries": [] }\n',
  "local-packages/readme.txt": "packages\n",
  ".github/workflows/nuget.yml": "name: nuget\n",
  ".github/workflows/restore.yml": "name: restore\n",
};
let n = 0;
// The step's answer on a pull request that changes `files` (null removes one) from a project that starts as `start`.
function gate(files, { start = {}, base = true, caller = "nuget.yml", link = null } = {}) {
  const dir = path.join(tmp, `repo-${++n}`);
  fs.mkdirSync(dir);
  git(dir, "init", "-q", "-b", "main");
  const put = set => { for (const [f, text] of Object.entries(set)) { const at = path.join(dir, f); if (text === null) fs.rmSync(at); else { fs.mkdirSync(path.dirname(at), { recursive: true }); fs.writeFileSync(at, text); } } };
  put({ ...START, ...start });
  if (link) fs.symlinkSync(link[1], path.join(dir, link[0]));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  const baseSha = git(dir, "rev-parse", "HEAD");
  if (typeof files === "function") files(dir); else put(files);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--allow-empty", "-m", "a change");
  const github = { event_name: "pull_request", repository: "someone/project", workflow_ref: `someone/project/.github/workflows/${caller}@refs/pull/1/merge`,
    event: { pull_request: { base: { sha: base ? baseSha : "" } } } };
  const [job] = runWorkflow(workflow, { inputs: { config: "checks/licences.json" }, github, base: env, workspace: () => dir, uses: { "actions/checkout": () => {}, "actions/setup-node": () => {} }, until: "what", temp: tmp });
  const step = job.steps.find(s => s.name === "Does the pull request change what NuGet reads?");
  return { run: job.outputs.what?.outputs.run, out: step?.out ?? JSON.stringify(job.steps) };
}
const restores = (what, ...args) => { const r = gate(...args); ok(r.run === "true", `${what}: it restores`, r.out); return r; };
const skips = (what, ...args) => { const r = gate(...args); ok(r.run === "false", `${what}: no restore`, r.out); };

// the first look, by name
for (const [what, files, opts] of [
  ["one that changes a project file", { "src/App/App.csproj": project().replace("</Project>", "  <!-- a note -->\n</Project>") }],
  ["one that changes a lock file", { "src/App/packages.lock.json": LOCK.replace("\n}\n", "\n}\n\n") }],
  ["one that adds a response file beside a project file, spelt in any case", { "src/App/msbuild.RSP": "-p:RestoreSources=x\n" }],
  ["one that changes a NuGet.Config, spelt in any case", { "NuGet.Config": "<configuration/>\n" }],
  ["one that changes the licence config", { "checks/licences.json": START["checks/licences.json"].replace("[]", "[ ]") }],
  ["one that changes the audit the config names", { "checks/audit.json": '{ "entries": [ ] }\n' }],
  ["one that changes a folder the config names as a source", { "local-packages/a.nupkg": "x" }],
  ["one that adds a tools manifest at a folder's top, which dotnet reads as one in .config/", { "dotnet-tools.json": '{ "version": 1, "isRoot": true, "tools": {} }\n' }],
  ["one that changes the calling workflow, under its own name", { ".github/workflows/restore.yml": "name: restore again\n" }, { caller: "restore.yml" }],
  ["a pull request with no base to read it against", { "README.md": "# More\n" }, { base: false }],
]) { const r = restores(what, files, opts); if (what !== "a pull request with no base to read it against") ok(r.out.includes("Changed:"), `${what}: named by the first look`, r.out); }

// the second look, NuGet's own word, where no file the first names changed
if (!sdk) console.log("skip NuGet's own word: no .NET SDK here");
else {
  skips("a pull request that changes only a doc", { "README.md": "# A project\n\nMore.\n" });
  skips("one that changes only another workflow", { ".github/workflows/other.yml": "name: other\n" });
  skips("one that changes an imported file in a way that asks for nothing new", { "build/deps.xml": "<Project>\n  <PropertyGroup>\n    <Nothing>x</Nothing>\n  </PropertyGroup>\n</Project>\n" });
  restores("one that adds a package only in a file a project file imports", { "build/deps.xml": ADDS });
  restores("one that adds it in the second of two imports on a line", { "build/two.xml": ADDS }, { start: { "src/App/App.csproj": project('  <Import Project="..\\..\\build\\deps.xml" /><Import Project="..\\..\\build\\two.xml" />\n'), "build/two.xml": EMPTY } });
  restores("one that adds it in a file a property imports", { "build/two.xml": ADDS }, { start: { "Directory.Build.props": "<Project>\n  <PropertyGroup>\n    <CustomAfterMicrosoftCommonTargets>$(MSBuildThisFileDirectory)build/two.xml</CustomAfterMicrosoftCommonTargets>\n  </PropertyGroup>\n</Project>\n", "build/two.xml": EMPTY } });
  restores("one that adds it in an imported file whose name is not plain ASCII", { "build/Ünï.xml": ADDS }, { start: { "build/deps.xml": '<Project>\n  <Import Project="Ünï.xml" />\n</Project>\n', "build/Ünï.xml": EMPTY } });
  restores("one that adds a package in an import, where the project's record of its restore lies outside the checkout", { "build/deps.xml": '<Project>\n  <ItemGroup>\n    <PackageDownload Include="Newtonsoft.Json" Version="[12.0.1]" />\n  </ItemGroup>\n</Project>\n' },
    { start: { "Directory.Build.props": `<Project>\n  <PropertyGroup>\n    <BaseIntermediateOutputPath>${path.join(tmp, "elsewhere", String(n + 1)).replace(/\\/g, "/")}/</BaseIntermediateOutputPath>\n  </PropertyGroup>\n</Project>\n` } });
  restores("one that downloads a package beside the lock file, of a name it locks at another version", { "build/deps.xml": '<Project>\n  <ItemGroup>\n    <PackageDownload Include="Newtonsoft.Json" Version="[12.0.1]" />\n  </ItemGroup>\n</Project>\n' });
  let canLink = true;
  try { fs.symlinkSync(path.join(tmp, "nowhere"), path.join(tmp, "probe")); } catch { canLink = false; }
  if (!canLink) console.log("skip the links: this machine lets the test make none");
  else restores("one that points an imported link at a file that adds a package", dir => { fs.rmSync(path.join(dir, "build/link.xml")); fs.symlinkSync("adds.xml", path.join(dir, "build/link.xml")); },
    { start: { "build/deps.xml": '<Project>\n  <Import Project="link.xml" />\n</Project>\n', "build/empty.xml": EMPTY, "build/adds.xml": ADDS }, link: ["build/link.xml", "empty.xml"] });
}

// the whole job, its restore and its check run as GitHub runs them, on a project that holds the core as core/
if (sdk) {
  const whole = (files, start = {}) => {
    const dir = path.join(tmp, `whole-${++n}`);
    fs.mkdirSync(dir);
    git(dir, "init", "-q", "-b", "main");
    fs.cpSync(root, path.join(dir, "core"), { recursive: true, filter: src => !["/.git", "/node_modules", "/reports"].some(x => src.replace(/\\/g, "/").endsWith(x)) });
    const put = set => { for (const [f, text] of Object.entries(set)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); } };
    put({ "src/App/App.csproj": project("").replace(/  <ItemGroup>[\s\S]*?<\/ItemGroup>\n/, ""), "src/App/Program.cs": "System.Console.WriteLine(1);\n",
      "src/App/packages.lock.json": `${JSON.stringify({ version: 1, dependencies: { [tfm]: {} } }, null, 2)}\n`,
      "checks/licences.json": '{ "ships": [], "audit": "checks/licences-audit.json", "scan": { "served": [], "skip": [] }, "nuget": { "ships": ["src/App/packages.lock.json"], "tools": [] } }\n',
      "checks/licences-audit.json": '{ "entries": [] }\n', ...start });
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "base");
    const baseSha = git(dir, "rev-parse", "HEAD");
    put(files);
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "a change");
    const github = { event_name: "pull_request", repository: "someone/project", workflow_ref: "someone/project/.github/workflows/nuget.yml@refs/pull/1/merge", event: { pull_request: { base: { sha: baseSha } } } };
    const [job] = runWorkflow(workflow, { inputs: { config: "checks/licences.json" }, github, base: env, workspace: () => dir, uses: { "actions/checkout": () => {}, "actions/setup-node": () => {} }, temp: tmp });
    return { passed: job.passed, ran: job.steps.filter(x => x.ran).map(x => x.name), out: job.steps.map(x => x.out).join("") };
  };
  const good = whole({ "src/App/App.csproj": project("").replace(/  <ItemGroup>[\s\S]*?<\/ItemGroup>\n/, "").replace("</Project>", "  <!-- a note -->\n</Project>") });
  ok(good.passed && good.ran.includes("Restore each project file from its lock file alone") && good.ran.includes("Every package one exact version, and under a licence on its list"), "the whole job: a project file changed, the restore runs from the lock file and the check passes", good.out);
  const FETCH = "Every locked package and tool, fetched before the restore and held to its list";
  ok(good.ran.indexOf(FETCH) >= 0 && good.ran.indexOf(FETCH) < good.ran.indexOf("Restore each project file from its lock file alone"), "and every package's licence is read before the restore, which runs the pull request's build files", good.ran.join(" | "));
  // (where the first look itself restored, the pull request's build files have run: the read before the restore is
  // left out, nothing it reads having changed from the base)
  const bare = project("").replace(/  <ItemGroup>[\s\S]*?<\/ItemGroup>\n/, "");
  const built = whole({ "build/deps.xml": ADDS }, { "src/App/App.csproj": bare.replace("<PropertyGroup>", '<Import Project="..\\..\\build\\deps.xml" />\n  <PropertyGroup>'), "build/deps.xml": EMPTY });
  ok(!built.passed && !built.ran.includes(FETCH) && built.out.includes("the licence read before the restore is left out"), "where the first look restored, the read before the restore is left out, and the restore fails what no lock file holds", built.out);
  const stale = whole({ "src/App/App.csproj": project("") });
  ok(!stale.passed && /NU1004/.test(stale.out), "and where the project asks for a package its lock file does not hold, the restore fails the job", stale.out);
}

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the NuGet check's own steps`);
process.exitCode = failed ? 1 : 0;
