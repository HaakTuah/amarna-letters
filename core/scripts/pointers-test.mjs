// Checks the pointer check (pointers.mjs, beside this file) on a small project made for it: its rule files with either
// line ending, a pointer that leads nowhere, and a project with no SECURITY.md yet. Run by the core's tests workflow
// (.github/workflows/tests.yml).
//
//   node scripts/pointers-test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

let failed = 0;
const ok = (cond, what) => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) failed++; };
const here = fileURLToPath(new URL(".", import.meta.url));
const FILES = {
  "AGENTS.md": "# A project\n\n## Where things are\n\nIts rules: `SECURITY.md`, rule 3, and \"Running it\" in `docs/developing.md`.\n",
  "SECURITY.md": "# Security\n\n**3. The protected files,** here, **the rule files:** `docs/developing.md`;\n",
  "docs/developing.md": "# Developing\n\n## Running it\n\nAs \"Where things are\" in `AGENTS.md` says.\n",
};
function run(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pointers-test-"));
  try {
    for (const [f, text] of Object.entries(files)) { fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); }
    fs.mkdirSync(path.join(dir, "core/scripts"), { recursive: true });
    for (const f of ["pointers.mjs", "rule-files.mjs"]) fs.copyFileSync(path.join(here, f), path.join(dir, "core/scripts", f));
    for (const args of [["init", "-q"], ["add", "-A"]]) execFileSync("git", args, { cwd: dir, stdio: "ignore" });
    const r = spawnSync(process.execPath, [path.join(dir, "core/scripts/pointers.mjs")], { cwd: dir, encoding: "utf8" });
    return { code: r.status, out: r.stdout + r.stderr };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const crlf = files => Object.fromEntries(Object.entries(files).map(([f, text]) => [f, text.replaceAll("\n", "\r\n")]));
const broken = { ...FILES, "AGENTS.md": FILES["AGENTS.md"].replace("Running it", "Shipping it") };
const { "SECURITY.md": _, ...bare } = FILES;

let r = run(FILES);
ok(r.code === 0 && /^ok /m.test(r.out), "rule files whose pointers all lead somewhere pass");
r = run(crlf(FILES));
ok(r.code === 0 && /^ok /m.test(r.out), "the same files with a Windows checkout's line endings pass");
for (const [files, ending] of [[broken, "either"], [crlf(broken), "a Windows"]]) {
  r = run(files);
  ok(r.code === 1 && /AGENTS\.md:5: "shipping it" is no heading/.test(r.out), `a section that is not there fails, named with its line, with ${ending} line ending`);
}
r = run(bare);
ok(r.code === 1 && /^FAIL: the project has no SECURITY\.md yet/m.test(r.out) && !/^\s+at /m.test(r.out), "a project with no SECURITY.md yet is told so in a line, with no stack");
// a floor rule and an archive item, read in the project's copy of the core's floor and archive
const CORE = { "core/floor/security.md": "# The floor\n\n**1. Nothing secret.** Text.\n\n**8. Reviews.** As rule 1 says.\n", "core/floor/topics.md": "# Topics\n\n**10. Licences.** Text.\n",
  "core/archive/instructions/items-001.md": "# Items\n\n1. **1 November 2026**. Words.\n\n2. **2 November 2026**. Words.\n" };
const cites = text => ({ ...FILES, ...CORE, "AGENTS.md": `${FILES["AGENTS.md"]}\n${text}\n` });
r = run(cites("As floor rules 8 and 10 say, and floor rule 1 (core archive 1 and 2; core archive 1 to 2)."));
ok(r.code === 0 && !/floor rule|core archive/.test(r.out.split("\n").filter(l => l.startsWith("note")).join("\n")), "a floor rule is read in the floor's files, by its bold number, and an archive item in the archive's item files");
r = run(cites("As floor rule 19 says (core archive 999)."));
ok(r.code === 0 && /note .*floor rule 19: no such rule in the floor/.test(r.out) && /note .*core archive 999: no such item in the archive/.test(r.out), "in a project, a floor rule or an archive item that is not there is listed, each named, and fails nothing: a sync never fails a project over a citation of its own");
ok(/read and not found/.test(r.out) && !/\(2 in forms it cannot read/.test(r.out), "and it is listed as read and not found, not as a form it cannot read", r.out);
// the core's own run: there it fails
const coreDir = fs.mkdtempSync(path.join(os.tmpdir(), "pointers-test-core-"));
try {
  const put = (f, text) => { fs.mkdirSync(path.join(coreDir, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(coreDir, f), text); };
  put("floor/security.md", "# The floor\n\n**1. Nothing secret.** As rule 1 says, and rule 10 (core archive 1).\n");
  put("floor/topics.md", "# Topics\n\n**10. Licences.** Text.\n");
  put("floor/threat-model.md", "# The threat model\n\n19. A list item, no rule.\n");
  put("modules/a.md", "# A module\n\nAs floor rule 19 says (core archive 999).\n");
  put("archive/instructions/items-001.md", "# Items\n\n1. **1 November 2026**. Words.\n");
  fs.mkdirSync(path.join(coreDir, "scripts"));
  for (const f of ["pointers.mjs", "rule-files.mjs"]) fs.copyFileSync(path.join(here, f), path.join(coreDir, "scripts", f));
  for (const args of [["init", "-q"], ["add", "-A"]]) execFileSync("git", args, { cwd: coreDir, stdio: "ignore" });
  const c = spawnSync(process.execPath, [path.join(coreDir, "scripts/pointers.mjs"), "--core"], { cwd: coreDir, encoding: "utf8" });
  ok(c.status === 1 && /FAIL: a broken pointer: modules\/a\.md:3: floor rule 19/.test(c.stdout + c.stderr) && /core archive 999/.test(c.stdout + c.stderr) && !/floor\/security\.md/.test(c.stderr), "in the core's own run it fails, a list item numbered 19 is no rule, and a lone rule in the floor's own file is the floor's, wherever in the floor it stands", c.stdout + c.stderr);
  const core = (file, text) => { put(file, text); execFileSync("git", ["add", "-A"], { cwd: coreDir, stdio: "ignore" }); const r = spawnSync(process.execPath, [path.join(coreDir, "scripts/pointers.mjs"), "--core"], { cwd: coreDir, encoding: "utf8" }); return { status: r.status, out: r.stdout + r.stderr }; };
  put("modules/a.md", "# A module\n\nNothing cited.\n");
  const ten = core("floor/security.md", "# The floor\n\n**1. Nothing secret.** As rule 10 says.\n");
  ok(ten.status === 0 && !/rule 10/.test(ten.out), "a lone rule in the floor's own file is found in any of the floor's files: rule 10 in topics.md, cited from security.md", ten.out);
  const nineteen = core("floor/security.md", "# The floor\n\n**1. Nothing secret.** As rule 19 says.\n");
  ok(nineteen.status === 1 && /FAIL: a broken pointer: floor\/security\.md:3: rule 19: no such rule in the floor/.test(nineteen.out), "and one that no floor file holds fails", nineteen.out);
  put("floor/security.md", "# The floor\n\n**1. Nothing secret.** Text.\n");
  const capital = core("modules/a.md", "# A module\n\nFloor rule 16 says so (Core archive 998).\n");
  ok(capital.status === 1 && /floor rule 16/i.test(capital.out) && /core archive 998/i.test(capital.out), "a citation opening a sentence, \"Floor rule\" or \"Core archive\", is read too", capital.out);
  const backwards = core("modules/a.md", "# A module\n\nAs core archive 1 to 0 says.\n");
  ok(backwards.status === 1 && /core archive 1 to 0/.test(backwards.out), "a range written backwards leads nowhere, and is named", backwards.out);
} finally { fs.rmSync(coreDir, { recursive: true, force: true }); }
process.exit(failed ? 1 : 0);
