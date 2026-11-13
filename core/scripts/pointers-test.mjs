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
process.exit(failed ? 1 : 0);
