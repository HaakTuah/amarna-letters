// Checks started.mjs, beside this file: a script knows it was started by itself, also where its folder is reached
// through a link, and that it was not where another file imports it; and no script beside it asks in a way of its own.
// Run by the core's tests workflow (.github/workflows/tests.yml).
//
//   node scripts/started-test.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

let failed = 0;
const ok = (cond, what) => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) failed++; };
const here = fileURLToPath(new URL(".", import.meta.url));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "started-test-")));
try {
  const real = path.join(tmp, "real"), link = path.join(tmp, "link");
  fs.mkdirSync(real);
  fs.copyFileSync(path.join(here, "started.mjs"), path.join(real, "started.mjs"));
  fs.writeFileSync(path.join(real, "probe.mjs"), 'import { started } from "./started.mjs";\nconsole.log(started(import.meta.url) ? "started" : "imported");\n');
  fs.writeFileSync(path.join(real, "other.mjs"), 'import "./probe.mjs";\n');
  fs.symlinkSync(real, link, "junction"); // (a junction on Windows, which needs no right to make; a link elsewhere)
  const says = (...args) => spawnSync(process.execPath, args, { cwd: tmp, encoding: "utf8" }).stdout.trim();
  ok(says(path.join(real, "probe.mjs")) === "started", "a script started by its own path knows it");
  ok(says(path.join("real", "probe.mjs")) === "started", "and by a path from the folder it is run in");
  ok(says(path.join(link, "probe.mjs")) === "started", "and where its folder is reached through a link");
  ok(says("--preserve-symlinks-main", path.join(link, "probe.mjs")) === "started", "and where Node is told to keep the link's path");
  ok(says(path.join(real, "other.mjs")) === "imported" && says(path.join(link, "other.mjs")) === "imported", "a script another file imports knows that too");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
// (helper-call.mjs asks in its own line: the hook runs it as text, which imports nothing beside it)
const own = fs.readdirSync(here).filter(f => f.endsWith(".mjs") && !f.endsWith("-test.mjs") && !["started.mjs", "helper-call.mjs"].includes(f))
  .filter(f => /process\s*\.\s*argv\s*(\[\s*1\s*\]|\.\s*at\s*\(\s*1\s*\))|\bargv\s*\[\s*1\s*\]/.test(fs.readFileSync(path.join(here, f), "utf8")));
ok(own.length === 0, `no script beside it reads the path it was started by: ${own.join(", ") || "none"}`);
process.exit(failed ? 1 : 0);
