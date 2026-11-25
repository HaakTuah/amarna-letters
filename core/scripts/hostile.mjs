// What the hostile tests of the core's own inputs share (SECURITY.md, rule 5; #359): a scratch folder that is removed
// when the test ends, a project written into it, a check's failures read for their mend, and a read timed against the
// few seconds a hostile input may take. Node's own modules, mend.mjs and scratch-core.mjs, beside this file.
import fs from "node:fs";
import path from "node:path";
import { mended } from "./mend.mjs";
import { scratchDir } from "./scratch-core.mjs";

// A scratch folder under the temporary one (`scratchDir`: removed on exit, or by the next test's start where this one
// was stopped), and `fresh(files)`, a new project in it holding `files`
// ({ path: text }); the folder is `tmp`.
export function scratch(name) {
  const tmp = scratchDir(`${name}-`);
  let n = 0;
  const fresh = (files = {}) => {
    const dir = path.join(tmp, `p${++n}`);
    fs.mkdirSync(dir);
    for (const [f, text] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); }
    return dir;
  };
  return { tmp, fresh };
}
// Whether a check's failures, as lines, each say their mend.
export const said = (lines) => mended(lines.map((l) => `FAIL: ${l}`).join("\n"));
// Whether `fn` answers truly within five seconds.
export const quick = (fn) => { const t = Date.now(); const r = fn(); return r && Date.now() - t < 5000; };
