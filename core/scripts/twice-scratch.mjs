// The scratch core and project the tests of what a project holds twice share (scripts/twice.mjs; #1087): a scratch core
// of two commits, the earlier and the pin, and a project holding its copy and each kind exactly and nearly; the script
// run as a session runs it. Tests only. Node's own modules and git.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CORE } from "./core-address.mjs";
import { BEGIN, END } from "./core-owned.mjs";
import { untar } from "./releases.mjs";
import { root, scratchDir } from "./scratch-core.mjs";

export const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" }).trim();
export const write = (dir, files) => { for (const [f, t] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), t); } };

export const RULE = "- **A rule of the core.** By default every session reads the queue before it starts any task, and says what it took up in its pull request.";
export const NEAR = "- **A rule of the project.** By default every session reads the queue before it starts any task, and says what it took up in its own description.";
export const OTHER = "A paragraph of the project's own that says something the core never says, about its build, its players and its own release.";
export const TWICE = "Every pull request of this project runs its game's whole suite on a phone before it is marked ready, and says how long it took.";
export const GUIDE_OLD = `# A guide\n\n${"The core's guide, as an earlier copy held it, long enough to be compared as a file. ".repeat(3)}\n`;
export const GUIDE_NEW = `# A guide\n\n${"The core's guide, as the copy holds it now, long enough to be compared as a file again. ".repeat(3)}\n`;
export const PLACE = `# A place\n\n${"A file the core moved from one folder to another, its bytes unchanged by the move. ".repeat(3)}\n`;
export const A = `// The core's script a, which reads its sibling b and nothing else at all, long enough.\nimport { b } from "./b.mjs";\nexport const a = () => b() + 1;\n`;
export const B = `// The core's script b, which a reads, and which reads nothing of its own at all here.\nexport const b = () => 41;\n`;
export const C = "// The core's script c, which reads its settings beside it through a template literal, long enough.\nexport const c = () => JSON.parse(require(\"fs\").readFileSync(new URL(`./c.json`, import.meta.url))).v;\n";
export const FLOOR = `# The floor\n\n${"A rule of the floor, which no script takes out of a project without its owner's word. ".repeat(3)}\n`;
export const SAFE = `# Safe\n\n${"A file of the core's that the project's AGENTS.md calls one of its safety rules. ".repeat(3)}\n`;
export const RUN = `#!/bin/sh\n# The core's script run.sh, kept as a plain file by the core, long enough to be compared.\nexec node "$@"\n`;
// (files of the core's whose names no file of the scratch core or project holds, so that they go)
export const LONE = `# A page\n\n${"A page of the core's that no file of the core or the project names, long enough to be compared. ".repeat(2)}[the site](https://example.com/x.md).\n`;
export const [STALE_OLD, STALE_NEW] = ["as an earlier copy held it", "as the copy holds it now"].map(w => `# A page\n\n${`Another page of the core's, ${w}, that nothing names, long enough to be compared. `.repeat(3)}\n`);
export const EXTRA = `# Extra\n\n${"A file of the core's that a workflow of the core's, held whole in the project, names. ".repeat(3)}\n`;

// The scratch core: an earlier commit and the pin, on main; the project's copy is the pin's tree.
export const tmp = scratchDir("twice-");
export const core = path.join(tmp, "core-repo");
fs.mkdirSync(core);
git(core, "init", "-q", "-b", "main");
write(core, { "tasks/x.md": `# x\n\n${RULE}\n`, "docs/guide.md": GUIDE_OLD, "old/place.md": PLACE, "scripts/a.mjs": A, "scripts/b.mjs": B, "scripts/c.mjs": C, "scripts/c.json": `{ "v": 1 }\n`, "floor/security.md": FLOOR, "docs/safe.md": SAFE, "docs/extra.md": EXTRA, "scripts/run.sh": RUN, "docs/zephyr-notes.md": LONE, "docs/quartz.md": STALE_OLD, "docs/ref.md": "# A reference\n\nThe guide stands at docs/guide.md, for whoever reads this file.\n", "gone.md": `${"A file the core took out. ".repeat(6)}\n` });
git(core, "add", "-A"); git(core, "commit", "-qm", "earlier");
export const earlier = git(core, "rev-parse", "HEAD");
fs.rmSync(path.join(core, "gone.md"));
fs.mkdirSync(path.join(core, "new"));
fs.renameSync(path.join(core, "old/place.md"), path.join(core, "new/place.md"));
write(core, { "docs/guide.md": GUIDE_NEW, "docs/quartz.md": STALE_NEW });
git(core, "add", "-A"); git(core, "commit", "-qm", "pin");
export const pin = git(core, "rev-parse", "HEAD");

export const CALL = `${CORE}/.github/workflows/copies.yml@${pin}`;
export const WORKFLOW = `name: own\non: pull_request\njobs:\n  one:\n    uses: ${CALL}\n    with:\n      config: checks/copies.json\n  two:\n    uses: ${CALL}\n    with:\n      config: checks/copies.json\n  three:\n    uses: ${CALL}\n    with:\n      config: checks/other.json\n  after:\n    needs: one\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo done\n`;

// The project: its copy, and each kind exactly and nearly.
export function project(name) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir);
  git(dir, "init", "-q", "-b", "main");
  untar((fs.mkdirSync(path.join(dir, "core")), path.join(dir, "core")), execFileSync("git", ["archive", pin], { cwd: core }));
  write(dir, {
    "core-manifest.md": `# The core manifest\n\nCore: ${CORE} at ${pin}, copied whole under core/\n`,
    "AGENTS.md": `# The project\n\n${NEAR}\n\n${OTHER}\n\n${TWICE}\n\n${BEGIN}\n${RULE}\n${END}\n\nSafety rules: \`docs/safe.md\`.\n`,
    "CLAUDE.md": `# Claude\n\n${TWICE}\n\nIt reads core/old/place.md, core/gone.md and core/tasks/x.md, and docs/guide.md.\n`,
    "SECURITY.md": `# Security\n\n${RULE}\n`,
    "README.md": `# Read me\n\nThe guide: [the guide](docs/guide.md); the old place: core/old/place.md.\n`,
    "docs/guide.md": GUIDE_OLD, "notes/zephyr-notes.md": LONE, "docs/quartz.md": STALE_OLD,
    "docs/notes.md": "# Notes\n\nSee [the guide](./guide.md), [again](guide.md), [by its reference][g] and <a href=\"guide.md\">by HTML</a>.\n\n[g]: guide.md\n",
    "tools/a.mjs": A, "tools/b.mjs": B,
    "lib/a.mjs": A, "lib/b.mjs": B.replace("41", "42"),
    "run.mjs": `import { a } from "./tools/a.mjs";\nimport { a as c } from "./lib/a.mjs";\nconsole.log(a(), c());\n`,
    ".github/workflows/own.yml": WORKFLOW,
    ".github/workflows/build.yml": "name: build\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: node tools/a.mjs\n",
    ".github/workflows/core-made.yml": "# The core's file: a workflow it holds whole.\nname: made\non: push\njobs:\n  read:\n    runs-on: ubuntu-latest\n    steps:\n      - run: cat docs/extra.md\n",
    "floor/security.md": FLOOR, "docs/safe.md": SAFE, "docs/extra.md": EXTRA,
    "tools/c.mjs": C, "tools/c.json": `{ "v": 2 }\n`,
    "reports/2026-11-01.md": `# A report\n\n${RULE}\n\nIt names core/gone.md.\n`,
  });
  return dir;
}

// The script run as a session runs it.
export const run = (dir, ...args) => spawnSync(process.execPath, [path.join(root, "scripts/twice.mjs"), ...args], { cwd: dir, encoding: "utf8" });
export const fetched = ["--fetched", path.join(core, ".git"), "--since", earlier];
