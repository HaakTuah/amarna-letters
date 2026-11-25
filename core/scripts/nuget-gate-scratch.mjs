// The scratch of the NuGet check's tests (nuget-gate-test.mjs, nuget-gate-network-test.mjs): a folder of its own, the
// environment of every call (a home of its own, no runner or host variable, the core's packages installed from a copy of
// the machine's npm cache so no registry is asked of: #772), git, whether there is a .NET SDK and the target framework it
// names, the project file the tests write, and `whole(files, start)`, the whole job of .github/workflows/nuget.yml run as
// GitHub runs it (scripts/workflow-run.mjs) on a project that holds the core as core/, with `start` written first and
// `files` as the pull request's change. Tests only. Git, the .NET SDK, npm and Node's own modules.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { runWorkflow } from "./workflow-run.mjs";
import { npmCacheCopy, root, scratchDir } from "./scratch-core.mjs";

export function nugetScratch(prefix) {
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/nuget.yml"), "utf8");
  const tmp = scratchDir(prefix);
  const home = path.join(tmp, "home");
  fs.mkdirSync(path.join(home, "AppData", "Roaming"), { recursive: true });
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(GIT_|GITHUB_|RUNNER_|ACTIONS_|CI$|NUGET_|DOTNET_CLI_HOME$)|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(name)));
  Object.assign(env, { GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid",
    HOME: home, USERPROFILE: home, APPDATA: path.join(home, "AppData", "Roaming"), LOCALAPPDATA: path.join(home, "AppData", "Local"), DOTNET_CLI_HOME: home, NUGET_HTTP_CACHE_PATH: path.join(tmp, "http-cache"),
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1", MSBUILDDISABLENODEREUSE: "1", DOTNET_CLI_USE_MSBUILD_SERVER: "0" });
  // (the whole job installs the core's packages as the runner's own job did, from a copy of its npm cache made here, so it
  // reaches no registry: #772)
  const npmCache = npmCacheCopy(tmp);
  if (npmCache) Object.assign(env, { npm_config_cache: npmCache, npm_config_prefer_offline: "true" });
  const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const version = spawnSync("dotnet", ["--version"], { env, encoding: "utf8" });
  const sdk = version.status === 0;
  const tfm = `net${sdk ? version.stdout.trim().split(".")[0] : "9"}.0`;
  const project = (imports = '  <Import Project="..\\..\\build\\deps.xml" />\n') => `<Project Sdk="Microsoft.NET.Sdk">\n${imports}  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n    <TargetFramework>${tfm}</TargetFramework>\n    <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>\n  </PropertyGroup>\n  <ItemGroup>\n    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />\n  </ItemGroup>\n</Project>\n`;
  let n = 0;
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
    const out = job.steps.map(x => x.out).join("");
    return { passed: job.passed, ran: [...out.matchAll(/^== (.+)$/gm)].map(m => m[1].trim()), out };
  };
  return { tmp, env, git, sdk, tfm, project, whole, version };
}
